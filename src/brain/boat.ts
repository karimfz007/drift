/**
 * THE BROKEN FISHING BOAT — DROP 4, "THE PULL: THE WAY HOME, VISIBLE" (Laws 124–125).
 *
 * WHAT THIS DROP IS, stated so the scope cap is legible from the first line: a promise made
 * visible, not a system to master. The boat is at STATE B0 — beached, holed, engineless — and
 * nothing in this module moves it off that stage. What a survivor can do here is LOOK at it,
 * and come to understand what it would need. That is the whole verb list.
 *
 * ---------------------------------------------------------------------------------------
 * NO RESTORATION MECHANICS, AND NOT EVEN THE FIRST STEP — which is a judgement call the brief
 * explicitly left open ("plus the first obvious repair step IF it's cheap"), so here is the
 * reasoning rather than a silent omission.
 *
 * There is no cheap first step. Every candidate — patch the hull, bail it, drag it clear —
 * needs a stage between B0 and B1, a material cost, and a visible change to the object. That
 * is a restoration system with one entry in it, and a system with one entry is the hardest
 * kind to remove later because it looks finished. The cap says B1+ is its own maritime slice;
 * building a half-rung now would make that slice inherit a shape nobody designed.
 *
 * So the boat does not change this drop. It is looked at, and what changes is the SURVIVOR.
 *
 * ---------------------------------------------------------------------------------------
 * TWO ROUTES TO ONE UNDERSTANDING (Law 125), and neither is mandatory.
 *
 *   THE MANUAL   found content, through the SAME channel the Journal and the far island's
 *                traces already use. `MANUALS` carries a site whose `topic` is 'boat', so
 *                `ladderFor(state, 'boat')` answers `conceptually-suspected` the moment it is
 *                read — with no new branch in `ladder.ts`. Comprehension-gated in the exact
 *                sense the ladder already means: reading is not doing, and it stops at rung 3.
 *
 *   THE HANDS    technique in `navigationSeamanship` — the domain the raft, the crossing and
 *                the wreck all train. A survivor who has built a raft, crossed open water and
 *                worked a hull has learned to read one. That is the safer, slower route: it
 *                costs no lucky find, only work already done. The threshold is COUNTED against
 *                those producers rather than guessed at — see `boatSeamanshipTechnique`, which
 *                shipped at a value needing three regrow cycles of the whole wreck before a
 *                test that simulated the real producers said so.
 *
 * They meet at the same rung on purpose. A second route that arrived somewhere BETTER would
 * make the first one a trap, and a second route that arrived somewhere worse would make it
 * decoration.
 *
 * ---------------------------------------------------------------------------------------
 * INSPECTION REVEALS QUESTIONS, NEVER A PARTS LIST. `affordance.ts`'s law governs every string
 * in this file and its own guard sweeps them: no line may tell a survivor what to go and make.
 * What understanding buys is not answers — it is BETTER QUESTIONS. A survivor at
 * `physically-possible` wonders what the boat even needs; one at `conceptually-suspected`
 * knows to wonder about the hull FIRST. That ordering is the knowledge, and it is still a
 * question.
 *
 * ---------------------------------------------------------------------------------------
 * D-011. There is nothing here for an absence to reach. The boat has no rate, no timer, no
 * decay and no threat; it holds no state of its own at all, and this module's every function
 * is a pure reading of things that already existed. A property test asserts it anyway, because
 * "there is nothing to break" is how the offline-death law would eventually be broken.
 */
import { TUNE } from '../data/tune';
import { BOAT } from '../data/world';
import { ladderFor, rung, type LadderState } from './ladder';
import type { Affordance } from './affordance';
import type { GameState } from './types';

/**
 * THE STAGED CAPABILITY (Law 124). One stage exists, and that is the honest surface: a type
 * that already listed B1 and B2 would be a promise this drop cannot keep.
 */
export type BoatStage = 'B0';

export function boatStage(): BoatStage {
    return 'B0';
}

/** Is the survivor close enough to look at her properly? */
export function atBoat(state: GameState): boolean {
    return Math.hypot(state.player.x - BOAT.x, state.player.y - BOAT.y)
        <= TUNE.interactRadiusM + TUNE.boatTapRadiusM;
}

/** What you see from a few paces off, before touching anything. */
export function boatSight(): string {
    return 'A fishing boat, up on the sand well above the tideline. Someone dragged her here to die.';
}

// ---------------------------------------------------------------------------
// The two routes, and where they meet.
// ---------------------------------------------------------------------------

/**
 * THE HANDS ROUTE. Technique in the domain that already governs everything afloat.
 *
 * Read from the shipped knowledge model rather than a flag of its own — a survivor arrives
 * here by having done the work, and the work is already recorded.
 */
