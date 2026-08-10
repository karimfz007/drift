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

    //  ---- THE PRESS TRACE (C1's diagnostic ruling) --------------------------------------
    //
    //  Four sessions have now argued about this resolver from the OUTSIDE — from positions
    //  sampled five times a second, on a device, through a metric that has itself been wrong
    //  twice. Three diagnoses were published and all three were wrong. The reason is the same
    //  every time: "it slid", "it was never blocked", and "it slid and the ruler missed it"
    //  are indistinguishable from a position sample. So the resolver now reports what it
    //  actually did, per step, and the argument moves to evidence.
    //
    //  These shipped as pure outputs — nothing read them to decide anything, and removing them
    //  changed no behaviour, because a diagnostic that can alter the thing it measures is not
    //  a diagnostic.
    //
    //  ONE EXCEPTION, called out rather than left to be discovered: `nearestGapM` is now
    //  load-bearing. It was added to make the trace legible, the trace then found a second
    //  defect that turns out to BE that quantity (contact means penetration, and a mover
    //  coasting along a curve leaves the surface by centimetres while still leaning on it),
    //  and `game.ts` reads it to gate the slide-direction memory. Everything else here is
    //  still write-only.

    /** The contact normal used this step — unit, pointing OUT of the surface. (0,0) if idle. */
    normalX: number;
    normalZ: number;
    /**
     * The incoming velocity's component along that normal. NEGATIVE means "moving into the
     * surface"; the resolver only acts when it is. Zero when nothing was touched.
     */
    into: number;
    /**
     * What survives after the inward component is removed, BEFORE the dead-on branch can
     * substitute a tangent for it. This is the *computed tangential component* — the number
     * that separates "the tangent decayed to nothing" from "the tangent was healthy and the
     * mover still went nowhere". Equals the incoming velocity when there was no contact.
     */
    residualX: number;
    residualZ: number;
    /**
     * How many obstacles the advanced point was actually inside. A notch reads 2+; the feel
     * court's own staging check asserts only that the STORAGE box is far away, which is not
     * the same claim. This one is measured at the point of contact and cannot be staged wrong.
     */
    overlaps: number;
    /** Centre of the obstacle that owns the contact — a per-frame flip between two centres is
     *  the notch signature, and no position sample can show it. NaN when uncontacted. */
    nearestX: number;
    nearestZ: number;
    /**
     * Distance from the mover's SURFACE to the nearest obstacle's, after resolution. Zero or
     * below means touching. Reported on every step, contact or not, because the interesting
     * case is the one just barely off: a mover coasting along a curved surface leaves it by
     * millimetres, which stops being "contact" while remaining, in every sense a player would
     * recognise, still leaning on the thing. Infinity if there are no obstacles at all.
     */
    nearestGapM: number;
}

/**
 * Push a point out of every obstacle it overlaps. Two relaxation passes so wedging between
 * two obstacles still resolves. Ported from `island.ts` unchanged in behaviour — the degenerate
 * "exactly on the centre" branch keeps its deterministic angle, and its convention is the same
 * one `deflectionSide` uses below, so a dead-centre spawn and a dead-on approach agree.
 */
/**
 * A WALL WITH A DOORWAY IN IT — a ring of colliders around a hollow structure, open on one
 * bearing. Pure, so the shape is testable without a renderer.
 *
 * THE DEFECT THIS FIXES. The cave shipped with ONE circle, radius 4.2, offset 2.6 m back from
 * the mouth so the opening stayed walkable. That kept the mouth open and left everything else
 * open too: the bluff's base is 9.6 m across, so a point on its own rim at the side sits
 * 5.46 m from that circle's centre and a point at the face sits 7.4 m — both outside 4.2. The
 * survivor could walk through the SIDES and the FRONT of a solid rock bluff. Offsetting a
 * single radius trades one wrong answer for another: cover the mass and you wall the player
 * out of the only place they are trying to reach ([[D-051]]'s unminable quarry); shrink it and
 * the rock is a ghost.
 *
 * A ring answers both at once. The wall is continuous where there is rock, and there is a real
 * doorway where the mouth is — which is what the geometry always said and the collider never did.
 *
 * ADJACENT COLLIDERS MUST OVERLAP or the wall has gaps a player can squeeze through, and that
 * is a property of the arithmetic rather than of the caller's care — `ringIsContinuous` below
 * states it so a future retune cannot quietly open one.
 */
