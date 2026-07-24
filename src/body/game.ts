/**
 * BODY — the game: the render loop, a camera that glides, and a world you touch directly.
 *
 * Cycle 04 is the feel cycle. Every rule still comes from `/src/brain`; what changed is
 * how a touch reaches it. The Cycle 03 verbs lived in a prioritized HUD button stack, which
 * starved "Build fire" whenever "Craft axe" applied (wood is both fire fuel and an axe
 * part) — the root cause of the director's "fire won't build until night/axe" (D-040/D-042).
 * The fix is architectural: **tap the thing to use the thing.** In range it acts; out of
 * range the castaway walks there and then acts. Buttons survive only for placement (Build
 * fire), the craft card, and settings. Every blocked interaction says why.
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
    buildShelter,
    buildStorage,
    canBuildFire,
    canCraftAxe,
    canDrinkAtPond,
    canDrinkFlask,
    canFeedFire,
    canFillFlask,
    canRepairStructure,
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
    isExhausted,
    isFireLit,
    isSheltered,
    nodeHoldSeconds,
    nodeSpec,
    repairStructure,
    timeOfDay,
    useStorage,
    type Food,
    type GatherResult,
    type MorningReport,
    type NodeKind,
    type RepairTarget
} from '../brain';
import { TUNE } from '../data/tune';
import { COLD_OPEN, POND, WALKABLE_RADIUS } from '../data/world';
import { CUES, Cues, type CueKey } from './audio';
import { Controls } from './controls';
import { FireView, NodeViews, PlayerView, ShelterView, StorageView, type NodeView } from './entities';
import {
    addSettingsButton,
    Hud,
    levelToast,
    pickupToast,
    showBuildCard,
    showColdOpen,
    showDeath,
    showMorningReport,
    showSettings
} from './hud';
import { Island, type Obstacle } from './island';
import { grantControl, msSinceControl, now, recordBodyTrace, runtime, sampleFrame, session } from './runtime';
import { RENDER } from './theme';

/** What the player has tapped and wants to reach, if anything. */
type Pending =
    | { kind: 'node'; id: string }
    | { kind: 'fire' }
    | { kind: 'pond' }
    | { kind: 'shelter' }
    | { kind: 'storage' }
    | null;

/** One entry in the debug tap log (D-050) — what a tap resolved to, and where. */
interface TapBreadcrumb {
    tMs: number;
    screenX: number;
    screenY: number;
    outcome: string;
}

/** Human names for the first-pickup toasts (D-043). */
const KIND_LABEL: Partial<Record<NodeKind, string>> = {
    driftwood: 'Driftwood',
    deadfall: 'Deadfall — firewood',
    tree: 'Timber',
    rock: 'Stone',
    berrybush: 'Berries — food',
    coconutpalm: 'Coconut & husk fibre',
    reed: 'Reeds — fibre for the axe',
    shellfish: 'Shellfish — food',
    crashbox: 'Salvage',
    quarry: 'Quarried stone',
    salvage: 'Beach find'
};

export class Game {
    private engine: Engine;
    private scene: Scene;
    private camera: FreeCamera;
    private island: Island;
    private player: PlayerView;
    private nodes: NodeViews;
    private fire: FireView;
    private shelter: ShelterView;
    private storage: StorageView;
    private hud: Hud;
    private controls: Controls;
    private cues = new Cues();

    //  Camera orbit: the drag updates the *target*; the actual angle chases it (smoothed).
    private yaw = Math.PI;
    private pitch = 0.28;
    private targetYaw = Math.PI;
    private targetPitch = 0.28;
    private facing = Math.PI;
    private camPos = new Vector3(0, 5, -6);
    private camTarget = new Vector3(0, 2, 0);
    private camReady = false;

    //  Movement carries momentum now — acceleration, not instant velocity.
    private velX = 0;
    private velZ = 0;

    //  Direct-world interaction: where the tap wants to go, and any auto-hold in progress.
    private pending: Pending = null;
    private holdNodeId: string | null = null;
    private holdStartedAt = 0;
    private pondDrinkAccumMs = 0;
    private pickedUpKinds = new Set<NodeKind>();

    //  Harness-fidelity mandate (C1 ruling, D-050): a bounded log of the last 20 taps, so a
    //  live report the harness never reproduced ("tap does nothing, 5th time") is diagnosable
    //  from the director's own phone instead of guessed at blind. Never persisted, never sent
    //  anywhere — read only via the settings panel's "Copy debug info" button, on request.
    private tapBreadcrumbs: TapBreadcrumb[] = [];

    private lastActivityAt = now();
    private lastFrameAt = now();
    private lookSensitivity: number = TUNE.lookSensitivity;
    /** "Fast movement (testing)" — a labelled test aid (D-051 SON addendum), persisted,
     *  off by default. Multiplies `walkSpeedMps` at use; the base constant never changes. */
    private testSpeedEnabled = false;
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
        this.shelter = new ShelterView(this.scene);
        this.storage = new StorageView(this.scene);

        const state = session().state;
        this.nodes = new NodeViews(this.scene, state.nodes, (x, z) => this.island.heightAt(x, z));
        this.lookSensitivity = readSensitivity();
        this.testSpeedEnabled = readTestSpeed();

        this.hud = new Hud(
            this.overlay,
            () => this.onBuildFire(),
            () => this.openBuildCard(),
            (food) => this.onEatFood(food),
            () => this.onDrinkFlask()
        );
        addSettingsButton(this.overlay, () => this.openSettings());

