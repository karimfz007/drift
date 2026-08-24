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

/**
 * THE HEIGHT OF WHATEVER SURFACE A THING AT THIS POINT RESTS ON — the terrain, or the sea
 * when the terrain is below it.
 *
 * THE DEFECT THIS CLOSES ([[D-124]]), and it was an INSTRUMENT defect that made a working
 * game look broken. `runtime.projectToScreen` aimed at `groundHeight(x, z) + 0.4`, which is
 * correct for every object that stands on the ground and wrong for every object that floats.
 * The Maritime Slice introduced the first floating objects; the wreck parts are the first
 * floating things that must be picked AS NODES. At the wreck the seabed is −8 m, so the
 * projection returned a point roughly seven metres BELOW the visible hull and every aimed tap
 * landed in open water. Five device checks reported the wreck unworkable; the wreck was fine.
 *
 * It lives HERE, in the pure data layer, rather than as a line inside `game.ts`, for the
 * reason this project keeps re-learning: the body has no unit coverage by construction, so a
 * rule that lives there can only ever be witnessed on a device — which is exactly how this one
 * survived two full device passes unnoticed. As a pure function of the terrain it is testable
 * in milliseconds, and `tests/wreck.test.ts` proves it reaches wreck-height objects directly
 * rather than inferring it from a green check downstream.
 *
 * NOT the same question as "where is the SURVIVOR drawn" (`drawHeightFor` in `game.ts`), and
 * deliberately not shared with it: a wading survivor stands on the seabed with their feet
 * down, while an object in the same water floats. Two different questions that agree
 * everywhere except the shallows, which is precisely where merging them would be wrong.
 */
