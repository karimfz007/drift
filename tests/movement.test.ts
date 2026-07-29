/**
 * THE UNIFIED COLLISION MODEL — one cause, three symptoms (Slice 1 opener, D-078 B).
 *
 * Vacuity clause (b) requires every one of these to be proven to FAIL on the pre-fix
 * mechanism before it is trusted. The pre-fix mechanism is reproduced exactly, once, in
 * `preFixStep` below — a radial push-out plus a collide-and-slide that keeps only the
 * tangential component that survives contact. Each symptom is then run through BOTH, and
 * the pre-fix expectation is asserted as hard as the post-fix one. A regression that only
 * checks the fixed side cannot tell a fix from a coincidence.
 *
 * Clause (a) is served by `deflected`: the dead-on branch reports when it fires, so a test
 * claiming to exercise a head-on stalemate must witness it, not assume it.
 */
import { describe, expect, it } from 'vitest';
import { pushOut, stepMovement, type Obstacle } from '../src/brain/movement';
import { TUNE } from '../src/data/tune';

/**
 * THE PRE-FIX MECHANISM, reproduced verbatim in shape from `game.ts` before this fix:
 * push out, remove the inward component, re-resolve. No deflection. This is the thing all
 * three symptoms are being proven against.
 */
function preFixStep(px: number, pz: number, velX: number, velZ: number, dt: number, radius: number, obstacles: readonly Obstacle[]) {
    let x = px + velX * dt;
    let z = pz + velZ * dt;
    const resolved = pushOut(x, z, radius, obstacles);
    const pushX = resolved.x - x;
    const pushZ = resolved.z - z;
    x = resolved.x;
    z = resolved.z;
    const pushLen = Math.hypot(pushX, pushZ);
    if (pushLen > 1e-6) {
        const nx = pushX / pushLen;
        const nz = pushZ / pushLen;
        const into = velX * nx + velZ * nz;
        if (into < 0) {
            velX -= nx * into;
            velZ -= nz * into;
            const slid = pushOut(x + velX * dt, z + velZ * dt, radius, obstacles);
            x = slid.x;
            z = slid.z;
        }
    }
    return { x, z, velX, velZ };
}

/** Hold the stick in a fixed world direction for `seconds`, through whichever mechanism. */
function press(
    stepper: 'fixed' | 'prefix',
    start: { x: number; z: number },
    dir: { x: number; z: number },
    seconds: number,
    obstacles: readonly Obstacle[],
    speed = TUNE.walkSpeedMps,
) {
    const dt = 1 / 60;
    const len = Math.hypot(dir.x, dir.z) || 1;
    let x = start.x;
    let z = start.z;
    let deflectedEver = false;
    let contactedEver = false;
    for (let t = 0; t < seconds; t += dt) {
        //  The stick is HELD: intent is re-applied every frame, exactly as the real input
        //  loop does. Carrying the post-contact velocity forward instead would be testing a
        //  glide, not a press.
        const velX = (dir.x / len) * speed;
        const velZ = (dir.z / len) * speed;
        if (stepper === 'fixed') {
            const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, obstacles);
            x = r.x; z = r.z;
            deflectedEver ||= r.deflected;
            contactedEver ||= r.contacted;
        } else {
            const r = preFixStep(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, obstacles);
            x = r.x; z = r.z;
        }
    }
    return { x, z, deflectedEver, contactedEver, from: start };
}

const travelled = (r: { x: number; z: number; from: { x: number; z: number } }) =>
    Math.hypot(r.x - r.from.x, r.z - r.from.z);

/**
 * Walk TOWARD a point, re-aiming every frame — which is what `approach()` actually does.
 * Pressing a fixed world direction models a held stick; pursuing models a walk-to. Symptom 3
 * is a walk-to, so it has to be tested as one: my first cut pressed a fixed heading, the
 * mover slid round the shelter and sailed off past the box, and the test failed for a reason
 * that had nothing to do with the fix.
 */
