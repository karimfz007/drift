/**
 * THE ONE BODY RESOLVER — the properties, not the examples.
 *
 * This is a refactor of the simulation core, which means the tests that matter are the ones
 * that would catch a change nobody intended. Three families carry the weight:
 *
 *   1. EQUIVALENCE — every activity, routed through the resolver, spends exactly the energy
 *      the flat subtraction spent. Proved per activity and swept over load bands, because
 *      "the algebra works out" is a claim about my arithmetic, not about the code.
 *   2. MONOTONICITY — the direction of every body term. A heavier load never costs less; a
 *      wounded body never works cheaper. These are the invariants that survive retuning.
 *   3. THE HEALTH WALL — §12's hardest line. Ordinary work must NEVER touch health, at any
 *      workload, in any state. Swept over thousands of bodies rather than asserted once.
 */
import { describe, expect, it } from 'vitest';
import {
    applyEffect, demandFor, environmentFactorOf, impairmentOf, resolveActivity,
} from '../src/brain/resolver';
import { createInitialState, effortEnergyCostFor } from '../src/brain/state';
import { loadEnergyMultiplierOf } from '../src/brain/body';
import { TUNE } from '../src/data/tune';
import type { GameState, NodeKind } from '../src/brain/types';

const EFFORTFUL: NodeKind[] = ['tree', 'deadfall', 'rock', 'quarry', 'coconutpalm', 'crashbox'];

/**
 * A comfortable, unencumbered, uninjured body — every body term at its neutral 1.
 *
 * WARMTH SITS MID-BAND, NOT AT MAX, and finding that out is the first thing these tests
 * taught me. `warmthMax` is **heat-strain**, by design: §12 is explicit that more warmth is
 * not automatically better, and `thermalStrain` puts anything above `thermalHeatStrainAt`
 * into the same costed band as freezing. A fixture built at full bars was therefore not a
 * neutral body at all — it was a survivor cooking — and it made the equivalence check read
 * a 1.3 environment multiplier as if the resolver were overcharging.
 *
 * The midpoint of [thermalComfortLow, thermalComfortHigh] is the only warmth with no term
 * attached to it, so it is the only honest baseline for measuring what an ACT costs.
 */
function neutral(): GameState {
    const s = createInitialState(0);
    s.warmth = (TUNE.thermalComfortLow + TUNE.thermalComfortHigh) / 2;
    s.health = TUNE.healthMax;
    s.fatigue = 0;
    s.hunger = TUNE.hungerMax;
    s.thirst = TUNE.thirstMax;
    s.energy = TUNE.energyMax;
    return s;
}

describe('EQUIVALENCE — the resolver spends exactly what the flat subtraction spent', () => {
    it('reproduces every effortful activity, to the bit, on a neutral body', () => {
        //  THE FAIL-THEN-PASS THAT MATTERS FOR A REFACTOR. If this drifts, the unification
        //  changed the game while claiming not to — which is the one outcome a unification
        //  is not allowed to have.
        const s = neutral();
        for (const kind of EFFORTFUL) {
            const shipped = effortEnergyCostFor(kind) * loadEnergyMultiplierOf(s);
            const effect = resolveActivity(s, {
                id: kind, baseDemand: demandFor(effortEnergyCostFor(kind)), durationGameHours: 1,
            });
            expect(effect.channels.energy, `${kind} costs a different energy than it shipped`)
                .toBeCloseTo(shipped, 9);
        }
    });

    it('...and still reproduces it under every load band', () => {
        //  Load is the one body term that was ALREADY applied at the old call site, so it is
        //  the one that must still land identically rather than merely similarly.
        for (const wood of [0, 10, 30, 60, 120]) {
            const s = neutral();
            s.inventory.wood = wood;
            const mult = loadEnergyMultiplierOf(s);
            for (const kind of EFFORTFUL) {
                const shipped = effortEnergyCostFor(kind) * mult;
                const effect = resolveActivity(s, {
                    id: kind, baseDemand: demandFor(effortEnergyCostFor(kind)), durationGameHours: 1,
                });
                expect(effect.channels.energy, `${kind} @ ${wood} wood`).toBeCloseTo(shipped, 9);
            }
        }
    });

    it('a tap-cost activity still costs nothing at all', () => {
        const s = neutral();
        const effect = resolveActivity(s, { id: 'driftwood', baseDemand: demandFor(0), durationGameHours: 1 });
        expect(effect.channels.energy).toBe(0);
        expect(effect.channels.hydration).toBe(0);
        expect(effect.workload).toBe(0);
    });
});

