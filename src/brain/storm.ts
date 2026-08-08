/**
 * RAIN & WET ESCALATION — the second hazard family, and the first one that is not a creature.
 *
 * WHY THIS EXISTS AS A SEPARATE PROOF FROM THE BOAR. The boar established the fair-challenge
 * grammar: staged, telegraphed, two spoken warnings before harm. What it could not establish
 * is whether that grammar GENERALISES, because a boar is a thing you evade or fight — a
 * discrete opponent with a position. A storm is the opposite shape: nothing to face, nowhere
 * to dodge, no moment of contact. It is a sustained condition you endure and manage, and it
 * arrives on a schedule nobody chose. If the same grammar works for both, the contract is a
 * contract; if it only works for the boar, it was a boar feature wearing a law's clothes.
 *
 * ---------------------------------------------------------------------------------------
 * A CORRECTION TO THE PREMISE, recorded rather than smoothed over. This stage was scoped as
 * reusing "the existing rain flag and wet condition". The WET CONDITION is real and is reused
 * exactly. THERE WAS NO RAIN FLAG. `rain` existed only as a threat a refuge ANSWERS —
 * `RefugeProfile.rain`, `caveRainAnswered: 1.0` — in a world where nothing had ever rained.
 * Drop 3 built the cave's best statistic and no question for it to answer.
 *
 * So this does not reuse a rain flag; it supplies the question that half the vulnerability map
 * was already written to answer. That is a better outcome than the brief assumed and a worse
 * one than "reuse what is there", and it is worth being exact about which.
 *
 * ---------------------------------------------------------------------------------------
 * THE SIX-STAGE LIFE CYCLE, and the sixth is not a timer.
 *
 *   PRECURSOR   the light goes flat and the wind turns. Costs NOTHING. Free to read.
 *   WATCH       it is unmistakably coming. Still costs nothing — the second spoken warning,
 *               and the last moment preparation is cheap.
 *   COMMITTED   the first rain. From here it cannot be averted, only answered. Light wetting.
 *   IMPACT      the weight of it. Wetting at full rate, and this is where a roof is a roof.
 *   AFTERMATH   the rain stops and everything is soaked. Nothing is falling; the cost is what
 *               is already on you and how long it takes to dry.
 *   CHANGED WORLD  NOT A STAGE, because a changed world does not end. It is what the storm
 *               LEAVES: named defects worsened at the two places rain attacks, and driftwood
 *               on the beach that was not there before. See `settleAftermath`.
 *
 * TWO WARNINGS BEFORE ANYTHING IS TAKEN, in this project's own grammar: `precursor` and
 * `watch` both cost exactly zero, and `committed` is the first stage that wets anybody. A
 * survivor who reads the sky has the whole of both stages to mend a roof and get under it.
 *
 * ---------------------------------------------------------------------------------------
 * NO PARALLEL THERMAL SYSTEM. Rain does not touch warmth. It raises `wet`, and `wet` reaches
 * warmth through `netHeatFlowPerGameHour`'s existing evaporative term — the same path
 * swimming already uses, and the same path the Maritime Slice's own note said rain would use
 * when it arrived: *"it arrives at warmth through `thermalWetLoss` and the existing heat
 * balance, exactly like rain would."* This is that sentence being cashed.
 *
 * WHAT THE SHELTER DOES ABOUT IT is `RefugeProfile.rain`, at last used as a rate on the
 * WETTING rather than as a discount on the heat. That distinction is what keeps the shipped
 * arithmetic untouched: a body that is wet loses exactly what it always lost, and what a roof
 * changes is how wet you get in the first place.
 *
 * ---------------------------------------------------------------------------------------
 * D-011. `Session.advanceStorm` is the only function that advances a storm, and it runs on
 * the online tick and nowhere else. There is no elapsed-time term on the weather anywhere in
 * the absence path, so no absence of any length can start one, escalate one, or wet anybody.
 *
 * And the absence path does not merely decline. It ENDS a storm in progress and pushes the
 * next one a full interval past the returning clock — a survivor who closed the tab in the
 * rain did not stand in it for eight hours. Absence making things better is always legal where
 * absence making them worse never is, the same shape the diver's `surfaceOnAbsence` uses.
 *
 * THOSE ARE TWO FUNCTIONS ON OPPOSITE SIDES OF THE SPAN, and the split is a bug fix rather
 * than decomposition for its own sake. `clearOnAbsence` must run BEFORE `reconcile` so no
 * rain is billed to the absence; `rescheduleAfterAbsence` must run AFTER, because it is a
 * statement about a clock the absence is still moving. Written as one function in the
 * before-position, it scheduled the next storm off the PRE-absence clock — so four hours away
 * left it overdue and it fired on the first tick back. The thing written to stop a survivor
 * walking into a storm they never stood in was delivering one, and its own test caught it.
 */
import { TUNE } from '../data/tune';
import type { GameState, StormStage, StormState } from './types';
import type { RefugeProfile } from './vulnerability';

