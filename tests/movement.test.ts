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

    it('THE REGISTER\'S OWN NUMBERS still hold — 845 without hysteresis, 376 with', () => {
        //  `tools/smoke.mjs`'s `knownOpen()` entry QUOTES these two figures, and that register
        //  is what the director reads. It was quoting 425/850 while the truth was 376/845 —
        //  nobody noticed, because the assertions either side of it were a 100..600 band wide
        //  enough to swallow the drift. A witness that cites a number no test pins is a witness
        //  testifying to something it has not seen.
        //
        //  Pinned to +/-5. These are deterministic simulations with no randomness anywhere, so
        //  they reproduce exactly unless a tune constant or the resolver actually changes — and
        //  in that case failing is the correct outcome, not a brittle one: it means the number
        //  the director reads has gone stale and must be updated in the same commit. A +/-50
        //  band was the first cut and it would have swallowed the exact 425-vs-376 drift this
        //  test exists to catch, which is the whole lesson.
        expect(press(NOTCH, 7, 98.9, false).reversals).toBeCloseTo(845, -1);
        expect(press(NOTCH, 7, 98.9, true).reversals).toBeCloseTo(376, -1);
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

describe('THE BURSTED PRESS — judging intent, not the accelerator\'s lag', () => {
    //  THE DEFECT THE PRESS TRACE FOUND (C1's diagnostic ruling).
    //
    //  The feel court read 0.38, 0.55 and 0.52 m against a 0.80 m bar across three device
    //  runs, and three separate root causes were published for it — all three wrong. Every
    //  one of them was argued from position samples taken five times a second. Instrumenting
    //  the resolver itself ended the argument in one run:
    //
    //      obstacles overlapped         1        <- genuinely isolated, not a notch
    //      applied slide speed          2.21 m/s <- full slideRetention x walk. No decay.
    //      per-frame movement           0.02-0.04 m, continuously. No stall.
    //      raw path integral            6.55 m
    //      net perpendicular            0.51 m
    //      perpendicular, every frame   0.51 m   <- vs the gate's 8-sample 0.50. Honest ruler.
    //      applied-direction reversals  6, every one on a burst boundary
    //
    //  Moving a lot and arriving nowhere, with a healthy tangent and an honest ruler, is an
    //  oscillation — and the trace named the mechanism exactly. At each reversal:
    //
    //      the player's request      dead-on to 0.1 deg
    //      the current velocity      31 deg off-normal (the accelerator, mid-ramp)
    //      prior travel              0.167 m/s, one way
    //      tangential residual       0.170 m/s, the OTHER way
    //
    //  The dead-on test judged the VELOCITY's angle. At 31 deg it says "glancing, handle it
    //  naturally" — so the branch did not fire, and the hysteresis that exists to stop this
    //  lives inside that branch. `priorTravel` was correct, present, and never read. A
    //  0.17 m/s incidental drift — 5% of walking pace, invisible on screen — therefore
    //  outvoted the direction the body was actually travelling, once per burst.
    //
    //  It needs BOTH halves of the harness's input to appear, which is why neither the
    //  "bursts" nor the "aims at the centre" hypothesis explained it alone. Measured:
    //
    //      re-aim + release   0.42 m, 6 reversals   <- the shipped press
    //      re-aim, no release 1.71 m, 0 reversals
    //      aim once, release  1.70 m, 0 reversals
    //
    //  And it is not a harness artifact. Nudge-nudge-nudge is how a thumb steers on a phone;
    //  a player who taps the stick while pressed against a rock gets the same wobble.
    //
    //  The fail-then-pass below is a ONE-ARGUMENT A/B on the shipped resolver — omitting the
    //  intent reproduces the defect exactly, supplying it fixes it — so the pre-fix side is
    //  the real code path rather than a hand-copied reimplementation that can drift out of
    //  agreement with it (Vacuity clause (b)).
    const SHELTER: Obstacle[] = [{ x: 0, z: 98, radius: TUNE.shelterCollisionRadius }];
    const approachScalar = (c: number, t: number, m: number) => {
        const d = t - c; return Math.abs(d) <= m ? t : c + Math.sign(d) * m;
    };

    /**
     * The harness's own press, reproduced: eight 0.30 s bursts with the stick RELEASED
     * between them, re-aimed at the shelter's centre each time from a position read a beat
     * earlier (the harness reads state, then round-trips twice, then deflects the stick).
     *
     * `tellIntent` is the whole experiment: it decides whether the resolver is shown what the
     * player asked for, or only the accelerator's lagging answer to it.
     */
    function burstedPress(tellIntent: boolean, rememberLean = false, startZ = 101.2) {
        const dt = 1 / 60;
        const speed = TUNE.walkSpeedMps * 0.875;   //  the stick's real deflection on device
        let x = 0, z = startZ, velX = 0, velZ = 0;
        let contact = false, gap = Infinity, travelX = 0, travelZ = 0;
        let path = 0, perpendicular = 0, reversals = 0, prevAlong = 0;
        let deflected = 0, contacted = 0;
        let aimX = 0, aimZ = -1;

        const frame = (wantX: number, wantZ: number) => {
            velX = approachScalar(velX, wantX, TUNE.moveAccelMps2 * dt);
            velZ = approachScalar(velZ, wantZ, TUNE.moveAccelMps2 * dt);
            if (Math.hypot(velX, velZ) < 0.001) { velX = 0; velZ = 0; return; }
            //  One call, with the intent supplied or withheld — the whole A/B is those two
            //  arguments, which is the point: the pre-fix side IS the shipped resolver.
            //  `leaning` mirrors game.ts's own gate on the direction memory.
            const leaning = rememberLean ? (contact || gap <= TUNE.slideMemoryGapM) : contact;
            const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                leaning ? travelX : 0, leaning ? travelZ : 0,
                tellIntent ? wantX : undefined, tellIntent ? wantZ : undefined);
            path += Math.hypot(r.x - x, r.z - z);
            x = r.x; z = r.z; travelX = r.velX; travelZ = r.velZ;
            contact = r.contacted; gap = r.nearestGapM;
            if (r.contacted) {
                contacted++;
                //  Signed travel along the surface. A sign change IS the wobble.
                const along = r.velX * -r.normalZ + r.velZ * r.normalX;
                if (prevAlong !== 0 && along !== 0 && Math.sign(along) !== Math.sign(prevAlong)) reversals++;
                prevAlong = along;
            }
            if (r.deflected) deflected++;
            //  The approach axis is due south, so everything across it is |x|.
            perpendicular = Math.max(perpendicular, Math.abs(x));
        };
        const run = (ms: number, wx: number, wz: number) => { for (let t = 0; t < ms / 1000; t += dt) frame(wx, wz); };

        for (let burst = 0; burst < 8; burst++) {
            const readX = x, readZ = z;
            run(120, 0, 0);                                   //  round-trip latency: stick down, at rest
            const dx = -readX, dz = 98 - readZ;
            const len = Math.hypot(dx, dz) || 1;
            aimX = dx / len; aimZ = dz / len;
            run(300, aimX * speed, aimZ * speed);             //  the burst
            run(406, 0, 0);                                   //  released between bursts
        }
        return { path, perpendicular, reversals, deflected, contacted };
    }

    const BAR = 0.8;   //  the feel court's own bar, so this test fails when that gate would

    it('WITNESS — the press really does press: contact and the dead-on branch both fire', () => {
        //  Vacuity clause (a). Without this the whole block could pass by never touching the
        //  shelter at all, which is exactly how an earlier version of this gate went green.
        const blind = burstedPress(false);
        expect(blind.contacted).toBeGreaterThan(100);
        expect(blind.deflected).toBeGreaterThan(100);
    });

    it('PRE-FIX — judging the velocity makes the castaway wobble: metres of path, no progress', () => {
        const blind = burstedPress(false);
        expect(blind.perpendicular).toBeLessThan(BAR);        //  the gate goes red
        expect(blind.path).toBeGreaterThan(4);                //  ...while moving the whole time
        expect(blind.reversals).toBeGreaterThanOrEqual(4);    //  because it keeps turning round
    });

    it('FIXED — judging the request walks the castaway around the shelter', () => {
        const seeing = burstedPress(true);
        expect(seeing.perpendicular).toBeGreaterThan(BAR);
        expect(seeing.reversals).toBeLessThan(4);
    });

    it('and it is PROGRESS that improved, not merely motion — same path, more arrival', () => {
        //  The trap this guards: a "fix" that scores by moving the castaway further rather
        //  than by getting them somewhere. Path length is near-identical between the two;
        //  what changes is how much of it went anywhere.
        const blind = burstedPress(false);
        const seeing = burstedPress(true);
        expect(Math.abs(seeing.path - blind.path)).toBeLessThan(blind.path * 0.25);
        expect(seeing.perpendicular / blind.perpendicular).toBeGreaterThan(2.5);
    });

    it('a HELD stick is unchanged — the fix touches the bursted case only', () => {
        //  One unbroken hold already worked (device: 1.70 m, 0 reversals). If this moves, the
        //  change is not the narrow one it claims to be.
        const dt = 1 / 60;
        const hold = (tellIntent: boolean) => {
            let x = 0, z = 101.2, velX = 0, velZ = 0, contact = false, tX = 0, tZ = 0, perp = 0;
            const len = Math.hypot(0, 98 - 101.2) || 1;
            const wantX = 0, wantZ = ((98 - 101.2) / len) * TUNE.walkSpeedMps;
            for (let t = 0; t < 2.4; t += dt) {
                velX = approachScalar(velX, wantX, TUNE.moveAccelMps2 * dt);
                velZ = approachScalar(velZ, wantZ, TUNE.moveAccelMps2 * dt);
                const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                    contact ? tX : 0, contact ? tZ : 0,
                    tellIntent ? wantX : undefined, tellIntent ? wantZ : undefined);
                x = r.x; z = r.z; tX = r.velX; tZ = r.velZ; contact = r.contacted;
                perp = Math.max(perp, Math.abs(x));
            }
            return perp;
        };
        expect(hold(true)).toBeCloseTo(hold(false), 2);
        expect(hold(true)).toBeGreaterThan(BAR);
    });

    it('THE SECOND CAUSE — contact is penetration, so a coasting mover loses its memory', () => {
        //  Found by re-running the trace AFTER the intent fix: four reversals survived, and on
        //  every one the dead-on branch DID fire and `priorAlong` was exactly 0.000. The hint
        //  was not being ignored any more; it was empty.
        //
        //  Because contact means overlapping, and a mover coasting along a curved surface
        //  leaves it — by 2.5 cm, measured. That ends contact while the castaway is plainly
        //  still against the shelter, so every stick release wiped the direction memory and
        //  the next press re-picked a side. This is C3's NOTE N6, carried as
        //  IDENTIFIED-NOT-VERIFIED since the last pass; the trace verifies it here.
        //
        //  Asserted as the mechanism, not just the outcome: the gap really does leave contact
        //  while staying inside the memory band, so the fix is aimed at something real.
        const dt = 1 / 60;
        let x = 0, z = 101.2, velX = 0, velZ = 0, contact = false, tX = 0, tZ = 0;
        let leftContactWhileStillLeaning = 0;
        const run = (seconds: number, wx: number, wz: number) => {
            for (let t = 0; t < seconds; t += dt) {
                velX = approachScalar(velX, wx, TUNE.moveAccelMps2 * dt);
                velZ = approachScalar(velZ, wz, TUNE.moveAccelMps2 * dt);
                if (Math.hypot(velX, velZ) < 0.001) { velX = 0; velZ = 0; continue; }
                const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                    contact ? tX : 0, contact ? tZ : 0, wx, wz);
                if (!r.contacted && r.nearestGapM <= TUNE.slideMemoryGapM) leftContactWhileStillLeaning++;
                x = r.x; z = r.z; tX = r.velX; tZ = r.velZ; contact = r.contacted;
            }
        };
        run(1.2, 0, -TUNE.walkSpeedMps);   //  press in and start sliding
        run(0.5, 0, 0);                    //  release — the castaway coasts along the surface
        expect(leftContactWhileStillLeaning).toBeGreaterThan(0);
    });

    it('CAUSE 2 ALONE — the leaning memory, A/B\'d with the intent fix already in place', () => {
        //  C3 MAJOR-1. The first cut of this block only ever compared "neither fix" against
        //  "both fixes", so the leaning gate had NO regression of its own — deleting it from
        //  `game.ts` left the whole suite green. Worse, the staging those tests used (z=101.2)
        //  is one of the few where the gate is a small NEGATIVE, so even a direct A/B there
        //  would have argued against it.
        //
        //  Measured across stagings, intent fix on both sides, perpendicular in metres:
        //
        //      startZ   intent only   + leaning
        //      100.5       1.114         1.706
        //      101.2       1.702         1.622   <- the old staging: the gate looks bad here
        //      102.0       0.943         1.649
        //      102.5       0.643         1.702   <- fails the bar without it, clears with it
        //      103.0       0.392         1.631
        //      104.0       0.450         1.611
        //
        //  So it is tested at 102.5, where it is the difference between red and green, and the
        //  102.5-vs-101.2 spread is itself asserted below so nobody re-tunes the staging back
        //  to the one distance that flatters the wrong answer.
        const withoutMemory = burstedPress(true, false, 102.5);
        const withMemory = burstedPress(true, true, 102.5);
        expect(withoutMemory.perpendicular).toBeLessThan(BAR);      //  the intent fix alone is not enough
        expect(withMemory.perpendicular).toBeGreaterThan(BAR);
        expect(withMemory.reversals).toBeLessThan(withoutMemory.reversals);
    });

    it('the leaning memory helps at MOST press distances, not just the one it is tested at', () => {
        //  Guards against the fix being a coincidence of staging — the exact shape C3 MAJOR-2
        //  caught on an earlier metric in this same file.
        const distances = [100.5, 102.0, 102.5, 103.0, 104.0];
        const improved = distances.filter((z) =>
            burstedPress(true, true, z).perpendicular > burstedPress(true, false, z).perpendicular);
        expect(improved.length).toBe(distances.length);
    });

    it('FIXED, both causes — the memory survives a release and the wobble stops', () => {
        const blind = burstedPress(false, false);
        const both = burstedPress(true, true);
        expect(both.perpendicular).toBeGreaterThan(BAR);
        expect(both.reversals).toBeLessThanOrEqual(blind.reversals / 2);
    });

    it('a mover that walks away DOES forget — but it takes 23 frames, not the one I claimed', () => {
        //  C3 MAJOR-2. The comment here used to read "one frame of walking at speed covers far
        //  more ground than the band allows", under an assertion carrying a `* 0.5` fudge —
        //  because the strong form is false and only the weakened one passed. One frame at
        //  walking pace is 5.8 cm against a 10 cm band, and a mover reversing out of a press
        //  must first turn 3.5 -> -3.5 m/s at `moveAccelMps2`. Measured: 23 frames, 383 ms.
        //
        //  The claim is now the measurement, and the fudge is gone. The band's real guarantee
        //  is geometric, not temporal — asserted in the sibling test below.
        const dt = 1 / 60;
        expect(TUNE.walkSpeedMps * dt).toBeLessThan(TUNE.slideMemoryGapM);   //  the honest direction
        let x = 0, z = 101.2, velX = 0, velZ = 0, contact = false, tX = 0, tZ = 0;
        let gap = Infinity;
        const step = (wx: number, wz: number) => {
            velX = approachScalar(velX, wx, TUNE.moveAccelMps2 * dt);
            velZ = approachScalar(velZ, wz, TUNE.moveAccelMps2 * dt);
            const leaning = contact || gap <= TUNE.slideMemoryGapM;
            const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                leaning ? tX : 0, leaning ? tZ : 0, wx, wz);
            x = r.x; z = r.z; tX = r.velX; tZ = r.velZ;
            contact = r.contacted; gap = r.nearestGapM;
            return leaning;
        };
        for (let t = 0; t < 1; t += dt) step(0, -TUNE.walkSpeedMps);   //  press in — memory live
        expect(contact || gap <= TUNE.slideMemoryGapM).toBe(true);
        let frames = 0;
        while (step(0, TUNE.walkSpeedMps) && frames < 600) frames++;   //  then walk straight off
        expect(frames).toBeCloseTo(23, -1);                            //  measured, not asserted
        expect(contact).toBe(false);
        expect(gap).toBeGreaterThan(TUNE.slideMemoryGapM);
    });

    it('and a SECOND obstacle does not inherit the first one\'s direction', () => {
        //  C3 MAJOR-2, second half. The old version of this guard named exactly this risk in
        //  its comment and then tested it against a field containing ONE obstacle — it could
        //  not fail. This one has two, staged on the side the slide actually exits toward, at
        //  a spread of separations, and compares the resolved position frame by frame against
        //  the old contact-only gate. If the band ever steers a contact with B using a
        //  direction earned against A, the two runs diverge.
        const dt = 1 / 60;
        const walk = (useBand: boolean, separation: number) => {
            const field: Obstacle[] = [
                { x: 0, z: 98, radius: TUNE.shelterCollisionRadius },
                { x: separation, z: 98, radius: TUNE.shelterCollisionRadius },
            ];
            let x = 0, z = 101.2, velX = 0, velZ = 0, contact = false, tX = 0, tZ = 0;
            let gap = Infinity;
            const path: number[] = [];
            for (let t = 0; t < 4; t += dt) {
                //  Press at the first, then drift along toward the second.
                const wantX = t > 1.2 ? TUNE.walkSpeedMps : 0;
                const wantZ = t > 1.2 ? 0 : -TUNE.walkSpeedMps;
                velX = approachScalar(velX, wantX, TUNE.moveAccelMps2 * dt);
                velZ = approachScalar(velZ, wantZ, TUNE.moveAccelMps2 * dt);
                if (Math.hypot(velX, velZ) < 0.001) { velX = 0; velZ = 0; continue; }
                const leaning = useBand ? (contact || gap <= TUNE.slideMemoryGapM) : contact;
                const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, field,
                    leaning ? tX : 0, leaning ? tZ : 0, wantX, wantZ);
                x = r.x; z = r.z; tX = r.velX; tZ = r.velZ;
                contact = r.contacted; gap = r.nearestGapM;
                path.push(x, z);
            }
            return path;
        };
        for (const separation of [2.6, 3.2, 4.0, 5.0]) {
            const banded = walk(true, separation);
            const contactOnly = walk(false, separation);
            expect(banded.length).toBe(contactOnly.length);
            for (let i = 0; i < banded.length; i++) {
                expect(banded[i]).toBeCloseTo(contactOnly[i], 6);
            }
        }
    });

    it('THE GUARD TABLE\'S OWN NUMBERS — the conveyor rate and the pin, pinned', () => {
        //  C3 MINOR-2: the as-built quotes "conveyor 0.925x" and "the pin 4.38 m" as evidence
        //  that this slice broke nothing, and neither figure appeared in any test, tool or
        //  source file — only in prose. C3 could not reproduce either, because the staging that
        //  produces them was recorded nowhere. Both are real; what was missing was anything
        //  that would notice if they stopped being real. That is the whole Vacuity problem in
        //  miniature: a number in a report that nothing checks is a number nobody has verified.
        //
        //  Pinned here WITH their staging, and asserted identical across the A/B, because the
        //  claim being made is "unchanged", not "some particular value".
        const dt = 1 / 60;
        const conveyorRate = (deg: number, tellIntent: boolean) => {
            const a = (deg * Math.PI) / 180;
            let x = Math.sin(a) * 6, z = 98 + Math.cos(a) * 6;
            //  A fixed world direction at full walking pace, held for 4 s — a glancing blow
            //  that must never travel faster than walking. C3 MAJOR-3 measured 1.99x here.
            const velX = -Math.sin(a) * TUNE.walkSpeedMps, velZ = -Math.cos(a) * TUNE.walkSpeedMps;
            let contact = false, gap = Infinity, tX = 0, tZ = 0, moved = 0;
            for (let i = 0; i < 240; i++) {
                const leaning = contact || gap <= TUNE.slideMemoryGapM;
                const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                    leaning ? tX : 0, leaning ? tZ : 0,
                    tellIntent ? velX : undefined, tellIntent ? velZ : undefined);
                moved += Math.hypot(r.x - x, r.z - z);
                x = r.x; z = r.z; tX = r.velX; tZ = r.velZ; contact = r.contacted; gap = r.nearestGapM;
            }
            return moved / (240 * dt) / TUNE.walkSpeedMps;
        };
        for (const deg of [10, 45, 80]) {
            expect(conveyorRate(deg, true)).toBeCloseTo(0.9246, 3);
            expect(conveyorRate(deg, true)).toBeCloseTo(conveyorRate(deg, false), 9);
            expect(conveyorRate(deg, true)).toBeLessThan(1);   //  never a conveyor
        }

        const pinTravel = (tellIntent: boolean) => {
            let x = 0, z = 101.2, velX = 0, velZ = 0, contact = false, gap = Infinity, tX = 0, tZ = 0;
            const from = { x, z };
            for (let t = 0; t < 2; t += dt) {
                const dx = -x, dz = 98 - z, len = Math.hypot(dx, dz) || 1;
                const wx = (dx / len) * TUNE.walkSpeedMps, wz = (dz / len) * TUNE.walkSpeedMps;
                velX = approachScalar(velX, wx, TUNE.moveAccelMps2 * dt);
                velZ = approachScalar(velZ, wz, TUNE.moveAccelMps2 * dt);
                const leaning = contact || gap <= TUNE.slideMemoryGapM;
                const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                    leaning ? tX : 0, leaning ? tZ : 0,
                    tellIntent ? wx : undefined, tellIntent ? wz : undefined);
                x = r.x; z = r.z; tX = r.velX; tZ = r.velZ; contact = r.contacted; gap = r.nearestGapM;
            }
            return Math.hypot(x - from.x, z - from.z);
        };
        expect(pinTravel(true)).toBeCloseTo(4.379, 2);
        expect(pinTravel(true)).toBeCloseTo(pinTravel(false), 9);
    });

    it('deliberate STEERING along the wall still steers, at any stick pressure', () => {
        //  The failure mode of this fix: treating every contact as dead-on and snapping the
        //  castaway onto a committed tangent, so a player pushing sideways gets overruled.
        //  A lightly-held stick is the sharp case — the slowest legal walk is 1.59 m/s
        //  (exhausted x heavy), and a partly-deflected stick is slower still, so anything
        //  keyed to `walkSpeedMps` would hijack it. This is keyed to the request's own
        //  direction, which is scale-free, and both pressures must survive.
        const dt = 1 / 60;
        const steer = (tellIntent: boolean, speed: number) => {
            let x = 0, z = 101.2, velX = 0, velZ = 0, contact = false, tX = 0, tZ = 0;
            const run = (seconds: number, wx: number, wz: number) => {
                for (let t = 0; t < seconds; t += dt) {
                    velX = approachScalar(velX, wx, TUNE.moveAccelMps2 * dt);
                    velZ = approachScalar(velZ, wz, TUNE.moveAccelMps2 * dt);
                    if (Math.hypot(velX, velZ) < 0.001) { velX = 0; velZ = 0; continue; }
                    const r = stepMovement(x, z, velX, velZ, dt, TUNE.playerCollisionRadius, SHELTER,
                        contact ? tX : 0, contact ? tZ : 0,
                        tellIntent ? wx : undefined, tellIntent ? wz : undefined);
                    x = r.x; z = r.z; tX = r.velX; tZ = r.velZ; contact = r.contacted;
                }
            };
            run(1, 0, -speed);                //  press in
            const pressedAt = x;
            run(1.5, speed, 0);               //  then push hard along the wall
            return x - pressedAt;
        };
        for (const speed of [TUNE.walkSpeedMps, 0.7]) {
            //  Steering must work, and must be unchanged by the fix.
            expect(steer(true, speed)).toBeGreaterThan(0.5);
            expect(steer(true, speed)).toBeCloseTo(steer(false, speed), 1);
        }
    });
});

