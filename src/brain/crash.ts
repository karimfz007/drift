/**
 * THE APPOINTMENT — DROP 3B(i). The island's first deadline.
 *
 * A NEW SITE, AND NOT THE WRECK. The Wreck ([[D-124]]/[[D-125]]) is a permanent structure in
 * open water, reached by raft, worked over and over as the tide shifts it. This is a forest
 * crash on LAND, and it is the opposite kind of thing: it exists for a few days and then it
 * does not. Nothing here touches `state.wreck`, reuses its nodes, or reads its instability.
 * The only thing the two share is the material economy, which is the point — wreck-era metal,
 * cable, glass and medical stores are what falls out of the sky as well as out of the sea.
 *
 * ---------------------------------------------------------------------------------------
 * THE WORLD TELLS YOU FIRST (Law 26). A smoke column goes up over the treeline and it is
 * visible and audible before any interface names it. `crashSighting` is what the body draws
 * and the goal line speaks; there is no marker, no arrow, and nothing that resolves the
 * bearing for you. What the survivor gets is smoke in a direction.
 *
 * TRAJECTORY-DRIVEN, NOT A SPAWN ROLL. `CRASH_SITE` is authored in `world.ts` on a bearing
 * through the island, and `crashBearingDeg` is derived from that geometry rather than stored —
 * so the smoke, the site and the direction it came down on can never disagree.
 *
 * ---------------------------------------------------------------------------------------
 * SIX STAGES, AND RAIN'S OWN GRAMMAR ([[D-133]]) RATHER THAN A SECOND ONE.
 *
 *   none        the idle stage, waiting on the clock. Nothing to see.
 *   sighted     the column goes up. COSTS NOTHING.
 *   standing    the column holds. COSTS NOTHING. This is the preparation window.
 *   fresh       the site is workable and the salvage is best.
 *   picked-over the forest has started taking it. Workable, and worth less.
 *   overgrown   gone. For good.
 *
 * TWO FREE STAGES BEFORE ANYTHING IS AT STAKE — the storm's contract, restated here because a
 * grammar that only worked for weather would have been a weather feature wearing a law's
 * clothes. A survivor who sees the smoke and does nothing has not yet lost anything; the two
 * stages that cost nothing are what make the deadline fair.
 *
 * AND THE SCHEDULING IS THE STORM'S TOO, extracted rather than copied: `stepStaged` in
 * `staged.ts` is the one piece of machinery both run on. There is no third scheduling system.
 *
 * ---------------------------------------------------------------------------------------
 * WRECKFALL IS ALWAYS EMPTY OF THE LIVING — arrival canon, and it is a content rule with a
 * test behind it. No survivors, no bodies, no rescue, nobody to talk to. What comes down is
 * cargo and airframe. A sweep asserts that nothing authored here names a person.
 *
 * ---------------------------------------------------------------------------------------
 * ABANDONING IS A LEGITIMATE ANSWER, and the model has to mean it. Going costs a real journey
 * inland; the salvage is wreck-era material a survivor may already have, or may not need. A
 * player who reads the smoke, weighs it and stays home loses NOTHING they had — no penalty, no
 * failure state, no debt. `abandonCost` returns zero and a test holds it there, because the
 * cheapest way to ruin an open loop is to punish the reading you asked the player to make.
 *
 * ---------------------------------------------------------------------------------------
 * [[D-011]], AND STRICTER THAN ANY HAZARD BEFORE IT.
 *
 * `advanceCrash` is the only function that moves the appointment, and it runs on `Session`'s
 * ONLINE TICK alone. `reconcile` has no crash term whatsoever. The consequence is the one the
 * brief demands and it is worth stating plainly: **the window cannot open, run, or close while
 * the game is closed.** An absence of any length leaves the appointment exactly where it was.
 *
 * That is deliberately UNLIKE the storm, which an absence ENDS. A storm you were not there for
 * is weather you did not stand in; an appointment you were not there for would be a deadline
 * missed for not playing, which is the offline-death law wearing its most plausible disguise.
 * So the clock for this event is online time, and missing it while away is structurally
 * impossible rather than merely unlikely.
 */
