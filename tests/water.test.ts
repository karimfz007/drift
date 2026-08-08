/**
 * THE WATER — swimming as terrain (the Maritime Slice, item 1).
 *
 * Four claims are load-bearing here and each has its own section:
 *
 *   1. The island did not move. A seabed was added outside `islandRadius`; every metre of
 *      ground inside it must be bit-for-bit what it was, or a slice about the sea has
 *      silently re-sited the nodes, the spawns and the certified feel court.
 *   2. The wall is gone and the shore is real — three zones exist, in order, on the ground.
 *   3. **D-011 holds structurally.** No absence can drown anybody, and the reason is not a
 *      floor or a check: `reconcile` contains no swim cost to charge.
 *   4. Cold-water exposure is `wet` and nothing else — no parallel thermal system.
 */
import { describe, expect, it } from 'vitest';
import { reconcile } from '../src/brain/reconcile';
import { createInitialState } from '../src/brain/state';
import { realSecondsFromGameHours, realSecondsPerGameHour } from '../src/brain/clock';
import { readFileSync } from 'node:fs';
import { netHeatFlowPerGameHour } from '../src/brain/thermal';
import { EXPOSED } from '../src/brain/vulnerability';
import { freshCapacities } from '../src/brain/capacities';
import {
    developFromPaddling, developFromSwimming, isSwimming, swimEfficiencyOf, swimNote,
    swimStageOf, swimTrainingContext, waterCostsFor, waterSpeedMultiplierOf, waterZoneAt,
    waterZoneOf, distanceToWreck,
} from '../src/brain/water';
import { Session } from '../src/brain/session';
import { serialize, type SaveRepository } from '../src/brain/save';
import {
    SURF_LINE_RADIUS, WALKABLE_RADIUS, WORLD, WRECK, groundHeight, isDryLand, waterDepthAt,
} from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';
import type { GameState } from '../src/brain/types';

function fresh(): GameState {
    return fullBody(createInitialState(1_700_000_000_000));
}

/** Put the survivor at a radius on the +Z bearing — the wreck's own side of the island. */
function at(s: GameState, radius: number): GameState {
    s.player.x = 0;
    s.player.y = radius;
    return s;
}

/** A radius that is genuinely deep water, found from the terrain rather than assumed. */
const DEEP = (() => {
    for (let r = WORLD.islandRadius; r < WORLD.seaRadius; r += 0.25) {
        if (waterZoneAt(0, r) === 'swimming') return r + 4;
    }
    throw new Error('no deep water exists — the seabed never reaches swim depth');
})();

