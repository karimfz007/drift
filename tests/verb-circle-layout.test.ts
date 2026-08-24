/**
 * THE VERB CIRCLE SCALES, AND THE PROOF IS GEOMETRY RATHER THAN A SCREENSHOT.
 *
 * The circle sized its segments with a two-step rule — 116 px, or 68 px once there were five or
 * more — against a spacing that shrinks as the count rises, and nothing in the code ever
 * compared the two. `planVerbCircle` is that comparison, extracted so it can be asserted at
 * every count without a browser, which is the only way to know the rule holds for the
 * twelve-verb target nobody has built yet.
 *
 * THE CONDITION IS EXACT, and stating it here is the whole point: two equal axis-aligned boxes
 * of size `w x h` centred at points differing by `(dx, dy)` do not intersect when
 * `|dx| >= w` OR `|dy| >= h`. That is what these tests assert, over EVERY pair rather than only
 * adjacent ones — the module reasons about adjacent pairs because a monotone arc under 180
 * degrees makes that sound, and this is what would catch it if that ever stopped being true.
 *
 * The first version of the module used arc length as its ruler, and it was WRONG in a way only
 * a real box could show: centres are separated by the chord rather than the arc, and near the
 * ends of a 130-degree sweep two boxes can be a full chord apart while their horizontal extents
 * still overlap by half a button. The device measured `inspect-boat/float-test by 19x12px` and
 * that is why the tests below compute intersections instead of comparing widths to spacings.
 */
import { describe, expect, it } from 'vitest';
import {
    planVerbCircle, circleCapacity, widthFor, segmentCentre,
    type LayoutOption, type CircleGeometry,
    CIRCLE_MIN_TOUCH_PX, CIRCLE_MAX_WIDTH_PX, CIRCLE_SEGMENT_HEIGHT_PX, CIRCLE_REASON_MIN_WIDTH_PX,
} from '../src/body/verbCircleLayout';

/**
 * THE TWO GEOMETRIES THE GAME ACTUALLY DRAWS. `radius = clamp(96, 132, innerHeight * 0.22)`
 * and `spread = 0.72π`, so a landscape phone sits on the 96 px floor and anything tall enough
 * reaches the 132 px ceiling. Both are checked because the floor is the tight one.
 */
const SHORT: CircleGeometry = { radius: 96, spread: Math.PI * 0.72 };
const TALL: CircleGeometry = { radius: 132, spread: Math.PI * 0.72 };
const GEOMETRIES = [SHORT, TALL];

const opts = (n: number, availableCount = n): LayoutOption[] =>
    Array.from({ length: n }, (_, i) => ({ id: `v${i}`, available: i < availableCount }));

/** Every pair of segments that genuinely intersect, at the plan's own width. */
function intersections(n: number, width: number, g: CircleGeometry): string[] {
    const hits: string[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = segmentCentre(i, n, g);
            const b = segmentCentre(j, n, g);
            const dx = width - Math.abs(b.x - a.x);
            const dy = CIRCLE_SEGMENT_HEIGHT_PX - Math.abs(b.y - a.y);
            if (dx > 1e-9 && dy > 1e-9) hits.push(`${i}/${j} by ${dx.toFixed(1)}x${dy.toFixed(1)}px`);
        }
    }
    return hits;
}

