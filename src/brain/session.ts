/**
 * BRAIN — the session: save ⇄ reconcile ⇄ state, with the real clock injected.
 *
 * The body owns no simulation. It calls `tick` every frame and `persist` when the page
 * goes away; everything else is this file talking to pure functions. Nothing here reads
 * the clock itself — `nowMs` is always passed in, which is what keeps it testable.
 */

import { TUNE } from '../data/tune';
import { realSecondsFromGameHours } from './clock';
import { recordTrying } from './knowledge';
import { composeMorningReport, type MorningReport } from './morningReport';
import { reconcile, type ReconcileOutcome } from './reconcile';
import { canSleep, createInitialState, isFireLit, isShelteredSleep, updateCavePresence } from './state';
import { chargeConnects, chargeHarm, faceSurvivor, moveBoar, senseSurvivor, stepBoar } from './fauna';
import { injuriesFromCharge, stepInjuries } from './injury';
import { onsetFrom, stepIllness } from './illness';
import { thermalStrain } from './thermal';
import { pruneDropped } from './dropped';
import { closeSurvivor } from './succession';
import { narrateArrival, reviewDeath, type DeathReview } from './deathReview';
import { deserialize, serialize, type SaveRepository } from './save';
import type { ControlMode, GameState } from './types';

export interface SessionStart {
    session: Session;
    /** The story of the absence, if the absence was long enough to have one. */
    report: MorningReport | null;
    /** True when this is a brand-new run and the cold open should play. */
    isNewRun: boolean;
}

export class Session {
    constructor(
        private readonly repo: SaveRepository,
        public state: GameState
    ) {}

    /**
     * The review of the death just suffered, and the arrival that follows it. Held here
     * rather than in `GameState` on purpose: this is a thing the player is SHOWN once, not a
     * fact about the world, and putting it in the save would mean a returning player is
     * greeted by a death they already read. `lastDeathCause` in the state is what survives a
     * reload, and it is deliberately only enough to know an overlay is owed.
     */
    private pendingReview: DeathReview | null = null;
    private pendingArrival: string[] = [];

    /**
     * Load the save (or start a fresh run) and fold in the absence.
     * This is the only place a returning player's missing time is accounted for.
     */
    static start(repo: SaveRepository, nowMs: number): SessionStart {
        const envelope = deserialize(repo.read());

        if (!envelope) {
            const session = new Session(repo, createInitialState(nowMs));
            session.persist(nowMs);
            return { session, report: null, isNewRun: true };
        }

        const loaded = envelope.state;
        const elapsedRealSeconds = Math.max(0, (nowMs - envelope.savedAtMs) / 1000);
        const { state, result } = reconcile(loaded, elapsedRealSeconds);
        state.lastSeenMs = nowMs;

        const session = new Session(repo, state);
        const report = composeMorningReport(result, state);
        //  Seeing a report with a fire standing is the thread closing. Never un-closes.
        if (report && state.fire.built) session.state.trace.steelThreadComplete = true;
        session.persist(nowMs);

        return { session, report, isNewRun: false };
    }

    /**
     * Come back from a backgrounded tab. Same absence maths as `start`, but without a
     * reload — Android Chrome keeps the page alive when the player switches apps, so
     * this is the path the director's playtest actually takes.
     */
    resume(nowMs: number): MorningReport | null {
        const elapsedRealSeconds = (nowMs - this.state.lastSeenMs) / 1000;
        if (!(elapsedRealSeconds > 0)) {
            this.state.lastSeenMs = nowMs;
            return null;
        }

        const { state, result } = reconcile(this.state, elapsedRealSeconds);
        state.trace = this.state.trace;
        state.lastSeenMs = nowMs;
        this.state = state;

        const report = composeMorningReport(result, state);
        this.persist(nowMs);
        return report;
    }

