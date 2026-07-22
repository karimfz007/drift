/**
 * CONTENT — the authored island, in metres (charter §II.10: authored-first; procedural
 * generation only once the authored island's pacing is proven).
 *
 * **Coordinates are world metres on the X/Z plane.** The brain stores a position as
 * `{ x, y }` and only ever asks for a distance on a plane, so the body maps world Z into
 * the brain's `y` and the brain does not need to know it now lives in three dimensions.
 * That mapping is the whole reason `/src/brain` survived the pivot untouched (D-030).
 *
 * This file is data, not tuning: numbers that shape *feel* live in tune.ts.
 */

import type { WoodNode } from '../brain/types';

/** The island slice. A disc of land in an endless sea — small enough to hold 60 fps. */
export const WORLD = {
    /** Radius of the sand disc, in metres. Beyond this is water. */
    islandRadius: 58,
    /** Radius at which the beach gives way to grass. */
    beachRadius: 34,
    /** Radius at which the treeline starts. */
    treelineRadius: 22,
    /** Height of the island's central rise, in metres. */
    centreHeight: 4.6,
    /** Height of the flat shore shelf above the waterline, in metres. The beach has to
     *  stand clearly out of the sea or it reads as water — which is exactly what the
     *  first 3D build did. */
    shelfHeight: 1.3,
    /** Over how many metres the shelf falls away into the water at the island's edge. */
    shoreFalloff: 7,
    /** Where the water plane sits, in metres. */
    seaLevel: -1.0,
    /** How far the water plane extends, in metres. */
    seaRadius: 420
} as const;

/** Where the castaway can walk: anywhere on land, kept just clear of the waterline. */
export const WALKABLE_RADIUS = WORLD.islandRadius - WORLD.shoreFalloff - 1.5;

/**
 * Washed ashore on the south beach, facing inland.
 *
 * `y` is the world **Z** metre, per the module note above. The frozen brain reads
 * `SPAWN.x` / `SPAWN.y`, so the field names are part of its contract and do not get to
 * change just because the world grew a dimension — only what they mean does.
 */
export const SPAWN = { x: 0, y: 44 } as const;

/**
 * Ground height at a point, in metres. A smooth analytic dome plus a low dune ridge —
 * no heightmap texture to download, no physics mesh to build, and the body can ask for
 * the exact ground height at any point in one cheap call.
 */
export function groundHeight(x: number, z: number): number {
    const r = Math.hypot(x, z);
    if (r >= WORLD.islandRadius) return WORLD.seaLevel - 0.6;

    //  A flat shelf holds the whole island above the waterline, then rolls off over the
    //  last few metres into the sea. Without it the shallow dome leaves the beach at
    //  sea level and the player appears to be standing on the water.
    const shelf = WORLD.shelfHeight * smoothstep(WORLD.islandRadius, WORLD.islandRadius - WORLD.shoreFalloff, r);

    //  A dome rising to the treeline.
    const t = 1 - r / WORLD.islandRadius;
    const dome = WORLD.centreHeight * t * t * (3 - 2 * t);

    //  Two gentle dunes so the beach is not a billiard table — damped at the shore so
    //  they can never dig a trough back down into the sea.
    const dunes =
        0.38 *
        Math.sin(x * 0.09 + 1.3) *
        Math.cos(z * 0.075 - 0.4) *
        Math.min(1, r / 12) *
        smoothstep(WORLD.islandRadius, WORLD.islandRadius - WORLD.shoreFalloff * 1.6, r);

    return shelf + dome + dunes;
}

/** Hermite blend between two edges; edge0 may be greater than edge1 for a falling ramp. */
function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
}

/** True where the ground is sand rather than grass — used for shading and footing. */
export function isBeach(x: number, z: number): boolean {
    return Math.hypot(x, z) > WORLD.beachRadius;
}

/**
 * The wood on the island. Driftwood lies within a few steps of the spawn so the first
 * reward lands within seconds; deadfall waits up at the treeline and costs a hold.
 * Cycle 01's nodes were single-use and so are these.
 *
 * `y` in the returned node is the world **Z** metre (see the module note above).
 */
export function createNodes(): WoodNode[] {
    return [
        // Loose driftwood — instant tap pickup, scattered along the landing beach.
        node('dw1', 'driftwood', -6.2, 40.5),
        node('dw2', 'driftwood', 5.4, 41.8),
        node('dw3', 'driftwood', -12.5, 35.0),
        node('dw4', 'driftwood', 11.8, 34.2),
        node('dw5', 'driftwood', 1.6, 32.4),
        node('dw6', 'driftwood', -3.4, 46.8),

        // Deadfall — tap-hold salvage, up at the treeline.
        node('df1', 'deadfall', -8.0, 22.5),
        node('df2', 'deadfall', 9.5, 21.0),
        node('df3', 'deadfall', 0.5, 17.5),
        node('df4', 'deadfall', 17.0, 26.0)
    ];
}

function node(id: string, kind: WoodNode['kind'], x: number, z: number): WoodNode {
    return { id, kind, x, y: z, available: true };
}

/**
 * The treeline. Authored positions, not random, so the island is one island — and so the
 * silhouette from the spawn point is composed rather than accidental.
 * Each entry is [x, z, heightMetres].
 */
export const TREES: ReadonlyArray<readonly [number, number, number]> = [
    [-14, 18, 7.5], [-7, 13, 8.4], [0, 9, 9.1], [7, 12, 8.0], [14, 17, 7.2],
    [-19, 24, 6.6], [19, 23, 6.9], [-11, 6, 8.8], [11, 5, 8.2], [3, 1, 9.6],
    [-4, -3, 8.9], [-17, 9, 7.4], [17, 8, 7.8], [-22, 15, 6.2], [22, 14, 6.4],
    [-9, -9, 8.1], [9, -8, 7.9], [0, -14, 7.6], [-15, -16, 6.8], [15, -15, 7.0],
    [-25, 3, 6.0], [25, 2, 6.1], [-20, -8, 6.5], [20, -7, 6.7], [5, -20, 6.9],
    [-6, -21, 6.6], [12, -24, 6.2], [-13, -25, 6.3], [0, -28, 5.9], [-27, -18, 5.7],
    [27, -17, 5.8], [-30, 10, 5.6], [30, 9, 5.5]
];

/** Rocks — silhouette and landmarks, so the beach has somewhere to be. */
export const ROCKS: ReadonlyArray<readonly [number, number, number]> = [
    [-24, 38, 1.6], [21, 37, 1.9], [-33, 28, 1.3], [31, 26, 1.5],
    [-16, 47, 1.1], [14, 48, 1.2], [0, 52, 1.4], [-40, 14, 1.0], [39, 12, 1.1]
];

/** The cold-open card (charter §I.18 rule 1: contextual onboarding, no tutorial panel). */
export const COLD_OPEN = {
    title: 'THE FIRST NIGHT',
    body: 'You wash ashore at dusk.\nCold is coming.'
} as const;
