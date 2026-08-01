import { describe, expect, it } from 'vitest';
import {
    carriedWeightKg,
    fatigueStage,
    fatigueStatusText,
    loadBandForKg,
    loadBandOf,
    loadEnergyMultiplierForKg,
    loadSpeedMultiplierForKg,
    overloadStepsForKg,
    loadEnergyMultiplierFor,
    loadSpeedMultiplierFor,
} from '../src/brain/body';
import { reconcile } from '../src/brain/reconcile';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { Session } from '../src/brain/session';
import { buildShelter, createInitialState } from '../src/brain/state';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';
import { SCHEMA_VERSION, type GameState } from '../src/brain/types';

const DAY = 86400;

function run(): GameState {
    return createInitialState(0);
}

/** A castaway asleep in a built shelter, standing on it — the rest path's real precondition. */
function shelteredAt(s: GameState): GameState {
    s.inventory.wood = 99;
    s.inventory.stone = 99;
    s.inventory.fiber = 99;
    buildShelter(s, s.player.x, s.player.y);
    s.player = { x: s.shelter.x, y: s.shelter.y };
    s.inventory.wood = 0;
    s.inventory.stone = 0;
    s.inventory.fiber = 0;
    return s;
}

describe('body — carry weight and the three load bands (Ch.6 part 1)', () => {
    it('an empty-handed castaway carries nothing and reads Light', () => {
        const s = run();
        expect(carriedWeightKg(s)).toBe(0);
        expect(loadBandOf(s)).toBe('light');
    });

    it('weight is the sum of every stack at its per-unit mass, plus each owned tool', () => {
        const s = run();
        s.inventory.wood = 3;
        s.inventory.stone = 2;
        s.tools.axe = true;
        const expected = 3 * TUNE.materialMassKg.wood + 2 * TUNE.materialMassKg.stone + TUNE.toolMassKg.axe;
        expect(carriedWeightKg(s)).toBeCloseTo(expected, 9);
    });

    it('an owned torch counts; a spent one stops counting', () => {
        const s = run();
        s.torch = { owned: true, lit: false, fuelGameHoursRemaining: 3, grade: 'serviceable' };
        expect(carriedWeightKg(s)).toBeCloseTo(TUNE.toolMassKg.torch, 9);
        s.torch.owned = false;
        expect(carriedWeightKg(s)).toBe(0);
    });

    it('the band thresholds are ceilings you cross, not ones you sit on', () => {
        expect(loadBandForKg(0)).toBe('light');
        expect(loadBandForKg(TUNE.loadWorkingAtKg)).toBe('light'); // exactly at: still light
        expect(loadBandForKg(TUNE.loadWorkingAtKg + 0.01)).toBe('working');
        expect(loadBandForKg(TUNE.loadHeavyAtKg)).toBe('working'); // exactly at: still working
        expect(loadBandForKg(TUNE.loadHeavyAtKg + 0.01)).toBe('heavy');
    });

    it('Light is exactly 1 on both multipliers — the system is invisible until it is earned', () => {
        expect(loadSpeedMultiplierFor('light')).toBe(1);
        expect(loadEnergyMultiplierFor('light')).toBe(1);
    });

    it('heavier bands are strictly slower and strictly costlier, in that order', () => {
        expect(loadSpeedMultiplierFor('working')).toBeLessThan(loadSpeedMultiplierFor('light'));
        expect(loadSpeedMultiplierFor('heavy')).toBeLessThan(loadSpeedMultiplierFor('working'));
        expect(loadEnergyMultiplierFor('working')).toBeGreaterThan(loadEnergyMultiplierFor('light'));
        expect(loadEnergyMultiplierFor('heavy')).toBeGreaterThan(loadEnergyMultiplierFor('working'));
    });

    it('D-059 — overload steps are zero at or below the Heavy threshold, then climb', () => {
        expect(overloadStepsForKg(0)).toBe(0);
        expect(overloadStepsForKg(TUNE.loadHeavyAtKg)).toBe(0);
        expect(overloadStepsForKg(TUNE.loadHeavyAtKg + TUNE.loadOverloadStepKg)).toBeCloseTo(1, 9);
        expect(overloadStepsForKg(200)).toBeGreaterThan(overloadStepsForKg(100));
    });

    it('D-059 — the bands below Heavy are completely untouched by overload', () => {
        //  Everything Ch.6 tuned and tested under 30 kg must behave exactly as it did.
        expect(loadSpeedMultiplierForKg(0)).toBe(TUNE.loadSpeedMultiplier.light);
        expect(loadEnergyMultiplierForKg(0)).toBe(TUNE.loadEnergyMultiplier.light);
        expect(loadSpeedMultiplierForKg(TUNE.loadWorkingAtKg + 1)).toBe(TUNE.loadSpeedMultiplier.working);
        expect(loadEnergyMultiplierForKg(TUNE.loadHeavyAtKg)).toBe(TUNE.loadEnergyMultiplier.working);
    });

    it('a full trip home from the quarry lands in Working, not Heavy — the tuned intent', () => {
        const s = run();
        s.inventory.stone = 10; // 20 kg
        expect(loadBandOf(s)).toBe('working');
    });

    it('carry weight scales the AMBIENT energy drain through reconcile, reusing D-052 plumbing', () => {
        const oneHour = realSecondsPerGameHour;
        const light = run();
        const heavy = run();
        heavy.inventory.stone = 40; // 80 kg
        expect(loadBandOf(heavy)).toBe('heavy');

        const lightAfter = reconcile(light, oneHour).state.energy;
        const heavyAfter = reconcile(heavy, oneHour).state.energy;
        expect(light.energy - lightAfter).toBeCloseTo(TUNE.energyDrainPerGameHour, 6);
        //  D-059: the expectation is now WEIGHT-aware, not band-aware. 40 stone is 80 kg,
        //  which is 2.5 overload steps past the Heavy threshold, so the true multiplier is
        //  above the bare band figure. Asserting the band figure here is exactly what made
        //  the saturation bug invisible to this suite.
        expect(heavy.energy - heavyAfter).toBeCloseTo(TUNE.energyDrainPerGameHour * loadEnergyMultiplierForKg(80), 6);
        expect(heavyAfter).toBeLessThan(lightAfter);
    });
});

