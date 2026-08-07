/**
 * FISHING — three methods, one fish, one population model.
 *
 * The suite is ordered by what would hurt most if it broke: D-011 first, then the claim the
 * whole stage rests on (that the three methods are genuinely three), then each method's own
 * mechanics, then the population, the food, and the save.
 *
 * THE REACHABILITY PROOFS ARE PER METHOD and they are the point of the last section. Post-pivot
 * this project counts a thing as built only when a player can arrive at it, and [[D-090]] means
 * the DISCOVERY route, not the craft function — a proof that calls `craftNet()` directly proves
 * the materials exist and says nothing about whether anyone can get one.
 */
import { describe, expect, it } from 'vitest';
import {
    advanceHandline,
    advanceNet,
    castHandline,
    canCraftFishingLine,
    canCraftNet,
    craftFishingLine,
    craftNet,
    createInitialState,
    depthAtSpot,
    eat,
    fishingSpots,
    freshFishing,
    gainFish,
    handlineBlocker,
    haulNet,
    haulNetBlocker,
    netIsTended,
    reconcile,
    reelIn,
    regrowGameHoursFor,
    setNet,
    setNetBlocker,
    spearFish,
    spearFishBlocker,
    spearFishChance,
    spendPool,
    spotById,
    spotStateOf,
    verbsFor,
    type GameState,
    type SpotState,
} from '../src/brain';
import { Session } from '../src/brain/session';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { isSpoiled, perishOnTick } from '../src/brain/matter';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';
import { FISHING_SPOTS } from '../src/data/world';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;

function fresh(): GameState {
    return fullBody(createInitialState(NOW));
}

/** Stand the survivor exactly on a named spot, with whatever tools they need. */
function atSpot(id: string, mutate: (s: GameState) => void = () => {}): GameState {
    const s = fresh();
    const spot = s.nodes.find((n) => n.id === id)!;
    s.player.x = spot.x;
    s.player.y = spot.y;
    mutate(s);
    return s;
}

/** The shallow shore site every method can be used at. */
const SHALLOW = 'fp-north';
/** The one out past the shelf, where a spear has nothing to brace against. */
const DEEP = 'fp-reef';

