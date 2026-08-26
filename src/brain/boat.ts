/**
 * THE FISHING BOAT — B0 TO B2 (Laws 124–125).
 *
 * WHAT THIS MODULE IS. A staged capability, in the exact sense Law 124 requires: the boat
 * *"becomes useful in several honest states before full restoration"*, and *"is never one
 * repair recipe"*. Three stages live here and a survivor can reach all three.
 *
 *   B0  SECURED WRECK      She is beached, holed and engineless, but she is a place to work:
 *                          looked at, surveyed, and read for what she would need.
 *   B1  STABILIZED SHELL   Propped and cribbed so she stops moving under the work, and bailed
 *                          out so a person can see what they are doing inside her.
 *   B2  FLOATING HULL      Backed, sealed, and proved on a tether. She swims in flat
 *                          water, she can be boarded, she carries a load you learn by
 *                          loading, and she MOVES — out to the end of the line and back
 *                          under a paddle, which is what stops B2 being a diorama.
 *
 * WHAT B2 IS NOT, said here so the ceiling is legible from the first line as much as from the
 * first screen: not the open sea, not cargo, not surf, and no engine in her. Propulsion is a
 * paddle. B3 and the motor are a later slice, and nothing in this file reaches toward them.
 *
 * ---------------------------------------------------------------------------------------
 * FIVE SYSTEMS, NOT ONE METER — which is the shape Law 124 forbids collapsing.
 *
 *   HULL INTEGRITY   frames and a backing patch          `structural`   timber + a bracket
 *   WATERTIGHTNESS   fibre driven into the garboard      `seal`         fibre
 *   FLOTATION        a tethered test, which PROVES       `floatTest`    an afternoon
 *   LOAD             what she carries, learned by doing  `loadKnown`    a boarding
 *   MOORING          a painter, so she stays put         `moored`       cordage
 *
 * PROPULSION is deliberately NOT a sixth row. It is a capability of B2 rather than a
 * system to be repaired: `ferried` stores that it happened, not how well, and moving her
 * neither advances a stage nor consumes a material. What it costs is arms.
 *
 * They are five fields with five verbs and five costs. Fixing one provably does not fix
 * another — asserted directly, because a single `repaired: number` is the easy shape to fall
 * into and impossible to take apart once anything depends on it.
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
 * decoration. And understanding by EITHER route moves nothing on its own: it opens the survey,
 * and the survey opens work. Knowing where the props go is not the same as having the wood.
 *
 * ---------------------------------------------------------------------------------------
 * THE RIGGING ROUTE IS REUSED, NOT REBUILT (Law 125: strength opens a manual route; mechanics
 * open safer ones). The Weighted Shore's teardown ladder already proved this pattern, so
 * `rungForCompetence` is imported rather than copied — one ladder, so two callers cannot drift
 * apart. What is NOT shared is the DOMAIN: `competenceFor` reads `mechanicalSystems`, which is
 * right for stripping an outboard and wrong for sistering frames and driving oakum.
 * `hullCompetence` asks `navigationSeamanship` instead, with the same weights and the same
 * workspace term.
 *
 * And no amount of strength props a hull. `boatSupportWoodCost` is timber a survivor must go
 * and meet; technique cannot substitute for it, and the refusal says so by name (Law 95).
 *
 * ---------------------------------------------------------------------------------------
 * DEGRADE, NEVER DESTROY. Every rung produces a REAL repair — they differ in how much they
 * leak, from an expert patch that does not weep to a novice one held together by hope. And a
 * failed float test costs the afternoon and nothing else: she is on a line, she comes back up
 * the sand with every repair still in her, and the post-trial inspection reads both systems
 * separately so the next attempt has a target rather than a mood.
 *
 * A repair is therefore not a boolean and not a percentage. It records the rung it was done at
 * and what went into it — the craft preserves maker history and defects — and that record is
 * what the inspection reads and what her behaviour in the water depends on.
 *
 * ---------------------------------------------------------------------------------------
 * EVIDENCE BEFORE COMMITTING (fair-challenge). `floatTestForecast` and the test itself read
 * the same two weaknesses through the same arithmetic, so the preview cannot lie about the
 * outcome. Asserted across all twenty-five combinations of repair quality, because "they agree
 * on the cases I thought of" is not the claim being made.
 *
 * ---------------------------------------------------------------------------------------
 * INSPECTION REVEALS QUESTIONS, NEVER A PARTS LIST — and this file speaks in TWO registers
 * that say opposite things about naming materials, on purpose.
 *
 * THE LOOK is governed by `affordance.ts`’s law, and `boatAffordance`’s own guard sweeps
 * every line of it: no reading may tell a survivor what to go and make, and a narrower net
 * catches this object’s particular temptation (hull, sealant, engine, fuel) being spelt as
 * a thing to fetch. What understanding buys is not answers — it is BETTER QUESTIONS. A
 * survivor at `physically-possible` wonders what the boat even needs; one at
 * `conceptually-suspected` knows to wonder about the hull FIRST. That ordering is the
 * knowledge, and it is still a question.
 *
 * THE WORK is governed by Law 95 instead, which requires the OPPOSITE: a refusal must name
 * its enabler, so `shoreUpBlocker` says how much timber and `moorBlocker` says how much
 * fibre. That is not a leak in the affordance law — it is the difference between looking
 * at a boat and having your hands on one. A SURVEY sits between the two and earns its
 * findings by being work done ON the object rather than a glance at it.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, AND IT IS STRUCTURAL RATHER THAN GUARDED. She holds state now, so the law is no
 * longer free — but there is still nothing here for an absence to reach. No function in this
 * module takes an elapsed time, `reconcile` has no boat term at all, and there is no rate,
 * timer, decay or threat anywhere in the file. A hull shored and half-sealed is exactly as
 * shored and half-sealed four days later; she does not flood back in, silt up, rot or settle.
 * A PROPERTY TEST asserts it anyway, because "there is nothing to break" is how the
 * offline-death law would eventually be broken: every combination of the five systems, at
 * every rung, across absences from a minute to a year. That sentence was inherited from the
 * B0 header and was false for a while — the coverage was four hand-written states — and the
 * property it names now exists rather than being described.
 */

