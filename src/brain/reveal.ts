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
import { DISCOVERY_ROUTES, suspicionFor } from './discovery';
import { allRecipes } from './recipes';
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

/**
 * Is this recipe's product already made or standing?
 *
 * `knap` is deliberately absent: it is repeatable and has no "done" state (D-055), so it is
 * never satisfied and never stops being an offer.
 */
function satisfied(state: GameState, recipeId: string): boolean {
    switch (recipeId) {
        case 'torch': return state.torch.owned;
        case 'axe': return state.tools.axe;
        case 'spear': return state.tools.spear;
        case 'backpack': return state.tools.backpack;
        case 'stonehammer': return state.tools.stoneHammer;
        case 'shelter': return state.shelter.built;
        case 'storage': return state.storage.built;
        //  THE MARITIME SLICE. Without this the raft falls to `default: false` and stays a
        //  live offer forever — so `makerOffers` keeps citing it as a reason to open the
        //  door after it is moored at the shore. Exactly the "gate you have to remember to
        //  extend" this function's own header names, caught by reading rather than by a
        //  bug report, which is the only reason it is not a fourth occurrence.
        case 'raft': return state.raft.built;
        //  FISHING. Same gate, same reason, written at the same time as the recipes rather
        //  than remembered later — a line and a net that stayed "offered" forever would keep
        //  the Build door open on nothing, which is the defect the raft's own note describes.
        case 'fishingline': return state.tools.fishingLine;
        case 'net': return state.tools.net;
        default: return false;
    }
}

/**
 * WHAT THE MAKER PANEL HAS TO OFFER — the door's own gate, derived rather than enumerated.
 *
 * THE DEFECT THIS REPLACES, which is [[D-053]]'s for the THIRD time. The body decided this
 * with a hardcoded list of product flags: *"show the button if the axe OR the shelter OR the
 * storage OR the torch OR the hammer is still unmade."* Every clause goes false on a
 * long-running save — which is exactly the save a real player has — and the button vanished
 * outright with live rows still inside it. D-053 found it when the torch shipped and fixed it
 * by APPENDING the torch. The spear and the backpack then shipped and were not appended, so
 * a fully-equipped survivor had no route to either. **A gate you have to remember to extend
 * is a defect with a delay on it**, and appending a sixth clause would only set the timer
 * again.
 *
 * So the door is derived from the room. `rest` is unconditional and is listed as a real
 * offer, not a fudge to force the result true: the panel is the ONLY entry point to sleeping
 * rough — the circle's `sleep` verb refuses unless you are standing at a shelter — so a
 * survivor with nothing left to make still has something in there they cannot reach any
 * other way. That is a fact about the game, and it is why this predicate is total.
 *
 * Returned as a LIST rather than a boolean on purpose: a caller that wants to know *why* the
 * door is open can see it, and a test can assert the spear is genuinely among the offers
 * instead of inferring it from a `true` that a dozen other things would also produce.
 */
export function makerOffers(state: GameState): string[] {
    const offers = allRecipes()
        .map((r) => r.id)
        .filter((id) => revealedInPanel(state, id) && !satisfied(state, id));
    offers.push('rest');
    return offers;
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
    //  DERIVED FROM THE ROUTES, not from a list typed out here.
    //
    //  THE DEFECT THIS CLOSES, found by reading during the Maritime Slice and not by a bug
    //  report. This iterated a hardcoded five — torch, shelter, axe, stonehammer, storage —
    //  so the raft's discovery route fired correctly in the brain and its prompt could never
    //  reach the screen. The route would have been real, tested, and invisible: [[D-114]]'s
    //  exact class, *a reachability proof that bypasses the discovery surface*, and the
    //  third hardcoded list in this one file to have gone stale the moment something shipped.
    //
    //  `DISCOVERY_ROUTES` is the single source of what a survivor can come to suspect, so a
    //  future route cannot be added without its prompt being able to appear. It changes
    //  nothing for anything already shipped: only recipes WITH a route can produce a
    //  suspicion at all, and the five that had one are the five that were listed.
    for (const route of DISCOVERY_ROUTES) {
        if (revealedInPanel(state, route.recipeId)) continue;
        const sus = suspicionFor(state, route.recipeId);
        if (sus?.suspected && sus.prompt) hints.push({ recipeId: route.recipeId, prompt: sus.prompt });
    }
    return hints;
}