function memoryRepo(): SaveRepository {
    let held: string | null = null;
    return { read: () => held, write: (v: string) => { held = v; }, clear: () => { held = null; } };
}

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ---------------------------------------------------------------------------
describe('the island did not move — the seabed is additive, and only outside', () => {
    /**
     * THE REGRESSION THAT MATTERS MOST IN THIS SLICE, and the cheapest one to get wrong.
     *
     * `groundHeight`'s outer branch changed from a flat `seaLevel - 0.6` to a shelving ramp.
     * If that edit leaked one metre inward, every node's mesh height, every spawn validation
     * and D-083's certified feel court would have moved — and nothing in the suite would say
     * so, because they all assert about each other rather than about absolute ground.
     *
     * So this recomputes the ORIGINAL inner formula independently, from the same constants,
     * and demands exact equality across the whole disc.
     */
    function originalInnerHeight(x: number, z: number): number {
        const smoothstep = (e0: number, e1: number, v: number) => {
            const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0 || 1)));
            return t * t * (3 - 2 * t);
        };
        const r = Math.hypot(x, z);
        const shelf = WORLD.shelfHeight * smoothstep(WORLD.islandRadius, WORLD.islandRadius - WORLD.shoreFalloff, r);
        const t = 1 - r / WORLD.islandRadius;
        const dome = WORLD.centreHeight * t * t * (3 - 2 * t);
        const dunes = 0.6 * Math.sin(x * 0.06 + 1.3) * Math.cos(z * 0.05 - 0.4)
            * Math.min(1, r / 20)
            * smoothstep(WORLD.islandRadius, WORLD.islandRadius - WORLD.shoreFalloff * 1.6, r);
        const pondDist = Math.hypot(x - -22, z - 8);
        const basin = -2.4 * smoothstep(9 + 6, 0, pondDist);
        return shelf + dome + dunes + basin;
    }

    it('every point inside the island is EXACTLY the height it always was', () => {
        let checked = 0;
        for (let x = -121; x <= 121; x += 3.5) {
            for (let z = -121; z <= 121; z += 3.5) {
                if (Math.hypot(x, z) >= WORLD.islandRadius) continue;
                expect(groundHeight(x, z), `moved at ${x},${z}`).toBe(originalInnerHeight(x, z));
                checked++;
            }
        }
        //  WITNESS (D-066 a): a sweep that checked nothing would pass the loop above.
        expect(checked).toBeGreaterThan(3000);
    });

    it('the pond is fresh water and can never read as sea, however deep its basin', () => {
        //  `waterDepthAt` is a plain comparison against `seaLevel`, so a basin that dipped
        //  below it would turn the pond into swimmable ocean and give the drinking spot a
        //  drowning stage. It bottoms out far above; assert the margin, not the absence.
        expect(waterDepthAt(-22, 8)).toBeLessThan(-4);
        expect(waterZoneAt(-22, 8)).toBe('dry');
    });
});

// ---------------------------------------------------------------------------
describe('the shore is real — three zones, in order, read from the ground', () => {
    it('the old 108 m wall is now ordinary walkable beach', () => {
        expect(isDryLand(0, WALKABLE_RADIUS + 1)).toBe(true);
        expect(isDryLand(0, WALKABLE_RADIUS + 10)).toBe(true);
        //  ...and the placement rule keeps its exact old numbers, which is the whole reason
        //  no spawn, node or feel-court reading moves. Two jobs, now two rules.
        expect(SURF_LINE_RADIUS).toBeGreaterThan(WALKABLE_RADIUS);
    });

    it('WITNESS: dry, wading and swimming all genuinely exist on the way out', () => {
        const seen = new Set<string>();
        for (let r = WALKABLE_RADIUS; r <= WORLD.islandRadius + WORLD.seabedFalloff; r += 0.25) {
            seen.add(waterZoneAt(0, r));
        }
        //  A ramp too steep to wade on would collapse two of these into one, and the shore
        //  would be a cliff again with a different constant on it.
        expect([...seen].sort()).toEqual(['dry', 'swimming', 'wading']);
    });

    it('and they arrive in that order, never interleaved', () => {
        const order = ['dry', 'wading', 'swimming'];
        let stage = 0;
        for (let r = 0; r <= WORLD.islandRadius + WORLD.seabedFalloff; r += 0.25) {
            const zone = waterZoneAt(0, r);
            const idx = order.indexOf(zone);
            expect(idx, `unknown zone at ${r}`).toBeGreaterThanOrEqual(0);
            expect(idx, `went backwards to ${zone} at ${r}`).toBeGreaterThanOrEqual(stage);
            stage = idx;
        }
        expect(stage).toBe(2);
    });

    it('the wading band is wide enough to be a transition rather than an instant', () => {
        let wading = 0;
        for (let r = WORLD.islandRadius; r < WORLD.islandRadius + WORLD.seabedFalloff; r += 0.05) {
            if (waterZoneAt(0, r) === 'wading') wading += 0.05;
        }
        expect(wading).toBeGreaterThan(2);
    });

    it('the wreck is out past the shelf, and that distance is what the crossing is', () => {
        expect(waterZoneAt(WRECK.x, WRECK.y)).toBe('swimming');
        //  ~115 m of open water from the shore. If this ever collapses the crossing has
        //  stopped being a journey and the raft has stopped being the answer to anything.
        const fromShore = Math.hypot(WRECK.x, WRECK.y) - SURF_LINE_RADIUS;
        expect(fromShore).toBeGreaterThan(90);
    });
});