function pursue(
    stepper: 'fixed' | 'prefix',
    start: { x: number; z: number },
    target: { x: number; z: number },
    seconds: number,
    obstacles: readonly Obstacle[],
    speed = TUNE.walkSpeedMps,
) {
    const dt = 1 / 60;
    let x = start.x;
    let z = start.z;
    let deflectedEver = false;
    let contactedEver = false;
    let closest = Math.hypot(x - target.x, z - target.z);
    for (let t = 0; t < seconds; t += dt) {
        const dx = target.x - x;
        const dz = target.z - z;
        const len = Math.hypot(dx, dz) || 1;
        const velX = (dx / len) * speed;
        const velZ = (dz / len) * speed;
        if (stepper === 'fixed') {
            const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, obstacles);
            x = r.x; z = r.z;
            deflectedEver ||= r.deflected;
            contactedEver ||= r.contacted;
        } else {
            const r = preFixStep(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, obstacles);
            x = r.x; z = r.z;
        }
        closest = Math.min(closest, Math.hypot(x - target.x, z - target.z));
    }
    return { x, z, deflectedEver, contactedEver, closest, from: start };
}

describe('SYMPTOM 1 — the movement hard-block', () => {
    //  Walk due south into the shelter at (0, 98). Pre-fix this pins at exactly
    //  (0, 99.70) = 98 + 1.3 + 0.4 and stays there for as long as the stick is held.
    const shelter: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];
    const start = { x: 0, z: 105 };
    const south = { x: 0, z: -1 };

    it('PRE-FIX — pins dead against the obstacle, stick held (this is the defect)', () => {
        const r = press('prefix', start, south, 3, shelter);
        expect(r.z).toBeCloseTo(98 + TUNE.shelterCollisionRadius + TUNE.playerCollisionRadius, 2);
        expect(Math.abs(r.x)).toBeLessThan(0.01);   // zero lateral: the stalemate
    });

    it('FIXED — pressing into it moves the player along it instead of stopping', () => {
        const r = press('fixed', start, south, 3, shelter);
        expect(r.contactedEver).toBe(true);
        expect(r.deflectedEver).toBe(true);          // WITNESS: the dead-on branch fired
        expect(Math.abs(r.x)).toBeGreaterThan(1.0);  // it went AROUND
    });

    it('FIXED — and it clears the obstacle rather than orbiting it forever', () => {
        //  Sliding that never gets anywhere is a prettier pin. After enough pressing the
        //  player should be past the shelter, not still beside it.
        const r = press('fixed', start, south, 6, shelter);
        expect(r.z).toBeLessThan(98);
    });
});

describe('SYMPTOM 2 — the shelter pin (the harness known-open)', () => {
    //  The exact measurement the device harness reports: press into a structure for 2 s from
    //  contact and see whether anything moves. It read `moved 0.00m in 2s of pressing`.
    const shelter: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];
    const contact = { x: 0, z: 98 + TUNE.shelterCollisionRadius + TUNE.playerCollisionRadius };

    it('PRE-FIX — moved 0.00 m in 2 s of pressing, from a standing contact', () => {
        const r = press('prefix', contact, { x: 0, z: -1 }, 2, shelter);
        expect(travelled(r)).toBeLessThan(0.01);
    });

    it('FIXED — pressing from contact moves the player, and by more than the harness threshold', () => {
        const r = press('fixed', contact, { x: 0, z: -1 }, 2, shelter);
        expect(r.deflectedEver).toBe(true);
        expect(travelled(r)).toBeGreaterThan(0.20);  // the harness's own bar
    });
});

