/**
 * THE RAFT AND THE CROSSING (the Maritime Slice, items 2 and 3).
 *
 * The raft is the first thing this game builds that MOVES, and the first with a site rule of
 * its own. Three claims carry it:
 *
 *   1. It is EARNED — discovered by its own gesture, gated by materials AND by where you are
 *      standing, and refused loudly rather than silently when either is wrong.
 *   2. It BOARDS AND CARRIES. Not a prop: `state.raft.x/y` follows the survivor, the deck
 *      grounds on the beach rather than driving up it, and stepping off says where you land.
 *   3. It is the ANSWER to the crossing — a paddle costs an order of magnitude less than the
 *      swim it replaces, and reaching the wreck is recorded once and never forgotten.
 */
import { describe, expect, it } from 'vitest';
import {
    boardRaft, canBoardRaft, canCraftRaft, craftRaft, createInitialState, leaveRaft,
    leaveRaftIsIntoWater, nearShoreForRaft, raftBlocker, raftShortfall, steerRaft,
} from '../src/brain/state';
import { allRecipes } from '../src/brain/recipes';
import { DISCOVERY_ROUTES, suspicionFor } from '../src/brain/discovery';
import { ladderFor } from '../src/brain/ladder';
import { resolveRecipe } from '../src/brain/experiment';
import { materialSatisfies } from '../src/brain/materials';
import { closeSurvivor } from '../src/brain/succession';
import { verbsFor, availableVerbs, defaultVerb, holdOpensCircle } from '../src/brain/verbs';
import { panelHints, revealedInPanel } from '../src/brain/reveal';
import { Session } from '../src/brain/session';
import { deserialize, serialize, type SaveRepository } from '../src/brain/save';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { waterZoneAt } from '../src/brain/water';
import { SCHEMA_VERSION } from '../src/brain/types';
import { SURF_LINE_RADIUS, WRECK, isDryLand } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';
import type { GameState } from '../src/brain/types';
//  STAGE-THEN-CONFIRM. Since the never-auto-commit ruling, `tryCombineWith` returns a
//  QUESTION and spends nothing; the attempt happens when the survivor answers it. These tests
//  exercise attempts, so they answer it — see tests/helpers/confirmed.ts.
import { attemptConfirmed } from './helpers/confirmed';

function fresh(): GameState {
    return fullBody(createInitialState(1_700_000_000_000));
}

/** Everything a raft costs, in hand. */
function stocked(s: GameState): GameState {
    s.inventory.wood = TUNE.raftWoodCost;
    s.inventory.fiber = TUNE.raftFiberCost;
    s.inventory.coconut = TUNE.raftCoconutCost;
    return s;
}

/** Standing at the water's edge on the wreck's bearing. */
function atShore(s: GameState): GameState {
    s.player.x = 0;
    s.player.y = SURF_LINE_RADIUS - 2;
    return s;
}

function memoryRepo(): SaveRepository {
    let held: string | null = null;
    return { read: () => held, write: (v: string) => { held = v; }, clear: () => { held = null; } };
}

