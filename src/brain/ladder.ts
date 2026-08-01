/**
 * THE SIX-STATE KNOWLEDGE LADDER — Stage A of Slice 2B (D-086, canon).
 *
 * Binary known/unknown is gone. What a castaway has with a thing is a POSITION, and the
 * whole point of the invention pivot is that the position is *earned* and *visible*:
 *
 *   1. physically-possible    the world permits it; nobody has noticed
 *   2. found-intact           encountered as an object already made
 *   3. conceptually-suspected a property or affordance hints it could exist
 *   4. demonstrated           made it work once — reliably enough to repeat, not to explain
 *   5. understood             knows WHY; execution is reliable (D-086 shaping b)
 *   6. documented             recorded so it survives the knower
 *
 * WIRED ONTO WHAT SHIPPED, NOT BESIDE IT. This is the instruction that shapes the whole
 * module: DRIFT already has a discovery spine — Try-Combine, the null-outcome journal, and
 * blueprints — and the ladder is a *reading* of that spine, not a second store to keep in
 * sync. Every rung below is derived from state that already existed:
 *
 *   - a minted blueprint          -> at least `demonstrated`
 *   - a journaled null pair       -> `conceptually-suspected` for what it ruled out
 *   - domain understanding        -> `understood` once the recipe's own domain is deep
 *   - nothing at all              -> `physically-possible`
 *
 * A parallel system would rot the moment the two disagreed, and the player would be told a
 * confident lie about their own knowledge — the failure mode F3 was built to avoid one slice
 * ago. So there is no `ladderState` field anywhere; there is only this function.
 *
 * D-086 shaping (b), DETERMINISM BY STATE, is expressed here as a contract other systems
 * read: at `understood` execution is reliable; at `demonstrated` grade variance is legal but
 * arbitrary failure is not. `executionIsReliable` and `arbitraryFailureAllowed` are the two
 * predicates that carry it, so no caller has to re-derive the rule and get it subtly wrong.
 */
import { TUNE } from '../data/tune';
import type { GameState, KnowledgeDomain } from './types';
import { allRecipes } from './recipes';
import { suspicionFor } from './discovery';

/**
 * `recipeDomain` THROWS on an unknown id. The ladder is asked about things the survivor has
 * not discovered — that is its whole job — so it must answer "bottom rung", never explode.
 */
function domainOf(recipeId: string): KnowledgeDomain | null {
    return allRecipes().find((r) => r.id === recipeId)?.domain ?? null;
}

export type LadderState =
    | 'physically-possible'
    | 'found-intact'
    | 'conceptually-suspected'
    | 'demonstrated'
    | 'understood'
    | 'documented';

/** Ascending. Index is the rung; comparisons are index comparisons. */
export const LADDER_ORDER: LadderState[] = [
    'physically-possible',
    'found-intact',
    'conceptually-suspected',
    'demonstrated',
    'understood',
    'documented',
];

export function rung(state: LadderState): number {
    return LADDER_ORDER.indexOf(state);
}

/** Is `a` at least as far up as `b`? */
export function atLeast(a: LadderState, b: LadderState): boolean {
    return rung(a) >= rung(b);
}

/**
 * Where the survivor stands with one recipe, READ from the shipped spine.
 *
 * Deliberately has no memory of its own. If this ever needs a stored field to answer, the
 * ladder has stopped being a reading of the discovery mechanism and become a parallel one.
 */
export function ladderFor(state: GameState, recipeId: string): LadderState {
    const blueprint = state.blueprints.find((b) => b.recipeId === recipeId);

    if (blueprint) {
        //  Documented is the recorded rung: a blueprint that has been written down survives
        //  the knower. The shipped Blueprint already carries authorship and a discovery
        //  moment, which is exactly what "documented" means — so a minted plan IS the record.
        //  Understanding is what separates repeating a success from being able to explain it.
        const domain = domainOf(recipeId);
        if (domain && understandsDomain(state, domain)) return 'documented';
        return 'demonstrated';
    }

    //  A journaled dead end is real knowledge: the survivor has formed a suspicion strong
    //  enough to test and learned something from its failure. That is rung 3, not rung 1.
    if (suspects(state, recipeId)) return 'conceptually-suspected';

    //  ...and so is a live discovery route firing. Need, makings in hand, and the property
    //  the material shows when handled: that is a survivor with a reason to wonder, which is
    //  exactly what `conceptually-suspected` means. It does NOT name the product — see
    //  `discovery.ts`. The game may tell you that you are cold and holding cordage; telling
    //  you to build a lean-to would put the catalogue back one sentence at a time.
    if (suspicionFor(state, recipeId)?.suspected) return 'conceptually-suspected';

    //  THE JOURNAL ([[D-068]]) — the one channel by which knowledge outlives its knower, and
    //  the reason it stops HERE rather than one rung higher. Someone who was actually there
    //  wrote down what they did: that is a far stronger hint than a hunch, so it earns
    //  `conceptually-suspected`. It is not `demonstrated`, because reading is not doing —
    //  a successor who could read their way into a working technique would make the previous
    //  survivor's hands irrelevant, which is exactly the inheritance Slice 3 forbids.
    //
    //  Read inline rather than through `journal.ts` on purpose: that module reads the ladder
    //  to decide what may be written, and an import back would close a cycle.
    if (journalSpeaksTo(state, recipeId)) return 'conceptually-suspected';

    //  REQUALIFICATION — Slice 3, [[D-069]]: MATTER, NOT MEMORY.
    //
    //  A successor washes ashore into a developed island. The shelter is standing; they did
    //  not build it and do not know how. `found-intact` is precisely that state — rung 2,
    //  "encountered as an object already made" — and until Slice 3 nothing in the game could
    //  reach it, because until Slice 3 nobody ever inherited anything.
    //
    //  This is the whole of what the previous life passes on through matter, and it is
    //  deliberately NOT much: two rungs below `demonstrated`, so the successor still has to
    //  work the thing out themselves. What they get is the certainty that it is possible and
    //  a physical example to study, which is exactly what a real person would get from
    //  finding a hut. What they do not get is the technique.
    if (standingExampleOf(state, recipeId)) return 'found-intact';

    return 'physically-possible';
}