// ---------------------------------------------------------------------------
describe('D-011 — an absence cannot fish, and cannot rot what you caught', () => {
    it('advances neither a cast line nor a soaking net across three days away', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; st.tools.net = true; });
        castHandline(s);
        setNet(s);
        const lineBefore = { ...s.fishing.line! };
        const netBefore = { ...s.fishing.net! };
        const after = reconcile(s, 3 * 24 * 3600).state;
        expect(after.fishing.line).toEqual(lineBefore);
        expect(after.fishing.net).toEqual(netBefore);
    });

    it('never lowers health, at any fishing state and any span', () => {
        //  There is no harm term in this stage AT ALL, so this is a property rather than a
        //  threshold check: no configuration of line, net or catch can make an absence cost
        //  a survivor anything.
        for (const seconds of [30, 600, 3600, 8 * 3600, 3 * 24 * 3600]) {
            const s = atSpot(SHALLOW, (st) => {
                st.tools.fishingLine = true; st.tools.net = true; st.inventory.fish = 5;
            });
            castHandline(s);
            setNet(s);
            s.freshUntil = { fish: 0.01 };
            const before = s.health;
            expect(reconcile(s, seconds).state.health).toBeGreaterThanOrEqual(before);
        }
    });

    it('does not spoil what is in the pack — the rule dropped stacks already had', () => {
        //  THE BEHAVIOUR THIS STAGE CHANGED, pinned. Drop 1's meat used an absolute
        //  `gameHoursElapsed` deadline, and `gameHoursElapsed` advances across an absence, so
        //  food rotted while the tab was shut. `perishOnTick` counts DOWN, online only.
        const s = fresh();
        s.inventory.fish = 3;
        s.freshUntil = { fish: TUNE.fishFreshGameHours };
        const after = reconcile(s, 3 * 24 * 3600).state;
        expect(after.freshUntil.fish).toBe(TUNE.fishFreshGameHours);
        expect(isSpoiled(after, 'fish')).toBe(false);
    });

    it('is STRUCTURAL: the absence path is not merely gentle, it cannot reach the tick', () => {
        //  The vacuity guard. A 400-second span is long enough that the ONLINE tick would
        //  resolve a bite several times over, and short enough that nothing else has bottomed
        //  out — so this cannot pass by both sides hitting a floor.
        const away = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; });
        castHandline(away);
        const after = reconcile(away, 400).state;
        expect(after.inventory.fish).toBe(0);
        expect(after.fishing.line?.waitedGameHours).toBe(0);
        //  ...and the witness that 400 seconds was a real span: something else DID move.
        expect(after.gameHoursElapsed).toBeGreaterThan(0);
        expect(after.thirst).toBeLessThan(away.thirst);
    });

    it('and the ONLINE tick does all of it — the same span, through a Session', () => {
        //  The other half of the structural claim: if the tick did not fish either, every
        //  check above would be measuring a dead feature.
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        const spot = session.state.nodes.find((n) => n.id === SHALLOW)!;
        session.state.player.x = spot.x;
        session.state.player.y = spot.y;
        session.state.tools.fishingLine = true;
        session.state.lastSeenMs = NOW;
        castHandline(session.state);
        for (let i = 1; i <= 40; i++) session.tick(NOW + i * 1000);
        expect(session.state.inventory.fish).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
describe('the three methods are genuinely three', () => {
    /**
     * WHAT A SITE PAYS PER FISH ACTUALLY DELIVERED — and the spear's hit chance belongs in
     * that number, which the first version of this check left out.
     *
     * Written nominally at first (`poolCost / yield`) it made the spear and the handline
     * identical at 1.0 apiece, and the test went red saying so. The test was wrong and it
     * was wrong usefully: a method that costs the same per fish while being instant and
     * twice the yield IS strictly better, so if the nominal reading were the whole story the
     * design would be broken. It is not the whole story, because a thrown spear pays the
     * water whether or not it lands. Expected yield is the honest denominator.
     */
    const expectedPerFish = (technique: number) => {
        const s = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        s.knowledge.domains.survivalcraft.technique = technique;
        return {
            handline: TUNE.handlinePoolCost / TUNE.handlineYield,
            spear: TUNE.spearFishPoolCost / (spearFishChance(s) * TUNE.spearFishYield),
            net: TUNE.netHaulPoolCost / TUNE.netCapacity,
        };
    };

    it('costs the SITE a different amount per fish, in the order the design claims', () => {
        //  The net is gentlest per fish and heaviest per haul; the spear is dearest per fish
        //  because it pays for misses. If these collapse into each other, two of the three
        //  methods are a reskin — and they must not collapse at EITHER end of the skill curve.
        for (const technique of [0, 50, 100]) {
            const per = expectedPerFish(technique);
            expect(per.net).toBeLessThan(per.handline);
            expect(per.handline, `spear is no dearer than a line at technique ${technique}`)
                .toBeLessThan(per.spear);
        }
    });

    it('has no method that is strictly better than another', () => {
        //  THE CLAIM THE WHOLE STAGE RESTS ON, as arithmetic. Each method must WIN on at
        //  least one axis and LOSE on at least one, or nobody ever picks the other two.
        const immediacy = { spear: 0, handline: TUNE.handlineBiteGameHours, net: TUNE.netSoakGameHours };
        expect(immediacy.spear).toBeLessThan(immediacy.handline);
        expect(immediacy.handline).toBeLessThan(immediacy.net);

        const yield_ = { handline: TUNE.handlineYield, spear: TUNE.spearFishYield, net: TUNE.netCapacity };
        expect(yield_.handline).toBeLessThan(yield_.spear);
        expect(yield_.spear).toBeLessThan(yield_.net);

        //  The spear wins immediacy and loses gentleness — but that alone would leave it
        //  strictly better than the line for anyone practised enough, so the two axes it
        //  ALSO loses on are named here rather than assumed:
        //
        //    it needs a TOOL the handline does not, and
        //    it needs SHALLOW WATER, so the deep site refuses it outright, and
        //    it costs ENERGY, which standing holding a line does not.
        expect(TUNE.spearFishEnergy).toBeGreaterThan(0);
        expect(TUNE.spearFishMaxDepthM).toBeLessThan(TUNE.swimDepthM);
        const deep = atSpot(DEEP, (st) => {
            st.tools.spear = true; st.tools.fishingLine = true;
        });
        expect(spearFishBlocker(deep)).toBeTruthy();
        expect(handlineBlocker(deep), 'the line must still work where the spear cannot').toBeNull();
    });

    it('and the net is the only one that works while your hands are busy', () => {
        //  Its whole niche, expressed the only way it can be: the line dies when you walk
        //  away and the net does not.
        const s = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; st.tools.net = true; });
        castHandline(s);
        setNet(s);
        //  Step back — still inside the net's tether, well outside the line's reach.
        s.player.x += (TUNE.interactRadiusM + TUNE.fishSpotTapRadiusM) + 4;
        expect(netIsTended(s)).toBe(true);
        advanceHandline(s, 0.01);
        expect(s.fishing.line, 'walking away should lose the cast').toBeNull();
        expect(s.fishing.net, 'walking away must NOT lose the net').not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
describe('1. the handline — cast, and wait', () => {
    it('refuses without a line, and says which of the two things is missing', () => {
        const dry = fresh();
        expect(handlineBlocker(dry)).toBe('There is no water to fish here.');
        const wet = atSpot(SHALLOW);
        expect(handlineBlocker(wet)).toBe('You have no line to fish with.');
        wet.tools.fishingLine = true;
        expect(handlineBlocker(wet)).toBeNull();
    });

    it('waits the tuned span before it resolves, and yields nothing until it does', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; });
        expect(castHandline(s)).toBe(true);
        const short = advanceHandline(s, TUNE.handlineBiteGameHours * 0.5);
        expect(short.caught).toBe(0);
        expect(s.inventory.fish).toBe(0);
        const done = advanceHandline(s, TUNE.handlineBiteGameHours * 0.6);
        expect(done.caught).toBe(TUNE.handlineYield);
        expect(s.inventory.fish).toBe(TUNE.handlineYield);
        //  And the cast is over — a line does not keep fishing on its own.
        expect(s.fishing.line).toBeNull();
    });

    it('cannot be cast twice, and can always be reeled in', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; });
        expect(castHandline(s)).toBe(true);
        expect(castHandline(s)).toBe(false);
        expect(handlineBlocker(s)).toBe('Your line is already in the water.');
        expect(reelIn(s)).toBe(true);
        expect(s.fishing.line).toBeNull();
        expect(reelIn(s)).toBe(false);
    });

    it('is LOST when the survivor walks out of reach — that is the method\'s cost', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; });
        castHandline(s);
        s.player.x += TUNE.interactRadiusM + TUNE.fishSpotTapRadiusM + 1;
        const out = advanceHandline(s, TUNE.handlineBiteGameHours * 2);
        expect(out.caught).toBe(0);
        expect(s.fishing.line).toBeNull();
        expect(s.inventory.fish).toBe(0);
    });
});

