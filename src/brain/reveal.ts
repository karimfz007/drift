/**
 * WHAT A RECIPE IS DEMONSTRATED ENOUGH TO STOP NAGGING ABOUT (Slice 2B Stage 2b, the
 * invention pivot — RE-SCOPED, ITEM 1, this batch, once the surface it originally described
 * was retired outright).
 *
 * THE ORIGINAL PIVOT, for context this module's own history still depends on: before Slice
 * 2B, the Build panel was a CATALOGUE — rows present from the first second of the run,
 * listing things the castaway had never seen, made, or thought of, answering "what can I
 * build?" before the player had earned the right to ask. `revealedInPanel` was the gate that
 * ended that — a row existed only once DEMONSTRATED or above on the ladder, or once
 * SURVIVAL-BASIC and already suspected (Law 113's scaffold, torch only).
 *
 * WHAT SURVIVES NOW THAT THE PANEL DOES NOT (item 1, this batch): `revealedInPanel` is
 * `panelHints`' own filter below — "stop nudging about something the survivor has already
 * worked out" — and nothing else. It answers the same ladder question it always did; only
 * the thing that used to consult it for a THIRD reason (whether to draw a Build-panel row at
 * all) is gone. See the ledger entry for the full account.
 *
 * `panelHints` ITSELF, UNCHANGED IN MECHANISM, RELOCATED IN SURFACE: the teaching half of
 * the original pivot — an empty panel with no hints was a dead end; a nudge that says *"the
 * dark is closing in, and you are holding something that burns"* is an invitation instead.
 * Never names a product — `discovery.ts` holds that line and `tests/discovery.test.ts`
 * guards it. Read from the Inventory tab now (`inventoryBody`, hud.ts) instead of the Build
 * panel that no longer exists, next to the combine row it is a nudge toward.
 */
import { atLeast, ladderFor } from './ladder';
import { DISCOVERY_ROUTES, suspicionFor } from './discovery';
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
    //  ITEM 1 — LAW 216: NO RESOURCE PICKUP MAY INSERT A MANUFACTURE-READY OBJECT INTO THE BOOK.
    //
    //  THE DEFECT, director-confirmed on a fresh incognito life and then measured here. This
    //  read `SURVIVAL_BASIC.has(id) && suspicionFor(id).suspected`, and `suspected` is
    //  `needFelt && every making in the inventory` — where `hasHandled` is literally
    //  `inventory[m] > 0`. The torch's need is `isNight || cold`, and the game opens at hour 18.
    //  So a survivor who picked up ONE stick and ONE strand, four seconds off the beach, with
    //  `blueprints: []` and `torch.owned: false`, was handed a manufacture-ready Torch row.
    //  The gate was never knowledge. It was possession wearing knowledge's name.
    //
    //  ONE PREDICATE, THREE SYMPTOMS. The same boolean is the last line of `fireIsKnown`, so it
    //  also produced the "Build fire" button on nine wood with nothing ever invented — which is
    //  why [[D-150]]'s fix, routing the HUD through `canBuildFire`, changed nothing the director
    //  could feel: I moved the question one layer down to a function that asked the same thing.
    //
    //  THE SCAFFOLD IS NOT LOST, IT MOVES TO WHERE IT BELONGS. Law 113 says the survival basics
    //  are scaffolded rather than gated behind blind experiment — and a scaffold is a PROMPT,
    //  not a product. `panelHints` below skips anything already revealed and surfaces the route's
    //  own words for anything merely suspected, so the survivor holding wood and fibre is still
    //  told "The dark is closing in, and you are holding something that burns." They are pointed
    //  at the experiment; they are not handed the answer. Law 113 and Law 216 both hold, and the
    //  only thing that changes is that the ROW must now be earned.
    return atLeast(ladderFor(state, recipeId), 'demonstrated');
}

//  `satisfied`/`makerOffers` ARE GONE (ITEM 1, this batch). Both existed to gate the Build
//  door — `makerOffers`'s own doc called it "the door's own gate, derived rather than
//  enumerated" — and the door itself is retired outright now, along with the panel it
//  opened. See the ledger entry for the full account. `revealedInPanel` survives: it is
//  still `panelHints`' own gate below, unrelated to any door.

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
