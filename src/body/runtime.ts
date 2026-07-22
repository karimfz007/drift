/**
 * BODY — the one bridge to the brain.
 *
 * Scenes never construct a Session or touch storage; they read this. It also owns the
 * two things only the body can know: the real wall clock, and the moment the player
 * actually got control (the zero point for every trace timing).
 */

import { SAVE_KEY, Session, createSaveRepository, type MorningReport } from '../brain';

export const runtime = {
    session: null as Session | null,
    /** The report for the absence that just ended, consumed once by the island scene. */
    pendingReport: null as MorningReport | null,
    isNewRun: true,
    /** True while a blocking overlay owns the screen. Read by the debug hook. */
    reportOpen: false,
    /** How many contextual hints have been shown this session, and the latest one. */
    hintsShown: 0,
    lastHint: '',
    /** Epoch ms at which the player gained control. Null until the cold open is dismissed. */
    controlGrantedAtMs: null as number | null
};

export function now(): number {
    return Date.now();
}

/** Boot the run. Called once, from the boot scene. */
export function startRuntime(): void {
    const started = Session.start(createSaveRepository(), now());
    runtime.session = started.session;
    runtime.pendingReport = started.report;
    runtime.isNewRun = started.isNewRun;
    installDebugHook();
}

/**
 * A local inspection handle on `window`. It reads and writes nothing but this device's
 * own single-player save, and it is what makes the device acceptance checks (and the
 * C3 audit) mechanical instead of anecdotal: tools/smoke.mjs drives the real canvas with
 * real touches and reads the truth back through here.
 */
function installDebugHook(): void {
    (window as unknown as Record<string, unknown>).__drift = {
        state: () => runtime.session?.state ?? null,
        reportOpen: () => runtime.reportOpen,
        hints: () => ({ shown: runtime.hintsShown, last: runtime.lastHint }),
        persist: () => runtime.session?.persist(now()),
        reset: () => localStorage.removeItem(SAVE_KEY)
    };
}

export function session(): Session {
    if (!runtime.session) throw new Error('Runtime not started');
    return runtime.session;
}

export function grantControl(): void {
    if (runtime.controlGrantedAtMs === null) runtime.controlGrantedAtMs = now();
}

/** Ms since the player got control — the denominator for every trace timing. */
export function msSinceControl(): number {
    if (runtime.controlGrantedAtMs === null) return 0;
    return now() - runtime.controlGrantedAtMs;
}

/**
 * Persist on every way a phone can take the page away: tab switch, app switch, lock,
 * navigation. `visibilitychange` + `pagehide` is the pair that actually fires on Android
 * Chrome and iOS Safari; `beforeunload` is unreliable on mobile and is not relied on.
 */
export function installLifecycleHooks(): void {
    const save = () => runtime.session?.persist(now());

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') save();
    });
    window.addEventListener('pagehide', save);
    window.addEventListener('blur', save);
}