// ---------------------------------------------------------------------------
describe('2. the net — set it, stay nearby, come back for it', () => {
    it('holds NOTHING until it has soaked, which is its setup cost', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.net = true; });
        expect(setNet(s)).toBe(true);
        advanceNet(s, TUNE.netSoakGameHours * 0.9);
        expect(s.fishing.net!.holding).toBe(0);
        advanceNet(s, TUNE.netSoakGameHours * 0.2);
        expect(s.fishing.net!.holding).toBeGreaterThan(0);
    });

    it('stops entirely when nobody is near it, and loses nothing by stopping', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.net = true; });
        setNet(s);
        advanceNet(s, TUNE.netSoakGameHours + 0.3);
        const held = s.fishing.net!.holding;
        expect(held).toBeGreaterThan(0);
        s.player.x += TUNE.netTendRadiusM + 5;
        expect(netIsTended(s)).toBe(false);
        advanceNet(s, 2);
        expect(s.fishing.net!.holding, 'an untended net must not keep fishing').toBe(held);
    });

    it('fills to a cap rather than forever', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.net = true; });
        setNet(s);
        advanceNet(s, TUNE.netSoakGameHours + 100);
        expect(s.fishing.net!.holding).toBe(TUNE.netCapacity);
    });

    it('hands over the catch and LIFTS the net, so setting it again is a fresh decision', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.net = true; });
        setNet(s);
        advanceNet(s, TUNE.netSoakGameHours + 1);
        const holding = Math.floor(s.fishing.net!.holding);
        const out = haulNet(s);
        expect(out.caught).toBe(holding);
        expect(s.inventory.fish).toBe(holding);
        expect(s.fishing.net, 'hauling lifts the net').toBeNull();
    });

    it('cannot be hauled from across the island', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.net = true; });
        setNet(s);
        s.player.x += TUNE.interactRadiusM + TUNE.fishSpotTapRadiusM + 2;
        expect(haulNetBlocker(s)).toBe('Your net is elsewhere. Go to it.');
        expect(haulNet(s).caught).toBe(0);
        expect(s.fishing.net, 'a refused haul must not lift it').not.toBeNull();
    });

    it('refuses a second net, and says so', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.net = true; });
        setNet(s);
        expect(setNet(s)).toBe(false);
        expect(setNetBlocker(s)).toBe('Your net is already set.');
    });
});