/**
 * THE STAGES. `clear` is the absence of an event rather than a stage of one, kept out of the
 * grammar so a reading can never describe weather that is not happening.
 *
 * The union itself lives in `types.ts` — `StormState` has to name it, and `types.ts` is the
 * one module every other may depend on without a cycle. Re-exported here so this file reads
 * as the owner of the concept, which it is.
 */
export type { StormStage };

export const ALL_STORM_STAGES: readonly StormStage[] =
    ['clear', 'precursor', 'watch', 'committed', 'impact', 'aftermath'];

export function freshStorm(): StormState {
    return { stage: 'clear', inStageGameHours: 0, nextAtGameHours: TUNE.stormFirstAtGameHours };
}

/** How long each stage lasts, in game hours. `clear` has no duration — it waits on a clock. */
export function stageDuration(stage: StormStage): number {
    switch (stage) {
        case 'clear': return Infinity;
        case 'precursor': return TUNE.stormPrecursorGameHours;
        case 'watch': return TUNE.stormWatchGameHours;
        case 'committed': return TUNE.stormCommittedGameHours;
        case 'impact': return TUNE.stormImpactGameHours;
        case 'aftermath': return TUNE.stormAftermathGameHours;
    }
}

/** What comes next when a stage runs out. */
function nextStage(stage: StormStage): StormStage {
    switch (stage) {
        case 'clear': return 'precursor';
        case 'precursor': return 'watch';
        case 'watch': return 'committed';
        case 'committed': return 'impact';
        case 'impact': return 'aftermath';
        case 'aftermath': return 'clear';
    }
}

/**
 * HOW HARD IT IS RAINING, 0..1.
 *
 * ZERO through both warning stages, and that is the fair-challenge contract as a number
 * rather than as a promise: a survivor who reads the sky and does nothing is not yet paying
 * anything. The two stages that cost nothing are what make the two that do cost fair.
 */
export function rainIntensity(stage: StormStage): number {
    switch (stage) {
        case 'clear':
        case 'precursor':
        case 'watch':
            return 0;
        case 'committed': return TUNE.stormCommittedIntensity;
        case 'impact': return 1;
        //  The rain has stopped. What is left is what is already on you.
        case 'aftermath': return 0;
    }
}

/** Is the weather doing anything worth saying? */
export function isStormActive(stage: StormStage): boolean {
    return stage !== 'clear';
}

/**
 * ONE PLAIN SENTENCE PER STAGE, or null when the sky has nothing to say.
 *
 * The two warnings are DIFFERENT sentences describing DIFFERENT observations — flat light and
 * a turned wind, then a hard horizon and the smell of it. A warning repeated is one warning,
 * which is the failure mode the boar's own grammar is written against.
 */
export function stormNote(stage: StormStage): string | null {
    switch (stage) {
        case 'clear': return null;
        case 'precursor':
            return 'The light has gone flat and the wind has turned. Something is coming in off the water.';
        case 'watch':
            return 'The horizon has closed up and you can smell the rain from here. Not long now.';
        case 'committed':
            return 'The first of it comes down, fat and cold. This is going to go on a while.';
        case 'impact':
            return 'The rain is coming down in earnest. Get under something.';
        case 'aftermath':
            return 'It has blown through. Everything is soaked, and the dripping goes on.';
    }
}

/**
 * HOW MUCH RAIN THE REFUGE KEEPS OFF, 0..1 — the coefficient that has had no question until
 * now, finally asked one.
 *
 * Applied to the WETTING RATE and not to the heat, which is the whole reason this stage
 * changes no shipped arithmetic. A body that is wet loses exactly what it always lost through
 * `netHeatFlowPerGameHour`; what a roof changes is how wet it gets.
 */
export function rainKeptOff(profile: RefugeProfile): number {
    return Math.min(1, Math.max(0, profile.rain));
}

/**
 * Wetness gained per game hour, right now.
 *
 * `refuge` is the ALREADY-DEGRADED profile — the caller passes what `activeProfile` returns,
 * defects and all, so a thinned thatch arrives here as a smaller `rain` answer without this
 * module knowing anything about maintenance. Two systems meeting through one number, which is
 * the only way they can meet without one of them re-deriving the other.
 */
export function wetGainPerGameHour(stage: StormStage, refuge: RefugeProfile): number {
    const intensity = rainIntensity(stage);
    if (intensity <= 0) return 0;
    return TUNE.stormWetGainPerGameHour * intensity * (1 - rainKeptOff(refuge));
}

// ---------------------------------------------------------------------------
// The clock.
// ---------------------------------------------------------------------------

export interface StormStep {
    /** The stage after this span. */
    stage: StormStage;
    /** True on the tick a stage boundary was crossed — the body announces on these. */
    changed: boolean;
    /** Wetness this span added, already clamped by the caller's own ceiling. */
    wetGained: number;
    /** True when this span ENDED an impact, so the aftermath's residue is owed exactly once. */
    justFinishedImpact: boolean;
}