export function surfaceHeightAt(x: number, z: number): number {
    return Math.max(groundHeight(x, z), WORLD.seaLevel);
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
 * WAVE 1 — THE OUTBOARD. A small engine torn off a boat's stern in a storm and washed ashore
 * still bolted to a fragment of transom, near enough to the arrival beach to be found early,
 * clear of every other landmark ({@link BOAT} at 14,100; {@link POND} at -22,8).
 *
 * VISIBLE FROM WORLD START, deliberately: the brief's first listed requirement is "visible on
 * the beach", and Wave 1 does not build a discovery/reveal step for it — that would be a
 * second system layered onto a slice already proving several.
 */
export const OUTBOARD = { x: 30, y: 88 } as const;

/**
 * THE DIVE SITE (the Underwater Slice) — the half of the wreck that went down.
 *
 * Placed just off the hull rather than somewhere new, because the fiction is already there:
 * the thing on the surface is what stayed up. A survivor who has crossed to the wreck can see
 * this without being told about a second destination, and the raft that got them there is the
 * raft that gets them here.
 *
 * The seabed past the shelf is a flat -8.0 and `seaLevel` is -1.0, so every point here sits
 * under exactly 7.0 m of water — which is the number the whole air budget is tuned against.
 */
export const DIVE_SITE = { x: 54, y: 252 } as const;

/**
 * THE FISHING SPOTS — four places on this island that hold fish.
 *
 * PLACED SO THE THREE METHODS ARE NOT ALL AVAILABLE EVERYWHERE, which is what stops the
 * choice between them collapsing into "always take the best one":
 *
 *   fp-pond    the freshwater pond. Shallow, so all three work — this is the one site where
 *              a player can compare them side by side, and it sits beside the water they
 *              already walk to every day for thirst.
 *   fp-north   } shore water off the beach, inside the wading band. Shallow enough to spear,
 *   fp-west    } and far enough apart that a net set at one cannot be tended at the other.
 *   fp-reef    out past the shelf, in real depth. NO spear here — you cannot brace against
 *              anything while swimming — so the deep site is a line-and-net fishery, and the
 *              depth rule teaches itself the first time somebody tries.
 *
 * Authored rather than derived: a fishery is a PLACE a survivor learns, and a spot that
 * moved between sessions would make learning it pointless.
 */
export const FISHING_SPOTS: ReadonlyArray<{ id: string; x: number; y: number }> = [
    { id: 'fp-pond', x: POND.x, y: POND.y },
    { id: 'fp-north', x: 4, y: 130 },
    { id: 'fp-west', x: -125, y: 44 },
    { id: 'fp-reef', x: 26, y: 141 },
];

/**
 * Where each submerged salvage point sits, as an offset from the site's centre in metres.
 *
 * FOUR, authored, and spread wider than one interact radius so that working the site means
 * moving between points — which is what makes a breath a budget rather than a formality. You
 * will not get all four in one descent, and that is the design.
 */
export const DIVE_PARTS: ReadonlyArray<readonly [number, number]> = [
    [-4.0, 1.5],   // the sunken hold, spilled open
    [4.5, -2.0],   // a strongbox wedged under a beam
    [1.0, 5.0],    // the engine housing
    [-5.5, -4.5],  // the ship's locker, still shut
];

/**
 * THE FAR ISLAND — the curiosity promise, made land.
 *
 * Placed BEYOND the wreck on the same bearing, so the three things a survivor can see from
 * the spawn beach line up into one story: the surf you can reach, the wreck you can paddle
 * to, and the shape past it that is clearly not weather. Each one is further than the last,
 * and each one is answered by the same raft.
 *
 * ~424 m from the island's centre and ~296 m of open water past Spawn Island's shore. That
 * number is deliberate: `swimEnergyDrainPerGameHour` buys about 218 m of swimming from a full
 * reserve, so **this island cannot be swum to, at all, ever** — it is the first place in the
 * game that is raft-only. Paddled it is ~3 real minutes each way and about 11 energy, which
 * makes it a journey to provision for rather than a gamble to survive.
 *
 * ITS SHORE COSTS NOTHING TO BUILD. `waterDepthAt`, `isDryLand`, `waterZoneAt` and
 * `surfaceHeightAt` all derive from `groundHeight`, so raising land here gives the far island
 * a real waterline, a real wading band and real walkable ground with no new rules — the whole
 * of the Maritime Slice applies to it the moment the terrain exists.
 */
export const FAR_ISLAND = {
    x: 60,
    y: 420,
    /** Smaller than home. It is a place you visit, not a second home to settle. */
    radius: 74,
    centreHeight: 7.5,
    shoreFalloff: 14,
} as const;

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
        const seabed = -WORLD.seabedDepth * smoothstep(0, 1, out);
        //  THE FAR ISLAND rises out of that seabed. `Math.max` rather than a sum, so the two
        //  landmasses cannot interfere: home's shelf is untouched (it returns before ever
        //  reaching here) and the far island simply wins wherever it is higher than the
        //  water it stands in. Its own shore, waterline and wading band then fall out of
        //  `waterDepthAt` with no new rule — see `FAR_ISLAND`.
        return Math.max(seabed, farIslandHeight(x, z));
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

/**
 * THE TRACES — three authored sites, and what each one is FOR.
 *
 * The design rule, and the reason these are not loot piles: **a trace is evidence that someone
 * else solved this, not a delivery of the solution.** Each carries a note that enters through
 * the SAME found-content channel the Survivor's Journal already uses ([[D-068]]), which means
 * it grants `conceptually-suspected` and stops there — reading about a technique is not having
 * done it, and the ladder has always said so.
 *
 * BENIGN BY CONSTRUCTION, per this pass's brief and [[D-011]]. Nothing here decays, threatens,
 * spoils, or changes while a player is away. There is no state a returning survivor can wake
 * into that they could not have walked away from, because a trace does not act at all — it
 * only ever answers being read.
 *
 * Three, not thirty. Enough that the island has something to find and a reason to walk across
 * it; far short of a settlement, which is deliberately deferred.
 */
export interface TraceSite {
    id: string;
    x: number;
    y: number;
    /**
     * What the site looks like, for the body.
     *
     * The first three are the far island's own traces. The four after them are the JUNK &
     * FLAVOUR CATALOGUE's — same type, same machinery, different catalogue (see `JUNK_SITES`).
     */
    kind: 'camp' | 'cache' | 'marker' | 'tool' | 'carving' | 'driftwood' | 'effect';
    /** One line, read on arrival — what you can SEE without touching anything. */
    sight: string;
    /** The recipe the note bears on, or null for a plain observation that teaches no craft. */
    topic: string | null;
    /**
     * The note itself, in the hand of whoever left it. Never instructions.
     *
     * NULL for an object that holds no note — the unnoted half of the junk catalogue. That is
     * a mechanical difference and not a cosmetic one: a noted object is READ, once, and is
     * spent afterwards; an unnoted one is INSPECTED, always, and records nothing. See
     * `readTrace`, which refuses a note-less site outright rather than marking it read.
     */
    note: string | null;
    /** What the site yields once, if anything. Left goods, not a reward table. */
    goods: Partial<Record<'wood' | 'fiber' | 'stone' | 'coconut' | 'metal' | 'wiring' | 'glass' | 'medicine', number>>;
}

/**
 * THE JUNK & FLAVOUR CATALOGUE (Ch.3) — FIRST REPRESENTATIVES, not the full catalogue.
 *
 * Six authored objects with NO MECHANICAL FUNCTION and real presence. They yield nothing,
 * teach no recipe, gate nothing and decay never. What they do is make the island read as a
 * place people have been, rather than a board with resources on it.
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS IS THE SAME TYPE AS A TRACE, and not a new object system.
 *
 * A trace already is: authored data, a mesh, a mesh-ray pick with a proximity fallback, a
 * SIGHT line on arrival, a NOTE on first reading, one-time contents, and a read-once record
 * in the save. That is every part a piece of junk needs. Building a second one would be a
 * second reading system, which the brief forbids and which this project has already paid for
 * twice (`worldCandidateAt`'s bare kind strings, and the pond's two ideas of "at the pond").
 *
 * SEPARATE ARRAY, SAME TYPE. `TRACE_SITES` stays exactly the far island's three, because the
 * far island's own tests and its harness section are ABOUT those three and counting them is
 * a real assertion. Junk is a different catalogue that happens to be made of the same stuff —
 * so it gets its own list and shares every mechanism through `traces.ts`.
 *
 * ---------------------------------------------------------------------------------------
 * HALF OF THEM HOLD A NOTE AND HALF DO NOT, and the difference is mechanical rather than
 * cosmetic:
 *
 *   A NOTED object is READ, once. It enters through the found-content channel [[D-068]]
 *   already shared by the Journal and the far island's traces, and it is spent afterwards.
 *
 *   An UNNOTED object is INSPECTED, always. There is nothing to consume, so it never records
 *   anything, never changes, and answers the same way on the hundredth tap as the first.
 *   What it gives back is the affordance layer's own vocabulary — observable properties and
 *   open questions, never a named answer — which is why a rusted tool head can be genuinely
 *   ambiguous without the game ever telling you what to do about it.
 *
 * EVERY ONE YIELDS NOTHING. `goods: {}` across the board, and a test locks it. That is not
 * timidity: a rusted iron head is, in fiction, METAL — and `metal` is wreck-era, the material
 * whose entire point is that a fresh castaway cannot obtain it without crossing. Junk that
 * handed one over on the spawn beach would silently undo the Wreck slice's central claim. So
 * the fiction says the rust goes all the way through, and the mechanics agree with the
 * fiction instead of quietly refusing what it promised.
 */
export const JUNK_SITES: readonly TraceSite[] = [
    // ---- SPAWN ISLAND ------------------------------------------------------------------
    {
        //  On the tideline of the home beach, where the first walk goes. The first thing this
        //  catalogue has to establish is that somebody was here before, and it should be
        //  found without looking for it.
        id: 'jk-adze',
        x: -14,
        y: 96,
        kind: 'tool',
        sight: 'A wedge of iron the size of your palm, half in the sand. Rust all the way through.',
        topic: null,
        note: null,
        goods: {},
    },
    {
        //  Inland, in the scrub between the pond and the treeline — somewhere a survivor
        //  walks past a dozen times before looking at it.
        id: 'jk-tally',
        x: -34,
        y: 30,
        kind: 'carving',
        sight: 'Notches cut into a trunk in rows of five. The last row is not finished.',
        topic: null,
        note: 'Forty-one. I stopped counting for a while and had to guess. It does not matter as much as I thought it would.',
        goods: {},
    },

    // ---- THE WRECK ---------------------------------------------------------------------
    {
        //  Wedged in the plating, at the waterline like everything else out here.
        id: 'jk-figure',
        x: 43.5,
        y: 236.5,
        kind: 'carving',
        sight: 'A little figure carved from a broom handle, jammed upright in a split seam.',
        topic: null,
        note: null,
        goods: {},
    },
    {
        id: 'jk-tin',
        x: 36.5,
        y: 243,
        kind: 'effect',
        sight: 'A mess tin, dented flat on one side, caught in the rail.',
        topic: null,
        note: 'M. HALLORAN scratched inside the lid, and under it in a different hand: he is not coming back for it.',
        goods: {},
    },

    // ---- THE FAR ISLAND ----------------------------------------------------------------
    {
        //  On the far shore, near enough to the landing to be the second thing found there
        //  after the cold fire ring — so the far island keeps building the same story.
        id: 'jk-plank',
        x: FAR_ISLAND.x + 11,
        y: FAR_ISLAND.y - 48,
        kind: 'driftwood',
        sight: 'A plank end, salt-bleached. Square holes cut through it at even spacing.',
        topic: null,
        note: null,
        goods: {},
    },
    {
        id: 'jk-boots',
        x: FAR_ISLAND.x - 26,
        y: FAR_ISLAND.y - 41,
        kind: 'effect',
        sight: 'A pair of boots set side by side above the tideline, laces tucked in.',
        topic: null,
        note: 'Whoever finds these: the water on the east side is fresh. I could not tell you that in time to help.',
        goods: {},
    },
];

/**
 * THE FISHING BOAT — "THE PULL: THE WAY HOME, VISIBLE" (Laws 124–125).
 *
 * SHE ARRIVES AT B0: beached, hull holed, engineless. She does not STAY there — the ladder to
 * B1 and B2 lives in `boat.ts`, and a survivor can walk her all the way to floating. But where
 * she SITS never changes, and that is what this file decides: she is worked on exactly where
 * she was first seen, so the horizon below is the same horizon over the shoulder of every repair.
 *
 * ---------------------------------------------------------------------------------------
 * THE VISUAL SENTENCE, which is the reason the coordinates are what they are.
 *
 * The Far Island sits at (60, 420) — a bearing of about 8 degrees east of north from the
 * island's centre. The Wreck sits at (40, 240), on very nearly the same line. So there is
 * already a sentence written across this map and nobody was standing anywhere to read it.
 *
 * The boat is placed on the NORTH shore, on that same bearing, so that a survivor standing at
 * it and looking out sees all three things in one view, in order of distance:
 *
 *      the boat you are standing at  ->  the wreck that put you here  ->  the island beyond
 *
 * "There, and this is how." That is one composition rather than three placements, and it is
 * why the boat is not simply dropped on the nearest beach.
 *
 * SPAWN ISLAND, deliberately — not the Far Island, and reachable on an ordinary shore walk
 * with no raft. A promise you must already have crossed the sea to see is not a promise.
 */
export const BOAT = { x: 14, y: 100 } as const;

/**
 * FOUND DOCUMENTS — the manual route (Law 125), and the reason it is its own small catalogue.
 *
 * A third array of the same `TraceSite` type, for the same reason `JUNK_SITES` is a second
 * one: `TRACE_SITES` is the far island's own three and its tests count them. This is one
 * document, on home ground, and it is the only site in the game that carries a TOPIC other
 * than the far island's raft note — which is exactly what makes `ladderFor` answer for it
 * without a line of new ladder code.
 *
 * IT IS NOT AT THE BOAT. Finding the hull and finding the manual are two separate acts, so a
 * survivor can meet either first and neither is a prerequisite for the other. That is Law
 * 125's "two paths, neither mandatory" applied to the geography as well as to the mechanism.
 */
export const MANUALS: readonly TraceSite[] = [
    {
        id: 'mn-boatbook',
        //  In the scrub above the tideline, well east of the boat: on the same shore walk,
        //  found separately.
        x: 52,
        y: 78,
        kind: 'cache',
        sight: 'A dry-bag wedged under a rock, folded over twice and still holding.',
        //  THE TOPIC IS WHAT MAKES THE LADDER ANSWER. `traceSuggests` walks every site and
        //  matches on this string; `ladderFor` reads that and returns `conceptually-suspected`
        //  for 'boat'. No new ladder branch, no parallel knowledge track.
        topic: 'boat',
        note: 'Hull first, always. Patch her dry, seal her, THEN worry about power — I did it the other way round and lost a season to it.',
        goods: {},
    },
];

export const TRACE_SITES: readonly TraceSite[] = [
    {
        id: 'tr-camp',
        //  On the near shore, so the first thing a survivor finds after landing is that
        //  someone landed here before them.
        x: FAR_ISLAND.x - 6,
        y: FAR_ISLAND.y - 52,
        kind: 'camp',
        sight: 'A fire ring, long cold. The stones are set the way you set yours.',
        //  A raft note, on the beach where a raft would have been dragged up. It confirms the
        //  crossing was survivable for someone else, which is the one thing worth knowing here.
        topic: 'raft',
        note: 'Third try before it held. Lash the cross-pieces UNDER the deck, not over — mine came apart over.',
        goods: { fiber: 4, wood: 3 },
    },
    {
        id: 'tr-cache',
        //  Inland and east: far enough that finding it means crossing the island.
        x: FAR_ISLAND.x + 34,
        y: FAR_ISLAND.y + 12,
        kind: 'cache',
        sight: 'A box wedged under a rock overhang, deliberately out of the rain.',
        topic: null,
        note: 'Leaving what I cannot carry. If you are reading this you got further than I did.',
        //  Wreck-era goods, because whoever left them had crossed too. This is the only
        //  source of salvage outside the wreck itself, and it is a one-time find.
        goods: { metal: 2, medicine: 1 },
    },
    {
        id: 'tr-marker',
        //  The high point. A marker you can see from the landing, so the island reads as
        //  having a somewhere-to-go rather than being a disc with objects on it.
        x: FAR_ISLAND.x + 4,
        y: FAR_ISLAND.y + 44,
        kind: 'marker',
        sight: 'A cairn, shoulder-high, with a flat stone laid on top like a full stop.',
        topic: null,
        note: 'Nine of us came ashore. I am writing this alone. Do not wait for the season to turn.',
        goods: {},
    },
];

/**
 * The far island's own height field, in the same analytic style as home's: a dome that falls
 * to nothing at its rim. Returns a large NEGATIVE well outside its radius so `Math.max`
 * against the seabed leaves open water exactly as it was.
 *
 * Deliberately simpler than `groundHeight`'s island — no dunes, no basin. This pass ships the
 * island EXISTING and REACHABLE with a handful of traces on it; giving it its own geology,
 * forage and weather is the fuller buildout, and is named as deferred rather than half-done.
 */
export function farIslandHeight(x: number, z: number): number {
    const d = Math.hypot(x - FAR_ISLAND.x, z - FAR_ISLAND.y);
    if (d >= FAR_ISLAND.radius) return -Infinity;
    //  Flat-ish shelf inside, falling away over `shoreFalloff` to the waterline — the same
    //  shape that gives home a beach you can wade off rather than a cliff you fall off.
    const t = 1 - d / FAR_ISLAND.radius;
    const dome = FAR_ISLAND.centreHeight * t * t * (3 - 2 * t);
    const shelf = smoothstep(FAR_ISLAND.radius, FAR_ISLAND.radius - FAR_ISLAND.shoreFalloff, d);
    return dome * shelf - WORLD.seabedDepth * (1 - shelf);
}

/** Hermite blend between two edges; edge0 may exceed edge1 for a falling ramp. */
function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
}

