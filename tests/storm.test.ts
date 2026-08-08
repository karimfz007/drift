/**
 * RAIN & WET ESCALATION — the second hazard family, and the first that is not a creature.
 *
 * THE CLAIM UNDER TEST is not "storms happen". It is that the six-stage life cycle and the
 * fair-challenge contract GENERALISE to a hazard of a completely different shape from the
 * boar: nothing to face, nowhere to dodge, no moment of contact — a sustained condition you
 * endure and manage. If the grammar only worked for a creature it was never a contract.
 *
 * The asymmetry section is the one that matters most. A hazard is only fair if reading it and
 * preparing MEASURABLY beats not doing so, and that is asserted directly rather than inferred
 * from the event merely occurring.
 */
import { describe, expect, it } from 'vitest';
import {
    ALL_STORM_STAGES,
    CAVE,
    activeProfile,
    builtShelterProfile,
    clearOnAbsence,
    createInitialState,
    defectStage,
    freshDefects,
    freshStorm,
    isStormActive,
    rainIntensity,
    reconcile,
    rescheduleAfterAbsence,
    settleAftermath,
    stageDuration,
    stepStorm,
    stormNote,
    wetGainPerGameHour,
    type GameState,
    type StormStage,
} from '../src/brain';
import { netHeatFlowPerGameHour } from '../src/brain/thermal';
import { Session } from '../src/brain/session';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;

/** A survivor at a sound shelter, inland, dry, with clear skies. */
function base(): GameState {
    const s = fullBody(createInitialState(NOW));
    s.shelter = { built: true, x: 6, y: -12, durability: TUNE.structureDurabilityMax, grade: 'serviceable', defects: freshDefects() };
    s.player.x = 6;
    s.player.y = -12;
    s.wet = 0;
    s.gameHoursElapsed = 100;
    s.storm = freshStorm();
    return s;
}

function inStage(stage: StormStage): GameState {
    const s = base();
    s.storm = { stage, inStageGameHours: 0, nextAtGameHours: 0 };
    return s;
}

const EXPOSED_PROFILE = { wind: 0, rain: 0, cold: 0, groundDamp: 0 };
const FREE: StormStage[] = ['precursor', 'watch'];

// ---------------------------------------------------------------------------
describe('THE SIX-STAGE LIFE CYCLE, on a hazard shaped nothing like the boar', () => {
    it('runs precursor -> watch -> committed -> impact -> aftermath -> clear, one stage per tick', () => {
        const s = inStage('precursor');
        const seen: StormStage[] = ['precursor'];
        //  A whole stage per step, so the walk is exact rather than approximate.
        for (let i = 0; i < 5; i++) {
            const from = s.storm.stage;
            stepStorm(s, stageDuration(from) + 0.001, EXPOSED_PROFILE);
            seen.push(s.storm.stage);
        }
        expect(seen).toEqual(['precursor', 'watch', 'committed', 'impact', 'aftermath', 'clear']);
    });

    it('NEVER skips a stage, however long the span', () => {
        //  A single call that crossed two boundaries could skip a WARNING, which is the
        //  two-warnings contract quietly becoming one. The online tick never produces a span
        //  that long; the guard is here because "it never happens" is how it eventually does.
        const s = inStage('precursor');
        stepStorm(s, 10_000, EXPOSED_PROFILE);
        expect(s.storm.stage).toBe('watch');
    });

    it('says something different at every stage, and nothing at all when it is clear', () => {
        expect(stormNote('clear')).toBeNull();
        const spoken = ALL_STORM_STAGES.filter((st) => st !== 'clear').map((st) => stormNote(st)!);
        expect(spoken.every((n) => typeof n === 'string' && n.length > 25)).toBe(true);
        //  Five distinct sentences. A warning repeated is one warning.
        expect(new Set(spoken).size).toBe(5);
    });

    it('knows when the weather is worth mentioning', () => {
        expect(isStormActive('clear')).toBe(false);
        for (const st of ALL_STORM_STAGES.filter((x) => x !== 'clear')) {
            expect(isStormActive(st)).toBe(true);
        }
    });

    it('waits on the world clock while clear, and starts only when it is due', () => {
        const s = base();
        s.storm = { stage: 'clear', inStageGameHours: 0, nextAtGameHours: 200 };
        s.gameHoursElapsed = 199;
        stepStorm(s, 1, EXPOSED_PROFILE);
        expect(s.storm.stage).toBe('clear');
        s.gameHoursElapsed = 200;
        const step = stepStorm(s, 1, EXPOSED_PROFILE);
        expect(step.stage).toBe('precursor');
        expect(step.changed).toBe(true);
    });

    it('schedules the next storm from the END of this one, not from its start', () => {
        const s = inStage('aftermath');
        s.gameHoursElapsed = 500;
        stepStorm(s, stageDuration('aftermath') + 0.001, EXPOSED_PROFILE);
        expect(s.storm.stage).toBe('clear');
        expect(s.storm.nextAtGameHours).toBe(500 + TUNE.stormIntervalGameHours);
    });
});