    /**
     * Advance the world to `nowMs`. Same maths as a three-day absence, smaller number —
     * except this is the online path, so a death here is real: reconcile reports it and
     * we wake the castaway ashore (offline can never reach this; its floors forbid it).
     */
    tick(nowMs: number): boolean {
        const elapsedRealSeconds = (nowMs - this.state.lastSeenMs) / 1000;
        if (!(elapsedRealSeconds > 0)) {
            this.state.lastSeenMs = nowMs;
            return false;
        }
        const outcome = reconcile(this.state, elapsedRealSeconds);
        outcome.state.trace = this.state.trace;
        outcome.state.trace.activeMs += elapsedRealSeconds * 1000;
        outcome.state.lastSeenMs = nowMs;
        this.state = outcome.state;
        //  DROP 1 — the boars live on the ONLINE tick and nowhere else. Their ladder is
        //  advanced here, never in the absence path, which is D-011's enforcement stated as
        //  structure rather than as a check: there is no code path by which a boar escalates
        //  while the game is closed.
        this.advanceBoars(nowMs, outcome.result.elapsedGameHours);
        //  Item 2 — dropped stacks weather away on the ONLINE tick and nowhere else. There
        //  is deliberately no absence-path counterpart: absence never erases, and a stack on
        //  the ground is the survivor's property exactly as the store box's contents are.
        pruneDropped(this.state);
        return this.handleDeath(outcome, nowMs);
    }

    /**
     * Sleep at the shelter (Cycle 05 §4): a voluntary, `sleepDurationGameHours`-long
     * absence, using the *exact same* reconcile path a real backgrounding already uses —
     * no parallel time-skip system, no new risk to the offline-death-impossible property
     * (A1), which this span rides on unmodified. `sleepDurationGameHours` real-seconds
     * comfortably exceeds `morningReportMinRealSeconds`, so this is always the OFFLINE,
     * floored path: sleeping is a deliberate retreat to safety, and inherits the same
     * guarantee a real absence already has. **That "always qualifies" property is also why
     * `resting` has to be honoured independently of the absence classification** — see
     * reconcile.ts's fatigue branch and C3 finding B1.
     *
     * Energy RECOVERS at a rate on waking (Ch.6, D-058) — it is no longer refilled outright,
     * which is what this doc comment said through C05. Everything else drifts exactly as an
     * absence of that length would. Returns null if not near a built shelter.
     */
    sleep(nowMs: number): MorningReport | null {
        if (!canSleep(this.state)) return null;

        const elapsedRealSeconds = realSecondsFromGameHours(TUNE.sleepDurationGameHours);
        //  Ch.6 (D-058) — THE REST REDESIGN. C05 ran this span and then set
        //  `energy = energyMax` outright: an instant jump to full, no matter how long the
        //  sleep or how empty the castaway started. That line is gone. `resting` is now
        //  raised for the duration of the span, and reconcile recovers energy and warmth at
        //  a RATE over the elapsed game hours (`energyRecoveryPerGameHourResting` /
        //  `warmthRecoveryPerGameHourResting`, both scaled by `sleepRecoveryMultiplier`),
        //  shedding fatigue as it goes. A sleep from empty therefore may genuinely NOT
        //  reach full — and sleeping is bounded by the same `energyMax` ceiling everything
        //  else clamps to, so there is no infinite-recovery exploit in sleeping repeatedly.
        //  The flag is cleared immediately after the span: `resting` is a transient of this
        //  action, never a mode the player is left sitting in.
        const sleepingState = { ...this.state, resting: true };
        const outcome = reconcile(sleepingState, elapsedRealSeconds);
        outcome.state.trace = this.state.trace;
        outcome.state.resting = false;
        outcome.state.lastSeenMs = nowMs;
        this.state = outcome.state;
        //  "Drinking/eating/sleeping/warmth/fire -> Survivalcraft" (Ch.2 item 4).
        recordTrying(this.state, 'survivalcraft');

        this.handleDeath(outcome, nowMs);
        const report = composeMorningReport(outcome.result, this.state);
        this.persist(nowMs);
        return report;
    }

