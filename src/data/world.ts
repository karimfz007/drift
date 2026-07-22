/**
 * CONTENT — the authored island (charter §II.10: authored-first, procedural only once
 * the authored island's pacing is proven). One handcrafted beach + treeline, portrait phone.
 *
 * Coordinates are world pixels in the fixed design resolution below. This file is data,
 * not tuning: numbers that shape *feel* live in tune.ts.
 */

import type { WoodNode } from '../brain/types';

/** Portrait design resolution. The camera does not scroll in Cycle 01: world === screen. */
export const WORLD = {
    width: 540,
    height: 960
} as const;

/**
 * Horizontal bands of the island, top (open sea) to bottom (forest canopy).
 * The sea starts below the HUD so the player can still see the water they washed out of.
 */
export const BANDS = {
    seaTop: 0,
    surfTop: 176,
    beachTop: 232,
    scrubTop: 540,
    treelineTop: 630,
    canopyTop: 845
} as const;

/** Where the castaway can walk. Keeps the player clear of the HUD and the surf. */
export const WALKABLE = {
    minX: 32,
    maxX: WORLD.width - 32,
    minY: 208,
    maxY: 806
} as const;

/** Washed ashore at the waterline. */
export const SPAWN = { x: 270, y: 288 } as const;

/**
 * The wood on the island. Driftwood sits within a few steps of the spawn so the first
 * reward lands within seconds; deadfall waits at the treeline and costs a hold.
 * Cycle 01 nodes are single-use.
 */
export function createNodes(): WoodNode[] {
    return [
        // Loose driftwood — instant tap pickup, salted around the landing point.
        node('dw1', 'driftwood', 186, 350),
        node('dw2', 'driftwood', 348, 330),
        node('dw3', 'driftwood', 432, 274),
        node('dw4', 'driftwood', 142, 444),
        node('dw5', 'driftwood', 402, 420),
        node('dw6', 'driftwood', 264, 478),

        // Deadfall — tap-hold salvage at the treeline.
        node('df1', 'deadfall', 212, 616),
        node('df2', 'deadfall', 122, 700),
        node('df3', 'deadfall', 302, 730),
        node('df4', 'deadfall', 456, 678)
    ];
}

function node(id: string, kind: WoodNode['kind'], x: number, y: number): WoodNode {
    return { id, kind, x, y, available: true };
}

/** The cold-open card (charter §I.18 rule 1: contextual onboarding, no tutorial panel). */
export const COLD_OPEN = {
    title: 'THE FIRST NIGHT',
    body: 'You wash ashore at dusk.\nCold is coming.'
} as const;
