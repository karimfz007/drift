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
