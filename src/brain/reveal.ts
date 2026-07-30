/**
 * WHAT THE BUILD PANEL IS ALLOWED TO SHOW (Slice 2B Stage 2b — the invention pivot).
 *
 * Before this, the Build panel was a CATALOGUE: five rows present from the first second of
 * the run, listing things the castaway had never seen, made, or thought of. It answered the
 * question "what can I build?" before the player had earned the right to ask it, and in doing
 * so it did the inventing for them. This module is the pivot. After it, the panel is a
 * RECORD — it shows what you have actually done, and nothing else.
 *
 * TWO WAYS A ROW EXISTS, and only two:
 *
 *   1. **You have made one.** `demonstrated` or above on the ladder, which means a blueprint
 *      exists, which means you succeeded at least once. The migration mints these from
 *      possession for saves that predate the pivot ([[D-087]] lineage, save v11→v12) — a
 *      survivor holding their own axe is never told they have never heard of one.
 *
 *   2. **It is SURVIVAL-BASIC and you are already suspecting it** — Law 113's scaffold. The
 *      first night is not the place to discover that a castaway who cannot make fire dies,
 *      and blind experimentation is not a fair challenge when the cost of failing it is the
 *      run. So fire is *authored*: the need arrives on schedule, the materials are the two
 *      most common on the island, and when both are true the way forward is shown.
 *
 * WHAT THIS IS NOT. The scaffold is not the catalogue in a smaller font. The row appears when
 * the need and the makings are both real — a cold survivor holding wood and fibre — and not
 * before. At minute zero, warm, empty-handed, the panel is empty, and that emptiness is the
 * whole design. The prompt that leads there names a need and a material and never the
 * product; `discovery.ts` holds that line and `tests/discovery.test.ts` guards it.
 *
 * EVERYTHING ELSE goes through Try-Combine. The suspicion gives the survivor a reason to try;
 * the trying is theirs. That is the fair-challenge contract this stage exists to honour.
 */
import { atLeast, ladderFor } from './ladder';
import { suspicionFor } from './discovery';
import type { GameState } from './types';

/**
 * Law 113 — the survival basics are scaffolded rather than gated behind blind experiment.
 *
 * Deliberately a short, explicit list rather than a domain test. `survivalcraft` as a domain
 * is wider than "the things that kill you on night one", and deriving the scaffold from it
 * would quietly re-list items nobody has earned the moment a new survivalcraft recipe ships.
 * If something belongs here, someone has to type it here and say why.
 */
export const SURVIVAL_BASIC: ReadonlySet<string> = new Set(['torch']);

/**
 * May this recipe appear as a buildable row?
 *
 * Note the ORDER: the earned test runs first. A survivor who has made a torch keeps the row
 * whether or not the need is currently felt — knowledge does not switch off when the sun
 * comes up. The scaffold is a floor for the inexperienced, never a ceiling on the experienced.
 */
export function revealedInPanel(state: GameState, recipeId: string): boolean {
    if (atLeast(ladderFor(state, recipeId), 'demonstrated')) return true;
    if (!SURVIVAL_BASIC.has(recipeId)) return false;
    return suspicionFor(state, recipeId)?.suspected === true;
}

/** A thought the survivor is having but cannot yet act on — the teaching half of the pivot. */
export interface PanelHint {
    recipeId: string;
    prompt: string;
}

/**
 * The nagging thoughts: suspicions that are live but have NOT produced a row.
 *
 * This is the half that makes the subtraction survivable. An empty panel with no hints is a
 * dead end and a bug report; an empty panel that says *"the dark is closing in, and you are
 * holding something that burns"* is an invitation. A revealed item is deliberately excluded —
 * once the row is there, the hint has done its work and repeating it is nagging for its own
 * sake.
 */
export function panelHints(state: GameState): PanelHint[] {
    const hints: PanelHint[] = [];
    for (const recipeId of ['torch', 'shelter', 'axe', 'stonehammer', 'storage']) {
        if (revealedInPanel(state, recipeId)) continue;
        const sus = suspicionFor(state, recipeId);
        if (sus?.suspected && sus.prompt) hints.push({ recipeId, prompt: sus.prompt });
    }
    return hints;
}
