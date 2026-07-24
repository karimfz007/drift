/**
 * CONTENT — the authored island, in metres (charter §II.10: authored-first; procedural
 * generation only once the authored island's pacing is proven).
 *
 * **Coordinates are world metres on the X/Z plane.** The brain stores a position as
 * `{ x, y }` and only ever asks for a distance on a plane, so the body maps world Z into
 * the brain's `y`. That mapping is why `/src/brain` survived the 2D→3D pivot untouched.
 *
 * Cycle 03 grows the island to ~250 m and gives it demands and answers: a freshwater
 * pond, stone outcrops, forage, standing trees to fell, a sealed crash box, and — out to
 * sea, visible from the spawn beach and unreachable — a wreck. This file is data, not
 * tuning: numbers that shape *feel* live in tune.ts.
 */

import type { NodeKind, WoodNode } from '../brain/types';
import { TUNE } from './tune';

/** The island slice: a disc of land in an endless sea. ~250 m across (D-036/A6 scale). */
export const WORLD = {
    islandRadius: 122,
    beachRadius: 96,
    treelineRadius: 66,
    centreHeight: 9.5,
    shelfHeight: 1.4,
    shoreFalloff: 12,
    seaLevel: -1.0,
    seaRadius: 900
} as const;

/** Where the castaway can walk: anywhere on land, kept just clear of the waterline. */
export const WALKABLE_RADIUS = WORLD.islandRadius - WORLD.shoreFalloff - 2;

/** Washed ashore on the south beach, facing inland (toward −Z / the treeline). */
export const SPAWN = { x: 0, y: 104 } as const;

/** The freshwater pond, inland and slightly west. The first answer to the first demand. */
export const POND = { x: -22, y: 8, radius: 9 } as const;

/** The wreck offshore: visible from the spawn beach, unreachable, unexplained (§I.18 r5). */
export const WRECK = { x: 40, y: 240, heightM: 9 } as const;

/**
 * Ground height at a point, in metres. A flat shelf holds the island above the waterline,
 * a dome rises to the treeline, gentle dunes texture the beach, and the pond basin dips
 * below the shelf so water sits in it. One cheap analytic call — no heightmap to download,
 * no physics mesh to build — shared by the terrain mesh, the player's feet, and collision.
 */
export function groundHeight(x: number, z: number): number {
    const r = Math.hypot(x, z);
    if (r >= WORLD.islandRadius) return WORLD.seaLevel - 0.6;

    const shelf = WORLD.shelfHeight * smoothstep(WORLD.islandRadius, WORLD.islandRadius - WORLD.shoreFalloff, r);

    const t = 1 - r / WORLD.islandRadius;
    const dome = WORLD.centreHeight * t * t * (3 - 2 * t);

    const dunes =
        0.6 *
        Math.sin(x * 0.06 + 1.3) *
        Math.cos(z * 0.05 - 0.4) *
        Math.min(1, r / 20) *
        smoothstep(WORLD.islandRadius, WORLD.islandRadius - WORLD.shoreFalloff * 1.6, r);

    //  The pond basin: a smooth bowl dug below the local ground so water pools in it.
    const pondDist = Math.hypot(x - POND.x, z - POND.y);
    const basin = -2.4 * smoothstep(POND.radius + 6, 0, pondDist);

    return shelf + dome + dunes + basin;
}

/** Hermite blend between two edges; edge0 may exceed edge1 for a falling ramp. */
function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
}

/** Height of the pond's water surface. */
export const POND_SURFACE_Y = groundHeight(POND.x, POND.y) + 0.9;

/** True where the ground is sand rather than grass — for shading and footing. */
export function isBeach(x: number, z: number): boolean {
    return Math.hypot(x, z) > WORLD.beachRadius;
}

/**
 * The nodes on the island. Everything the axe recipe needs is reachable by hand — wood
 * (driftwood/deadfall), stone (outcrops), fibre (coconut palms) — so the gate chain opens
 * itself; the axe then unlocks the standing trees and the crash box.
 *
 * `y` in each node is the world **Z** metre. Nodes are single-use this cycle.
 */
