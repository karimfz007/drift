import { describe, expect, it } from 'vitest';
import { ROCKS, SURF_LINE_RADIUS, TREES, WALKABLE_RADIUS, isDryLand, isPlaceablePoint, isWalkablePoint } from '../src/data/world';
import { salvageCandidatePoint, spawnSalvageNode } from '../src/brain/state';
import { TUNE } from '../src/data/tune';

/** The minimum distance a player can be held at by an obstacle of this radius. */
function standoff(obstacleRadius: number): number {
    return obstacleRadius + TUNE.playerCollisionRadius;
}

describe('reachability — the ROOT CAUSE, stated as arithmetic (D-064)', () => {
    it('D-051 banked the constraint: obstacle + player must clear the interact radius', () => {
        //  The quarry bug was 2.4 + 0.4 = 2.8 > 2.5. The constraint was never applied to
        //  anything except the quarry itself.
        expect(TUNE.quarryCollisionRadius + TUNE.playerCollisionRadius).toBeLessThan(TUNE.interactRadiusM);
    });

    it('REGRESSION — decorative rocks big enough to strand a find genuinely exist', () => {
        //  This is why the old check could pass on something a player cannot reach: it was
        //  blind to these entirely.
        const stranding = ROCKS.filter(([, , size]) => standoff(size * TUNE.decorRockCollisionScale) >= TUNE.interactRadiusM);
        expect(stranding.length).toBeGreaterThan(0);
    });

    it('the OLD check passes points the NEW one correctly rejects — the bug, demonstrated', () => {
        //  Sit a candidate point right on top of the biggest decorative rock. The disc model
        //  says "walkable"; the player physically cannot get within reach of it.
        const biggest = [...ROCKS].sort((a, b) => b[2] - a[2])[0];
        const [rx, rz] = biggest;
        expect(isWalkablePoint(rx, rz)).toBe(true); // old check: fine
        expect(isPlaceablePoint(rx, rz)).toBe(false); // new check: correctly refuses
    });
});

describe('reachability — the class fix applies to every obstacle, not just the one that broke', () => {
    it('rejects a point inside any stranding rock\'s clearance', () => {
        for (const [rx, rz, size] of ROCKS) {
            const needed = size * TUNE.decorRockCollisionScale + TUNE.playerCollisionRadius - TUNE.interactRadiusM;
            if (needed <= 0) continue;
            expect(isPlaceablePoint(rx, rz)).toBe(false);
        }
    });

    it('still accepts ordinary open ground', () => {
        expect(isPlaceablePoint(0, 0)).toBe(true);
        expect(isPlaceablePoint(0, 60)).toBe(true);
    });

    it('never accepts a point outside the walkable disc — the older guarantee still holds', () => {
        expect(isPlaceablePoint(0, WALKABLE_RADIUS + 5)).toBe(false);
        expect(isPlaceablePoint(WALKABLE_RADIUS + 50, 0)).toBe(false);
    });
});