describe('body — the rest redesign: a rate, never a jump (Ch.6 part 2)', () => {
    it('sleeping no longer teleports energy to full — it recovers along a curve', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        session.state.energy = 1; // all but empty

        const report = session.sleep(1000);
        expect(report).not.toBeNull();
        //  The C05 behaviour this replaced would have produced exactly energyMax here.
        expect(session.state.energy).toBeLessThan(TUNE.energyMax);
        expect(session.state.energy).toBeGreaterThan(1); // but it genuinely recovered
    });

    it('the recovery matches the tuned rate over the sleep span', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        session.state.energy = 0;

        session.sleep(1000);
        const expected = TUNE.energyRecoveryPerGameHourResting * TUNE.sleepRecoveryMultiplier * TUNE.sleepDurationGameHours;
        expect(session.state.energy).toBeCloseTo(Math.min(TUNE.energyMax, expected), 4);
    });

    it('BOUNDED: sleeping over and over can never exceed the ceiling — no infinite-recovery exploit', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        session.state.energy = 0;

        for (let i = 0; i < 25; i++) session.sleep(1000 + i);
        expect(session.state.energy).toBeLessThanOrEqual(TUNE.energyMax);
        expect(session.state.warmth).toBeLessThanOrEqual(TUNE.warmthMax);
        expect(session.state.fatigue).toBeGreaterThanOrEqual(0);
    });

    it('`resting` is a transient of the sleep action — never a mode left switched on', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        expect(session.state.resting).toBe(false);
        session.sleep(1000);
        expect(session.state.resting).toBe(false);
    });

    /**
     * SUPERSEDED BY LAW 118 (Bible v2.4, [[D-091]]). The original read:
     *
     *     "sleeping beside a roaring fire is never WORSE for warmth than sitting beside it"
     *
     * ...and it was the Ch.6 expression of exactly the mechanism Law 118 retires. It passed
     * because `reconcile` gave sleep a positive warmth floor via `Math.max`, which is what
     * produced the director's 2am reading. Keeping it would have locked the retired behaviour
     * in place as a regression test — the way a decision to retire something gets quietly
     * overruled by its own suite.
     *
     * What replaces it is the honest version of the same concern. Sleeping IS slightly worse
     * thermally than sitting, because a resting body makes less metabolic heat — but beside a
     * fire the balance is still strongly positive, so lying down never turns a warm night
     * cold. That is the real guarantee worth holding: sleep costs you a little heat, and
     * never costs you the fire.
     */
    it('sleeping beside a roaring fire still WARMS you — sleep costs a little heat, never the fire', () => {
        const oneHour = realSecondsPerGameHour;
        const awake = shelteredAt(run());
        awake.warmth = 40;
        awake.fire = { built: true, fuel: 10, x: awake.player.x, y: awake.player.y };
        const asleep = { ...awake, resting: true, fire: { ...awake.fire }, inventory: { ...awake.inventory }, tools: { ...awake.tools } };

        const awakeAfter = reconcile(awake, oneHour).state.warmth;
        const asleepAfter = reconcile(asleep as GameState, oneHour).state.warmth;
        expect(asleepAfter, 'still gaining beside the fire').toBeGreaterThan(40);
        //  ...and Law 118's direction: the sleeping body is the cooler one, because it is
        //  making less heat. A model where lying down warms you for free is the defect.
        expect(asleepAfter, 'a resting body makes less heat than a working one')
            .toBeLessThan(awakeAfter);
    });
});