import { TUNE, realSecondsPerGameHour } from '../data/tune';
import { hasVessel } from './vessel';
import { BOAT, DESTINATIONS } from '../data/world';
import { ladderFor, rung, type LadderState } from './ladder';
import type { Affordance } from './affordance';
import { recordTrying } from './knowledge';
import { rungForCompetence } from './heavyObjects';
import type { BoatRepair, BoatState, Destination, GameState, OutboardPart, TeardownRung } from './types';

/**
 * THE STAGED CAPABILITY (Law 124). All three stages are reachable, each useful on its own:
 * a secured work site, a stabilized shell, and a hull that swims. See `boatStage` for why
 * the stage itself is derived from the work done rather than stored anywhere.
 */
export type BoatStage = 'B0' | 'B1' | 'B2';

/** A boat nobody has touched. See `BoatState` for why the stage itself is not stored. */
export function freshBoat(): BoatState {
    return {
        surveyed: false,
        supports: false,
        dewatered: false,
        structural: null,
        seal: null,
        floatTest: null,
        loadKnown: false,
        moored: false,
        ferried: false,
        //  Her beach. She has not been anywhere.
        at: 'shore',
    };
}

/**
 * WHERE SHE IS ON THE LADDER — DERIVED from the work actually done, never stored.
 *
 * A stored stage is a number that can disagree with the hull, and the moment those two
 * disagree the player is being lied to about their own boat. Computing it means B2 is
 * unreachable without the things B2 MEANS, and no migration can hand back a stage nobody
 * earned. It also means the stage falls if something is ever undone, which is the honest
 * behaviour for a craft rather than a ratchet.
 */
export function boatStage(state: GameState): BoatStage {
    const b = state.boat;
    //  B2 — SHE FLOATS, and floating is proved rather than assumed. Both repairs AND a float
    //  test she actually passed; a test that let water in is evidence, not a promotion.
    if (b.structural && b.seal && b.floatTest?.held === true) return 'B2';
    //  B1 — STABILIZED: she is held still and she is dry inside, so a person can work in her
    //  and see what they are doing. Surveyed first, because the survey is what tells you where
    //  to put the props.
    if (b.surveyed && b.supports && b.dewatered) return 'B1';
    return 'B0';
}

/**
 * WHAT EACH STAGE IS HONESTLY FOR — the source’s own table, in the game’s own words.
 *
 * HONESTLY IS THE OPERATIVE WORD, and B0 is a line short of the source because of it. The
 * brief describes B0 as *"dry work site, salvage storage"*. The work site is real — she is
 * a target with verbs on her from the first look. STORAGE IS NOT: there is one container
 * in this game (`state.storage`, the crate) and making a hull a second one is a container
 * model and a loadout surface, not a sentence. So B0 does not say it. A stage note that
 * promised stacking salvage in her would be the same defect as a tuned constant nothing
 * reads — a capability that exists only in prose.
 */
export function stageNote(stage: BoatStage): string {
    switch (stage) {
        case 'B0': return 'Secured. A hull on dry sand and a place to work at — she will not float yet.';
        case 'B1': return 'Stabilized. Held still and bailed out; you can get inside her and see what she needs.';
        case 'B2': return 'Floating. She swims on a line, in flat water, with one person and a paddle. Not the open sea.';
    }
}

/** Where the boat actually is right now. Derived from `boat.at`, never stored as a position. */
export function boatPosition(state: GameState): { x: number; y: number } {
    const at = state.boat.at;
    if (at === 'shore') return { x: BOAT.x, y: BOAT.y };
    const dest = DESTINATIONS[at];
    //  A destination that has been removed from the table leaves her at her beach rather than
    //  at a coordinate nobody can name. Content can be withdrawn; a boat cannot be nowhere.
    if (!dest) return { x: BOAT.x, y: BOAT.y };
    return standOffPoint(dest);
}

/**
 * THE POINT SHE STOPS AT — `standOffM` short of the destination, on the line in from her
 * beach. Derived so that moving the beach or the destination moves this with them.
 */
export function standOffPoint(dest: Destination): { x: number; y: number } {
    const dx = dest.x - BOAT.x;
    const dy = dest.y - BOAT.y;
    const total = Math.hypot(dx, dy);
    if (total <= dest.standOffM) return { x: BOAT.x, y: BOAT.y };
    const t = (total - dest.standOffM) / total;
    return { x: BOAT.x + dx * t, y: BOAT.y + dy * t };
}

/**
 * Is the survivor close enough to look at her properly?
 *
 * MEASURED TO WHERE SHE IS, not to where she was first seen. This asked the `BOAT` constant
 * until Session 3, which was correct for four sessions and became a hard refusal the moment
 * she could be somewhere else: a survivor standing ON her at the wreck read as 102 m away, and
 * `doInspectBoat` declined "Look her over" — the one verb `boatVerbs` ships with
 * `available: true, reason: null` under the words "ALWAYS. Looking at a boat is never refused."
 *
 * Every readout behind this gate went with it — her stage, the survey, the trial findings, the
 * load note, the capability note — so the survivor who had just crossed to the wreck could
 * learn nothing at all about the boat they were holding on to.
 */
export function atBoat(state: GameState): boolean {
    const at = boatPosition(state);
    return Math.hypot(state.player.x - at.x, state.player.y - at.y)
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
    //  "handled enough boatS" was the same slip in the affirmative: it credited the survivor
    //  with a fleet they never had. What they actually did is the maritime work this island
    //  contains, so that is what it says.
    if (byHands) return 'You have spent enough time on the water to see where to start.';
    return null;
}

