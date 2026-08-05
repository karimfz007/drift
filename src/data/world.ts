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
    seaRadius: 900,
    /** How far past the island's edge the seabed takes to reach its floor, in metres. */
    seabedFalloff: 28,
    /** How deep the seabed gets, in metres below the island's own zero. */
    seabedDepth: 8
} as const;

/** Where the castaway can walk: anywhere on land, kept just clear of the waterline. */
export const WALKABLE_RADIUS = WORLD.islandRadius - WORLD.shoreFalloff - 2;

/**
 * True for any point genuinely reachable on foot (FIX-3, Living Island Track A). Root
 * cause this closes: `spawnSalvageNode`'s old radius bound (`islandRadius - 4` = 118 m)
 * reached up to 10 m past `WALKABLE_RADIUS` (108 m) — technically "on the island" by the
 * raw disc math, but inside the shore falloff, in or at the waterline. A general-purpose
 * check, not a one-off patch, so any future procedural placement (not just salvage) has a
 * single source of truth for "can the castaway actually stand here."
 *
 * WHAT THE MARITIME SLICE CHANGES ABOUT IT: nothing, and that is the point. This constant
 * has always done two jobs at once — *where things may be placed* and *where the world ends*
 * — and only the second one was ever a wall. Swimming lifts the wall; the placement rule
 * keeps its exact numbers, so no salvage spawn, no node, and no certified feel-court reading
 * moves by a millimetre. A survivor may now walk PAST `WALKABLE_RADIUS`, onto the outer
 * beach, into the shallows, and off the shelf. Nothing may be SPAWNED there.
 *
 * The predicate for "is this person standing on dry ground" is `isDryLand` below, and it is
 * read from the terrain itself rather than from a radius, so the rule and the picture cannot
 * drift apart.
 */
export function isWalkablePoint(x: number, z: number): boolean {
    return Math.hypot(x, z) <= WALKABLE_RADIUS;
}

/**
 * HOW DEEP THE WATER IS HERE, in metres. Zero or below means dry ground.
 *
 * Derived from `groundHeight` and `WORLD.seaLevel` and from nothing else — there is no water
 * radius constant anywhere, on purpose. D-064 made the walkable edge diegetic by drawing the
 * rule; this makes it structural by deleting the second copy: the shore is wherever the land
 * happens to be lower than the sea, so a change to either one moves both the shoreline and
 * the swimming rule in the same breath.
 *
 * The pond is NOT sea and can never read as it: its basin bottoms out around +5 m, far above
 * `seaLevel`, so `waterDepthAt` at the pond is comfortably negative. Fresh water has its own
 * system (`isAtPond`) and keeps it.
 */
export function waterDepthAt(x: number, z: number): number {
    return WORLD.seaLevel - groundHeight(x, z);
}

/** Dry ground you can stand on — the honest replacement for "inside the walkable disc". */
export function isDryLand(x: number, z: number): boolean {
    return waterDepthAt(x, z) <= 0;
}



/** Washed ashore on the south beach, facing inland (toward −Z / the treeline). */
export const SPAWN = { x: 0, y: 104 } as const;

/** The freshwater pond, inland and slightly west. The first answer to the first demand. */
export const POND = { x: -22, y: 8, radius: 9 } as const;

/**
 * THE CAVE (Drop 3 Part 2 item 2) — inland and east, deliberately AWAY from the pond.
 *
 * Placed so the two things a survivor most needs at night are not in the same place. Putting
 * the cave beside the water would make one walk solve everything and the map's whole question
 * — where do I settle, and what do I give up — would answer itself.
 */
export const CAVE_SITE = { x: 48, y: -34 } as const;

/**
 * THE WRECK OFFSHORE. Visible from the spawn beach since Cycle 03, unexplained, and — for
 * five cycles — unreachable, because the world ended 135 metres short of it.
 *
 * The Maritime Slice does not move it, redress it, or explain it. It removes the only reason
 * it was unreachable. It is 243 m from the island's centre and roughly 115 m of open water
 * past the shore, which is the number the whole crossing is measured against: far enough that
 * swimming it is a decision with a body count, near enough that a raft turns it into a
 * journey rather than a fantasy.
 */