    /**
     * DEATH, COMMITTED (Slice 3). The survivor ends; a different person washes ashore into
     * everything they built.
     *
     * LAW 29 — TECHNICAL UNCERTAINTY SUSPENDS DEATH, and the ORDER below is how that law is
     * kept rather than merely cited:
     *
     *   1. The review is built FIRST, from the body as it was. Afterwards that body is gone,
     *      and a review assembled later would describe the wrong person.
     *   2. `closeSurvivor` computes the ENTIRE next state in one pure pass. Nothing is
     *      mutated while it runs, so there is no moment where the survivor is dead and the
     *      island is half-rewritten.
     *   3. The swap is one assignment, then the write. A crash before the assignment loses
     *      the death — the survivor lives, which is the safe direction and the one the law
     *      demands. A crash after it has already persisted the whole thing.
     *
     *   **Fault recovery, never rollback**: what a fault may cost is the commit, not the
     *   truth. There is no path here that resurrects a survivor whose death has landed.
     */
    private handleDeath(outcome: ReconcileOutcome, nowMs: number): boolean {
        if (!outcome.result.diedDuringSpan) return false;
        const cause = outcome.result.deathCause ?? 'your wounds';

        //  (1) Read the dying body while it still exists.
        this.pendingReview = reviewDeath(this.state, cause);

        //  (2) Compute everything. Pure — `this.state` is untouched until the next line.
        const { next, record } = closeSurvivor(this.state, cause);

        //  (3) One assignment, then the write.
        this.state = next;
        this.pendingArrival = narrateArrival(this.state, record);
        this.persist(nowMs);
        return true;
    }

    /** The review of the death just suffered, then the arrival that follows it. */
    takeDeathReview(): { review: DeathReview; arrival: string[] } | null {
        if (this.pendingReview === null) return null;
        const out = { review: this.pendingReview, arrival: this.pendingArrival };
        return out;
    }

    /**
     * SPEND GAME HOURS ON AN ACT THAT TAKES TIME. The world moves while you do it.
     *
     * Runs the SAME `reconcile` path everything else does, for the equivalent real seconds —
     * no parallel time-skip, so an hour spent writing costs exactly what an hour of standing
     * still costs, and cannot become a loophole that advances the clock for free. It is
     * deliberately NOT the sleep path: `resting` stays false, because writing is not rest.
     *
     * A death during the span is handled, so an act that takes time can genuinely kill you if
     * you begin it in a state that could not afford it. That is the honest behaviour: the
     * game must not quietly protect a player from a decision it let them make.
     */
    spendGameHours(gameHours: number, nowMs: number): void {
        if (!(gameHours > 0)) return;
        const outcome = reconcile(this.state, realSecondsFromGameHours(gameHours));
        outcome.state.trace = this.state.trace;
        outcome.state.lastSeenMs = nowMs;
        this.state = outcome.state;
        this.handleDeath(outcome, nowMs);
        this.persist(nowMs);
    }