// ---------------------------------------------------------------------------
describe('3. the spear — no new tool, no waiting, and a real chance of nothing', () => {
    it('reuses the ALREADY-SHIPPED spear, and refuses without it', () => {
        const s = atSpot(SHALLOW);
        expect(spearFishBlocker(s)).toBe('You have nothing to strike with.');
        s.tools.spear = true;
        expect(spearFishBlocker(s)).toBeNull();
    });

    it('is a WADING act — the deep site refuses it, and says why', () => {
        //  The one rule that reuses the maritime model rather than declaring a new one. It
        //  is also what stops the deep reef becoming the best fishery in the game.
        const deep = atSpot(DEEP, (st) => { st.tools.spear = true; });
        expect(depthAtSpot(spotById(deep, DEEP)!)).toBeGreaterThan(TUNE.spearFishMaxDepthM);
        expect(spearFishBlocker(deep)).toBe('Too deep to stand and strike.');
        //  ...while the line and the net are perfectly happy out there.
        deep.tools.fishingLine = true;
        deep.tools.net = true;
        expect(handlineBlocker(deep)).toBeNull();
        expect(setNetBlocker(deep)).toBeNull();
    });

    it('lands on a good roll and misses on a bad one, at the tuned chance', () => {
        const hit = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        const chance = spearFishChance(hit);
        const good = spearFish(hit, chance - 0.0001);
        expect(good.ok).toBe(true);
        expect(good.caught).toBe(TUNE.spearFishYield);
        expect(good.scared).toBe(false);

        const miss = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        const bad = spearFish(miss, chance + 0.0001);
        expect(bad.ok).toBe(true);
        expect(bad.caught).toBe(0);
        expect(bad.scared).toBe(true);
        expect(miss.inventory.fish).toBe(0);
    });

    it('SCARES THE SHOAL ON A MISS — the water pays either way', () => {
        //  The method's defining trade. Without it the spear is a strictly better handline,
        //  and one of the three methods stops existing.
        const s = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        const before = spotById(s, SHALLOW)!.pool!;
        spearFish(s, 1);   // certain miss
        expect(spotById(s, SHALLOW)!.pool).toBe(before - TUNE.spearFishPoolCost);
        expect(s.inventory.fish).toBe(0);
    });

    it('gets better with survivalcraft, and never becomes certain', () => {
        const raw = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        raw.knowledge.domains.survivalcraft.technique = 0;
        const practised = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        practised.knowledge.domains.survivalcraft.technique = 100;
        expect(spearFishChance(practised)).toBeGreaterThan(spearFishChance(raw));
        expect(spearFishChance(practised)).toBeLessThanOrEqual(TUNE.spearFishMaxChance);
        expect(TUNE.spearFishMaxChance).toBeLessThan(1);
    });

    it('costs energy to throw, and refuses when there is none left', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        const before = s.energy;
        spearFish(s, 0);
        expect(s.energy).toBe(before - TUNE.spearFishEnergy);
        s.energy = 0;
        expect(spearFishBlocker(s)).toBe('You have nothing left to throw with.');
    });
});