// ---------------------------------------------------------------------------
describe('the raft is discovered by its OWN gesture, not by a third go at wood + fibre', () => {
    it('its tag signature is unique — no other recipe shares it', () => {
        /**
         * [[D-114]] settled that sharing a tag set is legal: `resolveRecipe` rotates on
         * `experimentCount` rather than crowning a winner, so sharing costs an attempt and
         * never access. But wood+fibre already carries the torch AND the backpack, and a
         * THIRD claimant would make that gesture a lottery — which teaches a player that the
         * world is arbitrary rather than that they are experimenting.
         */
        const signature = (id: string) => allRecipes()
            .find((r) => r.id === id)!.slots
            .map((sl) => sl.require.tag ?? sl.require.family)
            .sort().join('+');
        const raft = signature('raft');
        const clashes = allRecipes().filter((r) => r.id !== 'raft' && signature(r.id) === raft);
        expect(clashes.map((r) => r.id)).toEqual([]);
    });

    it('REGRESSION — food is still structurally inert, so berries make no raft', () => {
        /**
         * PROVEN TO FAIL PRE-FIX (D-066 b), inside this slice's own build: the first cut of
         * the float slot required `{ tag: 'food' }`, and `experiment.test.ts`'s standing law
         * *"berries go with nothing — food satisfies no structural slot"* went red immediately
         * — wood + fibre + berries resolved to a RAFT.
         *
         * The law was right and the recipe was wrong. `buoyant` names the property that
         * actually distinguishes a coconut husk from a berry, and lives on the material rather
         * than in the recipe that wants it.
         */
        const raftSlots = allRecipes().find((r) => r.id === 'raft')!.slots;
        const float = raftSlots.find((sl) => sl.id === 'raft-float')!;
        expect(materialSatisfies('coconut', float.require)).toBe(true);
        for (const inert of ['berries', 'shellfish', 'meat'] as const) {
            expect(materialSatisfies(inert, float.require), `${inert} must not float a raft`).toBe(false);
        }
    });

    it('staging deck + lashing + float resolves to the raft and nothing else', () => {
        const s = stocked(fresh());
        expect(resolveRecipe(s, ['wood', 'fiber', 'coconut'])?.id).toBe('raft');
    });

    it('...and wood + fibre alone is still the torch/backpack gesture, untouched', () => {
        const s = stocked(fresh());
        expect(['torch', 'backpack']).toContain(resolveRecipe(s, ['wood', 'fiber'])?.id);
    });

    it('the route needs a survivor who has BEEN in the water — not one who looked at it', () => {
        const route = DISCOVERY_ROUTES.find((r) => r.recipeId === 'raft');
        expect(route, 'the raft must have a discovery route at all').toBeDefined();
        const beachcomber = stocked(atShore(fresh()));
        expect(suspicionFor(beachcomber, 'raft')?.suspected,
            'standing on the sand looking out is not a pressure').toBe(false);

        const swimmer = stocked(atShore(fresh()));
        swimmer.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        expect(suspicionFor(swimmer, 'raft')?.suspected).toBe(true);
    });

    it('the suspicion never names the product — the pivot law, applied to the biggest craft', () => {
        const s = stocked(atShore(fresh()));
        s.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        const prompt = suspicionFor(s, 'raft')?.prompt ?? '';
        expect(prompt.length).toBeGreaterThan(0);
        expect(prompt.toLowerCase()).not.toContain('raft');
    });

    it('a fresh castaway stands at the bottom rung for it', () => {
        expect(ladderFor(fresh(), 'raft')).toBe('physically-possible');
    });

    it('and a real attempt can reach it — discovery, not a hardcoded row', () => {
        const s = stocked(fresh());
        s.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        s.inventory.wood = 50; s.inventory.fiber = 50; s.inventory.coconut = 50;
        let reached = false;
        for (let i = 0; i < 200 && !reached; i++) {
            s.energy = 100; s.hunger = 100; s.thirst = 100;
            attemptConfirmed(s, ['wood', 'fiber', 'coconut']);
            reached = s.blueprints.some((b) => b.recipeId === 'raft');
        }
        expect(reached).toBe(true);
    });
});