//  `boatWorkBlocker()` STOOD HERE and is retired. It said "You are not fixing her today",
//  which was the honest closing beat while B0 was the whole drop and D-042 still had to be
//  satisfied about a deliberate absence. There is work here now, so the absence it spoke for
//  no longer exists — what replaced it is `boatCapabilityNote`, which says at every stage what
//  she IS and what she still is not. Deleted rather than left standing, because a function no
//  src/** code calls is a sentence the game can no longer say, and two device checks were
//  still requiring it to reach the screen.

// ---------------------------------------------------------------------------
// SESSION 2 — B0 to B2. Five separate systems, in the order a person meets them.
// ---------------------------------------------------------------------------

/**
 * THE HULL SURVEY (B0→B1 entry) — the Weighted Shore's "study before the attempt", on a hull.
 *
 * It is not a repair and it spends nothing. What it does is turn `boatAffordance`'s open
 * QUESTIONS into named faults, so the survivor commits to a repair knowing what it is for.
 * That is the fair-challenge rule this project already keeps for teardown: the consequence of
 * an attempt must be readable BEFORE committing to it.
 *
 * IT NEEDS UNDERSTANDING, either route (Law 125). Hands or the manual — the higher of the two,
 * never the sum, exactly as `boatUnderstanding` already composes them.
 */
export function canSurveyHull(state: GameState): boolean {
    return surveyBlocker(state) === null;
}

export function surveyBlocker(state: GameState): string | null {
    if (state.boat.surveyed) return 'You have already been over her, plank by plank.';
    if (rung(boatUnderstanding(state)) < rung('conceptually-suspected')) {
        //  IT NAMES THE GAP AND THE TWO REAL ROUTES TO CLOSING IT, and it used to name
        //  neither. The old sentence ended "Work more boats, or find someone who wrote it
        //  down", which offered a survivor two things this world does not contain: a second
        //  boat, and another person. Advice that cannot be taken is worse than no advice —
        //  it reads as a bug, and a player who tries to follow it is hunting for content that
        //  was never authored. Law 95 asks a refusal to name its enabler; an enabler that
        //  does not exist is the law defeated by its own sentence.
        //
        //  WHAT IS ACTUALLY TRUE is an experience gap and nothing else: `handsUnderstand`
        //  wants `navigationSeamanship` technique at `boatSeamanshipTechnique` (14) and a
        //  fresh castaway starts at `knowledgeInnateFloor` (5). No tool is missing and no
        //  person is missing. So the sentence says so, and then names the routes THIS island
        //  really has — the three acts `tune.ts` counted when it set that 14 (the raft, the
        //  crossing, the wreck), and the dry-bag book, which is the manual route Law 125
        //  requires to exist beside the hands one.
        //  EVERY CLAUSE IS A PRODUCER THAT ACTUALLY FIRES, checked against the call sites
        //  rather than against the story. The first draft of this sentence said "the raft, the
        //  crossing and the wreck" — and `runCrossing`, the boat crossing Session 3 had just
        //  built, records no learning event at all. Naming it would have been this same bug
        //  again, one revision later: advice that cannot be taken, in the very sentence
        //  written to stop giving it. The raft is `craftRaft`/`boardRaft`, getting out to the
        //  wreck is `markWreckIfReached`, and working it is the wreck and dive parts.
        return 'You can see she is holed, but not what holds her together.'
            + ' You do not know hull work well enough yet — it comes from the raft, from'
            + ' getting out to the wreck and working it, or from the book in the dry-bag.';
    }
    return null;
}

export function surveyHull(state: GameState): boolean {
    if (!canSurveyHull(state)) return false;
    state.boat = { ...state.boat, surveyed: true };
    //  Going over a hull plank by plank is study, and study is how this domain moves.
    recordTrying(state, 'navigationSeamanship');
    return true;
}

/** What the survey found — the two systems, named separately because they ARE separate. */
export function surveyFindings(state: GameState): string[] {
    if (!state.boat.surveyed) return [];
    return [
        'THE HULL: a fist-sized breach low on the port side, and two frames sprung either side of it. Structure, not skin.',
        'THE SEAMS: the caulking is gone from the garboard the whole length of her. She would weep even with the hole patched.',
        'Those are two different jobs. Fixing one does not fix the other.',
    ];
}

/**
 * SHORING HER UP (B1) — Law 125's non-superhuman rigging route, on a hull.
 *
 * Strength does not hold a boat still; cribbing does. This is the "stable footing, workholding"
 * clause made concrete: no amount of technique substitutes for timber under the bilge, and a
 * survivor with no wood cannot muscle it.
 */
export function shoreUpBlocker(state: GameState): string | null {
    if (state.boat.supports) return 'She is already propped and cribbed. She will not move.';
    if (!state.boat.surveyed) return 'Go over her first — you would be guessing where to put the props.';
    if (state.inventory.wood < TUNE.boatSupportWoodCost) {
        return `You would need ${TUNE.boatSupportWoodCost - state.inventory.wood} more wood to crib her properly.`;
    }
    return null;
}

export function canShoreUp(state: GameState): boolean {
    return shoreUpBlocker(state) === null;
}

export function shoreUpBoat(state: GameState): boolean {
    if (!canShoreUp(state)) return false;
    state.inventory.wood -= TUNE.boatSupportWoodCost;
    state.boat = { ...state.boat, supports: true };
    return true;
}

/**
 * BAILING HER OUT (B1). Needs the props in first — you do not work in a hull that can roll on
 * you, and that ordering is the safety claim rather than a difficulty knob.
 */
export function dewaterBlocker(state: GameState): string | null {
    if (state.boat.dewatered) return 'She is dry inside, or as dry as she gets.';
    if (!state.boat.supports) return 'Not until she is propped. A hull that rolls with you inside it is how people are killed.';
    if (!hasVessel(state) && !state.tools.flask) {
        return 'You would need something to bail with — a cup, a pan, anything that holds water.';
    }
    return null;
}