    /**
     * ADVANCE EVERY BOAR ONE STEP, and resolve any charge that has run its course.
     *
     * Coarse-grained on purpose: this is a rhythm read once per tick, not per-frame AI. The
     * body renders what this decides; it never decides anything itself.
     */
    private advanceBoars(nowMs: number, gameHours: number): void {
        const s = this.state;
        if (s.boars.length === 0) return;
        const deterred = isFireLit(s)
            && Math.hypot(s.fire.x - s.player.x, s.fire.y - s.player.y) <= TUNE.boarFireDeterRadiusM
            || (s.torch.owned && s.torch.lit);

        let harmed = 0;
        const next = s.boars.map((boar) => {
            if (!boar.alive) return boar;
            const wasCharging = boar.stage === 'charge';
            const senses = senseSurvivor(boar, s);
            //  Turn to face the survivor the moment it knows about them — otherwise its own
            //  sight cone keeps losing them and it oscillates between alert and unaware.
            const oriented = (senses.seen || senses.heard || senses.crowded)
                && boar.stage !== 'charge'
                ? faceSurvivor(boar, s.player.x, s.player.y)
                : boar;
            const stepped = moveBoar(stepBoar(oriented, {
                senses,
                gameHoursElapsed: s.gameHoursElapsed,
                deterred,
            }), gameHours);
            //  THE CHARGE RESOLVES AT ITS END, once, against where the survivor ACTUALLY is —
            //  so a player who read the wind-up and stepped off the committed bearing is
            //  genuinely missed. Resolving continuously would make the sidestep pointless.
            if (wasCharging && stepped.stage === 'aftermath' && chargeConnects(boar, s)) {
                harmed += chargeHarm().health;
            }
            return stepped;
        });
        s.boars = next;
        if (harmed > 0) {
            s.health = Math.max(0, s.health - harmed);
            //  DROP 2 — and it leaves something behind. Drop 1 stopped at the number on
            //  purpose; this is the other half of the same hit.
            s.injuries = injuriesFromCharge(s.injuries, harmed);
            this.persist(nowMs);
        }
        //  Bleeding costs health over time, ONLINE only. The absence path clots everything
        //  (see reconcile), so this is the only place a wound can ever cost anything.
        const bled = stepInjuries(s.injuries, gameHours);
        if (bled.healthLost > 0 || bled.next !== s.injuries) {
            s.injuries = bled.next;
            if (bled.healthLost > 0) s.health = Math.max(0, s.health - bled.healthLost);
        }

        //  DROP 3 — ILLNESS, ONLINE ONLY, for the same reason and by the same shape.
        //
        //  SLEEP IS THE TREATMENT (item 4), and it is the SHIPPED rest model doing the work
        //  rather than a second one: `restQuality` is 0 awake, 1 in a proper shelter, and
        //  `groundSleepRecoveryMultiplier` on the bare ground — the exact term reconcile
        //  already uses to recover energy. A warm dry bed heals an illness faster because it
        //  is already the better bed, in the number the game already keeps.
        //  THE CAVE (Drop 3 Part 2 item 2). Read BEFORE the illness step, because sheltering
        //  in one changes the night the body is living through and the chill test below reads
        //  that night. Ordering these the other way would let a survivor who just walked into
        //  a cave accrue one more span of exposure they were no longer in.
        updateCavePresence(s);

        const restQuality = s.resting ? (isShelteredSleep(s) ? 1 : TUNE.groundSleepRecoveryMultiplier) : 0;
        const sickened = stepIllness(s.illness, gameHours, restQuality);
        if (sickened.healthLost > 0 || sickened.next !== s.illness) {
            s.illness = sickened.next;
            if (sickened.healthLost > 0) s.health = Math.max(0, s.health - sickened.healthLost);
        }

        //  ONSET, from the two causes that accrue over TIME rather than at a moment. Bad water
        //  and spoiled food land where they are swallowed (see `drinkAtPond`/`eat`); these two
        //  are conditions the survivor is living in, so they are read each span.
        const chill = thermalStrain(s.warmth) === 'hypothermic' && s.wet > TUNE.wetIllnessThreshold;
        if (chill) s.illness = onsetFrom(s, 'chill', gameHours * TUNE.chillExposurePerGameHour);
        if (s.fatigue >= TUNE.fatigueIllnessThreshold) {
            s.illness = onsetFrom(s, 'exhaustion', gameHours * TUNE.exhaustionExposurePerGameHour);
        }
    }

    /** Clear the death overlay once the player has read it. */
    acknowledgeDeath(nowMs: number): void {
        this.pendingReview = null;
        this.pendingArrival = [];
        if (this.state.lastDeathCause === null) return;
        this.state.lastDeathCause = null;
        this.persist(nowMs);
    }

    /** Write the save. Called on visibilitychange/pagehide, and after any real change. */
    persist(nowMs: number): void {
        this.state.lastSeenMs = nowMs;
        this.repo.write(serialize(this.state, nowMs));
    }

    setControlMode(mode: ControlMode, nowMs: number): void {
        if (this.state.settings.controlMode === mode) return;
        this.state.settings.controlMode = mode;
        this.state.trace.controlModeSwitches += 1;
        this.persist(nowMs);
    }

    // ---- Local playtest trace (localStorage only; no external service) ----

    markFirstMove(msSinceControl: number): void {
        if (this.state.trace.msToFirstMove === null) {
            this.state.trace.msToFirstMove = Math.round(msSinceControl);
        }
    }

    markFirstWood(msSinceControl: number): void {
        if (this.state.trace.msToFirstWood === null) {
            this.state.trace.msToFirstWood = Math.round(msSinceControl);
        }
    }

    markFireLit(msSinceControl: number): void {
        if (this.state.trace.msToFireLit === null) {
            this.state.trace.msToFireLit = Math.round(msSinceControl);
        }
    }

    markFirstDrink(msSinceControl: number): void {
        if (this.state.trace.msToFirstDrink === null) {
            this.state.trace.msToFirstDrink = Math.round(msSinceControl);
        }
    }

    markFirstCraft(msSinceControl: number): void {
        if (this.state.trace.msToFirstCraft === null) {
            this.state.trace.msToFirstCraft = Math.round(msSinceControl);
        }
    }

    markFailedTap(): void {
        this.state.trace.failedInteractionTaps += 1;
    }

    markSteelThreadComplete(): void {
        this.state.trace.steelThreadComplete = true;
    }
}