// ---------------------------------------------------------------------------
describe('the site IS the decision — and it is stated before the wood is spent', () => {
    it('inland, with every material in hand, it is REFUSED and costs nothing', () => {
        const s = stocked(fresh());
        s.player.x = 0; s.player.y = 20;
        expect(nearShoreForRaft(s)).toBe(false);
        expect(canCraftRaft(s)).toBe(false);
        expect(craftRaft(s)).toBe(false);
        //  The whole point: fourteen wood is the most expensive craft in the game, and a
        //  refusal that took it anyway would be a trap rather than a rule.
        expect(s.inventory.wood).toBe(TUNE.raftWoodCost);
        expect(s.inventory.fiber).toBe(TUNE.raftFiberCost);
        expect(s.inventory.coconut).toBe(TUNE.raftCoconutCost);
        expect(s.raft.built).toBe(false);
    });

    it('and the refusal NAMES the site, not a generic failure (D-042 fail-loud)', () => {
        const s = stocked(fresh());
        s.player.x = 0; s.player.y = 20;
        const why = raftBlocker(s) ?? '';
        expect(why.toLowerCase()).toContain('water');
    });

    it('short of materials, the blocker names the SHORTFALL first — the thing to go fix', () => {
        const s = atShore(fresh());
        s.inventory.wood = 1; s.inventory.fiber = 0; s.inventory.coconut = 0;
        const why = raftBlocker(s) ?? '';
        expect(why.toLowerCase()).toContain('wood');
        expect(raftShortfall(s).wood).toBe(TUNE.raftWoodCost - 1);
    });

    it('at the shore it builds, spends exactly the recipe, and moors AFLOAT', () => {
        const s = stocked(atShore(fresh()));
        expect(craftRaft(s)).toBe(true);
        expect(s.inventory.wood).toBe(0);
        expect(s.inventory.fiber).toBe(0);
        expect(s.inventory.coconut).toBe(0);
        expect(s.raft.built).toBe(true);
        //  Moored on water, not on the sand it was assembled on — `steerRaft` refuses dry
        //  ground, so a raft born ashore would be un-steerable the moment it was made.
        expect(isDryLand(s.raft.x, s.raft.y)).toBe(false);
    });

    it('it moors on the survivor\'s OWN bearing, not at some fixed point', () => {
        for (const bearing of [0, Math.PI / 2, Math.PI, -Math.PI / 3]) {
            const s = stocked(fresh());
            const r = SURF_LINE_RADIUS - 2;
            s.player.x = Math.cos(bearing) * r;
            s.player.y = Math.sin(bearing) * r;
            expect(craftRaft(s)).toBe(true);
            const moored = Math.atan2(s.raft.y, s.raft.x);
            expect(Math.abs(Math.atan2(Math.sin(moored - bearing), Math.cos(moored - bearing))))
                .toBeLessThan(1e-6);
        }
    });

    it('never twice', () => {
        const s = stocked(atShore(fresh()));
        expect(craftRaft(s)).toBe(true);
        stocked(s);
        expect(craftRaft(s)).toBe(false);
    });

    it('the grade is rolled once, deterministically — the shipped technique, not a new one', () => {
        const a = stocked(atShore(fresh()));
        const b = stocked(atShore(fresh()));
        craftRaft(a);
        craftRaft(b);
        expect(a.raft.grade).toBe(b.raft.grade);
    });
});