// ---------------------------------------------------------------------------
describe('the five stages — two spoken warnings before the water takes anything', () => {
    it('ashore and wading cost no health, whatever the reserve', () => {
        for (const r of [50, WALKABLE_RADIUS + 2]) {
            const s = at(fresh(), r);
            s.energy = 0;
            expect(waterCostsFor(s).healthPerGameHour).toBe(0);
        }
    });

    it('swimming, labouring and spent all cost NO health — only going-under does', () => {
        const stages: Array<[number, string]> = [
            [TUNE.energyMax, 'swimming'],
            [TUNE.swimLabouringEnergy, 'labouring'],
            [TUNE.swimSpentEnergy, 'spent'],
            [0, 'going-under'],
        ];
        for (const [energy, expected] of stages) {
            const s = at(fresh(), DEEP);
            s.energy = energy;
            expect(swimStageOf(s)).toBe(expected);
            const costs = waterCostsFor(s);
            if (expected === 'going-under') {
                expect(costs.healthPerGameHour).toBe(TUNE.swimGoingUnderHealthPerGameHour);
            } else {
                expect(costs.healthPerGameHour, `${expected} must not cost health`).toBe(0);
            }
        }
    });

    it('the two warnings SPEAK and the ordinary stage stays quiet', () => {
        expect(swimNote('swimming')).toBeNull();
        expect(swimNote('labouring')).toBeTruthy();
        expect(swimNote('spent')).toBeTruthy();
        expect(swimNote('going-under')).toBeTruthy();
        //  ...and they say different things, or "the game told you twice" is one sentence
        //  printed twice.
        expect(swimNote('labouring')).not.toBe(swimNote('spent'));
    });

    it('a spent swimmer still moves — the stage that cannot move is the one AFTER it', () => {
        const s = at(fresh(), DEEP);
        s.energy = 1;
        expect(waterSpeedMultiplierOf(s)).toBeGreaterThan(0);
        expect(waterSpeedMultiplierOf(s)).toBeLessThan(TUNE.swimSpeedMultiplier);
    });

    it('dry land is exactly walking pace — nothing about walking changed', () => {
        expect(waterSpeedMultiplierOf(at(fresh(), 50))).toBe(1);
    });
});

