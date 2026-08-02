/**
 * THE BOAR — the island's first predator, and the first thing on it that can kill you on
 * purpose. Drop 1.
 *
 * THE FIVE-STAGE GRAMMAR IS THE WHOLE DESIGN, not decoration on top of it. The fair-challenge
 * contract is already standing law; this is its first real test, and the law reads: **no
 * attack without its precursor.** A boar cannot charge out of nothing. It must have been
 * `unaware`, then noticed you, then warned you, and only then commit — and every one of those
 * stages must be both SEEN and HEARD, because a telegraph the player cannot perceive is not a
 * telegraph, it is an ambush with extra steps.
 *
 *   unaware  → it has not registered you. Rooting, moving on its own business.
 *   alert    → it knows something is there. Head up, still, facing you.
 *   warning  → it has decided you are a problem. Snort, ground-paw, bluff.
 *   charge   → COMMITTED. Cannot be re-aimed mid-run; this is what makes evasion real.
 *   aftermath→ spent, either past you or into you. Briefly harmless, then it re-assesses.
 *
 * WHY `charge` IS COMMITTED, and it is not a limitation — it is the mechanic. A charge that
 * tracks the player is unevadable by definition: no amount of reading the telegraph helps if
 * the attack follows you. Committing the charge to a bearing fixed at wind-up is what turns
 * "you got hit" into "you did not move", which is the only version of a predator that a
 * fair-challenge contract permits.
 *
 * D-011, AND IT IS ABSOLUTE HERE. Boars never advance the ladder, never charge, and never
 * touch the player or their property while the game is closed. `settleOffline` is the ONLY
 * function reconcile's absence path may call, and it drops every boar to `unaware` and moves
 * it home. A predator that hunts an absent player is the single most obviously unfair thing
 * this game could contain, and the property test sweeps it rather than trusting this comment.
 *
 * NO SPAWN WAVES, EVER. The population is FIXED at world creation — 2-4 individuals with a
 * rhythm, not a spawner with a budget. There is deliberately no function here that creates a
 * boar after `createBoars`, so a wave cannot be added by accident; adding one would mean
 * writing a new constructor and noticing that you did.
 */
import { TUNE } from '../data/tune';
import type { Boar, BoarStage, GameState } from './types';

/** Ascending menace. Index comparisons make "at least as dangerous as" expressible. */
export const BOAR_STAGES: BoarStage[] = ['unaware', 'alert', 'warning', 'charge', 'aftermath'];

export function stageRank(stage: BoarStage): number {
    return BOAR_STAGES.indexOf(stage);
}

/**
 * THE FIXED POPULATION. Positions are derived from the index rather than rolled, so the same
 * island always has the same boars in the same places — a predator that moves between loads
 * is a predator you cannot learn, and learning it is the entire counterplay.
 */
export function createBoars(): Boar[] {
    const out: Boar[] = [];
    for (let i = 0; i < TUNE.boarPopulation; i += 1) {
        //  Spread around the inland forest ring, evenly, well away from the shore where the
        //  survivor lands. A castaway's first minutes must not contain a predator.
        const angle = (i / TUNE.boarPopulation) * Math.PI * 2 + TUNE.boarRingPhase;
        out.push({
            id: `boar${i + 1}`,
            x: Math.cos(angle) * TUNE.boarRingRadiusM,
            y: Math.sin(angle) * TUNE.boarRingRadiusM,
            homeX: Math.cos(angle) * TUNE.boarRingRadiusM,
            homeY: Math.sin(angle) * TUNE.boarRingRadiusM,
            facing: angle + Math.PI,
            stage: 'unaware',
            stageSinceGameHours: 0,
            chargeBearing: null,
            hunger: 0,
            alive: true,
        });
    }
    return out;
}

/** What a boar can perceive of the survivor, right now. */
export interface BoarSenses {
    distanceM: number;
    /** Inside the sight cone: near enough AND in front of it. */
    seen: boolean;
    /** Inside the hearing radius — works regardless of facing, and through cover. */
    heard: boolean;
    /** Close enough that nothing else matters; it knows. */
    crowded: boolean;
    /** Line of sight is broken — the survivor is behind the shelter, or a rock. */
    occluded: boolean;
}

/**
 * SENSE THE SURVIVOR. `occluded` is supplied by the caller because only the body knows what
 * is between them — the brain must never guess at geometry it cannot see, the same division
 * `siteIsViable` draws for construction.
 */
