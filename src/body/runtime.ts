/**
 * BODY — the one bridge to the brain, carried over from Cycle 01 and extended with the
 * frame-rate probe the 3D pivot needs (A3/A7).
 *
 * Scenes never construct a Session or touch storage; they read this. It also owns the two
 * things only the body can know: the real wall clock, and the moment the player actually
 * got control (the zero point for every trace timing).
 */

import { SAVE_KEY, Session, airCapacityOf, atBoat, boatStage, boatUnderstanding, createSaveRepository, depthAt, diveStageOf, handsUnderstand, ladderFor, junkSites, manualUnderstands, salvageCandidatePoint, spawnSalvageNode, traceSites, type MorningReport } from '../brain';
import { BOAT, DIVE_SITE, FAR_ISLAND, MANUALS, isPlaceablePoint } from '../data/world';
import { RENDER } from './theme';

/**
 * One movement frame, exactly as the resolver saw it. Everything a diagnosis of the feel
 * court needs and no position sample can supply — see `runtime.pressTrace`.
 *
 * Flat numbers on purpose: this crosses `page.evaluate()`'s structured-clone boundary into
 * a node script, and a shape that survives `JSON.stringify` unchanged is one less thing that
 * can be wrong about a measurement four sessions have already been wrong about.
 */
export interface PressFrame {
    /** ms since `arm()`. */
    t: number;
    dt: number;
    /** Position BEFORE the step, and after. */
    fromX: number; fromZ: number;
    toX: number; toZ: number;
    /** The stick, and the world-space direction it asked for (zero when released). */
    stickMag: number;
    wantX: number; wantZ: number;
    /** Intent velocity after acceleration — what the resolver was handed. */
    velX: number; velZ: number;
    /** The contact normal, the inward component, and the tangential remainder. */
    normalX: number; normalZ: number;
    into: number;
    residualX: number; residualZ: number;
    /** What the resolver actually applied (post dead-on substitution). */
    outVelX: number; outVelZ: number;
    contacted: boolean;
    deflected: boolean;
    /** 2+ means the contact was a notch, whatever the staging check believed. */
    overlaps: number;
    nearestX: number; nearestZ: number;
    /**
     * Surface-to-surface gap to the nearest obstacle after resolution. Zero or below means
     * touching. C3 N1: this was missing from the first cut, which meant the trace could not
     * re-witness the very quantity the second cause turns out to BE — a mover that has left
     * contact while still leaning on the thing. A diagnostic that cannot show the defect it
     * found is half an instrument.
     */
    nearestGapM: number;
    /** Distance this single frame actually moved — the path integral's increment. */
    movedM: number;
    /** The hysteresis hint the resolver was given, i.e. whether contact carried over. */
    hintX: number; hintZ: number;
}

