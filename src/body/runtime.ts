/**
 * BODY — the one bridge to the brain, carried over from Cycle 01 and extended with the
 * frame-rate probe the 3D pivot needs (A3/A7).
 *
 * Scenes never construct a Session or touch storage; they read this. It also owns the two
 * things only the body can know: the real wall clock, and the moment the player actually
 * got control (the zero point for every trace timing).
 */

import { SAVE_KEY, Session, createSaveRepository, type MorningReport } from '../brain';
import { RENDER } from './theme';

export const runtime = {
    session: null as Session | null,
    /** The report for the absence that just ended, consumed once by the game. */
    pendingReport: null as MorningReport | null,
    isNewRun: true,
    /** True while a blocking overlay owns the screen. Read by the debug hook. */
    panelOpen: false,
    /** How many contextual hints have been shown, and the latest one. */
    hintsShown: 0,
    lastHint: '',
    /** True once the 3D scene has rendered its first frame — the harness waits on this. */
    sceneReady: false,
    /** Epoch ms at which the player gained control. Null until the cold open is dismissed. */
    controlGrantedAtMs: null as number | null,
    /** Installed by the game; used only by the debug hook. */
    cameraReadout: (() => ({ yaw: 0, pitch: 0 })) as () => { yaw: number; pitch: number },
    projectToScreen: (() => null) as (x: number, z: number) => { x: number; y: number } | null
};

// ---- Frame-rate probe ---------------------------------------------------

const frameSamples: number[] = [];

/** Record one frame's instantaneous FPS. Called from the render loop. */
export function sampleFrame(deltaMs: number): void {
    if (deltaMs <= 0) return;
    frameSamples.push(1000 / deltaMs);
    if (frameSamples.length > RENDER.fpsSampleWindow) frameSamples.shift();
}

/**
 * The median of the rolling window. Median, not mean, on purpose: one 400 ms hitch while
 * a texture uploads should not be able to describe how the game felt for the other 239
 * frames — and equally, it must not be hidden if it is happening constantly.
 */
export function fpsMedian(): number {
    if (frameSamples.length === 0) return 0;
    const sorted = [...frameSamples].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    return Math.round(median * 10) / 10;
}

/** The worst 1% frame, in FPS — the number that actually describes a stutter. */
export function fpsOnePercentLow(): number {
    if (frameSamples.length < 20) return fpsMedian();
    const sorted = [...frameSamples].sort((a, b) => a - b);
    return Math.round(sorted[Math.floor(sorted.length * 0.01)] * 10) / 10;
}

export function frameSampleCount(): number {
    return frameSamples.length;
}

/**
 * The body's own slice of the playtest trace, written beside the save rather than inside
 * it. The brain has no opinion on frame rate, and Cycle 02's A1 requires its TraceState to
 * stay byte-identical — so the renderer keeps its own numbers in its own key (D-033).
 */
const BODY_TRACE_KEY = 'drift.trace.body.v1';
let lastTraceWriteAt = 0;

export function recordBodyTrace(): void {
    const stamp = now();
    if (stamp - lastTraceWriteAt < 2000) return;
    lastTraceWriteAt = stamp;
    try {
        localStorage.setItem(
            BODY_TRACE_KEY,
            JSON.stringify({
                fpsMedian: fpsMedian(),
                fpsOnePercentLow: fpsOnePercentLow(),
                samples: frameSampleCount(),
                devicePixelRatio: window.devicePixelRatio,
                updatedAtMs: stamp
            })
        );
    } catch {
        /* storage refused; the frame rate is still readable live via __drift.fps() */
    }
}

export function readBodyTrace(): unknown {
    try {
        const raw = localStorage.getItem(BODY_TRACE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// ---- Session ------------------------------------------------------------

export function now(): number {
    return Date.now();
}

export function startRuntime(): void {
    const started = Session.start(createSaveRepository(), now());
    runtime.session = started.session;
    runtime.pendingReport = started.report;
    runtime.isNewRun = started.isNewRun;
    installDebugHook();
}

/**
 * A local inspection handle on `window`. It reads and writes nothing but this device's
 * own single-player save, and it is what makes the device acceptance checks (and the C3
 * audit) mechanical instead of anecdotal — `tools/smoke.mjs` drives the real canvas with
 * real touches and reads the truth back through here (D-022).
 */
function installDebugHook(): void {
    (window as unknown as Record<string, unknown>).__drift = {
        state: () => runtime.session?.state ?? null,
        panelOpen: () => runtime.panelOpen,
        hints: () => ({ shown: runtime.hintsShown, last: runtime.lastHint }),
        sceneReady: () => runtime.sceneReady,
        fps: () => ({
            median: fpsMedian(),
            onePercentLow: fpsOnePercentLow(),
            samples: frameSampleCount()
        }),
        bodyTrace: () => readBodyTrace(),
        //  Two small helpers the device harness needs to aim a thumb in three dimensions:
        //  where a world point lands on screen, and which way the camera is facing.
        //  Without them the harness would have to guess at pixels (D-022).
        camera: () => runtime.cameraReadout(),
        screenOf: (worldX: number, worldZ: number) => runtime.projectToScreen(worldX, worldZ),
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