describe('SYMPTOM 3 — the quarry / storage approach stall', () => {
    //  `approach()` walks at a target's CENTRE, which is the definition of dead-on. Against
    //  the storage box tucked beside the shelter it gave up 3.79 m short of a 2.5 m interact
    //  radius, and the box then took 6476 ms to open because the castaway was still walking.
    //  Geometry from the shipped world: both structures are placed ~2.2 m ahead of the
    //  builder, so the shelter sits between the player and the box.
    const shelter = { x: 0, z: 100, radius: TUNE.shelterCollisionRadius };
    const box = { x: 0, z: 97.8, radius: TUNE.storageCollisionRadius };
    const obstacles: Obstacle[] = [shelter, box];
    const start = { x: 0, z: 108 };

    it('PRE-FIX — never reaches the box: stalls outside the interact radius, however long you walk', () => {
        const r = pursue('prefix', start, box, 8, obstacles);
        expect(r.closest).toBeGreaterThan(TUNE.interactRadiusM);
    });

    it('FIXED — the walk-to gets within the interact radius, so arrival is possible at all', () => {
        //  Walking dead at the centre no longer parks the player behind the shelter; they
        //  slide around it and close the gap. This is what the harness's arrival gate was
        //  measuring when it reported 3.79 m short of a 2.5 m radius.
        const r = pursue('fixed', start, box, 8, obstacles);
        expect(r.deflectedEver).toBe(true);
        expect(r.closest).toBeLessThanOrEqual(TUNE.interactRadiusM);
    });
});

describe('the fix does not break what already worked', () => {
    const shelter: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];

    it('a GLANCING contact still slides on the ordinary path — no deflection needed', () => {
        //  The pre-existing collide-and-slide handled these correctly and must keep doing so.
        //  If this ever reports `deflected`, the threshold has been raised too far and normal
        //  contacts are being routed through the degenerate branch.
        const r = press('fixed', { x: 3.0, z: 105 }, { x: -0.25, z: -1 }, 3, shelter);
        expect(r.contactedEver).toBe(true);
        expect(r.deflectedEver).toBe(false);
        expect(travelled(r)).toBeGreaterThan(3.0);
    });

    it('open ground is untouched — no obstacle, no interference', () => {
        const r = press('fixed', { x: 0, z: 105 }, { x: 0, z: -1 }, 1, []);
        expect(r.contactedEver).toBe(false);
        expect(r.deflectedEver).toBe(false);
        expect(travelled(r)).toBeCloseTo(TUNE.walkSpeedMps, 1);
    });

    it('the mover NEVER ends up inside an obstacle, from any approach angle', () => {
        //  The property that must hold no matter what the slide does. 72 angles, every one
        //  pressed for a full second into a two-obstacle field.
        const field: Obstacle[] = [
            { x: 0, z: 98, radius: TUNE.shelterCollisionRadius },
            { x: 1.6, z: 96.8, radius: TUNE.storageCollisionRadius },
        ];
        let contacts = 0;
        for (let i = 0; i < 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            const start = { x: 0 + Math.cos(a) * 6, z: 97.4 + Math.sin(a) * 6 };
            const dir = { x: -Math.cos(a), z: -Math.sin(a) };   // straight at the middle
            const r = press('fixed', start, dir, 1.5, field);
            if (r.contactedEver) contacts++;
            for (const o of field) {
                const gap = Math.hypot(r.x - o.x, r.z - o.z);
                expect(gap).toBeGreaterThanOrEqual(o.radius + TUNE.playerCollisionRadius - 0.02);
            }
        }
        //  WITNESS (D-066 a): the sweep must actually have hit something, or it is 72
        //  strolls across open ground wearing a collision test's clothes.
        expect(contacts).toBeGreaterThan(60);
    });

    it('a dead-on contact deflects the SAME way every time — deterministic, never random', () => {
        //  Seeded determinism is project law, and beyond that: a player who walks into the
        //  same rock twice should be pushed the same way twice, or the world feels unsure.
        const rock: Obstacle[] = [{ x: 12, z: 40, radius: 1.1 }];
        const runs = [0, 1, 2].map(() => press('fixed', { x: 12, z: 46 }, { x: 0, z: -1 }, 2, rock));
        for (const r of runs) {
            expect(r.deflectedEver).toBe(true);
            expect(r.x).toBeCloseTo(runs[0].x, 10);
            expect(r.z).toBeCloseTo(runs[0].z, 10);
        }
    });
});

