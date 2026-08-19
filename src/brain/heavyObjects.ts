/**
 * HEAVY OBJECTS — Wave 1, the weighted shore's first slice (Law 204, 208, 217, 221-223,
 * 226-227, 230, 234). One representative object, end to end: the beached outboard.
 *
 * WHY ONE OBJECT AND NOT A CATALOGUE. Law 235's representative-first scope is explicit that a
 * wide catalogue before the loop is proven is prohibited. This module proves the loop — the
 * tier table, the graded teardown ladder, study, degrade-vs-destroy, subassemblies,
 * reassembly, diagnosis and repair — on the outboard alone. A second heavy object is adding a
 * row to a table this module already has; it is not more design here.
 *
 * THE TIER TABLE IS A FORMULA, NEVER A STORED PROPERTY (Law 204/234). `objectTierFor` recomputes an
 * object's tier from its raw mass and the survivor's CURRENT effective strength every time it
 * is asked, exactly mirroring `effectiveCarriedKg` in body.ts — practice reduces what a load
 * reads as to this body, never to zero, never stored, never opened as a menu to check. An
 * object crossing tiers as the survivor trains is therefore not a feature with its own code
 * path; it is what the formula already does whenever it is asked again.
 *
 * DRAG SCALES CONTINUOUSLY rather than switching mechanics at a tier boundary, for the same
 * reason the carry-weight curves are continuous rather than stepped: a hard cliff at exactly
 * T5's ceiling would make one more kilogram of practice invisible until it happened to cross a
 * line, which is precisely what Law 234 forbids. The TIER LABEL shown to the player is still a
 * discrete rung (it is what a person would say out loud), but the cost underneath it is smooth.
 *
 * STUDY RAISES UNDERSTANDING ONLY (Law 208). `teardownAttempt` is the only function in this
 * module that raises `mechanicalSystems.technique` — study never does, however much time is
 * spent, which is the hard line Law 208 draws between reading about a thing and doing it.
 *
 * D-011. Every clock read here is `state.gameHoursElapsed`, which advances identically online
 * and offline and is read, never guessed at from `Date.now()`. Nothing in this module can run
 * while the game is closed: `dragOutboard`, `studyOutboard`, `teardownAttempt`,
 * `reassembleOutboard`, `diagnoseFault` and `repairOutboard` are all player actions, reachable
 * only from a live tap. There is no absence-path counterpart for any of them, the same
 * structural shape wreck.ts's instability and dropped.ts's despawn already use.
 */
import { TUNE } from '../data/tune';
import { OUTBOARD } from '../data/world';
import { applyLearningEvent } from './knowledge';
import { practiceShareOf } from './capacities';
import type {
    GameState, MaterialKind, ObjectTier, OutboardPart, OutboardState, TeardownOutcome, TeardownRung,
} from './types';

export function freshOutboard(): OutboardState {
    return { draggedM: 0, teardown: null, reassembled: false, fault: null, faultDiagnosed: false };
}

/** All eleven parts a complete outboard yields at Expert rung and needs back for reassembly. */
export const OUTBOARD_PARTS: readonly OutboardPart[] = [
    'fuelTank', 'tillerHandle', 'carburetor', 'magneto', 'prop', 'shearPin',
    'cylinderHead', 'piston', 'gearcase', 'cowling', 'mountingBracket',
];

const PART_LABEL: Record<OutboardPart, string> = {
    fuelTank: 'fuel tank', tillerHandle: 'tiller handle', carburetor: 'carburetor',
    magneto: 'magneto', prop: 'propeller', shearPin: 'shear pin',
    cylinderHead: 'cylinder head', piston: 'piston', gearcase: 'gearcase',
    cowling: 'cowling', mountingBracket: 'mounting bracket',
};

export function partLabel(part: OutboardPart): string {
    return PART_LABEL[part];
}

/** Is the survivor within arm's reach of the outboard, wherever it has been dragged to? */
export function atOutboard(state: GameState, interactRadiusM: number): boolean {
    const { x, y } = outboardPosition(state);
    return Math.hypot(state.player.x - x, state.player.y - y) <= interactRadiusM;
}

/**
 * WHERE IT ACTUALLY IS. `draggedM` is a cumulative DISTANCE, not a stored position — dragging
 * always moves it directly away from its current spot toward wherever the survivor is facing,
 * so its position is derived from the wash-up point plus that scalar rather than tracked as an
 * independent x/y the drag verb would have to keep in sync by hand.
 */