/** Height of the pond's water surface. */
export const POND_SURFACE_Y = groundHeight(POND.x, POND.y) + 0.9;

/**
 * IS THIS POINT ON THE POND'S ACTUAL WATER — the one boundary every pond interaction asks.
 *
 * THREE FIXES FAILED BEFORE THIS ONE, each shrinking a different scalar, because the drawn
 * water is NOT a circle and no radius can describe it. It is an INTERSECTION: the disc
 * `island.ts` draws at `POND.radius`, AND the ground beneath being lower than the water
 * plane the disc sits on. The basin (`groundHeight`'s own smoothstep) fades out at
 * `POND.radius + 6` — six metres WIDER than the disc and far gentler — so on the side facing
 * the island the terrain climbs back above `POND_SURFACE_Y` at 4.30 m while the disc keeps
 * going to 9. Those outer metres of disc are buried: the material is transparent and
 * depth-tested, so they are neither drawn nor pickable, and the player sees hillside.
 *
 * MEASURED ON THE SHIPPED TERRAIN, so the numbers here are read rather than estimated: the
 * water's true edge runs 4.30 m to 9.00 m from centre depending on bearing, 39.7% of the disc
 * is dry, and the deepest false positive sits 4.73 m inside the rim. A gate written
 * `distance <= POND.radius` admitted all of it — visibly not water, and exactly the "still
 * too wide" that survived two rounds of shrinking numbers. A boundary that varies by more
 * than a factor of two across bearings was never expressible as a scalar. The fix is to stop maintaining a number at all: this reads the SAME
 * geometry the renderer reads, so the boundary cannot drift from what is drawn because it is
 * derived from it.
 *
 * The one residual is sub-centimetre and named rather than hidden: the disc is a 28-gon, so
 * its true rim breathes between `POND.radius * cos(pi/28)` (8.9434 m) at the flat midpoints
 * and `POND.radius` at the vertices. This admits at most 5.7 cm beyond the flats — under a
 * tenth of a stride, and below the resolution of any tap.
 */