export function canDewater(state: GameState): boolean {
    return dewaterBlocker(state) === null;
}

export function dewaterBoat(state: GameState): boolean {
    if (!canDewater(state)) return false;
    state.boat = { ...state.boat, dewatered: true };
    return true;
}

// ---------------------------------------------------------------------------
// The two repairs. Separate systems, separate costs, separate evidence (Law 124).
// ---------------------------------------------------------------------------

/**
 * WHAT A REPAIR IS WORTH — the teardown ladder's own competence, read onto a hull.
 *
 * REUSED RATHER THAN REBUILT, which the brief asks for by name. The Weighted Shore already
 * decided how well-done a piece of heavy work is: technique, understanding, and whether there
 * was a proper surface to work on. A hull repair asks the same question, so it asks it with
 * the same function and gets the same vocabulary back — `novice` through `expert`.
 *
 * SHE IS THE WORKHOLDING. Once she is propped, the boat itself is the stable surface Law 219
 * wants, so `supports` is what plays the workspace's part here rather than a bench dragged
 * onto a beach.
 */
export function repairRung(state: GameState): TeardownRung {
    return rungForCompetence(hullCompetence(state));
}

/**
 * WORKING A BOAT TEACHES YOU BOATS — and without this the redo loop had no route through it.
 *
 * `hullCompetence` reads `navigationSeamanship`, and until this existed NO boat verb trained
 * that domain: the raft, the crossing and the wreck did. So the post-trial inspection could
 * tell a survivor to go and get better at hulls, and the only way to do it was to leave the
 * hull. A repair loop whose improvement step happens somewhere else is not a loop.
 *
 * SO THE WORK ITSELF TEACHES: surveying her, backing her frames, paying her seams, putting
 * her in the water and taking her out under the paddle each record a learning event in the
 * boat’s own domain. Through `recordTrying`, the same door the raft recipe and the crossing
 * already use, so there is one learning path rather than a second one that could drift.
 *
 * ALWAYS AFTER THE RUNG IS READ, never before: what you learn doing a job cannot improve
 * the job you are doing. And never on a REFUSAL — a verb that was declined teaches nothing,
 * which is why every call sits past the blocker rather than at the top of the function.
 */
/**
 * ...AND THE COMPETENCE IT READS IS THE BOAT'S OWN DOMAIN, not the outboard's.
 *
 * THE LADDER IS REUSED; THE DOMAIN IS NOT, and that distinction is the whole of getting this
 * right. `competenceFor` reads `mechanicalSystems`, which is correct for stripping a small
 * engine and plainly wrong for sistering frames and driving oakum — a survivor who has never
 * touched an engine can be a fine boatwright. So this asks `navigationSeamanship`, the same
 * domain `handsUnderstand` already uses for the hands route, with the SAME weights and the
 * SAME workspace term, and hands the result to the shared `rungForCompetence`.
 *
 * SHE IS THE WORKHOLDING. Once propped, the boat herself is the stable surface Law 219 wants,
 * so `supports` plays the workspace’s part rather than a bench dragged onto a beach.
 *
 * AND THE TERM IS ALWAYS PRESENT WHEN IT COUNTS, which is worth saying plainly rather than
 * implying otherwise: repairing requires bailing, bailing requires propping, so `supports` is
 * true at every reachable repair. The bonus is therefore a FLOOR, not a choice — what it buys
 * is the bottom of the ladder. Without it the survivor who has only just crossed the survey
 * gate would sit at 12.6 and make `novice` work; with it she sits at 20.6 and makes `basic`.
 * An earlier version of this comment claimed propping made repairs "measurably better", which
 * would have needed an unpropped repair to measure against, and there is no such thing.
 */
export function hullCompetence(state: GameState): number {
    const domain = state.knowledge.domains.navigationSeamanship;
    const base = domain.technique * TUNE.teardownTechniqueWeight
        + domain.understanding * TUNE.teardownUnderstandingWeight;
    const propped = state.boat.supports ? TUNE.teardownWorkspaceBonus : 0;
    //  The manual counts as a tool here in the way salvage tools count there: someone wrote
    //  down how this is done, and reading it is worth something at the hull.
    const manual = manualUnderstands(state) ? TUNE.teardownToolBonus : 0;
    return Math.min(100, base + propped + manual);
}

/**
 * IS THIS SURVIVOR NOW BETTER AT IT THAN WHOEVER DID IT LAST? — the redo gate.
 *
 * WHY A REPAIR CAN BE REDONE AT ALL. The post-trial inspection reads both systems and names
 * the weaker one *"so the next trip has a target"*. That sentence was a lie while the repair
 * verbs refused outright once a repair existed: a hull backed at `basic` was backed at
 * `basic` for ever, and naming the fault only told a survivor which dead end they were in.
 *
 * WHY IT IS GATED ON DOING BETTER, rather than simply being repeatable. Redoing work you
 * cannot improve is not a decision, it is a materials sink with a progress bar. So the verb
 * comes back only when your hands have — and the refusal says exactly that, which makes it
 * a Law 95 refusal naming its enabler: the enabler is you.
 */
const RUNG_ORDER: readonly TeardownRung[] = ['novice', 'basic', 'competent', 'skilled', 'expert'];

export function rungIsBetter(a: TeardownRung, b: TeardownRung): boolean {
    return RUNG_ORDER.indexOf(a) > RUNG_ORDER.indexOf(b);
}

/** Could this survivor improve on the work already in her, for this system? */
export function couldImprove(state: GameState, done: BoatRepair | null): boolean {
    return done !== null && rungIsBetter(repairRung(state), done.rung);
}