export function createNodes(): WoodNode[] {
    return [
        // Driftwood — instant tap, along the landing beach.
        node('dw1', 'driftwood', -8, 96),
        node('dw2', 'driftwood', 9, 99),
        node('dw3', 'driftwood', -16, 88),
        node('dw4', 'driftwood', 15, 86),
        node('dw5', 'driftwood', 2, 82),

        // Shellfish — tap, on the wet sand near the waterline.
        node('sf1', 'shellfish', -26, 100),
        node('sf2', 'shellfish', 24, 97),
        node('sf3', 'shellfish', 6, 108),

        // Rock outcrops — hold, stone. On the beach and scrub, so stone is a pre-axe get.
        node('rk1', 'rock', -34, 70),
        node('rk2', 'rock', 30, 66),
        node('rk3', 'rock', -6, 58),

        // Coconut palms — hold, coconut + coir fibre (the pre-axe fibre source).
        node('cp1', 'coconutpalm', -40, 52),
        node('cp2', 'coconutpalm', 36, 48),

        // Reeds — tap, fibre. The OBVIOUS fibre source (D-043): clustered at the pond's edge
        // where the ground is wet, and a few scattered along the way inland.
        node('rd1', 'reed', POND.x + 8, POND.y + 4),
        node('rd2', 'reed', POND.x - 6, POND.y + 7),
        node('rd3', 'reed', POND.x + 3, POND.y - 8),
        node('rd4', 'reed', -18, 62),
        node('rd5', 'reed', 16, 58),

        // Berry bushes — tap, in the grass.
        node('bb1', 'berrybush', -14, 40),
        node('bb2', 'berrybush', 18, 36),
        node('bb3', 'berrybush', 0, 28),

        // Deadfall — hold, wood, at the inner treeline.
        node('df1', 'deadfall', -20, 52),
        node('df2', 'deadfall', 22, 56),

        // Standing trees — hold, AXE ONLY, big wood yield. Just inside the treeline.
        node('tr1', 'tree', -10, 44),
        node('tr2', 'tree', 12, 42),
        node('tr3', 'tree', -28, 34),
        node('tr4', 'tree', 26, 30),
        node('tr5', 'tree', 4, 22),

        // The sealed crash box — hold, AXE ONLY. On the beach, near the landing.
        node('box1', 'crashbox', 20, 92),

        // The quarry (D-051) — one large, visible, inland outcrop. High-capacity and
        // repeat-minable, unlike the scattered rk1-3 stone outcrops it sits apart from.
        quarryNode('qr1', -46, 22)
    ];
}

function node(id: string, kind: NodeKind, x: number, z: number): WoodNode {
    return { id, kind, x, y: z, available: true, depletedAtGameHours: null };
}

function quarryNode(id: string, x: number, z: number): WoodNode {
    return { ...node(id, 'quarry', x, z), pool: TUNE.quarryStoneCapacity };
}

/**
 * The decorative treeline and rock field — visual density behind the choppable nodes,
 * drawn as thin instances (two draw calls). Not interactive. Each entry is [x, z, height].
 */
export const TREES: ReadonlyArray<readonly [number, number, number]> = (() => {
    const out: Array<[number, number, number]> = [];
    //  A ring of forest just inside the treeline, authored by a deterministic scatter so
    //  the silhouette is composed, not random, and identical every load.
    for (let i = 0; i < 110; i++) {
        const a = i * 2.399963; // golden angle, radians
        const rr = WORLD.treelineRadius * (0.34 + 0.66 * ((i * 37) % 100) / 100);
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        if (Math.hypot(x, z) > WORLD.treelineRadius + 2) continue;
        //  Keep a clearing around the pond so its bank is reachable and readable — a pond
        //  walled in by trees is a pond you cannot drink from.
        if (Math.hypot(x - POND.x, z - POND.y) < POND.radius + 8) continue;
        //  And keep the corridor from the spawn beach to the treeline open.
        if (Math.abs(x) < 6 && z > 60) continue;
        const h = 6.5 + ((i * 53) % 40) / 10;
        out.push([Math.round(x), Math.round(z), h]);
    }
    return out;
})();

export const ROCKS: ReadonlyArray<readonly [number, number, number]> = [
    [-52, 84, 1.8], [46, 82, 2.1], [-70, 60, 1.5], [66, 56, 1.7],
    [-30, 104, 1.2], [28, 106, 1.3], [0, 112, 1.5], [-84, 30, 1.2], [82, 26, 1.3],
    [-60, -40, 1.6], [58, -44, 1.5], [-20, -70, 1.4], [24, -66, 1.5], [0, -88, 1.3]
];

/** The cold-open card (charter §I.18 rule 1: contextual onboarding, no tutorial panel). */
export const COLD_OPEN = {
    title: 'THE FIRST NIGHT',
    body: 'You wash ashore at dusk.\nCold is coming.'
} as const;
