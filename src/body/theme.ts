/**
 * BODY — presentation constants: the island's palette, the day/night keyframes, and the
 * HUD's type scale.
 *
 * These are *look*, not gameplay (D-023). Every number that changes how the game plays
 * lives in src/data/tune.ts; everything here changes only how it reads on a phone, and
 * moves wholesale when the Art Director hat activates.
 *
 * Art bar (D-029): Muck/Valheim readability — flat, saturated, low-poly. Not Rust
 * fidelity. Rust sets the gameplay bar, never the visual one.
 */

/** Linear-ish sRGB triples, 0–1, ready for Babylon Color3. */
export const PALETTE = {
    sandDry: [0.86, 0.78, 0.60],
    sandWet: [0.62, 0.55, 0.42],
    grass: [0.33, 0.46, 0.24],
    grassDark: [0.24, 0.35, 0.18],
    rock: [0.42, 0.42, 0.45],

    trunk: [0.30, 0.22, 0.15],
    canopy: [0.20, 0.38, 0.20],
    canopyAlt: [0.26, 0.44, 0.24],

    driftwood: [0.62, 0.48, 0.31],
    deadfall: [0.38, 0.28, 0.18],
    player: [0.93, 0.88, 0.78],
    playerPack: [0.35, 0.29, 0.22],

    firePit: [0.30, 0.29, 0.28],
    flame: [1.0, 0.62, 0.20],
    flameHot: [1.0, 0.86, 0.52],
    ember: [1.0, 0.45, 0.15],

    highlight: [1.0, 0.86, 0.52]
} as const;

/**
 * Day/night keyframes, by hour-of-day. The brain's clock drives which one is active and
 * the body lerps between them — the same clock that drives warmth, so the sky and the
 * cold always agree.
 */
export interface SkyKey {
    hour: number;
    sky: [number, number, number];
    fog: [number, number, number];
    sun: [number, number, number];
    sunIntensity: number;
    ambient: [number, number, number];
    ambientIntensity: number;
    /** Sun elevation in degrees above the horizon. */
    sunElevation: number;
}

export const SKY_KEYS: SkyKey[] = [
    {
        hour: 0, // deep night
        sky: [0.02, 0.04, 0.09], fog: [0.03, 0.05, 0.11],
        sun: [0.20, 0.28, 0.50], sunIntensity: 0.10,
        ambient: [0.14, 0.18, 0.30], ambientIntensity: 0.34, sunElevation: -20
    },
    {
        hour: 5.5, // first grey
        sky: [0.10, 0.13, 0.22], fog: [0.13, 0.16, 0.24],
        sun: [0.55, 0.45, 0.45], sunIntensity: 0.25,
        ambient: [0.22, 0.24, 0.34], ambientIntensity: 0.34, sunElevation: -2
    },
    {
        hour: 7, // dawn
        sky: [0.55, 0.48, 0.44], fog: [0.62, 0.55, 0.48],
        sun: [1.00, 0.72, 0.48], sunIntensity: 0.85,
        ambient: [0.42, 0.42, 0.46], ambientIntensity: 0.48, sunElevation: 12
    },
    {
        hour: 12, // midday
        sky: [0.48, 0.68, 0.88], fog: [0.66, 0.78, 0.88],
        sun: [1.00, 0.97, 0.90], sunIntensity: 1.25,
        ambient: [0.55, 0.60, 0.68], ambientIntensity: 0.60, sunElevation: 68
    },
    {
        hour: 17, // late gold
        sky: [0.52, 0.58, 0.72], fog: [0.66, 0.66, 0.70],
        sun: [1.00, 0.82, 0.58], sunIntensity: 1.00,
        ambient: [0.48, 0.48, 0.54], ambientIntensity: 0.52, sunElevation: 22
    },
    {
        hour: 18.5, // dusk — where the run begins, and the light the game is judged on
        sky: [0.34, 0.29, 0.37], fog: [0.38, 0.33, 0.39],
        sun: [1.00, 0.58, 0.36], sunIntensity: 0.70,
        ambient: [0.40, 0.40, 0.50], ambientIntensity: 0.62, sunElevation: 6
    },
    {
        hour: 20.5, // night falls — dark, but never so dark the ground is a void
        sky: [0.05, 0.07, 0.14], fog: [0.06, 0.08, 0.16],
        sun: [0.25, 0.32, 0.55], sunIntensity: 0.16,
        ambient: [0.16, 0.20, 0.34], ambientIntensity: 0.38, sunElevation: -12
    },
    {
        hour: 24, // wraps to hour 0
        sky: [0.02, 0.04, 0.09], fog: [0.03, 0.05, 0.11],
        sun: [0.20, 0.28, 0.50], sunIntensity: 0.10,
        ambient: [0.14, 0.18, 0.30], ambientIntensity: 0.34, sunElevation: -20
    }
];

/** Sea colour, lerped between night and day by the same factor as the sky. */
export const SEA = {
    night: [0.03, 0.06, 0.11],
    day: [0.13, 0.32, 0.42],
    alpha: 0.88
} as const;

/** Fog density by daylight — night closes the world in, which is the point. */
export const FOG = {
    densityNight: 0.016,
    densityDay: 0.0072
} as const;

/** Scene tuning for a phone GPU. Perf discipline from the first mesh (Stage 1). */
export const RENDER = {
    /** Terrain grid resolution across the island's full diameter. */
    terrainSegments: 84,
    /** Hardware scaling ceiling: never render more than this many device pixels per CSS px. */
    maxDevicePixelRatio: 2,
    /** Flame particle budget. */
    fireParticles: 55,
    /** Frames sampled for the rolling FPS median reported in the trace. */
    fpsSampleWindow: 240
} as const;

/** HUD type and colour, as CSS. The HUD is DOM, not engine-drawn (D-032). */
export const CSS = {
    text: '#f0ece4',
    textDim: '#a9b6c6',
    warm: '#f0a860',
    danger: '#d9694a',
    good: '#8fbf7a',
    panel: 'rgba(9, 14, 22, 0.92)',
    panelEdge: 'rgba(120, 140, 165, 0.35)'
} as const;
