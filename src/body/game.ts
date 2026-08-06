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
    fireIsKnown,
    buildShelter,
    buildStorage,
    canBuildFire,
    canCraftAxe,
    canCraftTorch,
    canDrinkAtPond,
    canDrinkFlask,
    canFeedFire,
    canLightTorch,
    canRepairStructure,
    craftAxe,
    craftStoneHammer,
    craftSpear,
    makeBackpack,
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
    equipToSupportHand,
    isOverloaded,
    loadoutView,
    ownedTools,
    stowActiveHand,
    stepMovement,
    tapOpensCircle,
    holdOpensCircle,
    defaultVerb,
    verbsFor,
    readWrite,
    writeEntry,
    limpSpeedMultiplierOf,
    injuryNote,
    illnessCosts,
    illnessNote,
    illnessStage,
    canBrewRemedy,
    brewRemedy,
    canTakeMedicine,
    medicineBlocker,
    takeMedicine,
    droppedWithinReach,
    previewFor,
    pickUpDropped,
    dropAll,
    bindWound,
    nearestBoar,
    thrustSpear,
    makeJournal,
    setJournalCarried,
    type MoveStep,
    refugeReport,
    tryCombine,
    ALL_MATERIAL_KINDS,
    tryCombineWith,
    growthReport,
    availableOutcomes,
    siteHasAnything,
    previewAt,
    settleOnTerrain,
    bodyReport,
    revealedInPanel,
    makerOffers,
    panelHints,
    announcementFor,
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
    type RepairTarget,
    isShelteredSleep,
    //  ---- THE MARITIME SLICE ----
    boardRaft,
    canBoardRaft,
    craftRaft,
    leaveRaft,
    leaveRaftIsIntoWater,
    nearShoreForRaft,
    raftBlocker,
    steerRaft,
    swimNote,
    swimStageOf,
    waterSpeedMultiplierOf,
    waterZoneOf,
    wreckNoteFor,
    readTrace,
    readingFor,
    traceById,
    traceSites,
    type GameState
} from '../brain';
import { TUNE } from '../data/tune';
import { COLD_OPEN, POND, WORLD, surfaceHeightAt } from '../data/world';
import { CUES, Cues, type CueKey } from './audio';
import { BoarsView } from './boarView';
import { Controls } from './controls';
import { CaveView, FireView, GhostView, NodeViews, PlayerView, RaftView, ShelterView, StorageView, type NodeView } from './entities';
import {
    addCarriedButton,
    paintBackpackLoad,
    addSettingsButton,
    Hud,
    levelToast,
    pickupToast,
    showBuildCard,
    showSiteCard,
    type BackpackTab,
    showColdOpen,
    showDeath,
    showLoadout,
    showMorningReport,
    showSettings,
    showVerbCircle
} from './hud';
import { Island, type Obstacle } from './island';
import { grantControl, msSinceControl, now, recordBodyTrace, runtime, sampleFrame, session, type PressFrame } from './runtime';
import { RENDER } from './theme';

/** What the player has tapped and wants to reach, if anything. */
type Pending =
    | { kind: 'node'; id: string }
    | { kind: 'fire' }
    | { kind: 'pond' }
    | { kind: 'shelter' }
    | { kind: 'boar'; id: string }
    | { kind: 'storage' }
    //  THE MARITIME SLICE. Routed through exactly the same tap/hold/circle machinery as the
    //  four above — a vehicle does not get a bespoke input path, because a bespoke path is
    //  where the Default-Verb Law quietly stops applying.
    | { kind: 'raft' }
    //  THE FAR ISLAND — a trace site. Same tap/hold/circle machinery as everything else; a
    //  note somebody left is not special-cased into its own input path.
    | { kind: 'trace'; id: string }
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