describe('body — fatigue: three perceivable stages, honest at every one', () => {
    it('reads none below the mild threshold, then climbs through all three stages', () => {
        expect(fatigueStage(0)).toBe('none');
        expect(fatigueStage(TUNE.fatigueMildAt - 0.01)).toBe('none');
        expect(fatigueStage(TUNE.fatigueMildAt)).toBe('mild');
        expect(fatigueStage(TUNE.fatigueModerateAt)).toBe('moderate');
        expect(fatigueStage(TUNE.fatigueSevereAt)).toBe('severe');
        expect(fatigueStage(TUNE.fatigueMax)).toBe('severe');
    });

    it('says nothing at all when the body is fine — silence is the honest reading', () => {
        expect(fatigueStatusText('none')).toBeNull();
    });

    it('every stage that speaks says something true and actionable', () => {
        for (const stage of ['mild', 'moderate', 'severe'] as const) {
            const text = fatigueStatusText(stage);
            expect(text).toBeTruthy();
            expect(text!.length).toBeGreaterThan(0);
        }
    });

    it('accrues ONLINE while in energy debt', () => {
        const s = run();
        s.energy = TUNE.energyLowThreshold - 1; // in debt
        s.gameHoursElapsed = 12; // daytime, warmth neutral
        const short = TUNE.morningReportMinRealMinutes * 60 - 1; // online span
        const { state } = reconcile(s, short);
        expect(state.fatigue).toBeGreaterThan(s.fatigue);
    });

    it('does NOT accrue online while energy is healthy', () => {
        const s = run();
        s.energy = TUNE.energyMax;
        s.gameHoursElapsed = 12;
        const short = TUNE.morningReportMinRealMinutes * 60 - 1;
        const { state } = reconcile(s, short);
        expect(state.fatigue).toBe(0);
    });

    it('is shed by sleeping — by the full tuned amount, not by incidental drift', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        session.state.fatigue = TUNE.fatigueMax;
        session.sleep(1000);
        //  A bare `< fatigueMax` would pass on a fraction of a point of post-wake drift —
        //  which is exactly how C3 finding B1 slipped past the device harness. Assert the
        //  real shed: 12/hr over 8 slept hours clears 96, so a full-fatigue castaway wakes
        //  at or near zero.
        const shed = TUNE.fatigueRecoveryPerGameHourResting * TUNE.sleepDurationGameHours;
        expect(session.state.fatigue).toBeLessThanOrEqual(Math.max(0, TUNE.fatigueMax - shed) + 1);
    });

    it('C3 B1 REGRESSION — sleeping sheds fatigue even when the spot is COLD, not just when it scores restful', () => {
        //  The defect: `restingNow` was unreachable because every sleep span qualifies as an
        //  absence, so fatigue shedding fell through to `isRestfulSpot` alone — and a cold
        //  shelter fails that check. Sleeping recovered energy but shed nothing.
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        session.state.warmth = 5; // well under warmthLowThreshold: not a "restful spot"
        session.state.fatigue = TUNE.fatigueMax;
        session.sleep(1000);
        expect(session.state.fatigue).toBeLessThan(TUNE.fatigueMax - 1);
    });

    it('C3 B1 REGRESSION — sleeping sheds fatigue even when SOAKED', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, 0);
        shelteredAt(session.state);
        session.state.wet = TUNE.wetMax; // fails isRestfulSpot's dryness clause
        session.state.fatigue = TUNE.fatigueMax;
        session.sleep(1000);
        expect(session.state.fatigue).toBeLessThan(TUNE.fatigueMax - 1);
    });

    it('is never a death vector — it is absent from the health-drain path entirely', () => {
        const s = run();
        s.fatigue = TUNE.fatigueMax; // maximally exhausted
        s.gameHoursElapsed = 12;
        const short = TUNE.morningReportMinRealMinutes * 60 - 1;
        const { state, result } = reconcile(s, short);
        expect(result.diedDuringSpan).toBe(false);
        //  Health is untouched by fatigue: with no empty vital, it regenerates as normal.
        expect(state.health).toBeGreaterThanOrEqual(s.health);
    });
});