// ---------------------------------------------------------------------------
describe('it BOARDS and it CARRIES — not a prop', () => {
    function afloat(): GameState {
        const s = stocked(atShore(fresh()));
        craftRaft(s);
        return s;
    }

    it('boarding needs you alongside it, and says so when you are not', () => {
        const s = afloat();
        s.player.x = 0; s.player.y = 0;
        expect(canBoardRaft(s)).toBe(false);
        expect(boardRaft(s)).toBe(false);
        const blocked = verbsFor(s, 'raft').find((v) => v.id === 'board-raft');
        expect(blocked?.available).toBe(false);
        expect(blocked?.reason).toBeTruthy();
    });

    it('alongside, you climb on and your position becomes the deck\'s', () => {
        const s = afloat();
        s.player.x = s.raft.x;
        s.player.y = s.raft.y;
        expect(boardRaft(s)).toBe(true);
        expect(s.raft.aboard).toBe(true);
        expect(s.player.x).toBe(s.raft.x);
        expect(s.player.y).toBe(s.raft.y);
    });

    it('THE RAFT MOVES THE PLAYER — the online tick drags the deck along', () => {
        const repo = memoryRepo();
        const start = afloat();
        start.player.x = start.raft.x;
        start.player.y = start.raft.y;
        boardRaft(start);
        repo.write(serialize(start, 0));

        const { session } = Session.start(repo, 0);
        //  The body moves the survivor; the brain's job is that the raft follows. Simulate one
        //  frame of paddling by putting the player where the stick would have taken them.
        session.state.player.y += 20;
        session.tick(realSecondsPerGameHour * 0.05);
        expect(session.state.raft.y).toBeCloseTo(session.state.player.y, 6);
        expect(session.state.raft.x).toBeCloseTo(session.state.player.x, 6);
    });

    it('it GROUNDS rather than driving up the beach', () => {
        //  Steering shoreward from open water: the step onto dry land is refused, so the deck
        //  noses into the shallows and stops. A raft that could be steered onto grass would be
        //  a boat used as a car, and faster than walking.
        const onWater = { x: 0, y: SURF_LINE_RADIUS + 6 };
        const ontoSand = { x: 0, y: SURF_LINE_RADIUS - 10 };
        const held = steerRaft(onWater.x, onWater.y, ontoSand.x, ontoSand.y);
        expect(held).toEqual(onWater);
    });

    it('...but the shallows are water, so it can be nosed right up to the sand', () => {
        const wading = (() => {
            for (let r = SURF_LINE_RADIUS; r > SURF_LINE_RADIUS - 20; r -= 0.05) {
                if (waterZoneAt(0, r) === 'wading') return r;
            }
            throw new Error('no wading band inside the surf line');
        })();
        const moved = steerRaft(0, SURF_LINE_RADIUS + 6, 0, wading);
        expect(moved).toEqual({ x: 0, y: wading });
    });

    it('stepping off at the shore lands you on DRY GROUND', () => {
        const s = afloat();
        s.player.x = s.raft.x;
        s.player.y = s.raft.y;
        boardRaft(s);
        expect(leaveRaftIsIntoWater(s)).toBe(false);
        expect(leaveRaft(s)).toBe(true);
        expect(s.raft.aboard).toBe(false);
        expect(isDryLand(s.player.x, s.player.y)).toBe(true);
    });

    it('stepping off in open water says SO BEFOREHAND — never a surprise', () => {
        const s = afloat();
        s.raft.x = WRECK.x;
        s.raft.y = WRECK.y;
        s.player.x = WRECK.x;
        s.player.y = WRECK.y;
        s.raft.aboard = true;
        expect(leaveRaftIsIntoWater(s)).toBe(true);
        const leave = verbsFor(s, 'raft').find((v) => v.id === 'leave-raft');
        expect(leave?.available).toBe(true);
        expect(leave?.label.toLowerCase()).toContain('water');
        //  ...and it genuinely leaves you out there. No rescue-teleport.
        leaveRaft(s);
        expect(Math.hypot(s.player.x, s.player.y)).toBeGreaterThan(SURF_LINE_RADIUS);
    });

    it('board and leave are DISJOINT — the circle can never reach two segments', () => {
        //  [[D-119]]'s verb-count ceiling: five verbs on one object made it unpickable. The
        //  raft is structurally incapable of contributing to that, and this is the assertion
        //  that keeps it so if a third raft verb is ever added.
        const s = afloat();
        s.player.x = s.raft.x;
        s.player.y = s.raft.y;
        expect(availableVerbs(s, 'raft').length).toBe(1);
        expect(defaultVerb(s, 'raft')?.id).toBe('board-raft');
        //  INVERTED BY THE UNIVERSAL LONG-PRESS RULING. The raft's two verbs can never both be
        //  available, so it was the permanent one-segment case and the old rule meant a hold on
        //  it never opened anything. It now asks like everything else — and this target is the
        //  reason the ruling matters: stepping off a raft a hundred metres out is exactly the
        //  irreversible act that should never arrive from a gesture that did not show its hand.
        expect(holdOpensCircle(s, 'raft')).toBe(true);

        boardRaft(s);
        expect(availableVerbs(s, 'raft').length).toBe(1);
        expect(availableVerbs(s, 'raft')[0].id).toBe('leave-raft');
    });
});

