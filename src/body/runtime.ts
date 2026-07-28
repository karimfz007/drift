/**
 * BODY — the one bridge to the brain, carried over from Cycle 01 and extended with the
 * frame-rate probe the 3D pivot needs (A3/A7).
 *
 * Scenes never construct a Session or touch storage; they read this. It also owns the two
 * things only the body can know: the real wall clock, and the moment the player actually
 * got control (the zero point for every trace timing).
 */

import { SAVE_KEY, Session, createSaveRepository, salvageCandidatePoint, spawnSalvageNode, type MorningReport } from '../brain';
import { isPlaceablePoint } from '../data/world';
import { RENDER } from './theme';

export const runtime = {
    session: null as Session | null,
    /** The report for the absence that just ended, consumed once by the game. */
    pendingReport: null as MorningReport | null,
    isNewRun: true,
    /** True while a blocking overlay owns the screen. Read by the debug hook. */
    panelOpen: false,
    //  How many times the freeze backstop had to take control back because a panel held it
    //  without ever showing itself (URGENT FIX, 2026-07-27). Above zero is always a defect:
    //  the recovery keeps the player playing, the count is what makes the bug impossible to
    //  ship silently, and the harness asserts it stays 0.
    panelRecoveries: 0,
    /** How many contextual hints have been shown, and the latest one. */
    hintsShown: 0,
    lastHint: '',
    /** True once the 3D scene has rendered its first frame — the harness waits on this. */
    sceneReady: false,
    /** Epoch ms at which the player gained control. Null until the cold open is dismissed. */
    controlGrantedAtMs: null as number | null,
    /** Installed by the game; used only by the debug hook. */
    cameraReadout: (() => ({ yaw: 0, pitch: 0 })) as () => { yaw: number; pitch: number },
    projectToScreen: (() => null) as (x: number, z: number) => { x: number; y: number } | null,
    groundAt: (() => 0) as (x: number, z: number) => number,
    playerFeetY: (() => 0) as () => number,
    //  The direct-world tap intention, for the harness's range-gate regression (D-042/A4).
    pendingReadout: (() => null) as () => { kind: string; id?: string } | null,
    intend: (() => {}) as (id: string) => void,
    //  Harness-fidelity mandate (D-050): the same text the settings panel's "Copy debug
    //  info" button copies to the clipboard, readable directly so a regression can assert
    //  on its content without touching clipboard permissions at all.
    debugInfo: (() => '') as () => string,
    //  Render-cost readout (D-059), installed by the game like the probes above. Tree parity
    //  converted 14 decorative thin-instances into real interactive nodes — thin instances
    //  batch into one draw call per source, a real node is its own mesh — so the swap is not
    //  free, and the harness reports the actual number rather than the as-built guessing.
    renderCost: (() => null) as () => { totalMeshes: number; pickableMeshes: number; activeMeshes: number } | null,
    //  D-063: installed by the game; runs the real `tryCombine` and persists the result.
    tryCombine: (() => null) as (a: string, b: string) => unknown,
    //  D-065: what a tap at this screen point WOULD target, with no side effect. The
    //  shelter's tappable band cannot be measured any other way — see `tapTargetAt`.
    tapTargetAt: (() => null) as (screenX: number, screenY: number) => string | null,
    //  What the LAST REAL tap actually resolved to. The probe above answers "what would a
    //  tap here hit"; this answers "what did the tap the player just made actually do".
    //  Comparing them is the only way to catch the two paths drifting apart, which they
    //  have now done three times (C3 finding A9).
    lastTapOutcome: (() => null) as () => string | null,
    //  Slice 1 feel-court: whether the last movement frame touched an obstacle, whether the
    //  dead-on deflection fired, and how many frames of each. A READ, not a driver — the
    //  harness still moves the player with real touch input (hazard #4). Without this an
    //  on-device check can see that the player moved but not WHY, and "it slid" and "it was
    //  never actually blocked" look identical from the outside.
    slideReadout: (() => ({ contact: false, deflected: false, contactFrames: 0, deflectFrames: 0 })) as
        () => { contact: boolean; deflected: boolean; contactFrames: number; deflectFrames: number },
    //  Installed by the game — see the `stick`/`velocity` debug hooks above.
    stickReadout: (() => ({ x: 0, y: 0, magnitude: 0 })) as () => { x: number; y: number; magnitude: number },
    velocityReadout: (() => ({ x: 0, z: 0 })) as () => { x: number; z: number },
    //  Gate 0 sweep: the camera's actual field of view, in degrees, read from the live
    //  camera rather than from the tune table — so the check tests what is rendered.
    fovReadout: (() => 0) as () => number,
    //  Item 6 (quarry three-taps): the tap path is already exonerated — per-tap data shows
    //  two of three taps setting a real pending node intention. What is not visible from
    //  outside is whether the HOLD then starts, runs and completes. This reads that.
    holdReadout: (() => null) as () => { nodeId: string | null; elapsedMs: number; needSeconds: number } | null
};