import { TUNE } from '../data/tune';
import { CRASH_SITE, WORLD } from '../data/world';
import { stepStaged } from './staged';
import type { CrashStage, CrashState, GameState, MaterialKind } from './types';

export const ALL_CRASH_STAGES: readonly CrashStage[] =
    ['none', 'sighted', 'standing', 'fresh', 'picked-over', 'overgrown'];

export function freshCrash(): CrashState {
    return { stage: 'none', inStageGameHours: 0, nextAtGameHours: TUNE.crashFirstAtGameHours, worked: 0 };
}

/** How long each stage lasts, in game hours. `none` waits on a clock; `overgrown` is forever. */
export function crashStageDuration(stage: CrashStage): number {
    switch (stage) {
        case 'none': return Infinity;
        case 'sighted': return TUNE.crashSightedGameHours;
        case 'standing': return TUNE.crashStandingGameHours;
        case 'fresh': return TUNE.crashFreshGameHours;
        case 'picked-over': return TUNE.crashPickedGameHours;
        //  GONE FOR GOOD. Not a stage that ends — the end itself.
        case 'overgrown': return Infinity;
    }
}

function nextCrashStage(stage: CrashStage): CrashStage {
    switch (stage) {
        case 'none': return 'sighted';
        case 'sighted': return 'standing';
        case 'standing': return 'fresh';
        case 'fresh': return 'picked-over';
        case 'picked-over': return 'overgrown';
        case 'overgrown': return 'overgrown';
    }
}

/** Is there anything to work at the site right now? */
export function crashWorkable(stage: CrashStage): boolean {
    return stage === 'fresh' || stage === 'picked-over';
}

/** Has the appointment been and gone? */
export function crashGone(stage: CrashStage): boolean {
    return stage === 'overgrown';
}

// ---------------------------------------------------------------------------
// The world tells you first (Law 26).
// ---------------------------------------------------------------------------

export interface CrashSighting {
    /** Is there a column to see at all? */
    visible: boolean;
    /** 0..1 — how much smoke. Thickest when it comes down, thinning as the forest takes it. */
    column: number;
    /** Compass bearing to the site from the survivor, in degrees. Derived, never stored. */
    bearingDeg: number;
    distanceM: number;
    /** What a person would say about it. Null when there is nothing to say. */
    note: string | null;
}

/**
 * WHAT CAN BE SEEN AND HEARD, before any interface names it.
 *
 * The note NEVER says where to go or what is there. It says what the sky looks like, which is
 * all a person standing on a beach actually has — the affordance law applied to an event.
 */
export function crashSighting(state: GameState): CrashSighting {
    const dx = CRASH_SITE.x - state.player.x;
    const dy = CRASH_SITE.y - state.player.y;
    const bearingDeg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
    const distanceM = Math.hypot(dx, dy);
    const stage = state.crash.stage;

    const column = stage === 'sighted' ? 1
        : stage === 'standing' ? 0.8
            : stage === 'fresh' ? 0.5
                : stage === 'picked-over' ? 0.2
                    : 0;

    const note = stage === 'sighted'
        ? 'Something came down inland. There is a column of smoke over the treeline.'
        : stage === 'standing'
            ? 'The smoke is still up. Whatever it is, it is still burning.'
            : stage === 'fresh'
                ? 'The smoke is thinning out.'
                : stage === 'picked-over'
                    ? 'Barely a smudge over the trees now.'
                    : null;

    return { visible: column > 0, column, bearingDeg, distanceM, note };
}

/** Close enough to work it. */
export function atCrashSite(state: GameState): boolean {
    return Math.hypot(state.player.x - CRASH_SITE.x, state.player.y - CRASH_SITE.y)
        <= TUNE.interactRadiusM + TUNE.crashSiteRadiusM;
}

// ---------------------------------------------------------------------------
// Working it.
// ---------------------------------------------------------------------------

