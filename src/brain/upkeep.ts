/**
 * ENTROPY & MAINTENANCE (v0.11 §8) — the DECAY half, on one structure.
 *
 * THE THING THIS REPLACES IS A NUMBER. The shelter has carried `durability: 0–100` since C05:
 * one bar, falling at one rate, telling a survivor that their home is at 63% of something. The
 * dossier rejects that shape outright in favour of *"specific, named defects (a loose
 * cross-brace, corroded fasteners at splash height)"* and a maintenance-debt model where
 * *"deferred work changes cues and confidence, not a hidden damage-over-time tick"*.
 *
 * SHELTER LAW 4 — A WALL IS A LOAD PATH, NOT A HIT-POINT TOTAL — is what makes that possible
 * here rather than aspirational, because the refuge map already works that way. `vulnerability.ts`
 * stopped answering "how good is this shelter" in Drop 3 and started answering four separate
 * questions: wind, rain, cold, ground damp. A defect therefore does not reduce a quality score.
 * It attacks ONE PLACE on the structure, and the place decides WHICH ANSWER gets worse.
 *
 *   LASHING   the windward cross-brace. It is what holds the frame square against a blow, so
 *             when it goes slack the frame racks and the WIND gets in. Nothing else changes:
 *             the roof is still a roof.
 *   THATCH    the covering. It is what stops the night pulling heat off you, so when it thins
 *             the COLD answer goes. The wind is unaffected — a thin roof still breaks a gust.
 *   FOOTING   where the frame meets the ground. This is the load path proper, and it is the
 *             reason the model is per-location rather than per-threat: a rotted footing does
 *             not degrade one answer, it degrades BOTH, because everything above it is
 *             standing on it. One defect, two consequences, and the difference is legible
 *             precisely because the other two are not like that.
 *
 * THREE DRIVERS, ALL ALREADY IN THE GAME. Nothing here invents an environmental term:
 *
 *   the lashing works loose over NIGHTS   — `timeOfDay().isNight`, the same ambient driver
 *                                            `thermal.ts` uses for the wind/radiative half.
 *   the thatch thins over TIME            — plain elapsed game hours, weathering.
 *   the footing rots by the SITE          — `waterDepthAt` at the shelter's own coordinates.
 *                                            A shelter pitched on the wet sand rots at the
 *                                            feet; one pitched inland does not. That makes
 *                                            SITING a decision after the fact, which is
 *                                            §9.6's "the site IS the decision" arriving at a
 *                                            structure that was placed long before.
 *
 * ---------------------------------------------------------------------------------------
 * MAINTENANCE DEBT IS NOT A HIDDEN TICK, and this is the part that is easy to get wrong by
 * building the obvious thing. Deferring work does not accrue a secret number that is spent on
 * the player later. What it does is change WHAT THEY ARE TOLD and HOW MUCH THEY SHOULD TRUST
 * THE SHELTER: each defect has a NAMED STAGE with its own sentence and its own visible cue,
 * and the refuge's own answers move with it. A survivor who ignores a slack lashing is not
 * carrying an invisible debt — they are sleeping somewhere the wind now gets into, and the
 * game has said so in those words, twice, before it mattered.
 *
 * ---------------------------------------------------------------------------------------
 * D-011. `Session.advanceUpkeep` is the only function that worsens a defect, and it runs on
 * the online tick and nowhere else.
 *
 * That is a stricter line than the shipped `durability` bar takes — reconcile decays that one
 * across an absence — and the difference is deliberate rather than an inconsistency I missed.
 * A defect is not a cosmetic number: it degrades a REFUGE ANSWER, so a defect that worsened
 * offline would mean returning to a shelter that is measurably colder for having been away.
 * That is absence making a body worse, which is the one thing the law forbids outright. The
 * old bar predates the vulnerability map and only ever paused a flat bonus; this reaches the
 * heat balance, so it gets the boar's treatment rather than the bar's.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS IS THE SUBSTRATE FOR, and deliberately does not build: v0.14 L3's ratified
 * pressure-transfer ledger. A ledger needs somewhere to hang an entry — a named place, a named
 * state, a named cause. `durability: 63` could never have carried one. Three named defects at
 * three named locations, each with a stage and a driver, can. The ledger itself is not this
 * pass and nothing here pretends to be it.
 */
import { TUNE } from '../data/tune';
import { timeOfDay } from './clock';
import { waterDepthAt } from '../data/world';
import type { GameState, ShelterDefects } from './types';
import type { RefugeProfile, Threat } from './vulnerability';

/**
 * THE THREE PLACES A LEAN-TO FAILS. Named, and per-location by construction — this is the
 * type the ledger will eventually key on, which is why it is a union of places rather than a
 * list of symptoms.
 */
export type DefectId = 'lashing' | 'thatch' | 'footing';

export const ALL_DEFECTS: readonly DefectId[] = ['lashing', 'thatch', 'footing'];