/**
 * HOW MUCH A REPAIR AT THIS RUNG STILL LEAKS — 0 is perfect, 1 is no better than the hole.
 *
 * HONEST DEGRADE, NOT PASS/FAIL, and this is the Weighted Shore's degrade-not-destroy language
 * spoken about water. A novice patch holds; it just weeps. That is a real repair with a real
 * defect, which the hull then remembers and the float test then measures — rather than a
 * failed attempt that wasted the timber and taught nothing.
 */
export function weaknessOf(repair: BoatRepair | null): number {
    if (!repair) return 1;
    switch (repair.rung) {
        case 'expert': return 0;
        case 'skilled': return 0.15;
        case 'competent': return 0.35;
        case 'basic': return 0.6;
        case 'novice': return 0.85;
    }
}

/** Which salvaged parts are in hand, from the outboard the survivor has torn down. */
/**
 * WHAT THE SURVIVOR IS ACTUALLY CARRYING — and there are TWO ledgers, which is how this
 * went wrong the first time.
 *
 * `outboard.teardown.parts` is a RECORD OF AN ATTEMPT: what that teardown yielded, kept so
 * the outboard can describe its own history. `carriedParts` is the survivor’s HANDS, and
 * it is what `canReassemble` reads. `applyTeardown` writes both.
 *
 * This read the record instead of the hands, and consumed the bracket out of the record
 * only — so backing the frames left `carriedParts` untouched and `canReassemble` still
 * true. The bracket was simultaneously fastened through her frames and available to
 * rebuild the motor: one piece of steel, two places, and a free outboard for anyone who
 * repaired the boat first. Measured, not reasoned — `canReassemble` read `true` on both
 * sides of the repair.
 */
export function partsInHand(state: GameState): OutboardPart[] {
    return state.carriedParts;
}

/**
 * THE STRUCTURAL REPAIR — frames and a backing plate. HULL INTEGRITY, not watertightness.
 *
 * WANTS A SALVAGED BRACKET, which is the whole reason this session follows the Weighted Shore.
 * A mounting bracket is a piece of shaped structural steel, and it is exactly what you would
 * reach for to back a sprung frame. Sealing is a different job with different stuff.
 */
export function structuralBlocker(state: GameState): string | null {
    const done = state.boat.structural;
    //  ALREADY DONE, AND YOU COULD DO NO BETTER — which names the enabler (Law 95) rather
    //  than the outcome. The way past this refusal is more boats, not more timber.
    if (done && !couldImprove(state, done)) {
        return `The frames are already sistered and backed — ${done.rung} work, and you could do no better at them today.`;
    }
    if (!state.boat.dewatered) return 'Not with water in her. Prop her and bail her out first.';
    //  THE BRACKET IS WANTED ONCE. It is already fastened through her; doing the job again
    //  is more timber and better hands, not a second piece of steel that never existed.
    if (!done && !partsInHand(state).includes('mountingBracket')) {
        return 'You would need something flat and strong to back the frames — the outboard\u2019s mounting bracket would do it.';
    }
    if (state.inventory.wood < TUNE.boatStructuralWoodCost) {
        return `You would need ${TUNE.boatStructuralWoodCost - state.inventory.wood} more wood to sister the frames.`;
    }
    return null;
}

export function canRepairStructure2(state: GameState): boolean {
    return structuralBlocker(state) === null;
}

export function repairHullStructure(state: GameState): BoatRepair | null {
    if (!canRepairStructure2(state)) return null;
    const was = state.boat.structural;
    const rungHere = repairRung(state);
    state.inventory.wood -= TUNE.boatStructuralWoodCost;
    //  THE PART IS CONSUMED INTO THE HULL, and stays named in the record — that is the
    //  "preserves maker history" clause: the boat can say what she is made of. On a REDO
    //  the bracket is already in her, so it is carried forward rather than demanded twice.
    if (!was) {
        //  OUT OF THE HANDS, which is the ledger that decides whether a motor can be built.
        //  `outboard.teardown.parts` is deliberately NOT touched: it records what that
        //  teardown yielded, and that remains true after the bracket is spent.
        state.carriedParts = state.carriedParts.filter((p) => p !== 'mountingBracket');
    }
    //  MATERIALS ACCUMULATE ACROSS ATTEMPTS. Ten timber in her frames says she was worked
    //  twice, which is exactly the history a craft is supposed to keep.
    const repair: BoatRepair = {
        rung: rungHere,
        usedParts: ['mountingBracket'],
        usedMaterials: { wood: (was?.usedMaterials.wood ?? 0) + TUNE.boatStructuralWoodCost },
    };
    state.boat = { ...state.boat, structural: repair };
    recordTrying(state, 'navigationSeamanship');
    return repair;
}

/**
 * THE SEAL — caulking driven into the garboard seam. WATERTIGHTNESS, and a different system.
 *
 * Fibre is oakum: teased-out cordage hammered into a seam is genuinely how a plank boat is
 * made tight, and it is a material this island already produces. No bracket, no timber — a
 * different job wanting different stuff, which is the point of the split.
 */
export function sealBlocker(state: GameState): string | null {
    const done = state.boat.seal;
    if (done && !couldImprove(state, done)) {
        return `Her seams are payed and hard — ${done.rung} work, and your hands would not better it today.`;
    }
    if (!state.boat.dewatered) return 'You cannot caulk a seam under water. Prop her and bail her out first.';
    if (state.inventory.fiber < TUNE.boatSealFiberCost) {
        return `You would need ${TUNE.boatSealFiberCost - state.inventory.fiber} more fibre to tease into the seams.`;
    }
    return null;
}

export function canSealHull(state: GameState): boolean {
    return sealBlocker(state) === null;
}

