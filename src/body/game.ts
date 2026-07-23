/**
 * BODY — the game: the render loop, the camera rig, collision, and the wiring between a
 * touch and the brain that decides what it means.
 *
 * Every rule this file obeys comes from `/src/brain`. Cycle 03 adds a lot of verbs — drink,
 * eat, forage, craft, chop, open the box, die and wake — but each is the same shape: the
 * body asks the brain, the brain answers, the body draws it and plays a cue.
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import '@babylonjs/core/Culling/ray';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

import {
    axeShortfall,
    buildFire,
    canBuildFire,
    canCraftAxe,
    canDrinkAtPond,
    canDrinkFlask,
    canFeedFire,
    canFillFlask,
    craftAxe,
    distance,
    drinkAtPond,
    drinkFlask,
    eat,
    feedFire,
    fillFlask,
    fireBurnHoursRemaining,
    gatherNode,
    isAtPond,
    isFireLit,
    isSheltered,
    nodeHoldSeconds,
    nodeSpec,
    timeOfDay,
    type Food,
    type GatherResult,
    type MorningReport
} from '../brain';
import { TUNE } from '../data/tune';
import { COLD_OPEN, POND, WALKABLE_RADIUS, WRECK } from '../data/world';
import { CUES, Cues, type CueKey } from './audio';
import { Controls } from './controls';
import { FireView, NodeViews, PlayerView, type NodeView } from './entities';
import {
    addSettingsButton,
    Hud,
    levelToast,
    showColdOpen,
    showCraftCard,
    showDeath,
    showMorningReport,
    showSettings
} from './hud';
import { Island } from './island';
import { grantControl, msSinceControl, now, recordBodyTrace, runtime, sampleFrame, session } from './runtime';
import { RENDER } from './theme';

export class Game {
    private engine: Engine;
    private scene: Scene;
    private camera: FreeCamera;
    private island: Island;
    private player: PlayerView;
    private nodes: NodeViews;
    private fire: FireView;
    private hud: Hud;
    private controls: Controls;
    private cues = new Cues();

    private yaw = Math.PI;
    private pitch = 0.28;
    private facing = Math.PI;

    private holdNodeId: string | null = null;
    private holdStartedAt = 0;
    private drinkHolding = false;
    private drinkAccumMs = 0;

    private lastActivityAt = now();
    private lastFrameAt = now();
    private consecutiveFailures = 0;
    private lookSensitivity: number = TUNE.lookSensitivity;
    private deathShown = false;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly overlay: HTMLElement
    ) {
        this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, powerPreference: 'high-performance' });
        this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, RENDER.maxDevicePixelRatio));

        this.scene = new Scene(this.engine);
        (window as unknown as Record<string, unknown>).__driftScene = this.scene;
        this.scene.skipPointerMovePicking = true;

        this.camera = new FreeCamera('camera', new Vector3(0, 3, -6), this.scene);
        this.camera.minZ = 0.4;
        this.camera.maxZ = 520;
        this.camera.fovMode = FreeCamera.FOVMODE_HORIZONTAL_FIXED;
        this.camera.fov = TUNE.cameraFovHorizontalRad;

        this.island = new Island(this.scene);
        this.player = new PlayerView(this.scene);
        this.fire = new FireView(this.scene);

        const state = session().state;
        this.nodes = new NodeViews(this.scene, state.nodes, (x, z) => this.island.heightAt(x, z));
        this.lookSensitivity = readSensitivity();

        this.hud = new Hud(this.overlay, () => this.onPrimaryAction(), () => this.onSecondaryAction());
        addSettingsButton(this.overlay, () => this.openSettings());

        this.controls = new Controls(this.canvas, this.overlay, {
            onPressWorld: (x, y) => this.onPressWorld(x, y),
            onReleaseWorld: () => this.onReleaseWorld(),
            onTap: (x, y) => this.onTap(x, y),
            onActivity: () => { this.lastActivityAt = now(); this.cues.unlock(); }
        });

        this.placePlayerFromState();
        this.installDebugProjection();
        this.installLifecycle();
        void this.cues.load();
    }

    private installDebugProjection(): void {
        runtime.cameraReadout = () => ({ yaw: this.yaw, pitch: this.pitch });
        runtime.groundAt = (x, z) => this.island.heightAt(x, z);
        runtime.playerFeetY = () => this.player.feetY;
        runtime.projectToScreen = (worldX: number, worldZ: number) => {
            const y = this.island.heightAt(worldX, worldZ) + 0.4;
            const projected = Vector3.Project(
                new Vector3(worldX, y, worldZ),
                Matrix.Identity(),
                this.scene.getTransformMatrix(),
                this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
            );
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: rect.left + projected.x * (rect.width / this.engine.getRenderWidth()),
                y: rect.top + projected.y * (rect.height / this.engine.getRenderHeight())
            };
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
        showSettings(this.overlay, this.lookSensitivity,
            (value) => { this.lookSensitivity = value; writeSensitivity(value); },
            () => { runtime.panelOpen = false; this.lastActivityAt = now(); });
    }

    // ---- Picking ---------------------------------------------------------

    private pickNode(screenX: number, screenY: number): NodeView | null {
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top, (m: AbstractMesh) => m.isPickable);
        if (hit?.hit && hit.pickedMesh?.metadata?.nodeId) {
            const view = this.nodes.find(hit.pickedMesh.metadata.nodeId as string);
            if (view?.node.available) return view;
        }
        if (hit?.hit && hit.pickedPoint) {
            const p = hit.pickedPoint;
            let best: NodeView | null = null;
            let bestD: number = TUNE.nodeTapSlack;
            for (const view of this.nodes.views) {
                if (!view.node.available) continue;
                const d = distance(p.x, p.z, view.node.x, view.node.y);
                if (d <= bestD) { best = view; bestD = d; }
            }
            if (best) return best;
        }
        return null;
    }

    private pickedPond(screenX: number, screenY: number): boolean {
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top, (m: AbstractMesh) => m.isPickable);
        if (hit?.hit && hit.pickedMesh?.metadata?.pond) return true;
        if (hit?.hit && hit.pickedPoint) return distance(hit.pickedPoint.x, hit.pickedPoint.z, POND.x, POND.y) <= POND.radius + TUNE.pondTapSlack;
        return false;
    }

    private pickedFire(screenX: number, screenY: number): boolean {
        const state = session().state;
        if (!state.fire.built) return false;
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top, (m: AbstractMesh) => m.isPickable);
        if (hit?.hit && hit.pickedMesh?.metadata?.fire) return true;
        if (hit?.hit && hit.pickedPoint) return distance(hit.pickedPoint.x, hit.pickedPoint.z, state.fire.x, state.fire.y) <= TUNE.fireTapRadius;
        return false;
    }

    // ---- Input -----------------------------------------------------------

    /** A press claims the gesture only if it starts a hold — a deadfall/tree/rock/palm salvage, or a drink. */
    private onPressWorld(screenX: number, screenY: number): boolean {
        if (runtime.panelOpen) return false;

        //  Holding on the pond, while close and thirsty, drinks.
        if (this.pickedPond(screenX, screenY) && canDrinkAtPond(session().state)) {
            this.drinkHolding = true;
            this.drinkAccumMs = 0;
            this.cues.startBed(CUES.gather);
            return true;
        }

        const view = this.pickNode(screenX, screenY);
        if (!view) return false;
        if (nodeSpec(view.node.kind).interaction !== 'hold') return false;
        if (!this.inReach(view)) return false;
        if (nodeSpec(view.node.kind).needsAxe && !session().state.tools.axe) {
            this.registerFailure('You need an axe for that.');
            return false;
        }

        this.holdNodeId = view.node.id;
        this.holdStartedAt = now();
        this.cues.play(CUES.target);
        this.cues.startBed(CUES.gather);
        return true;
    }

    private onReleaseWorld(): void {
        this.cancelHold();
    }

    private onTap(screenX: number, screenY: number): void {
        if (runtime.panelOpen) return;
        this.lastActivityAt = now();

        if (this.pickedFire(screenX, screenY)) { this.tryFeedFire(); return; }

        const view = this.pickNode(screenX, screenY);
        if (!view) return; // empty ground / look

        if (!this.inReach(view)) { this.registerFailure('Too far. Walk closer, then tap it.'); return; }

        const spec = nodeSpec(view.node.kind);
        if (spec.needsAxe && !session().state.tools.axe) {
            this.registerFailure(view.node.kind === 'crashbox' ? 'The box is sealed. You need an axe.' : 'You need an axe for that.');
            return;
        }
        if (spec.interaction === 'tap') {
            this.gather(view);
        } else {
            this.showHint(view.node.kind === 'crashbox' ? 'Press and hold the box to break it open.' : 'Press and hold to work it free.');
        }
    }

    private inReach(view: NodeView): boolean {
        const s = session().state;
        return distance(s.player.x, s.player.y, view.node.x, view.node.y) <= TUNE.interactRadius;
    }

    // ---- Gathering -------------------------------------------------------

    private cancelHold(): void {
        this.holdNodeId = null;
        this.drinkHolding = false;
        this.nodes.hideHold();
        this.cues.stopBed(CUES.gather);
    }

    private stepHold(): void {
        if (this.drinkHolding) { this.stepDrink(); return; }
        if (!this.holdNodeId) return;

        const view = this.nodes.find(this.holdNodeId);
        if (!view || !view.node.available || !this.inReach(view)) { this.cancelHold(); return; }

        const seconds = nodeHoldSeconds(session().state, view.node);
        const progress = Math.min(1, (now() - this.holdStartedAt) / (seconds * 1000));
        this.nodes.showHold(view, progress, this.island.heightAt(view.node.x, view.node.y));

        if (progress >= 1) {
            const done = view;
            this.cancelHold();
            this.gather(done);
        }
    }

    private stepDrink(): void {
        const s = session().state;
        if (!canDrinkAtPond(s)) { this.cancelHold(); return; }
        this.drinkAccumMs += now() - this.lastFrameAt < 0 ? 0 : Math.min(now() - this.lastFrameAt, 100);
        //  A sip every ~700 ms of holding at the pond.
        if (this.drinkAccumMs >= 700) {
            this.drinkAccumMs = 0;
            if (drinkAtPond(s)) {
                this.cues.play(CUES.drink);
                session().markFirstDrink(msSinceControl());
                session().persist(now());
                this.lastActivityAt = now();
            }
            if (!canDrinkAtPond(s)) this.cancelHold(); // full
        }
    }

    private gather(view: NodeView): void {
        const result = gatherNode(session().state, view.node.id);
        if (!result.ok) {
            if (result.reason === 'need-axe') this.registerFailure('You need an axe for that.');
            return;
        }
        this.nodes.sync(session().state);
        this.playGatherCue(result);
        this.floatText(this.gainLabel(result));

        if (result.gained.wood) session().markFirstWood(msSinceControl());
        if (result.foundFlask) this.showHint('A water flask — fill it at the pond and carry a drink inland.');
        if (result.levelsGained > 0 && result.skill) {
            const level = session().state.skills[result.skill].level;
            levelToast(this.overlay, result.skill === 'woodcutting' ? 'Woodcutting' : 'Foraging', level);
        }

        session().persist(now());
        this.lastActivityAt = now();
        this.consecutiveFailures = 0;
        this.hud.hideHint();
    }

    private playGatherCue(result: GatherResult): void {
        const cue: CueKey =
            result.kind === 'tree' ? CUES.fell
            : result.kind === 'crashbox' ? CUES.unlock
            : result.kind === 'driftwood' || result.kind === 'shellfish' || result.kind === 'berrybush' ? CUES.pickup
            : CUES.collected;
        this.cues.play(cue);
    }

    private gainLabel(result: GatherResult): string {
        const parts: string[] = [];
        const g = result.gained;
        if (g.wood) parts.push(`+${g.wood} wood`);
        if (g.stone) parts.push(`+${g.stone} stone`);
        if (g.fiber) parts.push(`+${g.fiber} fibre`);
        if (g.berries) parts.push(`+${g.berries} berries`);
        if (g.coconut) parts.push(`+${g.coconut} coconut`);
        if (g.shellfish) parts.push(`+${g.shellfish} shellfish`);
        if (result.foundFlask) parts.push('+ flask');
        return parts.join('  ');
    }

    // ---- The action buttons ---------------------------------------------

    private onPrimaryAction(): void {
        const s = session().state;
        if (isAtPond(s) && canDrinkAtPond(s)) { if (drinkAtPond(s)) { this.cues.play(CUES.drink); session().markFirstDrink(msSinceControl()); session().persist(now()); } return; }
        if (canCraftAxe(s) || (!s.tools.axe && (s.inventory.wood > 0 || s.inventory.stone > 0 || s.inventory.fiber > 0))) { this.openCraftCard(); return; }
        if (!s.fire.built) { if (canBuildFire(s)) this.ignite(); else this.deniedFire(); return; }
        this.tryFeedFire();
    }

    private onSecondaryAction(): void {
        const s = session().state;
        //  At the pond: fill the flask. Away: drink from a full flask, else eat.
        if (canFillFlask(s)) { if (fillFlask(s)) { this.cues.play(CUES.drink); this.floatText('flask filled'); session().persist(now()); this.lastActivityAt = now(); } return; }
        if (canDrinkFlask(s)) { if (drinkFlask(s)) { this.cues.play(CUES.drink); session().persist(now()); this.lastActivityAt = now(); } return; }
        const food = this.bestFood();
        if (food) { if (eat(s, food)) { this.cues.play(CUES.eat); this.floatText(`ate ${food}`); session().persist(now()); this.lastActivityAt = now(); } }
    }

    private bestFood(): Food | null {
        const s = session().state;
        if (s.hunger >= TUNE.hungerMax) return null;
        if (s.inventory.shellfish > 0) return 'shellfish';
        if (s.inventory.coconut > 0) return 'coconut';
        if (s.inventory.berries > 0) return 'berries';
        return null;
    }

    private openCraftCard(): void {
        if (runtime.panelOpen) return;
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.cancelHold();
        const s = session().state;
        showCraftCard(this.overlay, { wood: s.inventory.wood, stone: s.inventory.stone, fiber: s.inventory.fiber },
            () => {
                runtime.panelOpen = false;
                if (craftAxe(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the axe is yours');
                    session().markFirstCraft(msSinceControl());
                    session().persist(now());
                    this.showHint('Now the standing trees — and that sealed box — will answer.');
                }
                this.lastActivityAt = now();
            },
            () => { runtime.panelOpen = false; this.lastActivityAt = now(); });
    }

    private ignite(): void {
        const s = session().state;
        const x = s.player.x + Math.sin(this.facing) * TUNE.fireBuildOffsetM;
        const z = s.player.y + Math.cos(this.facing) * TUNE.fireBuildOffsetM;
        if (!buildFire(s, x, z)) return;
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
        const s = session().state;
        if (!canFeedFire(s)) { this.deniedFire(); return; }
        feedFire(s);
        this.fire.flare();
        this.cues.play(CUES.collected);
        this.floatText(`+${TUNE.fireBurnGameHoursPerWood} hours`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    private deniedFire(): void {
        const s = session().state;
        this.cues.play(CUES.denied);
        const short = Math.max(0, TUNE.woodPerFire - s.inventory.wood);
        this.showHint(s.fire.built ? 'No wood left. Fell a tree for more.' : `Not enough wood — ${short} more for a fire.`);
    }

    private registerFailure(message: string): void {
        session().markFailedTap();
        this.consecutiveFailures += 1;
        this.cues.play(CUES.denied);
        if (this.consecutiveFailures >= 2) { this.showHint(message); this.consecutiveFailures = 0; }
    }

    private showHint(message: string): void {
        runtime.hintsShown += 1;
        runtime.lastHint = message;
        this.hud.showHint(message, TUNE.hintVisibleSeconds);
    }

    private floatText(label: string): void {
        if (!label) return;
        const el = document.createElement('div');
        el.className = 'float-text';
        el.textContent = label;
        this.overlay.appendChild(el);
        window.setTimeout(() => el.remove(), 900);
    }

    private flash(): void {
        const el = document.createElement('div');
        el.className = 'ignition-flash';
        this.overlay.appendChild(el);
        window.setTimeout(() => el.remove(), 420);
    }

    // ---- Frame -----------------------------------------------------------

    private frame(): void {
        const stamp = now();
        const deltaMs = stamp - this.lastFrameAt;
        sampleFrame(deltaMs);

        const s = session();
        const died = s.tick(stamp);
        const state = s.state;

        if (died && !this.deathShown) this.openDeath();

        if (!runtime.panelOpen) {
            this.stepMovement(Math.min(deltaMs, 100) / 1000);
            this.stepHold();
        }

        this.updateCamera();
        this.island.update(state.gameHoursElapsed);

        const groundAtFire = state.fire.built ? this.island.heightAt(state.fire.x, state.fire.y) : 0;
        this.fire.update(state, groundAtFire, this.nightFactor(state.gameHoursElapsed));

        this.nodes.sync(state);
        this.nodes.highlight(this.nearestInReach());

        this.paintHud(state);
        this.stepIdleHint();

        recordBodyTrace();
        this.lastFrameAt = stamp;

        this.scene.render();
        if (!runtime.sceneReady) runtime.sceneReady = true;
    }

    private stepMovement(dt: number): void {
        const state = session().state;
        const stick = this.controls.read();
        if (stick.magnitude <= 0) return;

        const forward = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const move = forward.scale(-stick.y).add(right.scale(stick.x)).normalize().scale(TUNE.walkSpeedMps * stick.magnitude * dt);

        let x = state.player.x + move.x;
        let z = state.player.y + move.z;

        //  Collision: push out of trees, rocks, the box, and the fire pit (A6).
        const dynamic = this.nodes.obstacles();
        const fireObstacle = this.fire.obstacle(state);
        if (fireObstacle) dynamic.push(fireObstacle);
        const resolved = this.island.resolveCollision(x, z, TUNE.playerCollisionRadius, dynamic);
        x = resolved.x;
        z = resolved.z;

        //  The sea is the edge of the world: slide along it rather than stop.
        const radius = Math.hypot(x, z);
        if (radius > WALKABLE_RADIUS) { const k = WALKABLE_RADIUS / radius; x *= k; z *= k; }

        state.player.x = x;
        state.player.y = z;

        const heading = Math.atan2(move.x, move.z);
        this.facing = turnToward(this.facing, heading, TUNE.turnRateDegPerSecond * dt);

        session().markFirstMove(msSinceControl());
        this.lastActivityAt = now();

        if (this.holdNodeId) {
            const view = this.nodes.find(this.holdNodeId);
            if (view && !this.inReach(view)) this.cancelHold();
        }
    }

    private updateCamera(): void {
        if (!runtime.panelOpen) {
            const look = this.controls.takeLook(this.lookSensitivity);
            this.yaw += look.yaw;
            this.pitch = clamp(this.pitch + look.pitch, (TUNE.cameraPitchMinDeg * Math.PI) / 180, (TUNE.cameraPitchMaxDeg * Math.PI) / 180);
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
        desired.y = Math.max(desired.y, this.island.heightAt(desired.x, desired.z) + 0.9);
        this.camera.position.copyFrom(desired);
        this.camera.setTarget(target);
    }

    private placePlayerFromState(): void {
        const s = session().state;
        this.player.place(s.player.x, this.island.heightAt(s.player.x, s.player.y), s.player.y, this.facing);
    }

    private nearestInReach(): NodeView | null {
        const s = session().state;
        let best: NodeView | null = null;
        let bestD: number = TUNE.interactRadius;
        for (const view of this.nodes.views) {
            if (!view.node.available) continue;
            const d = distance(s.player.x, s.player.y, view.node.x, view.node.y);
            if (d <= bestD) { best = view; bestD = d; }
        }
        return best;
    }

    private nightFactor(gameHoursElapsed: number): number {
        const { hourOfDay } = timeOfDay(gameHoursElapsed);
        if (hourOfDay >= 19 || hourOfDay < 4.5) return 1;
        if (hourOfDay >= 16.5) return (hourOfDay - 16.5) / 2.5;
        if (hourOfDay < 7) return 1 - (hourOfDay - 4.5) / 2.5;
        return 0;
    }

    private paintHud(state: ReturnType<typeof session>['state']): void {
        const sheltered = isSheltered(state);
        const atPond = isAtPond(state);
        let goal: string;
        let action = { label: '', visible: false, ready: false };
        let secondary = { label: '', visible: false };

        if (atPond && canDrinkAtPond(state)) {
            action = { label: 'Drink', visible: true, ready: true };
            goal = 'Fresh water. Hold to drink, or fill your flask.';
        } else if (!state.tools.axe && canCraftAxe(state)) {
            action = { label: 'Craft axe', visible: true, ready: true };
            goal = 'You have the parts. Make the axe.';
        } else if (!state.tools.axe && (state.inventory.wood + state.inventory.stone + state.inventory.fiber) > 0) {
            const s = axeShortfall(state);
            action = { label: 'Craft axe', visible: true, ready: false };
            goal = `Axe needs ${s.wood} wood, ${s.stone} stone, ${s.fiber} fibre more.`;
        } else if (!state.fire.built) {
            const short = Math.max(0, TUNE.woodPerFire - state.inventory.wood);
            const ready = short === 0;
            action = { label: ready ? 'Build fire' : `Build fire (${short} short)`, visible: state.inventory.wood > 0, ready };
            goal = ready ? 'Enough wood. Build the fire.' : `Gather ${TUNE.woodPerFire} wood for a fire.`;
        } else if (isFireLit(state)) {
            action = { label: 'Add wood', visible: canFeedFire(state), ready: true };
            goal = `Fire burning — about ${fireBurnHoursRemaining(state).toFixed(1)} game hours left.`;
        } else {
            action = { label: 'Add wood', visible: canFeedFire(state), ready: true };
            goal = 'The fire is out. Add wood to bring it back.';
        }

        //  Secondary: fill flask at the pond, drink flask away from it, or eat.
        if (canFillFlask(state)) secondary = { label: 'Fill flask', visible: true };
        else if (canDrinkFlask(state)) secondary = { label: 'Drink flask', visible: true };
        else if (this.bestFood()) secondary = { label: 'Eat', visible: true };

        this.hud.update({
            warmth: state.warmth, thirst: state.thirst, hunger: state.hunger, health: state.health,
            sheltered, inventory: state.inventory, tools: state.tools,
            gameHoursElapsed: state.gameHoursElapsed, goal, action, secondary, skills: state.skills
        });
    }

    private stepIdleHint(): void {
        if (runtime.panelOpen) return;
        if ((now() - this.lastActivityAt) / 1000 < TUNE.idleHintSeconds) return;
        this.lastActivityAt = now();
        this.showHint(this.contextualHint());
    }

    private contextualHint(): string {
        const s = session().state;
        if (s.thirst <= TUNE.thirstLowHintAt) return 'You are thirsty. There is a pond inland, west of the trees.';
        if (s.hunger <= TUNE.hungerLowHintAt && (s.inventory.berries || s.inventory.coconut || s.inventory.shellfish)) return 'You have food. Eat before hunger bites.';
        if (!s.tools.axe && canCraftAxe(s)) return 'You have the parts for an axe. Craft it.';
        if (!s.tools.axe) return 'Wood, stone, and fibre make an axe. Fibre comes from the palms.';
        if (!s.fire.built && s.inventory.wood >= TUNE.woodPerFire) return 'You have enough. Build the fire.';
        if (!s.fire.built) return 'Fell a tree for real timber, then build a fire.';
        if (!isFireLit(s)) return 'The fire is out. Add wood.';
        if (!isSheltered(s)) return 'Stand in the firelight to warm up.';
        return 'You are warming. Close the app — the island keeps the time.';
    }

    // ---- Death -----------------------------------------------------------

    private openDeath(): void {
        this.deathShown = true;
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.cancelHold();
        this.cues.stopAllBeds();
        const s = session().state;
        showDeath(this.overlay, s.lastDeathCause ?? 'your wounds', s.trace.deaths, () => {
            runtime.panelOpen = false;
            this.deathShown = false;
            session().acknowledgeDeath(now());
            this.placePlayerFromState();
            this.lastFrameAt = now();
            this.lastActivityAt = now();
        });
    }

    // ---- Lifecycle -------------------------------------------------------

    private installLifecycle(): void {
        const save = () => session().persist(now());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') { save(); this.cues.stopAllBeds(); this.cues.setMuted(true); return; }
            this.cues.setMuted(false);
            const report = session().resume(now());
            this.lastFrameAt = now();
            this.nodes.sync(session().state);
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
    try { localStorage.setItem(SENSITIVITY_KEY, String(value)); } catch { /* ignore */ }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function turnToward(from: number, to: number, maxDegrees: number): number {
    const maxRadians = (maxDegrees * Math.PI) / 180;
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return from + clamp(delta, -maxRadians, maxRadians);
}

void WRECK; // silhouette lives in island.ts; imported here only to keep world coords in one place
