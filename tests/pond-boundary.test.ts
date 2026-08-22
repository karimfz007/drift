/**
 * THE POND BOUNDARY IS THE DRAWN WATER — reported THREE times as "still too wide".
 *
 * Two fixes shrank a scalar and both were reported again, because the drawn water is not a
 * circle and no radius can describe it. `island.ts` draws a disc of `POND.radius` at
 * `POND_SURFACE_Y`, and the terrain the disc sits in has its own, much wider, much gentler
 * basin: `groundHeight`'s smoothstep fades over `POND.radius + 6`. So the ground climbs back
 * ABOVE the water plane well inside the disc's rim, and those outer metres of disc are buried
 * under opaque hillside — not drawn, not pickable, and plainly not water to anyone looking.
 *
 * This file asserts the thing the two failed passes could not: that the gate and the geometry
 * are THE SAME QUESTION. It fails loudly if anyone reintroduces a maintained number.
 */
import { describe, expect, it } from 'vitest';
import { POND, POND_SURFACE_Y, groundHeight, isOnPondWater } from '../src/data/world';
import { createInitialState } from '../src/brain/state';
import { isAtPond } from '../src/brain/state';
import type { GameState } from '../src/brain/types';

/** A survivor standing at (x, z). */
function standingAt(x: number, z: number): GameState {
    const s = createInitialState(1_770_000_000_000);
    s.player = { x, y: z };
    return s;
}

/** Every 0.25 m of the disc's bounding square — the whole boundary, not three sample points. */
function* discGrid(): Generator<[number, number]> {
    const r = POND.radius;
    for (let x = POND.x - r; x <= POND.x + r; x += 0.25) {
        for (let z = POND.y - r; z <= POND.y + r; z += 0.25) yield [x, z];
    }
}

describe('the pond boundary is derived from the water that is drawn', () => {
    it('THE DEFECT, NAMED: the disc\u2019s own radius admits real dry land', () => {
        //  THE PROOF THAT A SCALAR COULD NEVER HAVE WORKED. If this ever finds nothing, the
        //  basin has been reshaped to actually fill the disc and the whole premise below is
        //  worth re-reading — so it asserts loudly rather than passing quietly.
        const dry: Array<[number, number]> = [];
        for (const [x, z] of discGrid()) {
            const inDisc = Math.hypot(x - POND.x, z - POND.y) <= POND.radius;
            if (inDisc && groundHeight(x, z) >= POND_SURFACE_Y) dry.push([x, z]);
        }
        expect(dry.length, 'the naive `distance <= POND.radius` reading is sound after all')
            .toBeGreaterThan(0);

        //  And it is not a rounding sliver: the two readings disagree by metres, which is
        //  exactly the "still too wide" that survived two rounds of shrinking numbers.
        const worst = Math.max(...dry.map(([x, z]) => POND.radius - Math.hypot(x - POND.x, z - POND.y)));
        expect(worst, 'the disagreement is sub-metre, so something else caused three reports')
            .toBeGreaterThan(1);
    });

    it('...and the derived boundary refuses every one of those dry points', () => {
        for (const [x, z] of discGrid()) {
            if (groundHeight(x, z) >= POND_SURFACE_Y) {
                expect(isOnPondWater(x, z), `called dry hillside water at ${x.toFixed(2)}, ${z.toFixed(2)}`)
                    .toBe(false);
            }
        }
    });

    it('...while keeping the water itself: standing in it is standing in it', () => {
        expect(isOnPondWater(POND.x, POND.y), 'the middle of the pond was not the pond').toBe(true);
        let wet = 0;
        for (const [x, z] of discGrid()) if (isOnPondWater(x, z)) wet += 1;
        expect(wet, 'the boundary shrank to nothing — a pond you cannot drink from').toBeGreaterThan(200);
    });

    it('THE TWO GATES ARE ONE GATE — the drink gate and the geometry never disagree', () => {
        //  The second report was exactly this disagreement: the drink gate had been narrowed
        //  and the TAP TARGET had not, so a tap up the bank still picked water while the gate
        //  said no. Both now call `isOnPondWater`; this fails the moment one of them stops.
        for (const [x, z] of discGrid()) {
            expect(isAtPond(standingAt(x, z)), `the drink gate disagreed with the water at ${x.toFixed(2)}, ${z.toFixed(2)}`)
                .toBe(isOnPondWater(x, z));
        }
    });

    it('outside the drawn disc is never the pond, however low the ground goes', () => {
        //  The basin fades over `POND.radius + 6`, six metres wider than anything drawn, so
        //  ground below the water plane is NOT sufficient on its own — the disc bounds it.
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 32) {
            for (const d of [POND.radius + 0.01, POND.radius + 1, POND.radius + 5]) {
                const x = POND.x + Math.cos(a) * d;
                const z = POND.y + Math.sin(a) * d;
                expect(isOnPondWater(x, z), `water ${d} m outside the drawn rim`).toBe(false);
            }
        }
    });
});