export function senseSurvivor(boar: Boar, state: GameState, occluded = false): BoarSenses {
    const dx = state.player.x - boar.x;
    const dy = state.player.y - boar.y;
    const distanceM = Math.hypot(dx, dy);
    const bearing = Math.atan2(dy, dx);
    let delta = Math.abs(normalizeAngle(bearing - boar.facing));
    if (delta > Math.PI) delta = Math.PI * 2 - delta;

    const inCone = delta <= TUNE.boarSightHalfAngleRad;
    return {
        distanceM,
        seen: !occluded && inCone && distanceM <= TUNE.boarSightRangeM,
        heard: distanceM <= TUNE.boarHearingRadiusM,
        crowded: distanceM <= TUNE.boarProximityRadiusM,
        occluded,
    };
}

/** Everything outside the boar that bears on what it does next. */
export interface ThreatContext {
    senses: BoarSenses;
    gameHoursElapsed: number;
    /** A lit fire or torch within its radius. Boars respect fire; this is the deter answer. */
    deterred: boolean;
}

/**
 * THE LADDER, as a pure transition. One stage per call, never two — a boar cannot skip from
 * `unaware` to `charge` however close the survivor gets, because skipping a stage is exactly
 * the un-telegraphed attack the contract forbids. That single-step rule is property-tested.
 */
export function nextStage(boar: Boar, ctx: ThreatContext): BoarStage {
    const held = ctx.gameHoursElapsed - boar.stageSinceGameHours;
    const noticed = ctx.senses.seen || ctx.senses.heard || ctx.senses.crowded;

    switch (boar.stage) {
        case 'unaware':
            return noticed ? 'alert' : 'unaware';

        case 'alert':
            //  Fire de-escalates. A survivor holding a torch is a problem the boar declines.
            if (ctx.deterred) return 'unaware';
            if (!noticed) return held >= TUNE.boarLoseInterestGameHours ? 'unaware' : 'alert';
            //  It escalates only once it has been bothered long enough to decide — the beat
            //  that gives a player time to back away before anything is committed.
            return held >= TUNE.boarAlertToWarningGameHours ? 'warning' : 'alert';

        case 'warning':
            if (ctx.deterred) return 'alert';
            if (!noticed) return 'alert';
            //  THE WIND-UP. `boarWarningGameHours` is the telegraph's duration and the single
            //  most important number in this file: it is how long the player has to read the
            //  snort and the ground-paw and get out of the way.
            return held >= TUNE.boarWarningGameHours ? 'charge' : 'warning';

        case 'charge':
            //  COMMITTED. Nothing de-escalates a charge; it runs its course. Fire does not
            //  stop it, distance does not stop it, and that is what makes the wind-up mean
            //  something rather than being a formality.
            return held >= TUNE.boarChargeGameHours ? 'aftermath' : 'charge';

        case 'aftermath':
            return held >= TUNE.boarAftermathGameHours ? 'alert' : 'aftermath';
    }
}

/**
 * MOVE ONE BOAR, for the stage it is in. Split from the ladder because they answer different
 * questions — what it has decided, and where that puts it.
 *
 * THE BUG THIS CLOSES: `stepBoar` returned `{...boar, stage, stageSinceGameHours,
 * chargeBearing}` and touched POSITION IN NO STATE AT ALL. Not the wander, not the stalk, and
 * not even the charge — a committed charge changed the boar's colour and posture and left it
 * standing exactly where it was. It looked like a rhythm system that forgot to move things;
 * it was actually a movement system that had never been written.
 *
 * `hunger` drives the wander's phase so the three boars do not drift in lockstep — a herd
 * moving as one body is the tell that there is no rhythm behind it.
 */
export function moveBoar(boar: Boar, gameHours: number): Boar {
    if (!boar.alive || gameHours <= 0) return boar;

    if (boar.stage === 'charge' && boar.chargeBearing !== null) {
        //  COMMITTED, and it must actually ARRIVE inside its own window. The bearing is not
        //  recomputed here — it is read. That is the whole of what "committed" means.
        const d = TUNE.boarChargeSpeedMPerGameHour * gameHours;
        return { ...boar, x: boar.x + Math.cos(boar.chargeBearing) * d, y: boar.y + Math.sin(boar.chargeBearing) * d };
    }

    if (boar.stage === 'alert' || boar.stage === 'warning') {
        //  Sizing you up, closing slowly. A boar frozen at 20m while snorting reads as
        //  broken rather than as menacing.
        const d = TUNE.boarStalkSpeedMPerGameHour * gameHours;
        return { ...boar, x: boar.x + Math.cos(boar.facing) * d, y: boar.y + Math.sin(boar.facing) * d };
    }

    //  UNAWARE / AFTERMATH: rooting about its own ground. Drifts on its facing, turns back
    //  when it reaches the edge of its territory, so it stays somewhere the player can learn.
    const d = TUNE.boarWanderSpeedMPerGameHour * gameHours;
    const nx = boar.x + Math.cos(boar.facing) * d;
    const ny = boar.y + Math.sin(boar.facing) * d;
    const fromHome = Math.hypot(nx - boar.homeX, ny - boar.homeY);
    if (fromHome > TUNE.boarWanderRadiusM) {
        //  Turn back toward home, with a little bias so it does not simply pace a line.
        const home = Math.atan2(boar.homeY - boar.y, boar.homeX - boar.x);
        return { ...boar, facing: home + (boar.hunger % 1) - 0.5 };
    }
    return { ...boar, x: nx, y: ny, hunger: boar.hunger + gameHours };
}

