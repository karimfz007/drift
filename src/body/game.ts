/**
 * BODY — the game: the render loop, the camera rig, and the wiring between a touch and
 * the brain that decides what it means.
 *
 * Every rule this file obeys comes from `/src/brain`, unchanged since Cycle 01. The only
 * thing that changed between the 2D build and this one is what happens *after* the brain
 * answers — which is exactly the claim the architecture was built to make (D-030).
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import '@babylonjs/core/Culling/ray';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

import {
    buildFire,
    canBuildFire,
    canFeedFire,
    distance,
    feedFire,
    fireBurnHoursRemaining,
    gatherNode,
    isFireLit,
    isSheltered,
    timeOfDay,
    type MorningReport
} from '../brain';
import { TUNE } from '../data/tune';
import { COLD_OPEN, WALKABLE_RADIUS } from '../data/world';
import { CUES, Cues } from './audio';
import { Controls } from './controls';
import { FireView, PlayerView, WoodViews, type NodeView } from './entities';
import { Hud, addSettingsButton, showColdOpen, showMorningReport, showSettings } from './hud';
import { Island } from './island';
import {
    grantControl,
    msSinceControl,
    now,
    recordBodyTrace,
    runtime,
    sampleFrame,
    session
} from './runtime';
import { RENDER } from './theme';

export class Game {
    private engine: Engine;
    private scene: Scene;
    private camera: FreeCamera;
    private island: Island;
    private player: PlayerView;
    private wood: WoodViews;
    private fire: FireView;
    private hud: Hud;
    private controls: Controls;
    private cues = new Cues();

    /** Camera orbit, in radians. Yaw is also the direction "forward" means. */
    private yaw = Math.PI;
    private pitch = 0.28;
    private facing = Math.PI;

    private holdNodeId: string | null = null;
    private holdStartedAt = 0;
    private lastActivityAt = now();
    private lastFrameAt = now();
    private consecutiveFailures = 0;
    private lookSensitivity: number = TUNE.lookSensitivity;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly overlay: HTMLElement
    ) {
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: false,
            stencil: false,
            powerPreference: 'high-performance'
        });
        //  A phone's device-pixel-ratio can be 3+; rendering every one of those pixels is
        //  the single easiest way to miss the frame-rate floor for no visible gain.
        this.engine.setHardwareScalingLevel(
            1 / Math.min(window.devicePixelRatio || 1, RENDER.maxDevicePixelRatio)
        );

        this.scene = new Scene(this.engine);
        //  A debug handle on the scene itself. It is what turned two silent rendering
        //  bugs into five-minute diagnoses this cycle (an invisible beach and a fire with
        //  no flame), and it costs one property on a local single-player game (D-032).
        (window as unknown as Record<string, unknown>).__driftScene = this.scene;
        this.scene.skipPointerMovePicking = true;

        this.camera = new FreeCamera('camera', new Vector3(0, 3, -6), this.scene);
        this.camera.minZ = 0.4;
        this.camera.maxZ = 320;
        //  Horizontal-fixed FOV, or a portrait phone is a telescope: with the default
        //  vertical-fixed mode a 0.45 aspect ratio squeezes the horizontal view to ~26°,
        //  which is why the first build felt like standing with your nose on the player.
        this.camera.fovMode = FreeCamera.FOVMODE_HORIZONTAL_FIXED;
        this.camera.fov = TUNE.cameraFovHorizontalRad;

        this.island = new Island(this.scene);
        this.player = new PlayerView(this.scene);
        this.fire = new FireView(this.scene);

        const state = session().state;
        this.wood = new WoodViews(this.scene, state.nodes, (x, z) => this.island.heightAt(x, z));
        this.lookSensitivity = readSensitivity();

        this.hud = new Hud(this.overlay, () => this.onActionButton());
        addSettingsButton(this.overlay, () => this.openSettings());

        this.controls = new Controls(this.canvas, this.overlay, {
            onPressWorld: (x, y) => this.onPressWorld(x, y),
            onReleaseWorld: () => this.cancelHold(),
            onTap: (x, y) => this.onTap(x, y),
            onActivity: () => {
                this.lastActivityAt = now();
                this.cues.unlock();
            }
        });

        this.placePlayerFromState();
        this.installDebugProjection();
        this.installLifecycle();
        void this.cues.load();
    }

    /** Expose the camera and a world→screen projection for the device harness (D-022). */
    private installDebugProjection(): void {
        runtime.cameraReadout = () => ({ yaw: this.yaw, pitch: this.pitch });
        runtime.projectToScreen = (worldX: number, worldZ: number) => {
            const y = this.island.heightAt(worldX, worldZ) + 0.4;
            const projected = Vector3.Project(
                new Vector3(worldX, y, worldZ),
                Matrix.Identity(),
                this.scene.getTransformMatrix(),
                this.camera.viewport.toGlobal(
                    this.engine.getRenderWidth(),
                    this.engine.getRenderHeight()
                )
            );
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = rect.width / this.engine.getRenderWidth();
            const scaleY = rect.height / this.engine.getRenderHeight();
            return { x: rect.left + projected.x * scaleX, y: rect.top + projected.y * scaleY };
        };
    }

    // ---- Boot ------------------------------------------------------------

    start(): void {
        this.engine.runRenderLoop(() => this.frame());
        window.addEventListener('resize', () => this.engine.resize());

        if (runtime.pendingReport) {
            const report = runtime.pendingReport;
            runtime.pendingReport = null;
            this.openReport(report);
        } else if (runtime.isNewRun) {
            this.openColdOpen();
        } else {
            grantControl();
        }
    }

    private openColdOpen(): void {
        runtime.panelOpen = true;
        this.controls.releaseAll();
        showColdOpen(this.overlay, COLD_OPEN.title, COLD_OPEN.body, () => {
            runtime.panelOpen = false;
            grantControl();
            this.cues.unlock();
            this.lastActivityAt = now();
            this.showHint('Driftwood on the sand. Walk over and take it.');
        });
    }

    private openReport(report: MorningReport): void {
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.cancelHold();
        grantControl();
        showMorningReport(this.overlay, report, () => {
            runtime.panelOpen = false;
            this.cues.unlock();
            this.lastActivityAt = now();
            session().markSteelThreadComplete();
            session().persist(now());
        });
    }

    private openSettings(): void {
        if (runtime.panelOpen) return;
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.cancelHold();
        showSettings(
            this.overlay,
            this.lookSensitivity,
            (value) => {
                this.lookSensitivity = value;
                writeSensitivity(value);
            },
            () => {
                runtime.panelOpen = false;
                this.lastActivityAt = now();
            }
        );
    }

    // ---- Input -----------------------------------------------------------

    /** Ray-pick under the finger, with a forgiving fallback to the nearest node. */
    private pickNode(screenX: number, screenY: number): NodeView | null {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const hit = this.scene.pick(x, y, (mesh: AbstractMesh) => mesh.isPickable);
        if (hit?.hit && hit.pickedMesh?.metadata?.nodeId) {
            const view = this.wood.find(hit.pickedMesh.metadata.nodeId as string);
            if (view?.node.available) return view;
        }

        //  Missed the mesh — but the ground under the finger may still be beside a node.
        //  `nodeTapSlack` is fat-finger forgiveness, and it is a difficulty number (D-026).
        if (hit?.hit && hit.pickedPoint) {
            const point = hit.pickedPoint;
            let best: NodeView | null = null;
            let bestDistance: number = TUNE.nodeTapSlack;
            for (const view of this.wood.views) {
                if (!view.node.available) continue;
                const d = distance(point.x, point.z, view.node.x, view.node.y);
                if (d <= bestDistance) {
                    best = view;
                    bestDistance = d;
                }
            }
            if (best) return best;
        }

        return null;
    }

    private pickedFire(screenX: number, screenY: number): boolean {
        const state = session().state;
        if (!state.fire.built) return false;
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top, (m: AbstractMesh) => m.isPickable);
        if (hit?.hit && hit.pickedMesh?.metadata?.fire) return true;
        if (hit?.hit && hit.pickedPoint) {
            return distance(hit.pickedPoint.x, hit.pickedPoint.z, state.fire.x, state.fire.y) <= TUNE.fireTapRadius;
        }
        return false;
    }

    /** A press: claim it only if it started a deadfall hold. */
    private onPressWorld(screenX: number, screenY: number): boolean {
        if (runtime.panelOpen) return false;

        const view = this.pickNode(screenX, screenY);
        if (!view || view.node.kind !== 'deadfall') return false;
        if (!this.inReach(view)) return false;

        this.holdNodeId = view.node.id;
        this.holdStartedAt = now();
        this.cues.play(CUES.target);
        this.cues.startBed(CUES.gather);
        return true;
    }

    private onTap(screenX: number, screenY: number): void {
        if (runtime.panelOpen) return;
        this.lastActivityAt = now();

        if (this.pickedFire(screenX, screenY)) {
            this.tryFeedFire();
            return;
        }

        const view = this.pickNode(screenX, screenY);
        if (!view) {
            //  Tapping empty ground is how you look around; it is not a failure.
            return;
        }

        if (!this.inReach(view)) {
            this.registerFailure('Too far. Walk closer, then tap it.');
            return;
        }

        if (view.node.kind === 'driftwood') {
            this.collect(view);
        } else {
            this.showHint('Press and hold the deadfall to break it free.');
        }
    }

    private inReach(view: NodeView): boolean {
        const state = session().state;
        return distance(state.player.x, state.player.y, view.node.x, view.node.y) <= TUNE.interactRadius;
    }

    // ---- Actions ---------------------------------------------------------

    private collect(view: NodeView): void {
        const gained = gatherNode(session().state, view.node.id);
        if (gained <= 0) return;

        this.wood.sync(session().state);
        this.cues.play(view.node.kind === 'driftwood' ? CUES.pickup : CUES.collected);
        this.floatText(`+${gained} wood`);

        session().markFirstWood(msSinceControl());
        session().persist(now());
        this.lastActivityAt = now();
        this.consecutiveFailures = 0;
        this.hud.hideHint();
    }

    private cancelHold(): void {
        this.holdNodeId = null;
        this.wood.hideHold();
        this.cues.stopBed(CUES.gather);
    }

    private stepHold(): void {
        if (!this.holdNodeId) return;

        const view = this.wood.find(this.holdNodeId);
        if (!view || !view.node.available || !this.inReach(view)) {
            this.cancelHold();
            return;
        }

        const progress = Math.min(1, (now() - this.holdStartedAt) / (TUNE.deadfallHoldSeconds * 1000));
        this.wood.showHold(view, progress, this.island.heightAt(view.node.x, view.node.y));

        if (progress >= 1) {
            this.cancelHold();
            this.collect(view);
        }
    }

    private onActionButton(): void {
        const state = session().state;
        if (!state.fire.built) {
            if (!canBuildFire(state)) {
                this.denied();
                return;
            }
            this.ignite();
            return;
        }
        this.tryFeedFire();
    }

    private ignite(): void {
        const state = session().state;
        //  Lay the fire in front of the castaway, not under them.
        const x = state.player.x + Math.sin(this.facing) * TUNE.fireBuildOffsetM;
        const z = state.player.y + Math.cos(this.facing) * TUNE.fireBuildOffsetM;
        if (!buildFire(state, x, z)) return;

        this.fire.flare();
        this.cues.play(CUES.ignition);
        this.cues.startBed(CUES.fireloop);
        this.flash();

        session().markFireLit(msSinceControl());
        session().persist(now());
        this.lastActivityAt = now();
        this.showHint('Stay in the firelight. Warmth is coming back.');
    }

    private tryFeedFire(): void {
        const state = session().state;
        if (!canFeedFire(state)) {
            this.denied();
            return;
        }
        feedFire(state);
        this.fire.flare();
        this.cues.play(CUES.collected);
        this.floatText('+2 hours');
        session().persist(now());
        this.lastActivityAt = now();
    }

    private denied(): void {
        const state = session().state;
        this.cues.play(CUES.denied);
        const short = Math.max(0, TUNE.woodPerFire - state.inventory.wood);
        this.showHint(
            state.fire.built
                ? 'No wood left. There is more at the treeline.'
                : `Not enough wood — ${short} more for a fire.`
        );
    }

    private registerFailure(message: string): void {
        session().markFailedTap();
        this.consecutiveFailures += 1;
        this.cues.play(CUES.denied);
        if (this.consecutiveFailures >= 2) {
            this.showHint(message);
            this.consecutiveFailures = 0;
        }
    }

    private showHint(message: string): void {
        runtime.hintsShown += 1;
        runtime.lastHint = message;
        this.hud.showHint(message, TUNE.hintVisibleSeconds);
    }

    private floatText(label: string): void {
        const element = document.createElement('div');
        element.className = 'float-text';
        element.textContent = label;
        this.overlay.appendChild(element);
        window.setTimeout(() => element.remove(), 900);
    }

    private flash(): void {
        const element = document.createElement('div');
        element.className = 'ignition-flash';
        this.overlay.appendChild(element);
        window.setTimeout(() => element.remove(), 420);
    }

    // ---- Frame -----------------------------------------------------------

    private frame(): void {
        const stamp = now();
        const deltaMs = stamp - this.lastFrameAt;
        this.lastFrameAt = stamp;
        sampleFrame(deltaMs);

        const s = session();
        s.tick(stamp);
        const state = s.state;

        if (!runtime.panelOpen) {
            this.stepMovement(Math.min(deltaMs, 100) / 1000);
            this.stepHold();
        }

        this.updateCamera();
        this.island.update(state.gameHoursElapsed);

        const groundAtFire = state.fire.built
            ? this.island.heightAt(state.fire.x, state.fire.y)
            : 0;
        this.fire.update(state, groundAtFire, this.nightFactor(state.gameHoursElapsed));

        this.wood.sync(state);
        this.wood.highlight(this.nearestInReach());

        this.paintHud(state);
        this.stepIdleHint();

        //  The frame rate is the *renderer's* business, so it is traced beside the save
        //  rather than inside it: adding a field to the brain's TraceState would have
        //  broken A1's zero-diff requirement for a number the brain has no opinion on.
        recordBodyTrace();

        this.scene.render();

        //  "Ready" means a frame actually reached the screen. Babylon's executeWhenReady
        //  waits on every material and particle system being ready, which in this scene
        //  never settled — and a readiness signal that can silently never fire is worse
        //  than none, because the harness and the splash both wait on it.
        if (!runtime.sceneReady) runtime.sceneReady = true;
    }

    private stepMovement(dt: number): void {
        const state = session().state;
        const stick = this.controls.read();
        if (stick.magnitude <= 0) return;

        //  Steering is camera-relative: "up the screen" always means "away from you".
        const forward = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        const move = forward
            .scale(-stick.y)
            .add(right.scale(stick.x))
            .normalize()
            .scale(TUNE.walkSpeedMps * stick.magnitude * dt);

        let x = state.player.x + move.x;
        let z = state.player.y + move.z;

        //  The sea is the edge of the world this cycle: slide along it rather than stop.
        const radius = Math.hypot(x, z);
        if (radius > WALKABLE_RADIUS) {
            const scale = WALKABLE_RADIUS / radius;
            x *= scale;
            z *= scale;
        }

        state.player.x = x;
        state.player.y = z;

        const heading = Math.atan2(move.x, move.z);
        this.facing = turnToward(this.facing, heading, TUNE.turnRateDegPerSecond * dt);

        session().markFirstMove(msSinceControl());
        this.lastActivityAt = now();

        //  Walking out of reach abandons a salvage in progress.
        if (this.holdNodeId) {
            const view = this.wood.find(this.holdNodeId);
            if (view && !this.inReach(view)) this.cancelHold();
        }
    }

    private updateCamera(): void {
        if (!runtime.panelOpen) {
            const look = this.controls.takeLook(this.lookSensitivity);
            this.yaw += look.yaw;
            this.pitch = clamp(
                this.pitch + look.pitch,
                (TUNE.cameraPitchMinDeg * Math.PI) / 180,
                (TUNE.cameraPitchMaxDeg * Math.PI) / 180
            );
        }

        this.placePlayerFromState();

        const state = session().state;
        const groundY = this.island.heightAt(state.player.x, state.player.y);
        const target = new Vector3(state.player.x, groundY + this.player.eyeHeight, state.player.y);

        const horizontal = Math.cos(this.pitch) * TUNE.cameraDistanceM;
        const height = Math.sin(this.pitch) * TUNE.cameraDistanceM + TUNE.cameraHeightM;

        const desired = new Vector3(
            state.player.x - Math.sin(this.yaw) * horizontal,
            groundY + height,
            state.player.y - Math.cos(this.yaw) * horizontal
        );

        //  Never let the camera end up underground on a slope.
        const groundAtCamera = this.island.heightAt(desired.x, desired.z);
        desired.y = Math.max(desired.y, groundAtCamera + 0.9);

        this.camera.position.copyFrom(desired);
        this.camera.setTarget(target);
    }

    private placePlayerFromState(): void {
        const state = session().state;
        const groundY = this.island.heightAt(state.player.x, state.player.y);
        this.player.place(state.player.x, groundY, state.player.y, this.facing);
    }

    private nearestInReach(): NodeView | null {
        const state = session().state;
        let best: NodeView | null = null;
        let bestDistance: number = TUNE.interactRadius;
        for (const view of this.wood.views) {
            if (!view.node.available) continue;
            const d = distance(state.player.x, state.player.y, view.node.x, view.node.y);
            if (d <= bestDistance) {
                best = view;
                bestDistance = d;
            }
        }
        return best;
    }

    /** 0 in full daylight, 1 in the dead of night — drives how hard the fire has to work. */
    private nightFactor(gameHoursElapsed: number): number {
        const { hourOfDay } = timeOfDay(gameHoursElapsed);
        if (hourOfDay >= 19 || hourOfDay < 4.5) return 1;
        if (hourOfDay >= 16.5) return (hourOfDay - 16.5) / 2.5;
        if (hourOfDay < 7) return 1 - (hourOfDay - 4.5) / 2.5;
        return 0;
    }

    private paintHud(state: ReturnType<typeof session>['state']): void {
        const sheltered = isSheltered(state);
        let goal: string;
        let action = { label: '', visible: false, ready: false };

        if (!state.fire.built) {
            const short = Math.max(0, TUNE.woodPerFire - state.inventory.wood);
            const ready = short === 0;
            goal = ready
                ? 'Enough wood. Build the fire where you stand.'
                : `Gather ${TUNE.woodPerFire} wood to build a fire.`;
            action = {
                label: ready ? 'Build fire' : `Build fire (${short} short)`,
                visible: state.inventory.wood > 0,
                ready
            };
        } else if (isFireLit(state)) {
            goal = `Fire burning — about ${fireBurnHoursRemaining(state).toFixed(1)} game hours of fuel left.`;
            action = { label: 'Add wood', visible: canFeedFire(state), ready: true };
        } else {
            goal = 'The fire is out. Add wood to bring it back.';
            action = { label: 'Add wood', visible: canFeedFire(state), ready: true };
        }

        this.hud.update({
            warmth: state.warmth,
            wood: state.inventory.wood,
            gameHoursElapsed: state.gameHoursElapsed,
            sheltered,
            goal,
            action
        });
    }

    private stepIdleHint(): void {
        if (runtime.panelOpen) return;
        if ((now() - this.lastActivityAt) / 1000 < TUNE.idleHintSeconds) return;
        this.lastActivityAt = now();
        this.showHint(this.contextualHint());
    }

    private contextualHint(): string {
        const state = session().state;
        if (!state.fire.built) {
            if (state.inventory.wood >= TUNE.woodPerFire) return 'You have enough. Build the fire.';
            const anyDriftwood = state.nodes.some((n) => n.available && n.kind === 'driftwood');
            return anyDriftwood
                ? 'Driftwood on the sand. Walk to it and tap it.'
                : 'The treeline has deadfall. Press and hold it.';
        }
        if (!isFireLit(state)) return 'The fire is out. Add wood.';
        if (!isSheltered(state)) return 'Stand in the firelight to warm up.';
        return 'You are warming. Close the app — the island keeps the time.';
    }

    // ---- Lifecycle -------------------------------------------------------

    private installLifecycle(): void {
        const save = () => session().persist(now());

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                save();
                this.cues.stopAllBeds();
                this.cues.setMuted(true);
                return;
            }

            this.cues.setMuted(false);
            const report = session().resume(now());
            this.lastFrameAt = now();
            this.wood.sync(session().state);
            if (isFireLit(session().state)) this.cues.startBed(CUES.fireloop);
            if (report && !runtime.panelOpen) this.openReport(report);
        });

        window.addEventListener('pagehide', save);
        window.addEventListener('blur', save);
    }
}

// ---- helpers ------------------------------------------------------------

const SENSITIVITY_KEY = 'drift.look.v1';

function readSensitivity(): number {
    try {
        const raw = localStorage.getItem(SENSITIVITY_KEY);
        const value = raw === null ? NaN : Number(raw);
        return Number.isFinite(value) && value > 0 ? value : TUNE.lookSensitivity;
    } catch {
        return TUNE.lookSensitivity;
    }
}

function writeSensitivity(value: number): void {
    try {
        localStorage.setItem(SENSITIVITY_KEY, String(value));
    } catch {
        /* storage refused; the setting simply will not persist */
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Turn `from` toward `to` by at most `maxDegrees`, the short way round. */
function turnToward(from: number, to: number, maxDegrees: number): number {
    const maxRadians = (maxDegrees * Math.PI) / 180;
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return from + clamp(delta, -maxRadians, maxRadians);
}