/**
 * THREE STAGES, NOT A PERCENTAGE. `showing` is the warning and `failing` is the consequence,
 * which is this project's own fair-challenge grammar applied to a building: the survivor is
 * told, in words, before anything is taken from them.
 */
export type DefectStage = 'sound' | 'showing' | 'failing';

export function freshDefects(): ShelterDefects {
    return { lashing: 0, thatch: 0, footing: 0 };
}

/**
 * Wear, 0..1, turned into a named stage.
 *
 * The stored number is an implementation detail that never reaches a player: nothing shows it,
 * no report quotes it, and every reader below goes through this function. That is the
 * difference between "a percentage bar with better prose" and a named-state model — the number
 * is the mechanism, the STAGE is the fact.
 */
export function stageOf(wear: number): DefectStage {
    if (wear >= TUNE.defectFailingAt) return 'failing';
    if (wear >= TUNE.defectShowingAt) return 'showing';
    return 'sound';
}

export function defectStage(state: GameState, id: DefectId): DefectStage {
    return stageOf(state.shelter.defects[id]);
}

/** Which threats this place carries. The footing carries two because it holds up both. */
export function threatsOf(id: DefectId): readonly Threat[] {
    switch (id) {
        case 'lashing': return ['wind'];
        case 'thatch': return ['cold'];
        //  THE LOAD PATH. Everything above the footing is standing on it, so it is the one
        //  place whose failure is not confined to a single answer.
        case 'footing': return ['wind', 'cold'];
    }
}

/** What a survivor can SEE at this place, right now. Never a number, never a percentage. */
export function defectCue(id: DefectId, stage: DefectStage): string | null {
    if (stage === 'sound') return null;
    switch (id) {
        case 'lashing':
            return stage === 'showing'
                ? 'The windward lashing has gone slack — the frame moves when you lean on it.'
                : 'The windward lashing has parted. The frame is racked over and the wind comes straight in.';
        case 'thatch':
            return stage === 'showing'
                ? 'The thatch has thinned along the ridge. You can see daylight through it in places.'
                : 'The thatch is open along the ridge. There is more sky than roof over you now.';
        case 'footing':
            return stage === 'showing'
                ? 'The uphill footing has gone soft where it meets the ground. It gives underfoot.'
                : 'The uphill footing has rotted through. Everything above it is leaning on the other one.';
    }
}

/** Where the work is. The ledger's future key, and the player's present instruction. */
export function defectPlace(id: DefectId): string {
    switch (id) {
        case 'lashing': return 'the windward cross-brace';
        case 'thatch': return 'the roof covering';
        case 'footing': return 'the uphill footing';
    }
}

/**
 * How fast each place is wearing right now, per game hour — and the three drivers are
 * genuinely different inputs rather than one rate with three names.
 *
 * Returns ZERO for an unbuilt shelter, which is not a special case so much as the honest
 * answer: nothing that does not exist is wearing out.
 */
export function wearRates(state: GameState): Record<DefectId, number> {
    if (!state.shelter.built) return { lashing: 0, thatch: 0, footing: 0 };
    //  NIGHTS, for the lashing. The same `isNight` term the heat balance treats as the
    //  wind-and-radiation half, so the thing that works the knot loose is the thing that
    //  costs you warmth through it.
    const night = timeOfDay(state.gameHoursElapsed).isNight;
    //  THE SITE, for the footing. Standing water under a post is what rots it, and where the
    //  shelter stands was decided by the player — possibly days ago, which is what makes this
    //  a consequence rather than a rule.
    const wetness = Math.max(0, waterDepthAt(state.shelter.x, state.shelter.y));
    const damp = wetness > 0 ? 1 : (nearWater(state) ? TUNE.defectFootingDampSite : 0);
    return {
        lashing: TUNE.defectLashingPerNightHour * (night ? 1 : TUNE.defectLashingDayFraction),
        thatch: TUNE.defectThatchPerGameHour,
        footing: TUNE.defectFootingPerGameHour * damp,
    };
}

/** Is the shelter pitched close enough to the waterline for the ground to stay damp? */
function nearWater(state: GameState): boolean {
    const r = Math.hypot(state.shelter.x, state.shelter.y);
    return r >= TUNE.defectFootingDampRadiusM;
}

/**
 * ONE SPAN OF WEAR. Called from the online tick and nowhere else — see this file's header for
 * why a defect gets the boar's treatment rather than the durability bar's.
 */
export function advanceDefects(state: GameState, gameHours: number): void {
    if (!(gameHours > 0) || !state.shelter.built) return;
    const rates = wearRates(state);
    const next = { ...state.shelter.defects };
    for (const id of ALL_DEFECTS) {
        next[id] = Math.min(1, next[id] + rates[id] * gameHours);
    }
    state.shelter = { ...state.shelter, defects: next };
}

/**
 * THE MAINTENANCE DEBT, as a fact rather than a number: what is worst, and where.
 *
 * Ties break toward the FOOTING, then the lashing, then the thatch — worst-consequence first
 * rather than alphabetically. A rotted footing takes two answers with it, so a survivor with
 * an hour and one piece of wood should be sent to the thing that is holding the rest up.
 */