// ---------------------------------------------------------------------------
describe('TWO WARNINGS BEFORE ANYTHING IS TAKEN — the contract, generalised', () => {
    it('costs EXACTLY NOTHING through both warning stages', () => {
        //  The whole fair-challenge claim, as a number. `precursor` and `watch` are the
        //  preparation window, and a window you pay to stand in is not a window.
        for (const stage of FREE) {
            expect(rainIntensity(stage), `${stage} rains`).toBe(0);
            expect(wetGainPerGameHour(stage, EXPOSED_PROFILE), `${stage} wets you`).toBe(0);
        }
    });

    it('and the two free stages are the LONGEST part of the run-up', () => {
        //  Reading the sky has to be worth more than reacting to rain, and that is a statement
        //  about durations rather than about intent.
        const warning = stageDuration('precursor') + stageDuration('watch');
        expect(warning).toBeGreaterThan(stageDuration('committed'));
    });

    it('rains for real once committed, and hardest at impact', () => {
        expect(rainIntensity('committed')).toBeGreaterThan(0);
        expect(rainIntensity('impact')).toBe(1);
        expect(rainIntensity('committed')).toBeLessThan(rainIntensity('impact'));
        //  ...and the aftermath is not more rain. What it costs is what is already on you.
        expect(rainIntensity('aftermath')).toBe(0);
    });

    it('takes no health, ever — this hazard costs warmth through WET and nothing else', () => {
        //  The boar takes health directly. A storm never does: it raises `wet`, and `wet`
        //  reaches warmth through the shipped evaporative term. No parallel thermal system,
        //  and no route from the weather to the body that does not pass through it.
        for (const stage of ALL_STORM_STAGES) {
            const s = inStage(stage);
            const before = s.health;
            stepStorm(s, 0.5, EXPOSED_PROFILE);
            expect(s.health, `${stage} took health directly`).toBe(before);
        }
    });
});

