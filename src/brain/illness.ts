/**
 * ILLNESS — the Medicine Slice's trunk. Drop 3.
 *
 * DELIBERATELY THE SAME SHAPE AS `injury.ts`, function for function: `freshIllness` /
 * `stepIllness` / `settleIllnessOffline` / `canTreat` / `treat` / `illnessNote`. Injury is the
 * system this most resembles and the one a reader will already know, so the second condition
 * system in this game reads as a sibling rather than as a rival. Where the two differ, they
 * differ for a stated reason, and there are exactly two.
 *
 * DIFFERENCE 1 — ILLNESS IS CAUSED, NEVER ROLLED. A wound arrives from outside: a boar hits
 * you and you had a chance to read the telegraph. An illness arrives from how you have been
 * LIVING, and the whole design requirement is that the player can trace it. So every illness
 * carries the cause that produced it, `onsetFrom` is the only way one can begin, and there is
 * no random source anywhere in this module. If a survivor is ill, something they did or failed
 * to do put them there, and `illnessNote` names it.
 *
 * DIFFERENCE 2 — IT DOES NOT VANISH ON ABSENCE. `settleInjuriesOffline` CLOTS everything,
 * because a bleed is acute and a week away should not be a death sentence. Illness is chronic
 * by nature, and a free cure for closing the game would make the whole system optional. So the
 * absence rule is the weaker, truer one the slice was specified with: **it never worsens, and
 * it never costs a thing** — the worst cases ease to a survivable ceiling and everything else
 * is held exactly where it was. You come back still ill. You never come back worse, and you
 * never come back dead. D-011 is satisfied structurally, the same way injury satisfies it:
 * `stepIllness` is the only function that can cost health, and reconcile's absence path
 * cannot call it.
 *
 * THE FIVE-STAGE GRAMMAR, and why it is a ladder rather than a switch. `BOAR_STAGES` telegraphs
 * a charge across five readable steps; illness uses the same contract on a slower clock.
 * Crucially the first TWO stages cost nothing but say something — `unsettled` and `ailing` are
 * pure warning, and health only starts moving at `feverish`. That is the fair-challenge
 * contract in its literal form: the game tells you twice, in plain language, before it bites.
 *
 * THE RESISTANCE LADDER. The slice brief called for onset "via the existing immunity ladder".
 * No such ladder existed — this is it, and it is deliberately DERIVED rather than stored. A
 * body that is exhausted, cold, hurt or starving takes a cause harder than a body that is
 * none of those, and that is one number read from state the game already keeps. There is no
 * `immunity` field to migrate, to desync, or to forget to update: the same condition that
 * makes you vulnerable to bad water makes you vulnerable to a chill, because it is the same
 * survivor.
 */
import { TUNE } from '../data/tune';
import { recordTrying } from './knowledge';
import { thermalStrain } from './thermal';
import type { GameState, IllnessCause, IllnessStage, IllnessState } from './types';

/** Ascending severity. Index is the rung, exactly as `LADDER_ORDER` and `BOAR_STAGES` are. */
export const ILLNESS_STAGES: IllnessStage[] = ['well', 'unsettled', 'ailing', 'feverish', 'gravely-ill'];

/** Nobody is ill. What a fresh survivor lands on, and what recovery returns you to. */
export function freshIllness(): IllnessState {
    return { severity: 0, cause: null, gameHoursSick: 0 };
}

export function isIll(ill: IllnessState): boolean {
    return ill.severity > 0;
}

/**
 * WHICH RUNG. Read from severity alone, so the stage and the number can never disagree —
 * the same reason the ladder has no stored state.
 */
export function illnessStage(ill: IllnessState): IllnessStage {
    if (ill.severity <= 0) return 'well';
    if (ill.severity < TUNE.illnessAilingAt) return 'unsettled';
    if (ill.severity < TUNE.illnessFeverishAt) return 'ailing';
    if (ill.severity < TUNE.illnessGraveAt) return 'feverish';
    return 'gravely-ill';
}