// ---------------------------------------------------------------------------
describe('the raft is the ANSWER to the crossing', () => {
    function aboardAt(x: number, y: number): GameState {
        const s = stocked(atShore(fresh()));
        craftRaft(s);
        s.raft.x = x; s.raft.y = y; s.raft.aboard = true;
        s.player.x = x; s.player.y = y;
        return s;
    }

    function runOnline(s: GameState, realSeconds: number): GameState {
        const repo = memoryRepo();
        repo.write(serialize(s, 0));
        const { session } = Session.start(repo, 0);
        session.state.player.x = s.player.x;
        session.state.player.y = s.player.y;
        session.state.raft = { ...s.raft };
        session.tick(realSeconds);
        return session.state;
    }

    it('a paddler is not soaked and pays a fraction of a swimmer\'s energy', () => {
        const span = realSecondsPerGameHour * 0.5;
        const paddled = runOnline(aboardAt(0, SURF_LINE_RADIUS + 40), span);

        const swimming = stocked(atShore(fresh()));
        craftRaft(swimming);
        swimming.raft.aboard = false;
        swimming.player.x = 0; swimming.player.y = SURF_LINE_RADIUS + 40;
        const swum = runOnline(swimming, span);

        expect(paddled.wet).toBe(0);
        expect(swum.wet).toBe(TUNE.wetMax);
        //  The gap IS the raft. If it ever narrows to nothing, the crossing has stopped
        //  having an answer and the fourteen wood buys a cosmetic.
        const paddleSpent = TUNE.energyMax - paddled.energy;
        const swimSpent = TUNE.energyMax - swum.energy;
        expect(swimSpent).toBeGreaterThan(paddleSpent * 3);
    });

    it('reaching the wreck is RECORDED, once, with the moment it happened', () => {
        const arrived = runOnline(aboardAt(WRECK.x, WRECK.y), realSecondsPerGameHour * 0.05);
        expect(arrived.wreck.reached).toBe(true);
        expect(arrived.wreck.reachedAtGameHours).not.toBeNull();
    });

    it('...and being NEARLY there is not being there', () => {
        const short = runOnline(
            aboardAt(WRECK.x, WRECK.y - TUNE.wreckArrivalRadiusM - 5),
            realSecondsPerGameHour * 0.05,
        );
        expect(short.wreck.reached).toBe(false);
    });

    it('a SWIMMER who makes it is recorded too — the raft is the answer, not the gate', () => {
        const swimmer = fresh();
        swimmer.player.x = WRECK.x;
        swimmer.player.y = WRECK.y;
        const arrived = runOnline(swimmer, realSecondsPerGameHour * 0.05);
        expect(arrived.wreck.reached).toBe(true);
    });

    it('it is MONOTONIC — sailing away never un-reaches it', () => {
        const s = aboardAt(WRECK.x, WRECK.y);
        const there = runOnline(s, realSecondsPerGameHour * 0.05);
        expect(there.wreck.reached).toBe(true);
        there.player.x = 0; there.player.y = 0;
        there.raft.x = 0; there.raft.y = 0;
        const back = runOnline(there, realSecondsPerGameHour * 0.5);
        expect(back.wreck.reached).toBe(true);
    });
});

// ---------------------------------------------------------------------------
describe('matter, memory, and the save', () => {
    it('the raft SURVIVES a death — it is matter, like the store box', () => {
        const s = stocked(atShore(fresh()));
        craftRaft(s);
        const moored = { x: s.raft.x, y: s.raft.y };
        const { next } = closeSurvivor(s, 'the cold');
        expect(next.raft.built).toBe(true);
        expect(next.raft.x).toBe(moored.x);
        expect(next.raft.y).toBe(moored.y);
    });

    it('...but ABOARD does not. A body standing on a deck is a body, and it died', () => {
        const s = stocked(atShore(fresh()));
        craftRaft(s);
        s.raft.aboard = true;
        const { next } = closeSurvivor(s, 'the cold');
        expect(next.raft.aboard).toBe(false);
    });

    it('the wreck\'s history survives too — evidence, never technique ([[D-069]])', () => {
        const s = fresh();
        s.wreck = { reached: true, reachedAtGameHours: 42, instability: 0, lastDisturbedAtGameHours: null };
        const { next } = closeSurvivor(s, 'the cold');
        expect(next.wreck.reached).toBe(true);
        //  And it is still only evidence: the successor does not inherit the raft's PATTERN.
        expect(ladderFor(next, 'raft')).not.toBe('demonstrated');
    });

    it('MIGRATION v22 -> v23: a returning save gains the sea, not the raft', () => {
        const old = stocked(atShore(fresh())) as unknown as Record<string, unknown>;
        delete old.raft;
        delete old.wreck;
        const envelope = JSON.stringify({
            schemaVersion: 22, savedAtMs: 1_700_000_000_000, state: { ...old, schemaVersion: 22 },
        });
        const loaded = deserialize(envelope);
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);
        //  NOT handed over: the most expensive craft in the game, and a journey nobody made.
        expect(loaded!.state.raft.built).toBe(false);
        expect(loaded!.state.raft.aboard).toBe(false);
        expect(loaded!.state.wreck.reached).toBe(false);
        //  Handed over for free, because it is geology: the sea outside the island now has a
        //  floor, and a save that never gained one would be a save on a different island.
        expect(waterZoneAt(WRECK.x, WRECK.y)).toBe('swimming');
    });

    it('an existing raft survives the migration untouched', () => {
        const old = stocked(atShore(fresh()));
        craftRaft(old);
        const envelope = JSON.stringify({
            schemaVersion: 22, savedAtMs: 1_700_000_000_000, state: { ...old, schemaVersion: 22 },
        });
        const loaded = deserialize(envelope);
        expect(loaded!.state.raft.built).toBe(true);
        expect(loaded!.state.raft.x).toBe(old.raft.x);
    });

    it('a raft round-trips through serialize/deserialize with its position intact', () => {
        const s = stocked(atShore(fresh()));
        craftRaft(s);
        s.raft.x = WRECK.x;
        s.raft.y = WRECK.y;
        const back = deserialize(serialize(s, 1_700_000_000_000));
        expect(back!.state.raft.x).toBe(WRECK.x);
        expect(back!.state.raft.y).toBe(WRECK.y);
    });
});