export function outboardPosition(state: GameState): { x: number; y: number } {
    if (state.outboard.draggedM <= 0) return { x: OUTBOARD.x, y: OUTBOARD.y };
    //  A fixed bearing (toward the tree line) rather than reading player facing here: this is
    //  a PURE function of state with no caller-supplied direction, so the body computes the
    //  actual drag delta at the moment of the verb and this only needs to agree on distance.
    //  See `dragOutboard`'s own doc for why the direction lives there instead.
    return { x: OUTBOARD.x, y: OUTBOARD.y - state.outboard.draggedM };
}

// ---- THE TIER TABLE (Law 204, 234) -------------------------------------------------------

/**
 * WHAT THIS BODY, TODAY, FEELS THIS OBJECT AS. Mirrors `effectiveCarriedKg` exactly: a bounded
 * fraction of relief from `loadTolerance` practice, never reaching zero. The same capacity that
 * makes a full pack lighter to carry makes a heavy object lighter to move — one relief
 * mechanism, not a second one invented for this module (Law 234's "no parallel term").
 */
export function effectiveMassFor(state: GameState, rawKg: number): number {
    const relief = TUNE.tierPracticeReliefMax * practiceShareOf(state.capacities?.loadTolerance ?? 0);
    return rawKg * (1 - relief);
}

//  Named `objectTierFor`, not `tierFor` — `evidence.ts` already owns that name for a
//  completely different concept (a staged pile's discovery-ladder position). Same word,
//  unrelated domains; the longer name is what keeps a barrel-wide `export *` unambiguous.
export function objectTierFor(effectiveMassKg: number): ObjectTier {
    if (effectiveMassKg <= TUNE.tierPocketableMaxKg) return 'pocketable';
    if (effectiveMassKg <= TUNE.tierOneHandedMaxKg) return 'one-handed';
    if (effectiveMassKg <= TUNE.tierTwoHandedMaxKg) return 'two-handed';
    if (effectiveMassKg <= TUNE.tierShoulderedMaxKg) return 'shouldered';
    if (effectiveMassKg <= TUNE.tierDraggedMaxKg) return 'dragged';
    //  T6/T7/T8 are not distinguished by mass alone this slice — see the module header. An
    //  object heavier than a lone survivor can drag at all reads as 'levered' and refuses the
    //  drag verb with the true reason, rather than silently failing.
    return 'levered';
}

export function outboardTier(state: GameState): ObjectTier {
    return objectTierFor(effectiveMassFor(state, TUNE.outboardMassKg));
}

/** Plain sentence for the tier the survivor is actually feeling right now — the perceivability
 *  half (Law 234): this is read on approach, never behind a menu. */
export function tierNote(tier: ObjectTier): string {
    switch (tier) {
        case 'pocketable': return 'Light enough to pocket.';
        case 'one-handed': return 'One hand holds it.';
        case 'two-handed': return 'Both hands, and nothing else free.';
        case 'shouldered': return 'You could shoulder it, at a cost to your pace.';
        case 'dragged': return 'Too heavy to lift. You could drag it.';
        case 'levered': return 'Too heavy to drag alone. It would need a pole, rollers, or a ramp.';
        case 'tackle-bound': return 'This is beyond one body. It would need real tackle — a block and line, at least.';
        case 'fixed': return 'This is never leaving. Whatever it holds is stripped where it lies.';
    }
}

// ---- DRAGGING (T5's one implemented movement, Law 204) ----------------------------------

/**
 * HOW MUCH SLOWER, AND HOW MUCH MORE IT COSTS, RIGHT NOW. Continuous in effective mass rather
 * than a flat T5 constant — see the module header for why a stepped mechanic would hide
 * practice the same way a stepped tier lookup would. `hasPole` is Law 204's own example
 * ("assisted... mechanical... routes") made concrete: a pole never turns an impossible drag
 * possible, it only eases one that already was.
 */