/**
 * THE FAIR-CHALLENGE LINE, in one predicate. Below it an illness is pure telegraph: it reads
 * out, it can be acted on, and it takes nothing. Callers ask this rather than re-deriving the
 * rung comparison, so the contract lives in one place and a retune cannot quietly move it.
 */
export function illnessCosts(ill: IllnessState): boolean {
    const stage = illnessStage(ill);
    return stage === 'feverish' || stage === 'gravely-ill';
}

/**
 * THE RESISTANCE LADDER — how hard this body takes a cause, 0 (fully resistant) to 1 (wide
 * open). Derived from four things the survivor can all see and all fix.
 *
 * Fatigue is listed first because it is the one the brief names, and it is the one with no
 * other consequence sharp enough to be felt: being tired already costs energy and speed, and
 * this makes it cost something that lasts.
 */
export function susceptibility(state: GameState): number {
    const tired = clamp01(state.fatigue / TUNE.fatigueMax);
    const hurt = 1 - clamp01(state.health / TUNE.healthMax);
    const strain = thermalStrain(state.warmth);
    const cold = strain === 'hypothermic' ? 1 : strain === 'cold' ? 0.5 : 0;
    const starved = 1 - clamp01(state.hunger / TUNE.hungerMax);
    //  The WORST of them, not the sum. A survivor who is merely tired is not as vulnerable as
    //  one who is tired AND freezing, but neither is four mild problems the same as one
    //  severe one — and summing would let trivia stack into a fever.
    const worst = Math.max(tired, hurt, cold, starved);
    return clamp01(TUNE.illnessBaseSusceptibility + worst * (1 - TUNE.illnessBaseSusceptibility));
}

/**
 * ONSET. The ONLY way an illness can begin, and it takes an explicit cause — there is no
 * source of illness in this game that a player cannot name afterwards.
 *
 * `exposure` is how strong this particular instance of the cause was (a sip of bad water is
 * not a night in the rain), and the resistance ladder scales it. A cause that lands on an
 * already-ill survivor DEEPENS the existing illness rather than starting a second one: two
 * illnesses at once is a bookkeeping problem the player would experience as noise.
 */
export function onsetFrom(state: GameState, cause: IllnessCause, exposure: number): IllnessState {
    const current = state.illness;
    const gain = Math.max(0, exposure) * susceptibility(state) * TUNE.illnessOnsetScale;
    if (gain <= 0) return current;
    return {
        severity: Math.min(TUNE.illnessSeverityMax, current.severity + gain),
        //  The cause STICKS to the first thing that made you ill. Overwriting it with whatever
        //  most recently nudged the number would make the readout lie about where this came
        //  from, and the readout naming the cause is the entire point of the system.
        cause: current.cause ?? cause,
        gameHoursSick: current.gameHoursSick,
    };
}

/**
 * ONE SPAN OF TIME, ONLINE — the only function here that can cost health.
 *
 * `restQuality` is the sleep model's own multiplier, passed in rather than recomputed: 1 for
 * a proper sheltered sleep, `groundSleepRecoveryMultiplier` for sleeping rough, 0 when awake.
 * Reusing that number is what makes "sleep is treatment" true without a second rest model —
 * a warm dry bed heals faster because it already recovers energy faster, by the same term.
 */
export function stepIllness(
    ill: IllnessState,
    gameHours: number,
    restQuality: number
): { next: IllnessState; healthLost: number } {
    if (gameHours <= 0 || !isIll(ill)) return { next: ill, healthLost: 0 };

    //  Recovery runs always; resting multiplies it. Even a survivor who never sleeps gets
    //  better eventually, because an illness with no natural end is a permanent tax the
    //  player cannot answer — the same reasoning that gives bleeding a natural clot.
    const recovery = TUNE.illnessRecoveryPerGameHour * (1 + restQuality * TUNE.illnessRestRecoveryBonus) * gameHours;
    const severity = Math.max(0, ill.severity - recovery);

    //  Health only moves once the telegraph has been ignored past `feverish`.
    const healthLost = illnessCosts(ill) ? ill.severity * TUNE.illnessHealthPerGameHour * gameHours : 0;

    return {
        next: {
            severity,
            cause: severity > 0 ? ill.cause : null,
            gameHoursSick: ill.gameHoursSick + gameHours,
        },
        healthLost,
    };
}