describe('body — THE LAW: absence never makes the body worse (Ch.6, mirroring Ch.2 amendment B)', () => {
    //  The chapter's mandatory property test. Same seeded-sweep shape as the
    //  offline-death-impossible law and Ch.2's own amendment-B test — no Math.random, so a
    //  failure is always reproducible.
    function rng(seed: number): () => number {
        let s = seed >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 0xffffffff;
        };
    }

    //  An explicit budget, as the two vitals property tests already carry: this walks 2000
    //  random states across long absences and genuinely takes seconds, so under full-suite
    //  parallel load it fails as a TIMEOUT and reads at a glance as the offline law
    //  breaking, which it is not. The iteration count is the strength of the property.
    it('for 2000 random states × random long absences, fatigue NEVER rises', () => {
        const rand = rng(20260725);
        const offlineSpans = [
            TUNE.morningReportMinRealMinutes * 60,
            10 * 60,
            3600,
            8 * 3600,
            DAY,
            3 * DAY,
            30 * DAY
        ];

        for (let i = 0; i < 2000; i++) {
            const s = run();
            s.fatigue = rand() * TUNE.fatigueMax;
            s.energy = rand() * TUNE.energyMax;
            s.warmth = rand() * TUNE.warmthMax;
            s.wet = rand() * TUNE.wetMax;
            s.thirst = rand() * TUNE.thirstMax;
            s.hunger = rand() * TUNE.hungerMax;
            s.health = Math.max(0.0001, rand() * TUNE.healthMax);
            s.gameHoursElapsed = rand() * 240;
            //  Half the sweep is carrying a real load, so the load band cannot smuggle in
            //  an offline cost through the energy path either.
            if (rand() < 0.5) s.inventory.stone = Math.floor(rand() * 40);
            if (rand() < 0.5) shelteredAt(s);

            const before = s.fatigue;
            const span = offlineSpans[Math.floor(rand() * offlineSpans.length)];
            const { state, result } = reconcile(s, span);

            expect(result.qualifiesForReport).toBe(true);
            //  EXACTLY less-than-or-equal, with no epsilon: an earlier draft allowed 1e-9 of
            //  slack and that slack was hiding a real (if tiny) violation — reconcile's
            //  6-decimal rounding could round a held value UP. The law is absolute, so the
            //  assertion is too.
            expect(state.fatigue).toBeLessThanOrEqual(before);
            expect(state.fatigue).toBeGreaterThanOrEqual(0);
            //  And the older law it must not break: absence still cannot kill.
            expect(result.diedDuringSpan).toBe(false);
            expect(state.health).toBeGreaterThan(0);
        }
    }, 30_000);

    it('an absent SHELTERED, warm, dry unit actively recovers — improves, not merely holds', () => {
        const s = shelteredAt(run());
        s.warmth = TUNE.warmthMax;
        s.wet = 0;
        s.fatigue = TUNE.fatigueMax;
        const { state } = reconcile(s, 8 * 3600);
        expect(state.fatigue).toBeLessThan(TUNE.fatigueMax);
    });

    it('an absent EXPOSED unit in deep energy debt still never worsens — it holds', () => {
        const s = run();
        s.energy = 0; // maximum debt: online this would accrue fatigue every hour
        s.fatigue = 50;
        const { state } = reconcile(s, 30 * DAY);
        expect(state.fatigue).toBeLessThanOrEqual(50);
    });
});