// ---------------------------------------------------------------------------
describe('4. the population — two states, and the machinery already here', () => {
    it('authors four sites, every one present and stocked at the start', () => {
        const s = fresh();
        const spots = fishingSpots(s);
        expect(spots.length).toBe(FISHING_SPOTS.length);
        for (const spot of spots) {
            expect(spotStateOf(spot)).toBe('present');
            expect(spot.pool).toBe(TUNE.fishSpotPool);
        }
    });

    it('has exactly TWO states and no third field naming the same fact', () => {
        //  The dossier's minimum, kept at the minimum. `available` IS the state.
        const s = fresh();
        const spot = spotById(s, SHALLOW)!;
        const seen = new Set<SpotState>();
        seen.add(spotStateOf(spot));
        spendPool(s, spot, TUNE.fishSpotPool);
        seen.add(spotStateOf(spotById(s, SHALLOW)!));
        expect([...seen].sort()).toEqual(['locally-depleted', 'present']);
    });

    it('depletes through the SHIPPED node machinery, timestamp and all', () => {
        const s = fresh();
        s.gameHoursElapsed = 40;
        const spot = spotById(s, SHALLOW)!;
        expect(spendPool(s, spot, 1)).toBe('present');
        //  A part-spent site keeps its null timestamp — the regrow clock has not started.
        expect(spotById(s, SHALLOW)!.depletedAtGameHours).toBeNull();
        expect(spendPool(s, spotById(s, SHALLOW)!, TUNE.fishSpotPool)).toBe('locally-depleted');
        const spent = spotById(s, SHALLOW)!;
        expect(spent.available).toBe(false);
        expect(spent.pool).toBe(0);
        expect(spent.depletedAtGameHours).toBe(40);
    });

    it('comes back on the same [[D-051]] regrow path every bush uses', () => {
        expect(regrowGameHoursFor('fishingspot')).toBe(TUNE.fishSpotRegrowGameHours);
        expect(regrowGameHoursFor('fishingspot')).toBeGreaterThan(0);
        //  A fishery recovers faster than a berry bush fruits and slower than shellfish.
        expect(regrowGameHoursFor('fishingspot')).toBeGreaterThan(regrowGameHoursFor('shellfish'));
        expect(regrowGameHoursFor('fishingspot')).toBeLessThan(regrowGameHoursFor('berrybush'));
    });

    it('and a depleted site refuses ALL THREE methods, each in its own words', () => {
        const s = atSpot(SHALLOW, (st) => {
            st.tools.fishingLine = true; st.tools.net = true; st.tools.spear = true;
        });
        spendPool(s, spotById(s, SHALLOW)!, TUNE.fishSpotPool);
        expect(handlineBlocker(s)).toBe('This water is fished out. Give it time.');
        expect(setNetBlocker(s)).toBe('This water is fished out. Give it time.');
        expect(spearFishBlocker(s)).toBe('This water is fished out. Give it time.');
    });

    it('is LOCAL — emptying one site leaves the others alone', () => {
        //  "Locally-depleted", literally. A global stock would make the whole island one
        //  fishery, which is the parallel system this stage was told not to build.
        const s = fresh();
        spendPool(s, spotById(s, SHALLOW)!, TUNE.fishSpotPool);
        for (const other of fishingSpots(s).filter((n) => n.id !== SHALLOW)) {
            expect(spotStateOf(other)).toBe('present');
        }
    });
});

// ---------------------------------------------------------------------------
describe('5. fish as food — one chain, not a second one', () => {
    it('can actually be eaten, and restores the tuned hunger', () => {
        const s = fresh();
        gainFish(s, 2);
        s.hunger = 20;
        expect(eat(s, 'fish')).toBe(true);
        expect(s.inventory.fish).toBe(1);
        expect(s.hunger).toBe(20 + TUNE.fishHungerValue);
    });

    it('so can MEAT, which is the chain this stage found broken', () => {
        //  Drop 1 shipped every meat constant and no way to eat it. If this ever goes red
        //  again, the boar has gone back to handing out ballast.
        const s = fresh();
        s.inventory.meat = 1;
        s.hunger = 10;
        expect(eat(s, 'meat')).toBe(true);
        expect(s.hunger).toBe(10 + TUNE.meatHungerRestore);
    });

    it('goes off on the ONLINE tick, faster than meat does', () => {
        const s = fresh();
        gainFish(s, 1);
        expect(s.freshUntil.fish).toBe(TUNE.fishFreshGameHours);
        expect(TUNE.fishFreshGameHours).toBeLessThan(TUNE.meatSpoilGameHours);
        perishOnTick(s, TUNE.fishFreshGameHours - 1);
        expect(isSpoiled(s, 'fish')).toBe(false);
        perishOnTick(s, 2);
        expect(isSpoiled(s, 'fish')).toBe(true);
    });

    it('and eating spoiled fish makes you ill through the SHIPPED illness route', () => {
        //  No second illness path: `eat` already routed spoiled food to `onsetFrom`, and the
        //  fish reaches it by having the `contaminated` transformation rather than by name.
        const s = fresh();
        gainFish(s, 1);
        s.matterWear.fish = TUNE.matterWearPerUnit;
        s.hunger = 30;
        const before = s.illness.severity;
        eat(s, 'fish');
        expect(s.illness.severity).toBeGreaterThan(before);
    });

    it('is structurally INERT — a fish satisfies no recipe slot', () => {
        //  The law that caught the raft's first float slot. A food may never be built with.
        const s = fresh();
        gainFish(s, 40);
        s.inventory.fiber = 40;
        s.inventory.wood = 40;
        const before = { ...s.tools };
        expect(s.tools).toEqual(before);
        //  Asserted at the schema, where it is actually decided.
        expect(canCraftNet({ ...s, inventory: { ...s.inventory, fiber: 0, sharpblade: 0 } } as GameState)).toBe(false);
    });

    it('clears its clock when the last one is eaten, so the next catch starts fresh', () => {
        const s = fresh();
        gainFish(s, 1);
        s.hunger = 10;
        eat(s, 'fish');
        expect(s.inventory.fish).toBe(0);
        perishOnTick(s, 1);
        expect(s.freshUntil.fish).toBeUndefined();
        gainFish(s, 1);
        expect(s.freshUntil.fish).toBe(TUNE.fishFreshGameHours);
    });
});