/**
 * ONE SPAN OF WEATHER. Online only — see this file's header for the D-011 argument.
 *
 * Deliberately advances at most ONE stage per call. A span long enough to cross two
 * boundaries is a span the online tick never produces (they are sixteen milliseconds), and
 * allowing it would let a single call skip a warning stage entirely — which is the
 * two-warnings contract quietly becoming one.
 */
export function stepStorm(state: GameState, gameHours: number, refuge: RefugeProfile): StormStep {
    const storm = state.storm;
    const idle: StormStep = { stage: storm.stage, changed: false, wetGained: 0, justFinishedImpact: false };
    if (!(gameHours > 0)) return idle;

    if (storm.stage === 'clear') {
        if (state.gameHoursElapsed < storm.nextAtGameHours) return idle;
        state.storm = { stage: 'precursor', inStageGameHours: 0, nextAtGameHours: storm.nextAtGameHours };
        return { stage: 'precursor', changed: true, wetGained: 0, justFinishedImpact: false };
    }

    const gained = wetGainPerGameHour(storm.stage, refuge) * gameHours;
    const elapsed = storm.inStageGameHours + gameHours;
    if (elapsed < stageDuration(storm.stage)) {
        state.storm = { ...storm, inStageGameHours: elapsed };
        return { stage: storm.stage, changed: false, wetGained: gained, justFinishedImpact: false };
    }

    const to = nextStage(storm.stage);
    const finishedImpact = storm.stage === 'impact';
    state.storm = {
        stage: to,
        inStageGameHours: 0,
        //  The next storm is scheduled from the moment this one ends, so a long storm does not
        //  eat into the quiet that follows it.
        nextAtGameHours: to === 'clear'
            ? state.gameHoursElapsed + TUNE.stormIntervalGameHours
            : storm.nextAtGameHours,
    };
    return { stage: to, changed: true, wetGained: gained, justFinishedImpact: finishedImpact };
}

/**
 * THE CHANGED WORLD — what the storm leaves behind, owed exactly once, when the impact ends.
 *
 * "NO DISASTER EXISTS ALONE." The dossier's law is that compound events are the normal case,
 * and the cheapest honest way to prove it is to have this hazard hand work to the one shipped
 * beside it: a storm attacks the two places on a shelter that RAIN attacks — the covering it
 * falls on, and the footing the water stands around — and leaves them measurably worse than
 * it found them. Nothing else in this game has ever created a defect; time did.
 *
 * The wind's own place, the lashing, is deliberately untouched. A storm is rain here, not a
 * cyclone, and worsening all three would make the model "a storm damages the shelter" rather
 * than "rain attacks the parts rain attacks".
 */
export function settleAftermath(state: GameState): { worsened: boolean } {
    if (!state.shelter.built) return { worsened: false };
    const defects = { ...state.shelter.defects };
    defects.thatch = Math.min(1, defects.thatch + TUNE.stormThatchDamage);
    defects.footing = Math.min(1, defects.footing + TUNE.stormFootingDamage);
    state.shelter = { ...state.shelter, defects };
    return { worsened: true };
}

/**
 * WHAT AN ABSENCE DOES TO THE WEATHER: it ends it.
 *
 * Nobody stood in the rain for eight hours. Clearing a storm in progress and pushing the next
 * one a full interval out is absence making things BETTER, which is always legal — and it is
 * the same shape `surfaceOnAbsence` uses for a diver, deliberately, because the alternative in
 * both cases is inventing harm out of not playing.
 */
export function clearOnAbsence(state: GameState): void {
    state.storm = { stage: 'clear', inStageGameHours: 0, nextAtGameHours: state.storm.nextAtGameHours };
}

/**
 * ...AND THE NEXT ONE IS SCHEDULED ONCE THE ABSENCE'S OWN HOURS ARE ON THE CLOCK.
 *
 * A SEPARATE FUNCTION ON THE OTHER SIDE OF THE SPAN, and the split is a bug fix rather than
 * tidiness. Both halves used to live in `clearOnAbsence`, which runs BEFORE `reconcile` —
 * the ordering the depth chill requires — so the next storm was scheduled off the PRE-absence
 * clock. Four hours away put it in the past, and a survivor who closed the tab to escape the
 * rain opened it into rain. The function written to prevent exactly that was causing it.
 *
 * Idempotent and one-directional: it only ever pushes the next storm FORWARD, so calling it on
 * a save that is already clear and already scheduled changes nothing.
 */
export function rescheduleAfterAbsence(state: GameState): void {
    const earliest = state.gameHoursElapsed + TUNE.stormIntervalGameHours;
    if (state.storm.stage !== 'clear') return;
    if (state.storm.nextAtGameHours >= earliest) return;
    state.storm = { ...state.storm, nextAtGameHours: earliest };
}
