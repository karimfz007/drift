/**
 * BRAIN — the session: save ⇄ reconcile ⇄ state, with the real clock injected.
 *
 * The body owns no simulation. It calls `tick` every frame and `persist` when the page
 * goes away; everything else is this file talking to pure functions. Nothing here reads
 * the clock itself — `nowMs` is always passed in, which is what keeps it testable.
 */

import { composeMorningReport, type MorningReport } from './morningReport';
import { reconcile, type ReconcileOutcome } from './reconcile';
import { createInitialState, respawn } from './state';
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
        return this.handleDeath(outcome, nowMs);
    }

    /**
     * If the span killed the castaway, wake them ashore and persist immediately so the
     * death is never lost to a crash. Returns true if a death was actioned this tick.
     */
    private handleDeath(outcome: ReconcileOutcome, nowMs: number): boolean {
        if (!outcome.result.diedDuringSpan) return false;
        respawn(this.state, outcome.result.deathCause ?? 'your wounds');
        this.persist(nowMs);
        return true;
    }

    /** Clear the death overlay once the player has read it. */
    acknowledgeDeath(nowMs: number): void {
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