// ---------------------------------------------------------------------------
describe('THE LAW (D-011): no absence can drown anybody — structurally, not by a floor', () => {
    /**
     * The existing offline-death-impossible property test sweeps arbitrary bodies. This is
     * its maritime half: the same claim for a survivor who is IN THE SEA when the tab closes,
     * which is the situation this slice creates and the one a reader will worry about.
     */
    it('PROPERTY: a survivor left in open water survives any elapsed time, from any state', () => {
        const random = rng(20260805);
        let sweptAtSea = 0;
        for (let i = 0; i < 1500; i++) {
            const s = at(createInitialState(0), WORLD.islandRadius + random() * 200);
            s.warmth = random() * TUNE.warmthMax;
            s.thirst = random() * TUNE.thirstMax;
            s.hunger = random() * TUNE.hungerMax;
            s.health = 1 + random() * (TUNE.healthMax - 1);
            s.energy = random() * TUNE.energyMax;
            s.wet = random() * TUNE.wetMax;
            s.gameHoursElapsed = random() * 240;
            //  Half of them aboard a raft, half of them in the water.
            s.raft = { built: true, x: s.player.x, y: s.player.y, grade: 'serviceable', aboard: random() < 0.5 };
            if (waterZoneOf(s) !== 'dry' || s.raft.aboard) sweptAtSea++;
            const elapsed = 120 + random() * 86400 * 3;
            const { state } = reconcile(s, elapsed);
            expect(state.health, `drowned offline at ${s.player.y} m after ${elapsed} s`).toBeGreaterThan(0);
        }
        //  WITNESS (D-066 a): the sweep is worthless if every sample landed on the beach.
        expect(sweptAtSea).toBeGreaterThan(1000);
    }, 30_000);

    it('STRUCTURAL: reconcile charges NO swim cost, so there is nothing to floor', () => {
        /**
         * The proof is a comparison, not a claim about code: run the identical body once at
         * sea and once inland, and reconcile must produce the same energy. If a swim cost ever
         * reaches the absence path, these diverge.
         *
         * THIS TEST WAS VACUOUS ON ITS FIRST WRITING, and a deliberate mutation caught it —
         * exactly what D-066's clause (a) exists for. It ran a 24-hour absence, which drains
         * energy to `energyOfflineFloor` from ANY starting rate, so both sides bottomed out at
         * 15 and the comparison could never have failed. A planted swim cost of 70/h in
         * `reconcile` passed it cleanly.
         *
         * The span is now chosen so the floor is genuinely not reached, and the witness below
         * asserts that: a comparison of two saturated values proves nothing at all.
         */
        //  Just over `morningReportMinRealSeconds`, so this is the OFFLINE path, and short
        //  enough that the ambient drain has nowhere near reached the floor.
        const span = 400;
        const seaward = at(fresh(), DEEP);
        const inland = at(fresh(), 40);
        seaward.gameHoursElapsed = 0;
        inland.gameHoursElapsed = 0;
        const a = reconcile(seaward, span).state;
        const b = reconcile(inland, span).state;

        //  WITNESS: energy moved, and neither side is sitting on the floor. Without this the
        //  equality below is satisfied by two identical saturated numbers.
        expect(a.energy).toBeLessThan(TUNE.energyMax);
        expect(a.energy).toBeGreaterThan(TUNE.energyOfflineFloor + 1);
        expect(b.energy).toBeGreaterThan(TUNE.energyOfflineFloor + 1);

        expect(a.energy).toBe(b.energy);
        expect(a.health).toBe(b.health);
        expect(a.warmth).toBe(b.warmth);
    });

    it('...and an absence DRIES a swimmer rather than soaking them — the safe direction', () => {
        //  Stated as a test rather than only in prose, because it looks like a bug and is not:
        //  teaching `reconcile` about the sea would put an offline wetness gain into the one
        //  function D-011's property test guards, to buy realism nobody is present for.
        const s = at(fresh(), DEEP);
        s.wet = TUNE.wetMax;
        const { state } = reconcile(s, 86400);
        expect(state.wet).toBe(0);
    });

    it('the ONLINE tick, by contrast, charges it immediately', () => {
        const repo = memoryRepo();
        const start = at(fresh(), DEEP);
        repo.write(serialize(start, 0));
        const { session } = Session.start(repo, 0);
        session.state.player.x = start.player.x;
        session.state.player.y = start.player.y;
        const before = session.state.energy;
        session.tick(realSecondsPerGameHour * 0.2);
        expect(session.state.energy).toBeLessThan(before);
        expect(session.state.wet).toBe(TUNE.wetMax);
    });
});