export function dragMultipliers(state: GameState, hasPole: boolean): { speedFraction: number; energyMultiplier: number } {
    const eff = effectiveMassFor(state, TUNE.outboardMassKg);
    //  How far into the T4→T5 range the object sits, 0 at the T4 ceiling (barely draggable,
    //  nearly shoulderable) to 1 at the T5 ceiling (as hard a drag as this tier admits).
    const span = TUNE.tierDraggedMaxKg - TUNE.tierShoulderedMaxKg;
    const into = span > 0 ? Math.min(1, Math.max(0, (eff - TUNE.tierShoulderedMaxKg) / span)) : 1;
    const ease = hasPole ? TUNE.dragPoleEaseFraction : 0;
    const speedFraction = Math.min(1, TUNE.dragSpeedFraction + (1 - TUNE.dragSpeedFraction) * (1 - into) + ease * 0.5);
    const energyMultiplier = Math.max(1, TUNE.dragEnergyMultiplier * (1 - ease) * (0.5 + 0.5 * into));
    return { speedFraction, energyMultiplier };
}

/**
 * PULL IT ONE STEP. Pure — returns the next outboard state, energy cost and metres moved; the
 * caller (game.ts) applies the energy cost and any world-collision clamping. Refuses outright,
 * with the true reason, once the object reads heavier than T5 admits — Law 217's own
 * "exposes... rather than issuing a level lock" line: the refusal names WHY, it does not just
 * grey out a button.
 */
export interface DragResult {
    ok: boolean;
    reason: string | null;
    outboard: OutboardState;
    metresMoved: number;
    energyCost: number;
}

export function dragOutboard(state: GameState, metresAttempted: number, hasPole: boolean): DragResult {
    const tier = outboardTier(state);
    if (tier !== 'dragged' && tier !== 'shouldered' && tier !== 'two-handed') {
        return {
            ok: false,
            reason: tierNote(tier),
            outboard: state.outboard,
            metresMoved: 0,
            energyCost: 0,
        };
    }
    const { speedFraction, energyMultiplier } = dragMultipliers(state, hasPole);
    const metresMoved = Math.max(0, metresAttempted) * speedFraction;
    const energyCost = metresMoved * TUNE.outboardDragEnergyPerMetre * energyMultiplier;
    return {
        ok: true,
        reason: null,
        outboard: { ...state.outboard, draggedM: state.outboard.draggedM + metresMoved },
        metresMoved,
        energyCost,
    };
}

// ---- STUDY (Law 208, 230) ----------------------------------------------------------------

/** The object CLASS study's diminishing returns are keyed on. One class this slice; a second
 *  heavy object of a genuinely different class restores full value automatically, because it
 *  would be keyed on a different string here — no migration, no reset needed. */
export const OUTBOARD_STUDY_CLASS = 'small-engine';

/**
 * HOW MUCH UNDERSTANDING THE NEXT STUDY SESSION OF THIS CLASS WOULD YIELD. Steep decay per
 * session already logged for the class (Law 230): the third study of the same class returns
 * roughly a tenth of the first. Floored, never zero — Law 208's own "evidence, context limits"
 * language allows that looking again always teaches a LITTLE.
 */
export function studyYieldFor(state: GameState, classId: string): number {
    const sessions = state.studiedClasses[classId] ?? 0;
    const decay = Math.max(TUNE.studyRepeatFloor, Math.pow(TUNE.studyRepeatDecay, sessions));
    return TUNE.studyFirstGain * decay;
}

export interface StudyResult {
    gained: number;
    studiedClasses: Record<string, number>;
    domainUnderstanding: number;
}

/** Spend `TUNE.studyGameHours` studying the outboard. The caller advances the clock; this
 *  function only computes the yield and the next domain/class state — pure, like every other
 *  resolver in this module. */
export function studyOutboard(state: GameState): StudyResult {
    const gained = studyYieldFor(state, OUTBOARD_STUDY_CLASS);
    const sessions = (state.studiedClasses[OUTBOARD_STUDY_CLASS] ?? 0) + 1;
    return {
        gained,
        studiedClasses: { ...state.studiedClasses, [OUTBOARD_STUDY_CLASS]: sessions },
        domainUnderstanding: state.knowledge.domains.mechanicalSystems.understanding + gained,
    };
}