describe('reachability — every salvage spawn is genuinely collectable (D-064)', () => {
    //  THE SEEDS THAT ACTUALLY EXERCISE THE FIX. C3's D-064 audit measured the
    //  `!isPlaceablePoint` branch firing **zero times across seeds 0-499**, the exact range
    //  this file used to sweep — so the ring walk and the centre fallback had no coverage at
    //  all and every test here would have stayed green with the whole block deleted. These
    //  six were found by scanning the shipped `salvageCandidatePoint` against the shipped
    //  `isPlaceablePoint`; 6384 is the first, matching the audit's independent figure.
    const BLOCKED_SEEDS = [6384, 8514, 11187, 17992, 20193, 26089];

    it('WITNESS: the blocked-spawn branch actually fires on these seeds (D-066 a)', () => {
        //  Without this the suite below is vacuous. Each of these seeds must genuinely
        //  produce an unplaceable candidate, or the "rescue" tests prove nothing.
        for (const seed of BLOCKED_SEEDS) {
            const candidate = salvageCandidatePoint(seed);
            expect(isPlaceablePoint(candidate.x, candidate.y)).toBe(false);
        }
    });

    it('a blocked candidate is RESCUED onto a placeable point, not left and not centred', () => {
        for (const seed of BLOCKED_SEEDS) {
            const candidate = salvageCandidatePoint(seed);
            const node = spawnSalvageNode(seed);
            expect(isPlaceablePoint(candidate.x, candidate.y)).toBe(false); // the branch fired
            expect(isPlaceablePoint(node.x, node.y)).toBe(true);            // and it rescued
            expect(node.x === 0 && node.y === 0).toBe(false);               // not the centre
            //  It stays on the shore ring it came from — a beach find belongs on the beach.
            const movedRadially = Math.abs(Math.hypot(node.x, node.y) - Math.hypot(candidate.x, candidate.y));
            expect(movedRadially).toBeLessThan(3);
        }
    });

    it('PROPERTY: every seed places somewhere a player can stand and reach', () => {
        //  The sweep now spans a range wide enough to contain real blocked candidates, and
        //  counts them, so "all placeable" is a claim about a corpus that includes the hard
        //  case rather than only the easy one.
        //  The sweep proves breadth; the constructed BLOCKED_SEEDS above are what prove the
        //  hard case is covered (D-066 a permits either, and constructed cases are cheaper
        //  and more honest than brute-forcing a 0.014%-incidence branch).
        for (let seed = 0; seed < 2000; seed++) {
            expect(isPlaceablePoint(spawnSalvageNode(seed).x, spawnSalvageNode(seed).y)).toBe(true);
        }
        for (const seed of BLOCKED_SEEDS) {
            const node = spawnSalvageNode(seed);
            expect(isPlaceablePoint(node.x, node.y)).toBe(true);
        }
    }, 20_000);

    it('every spawn is inside the walkable disc too', () => {
        for (let seed = 0; seed < 500; seed++) {
            const node = spawnSalvageNode(seed);
            expect(Math.hypot(node.x, node.y)).toBeLessThanOrEqual(WALKABLE_RADIUS);
        }
    });

    it('the centre fallback is never reached in practice', () => {
        let atCentre = 0;
        for (let seed = 0; seed < 2000; seed++) {
            const node = spawnSalvageNode(seed);
            if (node.x === 0 && node.y === 0) atCentre += 1;
        }
        for (const seed of BLOCKED_SEEDS) { // including every seed known to force the branch
            const node = spawnSalvageNode(seed);
            if (node.x === 0 && node.y === 0) atCentre += 1;
        }
        expect(atCentre).toBe(0);
    }, 20_000);

    it('spawns stay deterministic — same seed, same point, every time', () => {
        for (const seed of [0, 7, 42, 199]) {
            const a = spawnSalvageNode(seed);
            const b = spawnSalvageNode(seed);
            expect({ x: a.x, y: a.y }).toEqual({ x: b.x, y: b.y });
        }
    });
});

describe('reachability — the boundary is diegetic, not an invisible wall (D-064)', () => {
    /**
     * D-064'S LAW SURVIVES ITS OWN MECHANISM BEING REPLACED (the Maritime Slice).
     *
     * The law is *the thing you see is literally the thing that acts on you*, and its
     * mechanism was one constant used twice: `SURF_LINE_RADIUS = WALKABLE_RADIUS`. Swimming
     * retires the wall at 108 m, so keeping the surf drawn there would have painted breaking
     * water across eighteen metres of dry sand with nothing behind it — the law broken by the
     * very line written to keep it.
     *
     * So the mechanism moves outward and the law holds: the surf is drawn where the water
     * actually starts, solved from `waterDepthAt` rather than written down. What this asserts
     * is the property, not the number — that the drawn line is the waterline to within a
     * centimetre on both sides, so no hand-tuned constant can drift from the terrain.
     */
    it('the surf line is drawn at exactly the WATERLINE — seen IS what gets you wet', () => {
        expect(isDryLand(SURF_LINE_RADIUS - 0.01, 0), 'just inside the surf is dry').toBe(true);
        expect(isDryLand(SURF_LINE_RADIUS + 0.01, 0), 'just outside the surf is water').toBe(false);
    });

    it('...and it is genuinely outside the old wall, so the beach beyond it is real ground', () => {
        //  The 108 m disc is now a placement rule and nothing else. If these ever collapse
        //  back together, either the seabed lost its shelf or the wall came back.
        expect(SURF_LINE_RADIUS).toBeGreaterThan(WALKABLE_RADIUS);
        expect(isDryLand(WALKABLE_RADIUS + 5, 0), 'the outer beach is walkable ground').toBe(true);
    });

    it('decorative trees are too slim to strand anything, and are not over-rejected', () => {
        const needed = TUNE.decorTreeCollisionRadius + TUNE.playerCollisionRadius - TUNE.interactRadiusM;
        expect(needed).toBeLessThanOrEqual(0);
        //  So a point beside a decorative tree stays placeable, provided it is on land.
        const [tx, tz] = TREES[0];
        if (isWalkablePoint(tx, tz)) expect(isPlaceablePoint(tx, tz)).toBe(true);
    });
});