// ---------------------------------------------------------------------------
describe('A ROOF IS A ROOF — the coefficient that had no question until now', () => {
    it('wets an exposed survivor fast and a sheltered one far less', () => {
        const exposed = wetGainPerGameHour('impact', EXPOSED_PROFILE);
        const sheltered = wetGainPerGameHour('impact', builtShelterProfile('serviceable'));
        expect(exposed).toBe(TUNE.stormWetGainPerGameHour);
        expect(sheltered).toBeLessThan(exposed);
        expect(sheltered).toBeGreaterThan(0);   // one open side
    });

    it('keeps the CAVE clearly the better answer to a storm', () => {
        //  `caveRainAnswered` has been 1.0 since Drop 3 with nothing to answer. This is the
        //  first stage where the island's best roof is measurably the island's best roof, and
        //  the lean-to's coefficient was set to preserve that gap rather than close it.
        const cave = wetGainPerGameHour('impact', CAVE);
        const leanTo = wetGainPerGameHour('impact', builtShelterProfile('serviceable'));
        expect(cave).toBe(0);
        expect(leanTo).toBeGreaterThan(cave);
    });

    it('reaches warmth ONLY through the shipped evaporative term', () => {
        //  Being wet costs what being wet has always cost. The storm adds no thermal term of
        //  its own, which is why `netHeatFlowPerGameHour` needed no edit for this stage.
        const ctx = {
            isNight: true, sheltered: false, shelterGrade: null, windExposed: true,
            fireLit: false, atFire: false, wet: 0, bedding: 'bare-ground' as const,
            clothing: 0, resting: false, activity: 1, nutrition: 80, enclosed: false,
        };
        const dry = netHeatFlowPerGameHour(ctx);
        const soaked = netHeatFlowPerGameHour({ ...ctx, wet: TUNE.wetMax });
        expect(soaked.net).toBeLessThan(dry.net);
        expect(soaked.evaporativeLoss).toBeLessThan(dry.evaporativeLoss);
    });

    it('PINS the one shipped number this pass moves: a wet sheltered body', () => {
        //  `refuge.rain` moving off zero changes the evaporative term for a WET, SHELTERED
        //  body — and `tests/refuge.test.ts` holds wet at 0 on purpose, so that case is
        //  covered by nothing else. It is a real change, it is correct (a roof keeps the
        //  weather off you, which is thermal.ts's own reading), and it is bounded here so it
        //  cannot drift further without somebody deciding to.
        const ctx = {
            isNight: true, sheltered: true, shelterGrade: 'serviceable' as const, windExposed: true,
            fireLit: false, atFire: false, wet: TUNE.wetMax, bedding: 'dry-bedding' as const,
            clothing: 0, resting: false, activity: 1, nutrition: 80, enclosed: false,
        };
        const withRoof = netHeatFlowPerGameHour({ ...ctx, refuge: builtShelterProfile('serviceable') });
        const asShipped = netHeatFlowPerGameHour({ ...ctx, refuge: { ...builtShelterProfile('serviceable'), rain: 0 } });
        expect(withRoof.evaporativeLoss).toBeGreaterThan(asShipped.evaporativeLoss);
        //  Bounded: the roof removes just over half the evaporative loss, never all of it.
        expect(Math.abs(withRoof.evaporativeLoss))
            .toBeCloseTo(Math.abs(asShipped.evaporativeLoss) * (1 - TUNE.shelterRainAnswered), 6);
        expect(TUNE.shelterRainAnswered).toBeLessThan(TUNE.caveRainAnswered);
    });

    it('reads the shelter through activeProfile, defects and all', () => {
        //  The tie to Entropy & Maintenance, made mechanical: a thinned thatch arrives at the
        //  wetting rate as a smaller rain answer, and `storm.ts` never learns that maintenance
        //  exists. Two systems meeting through one number.
        const sound = base();
        const holed = base();
        holed.shelter = { ...holed.shelter, defects: { ...freshDefects(), thatch: TUNE.defectFailingAt + 0.01 } };
        expect(defectStage(holed, 'thatch')).toBe('failing');

        const soundRate = wetGainPerGameHour('impact', activeProfile(sound, true));
        const holedRate = wetGainPerGameHour('impact', activeProfile(holed, true));
        expect(holedRate).toBeGreaterThan(soundRate);
    });
});

