/**
 * TUNE — every tunable number in The First Night lives here, and only here.
 * Ops v1.3 §5 law 2: no magic numbers in code; the cycle log's TUNE ledger mirrors this file.
 *
 * Rows marked C01 were introduced by Cycle 01 "First Fire"; C01+ were added by C2 during
 * that build; C02 by the 3D pivot, "Boots on Sand".
 *
 * **Units changed at C02.** The 2D body measured space in screen pixels; the 3D body
 * measures it in **metres**. The brain never knew the difference — it only ever asked for
 * a distance on a plane — which is why `/src/brain` and `/tests` are byte-identical across
 * the pivot (D-030). Spatial constants below were re-expressed, not re-invented.
 */

export const TUNE = {
    // ---- The clock (one clock, online and offline) -------------------------
    /** [TUNE] C01 — one full game day per this many real minutes. 1 game hour = 2.5 real minutes. */
    dayLengthRealMinutes: 60,
    /** [TUNE] C01+ — hours in a game day. Real days have 24; kept explicit so the clock has no literals. */
    gameHoursPerDay: 24,
    /** [TUNE] C01+ — the crash lands you at dusk. Game hour-of-day the run starts on. */
    startHourOfDay: 18,
    /** [TUNE] C01+ — night begins at this hour-of-day (inclusive). */
    nightStartHour: 18,
    /** [TUNE] C01+ — night ends / day begins at this hour-of-day (inclusive). 12-hour night. */
    dayStartHour: 6,

    // ---- Warmth ------------------------------------------------------------
    /** [TUNE] C01 — full warmth. */
    warmthMax: 100,
    /** [TUNE] C01 — warmth lost per game hour, at night, outside a lit fire's radius.
     *  Without fire you bottom out ~8 game hours into a 12-hour night — fire is priority #1. */
    warmthDrainPerGameHourNight: 12,
    /** [TUNE] C01 — warmth regained per game hour inside a lit fire's radius (replaces the drain). */
    warmthRegenPerGameHourAtFire: 30,
    /** [TUNE] C01+ — offline fairness floor (charter §II.10 / D-011): an absence may sting but may
     *  never bottom you out. Absences that qualify for a morning report stop at this warmth. */
    warmthOfflineFloor: 15,
    /** [TUNE] C01+ — at or below this warmth the HUD reads "freezing" and the world desaturates. */
    warmthLowThreshold: 30,

    // ---- Wood --------------------------------------------------------------
    /** [TUNE] C01 — loose driftwood: instant tap pickup, the first reward in seconds. */
    driftwoodTapYield: 1,
    /** [TUNE] C01 — real seconds of tap-hold to salvage a deadfall. */
    deadfallHoldSeconds: 1.5,
    /** [TUNE] C01 — wood per completed deadfall hold (min). */
    deadfallYieldMin: 2,
    /** [TUNE] C01 — wood per completed deadfall hold (max). */
    deadfallYieldMax: 3,

    // ---- Fire --------------------------------------------------------------
    /** [TUNE] C01 — wood cost to build a campfire. */
    woodPerFire: 5,
    /** [TUNE] C01 — game hours of burn per unit of wood. 5 wood ≈ 10 game hours ≈ most of one night. */
    fireBurnGameHoursPerWood: 2,
    /** [TUNE] C01+ · **metres at C02** (was 140 screen px) — radius of the fire's warmth and
     *  light. Inside it, warmth recovers. Sized so the fire is a place you stand, not a pixel. */
    fireWarmthRadius: 7,
    /** [TUNE] C01+ — maximum wood a single fire can hold, so the pit can't be turned into a silo. */
    fireMaxFuel: 12,

    // ---- Reach and aim (metres at C02) -------------------------------------
    /** [TUNE] C01+ · **metres at C02** (was 74 px) — how close you must stand to take wood. */
    interactRadius: 2.6,
    /** [TUNE] C01+ · **metres at C02** (was 34 px) — forgiveness around a node when the tap ray
     *  misses the mesh. A difficulty number, not a decoration (D-026). */
    nodeTapSlack: 0.9,
    /** [TUNE] C01+ · **metres at C02** (was 40 px) — how close a tap must land to the fire to feed it. */
    fireTapRadius: 1.6,
    /** [TUNE] C02 — how far in front of you the fire is laid, in metres. In 2D the fire
     *  was built "at your spot"; in 3D that puts you standing in the flames, so it goes
     *  down an arm's length ahead — and the firelight becomes somewhere you step into. */
    fireBuildOffsetM: 1.7,

    // ---- Collision and gesture (C03; moved from the body at the C03 audit, D-038) -----
    /** [TUNE] C03+ — the castaway's collision radius, in metres. Governs how close you can
     *  get to a trunk or a rock — a reachability number, so it belongs here (D-026's rule). */
    playerCollisionRadius: 0.4,
    /** [TUNE] C03+ — collision footprints, in metres, for the things you cannot walk through. */
    treeCollisionRadius: 0.8,
    rockCollisionRadius: 1.1,
    palmCollisionRadius: 0.5,
    crashboxCollisionRadius: 0.9,
    fireCollisionRadius: 0.9,
    /** [TUNE] C03+ — footprint multiplier for the decorative treeline/rock instances. */
    decorTreeCollisionRadius: 0.7,
    decorRockCollisionScale: 1.4,
    /** [TUNE] C03+ — extra metres of forgiveness when tapping the pond to drink. */
    pondTapSlack: 1,
    /** [TUNE] C03+ — a press this short and this still (screen px) is a tap, not a look-drag. */
    tapMaxMs: 320,
    tapMaxMovePx: 14,

    // ---- Feel: camera, movement, interaction (C04 — D-040…D-042) -----------
    /** [TUNE] C04 — reach for a direct-world interaction (tap the thing to use it, D-042). */
    interactRadiusM: 2.5,
    /** [TUNE] C04 — how fast the camera catches up to the player each frame (0..1). Damped
     *  follow — the camera glides after you instead of being welded to you (D-040 #1). */
    cameraFollowLerp: 0.12,
    /** [TUNE] C04 — how fast yaw/pitch chase the drag target (0..1). Smoothed look, no snap. */
    cameraLookSmoothing: 0.15,
    /** [TUNE] C04 — how fast the castaway turns to face travel, as a slerp rate (per second). */
    turnSlerpSpeed: 10,
    /** [TUNE] C04 — acceleration and deceleration on foot, m/s². No instant velocity. */
    moveAccelMps2: 14,
    /** [TUNE] C04 — jank budget: p95 frame time (ms) through a scripted move-and-orbit (A3). */
    frameTimeP95BudgetMs: 33,
    /** [TUNE] C04 — portrait shows a rotate-to-landscape prompt; the game plays sideways (D-041). */
    rotatePromptEnabled: true,
    /** [TUNE] C04 — shortest camera boom (m): how close the camera may be pulled when a trunk
     *  or a rise would otherwise clip or occlude the player. */
    cameraMinBoomM: 1.4,
    /** [TUNE] C04 — minimum real-ms between auto-sips while standing in the pond: one tap is a
     *  gulp, loitering tops you up. Governs how fast you rehydrate at the water. */
    pondSipMinIntervalMs: 600,

    // ---- Movement and camera (C02) -----------------------------------------
    /** [TUNE] C02 — metres per second on foot. */
    walkSpeedMps: 3.5,
    /** [TUNE] C02 — close third-person camera distance, in metres. */
    cameraDistanceM: 6,
    /** [TUNE] C02 — drag-to-orbit multiplier. Persisted setting. */
    lookSensitivity: 1.0,
    /** [TUNE] C02 — horizontal field of view, in radians. Horizontal-fixed so the view
     *  does not narrow on a tall phone screen. */
    cameraFovHorizontalRad: 1.05,
    /** [TUNE] C02 — camera height above the player's feet, in metres. */
    cameraHeightM: 2.1,
    /** [TUNE] C02 — how far above the horizon the camera may be pitched, in degrees. */
    cameraPitchMaxDeg: 62,
    /** [TUNE] C02 — how far below the horizon the camera may be pitched, in degrees. */
    cameraPitchMinDeg: -12,
    /** [TUNE] C02 — how fast the player turns to face the direction of travel, in degrees/second. */
    turnRateDegPerSecond: 620,

    // ---- Onboarding & feel -------------------------------------------------
    /** [TUNE] C01 — seconds of inactivity (or repeated failure) before one contextual hint appears. */
    idleHintSeconds: 10,
    /** [TUNE] C01+ — seconds a contextual hint stays on screen. */
    hintVisibleSeconds: 6,
    /** [TUNE] C01+ — virtual joystick radius in screen pixels (thumb travel for full speed).
     *  Screen space on purpose: a thumb is a thumb whatever the world is measured in. */
    joystickRadius: 78,
    /** [TUNE] C01+ — joystick deadzone as a fraction of its radius. */
    joystickDeadzone: 0.18,

    // ---- Performance budget (C02) ------------------------------------------
    /** [TUNE] C02 — cold-load ceiling on 4G, in seconds. */
    coldLoadBudgetSeconds: 8,
    /** [TUNE] C02 — median FPS floor on the director's device. Below this after a dedicated
     *  optimization pass, the Godot native hatch (D-028) triggers a fork. */
    fpsFloorMedian: 30,

    // ---- Vitals (C03) — the island makes demands ---------------------------
    /** [TUNE] C03 — full thirst. */
    thirstMax: 100,
    /** [TUNE] C03 — thirst lost per game hour. ~3 game-days to empty (Rule of Threes). */
    thirstDrainPerGameHour: 1.4,
    /** [TUNE] C03 — full hunger. */
    hungerMax: 100,
    /** [TUNE] C03 — hunger lost per game hour. ~7 game-days to empty; the slow pressure. */
    hungerDrainPerGameHour: 0.6,
    /** [TUNE] C03 — full health. */
    healthMax: 100,
    /** [TUNE] C03 — health lost per game hour for EACH empty vital (thirst or hunger at 0). Stacks. */
    healthDrainPerGameHourPerEmptyVital: 5,
    /** [TUNE] C03 — health lost per game hour while warmth is at 0. Adds to the stack. */
    warmthEmptyHealthDrainPerGameHour: 6,
    /** [TUNE] C03+ — health recovered per game hour, ONLINE only, while no vital is empty.
     *  Recovery preserves momentum (§I.18 rule 3): a crisis survived is a crisis you climb out of. */
    healthRegenPerGameHour: 4,

    /** [TUNE] C03+ — at or below these, the HUD bar reads "low" and a hint nudges the player.
     *  One threshold per vital, so the bar's own cue and the hint system always agree (D-038). */
    thirstLowHintAt: 35,
    hungerLowHintAt: 30,
    healthLowHintAt: 30,

    /** [TUNE] C03 — D-011 offline floors: absence drifts these here and stops. */
    thirstOfflineFloor: 10,
    hungerOfflineFloor: 10,
    /** [TUNE] C03 — D-011 offline floor for health. Offline death is IMPOSSIBLE (property-tested). */
    healthOfflineFloor: 25,

    // ---- Food and water (C03) ----------------------------------------------
    /** [TUNE] C03 — thirst restored per drink, at the pond or from a full flask. */
    drinkPerSip: 25,
    /** [TUNE] C03+ — hunger a handful of berries restores. */
    berryHungerValue: 12,
    /** [TUNE] C03+ — hunger a coconut restores. */
    coconutHungerValue: 14,
    /** [TUNE] C03+ — thirst a coconut also restores (coconut water). */
    coconutThirstValue: 10,
    /** [TUNE] C03+ — hunger shellfish restore; the richest forage. */
    shellfishHungerValue: 22,

    // ---- The first tool and loot (C03) — the four gates made concrete ------
    /** [TUNE] C03 — crude axe recipe: wood + stone + fibre. Knowledge is innate in v1. */
    axeWoodCost: 3,
    axeStoneCost: 2,
    axeFiberCost: 2,
    /** [TUNE] C03 — real seconds to fell a standing tree, at level 1, with the axe. */
    treeChopSecondsWithAxe: 4,
    /** [TUNE] C03 — wood a felled tree yields; timber, where hands got scraps. */
    treeWoodYield: 8,
    /** [TUNE] C03+ — stone per rock outcrop. */
    stoneNodeYield: 2,
    /** [TUNE] C04 — husk fibre per coconut palm (was `fiberPerCoconutPalm`; renamed for the D-043
     *  legibility pass — palms show husks at the trunk base). A pre-axe fibre source. */
    palmHuskFiberYield: 2,
    /** [TUNE] C04 — fibre per reed clump: the *obvious* fibre source, the material that looks
     *  like what it makes (D-043). Reeds grow by the pond and scattered inland. */
    reedFiberYield: 2,
    /** [TUNE] C03+ — the sealed crash box's contents, opened only with the axe. */
    crashBoxFiber: 3,
    crashBoxFlask: 1,
    /** [TUNE] C03+ — drinks the water flask carries inland. */
    flaskCapacitySips: 1,

    // ---- The Development Tree seed (C03) — mastery changes the action ------
    /** [TUNE] C03 — XP for one meaningful outcome (a felled tree, a foraged meal). Never spam. */
    xpPerMeaningfulAction: 5,
    /** [TUNE] C03 — XP to reach level N = N × this. */
    xpToLevelPerLevel: 25,
    /** [TUNE] C03 — each skill level makes its action this much faster/richer (fraction). */
    skillSpeedBonusPerLevel: 0.08,

    // ---- Offline / morning report -----------------------------------------
    /** [TUNE] C01 — an absence shorter than this produces no morning report. */
    morningReportMinRealMinutes: 2
} as const;

export type TuneTable = typeof TUNE;

// ---- Derived clock helpers (pure arithmetic over TUNE, no new constants) ----

/** Real seconds in one game hour. 60 real min/day ÷ 24 h = 2.5 real min = 150 real s. */
export const realSecondsPerGameHour =
    (TUNE.dayLengthRealMinutes * 60) / TUNE.gameHoursPerDay;

/** Game hours advanced by one real second. */
export const gameHoursPerRealSecond = 1 / realSecondsPerGameHour;

/** Real seconds an absence must reach before it earns a morning report. */
export const morningReportMinRealSeconds = TUNE.morningReportMinRealMinutes * 60;