export function isOnPondWater(x: number, z: number): boolean {
    if (Math.hypot(x - POND.x, z - POND.y) > POND.radius) return false;
    return groundHeight(x, z) < POND_SURFACE_Y;
}

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
        //  ON THE BANK, NOT IN THE WATER (item 5). `rd1` sat 8.94 m from the pond centre and
        //  `rd3` 8.54 m, against a drawn radius of 9 — so two of the three pondside reeds were
        //  literally inside the water, and gathering them meant standing in the drink zone by
        //  construction. Reeds grow at the water's EDGE, so moving them out is the truthful
        //  placement as well as the one that stops the two verbs fighting.
        //  NOTE: `hydrate` preserves a save's own nodes, so an existing run keeps the old
        //  positions and only new lives get the bank — the radius fix above is what helps a
        //  save already in progress.
        node('rd1', 'reed', POND.x + 9.5, POND.y + 4.5),
        node('rd2', 'reed', POND.x - 7, POND.y + 8),
        node('rd3', 'reed', POND.x + 3.5, POND.y - 10),
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

        //  ---- THE FISHING SPOTS -------------------------------------------------------
        //
        //  Ordinary nodes, because the node model IS the two-state population this needs:
        //  `available` is present/locally-depleted, `pool` is how many catches are left in
        //  it, and `depletedAtGameHours` + `regrowGameHoursFor` bring it back. Not one line
        //  of parallel depletion machinery, which was the point.
        ...FISHING_SPOTS.map((s) => ({ ...node(s.id, 'fishingspot', s.x, s.y), pool: TUNE.fishSpotPool })),

        //  ---- THE DIVE SITE (the Underwater Slice) --------------------------------------
        //
        //  Ordinary nodes, worked with the ordinary verb. Everything that makes them different
        //  is the water above them: `divePartEffortEnergy` costs more than the wreck's because
        //  you are doing it without breathing, and the air budget is running the whole time.
        ...DIVE_PARTS.map(([dx, dz], i) => node(`dv${i + 1}`, 'divepart', DIVE_SITE.x + dx, DIVE_SITE.y + dz)),

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
export const WRECK_PARTS: ReadonlyArray<readonly [number, number]> = [
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
/**
 * WHAT IS ON THE AIR — DROP 5, one rung of **ENDING E03** ("A Voice in the Static").
 *
 * REGISTER NAMED per [[D-138]]: ENDING E03, not the CAPABILITY register's E03.
 *
 * THREE FRAGMENTS, AND NONE OF THEM IS FOR YOU. A call sign, a schedule, a bearing — the three
 * things that prove a timetable exists without proving anybody knows you do. Read them in
 * order and what accumulates is not hope: it is the shape of a world still running, kept by
 * people who have never heard of this island.
 *
 * NOBODY ANSWERS, and the writing carries that rather than relying on the mechanics to. Every
 * line is somebody talking to somebody else. There is no address, no acknowledgement, no
 * silence-then-reply. The set cannot transmit; the prose must not imply that it could.
 *
 * THE HOURS ARE SPREAD ACROSS THE DAY on purpose — one before dawn, one in the afternoon, one
 * late — so learning the timetable means listening at three different costs of daylight, and
 * so no single sitting can collect them all.
 */
export interface Signal {
    id: string;
    /** Island-clock hour this traffic keeps. The window is `radioTrafficWindowGameHours`. */
    atHourOfDay: number;
    callSign: string;
    /** What comes through the speaker, in their words. */
    text: string;
    /** What a survivor would actually write in a journal about it. */
    logged: string;
}

export const SIGNALS: readonly Signal[] = [
    {
        id: 'sg-schedule',
        atHourOfDay: 5,
        callSign: 'MARIA ELENA',
        text: 'Maria Elena, Maria Elena — position as scheduled, nets down at first light. '
            + 'Nothing further.',
        logged: 'A working boat. Keeps to a schedule and says so out loud.',
    },
    {
        id: 'sg-bearing',
        atHourOfDay: 14,
        callSign: 'STATION NINE',
        //  NO SECOND PERSON, anywhere. The first cut ended "Advise you stand off until the
        //  turn" — addressed to all traffic, but the suite's own guard read the `you` and was
        //  right to: a listener who is not being spoken to must never find a word aimed their
        //  way, however incidentally it got there.
        text: 'Station Nine to all traffic: bearing two-seven-zero from the light, '
            + 'set is running hard. Advise standing off until the turn.',
        logged: 'Station Nine. Bearing two-seven-zero from a light. There is a light somewhere.',
    },
    {
        id: 'sg-callsign',
        atHourOfDay: 22,
        callSign: 'KESTREL',
        //  "We have you" was the first cut, and the `you` is Kestrel — but a listener reads it
        //  as theirs for a beat before the sentence corrects them, and that beat is the exact
        //  softening this drop must not make. Third person throughout, and the good night is
        //  still said. It is simply said to somebody else.
        text: 'Kestrel, Kestrel — signal received, loud and clear. Same time tomorrow. '
            + 'Good night, Kestrel.',
        logged: 'Kestrel. Someone had them, and said good night. Same time tomorrow.',
    },
];

/**
 * THE FOREST CRASH SITE — Drop 3B(i), and a DIFFERENT PLACE from the Wreck.
 *
 * TRAJECTORY, NOT A ROLL. It comes down on the same bearing the wreck lies on — something on
 * the route that the sea already has one of — and carries on over the island to fall inland.
 * The coordinates below are that line continued past the shore, so the smoke, the site and the
 * direction it came from can never disagree with each other.
 *
 * INSIDE THE TREELINE on purpose (`WORLD.treelineRadius` is 66): the column has to rise OVER
 * the trees to be the announcement Law 26 asks for. A crash on open sand would be a thing you
 * simply see, which is a different and much smaller beat.
 */
export const CRASH_SITE = { x: -18, y: 34 } as const;

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
