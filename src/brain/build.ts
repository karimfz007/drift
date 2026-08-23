/**
 * INCREMENTAL CONSTRUCTION — a structure you can start before you can afford it.
 *
 * THE OLD ECONOMY WAS ALL-OR-NOTHING: stage every material, or do not begin. That is what
 * [[D-184]] was defending when it refused to arm a siting the survivor could not pay for —
 * and under that economy the refusal was right, because a placement that could not complete
 * had no way to become one that could. The director's new economy removes the premise: a
 * frame goes up with whatever was staged, and the survivor returns to it and adds more, over
 * as many visits as it takes, until it can be finished.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT [[D-184]] ACTUALLY PROVED, AND WHY IT SURVIVES IN A NARROWER FORM.
 *
 * Its symptom was a siting that stayed armed and ate every world tap; its LAW was broader:
 * *never arm something the player cannot resolve.* Under the new economy a partial placement
 * resolves — it succeeds, the siting clears, and a skeleton stands. So the affordability
 * guard is superseded exactly as the brief says. But the law is not, and it still has one
 * live case: a survivor carrying NOTHING the recipe wants. Beginning there would put an empty
 * frame in the world for no investment, and hand back a tap-eating siting in a new coat. So
 * `canBeginConstruction` refuses precisely that, and nothing else.
 *
 * The other half of the law is that the skeleton itself must never be a dead end. It is
 * always addable-to, always completable once fed, and always MOVABLE ([[D-183]]'s verb) — so
 * a frame in a bad place is never a thing the survivor is simply stuck with.
 *
 * ---------------------------------------------------------------------------------------
 * [[D-011]]. Every function here runs inside a verb. `reconcile` has no construction term
 * whatsoever — nothing here decays, spoils, settles or is lost while the game is closed, and
 * a half-built frame is exactly as safe across an absence as a finished one. That is
 * structural rather than guarded: there is no elapsed-time argument anywhere in this file.
 */
import { TUNE } from '../data/tune';
import { drawIntoHands, reachFor, recipeCost } from './experiment';
import type { ConstructionSite, GameState, MaterialKind } from './types';

/**
 * WHICH OUTCOMES ARE BUILT INCREMENTALLY — the shelter, and for now only the shelter.
 *
 * THE DIRECTOR ASKED FOR SHELTER AS THE REPRESENTATIVE CASE, and the first cut ignored that
 * and routed EVERY placed outcome through the frame. The crate then broke in a way worth
 * recording: `beginConstruction` took its five wood and stood a frame up, and nothing could
 * ever finish it, because completion is `completeShelterFromSite` and it refuses anything
 * that is not a shelter. A fully-stocked survivor paid the price and got a permanent skeleton.
 * The device caught it inside one group — `built false, wood 14 -> 9`.
 *
 * So the set is explicit rather than "everything placed". Adding the crate later is one entry
 * here plus its own completion path, and the type of that pairing is the point: an outcome
 * cannot join the incremental economy without something that can finish it.
 */
export const INCREMENTAL_OUTCOMES: ReadonlySet<string> = new Set(['shelter']);

/** Is this outcome raised as a frame and fed, or built whole in one act? */
export function isIncremental(recipeId: string): boolean {
    return INCREMENTAL_OUTCOMES.has(recipeId);
}

/**
 * WHAT THIS SITE STILL WANTS, per kind. The one derivation — everything else here reads it.
 *
 * Uses `recipeCost`, which is the same table the finished builder charges from, so a frame
 * can never ask for a different total than the shelter it becomes.
 */
export function siteShortfall(site: ConstructionSite): Partial<Record<MaterialKind, number>> {
    const missing: Partial<Record<MaterialKind, number>> = {};
    for (const { kind, amount } of recipeCost(site.recipeId)) {
        const have = site.contributed[kind] ?? 0;
        if (have < amount) missing[kind] = amount - have;
    }
    return missing;
}

/** Has it been fed everything it needs? */
export function siteIsComplete(site: ConstructionSite): boolean {
    return Object.keys(siteShortfall(site)).length === 0;
}

/** How far along, 0..1 — for the render, so the frame LOOKS like what it is (Law 222/223). */
export function siteProgress(site: ConstructionSite): number {
    let want = 0;
    let got = 0;
    for (const { kind, amount } of recipeCost(site.recipeId)) {
        want += amount;
        got += Math.min(amount, site.contributed[kind] ?? 0);
    }
    return want <= 0 ? 1 : got / want;
}

/** "It still needs 6 wood and 2 fibre." Null when it is ready to finish. */
export function siteShortfallNote(site: ConstructionSite): string | null {
    const parts = Object.entries(siteShortfall(site))
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([kind, n]) => `${n} ${kind === 'fiber' ? 'fibre' : kind}`);
    return parts.length === 0 ? null : `It still needs ${parts.join(' and ')}.`;
}

/**
 * HOW MUCH OF WHAT THEY CARRY THIS SITE WOULD TAKE — computed before anything moves, so the
 * verb can be offered or refused honestly rather than by attempting it and seeing.
 */
