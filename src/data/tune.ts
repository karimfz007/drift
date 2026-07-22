/**
 * TUNE — every tunable number in The First Night lives here, and only here.
 * Ops v1.2 §5 law 2: no magic numbers in code; the cycle log's TUNE ledger mirrors this file.
 *
 * Rows marked C01 in the ledger were introduced by Cycle 01 "First Fire".
 * Rows marked C01+ were added by C2 during the C01 build because the spec's
 * behaviour could not be expressed without them (logged in the as-built note).
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
    /** [TUNE] C01+ — at or below this warmth the HUD reads "freezing" and the vignette closes in. */
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
    /** [TUNE] C01+ — world-pixel radius of the fire's warmth/light. Inside it, warmth recovers. */
    fireWarmthRadius: 140,
    /** [TUNE] C01+ — maximum wood a single fire can hold, so the pit can't be turned into a silo. */
    fireMaxFuel: 12,

    // ---- Onboarding & feel -------------------------------------------------
    /** [TUNE] C01 — seconds of inactivity (or repeated failure) before one contextual hint appears. */
    idleHintSeconds: 10,
    /** [TUNE] C01+ — seconds a contextual hint stays on screen. */
    hintVisibleSeconds: 6,
    /** [TUNE] C01+ — world pixels/second the castaway walks. */
    playerSpeed: 190,
    /** [TUNE] C01+ — world-pixel reach for interacting with a wood node. */
    interactRadius: 74,
    /** [TUNE] C01+ — how far off a wood node a tap still counts as aimed at it.
     *  Fat-finger forgiveness: this is a difficulty number, not a decoration. */
    nodeTapSlack: 34,
    /** [TUNE] C01+ — how close a tap must land to the fire to count as feeding it. */
    fireTapRadius: 40,
    /** [TUNE] C01+ — pixels from the tapped destination at which tap-to-move stops. */
    tapArriveEpsilon: 6,
    /** [TUNE] C01+ — walking to a tapped node stops this far into the reach, so the
     *  castaway ends up beside it rather than standing on it. */
    approachStopFraction: 0.6,
    /** [TUNE] C01+ — virtual joystick radius in screen pixels (thumb travel for full speed). */
    joystickRadius: 78,
    /** [TUNE] C01+ — joystick deadzone as a fraction of its radius. */
    joystickDeadzone: 0.18,

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