export function sealHull(state: GameState): BoatRepair | null {
    if (!canSealHull(state)) return null;
    const was = state.boat.seal;
    const rungHere = repairRung(state);
    state.inventory.fiber -= TUNE.boatSealFiberCost;
    const repair: BoatRepair = {
        rung: rungHere,
        usedParts: [],
        usedMaterials: { fiber: (was?.usedMaterials.fiber ?? 0) + TUNE.boatSealFiberCost },
    };
    state.boat = { ...state.boat, seal: repair };
    recordTrying(state, 'navigationSeamanship');
    return repair;
}

// ---------------------------------------------------------------------------
// The tethered float test — the B1→B2 gate, and the celebration the source asks for.
// ---------------------------------------------------------------------------

/**
 * HOW MUCH SHE WOULD TAKE ON — the forecast, and the fair-challenge half of this session.
 *
 * READABLE BEFORE COMMITTING, and computed from the SAME two weaknesses the test itself reads.
 * The teardown's own note says it plainly: the preview and the real attempt must never
 * disagree on the same inputs. So this is not an estimate of the test — it is the test's own
 * arithmetic, run early.
 *
 * TETHERED, which is why a failure is survivable. She is on a line the whole time; the worst
 * outcome is hauling a swamped hull back up the sand, wet and wiser, with every repair still
 * in her. Nothing is destroyed, nothing is lost, and the survivor learns exactly which of the
 * two systems let her down.
 */
export interface FloatForecast {
    /** 0..1, how much water she would ship. Above `boatSwampAt` she fails. */
    wouldTake: number;
    wouldHold: boolean;
    /** The one system most responsible, so the next trip has a target. */
    weakest: 'hull' | 'seams' | null;
    blocker: string | null;
}

export function floatTestForecast(state: GameState): FloatForecast {
    const b = state.boat;
    const hullWeak = weaknessOf(b.structural);
    const seamWeak = weaknessOf(b.seal);
    const wouldTake = (hullWeak + seamWeak) * TUNE.boatLeakPerWeakness;
    const blocker = floatTestBlocker(state);
    return {
        wouldTake,
        wouldHold: wouldTake <= TUNE.boatSwampAt,
        weakest: hullWeak === seamWeak ? null : (hullWeak > seamWeak ? 'hull' : 'seams'),
        blocker,
    };
}

export function floatTestBlocker(state: GameState): string | null {
    const b = state.boat;
    if (!b.structural && !b.seal) return 'She has a hole in her and open seams. She would go straight down.';
    if (!b.structural) return 'The frames are still sprung. Back them before you put her in the water.';
    if (!b.seal) return 'The seams are still open. She would fill through the garboard whatever else you did.';
    return null;
}

export function canFloatTest(state: GameState): boolean {
    return floatTestBlocker(state) === null;
}

/** One sentence saying what the test would do, in the amounts it would do it — before you commit. */
export function floatForecastNote(state: GameState): string {
    const f = floatTestForecast(state);
    if (f.blocker) return f.blocker;
    if (f.wouldHold) {
        return f.wouldTake <= 0.05
            ? 'She looks tight. On a line, in flat water, she should swim dry.'
            : 'She will weep a little, but she should swim. Keep the line on her.';
    }
    const where = f.weakest === 'hull' ? 'the frames are the weaker of the two'
        : f.weakest === 'seams' ? 'the seams are the weaker of the two'
            : 'both are as bad as each other';
    return `She would fill faster than you could bail — ${where}. Better work before better water.`;
}

/**
 * PUT HER IN THE WATER, ON A LINE. The gate, and the moment the source wants celebrated.
 *
 * A FAILED TEST IS EVIDENCE, NOT A LOSS. `held: false` is recorded with what she took on, the
 * repairs stay exactly as they were, and the stage simply does not advance. That is the
 * degrade-not-destroy rule applied to the gate itself: the only thing a bad test costs is the
 * afternoon, and the only thing it changes is that you now know.
 */
export function runFloatTest(state: GameState): FloatForecast | null {
    if (!canFloatTest(state)) return null;
    const f = floatTestForecast(state);
    state.boat = {
        ...state.boat,
        floatTest: { attempted: true, held: f.wouldHold, tookOnWater: f.wouldTake },
    };
    //  A trial teaches whether she swims or not — arguably most when she does not.
    recordTrying(state, 'navigationSeamanship');
    return f;
}

/**
 * POST-TRIAL INSPECTION — the evidence grammar again, on the far side of the attempt.
 *
 * NOT A PASS/FAIL LINE. It reads the record the test left and says which system behaved and
 * which did not, so the next repair has somewhere to go. A survivor who fails twice should
 * learn something different the second time.
 */
export function postTrialFindings(state: GameState): string[] {
    const t = state.boat.floatTest;
    if (!t?.attempted) return [];
    const out: string[] = [];
    out.push(t.held
        ? `She swam. She took on what you would call a bucket over the hour — ${describeWater(t.tookOnWater)}.`
        : `She did not swim. She was filling as fast as you could throw it out — ${describeWater(t.tookOnWater)}.`);
    const hull = weaknessOf(state.boat.structural);
    const seam = weaknessOf(state.boat.seal);
    out.push(hull <= 0.15
        ? 'The backed frames did not move. Whoever did that work knew what they were about.'
        : hull <= 0.35
            ? 'The frames held, but the patch worked in the seaway — you can see where it flexed.'
            : 'The frames are still the weak thing in her. That patch is holding by hope.');
    out.push(seam <= 0.15
        ? 'The seams stayed hard. Barely a drop through the garboard.'
        : seam <= 0.35
            ? 'The garboard wept along about a third of her length. It will want paying again.'
            : 'The seams took in most of it. That caulking is not driven home.');
    return out;
}

/**
 * HOW MUCH WATER, IN WORDS — banded onto the range a hull can actually ship.
 *
 * The bands were 0.05 / 0.2 / 0.5, and the top one was unreachable: the most any legal
 * repair pair ships is 0.408. Re-banded so every phrase names a state a survivor can be in,
 * and so the worst of them coincides with the gate refusing her — "up to the thwarts" is now
 * what a hull with `basic` work in her reads, which is the same hull the float test turns back.
 */
