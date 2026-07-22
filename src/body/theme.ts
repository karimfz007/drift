/**
 * BODY — presentation constants: palette, type, layout, depth order.
 *
 * These are *look*, not gameplay. Every number that changes how the game plays lives in
 * src/data/tune.ts (Ops v1.2 §5 law 2); everything here changes only how it reads on a
 * phone, and moves when the art director arrives in Phase 2.
 */

export const PALETTE = {
    sea: 0x13324a,
    seaDeep: 0x0d2438,
    surf: 0x2a5a72,
    sandWet: 0x8a7a5f,
    sand: 0xb9a888,
    sandHighlight: 0xcfc0a2,
    scrub: 0x5d6b46,
    treeline: 0x33452c,
    canopy: 0x22301d,

    player: 0xf2e6d0,
    playerEdge: 0x3a3226,

    driftwood: 0x9c7b4e,
    deadfall: 0x6b4f31,
    nodeEdge: 0x2b1f13,

    fireStone: 0x555049,
    flame: 0xffb347,
    flameHot: 0xffe6a3,
    ember: 0xff8c42,

    night: 0x0a1526,
    hudBack: 0x0c1420,
    hudEdge: 0x2b3a4f,
    text: 0xf0ece4,
    textDim: 0x9fb0c4,
    warm: 0xf0a860,
    cold: 0x74a7d8,
    danger: 0xd9694a,
    good: 0x8fbf7a
} as const;

/** Hex strings for Phaser Text styles. */
export const CSS = {
    text: '#f0ece4',
    textDim: '#9fb0c4',
    warm: '#f0a860',
    danger: '#d9694a',
    good: '#8fbf7a',
    panel: '#0c1420'
} as const;

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Type scale. Charter §I.18 rule 7: one-thumb readable, scalable text, large touch
 * targets. Nothing below 15px carries information the player needs.
 */
export const TYPE = {
    title: { fontFamily: FONT, fontSize: '46px', color: CSS.text, fontStyle: 'bold' },
    heading: { fontFamily: FONT, fontSize: '26px', color: CSS.text, fontStyle: 'bold' },
    body: { fontFamily: FONT, fontSize: '19px', color: CSS.text },
    label: { fontFamily: FONT, fontSize: '17px', color: CSS.textDim },
    hud: { fontFamily: FONT, fontSize: '20px', color: CSS.text, fontStyle: 'bold' },
    button: { fontFamily: FONT, fontSize: '21px', color: CSS.text, fontStyle: 'bold' }
} as const;

/** Layout. Touch targets are never smaller than TOUCH_MIN in either dimension. */
export const LAYOUT = {
    touchMin: 56,
    hudTop: 10,
    //  Kept slim on purpose: the HUD sits over the sea, and the water is the first
    //  thing that says where you are.
    hudHeight: 76,
    barWidth: 260,
    barHeight: 22,
    actionBarY: 878,
    panelPadding: 26,
    /** Below this y, the left half of the screen belongs to the joystick thumb. */
    joystickZoneTop: 640,
    /** Where the faint "the stick lives here" mark rests before the thumb arrives. */
    joystickRestY: 786
} as const;

/** Half the design width — the joystick claims the left of it. */
export const WORLD_HALF = 270;

/** Draw order. One place, so nothing ever fights over what is on top. */
export const DEPTH = {
    terrain: 0,
    nodeShadow: 8,
    node: 10,
    firePit: 18,
    fire: 20,
    player: 25,
    particles: 30,
    tint: 40,
    glow: 42,
    vignette: 45,
    worldUi: 48,
    hud: 50,
    controls: 55,
    panel: 60,
    flash: 70
} as const;

/** Animation timings, in ms. Feel, not balance — restrained by design. */
export const MOTION = {
    ackRing: 260,
    pickupPop: 220,
    countPulse: 180,
    ignitionFlash: 320,
    glowRise: 900,
    panelFade: 260,
    hintFade: 300
} as const;