describe('the verb circle scales with its option count', () => {
    it('NOTHING EVER OVERLAPS — no two segments intersect, at any count, on either geometry', () => {
        for (const g of GEOMETRIES) {
            for (let n = 1; n <= 50; n++) {
                for (const avail of [0, 1, Math.ceil(n / 2), n]) {
                    const plan = planVerbCircle(opts(n, Math.min(avail, n)), g);
                    const hits = intersections(plan.arc.length, plan.segmentWidth, g);
                    expect(hits, `n=${n} avail=${avail} r=${g.radius}: drew ${plan.arc.length} at ${plan.segmentWidth.toFixed(1)}px — ${hits.join(', ')}`)
                        .toEqual([]);
                }
            }
        }
    });

    it('...and the OLD geometry fails that same property, which is why this exists', () => {
        //  The rule that shipped: every option on the arc at 116 px, or 68 px from five up.
        const oldWidth = (n: number) => (n >= 5 ? 68 : 116);
        const broken: string[] = [];
        for (let n = 2; n <= 10; n++) {
            const hits = intersections(n, oldWidth(n), SHORT);
            if (hits.length > 0) broken.push(`n=${n} (${hits.length} pair(s))`);
        }
        //  MEASURED, not asserted loosely. On the 96px arc the shipped rule intersected from
        //  FOUR options upward — and four was the count it did not even flag as crowded.
        expect(broken.map((b2) => b2.split(' ')[0]), 'the old geometry did not overlap, so this change has no cause')
            .toEqual(['n=4', 'n=5', 'n=6', 'n=7', 'n=8', 'n=9', 'n=10']);
        //  And the boat’s ten verbs were not merely touching: NINETEEN pairs intersected,
        //  some of them three segments apart, which is what a 65% overlap actually looks like.
        expect(intersections(10, oldWidth(10), SHORT)).toHaveLength(19);
        expect(intersections(4, oldWidth(4), SHORT)).toHaveLength(1);
    });

    it('NOTHING IS EVER TOO SMALL FOR A THUMB — the drawn width holds the certified 48px', () => {
        for (const g of GEOMETRIES) {
            for (let n = 1; n <= 50; n++) {
                const plan = planVerbCircle(opts(n), g);
                expect(plan.segmentWidth, `n=${n} on r=${g.radius}`).toBeGreaterThanOrEqual(CIRCLE_MIN_TOUCH_PX);
                expect(plan.segmentWidth).toBeLessThanOrEqual(CIRCLE_MAX_WIDTH_PX);
            }
        }
    });

    it('NOTHING IS EVER LOST — every option comes back exactly once', () => {
        for (const g of GEOMETRIES) {
            for (let n = 1; n <= 50; n++) {
                for (const avail of [0, 3, n]) {
                    const given = opts(n, Math.min(avail, n));
                    const plan = planVerbCircle(given, g);
                    const back = [...plan.arc, ...plan.overflow].map((o) => o.id);
                    expect(back.length, `n=${n} avail=${avail}`).toBe(n);
                    expect(new Set(back).size, 'an option appeared twice').toBe(n);
                    for (const o of given) expect(back, `${o.id} vanished`).toContain(o.id);
                }
            }
        }
    });

    it('IF IT FITS, IT IS DRAWN — a target that was never crowded is untouched by any of this', () => {
        //  The conservative rule, and the one that keeps this change from being a regression
        //  everywhere it was not needed. A construction frame offers `move-structure` (ready)
        //  and a greyed `add-materials`: two segments with the whole arc between them, no
        //  crowding to solve, so withholding the blocked one would be a pure loss.
        const frame: LayoutOption[] = [
            { id: 'add-materials', available: false },
            { id: 'move-structure', available: true },
        ];
        const plan = planVerbCircle(frame, SHORT);
        expect(plan.arc.map((o) => o.id), 'a blocked verb was withheld from an arc with room for it')
            .toEqual(['add-materials', 'move-structure']);
        expect(plan.overflow, 'a pip appeared on a wheel that fits').toHaveLength(0);
        expect(plan.showReasons, 'a two-segment wheel hid its reason').toBe(true);

        //  ...and it holds for every count at or under capacity, at any mix of availability.
        for (const g of GEOMETRIES) {
            const cap = circleCapacity(g);
            for (let n = 1; n <= cap; n++) {
                for (const avail of [0, 1, n]) {
                    const p2 = planVerbCircle(opts(n, Math.min(avail, n)), g);
                    expect(p2.overflow, `n=${n} avail=${avail} overflowed inside capacity ${cap}`).toHaveLength(0);
                    expect(p2.arc).toHaveLength(n);
                }
            }
        }
    });

    it('THE ARC CARRIES WHAT YOU CAN DO, and the order the target listed them in survives', () => {
        //  The boat at B2, aboard: five available among ten — the fullest state in the game.
        const boat: LayoutOption[] = [
            { id: 'inspect-boat', available: true },
            { id: 'survey-hull', available: false },
            { id: 'shore-up-boat', available: false },
            { id: 'dewater-boat', available: false },
            { id: 'repair-frames', available: false },
            { id: 'seal-seams', available: false },
            { id: 'float-test', available: true },
            { id: 'board-boat', available: true },
            { id: 'ferry-boat', available: true },
            { id: 'moor-boat', available: true },
        ];
        for (const g of GEOMETRIES) {
            const plan = planVerbCircle(boat, g);
            expect(plan.arc.every((o) => o.available), `r=${g.radius}: the arc carried something the survivor cannot do`).toBe(true);
            //  ...in the target's own order, so a ladder still reads as a ladder.
            expect(plan.arc.map((o) => o.id))
                .toEqual(['inspect-boat', 'float-test', 'board-boat', 'ferry-boat', 'moor-boat'].slice(0, plan.arc.length));
            expect(plan.overflow.length, `r=${g.radius}`).toBe(10 - plan.arc.length);
        }
        //  On a landscape phone the arc takes four, so ONE available verb goes to the pip —
        //  where it is still pressable. That is the honest cost of a 130-degree sweep at the
        //  96px radius floor, and it is named here rather than left to be discovered.
        expect(planVerbCircle(boat, SHORT).arc).toHaveLength(4);
        expect(planVerbCircle(boat, TALL).arc).toHaveLength(5);
    });

    it('...and at B0 the arc is FOUR, not ten — the two she can do, then the next two rungs', () => {
        //  AVAILABILITY ORDERS THE ARC; IT DOES NOT GATE IT. The first cut put only the
        //  available verbs on the wheel, which left slots empty while things sat behind the
        //  pip — the device caught it at the fire, drawing three segments into room for four.
        //  So the arc fills: `inspect-boat` and `survey-hull` are what she can do, and
        //  `shore-up-boat` and `dewater-boat` follow, greyed. A greyed segment carrying only
        //  its label still teaches — it names a capability the boat has — and the reason is
        //  one press away in the list, which is more than the old wheel gave at this count.
        const b0: LayoutOption[] = [
            { id: 'inspect-boat', available: true },
            { id: 'survey-hull', available: true },
            ...['shore-up-boat', 'dewater-boat', 'repair-frames', 'seal-seams',
                'float-test', 'board-boat', 'ferry-boat', 'moor-boat']
                .map((id) => ({ id, available: false })),
        ];
        const plan = planVerbCircle(b0, SHORT);
        expect(plan.arc.map((o) => o.id), 'the arc did not fill, or filled in the wrong order')
            .toEqual(['inspect-boat', 'survey-hull', 'shore-up-boat', 'dewater-boat']);
        expect(plan.overflow).toHaveLength(6);
        //  ...and every slot the arc has is used before anything is withheld.
        expect(plan.arc).toHaveLength(plan.capacity);
    });

    it('THE ARC IS ALWAYS FULL BEFORE ANYTHING IS WITHHELD — no empty slot beside a pip', () => {
        //  The property behind the fix above, at every count and every mix. An unused slot
        //  next to a "4 more" pip is the shape the device found at the fire.
        for (const g of GEOMETRIES) {
            const cap = circleCapacity(g);
            for (let n = 1; n <= 30; n++) {
                for (let avail = 0; avail <= n; avail++) {
                    const plan = planVerbCircle(opts(n, avail), g);
                    if (plan.overflow.length === 0) continue;
                    expect(plan.arc.length, `n=${n} avail=${avail} r=${g.radius}: ${plan.arc.length} drawn, ${plan.overflow.length} withheld, capacity ${cap}`)
                        .toBe(cap);
                }
            }
        }
    });

    it('WHEN NOTHING IS AVAILABLE THE ARC CARRIES THE REFUSALS — the flask case, unchanged', () => {
        //  The pond: five verbs, none available without a vessel. A wheel that showed only what
        //  you can do would be EMPTY here, which is the silent refusal D-042 forbids outright.
        const plan = planVerbCircle(opts(5, 0), SHORT);
        expect(plan.arc.length, 'the wheel came up empty').toBeGreaterThan(0);
        expect(plan.arc.every((o) => !o.available)).toBe(true);
        expect([...plan.arc, ...plan.overflow]).toHaveLength(5);
    });

    it('THE REASON PRINTS WHENEVER IT FITS, which is a width and never a count', () => {
        for (const g of GEOMETRIES) {
            for (let n = 1; n <= 12; n++) {
                const plan = planVerbCircle(opts(n, 0), g);
                expect(plan.showReasons, `n=${n} on r=${g.radius}`)
                    .toBe(plan.segmentWidth >= CIRCLE_REASON_MIN_WIDTH_PX);
            }
        }
        //  The old rule hid the reason from five options onward outright, whether or not it
        //  would have fitted. Three segments have room and now say so.
        expect(planVerbCircle(opts(3, 0), SHORT).showReasons).toBe(true);
    });

    it('CAPACITY IS DERIVED FROM THE GEOMETRY, not chosen', () => {
        //  Whatever `circleCapacity` returns must itself fit, and one more must not.
        for (const g of GEOMETRIES) {
            const cap = circleCapacity(g);
            expect(widthFor(cap, g), `capacity ${cap} does not actually fit on r=${g.radius}`).not.toBeNull();
            expect(widthFor(cap + 1, g), `${cap + 1} fits on r=${g.radius}, so capacity is too low`).toBeNull();
        }
        //  A wheel is never drawn for one option, so capacity never falls below two however
        //  small the arc — `tapOpensCircle` is what decides a single verb is just the verb.
        expect(circleCapacity({ radius: 1, spread: Math.PI * 0.72 })).toBe(2);
    });

    it('A SINGLE-SEGMENT ARC IS STILL SIZED SANELY (the degenerate case)', () => {
        const plan = planVerbCircle(opts(1, 1), SHORT);
        expect(plan.arc).toHaveLength(1);
        expect(plan.segmentWidth).toBe(CIRCLE_MAX_WIDTH_PX);
        expect(plan.overflow).toHaveLength(0);
    });
});