describe('MONOTONICITY — the direction of every term, swept', () => {
    it('a heavier load never costs LESS, across the whole range', () => {
        let previous = -Infinity;
        for (let wood = 0; wood <= 200; wood += 5) {
            const s = neutral();
            s.inventory.wood = wood;
            const cost = resolveActivity(s, { id: 'chop', baseDemand: 2, durationGameHours: 1 }).channels.energy;
            expect(cost, `cost fell going from lighter to ${wood} wood`).toBeGreaterThanOrEqual(previous);
            previous = cost;
        }
    });

    it('a more wounded, more tired, or colder body never works CHEAPER', () => {
        //  Swept independently so one term cannot mask another's inversion.
        for (const [field, worst] of [['health', 0], ['fatigue', TUNE.fatigueMax], ['warmth', 0]] as const) {
            const good = neutral();
            const bad = neutral();
            (bad as unknown as Record<string, number>)[field] = worst;
            expect(impairmentOf(bad), `${field} at its worst should not lower impairment`)
                .toBeGreaterThanOrEqual(impairmentOf(good));
        }
    });

    it('impairment is BOUNDED — a ruined body works harder, never impossibly hard', () => {
        const ruined = neutral();
        ruined.health = 0; ruined.fatigue = TUNE.fatigueMax; ruined.warmth = 0;
        expect(impairmentOf(ruined)).toBeLessThanOrEqual(TUNE.impairmentMaxMultiplier);
        expect(impairmentOf(ruined)).toBeGreaterThan(1);
    });

    it('a comfortable body pays the neutral 1 for both body terms — no hidden tax', () => {
        //  If either drifts off 1 for a healthy survivor, every shipped number moves at once.
        expect(impairmentOf(neutral())).toBe(1);
        expect(environmentFactorOf(neutral())).toBe(1);
    });

    it('longer work costs strictly more, and doubling the duration doubles the workload', () => {
        const s = neutral();
        const one = resolveActivity(s, { id: 'w', baseDemand: 3, durationGameHours: 1 }).workload;
        const two = resolveActivity(s, { id: 'w', baseDemand: 3, durationGameHours: 2 }).workload;
        expect(two).toBeCloseTo(one * 2, 9);
    });
});

describe('THE HEALTH WALL — ordinary work NEVER costs health (§12)', () => {
    it('for 3000 random bodies at random workloads, health harm is exactly zero', () => {
        //  §12's table says health must not mean "a general price paid for ordinary work".
        //  The only route is a NAMED hazard, and this sweeps hard enough to catch a leak
        //  someone adds later by routing a cost through the wrong channel.
        let seed = 20260802;
        const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        for (let i = 0; i < 3000; i += 1) {
            const s = neutral();
            s.health = rand() * TUNE.healthMax;
            s.warmth = rand() * TUNE.warmthMax;
            s.fatigue = rand() * TUNE.fatigueMax;
            s.hunger = rand() * TUNE.hungerMax;
            s.inventory.wood = Math.floor(rand() * 200);
            const before = s.health;
            const effect = resolveActivity(s, {
                id: 'work', baseDemand: rand() * 20, durationGameHours: rand() * 8, pace: 0.5 + rand() * 2,
            });
            expect(effect.channels.health, 'the work channel put a cost on health').toBe(0);
            expect(effect.healthHarm, 'ordinary work produced health harm').toBe(0);
            applyEffect(s, effect);
            expect(s.health, 'applying a work effect moved health').toBe(before);
        }
    });

    it('...and a NAMED hazard is the one thing that does move it', () => {
        //  The wall must not be a wall against everything, or injury could never exist.
        const s = neutral();
        const effect = resolveActivity(s, {
            id: 'felling', baseDemand: 2, durationGameHours: 1, hazard: 'injury', hazardSeverity: 1,
        });
        expect(effect.healthHarm).toBeGreaterThan(0);
        applyEffect(s, effect);
        expect(s.health).toBeLessThan(TUNE.healthMax);
    });
});

describe('THE JOIN — work heat reaches the exposure chain', () => {
    it('working produces more metabolic heat than resting, through ONE answer', () => {
        //  This is the join that did not exist: `channelsFor` computed a thermal gain that
        //  was discarded, while `netHeatFlowPerGameHour` was asked separately. Two answers to
        //  one question is how a body warms itself in one system and freezes in another.
        const s = neutral();
        const idle = resolveActivity(s, { id: 'idle', baseDemand: 1, durationGameHours: 1, pace: 0.1 });
        const hard = resolveActivity(s, { id: 'hard', baseDemand: 1, durationGameHours: 1, pace: 2 });
        expect(hard.heatFlow.metabolic).toBeGreaterThan(idle.heatFlow.metabolic);
        expect(hard.channels.thermalGain).toBeGreaterThan(0);
    });

    it('a starved body makes less heat for the same work — cold and hunger compound', () => {
        const fed = neutral();
        const starved = neutral();
        starved.hunger = 0;
        const decl = { id: 'work', baseDemand: 2, durationGameHours: 1 };
        expect(resolveActivity(starved, decl).heatFlow.metabolic)
            .toBeLessThan(resolveActivity(fed, decl).heatFlow.metabolic);
    });
});