export function ringObstacles(
    cx: number,
    cz: number,
    opts: { ringRadius: number; count: number; radius: number; openBearingRad: number; openHalfAngleRad: number },
): Obstacle[] {
    const out: Obstacle[] = [];
    for (let i = 0; i < opts.count; i += 1) {
        const bearing = (i / opts.count) * Math.PI * 2;
        //  Shortest angular distance to the opening, on a circle.
        let delta = Math.abs(bearing - opts.openBearingRad) % (Math.PI * 2);
        if (delta > Math.PI) delta = Math.PI * 2 - delta;
        if (delta <= opts.openHalfAngleRad) continue;
        out.push({
            x: cx + Math.sin(bearing) * opts.ringRadius,
            z: cz + Math.cos(bearing) * opts.ringRadius,
            radius: opts.radius,
        });
    }
    return out;
}

/**
 * Do neighbouring colliders on such a ring actually touch? A wall with gaps is not a wall.
 * Compared rather than asserted, so retuning the ring cannot open a seam silently.
 */
export function ringIsContinuous(ringRadius: number, count: number, radius: number): boolean {
    const centreToCentre = 2 * ringRadius * Math.sin(Math.PI / count);
    return centreToCentre <= radius * 2;
}

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
    /**
     * The direction the mover was already travelling, if it was in contact last frame.
     *
     * C3 MAJOR-1: in a NOTCH — two obstacles close enough that the mover touches both, which
     * is the shipped shelter-plus-storage cluster exactly — the resultant push normal flips
     * between the two obstacles frame to frame. The tangent flips with it, so the deflection
     * side flips, and the mover enters a period-2 limit cycle: 833 of 960 frames reversing
     * heading, 3 cm of jitter, zero net progress. Worse than the pin it replaced, because the
     * pin at least stood still quietly while this shakes.
     *
     * Committing to a direction fixes it. Once sliding, the mover keeps going the way it was
     * already going for as long as contact persists; the obstacle hash only has to break the
     * very first tie. Hysteresis, not a new rule — and it is what a body squeezing along a
     * gap actually does, rather than reconsidering which way to lean sixty times a second.
     */
    priorTravelX = 0,
    priorTravelZ = 0,
    /**
     * WHAT THE MOVER IS ASKING FOR — the stick's own world-space desired velocity, before
     * the accelerator has caught up to it. Optional; defaults to the incoming velocity,
     * which is exactly what this function used to assume.
     *
     * THE DEFECT THIS CLOSES (the press trace, C1's diagnostic ruling). "Is this contact
     * dead-on?" is a question about DIRECTION, and the resolver was answering it from the
     * current velocity — which, for the first ~0.2 s after any fresh press, is not the
     * player's direction at all. It is a lagging blend of the leftover motion and the new
     * intent, and it points somewhere neither of them do.
     *
     * Measured, at the moment the castaway reversed on device:
     *
     *     intent            dead-on to 0.1 deg   <- what the player asked for
     *     velocity          31 deg off-normal    <- what the resolver judged
     *     tangential drift  0.17 m/s             <- 5% of walking pace; invisible on screen
     *     prior travel      0.167 m/s, the OTHER way
     *
     * At 31 deg the ratio test says "glancing — handle it naturally", so the dead-on branch
     * did not fire, and the hysteresis that exists to stop exactly this lives INSIDE that
     * branch. `priorTravel` was correct, present, and never read. A 0.17 m/s incidental
     * residual therefore outvoted the direction the body was actually travelling, once per
     * burst, and the castaway swept back and forth across ~25 deg of the shelter instead of
     * walking around it: 6.55 m of path for 0.51 m of progress.
     *
     * Judging the INTENT instead removes the transient from the decision entirely.
     *
     * When no intent is supplied this reduces to the previous behaviour: `aim` becomes the
     * incoming velocity, `aimLen` is then exactly `incoming` (same two values, same `hypot`),
     * and `aimTangential` is `residual` — a 2D velocity minus its normal component IS its
     * tangential component. Not bit-for-bit, though, and C3 was right to catch that claim:
     * `hypot(v - n(v·n))` and `|v·t|` are the same number mathematically and differ in the
     * last bits because `n` is only unit to about 1 ULP. Measured over 600,000 randomized
     * inputs (203,064 contacting, 7,996 deflecting) the two produce IDENTICAL outputs; a
     * deliberate ULP-scan of the threshold boundary found 3 disagreements in 2,755 scanned
     * points, in a window ~5e-14 rad wide. So: behaviourally identical, provably not
     * bit-identical, and the difference is unreachable by anything a player can do.
     */
    desiredX?: number,
    desiredZ?: number,
): MoveStep {
    const startX = px;
    const startZ = pz;
    const incoming = Math.hypot(velX, velZ);
    //  Captured before the inward component is removed below.
    const inVelX = velX;
    const inVelZ = velZ;

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

    //  Trace outputs, defaulted to the uncontacted answer and overwritten below.
    let normalX = 0;
    let normalZ = 0;
    let intoOut = 0;
    let residualX = velX;
    let residualZ = velZ;
    let overlaps = 0;
    let nearestX = NaN;
    let nearestZ = NaN;

    if (contacted) {
        //  Only meaningful for the contact branch; the unconditional gap is measured at the
        //  end, once the final position is known.
        const nx = pushX / pushLen;
        const nz = pushZ / pushLen;
        const into = velX * nx + velZ * nz;
        normalX = nx;
        normalZ = nz;
        intoOut = into;
        //  Counted at the ADVANCED point — the set that generated this contact.
        const advX = px + velX * dt;
        const advZ = pz + velZ * dt;
        for (const o of obstacles) {
            const min = o.radius + radius;
            const ddx = advX - o.x;
            const ddz = advZ - o.z;
            if (ddx * ddx + ddz * ddz < min * min) overlaps++;
        }
        const owner = nearestObstacle(x, z, obstacles);
        if (owner) { nearestX = owner.x; nearestZ = owner.z; }
        if (into < 0) {
            //  Remove the inward component; whatever runs along the surface survives. On a
            //  glancing contact this is the whole fix and always was — it is the dead-on
            //  case, where nothing survives, that stalled.
            velX -= nx * into;
            velZ -= nz * into;
            residualX = velX;
            residualZ = velZ;

            //  The direction being judged. A released stick asks for nothing, so a coasting
            //  mover's own velocity is the honest reading of its intent.
            const wantLen = desiredX === undefined || desiredZ === undefined
                ? 0 : Math.hypot(desiredX, desiredZ);
            const aimX = wantLen > 1e-6 ? (desiredX as number) : inVelX;
            const aimZ = wantLen > 1e-6 ? (desiredZ as number) : inVelZ;
            const aimLen = Math.hypot(aimX, aimZ);
            //  |aim · t| — the part of the request that runs ALONG the surface.
            const aimTangential = Math.abs(aimX * -nz + aimZ * nx);
            if (aimLen > 1e-6 && aimTangential < aimLen * TUNE.slideDeflectThreshold) {
                //  DEAD-ON. The surface tangent, taking the side the mover already leans
                //  toward; when they lean neither way — the true stalemate — the obstacle
                //  decides, deterministically.
                let tx = -nz;
                let tz = nx;
                //  Three tie-breakers, most authoritative first.
                //    1. Where we were ALREADY going. Committing to it is what stops a notch
                //       from oscillating (C3 MAJOR-1) — see `priorTravelX`.
                //    2. Which way the mover's own residual leans, for a first contact.
                //    3. The obstacle itself, deterministically, for a true dead stalemate.
                const priorAlong = priorTravelX * tx + priorTravelZ * tz;
                const lean = velX * tx + velZ * tz;
                let side: number;
                if (Math.abs(priorAlong) > 1e-3) {
                    side = priorAlong > 0 ? 1 : -1;
                } else if (Math.abs(lean) > 1e-6) {
                    side = lean > 0 ? 1 : -1;
                } else {
                    const nearest = nearestObstacle(x, z, obstacles);
                    side = nearest ? deflectionSide(nearest) : 1;
                }
                tx *= side;
                tz *= side;
                //  Slide at a fraction of the REQUESTED pace. Not full speed: pressing into
                //  a wall should cost something, or the wall reads as a conveyor.
                //
                //  FRAME-RATE INDEPENDENCE, and this line was the bug. It read
                //  `incoming * slideRetention`, where `incoming` is the velocity this
                //  function ALREADY decayed on the previous frame — so the retention fraction
                //  compounded once per frame for as long as contact lasted. At 71 fps you
                //  paid it 71 times a second; at 77 fps, 77 times. The same slide along the
                //  same wall measured 2.29 m/s on a slow machine and 1.60 m/s on a fast one.
                //
                //  It was misattributed to the One Body Resolver across five device runs,
                //  with a perfect correlation to back it up: every Resolver build happened to
                //  run a few fps faster, so slide fell every time the Resolver was present
                //  and recovered every time it was reverted. **The correlation was real and
                //  the causation was backwards** — the Resolver did not slow the slide down,
                //  it sped the frames up, and a frame-rate-dependent decay did the rest.
                //
                //  Basing the slide on what the player is ASKING for makes it dt-independent
                //  and matches what `slideRetention` has always claimed to mean: a slide
                //  keeps this fraction of WALKING PACE, not this fraction of whatever is left
                //  after the last frame took its cut.
                //  The retention is a PER-SECOND rate expressed at 60 Hz, raised to the
                //  frame's share of that reference. At dt = 1/60 the exponent is 1 and this is
                //  bit-for-bit the old value, so every shipped movement behaviour — including
                //  the bursted-press fix, which depends on the incoming-velocity basis — is
                //  untouched. At any other frame rate the decay per SECOND is now the same.
                const frameRetention = Math.pow(TUNE.slideRetention, dt * TUNE.slideRetentionReferenceHz);
                const slideSpeed = incoming * frameRetention;
                velX = tx * slideSpeed;
                velZ = tz * slideSpeed;
                deflected = true;
            }

            //  Re-resolve after the slide, FROM THE ORIGINAL POSITION — not from the
            //  already-advanced one.
            //
            //  C3 MAJOR-3: this advanced a second full `dt` on top of the first, and because
            //  the push-out is radial the first advance's tangential component survives to be
            //  stacked on. A glancing contact therefore travelled at up to 1.99x walking
            //  speed — the wall became a conveyor, which is the exact thing
            //  `TUNE.slideRetention`'s comment says it exists to prevent. Inherited from the
            //  pre-fix code rather than introduced here, but this slice rewrote the function
            //  and claimed the guard, so it is this slice's to fix.
            const slid = pushOut(px + velX * dt, pz + velZ * dt, radius, obstacles);
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
        normalX,
        normalZ,
        into: intoOut,
        residualX,
        residualZ,
        overlaps,
        nearestX,
        nearestZ,
        nearestGapM: gapTo(nearestObstacle(x, z, obstacles), x, z, radius),
    };
}

/** Surface-to-surface distance from the mover to one obstacle. Infinity if there is none. */
function gapTo(o: Obstacle | null, x: number, z: number, radius: number): number {
    return o ? Math.hypot(x - o.x, z - o.z) - o.radius - radius : Infinity;
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