export function worstDefect(state: GameState): { id: DefectId; stage: DefectStage } | null {
    if (!state.shelter.built) return null;
    const order: DefectId[] = ['footing', 'lashing', 'thatch'];
    let worst: DefectId | null = null;
    for (const id of order) {
        if (defectStage(state, id) === 'sound') continue;
        if (worst === null || state.shelter.defects[id] > state.shelter.defects[worst]) worst = id;
    }
    return worst === null ? null : { id: worst, stage: defectStage(state, worst) };
}

/** Every place currently showing or failing, worst first. What the report reads from. */
export function outstandingWork(state: GameState): Array<{ id: DefectId; stage: DefectStage; cue: string }> {
    if (!state.shelter.built) return [];
    return ALL_DEFECTS
        .map((id) => ({ id, stage: defectStage(state, id) }))
        .filter((d) => d.stage !== 'sound')
        .sort((a, b) => state.shelter.defects[b.id] - state.shelter.defects[a.id])
        .map((d) => ({ ...d, cue: defectCue(d.id, d.stage)! }));
}

/**
 * ONE LINE FOR THE REPORT — the debt, in the player's own language.
 *
 * Null when there is nothing outstanding, because a report that says "everything is fine"
 * every morning teaches a survivor to stop reading it.
 */
export function upkeepNote(state: GameState): string | null {
    const work = outstandingWork(state);
    if (work.length === 0) return null;
    const first = work[0].cue;
    if (work.length === 1) return first;
    //  The count, never a list. Three cues in one toast is a wall of text nobody reads, and
    //  the second sentence's job is only to say that the debt is growing.
    return `${first}  ·  ${work.length - 1} more place${work.length > 2 ? 's' : ''} want attention.`;
}

/**
 * HOW MUCH OF EACH ANSWER THE DEFECTS ARE TAKING, 0..1 per threat.
 *
 * Applied by `degradeProfile` below rather than here, so this stays a pure statement of what
 * is wrong with the building and the arithmetic stays in one place.
 */
export function answerLoss(state: GameState): Record<Threat, number> {
    const loss: Record<Threat, number> = { wind: 0, rain: 0, cold: 0, 'ground-damp': 0 };
    if (!state.shelter.built) return loss;
    for (const id of ALL_DEFECTS) {
        const stage = defectStage(state, id);
        if (stage === 'sound') continue;
        const bite = stage === 'failing' ? TUNE.defectFailingAnswerLoss : TUNE.defectShowingAnswerLoss;
        for (const threat of threatsOf(id)) loss[threat] = Math.min(1, loss[threat] + bite);
    }
    return loss;
}

/**
 * The refuge profile a defective shelter actually offers.
 *
 * IT ONLY EVER SUBTRACTS, and it is floored at zero rather than allowed to go negative. A
 * lean-to with every defect failing is a bad shelter; it is not a machine for making the night
 * worse than open ground. The cave earns a negative coefficient because a stone floor genuinely
 * conducts heat away — a broken roof does not do the equivalent, and pretending it did would be
 * inventing a punishment the fiction does not support.
 */
export function degradeProfile(profile: RefugeProfile, loss: Record<Threat, number>): RefugeProfile {
    const cut = (value: number, taken: number) => (value <= 0 ? value : Math.max(0, value * (1 - taken)));
    return {
        wind: cut(profile.wind, loss.wind),
        rain: cut(profile.rain, loss.rain),
        cold: cut(profile.cold, loss.cold),
        groundDamp: cut(profile.groundDamp, loss['ground-damp']),
    };
}

// ---------------------------------------------------------------------------
// Doing the work.
// ---------------------------------------------------------------------------

/**
 * MEND ONE PLACE, not the whole building.
 *
 * This is where the maintenance debt stops being a phrase. The shipped repair action spent one
 * wood and moved one bar; it now spends one wood on ONE NAMED DEFECT, and a survivor who let
 * three places go now makes three trips. Deferring work does not accrue a hidden multiplier —
 * it accrues WORK, which is the honest form of a debt and the only one a player can plan around.
 *
 * Returns which place was mended so the body can say so by name. Null when there is nothing
 * outstanding, which the caller must treat as "nothing to mend" rather than as a failure.
 */
export function mendWorst(state: GameState): { id: DefectId; from: DefectStage; to: DefectStage } | null {
    const worst = worstDefect(state);
    if (!worst) return null;
    const before = worst.stage;
    const next = { ...state.shelter.defects };
    next[worst.id] = Math.max(0, next[worst.id] - TUNE.defectMendPerWood);
    state.shelter = { ...state.shelter, defects: next };
    return { id: worst.id, from: before, to: stageOf(next[worst.id]) };
}

/** Is there named work outstanding? The gate the repair verb reads. */
export function hasOutstandingWork(state: GameState): boolean {
    return worstDefect(state) !== null;
}
