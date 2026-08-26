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
    buildWorkmat,
    buildWorkbench,
    wearBenchJoints,
    atWorkspace,
    makerBlocker,

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
    isAtFire,
    isAtFirePoint,
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
    type VerbTarget,
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
    cookBlocker,
    cookMeat,
    cookRung,
    keepingHoursFor,
    canTakeMedicine,
    medicineBlocker,
    takeMedicine,
    droppedWithinReach,
    previewFor,
    pickUpDropped,
    dropAll,
    boil,
    canDrinkClean,
    boilRefusalFor,
    drinkClean,
    fillVessel,
    makeShellCup,
    vesselCount,
    shellCupBlocker,
    waterNote,
    vesselChip,
    bindBlocker,
    canBindWound,
    bindWound,
    nearestBoar,
    thrustSpear,
    makeJournal,
    setJournalCarried,
    type MoveStep,
    refugeReport,
    tryCombine,
    ALL_MATERIAL_KINDS,
    growthReport,
    DOMAIN_LABEL_SHORT,
    previewAt,
    siteIsViable,
    type MovableKind,
    settleOnTerrain,
    bodyReport,
    //  ITEM 5 (this batch) — walking through the one body resolver, same as gathering.
    resolveActivity,
    applyEffect,
    gameHoursFromRealSeconds,
    panelHints,
    announcementFor,
    loadSpeedMultiplierOf,
    walkEaseOf,
    wreckPartSight,
    illnessSpeedMultiplierOf,
    nodeHoldSeconds,
    nodeSpec,
    recordCombinationAttempts,
    repairStructure,
    repairStructureDetailed,
    defectCue,
    defectPlace,
    timeOfDay,
    depositToStorage,
    moveOneKind,
    storageContents,
    moveStructure,
    completeShelterFromSite,
    moveStructureBlocker,
    structureSite,
    withdrawFromStorage,
    storageActionsFor,
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
    craftPontoon,
    leaveRaft,
    leaveRaftIsIntoWater,
    raftBlocker,
    steerRaft,
    swimNote,
    swimStageOf,
    waterSpeedMultiplierOf,
    waterZoneOf,
    wreckNoteFor,
    castHandline,
    craftFishingLine,
    craftNet,
    haulNet,
    nearestSpot,
    reelIn,
    setNet,
    spearFish,
    atBoat,
    boatAffordance,
    boatSight,
    boatUnderstandingNote,
    surveyFindings,
    surveyHull,
    surveyBlocker,
    shoreUpBoat,
    shoreUpBlocker,
    dewaterBoat,
    dewaterBlocker,
    repairHullStructure,
    structuralBlocker,
    sealHull,
    sealBlocker,
    runFloatTest,
    floatTestBlocker,
    floatForecastNote,
    postTrialFindings,
    boatCapabilityNote,
    boatStage,
    learnLoad,
    loadNote,
    runFerry,
    ferryBlocker,
    ferryNote,
    ferryFindings,
    boardBlocker,
    boatPosition,
    crossingBlocker,
    runCrossing,
    moorBoat,
    moorBlocker,
    masteryDomainForNodeKind,
    noticedAtWork,
    readoutRows,
    noticedOnSurfacing,
    slowWorkNote,
    illnessSymptom,
    combineSlate,
    canExperimentWith,
    isPlaced,
    contributeToSite,
    isIncremental,
    placementBlocker,
    siteIsComplete,
    siteShortfallNote,
    beginConstruction,
    beginBlocker,
    recipeDisplayName,
    drawIntoHands,
    recipeCost,
    reachFor,
    discoverWith,
    coldSymptom,
    makeChosen,
    crashBlockedReason,
    crashGone,
    crashSighting,
    crashWorkable,
    workCrashSite,
    beginListening,
    canLogSignal,
    listenBlockedReason,
    logSignal,
    heardSignals,
    radioPanelView,
    receptionNow,
    stopListening,
    isStormActive,
    stormNote,
    diveNote,
    diveStageOf,
    diveSpeedMultiplierOf,
    surface,
    submergeForNode,
    readTrace,
    readingFor,
    traceById,
    traceSites,
    //  WAVE 1 — THE WEIGHTED SHORE, FIRST SLICE.
    outboardPosition,
    dragOutboard,
    applyStudy,
    teardownAttempt,
    applyTeardown,
    axeOutboard,
    canReassemble,
    reassembleOutboard,
    diagnoseFault,
    repairOutboard,
    partLabel,
    shoreWithinReach,
    pickUpShoreItem,
    type TeardownRung,
    type MaterialKind,
    type GameState
} from '../brain';
import { TUNE, fireLoudnessAt } from '../data/tune';
import { COLD_OPEN, CRASH_SITE, POND, WORLD, isOnPondWater, isPlaceablePoint, surfaceHeightAt } from '../data/world';
import { CUES, Cues, type CueKey } from './audio';
import { BoarsView } from './boarView';
import { Controls } from './controls';
import { BoatWorkView, CaveView, ConstructionView, DroppedView, FireView, GhostView, NodeViews, OutboardView, PlayerView, RaftView, ShelterView, ShoreItemsView, StorageView, WorkspaceView, type NodeView } from './entities';
import {
    addCarriedButton,
    paintBackpackLoad,
    addSettingsButton,
    Hud,
    levelToast,
    pickupToast,
    type BackpackTab,
    showColdOpen,
    showDeath,
    showLoadout,
    showMorningReport,
    showSettings,
    showVerbCircle,
    MATERIAL_LABEL,
} from './hud';
import { Island, type Obstacle } from './island';
import { grantControl, msSinceControl, now, recordBodyTrace, runtime, sampleFrame, session, type PressFrame } from './runtime';
import { RENDER } from './theme';

/** What the player has tapped and wants to reach, if anything. */
/**
 * item 2 — WHICH PENDING TARGET IS WHICH MOVABLE THING, and what to call it out loud.
 *
 * Two small tables rather than a switch inside the handler, so adding a fifth movable
 * structure is one line in each and cannot be half-done: a kind present in one and missing
 * from the other is a compile error, not a verb that arms and then cannot name itself.
 */
const MOVABLE_FOR_PENDING: Record<string, MovableKind | undefined> = {
    shelter: 'shelter',
    storage: 'storage',
    fire: 'fire',
    workspace: 'workspace',
    construction: 'construction',
};

const MOVE_LABEL: Record<MovableKind, string> = {
    shelter: 'The shelter',
    storage: 'The crate',
    fire: 'The fire pit',
    workspace: 'The work surface',
    construction: 'The half-built frame',
};

type Pending =
    | { kind: 'node'; id: string }
    | { kind: 'fire' }
    | { kind: 'pond' }
    | { kind: 'shelter' }
    | { kind: 'boar'; id: string }
    | { kind: 'storage' }
    //  item 2 — THE WORK SURFACE, which has been standing and untouchable since SESSION 1.
    //  It is drawn (`workMat`/`workBenchTop`), it collides, and it was the only built thing
    //  in the game with no tap candidate and no verbs — so a finger could never address it.
    //  Moving one is what finally needed it, but the gap predates the request.
    | { kind: 'workspace' }
    //  A structure part-way up — its own target, for the same reason the workspace is: it is
    //  a thing in the world with work to do on it.
    | { kind: 'construction' }
    //  P0-3 — A STACK ON THE GROUND, and the second half of why dropped items 'vanished'.
    //  `verbs.ts` has had a `dropped` target with a `pick-up` verb since the drop shipped,
    //  and NOTHING in the body ever produced that target: `worldCandidateAt` had no such
    //  kind, so the verb was unreachable through the world. Drawing the pile without this
    //  would have made it visible and still untouchable.
    | { kind: 'dropped'; id: string }
    //  THE MARITIME SLICE. Routed through exactly the same tap/hold/circle machinery as the
    //  four above — a vehicle does not get a bespoke input path, because a bespoke path is
    //  where the Default-Verb Law quietly stops applying.
    | { kind: 'raft' }
    | { kind: 'boat' }
    | { kind: 'crash' }
    //  THE FAR ISLAND — a trace site. Same tap/hold/circle machinery as everything else; a
    //  note somebody left is not special-cased into its own input path.
    | { kind: 'trace'; id: string }
    //  WAVE 1 — THE WEIGHTED SHORE, FIRST SLICE. The outboard is singular and its position
    //  moves as it is dragged, the same "fixed until acted on" shape `raft` already has; a
    //  shore find is plural and id-addressable, the same shape `dropped` already has. Same
    //  tap/hold/circle machinery as everything above — no bespoke input path for either.
    | { kind: 'outboard' }
    | { kind: 'shoreitem'; id: string }
    //  RULING (C1) — GROUND-HOLD. A plain point, not an object: the position is captured at
    //  the hold (the same "captured at the tap" shape `dropped`/`boar` already use, since a
    //  world point has nothing else to be looked up by later). Same tap/hold/circle machinery
    //  as everything above it.
    | { kind: 'ground'; x: number; y: number }
    | null;

/** One entry in the debug tap log (D-050) — what a tap resolved to, and where. */
interface TapBreadcrumb {
    tMs: number;
    screenX: number;
    screenY: number;
    outcome: string;
}