/** Plain names for the knowledge domains, for anything the player actually reads. */
const DOMAIN_LABEL: Record<string, string> = {
    survivalcraft: 'Survivalcraft',
    foragingMedicine: 'Foraging',
    harvestingFabrication: 'Harvesting',
    construction: 'Construction',
    mechanicalSystems: 'Mechanics',
    electricalRadio: 'Electrics',
    navigationSeamanship: 'Seamanship'
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
    private cave: CaveView;
    private ghost: GhostView;
    private storage: StorageView;
    private raftView: RaftView;
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
    //  Feel-court instrumentation for the unified collision fix. Not debug scaffolding: the
    //  acceptance gate is that sliding READS as sliding through the player path, and an
    //  on-device check has no other way to witness the deflection branch firing.
    /** Where the last world tap landed, so a circle opens under the thumb that made it. */
    private lastTapPoint: { x: number; y: number } | null = null;
    /**
     * Was the pending intention set by a HOLD rather than a tap? The default-verb law turns
     * on this: a hold asks, a tap acts. Kept beside `pending` because it is a property of how
     * the intention was formed, and it must be cleared with it or a later tap inherits it.
     */
    private pendingWasHold = false;
    private lastTravelX = 0;
    private lastTravelZ = 0;
    private lastContact = false;
    /** Surface-to-surface gap to the nearest obstacle after the last resolved frame. See the
     *  `leaning` gate in `stepMovement` — contact is penetration, and "still leaning on it"
     *  is the question the direction memory actually wants answered. */
    private lastNearestGapM = Infinity;
    private lastDeflected = false;
    private contactFrames = 0;
    private deflectFrames = 0;
    //  THE PRESS TRACE (C1's diagnostic ruling). Null until a diagnostic arms it; capped, so
    //  an armed-and-forgotten trace cannot grow without bound. Never read by the game.
    private pressFrames: PressFrame[] | null = null;
    private pressCapacity = 0;
    private pressArmedAt = 0;
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
    private boars!: BoarsView;
    /** Last stage announced per boar, so a cue fires ONCE on entry, never every frame. */
    private boarStageSpoken = new Map<string, string>();
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
        this.cave = new CaveView(this.scene);
        this.ghost = new GhostView(this.scene);
        runtime.ghostReadout = () => this.ghost.debugState();
        this.storage = new StorageView(this.scene);
        this.raftView = new RaftView(this.scene);

        const state = session().state;
        this.nodes = new NodeViews(this.scene, state.nodes, (x, z) => this.island.heightAt(x, z));
        this.boars = new BoarsView(this.scene);
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
            onHold: (x, y) => this.onHold(x, y),
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
        //  THE MARITIME SLICE — the camera's live world position, read-only. `camPos` is what
        //  the camera was actually placed at this frame, so a swimmer whose view had followed
        //  the seabed down would show up here rather than being argued about.
        runtime.cameraPositionReadout = () => ({ x: this.camPos.x, y: this.camPos.y, z: this.camPos.z });
        runtime.groundAt = (x, z) => this.island.heightAt(x, z);
        runtime.playerFeetY = () => this.player.feetY;
        //  D-059: live render cost, so tree parity's price is a reported number rather than
        //  an assumption. Pickable count matters twice over — every pickable mesh is work
        //  for each interaction raycast, not just for the renderer.
        runtime.tapTargetAt = (x: number, y: number) => this.tapTargetAt(x, y);
        runtime.lastTapOutcome = () => this.tapBreadcrumbs[this.tapBreadcrumbs.length - 1]?.outcome ?? null;
        runtime.refuge = () => refugeReport(session().state);
        runtime.slideReadout = () => ({
            contact: this.lastContact,
            deflected: this.lastDeflected,
            contactFrames: this.contactFrames,
            deflectFrames: this.deflectFrames,
        });
        //  THE PRESS TRACE. Arming clears; dumping does not, so a diagnostic can read the same
        //  press twice and get the same answer — a dump that consumes its own evidence is how
        //  you end up arguing about a measurement nobody can re-read.
        runtime.pressTrace.arm = (capacity = 1800) => {
            this.pressFrames = [];
            this.pressCapacity = Math.max(1, Math.floor(capacity));
            this.pressArmedAt = now();
        };
        runtime.pressTrace.dump = () => this.pressFrames ?? [];
        runtime.obstaclesNear = (x, z, within) => this.island
            .obstacleField(this.dynamicObstacles())
            .filter((o) => Math.hypot(o.x - x, o.z - z) - o.radius <= within)
            .map((o) => ({ x: o.x, z: o.z, radius: o.radius }));
        runtime.stickReadout = () => this.controls.read();
        runtime.velocityReadout = () => ({ x: this.velX, z: this.velZ });
        runtime.fovReadout = () => (this.camera.fov * 180) / Math.PI;
        runtime.holdReadout = () => {
            if (!this.holdNodeId) return { nodeId: null, elapsedMs: 0, needSeconds: 0 };
            const view = this.nodes.find(this.holdNodeId);
            return {
                nodeId: this.holdNodeId,
                elapsedMs: now() - this.holdStartedAt,
                needSeconds: view ? nodeHoldSeconds(session().state, view.node) : -1
            };
        };
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
            //  [[D-124]] — the SURFACE, not the terrain. This read `heightAt(worldX, worldZ)`,
            //  which is the seabed once you are past the shelf, so aiming at anything afloat
            //  pointed metres underwater. See `surfaceHeightAt`'s header for the whole defect.
            //  On land the two are identical, so every existing aimed check is untouched.
            const y = surfaceHeightAt(worldX, worldZ) + 0.4;
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


    /**
     * THE BACKPACK HUB (Law 126). One surface, three tabs.
     *
     * `tab` selects which; `reopening` says this is a tab switch rather than a fresh open, so
     * the `panelOpen` guard is skipped — the lock is deliberately still held. Releasing it
     * between tabs would open a window for a world tap to land behind the panel, which is the
     * leak D-063's INPUT SAFETY law exists to stop, and it is also exactly how the growth
     * card's own handoff failed a session ago.
     */
    private openLoadout(atStorage = false, tab: BackpackTab = 'inventory', reopening = false): void {
        //  FAIL-LOUD (D-046(d)): silence is never a legal outcome. This used to `return`
        //  without a word when a panel was already open, and that silence cost this session
        //  four device runs — a storage tap became a no-op, and the failure surfaced six
        //  hundred checks later as an unrelated "panel ABSENT" with nothing pointing back.
        //
        //  It is a real player-facing defect too, not only a debugging one: a survivor who
        //  taps their store box and gets nothing has been told nothing about why. Now the
        //  refusal explains itself and leaves the same breadcrumb every other dead tap does.
        if (runtime.panelOpen && !reopening) {
            this.explain('Something else is open. Close it first.');
            return;
        }
        if (!reopening) this.beginPanel();
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
                    : null,
                //  Whatever raw material is actually in hand — experimentation works on what
                //  you carry, so the list is the carried materials, not a fixed menu.
                //
                //  DERIVED, never listed here again. This was a hardcoded six that omitted
                //  `sharpblade`, and that single missing string gated the soul loop: the axe
                //  needs wood + sharpblade + fibre, so a survivor holding a knapped blade
                //  could not select it, could not attempt the axe, and could not proceed. The
                //  UI label for it already existed — only the selectable list had drifted
                //  from the type it was supposed to mirror.
                combinable: ALL_MATERIAL_KINDS.filter((m) => (s.inventory[m] ?? 0) > 0),
                //  LAW 126's other two tabs, both READ from the brain. The hub renders
                //  them; nothing about their content is decided here.
                //  LAW 126: the maker's gate, read from the HUD's own computation so the
                //  Backpack shows exactly what the retired button would have.
                maker: this.hud.makerEntry(),
                vitals: bodyReport(s),
                vitalsExtra: {
                    injuries: { bleeding: s.injuries.bleeding, limp: s.injuries.limp, pain: s.injuries.pain },
                    injuryNote: injuryNote(s.injuries),
                    illness: { stage: illnessStage(s.illness), note: illnessNote(s.illness) },
                    activeHand: s.loadout.activeHand,
                    supportHand: s.loadout.supportHand,
                    equippable: ownedTools(s),
                    //  THE WRECK SLICE. Read from the brain — held count, whether it can be
                    //  spent right now, and the ONE truest reason when it cannot.
                    medicine: {
                        held: s.inventory.medicine,
                        usable: canTakeMedicine(s),
                        blocker: medicineBlocker(s),
                    },
                },
                skills: growthReport(s, s.capacities),
                playerSkills: s.skills
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
            () => this.tryRepair('storage'),
            (materials: string[]) => this.onTryCombine(materials),
            (material: string) => {
                const s2 = session().state;
                const item = dropAll(s2, material as never);
                if (!item) { this.explain('You are not carrying any.'); return; }
                this.cues.play(CUES.pickup);
                this.floatText(`${item.amount} ${item.kind} set down`);
                this.showHint('It keeps for three days. Pick it up to reset that.');
                session().persist(now());
                this.lastActivityAt = now();
            },
            (tool: string, hand: 'left' | 'right') => {
                const s2 = session().state;
                const r = hand === 'right'
                    ? equipToActiveHand(s2, tool as never)
                    : equipToSupportHand(s2, tool as never);
                if (!r.ok) {
                    //  Nearest-true-reason, same as the circle: say the ONE thing in the way.
                    this.explain(r.reason === 'two-handed' ? 'That needs both hands.'
                        : r.reason === 'other-hand-full' ? 'Your other hand is full with something two-handed.'
                        : r.reason === 'already-held' ? 'Already in that hand.'
                        : 'You do not have one.');
                    return;
                }
                this.cues.play(CUES.pickup);
                this.floatText(`${tool} in ${hand} hand`);
                session().persist(now());
            },
            //  THE WRECK SLICE — spending the medical store. Fail-loud on every refusal
            //  (D-042/D-049): the button is already disabled with its reason, and this is the
            //  second guard for the case where state moved between render and tap.
            () => {
                const s2 = session().state;
                const why = medicineBlocker(s2);
                if (!takeMedicine(s2)) { this.explain(why ?? 'You cannot use that now.'); return; }
                this.cues.play(CUES.craft);
                this.floatText('the medicine takes hold');
                session().persist(now());
                this.lastActivityAt = now();
            },
            (materials: string[]) => previewFor(session().state, materials as never).lines.join(' '),
            //  LAW 126: which tab, and how to switch. The lock is NOT released between tabs
            //  — the panel re-renders in place — because releasing it would let a world tap
            //  through the gap, which is the leak D-063's INPUT SAFETY law exists to stop.
            tab,
            (next) => this.openLoadout(atStorage, next, true),
            () => this.endPanel(() => this.openBuildCard())
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

    /**
     * The player's own experimentation, at last reachable (director's playtest). D-063 built
     * the whole brain for this and shipped it with no entry point; the only caller was the
     * debug hook. Outcome is reported in plain words, because a null result that says nothing
     * is indistinguishable from a broken button — which is how this stayed invisible.
     */
    private onTryCombine(materials: string[]): void {
        //  C3 finding F2 on D-073: the first cut tested `outcome === 'failed'`, which is not
        //  one of the five real outcomes — so `failed-attempt`, `already-known` AND `refused`
        //  all fell through to the success branch and were announced with the unlock cue,
        //  and a genuine invention never named its plan because the field is `blueprint`,
        //  not `blueprintName`. The `as { outcome: string }` cast is what hid all of it.
        //
        //  C3 finding A4 on the F3 remediation: the regression written for that locked the
        //  BRAIN's contract, which had never broken — so it passed on the pre-fix tree and
        //  proved nothing. The mistranslation was HERE, and this layer cannot be unit-tested
        //  (Babylon; the purity law). So the decision moved to `announcementFor`, where a
        //  test can reach it, and this is now rendering only.
        const result = tryCombineWith(session().state, materials as 'wood'[]);
        session().persist(now());
        const said = announcementFor(result);
        if (said.presentation === 'float') this.floatText(said.text);
        else this.explain(said.text);
        if (said.triumphant) this.cues.play(CUES.unlock);
        this.lastActivityAt = now();
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

    /**
     * The one and only ray the world is resolved with — and the one place the survivor's own
     * body is excluded from it.
     *
     * FIX 5, third attempt. Attempt one made the pack `isPickable` and it won `scene.pick`
     * against nine gather verbs, because a body drawn centre-screen is nearer to the camera
     * than anything you walk up to (D-074). Attempt two used a screen-space region, which
     * could not corrupt picking but had no way to tell the survivor's silhouette from the
     * ground behind them — so it ate `empty-ground`, the player's own "never mind" gesture,
     * across a 40–100 px band (C3's closing audit, finding A2).
     *
     * So: the pack is a real mesh again and is hit only when the ray genuinely strikes it —
     * no approximation — while every WORLD resolver goes through this helper, which filters
     * the body out. The exclusion lives HERE, once. My objection to this approach the first
     * time was that it needed remembering at every pick site; a shared helper is what
     * removes that, the same way `panel()` came to own the reveal it kept being forgotten at.
     */
    private worldPick(screenX: number, screenY: number) {
        const rect = this.canvas.getBoundingClientRect();
        return this.scene.pick(
            screenX - rect.left,
            screenY - rect.top,
            (m: AbstractMesh) => m.isPickable && !m.metadata?.isBody
        );
    }

    /** Which boar the ray struck, read from mesh metadata rather than from its name. */
    /**
     * A TRACE SITE the ray struck, by id.
     *
     * THE DEFECT THIS CLOSES, found by the device leg on its first run and no earlier. The
     * trace pending kind existed, `pendingTarget` could walk to one, and `actOnArrival`
     * could read one — and NOTHING CREATED THE PENDING. `worldCandidateAt` resolves world
     * targets by proximity to a struck point and returns a BARE KIND STRING, so it has
     * nowhere to put an id and never knew about traces at all. Every tap on a cairn fell
     * through to "empty ground".
     *
     * Same shape as `craftSpear`'s zero callers ([[D-114]]): the type, the handler and the
     * verb all existed, and the one line that reaches them did not. Unit tests could not see
     * it — every one of them calls `readTrace` directly, which is exactly the reachability
     * gap [[D-090]] names.
     *
     * A MESH RAY, not proximity, for the same reason a boar uses one: a trace is a specific
     * object rather than a region, and a proximity radius would let a cairn steal a tap
     * aimed past it at the ground beyond.
     */
    private pickTrace(screenX: number, screenY: number): string | null {
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top,
            (m: AbstractMesh) => Boolean(m.metadata?.traceId) && m.isPickable);
        const id = hit?.pickedMesh?.metadata?.traceId;
        return typeof id === "string" ? id : null;
    }

    /** The nearest trace site to a struck ground point, within tap forgiveness. */
    private traceNear(point: { x: number; z: number }): string | null {
        let best: string | null = null;
        let bestD = Infinity;
        for (const t of traceSites()) {
            const d = distance(point.x, point.z, t.x, t.y);
            if (d <= TUNE.traceTapRadiusM && d < bestD) { bestD = d; best = t.id; }
        }
        return best;
    }

    private pickBoar(screenX: number, screenY: number): string | null {
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(screenX - rect.left, screenY - rect.top,
            (m: AbstractMesh) => Boolean(m.metadata?.boarId) && m.isPickable);
        return BoarsView.boarIdOf(hit?.pickedMesh);
    }

    /** The survivor's own body, hit only by a ray aimed squarely at it. */
    private pickedBackpack(screenX: number, screenY: number): boolean {
        const rect = this.canvas.getBoundingClientRect();
        const hit = this.scene.pick(
            screenX - rect.left,
            screenY - rect.top,
            (m: AbstractMesh) => Boolean(m.metadata?.backpack)
        );
        return Boolean(hit?.hit);
    }

    private pickNode(screenX: number, screenY: number): NodeView | null {
        const hit = this.worldPick(screenX, screenY);
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
        const hit = this.worldPick(screenX, screenY);
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
        if (hit?.hit && hit.pickedMesh?.metadata?.traceId) {
            const t = traceById(hit.pickedMesh.metadata.traceId as string);
            if (t) return { x: t.x, z: t.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.raft) {
            const rf = session().state.raft;
            return { x: rf.x, z: rf.y, unexpectedMesh: null };
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
        //  DROP 1 — a boar the ray struck outranks everything. When one is in front of you it
        //  is the only thing you meant to touch.
        const traceProbe = this.pickTrace(screenX, screenY);
        if (traceProbe) return 'trace:' + traceProbe;
        const boarHit = this.pickBoar(screenX, screenY);
        if (boarHit) return `boar:${boarHit}`;
        const node = this.pickNode(screenX, screenY);
        if (node) return `node:${node.node.id}`;
        const point = this.pickHitPoint(screenX, screenY);
        if (!point) return null;
        //  C3 finding A9: this used to re-implement the tap's candidate collection — same
        //  radii, same sort, typed out twice — so the probe could report a different answer
        //  than the player's own tap produced. That is precisely what a harness-fidelity
        //  probe must never do, and it had already drifted once before. Worse, when FIX 5
        //  added the pack branch to the real tap, this copy did not get it, so the probe
        //  could not have reported `backpack` at all. One resolver now, called by both.
        const nearTraceProbe = this.traceNear(point);
        if (nearTraceProbe) return 'trace:' + nearTraceProbe;
        const winner = this.worldCandidateAt(point);
        if (winner) return winner;
        return this.pickedBackpack(screenX, screenY) ? 'backpack' : null;
    }

    /**
     * The nearest world target to a struck point, or null. THE one copy of this rule.
     *
     * Every candidate within its own forgiveness radius is collected and the NEAREST centre
     * wins — not the first one checked. Shelter and storage are built close together in
     * practice (both placed `~2.2 m` ahead of the builder), so their forgiveness radii can
     * overlap; an earlier first-match if-chain let the shelter (checked first) swallow taps
     * square on the storage crate whenever the two sat within about 2.8 m of each other — a
     * REGRESSION found via the device harness: a tap aimed at storage kept silently
     * repairing the shelter instead.
     */
    private worldCandidateAt(point: { x: number; z: number }): 'fire' | 'pond' | 'shelter' | 'storage' | 'raft' | null {
        const s = session().state;
        type Candidate = { kind: 'fire' | 'pond' | 'shelter' | 'storage' | 'raft'; d: number };
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
        if (s.raft.built) {
            const d = distance(point.x, point.z, s.raft.x, s.raft.y);
            if (d <= TUNE.raftTapRadiusM) candidates.push({ kind: 'raft', d });
        }
        candidates.sort((a, b) => a.d - b.d);
        return candidates[0]?.kind ?? null;
    }

    // ---- The tap — the one input path ------------------------------------

    /**
     * A tap sets an intention. The frame loop walks the castaway to it and acts on arrival.
     * A tap that lands on nothing interactive is a look-around, not a failure.
     */
    /**
     * A stationary hold on the world. Sets the same intention a tap would, flagged as a hold
     * so `actOnArrival` opens the circle instead of firing the default verb.
     *
     * It routes through `onTap` deliberately: one resolution path, so a hold can never target
     * something a tap could not. Divergence between two paths that resolve the same pixel is
     * the bug C3 found twice between `tapTargetAt` and `onTap`.
     */
    private onHold(screenX: number, screenY: number): void {
        //  THE TRACE STARTS HERE, before any early return. It was first written AFTER the
        //  pending check, so a hold that legitimately found a target left the trace empty and
        //  read as "onHold never ran" — a probe that cannot tell "did not run" from "ran and
        //  took the other branch" is the vacuity law applied to instrumentation, and it cost
        //  a run. The rule the checks live by applies to the diagnostics too: witness the
        //  target, not the absence of an alternative.
        runtime.holdTrace = ['onHold'];
        this.onTap(screenX, screenY);
        if (this.pending) {
            this.pendingWasHold = true;
            runtime.holdTrace.push(`target:${this.pending.kind}`);
            return;
        }
        runtime.holdTrace.push('no-target');

        //  §9.6 (Law 126): a HOLD on open ground asks what this ground is FOR. A TAP stays
        //  exactly what it was — the player's "never mind" look-around — so nothing anyone
        //  already does changes meaning, and the gesture vocabulary is the one Slice 2's
        //  Default-Verb Law already established: a tap acts, a hold asks.
        //
        //  This is what makes the site a decision. A global Build button could raise a
        //  shelter from anywhere, which told the player that WHERE they build does not
        //  matter — and if it does not matter, drainage, wind and distance to water are all
        //  decoration.
        //  PER-EVENT TRACE (the feel-court playbook, D-085 lineage). Four runs disagreed with
        //  four brain-side diagnostics that all read correct, which means the divergence is
        //  somewhere along this path and not at either end of it. So the path records where
        //  it actually stops, and the harness reads the signature instead of anyone guessing
        //  a fifth time. Cheap, and it stays: a gesture that silently declines is exactly the
        //  thing this project keeps paying for.
        if (runtime.panelOpen) { runtime.holdTrace.push('panel-open'); return; }
        const point = this.pickHitPoint(screenX, screenY);
        if (!point) { runtime.holdTrace.push('no-point'); return; }
        if (point.unexpectedMesh) { runtime.holdTrace.push(`unexpected:${point.unexpectedMesh}`); return; }
        runtime.holdTrace.push(`point:${point.x.toFixed(1)},${point.z.toFixed(1)}`);
        const s = session().state;
        //  Silent when there is genuinely nothing to say: a survivor with no demonstrated
        //  pattern has no construction to be offered, and inventing a message for that would
        //  be teaching them about a menu they do not have.
        if (!siteHasAnything(s, point.x, point.z)) { runtime.holdTrace.push('nothing-here'); return; }
        runtime.holdTrace.push('opening');
        this.openSiteCard(point.x, point.z);
        runtime.holdTrace.push(runtime.panelOpen ? 'opened' : 'open-failed');
    }

    /**
     * THE SITE CARD. Opens where the survivor chose, offers §9.6's human outcomes, and hands
     * the chosen one to the SAME `buildShelter`/`buildStorage` the Build panel used — one
     * path that spends materials, one that decides a grade, however the player got there.
     */
    private openSiteCard(x: number, z: number): void {
        if (runtime.panelOpen) { this.explain('Something else is open. Close it first.'); return; }
        this.beginPanel();
        const s = session().state;
        const offers = availableOutcomes(s, x, z);

        //  THE GHOST (bar property 1). It goes up the instant the card opens, at the point the
        //  survivor chose — BEFORE any commit, which is the whole property. Its colour is the
        //  verdict and nothing else (property 2): `previewAt` returns a real boolean, and the
        //  reason it also returns stays on the card for anyone who wants it.
        //
        //  The site is valid when SOMETHING can go up here. Asking `previewAt` for a blanket
        //  answer and ignoring the offers would paint green over a spot where every outcome is
        //  refused for want of materials, which is a ghost that lies.
        const settled = settleOnTerrain(x, z, (px, pz) => this.island.heightAt(px, pz));
        const preview = previewAt(s, x, z, (px, pz) => this.island.heightAt(px, pz),
            offers.find((o) => o.buildable) ?? offers[0] ?? null);
        this.ghost.show(settled.x, settled.y, settled.groundY, preview.valid);

        showSiteCard(
            this.overlay,
            offers.map((o) => ({
                outcome: o.outcome, label: o.label, buildable: o.buildable, reason: o.reason,
            })),
            //  ONE TAP COMMITS (property 4). This tap IS the build — there is no confirm step
            //  between them, and adding one is the specific thing the bar forbids.
            (outcome) => { this.ghost.hide(); this.endPanel(() => this.placeAtSite(outcome, x, z)); },
            //  ...and ONE TAP CANCELS, clearing the ghost with it. A ghost that outlived its
            //  card would be a translucent building the player cannot dismiss.
            () => { this.ghost.hide(); this.endPanel(); },
        );
    }

    /** Place the anchor and build. Refuses loudly if the world's own geometry says no. */
    private placeAtSite(outcome: string, x: number, z: number): void {
        const s = session().state;
        //  The world gets its own veto, separate from the brain's spacing rule: the brain
        //  knows what stands where, the body knows what the mesh is actually on top of.
        const radius = outcome === 'storage' ? TUNE.storageCollisionRadius : TUNE.shelterCollisionRadius;
        const clear = this.island.resolveCollision(x, z, radius, this.dynamicObstacles());
        const built = outcome === 'storage'
            ? buildStorage(s, clear.x, clear.z)
            : buildShelter(s, clear.x, clear.z);
        if (!built) { this.explain('That will not go up here.'); return; }
        this.cues.play(CUES.craft);
        this.floatText(outcome === 'storage' ? 'the crate is set' : 'the shelter stands');
        session().persist(now());
        this.lastActivityAt = now();
        this.showHint(outcome === 'storage'
            ? 'Tap the crate to store what you are carrying.'
            : 'Tap the shelter to sleep — it is home now.');
    }

    private onTap(screenX: number, screenY: number): void {
        //  A fresh tap is a tap until proven otherwise — clearing this here means a hold's
        //  flag can never be inherited by the next ordinary tap.
        this.pendingWasHold = false;
        if (runtime.panelOpen) { this.recordTap(screenX, screenY, 'panel-open'); return; }
        this.lastActivityAt = now();

        //  A node under (or near) the finger wins.
        //  DROP 1 — a boar outranks every other target. When one is in front of you, it is
        //  the only thing you meant to touch, and making the player out-click a bush to
        //  answer a charge would be the cruellest possible reading of the Default-Verb Law.
        const boarId = this.pickBoar(screenX, screenY);
        if (boarId) {
            this.pending = { kind: 'boar', id: boarId };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, `boar:${boarId}`);
            return;
        }

        const node = this.pickNode(screenX, screenY);
        if (node) {
            this.pending = { kind: 'node', id: node.node.id };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, `node:${node.node.id}`);
            return;
        }

        //  Otherwise, the fire, the pond, the shelter, or storage, by the point the ray
        //  struck — resolved by `worldCandidateAt`, the single copy of that rule, which the
        //  harness-fidelity probe calls too (C3 finding A9).
        //  A trace the ray struck outranks the point-based resolver: it is a specific
        //  object and carries an id the bare-kind path cannot express.
        const traceHit = this.pickTrace(screenX, screenY);
        if (traceHit) {
            this.pending = { kind: 'trace', id: traceHit };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, 'trace:' + traceHit);
            return;
        }

        const point = this.pickHitPoint(screenX, screenY);
        if (!point) { this.recordTap(screenX, screenY, 'no-hit'); return; }

        //  ...and a trace NEAR the struck point, for the flat ones the ray flies over. This is
        //  the raft's own rule applied to ground-level objects: resolve by proximity to where
        //  the ground was actually struck, so a fire ring is as tappable as a box.
        const nearTrace = this.traceNear(point);
        if (nearTrace) {
            this.pending = { kind: 'trace', id: nearTrace };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, 'trace:' + nearTrace);
            return;
        }

        const winner = this.worldCandidateAt(point);
        //  The pack, resolved only after every world target has declined AND only when the
        //  ray genuinely struck the survivor's body. `empty-ground` — the player's "never
        //  mind" gesture — therefore stays theirs: a tap on bare ground beside the survivor
        //  misses the mesh and falls through to it, which is the regression C3's A2 caught.
        if (!winner && this.pickedBackpack(screenX, screenY)) {
            this.recordTap(screenX, screenY, 'backpack');
            this.openLoadout();
            return;
        }
        if (winner) {
            this.pending = { kind: winner };
            this.cues.play(CUES.target);
            this.recordTap(screenX, screenY, winner);
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

    /**
     * PERFORM ONE VERB. The single place a verb is executed, so a circle pick and a default
     * tap cannot drift apart — the divergence C3 found twice between `tapTargetAt` and
     * `onTap` is the same shape of bug waiting to happen here.
     */
    private performVerb(id: string): void {
        switch (id) {
            case 'drink': this.doDrink(); break;
            case 'fill-flask': this.doFillFlask(); break;
            case 'fish': this.explain('You cast, and wait. Nothing yet.'); break;
            case 'sleep': this.trySleep(); break;
            case 'mend': this.tryRepair('shelter'); break;
            case 'open-store': this.openLoadout(true); break;
            case 'mend-store': this.tryRepair('storage'); break;
            case 'board-raft': this.doBoardRaft(); break;
            case 'leave-raft': this.doLeaveRaft(); break;
            case 'feed-fire': this.doFeedFire(); break;
            case 'light-torch': this.doLightTorch(); break;
            case 'write-journal': this.doWriteJournal(); break;
            case 'thrust': this.doThrust(); break;
            case 'bind-wound': this.doBindWound(); break;
            case 'pick-up': this.doPickUpDropped(); break;
            case 'make-journal': this.doMakeJournal(); break;
            case 'brew-remedy': this.doBrewRemedy(); break;
            case 'store-journal': this.doSetJournalCarried(false); break;
            case 'take-journal': this.doSetJournalCarried(true); break;
            default: this.explain('Nothing to do there.'); break;
        }
        this.lastActivityAt = now();
    }

    /** Keeps the last 20 taps — see the field comment for why. */
    private recordTap(screenX: number, screenY: number, outcome: string): void {
        this.lastTapPoint = { x: screenX, y: screenY };
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
        //  THE FIRST LINE IS WHICH EDITION THIS IS (C1 item 0b), and it is first because of
        //  what happened without it: four defects were reported against a build nobody could
        //  identify, and three of them are expected to be ghosts of code already replaced.
        //  Every line below this one describes a game whose identity was, until now, a guess.
        //  A paste that opens with the SHA answers "which edition?" in ten seconds, forever.
        lines.push(`build: ${__BUILD_SHA__} (built ${__BUILT_AT__})`);
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
        if (this.pending.kind === 'boar') {
            //  A boar MOVES, so its target point is read fresh every frame rather than
            //  captured at the tap. Walking to where it used to be is not an interaction.
            const b = session().state.boars.find((x) => x.id === (this.pending as { id: string }).id);
            return b && b.alive ? { x: b.x, z: b.y } : null;
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
        if (this.pending.kind === 'trace') {
            const t = traceById(this.pending.id);
            return t ? { x: t.x, z: t.y } : null;
        }
        if (this.pending.kind === 'raft') {
            const rf = session().state.raft;
            return rf.built ? { x: rf.x, z: rf.y } : null;
        }
        return { x: POND.x, z: POND.y }; // pond: aim at the centre; the reach check uses the bank
    }

    private clearPending(): void {
        this.pending = null;
        this.pendingWasHold = false;
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

        //  THE FAR ISLAND — a trace has exactly ONE thing you want from it, so a tap does it.
        //  That is the Default-Verb Law's simplest case: a circle here would be a menu with a
        //  single item, which is precisely the frequent-verb slowdown the law forbids.
        if (this.pending.kind === 'trace') {
            const id = this.pending.id;
            this.pending = null;
            this.doReadTrace(id);
            return;
        }

        //  SLICE 2 — THE RADIAL CIRCLE REPLACES THREE PRIORITY HACKS.
        //
        //  All three existed for one reason: a tap could carry only one verb, so whenever a
        //  target had two things worth doing, the code had to CHOOSE for the player, and
        //  every choice starved the other verb.
        //
        //    pond     "fill wins over drink" (FIX 2). Drink applies whenever thirst < max,
        //             which is nearly always, so an empty flask was unreachable — the
        //             director's report was literally "no way to fill it". The fix inverted
        //             the priority and starved the other side instead.
        //    shelter  sleep only, with mend exiled to a separate control, after two rulings'
        //             worth of priority hacks each produced a starved verb.
        //    storage  the tap opens the box, so mending it needed the Build-card detour.
        //
        //  None of them was a bad fix; each was the best available answer to "one tap, two
        //  verbs". The circle removes the question. `tapOpensCircle` is FALSE for a survivor
        //  with one option, so none of this makes the early game slower — a castaway with no
        //  flask taps the pond and drinks, exactly as before, and never sees a wheel.
        //  SLICE 3 RETIRES THE FOURTH. The fire was left out of the circle in Slice 2 with
        //  its exception written down rather than hidden: it carried a torch-lighting-wins
        //  priority hack of exactly the same family, and the note said it "should be retired
        //  by the same mechanism rather than left as the one exception". The journal is the
        //  third fire verb, which is what finally forces the issue — three verbs cannot be
        //  arbitrated by a priority order without starving one of them. So the fire joins the
        //  other three here, and `tryFeedFire`'s internal priority goes with it.
        if (this.pending.kind === 'boar') {
            //  Through the SAME circle machinery as everything else — a predator does not get
            //  a bespoke input path, because a bespoke path is where the Default-Verb Law
            //  quietly stops applying.
            const only = defaultVerb(s, 'boar');
            const blocked = verbsFor(s, 'boar').find((v) => v.reason);
            this.pending = null;
            if (only) this.performVerb(only.id);
            else this.explain(blocked?.reason ?? 'Nothing you can do about it.');
            return;
        }

        if (this.pending.kind === 'pond' || this.pending.kind === 'shelter'
            || this.pending.kind === 'storage' || this.pending.kind === 'fire'
            || this.pending.kind === 'raft') {
            const target = this.pending.kind;
            //  THE DEFAULT-VERB LAW (C1). A HOLD asks; a TAP acts. `pendingWasHold` carries
            //  which gesture set this intention, so arriving after a hold opens the circle and
            //  arriving after a tap never does. A tap opens it only in the narrow case where
            //  the default is blocked and more than one alternative is left — there the game
            //  genuinely cannot know what was wanted, and guessing would be worse than asking.
            if (this.pendingWasHold ? holdOpensCircle(s, target) : tapOpensCircle(s, target)) {
                const at = this.lastTapPoint ?? { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 };
                this.pending = null;
                this.beginPanel();
                showVerbCircle(this.overlay, verbsFor(s, target), at.x, at.y,
                    (id: string) => { this.endPanel(); this.performVerb(id); },
                    () => this.endPanel());
                return;
            }
            const only = defaultVerb(s, target);
            if (only) {
                //  Drinking keeps the pending alive so repeat sips work while held nearby;
                //  everything else is a one-shot.
                if (only.id !== 'drink') this.pending = null;
                this.performVerb(only.id);
            } else {
                //  Nothing is possible here, and the player is told the nearest true reason
                //  rather than left with a silent tap (D-042's fail-loud law).
                const blocked = verbsFor(s, target).find((v) => v.reason);
                this.explain(blocked?.reason ?? 'Nothing to do there.');
                this.pending = null;
            }
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
        //  SAY THAT IT TAUGHT YOU (director's playtest, D-070 follow-up). Ch.2 trained these
        //  domains from the day it shipped and the body never once mentioned it — so a full
        //  session could be played and mastery concluded to "only affect forging", because
        //  forging's knowledge path (experimentation) reports its own outcome while felling's
        //  reported nothing. Announced on whole-point crossings only: every gather would be
        //  noise, and a number that ticks constantly stops being read.
        if (result.learned) {
            const crossed = Math.floor(result.learned.techniqueAfter) > Math.floor(result.learned.techniqueBefore);
            if (crossed) this.floatText(`${DOMAIN_LABEL[result.learned.domain] ?? 'skill'} sharpens`);
        }
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
        //  The bluff is solid; its obstacle is offset back so the MOUTH stays walkable.
        const caveObstacle = this.cave.obstacle(state);
        if (caveObstacle) out.push(caveObstacle);
        const storageObstacle = this.storage.obstacle(state);
        if (storageObstacle) out.push(storageObstacle);
        //  DROP 1 FIX — the boar is SOLID. It shipped as a ghost: the player walked straight
        //  through the one thing on the island that is supposed to be frightening, which
        //  undoes the threat more thoroughly than any tuning could. Push-out only, joining
        //  the same field as trees and rocks, so it feels like the collision the player has
        //  already learned rather than a new rule.
        for (const boar of state.boars) {
            if (boar.alive) out.push({ x: boar.x, z: boar.y, radius: TUNE.boarCollisionRadius });
        }
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

    /**
     * FEED THE FIRE. The declared default verb for the fire, and now only that — the
     * torch-lighting priority that used to sit at the top of this function is gone, because
     * the circle asks instead of guessing. That priority was never wrong on its own terms
     * (`canLightTorch` really is rarely true), but it was the last of the four, and leaving
     * one exception standing is how a retired pattern comes back.
     */
    private doFeedFire(): void {
        const s = session().state;
        if (!canFeedFire(s)) { this.deniedFire(); return; }
        feedFire(s);
        this.fire.flare();
        this.cues.play(CUES.collected);
        this.floatText(`+${TUNE.fireBurnGameHoursPerWood} hours`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doLightTorch(): void {
        const s = session().state;
        if (!canLightTorch(s)) { this.explain('There is nothing to light.'); return; }
        lightTorch(s);
        this.cues.play(CUES.ignition);
        this.floatText('torch lit');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * WRITE IN THE JOURNAL ([[D-068]]) — by the fire, at real cost.
     *
     * The costs are applied TOGETHER with the entry, from the single object `writeEntry`
     * returns, so there is no arrangement of failures where the player pays the hour and the
     * energy and gets no page. The hour is spent by advancing the session's own clock the way
     * sleeping does, which means the world moves while you write: the fire burns down, the
     * night gets colder, and choosing to write is choosing not to do something else.
     */
    /**
     * THRUST. The survivor's half of the rhythm the charge sets up — this is what an
     * aftermath window is FOR, and a miss says so rather than going silent (D-042).
     */
    /** Bind a bleeding wound with fibre. The one treatment injury has. */
    /** Pick up the nearest dropped stack. Its entry is gone, so a re-drop restarts its clock. */
    /**
     * CLIMB ABOARD. The one verb in this game that changes what MOVING means, so it says so —
     * a survivor who steps on and then presses the stick expecting to walk needs to know why
     * they are suddenly slow and why the beach refuses them.
     */
    private doBoardRaft(): void {
        const state = session().state;
        if (!canBoardRaft(state)) {
            this.explain(state.raft.built ? 'Too far — get alongside it first.' : 'You have no raft.');
            return;
        }
        boardRaft(state);
        session().persist(now());
        this.cues.play(CUES.craft);
        this.showHint('Paddle with the stick. It will not go up onto dry land.');
        this.lastActivityAt = now();
    }

    /** Step off — and the label already told them which of the two this was going to be. */
    private doLeaveRaft(): void {
        const state = session().state;
        const intoWater = leaveRaftIsIntoWater(state);
        if (!leaveRaft(state)) return;
        session().persist(now());
        this.explain(intoWater ? 'You slip into the water beside it.' : 'You step onto solid ground.');
        this.lastActivityAt = now();
    }

    /**
     * READ A TRACE. The whole of the far island's interaction, and deliberately small.
     *
     * What it shows is staged: the SIGHT first (what anyone could see standing here), then the
     * note itself. A survivor who has already read it is told so rather than being handed the
     * goods twice — a trace is a thing a person left, not a node that regrows.
     */
    private doReadTrace(id: string): void {
        const state = session().state;
        const reading = readingFor(state, id);
        if (!reading) return;
        if (reading.alreadyRead) {
            this.explain(reading.sight);
            return;
        }
        const result = readTrace(state, id);
        if (!result.ok) { this.explain(reading.sight); return; }
        session().persist(now());
        this.cues.play(CUES.pickup);
        //  The sight, then the note. Two beats, because arriving somewhere someone else was
        //  is the point and handing over a paragraph in one toast would flatten it.
        this.explain(reading.sight);
        const gained = Object.entries(result.gained)
            .map(([k, n]) => `${n} ${k}`).join(', ');
        this.showHint(reading.site.note + (gained ? `  ·  ${gained}` : ''));
        this.lastActivityAt = now();
    }

    private doPickUpDropped(): void {
        const s = session().state;
        const near = droppedWithinReach(s)[0];
        if (!near || !pickUpDropped(s, near.id)) { this.explain('There is nothing here to pick up.'); return; }
        this.cues.play(CUES.pickup);
        this.floatText(`+${near.amount} ${near.kind}`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doBindWound(): void {
        const s = session().state;
        if (!bindWound(s)) { this.explain('Nothing to bind, or nothing to bind it with.'); return; }
        this.cues.play(CUES.craft);
        this.floatText('bound');
        this.explain('You wrap it tight. The bleeding stops.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * DROP 3 — the remedy. Costs an hour at the fire through `spendGameHours`, the same
     * path writing the journal uses, so the world moves while it steeps: the fire burns
     * down and the night gets later while you sit with it. A cure that cost nothing but a
     * tap would make the recovery clock — which is the actual system — meaningless.
     */
    private doBrewRemedy(): void {
        const s = session().state;
        if (!canBrewRemedy(s)) { this.explain('You have nothing to steep, or nothing to steep it over.'); return; }
        if (!brewRemedy(s)) { this.explain('You have nothing to steep, or nothing to steep it over.'); return; }
        session().spendGameHours(TUNE.remedyGameHours, now());
        this.cues.play(CUES.craft);
        this.floatText('a bitter cup');
        this.explain(illnessNote(session().state.illness) ?? 'It passes. You feel like yourself again.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doThrust(): void {
        const s = session().state;
        const target = nearestBoar(s.boars, s.player.x, s.player.y);
        if (!target) { this.explain('There is nothing there now.'); return; }
        const out = thrustSpear(s, target.id);
        if (!out.ok) { this.explain('Too far. You would have to close.'); return; }
        this.cues.play(out.killed ? CUES.fell : CUES.gather);
        if (out.killed) {
            this.floatText(`+${out.meat} meat`);
            this.explain('It goes down. There is meat here, and it will not keep long.');
        } else {
            this.floatText('struck');
        }
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doMakeJournal(): void {
        const s = session().state;
        if (!makeJournal(s)) { this.explain('You cannot make one here.'); return; }
        this.cues.play(CUES.craft);
        this.floatText('a journal');
        this.explain('Beaten fibre for pages, charcoal from the fire. It is yours to fill.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * THE DECISION, in one tap. Carrying it means you can write tonight; leaving it means
     * whoever comes next can read it. The game says what happened and nothing about which
     * was wise — the death review will make that point far better than a hint could.
     */
    private doSetJournalCarried(carried: boolean): void {
        const s = session().state;
        if (!setJournalCarried(s, carried)) { this.explain('There is no journal.'); return; }
        this.cues.play(CUES.pickup);
        this.floatText(carried ? 'journal in hand' : 'journal left here');
        this.explain(carried
            ? 'You pick the book up. It goes where you go — including under.'
            : 'You leave the book in the box. It will still be here when you are not.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doWriteJournal(): void {
        const s = session().state;
        const reading = readWrite(s);
        if (!reading.canWrite) { this.explain(reading.reason ?? 'You cannot write now.'); return; }
        //  One topic per sitting, and it is the first thing they have not yet set down.
        //  Choosing WHICH would be a menu; a survivor with one hour writes the thing most on
        //  their mind, and the list is already ordered.
        const written = writeEntry(s, reading.topics[0]);
        if (!written) { this.explain('Nothing you have done yet is worth setting down.'); return; }
        s.journal = written.journal;
        s.energy = Math.max(0, s.energy - written.energyCost);
        session().spendGameHours(written.gameHours, now());
        this.cues.play(CUES.craft);
        this.floatText('written down');
        this.explain(written.text);
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
                //  F3: rendered, not derived — `refugeReport` is the single source.
                refuge: refugeReport(session().state),
                //  `revealed` is READ from the brain, never decided here — the panel is a
                //  record of what the survivor has done, and the body does not get a vote on
                //  what they know.
                torch: { have: { wood: s.inventory.wood, fiber: s.inventory.fiber }, done: s.torch.owned, revealed: revealedInPanel(s, 'torch') },
                axe: { have: { wood: s.inventory.wood, sharpblade: s.inventory.sharpblade, fiber: s.inventory.fiber }, done: s.tools.axe, revealed: revealedInPanel(s, 'axe') },
                shelter: { have: { wood: s.inventory.wood, stone: s.inventory.stone, fiber: s.inventory.fiber }, done: s.shelter.built, revealed: revealedInPanel(s, 'shelter') },
                storage: { have: { wood: s.inventory.wood, stone: s.inventory.stone }, done: s.storage.built, revealed: revealedInPanel(s, 'storage') },
                hints: panelHints(s),
                //  Mending, on the construction surface where it belongs (Gate 0 Part 1).
                //  Reachable at ANY durability below full — no threshold, no urgency gate,
                //  and it displaces nothing, which the secondary-button attempt did not
                //  manage: standing at your own shelter it replaced Build outright and made
                //  storage unbuildable. The device harness caught that within one run.
                //  Resting is offered from the construction surface because that is where
                //  "what can I do here" already lives, and it must be reachable WITHOUT a
                //  shelter — otherwise sleeping rough ships with no entry point, which is
                //  the exact defect Try-Combining just had to be rescued from.
                rest: { sheltered: isShelteredSleep(s) },
                mendShelter: canRepairStructure(s, 'shelter')
                    ? { durability: s.shelter.durability, max: TUNE.structureDurabilityMax, gain: TUNE.repairDurabilityPerWood }
                    : null,
                stoneHammer: { have: { wood: s.inventory.wood, stone: s.inventory.stone }, done: s.tools.stoneHammer, revealed: revealedInPanel(s, 'stonehammer') },
                //  DROP 1 FIX — the spear finally has somewhere to be made. It shipped with a
                //  recipe, a craft function, a thrust verb and a reachability test, and no
                //  surface at all: the blueprint minted, the ladder said `demonstrated`, and
                //  there was nowhere to turn that into an object.
                spear: { have: { wood: s.inventory.wood, sharpblade: s.inventory.sharpblade, fiber: s.inventory.fiber }, done: s.tools.spear, revealed: revealedInPanel(s, 'spear') },
                //  GATED like every other row. I shipped this as `revealed: true` and the device
                //  harness caught it inside one run: SLICE 2B's pivot law is that a fresh
                //  castaway is offered NOTHING to build, and a hardcoded reveal put a Backpack
                //  row in front of someone four seconds off the beach. The panel starts empty;
                //  that is the whole of the invention pivot, and it is not mine to except.
                backpack: { have: { fiber: s.inventory.fiber, wood: s.inventory.wood }, done: s.tools.backpack, revealed: revealedInPanel(s, 'backpack') },
                //  THE MARITIME SLICE. Gated by the same ladder reading as every row above —
                //  the pivot law is not excepted for the biggest craft in the game — and
                //  carrying one extra thing no other row needs: the SITE. `raftBlocker`
                //  returns the first thing in the way in the player's own words, and the
                //  panel shows it before the button is pressed rather than after the wood is
                //  gone. Material shortfalls are already covered by the cost rows, so only a
                //  genuine siting refusal is surfaced here.
                raft: {
                    have: { wood: s.inventory.wood, fiber: s.inventory.fiber, coconut: s.inventory.coconut },
                    done: s.raft.built,
                    revealed: revealedInPanel(s, 'raft'),
                    siteBlocker: !s.raft.built && !nearShoreForRaft(s)
                        ? 'You are too far from the water. A raft has to be built where it can float.'
                        : null,
                }
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
            //  DROP 1 FIX — the spear's handler. There was never one: `craftSpear` shipped
            //  with ZERO callers, so a survivor who discovered the recipe and reached
            //  `demonstrated` on the ladder had nowhere to turn that into an object.
            () => {
                this.endPanel();
                if (craftSpear(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the spear is yours');
                    session().persist(now());
                    this.showHint('Hold a boar to thrust. Wait for the aftermath.');
                } else {
                    this.explain('Not enough for a spear yet.');
                }
                this.lastActivityAt = now();
            },
            () => {
                this.endPanel();
                if (makeBackpack(session().state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the pack is yours');
                    session().persist(now());
                    this.showHint('You can carry properly now.');
                } else {
                    this.explain('Not enough for a pack yet.');
                }
                this.lastActivityAt = now();
            },
            //  THE MARITIME SLICE — the raft's handler. Written in the same breath as the
            //  craft function, because the one thing this project has now shipped twice is a
            //  craftable with no caller (`craftSpear`, then `makeBackpack`), and the sweep in
            //  `tests/fauna.test.ts` fails the build until this exists.
            () => {
                this.endPanel();
                const state = session().state;
                const blocker = raftBlocker(state);
                if (craftRaft(state)) {
                    this.cues.play(CUES.craft);
                    this.floatText('the raft is built');
                    session().markFirstCraft(msSinceControl());
                    session().persist(now());
                    this.raftView.sync(state, (x, z) => this.island.heightAt(x, z));
                    this.showHint('It is moored at the water. Walk to it and climb aboard.');
                } else {
                    //  Fail-loud (D-042/D-049): the exact reason, never a shrug. `raftBlocker`
                    //  is read BEFORE the attempt because a successful craft changes the state
                    //  it would be read from.
                    this.explain(blocker ?? 'You cannot build a raft here.');
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
            () => { this.endPanel(); this.tryRepair('shelter'); },
            () => { this.endPanel(); this.trySleep(); }
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

    /**
     * THE SHARED FLOAT MESSAGE (director's playtest, FIX 3).
     *
     * Every "here is what just happened" line goes through here — the yield from a gather,
     * the outcome of a combination, the thing that was crafted. It used to hang for a
     * hardcoded 900 ms against a 900 ms `rise` animation that faded from the moment it
     * appeared, so it was never fully legible for more than a fraction of a second. Two
     * separate playtest complaints — the combination result, and the yield at the big stone
     * node — were the SAME mechanism, which is why this is fixed once, here, rather than
     * per call site.
     *
     * The duration drives the CSS animation too. Setting only one of them is how the text
     * would come to vanish before its element does, or hang invisible after it: two clocks
     * for one message, drifting the first time either is tuned.
     */
    private floatText(label: string): void {
        if (!label) return;
        const el = document.createElement('div');
        el.className = 'float-text';
        el.textContent = label;
        el.style.animationDuration = `${TUNE.floatTextMs}ms`;
        this.overlay.appendChild(el);
        window.setTimeout(() => el.remove(), TUNE.floatTextMs);
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
        this.cave.update(state, this.island.heightAt(state.cave.x, state.cave.y));
        this.storage.update(state, this.island.heightAt(state.storage.x, state.storage.y));
        this.raftView.update(state);

        this.nodes.sync(state);
        this.nodes.highlight(this.highlightTarget());
        //  DROP 1 — the boars. Drawn from whatever the brain decided this tick; this call
        //  reads state and never advances it.
        this.boars.sync(state.boars, state.player.x, state.player.y,
            (x, z) => this.island.heightAt(x, z), stamp / 1000);
        this.announceBoarStages(state);

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
            //  DROP 2 — a limp is felt in the feet, which is the only place it could be felt.
            limpSpeedMultiplierOf(state.injuries) *
            (this.testSpeedEnabled ? TUNE.testSpeedMultiplier : 1) *
            //  D-059: weight-aware, not band-aware. The banded form saturated at the Heavy
            //  threshold, so 100 stone moved exactly as fast as 16 — the director's report.
            //  Floored inside `loadSpeedMultiplierOf` so no load can approach a soft-lock.
            loadSpeedMultiplierOf(state) *
            //  THE MARITIME SLICE, on the same line and for the same reason as every
            //  multiplier above it: water scales `walkSpeedMps` at use and never mutates the
            //  constant. Dry land returns exactly 1, so nothing about walking changes.
            waterSpeedMultiplierOf(state);

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
        if (speedNow < 0.001) {
            this.velX = 0; this.velZ = 0;
            //  Recorded, not skipped. The stick is RELEASED between the harness's bursts, and
            //  a trace that silently omits those frames would hide the very gaps a burst
            //  hypothesis lives or dies on.
            if (this.pressFrames) {
                this.recordPressFrame(dt, state.player.x, state.player.y, state.player.x, state.player.y,
                    stick.magnitude, desiredX, desiredZ, 0, 0, null);
            }
            return;
        }

        let x = state.player.x + this.velX * dt;
        let z = state.player.y + this.velZ * dt;

        //  THE UNIFIED COLLISION MODEL (Slice 1's opening item, D-078 B). One rule, in the
        //  brain, where it can be tested: push out, remove the inward component, and — the
        //  part that was missing — DEFLECT along the surface when removing the inward
        //  component leaves nothing at all.
        //
        //  The line that used to sit here said a perpendicular approach stopping dead was
        //  "correct physics — there is no tangential component to preserve." True, and the
        //  bug. A circle approached dead-on has exactly zero tangential component, so the
        //  mover pinned and stayed pinned for as long as the stick was held. Three symptoms
        //  traced to it: the movement hard-block, the shelter pin (`moved 0.00m in 2s`), and
        //  the quarry/storage approach stall, since `approach()` walks at a target's CENTRE,
        //  which is the definition of dead-on. Three previous attempts patched symptoms.
        //  `tests/movement.test.ts` proves all three against the pre-fix mechanism.
        const dynamic = this.dynamicObstacles();
        //  Last frame's TRAVEL direction is handed back in — but only while contact is
        //  unbroken, so a fresh contact is decided on its own merits rather than by whatever
        //  the mover happened to be doing a minute ago. This is the notch fix (C3 MAJOR-1);
        //  it is NOT the velocity write-back that caused the decay, because it feeds the
        //  resolver a hint, never the accelerator a velocity.
        //  STILL LEANING ON IT counts as still sliding on it. This was gated on `lastContact`
        //  alone, and contact means PENETRATION: a mover coasting along a curved surface
        //  leaves it by a couple of centimetres, which ends contact while the castaway is
        //  plainly still against the shelter. Every time the stick was released the direction
        //  memory was wiped, so the next press re-picked a side from whatever the residual
        //  happened to be — the second half of the feel court's wobble, measured on device
        //  (four reversals, every one with `priorAlong` exactly 0.000).
        //
        //  It is still a real gate, but NOT for the reason the first draft of this comment
        //  gave (C3 MAJOR-2). "Clears 0.1 m within one frame at walking pace" is false: one
        //  frame is 5.8 cm, and a mover reversing out of a press takes 23 frames to get clear.
        //  The gate holds geometrically instead — to inherit a stale direction you must come
        //  within 10 cm of another surface, and two surfaces that close together are a notch,
        //  where committing is the behaviour we want anyway.
        const leaning = this.lastContact || this.lastNearestGapM <= TUNE.slideMemoryGapM;
        const hintX = leaning ? this.lastTravelX : 0;
        const hintZ = leaning ? this.lastTravelZ : 0;
        const fromX = state.player.x;
        const fromZ = state.player.y;
        //  The stick's own desired velocity goes in alongside the accelerated one. "Is this
        //  contact dead-on?" is a question about what the player is ASKING for, and for the
        //  first fifth of a second after any fresh press `this.velX` is not that — it is the
        //  accelerator still catching up, pointing somewhere neither the old motion nor the
        //  new request does. Judging it there is what made the castaway rock back and forth
        //  across the shelter instead of walking around it (the press trace, C1's ruling).
        const step = stepMovement(
            state.player.x, state.player.y, this.velX, this.velZ, dt,
            TUNE.playerCollisionRadius, this.island.obstacleField(dynamic),
            hintX,
            hintZ,
            desiredX,
            desiredZ,
        );
        x = step.x;
        z = step.z;
        //  WHO OWNS `velX`. Not the collision resolver — the acceleration model does.
        //
        //  This used to write the deflected velocity back (`this.velX = step.velX`), and the
        //  very next frame `approachScalar` dragged it straight back toward the stick's
        //  desired direction, which during a press is dead into the wall. The deflection was
        //  computed correctly and then discarded before it could move anyone. Measured, one
        //  variable, same obstacle and speed:
        //
        //      fed back into accel:  [0.66 1.36 1.38 0.32 0.04 0.00 0.00 0.00]  <- decays to nothing
        //      intent kept:          [0.66 1.13 1.22 1.22 1.22 1.22 1.22 1.22]  <- steady
        //
        //  The device showed the same shape: [1.00 0.58 0.29 0.08 0.09 0.08 0.09 0.09].
        //  My first attempt at this blamed the slide's SPEED and renormalised it, which
        //  changed the device numbers not at all — the decay was never about magnitude, it
        //  was about the two systems fighting over one variable.
        //
        //  So `velX/velZ` stay what the accelerator makes them: the player's INTENT. The
        //  resolver reads that intent, redirects it around the obstacle for this step, and
        //  returns where the body actually ended up. Nothing is written back, so the slide is
        //  recomputed from full intent every frame instead of decaying into the wall.
        this.lastTravelX = step.velX;
        this.lastTravelZ = step.velZ;
        //  Feel-court instrumentation: the harness reads these to tell "sliding" from
        //  "stuck" through the real player path, and they are the only way an on-device
        //  check can witness the deflection branch firing at all.
        this.lastContact = step.contacted;
        this.lastNearestGapM = step.nearestGapM;
        this.lastDeflected = step.deflected;
        if (step.contacted) this.contactFrames++;
        if (step.deflected) this.deflectFrames++;

        //  ---- THE WALL IS GONE (the Maritime Slice) --------------------------------------
        //
        //  What stood here was two lines: measure the radius, and if it exceeds
        //  `WALKABLE_RADIUS` scale the position back onto the 108 m circle. That WAS the edge
        //  of the world for five cycles — a hard clamp with a surf ring drawn on it so at
        //  least the wall was visible (D-064).
        //
        //  It is replaced by two rules, both of which live in the brain where they can be
        //  tested, and neither of which is a wall:
        //
        //    - ABOARD: the raft grounds rather than climbing the beach. `steerRaft` refuses a
        //      step onto dry land and returns the current position, so pressing shoreward
        //      noses the deck into the shallows and stops. A raft that could be steered onto
        //      grass would be a boat used as a car.
        //    - SWIMMING or ASHORE: nothing stops the castaway at all. The cost is the wall —
        //      energy, cold, and the distance back — and it is charged by `advanceWater` on
        //      the online tick, which is why an absence cannot collect it.
        if (state.raft.aboard) {
            const steered = steerRaft(state.player.x, state.player.y, x, z);
            x = steered.x;
            z = steered.y;
        } else {
            //  The outer bound, and it is deliberately far past anything: the open ocean is
            //  900 m of sea disc and there is nothing out there. Held so a stuck stick cannot
            //  walk a castaway into un-rendered space, not to gate the crossing — the wreck
            //  is at 243 m, comfortably inside.
            const radius = Math.hypot(x, z);
            const limit = WORLD.seaRadius * 0.5;
            if (radius > limit) { const k = limit / radius; x *= k; z *= k; }
        }

        state.player.x = x;
        state.player.y = z;

        //  Recorded AFTER the shore clamp, so `toX/toZ` is where the castaway genuinely ended
        //  the frame — not where the resolver would have put them.
        if (this.pressFrames) {
            this.recordPressFrame(dt, fromX, fromZ, x, z, stick.magnitude, desiredX, desiredZ,
                hintX, hintZ, step);
        }

        //  Turn to face travel with a frame-rate-independent slerp — smoother than a fixed
        //  degrees-per-second cap, and the second half of "smooth".
        //  Face the way the body actually TRAVELLED, not the way the stick was pushed —
        //  during a slide those differ, and facing into the wall while moving along it is
        //  precisely the "stuck" read the feel court exists to catch.
        const heading = Math.atan2(this.lastTravelX, this.lastTravelZ);
        this.facing = slerpAngle(this.facing, heading, TUNE.turnSlerpSpeed, dt);

        session().markFirstMove(msSinceControl());
        this.lastActivityAt = now();
    }

    /**
     * One row of the press trace. `step` is null for a frame that never reached the resolver
     * (velocity below the idle threshold — which is exactly what a released stick produces).
     *
     * Stops at capacity rather than wrapping: a diagnostic that arms, presses once and dumps
     * wants the BEGINNING of the press, and a ring buffer would quietly eat it.
     */
    private recordPressFrame(
        dt: number, fromX: number, fromZ: number, toX: number, toZ: number,
        stickMag: number, wantX: number, wantZ: number,
        hintX: number, hintZ: number,
        step: MoveStep | null,
    ): void {
        const buf = this.pressFrames;
        if (!buf || buf.length >= this.pressCapacity) return;
        buf.push({
            t: now() - this.pressArmedAt,
            dt,
            fromX, fromZ, toX, toZ,
            stickMag, wantX, wantZ,
            velX: this.velX, velZ: this.velZ,
            normalX: step?.normalX ?? 0,
            normalZ: step?.normalZ ?? 0,
            into: step?.into ?? 0,
            residualX: step?.residualX ?? 0,
            residualZ: step?.residualZ ?? 0,
            outVelX: step?.velX ?? 0,
            outVelZ: step?.velZ ?? 0,
            contacted: step?.contacted ?? false,
            deflected: step?.deflected ?? false,
            overlaps: step?.overlaps ?? 0,
            nearestX: step?.nearestX ?? NaN,
            nearestZ: step?.nearestZ ?? NaN,
            nearestGapM: step?.nearestGapM ?? Infinity,
            //  Measured from the recorded positions, not from the resolver's own `movedM` —
            //  the shore clamp runs after it, and the path integral must be the path the
            //  castaway actually took.
            movedM: Math.hypot(toX - fromX, toZ - fromZ),
            hintX, hintZ,
        });
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
        //  The camera's reference is the height the castaway is DRAWN at, not the ground
        //  beneath them — otherwise a swimmer a hundred metres out drags the view down onto
        //  an eight-metre seabed and the horizon disappears.
        const groundY = this.drawHeightFor(state);
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

    /**
     * WHERE THE CASTAWAY IS DRAWN, VERTICALLY (the Maritime Slice).
     *
     * Three answers, not one, and the split is the difference between a survivor who is
     * swimming and one who is walking along the seabed with their head underwater.
     *
     *   - ashore, they stand on the ground, exactly as they always have;
     *   - aboard, they stand on the deck;
     *   - in the water, they float at the SURFACE, submerged by a fixed offset.
     *
     * The ground is not consulted at all in the last two cases. That matters past the shelf,
     * where the seabed falls to eight metres: reading `heightAt` there would sink the
     * castaway out of frame and the camera with them.
     */
    private placePlayerFromState(): void {
        const s = session().state;
        this.player.place(s.player.x, this.drawHeightFor(s), s.player.y, this.facing);
        this.player.syncTools(s.tools.axe, s.tools.axeGrade);
        this.player.syncTorch(s.torch.owned, s.torch.lit, this.nightFactor(s.gameHoursElapsed), s.torch.grade);
    }

    /** See `placePlayerFromState`. Also the camera's own reference height, so the view rides
     *  the water with the swimmer instead of following the seabed down. */
    private drawHeightFor(s: GameState): number {
        if (s.raft.aboard) return WORLD.seaLevel + RENDER.raftFloatM;
        if (waterZoneOf(s) === 'swimming') return WORLD.seaLevel + RENDER.swimSubmergeM;
        return this.island.heightAt(s.player.x, s.player.y);
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

        //  Build fire: its OWN button, never competing in a priority slot with Craft — that
        //  competition was the root cause of the C03 fire defect, and it stays fixed.
        //
        //  LAW 130 (Bible v2.4): and it appears only to a survivor who KNOWS FIRE. This
        //  button was the residual the invention pivot missed — it is a separate entry point
        //  from the Build panel, and it read `state.inventory.wood > 0` and nothing else, so
        //  a castaway four seconds off the beach with three sticks was offered fire-making as
        //  a known verb. The brain gate alone was not enough: `canBuildFire` said no while
        //  this said yes, and the device check caught the disagreement. Same shape as the
        //  growth panel a session ago — a law enforced in one layer is enforced nowhere.
        let action = { label: '', visible: false, ready: false };
        if (!state.fire.built && fireIsKnown(state)) {
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
        //
        //  AND IT HAPPENED AGAIN, TWICE, because that fix APPENDED a clause instead of
        //  removing the reason a clause was needed. The spear (Drop 1) and the backpack
        //  (D-113) both shipped without being appended, so the director — who owns all five
        //  of the enumerated products — opened the Backpack after the spear's zero-callers
        //  defect was fixed and STILL found nothing: the row was revealed, the handler was
        //  bound, and the door to the room was gone. The list is deleted rather than
        //  extended; `makerOffers` derives the gate from what the panel actually holds, so
        //  the eighth craftable cannot repeat this.
        const offers = makerOffers(state);
        const secondary = { label: 'Build', visible: offers.length > 0 };

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
        //  DROP 2 — a wound outranks the ordinary goal line. It must be LEGIBLE, not merely
        //  felt: a survivor paying more for every job needs to be told why, or the resolver's
        //  impairment term reads as the game getting harder at random.
        //  THE MARITIME SLICE — the water speaks FIRST, above a wound, and only from
        //  `labouring` up. That ordering is the fair-challenge contract, not a preference:
        //  the deep stages are the only situation in this game that can take a survivor from
        //  alive to dead inside a couple of minutes with no object on screen to blame it on,
        //  and the two spoken warnings are the whole reason the last stage is allowed to
        //  exist at all. A line that could be displaced by a limp would not be a warning.
        //
        //  `swimming` deliberately says NOTHING here. A game that narrates every ordinary
        //  moment has no way left to raise its voice, and these two warnings only work
        //  because the stage before them is quiet — the same reasoning that keeps a nascent
        //  illness from displacing exhaustion, three paragraphs down.
        //  THE WRECK SLICE — the hull speaks ABOVE the water's own warnings, and only at the
        //  wreck. It is the more acute of the two: the water gives a survivor minutes, and a
        //  hull that is giving way takes its price the moment they reach for one more part.
        //  Silent at `sound` and `shifting` by the same rule that keeps `swimming` quiet.
        const hull = wreckNoteFor(state);
        if (hull) return hull;
        const swim = swimStageOf(state);
        if (swim === 'labouring' || swim === 'spent' || swim === 'going-under') {
            const note = swimNote(swim);
            if (note) return note;
        }
        const wound = injuryNote(state.injuries);
        if (wound) return wound;
        //  DROP 3 — sickness reads out for the same reason a wound does, and it sits just
        //  BELOW the wound: a bleed is acute and an illness is not, so when a survivor has
        //  both, the one with the shorter fuse speaks first.
        //
        //  IT ONLY OUTRANKS THE BODY STATES BELOW WHEN IT IS ACTUALLY COSTING SOMETHING, and
        //  that gate is a defect fix, caught on device. Shipped without it, a NASCENT illness
        //  — `unsettled`, which by its own law costs nothing — displaced "Exhausted to the
        //  bone. Rest, properly, soon." with "It has not taken hold yet.": the line that told
        //  the player nothing silenced the line telling them what to do about a real problem.
        //  That is the priority-starvation class D-040/D-042 already fixed once, where the
        //  fire starved behind the axe in a stack.
        //
        //  `illnessCosts` is reused rather than re-tested here, so the fair-challenge line and
        //  the speaking order can never drift apart.
        const sick = illnessNote(state.illness);
        if (sick && illnessCosts(state.illness)) return sick;
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
        //  ...and the WARNING rungs speak here, below the states that are actively hurting.
        //  Still surfaced, because the five-stage grammar's whole promise is that onset
        //  telegraphs before it bites — dropping it entirely would trade one defect for the
        //  opposite one and make the warning unfalsifiable.
        if (sick) return sick;
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

    /**
     * THE AUDIBLE HALF of the five-stage grammar. Fires once on ENTRY to a stage, never per
     * frame — a sound repeating every frame stops being information within a second.
     *
     * Paired with `boarView`'s posture changes, not replacing them: audio is reinforcement,
     * because a player with the sound off must still be able to read every stage.
     */
    private announceBoarStages(state: ReturnType<typeof session>['state']): void {
        for (const boar of state.boars) {
            if (!boar.alive) { this.boarStageSpoken.delete(boar.id); continue; }
            const near = Math.hypot(boar.x - state.player.x, boar.y - state.player.y) <= TUNE.boarRenderRadiusM;
            if (!near) { this.boarStageSpoken.delete(boar.id); continue; }
            if (this.boarStageSpoken.get(boar.id) === boar.stage) continue;
            this.boarStageSpoken.set(boar.id, boar.stage);
            switch (boar.stage) {
                case 'alert':
                    this.cues.play(CUES.target);
                    break;
                case 'warning':
                    //  THE ONE THE PLAYER MUST NOT MISS. Loud, and said in words as well,
                    //  because the wind-up is the whole of the fair-challenge promise.
                    this.cues.play(CUES.denied);
                    this.explain('It snorts and paws the ground. It is going to come.');
                    break;
                case 'charge':
                    this.cues.play(CUES.fell);
                    break;
                case 'aftermath':
                    this.cues.play(CUES.collected);
                    break;
                default:
                    break;
            }
        }
    }

    private openDeath(): void {
        this.deathShown = true;
        //  C3 finding A1 on D-063: this panel was the one that never joined the pair — it
        //  inlined `panelOpen = true` and skipped `cancelHold()`, so a gather hold running
        //  at the moment of death survived under the death overlay. Fixed here because it
        //  is the same input-safety class as the freeze.
        this.beginPanel();
        this.cues.stopAllBeds();
        const s = session().state;
        //  Slice 3: the session built the review from the DYING body before it replaced it,
        //  so by the time this runs `session().state` is already the successor. The review is
        //  taken from the session, never re-derived here — re-deriving it now would describe
        //  the person who just washed ashore, which is the wrong person entirely.
        const taken = session().takeDeathReview();
        const review = taken?.review ?? {
            //  A death with no held review can only happen if the overlay is opened by
            //  something other than the death path. Say so plainly rather than invent a chain.
            cause: `You died of ${s.lastDeathCause ?? 'your wounds'}.`,
            chain: ['The record does not show what led to it.'],
            warnings: [], couldHave: [], legacy: [],
            lifetime: 'That life is over.',
        };
        showDeath(this.overlay, review, taken?.arrival ?? ['You wake up on the sand.'], s.trace.deaths, () => {
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