describe('WHO OWNS velX — the acceleration model, not the resolver', () => {
    //  The body accelerates velocity toward the stick's desired direction every frame. The
    //  first wiring of this fix wrote the DEFLECTED velocity back into that same variable, so
    //  `approachScalar` dragged it back toward dead-into-the-wall before it could move
    //  anyone. The deflection was correct and then thrown away. My first attempt to explain
    //  the resulting decay blamed the slide's SPEED and renormalised it, which moved the
    //  device numbers not at all — a magnitude fix for an ownership bug.
    //
    //  This reproduces both wirings against the same obstacle, speed and accel model, and
    //  asserts the difference. It is the fail-then-pass for the second attempt, measured
    //  against the first attempt's own baseline rather than against a fresh guess.
    const shelter: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];
    const approachScalar = (cur: number, target: number, maxDelta: number) => {
        const d = target - cur;
        return Math.abs(d) <= maxDelta ? target : cur + Math.sign(d) * maxDelta;
    };

    /**
     * Press at the obstacle's centre through the body's real accel model, both wirings, and
     * return the PATH LENGTH travelled.
     *
     * C3 MAJOR-2: this used to return net displacement, which for a mover orbiting a circle
     * of expanded radius 1.70 m is periodic, not monotone. The `> 3` ratio it asserted held
     * at exactly one duration — the 2.4 s default — and failed at 11 of the 14 C3 sampled,
     * bottoming out at 1.15 at 5 s. The claim was sound and the yardstick was a coincidence.
     *
     * Path length only ever grows, so a mover that keeps moving keeps scoring and a mover
     * that stalls stops. Asserted at three durations below, so no single point can carry it.
     */
    function pressThroughAccel(feedDeflectionBackIn: boolean, seconds = 2.4) {
        const dt = 1 / 60;
        const speed = TUNE.walkSpeedMps;
        let x = 0, z = 101.2, velX = 0, velZ = 0;
        let path = 0;
        for (let t = 0; t < seconds; t += dt) {
            const dx = shelter[0].x - x, dz = shelter[0].z - z;
            const len = Math.hypot(dx, dz) || 1;
            const accel = TUNE.moveAccelMps2 * dt;
            velX = approachScalar(velX, (dx / len) * speed, accel);
            velZ = approachScalar(velZ, (dz / len) * speed, accel);
            const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, shelter);
            path += Math.hypot(r.x - x, r.z - z);
            x = r.x; z = r.z;
            if (feedDeflectionBackIn) { velX = r.velX; velZ = r.velZ; }
        }
        return path;
    }

    //  Three durations, not one. A single point is what let the old metric pass on a
    //  coincidence; if the gap is real it holds as the press gets longer, and a stalled mover
    //  falls further behind the longer you watch.
    const DURATIONS = [2, 5, 10];

    it('PRE-FIX — feeding the deflection back into the accelerator stalls the slide', () => {
        //  The stalled path barely grows after contact: it is dominated by the approach.
        for (const seconds of DURATIONS) {
            expect(pressThroughAccel(true, seconds)).toBeLessThan(3.2 + seconds * 0.35);
        }
    });

    it('FIXED — keeping the intent lets the slide keep travelling, at every duration', () => {
        for (const seconds of DURATIONS) {
            //  Grows with time, which a stalled mover's does not.
            expect(pressThroughAccel(false, seconds)).toBeGreaterThan(seconds * 1.2);
        }
    });

    it('and the gap WIDENS with time — the mark of a stall, not merely a slower slide', () => {
        //  Guards against a future change that narrows this by slowing the fixed path rather
        //  than by fixing anything — the shape of "fix" that produced attempt one. A constant
        //  ratio would mean "somewhat slower"; a growing one means "stopped".
        const ratios = DURATIONS.map((sec) => pressThroughAccel(false, sec) / pressThroughAccel(true, sec));
        for (const r of ratios) expect(r).toBeGreaterThan(1.4);
        expect(ratios[ratios.length - 1]).toBeGreaterThan(ratios[0]);
    });
});