export const runtime = {
    session: null as Session | null,
    /** The report for the absence that just ended, consumed once by the game. */
    pendingReport: null as MorningReport | null,
    isNewRun: true,
    /** True while a blocking overlay owns the screen. Read by the debug hook. */
    panelOpen: false,
    /** Where the last HOLD gesture actually stopped, step by step. Read by the harness so a
     *  gesture that silently declines names its own decision point instead of costing a run. */
    holdTrace: [] as string[],
    /**
     * POINTER-LEVEL EVENT LOG (D-101's named lead). Every pointerdown, pointerup and
     * releaseAll, in order, with the branch each took. Two sessions of reasoning about this
     * path produced real eliminations and no cause; the instruction was to confirm or kill
     * the releaseAll hypothesis with the ACTUAL event log rather than more argument, so this
     * is that log. Bounded so it can never grow without limit in a long session.
     */
    pointerLog: [] as string[],
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
    /** Aim at a mesh's own drawn centre — the height-agnostic path. See game.ts's header. */
    screenOfMesh: (() => null) as (meshName: string) => { x: number; y: number } | null,
    meshSizeM: (() => null) as (meshName: string) => { x: number; y: number; z: number } | null,
    /** A rendered mesh's own transform — the cue as DRAWN, not the state behind it. */
    meshInfo: (() => null) as (meshName: string) => { enabled: boolean; rotZ: number; scaleZ: number; y: number } | null,
    ghostReadout: (() => ({ shown: false, valid: false })) as () => { shown: boolean; valid: boolean },
    groundAt: (() => 0) as (x: number, z: number) => number,
    playerFeetY: (() => 0) as () => number,
    //  THE MARITIME SLICE. The camera's own world height, READ ONLY. Added because a swimmer
    //  is drawn at the sea surface over an eight-metre seabed, and "the camera rides the
    //  water rather than following the floor down" is a claim about a rendered position that
    //  yaw and pitch cannot answer. A harness check written against a hook that did not exist
    //  silently skipped — which is [[D-066]] (a) exactly, in my own section.
    cameraPositionReadout: (() => ({ x: 0, y: 0, z: 0 })) as () => { x: number; y: number; z: number },
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
    refuge: (() => ({ reductionPct: 0, status: 'none', line: '' })) as
        () => { reductionPct: number; status: string; line: string },
    slideReadout: (() => ({ contact: false, deflected: false, contactFrames: 0, deflectFrames: 0 })) as
        () => { contact: boolean; deflected: boolean; contactFrames: number; deflectFrames: number },
    //  THE PRESS TRACE (C1's diagnostic ruling). `slideReadout` above answers "did the branch
    //  fire" and a position sample answers "where did they end up" — and four sessions have
    //  proved those two together cannot tell a decayed tangent from a healthy one that goes
    //  nowhere from a ruler that is lying. This records EVERY movement frame between `arm()`
    //  and `dump()`: the stick's world direction, the intent velocity, the contact normal, the
    //  tangential component the resolver computed, the resolution it applied, and the position
    //  either side of the step.
    //
    //  Read-only, and armed-only: nothing is recorded until a diagnostic asks, and nothing
    //  recorded is ever read back by the game. Hazard #4 is about hooks DRIVING a path; this
    //  drives nothing — the thumb still holds the stick.
    pressTrace: {
        arm: (() => {}) as (capacity?: number) => void,
        dump: (() => []) as () => PressFrame[],
    },
    //  Every obstacle the resolver can actually see, within a radius of a point. The feel
    //  court's "the obstacle under test is ISOLATED" check computes a gap from the HARNESS's
    //  own hand-copied radii and looks at the storage box alone — it cannot see a decorative
    //  tree or rock, which are in `staticObstacles` and just as solid. This reads the real
    //  field, so "isolated" becomes something witnessed rather than assumed.
    obstaclesNear: (() => []) as (x: number, z: number, within: number) =>
        { x: number; z: number; radius: number }[],
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
        holdTrace: () => runtime.holdTrace,
        pointerLog: () => runtime.pointerLog,
        clearPointerLog: () => { runtime.pointerLog = []; },
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
        armPressTrace: (capacity?: number) => runtime.pressTrace.arm(capacity),
        dumpPressTrace: () => runtime.pressTrace.dump(),
        obstaclesNear: (x: number, z: number, within: number) => runtime.obstaclesNear(x, z, within),
        //  F3: the brain's own refuge numbers, so a device check can prove the screen is
        //  showing THEM rather than a second copy that can drift. A read, never a driver.
        refuge: () => runtime.refuge(),
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
        //  THE PLACEMENT GHOST, for the bar's two device-only properties. It READS the ghost's
        //  real render state — whether the mesh is enabled and which colour it is actually
        //  wearing — rather than reporting what the code intended. Hazard #4 (D-075) allows a
        //  hook to READ; the harness still has to DRIVE the gesture with real taps, and the
        //  one-tap property is meaningless if a hook could open or commit it.
        ghost: () => runtime.ghostReadout(),
        //  Helpers the device harness needs to aim a thumb in three dimensions and to
        //  verify grounding (A6): where a world point lands on screen, the camera facing,
        //  the analytic ground height, and the player mesh's feet (D-022).
        camera: () => runtime.cameraReadout(),
        screenOf: (worldX: number, worldZ: number) => runtime.projectToScreen(worldX, worldZ),
    //  The height-agnostic aim. Read-only ([[D-075]]): it computes a screen point and performs
    //  no action — the tap that follows is still a real tap.
    screenOfMesh: (meshName: string) => runtime.screenOfMesh(meshName),
    meshSizeM: (meshName: string) => runtime.meshSizeM(meshName),
    //  ENTROPY & MAINTENANCE (v0.11 §8) — a rendered mesh's own state, READ-ONLY ([[D-075]]).
    //
    //  The dossier's objection to a durability bar is that a number is not something a
    //  survivor can SEE, so the check that matters is whether the CUE reached the screen —
    //  not whether the state that should have driven it is correct. Reading the mesh rather
    //  than the state is the difference between witnessing the fix and witnessing the intent.
    meshInfo: (meshName: string) => runtime.meshInfo(meshName),
    //  RAIN & WET ESCALATION — READ-ONLY ([[D-075]]). It answers what the sky is doing and
    //  when the next one is due; it cannot start, stop or advance a storm. The harness stages
    //  weather through the save exactly as it stages everything else.
    storm: () => {
        const st = runtime.session?.state;
        return st ? { ...st.storm } : null;
    },
    /**
     * SET THE WEATHER — a state edit that has to land AFTER boot, and the reason is the model
     * working correctly rather than a gap in it.
     *
     * The harness stages everything else through `editSave`, which writes the save and
     * reloads. A reload is an ABSENCE, and an absence ENDS a storm — deliberately, because
     * nobody stood in the rain for eight hours. So the one thing `editSave` structurally
     * cannot stage is weather: every storm it writes is cleared by the boot it triggers.
     *
     * THIS IS NOT A HOOK THAT DRIVES A PLAYER PATH ([[D-075]]). There is no player path to
     * drive: a storm is not tapped, chosen or reached — it arrives on a clock. What this
     * replaces is a SIXTY-GAME-HOUR WAIT, the same way `intend` replaces an unhittable
     * projected tap. Every consequence downstream — the announcement reaching the screen, the
     * wetting, what a roof does about it, the aftermath — is still measured through real ticks
     * against the real model.
     */
    setStorm: (stage: string, inStageGameHours = 0, nextAtGameHours?: number) => {
        const st = runtime.session?.state;
        if (!st) return null;
        st.storm = {
            stage: stage as typeof st.storm.stage,
            inStageGameHours,
            //  Settable so the harness can poise a CLEAR sky on the brink, and let the real
            //  tick start the precursor — which is the only way its announcement fires.
            nextAtGameHours: nextAtGameHours ?? st.storm.nextAtGameHours,
        };
        return { ...st.storm };
    },
    //  ---- THE FAR ISLAND ([[D-126]]) — READ-ONLY, per the player-path law [[D-075]] ----
    //
    //  Each of these answers a question about the WORLD — where the island is, what sites are
    //  on it, what rung a recipe sits at for this survivor. None of them performs an action,
    //  and the harness section that uses them still reads every trace with a real tap. A hook
    //  that DROVE the reading would prove the brain works and say nothing about whether a
    //  human can reach it, which is exactly the gap standing hazard 4 is named after.
    farIsland: () => ({ x: FAR_ISLAND.x, y: FAR_ISLAND.y, radius: FAR_ISLAND.radius }),
    //  ---- THE UNDERWATER SLICE — READ-ONLY, same rule ----
    //
    //  Where the site is and how deep it is. Neither goes under, neither surfaces, neither
    //  spends a breath: the harness section still submerges by TAPPING a submerged part with a
    //  real finger and comes up by pressing the real button. A hook that dived for the player
    //  would prove the air budget works and say nothing about whether a human can reach it.
    diveSite: () => ({ x: DIVE_SITE.x, y: DIVE_SITE.y, depthM: depthAt(DIVE_SITE.x, DIVE_SITE.y) }),
    //  ---- FISHING — READ-ONLY, per the player-path law [[D-075]] ----
    //
    //  Where the sites are, how deep, and what state their population is in; and what the
    //  survivor currently has in the water. None of these fishes: the harness still crafts
    //  through a real Build-panel tap, casts through a real tap on the ring, and sets and
    //  hauls through real taps on real circle segments. A hook that fished would prove the
    //  brain works and say nothing about whether a thumb can reach it.
    fishingSpots: () => {
        const st = runtime.session?.state;
        if (!st) return [];
        return st.nodes.filter((n) => n.kind === 'fishingspot').map((n) => ({
            id: n.id, x: n.x, y: n.y,
            depthM: depthAt(n.x, n.y),
            state: n.available ? 'present' : 'locally-depleted',
            pool: n.pool ?? 0,
        }));
    },
    fishing: () => {
        const st = runtime.session?.state;
        if (!st) return null;
        return {
            line: st.fishing.line ? { ...st.fishing.line } : null,
            net: st.fishing.net ? { ...st.fishing.net } : null,
            fish: st.inventory.fish,
            hasLine: st.tools.fishingLine,
            hasNet: st.tools.net,
            freshLeft: st.freshUntil.fish ?? null,
        };
    },
    depthAtPoint: (worldX: number, worldZ: number) => depthAt(worldX, worldZ),
    //  The live air budget and stage, so a check can say WHY it is red. `stage` is the brain's
    //  own word for it, not a second copy the harness derives and lets drift.
    dive: () => {
        const st = runtime.session?.state;
        if (!st) return null;
        return {
            submerged: st.dive.submerged,
            air: st.dive.air,
            capacity: airCapacityOf(st.capacities),
            deepestM: st.dive.deepestM,
            stage: diveStageOf(st),
        };
    },
    //  THE JUNK & FLAVOUR CATALOGUE (Ch.3) — READ-ONLY, per [[D-075]]. It answers where the
    //  objects are and whether each holds a note; it never reads one, never inspects one, and
    //  never records one. The harness still taps every single object with a real finger.
    junkSites: () => junkSites().map((j) => ({
        id: j.id, x: j.x, y: j.y, kind: j.kind, hasNote: j.note !== null,
    })),
    //  DROP 4 — THE BROKEN FISHING BOAT. READ-ONLY, per [[D-075]]. It answers where she is,
    //  what stage she is at, and which routes the survivor has actually taken. It does NOT
    //  inspect her: the harness walks a real survivor over and taps the hull with a finger,
    //  and everything the check reads afterwards comes off the screen, not off this hook.
    boat: () => {
        const st = runtime.session?.state;
        return {
            x: BOAT.x,
            y: BOAT.y,
            stage: boatStage(),
            bearingToFarIsland: Math.atan2(FAR_ISLAND.x - BOAT.x, FAR_ISLAND.y - BOAT.y),
            manualId: MANUALS[0]?.id ?? null,
            ...(st
                ? {
                    inRange: atBoat(st),
                    understanding: boatUnderstanding(st),
                    byManual: manualUnderstands(st),
                    byHands: handsUnderstand(st),
                }
                : { inRange: false, understanding: null, byManual: false, byHands: false }),
        };
    },
    traceSites: () => traceSites().map((t) => ({
        id: t.id, x: t.x, y: t.y, kind: t.kind, topic: t.topic, goods: { ...t.goods },
    })),
    ladderFor: (recipeId: string) => {
        const st = runtime.session?.state;
        return st ? ladderFor(st, recipeId) : null;
    },
        groundAt: (worldX: number, worldZ: number) => runtime.groundAt(worldX, worldZ),
        playerFeetY: () => runtime.playerFeetY(),
        cameraPosition: () => runtime.cameraPositionReadout(),
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