/**
 * Apply a completed study session to state — the one place this module mutates, mirroring
 * every other verb resolver's split between a pure compute half and a thin apply half.
 *
 * NOT ROUTED THROUGH `applyLearningEvent` (Law 208, checked rather than assumed). That
 * evaluator's own formula is `technique = MAX * challenge * feedback` and
 * `understanding = MAX * novelty * (...)` — a genuine ATTEMPT's shape, where "how much was
 * risked" and "how surprising was the result" gate the gain. Study is not an attempt; it has
 * no challenge and no feedback from a real outcome to offer those terms, and feeding it zeros
 * to force the technique half shut would ALSO zero the understanding half, since `novelty` is
 * the other input the same multiplication needs — the call would be a no-op wearing a
 * citation. Study's own diminishing-returns curve (`studyYieldFor`) already IS its novelty
 * term, computed on a different basis (per-class repetition, not per-domain headroom), so it
 * is applied directly to `understanding` and the shared evaluator is not called at all.
 */
export function applyStudy(state: GameState): void {
    const result = studyOutboard(state);
    state.studiedClasses = result.studiedClasses;
    state.knowledge.domains.mechanicalSystems.understanding = Math.min(
        100, state.knowledge.domains.mechanicalSystems.understanding + result.gained,
    );
}

// ---- THE TEARDOWN LADDER (Law 217, 221, 224-227) -----------------------------------------

/**
 * THE COMPETENCE SCORE THIS ATTEMPT IS JUDGED AGAINST. Technique weighs more than
 * understanding (Law 217: the ATTEMPT is what closes a real gap), a real tool set and a
 * cleared workspace each add a flat, visible bonus — Law 217's own listed factors made
 * concrete rather than abstracted into one number nobody can trace.
 *
 * `hasTools` is READ from `state.tools.salvageTools`, never a caller-supplied boolean — it is
 * a plain fact about state, and taking it as a parameter would let a caller's stale read drift
 * from what the survivor actually owns. `workspaceClear` stays a parameter: whether the ground
 * around the outboard is actually clear is a COLLISION-GEOMETRY question the brain has no way
 * to answer, and the body layer is the only side of the split that can.
 */
export function competenceFor(state: GameState, workspaceClear: boolean): number {
    const domain = state.knowledge.domains.mechanicalSystems;
    const base = domain.technique * TUNE.teardownTechniqueWeight
        + domain.understanding * TUNE.teardownUnderstandingWeight;
    const toolBonus = state.tools.salvageTools ? TUNE.teardownToolBonus : 0;
    const workspaceBonus = workspaceClear ? TUNE.teardownWorkspaceBonus : 0;
    return Math.min(100, base + toolBonus + workspaceBonus);
}

/**
 * WHAT EVIDENCE IS READABLE BEFORE COMMITTING (Law 217's fair-challenge half). Not a hidden
 * roll dressed as a sentence — the exact rung this competence would reach, stated plainly, so
 * the survivor decides whether to attempt, study first, or walk away with full information.
 * `wouldDestroy` names the honest cost of trying anyway when the gap is wide.
 */
export interface TeardownForecast {
    reachableRung: TeardownRung;
    wouldDestroy: boolean;
    competence: number;
    missingWorkspace: boolean;
}

export function teardownForecast(state: GameState, workspaceClear: boolean): TeardownForecast {
    const competence = competenceFor(state, workspaceClear);
    const rung = rungForCompetence(competence);
    return {
        reachableRung: rung,
        //  Matches `teardownAttempt`'s own destroy check exactly (same base, same constant) —
        //  the fair-challenge half of Law 217 fails if the preview and the real roll can ever
        //  disagree on the same inputs.
        wouldDestroy: rung === 'novice' && (TUNE.teardownBasicAt - competence) > TUNE.teardownDestroyGapAt,
        competence,
        missingWorkspace: !workspaceClear && rungNeedsWorkspace(rung),
    };
}

function rungForCompetence(competence: number): TeardownRung {
    if (competence >= TUNE.teardownExpertAt) return 'expert';
    if (competence >= TUNE.teardownSkilledAt) return 'skilled';
    if (competence >= TUNE.teardownCompetentAt) return 'competent';
    if (competence >= TUNE.teardownBasicAt) return 'basic';
    return 'novice';
}

/** Competent and up need a cleared workspace (Law 219 read onto field conditions); Novice and
 *  Basic do not — pulling a fuel cap or a loose screw needs no bench. */
function rungNeedsWorkspace(rung: TeardownRung): boolean {
    return rung === 'competent' || rung === 'skilled' || rung === 'expert';
}