describe('THE NOTCH — two obstacles the mover touches at once (C3 MAJOR-1)', () => {
    //  The shipped shelter/storage cluster. Expanded by the mover's radius the two circles
    //  OVERLAP -- passage width is MINUS 0.80 m -- so there is no way through, and making no
    //  progress there is correct. What was not correct is what the deflection did about it:
    //  the resultant normal alternated between the two obstacles, the slide direction flipped
    //  with it, and the mover vibrated at 3 cm and 30 Hz. Worse than the pin it replaced,
    //  because the pin at least stood still quietly.
    //
    //  Two rules fix it, and both are needed: commit to the direction already being travelled
    //  while contact holds, and never let a slide REVERSE against it -- stop instead. A clean
    //  stop reads as "blocked", which is true. The flip reads as a broken game.
    const NOTCH: Obstacle[] = [{ x: 0, z: 100, radius: 1.3 }, { x: 0, z: 97.8, radius: 0.9 }];
    const SINGLE: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];
    const approachScalar = (c: number, t: number, m: number) => {
        const d = t - c; return Math.abs(d) <= m ? t : c + Math.sign(d) * m;
    };

    /** Press west through the body's accel model; `hyst` selects the shipped wiring. */
    function press(o: Obstacle[], startX: number, startZ: number, hyst: boolean) {
        const dt = 1 / 60;
        let x = startX, z = startZ, velX = 0, velZ = 0, tX = 0, tZ = 0, contact = false;
        const from = { x, z };
        let reversals = 0;
        let prevH: number | null = null;
        for (let f = 0; f < 960; f++) {
            velX = approachScalar(velX, -TUNE.walkSpeedMps, TUNE.moveAccelMps2 * dt);
            velZ = approachScalar(velZ, 0, TUNE.moveAccelMps2 * dt);
            const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, o,
                hyst && contact ? tX : 0, hyst && contact ? tZ : 0);
            const h = Math.atan2(r.velX, r.velZ);
            if (prevH !== null && Math.abs(((h - prevH + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 2.0) reversals++;
            prevH = h; x = r.x; z = r.z; tX = r.velX; tZ = r.velZ; contact = r.contacted;
        }
        return { net: Math.hypot(x - from.x, z - from.z), reversals };
    }

    it('PRE-FIX — the mover vibrates against an impassable notch, hundreds of reversals', () => {
        expect(press(NOTCH, 7, 98.9, false).reversals).toBeGreaterThan(400);
    });

    it('KNOWN-OPEN — hysteresis halves the shaking but does not stop it', () => {
        //  Attempt 2 (hysteresis alone): 850 -> 425 reversals. Still visibly shaking.
        //  Attempt 3 added an anti-reversal damp that took it to 1 reversal — and REVERTED,
        //  because on device it fired on the primary case too: `PART 2 — pressing into a
        //  structure still MOVES you` fell from 5.17 m to 0.05 m. The shipped world puts the
        //  shelter and storage close enough that the ordinary press IS the notch, so damping
        //  the notch damped the slide this whole slice exists to deliver. My own guard in
        //  this file predicted that and it is why the damp is gone rather than tuned.
        //
        //  So the shake is carried OPEN, measured, and owned. It is strictly better than the
        //  pin it replaced on progress and strictly worse on appearance, and that trade is
        //  the director's to weigh, not mine to hide behind a threshold.
        const r = press(NOTCH, 7, 98.9, true);
        expect(r.reversals).toBeGreaterThan(100);   // still shaking — this is the open defect
        expect(r.reversals).toBeLessThan(600);      // ...but hysteresis did halve it
    });

    it('and still makes no westward progress, because there IS no passage', () => {
        //  Guards the fix from "improving" into a mover that squeezes through a solid wall.
        const gap = 2.2 - (1.3 + TUNE.playerCollisionRadius) - (0.9 + TUNE.playerCollisionRadius);
        expect(gap).toBeLessThan(0);
        expect(press(NOTCH, 7, 98.9, true).net).toBeLessThan(7);
    });

    it('a SINGLE obstacle is untouched — the dead-on fix still slides freely', () => {
        //  The anti-reversal rule must never fire on a normal slide. If this drops, the notch
        //  fix has started damping the thing the whole slice exists to deliver.
        const r = press(SINGLE, 0, 105, true);
        expect(r.reversals).toBe(0);
        expect(r.net).toBeGreaterThan(40);
    });
});