// ---------------------------------------------------------------------------
describe('FAIR CHALLENGE — preparing measurably beats not preparing', () => {
    /**
     * Run a whole storm over a body and report what it COST.
     *
     * The cost is the PEAK wetness, not the final reading. Over the full costed span the storm
     * ends and the survivor dries — four times faster under a roof — so an endpoint
     * measurement came back 0 for everybody and compared nothing to nothing. How wet it got
     * you is the question; how wet you still are afterwards is a different one.
     */
    function endureAStorm(mutate: (s: GameState) => void): { wet: number; warmth: number; alive: boolean } {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        const s = session.state;
        s.shelter = { built: true, x: 6, y: -12, durability: TUNE.structureDurabilityMax, grade: 'serviceable', defects: freshDefects() };
        s.player.x = 6;
        s.player.y = -12;
        s.wet = 0;
        s.warmth = 90;
        s.storm = { stage: 'committed', inStageGameHours: 0, nextAtGameHours: 0 };
        mutate(s);
        s.lastSeenMs = NOW;
        //  Real online ticks, through the real session, for the whole COSTED run — committed
        //  (1.0 gh) plus impact (2.0 gh) is ~455 real seconds. At 250 ms a tick this covered
        //  0.66 gh and never left the committed stage, so it measured the cheapest part of the
        //  storm and called it the storm.
        let peakWet = 0;
        let lowWarmth = session.state.warmth;
        for (let i = 1; i <= 400; i++) {
            session.tick(NOW + i * 1500);
            peakWet = Math.max(peakWet, session.state.wet);
            lowWarmth = Math.min(lowWarmth, session.state.warmth);
        }
        return { wet: peakWet, warmth: lowWarmth, alive: session.state.health > 0 };
    }

    /**
     * OUT IN THE RAIN, AND ON DRY LAND. Inland and well beyond `shelterRadius`, so the only
     * thing wetting this survivor is the sky. Written first as (400, 400) — 565 m out to sea,
     * where they were SWIMMING and soaked before the storm began.
     */
    const standingInTheOpen = (s: GameState) => { s.player.x = 62; s.player.y = -44; };

    it('THE ASYMMETRY: a survivor under a sound roof ends the storm drier than one in the open', () => {
        //  The claim the whole hazard rests on, asserted directly rather than inferred from
        //  the event happening. Same storm, same body, one difference: where they stood.
        const prepared = endureAStorm(() => {});
        const exposed = endureAStorm(standingInTheOpen);
        expect(prepared.wet).toBeLessThan(exposed.wet);
        expect(prepared.warmth).toBeGreaterThan(exposed.warmth);
    });

    it('...and MENDING the roof first measurably beats leaving it holed', () => {
        //  The second half of the asymmetry, and the one that ties the two systems together:
        //  preparation is not only "get inside", it is "have something worth getting inside".
        const mended = endureAStorm(() => {});
        const holed = endureAStorm((s) => {
            s.shelter = { ...s.shelter, defects: { ...freshDefects(), thatch: TUNE.defectFailingAt + 0.01 } };
        });
        expect(mended.wet).toBeLessThan(holed.wet);
    });

    it('is SURVIVABLE at every stage, even for the survivor who did nothing', () => {
        //  Fair means fair. A hazard nobody can walk away from is a trapdoor, and this one
        //  never touches health directly — the worst it can do is make a body cold, and that
        //  is a state with answers (a fire, a roof, drying off).
        const worst = endureAStorm((s) => {
            standingInTheOpen(s);
            s.shelter = { built: false, x: 0, y: 0, durability: 0, grade: 'crude', defects: freshDefects() };
        });
        expect(worst.alive).toBe(true);
    });

    it('and the exposed survivor really did get soaked — the check is not vacuous', () => {
        const exposed = endureAStorm(standingInTheOpen);
        expect(exposed.wet).toBeGreaterThan(TUNE.wetMax * 0.4);
        //  ...and they started DRY, which is the half the device harness caught missing.
        //  At (400, 400) the "exposed" survivor was swimming and pinned at `wetMax` before a
        //  drop fell, so every comparison against them was measuring immersion, not weather.
        const dryStart = endureAStorm((s) => {
            standingInTheOpen(s);
            //  `nextAtGameHours: 0` on a CLEAR sky is immediately due, so this control was
            //  starting a fresh storm and soaking its own baseline.
            s.storm = { stage: 'clear', inStageGameHours: 0, nextAtGameHours: Number.MAX_SAFE_INTEGER };
        });
        expect(dryStart.wet).toBe(0);
    });
});

