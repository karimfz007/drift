import { describe, it, expect } from 'vitest';
import { stepMovement, type Obstacle } from '../src/brain/movement';
import { TUNE } from '../src/data/tune';
const approachScalar = (c: number, t: number, m: number) => { const d = t - c; return Math.abs(d) <= m ? t : c + Math.sign(d) * m; };

/** Both metrics, over the harness's own press geometry, for a pinning vs a sliding mover. */
function score(feedback: boolean) {
    const o: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];
    const dt = 1/60, speed = TUNE.walkSpeedMps;
    let x = 0, z = 98 + 3.2, velX = 0, velZ = 0;
    const from = { x, z };
    const ux = (o[0].x - from.x) / 3.2, uz = (o[0].z - from.z) / 3.2;
    let straightLine = 0, perpendicular = 0;
    for (let t = 0; t < 2.4; t += dt) {
        const dx = o[0].x - x, dz = o[0].z - z, len = Math.hypot(dx, dz) || 1;
        velX = approachScalar(velX, (dx/len)*speed, TUNE.moveAccelMps2*dt);
        velZ = approachScalar(velZ, (dz/len)*speed, TUNE.moveAccelMps2*dt);
        const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, o);
        x = r.x; z = r.z;
        if (feedback) { velX = r.velX; velZ = r.velZ; }
        const dX = x - from.x, dZ = z - from.z;
        straightLine = Math.max(straightLine, Math.hypot(dX, dZ));
        perpendicular = Math.max(perpendicular, Math.abs(dX * uz - dZ * ux));
    }
    return { straightLine, perpendicular };
}

describe('BLOCKING-1 — the feel-court gate must be able to FAIL', () => {
    //  C3: the shipped gate measured straight-line distance from a press start 3.2 m out,
    //  while contact stand-off is 1.70 m — so 1.50 m of free approach cleared a 0.80 m bar
    //  unconditionally, and a mover that pinned dead scored 1.50 and passed. This asserts the
    //  replacement metric discriminates, using the pinning mechanism as the negative control.
    const BAR = 0.8;
    const pinned = score(true);    // the velocity-ownership bug: reaches the wall, then stops
    const sliding = score(false);  // the shipped mechanism

    it('the OLD metric passes the pinning mover — which is why it could not fail', () => {
        expect(pinned.straightLine).toBeGreaterThan(BAR);
    });

    it('the NEW metric FAILS the pinning mover', () => {
        expect(pinned.perpendicular).toBeLessThan(BAR);
    });

    it('the NEW metric PASSES the sliding mover — it discriminates, it is not merely strict', () => {
        expect(sliding.perpendicular).toBeGreaterThan(BAR);
    });
});