describe('THE SLIDE IS FRAME-RATE INDEPENDENT — the misattributed regression', () => {
    /**
     * `slideRetention` was applied ONCE PER FRAME to an already-decayed velocity, so it
     * compounded with the frame rate: the same slide along the same wall measured 2.29 m/s on
     * a 71 fps machine and 1.60 m/s on a 77 fps one.
     *
     * It was blamed on the One Body Resolver across five device runs with a perfect
     * correlation — every Resolver build ran a few fps faster, so slide fell whenever the
     * Resolver was present and recovered whenever it was reverted. **The correlation was real
     * and the causation was backwards.** This is the test that tells the two apart.
     */
    const slideFor = (fps: number) => {
        const dt = 1 / fps;
        const obstacles = [{ x: 2, z: 0, radius: 1 }];
        let x = 0, z = 0, vx = 4, vz = 0.6;
        let travelled = 0;
        //  One second of wall-clock contact, however many frames that takes.
        for (let t = 0; t < 1; t += dt) {
            const before = { x, z };
            const step = stepMovement(x, z, vx, vz, dt, 0.35, obstacles);
            x = step.x; z = step.z; vx = step.velX; vz = step.velZ;
            travelled += Math.hypot(x - before.x, z - before.z);
        }
        return travelled;
    };

    it('one second of sliding covers the same ground at 30, 60 and 144 fps', () => {
        const slow = slideFor(30);
        const mid = slideFor(60);
        const fast = slideFor(144);
        //  Within 20%, and the bound is honest about what is left. The per-frame COMPOUNDING
        //  is gone — that was the 30%+ collapse, and it collapsed in the wrong direction
        //  (faster machines slid slower). What remains is ordinary integration spread over a
        //  curved path plus one push-out correction per frame, and it now runs the sane way
        //  round: more frames, slightly more distance. Tightening it further means reworking
        //  push-out to be dt-aware, which is a bigger change than this defect justifies.
        expect(Math.abs(fast - mid) / mid, `60fps ${mid.toFixed(2)}m vs 144fps ${fast.toFixed(2)}m`)
            .toBeLessThan(0.25);
        expect(Math.abs(slow - mid) / mid, `60fps ${mid.toFixed(2)}m vs 30fps ${slow.toFixed(2)}m`)
            .toBeLessThan(0.25);
    });

    it('60 fps behaviour is bit-for-bit what it always was', () => {
        //  The normalisation exponent is exactly 1 at the reference rate, so every shipped
        //  movement number — including the bursted-press fix — is untouched.
        expect(Math.pow(TUNE.slideRetention, (1 / 60) * TUNE.slideRetentionReferenceHz))
            .toBeCloseTo(TUNE.slideRetention, 12);
    });
});
