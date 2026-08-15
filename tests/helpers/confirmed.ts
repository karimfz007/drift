/**
 * STAGE, THEN CONFIRM — the shared shape every combining test needs after the director's
 * never-auto-commit ruling.
 *
 * `tryCombineWith` no longer commits anything on its own. Staging materials that MAKE something
 * returns `choose` — a question — and nothing is spent until the survivor answers it. That is
 * the whole point: a first-time pattern used to go straight to a finished product, which is the
 * defect the director reported ("stone + wood immediately producing a storage box with no ask").
 *
 * So a test that wants to exercise an ATTEMPT has to do what a player does: stage, read the
 * question, and answer it. This is that, in one call, so the round-trip lives in one place
 * rather than being re-typed in eight files — and so a future change to the confirmation flow
 * moves every test with it instead of past it.
 */
import { EXPERIMENT_CHOICE, heldMatches, makeChosen, tryCombineWith } from '../../src/brain/experiment';
import type { ExperimentResult } from '../../src/brain/experiment';
import type { GameState, MaterialKind } from '../../src/brain/types';

/**
 * Stage these materials and confirm the attempt, exactly as a player would.
 *
 * `recipeId` names which outcome to confirm when the survivor already holds more than one plan
 * for the pile. Left out, it answers the way someone still experimenting would: take whatever
 * the pile is, decline nothing, and let the world resolve it — which is the discovery path and
 * is what every pre-ruling `tryCombineWith` call was implicitly doing.
 */
export function attemptConfirmed(
    state: GameState, materials: MaterialKind[], recipeId?: string,
): ExperimentResult {
    const asked = tryCombineWith(state, materials);
    if (asked.outcome !== 'choose') return asked;

    if (recipeId) return makeChosen(state, materials, recipeId);

    //  No preference expressed. If exactly one plan is held this is a plain yes; otherwise the
    //  survivor is experimenting, which `EXPERIMENT_CHOICE` is the honest answer for.
    const held = heldMatches(state, materials);
    if (held.length === 1) return makeChosen(state, materials, held[0].id);
    return makeChosen(state, materials, EXPERIMENT_CHOICE);
}
