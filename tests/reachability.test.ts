import { describe, expect, it } from 'vitest';
import { ROCKS, SURF_LINE_RADIUS, TREES, WALKABLE_RADIUS, isPlaceablePoint, isWalkablePoint } from '../src/data/world';
import { spawnSalvageNode } from '../src/brain/state';
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
    it('PROPERTY: 500 seeds all place somewhere a player can stand and reach', () => {
        for (let seed = 0; seed < 500; seed++) {
            const node = spawnSalvageNode(seed);
            expect(isPlaceablePoint(node.x, node.y)).toBe(true);
        }
    });

    it('every spawn is inside the walkable disc too', () => {
        for (let seed = 0; seed < 500; seed++) {
            const node = spawnSalvageNode(seed);
            expect(Math.hypot(node.x, node.y)).toBeLessThanOrEqual(WALKABLE_RADIUS);
        }
    });

    it('a blocked spawn walks the ring rather than teleporting to the island centre', () => {
        //  The old fallback dumped a blocked beach find at (0,0). Across 500 seeds almost
        //  none should end up there now — a beach find belongs on the beach.
        let atCentre = 0;
        for (let seed = 0; seed < 500; seed++) {
            const node = spawnSalvageNode(seed);
            if (node.x === 0 && node.y === 0) atCentre += 1;
        }
        expect(atCentre).toBe(0);
    });

    it('spawns stay deterministic — same seed, same point, every time', () => {
        for (const seed of [0, 7, 42, 199]) {
            const a = spawnSalvageNode(seed);
            const b = spawnSalvageNode(seed);
            expect({ x: a.x, y: a.y }).toEqual({ x: b.x, y: b.y });
        }
    });
});

describe('reachability — the boundary is diegetic, not an invisible wall (D-064)', () => {
    it('the surf line is drawn at exactly the walkable radius — seen IS enforced', () => {
        expect(SURF_LINE_RADIUS).toBe(WALKABLE_RADIUS);
    });

    it('decorative trees are too slim to strand anything, and are not over-rejected', () => {
        const needed = TUNE.decorTreeCollisionRadius + TUNE.playerCollisionRadius - TUNE.interactRadiusM;
        expect(needed).toBeLessThanOrEqual(0);
        //  So a point beside a decorative tree stays placeable, provided it is on land.
        const [tx, tz] = TREES[0];
        if (isWalkablePoint(tx, tz)) expect(isPlaceablePoint(tx, tz)).toBe(true);
    });
});