/**
 * THE ATTEMPT ITSELF. Technique rises here, and ONLY here (Law 208) — win or lose, the same
 * "the attempt teaches" line this project's combine system already keeps for its own domain.
 *
 * STUDY'S CEILING, ENFORCED HERE RATHER THAN ON THE SCORE. Study alone may lift the outcome by
 * at most one rung (the brief's own hard cap). Because study raises `understanding` and
 * understanding is only 30% of the competence score, capping the SCORE would under-cap it in
 * some states and over-cap it in others; capping the RESULTING RUNG directly — "no more than
 * one rung above what technique ALONE would reach" — is the honest reading of a cap on
 * OUTCOME rather than on an intermediate number nobody but this function ever sees.
 */
export function teardownAttempt(state: GameState, workspaceClear: boolean): TeardownOutcome {
    const competence = competenceFor(state, workspaceClear);
    let rung = rungForCompetence(competence);

    const techniqueOnlyCompetence = state.knowledge.domains.mechanicalSystems.technique * TUNE.teardownTechniqueWeight
        + (state.tools.salvageTools ? TUNE.teardownToolBonus : 0) + (workspaceClear ? TUNE.teardownWorkspaceBonus : 0);
    const techniqueOnlyRung = rungForCompetence(techniqueOnlyCompetence);
    rung = capByOneRung(rung, techniqueOnlyRung);

    if (rungNeedsWorkspace(rung) && !workspaceClear) rung = 'basic';

    //  Gap is measured against BASIC's floor — the rung the attempt fell short of — never
    //  against the achieved rung's own floor. Novice's own floor is 0, so comparing against
    //  `thresholdFor(rung)` here made this branch mathematically unreachable (competence can
    //  never be negative): found by testing, matches `teardownForecast`'s own (correct)
    //  formula, which used this same basis already.
    const gapBelowFloor = TUNE.teardownBasicAt - competence;
    const destroyed = rung !== 'novice' ? false : gapBelowFloor > TUNE.teardownDestroyGapAt;

    return outcomeFor(rung, destroyed);
}

const RUNG_ORDER: readonly TeardownRung[] = ['novice', 'basic', 'competent', 'skilled', 'expert'];

function capByOneRung(rung: TeardownRung, floorRung: TeardownRung): TeardownRung {
    const cap = Math.min(RUNG_ORDER.length - 1, RUNG_ORDER.indexOf(floorRung) + TUNE.studyMaxRungLift);
    const actual = Math.min(RUNG_ORDER.indexOf(rung), cap);
    return RUNG_ORDER[actual];
}

/** What each rung actually yields, on THIS object. Named parts at Skilled/Expert, per Law
 *  221 (subassemblies) and Law 227 (a complete strip reassembles). */
function outcomeFor(rung: TeardownRung, destroyed: boolean): TeardownOutcome {
    if (destroyed) {
        return { rung: 'novice', destroyed: true, gained: { fiber: 0, stone: TUNE.outboardDestroyedScrapStone }, parts: [] };
    }
    switch (rung) {
        case 'novice':
            return { rung, destroyed: false, gained: {}, parts: [] };
        case 'basic':
            return { rung, destroyed: false, gained: { stone: TUNE.outboardBasicFastenerStone }, parts: [] };
        case 'competent':
            return { rung, destroyed: false, gained: { stone: TUNE.outboardBasicFastenerStone }, parts: ['fuelTank', 'tillerHandle'] };
        case 'skilled':
            return {
                rung, destroyed: false, gained: { stone: TUNE.outboardBasicFastenerStone },
                parts: ['fuelTank', 'tillerHandle', 'carburetor', 'magneto', 'prop'],
            };
        case 'expert':
            return { rung, destroyed: false, gained: { stone: TUNE.outboardBasicFastenerStone }, parts: [...OUTBOARD_PARTS] };
    }
}

/** Apply a completed attempt to state. Merges into any EXISTING partial teardown rather than
 *  overwriting it (Law 223: progress persists) — a second, better attempt after Novice can
 *  only ever reach an EQUAL or HIGHER rung than the first, never lose what was already found. */