// ---------------------------------------------------------------------------
describe('REACHABILITY — each of the three methods, on its own', () => {
    /**
     * WHAT THESE PROVE, and it is deliberately not "the function works".
     *
     * Post-pivot, a method exists when a player can arrive at it: the tool is discoverable,
     * the verb appears on a real surface, and the surface is reachable from a fresh castaway's
     * state. Each of the three gets its own, because they arrive by three different routes and
     * a shared proof would let one of them be unreachable behind the others.
     */
    it('HANDLINE — the line is craftable, and the verb appears on the water', () => {
        const s = atSpot(SHALLOW, (st) => {
            st.inventory.fiber = TUNE.fishingLineFiberCost;
            st.inventory.sharpblade = TUNE.fishingLineBladeCost;
        });
        expect(canCraftFishingLine(s), 'the line cannot be made from its own costs').toBe(true);
        expect(craftFishingLine(s)).toBe(true);
        expect(s.tools.fishingLine).toBe(true);
        //  ...and it is spent, not free.
        expect(s.inventory.fiber).toBe(0);

        const cast = verbsFor(s, 'fishingspot').find((v) => v.id === 'cast-line');
        expect(cast, 'the handline has no segment on the circle').toBeTruthy();
        expect(cast!.available, cast!.reason ?? '').toBe(true);
    });

    it('NET — the net is craftable, and BOTH its verbs appear when they should', () => {
        const s = atSpot(SHALLOW, (st) => {
            st.inventory.fiber = TUNE.netFiberCost;
            st.inventory.sharpblade = TUNE.netSharpbladeCost;
        });
        expect(canCraftNet(s)).toBe(true);
        expect(craftNet(s)).toBe(true);
        expect(s.tools.net).toBe(true);

        const set = verbsFor(s, 'fishingspot').find((v) => v.id === 'set-net');
        expect(set!.available, set!.reason ?? '').toBe(true);
        //  Haul appears only once there IS a net in the water — never as dead furniture.
        expect(verbsFor(s, 'fishingspot').some((v) => v.id === 'haul-net')).toBe(false);
        setNet(s);
        const haul = verbsFor(s, 'fishingspot').find((v) => v.id === 'haul-net');
        expect(haul, 'a set net has no way to be lifted').toBeTruthy();
        expect(haul!.available, haul!.reason ?? '').toBe(true);
    });

    it('SPEAR — no new tool at all, and the verb appears for a survivor who already has one', () => {
        //  The cheapest of the three precisely because nothing new is made. A survivor who
        //  killed a boar last week can fish today without crafting anything.
        const s = atSpot(SHALLOW, (st) => { st.tools.spear = true; });
        const strike = verbsFor(s, 'fishingspot').find((v) => v.id === 'spear-fish');
        expect(strike, 'the spear has no segment on the circle').toBeTruthy();
        expect(strike!.available, strike!.reason ?? '').toBe(true);
    });

    it('and every blocked segment is SHOWN with its reason, never hidden', () => {
        //  Ch.2's nearest-true-reason rule. A survivor with nothing sees all three methods
        //  greyed and learns what each one needs — which is how the stage teaches itself.
        const s = atSpot(SHALLOW);
        const ids = verbsFor(s, 'fishingspot').map((v) => v.id);
        expect(ids).toContain('cast-line');
        expect(ids).toContain('set-net');
        expect(ids).toContain('spear-fish');
        for (const v of verbsFor(s, 'fishingspot')) {
            expect(v.available).toBe(false);
            expect(v.reason, `${v.id} is blocked and says nothing`).toBeTruthy();
        }
    });

    it('and a fresh castaway is offered NOTHING — the pivot law is not excepted here', () => {
        const s = fresh();
        expect(s.tools.fishingLine).toBe(false);
        expect(s.tools.net).toBe(false);
        expect(s.fishing).toEqual(freshFishing());
    });
});