export const WRECK = { x: 40, y: 240, heightM: 9 } as const;

/**
 * Ground height at a point, in metres. A flat shelf holds the island above the waterline,
 * a dome rises to the treeline, gentle dunes texture the beach, and the pond basin dips
 * below the shelf so water sits in it. One cheap analytic call — no heightmap to download,
 * no physics mesh to build — shared by the terrain mesh, the player's feet, and collision.
 */
export function groundHeight(x: number, z: number): number {
    const r = Math.hypot(x, z);
    //  THE SEABED HAS A BODY (the Maritime Slice). What stood here was a flat
    //  `WORLD.seaLevel - 0.6` for every point outside the island — a cliff at exactly
    //  `islandRadius`, from ground ≈ 0 to −1.6 in no distance at all.
    //
    //  That was correct while the island's edge was also the world's edge: nobody could ever
    //  stand on it, so its shape did not matter. Swimming makes it matter — a survivor wading
    //  out needs the ground to fall away UNDER them, or "wading" and "swimming" are two words
    //  for the same instant. So the seabed now shelves.
    //
    //  BIT-FOR-BIT UNCHANGED INSIDE `islandRadius`, deliberately: every node, every spawn,
    //  every placement rule and the whole certified feel court live at r ≤ 112, and none of
    //  them may move because the water got a floor. The ramp starts at 0 to meet the inner
    //  surface, which itself reaches ≈ 0 there, so the two halves join without a step.
    if (r >= WORLD.islandRadius) {
        const out = Math.min(1, (r - WORLD.islandRadius) / WORLD.seabedFalloff);
        return -WORLD.seabedDepth * smoothstep(0, 1, out);
    }

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
        // tr1–tr5 are the original authored five; tr6+ are the treeline spots promoted to
        // real nodes at D-059 to bring trees to parity with how rocks already work (see
        // HARVESTABLE_TREE_SPOTS above). Ids stay stable across loads because the promotion
        // is a deterministic stride over a deterministic scatter — which is what lets the
        // save migration match them up.
        node('tr1', 'tree', -10, 44),
        node('tr2', 'tree', 12, 42),
        node('tr3', 'tree', -28, 34),
        node('tr4', 'tree', 26, 30),
        node('tr5', 'tree', 4, 22),
        ...HARVESTABLE_TREE_SPOTS.map(([x, z], i) => node(`tr${i + 6}`, 'tree', x, z)),

        // The sealed crash box — hold, AXE ONLY. On the beach, near the landing.
        node('box1', 'crashbox', 20, 92),

        // The quarry (D-051) — one large, visible, inland outcrop. High-capacity and
        // repeat-minable, unlike the scattered rk1-3 stone outcrops it sits apart from.
        quarryNode('qr1', -46, 22),

        //  ---- THE WRECK (the Wreck Slice) ----------------------------------------------
        //
        //  Six workable parts, authored at fixed offsets around the hull at `WRECK`. They are
        //  ordinary `wreckpart` nodes, so they inherit the whole shipped harvest spine for
        //  free — the gather verb, the reach check, the effort cost through the One Body
        //  Resolver, the depleted visual, and the regrow clock. Nothing about working the
        //  wreck is a parallel mechanic; it is the island's own verb, used 115 m offshore.
        //
        //  SPREAD AROUND THE HULL rather than stacked on it, so "explore the wreck" means
        //  moving around a structure and finding the parts, not tapping one point six times.
        //  The offsets are inside `wreckArrivalRadiusM` (14 m), so every one of them is
        //  reachable from a raft moored alongside.
        //
        //  v0_10's Zone U0 is the design this matches — *"the boundary where waves, tide and
        //  wreckage repeatedly move"* — and its ruling on what a wreck IS: **a worksite, not a
        //  treasure room.** That is why these are worked, not opened.
        ...WRECK_PARTS.map(([dx, dz], i) => node(`wr${i + 1}`, 'wreckpart', WRECK.x + dx, WRECK.y + dz)),

        //  THE BOULDER FORMATION (Drop 2) — the bedrock bluff that closes the ONLINE half of
        //  the renewability law. Placed apart from both the scattered outcrops and the
        //  quarry, so the island's three stone tiers are three visibly different places: you
        //  pick stone off the ground, you mine the seam until it is gone forever, and you
        //  work the bluff for as long as you are willing to.
        node('bo1', 'boulder', 38, -34)
    ];
}