/**
 * Is there a made example of this recipe standing on the island right now? Read from the
 * world, so it goes away if the thing does — an inherited rung must not outlive the evidence
 * that granted it, or "found-intact" becomes stored knowledge wearing a reading's clothes.
 */
export function standingExampleOf(state: GameState, recipeId: string): boolean {
    if (recipeId === 'shelter') return state.shelter.built;
    if (recipeId === 'storage') return state.storage.built;
    return false;
}

/**
 * Does a legible journal, written by SOMEONE ELSE, describe this recipe? The three conditions
 * are all load-bearing: it must exist (the carrier can be lost), it must be legible (the
 * carrier can be ruined), and it must not be your own handwriting (reading yourself teaches
 * nothing). Any one of them failing takes the rung away again.
 */
function journalSpeaksTo(state: GameState, recipeId: string): boolean {
    const j = state.journal;
    if (!j.exists || j.condition < TUNE.journalLegibilityFloor) return false;
    const me = state.memorial.length + 1;
    return j.entries.some((e) => e.topic === recipeId && e.author !== me);
}

/** Has the survivor tried anything that bears on this recipe and journaled the outcome? */
function suspects(state: GameState, recipeId: string): boolean {
    //  The null journal keys pairs, not recipes, so a suspicion exists when the survivor has
    //  tried ANY pair and the recipe's own domain has been engaged — they are poking at this
    //  area of the world rather than at random.
    if (state.knowledge.nullPairs.length === 0) return false;
    const domain = domainOf(recipeId);
    if (!domain) return false;
    return state.knowledge.domains[domain].technique > 0
        || state.knowledge.domains[domain].understanding > 0;
}

function understandsDomain(state: GameState, domain: KnowledgeDomain): boolean {
    return state.knowledge.domains[domain].understanding >= TUNE.ladderUnderstoodAt;
}

// ---- D-086 shaping (b): determinism by state -----------------------------

/**
 * At `understood` and above, execution is RELIABLE. Below it, it is not guaranteed — but see
 * `arbitraryFailureAllowed`, which is the half that keeps this fair.
 */
export function executionIsReliable(ladder: LadderState): boolean {
    return atLeast(ladder, 'understood');
}

/**
 * ARBITRARY FAILURE IS NEVER LEGAL AT `demonstrated` OR ABOVE.
 *
 * The distinction D-086 draws, and the reason it is a shaping rather than a detail: someone
 * who has made a thing work is allowed to make a WORSE one — grade variance is honest, since
 * a shaky hand really does produce a shakier result. What they may not suffer is a coin flip
 * that produces nothing, because that teaches the player that the world is arbitrary rather
 * than that their skill is low. Variance in QUALITY reads as craft; variance in WHETHER
 * ANYTHING HAPPENS reads as a broken game.
 */
export function arbitraryFailureAllowed(ladder: LadderState): boolean {
    return !atLeast(ladder, 'demonstrated');
}

/** Grade variance is legal from `demonstrated` up, and is the honest form of inexperience. */
export function gradeVarianceAllowed(ladder: LadderState): boolean {
    return atLeast(ladder, 'demonstrated') && !atLeast(ladder, 'documented');
}

// ---- D-086 shaping (c): migration ---------------------------------------

/**
 * A previously-crafted type enters the new system at `demonstrated`, never reset to zero.
 *
 * The reasoning is the player's, not the schema's: they DID make that axe. Waking to a world
 * that has forgotten it would be the game calling them a liar about their own past, and no
 * amount of "the system changed" makes that read as anything else. Structures persist as
 * matter separately — a standing shelter is a fact about the island, not about knowledge.
 */
export function migratedLadderFor(hasCraftedBefore: boolean): LadderState {
    return hasCraftedBefore ? 'demonstrated' : 'physically-possible';
}
