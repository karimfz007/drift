/**
 * MOVEMENT AGAINST OBSTACLES — the unified collision model (Slice 1's opening item, D-078 B).
 *
 * ONE root cause, three symptoms. The resolver was a radial push-out followed by a
 * collide-and-slide that preserves whatever tangential velocity survives contact. That is
 * correct rigid-body mechanics, and it is the bug: **a circle approached dead-on has no
 * tangential component at all.** The inward part is the whole of the motion, removing it
 * leaves exactly zero, and the mover stops. Hold the stick and they keep stopping — an
 * unstable equilibrium the player has no way to fall off.
 *
 * The three symptoms already on the record are all that one case:
 *
 *   1. **The movement hard-block.** Walk due south into the shelter at (0, 98): pinned at
 *      exactly (0, 99.70) = 98 + 1.3 + 0.4, forever, stick held.
 *   2. **The shelter pin.** The harness's own known-open measurement: `moved 0.00m in 2s of
 *      pressing`. Same geometry, measured through the real player path.
 *   3. **The quarry / storage approach stall.** `approach()` walks at a target's CENTRE,
 *      which is the definition of dead-on, so it gives up short and the harness then blames
 *      the game. Measured at 3.79 m short of a 2.5 m interact radius, with the storage box
 *      taking 6476 ms to open because the castaway was still walking when it was asked.
 *
 * Three previous attempts patched symptoms — collide-and-slide (which was published as the
 * hard-block's root cause and disproved by its own A/B: 0.50 m lateral both sides), a
 * harness sidestep for the quarry, an arrival gate for storage. None touched this. The fix
 * is one rule at the mechanism: **when removing the inward component leaves the mover with
 * essentially nothing, deflect along the surface instead of stopping.** A wall you press
 * into moves you along itself. That is what every game this one is measured against does,
 * and what a body pressed against a rock actually does.
 *
 * It lives in the brain, not in `island.ts`, on purpose. The body layer has zero unit
 * coverage by construction — it imports Babylon and the purity law keeps that out of the
 * brain — so collision maths living there could only ever be witnessed on a device. Here,
 * all three symptoms get a fail-then-pass regression that runs in milliseconds. Determinism
 * is preserved throughout: the side a dead-on contact deflects toward comes from a hash of
 * the obstacle's own position, never from `Math.random`.
 */
import { TUNE } from '../data/tune';

export interface Obstacle {
    x: number;
    z: number;
    radius: number;
}

export interface MoveStep {
    /** Where the mover ended up. */
    x: number;
    z: number;
    /** Velocity after contact — what the next frame carries. */
    velX: number;
    velZ: number;
    /**
     * WITNESS (D-066 a). True when the dead-on branch actually fired — the degenerate case
     * this whole module exists for. A test that claims to exercise a head-on stalemate and
     * never sets this is testing a glancing blow and saying otherwise.
     */
    deflected: boolean;
    /** True if any obstacle pushed back at all this step. */
    contacted: boolean;
    /** Distance actually travelled this step. The number the pin made zero. */
    movedM: number;
}

/**
 * Push a point out of every obstacle it overlaps. Two relaxation passes so wedging between
 * two obstacles still resolves. Ported from `island.ts` unchanged in behaviour — the degenerate
 * "exactly on the centre" branch keeps its deterministic angle, and its convention is the same
 * one `deflectionSide` uses below, so a dead-centre spawn and a dead-on approach agree.
 */
export function pushOut(x: number, z: number, radius: number, obstacles: readonly Obstacle[]): { x: number; z: number } {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 2; pass++) {
        for (const o of obstacles) {
            const dx = px - o.x;
            const dz = pz - o.z;
            const min = o.radius + radius;
            const d2 = dx * dx + dz * dz;
            if (d2 < min * min) {
                if (d2 > 1e-9) {
                    const d = Math.sqrt(d2);
                    const push = (min - d) / d;
                    px += dx * push;
                    pz += dz * push;
                } else {
                    const angle = (o.x * 12.9898 + o.z * 78.233) % (Math.PI * 2);
                    px = o.x + Math.cos(angle) * min;
                    pz = o.z + Math.sin(angle) * min;
                }
            }
        }
    }
    return { x: px, z: pz };
}

/**
 * Which way a dead-on contact slides, when the mover's own velocity cannot say.
 *
 * Deterministic from the obstacle's position — the same hash form `pushOut`'s degenerate
 * branch already uses — so a given obstacle always deflects the same way. That matters for
 * more than seeded replay: a player who walks into the same rock twice should be pushed the
 * same way twice, or the world feels like it is guessing.
 */
