import { describe, expect, it } from 'vitest';
import {
    carriedWeightKg,
    deathResourceLoss,
    fatigueStage,
    fatigueStatusText,
    loadBandForKg,
    loadBandOf,
    loadEnergyMultiplierFor,
    loadSpeedMultiplierFor,
    respawnMessageFor
} from '../src/brain/body';
import { reconcile } from '../src/brain/reconcile';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { Session } from '../src/brain/session';
import { buildShelter, createInitialState, respawn } from '../src/brain/state';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

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
        expect(heavy.energy - heavyAfter).toBeCloseTo(TUNE.energyDrainPerGameHour * TUNE.loadEnergyMultiplier.heavy, 6);
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

    it('sleeping beside a roaring fire is never WORSE for warmth than sitting beside it', () => {
        const oneHour = realSecondsPerGameHour;
        const awake = shelteredAt(run());
        awake.warmth = 40;
        awake.fire = { built: true, fuel: 10, x: awake.player.x, y: awake.player.y };
        const asleep = { ...awake, resting: true, fire: { ...awake.fire }, inventory: { ...awake.inventory }, tools: { ...awake.tools } };

        const awakeAfter = reconcile(awake, oneHour).state.warmth;
        const asleepAfter = reconcile(asleep as GameState, oneHour).state.warmth;
        expect(asleepAfter).toBeGreaterThanOrEqual(awakeAfter - 1e-9);
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
    });

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

describe('body — death costs loose stacks only, and teaches (Ch.6 part 3)', () => {
    it('takes a floored fraction of each carried stack', () => {
        const s = run();
        s.inventory.wood = 12;
        s.inventory.stone = 8;
        const lost = deathResourceLoss(s);
        expect(lost.wood).toBe(Math.floor(12 * TUNE.deathResourceLossFraction));
        expect(lost.stone).toBe(Math.floor(8 * TUNE.deathResourceLossFraction));
    });

    it('rounding never wipes a small stack — 1 to 3 units lose nothing at all', () => {
        const s = run();
        s.inventory.wood = 3;
        s.inventory.fiber = 1;
        const lost = deathResourceLoss(s);
        expect(lost.wood).toBeUndefined();
        expect(lost.fiber).toBeUndefined();
        respawn(s, 'thirst');
        expect(s.inventory.wood).toBe(3);
        expect(s.inventory.fiber).toBe(1);
    });

    it('NEVER takes tools, stored goods, skills, or KnowledgeState (Ch.2 amendment B holds)', () => {
        const s = run();
        s.inventory.wood = 20;
        s.tools = { axe: true, flask: true, flaskSips: 1, stoneHammer: true, axeGrade: 'refined' };
        s.storage = { built: true, x: 1, y: 1, durability: 80, stored: { wood: 40, stone: 30, fiber: 20 } };
        s.skills.woodcutting.level = 4;
        s.knowledge.domains.harvestingFabrication.technique = 42;
        s.knowledge.nullPairs = ['axe-blade|wood'];

        respawn(s, 'the cold');

        expect(s.tools).toEqual({ axe: true, flask: true, flaskSips: 1, stoneHammer: true, axeGrade: 'refined' });
        expect(s.storage.stored).toEqual({ wood: 40, stone: 30, fiber: 20 });
        expect(s.skills.woodcutting.level).toBe(4);
        expect(s.knowledge.domains.harvestingFabrication.technique).toBe(42);
        expect(s.knowledge.nullPairs).toEqual(['axe-blade|wood']);
        expect(s.inventory.wood).toBe(20 - Math.floor(20 * TUNE.deathResourceLossFraction)); // only this moved
    });

    it('clears fatigue — waking is a rest, never a compounding setback', () => {
        const s = run();
        s.fatigue = TUNE.fatigueMax;
        respawn(s, 'thirst');
        expect(s.fatigue).toBe(0);
        expect(s.resting).toBe(false);
    });

    it('records the lesson and the exact cost in the death log', () => {
        const s = run();
        s.inventory.wood = 8;
        s.gameHoursElapsed = 30;
        respawn(s, 'thirst');
        const entry = s.trace.deathLog[s.trace.deathLog.length - 1];
        expect(entry.cause).toBe('thirst');
        expect(entry.gameHoursElapsed).toBe(30);
        expect(entry.lost).toEqual({ wood: 2 });
        expect(entry.message).toMatch(/thirst/i);
    });

    it('every cause gets a specific lesson, and an unknown cause still gets a real one', () => {
        expect(respawnMessageFor('thirst')).toMatch(/water|flask|thirst/i);
        expect(respawnMessageFor('hunger')).toMatch(/berries|coconut|shellfish|hunger/i);
        expect(respawnMessageFor('the cold')).toMatch(/fire|roof|cold/i);
        expect(respawnMessageFor('the cold, thirst, and hunger')).toBeTruthy();
        //  A cause a future chapter invents must never produce an empty message.
        const unknown = respawnMessageFor('a falling coconut');
        expect(unknown).toBeTruthy();
        expect(unknown.length).toBeGreaterThan(0);
    });
});

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
            tools: { axe: true, flask: false, flaskSips: 0, stoneHammer: false, axeGrade: 'crude' },
            trace: { deathLog: [{ cause: 'thirst', gameHoursElapsed: 9 }] }
        };
        return JSON.stringify({ schemaVersion: 7, savedAtMs: 1_700_000_300_000, state });
    }

    it('wakes a returning player with zero fatigue and not resting — never an invented number', () => {
        const s = deserialize(v7Save())!.state;
        expect(s.schemaVersion).toBe(8);
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
        expect(twice!.state.schemaVersion).toBe(8);
    });
});
