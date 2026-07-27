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
    canCraftTorch,
    canDrinkAtPond,
    canDrinkFlask,
    canFeedFire,
    canFillFlask,
    canLightTorch,
    canRepairStructure,
    craftAxe,
    craftStoneHammer,
    craftTorch,
    distance,
    drinkAtPond,
    drinkFlask,
    eat,
    feedFire,
    fillFlask,
    fireBurnHoursRemaining,
    gatherNode,
    isAtPond,
    fatigueStageOf,
    fatigueStatusText,
    isExhausted,
    isFireLit,
    isSheltered,
    knapSharpblade,
    lightTorch,
    carriedWeightKg,
    equipToActiveHand,
    isOverloaded,
    loadoutView,
    ownedTools,
    stowActiveHand,
    tryCombine,
    loadSpeedMultiplierOf,
    nodeHoldSeconds,
    nodeSpec,
    recordCombinationAttempts,
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
    addCarriedButton,
    paintBackpackLoad,
    addSettingsButton,
    Hud,
    levelToast,
    pickupToast,
    showBuildCard,
    showColdOpen,
    showDeath,
    showLoadout,
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
    //  Freeze backstop (see guardPanelLock): when control was taken but nothing visible
    //  holds it, and when the DOM was last probed for that.
    private panelMissingSinceMs = 0;
    private lastPanelProbeAt = 0;

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
        addCarriedButton(this.overlay, () => this.openLoadout());

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
        //  D-059: live render cost, so tree parity's price is a reported number rather than
        //  an assumption. Pickable count matters twice over — every pickable mesh is work
        //  for each interaction raycast, not just for the renderer.
        runtime.tapTargetAt = (x: number, y: number) => this.tapTargetAt(x, y);
        runtime.stickReadout = () => this.controls.read();
        runtime.velocityReadout = () => ({ x: this.velX, z: this.velZ });
        runtime.fovReadout = () => (this.camera.fov * 180) / Math.PI;
        runtime.tryCombine = (a, b) => {
            const result = tryCombine(session().state, a as 'wood', b as 'wood');
            session().persist(now());
            return result;
        };
        runtime.renderCost = () => {
            const meshes = this.scene.meshes ?? [];
            let pickable = 0;
            for (const m of meshes) if (m.isPickable) pickable += 1;
            return {
                totalMeshes: meshes.length,
                pickableMeshes: pickable,
                activeMeshes: this.scene.getActiveMeshes().length
            };
        };
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

    /**
     * INPUT SAFETY (v0_7 §9, treated as HARD LAW, not polish — the source's own framing is
     * that "permanent death makes input reliability a safety requirement"). Every panel
     * opens and closes through this pair, so no panel can be added later that forgets a
     * step.
     *
     * On open: take pointer/camera ownership explicitly (`panelOpen` gates the world tap
     * path), cancel every in-flight gesture (`releaseAll` clears stick, look and any held
     * world pointer), and drop any pending intention or running hold so nothing resolves
     * underneath the panel.
     *
     * On close: **control is NOT restored on the closing input itself.** `panelOpen` stays
     * true until that pointer has actually released, because the close button's own
     * `pointerup`/`click` would otherwise fall straight through to the world and fire a
     * world tap at whatever happens to be behind the button. That is the specific gap this
     * closes — the previous code cleared `panelOpen` inside the close handler, which runs
     * while the closing gesture is still in flight.
     */
    private beginPanel(): void {
        runtime.panelOpen = true;
        this.controls.releaseAll();
        this.clearPending();
        this.cancelHold();
    }

    private endPanel(then?: () => void): void {
        //  Defer to the next macrotask AND require the pointer to be up. `pointerup` for the
        //  closing tap is dispatched before this resolves, so the world never sees it.
        const restore = () => {
            runtime.panelOpen = false;
            this.lastActivityAt = now();
            if (then) then();
        };
        if (typeof window === 'undefined') { restore(); return; }
        window.setTimeout(restore, 0);
    }

    /**
     * The backstop for the whole freeze class (URGENT FIX, 2026-07-27).
     *
     * `beginPanel` commits the control transfer *before* the panel is proven to be on
     * screen, so anything that goes wrong afterwards — a throw mid-render, markup that
     * never reveals itself — leaves `panelOpen === true` with nothing visible to close.
     * Every other panel's `if (runtime.panelOpen) return` guard then refuses too, Settings
     * included, while the render loop keeps ticking the clock. The player is locked out of
     * their own game with no way back but a reload, and on a permanent-death game that is a
     * safety failure, not a papercut.
     *
     * So: if control is held but no panel is actually *visible* for a full second, the game
     * takes control back and says so out loud (D-049). One second is long enough that no
     * legitimate transition trips it — `fade` removes the element 320 ms before `endPanel`
     * restores, and an open panel is visible within a frame — and short enough that a
     * player who hit the bug feels a hitch rather than a lockup.
     *
     * This is deliberately a *recovery*, not a fix: `panelRecoveries` counting above zero
     * means something upstream is broken and the harness fails on it.
     */
    private guardPanelLock(stamp: number): void {
        if (!runtime.panelOpen) { this.panelMissingSinceMs = 0; return; }
        if (typeof document === 'undefined') return;
        if (stamp - this.lastPanelProbeAt < 100) return;
        this.lastPanelProbeAt = stamp;

        const panel = this.overlay.querySelector<HTMLElement>('.panel:not(.leaving)');
        const visible = panel !== null && parseFloat(getComputedStyle(panel).opacity || '0') > 0.01;
        if (visible) { this.panelMissingSinceMs = 0; return; }

        if (this.panelMissingSinceMs === 0) { this.panelMissingSinceMs = stamp; return; }
        if (stamp - this.panelMissingSinceMs < 1000) return;

        this.panelMissingSinceMs = 0;
        runtime.panelRecoveries += 1;
        console.error(
            `[drift] input lock recovered: control was held with no visible panel (${panel ? 'panel present but transparent' : 'no panel in the overlay'}).`
        );
        for (const stuck of this.overlay.querySelectorAll('.panel')) stuck.remove();
        this.controls.releaseAll();
        this.clearPending();
        this.cancelHold();
        //  C3 finding D7: release through `endPanel`, not by clearing the flag here. The
        //  deferred restore is the whole reason the close path does not leak a world tap,
        //  and a recovery has no business being the one code path that skips it.
        this.endPanel();
    }

    private openColdOpen(): void {
        this.beginPanel();
        showColdOpen(this.overlay, COLD_OPEN.title, COLD_OPEN.body, () => {
            this.endPanel(() => {
                grantControl();
                this.cues.unlock();
                this.showHint('Tap the driftwood on the sand. You will walk over and take it.');
            });
        });
    }

    private openReport(report: MorningReport): void {
        this.beginPanel();
        grantControl();
        showMorningReport(this.overlay, report, () => {
            this.endPanel(() => {
                this.cues.unlock();
                session().markSteelThreadComplete();
                session().persist(now());
            });
        });
    }

    /**
     * The loadout panel (v0_7 §9, D-063) — all six access zones, contents plus mass and
     * bulk, storage inspectable in place. Opens and closes through `beginPanel`/`endPanel`,
     * so §9's input-safety law applies to it exactly as it does to every other panel.
     */
    /**
     * The secondary button is contextual: at a shelter that wants mending it mends, and it
     * is the Build card everywhere else. Dispatching here rather than at the HUD keeps the
     * label and the action reading from the same condition, so they cannot disagree.
     *
     * **THIS IS AN INTERIM FIX, AND THE DEBT IS REAL.** The disease is "one object, several
     * verbs" — a shelter you can sleep in, mend, and later do more with. Every attempt to
     * resolve that by ranking the verbs against each other has starved one of them: repair
     * beat sleep whenever it was merely possible, then beat it below a threshold, then left a
     * 40–90% band where mending was unreachable by any input. Ranking is the wrong tool.
     *
     * The real fix is the **radial circle (Ch.4, the director's own spec): tap = the default
     * verb, and when an object offers more than one, a circle divides and the player picks.**
     * That is not half-built here on purpose — a partial circle would be worse than none. The
     * secondary button is a stopgap that makes every verb reachable *today*; it is not the
     * design, and it should be deleted when the circle lands.
     */


    private openLoadout(atStorage = false): void {
        if (runtime.panelOpen) return;
        this.beginPanel();
        //  The open path runs INSIDE the control transfer, so if any of it throws the game
        //  would be left holding control with nothing on screen to give it back. Hand it
        //  back immediately and let the error surface (D-049) rather than lock the player
        //  out. `guardPanelLock` is the backstop for the cases this cannot see.
        try {
            const s = session().state;
            const view = loadoutView(s);
            showLoadout(
            this.overlay,
            {
                zones: view.zones.map((z) => ({ zone: z.zone, tools: z.tools, materials: z.materials })),
                massKg: view.massKg,
                bulk: view.bulk,
                storageOpen: view.storageOpen,
                equippable: ownedTools(s),
                activeHand: s.loadout.activeHand,
                atStorage: atStorage && s.storage.built,
                storageAction: atStorage ? this.storageActionLabelFor(s) : null,
                repairLabel: atStorage && canRepairStructure(s, 'storage')
                    ? `Mend  ·  +${TUNE.repairDurabilityPerWood} durability`
                    : null
            },
            (tool) => {
                const result = equipToActiveHand(session().state, tool as ReturnType<typeof ownedTools>[number]);
                if (result.ok) {
                    this.cues.play(CUES.pickup);
                    this.floatText(`${tool} in hand`);
                    session().persist(now());
                }
            },
            () => { if (stowActiveHand(session().state)) session().persist(now()); },
            () => this.endPanel(),
            () => this.tryUseStorage(),
            () => this.tryRepair('storage')
        );
        } catch (error) {
            //  C3 finding C3 on D-065: releasing control is not enough — `showLoadout` may
            //  have appended a half-built panel before it threw, and `guardPanelLock` returns
            //  on its first line once `panelOpen` is false, so the backstop is blind to
            //  exactly the state this catch produces. Clear the wreckage here.
            for (const stuck of this.overlay.querySelectorAll('.panel.loadout')) stuck.remove();
            this.endPanel();
            console.error('[drift] loadout panel failed to open; control returned.', error);
        }
    }

    private openSettings(): void {
        if (runtime.panelOpen) return;
        this.beginPanel();
        showSettings(this.overlay, this.testSpeedEnabled,
            (value) => { this.testSpeedEnabled = value; writeTestSpeed(value); },
            () => this.endPanel(),
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

    /**
     * What a tap at this screen point WOULD target, with no side effect.
     *
     * Harness-fidelity mandate (D-050): the reachability of the shelter's silhouette can
     * only be measured by asking the shipped pick path itself. Reading `pending()` after a
     * real tap cannot do it — `stepInteraction` nulls the intention the moment the player
     * is already in range, so the probe reads `none` whether the tap landed or not (C3
     * finding C4 on D-065). This runs exactly the same `pickHitPoint` and the same
     * nearest-centre-wins sort `onTap` runs, and returns the answer instead of acting on it.
     */
    private tapTargetAt(screenX: number, screenY: number): string | null {
        const node = this.pickNode(screenX, screenY);
        if (node) return `node:${node.node.id}`;
        const point = this.pickHitPoint(screenX, screenY);
        if (!point) return null;
        const s = session().state;
        const candidates: Array<{ kind: string; d: number }> = [];
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
        return candidates[0]?.kind ?? null;
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
            //  Sleep is what a shelter is FOR, so a tap on it sleeps. Full stop — no
            //  durability test, no urgency test, nothing that can shadow it. Mending lives on
            //  its own control (see `onSecondaryAction`). Two rulings' worth of priority
            //  hacks were tried here and both produced a starved verb; the hack is deleted
            //  rather than retuned. See the INTERIM note on `onSecondaryAction`.
            this.trySleep();
            this.pending = null;
            return;
        }

        if (this.pending.kind === 'storage') {
            //  Tapping the box opens the box (URGENT FIX, 2026-07-27) — the director's whole
            //  expectation, and the thing that was never true: the tap used to run a silent
            //  bulk deposit, and before even that, a repair. Storing, taking and mending are
            //  now choices you make with the contents in front of you, not lotteries.
            this.openLoadout(true);
            this.pending = null;
            return;
        }

        //  A node: tap-kind gathers at once; hold-kind starts an auto-hold (the castaway
        //  works it), the LDOE "walk over and chop" beat.
        const view = this.nodes.find(this.pending.id);
        if (!view || !view.node.available) { this.pending = null; return; }

        if (nodeSpec(view.node.kind).needsAxe && !s.tools.axe) {
            //  Ch.2 item 6 (feedback must be perceivable): the nearest TRUE reason, not a
            //  flat "you need an axe" — see `axeNearestReason` below.
            const reason = this.axeNearestReason(s);
            this.explain(view.node.kind === 'crashbox' ? `The box is sealed. ${reason}` : reason);
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

    /**
     * What the storage tap's one bulk verb will actually do, named before you commit to it.
     * `useStorage` deposits everything storable you carry, or withdraws a batch if you carry
     * none — the player could not previously tell which, because the verb was invisible.
     */
    private storageActionLabelFor(s: ReturnType<typeof session>['state']): string | null {
        const keys = ['wood', 'stone', 'fiber'] as const;
        if (keys.some((k) => s.inventory[k] > 0)) return 'Store what you carry';
        if (keys.some((k) => s.storage.stored[k] > 0)) return 'Take from the box';
        return null;
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
            this.explain(result.reason === 'need-axe' ? this.axeNearestReason(session().state) : 'Nothing there.');
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
        //  FIX-5 (Living Island Track A): lighting an owned, unlit torch takes priority at
        //  an active fire. This never starves feed-fire the way an ill-considered priority
        //  once did (D-042's lesson) — `canLightTorch` is only true in the rare, transient
        //  window right after crafting an unlit torch, never "almost always true" the way
        //  the C03 bug's gating condition was.
        if (canLightTorch(s)) {
            lightTorch(s);
            this.cues.play(CUES.ignition);
            this.floatText('torch lit');
            session().persist(now());
            this.lastActivityAt = now();
            return;
        }
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
        this.beginPanel();
        this.clearPending();
        const s = session().state;
        //  Ch.1's null-outcome journal (D-055): evaluate every recipe slot against every
        //  material currently held, once per panel-open — cheap, and the only place this
        //  needs to run, since nothing about a slot/material match depends on anything
        //  that changes between opens.
        recordCombinationAttempts(s);
        session().persist(now());
        showBuildCard(
            this.overlay,
            {
                torch: { have: { wood: s.inventory.wood, fiber: s.inventory.fiber }, done: s.torch.owned },
                axe: { have: { wood: s.inventory.wood, sharpblade: s.inventory.sharpblade, fiber: s.inventory.fiber }, done: s.tools.axe },
                shelter: { have: { wood: s.inventory.wood, stone: s.inventory.stone, fiber: s.inventory.fiber }, done: s.shelter.built },
                storage: { have: { wood: s.inventory.wood, stone: s.inventory.stone }, done: s.storage.built },
                //  Mending, on the construction surface where it belongs (Gate 0 Part 1).
                //  Reachable at ANY durability below full — no threshold, no urgency gate,
                //  and it displaces nothing, which the secondary-button attempt did not
                //  manage: standing at your own shelter it replaced Build outright and made
                //  storage unbuildable. The device harness caught that within one run.
                mendShelter: canRepairStructure(s, 'shelter')
                    ? { durability: s.shelter.durability, max: TUNE.structureDurabilityMax, gain: TUNE.repairDurabilityPerWood }
                    : null,
                stoneHammer: { have: { wood: s.inventory.wood, stone: s.inventory.stone }, done: s.tools.stoneHammer }
            },
            { owned: s.tools.stoneHammer, stoneHave: s.inventory.stone, stoneCost: TUNE.knapStoneCost, sharpbladeHave: s.inventory.sharpblade },
            () => {
                this.endPanel();
                if (craftTorch(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the torch is yours — light it at a fire');
                    session().markFirstCraft(msSinceControl());
                    session().persist(now());
                    this.showHint('Tap the fire to light your torch.');
                }
                this.lastActivityAt = now();
            },
            () => {
                this.endPanel();
                if (craftAxe(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the axe is yours');
                    session().markFirstCraft(msSinceControl());
                    session().persist(now());
                    this.showHint('Now tap a standing tree, or that sealed box, to use it.');
                }
                this.lastActivityAt = now();
            },
            () => { this.endPanel(); this.onBuildShelter(); },
            () => { this.endPanel(); this.onBuildStorage(); },
            () => {
                this.endPanel();
                if (craftStoneHammer(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the stone hammer is yours');
                    session().markFirstCraft(msSinceControl());
                    session().persist(now());
                    this.showHint('Open Build again to knap a sharp blade.');
                }
                this.lastActivityAt = now();
            },
            () => {
                this.endPanel();
                if (knapSharpblade(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('+1 sharp blade');
                    session().persist(now());
                }
                this.lastActivityAt = now();
            },
            () => this.endPanel(),
            () => { this.endPanel(); this.tryRepair('shelter'); }
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

        this.guardPanelLock(stamp);

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
        //  Ch.6 (D-058) adds the load band as a third multiplier on the same line, for the
        //  same reason: it scales `walkSpeedMps` at use and never mutates the constant. A
        //  `light` band multiplies by exactly 1, so an unencumbered castaway moves exactly
        //  as they did before this chapter existed.
        const speedScale =
            (isExhausted(state) ? TUNE.energySlowWalkMultiplier : 1) *
            (this.testSpeedEnabled ? TUNE.testSpeedMultiplier : 1) *
            //  D-059: weight-aware, not band-aware. The banded form saturated at the Heavy
            //  threshold, so 100 stone moved exactly as fast as 16 — the director's report.
            //  Floored inside `loadSpeedMultiplierOf` so no load can approach a soft-lock.
            loadSpeedMultiplierOf(state);

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

        //  COLLIDE-AND-SLIDE. A modest movement improvement — **NOT** the cause of the
        //  movement hard-block, though it was committed as such before the A/B was run.
        //
        //  The honest measurement, glancing approach past a shelter, 3 s of held stick:
        //      radial push-out alone (pre-fix):  lateral 0.50 m, ended (-0.50, 94.77)
        //      with collide-and-slide (post-fix): lateral 0.50 m, ended (-0.50, 93.35)
        //  The radial push-out ALREADY slides, because a glancing contact has a lateral
        //  component in the push itself. This only makes the slide a little more efficient
        //  (~1.4 m further in the same time). Kept because it is more principled and costs
        //  nothing; it does not close the hard-block, and must not be described as if it did.
        //
        //  A perfectly PERPENDICULAR approach still stops the player dead, and that is
        //  correct physics — there is no tangential component to preserve. Measured: walking
        //  due south into a shelter at (0, 98) pins at exactly (0, 99.70) = 98 + 1.3 + 0.4.
        const dynamic = this.dynamicObstacles();
        const resolved = this.island.resolveCollision(x, z, TUNE.playerCollisionRadius, dynamic);
        const pushX = resolved.x - x;
        const pushZ = resolved.z - z;
        x = resolved.x;
        z = resolved.z;
        const pushLen = Math.hypot(pushX, pushZ);
        if (pushLen > 1e-6) {
            const nx = pushX / pushLen;
            const nz = pushZ / pushLen;
            //  Remove only the inward component; whatever runs along the surface survives.
            const into = this.velX * nx + this.velZ * nz;
            if (into < 0) {
                this.velX -= nx * into;
                this.velZ -= nz * into;
                const slid = this.island.resolveCollision(
                    x + this.velX * dt, z + this.velZ * dt, TUNE.playerCollisionRadius, dynamic
                );
                x = slid.x;
                z = slid.z;
            }
        }

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
        this.player.syncTools(s.tools.axe, s.tools.axeGrade);
        this.player.syncTorch(s.torch.owned, s.torch.lit, this.nightFactor(s.gameHoursElapsed), s.torch.grade);
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

        //  Build: one entry point to the Build panel (axe, shelter, storage, torch), visible
        //  whenever anything on it is still unbuilt. Each item inside gates independently —
        //  this button is just the door, never a priority slot itself.
        //
        //  FIX (real-device report): this condition was never updated when D-052 added the
        //  torch as a fourth Build-panel item — so once a player had axe + shelter + storage
        //  all built (exactly what a long-running save accumulates), the button vanished
        //  entirely, even with the torch still uncrafted and reachable inside the panel. The
        //  device harness never caught it because every harness scenario opens the Build
        //  panel EARLY, before all three older items are built — it never exercised the
        //  "everything but the torch" state a real long session reaches.
        let secondary = { label: '', visible: false };
        if (!state.tools.axe || !state.shelter.built || !state.storage.built || !state.torch.owned || !state.tools.stoneHammer) {
            secondary = { label: 'Build', visible: true };
        }

        this.hud.update({
            warmth: state.warmth, thirst: state.thirst, hunger: state.hunger, health: state.health, energy: state.energy,
            sheltered, inventory: state.inventory, tools: state.tools,
            carry: { kg: carriedWeightKg(state), overloaded: isOverloaded(state) },
            gameHoursElapsed: state.gameHoursElapsed, goal: this.goalLine(state), action, secondary, skills: state.skills
        });
        paintBackpackLoad(this.overlay, carriedWeightKg(state), isOverloaded(state));
    }

    private goalLine(state: ReturnType<typeof session>['state']): string {
        //  Exhausted (C05): a soft debuff, but an active one — worth naming before anything
        //  else, since it is visibly slowing the player down right now.
        if (isExhausted(state)) {
            return state.shelter.built ? 'Exhausted — tap the shelter to sleep.' : 'Exhausted. A shelter would give you somewhere to rest.';
        }
        //  Ch.6 (D-058): fatigue's severe stage is named plainly, right after exhaustion and
        //  before the build funnel — it is an active body state the player should be able to
        //  act on. HONEST-SYSTEMS RAIL: this is a truthful status line about a real tracked
        //  value and nothing more. No number the player reasons from is altered, hidden, or
        //  distorted at any fatigue stage; the chapter's "perceptual distortion" idea is
        //  cosmetic-only and deliberately NOT built in this brain-layer slice (see the
        //  as-built) precisely so it cannot be mistaken for a mechanic that lies.
        if (fatigueStageOf(state) === 'severe') {
            const text = fatigueStatusText('severe');
            if (text) return state.shelter.built ? `${text} Tap the shelter to sleep.` : text;
        }
        if (!state.tools.axe && !canCraftAxe(state)) {
            const s = axeShortfall(state);
            const needs = [s.wood && `${s.wood} wood`, s.sharpblade && `${s.sharpblade} sharp blade`, s.fiber && `${s.fiber} fibre`].filter(Boolean).join(', ');
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

    /**
     * The nearest TRUE reason the axe isn't ready yet (Ch.2 item 6, feedback must be
     * perceivable): a flat "you need an axe" hard-gates without saying what to actually do
     * next. Names whichever step of the Tier-0 chain (stone hammer → knapped blade →
     * wood/fibre) is the one genuinely blocking right now. Callers only reach this once
     * `!s.tools.axe` is already established — every branch below is reachable. Shared by
     * the idle hint and both tap-explain sites that used to hardcode the flat message.
     */
    private axeNearestReason(s: ReturnType<typeof session>['state']): string {
        if (!s.tools.stoneHammer) return 'You need a stone hammer first — knap a blade, then make the axe (Build panel).';
        if (s.inventory.sharpblade < TUNE.axeSharpbladeCost) return 'You need a knapped blade for the axe (Build panel).';
        return 'You have a blade — you need wood and fibre for the axe.';
    }

    private contextualHint(): string {
        const s = session().state;
        if (isExhausted(s)) return s.shelter.built ? 'You are exhausted. Tap the shelter to sleep.' : 'You are exhausted. Building a shelter gives you somewhere to sleep.';
        //  Ch.6: the mild/moderate stages get an idle nudge rather than the goal line —
        //  they are worth naming, but never worth displacing the build funnel over.
        {
            const stage = fatigueStageOf(s);
            if (stage === 'mild' || stage === 'moderate') {
                const text = fatigueStatusText(stage);
                if (text) return s.shelter.built ? `${text} The shelter is where you sleep.` : text;
            }
        }
        if (s.thirst <= TUNE.thirstLowHintAt) return 'Thirsty. Tap the pond inland, west of the trees, to drink.';
        if (s.hunger <= TUNE.hungerLowHintAt && (s.inventory.berries || s.inventory.coconut || s.inventory.shellfish)) return 'Tap a food in your pack to eat it.';
        if (!s.tools.axe && canCraftAxe(s)) return 'You have the parts for an axe. Craft it.';
        if (!s.tools.axe) return this.axeNearestReason(s);
        if (!s.torch.owned && canCraftTorch(s)) return 'You have the parts for a torch, too — Build panel.';
        if (!s.fire.built && s.inventory.wood >= TUNE.woodPerFire) return 'You have enough wood. Build the fire.';
        if (!s.fire.built) return 'Tap a standing tree to chop it, then build a fire.';
        if (!isFireLit(s)) return 'The fire is out. Tap it to add wood.';
        //  FIX-5: a low-priority idle nudge only — never inserted into the primary goal
        //  line above, which stays the carefully-sequenced axe/fire/shelter funnel
        //  (D-040/D-042). The torch is optional content; it earns a hint, not a gate.
        if (canLightTorch(s)) return 'Your torch is unlit. Tap the fire to light it.';
        if (!s.shelter.built) return 'The Build panel has more than the axe now — a shelter awaits.';
        if (!isSheltered(s)) return 'Stand in the firelight to warm up.';
        return 'You are warming. Close the app — the island keeps the time.';
    }

    // ---- Death -----------------------------------------------------------

    private openDeath(): void {
        this.deathShown = true;
        //  C3 finding A1 on D-063: this panel was the one that never joined the pair — it
        //  inlined `panelOpen = true` and skipped `cancelHold()`, so a gather hold running
        //  at the moment of death survived under the death overlay. Fixed here because it
        //  is the same input-safety class as the freeze. No death-MODEL change: what dying
        //  costs and how respawn works are untouched.
        this.beginPanel();
        this.cues.stopAllBeds();
        const s = session().state;
        showDeath(this.overlay, s.lastDeathCause ?? 'your wounds', s.trace.deaths, () => {
            this.endPanel();
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