// ---- Frame-rate probe ---------------------------------------------------

const frameSamples: number[] = [];
const frameTimes: number[] = [];

/** Record one frame's instantaneous FPS and its frame time. Called from the render loop. */
export function sampleFrame(deltaMs: number): void {
    if (deltaMs <= 0) return;
    frameSamples.push(1000 / deltaMs);
    if (frameSamples.length > RENDER.fpsSampleWindow) frameSamples.shift();
    //  Frame TIME, not rate: the jank the p95 budget (A3, C04) actually measures. A single
    //  long frame is a stutter you feel; the p95 catches whether stutters are the norm.
    frameTimes.push(deltaMs);
    if (frameTimes.length > RENDER.fpsSampleWindow) frameTimes.shift();
}

/** The 95th-percentile frame time (ms) over the rolling window — the jank metric (A3). */
export function frameTimeP95(): number {
    if (frameTimes.length === 0) return 0;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    return Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10;
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
        panelRecoveries: () => runtime.panelRecoveries,
        hints: () => ({ shown: runtime.hintsShown, last: runtime.lastHint }),
        sceneReady: () => runtime.sceneReady,
        fps: () => ({
            median: fpsMedian(),
            onePercentLow: fpsOnePercentLow(),
            p95FrameMs: frameTimeP95(),
            samples: frameSampleCount()
        }),
        bodyTrace: () => readBodyTrace(),
        renderCost: () => runtime.renderCost(),
        //  D-063: drive a real Try-Combining attempt through the actual brain path, so the
        //  harness exercises the shipped verb rather than a re-implementation of it.
        tryCombine: (a: string, b: string) => runtime.tryCombine(a, b),
        tapTargetAt: (x: number, y: number) => runtime.tapTargetAt(x, y),
        lastTapOutcome: () => runtime.lastTapOutcome(),
        slideReadout: () => runtime.slideReadout(),
        //  D-064: the harness drives the REAL spawn and the REAL placement validator, so its
        //  reachability check exercises the shipped rule rather than re-deriving it.
        spawnSalvage: (seed: number) => spawnSalvageNode(seed),
        //  D-066(a): the harness must be able to WITNESS the blocked-spawn branch on device,
        //  not merely observe that a rescued node exists. This is the raw candidate, before
        //  placement validation — if it is placeable, the rescue path never ran.
        salvageCandidate: (seed: number) => salvageCandidatePoint(seed),
        //  Part 2 diagnostic: the live stick vector and player velocity. The movement
        //  hard-block shows a player moving 0.5 m and then stopping dead with no panel open
        //  and no obstacle in reach; distinguishing "stick went to zero" from "stick held but
        //  movement was refused" cannot be done from outside the input layer.
        stick: () => runtime.stickReadout(),
        velocity: () => runtime.velocityReadout(),
        fov: () => runtime.fovReadout(),
        hold: () => runtime.holdReadout(),
        isPlaceable: (x: number, z: number) => isPlaceablePoint(x, z),
        //  Helpers the device harness needs to aim a thumb in three dimensions and to
        //  verify grounding (A6): where a world point lands on screen, the camera facing,
        //  the analytic ground height, and the player mesh's feet (D-022).
        camera: () => runtime.cameraReadout(),
        screenOf: (worldX: number, worldZ: number) => runtime.projectToScreen(worldX, worldZ),
        groundAt: (worldX: number, worldZ: number) => runtime.groundAt(worldX, worldZ),
        playerFeetY: () => runtime.playerFeetY(),
        //  Read/inject the direct-world tap intention (the range-gate regression, A4).
        pending: () => runtime.pendingReadout(),
        intend: (nodeId: string) => runtime.intend(nodeId),
        debugInfo: () => runtime.debugInfo(),
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