function describeWater(v: number): string {
    if (v <= 0.05) return 'next to nothing';
    if (v <= 0.15) return 'a few inches in the bilge';
    if (v <= 0.3) return 'over the floorboards';
    return 'up to the thwarts';
}

// ---------------------------------------------------------------------------
// B2 — what a floating hull is actually FOR. The source: "the player should celebrate B2."
// ---------------------------------------------------------------------------

/**
 * WHAT SHE CARRIES — loading evidence, and a system of its own.
 *
 * SEPARATE FROM FLOTATION, per the source's own list. That she floats empty says nothing about
 * what she takes with weight in her, and a survivor learns that by loading her and watching
 * her freeboard rather than by being told a number when the hull is finished.
 */
export function boatCapacityKg(state: GameState): number {
    //  Derived from what actually holds her together: a hull with a hopeful patch carries less
    //  than a backed one, and that is the load system reading the hull system rather than
    //  duplicating it.
    const soundness = 1 - (weaknessOf(state.boat.structural) + weaknessOf(state.boat.seal)) / 2;
    return Math.round(TUNE.boatBaseCapacityKg * Math.max(0.2, soundness));
}

export function learnLoad(state: GameState): boolean {
    if (boatStage(state) !== 'B2' || state.boat.loadKnown) return false;
    state.boat = { ...state.boat, loadKnown: true };
    return true;
}

export function loadNote(state: GameState): string {
    if (!state.boat.loadKnown) return 'You have not had weight in her yet. No telling what she takes.';
    return `Loaded and watched: about ${boatCapacityKg(state)} kg before her freeboard goes to nothing.`;
}

/** Is she afloat and boardable right now? B2 and nothing less. */
export function canBoardBoat(state: GameState): boolean {
    return boardBlocker(state) === null;
}

export function boardBlocker(state: GameState): string | null {
    const stage = boatStage(state);
    if (stage !== 'B2') {
        return stage === 'B0'
            ? 'She is a shell on the sand. There is nothing to get into yet.'
            : 'She is propped and dry, but she has not been in the water. Float her first.';
    }
    return null;
}

/**
 * MANUAL PROPULSION — A SHORT LINE-FERRY, and the reason B2 is a place rather than a state.
 *
 * WHAT THE SOURCE ASKED FOR: *"tethered flotation, protected-water platform, short
 * line-ferry"*. The first two are the float test and the boarding. This is the third, and
 * it is the one that makes the other two mean something — a hull you can sit in but never
 * move is a raft with better manners.
 *
 * NO MOTOR, DELIBERATELY (Law 125). The source is explicit that motor dependency comes
 * later, and Law 125’s whole point is that the manual route must exist and be REAL. So the
 * cost is arms: `boatPaddleSpeedFraction` of a walk means longer in the water for the same
 * distance, and the effort is paid over that time. A boat you can barely move is not
 * cheaper to move, which is why the fraction DIVIDES the time rather than the price.
 *
 * SHE STAYS ON THE LINE, and that is the honest ceiling rather than an invisible wall.
 * `boatFerryDistanceM` is 90 m round trip against a wreck that lies ~115 m out — short of
 * it on purpose. A survivor can SEE how far short, which is a better refusal than any sentence.
 *
 * WHAT THAT USED TO SAY, and no longer can: "the wreck is a B3 destination and this hull is not
 * going there yet." Session 3 gave this same B2 hull `cross-boat`, which spends the whole 90 m
 * in ONE direction and reaches the wreck's stand-off. The ferry is unchanged and still a round
 * trip on a shore line — but it is now the OTHER way to spend the budget rather than the only
 * one, and `ferryBlocker` gates on `boat.at` so the line is not offered while she is away from
 * the beach it is anchored to.
 *
 * AND SHE TAKES ON WATER DOING IT, through the same two weaknesses the float test reads.
 * The arithmetic is `floatTestForecast`’s, scaled by how much of a trial this is — so a
 * hopeful patch is felt every single time she is moved, not once at the gate and never
 * again. That is the maker history staying in the boat rather than in a record of it.
 */
export interface FerryEffort {
    /** Metres of water covered, out to the end of the line and back. */
    metres: number;
    /** Game hours under the paddle, at a fraction of walking pace. */
    hours: number;
    /** What the arms pay for it. */
    energyCost: number;
    /** 0..1, what she ships over the trip — the float test’s own arithmetic, pro rata. */
    tookOnWater: number;
    blocker: string | null;
}

/**
 * WHAT IT WOULD COST, READABLE BEFORE COMMITTING — the same fair-challenge contract the
 * float forecast keeps, and computed by the same function the attempt itself calls.
 */
export function ferryForecast(state: GameState): FerryEffort {
    const metres = TUNE.boatFerryDistanceM;
    //  SLOWER MEANS LONGER, NOT CHEAPER. Walking this distance would take `metres /
    //  walkSpeedMps` seconds; under a paddle it takes that divided by the speed fraction.
    const seconds = metres / (TUNE.walkSpeedMps * TUNE.boatPaddleSpeedFraction);
    const hours = seconds / realSecondsPerGameHour;
    //  Arms out of the water, carrying nothing — the same work the raft already prices, so
    //  `raftEnergyDrainPerGameHour` is reused rather than a second paddling price invented.
    //  WHAT IS SHARED IS THE PRICE AND THE DOMAIN, not the whole route: the raft charges
    //  over hours that actually elapse and develops paddling capacity as it goes, and this
    //  is one trip on a line that charges its arms in one go. Both now train
    //  `navigationSeamanship`, which is the part that matters for the boat.
    const energyCost = hours * TUNE.raftEnergyDrainPerGameHour;
    const leak = (weaknessOf(state.boat.structural) + weaknessOf(state.boat.seal))
        * TUNE.boatLeakPerWeakness * hours;
    return { metres, hours, energyCost, tookOnWater: leak, blocker: ferryBlocker(state) };
}