export function contributionAvailable(
    state: GameState,
    site: ConstructionSite,
    storageOpen = false,
): Partial<Record<MaterialKind, number>> {
    //  AN OPEN CRATE IS PART OF THE REACH, and leaving it out was a real regression the
    //  grouped sweep caught: a survivor standing at their own open box with twenty of
    //  everything in it and empty hands was told *"you are carrying none of what it takes"*.
    //  The whole-build path has always drawn from the box (`drawIntoHands`), so the frame
    //  reading only the pack made the new economy strictly worse than the one it replaced.
    const reach = reachFor(state, storageOpen);
    const giving: Partial<Record<MaterialKind, number>> = {};
    for (const [kind, need] of Object.entries(siteShortfall(site)) as Array<[MaterialKind, number]>) {
        const give = Math.min(reach.counts[kind] ?? 0, need);
        if (give > 0) giving[kind] = give;
    }
    return giving;
}

/** Is there anything in hand this frame would accept right now? */
export function canContribute(state: GameState, storageOpen = false): boolean {
    if (!state.construction) return false;
    return Object.keys(contributionAvailable(state, state.construction, storageOpen)).length > 0;
}

/**
 * PUT IN WHAT YOU CAN. Moves every carried kind the site still wants, up to what it wants.
 *
 * NEVER OVER-FEEDS: capped at the shortfall per kind, so a survivor cannot pour twenty wood
 * into a frame that needs six and lose the other fourteen. That is the material-loss shape
 * this project has been bitten by, closed here by the `Math.min` rather than by a later check.
 */
export function contributeToSite(state: GameState, storageOpen = false): Partial<Record<MaterialKind, number>> {
    const site = state.construction;
    if (!site) return {};
    const giving = contributionAvailable(state, site, storageOpen);
    for (const [kind, amount] of Object.entries(giving) as Array<[MaterialKind, number]>) {
        //  TOPPED UP OUT OF THE BOX FIRST, exactly as `placeAtSite` does — `drawIntoHands` is
        //  the one rule for "get it into the hands", so the frame cannot invent a second.
        drawIntoHands(state, kind, amount, storageOpen);
        state.inventory[kind] = (state.inventory[kind] ?? 0) - amount;
        site.contributed[kind] = (site.contributed[kind] ?? 0) + amount;
    }
    return giving;
}

/**
 * CAN A FRAME BE STARTED AT ALL — the one surviving piece of [[D-184]]'s law.
 *
 * Refuses only when the survivor can contribute NOTHING. Anything at all is enough to begin,
 * because from that moment the frame is a real object with real, resolvable actions.
 */
export function canBeginConstruction(state: GameState, recipeId: string, storageOpen = false): boolean {
    return beginBlocker(state, recipeId, storageOpen) === null;
}

/** One sentence naming the single thing in the way. Never "requirements not met". */
export function beginBlocker(state: GameState, recipeId: string, storageOpen = false): string | null {
    if (state.construction) return 'You already have something half-built. Finish that first, or move it.';
    const cost = recipeCost(recipeId);
    if (cost.length === 0) return 'That is not something you raise on a site.';
    const reach = reachFor(state, storageOpen);
    const carriesSomething = cost.some(({ kind }) => (reach.counts[kind] ?? 0) > 0);
    if (!carriesSomething) {
        const kinds = cost.map(({ kind }) => (kind === 'fiber' ? 'fibre' : kind)).join(', ');
        return `You are carrying none of what it takes — ${kinds}. Gather some first.`;
    }
    return null;
}

/**
 * BEGIN. Puts a frame in the world and moves whatever the survivor can spare into it.
 *
 * Spends what it takes IMMEDIATELY, which is the honest reading of "the frame is made of what
 * you brought": the wood is in the structure, not still in the pack. A survivor who changes
 * their mind moves the frame or keeps feeding it; nothing is destroyed either way.
 */
export function beginConstruction(
    state: GameState,
    recipeId: string,
    x: number,
    y: number,
    storageOpen = false,
): boolean {
    if (!canBeginConstruction(state, recipeId, storageOpen)) return false;
    state.construction = { recipeId, x, y, contributed: {} };
    contributeToSite(state, storageOpen);
    return true;
}

/** Is the frame fed enough to be finished? */
export function canCompleteConstruction(state: GameState): boolean {
    return state.construction !== null && siteIsComplete(state.construction);
}

/**
 * CLEAR THE SITE once the real builder has taken over. Kept separate from the builders
 * themselves so the brain never has to import a body-facing build path, and so the caller
 * cannot half-finish: the frame is gone only after something real stands in its place.
 */
export function clearConstruction(state: GameState): void {
    state.construction = null;
}

/**
 * WHAT THE FINISHED THING WILL COST THE PACK AT COMPLETION — nothing.
 *
 * Everything was paid on the way in. The completion step is labour, not purchase, and this
 * function exists so the surface can say so rather than a player wondering whether they need
 * to be holding eight wood a second time.
 */
export function completionCostsNothing(): boolean {
    return true;
}

/** The frame's own display name, for prompts and float text. */
export function siteName(site: ConstructionSite): string {
    return site.recipeId === 'shelter' ? 'the half-built shelter' : `the half-built ${site.recipeId}`;
}

/** Every kind this site could ever want — for the surface, so it can name them before you carry any. */
export function siteWants(site: ConstructionSite): MaterialKind[] {
    return recipeCost(site.recipeId).map(({ kind }) => kind);
}

/** How near you must stand to work on a frame. The shelter's own reach, so it reads the same. */
export function constructionReachM(): number {
    return TUNE.interactRadiusM;
}
