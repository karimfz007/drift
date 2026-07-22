/**
 * BRAIN — data model. Pure TypeScript. Zero Phaser (Ops v1.2 §5 law 1).
 */

export const SCHEMA_VERSION = 1;

export type ControlMode = 'tap' | 'joystick';

export type WoodNodeKind = 'driftwood' | 'deadfall';

/** A gatherable wood node, as placed by the authored island (src/data/world.ts). */
export interface WoodNode {
    id: string;
    kind: WoodNodeKind;
    x: number;
    y: number;
    /** False once salvaged. Cycle 01 nodes are single-use. */
    available: boolean;
}

export interface FireState {
    /** A fire exists in the world (it may be burnt out). */
    built: boolean;
    /** Wood units remaining. Fractional as it burns. Lit means built && fuel > 0. */
    fuel: number;
    x: number;
    y: number;
}

export interface PlayerState {
    x: number;
    y: number;
}

export interface Inventory {
    wood: number;
}

export interface Settings {
    controlMode: ControlMode;
}

/** Local-only playtest trace (Ops: no external service; localStorage/debug only). */
export interface TraceState {
    /** Real ms from gaining control to the first movement input, or null if it hasn't happened. */
    msToFirstMove: number | null;
    msToFirstWood: number | null;
    msToFireLit: number | null;
    /** Taps that hit nothing interactable — the ambiguity signal. */
    failedInteractionTaps: number;
    controlModeSwitches: number;
    steelThreadComplete: boolean;
    /** Real ms of active (foreground) play since the run started. */
    activeMs: number;
}

/**
 * The whole run. Everything the game needs to be reconstructed from a cold start.
 * Serialised verbatim into the save (see save.ts).
 */
export interface GameState {
    schemaVersion: number;
    /** Real epoch ms the run began. Diagnostic only — the clock runs off gameHoursElapsed. */
    startedAtMs: number;
    /** Real epoch ms of the last tick folded into this state. Absence = now - lastSeenMs. */
    lastSeenMs: number;
    /** Game hours elapsed since the crash. The one clock, online and offline. */
    gameHoursElapsed: number;
    warmth: number;
    inventory: Inventory;
    fire: FireState;
    player: PlayerState;
    nodes: WoodNode[];
    settings: Settings;
    trace: TraceState;
}

export interface TimeOfDay {
    /** 0–23.999… hour-of-day. */
    hourOfDay: number;
    /** Days since the crash; the crash itself is day 0. */
    dayNumber: number;
    isNight: boolean;
}

/** Everything that happened across an elapsed span. Input to the morning report. */
export interface ReconcileResult {
    elapsedRealSeconds: number;
    elapsedGameHours: number;

    warmthBefore: number;
    warmthAfter: number;
    /** True if the offline fairness floor (D-011) stopped the fall. */
    floorHeld: boolean;

    fireLitBefore: boolean;
    fireLitAfter: boolean;
    /** Game hours (absolute, since the crash) at which the fire burnt out, if it did. */
    fireWentOutAtGameHours: number | null;
    woodBurned: number;
    /** The player was parked inside the fire's radius for this span. */
    shelteredByFire: boolean;

    timeBefore: TimeOfDay;
    timeAfter: TimeOfDay;
    /** The span crossed from night into day at least once. */
    dawnBroke: boolean;
    /** The span crossed from day into night at least once. */
    nightFell: boolean;

    /** Absence long enough to earn a morning report (TUNE.morningReportMinRealMinutes). */
    qualifiesForReport: boolean;
}