        this.controls = new Controls(this.canvas, this.overlay, {
            onPressWorld: () => false, //  No press-claim: everything is a tap or the stick now.
            onReleaseWorld: () => {},
            onTap: (x, y) => this.onTap(x, y),
            onActivity: () => { this.lastActivityAt = now(); this.cues.unlock(); }
        });

        this.placePlayerFromState();
        this.installDebugProjection();
        this.installLifecycle();
        void this.cues.load();
    }

    private installDebugProjection(): void {
        //  The pending intention, readable and settable by the harness. Setting it is not a
        //  cheat — it is exactly what a tap does; the game still gates the *action* on reach.
        //  It exists because reliably tapping a distant 3D object from a headless projected
        //  point is not feasible, and the range-gate must still be regression-locked (D-022).
        runtime.pendingReadout = () => (this.pending ? { kind: this.pending.kind, id: this.pending.kind === 'node' ? this.pending.id : undefined } : null);
        runtime.intend = (id: string) => { this.pending = { kind: 'node', id }; };
        runtime.debugInfo = () => this.debugInfoText();
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
            this.showHint('Tap the driftwood on the sand. You will walk over and take it.');
        });
    }

    private openReport(report: MorningReport): void {
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.clearPending();
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
        this.clearPending();
        showSettings(this.overlay, this.testSpeedEnabled,
            (value) => { this.testSpeedEnabled = value; writeTestSpeed(value); },
            () => { runtime.panelOpen = false; this.lastActivityAt = now(); },
            () => this.debugInfoText());
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

    /**
     * `unexpectedMesh` is set when the ray hit some OTHER pickable mesh — not terrain, not a
     * recognised candidate — so `onTap` can tell "genuinely empty ground, just look there"
     * (no explanation owed) apart from "hit something real that produced no verb" (D-042's
     * fail-loud law: silence is never a legal outcome for the latter).
     */
    private pickHitPoint(screenX: number, screenY: number): { x: number; z: number; unexpectedMesh: string | null } | null {
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top, (m: AbstractMesh) => m.isPickable);
        if (hit?.hit && hit.pickedMesh?.metadata?.pond) return { x: POND.x, z: POND.y, unexpectedMesh: null };
        if (hit?.hit && hit.pickedMesh?.metadata?.fire) {
            const f = session().state.fire;
            return { x: f.x, z: f.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.shelter) {
            const sh = session().state.shelter;
            return { x: sh.x, z: sh.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.storage) {
            const st = session().state.storage;
            return { x: st.x, z: st.y, unexpectedMesh: null };
        }
        if (!hit?.hit || !hit.pickedPoint) return null;
        const meshName = hit.pickedMesh?.name ?? null;
        return { x: hit.pickedPoint.x, z: hit.pickedPoint.z, unexpectedMesh: meshName === 'terrain' ? null : meshName };
    }

    // ---- The tap — the one input path ------------------------------------

    /**
     * A tap sets an intention. The frame loop walks the castaway to it and acts on arrival.
     * A tap that lands on nothing interactive is a look-around, not a failure.
     */
    private onTap(screenX: number, screenY: number): void {
        if (runtime.panelOpen) { this.recordTap(screenX, screenY, 'panel-open'); return; }
        this.lastActivityAt = now();

        //  A node under (or near) the finger wins.
        const node = this.pickNode(screenX, screenY);
        if (node) {
            this.pending = { kind: 'node', id: node.node.id };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, `node:${node.node.id}`);
            return;
        }

        //  Otherwise, the fire, the pond, the shelter, or storage, by the point the ray struck.
        //  Every candidate within its own forgiveness radius is collected and the NEAREST
        //  centre wins — not the first one checked. Shelter and storage are built close
        //  together in practice (both placed `~2.2 m` ahead of the builder), so their
        //  forgiveness radii can overlap; an earlier first-match if-chain let the shelter
        //  (checked first) swallow taps square on the storage crate whenever the two sat
        //  within about 2.8 m of each other — a REGRESSION found via the device harness:
        //  a tap aimed at storage kept silently repairing the shelter instead.
        const point = this.pickHitPoint(screenX, screenY);
        if (!point) { this.recordTap(screenX, screenY, 'no-hit'); return; }

        const s = session().state;
        type Candidate = { kind: 'fire' | 'pond' | 'shelter' | 'storage'; d: number };
        const candidates: Candidate[] = [];
        if (s.fire.built) {
            const d = distance(point.x, point.z, s.fire.x, s.fire.y);
            if (d <= TUNE.fireTapRadius + 1.5) candidates.push({ kind: 'fire', d });
        }
        {
            const d = distance(point.x, point.z, POND.x, POND.y);
            if (d <= POND.radius + TUNE.pondTapSlack + 1.5) candidates.push({ kind: 'pond', d });
        }
        if (s.shelter.built) {
            const d = distance(point.x, point.z, s.shelter.x, s.shelter.y);
            if (d <= TUNE.shelterCollisionRadius + 1.5) candidates.push({ kind: 'shelter', d });
        }
        if (s.storage.built) {
            const d = distance(point.x, point.z, s.storage.x, s.storage.y);
            if (d <= TUNE.storageCollisionRadius + 1.5) candidates.push({ kind: 'storage', d });
        }
        candidates.sort((a, b) => a.d - b.d);
        const winner = candidates[0];
        if (winner) {
            this.pending = { kind: winner.kind };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, winner.kind);
            return;
        }
        //  Fail-loud law (D-046(d) ruling, D-045 lineage): the ray hit something real that
        //  isn't terrain and isn't a recognised candidate — every currently-interactive mesh
        //  is one of the cases above, so reaching this with a name means either a genuinely
        //  new object type nobody wired up yet, or a picking regression like the one this
        //  ruling root-caused (a spent node's mesh staying pickable). Either way, silence is
        //  never a legal outcome: say so, and leave a trace breadcrumb, instead of a tap that
        //  vanishes with no visible cause.
        if (point.unexpectedMesh) {
            this.explain('Nothing to do there.');
            this.clearPending();
            this.recordTap(screenX, screenY, `unexpected:${point.unexpectedMesh}`);
            return;
        }

        //  Empty ground: just look there — and drop any pending intention. This is the
        //  player's explicit "never mind" gesture now that manual steering no longer cancels
        //  a pending on its own (FIX 1, 2026-07-23 handoff).
        this.clearPending();
        this.recordTap(screenX, screenY, 'empty-ground');
    }

    /** Keeps the last 20 taps — see the field comment for why. */
    private recordTap(screenX: number, screenY: number, outcome: string): void {
        this.tapBreadcrumbs.push({ tMs: Math.round(now()), screenX: Math.round(screenX), screenY: Math.round(screenY), outcome });
        if (this.tapBreadcrumbs.length > 20) this.tapBreadcrumbs.shift();
    }

    /**
     * Everything needed to diagnose a report the harness never reproduced, from the
     * director's own phone: the trace, the last 20 taps, and — the number that would have
     * settled this one immediately — how many of each resource kind remain available. A
     * single-use node that never respawns (D-043's world) is visually identical to the
     * purely decorative treeline (`island.ts`'s thin-instanced trees): once the real ones
     * are gone, every later tap on "a tree" is genuinely, correctly silent.
     */
    debugInfoText(): string {
        const s = session().state;
        const counts: Partial<Record<NodeKind, { available: number; total: number }>> = {};
        for (const n of s.nodes) {
            const c = (counts[n.kind] ??= { available: 0, total: 0 });
            c.total += 1;
            if (n.available) c.available += 1;
        }
        const lines: string[] = [];
        lines.push(`DRIFT debug info — ${new Date().toISOString()}`);
        lines.push(`player: ${s.player.x.toFixed(1)}, ${s.player.y.toFixed(1)} · clock: ${s.gameHoursElapsed.toFixed(2)}h · axe: ${s.tools.axe}`);
        lines.push('nodes remaining, by kind (available/total):');
        for (const [kind, c] of Object.entries(counts)) lines.push(`  ${kind}: ${c!.available}/${c!.total}`);
        lines.push(`trace: ${JSON.stringify(s.trace)}`);
        lines.push(`last ${this.tapBreadcrumbs.length} taps:`);
        for (const b of this.tapBreadcrumbs) lines.push(`  +${b.tMs - (this.tapBreadcrumbs[0]?.tMs ?? b.tMs)}ms  (${b.screenX},${b.screenY}) -> ${b.outcome}`);
        return lines.join('\n');
    }

    /** The world point a pending interaction wants to reach. */
    private pendingTarget(): { x: number; z: number } | null {
        if (!this.pending) return null;
        if (this.pending.kind === 'node') {
            const view = this.nodes.find(this.pending.id);
            return view && view.node.available ? { x: view.node.x, z: view.node.y } : null;
        }
        if (this.pending.kind === 'fire') {
            const f = session().state.fire;
            return f.built ? { x: f.x, z: f.y } : null;
        }
        if (this.pending.kind === 'shelter') {
            const sh = session().state.shelter;
            return sh.built ? { x: sh.x, z: sh.y } : null;
        }
        if (this.pending.kind === 'storage') {
            const st = session().state.storage;
            return st.built ? { x: st.x, z: st.y } : null;
        }
        return { x: POND.x, z: POND.y }; // pond: aim at the centre; the reach check uses the bank
    }

    private clearPending(): void {
        this.pending = null;
        this.cancelHold();
    }

    /** True if the player is within reach of the pending target (pond measured to its bank). */
    private pendingInReach(): boolean {
        if (!this.pending) return false;
        const s = session().state;
        if (this.pending.kind === 'pond') return isAtPond(s);
        const t = this.pendingTarget();
        if (!t) return false;
        return distance(s.player.x, s.player.y, t.x, t.z) <= TUNE.interactRadiusM;
    }

    // ---- Executing an arrived interaction --------------------------------

    private actOnArrival(): void {
        if (!this.pending) return;
        const s = session().state;

        if (this.pending.kind === 'fire') {
            this.tryFeedFire();
            this.pending = null;
            return;
        }

        if (this.pending.kind === 'pond') {
            //  FIX 2 (2026-07-23 handoff): fill wins over drink at the pond. Drink used to go
            //  first unconditionally, and it applies whenever thirst < max — nearly always —
            //  so an empty flask was starved exactly like C03's Craft-axe starved Build-fire:
            //  the higher-priority branch's gate was satisfied so often that the other verb
            //  was practically unreachable ("no way to fill it"). Filling is the one thing
            //  only the pond can do; drinking your own thirst down is also reachable anywhere
            //  by tapping a full flask chip (D-042 audit fix). So: fill first when it applies
            //  (tops the flask, a one-shot action), otherwise drink as before.
            if (canFillFlask(s)) { this.doFillFlask(); this.pending = null; }
            else if (canDrinkAtPond(s)) { this.doDrink(); }
            else { this.explain('The flask is full and so are you.'); this.pending = null; }
            return; // drinking keeps the pending alive to allow repeat sips while held nearby
        }

        if (this.pending.kind === 'shelter') {
            //  Repair-vs-sleep: upkeep first when it applies (carrying wood, durability
            //  short), else sleep — sleep has no OTHER failure mode once you're this close
            //  (canSleep only checks range, already satisfied by arrival), so the two never
            //  starve each other the way an ill-considered priority order once did (D-042).
            if (canRepairStructure(s, 'shelter')) this.tryRepair('shelter');
            else this.trySleep();
            this.pending = null;
            return;
        }

        if (this.pending.kind === 'storage') {
            if (canRepairStructure(s, 'storage')) this.tryRepair('storage');
            else this.tryUseStorage();
            this.pending = null;
            return;
        }

        //  A node: tap-kind gathers at once; hold-kind starts an auto-hold (the castaway
        //  works it), the LDOE "walk over and chop" beat.
        const view = this.nodes.find(this.pending.id);
        if (!view || !view.node.available) { this.pending = null; return; }

        if (nodeSpec(view.node.kind).needsAxe && !s.tools.axe) {
            this.explain(view.node.kind === 'crashbox' ? 'The box is sealed. You need an axe.' : 'You need an axe for that.');
            this.pending = null;
            return;
        }

        if (nodeSpec(view.node.kind).interaction === 'tap') {
            this.gather(view);
            this.pending = null;
        } else if (this.holdNodeId !== view.node.id) {
            this.holdNodeId = view.node.id;
            this.holdStartedAt = now();
            this.cues.startBed(CUES.gather);
        }
    }

    private doDrink(): void {
        //  A sip at most every pondSipMinIntervalMs of standing in the water, so a tap is one
        //  gulp and loitering tops you up.
        if (now() - this.pondDrinkAccumMs < TUNE.pondSipMinIntervalMs) return;
        this.pondDrinkAccumMs = now();
        const s = session().state;
        if (drinkAtPond(s)) {
            this.cues.play(CUES.drink);
            session().markFirstDrink(msSinceControl());
            session().persist(now());
            this.lastActivityAt = now();
        }
        if (!canDrinkAtPond(s)) this.pending = null; // full
    }

    private doFillFlask(): void {
        if (fillFlask(session().state)) {
            this.cues.play(CUES.drink);
            this.floatText('flask filled');
            session().persist(now());
            this.lastActivityAt = now();
        }
    }

    /**
     * Sleep at the shelter (C05 §4): the exact reconcile path a real absence already uses,
     * triggered voluntarily. Shown through the same morning-report overlay — sleeping IS the
     * mechanic the report already explains, just chosen rather than happened-to-you.
     */
    private trySleep(): void {
        const report = session().sleep(now());
        if (!report) { this.explain('Too far from the shelter to sleep.'); return; }
        this.cues.stopAllBeds();
        this.openReport(report);
    }

    private tryRepair(which: RepairTarget): void {
        const s = session().state;
        if (!repairStructure(s, which)) { this.explain('Needs wood in hand to repair.'); return; }
        this.cues.play(CUES.craft);
        this.floatText(`+${TUNE.repairDurabilityPerWood} durability`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** The disjoint-state rule (D-042 audit): carrying raw materials stores them; empty-handed
     *  withdraws a batch. Never a priority conflict, since the two states cannot both be true. */
    private tryUseStorage(): void {
        const result = useStorage(session().state);
        if (!result.ok) { this.explain('Nothing to store, and nothing to take.'); return; }
        this.cues.play(result.action === 'deposit' ? CUES.collected : CUES.pickup);
        this.floatText(this.storageMovedLabel(result.action, result.moved));
        session().persist(now());
        this.lastActivityAt = now();
    }

    private storageMovedLabel(action: 'deposit' | 'withdraw' | null, moved: Partial<Record<'wood' | 'stone' | 'fiber', number>>): string {
        const parts: string[] = [];
        if (moved.wood) parts.push(`${moved.wood} wood`);
        if (moved.stone) parts.push(`${moved.stone} stone`);
        if (moved.fiber) parts.push(`${moved.fiber} fibre`);
        const verb = action === 'deposit' ? 'stored' : 'took';
        return parts.length ? `${verb} ${parts.join(', ')}` : '';
    }

    private cancelHold(): void {
        this.holdNodeId = null;
        this.nodes.hideHold();
        this.cues.stopBed(CUES.gather);
    }

    private stepHold(): void {
        if (!this.holdNodeId) return;
        const view = this.nodes.find(this.holdNodeId);
        if (!view || !view.node.available || distance(session().state.player.x, session().state.player.y, view.node.x, view.node.y) > TUNE.interactRadiusM) {
            this.cancelHold();
            return;
        }
        const seconds = nodeHoldSeconds(session().state, view.node);
        const progress = Math.min(1, (now() - this.holdStartedAt) / (seconds * 1000));
        this.nodes.showHold(view, progress, this.island.heightAt(view.node.x, view.node.y));
        if (progress >= 1) {
            const done = view;
            this.cancelHold();
            this.pending = null;
            this.gather(done);
        }
    }

    private gather(view: NodeView): void {
        const result = gatherNode(session().state, view.node.id);
        if (!result.ok) {
            this.explain(result.reason === 'need-axe' ? 'You need an axe for that.' : 'Nothing there.');
            return;
        }
        this.nodes.sync(session().state);
        this.playGatherCue(result);
        this.floatText(this.gainLabel(result));
        this.firstPickupToast(view.node.kind);

        if (result.gained.wood) session().markFirstWood(msSinceControl());
        if (result.foundFlask) this.showHint('A water flask — fill it at the pond, carry a drink inland.');
        if (result.levelsGained > 0 && result.skill) {
            const level = session().state.skills[result.skill].level;
            levelToast(this.overlay, result.skill === 'woodcutting' ? 'Woodcutting' : 'Foraging', level);
        }

        session().persist(now());
        this.lastActivityAt = now();
        this.hud.hideHint();
    }

    private firstPickupToast(kind: NodeKind): void {
        if (this.pickedUpKinds.has(kind)) return;
        this.pickedUpKinds.add(kind);
        const label = KIND_LABEL[kind];
        if (label) pickupToast(this.overlay, label);
    }

    private playGatherCue(result: GatherResult): void {
        const cue: CueKey =
            result.kind === 'tree' ? CUES.fell
            : result.kind === 'crashbox' ? CUES.unlock
            : result.kind === 'driftwood' || result.kind === 'shellfish' || result.kind === 'berrybush' || result.kind === 'reed' || result.kind === 'salvage' ? CUES.pickup
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

    // ---- Buttons: placement and crafting only ----------------------------

    /** Every placed thing that blocks movement — nodes plus the fire/shelter/storage, each
     *  included only once built. The single source both movement collision and every
     *  placement's clear-ground check draw from, so a new structure can never be dropped
     *  on top of an existing one, and the player can never be walked into any of them. */
    private dynamicObstacles(): Obstacle[] {
        const state = session().state;
        const out = this.nodes.obstacles();
        const fireObstacle = this.fire.obstacle(state);
        if (fireObstacle) out.push(fireObstacle);
        const shelterObstacle = this.shelter.obstacle(state);
        if (shelterObstacle) out.push(shelterObstacle);
        const storageObstacle = this.storage.obstacle(state);
        if (storageObstacle) out.push(storageObstacle);
        return out;
    }

    /** Build fire — available whenever wood suffices, day OR night (the D-040/D-042 fix). */
    private onBuildFire(): void {
        const s = session().state;
        if (!canBuildFire(s)) { this.deniedFire(); return; }
        const x = s.player.x + Math.sin(this.facing) * TUNE.fireBuildOffsetM;
        const z = s.player.y + Math.cos(this.facing) * TUNE.fireBuildOffsetM;
        //  Clear-ground check: do not lay the fire inside a trunk or rock.
        const clear = this.island.resolveCollision(x, z, TUNE.fireCollisionRadius, this.dynamicObstacles());
        if (!buildFire(s, clear.x, clear.z)) return;
        this.fire.flare();
        this.cues.play(CUES.ignition);
        this.cues.startBed(CUES.fireloop);
        this.flash();
        session().markFireLit(msSinceControl());
        session().persist(now());
        this.lastActivityAt = now();
        this.showHint('Stay in the firelight. Warmth is coming back.');
    }

    /** Build the shelter — same placement pattern as the fire: an arm's length ahead, on
     *  clear ground. Once built, it is also the new respawn anchor (state.ts's respawn). */
    private onBuildShelter(): void {
        const s = session().state;
        const x = s.player.x + Math.sin(this.facing) * TUNE.shelterBuildOffsetM;
        const z = s.player.y + Math.cos(this.facing) * TUNE.shelterBuildOffsetM;
        const clear = this.island.resolveCollision(x, z, TUNE.shelterCollisionRadius, this.dynamicObstacles());
        if (!buildShelter(s, clear.x, clear.z)) return;
        this.cues.play(CUES.craft);
        this.floatText('the shelter stands');
        session().persist(now());
        this.lastActivityAt = now();
        this.showHint('Tap the shelter to sleep — it is home now.');
    }

    private onBuildStorage(): void {
        const s = session().state;
        const x = s.player.x + Math.sin(this.facing) * TUNE.storageBuildOffsetM;
        const z = s.player.y + Math.cos(this.facing) * TUNE.storageBuildOffsetM;
        const clear = this.island.resolveCollision(x, z, TUNE.storageCollisionRadius, this.dynamicObstacles());
        if (!buildStorage(s, clear.x, clear.z)) return;
        this.cues.play(CUES.craft);
        this.floatText('the crate is set');
        session().persist(now());
        this.lastActivityAt = now();
        this.showHint('Carrying materials? Tap the crate to store them.');
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
        this.showHint(s.fire.built ? 'No wood to add. Fell a tree or gather more.' : `Not enough wood — ${short} more for a fire.`);
    }

    private onEatFood(food: Food): void {
        const s = session().state;
        if (eat(s, food)) {
            this.cues.play(CUES.eat);
            this.floatText(`ate ${food}`);
            session().persist(now());
            this.lastActivityAt = now();
        } else {
            this.explain(s.hunger >= TUNE.hungerMax ? 'You are not hungry.' : `No ${food} to eat.`);
        }
    }

    /** Sip the carried flask, anywhere — the inland drink the fill promised (B1 audit fix). */
    private onDrinkFlask(): void {
        const s = session().state;
        if (canDrinkFlask(s) && drinkFlask(s)) {
            this.cues.play(CUES.drink);
            this.floatText('a sip from the flask');
            session().markFirstDrink(msSinceControl());
            session().persist(now());
            this.lastActivityAt = now();
        } else {
            this.explain(s.thirst >= TUNE.thirstMax ? 'You are not thirsty.' : 'The flask is empty. Refill it at the pond.');
        }
    }

    /**
     * The Build panel (C05): axe, shelter, and storage, each independently gated with its
     * own button — never a shared priority slot. That single-button-stack pattern is what
     * starved "Build fire" behind "Craft axe" in C03 (D-040/D-042); this cycle adds two more
     * buildables, so a shared slot here would only invite the same bug again.
     */
    private openBuildCard(): void {
        if (runtime.panelOpen) return;
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.clearPending();
        const s = session().state;
        showBuildCard(
            this.overlay,
            {
                axe: { have: { wood: s.inventory.wood, stone: s.inventory.stone, fiber: s.inventory.fiber }, done: s.tools.axe },
                shelter: { have: { wood: s.inventory.wood, stone: s.inventory.stone, fiber: s.inventory.fiber }, done: s.shelter.built },
                storage: { have: { wood: s.inventory.wood, stone: s.inventory.stone }, done: s.storage.built }
            },
            () => {
                runtime.panelOpen = false;
                if (craftAxe(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the axe is yours');
                    session().markFirstCraft(msSinceControl());
                    session().persist(now());
                    this.showHint('Now tap a standing tree, or that sealed box, to use it.');
                }
                this.lastActivityAt = now();
            },
            () => { runtime.panelOpen = false; this.onBuildShelter(); },
            () => { runtime.panelOpen = false; this.onBuildStorage(); },
            () => { runtime.panelOpen = false; this.lastActivityAt = now(); }
        );
    }

    // ---- Feedback --------------------------------------------------------

    /** State the reason an interaction did not happen (D-042). */
    private explain(message: string): void {
        session().markFailedTap();
        this.cues.play(CUES.denied);
        this.showHint(message);
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
        const dt = Math.min(deltaMs, 100) / 1000;

        const s = session();
        const died = s.tick(stamp);
        const state = s.state;
        if (died && !this.deathShown) this.openDeath();

        if (!runtime.panelOpen) {
            this.stepMovement(dt);
            this.stepInteraction();
            this.stepHold();
        }

        this.updateCamera(dt);
        this.island.update(state.gameHoursElapsed);

        const groundAtFire = state.fire.built ? this.island.heightAt(state.fire.x, state.fire.y) : 0;
        this.fire.update(state, groundAtFire, this.nightFactor(state.gameHoursElapsed));
        this.shelter.update(state, this.island.heightAt(state.shelter.x, state.shelter.y));
        this.storage.update(state, this.island.heightAt(state.storage.x, state.storage.y));

        this.nodes.sync(state);
        this.nodes.highlight(this.highlightTarget());

        this.paintHud(state);
        this.stepIdleHint();

        recordBodyTrace();
        this.lastFrameAt = stamp;

        this.scene.render();
        if (!runtime.sceneReady) runtime.sceneReady = true;
    }

    /**
     * Movement with momentum. The desired velocity comes from the stick (manual) or from
     * walking to a pending target (auto). The actual velocity accelerates toward it, so
     * starts and stops ease instead of snapping — half of what "smooth" means on a phone.
     */
    private stepMovement(dt: number): void {
        const state = session().state;
        const stick = this.controls.read();

        let desiredX = 0;
        let desiredZ = 0;
        //  Exhausted (C05 §3): a soft debuff, never a death vector — the HUD's goal line
        //  says why, and sleeping at the shelter is the only cure. "Fast movement (testing)"
        //  (D-051 SON addendum) multiplies on top — a labelled test aid, `walkSpeedMps` itself
        //  never changes — so the two stack rather than one silently overriding the other.
        const speedScale = (isExhausted(state) ? TUNE.energySlowWalkMultiplier : 1) * (this.testSpeedEnabled ? TUNE.testSpeedMultiplier : 1);

        if (stick.magnitude > 0) {
            //  Manual steering overrides the auto-walk DIRECTION, but must not erase the
            //  pending interaction itself (FIX 1, 2026-07-23 handoff — root cause of "axe
            //  equipped, tap standing tree, tree does not fell"). The natural two-thumb
            //  gesture is: walk toward a tree with the left thumb, tap it with the right —
            //  the tap sets `pending`, but this method runs every frame, and with the stick
            //  still held (even lightly resting) it used to null `pending` on the very next
            //  frame, before `stepInteraction` ever got a chance to act on arrival. Now the
            //  pending survives regardless of steering; it fires the moment the player is in
            //  reach, however they got there. It is superseded by any new tap and explicitly
            //  dropped by a tap on empty ground (the player's "never mind" gesture).
            const forward = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
            const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
            const dir = forward.scale(-stick.y).add(right.scale(stick.x));
            const len = Math.hypot(dir.x, dir.z) || 1;
            const speed = TUNE.walkSpeedMps * stick.magnitude * speedScale;
            desiredX = (dir.x / len) * speed;
            desiredZ = (dir.z / len) * speed;
        } else if (this.pending && !this.pendingInReach()) {
            const t = this.pendingTarget();
            if (t) {
                const dx = t.x - state.player.x;
                const dz = t.z - state.player.y;
                const len = Math.hypot(dx, dz) || 1;
                //  Ease off in the last metre so the castaway settles beside the target.
                const speed = TUNE.walkSpeedMps * Math.min(1, len / 1.5) * speedScale;
                desiredX = (dx / len) * speed;
                desiredZ = (dz / len) * speed;
            }
        }

        //  Accelerate toward the desired velocity (m/s²), rather than jumping to it.
        const accel = TUNE.moveAccelMps2 * dt;
        this.velX = approachScalar(this.velX, desiredX, accel);
        this.velZ = approachScalar(this.velZ, desiredZ, accel);

        const speedNow = Math.hypot(this.velX, this.velZ);
        if (speedNow < 0.001) { this.velX = 0; this.velZ = 0; return; }

        let x = state.player.x + this.velX * dt;
        let z = state.player.y + this.velZ * dt;

        const resolved = this.island.resolveCollision(x, z, TUNE.playerCollisionRadius, this.dynamicObstacles());
        x = resolved.x;
        z = resolved.z;

        const radius = Math.hypot(x, z);
        if (radius > WALKABLE_RADIUS) { const k = WALKABLE_RADIUS / radius; x *= k; z *= k; }

        state.player.x = x;
        state.player.y = z;

        //  Turn to face travel with a frame-rate-independent slerp — smoother than a fixed
        //  degrees-per-second cap, and the second half of "smooth".
        const heading = Math.atan2(this.velX, this.velZ);
        this.facing = slerpAngle(this.facing, heading, TUNE.turnSlerpSpeed, dt);

        session().markFirstMove(msSinceControl());
        this.lastActivityAt = now();
    }

    /** Once the walk-to has arrived, act. */
    private stepInteraction(): void {
        if (this.pending && this.pendingInReach()) this.actOnArrival();
        else if (this.pending && !this.pendingTarget()) this.pending = null; // target vanished
    }

    private updateCamera(dt: number): void {
        //  The drag moves a *target* angle; the actual angle chases it — smoothed look.
        if (!runtime.panelOpen) {
            const look = this.controls.takeLook(this.lookSensitivity);
            this.targetYaw += look.yaw;
            this.targetPitch = clamp(this.targetPitch + look.pitch, (TUNE.cameraPitchMinDeg * Math.PI) / 180, (TUNE.cameraPitchMaxDeg * Math.PI) / 180);
        }
        const lookA = frameLerp(TUNE.cameraLookSmoothing, dt);
        this.yaw += shortestAngle(this.yaw, this.targetYaw) * lookA;
        this.pitch += (this.targetPitch - this.pitch) * lookA;

        this.placePlayerFromState();

        const state = session().state;
        const groundY = this.island.heightAt(state.player.x, state.player.y);
        const desiredTarget = new Vector3(state.player.x, groundY + this.player.eyeHeight, state.player.y);

        const horizontal = Math.cos(this.pitch) * TUNE.cameraDistanceM;
        const height = Math.sin(this.pitch) * TUNE.cameraDistanceM + TUNE.cameraHeightM;
        let desired = new Vector3(
            state.player.x - Math.sin(this.yaw) * horizontal,
            groundY + height,
            state.player.y - Math.cos(this.yaw) * horizontal
        );
        desired = this.avoidCameraClip(desiredTarget, desired);

        //  Damped follow: the camera glides after the player instead of being welded to it.
        if (!this.camReady) { this.camPos.copyFrom(desired); this.camTarget.copyFrom(desiredTarget); this.camReady = true; }
        const followA = frameLerp(TUNE.cameraFollowLerp, dt);
        this.camPos = lerpVec(this.camPos, desired, followA);
        this.camTarget = lerpVec(this.camTarget, desiredTarget, Math.min(1, followA * 1.6));

        this.camera.position.copyFrom(this.camPos);
        this.camera.setTarget(this.camTarget);
    }

    /**
     * Keep the camera out of the terrain AND off the far side of a trunk/rock that sits
     * between it and the player — no clipping and no occlusion (A6). Analytic, not a raycast:
     * march the boom OUTWARD from the player and stop just before the first blocked sample,
     * so the whole segment player→camera is guaranteed clear. (Marching inward from the far
     * end and taking the first clear point would happily park the camera *behind* a trunk.)
     */
    private avoidCameraClip(target: Vector3, desired: Vector3): Vector3 {
        const dir = desired.subtract(target);
        const full = dir.length();
        if (full < 0.01) return desired;
        dir.scaleInPlace(1 / full);
        const dyn = this.dynamicObstacles();

        const blockedAt = (d: number): boolean => {
            const px = target.x + dir.x * d;
            const pz = target.z + dir.z * d;
            const py = target.y + dir.y * d;
            if (py < this.island.heightAt(px, pz) + 0.5) return true;
            for (const o of this.island.staticObstacles) {
                if ((px - o.x) ** 2 + (pz - o.z) ** 2 < (o.radius + 0.6) ** 2) return true;
            }
            for (const o of dyn) {
                if ((px - o.x) ** 2 + (pz - o.z) ** 2 < (o.radius + 0.6) ** 2) return true;
            }
            return false;
        };

        //  Nearest allowed boom; grow it while the ray stays clear, stop at the first block.
        let dist = Math.min(full, TUNE.cameraMinBoomM);
        for (let d = TUNE.cameraMinBoomM; d <= full; d += 0.4) {
            if (blockedAt(d)) break;
            dist = d;
        }
        return new Vector3(target.x + dir.x * dist, target.y + dir.y * dist, target.z + dir.z * dist);
    }

    private placePlayerFromState(): void {
        const s = session().state;
        this.player.place(s.player.x, this.island.heightAt(s.player.x, s.player.y), s.player.y, this.facing);
        this.player.syncTools(s.tools.axe);
    }

    /** The node to highlight: the pending one, else the nearest in reach. */
    private highlightTarget(): NodeView | null {
        if (this.pending?.kind === 'node') {
            const v = this.nodes.find(this.pending.id);
            if (v?.node.available) return v;
        }
        const s = session().state;
        let best: NodeView | null = null;
        let bestD: number = TUNE.interactRadiusM;
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

        //  Build fire: its OWN button, gated only on wood (day or night). It no longer
        //  competes in a priority slot with Craft — the root cause of the C03 fire defect.
        let action = { label: '', visible: false, ready: false };
        if (!state.fire.built) {
            const short = Math.max(0, TUNE.woodPerFire - state.inventory.wood);
            action = { label: short === 0 ? 'Build fire' : `Build fire (${short} short)`, visible: state.inventory.wood > 0, ready: short === 0 };
        }

        //  Build: one entry point to the Build panel (axe, shelter, storage), visible
        //  whenever anything on it is still unbuilt. Each item inside gates independently —
        //  this button is just the door, never a priority slot itself.
        let secondary = { label: '', visible: false };
        if (!state.tools.axe || !state.shelter.built || !state.storage.built) {
            secondary = { label: 'Build', visible: true };
        }

        this.hud.update({
            warmth: state.warmth, thirst: state.thirst, hunger: state.hunger, health: state.health, energy: state.energy,
            sheltered, inventory: state.inventory, tools: state.tools,
            gameHoursElapsed: state.gameHoursElapsed, goal: this.goalLine(state), action, secondary, skills: state.skills
        });
    }

    private goalLine(state: ReturnType<typeof session>['state']): string {
        //  Exhausted (C05): a soft debuff, but an active one — worth naming before anything
        //  else, since it is visibly slowing the player down right now.
        if (isExhausted(state)) {
            return state.shelter.built ? 'Exhausted — tap the shelter to sleep.' : 'Exhausted. A shelter would give you somewhere to rest.';
        }
        if (!state.tools.axe && !canCraftAxe(state)) {
            const s = axeShortfall(state);
            const needs = [s.wood && `${s.wood} wood`, s.stone && `${s.stone} stone`, s.fiber && `${s.fiber} fibre`].filter(Boolean).join(', ');
            if (needs) return `For an axe, still need ${needs}. Tap things to gather.`;
        }
        if (!state.tools.axe && canCraftAxe(state)) return 'You have the parts — Craft the axe.';
        if (!state.fire.built && state.inventory.wood >= TUNE.woodPerFire) return 'Enough wood. Build the fire.';
        if (!state.fire.built) return `Gather ${TUNE.woodPerFire} wood, then build a fire.`;
        if (!isFireLit(state)) return 'The fire is out. Tap it to add wood.';
        if (!state.shelter.built) return 'The fire holds. A shelter would make this place home.';
        return `Fire burning — about ${fireBurnHoursRemaining(state).toFixed(1)} game hours left.`;
    }

    private stepIdleHint(): void {
        if (runtime.panelOpen) return;
        if ((now() - this.lastActivityAt) / 1000 < TUNE.idleHintSeconds) return;
        this.lastActivityAt = now();
        this.showHint(this.contextualHint());
    }

    private contextualHint(): string {
        const s = session().state;
        if (isExhausted(s)) return s.shelter.built ? 'You are exhausted. Tap the shelter to sleep.' : 'You are exhausted. Building a shelter gives you somewhere to sleep.';
        if (s.thirst <= TUNE.thirstLowHintAt) return 'Thirsty. Tap the pond inland, west of the trees, to drink.';
        if (s.hunger <= TUNE.hungerLowHintAt && (s.inventory.berries || s.inventory.coconut || s.inventory.shellfish)) return 'Tap a food in your pack to eat it.';
        if (!s.tools.axe && canCraftAxe(s)) return 'You have the parts for an axe. Craft it.';
        if (!s.tools.axe) return 'An axe needs wood, stone, and fibre. Reeds by the pond are fibre.';
        if (!s.fire.built && s.inventory.wood >= TUNE.woodPerFire) return 'You have enough wood. Build the fire.';
        if (!s.fire.built) return 'Tap a standing tree to chop it, then build a fire.';
        if (!isFireLit(s)) return 'The fire is out. Tap it to add wood.';
        if (!s.shelter.built) return 'The Build panel has more than the axe now — a shelter awaits.';
        if (!isSheltered(s)) return 'Stand in the firelight to warm up.';
        return 'You are warming. Close the app — the island keeps the time.';
    }

    // ---- Death -----------------------------------------------------------

    private openDeath(): void {
        this.deathShown = true;
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.clearPending();
        this.cues.stopAllBeds();
        const s = session().state;
        showDeath(this.overlay, s.lastDeathCause ?? 'your wounds', s.trace.deaths, () => {
            runtime.panelOpen = false;
            this.deathShown = false;
            session().acknowledgeDeath(now());
            this.velX = 0; this.velZ = 0;
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

const TEST_SPEED_KEY = 'drift.testspeed.v1';

function readTestSpeed(): boolean {
    try { return localStorage.getItem(TEST_SPEED_KEY) === '1'; } catch { return false; }
}

function writeTestSpeed(value: boolean): void {
    try { localStorage.setItem(TEST_SPEED_KEY, value ? '1' : '0'); } catch { /* ignore */ }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Move a scalar toward a target by at most `maxStep`. */
function approachScalar(value: number, target: number, maxStep: number): number {
    const delta = target - value;
    if (Math.abs(delta) <= maxStep) return target;
    return value + Math.sign(delta) * maxStep;
}

/** The signed shortest angular difference from `from` to `to`, in radians. */
function shortestAngle(from: number, to: number): number {
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}

/** Frame-rate-independent lerp factor: at 60 fps it equals `perFrame`. */
function frameLerp(perFrame: number, dt: number): number {
    return 1 - Math.pow(1 - perFrame, dt * 60);
}

/** Slerp an angle toward a target at `rate` per second (frame-rate independent). */
function slerpAngle(from: number, to: number, rate: number, dt: number): number {
    return from + shortestAngle(from, to) * (1 - Math.exp(-rate * dt));
}

function lerpVec(a: Vector3, b: Vector3, t: number): Vector3 {
    return new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
}