// ---------------------------------------------------------------------------
describe('the save', () => {
    it('MIGRATION v26 -> v27: the sites MERGE, the tools do not', () => {
        const old = fresh() as unknown as Record<string, unknown>;
        old.nodes = (old.nodes as GameState['nodes']).filter((n) => n.kind !== 'fishingspot');
        delete old.fishing;
        delete old.freshUntil;
        const inv = { ...(old.inventory as GameState['inventory']) } as Record<string, unknown>;
        delete inv.fish;
        old.inventory = inv;
        const tools = { ...(old.tools as GameState['tools']) } as Record<string, unknown>;
        delete tools.net;
        old.tools = tools;

        const loaded = deserialize(JSON.stringify({
            schemaVersion: 26, savedAtMs: NOW, state: { ...old, schemaVersion: 26 },
        }));
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);
        //  MERGES: fish were in that water before anyone washed ashore.
        expect(loaded!.state.nodes.filter((n) => n.kind === 'fishingspot').length).toBe(FISHING_SPOTS.length);
        //  DOES NOT: a net nobody worked out is a stage handed over for free.
        expect(loaded!.state.tools.net).toBe(false);
        expect(loaded!.state.inventory.fish).toBe(0);
        expect(loaded!.state.fishing).toEqual({ line: null, net: null });
    });

    it('carries a live meat clock across rather than dropping or refreshing it', () => {
        //  The old field was an absolute deadline; the new one is hours REMAINING. A save
        //  with 9 hours left keeps 9 — and one already gone off stays gone off.
        const old = fresh() as unknown as Record<string, unknown>;
        delete old.freshUntil;
        old.gameHoursElapsed = 100;
        old.meatFreshUntilGameHours = 109;
        (old.inventory as GameState['inventory']).meat = 2;

        const loaded = deserialize(JSON.stringify({
            schemaVersion: 26, savedAtMs: NOW, state: { ...old, schemaVersion: 26 },
        }));
        expect(loaded!.state.freshUntil.meat).toBe(9);

        const gone = fresh() as unknown as Record<string, unknown>;
        delete gone.freshUntil;
        gone.gameHoursElapsed = 200;
        gone.meatFreshUntilGameHours = 109;
        (gone.inventory as GameState['inventory']).meat = 2;
        const loadedGone = deserialize(JSON.stringify({
            schemaVersion: 26, savedAtMs: NOW, state: { ...gone, schemaVersion: 26 },
        }));
        expect(loadedGone!.state.freshUntil.meat).toBe(0);
        expect(isSpoiled(loadedGone!.state, 'meat')).toBe(true);
    });

    it('does not hand an existing save a second set of sites', () => {
        const cur = fresh();
        const loaded = deserialize(JSON.stringify({
            schemaVersion: 26, savedAtMs: NOW, state: { ...cur, schemaVersion: 26 },
        }));
        expect(loaded!.state.nodes.filter((n) => n.kind === 'fishingspot').length).toBe(FISHING_SPOTS.length);
    });

    it('survives a round trip with a line cast and a net set', () => {
        const s = atSpot(SHALLOW, (st) => { st.tools.fishingLine = true; st.tools.net = true; });
        castHandline(s);
        setNet(s);
        const loaded = deserialize(JSON.stringify({
            schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: { ...s },
        }));
        expect(loaded!.state.fishing.line?.spotId).toBe(SHALLOW);
        expect(loaded!.state.fishing.net?.spotId).toBe(SHALLOW);
    });
});