describe('PURITY — the resolver reads, it never writes', () => {
    it('resolving thousands of activities never mutates the body it was given', () => {
        //  What lets reconcile and the verbs share it without either owning it.
        const s = neutral();
        s.inventory.wood = 40;
        const snapshot = JSON.stringify(s);
        for (let i = 0; i < 500; i += 1) {
            resolveActivity(s, { id: 'w', baseDemand: i % 7, durationGameHours: (i % 5) + 1 });
        }
        expect(JSON.stringify(s)).toBe(snapshot);
    });
});

describe('WALKING, at last — ITEM 5 (this batch): the contract `game.ts`\'s stepMovement leans on', () => {
    //  THE REGRESSION ITEM 5 CLOSES. Investigated before assuming a fix, per the director's
    //  own instruction: neither ordinary walking nor loaded movement ever charged anything
    //  MOVEMENT-specific. `loadEnergyMultiplierOf` is real and shipped, but every call site —
    //  `reconcile.ts`'s ambient drain, this file's own gather cost, `water.ts`'s swim/wade
    //  cost — prices either the passage of time or a named act, never covering ground. A
    //  survivor standing still in a heavy pack and one sprinting laps in it drained
    //  identically. `game.ts`'s `stepMovement` now declares a `'walk'` activity through this
    //  exact resolver, gated to genuine on-foot travel; what is asserted here is the contract
    //  that wiring depends on, not the wiring itself, which lives in the body layer this
    //  file's own purity boundary keeps out of vitest (see `tools/smoke.mjs` for that half).
    it('costs real energy — the exact regression: walking is not free', () => {
        const s = neutral();
        const before = s.energy;
        const effect = resolveActivity(s, {
            id: 'walk', baseDemand: TUNE.walkBaseDemand, durationGameHours: 1,
        });
        expect(effect.channels.energy, 'a game hour of walking costs nothing — the reported bug, verbatim').toBeGreaterThan(0);
        applyEffect(s, effect);
        expect(s.energy).toBeLessThan(before);
    });

    it('is LINEAR in duration — a 30 fps client and a 60 fps client pay the same total', () => {
        //  `advanceWater`'s own doc comment states this rule for the water pipeline; walking
        //  now needs it too, because `stepMovement` calls this once per rendered frame rather
        //  than once per fixed span. `workloadOf` is a straight product with duration as one
        //  factor, so summing N slices must equal one call over the whole span — this is what
        //  makes that algebraic claim a checked fact instead of an assumption.
        const s = neutral();
        const wholeSpan = resolveActivity(s, {
            id: 'walk', baseDemand: TUNE.walkBaseDemand, durationGameHours: 1,
        }).channels.energy;

        const frames = 60; // a plausible 60 fps second
        let summed = 0;
        for (let i = 0; i < frames; i += 1) {
            summed += resolveActivity(s, {
                id: 'walk', baseDemand: TUNE.walkBaseDemand, durationGameHours: 1 / frames,
            }).channels.energy;
        }
        expect(summed).toBeCloseTo(wholeSpan, 9);
    });

    it('a heavier pack costs more to walk in, never less — the same body term chopping pays', () => {
        const light = neutral();
        const heavy = neutral();
        heavy.inventory.wood = 40; // real carried mass, not a flag
        const decl = { id: 'walk', baseDemand: TUNE.walkBaseDemand, durationGameHours: 1 };
        expect(resolveActivity(heavy, decl).channels.energy)
            .toBeGreaterThan(resolveActivity(light, decl).channels.energy);
    });

    it('never touches health — walking is ordinary work, and ordinary work cannot harm', () => {
        const s = neutral();
        expect(resolveActivity(s, {
            id: 'walk', baseDemand: TUNE.walkBaseDemand, durationGameHours: 1,
        }).channels.health).toBe(0);
    });

    it('standing still costs nothing — zero duration is zero effect, not a floor or a minimum', () => {
        const s = neutral();
        const effect = resolveActivity(s, {
            id: 'walk', baseDemand: TUNE.walkBaseDemand, durationGameHours: 0,
        });
        expect(effect.channels.energy).toBe(0);
        expect(effect.channels.stamina).toBe(0);
        expect(effect.channels.hydration).toBe(0);
    });
});