//  THE CH.6 DEATH-COST SUITE IS RETIRED (Slice 3). It tested `deathResourceLoss` and
//  `respawnMessageFor`, both of which are gone with the interim respawn they served: a death
//  no longer takes a floored quarter of your stacks — it takes everything, because the body
//  carrying it is dead — and one cause-specific line has been replaced by the full causal
//  review. Deleted rather than adapted: there is no version of "rounding never wipes a small
//  stack" that means anything once nothing is kept. The law that replaced it is proved in
//  `tests/succession.test.ts`, and the review's own text in `tests/death-review.test.ts`.

describe('body — save migration v7 → v8 (Ch.6)', () => {
    /** A realistic v7 save: mid-run, with a death already logged under the old shape. */
    function v7Save(): string {
        const state = {
            schemaVersion: 7,
            startedAtMs: 1_700_000_000_000,
            lastSeenMs: 1_700_000_300_000,
            gameHoursElapsed: 40,
            energy: 30,
            inventory: { wood: 6, stone: 3, fiber: 1, berries: 0, coconut: 0, shellfish: 0, sharpblade: 0 },
            tools: { axe: true, flask: false, flaskSips: 0, stoneHammer: false, axeGrade: 'crude', fishingLine: false },
            trace: { deathLog: [{ cause: 'thirst', gameHoursElapsed: 9 }] }
        };
        return JSON.stringify({ schemaVersion: 7, savedAtMs: 1_700_000_300_000, state });
    }

    it('wakes a returning player with zero fatigue and not resting — never an invented number', () => {
        const s = deserialize(v7Save())!.state;
        expect(s.schemaVersion).toBe(SCHEMA_VERSION); // the whole ladder runs, now through v9
        expect(s.fatigue).toBe(0);
        expect(s.resting).toBe(false);
    });

    it('leaves pre-v8 death-log entries exactly as they were, unrewritten', () => {
        const s = deserialize(v7Save())!.state;
        expect(s.trace.deathLog).toEqual([{ cause: 'thirst', gameHoursElapsed: 9 }]);
    });

    it('needs no migration for carry weight — it is derived from inventory and tools', () => {
        const s = deserialize(v7Save())!.state;
        const expected = 6 * TUNE.materialMassKg.wood + 3 * TUNE.materialMassKg.stone + 1 * TUNE.materialMassKg.fiber + TUNE.toolMassKg.axe;
        expect(carriedWeightKg(s)).toBeCloseTo(expected, 9);
    });

    it('is idempotent — migrating then serialising round-trips as v8', () => {
        const once = deserialize(v7Save())!;
        const twice = deserialize(JSON.stringify({ ...once, state: once.state }));
        expect(twice!.state.fatigue).toBe(once.state.fatigue);
        expect(twice!.state.schemaVersion).toBe(SCHEMA_VERSION);
    });
});
