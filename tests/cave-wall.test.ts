/**
 * THE CAVE IS SOLID — all of it — AND THE MOUTH IS A DOORWAY.
 *
 * THE DEFECT, MEASURED RATHER THAN ASSERTED. The bluff shipped with ONE collider: radius 4.2,
 * offset 2.6 m back so the mouth stayed walkable. Walking a survivor in from each bearing and
 * resolving collision every step — which is what the game does, and is not the same as sampling
 * points — gives:
 *
 *     bearing        old single circle        this ring
 *     mouth (+y)     1.94 m of centre         0.00 m
 *     side  (+x)     1.94 m of centre         5.54 m
 *     side  (-x)     1.94 m of centre         5.54 m
 *     back  (-y)     7.14 m of centre         5.54 m
 *
 * The bluff's base is 9.6 m across — radius 4.8. So the old collider let a survivor walk in
 * from either SIDE and stand 1.94 m from the centre: three metres INSIDE solid rock. That is
 * the collision defect, and it is a different thing from the mouth-stays-walkable work, which
 * was already right and stays right.
 *
 * WHY ONE CIRCLE COULD NEVER DO IT. Cover the mass and the survivor is walled out of the one
 * place they are trying to reach — [[D-051]]'s unminable quarry in new geometry, and the reason
 * the offset existed. Shrink it and the rock is a ghost. A ring with the mouth's sector left
 * out is the only shape that answers both at once.
 *
 * THE PROBE WALKS. My first version SAMPLED points at each distance and asked whether `pushOut`
 * moved them, which reported the new wall as letting everything through — a point dropped at
 * the cave's centre is inside no block and is therefore left alone. Teleporting is not walking,
 * and a collision model only means anything against motion.
 */
import { describe, expect, it } from 'vitest';
import { pushOut, ringIsContinuous, ringObstacles, type Obstacle } from '../src/brain';
import { TUNE } from '../src/data/tune';
import { CAVE_SITE } from '../src/data/world';

const WALL = (): Obstacle[] => ringObstacles(CAVE_SITE.x, CAVE_SITE.y, {
    ringRadius: TUNE.caveWallRingRadiusM,
    count: TUNE.caveWallBlocks,
    radius: TUNE.caveWallBlockRadiusM,
    openBearingRad: 0,
    openHalfAngleRad: TUNE.caveMouthOpenHalfAngleRad,
});

/** The collider as it shipped before this fix, kept so the defect stays reproducible. */
const OLD_COLLIDER: Obstacle[] = [{ x: CAVE_SITE.x, z: CAVE_SITE.y - 2.6, radius: TUNE.caveCollisionRadiusM }];

/** A REAL walk: step toward the centre and resolve collision each step, as the game does. */
function walkIn(obstacles: readonly Obstacle[], bearingRad: number, radius = 0.34): number {
    let x = CAVE_SITE.x + Math.sin(bearingRad) * 9;
    let z = CAVE_SITE.y + Math.cos(bearingRad) * 9;
    const dx = -Math.sin(bearingRad);
    const dz = -Math.cos(bearingRad);
    let closest = Infinity;
    let stuck = 0;
    for (let i = 0; i < 400; i += 1) {
        const out = pushOut(x + dx * 0.06, z + dz * 0.06, radius, obstacles);
        const moved = Math.hypot(out.x - x, out.z - z);
        x = out.x;
        z = out.z;
        closest = Math.min(closest, Math.hypot(x - CAVE_SITE.x, z - CAVE_SITE.y));
        if (moved < 0.005) { stuck += 1; if (stuck > 6) break; } else stuck = 0;
    }
    return closest;
}

/** The bluff's own footprint: `diameterBottom` 9.6 in `CaveView`. */
const BLUFF_RADIUS_M = 4.8;

describe('the defect, reproduced against the collider that shipped', () => {
    it('the OLD single circle let a survivor walk THREE METRES INSIDE the rock, from either side', () => {
        for (const bearing of [Math.PI / 2, -Math.PI / 2]) {
            const reached = walkIn(OLD_COLLIDER, bearing);
            expect(reached, `reached ${reached.toFixed(2)} m of centre — that is outside the bluff, so this is not the defect`)
                .toBeLessThan(BLUFF_RADIUS_M);
        }
    });
});

describe('the wall is continuous where there is rock', () => {
    it('neighbouring blocks OVERLAP — a wall, not a picket fence', () => {
        expect(ringIsContinuous(TUNE.caveWallRingRadiusM, TUNE.caveWallBlocks, TUNE.caveWallBlockRadiusM)).toBe(true);
    });

    it('a survivor can no longer walk in through the SIDES', () => {
        for (const bearing of [Math.PI / 2, -Math.PI / 2]) {
            const reached = walkIn(WALL(), bearing);
            expect(reached, `walked to ${reached.toFixed(2)} m of centre from the side`)
                .toBeGreaterThan(BLUFF_RADIUS_M);
        }
    });

    it('...nor through the BACK', () => {
        const reached = walkIn(WALL(), Math.PI);
        expect(reached, `walked to ${reached.toFixed(2)} m of centre from behind`)
            .toBeGreaterThan(BLUFF_RADIUS_M);
    });

    it('and the wall is strictly better than what it replaces, on every blocked bearing', () => {
        for (const bearing of [Math.PI / 2, -Math.PI / 2]) {
            expect(walkIn(WALL(), bearing)).toBeGreaterThan(walkIn(OLD_COLLIDER, bearing));
        }
    });
});

describe('and the mouth is still a doorway', () => {
    it('the survivor walks straight in, far enough to be sheltering', () => {
        //  The other half, and why a bigger circle was never the answer: `updateCavePresence`
        //  only fires inside `caveShelterRadiusM`, so the mouth has to admit them that far.
        const reached = walkIn(WALL(), 0);
        expect(reached, `walked only to ${reached.toFixed(2)} m of centre through the mouth`)
            .toBeLessThan(TUNE.caveShelterRadiusM);
    });

    it('exactly one block is missing — open in ONE place, not several', () => {
        expect(WALL().length).toBe(TUNE.caveWallBlocks - 1);
    });

    it('the doorway is wider than a survivor and no wider than the mouth it stands for', () => {
        const gap = Math.min(...WALL()
            .filter((o) => o.z > CAVE_SITE.y)
            .map((o) => Math.abs(o.x - CAVE_SITE.x) - o.radius));
        expect(gap * 2, 'the doorway is too tight to walk through').toBeGreaterThan(0.68);
        expect(gap * 2, 'the doorway is wider than the 3.2 m mouth it represents').toBeLessThan(3.2);
    });
});