// ---------------------------------------------------------------------------
describe('immersion is WETNESS — there is no second thermal system', () => {
    it('swimming drives wet to the ceiling, and that is the whole cold channel', () => {
        const s = at(fresh(), DEEP);
        expect(waterCostsFor(s).wetTarget).toBe(TUNE.wetMax);
    });

    it('wading soaks you less than swimming — the shore ramp buys a real gradient', () => {
        const shallow = at(fresh(), (WORLD.islandRadius + SURF_LINE_RADIUS) / 2 + 0.1);
        const wadeTarget = waterCostsFor(at(fresh(), findWadingRadius())).wetTarget;
        void shallow;
        expect(wadeTarget).not.toBeNull();
        expect(wadeTarget as number).toBeLessThan(TUNE.wetMax);
        expect(wadeTarget as number).toBeGreaterThan(0);
    });

    it('and it reaches warmth through the SHIPPED heat balance, not a bypass', () => {
        //  The claim "no parallel thermal system" is only meaningful if the wetness a swimmer
        //  carries genuinely costs them heat through `netHeatFlowPerGameHour`. Same context
        //  twice, one term different.
        const base = {
            isNight: true, sheltered: false, shelterGrade: null, windExposed: true,
            fireLit: false, atFire: false, bedding: 'bare-ground' as const, clothing: 0,
            resting: false, activity: 1, nutrition: 100, enclosed: false, refuge: EXPOSED,
        };
        const dry = netHeatFlowPerGameHour({ ...base, wet: 0 });
        const soaked = netHeatFlowPerGameHour({ ...base, wet: TUNE.wetMax });
        expect(soaked.net).toBeLessThan(dry.net);
        expect(soaked.evaporativeLoss).toBeLessThan(0);
        //  The extra loss is exactly the evaporative term and nothing else.
        expect(dry.net - soaked.net).toBeCloseTo(-soaked.evaporativeLoss, 9);
    });

    it('a survivor on a raft is NOT swimming and is not soaked by the sea under them', () => {
        const s = at(fresh(), DEEP);
        s.raft = { built: true, x: s.player.x, y: s.player.y, grade: 'serviceable', aboard: true };
        expect(isSwimming(s)).toBe(false);
        expect(swimStageOf(s)).toBe('ashore');
        expect(waterCostsFor(s).wetTarget).toBeNull();
    });
});

/** The first radius at which the survivor is wading, found from the terrain. */
function findWadingRadius(): number {
    for (let r = WORLD.islandRadius; r < WORLD.seaRadius; r += 0.05) {
        if (waterZoneAt(0, r) === 'wading') return r;
    }
    throw new Error('no wading band exists');
}

// ---------------------------------------------------------------------------
describe('breath/water confidence gets its first real producer (§12)', () => {
    it('it had NO producer before this slice — the gap this closes', async () => {
        //  WITNESS for the claim in the header. `developCapacity` shipped with zero callers,
        //  so eight capacities existed and none of them could move.
        const { readFileSync } = await import('node:fs');
        const water = readFileSync('src/brain/water.ts', 'utf8');
        expect(water).toContain('developCapacity');
    });

    it('swimming develops it, and endurance alongside — §12 names both', () => {
        const after = developFromSwimming(freshCapacities(), 'swimming', 1);
        expect(after.breathWaterConfidence).toBeGreaterThan(TUNE.capacityInnateFloor);
        expect(after.endurance).toBeGreaterThan(TUNE.capacityInnateFloor);
        //  ...and NOTHING else. A capacity that moves for work it has nothing to do with is
        //  a stat sheet wearing a body's clothes.
        expect(after.strength).toBe(TUNE.capacityInnateFloor);
        expect(after.coordinationDexterity).toBe(TUNE.capacityInnateFloor);
    });

    it('WADING trains nothing — standing in the shallows is not staged swimming', () => {
        const after = developFromSwimming(freshCapacities(), 'wading', 1);
        expect(after).toEqual(freshCapacities());
    });

    it('SPENT and GOING-UNDER train nothing — maximum overload is not good training (§12)', () => {
        for (const stage of ['spent', 'going-under'] as const) {
            const after = developFromSwimming(freshCapacities(), stage, 1);
            expect(after, `${stage} must grant nothing`).toEqual(freshCapacities());
        }
        //  The boundary stated where `capacities.ts` reads it, not just where it is applied.
        expect(swimTrainingContext('going-under').recoverable).toBe(false);
        expect(swimTrainingContext('spent').overloaded).toBe(true);
    });

    it('development is a RATE — two half spans equal one whole one', () => {
        const once = developFromSwimming(freshCapacities(), 'swimming', 0.4);
        let twice = developFromSwimming(freshCapacities(), 'swimming', 0.2);
        twice = developFromSwimming(twice, 'swimming', 0.2);
        expect(twice.breathWaterConfidence).toBeCloseTo(once.breathWaterConfidence, 9);
    });

    it('paddling develops endurance and BOAT MOTION, never breath confidence', () => {
        const after = developFromPaddling(freshCapacities(), 1);
        expect(after.endurance).toBeGreaterThan(TUNE.capacityInnateFloor);
        expect(after.mobilityBalance).toBeGreaterThan(TUNE.capacityInnateFloor);
        //  You do not learn the water by staying out of it.
        expect(after.breathWaterConfidence).toBe(TUNE.capacityInnateFloor);
    });

    it('confidence makes the swim cheaper and NEVER free (§12\'s own boundary)', () => {
        const novice = swimEfficiencyOf(freshCapacities());
        const expert = swimEfficiencyOf({ ...freshCapacities(), breathWaterConfidence: 100 });
        expect(expert).toBeLessThan(novice);
        expect(expert).toBeGreaterThan(0.6);
        expect(1 - expert).toBeCloseTo(TUNE.swimConfidenceEnergyRelief, 9);
    });

    it('a heavy pack costs more in the water, through Ch.6\'s own function', () => {
        const light = at(fresh(), DEEP);
        const heavy = at(fresh(), DEEP);
        heavy.inventory.stone = 120;
        expect(waterCostsFor(heavy).energyPerGameHour)
            .toBeGreaterThan(waterCostsFor(light).energyPerGameHour);
    });
});