// ---------------------------------------------------------------------------
describe('the raft reaches the SURFACE — a hardcoded list found by reading', () => {
    /**
     * Found by reading `reveal.ts` while the device harness was mid-run, the same class the
     * file's own comments warn about: **a gate you have to remember to extend is a defect
     * with a delay on it.** Regression-locked here rather than merely fixed.
     *
     * ITS SIBLING — "a built raft stops being an offer" (`satisfied()`'s own missing raft
     * case, inside the retired `makerOffers`) — IS GONE (item 1, this batch). `makerOffers`
     * and `satisfied` no longer exist; there is no door left that could stay open on a moored
     * raft, so the regression it guarded against cannot recur in any form. See the ledger.
     */
    it('REGRESSION — the raft\'s suspicion can actually REACH the panel as a hint', () => {
        const s = stocked(atShore(fresh()));
        s.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        //  WITNESS: the suspicion is genuinely live, so a missing hint below is the SURFACE
        //  failing rather than the route.
        expect(suspicionFor(s, 'raft')?.suspected).toBe(true);
        //  Pre-fix `panelHints` walked a hardcoded ['torch','shelter','axe','stonehammer',
        //  'storage'], so this returned nothing for the raft — the route was real, tested,
        //  and invisible. [[D-114]]'s class exactly.
        const hint = panelHints(s).find((h) => h.recipeId === 'raft');
        expect(hint, 'the raft has a live suspicion and no way to say so').toBeDefined();
        expect(hint!.prompt.toLowerCase()).not.toContain('raft');
    });

    it('...and the hints are DERIVED, so a future route cannot be invisible either', () => {
        //  The durable half. Every routed recipe must be capable of producing a hint; if a
        //  seventh route ships and this file is not touched, this still holds.
        const routed = DISCOVERY_ROUTES.map((r) => r.recipeId);
        const s = fresh();
        //  Hold everything and feel every need, so every route that CAN fire does.
        for (const k of Object.keys(s.inventory) as Array<keyof typeof s.inventory>) s.inventory[k] = 30;
        s.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        s.warmth = 1;
        const reachable = new Set(panelHints(s).map((h) => h.recipeId));
        //  A suspected recipe that is ALREADY REVEALED correctly gets a row instead of a hint
        //  — "once the row is there, the hint has done its work". The torch is the live case
        //  (Law 113's scaffold reveals it on suspicion alone), and excluding it here is the
        //  difference between asserting the rule and asserting a misreading of it.
        const live = routed.filter((id) =>
            suspicionFor(s, id)?.suspected === true && !revealedInPanel(s, id));
        expect(live.length, 'no unrevealed route fired at all — the fixture is wrong').toBeGreaterThan(1);
        for (const id of live) {
            expect(reachable.has(id), `${id} is suspected, unrevealed, and cannot say so`).toBe(true);
        }
    });
});