export function handsUnderstand(state: GameState): boolean {
    return state.knowledge.domains.navigationSeamanship.technique >= TUNE.boatSeamanshipTechnique;
}

/** THE MANUAL ROUTE, read straight off the shipped ladder. See this file's header. */
export function manualUnderstands(state: GameState): boolean {
    return rung(ladderFor(state, 'boat')) >= rung('conceptually-suspected');
}

/**
 * WHERE THE SURVIVOR STANDS WITH THE BOAT — the two routes composed, never summed.
 *
 * The HIGHER of the two, not the total. Two independent routes to the same understanding must
 * not stack into a third, better one: a survivor who both read the manual and did the work
 * knows what the boat needs, which is exactly what either one alone gets them. Stacking would
 * quietly make "do both" the optimal play and turn two paths back into one long one.
 */
export function boatUnderstanding(state: GameState): LadderState {
    const byManual = ladderFor(state, 'boat');
    const byHands: LadderState = handsUnderstand(state) ? 'conceptually-suspected' : 'physically-possible';
    return rung(byManual) >= rung(byHands) ? byManual : byHands;
}

// ---------------------------------------------------------------------------
// What handling her tells you.
// ---------------------------------------------------------------------------

/**
 * THE UNINFORMED READING. Four observations and four open questions — the things a person can
 * see by walking round a hull, and the things seeing them makes you wonder.
 *
 * NOT A PARTS LIST. "There is a hole" is an observation; "you need fibreglass" is a
 * catalogue entry, and the invention pivot exists to keep the second out of the first.
 */
const UNINFORMED: Affordance = {
    properties: [
        'A hole low in the hull, about the size of a fist, with the timber splintered inward',
        'The transom is cut square where something heavy was unbolted',
        'Dry rot along one gunwale, soft under a thumbnail',
        'The seams have opened where the caulking has gone',
    ],
    questions: [
        'What would hold against water at that depth?',
        'What was bolted to the back of her, and where did it go?',
        'Is the soft timber worth saving or worth cutting out?',
        'What did the old seams use, and is any of it still here?',
    ],
};

/**
 * THE INFORMED READING — what either route buys, and it is still questions.
 *
 * The difference is ORDER and SPECIFICITY, not answers. The manual's own line is "hull first,
 * always"; a survivor who has worked hulls arrives at the same instinct. So the informed
 * reading knows what to ask FIRST, and knows that the questions are sequenced rather than a
 * shopping list — which is genuinely more useful than a list and gives nothing away.
 */
const INFORMED: Affordance = {
    properties: [
        'The hull comes first — nothing else matters until she holds water out',
        'A hole that size wants backing from the inside, not just filling from the outside',
        'The open seams will take more sealing than the hole will',
        'The rot has to come out before anything is fastened through it',
        'The transom cut is clean: whatever sat there was meant to be removable',
    ],
    questions: [
        'What on this island is stiff enough to back a patch and thin enough to bend?',
        'What goes soft with heat and hard when it cools?',
        'How would you drive her once she floats — and is that a different problem entirely?',
        'How much of her can be soft before she is not worth the work?',
    ],
};

/**
 * What handling her tells you, at the understanding the survivor has actually reached.
 *
 * ONE FUNCTION, TWO READINGS, and the caller does not choose which — the state does. A body
 * that could ask for the informed reading directly would let the UI hand over knowledge the
 * survivor has not earned, which is the pivot's whole failure mode wearing a helper's clothes.
 */
export function boatAffordance(state: GameState): Affordance {
    return rung(boatUnderstanding(state)) >= rung('conceptually-suspected') ? INFORMED : UNINFORMED;
}

/**
 * ONE LINE NAMING WHERE THE UNDERSTANDING CAME FROM, or null when there is none yet.
 *
 * Worth saying out loud, because Law 125's two routes are invisible if the game never
 * acknowledges which one a survivor took. It names the ROUTE, never the contents.
 */
export function boatUnderstandingNote(state: GameState): string | null {
    const byManual = manualUnderstands(state);
    const byHands = handsUnderstand(state);
    if (byManual && byHands) return 'You have read it and you have done it. She makes sense to you.';
    if (byManual) return 'The dry-bag book told you where to start.';
    if (byHands) return 'You have handled enough boats to see where to start.';
    return null;
}

/**
 * WHAT THIS DROP DELIBERATELY DOES NOT OFFER, as a function rather than a comment.
 *
 * The body calls this to explain why looking is all there is, so a survivor who expects a
 * repair verb is told plainly rather than left tapping. [[D-042]]'s fail-loud law: silence is
 * never a legal outcome, and "not yet" is an answer where nothing at all is not.
 */
export function boatWorkBlocker(): string {
    return 'You are not fixing her today. Not with what you have, and not with what you know.';
}