/**
 * D-011's ENFORCEMENT POINT, and the one place this system differs from injury's.
 *
 * Injury CLOTS on absence. Illness is held: never worse, never costly, and the grave cases
 * ease to a ceiling so that a survivor who closes the game at death's door does not open it
 * there either. What it deliberately does NOT do is cure — that would make closing the game
 * the best medicine in the world, and the whole slice optional.
 *
 * The guarantee is structural, not checked: `stepIllness` is the only function that returns
 * `healthLost`, and reconcile's absence path cannot reach it. There is no code path by which
 * being away can cost a sick survivor anything.
 */
export function settleIllnessOffline(ill: IllnessState): IllnessState {
    if (!isIll(ill)) return ill;
    return { ...ill, severity: Math.min(ill.severity, TUNE.illnessOfflineCeiling) };
}

/**
 * THE REMEDY — Foraging & medicine's first real producer.
 *
 * Seven domains have existed since Ch.2 and this one has sat at its innate floor the entire
 * time, because nothing in the game ever asked a survivor to know anything about it. The
 * bandage answers a wound; this answers a condition, and between them the domain finally has
 * two verbs and a reason to exist.
 */
export function canBrewRemedy(state: GameState): boolean {
    return isIll(state.illness)
        && state.inventory.fiber >= TUNE.remedyFiberCost
        && state.inventory.berries >= TUNE.remedyBerryCost
        //  At a lit fire, like every other thing that has to be boiled or steeped. Same
        //  predicate the rest of the game uses for "the fire is going": built, with fuel.
        && state.fire.built && state.fire.fuel > 0;
}

/**
 * BREW IT. Cuts severity rather than curing outright — a remedy is relief, and a cure in one
 * tap would make the recovery clock (which is the actual system) meaningless.
 */
export function brewRemedy(state: GameState): boolean {
    if (!canBrewRemedy(state)) return false;
    state.inventory.fiber -= TUNE.remedyFiberCost;
    state.inventory.berries -= TUNE.remedyBerryCost;
    const severity = Math.max(0, state.illness.severity - TUNE.remedySeverityRelief);
    state.illness = {
        severity,
        cause: severity > 0 ? state.illness.cause : null,
        gameHoursSick: state.illness.gameHoursSick,
    };
    //  ITEM 5 — FORAGING & MEDICINE'S FIRST REAL PRODUCER. Seven domains have existed
    //  since Ch.2 and this one has sat at its innate floor the whole time, because
    //  nothing ever asked the survivor to know anything about it. It does now.
    recordTrying(state, 'foragingMedicine');
    return true;
}

/** How much illness taxes every activity. Feeds `impairmentOf`, exactly as pain does. */
export function illnessImpairmentShare(ill: IllnessState): number {
    if (!illnessCosts(ill)) return 0;
    return clamp01(ill.severity / TUNE.illnessSeverityMax);
}

/**
 * ONE PLAIN SENTENCE, and it NAMES THE CAUSE. A readout that said "you feel unwell" would
 * make the illness arbitrary in exactly the way the design forbids: the player has to be able
 * to trace it, and the first two rungs exist so they can be told before it costs them.
 */
export function illnessNote(ill: IllnessState): string | null {
    const stage = illnessStage(ill);
    if (stage === 'well') return null;
    const from = CAUSE_PHRASE[ill.cause ?? 'chill'];
    if (stage === 'unsettled') return `Something is not right — ${from}. It has not taken hold yet.`;
    if (stage === 'ailing') return `You are sickening ${from}. Rest somewhere warm and dry before this turns.`;
    if (stage === 'feverish') return `Fever. It is costing you now — ${from}. Sleep, out of the weather.`;
    return `You are gravely ill ${from}. Get warm, get dry, and sleep, or this finishes you.`;
}

const CAUSE_PHRASE: Record<IllnessCause, string> = {
    chill: 'from too long wet and cold',
    'bad-water': 'from the water you drank',
    'spoiled-food': 'from something you ate',
    exhaustion: 'from running yourself into the ground',
};

function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
}
