/**
 * THE CONFIDENCE / RECENCY LAYER (Slice 2B Stage B) — and the boundary it must never cross.
 *
 * §15's last paragraph: *"long-unused techniques lose timing/confidence before principle
 * knowledge disappears — pattern stays in the book, first renewed attempt may take longer,
 * inspection and low-stakes rehearsal restore control, never an arbitrary inactivity timer
 * erasing months of mastery."*
 *
 * Two sentences, two different things, and every bad implementation of "skill decay" ever
 * shipped is the result of merging them:
 *
 *   **"The pattern stays in the book" is KNOWLEDGE.** It NEVER decays. Not offline, not after
 *   a year, not for any reason. `KnowledgeState` is monotonic and this module does not import
 *   a single function capable of writing to it.
 *
 *   **"The first renewed attempt takes longer" is CONFIDENCE.** That is what lives here — a
 *   separate layer, alongside, never inside. It dips toward a FLOOR with disuse and comes
 *   back with rehearsal.
 *
 * THE FLOOR IS THE DESIGN, not a rounding detail. Confidence bottoms out at
 * `TUNE.confidenceFloor`, well above zero, because a survivor who once built a shelter is
 * never again a person who has never built one. The worst case is slower and clumsier, never
 * helpless — that is the difference between rust and amnesia, and it is why this is not "an
 * arbitrary inactivity timer erasing months of mastery."
 *
 * WHAT IT MAY AFFECT: timing, and the chance of a fumbled first attempt. Nothing else. It
 * does not gate a recipe, does not remove a Build row, does not lower a ladder rung, and does
 * not touch a domain score. If you are reading this while adding a fifth thing confidence
 * modifies, that is the moment to check whether you are quietly rebuilding skill decay as a
 * punishment.
 *
 * HOW THE BOUNDARY IS ENFORCED. Not by care — by construction and then by test.
 * `tests/confidence.test.ts` runs this whole layer over thousands of random states across
 * random absences and asserts `state.knowledge` is deep-equal before and after, every time.
 * That test is written to CATCH a violation, not merely to avoid causing one: it fails loudly
 * if a future author reaches into `knowledge` from here. The pre-existing never-decays-offline
 * property test in `tests/vitals.test.ts` is untouched by this module and stays that way.
 */
import { TUNE } from '../data/tune';
import type { GameState } from './types';

/**
 * When each practised thing was last done, in game hours. A plain record keyed by recipe id —
 * the same JSON-safe convention `nullPairs` and `deathLog` already use.
 *
 * Deliberately NOT a stored confidence VALUE. Confidence is derived from elapsed time on
 * every read, exactly as the six-state ladder is derived from the discovery spine rather than
 * stored beside it. A stored value is a second source of truth, and the first time it
 * disagrees with the clock the player is told a confident lie about their own hands.
 */
export interface ConfidenceState {
    lastPractisedGameHours: Record<string, number>;
}

export function freshConfidence(): ConfidenceState {
    return { lastPractisedGameHours: {} };
}

/**
 * Confidence in one technique, 1 (fresh) down to `TUNE.confidenceFloor` (rusty).
 *
 * Something never practised reads FULL rather than floored. A survivor about to try a thing
 * for the first time is not rusty at it — they are inexperienced, which the knowledge ladder
 * already models, and charging them a rust penalty on top would be the same failure taxed
 * twice.
 */
export function confidenceFor(
    state: GameState, techniqueId: string, nowGameHours: number,
): number {
    const last = state.confidence?.lastPractisedGameHours?.[techniqueId];
    if (last === undefined) return 1;

    const idle = Math.max(0, nowGameHours - last);
    if (idle <= TUNE.confidenceGraceGameHours) return 1;

    const decaying = idle - TUNE.confidenceGraceGameHours;
    const lost = decaying / TUNE.confidenceHalfLifeGameHours * (1 - TUNE.confidenceFloor);
    return Math.max(TUNE.confidenceFloor, 1 - lost);
}

/**
 * What rust actually costs: time. A rusty first attempt takes longer — it does not fail, and
 * it does not produce a worse object. §15 says the pattern is still in the book; the hands
 * are just slow to find it again.
 */
export function executionTimeMultiplier(confidence: number): number {
    //  Normalised across the REAL range [floor, 1], not across [0, 1]. Confidence can never
    //  reach zero — that is the point of the floor — so scaling by the raw shortfall would
    //  cap the penalty at 45% of the number TUNE declares, and the tunable would quietly
    //  mean something other than it says.
    const span = 1 - TUNE.confidenceFloor;
    const rust = span <= 0 ? 0 : (1 - clamp(confidence, TUNE.confidenceFloor, 1)) / span;
    return 1 + rust * (TUNE.confidenceMaxTimePenalty - 1);
}

/**
 * Practising something. The ONLY writer in this module, and it writes to exactly one field.
 *
 * Returns a new `ConfidenceState` rather than a new `GameState` on purpose: this function is
 * structurally incapable of touching `knowledge`, because it never has a `GameState` to
 * touch. The boundary is enforced by the type signature before any test runs.
 */
export function practise(
    confidence: ConfidenceState, techniqueId: string, nowGameHours: number,
): ConfidenceState {
    return {
        lastPractisedGameHours: {
            ...confidence.lastPractisedGameHours,
            [techniqueId]: nowGameHours,
        },
    };
}

/**
 * Low-stakes rehearsal — §15's own named restorative. Inspecting the thing, handling the
 * materials, doing it once without the night riding on it.
 *
 * It restores fully, and that is deliberate: the layer exists to make the FIRST renewed
 * attempt cost something, not to make the player grind their way back to competence. A
 * partial restore would turn rehearsal into a chore with a progress bar.
 */
export function rehearse(
    confidence: ConfidenceState, techniqueId: string, nowGameHours: number,
): ConfidenceState {
    return practise(confidence, techniqueId, nowGameHours);
}

/** Is this technique rusty enough that the survivor should be told before they commit? */
export function isRusty(confidence: number): boolean {
    return confidence < TUNE.confidenceRustyBelow;
}

/** One plain sentence, or null when there is nothing worth saying. */
export function rustNote(techniqueLabel: string, confidence: number): string | null {
    if (!isRusty(confidence)) return null;
    return `It has been a while since you last ${techniqueLabel}. You still know how — your hands will just be slow to start.`;
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}