// ---------------------------------------------------------------------------
describe('the crossing is a decision with a body count — the number the balance rests on', () => {
    /**
     * THE CLAIM, stated as arithmetic so it cannot quietly stop being true:
     * a rested survivor cannot swim to the wreck and back. If a tune change ever makes that
     * possible, the raft has become optional and the whole slice has lost its point.
     */
    const swimSpeed = TUNE.walkSpeedMps * TUNE.swimSpeedMultiplier;
    const openWaterM = Math.hypot(WRECK.x, WRECK.y) - SURF_LINE_RADIUS;

    it('a full reserve does NOT buy a return swim to the wreck', () => {
        const gameHours = TUNE.energyMax / TUNE.swimEnergyDrainPerGameHour;
        const metres = swimSpeed * gameHours * realSecondsPerGameHour;
        expect(metres).toBeLessThan(openWaterM * 2);
    });

    it('...but it does buy the trip OUT, so the attempt is a real temptation', () => {
        const gameHours = TUNE.energyMax / TUNE.swimEnergyDrainPerGameHour;
        const metres = swimSpeed * gameHours * realSecondsPerGameHour;
        expect(metres).toBeGreaterThan(openWaterM);
    });

    it('the raft turns it into a passage — an order of magnitude cheaper', () => {
        expect(TUNE.raftEnergyDrainPerGameHour * 4).toBeLessThan(TUNE.swimEnergyDrainPerGameHour);
        expect(TUNE.raftSpeedMultiplier).toBeGreaterThan(TUNE.swimSpeedMultiplier);
    });

    it('distance to the wreck is read from the world, never stored', () => {
        expect(distanceToWreck(WRECK.x, WRECK.y)).toBe(0);
        expect(distanceToWreck(0, 0)).toBeCloseTo(Math.hypot(WRECK.x, WRECK.y), 9);
    });
});