export function applyTeardown(state: GameState, outcome: TeardownOutcome): void {
    const existing = state.outboard.teardown;
    const merged: TeardownOutcome = !existing || outcome.destroyed || RUNG_ORDER.indexOf(outcome.rung) >= RUNG_ORDER.indexOf(existing.rung)
        ? outcome
        : existing;
    state.outboard = { ...state.outboard, teardown: merged };
    for (const [kind, amount] of Object.entries(outcome.gained) as Array<[MaterialKind, number]>) {
        state.inventory[kind] = (state.inventory[kind] ?? 0) + (amount ?? 0);
    }
    for (const part of outcome.parts) {
        if (!state.carriedParts.includes(part)) state.carriedParts = [...state.carriedParts, part];
    }
    applyLearningEvent(state, 'mechanicalSystems', {
        challenge: outcome.destroyed ? 0.7 : 0.4, novelty: 0.2, feedback: 0.6,
        consequence: outcome.destroyed ? 0.8 : 0.3, reflection: 0.3,
    });
    state.knowledge.domains.mechanicalSystems.technique = Math.min(
        100, state.knowledge.domains.mechanicalSystems.technique + TUNE.teardownAttemptTechniqueGain,
    );
}

/** DELIBERATE DESTRUCTION — the axe. Always available, always costs everything STILL INSIDE
 *  the object: no roll, no rung, the honest floor beneath the graded ladder rather than a
 *  shortcut around it.
 *
 *  MUST NOT TOUCH `carriedParts`. It once did (a stray filter, found by tracing the exact
 *  effect while designing the verb that calls this): a part only ever enters `carriedParts`
 *  by having already been extracted via a prior teardown attempt or shore find, at which
 *  point it is no longer "inside" anything — it is in the survivor's own hands. Axing the
 *  husk afterward destroyed those already-recovered parts too, silently forfeiting inventory
 *  the player had already secured for an action performed on an object that no longer even
 *  contained them. What axing actually costs is whatever teardown had NOT yet reached —
 *  those parts were never added to `carriedParts` in the first place, so there is nothing
 *  this function needs to remove. */
export function axeOutboard(state: GameState): void {
    state.outboard = { ...state.outboard, teardown: { rung: 'novice', destroyed: true, gained: {}, parts: [] } };
    state.inventory.stone = (state.inventory.stone ?? 0) + TUNE.outboardDestroyedScrapStone;
}

// ---- REASSEMBLY, DIAGNOSIS, REPAIR (Law 227) ----------------------------------------------

export function canReassemble(state: GameState): boolean {
    return !state.outboard.reassembled && OUTBOARD_PARTS.every((p) => state.carriedParts.includes(p));
}

/** Complete reassembly — Law 227's repaired/manufactured route made real: eleven parts back
 *  together is a working motor, not a pile. A deterministic seeded roll (the SAME "counter as
 *  seed" pattern `salvageSpawnCount`/`craftRollCount` already use — no clock or RNG read)
 *  decides whether it starts faultless or hides a fault a survivor must diagnose. */
export function reassembleOutboard(state: GameState, seed: number): void {
    if (!canReassemble(state)) return;
    const faulty = seedFraction(seed) < TUNE.outboardReassemblyFaultChance;
    state.outboard = {
        ...state.outboard,
        reassembled: true,
        fault: faulty ? 'The cylinder will not hold compression — something is fouling the seal.' : null,
        faultDiagnosed: !faulty,
    };
    state.carriedParts = state.carriedParts.filter((p) => !OUTBOARD_PARTS.includes(p));
}

/** Reading the fault correctly needs real understanding — an undiagnosed guess cannot
 *  legitimately be repaired (Law 217's credibility half). */
export function diagnoseFault(state: GameState): boolean {
    if (!state.outboard.fault || state.outboard.faultDiagnosed) return state.outboard.faultDiagnosed;
    const understood = state.knowledge.domains.mechanicalSystems.understanding >= TUNE.outboardDiagnoseUnderstandingAt;
    if (understood) state.outboard = { ...state.outboard, faultDiagnosed: true };
    return understood;
}

export function repairOutboard(state: GameState): boolean {
    if (!state.outboard.fault || !state.outboard.faultDiagnosed) return false;
    state.outboard = { ...state.outboard, fault: null };
    return true;
}

/** A small, deterministic 32-bit hash — the same technique `salvageSpawnCount`'s own loot
 *  roll and `craftRollCount`'s grade roll already use. */
function hash32(seed: number): number {
    let h = seed | 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

function seedFraction(seed: number): number {
    return hash32(seed) / 0x100000000;
}