/**
 * WHAT ONE ARMFUL OFF THE SITE IS WORTH — wreck-era families, and no new material anywhere.
 *
 * `fresh` is worth more than `picked-over`, and that difference IS the fair-challenge
 * asymmetry: a survivor who read the smoke during the two free stages and set out arrives
 * while it is fresh; one who ignored it arrives to a site the forest has started taking.
 */
export function crashYield(stage: CrashStage): Partial<Record<MaterialKind, number>> {
    switch (stage) {
        case 'fresh':
            return { metal: TUNE.crashFreshMetal, wiring: TUNE.crashFreshWiring, glass: TUNE.crashFreshGlass };
        case 'picked-over':
            return { metal: TUNE.crashPickedMetal, wiring: TUNE.crashPickedWiring };
        default:
            return {};
    }
}

export type CrashBlock = 'not-there' | 'too-far' | 'gone' | null;

export function crashBlocked(state: GameState): CrashBlock {
    if (crashGone(state.crash.stage)) return 'gone';
    if (!crashWorkable(state.crash.stage)) return 'not-there';
    if (!atCrashSite(state)) return 'too-far';
    return null;
}

/** One sentence naming the single thing in the way. Never "requirements not met". */
export function crashBlockedReason(state: GameState): string | null {
    switch (crashBlocked(state)) {
        case 'gone': return 'The forest has closed over it. There is nothing here to find.';
        case 'not-there': return 'Nothing has come down. There is nothing out there to work.';
        case 'too-far': return 'Too far. You would have to walk in to it.';
        default: return null;
    }
}

/**
 * WORK THE SITE, once per call. Returns what came out, or null when it was refused.
 *
 * NOTHING HERE TOUCHES THE CLOCK. Working the site does not shorten the window and does not
 * extend it — the forest takes it on its own schedule, and a survivor cannot buy time by
 * hurrying. That is what makes it a deadline rather than a resource bar.
 */
export function workCrashSite(state: GameState): Partial<Record<MaterialKind, number>> | null {
    if (crashBlocked(state) !== null) return null;
    const gained = crashYield(state.crash.stage);
    for (const [kind, amount] of Object.entries(gained) as Array<[MaterialKind, number]>) {
        state.inventory[kind] += amount;
    }
    state.crash = { ...state.crash, worked: state.crash.worked + 1 };
    return gained;
}

/**
 * WHAT WALKING AWAY COSTS: nothing.
 *
 * Stated as a function rather than left as an absence, because "abandon is a legitimate
 * answer" is a claim somebody will eventually want to soften with a small penalty, and a
 * function with a test on it is harder to soften than a silence. A survivor who reads the
 * smoke, weighs a day's walk against what they already have, and stays home has played the
 * loop correctly.
 */
export function abandonCost(): number {
    return 0;
}

// ---------------------------------------------------------------------------
// The clock. Online only — see this file's header.
// ---------------------------------------------------------------------------

export interface CrashStep {
    stage: CrashStage;
    changed: boolean;
    from: CrashStage;
}

/**
 * ONE SPAN OF THE APPOINTMENT, on the online tick and nowhere else.
 *
 * `intervalAfter: null` — this happens ONCE. There is no second crash, and `overgrown` is a
 * terminal stage rather than a return to idle.
 */
export function advanceCrash(state: GameState, gameHours: number): CrashStep {
    const before = state.crash;
    const { next, step } = stepStaged<CrashStage>(before, state.gameHoursElapsed, gameHours, {
        idle: 'none',
        first: 'sighted',
        durationOf: crashStageDuration,
        nextOf: nextCrashStage,
        intervalAfter: null,
    });
    if (next !== before) state.crash = { ...next, worked: before.worked };
    return { stage: step.stage, changed: step.changed, from: step.from };
}

/**
 * THE SITE'S OWN GROUND, for the body to draw on and for the world to be checked against.
 * Inland, inside the treeline, so the smoke really is over the trees from the beach.
 */
export function crashSiteIsInland(): boolean {
    return Math.hypot(CRASH_SITE.x, CRASH_SITE.y) < WORLD.treelineRadius;
}