// ---------------------------------------------------------------------------
describe('THE CHANGED WORLD — no disaster exists alone', () => {
    it('leaves the shelter worse at the two places RAIN attacks, and only those', () => {
        const s = base();
        settleAftermath(s);
        expect(s.shelter.defects.thatch).toBeGreaterThan(0);
        expect(s.shelter.defects.footing).toBeGreaterThan(0);
        //  The LASHING is the wind's place. This hazard is rain, not a cyclone, and worsening
        //  all three would make it "a storm damages the shelter" rather than a specific event
        //  attacking specific parts.
        expect(s.shelter.defects.lashing).toBe(0);
    });

    it('does it exactly ONCE across a whole storm, not once per tick', () => {
        //  MEASURES THE CONSEQUENCE, NOT THE FLAG, and that is a correction a planted defect
        //  forced. The first version asserted `justFinishedImpact` was true then false —
        //  and forcing that flag permanently true left it GREEN, because the second call never
        //  crossed a boundary and returned through the early branch where the flag is
        //  hardcoded. A guard that only inspects the path it already trusts is not a guard.
        //
        //  Anywhere but exactly once and this hazard is a damage-over-time tick against the
        //  maintenance model it is supposed to hand work to.
        //  AGAINST A CONTROL, because the shelter is ALSO weathering the whole time this runs
        //  — `advanceDefects` thins a thatch at `defectThatchPerGameHour` whatever the sky is
        //  doing. Comparing the raw number against `stormThatchDamage` measured the storm plus
        //  eight game hours of ordinary wear and called the sum the storm. The same span with
        //  no storm in it is the only honest baseline.
        const runFor = (stage: StormStage) => {
            const repo = new MemorySaveRepository();
            const { session } = Session.start(repo, NOW);
            session.state.shelter = { built: true, x: 6, y: -12, durability: TUNE.structureDurabilityMax, grade: 'serviceable', defects: freshDefects() };
            session.state.player.x = 6;
            session.state.player.y = -12;
            session.state.storm = { stage, inStageGameHours: 0, nextAtGameHours: Number.MAX_SAFE_INTEGER };
            session.state.lastSeenMs = NOW;
            //  The impact is 2 game hours (~300 real seconds), so this runs it out and sits in
            //  the aftermath for a while afterwards.
            for (let i = 1; i <= 600; i++) session.tick(NOW + i * 2000);
            return session.state;
        };
        const stormed = runFor('impact');
        const calm = runFor('clear');
        expect(stormed.storm.stage).not.toBe('impact');
        expect(stormed.shelter.defects.thatch - calm.shelter.defects.thatch)
            .toBeCloseTo(TUNE.stormThatchDamage, 6);
        expect(stormed.shelter.defects.footing - calm.shelter.defects.footing)
            .toBeCloseTo(TUNE.stormFootingDamage, 6);
        //  ...and the control really did weather, so the subtraction is not of zero.
        expect(calm.shelter.defects.thatch).toBeGreaterThan(0);
    });

    it('has nothing to damage when there is no shelter, and says so rather than throwing', () => {
        const s = base();
        s.shelter = { built: false, x: 0, y: 0, durability: 0, grade: 'crude', defects: freshDefects() };
        expect(settleAftermath(s).worsened).toBe(false);
    });

    it('takes roughly three unanswered storms to make a sound roof visibly thin', () => {
        //  The tie is only meaningful if the numbers make it felt. Three is a rate a player
        //  can notice without it being a treadmill.
        const s = base();
        settleAftermath(s);
        expect(defectStage(s, 'thatch')).toBe('sound');
        settleAftermath(s);
        settleAftermath(s);
        expect(defectStage(s, 'thatch')).toBe('showing');
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — no absence may begin, run, or end a storm on anybody', () => {
    it('leaves the weather EXACTLY as it was across a three-day absence', () => {
        const s = inStage('impact');
        const before = { ...s.storm };
        const after = reconcile(s, 3 * 24 * 3600).state;
        expect(after.storm).toEqual(before);
    });

    it('never wets anybody across an absence, at any stage or span', () => {
        for (const stage of ALL_STORM_STAGES) {
            for (const seconds of [30, 600, 3600, 3 * 24 * 3600]) {
                const s = inStage(stage);
                s.wet = 0;
                const after = reconcile(s, seconds).state;
                //  Wet may only ever FALL across an absence — the shipped drying rate. It may
                //  never rise, because the only thing that raises it out here is weather.
                expect(after.wet, `${stage} wet somebody over ${seconds}s away`).toBeLessThanOrEqual(0);
            }
        }
    });

    it('ENDS a storm in progress when the player comes back', () => {
        //  Nobody stood in the rain for eight hours. Absence making things better is legal;
        //  the same shape `surfaceOnAbsence` uses for a diver.
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        session.state.storm = { stage: 'impact', inStageGameHours: 1, nextAtGameHours: 0 };
        session.state.lastSeenMs = NOW;
        session.resume(NOW + 4 * 3600 * 1000);
        expect(session.state.storm.stage).toBe('clear');
        expect(session.state.storm.nextAtGameHours).toBeGreaterThan(session.state.gameHoursElapsed);
    });

    it('...and on a RELOAD too, which is the other absence path', () => {
        const repo = new MemorySaveRepository();
        const first = Session.start(repo, NOW).session;
        first.state.storm = { stage: 'impact', inStageGameHours: 1, nextAtGameHours: 0 };
        first.persist(NOW);
        const reloaded = Session.start(repo, NOW + 4 * 3600 * 1000).session;
        expect(reloaded.state.storm.stage).toBe('clear');
    });

    it('DOES run on the online tick — or the whole hazard is inert', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        session.state.player.x = 400;
        session.state.player.y = 400;
        session.state.wet = 0;
        session.state.storm = { stage: 'impact', inStageGameHours: 0, nextAtGameHours: 0 };
        session.state.lastSeenMs = NOW;
        for (let i = 1; i <= 60; i++) session.tick(NOW + i * 500);
        expect(session.state.wet).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
describe('the save', () => {
    it('MIGRATION v28 -> v29: a returning save arrives under clear skies', () => {
        const old = base() as unknown as Record<string, unknown>;
        delete old.storm;
        const loaded = deserialize(JSON.stringify({
            schemaVersion: 28, savedAtMs: NOW, state: { ...old, schemaVersion: 28 },
        }));
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);
        expect(loaded!.state.storm.stage).toBe('clear');
        //  ...and the next one is scheduled from THEIR clock, so a long-running save does not
        //  load straight into a storm that was notionally due while nobody was playing.
        expect(loaded!.state.storm.nextAtGameHours)
            .toBeGreaterThan(loaded!.state.gameHoursElapsed);
    });

    it('keeps a storm a current save is already carrying', () => {
        const s = inStage('watch');
        const loaded = deserialize(JSON.stringify({
            schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: { ...s, schemaVersion: SCHEMA_VERSION },
        }));
        expect(loaded!.state.storm.stage).toBe('watch');
    });

    it('clears on one side of the absence and reschedules on the other', () => {
        //  THE SPLIT, and the bug it fixes. Ending the storm has to happen BEFORE the span so
        //  no rain is billed to it; rescheduling has to happen AFTER, because the absence is
        //  still moving the clock it is measured against. As one function in the
        //  before-position it scheduled off the pre-absence clock, leaving the next storm
        //  overdue the moment the player returned.
        const s = inStage('impact');
        s.gameHoursElapsed = 300;
        clearOnAbsence(s);
        expect(s.storm.stage).toBe('clear');
        expect(s.storm.inStageGameHours).toBe(0);

        //  ...and then the clock moves, as reconcile moves it.
        s.gameHoursElapsed = 400;
        rescheduleAfterAbsence(s);
        expect(s.storm.nextAtGameHours).toBe(400 + TUNE.stormIntervalGameHours);
        expect(s.storm.nextAtGameHours).toBeGreaterThan(s.gameHoursElapsed);
    });

    it('only ever pushes the next storm FORWARD, so a clear save is left alone', () => {
        const s = base();
        s.gameHoursElapsed = 100;
        s.storm = { stage: 'clear', inStageGameHours: 0, nextAtGameHours: 100 + TUNE.stormIntervalGameHours * 5 };
        const far = s.storm.nextAtGameHours;
        rescheduleAfterAbsence(s);
        expect(s.storm.nextAtGameHours).toBe(far);
    });
});