function deflectionSide(o: Obstacle): number {
    return ((o.x * 12.9898 + o.z * 78.233) % 2 + 2) % 2 < 1 ? 1 : -1;
}

/**
 * Advance one step against the obstacle field.
 *
 * `velX/velZ` are metres per second; `dt` seconds. Returns the new position AND the velocity
 * the caller should carry forward, because a slide that does not survive into the next frame
 * is a stutter, not a slide.
 */
export function stepMovement(
    px: number,
    pz: number,
    velX: number,
    velZ: number,
    dt: number,
    radius: number,
    obstacles: readonly Obstacle[],
): MoveStep {
    const startX = px;
    const startZ = pz;
    const incoming = Math.hypot(velX, velZ);

    let x = px + velX * dt;
    let z = pz + velZ * dt;

    const resolved = pushOut(x, z, radius, obstacles);
    const pushX = resolved.x - x;
    const pushZ = resolved.z - z;
    x = resolved.x;
    z = resolved.z;

    const pushLen = Math.hypot(pushX, pushZ);
    let deflected = false;
    const contacted = pushLen > 1e-6;

    if (contacted) {
        const nx = pushX / pushLen;
        const nz = pushZ / pushLen;
        const into = velX * nx + velZ * nz;
        if (into < 0) {
            //  Remove the inward component; whatever runs along the surface survives. On a
            //  glancing contact this is the whole fix and always was — it is the dead-on
            //  case, where nothing survives, that stalled.
            velX -= nx * into;
            velZ -= nz * into;

            const residual = Math.hypot(velX, velZ);
            if (incoming > 1e-6 && residual < incoming * TUNE.slideDeflectThreshold) {
                //  DEAD-ON. The surface tangent, taking the side the mover already leans
                //  toward; when they lean neither way — the true stalemate — the obstacle
                //  decides, deterministically.
                let tx = -nz;
                let tz = nx;
                const lean = velX * tx + velZ * tz;
                let side: number;
                if (Math.abs(lean) > 1e-6) {
                    side = lean > 0 ? 1 : -1;
                } else {
                    const nearest = nearestObstacle(x, z, obstacles);
                    side = nearest ? deflectionSide(nearest) : 1;
                }
                tx *= side;
                tz *= side;
                //  Slide at a fraction of the incoming speed. Not full speed: pressing into
                //  a wall should cost something, or the wall reads as a conveyor.
                const slideSpeed = incoming * TUNE.slideRetention;
                velX = tx * slideSpeed;
                velZ = tz * slideSpeed;
                deflected = true;
            }

            //  SUSTAINED SLIDE PACE. Removing the inward component leaves whatever the
            //  geometry happens to leave, which for a near-radial press against a curved
            //  surface is almost nothing — so the mover crawls. The device feel-court caught
            //  exactly that: pressing into a shelter gave steps of
            //  [1.04 0.56 0.31 0.09 0.09 0.08 0.09 0.09] m — a confident slide that bleeds
            //  out into a crawl while the thumb is still down. Continuous, technically
            //  unpinned, and it reads as being stuck.
            //
            //  So a slide holds a consistent pace: whatever direction survives contact is
            //  renormalised to the same fraction of the incoming speed the deflection uses.
            //  Never faster than the mover was going, and only ever while actually in
            //  contact — this cannot push anyone anywhere they were not already heading.
            const along = Math.hypot(velX, velZ);
            if (along > 1e-6) {
                const target = Math.min(incoming, incoming * TUNE.slideRetention);
                if (along < target) {
                    velX = (velX / along) * target;
                    velZ = (velZ / along) * target;
                }
            }

            //  Re-resolve after the slide so the step never ends inside an obstacle.
            const slid = pushOut(x + velX * dt, z + velZ * dt, radius, obstacles);
            x = slid.x;
            z = slid.z;
        }
    }

    return {
        x,
        z,
        velX,
        velZ,
        deflected,
        contacted,
        movedM: Math.hypot(x - startX, z - startZ),
    };
}

/** The obstacle whose surface the mover is currently against — the one that owns the contact. */
function nearestObstacle(x: number, z: number, obstacles: readonly Obstacle[]): Obstacle | null {
    let best: Obstacle | null = null;
    let bestGap = Infinity;
    for (const o of obstacles) {
        const gap = Math.hypot(x - o.x, z - o.z) - o.radius;
        if (gap < bestGap) { bestGap = gap; best = o; }
    }
    return best;
}