/** WAVE 1 — what a stripped rung reads as in plain language (Law 217/221). */
function teardownRungLabel(rung: TeardownRung): string {
    switch (rung) {
        case 'novice': return 'Not much gives. A few consumables come loose.';
        case 'basic': return 'The loose fasteners come away.';
        case 'competent': return 'The robust parts come free; the delicate ones are lost.';
        case 'skilled': return 'Whole subassemblies come free, intact.';
        case 'expert': return 'It comes apart completely, clean.';
    }
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

//  The local DOMAIN_LABEL map stood here. It was the SECOND label map for one set of seven
//  things — the skills surface needed long names and this had short ones — and two maps for
//  one vocabulary is how a screen comes to call a domain by a name no other screen uses.
//  Both registers now live in `growth.ts` beside the rows that read them.

export class Game {
    private engine: Engine;
    private scene: Scene;
    private camera: FreeCamera;
    private island: Island;
    private player: PlayerView;
    private nodes: NodeViews;
    private fire: FireView;
    private shelter: ShelterView;
    private constructionView: ConstructionView;
    private boatWork: BoatWorkView;
    private cave: CaveView;
    private ghost: GhostView;
    /**
     * SITING — chosen from the slate, waiting for a place to put it.
     *
     * The slate answers WHAT and this answers WHERE, which is the whole of the merge: the site
     * card used to ask both at once and had to be entered from a hold on open ground, so a
     * survivor who wanted a crate had to already be standing somewhere a crate could go before
     * the game would admit crates existed. Now the pile names the thing and the next world tap
     * places it.
     *
     * The MATERIALS are carried along because they are spent on the build, not on the choosing —
     * cancelling costs nothing, which is the same promise the old card made.
     */
    private siting: { recipeId: string; materials: string[]; storageOpen: boolean } | null = null;
    /**
     * item 2 — A MOVE, ARMED. Deliberately the same shape as `siting` above, and deliberately
     * BODY-ONLY.
     *
     * [[D-011]] asks what an absence does to a structure caught mid-move. The answer is
     * nothing, and it is structural rather than guarded: this field is never serialized, so
     * closing the game with a move armed loses the AIM, never the building. The structure is
     * at its old site until a tap lands it at a new one, and `moveStructure` is a single
     * write — there is no in-between state for an absence to catch.
     */
    private moving: { kind: MovableKind } | null = null;
    /**
     * WHICH TARGET THE OPEN CIRCLE BELONGS TO — and this field exists because of a real bug
     * the device caught, not as a convenience.
     *
     * `actOnArrival` sets `this.pending = null` BEFORE calling `showVerbCircle`, deliberately:
     * the intention has been consumed the moment the wheel appears. Every verb that shipped
     * before this batch acts on the survivor or on a structure it can look up by name, so
     * none of them ever needed to know what was under the finger. `move-structure` is the
     * first that does — it is universal across four targets — and reading `this.pending` in
     * its handler got `null` every time, so pressing Move answered "there is nothing here to
     * move" while standing on the crate.
     *
     * That is the same shape as [[D-180]]: code that is correct in itself, reading state that
     * something upstream had already cleared. Captured at the moment the circle opens, which
     * is the only moment the answer is still known.
     */
    private circleTarget: VerbTarget | null = null;
    /**
     * ...AND WHERE IT WAS OPENED, for the one target whose identity IS a point.
     *
     * `ground` has no world record to look up later — `pendingTarget` says so in as many
     * words — so a ground verb that needs to act SOMEWHERE has to be handed the somewhere.
     * Captured with `circleTarget` and cleared with it.
     */
    private circlePoint: { x: number; y: number } | null = null;
    //  `selectedKnownRecipe` IS GONE (ITEM 3, this batch) — the known-list row it tracked no
    //  longer exists. See the ledger entry for the full account.
    private storage: StorageView;
    private workspace: WorkspaceView;
    private raftView: RaftView;
    //  P0-3 — the pile you put down, finally drawn. See `DroppedView`.
    private droppedView: DroppedView;
    //  WAVE 1 — the beached outboard and the tide's own finds. See `OutboardView`/`ShoreItemsView`.
    private outboardView: OutboardView;
    private shoreItemsView: ShoreItemsView;
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
    private lastCuePlayed: string | null = null;
    /** The last factor handed to the fire bed (P0-G). Null until one is sent. */
    private lastFireBedFactor: number | null = null;
    private lastReadoutSaid: string | null = null;

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
        this.constructionView = new ConstructionView(this.scene);
        this.boatWork = new BoatWorkView(this.scene);
        this.cave = new CaveView(this.scene);
        this.ghost = new GhostView(this.scene);
        runtime.ghostReadout = () => this.ghost.debugState();
        this.storage = new StorageView(this.scene);
        this.workspace = new WorkspaceView(this.scene);
        this.droppedView = new DroppedView(this.scene);
        this.raftView = new RaftView(this.scene);
        this.outboardView = new OutboardView(this.scene);
        this.shoreItemsView = new ShoreItemsView(this.scene);

        const state = session().state;
        this.nodes = new NodeViews(this.scene, state.nodes, (x, z) => this.island.heightAt(x, z));
        this.boars = new BoarsView(this.scene);
        this.lookSensitivity = readSensitivity();
        this.testSpeedEnabled = readTestSpeed();

        //  `openBuildCard`'s slot here is GONE (ITEM 1, this batch) — see `Hud`'s own
        //  constructor comment (hud.ts) for the full account.
        this.hud = new Hud(
            this.overlay,
            () => this.onBuildFire(),
            (food) => this.onEatFood(food),
            () => this.onDrinkFlask(),
            () => this.doDrinkClean()
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
        //  WHAT THE WORLD LAST SAID OUT LOUD — read-only, per [[D-075]]. Law 26 asks the
        //  world to speak before the interface does, and sound is the half of that which
        //  needs no gesture: a survivor facing the sea still HEARS something come down
        //  inland. Without this the audible half was unwitnessable and only the visible
        //  half — which needs a camera tilt — could be checked at all.
        runtime.lastCue = () => this.lastCuePlayed;
        runtime.cuePlays = () => this.cues.playsSince();
        runtime.forgetCuePlays = () => this.cues.forgetPlays();
        //  DROP 6 — the last thing the READOUT said, read-only ([[D-075]]). A hint is the
        //  right surface for it and the wrong witness: the standing-hint system legitimately
        //  replaces it moments later, so a device check reading `hints().last` measures
        //  whichever sentence happened to be most recent. This keeps the readout's own.
        runtime.lastReadout = () => this.lastReadoutSaid;
        //  THE WHOLE TRAIL, not just the last word — read-only, per [[D-075]].
        //
        //  `lastTapOutcome` returns the newest breadcrumb, and a tap that never reached
        //  `onTap` at all leaves no breadcrumb, so the previous tap's answer is served again
        //  and reads as a fresh one. A probe built on it cannot tell "the gesture missed" from
        //  "the gesture landed and resolved wrongly" — which is exactly the distinction FIX 5
        //  and `JUNK 4c` have both been unable to make while being carried unexplained.
        //  The coordinates are what settle it: a breadcrumb whose pixel is not the pixel you
        //  touched is a stale one.
        runtime.tapTrail = () => this.tapBreadcrumbs.map((b) => ({ ...b }));
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
        runtime.fireLoudness = () => this.lastFireBedFactor;
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
        runtime.makeChosen = (materials, recipeId) => {
            const result = makeChosen(session().state, materials as 'wood'[], recipeId);
            session().persist(now());
            return result;
        };
        runtime.gather = (nodeId) => {
            const result = gatherNode(session().state, nodeId);
            session().persist(now());
            return result;
        };
        runtime.eat = (food) => {
            const result = eat(session().state, food as 'coconut');
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
        /**
         * AIM AT WHAT IS ACTUALLY DRAWN — the general answer to a question this project has
         * now got wrong twice.
         *
         * THE AUDIT THAT PRODUCED THIS. `projectToScreen` takes X and Z and DERIVES the height
         * as `surfaceHeightAt + 0.4`. That is a guess, and it is right for exactly two cases:
         * something standing on the ground, and something floating at the surface. It has
         * already been wrong twice —
         *
         *   [[D-124]]  the wreck parts float, and it aimed at the SEABED, 7 m under them.
         *   [[D-127]]  the fire ring is 0.29 m tall, and it aimed 0.4 m OVER it.
         *
         * — and each time the answer was a local patch: move the derived height, then add
         * proximity forgiveness. Neither made it general, and the next thing to break it is
         * anything below the surface, where a derived height cannot reach by construction.
         *
         * So there is now one path that does not guess: give it the mesh, and it projects that
         * mesh's own world centre. Underwater, mid-air, flat on the sand — it aims at the
         * object because it asks the object. `projectToScreen` stays for callers that only have
         * a ground position, and is now the special case rather than the rule.
         */
        //  This block was written out TWICE, identically, the first copy overwritten by the
        //  second before it could ever be called. Harmless and still wrong; collapsed here.
        //
        //  `twoSided` is added for P0-F. A surface that is invisible from inside is not
        //  "transparent" — its inner faces are culled and never drawn — so the property that
        //  decides whether a survivor standing in the cave can see the rock around them is
        //  the material's, not the mesh's. The check reads it from INSIDE, which is the half
        //  D-142 never witnessed.
        runtime.meshInfo = (meshName: string) => {
            const mesh = this.scene.getMeshByName(meshName);
            if (!mesh) return null;
            return {
                enabled: mesh.isEnabled(),
                rotZ: mesh.rotation.z,
                //  The DRAWN heading. `place()` writes `root.rotation.y` from `this.facing`, so
                //  this is the body's own facing as rendered — the only way a check can witness
                //  "the survivor turned to look" without trusting a field it cannot see.
                rotY: mesh.rotation.y,
                scaleZ: mesh.scaling.z,
                y: mesh.position.y,
                twoSided: mesh.material ? mesh.material.backFaceCulling === false : null,
            };
        };
        runtime.screenOfMesh = (meshName: string) => {
            const mesh = this.scene.getMeshByName(meshName);
            return mesh ? this.projectMeshCentre(mesh) : null;
        };
        //  WAVE 1 — THE PER-SURFACE WITNESS, ASSEMBLED ONCE (item B's confirmed gap, closed
        //  for what this slice needs; see `runtime.surfaceByTag`'s own doc). Finds by
        //  `mesh.metadata[key]` rather than by name, for pooled meshes whose NAME is only a
        //  pool slot — reuses `projectMeshCentre`, the exact same projection `screenOfMesh`
        //  runs, so the two can never quietly compute the screen point two different ways.
        runtime.surfaceByTag = (key: string, value: string) => {
            const mesh = this.scene.meshes.find((m) => (m.metadata as Record<string, unknown> | null)?.[key] === value);
            if (!mesh) return null;
            const enabled = mesh.isEnabled();
            return { enabled, screen: enabled ? this.projectMeshCentre(mesh) : null };
        };

        //  HOW BIG A DRAWN THING ACTUALLY IS, in metres of world. Read-only ([[D-075]]).
        //
        //  Added for Drop 4, and for a reason worth recording: the boat shipped as a 5.6 m box
        //  under a comment calling her "the largest made thing on this island", and every test
        //  in the suite agreed, because none of them could see her. A device frame from
        //  sixteen metres settled it in one look — she read as a crate. A claim about SIZE has
        //  to be checkable against the geometry, or the only instrument for it is a screenshot
        //  somebody remembers to take.
        runtime.meshSizeM = (meshName: string) => {
            const mesh = this.scene.getMeshByName(meshName);
            if (!mesh) return null;
            const box = mesh.getBoundingInfo().boundingBox;
            const span = box.maximumWorld.subtract(box.minimumWorld);
            return { x: Math.abs(span.x), y: Math.abs(span.y), z: Math.abs(span.z) };
        };

        /**
         * IS THIS POINT IN FRONT OF THE CAMERA AT ALL? The guard both projections lacked.
         *
         * THE DEFECT, and it is the whole of the quarry cluster. `Vector3.Project` does the
         * perspective divide unconditionally: for a point BEHIND the camera the w term goes
         * negative, the divide flips sign, and it returns a confident-looking coordinate that
         * is pure nonsense — `pt=3265,3433` and `pt=-1279,1617` on a 915x412 viewport, while
         * the survivor stood TWO METRES from the node. Nothing was wrong with the maths. It was
         * asked a question with no answer and made one up.
         *
         * That is this project's oldest recurring shape: a function returning a plausible value
         * instead of admitting it cannot answer. `tapWorld`'s own comment in the harness already
         * describes the downstream symptom — "a touch dispatched off-screen produces NO pointer
         * event, so the gesture silently does not happen while the helper reports success" — and
         * the fix was applied at that caller, by bound-checking, and never here at the source.
         * So every OTHER caller stayed exposed, and the quarry checks paid for it for sessions
         * under the label "screen-projection fragility".
         *
         * Returning null is the honest answer, and it is what makes `onCanvas=false` become
         * `pt=null`: a helper that says "I cannot aim at that from here" instead of aiming at a
         * pixel that does not exist.
         */
        runtime.projectToScreen = (worldX: number, worldZ: number) => {
            //  [[D-124]] — the SURFACE, not the terrain. This read `heightAt(worldX, worldZ)`,
            //  which is the seabed once you are past the shelf, so aiming at anything afloat
            //  pointed metres underwater. See `surfaceHeightAt`'s header for the whole defect.
            //  On land the two are identical, so every existing aimed check is untouched.
            const y = surfaceHeightAt(worldX, worldZ) + 0.4;
            const target = new Vector3(worldX, y, worldZ);
            //  Behind the camera has no screen position. Say so, rather than inventing one.
            if (!this.isInFrontOfCamera(target)) return null;
            const projected = Vector3.Project(
                target,
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
        //  OPENING THE PACK CANCELS AN ARMED SITING, and takes the ghost with it — the other half
        //  of LDOE bar property 4. Without this a survivor who chose a crate and changed their mind
        //  had no way out but to put it somewhere: the site card had an explicit cancel and the
        //  slate flow shipped without one. Reaching for the pack IS "let me choose something else",
        //  so it needs no control of its own.
        if ((this.siting || this.moving) && !reopening) {
            this.siting = null;
            //  item 2 — an armed MOVE dies with an armed siting, for the same reason: the
            //  ghost goes with the panel, and leaving one aimed at nothing is how a survivor
            //  ends up relocating a shelter they had stopped thinking about.
            this.moving = null;
            this.ghost.hide();
            this.showHint('Never mind that, then.');
        }
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
        //  ---- A RE-RENDER REPLACES THE PANEL, IT DOES NOT STACK ANOTHER ON TOP ----------
        //
        //  `panel()` only ever appends, so every in-place redraw — a tab switch, and now a
        //  per-kind storage move — left the previous `.panel.loadout` in the overlay beneath
        //  the new one. A `.panel` is `inset: 0`, so that is a full-screen sheet: the topmost
        //  wins the pointer and the game LOOKS fine, while `fade(el, onClose)` on close
        //  removes only the one element it was given and every buried copy stays behind,
        //  swallowing world taps. That is the input-freeze shape `showLoadout`'s own reveal
        //  bug already cost this project once.
        //
        //  FOUND BY THE DEVICE, and only because the harness reads the DOM the way the DOM
        //  actually is: `document.querySelector` returns the FIRST match, so a per-kind tap
        //  resolved to the buried panel's button and came back "occluded" — the occluder
        //  being another copy of the same button. The tab-switch path has taken this route
        //  since it shipped; the fix is one line and belongs here rather than in the item.
        if (reopening) {
            for (const stale of this.overlay.querySelectorAll('.panel.loadout')) stale.remove();
        }
        //  The open path runs INSIDE the control transfer, so if any of it throws the game
        //  would be left holding control with nothing on screen to give it back. Hand it
        //  back immediately and let the error surface (D-049) rather than lock the player
        //  out. `guardPanelLock` is the backstop for the cases this cannot see.
        try {
            const s = session().state;
            //  Ch.1's null-outcome journal (D-055) — RELOCATED, ITEM 1 (this batch). Its
            //  original trigger, "evaluate every recipe slot against every material
            //  currently held, once per panel-open", lived in `openBuildCard`, which no
            //  longer exists; without a new home this journaling mechanism would run in
            //  tests and never once in real play. `!reopening` keeps the same cadence —
            //  once per genuine open, not once per in-place tab-switch redraw.
            if (!reopening) recordCombinationAttempts(s);
            const view = loadoutView(s);
            showLoadout(
            this.overlay,
            {
                //  DROP 5 — derived once, in the brain. The panel re-derives nothing.
                radio: radioPanelView(s),
                //  DROP 6 — the same readings the world-first announcements use.
                readout: readoutRows(s),
                zones: view.zones.map((z) => ({ zone: z.zone, tools: z.tools, materials: z.materials })),
                massKg: view.massKg,
                bulk: view.bulk,
                storageOpen: view.storageOpen,
                equippable: ownedTools(s),
                activeHand: s.loadout.activeHand,
                atStorage: atStorage && s.storage.built,
                storageAction: atStorage ? this.storageActionLabelFor(s) : null,
                storageTakeAction: atStorage ? this.storageTakeLabelFor(s) : null,
                //  item 1 — READ FROM THE BRAIN, derived from `STORABLE_KEYS`. The surface
                //  keeping its own list of kinds is exactly the drift that once offered a
                //  survivor carrying only food no storage button at all.
                storageRows: atStorage
                    ? storageContents(s).map((r) => ({
                        kind: r.kind,
                        label: MATERIAL_LABEL[r.kind] ?? r.kind,
                        carried: r.carried,
                        stored: r.stored,
                        batch: TUNE.storageWithdrawBatch,
                    }))
                    : [],
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
                //  ITEM 2 — WHAT IS WITHIN REACH, not merely what is carried. With a crate open
                //  in front of you its contents are reachable too, so the chips list the union
                //  and the whole combine path downstream sees one pool. Closed, this is exactly
                //  the carried list it replaced.
                //  ITEM 3 (this batch) — a genuine combinable ITEM now includes the stone
                //  hammer (`ALL_MATERIAL_KINDS` is derived from `MATERIAL_PROFILE`, which
                //  `materials.ts` now lists it in) — no separate wiring needed here at all.
                combinable: (() => {
                    const reach = reachFor(s, atStorage && s.storage.built);
                    return ALL_MATERIAL_KINDS.filter((m) => (reach.counts[m] ?? 0) > 0);
                })(),
                //  `known`/`selectedKnown`/`maker` ARE GONE (ITEMS 1 AND 3, this batch) — see
                //  the ledger entry. `hints` is `panelHints`, RELOCATED from the Build panel
                //  it used to feed (`openBuildCard`, also gone) to here, unchanged in the brain.
                hints: panelHints(s),
                //  LAW 126's other two tabs, both READ from the brain. The hub renders
                //  them; nothing about their content is decided here.
                vitals: bodyReport(s),
                vitalsExtra: {
                    injuries: { bleeding: s.injuries.bleeding, limp: s.injuries.limp, pain: s.injuries.pain },
                    injuryNote: injuryNote(s.injuries),
                    //  P0-2 — the rule answers, so the readout cannot describe a requirement
                    //  the rule does not have. It said "at the shelter" for two drops.
                    bandage: { canBind: canBindWound(s), blocker: bindBlocker(s) },
                    //  WAVE 0 — read from `vessel.ts`, never re-derived here.
                    water: { note: waterNote(s), canDrink: canDrinkClean(s) },
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
                    //  RULING (C1) — relocated from the Build panel; same read, same source
                    //  (`isShelteredSleep`), only the tab changed.
                    rest: { sheltered: isShelteredSleep(s) },
                    //  WAVE 1 — a found, not crafted, not held capability; see `VitalsExtraView`'s
                    //  own doc for why it lives here.
                    salvageTools: s.tools.salvageTools,
                    //  RULING (C1), this batch — F3, relocated from the Build panel; same
                    //  source (`refugeReport`), only the tab changed. See `VitalsExtraView`'s
                    //  own doc for why this specific reading had been an explicit earlier keep.
                    refuge: refugeReport(s),
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
            //  THE REDESIGN'S THREE. A pure read, then one commit per intention.
            //  `atStorage` PASSED THROUGH, so an open crate counts toward what a placed
            //  outcome can afford — the same reach `placeFromSlate` will draw from.
            (materials: string[]) => combineSlate(session().state, materials as 'wood'[], atStorage),
            (materials: string[], recipeId: string) => this.onCombine(materials, recipeId, atStorage),
            (materials: string[]) => this.onDiscover(materials, atStorage),
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
            //  `onMake` IS GONE (ITEM 1, this batch) — removed here, not left as a no-op,
            //  matching hud.ts's own signature change at the same position.
            //  DROP 5 — THE STATIC. Toggle the receiver. There is deliberately no send
            //  counterpart here or anywhere: see `radio.ts`'s header.
            () => {
                const st = session().state;
                if (st.radio.listening) {
                    stopListening(st);
                    this.showHint('You switch it off. The cell has that much more in it.');
                } else if (beginListening(st)) {
                    this.showHint(receptionNow(st).note);
                } else {
                    this.explain(listenBlockedReason(st) ?? 'Nothing to listen with.');
                    return;
                }
                session().persist(now());
                this.lastActivityAt = now();
            },
            (signalId: string) => {
                const st = session().state;
                if (!logSignal(st, signalId)) {
                    this.explain(canLogSignal(st).reason ?? 'Nothing to write down.');
                    return;
                }
                this.cues.play(CUES.craft);
                this.floatText('written down');
                this.showHint('A call sign and an hour, in your own hand. It will outlast you.');
                session().persist(now());
                this.lastActivityAt = now();
            },
            //  P0-2 — bind the wound, from the tab that reads it. Routed to the SAME
            //  `doBindWound` the shelter's circle already uses: one verb, one place, not a
            //  second implementation beside it.
            () => this.doBindWound(),
            () => this.doDrinkClean(),
            //  RULING (C1) — SLEEP, RELOCATED FROM THE BUILD PANEL. Same shape the Build
            //  panel's own `bind()` helper gave it: `endPanel` first, `trySleep` (which opens
            //  the morning report through ITS OWN `beginPanel`) second, both inside the ONE
            //  callback `fade` defers by 320 ms in hud.ts — never split across a synchronous
            //  action plus a separately-deferred close, which would let the report's fresh
            //  `beginPanel()` race this panel's own deferred release.
            () => { this.endPanel(); this.trySleep(); },
            //  `onSelectKnown` IS GONE (ITEM 3, this batch) — removed here, not left as a
            //  no-op, matching hud.ts's own signature change at the same position.
            //  RULING (C1), this batch — KNAPPING NOW STAGES LIKE EVERYTHING ELSE. The direct
            //  `knapSharpblade(session().state)` call that used to live here is gone with the
            //  button that called it; `knapSharpblade` itself is untouched and lives on as
            //  `Game.MAKERS`' own execution path for the recipe, called through the SAME
            //  `onCombine` every other invention already uses, once the slate shows "Knapped
            //  blade" as an option. `onCanAttempt` delegates straight to `canExperimentWith`
            //  — the exact predicate the real attempt is gated by — so the slate can never
            //  show a pile as attemptable that the attempt itself would then refuse.
            //
            //  `atStorage` PASSED THROUGH, not left to its default. A REGRESSION G11 caught:
            //  `canExperimentWith`'s own reach defaults to HELD ONLY (its own comment says so
            //  explicitly) precisely so that a caller which does not know a box is open keeps
            //  the behaviour it always had — but this caller DOES know, the same way `onSlate`/
            //  `onCombine`/`onDiscover` two lines above already do, and omitting it here silently
            //  starved `enough` for any pile drawn from an open crate: two materials genuinely in
            //  reach, `canExperimentWith` checking HELD-only reach for them, refusing, and the
            //  slate rendering empty for a pile ITEM 2's own box-reach feature says should work.
            (materials: string[]) => canExperimentWith(session().state, materials as MaterialKind[], atStorage) === null,
            //  THE SAME CALL, ANSWERING THE OTHER HALF. Not a second opinion that could drift:
            //  the sentence shown when the pile is refused is the sentence the refusal itself
            //  returned, from the identical arguments the line above gates on.
            (materials: string[]) => canExperimentWith(session().state, materials as MaterialKind[], atStorage),
            //  item 11 — taking, as its own act. Appended LAST so every positional argument
            //  above keeps the position it already had.
            () => this.tryTakeStorage(),
            //  item 1 — the aimed reach. Appended LAST, same discipline as `onTakeStorage`.
            (kind: string, direction: 'deposit' | 'withdraw') => this.tryMoveKind(kind, direction)
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
    /**
     * COMBINE — commit to a thing this survivor already knows how to make.
     *
     * No question, because the question was the surface: the slate named every known outcome
     * before a button was pressed and the survivor picked one. `makeChosen` still refuses a
     * recipe that does not match the pile or that they have not demonstrated, so a stale slate
     * cannot mint anything — the guard is the brain's, not this layer's.
     */
    /**
     * EVERY MAKER, BY RECIPE ID — the map that finishes the Build panel's retirement.
     *
     * These are the SHIPPED craft functions, unchanged: each one validates its own materials,
     * rolls its own grade, sets its own tool flag and records its own domain practice. Nothing
     * about making an axe moved; what changed is only which surface asks for one.
     *
     * `knap` WAS deliberately absent, on the grounds that a one-slot recipe could never reach
     * a slate built for two to four. RULING (C1), this batch, closed exactly that gap — see
     * `canExperimentWith`'s arity-1 exception and `KnownRecipe.standalone` — so it now stages
     * and combines the same as everything else in this map, and the button it used to need is
     * gone with the panel that carried it.
     */
    private static readonly MAKERS: Record<string, (state: GameState) => boolean> = {
        torch: craftTorch,
        axe: craftAxe,
        spear: craftSpear,
        backpack: makeBackpack,
        stonehammer: craftStoneHammer,
        raft: craftRaft,
        fishingline: craftFishingLine,
        net: craftNet,
        //  RULING (C1), this batch — KNAP JOINS THE OTHER HAND-HELD MAKERS. `knapSharpblade`
        //  is already fully self-sufficient (`canKnapSharpblade` checks the hammer AND the
        //  stone; a success spends the stone itself), so `recipeCost('knap')` returning
        //  nothing to draw into hands first (knap was never in the slots-based recipe table
        //  this reads) is harmless, not a gap — the maker was always going to do its own
        //  spending. This is the one missing line that actually connects the staged pile to
        //  the blade; without it the slate would show "Knapped blade" as attemptable and
        //  tapping Combine would silently do nothing.
        knap: knapSharpblade,
        //  SESSION 4 — THE PONTOON. A hand-held maker like the rest: `craftPontoon` spends its
        //  own timber, fibre and blade and leaves the hammer alone. No bench check here or in
        //  the maker — four staged materials cannot be assembled anywhere but a bench, so
        //  `canExperimentWith` has already made that decision before this map is reached.
        pontoon: craftPontoon,
        //  SESSION 1 — THE BENCH IS A MAKER, NOT A SITING, and that is the whole of [[D-165]]'s
        //  "upgrade in place" applied to the workspace ladder. `workmat` is absent from this
        //  map on purpose: it is sited (it is where the work will happen, so the survivor
        //  picks the spot) and goes through `placeAtSite` with the crate and the shelter.
        //  The bench never asks where, because the mat already answered.
        workbench: buildWorkbench,
    };

    /**
     * COMBINE, AND NOW IT ACTUALLY MAKES THE THING.
     *
     * THE DEFECT THIS CLOSES, flagged at the end of the batch that created it: a known outcome
     * chosen from the slate only ever BUMPED ITS PLAN VERSION — *"You refine your plan for X"* —
     * because `tryCombineWith` mints plans and the Build panel turned plans into objects. Once
     * [[D-164]] gave shelter and storage a real build from the slate, a crate went up and a
     * spear did not, which is the kind of half-rule a player meets once and stops trusting.
     *
     * TWO SHAPES, ONE VERB, and the difference is only WHERE the thing ends up:
     *
     *   PLACED (shelter, storage) — asks WHERE. Arms a siting, spends nothing, and the tap that
     *     picks the spot does the building.
     *   HAND-HELD (everything else) — no extra step at all, because there is no question to
     *     ask: a spear goes in your hands, and the only place your hands can be is where you
     *     are. Adding a confirm here would be ceremony for its own sake.
     *
     * The box feeds both: `drawIntoHands` moves what is needed out of an open crate first,
     * because every shipped maker reads `state.inventory` and nothing else.
     */
    private onCombine(materials: string[], recipeId: string, storageOpen = false): void {
        //  A PLACED OUTCOME IS NOT COMMITTED HERE. Shelter and storage go in the world, so
        //  choosing one arms the siting step and spends nothing — the build happens on the tap
        //  that picks the spot, through the SAME `placeAtSite` the site card always used.
        //  Duplicating that would mean two paths that spend materials and decide a grade.
        if (isPlaced(recipeId)) {
            //  ---- [[D-184]]'S GUARD, SUPERSEDED AND NARROWED (item 3) ---------------------
            //
            //  D-184 refused to arm a placed outcome the survivor could not afford, because the
            //  placing tap would refuse, re-arm, and eat every world tap. Under the OLD economy
            //  that was right: a placement that could not complete had no way to become one that
            //  could, so the only safe answer was not to start.
            //
            //  THE NEW ECONOMY REMOVES THE PREMISE. Starting short is now the intended path — the
            //  frame goes up with whatever was staged and is fed over as many visits as it takes.
            //  So the affordability refusal is gone for anything raised on a site.
            //
            //  D-184's LAW IS NOT GONE, and it still has exactly one live case: a survivor
            //  carrying NONE of what the thing is made of. Beginning there would put an empty
            //  frame in the world for no investment and hand back a tap that resolves to
            //  something the player cannot act on — the trap in a new coat. `beginBlocker`
            //  refuses precisely that, names the kinds to go and find, and nothing else.
            //  ...AND ONLY FOR OUTCOMES THAT CAN ACTUALLY BE FINISHED INCREMENTALLY. The
            //  crate is still built whole, so it keeps D-184's affordability answer — for it
            //  the old economy is still the economy, and starting short really would strand it.
            if (isIncremental(recipeId)) {
                const cannotBegin = beginBlocker(session().state, recipeId, storageOpen);
                if (cannotBegin) { this.explain(cannotBegin); return; }
            } else {
                const short = placementBlocker(session().state, recipeId, storageOpen);
                if (short) { this.explain(short); return; }
            }
            this.siting = { recipeId, materials, storageOpen };
            //  THE GHOST, BEFORE ANYTHING IS SPENT (LDOE bar properties 1 and 2). It stands where
            //  a tap on "here" would put the thing — in front of the survivor, on the ground —
            //  and its colour is the real verdict from `previewAt`, not a guess. This is the
            //  preview the site card used to carry; retiring the card took it with it and left a
            //  survivor siting blind. No confirm step is added: choosing shows it, the next tap
            //  commits, which is property 4 intact.
            this.showSitingGhost(recipeId);
            this.cues.play(CUES.target);
            //  ---- PER OUTCOME, NEVER A BINARY (item 2, this batch) ------------------------
            //
            //  REPORTED as "re-staging stone + fibre says PLACE THE SHELTER but places a mat",
            //  and diagnosed as stale cached recipe text bleeding in from an earlier failed
            //  shelter attempt. It is simpler and more mechanical than that: this line was
            //  `recipeId === 'storage' ? crate : shelter`, a two-way ternary — so "not the
            //  crate" MEANT the shelter, and `workmat`, the third placed outcome and the first
            //  added since this line was written, fell off the end into the shelter's sentence.
            //  Nothing was cached and nothing bled; the label was simply never asked.
            //
            //  THIS IS THE THIRD TIME THIS EXACT SHAPE HAS BEEN FOUND IN THIS FLOW —
            //  `placeAtSite`'s own dispatch and the harness's `makeViaSlate` were both the same
            //  ternary, both fixed last batch, and this one survived because it produces only a
            //  WRONG SENTENCE rather than a wrong object, so every state assertion stayed green
            //  while the screen lied. Derived from the recipe's own display name now, so a
            //  fourth placed outcome cannot inherit a third's words.
            this.showHint(`Tap where the ${recipeDisplayName(recipeId).toLowerCase()} should go.`);
            this.lastActivityAt = now();
            return;
        }
        //  HAND-HELD: make it now. Top the hands up from the box, then call the shipped maker.
        const maker = Game.MAKERS[recipeId];
        if (maker) {
            const s = session().state;
            //  ASK WHY BEFORE DRAWING ANYTHING. `makerBlocker` answers in the survivor's own
            //  terms — "You already have a stone hammer, and one is all you need." — where the
            //  fallback below could only ever say "You cannot make that right now", which is
            //  the reason-free refusal that got reported as the hammer being BLOCKED BY THE MAT.
            //  Checked ahead of `drawIntoHands` on purpose: pulling materials out of a crate to
            //  build something that was never going to be built is a second, quieter wrong.
            const why = makerBlocker(s, recipeId);
            if (why) { this.explain(why); return; }
            for (const { kind, amount } of recipeCost(recipeId)) {
                if (!drawIntoHands(s, kind, amount, storageOpen)) {
                    this.explain('You do not have enough for that yet.');
                    return;
                }
            }
            if (!maker(s)) {
                //  The maker's own refusal, in its own words where it has any — the raft is the
                //  one with something to say (it wants water), and saying "you cannot" instead
                //  would be the silent-refusal shape [[D-042]] exists to forbid.
                this.explain(recipeId === 'raft'
                    ? (raftBlocker(s) ?? 'That will not come together here.')
                    : 'You cannot make that right now.');
                return;
            }
            //  THE BENCH TOOK THE LOAD, SO THE BENCH TAKES THE WEAR (Law 181, "maintenance
            //  follows evidence"). Charged ONLY when the third relation was genuinely used:
            //  a two-material combine standing at a bench is work two hands could have held
            //  anywhere, and wearing the joints for it would be a use-counter behaving like
            //  the timer Law 181 forbids. `wearBenchJoints` guards the tier itself, so a mat
            //  is never worn — there are no joints in a mat to slacken.
            if (materials.length > TUNE.relationsAtW0 && atWorkspace(s)) wearBenchJoints(s);
            this.recordTap(0, 0, `combine:${recipeId}:made`);
            this.cues.play(CUES.craft);
            this.floatText(`${recipeDisplayName(recipeId)} — made`);
            session().markFirstCraft(msSinceControl());
            session().persist(now());
            this.lastActivityAt = now();
            return;
        }

        const result = makeChosen(session().state, materials as 'wood'[], recipeId, storageOpen);
        this.recordTap(0, 0, `combine:${recipeId}:${result.outcome}`);
        session().persist(now());
        const said = announcementFor(result);
        if (said.presentation === 'float') this.floatText(said.text);
        else this.explain(said.text);
        if (said.triumphant) this.cues.play(CUES.unlock);

        //  `onCombine` DOES NOT CRAFT-ON-DISCOVER, and the block that used to sit here is
        //  the whole explanation for D-179's "the edit never landed" finding — which was
        //  itself wrong. It landed; it landed in the WRONG METHOD. Item 7's discovery-crafts
        //  logic was written into `onCombine`, where `result` comes from `makeChosen` and the
        //  outcome is never a discovery, so it could not fire on the path it was written for
        //  and sat here reading a variable that means something else. Worse, it was live: a
        //  `makeChosen` outcome of 'invented' would have run a maker over an item this method
        //  had already made. Removed outright; the real one is in `onDiscover` below.

        this.lastActivityAt = now();
    }

    /**
     * DISCOVER — commit to finding out what one of the grey slots is.
     *
     * WHICH one is not decided here and must not be: `resolveRecipe`'s undiscovered-first
     * tie-break and its suspicion/rotation logic already answer that, and they give the same
     * answer the old generic "put them together and see" path gave. This is a door, not a rule.
     */
    private onDiscover(materials: string[], storageOpen = false): void {
        const result = discoverWith(session().state, materials as 'wood'[], storageOpen);
        this.recordTap(0, 0, `discover:${result.outcome}`);
        session().persist(now());
        const said = announcementFor(result);
        if (said.presentation === 'float') this.floatText(said.text);
        else this.explain(said.text);
        if (said.triumphant) this.cues.play(CUES.unlock);

        //  ---- A SUCCESS CRAFTS THE THING, HERE, NOW (DIRECTOR'S RULING, item 7) ----------
        //
        //  *"Upon successful discovery it will deduct the resources and craft the item; upon
        //  failure it only deducts the materials."* `tryCombineWith` no longer charges the
        //  staged unit on a discovery (see its own note), so the maker below is the ONLY thing
        //  that spends: the survivor pays the recipe's price once and walks away holding it.
        //
        //  THIS SHIPPED BROKEN ONCE AND WAS WITHDRAWN RATHER THAN LEFT HALF-WORKING, so the
        //  outcome is TRACED at every branch. `discover:craft:*` records what actually
        //  happened, which is what turned "it did not work" into a fact a check could read.
        const invented = result.outcome === 'invented' ? result.recipeId : null;
        if (invented) {
            const st = session().state;
            const placed = isPlaced(invented);
            const blocked = makerBlocker(st, invented);
            const maker = Game.MAKERS[invented];
            if (placed) {
                //  ---- ITEM 3: A PLACED DISCOVERY GOES STRAIGHT TO SITING ------------------
                //
                //  REPORTED as "discovering the shelter and choosing to place it redirects
                //  back to Combine". It did: the previous pass taught discovery to CRAFT a
                //  hand-held outcome and left the placed half exactly where it was, so working
                //  out a shelter minted a plan and dropped the survivor back at the staging
                //  surface to assemble the identical pile again before anything could be put
                //  anywhere. The hand-held half of that ruling shipped; this is the other half.
                //
                //  Arms the SAME siting flow `onCombine` arms — ghost, cue and prompt — so a
                //  discovery ends where a combine ends: with the world asking where it goes.
                //  Nothing is spent here; the builder charges at the siting tap as it always has.
                this.siting = { recipeId: invented, materials: materials as MaterialKind[], storageOpen };
                this.showSitingGhost(invented);
                this.cues.play(CUES.target);
                this.showHint(`Tap where the ${recipeDisplayName(invented).toLowerCase()} should go.`);
                this.recordTap(0, 0, `discover:craft:siting:${invented}`);
                this.lastActivityAt = now();
                return;
            }
            if (blocked || !maker) {
                //  A PLACED outcome keeps its siting step and a blocked one says why — both
                //  are correct outcomes rather than failures, and both are recorded as
                //  themselves so a silent skip is impossible to mistake for a silent break.
                this.recordTap(0, 0, `discover:craft:skipped:${invented}`);
                if (blocked && !placed) this.explain(blocked);
            } else {
                const drew = recipeCost(invented)
                    .every(({ kind, amount }) => drawIntoHands(st, kind, amount, storageOpen));
                const made = drew && maker(st);
                this.recordTap(0, 0, `discover:craft:${made ? 'made' : drew ? 'refused' : 'short'}:${invented}`);
                if (made) {
                    this.cues.play(CUES.craft);
                    this.floatText(`${recipeDisplayName(invented)} — made`);
                    session().markFirstCraft(msSinceControl());
                } else if (!drew) {
                    this.explain('You worked it out, but you are short of what it takes to make one.');
                }
                session().persist(now());
            }
        }
        this.lastActivityAt = now();
    }



    private openSettings(): void {
        //  IT SAID NOTHING, AND THAT IS THE DEFECT UNDER THE "FLAKY" LABEL.
        //
        //  Three device checks — the Look button, the debug-info button, and the copy
        //  confirmation — have been carried as `measuredIntermittent` across sessions. They are
        //  not intermittent: they fail TOGETHER, always, whenever a panel is still up, because
        //  this line refused in complete silence. `openSiteCard` two hundred lines below has
        //  said "Something else is open. Close it first." since it was written; this button and
        //  the Build card never learned to.
        //
        //  IT IS A PLAYER-FACING BUG, not a harness artefact. A survivor with the inventory
        //  panel open who taps Look gets NOTHING — no panel, no cue, no reason — which is
        //  [[D-042]]'s fail-loud law broken in the same shape as the bare-ground tap fixed last
        //  session: a button indistinguishable from a broken one. The label hid it, exactly as
        //  the director suspected, because "flaky" is a story about timing and this was never
        //  about timing.
        if (runtime.panelOpen) { this.explain('Something else is open. Close it first.'); return; }
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
            //  A fishing spot resolves whether or not it currently holds fish: it is a PLACE,
            //  and the survivor has to be able to tap it and be told it is fished out. Every
            //  other kind is an object, and a spent one must NOT keep swallowing taps aimed
            //  at the ground behind it — the picking regression [[D-042]] root-caused.
            if (view && (view.node.available || view.node.kind === 'fishingspot')) return view;
        }
        if (hit?.hit && hit.pickedPoint) {
            const p = hit.pickedPoint;
            let best: NodeView | null = null;
            let bestD: number = TUNE.nodeTapSlack;
            for (const view of this.nodes.views) {
                if (!view.node.available && view.node.kind !== 'fishingspot') continue;
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
        //  ---- A TAP ON THE FRAME AIMS AT THE FRAME (item 2) ---------------------------
        //
        //  THIS BRANCH WAS MISSING, and its absence was not "the frame is a bit small" — it was
        //  a hard refusal on a DIRECT HIT. Any pickable mesh this function does not recognise
        //  falls through to `unexpectedMesh`, and `onHold` returns immediately on that. So a
        //  long-press landing squarely on the frame's own timber was declined, and the survivor
        //  had no way to tell that from missing it. Exactly the "visible but unaimable" gap the
        //  `dropped` branch below already carries a note about, on the newest object in the game.
        if (hit?.hit && hit.pickedMesh?.metadata?.construction) {
            const c = session().state.construction;
            if (c) return { x: c.x, z: c.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.storage) {
            const st = session().state.storage;
            return { x: st.x, z: st.y, unexpectedMesh: null };
        }
        //  P0-3 — a tap on a dropped stack aims at THE STACK. Without this the pile is drawn,
        //  tappable, and resolves to whatever bare ground is behind it, which is the same
        //  "visible but unaimable" gap the shelter silhouette had.
        if (hit?.hit && hit.pickedMesh?.metadata?.droppedId) {
            const id = hit.pickedMesh.metadata.droppedId as string;
            const d = session().state.dropped.find((it) => it.id === id);
            if (d) return { x: d.x, z: d.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.traceId) {
            const t = traceById(hit.pickedMesh.metadata.traceId as string);
            if (t) return { x: t.x, z: t.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.raft) {
            const rf = session().state.raft;
            return { x: rf.x, z: rf.y, unexpectedMesh: null };
        }
        //  WAVE 1 — a tap on the outboard's own mesh aims at THE OUTBOARD, wherever it has
        //  been dragged to, the same reasoning `raft`/`dropped` above already carry.
        if (hit?.hit && hit.pickedMesh?.metadata?.outboard) {
            const pos = outboardPosition(session().state);
            return { x: pos.x, z: pos.y, unexpectedMesh: null };
        }
        //  SESSION 3 — a tap on her hull aims at THE BOAT, wherever she is floating.
        //
        //  This branch was missing for the same reason the freeze in `island.ts` was wrong: she
        //  never moved, so proximity to the sand she sat on always found her and nobody needed
        //  the direct hit. The crossing broke that in the one place it is fatal. The terrain mesh
        //  is a square about 152 m from origin to edge; she stands off the wreck at ~204 m, in
        //  open water where `sea.isPickable` is false and no terrain exists to strike. Her hull
        //  is then the ONLY pickable thing under the ray — and with no branch here it fell
        //  through to `unexpectedMesh`, which `onHold` declines outright.
        //
        //  So the crossing worked and the return did not: the survivor could be carried out,
        //  swim in, and then find that the boat they arrived on could not be touched. The exact
        //  one-way trip Session 3 exists to end, reintroduced one layer below the one it was
        //  fixed in. `raft` and `outboard` above are the same branch for the same reason.
        if (hit?.hit && hit.pickedMesh?.metadata?.boat) {
            const at = boatPosition(session().state);
            return { x: at.x, z: at.y, unexpectedMesh: null };
        }
        if (hit?.hit && hit.pickedMesh?.metadata?.shoreItemId) {
            const id = hit.pickedMesh.metadata.shoreItemId as string;
            const it = session().state.shore.items.find((x) => x.id === id);
            if (it) return { x: it.x, z: it.y, unexpectedMesh: null };
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
    private worldCandidateAt(point: { x: number; z: number }): 'fire' | 'pond' | 'shelter' | 'storage' | 'raft' | 'boat' | 'crash' | 'dropped' | 'outboard' | 'shoreitem' | 'workspace' | 'construction' | null {
        const s = session().state;
        type Candidate = { kind: 'fire' | 'pond' | 'shelter' | 'storage' | 'raft' | 'boat' | 'crash' | 'dropped' | 'outboard' | 'shoreitem' | 'workspace' | 'construction'; d: number };
        const candidates: Candidate[] = [];
        {
            //  DROP 3B(i) — the appointment. A candidate ONLY while there is something out
            //  there: before the crash and after the forest has taken it, a tap on that
            //  ground is ordinary ground, which is what the world-truth law requires.
            //  ...AND WHILE IT IS GONE, TOO, for as long as the survivor is standing on the
            //  scar. Arriving to find the forest has closed over it is the emotional payload
            //  of a deadline, and a generic "Nothing to do there." throws it away — the device
            //  run caught exactly that. `crashGone` is a candidate so the handler can say the
            //  one true sentence; before the crash it is ordinary ground and stays so.
            if (crashWorkable(s.crash.stage) || crashGone(s.crash.stage)) {
                const d = distance(point.x, point.z, CRASH_SITE.x, CRASH_SITE.y);
                if (d <= TUNE.crashSiteRadiusM) candidates.push({ kind: 'crash', d });
            }
        }
        {
            //  DROP 4 — the broken fishing boat. Always a candidate: unlike the fire, the
            //  shelter and the crate, she is not built and cannot be absent. She has been on
            //  that beach since before the survivor washed up.
            //  WHEREVER SHE IS. She was a constant while she could not move; a crossing
            //  puts her at a stand-off in open water, and a survivor swimming back to her
            //  has to be able to reach her circle to get home again.
            const boatAt = boatPosition(s);
            const d = distance(point.x, point.z, boatAt.x, boatAt.y);
            if (d <= TUNE.boatTapRadiusM) candidates.push({ kind: 'boat', d });
        }
        if (s.fire.built) {
            const d = distance(point.x, point.z, s.fire.x, s.fire.y);
            //  ---- THE FIRE'S TARGET IS THE PIT, DERIVED (items 1 and 2) ----------------
            //
            //  Was `fireTapRadius + 1.5` = 3.1 m against a pit drawn at 0.75 — the pond's own
            //  shape one object over, and the direct cause of item 2: a hold on open ground
            //  near a camp resolved to the fire, so sleep-rough and build-shelter-here were
            //  unreachable anywhere a survivor would actually want them. `isAtFirePoint` is
            //  the same answer the arrival check uses, so the two cannot drift apart.
            if (isAtFirePoint(s, point.x, point.z)) candidates.push({ kind: 'fire', d });
        }
        {
            const d = distance(point.x, point.z, POND.x, POND.y);
            //  ---- THE TAP TARGET IS THE WATER, DERIVED (item 1, third report) ----------
            //
            //  The previous pass narrowed this to `POND.radius` and it was still too wide,
            //  for the same reason the drink gate was: the drawn water is the disc INTERSECTED
            //  with the ground below its surface plane, and roughly the outer half of the disc
            //  on the island side is buried hillside. `isOnPondWater` reads the same geometry
            //  the renderer does, so a tap can no longer pick water that is not drawn.
            if (isOnPondWater(point.x, point.z)) candidates.push({ kind: 'pond', d });
        }
        if (s.shelter.built) {
            const d = distance(point.x, point.z, s.shelter.x, s.shelter.y);
            if (d <= TUNE.shelterCollisionRadius + 1.5) candidates.push({ kind: 'shelter', d });
        }
        if (s.storage.built) {
            const d = distance(point.x, point.z, s.storage.x, s.storage.y);
            if (d <= TUNE.storageCollisionRadius + 1.5) candidates.push({ kind: 'storage', d });
        }
        //  item 2 — the mat and the bench, at last addressable. Same slack the shelter and the
        //  crate get, measured from the surface's own site.
        if (s.construction) {
            const d = distance(point.x, point.z, s.construction.x, s.construction.y);
            if (d <= TUNE.shelterCollisionRadius + 1.5) candidates.push({ kind: 'construction', d });
        }
        if (s.workspace.built) {
            const d = distance(point.x, point.z, s.workspace.x, s.workspace.y);
            if (d <= TUNE.workspaceReachM) candidates.push({ kind: 'workspace', d });
        }
        if (s.raft.built) {
            const d = distance(point.x, point.z, s.raft.x, s.raft.y);
            if (d <= TUNE.raftTapRadiusM) candidates.push({ kind: 'raft', d });
        }
        //  P0-3 — every stack on the ground, nearest wins like everything else here. A tight
        //  radius on purpose: a pile is a small thing at your feet, and a generous one would
        //  let an abandoned bundle swallow taps meant for the sand around it.
        for (const d of s.dropped) {
            const dist = distance(point.x, point.z, d.x, d.y);
            if (dist <= TUNE.droppedTapRadiusM) candidates.push({ kind: 'dropped', d: dist });
        }
        {
            //  WAVE 1 — always a candidate, like the boat: it has been on this beach since
            //  before the survivor washed up, and cannot be built or absent. Its point moves
            //  as it is dragged, which `outboardPosition` already accounts for.
            const pos = outboardPosition(s);
            const d = distance(point.x, point.z, pos.x, pos.y);
            if (d <= TUNE.outboardTapRadiusM) candidates.push({ kind: 'outboard', d });
        }
        //  WAVE 1 — every find on the tideline, nearest wins, the same shape `dropped` uses
        //  just above.
        for (const it of s.shore.items) {
            const dist = distance(point.x, point.z, it.x, it.y);
            if (dist <= TUNE.shoreItemTapRadiusM) candidates.push({ kind: 'shoreitem', d: dist });
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
        //  RETIRED BY THE SLATE MERGE — AND NOW REPLACED (RULING, C1), rather than left
        //  permanently silent. The reasoning above stayed right about WHERE mattering; it is
        //  ALSO right that a menu invented for one specific WHAT (the old site card, which
        //  could only ever offer whatever the pile in hand happened to make) was the wrong
        //  shape. This is not that card: it is the SAME universal circle every other hold-to-
        //  act target already uses, offered on a PLAIN POINT of ground instead of an object,
        //  extensible the same way every other target's own verb list already is — "Sleep
        //  rough" and "Build a shelter" today, whatever else genuinely belongs here later,
        //  without a second mechanism.
        //
        //  A TAP ON OPEN GROUND STILL DOES NOTHING ([[D-162]], untouched) — that ruling was
        //  about the TAP, this is about the HOLD, and the two gestures keep the meaning
        //  Slice 2's Default-Verb Law gave them: a tap acts (or here, still just looks), a
        //  hold asks. Reachability is the same walk-then-arrive every other hold target uses:
        //  the point becomes `this.pending`, the frame loop walks the survivor to it, and
        //  `actOnArrival` opens the circle exactly as it would for an object.
        void s;
        this.pending = { kind: 'ground', x: point.x, y: point.z };
        this.pendingWasHold = true;
        this.cues.play(CUES.target);
        runtime.holdTrace.push(`ground:${point.x.toFixed(1)},${point.z.toFixed(1)}`);
    }


    //  `onBuildShelter` / `onBuildStorage` REMOVED ([[D-166]]). They placed a structure
    //  `shelterBuildOffsetM` ahead of whichever way the survivor happened to be facing —
    //  precisely the "it could not say WHERE" defect the slate merge fixed. Both structures
    //  are sited by the tap that picks their spot now; see `placeFromSlate` below.

    /**
     * SHOW WHERE IT WOULD GO, AND WHETHER IT MAY — the ghost, restored with the siting flow.
     *
     * Defaults to the ground just ahead of the survivor, which is where a tap on "here" lands;
     * takes an explicit point when a tap has already chosen one and been refused. The colour is
     * `previewAt`'s real verdict, so a green ghost cannot promise a spot the world will reject.
     */
    private showSitingGhost(recipeId: string, atX?: number, atZ?: number): void {
        const s = session().state;
        //  EACH STRUCTURE'S OWN OFFSET. Both are 2.2 m today, so this is not a live defect —
        //  it is a trap: retuning one would silently move the other's preview, and a ghost
        //  drawn at the wrong distance is a preview that lies about where the thing goes.
        const ahead = recipeId === 'storage' ? TUNE.storageBuildOffsetM : TUNE.shelterBuildOffsetM;
        const x = atX ?? s.player.x + Math.sin(this.facing) * ahead;
        const z = atZ ?? s.player.y + Math.cos(this.facing) * ahead;
        const radius = recipeId === 'storage' ? TUNE.storageCollisionRadius : TUNE.shelterCollisionRadius;
        const clear = this.island.resolveCollision(x, z, radius, this.dynamicObstacles());
        const settled = settleOnTerrain(clear.x, clear.z, (px, pz) => this.island.heightAt(px, pz));
        const preview = previewAt(s, clear.x, clear.z, (px, pz) => this.island.heightAt(px, pz), null);
        this.ghost.show(settled.x, settled.y, settled.groundY, preview.valid);
    }

    /**
     * COMMIT A SLATE CHOICE AT A PLACE — the merge point, and deliberately thin.
     *
     * The materials are spent by `makeChosen` exactly as they are for every other outcome, and
     * the structure goes up through `placeAtSite`, which is the same function the retired site
     * card called. Nothing about placement is re-implemented here: this is a join, not a second
     * system, which is what keeps "one path that spends materials, one that decides a grade"
     * true after the merge.
     *
     * ORDER MATTERS AND IS DELIBERATE. The world's veto is asked FIRST, through a dry run of
     * the same geometry `placeAtSite` uses, because spending the wood and then discovering the
     * ground refuses is the exact "robbed by a silent rule" shape the raft's site blocker exists
     * to prevent. A refusal here costs nothing and leaves the choice re-armed.
     */
    private placeFromSlate(recipeId: string, materials: string[], storageOpen: boolean, x: number, z: number): void {
        const s = session().state;
        const radius = recipeId === 'storage' ? TUNE.storageCollisionRadius : TUNE.shelterCollisionRadius;
        const clear = this.island.resolveCollision(x, z, radius, this.dynamicObstacles());
        const preview = previewAt(s, clear.x, clear.z, (px, pz) => this.island.heightAt(px, pz), null);
        if (!preview.valid) {
            //  Re-armed, not cancelled: the survivor still means to build it, they just picked
            //  a bad spot, and making them walk back through the pack for that would be a
            //  punishment for aiming.
            this.siting = { recipeId, materials, storageOpen };
            this.explain(preview.reason ?? 'That will not go up here.');
            return;
        }
        //  CHARGED ONCE, AND BY THE BUILDER. The first cut called `makeChosen` here as well,
        //  and a device check caught it inside one run: a crate costs 5 wood and the survivor
        //  paid 6 — one per staged material for the "invention", then the recipe cost for the
        //  build. That is a surcharge for using the new surface, and on a SECOND crate, whose
        //  plan is already held, it is a surcharge for nothing at all. Combine only ever offers
        //  outcomes the survivor has already demonstrated, so there is no invention to pay for:
        //  the build IS the act, and `buildStorage`/`buildShelter` already price it.
        //
        //  ...AND THE BOX HAS TO BE EMPTIED INTO THE HANDS FIRST, because those two builders
        //  read `state.inventory` and nothing else. Teaching them a second source would mean
        //  teaching every future builder the same thing; moving the material is one line here
        //  and is what a person does anyway.
        //  ---- RAISE THE FRAME, WHOLE OR PART-WAY (item 3) ------------------------------
        //
        //  There is no materials refusal on this path any more, and therefore no re-arm and no
        //  lock: `beginConstruction` accepts whatever the survivor has and puts a frame down.
        //  D-184's cancel-not-re-arm survives only for the BAD SPOT branch above, where it was
        //  always the right reading — the survivor is about to aim again.
        //
        //  A FULLY-STOCKED SURVIVOR STILL GETS A FINISHED THING IN ONE TAP. Making everyone
        //  raise a frame and then walk back to finish it would tax the common path to serve the
        //  rare one, so the site is begun and immediately completed when it is already fed —
        //  same gesture, same result, and the incremental path costs nothing to anyone not on it.
        //  THE WHOLE-BUILD PATH, UNCHANGED, for everything not in the incremental set. The
        //  first cut sent the crate down the frame path and it could never be finished.
        if (!isIncremental(recipeId)) {
            for (const { kind, amount } of recipeCost(recipeId)) {
                if (!drawIntoHands(s, kind, amount, storageOpen)) {
                    this.siting = null;
                    this.ghost.hide();
                    this.explain(placementBlocker(s, recipeId, storageOpen) ?? 'You do not have enough for that yet.');
                    return;
                }
            }
            this.placeAtSite(recipeId, clear.x, clear.z);
            return;
        }
        if (!beginConstruction(s, recipeId, clear.x, clear.z, storageOpen)) {
            this.siting = null;
            this.ghost.hide();
            this.explain(beginBlocker(s, recipeId, storageOpen) ?? 'That cannot be raised here.');
            return;
        }
        const site = s.construction!;
        if (siteIsComplete(site) && completeShelterFromSite(s)) {
            this.cues.play(CUES.craft);
            this.floatText('the shelter stands');
            this.showHint('It will hold the weather off. Sleep here when you need to.');
            session().persist(now());
            this.lastActivityAt = now();
            return;
        }
        //  ...otherwise a HALF-BUILT thing stands, honestly, and says what it still wants.
        this.cues.play(CUES.craft);
        this.floatText('a frame goes up');
        this.showHint(`${siteShortfallNote(site) ?? 'It is ready to finish.'} Come back and add more when you have it.`);
        session().persist(now());
        this.lastActivityAt = now();
        return;
        this.placeAtSite(recipeId, clear.x, clear.z);
    }

    /**
     * Place the anchor and build. Refuses loudly if the world's own geometry says no.
     *
     * PER OUTCOME, NEVER A BINARY. This was `outcome === 'storage' ? crate : shelter` in three
     * separate places — a shape that silently made "not the crate" mean "the shelter", so the
     * first placed outcome added after it would have been built as a shelter, floated the
     * shelter's own text and told the survivor to sleep in it. `workmat` is that third
     * outcome. Written as a lookup keyed by the outcome itself so a fourth cannot inherit a
     * third's behaviour by falling off the end of a ternary — the same "which one is knowable,
     * so it is asked about" rule the harness states for its own per-outcome checks.
     */
    private placeAtSite(outcome: string, x: number, z: number): void {
        const s = session().state;
        const sited: Record<string, {
            radius: number;
            build: (x: number, z: number) => boolean;
            float: string;
            hint: string;
        }> = {
            storage: {
                radius: TUNE.storageCollisionRadius,
                build: (cx, cz) => buildStorage(s, cx, cz),
                float: 'the crate is set',
                hint: 'Tap the crate to store what you are carrying.',
            },
            shelter: {
                radius: TUNE.shelterCollisionRadius,
                build: (cx, cz) => buildShelter(s, cx, cz),
                float: 'the shelter stands',
                hint: 'Tap the shelter to sleep — it is home now.',
            },
            workmat: {
                radius: TUNE.workspaceCollisionRadius,
                build: (cx, cz) => buildWorkmat(s, cx, cz),
                float: 'the mat is laid',
                //  NAMES THE NEXT PHYSICAL STEP, never the capability it will carry. Law 219:
                //  a bench opens operations, never recipes — so the hint points at timber and
                //  a hammer, not at "this will let you make an axe".
                hint: 'A dry, flat place to work. Frame it with timber and a hammer to make a bench of it.',
            },
        };
        const plan = sited[outcome];
        if (!plan) { this.explain('That will not go up here.'); return; }
        //  The world gets its own veto, separate from the brain's spacing rule: the brain
        //  knows what stands where, the body knows what the mesh is actually on top of.
        const clear = this.island.resolveCollision(x, z, plan.radius, this.dynamicObstacles());
        if (!plan.build(clear.x, clear.z)) { this.explain('That will not go up here.'); return; }
        this.cues.play(CUES.craft);
        this.floatText(plan.float);
        session().persist(now());
        this.lastActivityAt = now();
        this.showHint(plan.hint);
    }

    private onTap(screenX: number, screenY: number): void {
        //  A fresh tap is a tap until proven otherwise — clearing this here means a hold's
        //  flag can never be inherited by the next ordinary tap.
        this.pendingWasHold = false;
        //  SITING OUTRANKS EVERYTHING. A survivor who has just said "a crate, here" means the
        //  next tap as a PLACE, not as a target — and letting a tree or the pond win it would
        //  swallow the gesture and leave the siting armed with no sign of why.
        if (this.siting && !runtime.panelOpen) {
            const at = this.pickHitPoint(screenX, screenY);
            if (!at) { this.explain('Not there — pick a spot on the ground.'); return; }
            const armed = this.siting;
            this.siting = null;
            this.recordTap(screenX, screenY, `site:${armed.recipeId}`);
            this.placeFromSlate(armed.recipeId, armed.materials, armed.storageOpen, at.x, at.z);
            //  The ghost outlives a REFUSAL, because `placeFromSlate` re-arms the siting and the
            //  survivor is about to aim again — a preview that vanished on the one tap that needed
            //  it would be the worst possible moment to lose it. It clears once something stands.
            if (this.siting) this.showSitingGhost(armed.recipeId, at.x, at.z);
            else this.ghost.hide();
            return;
        }
        //  item 2 — A MOVE OUTRANKS EVERYTHING, for exactly the reason a siting does: a
        //  survivor who has just said "that crate, over there" means the next tap as a PLACE.
        //  Checked AFTER `siting` so the two can never both consume one tap.
        if (this.moving && !runtime.panelOpen) {
            const at = this.pickHitPoint(screenX, screenY);
            if (!at) { this.explain('Not there — pick a spot on the ground.'); return; }
            const armed = this.moving;
            this.recordTap(screenX, screenY, `move:${armed.kind}`);
            this.commitMove(armed.kind, at.x, at.z);
            return;
        }
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
            //  Reaching for something on the bottom IS the dive. Committed here, at the tap,
            //  rather than on arrival — the air should start counting when the survivor
            //  decides to go down, not when they get there.
            submergeForNode(session().state, node.node.id);
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
            //  P0-3 — WHICH stack, captured at the tap. `worldCandidateAt` answers "what kind of
            //  thing is there"; for a pile that is not enough, because two piles a metre apart
            //  are two different targets. The same shape `boar` and `node` already use.
            if (winner === 'dropped') {
                const s2 = session().state;
                const nearest = s2.dropped
                    .map((d) => ({ d, dist: distance(point.x, point.z, d.x, d.y) }))
                    .sort((a, b) => a.dist - b.dist)[0];
                if (!nearest) { this.clearPending(); return; }
                this.pending = { kind: 'dropped', id: nearest.d.id };
                this.cues.play(CUES.target);
                this.recordTap(screenX, screenY, winner);
                return;
            }
            //  WAVE 1 — WHICH find, captured at the tap. Same shape as `dropped` just above,
            //  for the same reason: two finds a metre apart are two different targets.
            if (winner === 'shoreitem') {
                const s2 = session().state;
                const nearest = s2.shore.items
                    .map((it) => ({ it, dist: distance(point.x, point.z, it.x, it.y) }))
                    .sort((a, b) => a.dist - b.dist)[0];
                if (!nearest) { this.clearPending(); return; }
                this.pending = { kind: 'shoreitem', id: nearest.it.id };
                this.cues.play(CUES.target);
                this.recordTap(screenX, screenY, winner);
                return;
            }
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

        //  EMPTY GROUND — P0-1, AND THE ONE OUTCOME IN THIS METHOD THAT SAID NOTHING.
        //
        //  This comment has always read "just look there", and nothing ever looked anywhere.
        //  Every other branch above acts, plays a cue, or explains itself; this one called
        //  `clearPending()` — which sets two fields and cancels a hold — and returned. No cue,
        //  no hint, no visible change, and no telemetry: `markFailedTap` is only reachable from
        //  `explain()`, so bare-ground taps were not in `failedInteractionTaps` either.
        //
        //  That is the Director's opening signature exactly. A new survivor's first taps land on
        //  sand — there is nothing else within reach of the landing beach — and the game answered
        //  eight of them with absolute silence while the counter read zero. It reads as a dead
        //  game, and it is a [[D-042]] breach hiding in the one branch nobody thought of as an
        //  interaction: silence is never a legal outcome, and "never mind" is still an outcome.
        //
        //  ...AND THE DIRECTOR OVERRULED THE ANSWER, WHICH IS WHY THE ARGUMENT ABOVE IS KEPT
        //  RATHER THAN DELETED. The reasoning stands on its own terms and was still wrong for
        //  this game: a turn and a chime on EVERY tap that hits nothing is the whole beach
        //  answering back, and a survivor's aimless taps are most of the early game. Feedback
        //  that fires on the null case is not feedback, it is noise with a rationale — and the
        //  §I.18 rule 7 defence only ever established that the cue had a visible mirror, never
        //  that either belonged here at all. Reverted by standing ruling: a tap on nothing does
        //  NOTHING. No turn, no sound, no visible change.
        //
        //  THE COUNTING STAYS, and that half was never in dispute. `markGroundTap` and the
        //  `empty-ground` breadcrumb are how the miss rate is known at all — the number whose
        //  absence cost three sessions of guessing — and they are silent by construction. Being
        //  measured is not the same as being answered, and it is only the answer that goes.
        this.clearPending();
        session().markGroundTap();
        this.recordTap(screenX, screenY, 'empty-ground');
    }

    /**
     * Turn the body to look at a world point.
     *
     * Kept though its only caller is gone: `onBuildFire` and `onBuildShelter` place by
     * `this.facing`, so aiming by looking is a real affordance this game may want back on a
     * DELIBERATE gesture. What the ruling forbids is spending it on the null case.
     */
    // @ts-expect-error -- retained affordance, currently uncalled by ruling (see above).
    private faceToward(x: number, z: number): void {
        const s = session().state;
        const dx = x - s.player.x;
        const dz = z - s.player.y;
        if (Math.hypot(dx, dz) < 0.05) return;
        this.facing = Math.atan2(dx, dz);
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
            case 'fill-vessel': this.doFillVessel(); break;
            case 'boil-water': this.doBoil(); break;
            case 'move-structure': this.doArmMove(); break;
            case 'add-materials': this.doAddToSite(); break;
            case 'inspect-boat': this.doInspectBoat(); break;
            case 'survey-hull': this.doSurveyHull(); break;
            case 'shore-up-boat': this.doShoreUpBoat(); break;
            case 'dewater-boat': this.doDewaterBoat(); break;
            case 'repair-frames': this.doRepairFrames(); break;
            case 'seal-seams': this.doSealSeams(); break;
            case 'float-test': this.doFloatTest(); break;
            case 'board-boat': this.doBoardBoat(); break;
            case 'ferry-boat': this.doFerryBoat(); break;
            case 'cross-boat': this.doCrossBoat(); break;
            case 'moor-boat': this.doMoorBoat(); break;
            case 'make-cup': this.doMakeShellCup(); break;
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
            case 'cook-meat': this.doCookMeat(); break;
            //  ---- FISHING — three methods, five verbs, one dispatcher ----
            case 'cast-line': this.doCastLine(); break;
            case 'reel-in': this.doReelIn(); break;
            case 'set-net': this.doSetNet(); break;
            case 'haul-net': this.doHaulNet(); break;
            case 'spear-fish': this.doSpearFish(); break;
            case 'store-journal': this.doSetJournalCarried(false); break;
            case 'take-journal': this.doSetJournalCarried(true); break;
            //  ---- WAVE 1 — THE OUTBOARD AND THE SHORE, one dispatcher, seven+one verbs ----
            case 'drag-outboard': this.doDragOutboard(); break;
            case 'study-outboard': this.doStudyOutboard(); break;
            case 'strip-outboard': this.doStripOutboard(); break;
            case 'axe-outboard': this.doAxeOutboard(); break;
            case 'reassemble-outboard': this.doReassembleOutboard(); break;
            case 'diagnose-outboard': this.doDiagnoseOutboard(); break;
            case 'repair-outboard': this.doRepairOutboard(); break;
            case 'pick-up-shore': this.doPickUpShoreItem(); break;
            //  ---- RULING (C1) — GROUND-HOLD: an extensible list, two entries today ----
            case 'sleep-rough-here': this.trySleep(); break;
            case 'build-shelter-here': this.doOpenBuildShelter(); break;
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
            if (!view) return null;
            //  FISHING — a spot is a PLACE, and it is still there when the fish are not. Every
            //  other kind is an object that is GONE once worked, and walking to where a tree
            //  used to be is not an interaction; walking to water that has been fished out
            //  is, because the survivor needs to be told why nothing is happening.
            //
            //  Found on device: without this, a tap on a spent site was dropped HERE, one
            //  layer above the fail-loud branch in `actOnArrival` that exists to speak for it.
            //  The branch was unreachable and its own comment said it was not.
            if (view.node.kind === 'fishingspot') return { x: view.node.x, z: view.node.y };
            return view.node.available ? { x: view.node.x, z: view.node.y } : null;
        }
        //  SESSION 3 — she is never absent, but she is no longer fixed: a crossing leaves
        //  her standing off a destination until she is brought home. The comment this
        //  replaces said "she does not move and she is never absent, so her point is a
        //  constant" — true for four sessions and made false by the crossing.
        if (this.pending.kind === 'boat') {
            const at = boatPosition(session().state);
            return { x: at.x, z: at.y };
        }
        //  DROP 3B(i) — the site does not move, and is only ever a target while it is there.
        if (this.pending.kind === 'crash') return { x: CRASH_SITE.x, z: CRASH_SITE.y };

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
        if (this.pending.kind === 'construction') {
            const c = session().state.construction;
            return c ? { x: c.x, z: c.y } : null;
        }
        if (this.pending.kind === 'workspace') {
            const w = session().state.workspace;
            return w.built ? { x: w.x, z: w.y } : null;
        }
        if (this.pending.kind === 'trace') {
            const t = traceById(this.pending.id);
            return t ? { x: t.x, z: t.y } : null;
        }
        if (this.pending.kind === 'raft') {
            const rf = session().state.raft;
            return rf.built ? { x: rf.x, z: rf.y } : null;
        }
        if (this.pending.kind === 'dropped') {
            const d = session().state.dropped.find((it) => it.id === (this.pending as { id: string }).id);
            return d ? { x: d.x, z: d.y } : null;
        }
        //  WAVE 1 — the outboard moves as it is dragged, so its point is read fresh every
        //  time rather than captured at the tap, the same reasoning the boar's point uses.
        //  Always present once washed up (never "unbuilt"), the same shape the boat has.
        if (this.pending.kind === 'outboard') {
            const pos = outboardPosition(session().state);
            return { x: pos.x, z: pos.y };
        }
        if (this.pending.kind === 'shoreitem') {
            const it = session().state.shore.items.find((x) => x.id === (this.pending as { id: string }).id);
            return it ? { x: it.x, z: it.y } : null;
        }
        //  RULING (C1) — GROUND-HOLD. Captured at the hold, never re-derived: a plain point
        //  has no world record to look up later, unlike every kind above it.
        if (this.pending.kind === 'ground') {
            return { x: this.pending.x, z: this.pending.y };
        }
        //  ...AND THIS DEFAULT IS WHY P0-3 SURVIVED A FIX. Every branch above names its kind;
        //  anything unlisted fell through to the POND, so a tap on a dropped pile walked the
        //  survivor to the water and did nothing when they got there. Silent mis-routing of a
        //  target nobody remembered to wire is the exact class D-042's fail-loud law exists
        //  for — so the pond is now named, and an unwired kind returns null and is refused out
        //  loud instead of taking a walk.
        if (this.pending.kind === 'pond') return { x: POND.x, z: POND.y }; // aim at the centre; the reach check uses the bank
        return null;
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
        //  ...and the fire, through the SAME helper the tap resolver used to pick it. Reading
        //  the generic `interactRadiusM` here while targeting used its own number is precisely
        //  how the pond's gate and target disagreed for three reports.
        if (this.pending.kind === 'fire') return isAtFire(s);
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

        //  THE BOAT’S OWN TAP BRANCH STOOD HERE and is gone with it. It ran `doInspectBoat`
        //  on a tap because looking at her was the only thing to want from her, which was true
        //  for exactly as long as B0 was the whole drop. SESSION 2 gives her ten verbs and she
        //  joins the shared circle path below; the comment is kept only to say that the
        //  precedent the `crash` block cites next is a precedent the boat no longer sets.
        //  ---- DROP 3B(i): THE APPOINTMENT. Working it IS the verb ----
        //
        //  A tap does it, for the same reason the trace and the boat do: there is exactly one
        //  thing to want from a burning aeroplane in a forest, and the Default-Verb Law's
        //  simplest case is a target with one option.
        if (this.pending.kind === 'crash') {
            this.pending = null;
            this.doWorkCrashSite();
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
        //  THE BOAR'S BESPOKE BRANCH IS GONE, and its own comment is why it had to.
        //
        //  It read: "Through the SAME circle machinery as everything else — a predator does not
        //  get a bespoke input path, because a bespoke path is where the Default-Verb Law
        //  quietly stops applying." It then called `defaultVerb` and `performVerb` directly and
        //  never mentioned `holdOpensCircle` or `showVerbCircle` at all. `boarVerbs` carries
        //  exactly one verb, so a hold on a boar always thrust, and no code path existed that
        //  could have shown it a circle — the comment described the intent and the code did the
        //  opposite, which is the most expensive kind of comment there is.
        //
        //  So the branch is deleted rather than repaired, and `boar` joins the shared list
        //  below. That is the difference between claiming one mechanism and having one.

        if (this.pending.kind === 'pond' || this.pending.kind === 'shelter'
            || this.pending.kind === 'storage' || this.pending.kind === 'fire'
            //  The boar, by the same reasoning the stack below was folded in on: a predator
            //  taking the shared path is what makes "a hold always asks" a property of the
            //  game rather than a property of six branches that happen to agree.
            || this.pending.kind === 'boar'
            //  P0-3 — the same branch, deliberately, rather than a bespoke one: a stack gets
            //  the Default-Verb Law and the hold-asks/tap-acts contract for free, which is
            //  exactly what a private path for it would have quietly opted out of.
            || this.pending.kind === 'dropped'
            || this.pending.kind === 'raft'
            //  WAVE 1 — the outboard and a shore find, the same shared path rather than a
            //  ninth and tenth bespoke branch: this is the exact defect class the boar's own
            //  comment above warns about, paid down once instead of re-introduced twice.
            || this.pending.kind === 'outboard'
            || this.pending.kind === 'shoreitem'
            //  RULING (C1) — ground-hold joins the same shared path, the same reasoning: a
            //  plain point is not a special enough thing to earn its own dispatch branch.
            || this.pending.kind === 'ground'
            //  item 2 — and the work surface, on the SAME shared path. Giving it a bespoke
            //  branch is how the boar ended up with no circle; this comment block exists to
            //  say that out loud, so the eleventh target does not repeat the ninth's mistake.
            || this.pending.kind === 'workspace'
            || this.pending.kind === 'construction'
            //  SESSION 2 — the boat joins the shared path. She had her own tap branch running
            //  one verb, which was right while inspecting was the only thing to want from her.
            //  B0-B2 gives her ten, and this is the comment above made good on.
            || this.pending.kind === 'boat') {
            const target = this.pending.kind;
            //  Read BEFORE `this.pending` is cleared below — see `circlePoint`.
            const groundPoint = this.pending.kind === 'ground'
                ? { x: this.pending.x, y: this.pending.y }
                : null;
            //  THE DEFAULT-VERB LAW (C1). A HOLD asks; a TAP acts. `pendingWasHold` carries
            //  which gesture set this intention, so arriving after a hold opens the circle and
            //  arriving after a tap never does. A tap opens it only in the narrow case where
            //  the default is blocked and more than one alternative is left — there the game
            //  genuinely cannot know what was wanted, and guessing would be worse than asking.
            if (this.pendingWasHold ? holdOpensCircle(s, target) : tapOpensCircle(s, target)) {
                const at = this.lastTapPoint ?? { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 };
                this.pending = null;
                //  CAPTURED BEFORE THE PENDING IS GONE — see `circleTarget`. Cleared on close
                //  as well as on choose, so a dismissed wheel cannot leave a stale answer for
                //  the next verb that asks.
                this.circleTarget = target;
                this.circlePoint = groundPoint;
                this.beginPanel();
                showVerbCircle(this.overlay, verbsFor(s, target), at.x, at.y,
                    (id: string) => { this.endPanel(); this.performVerb(id); this.circleTarget = null; this.circlePoint = null; },
                    () => { this.endPanel(); this.circleTarget = null; this.circlePoint = null; });
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

        //  ---- FISHING — a spot is a node, but it is not a thing you pick up ----
        //
        //  It has to be handled BEFORE the `available` guard below, and that ordering is the
        //  whole point: that guard drops a pending on an unavailable node SILENTLY, which is
        //  correct for a felled tree (it is gone, there is nothing to say) and exactly wrong
        //  for fished-out water (it is still there, and the survivor needs to know why
        //  nothing happened). Falling through would have been [[D-042]]'s silent-tap defect,
        //  reintroduced by the one node kind that outlives its own depletion.
        if (this.pending.kind === 'node') {
            const spot = this.nodes.find(this.pending.id);
            if (spot?.node.kind === 'fishingspot') {
                const at = this.lastTapPoint ?? { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 };
                this.pending = null;
                if (this.pendingWasHold ? holdOpensCircle(s, 'fishingspot') : tapOpensCircle(s, 'fishingspot')) {
                    this.beginPanel();
                    showVerbCircle(this.overlay, verbsFor(s, 'fishingspot'), at.x, at.y,
                        (id: string) => { this.endPanel(); this.performVerb(id); },
                        () => this.endPanel());
                    return;
                }
                const only = defaultVerb(s, 'fishingspot');
                if (only) this.performVerb(only.id);
                else this.explain(verbsFor(s, 'fishingspot').find((v) => v.reason)?.reason ?? 'Nothing to do there.');
                return;
            }
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
        //  STALE MESSAGE CORRECTED (found while wiring ground-hold's own "Sleep rough",
        //  RULING C1): this named a shelter-distance refusal `canSleep` has not enforced
        //  since sleep left the Build panel — reachable from Vitals, and now from open
        //  ground too, with nothing built. A null report here is some OTHER internal
        //  refusal, not a walk the player needs to make.
        if (!report) { this.explain('You cannot settle down right now.'); return; }
        this.cues.stopAllBeds();
        this.openReport(report);
    }

    /**
     * ITEM 2 (this batch) — "BUILD A SHELTER" FROM GROUND-HOLD MUST EXPLAIN ITSELF.
     *
     * WHICH CASE THE DIRECTOR'S REPORT ACTUALLY WAS, traced rather than assumed. The OLD
     * code (`this.selectedKnownRecipe = 'shelter'; this.openLoadout(...)`) was blind to
     * whether shelter was known at all — it redirected identically either way, silently,
     * every time. So "materials collected, held ground, chose build shelter, got redirected
     * with no explanation" cannot have been the known-vs-unknown bug the brief named as the
     * alternative: there was no code path that COULD place directly regardless of knowledge
     * — item 3's own universal ruling (every recipe stages in Combine, no exceptions, no
     * matter how well earned) means redirecting rather than placing is CORRECT here, always,
     * by design. The one real bug was the silence itself, and this fixes exactly that.
     *
     * TWO OUTCOMES, NAMED BEFORE ANYTHING OPENS (Law 26 — the world tells you first):
     *
     *   NOTHING TO STAGE — missing at least one of wood/stone/fibre entirely, so the pack
     *   would open onto a chip row that cannot even NAME shelter (`combineSlate` matches by
     *   KIND, not amount — one unit of each is enough to see it named, zero of any one is
     *   not). Refused here, explained, and the pack never opens on an empty promise.
     *
     *   SOMETHING TO STAGE — holding at least one of each, whether or not the FULL cost is
     *   met yet (that shortfall shows once staged, same as any other recipe — RULING 1's
     *   surviving half). The pack opens, and a spoken hint says what for, so arriving there
     *   reads as a continuation of the tap that got you here, not an unexplained bounce.
     */
    /**
     * "BUILD A SHELTER" NOW BUILDS A SHELTER (item 3, and the pending redirect item).
     *
     * IT USED TO OPEN THE PACK. A survivor held the ground, chose the verb that says *Build a
     * shelter*, and got the Backpack and an instruction to go and combine three things — a
     * verb that named an act and then performed navigation. Under the old economy there was
     * some excuse for it: you could not start without all eight wood, so the honest answer
     * really was "go and assemble it". The incremental economy removes that excuse entirely.
     * The verb now raises a frame on the spot the survivor picked, out of whatever they are
     * carrying, and that frame is fed on later visits.
     *
     * It also stops demanding all three kinds up front — `beginBlocker` asks for one of
     * anything, which is the new rule and is checked in the one place that owns it.
     */
    private doOpenBuildShelter(): void {
        const s = session().state;
        if (s.shelter.built) { this.explain('You already have a shelter. Move it if you want it elsewhere.'); return; }
        const blocked = beginBlocker(s, 'shelter');
        if (blocked) { this.explain(blocked); return; }
        //  THE GROUND-HOLD'S OWN POINT, not the survivor's feet: they held a spot because they
        //  meant that spot. Falling back to where they stand keeps the verb working if it is
        //  ever reached from a target that carries no point of its own.
        const at = this.circlePoint ?? { x: s.player.x, y: s.player.y };
        const clear = this.island.resolveCollision(at.x, at.y, TUNE.shelterCollisionRadius, this.dynamicObstacles());
        if (!siteIsViable(s, clear.x, clear.z, 'construction') || !isPlaceablePoint(clear.x, clear.z)) {
            this.explain('Too close to something already standing.');
            return;
        }
        if (!beginConstruction(s, 'shelter', clear.x, clear.z)) {
            this.explain(beginBlocker(s, 'shelter') ?? 'That cannot be raised here.');
            return;
        }
        const site = s.construction!;
        if (siteIsComplete(site) && completeShelterFromSite(s)) {
            this.cues.play(CUES.craft);
            this.floatText('the shelter stands');
            this.showHint('It will hold the weather off. Sleep here when you need to.');
        } else {
            this.cues.play(CUES.craft);
            this.floatText('a frame goes up');
            this.showHint(`${siteShortfallNote(site) ?? 'It is ready to finish.'} Come back and add more when you have it.`);
        }
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * ENTROPY & MAINTENANCE (v0.11 §8) — one wood, one NAMED PLACE, and it says which.
     *
     * The shipped action spent a wood and moved a bar, so the only feedback available was a
     * number nobody could see. It now reports the place it worked on and the state that place
     * is in AFTERWARDS — which is what turns maintenance from an upkeep tax into work a player
     * can plan, and what makes deferring it a decision rather than an oversight.
     *
     * The storage crate keeps the old behaviour untouched: it has no named places this pass,
     * and giving it invented ones would be scope blur rather than symmetry.
     */
    private tryRepair(which: RepairTarget): void {
        const s = session().state;
        if (which !== 'shelter') { this.tryRepairOLD(which); return; }

        const out = repairStructureDetailed(s, 'shelter');
        if (!out.ok) {
            //  The nearest true reason, read from the verb the circle already computes rather
            //  than re-derived here — two opinions about why an action refused is how a
            //  player gets told something the game does not believe.
            this.explain(verbsFor(s, 'shelter').find((v) => v.id === 'mend')?.reason
                ?? 'Needs wood in hand to repair.');
            return;
        }
        session().persist(now());
        this.cues.play(CUES.craft);
        if (out.mended) {
            this.floatText(`mended ${defectPlace(out.mended.id)}`);
            //  The stage AFTER the work, so a survivor learns that one wood does not always
            //  finish a job — the debt being paid down rather than erased.
            this.explain(out.mended.to === 'sound'
                ? `You put ${defectPlace(out.mended.id)} right.`
                : `${defectCue(out.mended.id, out.mended.to)} Another piece of wood would finish it.`);
        } else {
            this.floatText(`+${TUNE.repairDurabilityPerWood} durability`);
            this.say('You go over the frame and tighten what you can reach.');
        }
        this.lastActivityAt = now();
    }

    private tryRepairOLD(which: RepairTarget): void {
        const s = session().state;
        if (!repairStructure(s, which)) { this.explain('Needs wood in hand to repair.'); return; }
        this.cues.play(CUES.craft);
        this.floatText(`+${TUNE.repairDurabilityPerWood} durability`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** The disjoint-state rule (D-042 audit): carrying raw materials stores them; empty-handed
     *  withdraws a batch. Never a priority conflict, since the two states cannot both be true. */
    /** item 11 — TAKING, as its own act rather than the thing that happens when your hands
     *  are empty. The other half of the pair. */
    private tryTakeStorage(): void {
        const result = withdrawFromStorage(session().state);
        if (!result.ok) { this.explain('There is nothing in the box to take.'); return; }
        this.cues.play(CUES.pickup);
        this.floatText(this.storageMovedLabel(result.action, result.moved));
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * item 1 — THE AIMED REACH. One kind, one direction, one batch.
     *
     * RE-RENDERS INSTEAD OF CLOSING, which is the whole reason this is separate from the two
     * sweeps: a survivor at a box is usually moving several kinds, and a panel that shut on
     * every tap would make the aimed move more tedious than the blanket one it replaces.
     * `openLoadout(..., reopening = true)` is the SAME path the tab switch uses, so the panel
     * lock is never released between renders and no world tap can slip through the gap.
     */
    private tryMoveKind(kind: string, direction: 'deposit' | 'withdraw'): void {
        const result = moveOneKind(session().state, kind as MaterialKind, direction);
        if (!result.ok) {
            this.explain(direction === 'deposit' ? 'You are not carrying any of that.' : 'There is none of that in the box.');
            return;
        }
        this.cues.play(direction === 'deposit' ? CUES.collected : CUES.pickup);
        this.floatText(this.storageMovedLabel(result.action, result.moved));
        session().persist(now());
        this.lastActivityAt = now();
        this.openLoadout(true, 'inventory', true);
    }

    private tryUseStorage(): void {
        const result = depositToStorage(session().state);
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
        //  DERIVED, NOT A HARDCODED TRIPLE — and this line is why item 9's widening only
        //  half-shipped. `STORABLE_KEYS` became every carried kind last batch while these
        //  helpers kept their own `['wood','stone','fiber']`, so a survivor carrying only food
        //  was offered NO storage button at all, and a deposited berry floated an empty
        //  message. The brain's own answer is the only one consulted now.
        return storageActionsFor(s).canDeposit ? 'Store what you carry' : null;
    }

    /** item 12 — the batch, SAID OUT LOUD. It is deliberate (one reach into a crate, never a
     *  cap on the crate) and it read as a bug partly because nothing ever named it. */
    private storageTakeLabelFor(s: ReturnType<typeof session>['state']): string | null {
        return storageActionsFor(s).canWithdraw ? `Take up to ${TUNE.storageWithdrawBatch} of each` : null;
    }

    private storageMovedLabel(action: 'deposit' | 'withdraw' | null, moved: Partial<Record<string, number>>): string {
        //  EVERY KIND, from the same map the panel labels its chips with. The hardcoded
        //  three here are why storing berries floated "stored" with nothing after it.
        const parts: string[] = [];
        for (const [kind, count] of Object.entries(moved)) {
            if (count) parts.push(`${count} ${(MATERIAL_LABEL[kind] ?? kind).toLowerCase()}`);
        }
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
            if (crossed) this.floatText(`${DOMAIN_LABEL_SHORT[result.learned.domain] ?? 'skill'} sharpens`);
        }
        //  DROP 6 — THE READOUT, world first (Law 26). "Skill sharpens" says something HAPPENED
        //  and nothing about WHAT; this says what the hands actually bought, in the seconds the
        //  survivor has just felt, at the moment the work lands and before any panel is opened.
        //  Silent until the gain clears `readoutNoticeableSeconds`, so the first few swings say
        //  nothing and the one that has genuinely got easier says so.
        const workDomain = masteryDomainForNodeKind(view.node.kind);
        if (workDomain) {
            const felt = noticedAtWork(session().state, workDomain, nodeHoldSeconds(session().state, view.node));
            if (felt) { this.lastReadoutSaid = felt; this.showHint(felt); }
        }
        //  ...and a face that is SLOW ON PURPOSE says so, because a player cannot tell slow
        //  from broken. Measured: 5.5 s by hand against 3.0 s with a hammer, 2 stone a swing,
        //  never used up — so the sentence says accelerator, never requirement.
        if (view.node.kind === 'boulder') { const note = slowWorkNote(session().state); this.lastReadoutSaid = note; this.showHint(note); }
        this.floatText(this.gainLabel(result));
        this.firstPickupToast(view.node.kind);

        if (result.gained.wood) session().markFirstWood(msSinceControl());
        if (result.foundFlask) this.showHint('A water flask — fill it at the pond, carry a drink inland.');
        //  THE FIRST CRATE'S PACK. Said the moment it is found, for the same reason the flask
        //  and the receiver are: a thing that appears in a panel with no announcement is a thing
        //  the player never learns they have.
        if (result.foundBackpack) this.showHint('A canvas pack, folded at the bottom. Now you can carry properly.');
        //  DROP 5 — the set, out of the instrument housing. Said the moment it is found,
        //  because a thing that appears in a panel with no announcement is a thing the
        //  player never learns they have.
        //  P0-H — WHAT IT IS, said before what it gave. The housing is a distinct shape in the
        //  water now, which is what a survivor finds it BY; this is the confirmation that they
        //  read the wreck right, in the same place and the same way `slowWorkNote` confirms a
        //  boulder. Said on every working of it, not only the first: the five ordinary parts
        //  return null here, so this line only ever names the one thing worth naming.
        const housing = wreckPartSight(view.node.id);
        if (housing) { this.lastReadoutSaid = housing; this.showHint(housing); }
        if (result.foundReceiver) this.showHint('A receiver, out of the housing — and a cell with it. It only listens.');
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
        if (g.shell) parts.push(`+${g.shell} shell`);
        if (result.foundFlask) parts.push('+ flask');
        if (result.foundBackpack) parts.push('+ pack');
        if (result.foundReceiver) parts.push('+ receiver');
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
        //  The bluff is solid ALL ROUND, with a doorway where the mouth is — a ring of blocks
        //  rather than the single offset circle that left its sides and face walk-through.
        out.push(...this.cave.obstacles(state));
        const storageObstacle = this.storage.obstacle(state);
        if (storageObstacle) out.push(storageObstacle);
        //  SESSION 1 — the BENCH is furniture and blocks; a mat lies flat and is walked over.
        //  `WorkspaceView.obstacle` draws that line, so the tier decides solidity rather than
        //  a second copy of the rule living out here.
        const workspaceObstacle = this.workspace.obstacle(state);
        if (workspaceObstacle) out.push(workspaceObstacle);
        //  A frame is timber standing in the ground, so it blocks exactly as the shelter does.
        const frameObstacle = this.constructionView.obstacle(state);
        if (frameObstacle) out.push(frameObstacle);
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
        //  A submerged survivor is not building a fire. The primary slot carries "Surface"
        //  while under, and this is the other half of that — a label without a handler is a
        //  button that lies, which is worse than no button at all.
        if (diveStageOf(s) !== 'surfaced') { this.doSurface(); return; }
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
    /**
     * COME UP. Always available while under, and never refused — a control that can say no to
     * a drowning diver is not a control.
     */
    private doSurface(): void {
        const s = session().state;
        if (!surface(s)) return;
        session().persist(now());
        this.cues.play(CUES.pickup);
        this.say('You break the surface and breathe.');
        //  DROP 6 — what the lungs have become, said as the breath ends rather than found in
        //  a panel later. Same grammar as the hands, same silence until it is worth saying.
        const longer = noticedOnSurfacing(s);
        if (longer) { this.lastReadoutSaid = longer; this.showHint(longer); }
        this.lastActivityAt = now();
    }

    // ---- FISHING -----------------------------------------------------------
    //
    //  Five short handlers and not one of them decides anything: every rule lives in
    //  `fishing.ts`, and these spend the result on cues, float text and a sentence. The
    //  one thing the body genuinely owns is the ROLL — see `doSpearFish`.

    private doCastLine(): void {
        const s = session().state;
        if (!castHandline(s)) { this.explain(this.fishingReason('cast-line')); return; }
        session().persist(now());
        this.cues.play(CUES.target);
        this.say('The line goes out. Now you wait.');
        this.lastActivityAt = now();
    }

    private doReelIn(): void {
        if (!reelIn(session().state)) return;
        session().persist(now());
        this.explain('You draw the line back in, empty.');
        this.lastActivityAt = now();
    }

    private doSetNet(): void {
        const s = session().state;
        if (!setNet(s)) { this.explain(this.fishingReason('set-net')); return; }
        session().persist(now());
        this.cues.play(CUES.craft);
        this.say('The net is set. Leave it to soak — and stay within reach of it.');
        this.lastActivityAt = now();
    }

    private doHaulNet(): void {
        const s = session().state;
        const out = haulNet(s);
        if (out.spot === null) { this.explain(this.fishingReason('haul-net')); return; }
        session().persist(now());
        if (out.caught > 0) {
            this.cues.play(CUES.gather);
            this.floatText(`+${out.caught} fish`);
        }
        this.explain(out.caught > 0
            ? (out.spot === 'locally-depleted'
                ? 'You lift it heavy — and that is the last of them here for a while.'
                : 'You lift it heavy, and shake it out.')
            : 'You lift it. Nothing in it yet.');
        this.lastActivityAt = now();
    }

    /**
     * ONE STRIKE, and the ROLL is made HERE.
     *
     * `spearFish` takes the roll as an argument rather than calling `Math.random` itself,
     * because `reconcile` is documented as never rolling dice and a brain module that
     * quietly did would be untestable at exactly the point where variance IS the mechanic.
     * The body rolls; the brain decides. This is the only line of chance in the stage.
     */
    private doSpearFish(): void {
        const s = session().state;
        const out = spearFish(s, Math.random());
        if (!out.ok) { this.explain(this.fishingReason('spear-fish')); return; }
        session().persist(now());
        if (out.caught > 0) {
            this.cues.play(CUES.gather);
            this.floatText(`+${out.caught} fish`);
            this.explain(out.spot === 'locally-depleted'
                ? 'Clean through it — and the rest of the shoal is gone.'
                : 'Clean through it.');
        } else {
            this.cues.play(CUES.denied);
            this.explain(out.spot === 'locally-depleted'
                ? 'You miss, and the last of them scatter.'
                : 'You miss. The shoal scatters and settles.');
        }
        this.lastActivityAt = now();
    }

    /** The ONE truest reason a fishing verb refused, read from the brain's own blockers. */
    private fishingReason(verbId: string): string {
        const found = verbsFor(session().state, 'fishingspot').find((v) => v.id === verbId);
        return found?.reason ?? 'Not here.';
    }

    /**
     * DROP 4 — LOOK AT HER PROPERLY.
     *
     * Three beats, in the order a person actually experiences them: what she IS, what handling
     * her tells you, and — only once a survivor has earned it — which route taught them. The
     * middle beat comes from `boatAffordance`, so the informed and uninformed readings are the
     * brain's and this file never decides what anybody knows.
     *
     * AND IT ALWAYS ANSWERS, WHOEVER IS ASKING. There is no repair verb this drop, so a
     * survivor who came here expecting one is told so in a sentence rather than left tapping
     * at a hull that does nothing — [[D-042]]'s fail-loud law, applied to an absence that is
     * deliberate.
     *
     * THIS READ `route ?? boatWorkBlocker()`, and that was exactly backwards. The route note
     * exists only for a survivor who has come to understand the hull — so the fallback meant
     * the ONE person who now knows what she needs, and is therefore likeliest to expect a
     * repair verb, was the only person never told there isn't one. The uninformed got the
     * warning; the informed got a compliment. Both lines are said now, because they answer
     * two different questions and neither substitutes for the other.
     */
    private doInspectBoat(): void {
        const s = session().state;
        if (!atBoat(s)) { this.explain('Too far to see much. Get alongside her.'); return; }
        const seen = boatAffordance(s);
        this.cues.play(CUES.target);
        this.explain(boatSight());
        //  Properties, then questions, then where you stand with her — one line, the same
        //  shape the junk catalogue uses. The questions are the point: understanding buys
        //  better ones, never answers, and the closing beat is always that there is no work
        //  here yet.
        const route = boatUnderstandingNote(s);
        //  ---- SESSION 2 REPLACES THE CLOSING BEAT -----------------------------------
        //
        //  It used to end on `boatWorkBlocker()` — "there is no work here yet" — which was the
        //  honest sentence while B0 was the whole drop. There is work here now, so the boat
        //  says WHAT SHE IS and what she still is not (Law 124's "a successful start is not a
        //  completed repair"), plus whatever the survey has actually taught.
        this.showHint([
            ...seen.properties,
            ...seen.questions,
            ...(route ? [route] : []),
            ...surveyFindings(s),
            ...postTrialFindings(s),
            ...(s.boat.loadKnown ? [loadNote(s)] : []),
            ...ferryFindings(s),
            boatCapabilityNote(s),
        ].join('  ·  '));
        this.lastActivityAt = now();
    }

    /** SESSION 2 — the hull survey. Study before the attempt, on a boat. */
    private doSurveyHull(): void {
        const s = session().state;
        const blocked = surveyBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        surveyHull(s);
        this.cues.play(CUES.craft);
        this.floatText('you go over her');
        this.showHint(surveyFindings(s).join('  ·  '));
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** Law 125's rigging route: timber under the bilge, not strength. */
    private doShoreUpBoat(): void {
        const s = session().state;
        const blocked = shoreUpBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        shoreUpBoat(s);
        this.cues.play(CUES.craft);
        this.floatText('propped and cribbed');
        this.showHint('She sits solid now. You could work in her without her rolling on you.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doDewaterBoat(): void {
        const s = session().state;
        const blocked = dewaterBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        dewaterBoat(s);
        this.cues.play(CUES.drink);
        this.floatText('bailed dry');
        //  THE STAGE CHANGED HERE, and the survivor is told so in the boat's own words.
        this.showHint(`Floorboards clear and the bilge showing. ${boatCapabilityNote(s)}`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** HULL INTEGRITY — one of two separate systems. */
    private doRepairFrames(): void {
        const s = session().state;
        const blocked = structuralBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        const done = repairHullStructure(s);
        if (!done) { this.explain('That will not go together.'); return; }
        this.cues.play(CUES.craft);
        this.floatText('frames backed');
        //  NAMES THE QUALITY, because the hull will remember it and the float test will read
        //  it. An honest degrade is only honest if the survivor is told what they achieved.
        this.showHint(`Sistered and backed with the bracket — ${done.rung} work. ${floatForecastNote(s)}`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** WATERTIGHTNESS — the other system, deliberately its own act. */
    private doSealSeams(): void {
        const s = session().state;
        const blocked = sealBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        const done = sealHull(s);
        if (!done) { this.explain('That will not drive home.'); return; }
        this.cues.play(CUES.craft);
        this.floatText('seams payed');
        this.showHint(`Fibre teased out and driven into the garboard — ${done.rung} work. ${floatForecastNote(s)}`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * THE GATE, AND THE CELEBRATION THE SOURCE ASKS FOR.
     *
     * A FAILURE COSTS THE AFTERNOON AND NOTHING ELSE. She is on a line: a swamped hull comes
     * back up the sand with every repair still in her, and the survivor learns which of the two
     * systems let her down. That is the degrade-not-destroy rule applied to the gate itself.
     */
    private doFloatTest(): void {
        const s = session().state;
        const blocked = floatTestBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        const before = boatStage(s);
        const result = runFloatTest(s);
        if (!result) { this.explain('Not yet.'); return; }
        const after = boatStage(s);
        this.cues.play(result.wouldHold ? CUES.craft : CUES.denied);
        this.floatText(result.wouldHold ? 'SHE FLOATS' : 'she fills');
        this.showHint([
            ...postTrialFindings(s),
            after !== before ? boatCapabilityNote(s) : 'Haul her out and think again. Nothing you did is lost.',
        ].join('  ·  '));
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** B2 — getting into her, and learning what she carries by doing it. */
    private doBoardBoat(): void {
        const s = session().state;
        const blocked = boardBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        const learned = learnLoad(s);
        this.cues.play(CUES.target);
        this.floatText('aboard');
        //  AND WHAT MOVING HER WOULD COST, spoken HERE — the moment before a survivor could
        //  reach for the paddle, and the fair-challenge half of manual propulsion. The same
        //  discipline `floatForecastNote` keeps for the gate: evidence before committing.
        this.showHint([
            learned
                ? `You step in and she takes it without complaint. ${loadNote(s)}`
                : `${loadNote(s)}  ·  ${boatCapabilityNote(s)}`,
            ferryNote(s),
        ].join('  ·  '));
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * TAKE HER OUT ON THE LINE — manual propulsion, and the third thing B2 is FOR.
     *
     * The forecast is spoken BEFORE the arms are spent only in the verb label and the
     * refusal; here the trip is already committed, so what this owes is the outcome and the
     * ceiling in the same breath. She went out, she came back, and the line is why.
     */
    private doFerryBoat(): void {
        const s = session().state;
        const blocked = ferryBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        const trip = runFerry(s);
        if (!trip) { this.explain(ferryNote(s)); return; }
        this.cues.play(CUES.craft);
        this.floatText('out on the line');
        this.showHint([
            ...ferryFindings(s),
            //  THE CEILING, EVERY TIME. Law 124’s "a successful start is not a completed
            //  repair" applies hardest to the verb that feels most like leaving.
            boatCapabilityNote(s),
        ].join('  ·  '));
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * SESSION 3 — THE CROSSING. She carries you most of the way and you swim the rest.
     *
     * ATOMIC, which is the whole [[D-011]] answer: one act moves her, moves the survivor
     * with her, and charges the arms. What exists afterwards is a survivor in the water
     * beside a moored boat — two situations this game protected long before the crossing,
     * so there is no half-crossed state for an absence to spoil.
     *
     * NO TIME IS SPENT THROUGH `spendGameHours`, deliberately. The paddle’s cost is arms,
     * not hours, and it is charged in one go exactly as the line-ferry charges its own —
     * running the world forward mid-crossing is what would create the mid-state this
     * design exists to not have.
     */
    private doCrossBoat(): void {
        const s = session().state;
        const blocked = crossingBlocker(s, 'wreck');
        if (blocked) { this.explain(blocked); return; }
        const before = s.energy;
        const plan = runCrossing(s, 'wreck');
        if (!plan) { this.explain(crossingBlocker(s, 'wreck') ?? 'She will not go.'); return; }
        this.cues.play(CUES.target);
        this.floatText(plan.direction === 'out' ? 'across' : 'home');
        //  WHAT IS LEFT TO DO, said on arrival at the stand-off — the survivor is in the
        //  water now and needs to know the crossing is not over.
        if (plan.direction === 'out') {
            this.showHint(`She will go no closer. ${Math.round(plan.swim.metres)} metres of open`
                + ` water between you and ${plan.destination.label} — and she is here when you`
                + ' come back.');
        } else {
            this.showHint('Her keel is on the sand again.');
        }
        void before;
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doMoorBoat(): void {
        const s = session().state;
        const blocked = moorBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        moorBoat(s);
        this.cues.play(CUES.craft);
        this.floatText('made fast');
        this.showHint('A painter round the rock and two turns on itself. She will be here when you come back.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * DROP 3B(i) — ONE ARMFUL OFF THE SITE.
     *
     * AND IT ALWAYS ANSWERS. The three refusals — nothing has come down, too far, the forest
     * has closed over it — are three genuinely different facts, and each says which one it is.
     * [[D-042]]'s fail-loud law applied to a window that closes: a survivor who arrives a day
     * late must be TOLD they are late, not left tapping at trees.
     */
    private doWorkCrashSite(): void {
        const s = session().state;
        const gained = workCrashSite(s);
        if (!gained) { this.explain(crashBlockedReason(s) ?? 'Nothing to do there.'); return; }
        this.cues.play(CUES.pickup);
        const parts = Object.entries(gained).map(([k, n]) => `${n} ${k}`).join(', ');
        this.floatText(parts || 'nothing');
        this.showHint(s.crash.stage === 'fresh'
            ? `Still warm. ${parts}.`
            : `The forest has been at it. ${parts}.`);
        session().persist(now());
        this.lastActivityAt = now();
    }

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
        this.say(intoWater ? 'You slip into the water beside it.' : 'You step onto solid ground.');
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

    // ---- WAVE 1 — THE WEIGHTED SHORE, FIRST SLICE: the outboard's seven verbs, and the tide's one ----

    /**
     * IS THE GROUND AROUND IT ACTUALLY CLEAR? The one fact `heavyObjects.ts` cannot answer —
     * its own header names exactly why: whether the outboard's own patch of sand is clear of
     * collision geometry is a body-only question. Reuses `resolveCollision`, the same
     * primitive the placement ghost already trusts, rather than a second collision system
     * invented for one check: if the resolved point had to move, something was in the way.
     */
    private outboardWorkspaceClear(): boolean {
        const pos = outboardPosition(session().state);
        const clear = this.island.resolveCollision(pos.x, pos.y, TUNE.outboardWorkspaceClearRadiusM, this.dynamicObstacles());
        return Math.hypot(clear.x - pos.x, clear.z - pos.y) < 0.05;
    }

    /**
     * WAVE 1 — PULLED OUT TO A PROPER METHOD so `projectMeshCentre` below could share it
     * without a second copy. It was a local closure inside the scene-setup method that only
     * `runtime.projectToScreen` could see; `runtime.screenOfMesh`'s own projection had
     * ALREADY duplicated this exact guard inline rather than reach it, which is the same
     * "two copies of one rule" shape this slice's own teardown destroy-gap bug had. Returning
     * false rather than a plausible-looking pixel for anything behind the camera — a helper
     * that says "I cannot aim at that from here" instead of inventing an answer.
     */
    private isInFrontOfCamera(target: Vector3): boolean {
        const forward = this.camera.getDirection(Vector3.Forward());
        return Vector3.Dot(target.subtract(this.camera.position), forward) > 0;
    }

    /**
     * A MESH'S OWN DRAWN CENTRE, PROJECTED TO SCREEN — the one place this maths lives.
     * `runtime.screenOfMesh` (by name) and `runtime.surfaceByTag` (by metadata, for pooled
     * meshes whose name is only a pool slot) both call this, so the two witness paths can
     * never quietly diverge on how a screen point gets computed — exactly the shape of bug
     * two independent copies of the teardown ladder's destroy-gap formula produced this slice.
     */
    private projectMeshCentre(mesh: AbstractMesh): { x: number; y: number } | null {
        const centre = mesh.getBoundingInfo().boundingBox.centerWorld;
        //  Same guard `screenOfMesh` always carried: a mesh behind the camera is not at a
        //  negative pixel, it is nowhere. The spear check ran into this exact shape at y = -35.
        if (!this.isInFrontOfCamera(centre)) return null;
        const projected = Vector3.Project(
            centre,
            Matrix.Identity(),
            this.scene.getTransformMatrix(),
            this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
        );
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: rect.left + projected.x * (rect.width / this.engine.getRenderWidth()),
            y: rect.top + projected.y * (rect.height / this.engine.getRenderHeight())
        };
    }

    /** T5's one movement (Law 204). One pull per tap; `dragOutboard` is the single source of
     *  truth for whether it moves at all — the verb circle already previewed the same verdict
     *  via a zero-metre dry run, so a refusal reaching here would mean the two disagreed. */
    private doDragOutboard(): void {
        const s = session().state;
        const result = dragOutboard(s, TUNE.outboardDragMetresPerPull, s.tools.spear);
        if (!result.ok) { this.explain(result.reason ?? 'It will not move.'); return; }
        s.outboard = result.outboard;
        s.energy = Math.max(0, s.energy - result.energyCost);
        this.cues.play(CUES.gather);
        this.floatText(`dragged ${result.metresMoved.toFixed(1)} m`);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** STUDY — understanding only (Law 208), a real time cost through the same
     *  `spendGameHours` path writing and brewing already use. */
    private doStudyOutboard(): void {
        const s = session().state;
        if (s.outboard.teardown?.destroyed) { this.explain('There is nothing left to learn from the wreckage.'); return; }
        const before = s.knowledge.domains.mechanicalSystems.understanding;
        applyStudy(s);
        const gained = s.knowledge.domains.mechanicalSystems.understanding - before;
        session().spendGameHours(TUNE.studyGameHours, now());
        this.cues.play(CUES.craft);
        this.floatText(`+${gained.toFixed(0)} understanding`);
        this.explain('You work through how it must fit together, piece by piece.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * STRIP — the graded ladder itself (Law 217/221/226). `workspaceClear` is computed here,
     * live, and nowhere else: it is the one input `teardownAttempt` needs that this class is
     * the only side of the brain/body split able to answer.
     */
    private doStripOutboard(): void {
        const s = session().state;
        if (s.outboard.teardown?.destroyed) { this.explain('It is already destroyed.'); return; }
        if (s.outboard.teardown?.rung === 'expert') { this.explain('It is already stripped bare.'); return; }
        const outcome = teardownAttempt(s, this.outboardWorkspaceClear());
        applyTeardown(s, outcome);
        this.cues.play(outcome.destroyed ? CUES.fell : CUES.craft);
        if (outcome.destroyed) {
            this.floatText(`+${TUNE.outboardDestroyedScrapStone} stone (scrap)`);
            this.explain('It goes to pieces in your hands — you opened it up far too early.');
        } else {
            const gained = (Object.entries(outcome.gained) as Array<[string, number | undefined]>)
                .filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `+${n} ${k}`).join(', ');
            this.floatText(gained || teardownRungLabel(outcome.rung));
            this.explain(outcome.parts.length
                ? `${teardownRungLabel(outcome.rung)} ${outcome.parts.map(partLabel).join(', ')}, freed.`
                : teardownRungLabel(outcome.rung));
        }
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** THE AXE — deliberate destruction, always available once owned (Law 226's honest
     *  floor beneath the ladder, not a shortcut around it). */
    private doAxeOutboard(): void {
        const s = session().state;
        if (!s.tools.axe) { this.explain('You have nothing heavy enough to break it apart.'); return; }
        if (s.outboard.teardown?.destroyed) { this.explain('There is nothing left to break.'); return; }
        axeOutboard(s);
        this.cues.play(CUES.fell);
        this.floatText(`+${TUNE.outboardDestroyedScrapStone} stone (scrap)`);
        this.explain('You lay into it with the axe until it stops being a shape.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * REASSEMBLE (Law 227's repaired/manufactured route). Seeded on the game clock at the
     * moment of the act — deterministic from state, never `Math.random`/`Date.now` (D-011) —
     * the same "counter as seed" family `craftRollCount`'s own grade roll uses; this act can
     * only ever happen once per life (`canReassemble` requires it not already done), so no
     * dedicated attempt counter is needed the way a repeatable roll would need one.
     */
    private doReassembleOutboard(): void {
        const s = session().state;
        if (!canReassemble(s)) { this.explain('You have not recovered enough of it yet.'); return; }
        reassembleOutboard(s, Math.round(s.gameHoursElapsed * 1000));
        this.cues.play(CUES.craft);
        if (s.outboard.fault) {
            this.floatText('reassembled — but something is wrong');
            this.explain(s.outboard.fault);
        } else {
            this.floatText('reassembled — it runs true');
            this.explain('Eleven parts, and they go back together clean. It should run.');
        }
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** DIAGNOSE — always attemptable once there is a fault to find; credibility of the
     *  OUTCOME (Law 217) lives in `diagnoseFault`'s own understanding gate, not in whether
     *  this verb is offered at all. */
    private doDiagnoseOutboard(): void {
        const s = session().state;
        if (!s.outboard.fault) { this.explain('There is nothing wrong with it that you can find.'); return; }
        if (s.outboard.faultDiagnosed) { this.explain('You already know what is wrong with it.'); return; }
        const found = diagnoseFault(s);
        this.cues.play(found ? CUES.craft : CUES.denied);
        if (found) {
            this.floatText('diagnosed');
            this.explain(s.outboard.fault ?? 'Found it.');
        } else {
            this.explain('You cannot work out what is wrong yet. You need to understand it better.');
        }
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** REPAIR — the last step of Law 227's route; needs a diagnosis first, the credibility
     *  half of the same law. */
    private doRepairOutboard(): void {
        const s = session().state;
        if (!s.outboard.fault || !s.outboard.faultDiagnosed) {
            this.explain(!s.outboard.fault ? 'There is nothing to repair.' : 'Diagnose the fault first.');
            return;
        }
        if (!repairOutboard(s)) { this.explain('Something stops you — it is not ready.'); return; }
        this.cues.play(CUES.craft);
        this.floatText('repaired');
        this.explain('You put it right. It should run now.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * PICK UP A SHORE FIND — the generous shore's one verb (Laws 175-177). Refuses with the
     * true reason when too heavy, exactly as the verb circle already previewed; a REFUSE fate
     * yields nothing and says so rather than a hollow float (D-131's inert-object precedent).
     */
    private doPickUpShoreItem(): void {
        const s = session().state;
        const near = shoreWithinReach(s, TUNE.interactRadiusM)[0];
        if (!near) { this.explain('There is nothing here to pick up.'); return; }
        const result = pickUpShoreItem(s, near.id);
        if (!result.ok) {
            this.cues.play(CUES.denied);
            this.explain(result.reason ?? 'You cannot take that.');
            return;
        }
        this.cues.play(CUES.pickup);
        if (result.gotTool) {
            this.floatText('a working tool');
            this.explain('A real tool. This will help with heavier work.');
        } else if (near.materialKind) {
            this.floatText(`+${near.materialAmount} ${near.materialKind}`);
        } else {
            this.floatText('nothing worth keeping');
        }
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * WAVE 0 / W1 — fill the vessel a survivor MADE, beside the flask they may have found.
     */
    private doFillVessel(): void {
        const s = session().state;
        //  HOW MANY SIPS WENT IN, not just that something did. With one cup "filled" said
        //  everything there was to say; with a set of them a survivor topping up at a pond
        //  needs to know whether that tap took one sip or six.
        const filled = fillVessel(s);
        if (filled <= 0) { this.explain('There is nothing to fill, or it is already full.'); return; }
        this.cues.play(CUES.drink);
        this.floatText(`+${filled} sip${filled === 1 ? '' : 's'}`);
        this.showHint(waterNote(s) ?? '');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * WAVE 0 / W2a — THE BOIL, and the answer to "boil it with what?".
     *
     * The refusal comes from `boilRefusalFor`, which names which of the four prerequisites is
     * missing — vessel, water, fire, flame — rather than a flat "you cannot". A survivor who
     * carried a cup all the way to a dead fire is told it is the fire.
     */
    private doBoil(): void {
        const s = session().state;
        const refused = boilRefusalFor(s);
        if (refused) { this.explain(refused); return; }
        const sips = boil(s);
        session().markSipsBoiled(sips);
        this.cues.play(CUES.craft);
        this.floatText(`${sips} boiled`);
        //  WORLD FIRST, then the readout: what changed is that this water is now safe, and that
        //  is worth saying in the survivor's own terms rather than as a number in a panel.
        this.lastReadoutSaid = 'It comes to a rolling boil, and holds it. Whatever was in it is dead.';
        this.showHint(this.lastReadoutSaid);
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * item 2 — ARM A MOVE. Asks WHERE, spends nothing, and commits on the next tap.
     *
     * Deliberately the same three beats the placed-outcome siting already has — ghost, prompt,
     * confirming tap — because a survivor who has sited a shelter once already knows this
     * gesture. A second, differently-shaped relocation flow would be a new thing to learn for
     * no reason, and the director asked for the existing one to be reused.
     */
    private doArmMove(): void {
        const s = session().state;
        //  READS THE CIRCLE'S OWN TARGET, never `this.pending` — which `actOnArrival` has
        //  already nulled by the time any circle verb runs. See `circleTarget`.
        const kind = MOVABLE_FOR_PENDING[this.circleTarget ?? this.pending?.kind ?? ''] ?? null;
        if (!kind) { this.explain('There is nothing here to move.'); return; }
        const blocked = moveStructureBlocker(s, kind);
        if (blocked) { this.explain(blocked); return; }
        const site = structureSite(s, kind);
        this.pending = null;
        this.moving = { kind };
        this.cues.play(CUES.target);
        this.showHint(`${MOVE_LABEL[kind]} — tap where it should stand. Nothing is spent, and nothing inside it is lost.`);
        //  The ghost starts on its CURRENT spot, so the preview exists before the first aim
        //  rather than appearing only once the finger has already moved somewhere.
        if (site) this.showMoveGhost(kind, site.x, site.y);
    }

    /** The ghost for an armed move — `previewAt`'s real verdict, with the mover excluded. */
    private showMoveGhost(kind: MovableKind, x: number, z: number): void {
        const s = session().state;
        const clear = { x, z };
        //  EXCLUDES ITSELF. A structure is always inside its own spacing ring, so without this
        //  every move would preview red on the spot it already legally occupies.
        const viable = siteIsViable(s, clear.x, clear.z, kind) && isPlaceablePoint(clear.x, clear.z);
        const groundY = this.island.heightAt(clear.x, clear.z);
        this.ghost.show(clear.x, clear.z, groundY, viable);
    }

    /**
     * item 2 — LAND IT. One write, or a refusal that says why and leaves the move armed.
     *
     * The armed move OUTLIVES a refusal for exactly the reason the siting does: the survivor is
     * about to aim again, and losing the preview on the one tap that needed it would be the
     * worst possible moment for it to vanish.
     */
    private commitMove(kind: MovableKind, x: number, z: number): void {
        const s = session().state;
        if (!moveStructure(s, kind, x, z)) {
            const why = !siteIsViable(s, x, z, kind)
                ? 'Too close to something already standing.'
                : 'Not there — that ground will not take it.';
            this.explain(why);
            this.showMoveGhost(kind, x, z);
            return;
        }
        this.moving = null;
        this.ghost.hide();
        this.cues.play(CUES.craft);
        this.floatText(`${MOVE_LABEL[kind]} moved`);
        //  NO MESH NUDGE HERE, DELIBERATELY. Every structure view already reads its position
        //  from the brain on each frame (`shelter.update`, `storage.update`, `fire.update`,
        //  `workspace.update` all set `position` from `state`), so a move is a state write and
        //  the world redraws itself. Moving a mesh from here would create a second source of
        //  truth for where a thing stands — which is how a structure ends up drawn in one
        //  place and interacted with in another.
        session().persist(now());
        this.lastActivityAt = now();
    }

    /**
     * INCREMENTAL CONSTRUCTION — put what you carry into the frame (item 3).
     *
     * Repeatable by design and across sessions: this is the verb the whole economy rests on,
     * so it stays available every time there is something in hand the frame still wants.
     */
    private doAddToSite(): void {
        const s = session().state;
        const site = s.construction;
        if (!site) { this.explain('There is nothing half-built here.'); return; }
        const moved = contributeToSite(s);
        const kinds = Object.entries(moved);
        //  ---- THE LAST MATERIAL FINISHES IT (item 1) ---------------------------------
        //
        //  There is no separate "Finish it" any more. It used to be its own verb and its own
        //  decision, and the hint here read *"That is everything it needs. Finish it when you
        //  are ready."* — a game asking a survivor to confirm the thing they had just spent
        //  three visits making inevitable. Completion is now what the last contribution DOES.
        //
        //  CHECKED AFTER THE ADD, so the trip that fills it is the trip that finishes it; and
        //  checked even when the add moved NOTHING, so a frame that was already full — reached
        //  by any path, including one this code does not know about — still resolves on a press
        //  rather than sitting complete and inert.
        if (siteIsComplete(site) && completeShelterFromSite(s)) {
            this.cues.play(CUES.craft);
            this.floatText(kinds.length > 0
                ? `${kinds.map(([k, n]) => `${n} ${MATERIAL_LABEL[k]?.toLowerCase() ?? k}`).join(', ')} in — it stands`
                : 'the shelter stands');
            this.showHint('That was the last of it. It will hold the weather off — sleep here when you need to.');
            session().persist(now());
            this.lastActivityAt = now();
            return;
        }
        if (kinds.length === 0) {
            //  NAMES WHAT IT WANTS, never a bare "you have nothing" — the survivor has to know
            //  what to go and look for, which is the whole of Law 26 at a half-built thing.
            this.explain(siteShortfallNote(site) ?? 'It has everything it needs already.');
            return;
        }
        this.cues.play(CUES.craft);
        this.floatText(kinds.map(([k, n]) => `${n} ${MATERIAL_LABEL[k]?.toLowerCase() ?? k}`).join(', ') + ' in');
        this.showHint(siteShortfallNote(site) ?? 'It is ready.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** WAVE 0 — drink what you treated. The one water in the game that costs nothing. */
    private doDrinkClean(): void {
        const s = session().state;
        if (!drinkClean(s)) { this.explain('There is no boiled water left.'); return; }
        this.cues.play(CUES.drink);
        this.floatText('clean water');
        this.showHint(waterNote(s) ?? '');
        session().persist(now());
        this.lastActivityAt = now();
    }

    /** WAVE 0 / W1 — open a coconut into a cup. Made, never found. */
    private doMakeShellCup(): void {
        const s = session().state;
        const blocked = shellCupBlocker(s);
        if (blocked) { this.explain(blocked); return; }
        if (!makeShellCup(s)) { this.explain('That will not open cleanly.'); return; }
        this.cues.play(CUES.craft);
        //  WHICH CUP THIS IS. One cup could only ever be "a cup"; a survivor who has just
        //  turned their fourth husk into their fourth cup is being told something useful
        //  by the count, and told nothing at all without it.
        const cups = vesselCount(s);
        this.floatText(cups > 1 ? `a cup (${cups})` : 'a cup');
        //  NAMES THE NEXT MOVE, not a promise (Law 26 — the world tells you first). This
        //  read "It holds water — and it will hold a boil", which describes a capability and
        //  leaves a survivor believing the cup is ALREADY full. That is the second half of
        //  the reported defect: they walked to the fire, found Boil greyed with "there is
        //  nothing in it to boil", and read the whole sequence as a shell that vanished.
        this.showHint('Half a shell, scraped smooth — and empty. Fill it at the pond, then boil it on a fire.');
        session().persist(now());
        this.lastActivityAt = now();
    }

    private doBindWound(): void {
        const s = session().state;
        if (!bindWound(s)) { this.explain('Nothing to bind, or nothing to bind it with.'); return; }
        session().markWoundBound();
        this.cues.play(CUES.craft);
        this.floatText('bound');
        this.say('You wrap it tight. The bleeding stops.');
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

    /**
     * COOKING — an hour at the fire, down the same `spendGameHours` path writing and
     * brewing already use, because all three are "stand at the fire and do the thing".
     *
     * THE WORLD MOVES WHILE IT COOKS, and that is the cost. The fire burns down under it,
     * hunger and thirst fall, the night gets later, and the boars keep walking — so a
     * survivor who cooks at the wrong moment pays for it in the way this game always
     * charges. There is no separate fuel deduction, deliberately: the fire’s fuel is spent
     * by BURNING, and it burns during the hour like it burns during any other.
     *
     * THE RUNG IS READ BEFORE THE HOUR IS SPENT, inside `cookMeat`. Spending the hour
     * first would let the tick’s own learning change the answer the forecast promised,
     * which is the "forecast and attempt must share one arithmetic path" rule.
     */
    private doCookMeat(): void {
        const s = session().state;
        const blocker = cookBlocker(s);
        //  NAME THE ENABLER (Law 95) rather than saying "you cannot" — `cookBlocker` has
        //  already worked out which ONE thing is nearest, so this never invents a second
        //  opinion about why.
        if (blocker) { this.explain(blocker); return; }
        const rung = cookRung(s);
        const cooked = cookMeat(s);
        if (cooked <= 0) { this.explain(cookBlocker(s) ?? 'Nothing goes on the fire.'); return; }
        session().spendGameHours(TUNE.cookGameHours, now());
        this.cues.play(CUES.craft);
        this.floatText(`+${cooked} cooked`);
        //  WHAT THE HOUR BOUGHT, in the survivor’s own terms — not a rung name, which is a
        //  developer’s word. She learns she is a better cook by the meat lasting longer.
        const days = Math.round(keepingHoursFor(rung) / 24);
        const raw = Math.round(TUNE.meatSpoilGameHours / 24);
        this.explain(`It comes off the coals dark and firm. ${cooked} of it, and it should keep`
            + ` something like ${days} days now instead of ${raw}.`);
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
        //  THE SAME THREE CASES THE VERB’S OWN `reason` NAMES, in the same order, because a
        //  survivor who reaches the fire by tapping rather than by the wheel must not get a
        //  different account of why. The full-pit case was missing entirely and fell through
        //  to "no wood to add" — said to someone holding wood.
        if (!s.fire.built) { this.showHint(`Not enough wood — ${short} more for a fire.`); return; }
        if (s.inventory.wood <= 0) { this.showHint('No wood to add. Fell a tree or gather more.'); return; }
        this.showHint('It is banked as high as it will take. Let it burn down first.');
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

    //  `openBuildCard` IS GONE (ITEM 1, this batch). Its own `showBuildCard` call had been
    //  reduced, over [[D-165]]/[[D-172]]/[[D-174]], to a panel showing a hint block and a
    //  close button — every field built here (`torch`/`axe`/`storage`/`stoneHammer`/`spear`/
    //  `backpack`/`raft`/`fishingLine`/`net`, each with its own `revealedInPanel` read) was
    //  computed and handed to a template that had stopped reading any of them. `panelHints`
    //  survives — it was the one real thing left — relocated to `inventoryBody` (hud.ts) via
    //  the `hints:` field on the `showLoadout` view above. See the ledger entry for the
    //  full audit and every recipe's own confirmation that Combine already reaches it.

    // ---- Feedback --------------------------------------------------------

    /**
     * State the reason an interaction did NOT happen (D-042), and count it.
     *
     * `markFailedTap` is reachable from here and nowhere else, so this method alone defines what
     * `trace.failedInteractionTaps` means — and roughly fifteen call sites were using it to
     * announce things that had just SUCCEEDED. "You break the surface and breathe." "The net is
     * set." "You wrap it tight. The bleeding stops." Every one of those incremented the failure
     * counter, and the denied cue played over a success.
     *
     * So the Director's headline number is not what it says it is: `failedInteractionTaps: 25`
     * counts calls to this method, not taps that failed, and an unknown share of those 25 were
     * successful actions reporting themselves. `say()` below is the non-counting half that
     * should always have existed. Splitting them is what makes the number mean its own name.
     */
    private explain(message: string): void {
        session().markFailedTap();
        this.cues.play(CUES.denied);
        this.showHint(message);
    }

    /**
     * Say what happened when it DID happen. Same channel, no failure count, no denied cue.
     *
     * Deliberately additive rather than a rename: `explain` keeps counting, so no genuine
     * refusal silently stops being counted while these are reclassified one verified site at a
     * time. Under-counting refusals would trade a known distortion for an invisible one.
     */
    private say(message: string): void {
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

    /**
     * DROP 5 — the two things the receiver can tell you, and neither is a reply.
     *
     * A fragment is somebody else's traffic, said once and then available in the panel. A flat
     * cell is the end of the whole affordance and is said plainly rather than left to be
     * discovered by a dead button — [[D-042]], applied to a resource running out.
     */
    /**
     * DROP 3B(i) — the appointment, announced by the WORLD and then by a sentence.
     *
     * The drawn column follows `crash.stage` every frame, so the sky and the rule can never
     * disagree. The words come only on a boundary, and they never say where to go: what a
     * survivor gets is smoke in a direction, which is what a person standing on a beach has.
     */
    /**
     * P0-6 — the illness, FELT. Announced once per crossing, in the survivor's own body.
     *
     * The two free stages get a sensation; past them `illnessNote`'s diagnostic voice takes
     * over, so the two never talk over each other.
     */
    private announceIllness(state: ReturnType<typeof session>['state']): void {
        const crossed = session().takeIllnessStage();
        if (!crossed) return;
        const felt = illnessSymptom(state.illness);
        if (!felt) return;
        this.lastReadoutSaid = felt;
        this.cues.play(CUES.denied);
        this.showHint(felt);
    }

    /**
     * THE COLD, FELT — the director's *"died of cold with no warning"*, closed through the
     * channel `announceIllness` already opened rather than a second one. Same shape, same
     * once-per-crossing contract, same cue: what changes is only which ladder is being read.
     */
    private announceCold(state: ReturnType<typeof session>['state']): void {
        const crossed = session().takeColdStage();
        if (!crossed) return;
        const felt = coldSymptom(state.warmth);
        if (!felt) return;
        this.lastReadoutSaid = felt;
        this.cues.play(CUES.denied);
        this.showHint(felt);
    }

    private announceAppointment(state: ReturnType<typeof session>['state']): void {
        this.island.setCrashVisible(state.crash.stage);
        const crossed = session().takeCrashStage();
        if (!crossed) return;
        const look = crashSighting(state);
        if (!look.note) return;
        //  THE SOUND FIRST, and `fell` rather than the ordinary target chime: what the survivor
        //  hears is something heavy coming down in the trees. Reused rather than newly
        //  generated — it is already the island's "a big thing just hit the ground" noise.
        //
        //  AND THE SOUND IS THE HALF THAT NEEDS NO GESTURE. A device probe measured the column:
        //  at the camera's resting pitch NOTHING above the horizon is in frame ([[D-135]] found
        //  the same thing looking for the far island), so the smoke is seen only once a player
        //  tilts up. A noise is what makes them tilt up. That is the announcement working, not
        //  a hole in it — but it is why the audible half is wired first and witnessed.
        this.lastCuePlayed = crossed === 'sighted' ? CUES.fell : CUES.target;
        this.cues.play(crossed === 'sighted' ? CUES.fell : CUES.target);
        this.showHint(look.note);
    }

    private announceRadio(): void {
        const caught = session().takeCaught();
        if (caught) {
            const sig = heardSignals(session().state).find((x) => x.id === caught);
            if (sig) {
                this.cues.play(CUES.target);
                this.showHint(`${sig.callSign}: ${sig.text}`);
                this.floatText('heard');
            }
        }
        if (session().takeWentFlat()) {
            this.showHint('The cell dies mid-sentence. That was the last of it.');
        }
    }

    private frame(): void {
        const stamp = now();
        const deltaMs = stamp - this.lastFrameAt;
        sampleFrame(deltaMs);
        const dt = Math.min(deltaMs, 100) / 1000;

        const s = session();
        const died = s.tick(stamp);
        const state = s.state;
        if (died && !this.deathShown) this.openDeath();

        //  DROP 5 — THE STATIC. What the set made out this tick, said ONCE. `takeCaught`
        //  and `takeWentFlat` are consumed by reading, so a fragment is news exactly once —
        //  the same shape the boar stage announcements use.
        this.announceRadio();

        //  DROP 3B(i) — THE WORLD BEFORE THE INTERFACE (Law 26). The smoke is drawn and the
        //  sighting is SPOKEN on the tick the stage crosses; nothing names it before that.
        this.announceAppointment(state);

        //  P0-6 — WHAT THE BODY FEELS, on the tick the stage is crossed and before any
        //  panel names it. The goal line only ever spoke an illness once it was COSTING,
        //  so both free warning stages were silent and the director drank pond water and
        //  felt nothing at all. Symptoms are sensation, never diagnosis (Law 145).
        this.announceIllness(state);
        this.announceCold(state);

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
        this.constructionView.update(state, state.construction
            ? this.island.heightAt(state.construction.x, state.construction.y)
            : 0);
        this.boatWork.update(state);
        this.cave.update(state, this.island.heightAt(state.cave.x, state.cave.y));
        this.storage.update(state, this.island.heightAt(state.storage.x, state.storage.y));
        this.workspace.update(state, this.island.heightAt(state.workspace.x, state.workspace.y));
        this.droppedView.update(state, (x, z) => this.island.heightAt(x, z));
        this.raftView.update(state);
        this.outboardView.update(state, (x, z) => this.island.heightAt(x, z));
        this.shoreItemsView.update(state, (x, z) => this.island.heightAt(x, z));

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
        //  ---- RAIN & WET ESCALATION: the sky announces itself, once per stage ----
        //
        //  On the CHANGE and never on the state, which is what separates a warning from
        //  nagging. A line every frame while it rained would be the same sentence sixty times
        //  a second, and a player who learns to ignore the weather text has been given no
        //  warning at all — the exact failure the boar's `unaware` silence exists to avoid.
        const stormMoved = session().takeStormChange();
        if (stormMoved) {
            const said = stormNote(stormMoved);
            if (said) {
                this.cues.play(stormMoved === 'impact' ? CUES.denied : CUES.target);
                this.showHint(said);
            }
        }

        //  ---- FISHING — a bite resolves on the tick, so the tick is where it is told ----
        //
        //  `advanceHandline` returns a catch to `Session`, which parks it; the body drains
        //  it here. Without this the single most rewarding moment in the whole stage would
        //  land silently in the inventory — a resolved cast has no tap of its own to hang a
        //  message on, which is exactly why it needed one.
        const bit = session().takeFishingCatch();
        if (bit > 0) {
            this.cues.play(CUES.gather);
            this.floatText(`+${bit} fish`);
            const spot = nearestSpot(session().state);
            this.showHint(spot && !spot.available
                ? 'Something takes it — and that is the last of them here for a while.'
                : 'Something takes it. You draw it in.');
        }

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
            waterSpeedMultiplierOf(state) *
            //  THE UNDERWATER SLICE, on the same line and by the same rule as every multiplier
            //  above it: it scales `walkSpeedMps` at use and never mutates the constant.
            //  Surfaced returns exactly 1, so nothing about swimming changes.
            diveSpeedMultiplierOf(state) *
            //  P0-D — ILLNESS, on the same line and by the same rule. THE DIRECTOR'S REPORT WAS
            //  "the line shows; the body ignores it", and this line is why: illness reached the
            //  ENERGY ledger through `impairmentOf` and reached pace nowhere, so a feverish
            //  survivor walked at exactly the speed of a well one. Returns exactly 1 through
            //  both free warning rungs, so the fair-challenge grammar is untouched and only a
            //  body that has been told twice ever slows down.
            illnessSpeedMultiplierOf(state.illness) *
            //  P0-E — AND THE SAME LINE IS WHERE GROWTH BECOMES FELT. Law 234 asks whether
            //  progression is perceivable in the act; walking practice was reaching the energy
            //  ledger and nothing else. Returns exactly 1 at the innate floor, so a fresh
            //  castaway's pace is bit-for-bit what it was. Carrying's own practice is NOT here:
            //  it goes through `loadSpeedMultiplierOf` above, which now weighs the load as this
            //  body actually carries it, so the gain arrives through the shipped curve rather
            //  than as a fourth factor nobody can trace.
            walkEaseOf(state);

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

        //  ITEM 5 (this batch) — WALKING COSTS ENERGY, at last. Investigated before assuming
        //  a fix, per the director's own instruction: neither ordinary walking NOR loaded
        //  movement charged anything movement-specific. `loadEnergyMultiplierOf` (Ch.6,
        //  D-058) is real and shipped, but every one of its call sites — `reconcile.ts`'s
        //  ambient drain, `resolver.ts`'s gather cost, `water.ts`'s swim/wade cost — prices
        //  either the PASSAGE OF TIME or a named ACT, never the act of covering ground. A
        //  survivor standing still in a heavy pack and one sprinting laps in the same pack
        //  drained identically. `resolver.ts`'s own header even names the old shape out
        //  loud in passing — "walking looked at exhaustion and ignored load" — meaning
        //  energy was read, to slow the body down, never spent. `TUNE.walkBaseDemand` was
        //  sized for exactly this and sat unused since `workload.ts` shipped it.
        //
        //  THROUGH THE ONE BODY RESOLVER, same as every gather (`state.ts`'s `gatherNode`):
        //  declare the act, let `resolveActivity` supply load, impairment and environment,
        //  `applyEffect` spends it. `durationGameHours` is this frame's real `dt` converted,
        //  not a fixed span — a 30 fps client and a 60 fps client walking the same real time
        //  pay the same total, since the formula is linear in duration (D-011's own "a
        //  stalled frame is a longer span, never a lost one" reasoning, applied per-frame
        //  instead of per-absence).
        //
        //  GATED TO GENUINE ON-FOOT TRAVEL, so this can never double-charge a frame that is
        //  already paying elsewhere: aboard the raft pays `raftEnergyDrainPerGameHour`
        //  (`advanceWater`), wading and swimming pay through `waterCostsFor` — both keyed off
        //  the exact same `swimStageOf` this reads, so "ashore" here is the precise
        //  complement of what the water pipeline already prices.
        if (!state.raft.aboard && swimStageOf(state) === 'ashore') {
            applyEffect(state, resolveActivity(state, {
                id: 'walk',
                baseDemand: TUNE.walkBaseDemand,
                durationGameHours: gameHoursFromRealSeconds(dt),
            }));
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
        this.player.syncSpear(s.tools.spear);
        this.player.syncTorch(s.torch.owned, s.torch.lit, this.nightFactor(s.gameHoursElapsed), s.torch.grade);
        //  Recorded as it is handed over, so the device bench can witness that the mixer was
        //  actually TOLD — the one half of this it can see. Reading the gain node itself is
        //  impossible headless (no audio decode, so no node), and reading `fireLoudness(s)`
        //  proved vacuous: it stayed green with this very line planted out.
        this.lastFireBedFactor = this.fireLoudness(s);
        this.cues.setBedFactor(CUES.fireloop, this.lastFireBedFactor);
    }

    /**
     * How loud the fire should be from where the survivor is standing (P0-G).
     *
     * Full inside `fireSoundFullAtM`, silent past `fireSoundSilentAtM`, linear between. The
     * fire's position is the one the brain believes, not the mesh's, so this agrees with every
     * other distance rule in the game rather than inventing a second opinion about where the
     * fire is. Returns 0 when nothing is burning so a stopped bed cannot be left holding gain.
     */
    private fireLoudness(s: GameState): number {
        if (!isFireLit(s)) return 0;
        return fireLoudnessAt(Math.hypot(s.fire.x - s.player.x, s.fire.y - s.player.y));
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
        //  P0-A — AND THE FIX ABOVE WAS HALF-APPLIED. The note above is accurate about the
        //  disease and wrong about the cure: it added `fireIsKnown` and LEFT `visible` reading
        //  `state.inventory.wood > 0`. So the disagreement it describes never actually closed.
        //  `suspicionFor(state, 'torch')` flips suspected at ONE wood and ONE fibre — need is
        //  felt from the first second ashore — so a survivor holding a single stick and a single
        //  strand satisfied the knowledge half, `wood > 0` satisfied the visibility half, and the
        //  button appeared reading "Build fire (4 short)" at 0.34 h on a life with no deaths.
        //  That is precisely Law 130's "no survivor begins with Build Fire in a menu", still
        //  broken, two fixes later.
        //
        //  `canBuildFire` is the brain's own answer to this exact question — its comment says
        //  "May this be OFFERED to the player? Knowledge and matter both" — so the HUD now asks
        //  it instead of re-deriving half of it. The "(N short)" pre-announcement goes with it,
        //  deliberately: a button that appears before it can be used IS the menu Law 130
        //  forbids, and counting down to fire-making is how a survivor is taught they already
        //  know how. What is short belongs in the world's own voice, not on the affordance.
        let action = { label: '', visible: false, ready: false };
        if (canBuildFire(state)) {
            action = { label: 'Build fire', visible: true, ready: true };
        }

        //  THE BUILD DOOR AND ITS GATE ARE GONE (ITEM 1, this batch). This whole paragraph
        //  used to justify `makerOffers` deriving that gate from the panel's own contents,
        //  after two real regressions from hand-maintained lists. The panel it opened is
        //  retired outright now — see the ledger entry — so there is no gate left to derive.
        //  ---- THE UNDERWATER SLICE: the one control that must never be buried ----
        //
        //  SURFACING OUTRANKS EVERY OTHER PRIMARY ACTION, so it is assigned LAST — after the
        //  fire clause, where nothing downstream can overwrite it. Written above the fire
        //  clause first, and it read correctly while being wrong: the fire's assignment ran
        //  after and took the slot straight back. That is the priority-starvation bug this
        //  project has now fixed four times (D-040, D-042, D-053) and it is why the rule is
        //  "assign last", not "assign first with a comment about priority".
        //
        //  Going DOWN is deliberately NOT here. A dive begins by reaching for something on
        //  the bottom (tap a submerged point), because that is the decision a player actually
        //  makes; what they need a button for is getting back.
        if (diveStageOf(state) !== 'surfaced') {
            action = { label: 'Surface', visible: true, ready: true };
        }

        this.hud.update({
            warmth: state.warmth, thirst: state.thirst, hunger: state.hunger, health: state.health, energy: state.energy,
            sheltered, inventory: state.inventory, tools: state.tools,
            //  READ FROM `vessel.ts`, never re-derived here — the same rule the Vitals tab's
            //  water row already follows. This puts the made vessel on the strip the survivor
            //  actually watches; see `HudView.vessel` for what was reported and why.
            vessel: vesselChip(state),
            carry: { kg: carriedWeightKg(state), overloaded: isOverloaded(state) },
            gameHoursElapsed: state.gameHoursElapsed, goal: this.goalLine(state), action, skills: state.skills
        });
        paintBackpackLoad(this.overlay, carriedWeightKg(state), isOverloaded(state), state.tools.backpack);
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
        //  RAIN & WET ESCALATION — the weather sits BELOW the breath and the hull, and above
        //  the ordinary goal line. It is a sustained condition rather than an emergency: a
        //  drowning diver has seconds and a survivor in the rain has the whole storm, so the
        //  ordering is by how soon the thing kills you, which is what this whole stack is.
        //
        //  Only while it is actually raining. The two WARNING stages get their one-shot
        //  announcement above and then go quiet — a permanent "it might rain" line is weather
        //  reporting, not a warning.
        const sky = isStormActive(state.storm.stage) && state.storm.stage !== 'precursor'
            && state.storm.stage !== 'watch'
            ? stormNote(state.storm.stage)
            : null;
        if (sky && state.wet > TUNE.wetMax * 0.25) return sky;

        //  THE UNDERWATER SLICE — the breath speaks above EVERYTHING. It is the shortest fuse
        //  in the game: the water gives a swimmer minutes and a groaning hull gives a diver a
        //  warning they can act on at leisure, but air is counted in seconds. Silent at
        //  `holding` by the same rule that keeps `swimming` and a sound hull quiet — the two
        //  warnings only work because the stage before them says nothing.
        const breath = diveNote(diveStageOf(state));
        if (breath) return breath;

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
        if (s.inventory.stonehammer === 0) return 'You need a stone hammer first — knap a blade, then put wood, blade and cord together in your pack.';
        if (s.inventory.sharpblade < TUNE.axeSharpbladeCost) return 'You need a knapped blade for the axe — knap one with your stone hammer.';
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
        if (!s.torch.owned && canCraftTorch(s)) return 'You have the parts for a torch, too — put them together in your pack.';
        if (!s.fire.built && s.inventory.wood >= TUNE.woodPerFire) return 'You have enough wood. Build the fire.';
        if (!s.fire.built) return 'Tap a standing tree to chop it, then build a fire.';
        if (!isFireLit(s)) return 'The fire is out. Tap it to add wood.';
        //  FIX-5: a low-priority idle nudge only — never inserted into the primary goal
        //  line above, which stays the carefully-sequenced axe/fire/shelter funnel
        //  (D-040/D-042). The torch is optional content; it earns a hint, not a gate.
        if (canLightTorch(s)) return 'Your torch is unlit. Tap the fire to light it.';
        if (!s.shelter.built) return 'You know more than the axe now — a shelter is yours to raise.';
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
                    //
                    //  `say`, NOT `explain`. This runs from the frame loop — a boar walking into
                    //  range, with no tap and no player action anywhere near it — and `explain`
                    //  calls `markFailedTap()`, so an ambient threat warning was incrementing
                    //  `trace.failedInteractionTaps`. That is the sixteenth instance of the class
                    //  `say()` was split out to fix, and the worst kind: the fifteen already
                    //  reclassified were SUCCESSES miscounted as refusals, where this is no
                    //  interaction at all. It also corrupts the number non-deterministically,
                    //  because it fires on proximity rather than on anything a player did — which
                    //  is how it was found, failing a harness check that had passed three sweeps
                    //  running while the product misbehaved identically in all of them.
                    //
                    //  The loud cue is kept and is now played ONCE. `explain` plays CUES.denied
                    //  itself, so the line above was a second, doubled play of the same cue.
                    this.cues.play(CUES.denied);
                    this.say('It snorts and paws the ground. It is going to come.');
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