/**
 * FACE THE SURVIVOR once it knows about them. A boar that has noticed you and is looking
 * elsewhere is not menacing, and its sight cone would keep losing you for no reason.
 */
export function faceSurvivor(boar: Boar, px: number, py: number): Boar {
    return { ...boar, facing: Math.atan2(py - boar.y, px - boar.x) };
}

/** Advance one boar by one step. Pure: returns the next boar, never mutates. */
export function stepBoar(boar: Boar, ctx: ThreatContext): Boar {
    if (!boar.alive) return boar;
    const stage = nextStage(boar, ctx);
    if (stage === boar.stage) return boar;
    return {
        ...boar,
        stage,
        stageSinceGameHours: ctx.gameHoursElapsed,
        //  The bearing is FIXED at the moment of commitment and never recomputed. This one
        //  line is what "committed" means mechanically.
        chargeBearing: stage === 'charge'
            ? boar.facing
            : stage === 'aftermath' ? null : boar.chargeBearing,
    };
}

/**
 * DOES THIS CHARGE CONNECT? Read at the end of the charge, once, against where the survivor
 * actually is — so a player who moved off the committed bearing is genuinely missed.
 *
 * `boarChargeHitCorridorM` is a CORRIDOR, not a radius: the boar runs a line, and standing
 * out of that line is the evasion. A radius would make sidestepping worthless.
 */
export function chargeConnects(boar: Boar, state: GameState): boolean {
    if (boar.stage !== 'charge' || boar.chargeBearing === null) return false;
    const dx = state.player.x - boar.x;
    const dy = state.player.y - boar.y;
    const along = dx * Math.cos(boar.chargeBearing) + dy * Math.sin(boar.chargeBearing);
    if (along < 0 || along > TUNE.boarChargeReachM) return false;
    const across = Math.abs(-dx * Math.sin(boar.chargeBearing) + dy * Math.cos(boar.chargeBearing));
    return across <= TUNE.boarChargeHitCorridorM;
}

/** Harm from a connected charge. A NUMBER this drop — the injury profile is Drop 2's. */
export function chargeHarm(): { health: number; knockbackM: number } {
    return { health: TUNE.boarChargeDamage, knockbackM: TUNE.boarKnockbackM };
}

/**
 * D-011's ENFORCEMENT POINT. The only boar function reconcile's absence path may call.
 *
 * Every boar drops to `unaware` and walks home. Not "de-escalates one step" — all the way
 * down, every time, however long the absence. A player who closes the game mid-charge and
 * returns a week later finds a boar rooting quietly where it lives, because the alternative
 * is a predator that hunted them while they were not there.
 */
export function settleOffline(boars: Boar[], gameHoursElapsed: number): Boar[] {
    return boars.map((b) => (b.alive
        ? { ...b, stage: 'unaware' as BoarStage, stageSinceGameHours: gameHoursElapsed,
            chargeBearing: null, x: b.homeX, y: b.homeY }
        : b));
}

/** Is any living boar committed to a charge right now? Drives the HUD's own alarm. */
export function anyCharging(boars: Boar[]): boolean {
    return boars.some((b) => b.alive && b.stage === 'charge');
}

/** The nearest living boar, for the body's render-near-player gate and the verb circle. */
export function nearestBoar(boars: Boar[], x: number, y: number): Boar | null {
    let best: Boar | null = null;
    let bestD = Infinity;
    for (const b of boars) {
        if (!b.alive) continue;
        const d = Math.hypot(b.x - x, b.y - y);
        if (d < bestD) { best = b; bestD = d; }
    }
    return best;
}

function normalizeAngle(a: number): number {
    let out = a;
    while (out > Math.PI) out -= Math.PI * 2;
    while (out < -Math.PI) out += Math.PI * 2;
    return out;
}