// ---------------------------------------------------------------------------
describe('D-134 — the two numbers MARITIME 3d rests on, compared', () => {
    /**
     * THE CHECK THAT WOULD HAVE CAUGHT IT, and the reason it lives in the brain suite rather
     * than in the harness.
     *
     * MARITIME 3d has now been repaired twice for opposite timing reasons. [[D-128]] found the
     * fixture starting too CLOSE to the SPENT threshold — the page-load window pushed the
     * survivor straight past it into going-under — and raised the headroom. That fix pushed
     * the swim beyond what the harness's poll could wait for: `60 × 120 ms` is 7.2 seconds of
     * sleep against a swim that takes 12.9, so the check could only pass when each round-trip
     * to the browser cost 214 ms or more. It passed on a LOADED machine and failed on a
     * healthy one, which is why three sessions read it as a load artifact and had the
     * causality precisely backwards.
     *
     * Neither repair could see the other, because the headroom lived in the fixture and the
     * wait lived in the poll and nothing compared them. They are both in `tune.ts` now, and
     * this is the comparison — in a suite that runs in seconds, so the next retune of the swim
     * cannot discover the mismatch two hours into a device sweep.
     */
    const secondsToSpend = (headroom: number) =>
        realSecondsFromGameHours(headroom / TUNE.swimEnergyDrainPerGameHour);

    it('the poll budget comfortably exceeds the swim it is waiting for', () => {
        const need = secondsToSpend(TUNE.swimSpentFixtureHeadroom);
        expect(need).toBeGreaterThan(0);
        //  Twice over, not merely enough. A budget that only just covers the need is a budget
        //  that fails the first time a machine is slower than the one it was measured on.
        expect(TUNE.swimSpentPollBudgetSeconds,
            `the fixture needs ${need.toFixed(1)} s to reach SPENT and the harness waits `
            + `${TUNE.swimSpentPollBudgetSeconds} s`).toBeGreaterThan(need * 2);
    });

    it('and the headroom is big enough that a slow boot cannot eat it — D-128\'s half', () => {
        //  The OTHER failure, kept: the fixture must still start far enough above SPENT that
        //  a 5-15 s page load cannot drain past the stage under test. Guarding only the new
        //  direction would re-open the old one the next time somebody tunes the headroom down.
        const bootWorstCaseSeconds = 15;
        const drainedByBoot = TUNE.swimEnergyDrainPerGameHour
            * (bootWorstCaseSeconds / realSecondsFromGameHours(1));
        expect(TUNE.swimSpentFixtureHeadroom,
            `a ${bootWorstCaseSeconds} s boot drains ${drainedByBoot.toFixed(1)} energy and the `
            + `fixture only has ${TUNE.swimSpentFixtureHeadroom} of headroom`)
            .toBeGreaterThan(drainedByBoot);
    });

    it('leaves a real window between the two failures, so both cannot be true at once', () => {
        //  The two constraints pull in opposite directions — a bigger headroom survives the
        //  boot and takes longer to drain. This asserts the window between them is not merely
        //  non-empty but comfortable, which is the property that stopped holding.
        const need = secondsToSpend(TUNE.swimSpentFixtureHeadroom);
        const bootDrainSeconds = 15;
        expect(need).toBeGreaterThan(bootDrainSeconds * 0.5);
        expect(need).toBeLessThan(TUNE.swimSpentPollBudgetSeconds * 0.5);
    });

    it('and the harness waits on a CLOCK, not on an iteration count', () => {
        //  The shape of the bug, not just its arithmetic. A fixed loop count silently encodes
        //  an assumption about how fast a `page.evaluate` round-trip is — which is a property
        //  of the machine, not of the game. Asserted against the source because that
        //  assumption is invisible in any value the harness produces.
        const src = readFileSync('tools/smoke.mjs', 'utf8');
        //  `lastIndexOf`: the harness's TUNE mirror mentions MARITIME 3d in a comment, and
        //  slicing from the FIRST match read that comment instead of the check.
        const block = src.slice(src.lastIndexOf('MARITIME 3d'), src.lastIndexOf('MARITIME 3e'));
        expect(block, 'MARITIME 3d is polling on a fixed iteration count again')
            .not.toMatch(/for \(let i = 0; i < \d+; i\+\+\)/);
        expect(block).toContain('swimSpentPollBudgetSeconds');
    });
});