export function ferryBlocker(state: GameState): string | null {
    if (boatStage(state) !== 'B2') return 'She does not float yet. There is nothing to paddle.';
    //  THE LINE IS ANCHORED TO THE BEACH, so there is no line to ride while she is away from it.
    //
    //  This gate did not exist and nothing else consulted `at`, so "Take her out on the line"
    //  stayed offered and READY at the wreck. Pressing it charged a full 90 m of arms — the
    //  flat `boatFerryDistanceM`, since `ferryForecast` never asks where she is — and moved
    //  nothing at all. Two presses could put the survivor under the reserve `crossingBlocker`
    //  needs, in open water, with the verb that brings them home newly refused.
    //
    //  The render already knew: `entities.ts` refuses to draw the tether anywhere but the shore,
    //  on the grounds that it would be "a rope to a shore 100 m away". The brain was still
    //  charging the survivor to paddle a line the screen would not draw.
    if (state.boat.at !== 'shore') return 'Her line is back on the beach. Bring her home to ride it.';
    //  You do not take the paddle to a boat you have never sat in. Ordering, not difficulty.
    if (!state.boat.loadKnown) return 'Get into her first and feel what she does with weight in her.';
    if (state.energy <= TUNE.energyLowThreshold) return 'You have not the arms for it right now.';
    return null;
}

export function canFerry(state: GameState): boolean {
    return ferryBlocker(state) === null;
}

/** One sentence naming the cost and the ceiling, before the survivor commits to either. */
export function ferryNote(state: GameState): string {
    const f = ferryForecast(state);
    if (f.blocker) return f.blocker;
    return `Out to the end of the line and back — about ${f.metres} metres of water, and it will`
        + ' cost you the arms to do it. The line is the length of it; the wreck is further than that.';
}

/**
 * TAKE HER OUT ON THE LINE. Repeatable, because propulsion is a capability rather than a
 * rung — nothing here advances a stage, and nothing here can undo one either.
 */
export function runFerry(state: GameState): FerryEffort | null {
    if (!canFerry(state)) return null;
    const f = ferryForecast(state);
    state.energy = Math.max(0, state.energy - f.energyCost);
    state.boat = { ...state.boat, ferried: true };
    //  Handling her under a paddle is the most boat-like thing a survivor can do.
    recordTrying(state, 'navigationSeamanship');
    return f;
}

/** How she handled, read off the repairs that are actually in her. Evidence, not a score. */
export function ferryFindings(state: GameState): string[] {
    if (!state.boat.ferried) return [];
    const f = ferryForecast(state);
    const out = [`She answers to the paddle. What she shipped over the trip: ${describeWater(f.tookOnWater)}.`];
    const hull = weaknessOf(state.boat.structural);
    const seam = weaknessOf(state.boat.seal);
    if (hull > 0.35 || seam > 0.35) {
        out.push('She works and complains the whole way. You would not want to be further out than the line lets you.');
    } else if (hull > 0.15 || seam > 0.15) {
        out.push('She is stiff enough under way. Flat water and a line, and no more than that.');
    } else {
        out.push('She goes sweetly. Whoever built her knew the shape of this water.');
    }
    return out;
}

/** Tie her up, so she is where you left her. The last of B2's four capabilities. */
export function moorBlocker(state: GameState): string | null {
    if (boatStage(state) !== 'B2') return 'There is nothing afloat to make fast.';
    //  A PAINTER IS MADE FAST TO SOMETHING. `doMoorBoat` says so in as many words — a line round
    //  a rock at the top of her beach — and there is no rock at the stand-off, only 30 m of water
    //  under her. Mooring her to the open sea was offered, and printed the beach's own sentence.
    if (state.boat.at !== 'shore') return 'Nothing out here to make her fast to.';
    if (state.boat.moored) return 'She is already made fast.';
    if (state.inventory.fiber < TUNE.boatMooringFiberCost) {
        return `You would need ${TUNE.boatMooringFiberCost - state.inventory.fiber} more fibre for a painter.`;
    }
    return null;
}

export function canMoor(state: GameState): boolean {
    return moorBlocker(state) === null;
}

export function moorBoat(state: GameState): boolean {
    if (!canMoor(state)) return false;
    state.inventory.fiber -= TUNE.boatMooringFiberCost;
    state.boat = { ...state.boat, moored: true };
    return true;
}

/**
 * WHAT SHE IS AND IS NOT, at whatever stage she is at — the honest capability sentence.
 *
 * "A SUCCESSFUL START IS NOT A COMPLETED REPAIR", and this is where that is said out loud.
 * B2 is a real milestone AND it names what is still beyond her, so no single action can feel
 * like it finished the boat.
 */
export function boatCapabilityNote(state: GameState): string {
    const stage = boatStage(state);
    const can = stageNote(stage);
    switch (stage) {
        case 'B0': return `${can} Not flotation, not carrying anyone.`;
        case 'B1': return `${can} Do not trust her in the water yet.`;
        //  MOORING IS READ HERE, and that is the whole of what it buys — said plainly rather
        //  than dressed up. [[D-011]] is absolute, so there is nothing for a painter to protect
        //  her FROM: she cannot drift, rot or go anywhere while the game is closed. What being
        //  made fast means is that a survivor can look at her and know she is secured rather
        //  than riding on the trial line — a state you can see, not an advantage you can spend.
        //  It was a write-only field until this line existed, which is a costed verb that did
        //  nothing: the same defect as a tuned constant nothing reads, wearing three fibre.
        case 'B2': return state.boat.moored
            ? `${can} Made fast fore and aft — she is where you leave her. Not the open sea, not cargo, not surf, and no engine in her.`
            : `${can} Riding on the trial line only. Not the open sea, not cargo, not surf — and no engine in her.`;
    }
}