/**
 * Where each workable part of the wreck sits, as an offset from the hull's centre in metres.
 *
 * Authored rather than scattered: this is a specific broken ship, and a survivor who learns
 * that the instrument housing is off the port bow has learned something about a PLACE. A
 * procedural scatter would make every visit a fresh search of the same water.
 */
const WRECK_PARTS: ReadonlyArray<readonly [number, number]> = [
    [-6.5, 2.0],   // hull plating, low on the listing side
    [5.5, -1.5],   // the buckled deck rail
    [1.5, 6.0],    // instrument housing, off the bow
    [-3.0, -6.5],  // a sprung cargo locker
    [7.0, 4.5],    // the cable run where the mast came down
    [-7.5, -4.0],  // the ship's medical store
];

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
/**
 * Every authored treeline position — the deterministic scatter that composes the forest
 * silhouette. Split below into the ones that are REAL, harvestable nodes and the ones that
 * stay decorative scenery.
 */
const TREE_SPOTS: ReadonlyArray<readonly [number, number, number]> = (() => {
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

/**
 * TREE PARITY (D-059). The director reported the same disease D-051 already cured once for
 * the original five-tree scarcity: nearly every tree on the island was decorative scenery,
 * visually identical to the handful that were real, so a tap on one of the ~101 fakes fell
 * silently through to the terrain (D-051's own root cause — a decorative instance is
 * `isPickable: false`, and the fail-loud law is structurally blind to a pure miss).
 *
 * The fix is matched to how ROCKS already work rather than to a guessed number. Measured
 * before changing anything: **3 real rock nodes against 14 decorative meshes — 3:14, or
 * 17.6% of all rock objects being real.** Trees were 5 against 101, i.e. 4.7%. Promoting
 * `PROMOTED_TREE_COUNT` of the authored spots to real nodes brings trees to 19:87 — 17.9%
 * — the closest whole-tree match to the rock ratio available (18 real would give 16.98%,
 * further off).
 *
 * Promotion walks the spot list on a fixed stride rather than taking a contiguous block, so
 * the harvestable trees are spread evenly around the whole treeline instead of clustering
 * in one arc — a player should not have to learn which quadrant is the "real" forest.
 * Everything downstream is the EXISTING machinery, untouched: these become ordinary `tree`
 * nodes, so they inherit the blaze mark, the axe gate, the stump/sapling depleted states,
 * and the 96-hour regrowth exactly as tr1–tr5 always did. This is content scope, not a new
 * system.
 */
const PROMOTED_TREE_COUNT = 14;

const PROMOTED_TREE_INDICES: ReadonlySet<number> = (() => {
    const picks = new Set<number>();
    if (TREE_SPOTS.length > 0) {
        const stride = TREE_SPOTS.length / PROMOTED_TREE_COUNT;
        for (let i = 0; i < PROMOTED_TREE_COUNT; i++) picks.add(Math.floor(i * stride));
    }
    return picks;
})();

/** The authored spots promoted to real, harvestable tree nodes (D-059). */
export const HARVESTABLE_TREE_SPOTS: ReadonlyArray<readonly [number, number, number]> =
    TREE_SPOTS.filter((_, i) => PROMOTED_TREE_INDICES.has(i));

/** Decorative treeline scenery — every authored spot that was NOT promoted. Thin-instanced
 *  and `isPickable: false`, exactly as before; a promoted spot is removed from here so no
 *  position is ever drawn twice. */
export const TREES: ReadonlyArray<readonly [number, number, number]> =
    TREE_SPOTS.filter((_, i) => !PROMOTED_TREE_INDICES.has(i));

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

/**
 * REACHABILITY, THIRD STRIKE (D-064) — the CLASS fix, not another coordinate patch.
 *
 * `isWalkablePoint` above models the island as a bare disc. It is correct about the
 * waterline and knows **nothing** about the ~101 decorative trees and 14 decorative rocks
 * that are real collision obstacles (`island.ts` pushes every one of them into
 * `staticObstacles`). A spawn validated only against the disc can therefore land hard
 * against a decorative rock, and the player's own collision push-out then holds them
 * further away than they can reach.
 *
 * **That is D-051's quarry arithmetic, never applied to spawns.** D-051 banked the
 * constraint as standing — `objectCollisionRadius + playerCollisionRadius < interactRadiusM`
 * — and it was only ever enforced for the one object that had already broken. Run against
 * the real decorative rock sizes, **4 of the 8 distinct sizes exceed it**: a size-2.1 rock
 * has a 2.94 m collision radius, so the nearest legal standing point is 3.34 m from its
 * centre against a 2.5 m reach. Anything spawned beside one is physically uncollectable
 * while being, by the old check, perfectly "reachable".
 *
 * This is the generic form: a point is placeable only if a player can both STAND near it
 * and REACH it — so it must clear every obstacle by enough room to interact. Any future
 * procedural placement gets the same guarantee for free by calling this instead.
 */
export function isPlaceablePoint(x: number, z: number): boolean {
    if (!isWalkablePoint(x, z)) return false;
    for (const [ox, oz, size] of ROCKS) {
        //  Mirrors island.ts's own obstacle radius for a decorative rock, exactly.
        const obstacle = size * TUNE.decorRockCollisionScale;
        //  The player is pushed out to `obstacle + playerCollisionRadius`; from there the
        //  node must still be within reach. Clearance needed is therefore the push-out
        //  distance MINUS what the arm can cover.
        const needed = obstacle + TUNE.playerCollisionRadius - TUNE.interactRadiusM;
        if (needed > 0 && Math.hypot(x - ox, z - oz) < needed) return false;
    }
    for (const [tx, tz] of TREES) {
        const needed = TUNE.decorTreeCollisionRadius + TUNE.playerCollisionRadius - TUNE.interactRadiusM;
        if (needed > 0 && Math.hypot(x - tx, z - tz) < needed) return false;
    }
    return true;
}

/**
 * THE DIEGETIC SHORELINE (D-064, corrected by the Maritime Slice).
 *
 * D-064's law was *the thing you see is literally the thing that stops you*, and its
 * mechanism was `SURF_LINE_RADIUS = WALKABLE_RADIUS` — one constant, two uses, no way for the
 * picture and the wall to disagree.
 *
 * Swimming retires the wall, so keeping the surf drawn at 108 m would have made that line a
 * LIE in the most literal way available: a band of breaking water painted across dry sand,
 * eighteen metres inland of the sea, with nothing behind it. The law survives; its mechanism
 * moves one step outward. The surf is now drawn where `waterDepthAt` first reaches zero — so
 * *the thing you see is literally the thing that gets you wet*, and it is still derived, still
 * single-source, and still incapable of drifting from the rule it pictures.
 *
 * Solved numerically rather than written down, for exactly that reason: a hand-tuned 128.3
 * would be a second source of truth the moment anyone touched the seabed.
 */
export const SURF_LINE_RADIUS = (() => {
    //  The seabed beyond `islandRadius` is purely radial (no dunes term), so one bearing
    //  answers for every bearing. Bisection: land inside, water outside.
    let lo: number = WORLD.islandRadius;
    let hi: number = WORLD.islandRadius + WORLD.seabedFalloff;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (waterDepthAt(mid, 0) <= 0) lo = mid; else hi = mid;
    }
    return Math.round(((lo + hi) / 2) * 100) / 100;
})();
