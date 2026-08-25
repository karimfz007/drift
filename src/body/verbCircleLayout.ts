/**
 * WHAT FITS ON THE WHEEL — the verb circle's layout decision, pulled out as pure geometry.
 *
 * WHY THIS IS ITS OWN MODULE. The circle's sizing was a two-step function pretending to be a
 * scaling rule: segments were 116 px wide, or 68 px once there were five or more, while the
 * space between adjacent centres shrinks as the count rises. Those two curves cross almost
 * immediately, and nothing in the code ever compared them — the only thing that looked at the
 * option count was a boolean CSS class. Measured on the harness viewport (412 px tall, so the
 * radius clamps to its 96 px floor and the arc is 217 px long):
 *
 *      n= 3   centres 108.6 px apart   segment 116 px    overlap   7 px   ( 6% of the button)
 *      n= 4   centres  72.4 px apart   segment 116 px    overlap  44 px   (38% of the button)
 *      n= 5   centres  54.3 px apart   segment  68 px    overlap  14 px   (20% of the button)
 *      n= 7   centres  36.2 px apart   segment  68 px    overlap  32 px   (47% of the button)
 *      n=10   centres  24.1 px apart   segment  68 px    overlap  44 px   (65% of the button)
 *
 * So the boat's verbs (ten when this was measured, eleven since Session 3's crossing) are
 * not a new class of problem — they are the same problem at a count
 * that finally made it undeniable. FOUR was already broken and was not even flagged crowded:
 * the class only arms at five, so four verbs draw at full width into 72 px of space.
 *
 * ---------------------------------------------------------------------------------------
 * AND ARC LENGTH IS THE WRONG RULER, which cost this module its first version.
 *
 * The obvious fix is to size the segment from the arc: `arc / (n - 1)` is how far apart the
 * centres are ALONG the curve, so keep the width under that and nothing can touch. The device
 * measured real bounding boxes and said otherwise — five segments, four overlapping pairs,
 * `inspect-boat/float-test by 19x12px`.
 *
 * Two reasons, and both matter. Centres are separated by the CHORD, not the arc, and the chord
 * is always shorter. And a segment is an axis-aligned RECTANGLE on a curve: near the apex two
 * neighbours are separated almost entirely horizontally, so width is what must clear — but near
 * the ends of a 130-degree sweep the separation has tilted, and two boxes can be a full chord
 * apart while their horizontal extents still overlap by half a button.
 *
 * The condition for two equal axis-aligned boxes not to intersect is exact and simple:
 * `|dx| >= w` OR `|dy| >= h`. So this module stops estimating and checks it, for every adjacent
 * pair, at every candidate count. That is why it needs the radius and the sweep rather than a
 * single arc number, and why the segment's height is FIXED in the CSS instead of growing with
 * its label: a box whose height depends on how a word wrapped cannot be reasoned about here.
 *
 * ---------------------------------------------------------------------------------------
 * AND THE ARGUMENT FOR SHOWING BLOCKED VERBS HAD ALREADY STOPPED BEING TRUE.
 *
 * `showVerbCircle`'s own docblock says blocked segments are shown *"greyed, carrying the one
 * true reason — never hidden. Hiding teaches nothing: the player never learns the flask
 * exists."* That is right, and it is why this module does not simply drop them. But the crowded
 * class carried `.verb-reason { display: none }` — so from FIVE verbs onward the reason was
 * already hidden, and a blocked segment was a grey unlabelled lump consuming a fifth of the arc
 * while teaching nothing at all. The justification had quietly stopped applying at exactly the
 * count where the crowding starts.
 *
 * ---------------------------------------------------------------------------------------
 * THE RULE, AND IT IS GENERAL RATHER THAN ABOUT BOATS.
 *
 *   0. IF IT FITS, IT IS DRAWN, in the order the target listed it. Nothing below this line
 *      touches any target that was not already crowded — a two-verb construction frame keeps
 *      its greyed `add-materials` because there was never a shortage of room to argue about.
 *   1. OTHERWISE THE ARC CARRIES WHAT YOU CAN DO. Available verbs, in the target's order, so a
 *      ladder still reads as a ladder. Measured across every target in the game, the most that
 *      are ever available at once is FIVE — the boat, afloat and aboard. Session 3 added an
 *      eleventh boat verb and the number held: `board-boat` needs `!loadKnown` while `cross-boat`
 *      and `ferry-boat` both need it, so they cannot be offered together. That is now MEASURED
 *      in `crossing.test.ts` rather than asserted here, because it is the premise this whole
 *      module rests on and it had never been checked.
 *   2. UNLESS NOTHING IS AVAILABLE, in which case the arc carries the blocked ones, because
 *      that is precisely the case the flask argument is about: a wheel of things you cannot do
 *      is still telling you what this thing is FOR, and an empty wheel would be the silent
 *      refusal [[D-042]] forbids outright.
 *   3. WHATEVER IS LEFT OVER IS NOT HIDDEN. It goes to a pip at the hub, which opens the full
 *      list — every verb, available or not, WITH the reason the crowded class had been
 *      suppressing since DROP 3. So this strictly increases what a player can find out.
 *   4. NOTHING EVER OVERLAPS, by construction and by exact test rather than by estimate.
 *
 * THE ARC ITSELF IS NOT TOUCHED. Radius, sweep and start angle are certified by SLICE 2's
 * ONE-THUMB REACH gate; this module works within the geometry it is handed.
 */

/** One option as the circle receives it — mirrors `CircleOption` in `hud.ts`. */
export interface LayoutOption {
    id: string;
    /**
     * A verb from the universal tail — `Move` today. It keeps its place on the arc when the
     * wheel overflows, because a verb that appears at many targets must not move about
     * depending on how busy one of them happens to be. See `planVerbCircle`.
     */
    universal?: boolean;
    available: boolean;
}

/**
 * THE THUMB MINIMUM, and it is not a new number: DROP 3's crowded note certified it while
 * narrowing the segment to 68 px — *"68px still clears the ~48px minimum a thumb needs"*.
 * A segment is never drawn narrower than this; the arc takes fewer instead.
 */
export const CIRCLE_MIN_TOUCH_PX = 48;
/** The comfortable width, unchanged: a segment never grows past what it was designed at. */
export const CIRCLE_MAX_WIDTH_PX = 116;
/**
 * THE SEGMENT'S HEIGHT IS FIXED, and the CSS is what makes that true (`height`, not
 * `min-height`, with the label clamped). The non-overlap test below needs a height it can rely
 * on: a box that grows when a label wraps is a box this module cannot reason about, and that
 * is exactly how the first version of this file came to certify a layout the device then
 * measured four overlapping pairs in.
 *
 * 48 RATHER THAN THE 52 IT WAS DRAWN AT, and the four pixels are worth more than they look.
 * The vertical gap between the two segments at the end of the sweep is just under 52 px on the
 * 96 px arc, so a 52 px box misses clearing by a hair and the width has to collapse to 52 px to
 * compensate. At 48 the pair clears vertically instead and the width jumps to 71 px — the same
 * count of segments, each half again as wide, from four pixels of height nobody was using.
 */
export const CIRCLE_SEGMENT_HEIGHT_PX = 48;
/**
 * Below this the reason line cannot be read, so it is not drawn — a WIDTH, never a count.
 * The old `.crowded` rule hid it from five options onward whether it would have fitted or not.
 */
export const CIRCLE_REASON_MIN_WIDTH_PX = 96;

export interface CircleGeometry {
    /** Arc radius in px — `clamp(96, 132, innerHeight * 0.22)` in `hud.ts`. */
    radius: number;
    /** Total sweep in radians — `0.72π`. */
    spread: number;
}

export interface CirclePlan {
    /** What the wheel draws, in order along the arc. */
    arc: LayoutOption[];
    /** What the hub pip carries. Empty when everything fits. */
    overflow: LayoutOption[];
    /** Drawn segment width, px. Chosen so that no two segments can intersect. */
    segmentWidth: number;
    /** Whether there is room to print each segment's reason under its label. */
    showReasons: boolean;
    /** How many segments this arc can carry without any two of them touching. */
    capacity: number;
}

/** Where segment `i` of `n` sits, relative to the hub, in the same maths `hud.ts` draws with. */
export function segmentCentre(i: number, n: number, g: CircleGeometry): { x: number; y: number } {
    const t = n === 1 ? 0.5 : i / (n - 1);
    //  `inward` only mirrors the sweep, so it cannot change whether two boxes intersect.
    const angle = -Math.PI / 2 - g.spread / 2 + g.spread * t;
    return { x: Math.cos(angle) * g.radius, y: Math.sin(angle) * g.radius };
}

/**
 * THE WIDTH THIS COUNT COULD BE DRAWN AT, or null if no legible width clears every pair.
 *
 * Exact, not estimated: two equal axis-aligned boxes miss each other when their centres differ
 * by at least a full width horizontally OR a full height vertically. The width is taken as
 * large as the tightest adjacent pair allows and then held to the thumb minimum — if that
 * cannot be met, this count does not fit and the caller tries one fewer.
 *
 * ONLY ADJACENT PAIRS ARE CHECKED, and that is sound rather than lazy: the sweep is a single
 * monotone arc under 180 degrees, so any two segments further apart along it are further apart
 * in space as well. The device measures ALL pairs, which is what would catch it if that ever
 * stopped being true.
 */
export function widthFor(n: number, g: CircleGeometry): number | null {
    if (n <= 1) return CIRCLE_MAX_WIDTH_PX;
    let width = CIRCLE_MAX_WIDTH_PX;
    for (let i = 0; i < n - 1; i++) {
        const a = segmentCentre(i, n, g);
        const b = segmentCentre(i + 1, n, g);
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.y - a.y);
        //  Cleared vertically already — this pair puts no ceiling on the width at all.
        if (dy >= CIRCLE_SEGMENT_HEIGHT_PX) continue;
        //  Otherwise the horizontal gap is the whole of it.
        width = Math.min(width, dx);
    }
    return width >= CIRCLE_MIN_TOUCH_PX ? width : null;
}

/**
 * HOW MANY SEGMENTS THIS ARC CAN CARRY. Counts down from a generous ceiling to the first that
 * clears, so the answer is the geometry's rather than a guess about how many verbs feel like
 * too many. Floored at two: a wheel is only ever drawn when there is a real choice, and one
 * option is never a wheel — `tapOpensCircle` decides that, not this.
 */
export function circleCapacity(g: CircleGeometry): number {
    for (let n = 12; n >= 2; n--) if (widthFor(n, g) !== null) return n;
    return 2;
}

/**
 * DECIDE WHAT GOES ON THE ARC AND WHAT GOES TO THE PIP.
 *
 * Pure, and deliberately so: this is the whole of the scaling decision, and it can be asserted
 * against every count from one to fifty without a browser. The renderer does not get to make
 * this choice a second time.
 */
export function planVerbCircle(options: readonly LayoutOption[], g: CircleGeometry): CirclePlan {
    const capacity = circleCapacity(g);

    const draw = (arc: LayoutOption[], overflow: LayoutOption[]): CirclePlan => {
        const width = widthFor(arc.length, g) ?? CIRCLE_MIN_TOUCH_PX;
        return {
            arc,
            overflow,
            segmentWidth: width,
            showReasons: width >= CIRCLE_REASON_MIN_WIDTH_PX,
            capacity,
        };
    };

    //  RULE 0, AND IT COMES FIRST BECAUSE IT IS THE CONSERVATIVE ONE: if everything fits,
    //  everything is drawn. Withholding a verb the arc had room for would be a pure loss — a
    //  two-verb construction frame offering `move-structure` and a greyed `add-materials` has
    //  the whole arc for the pair and no crowding to solve. So nothing below this line touches
    //  any target that was not already overflowing.
    if (options.length <= capacity) return draw([...options], []);

    //  RULES 1 AND 2, which only arbitrate when the arc genuinely cannot take everything.
    //
    //  AVAILABILITY DECIDES THE ORDER, NOT THE MEMBERSHIP — and the first cut of this had that
    //  wrong in a way the device caught. It put ONLY the available verbs on the arc, so the fire
    //  (seven verbs, three of them live, capacity four) drew three segments, LEFT A SLOT EMPTY,
    //  and sent four blocked verbs to the pip. Leaving room unused while withholding something
    //  is indefensible on exactly the reasoning Rule 0 is built on.
    //
    //  So the arc is FILLED: everything the survivor can do, then blocked ones in the target’s
    //  own order until it is full. A greyed segment carrying only its label still teaches — it
    //  names a capability this object has — and the reason is one press away in the list.
    const available = options.filter((o) => o.available);
    const blocked = options.filter((o) => !o.available);
    //  UNIVERSAL VERBS KEEP THEIR SLOT, and this is the one place ordering is not simply
    //  the target’s own. `Move` is appended by the universal tail, so it is LAST in every
    //  target’s list and therefore the first available verb pushed out when the arc fills.
    //  Measured: it stayed on the wheel at the shelter, the crate, the workspace and the
    //  frame in every state, and slid behind the pip at a fire with four of its own six
    //  verbs live. A verb whose position depends on how busy the nearby object is has lost
    //  the thing that made it worth being universal — and `Move` is `holdOnly`, so buried it
    //  becomes hold, then pip, then row.
    //
    //  IT COSTS A LOCAL VERB ITS SLOT, and that is the trade taken deliberately: the local
    //  one still has a tap route or a place in the list, and it is local, so a survivor
    //  learns it HERE rather than expecting it everywhere.
    const universal = available.filter((o) => o.universal);
    const local = available.filter((o) => !o.universal);
    const ordered = [...local, ...universal, ...blocked];
    if (universal.length > 0 && ordered.slice(0, capacity).every((o) => !o.universal)) {
        //  The tail did not fit in the target’s own order, so it takes the last slot from
        //  the local verbs rather than going to the pip.
        const head = local.slice(0, Math.max(0, capacity - universal.length));
        const kept = [...head, ...universal];
        const rest = [...local.slice(head.length), ...blocked];
        return draw(kept.slice(0, capacity), [...kept.slice(capacity), ...rest]);
    }

    //  RULE 3. What is left over goes to the pip, nearest-first by the same ordering.
    return draw(ordered.slice(0, capacity), ordered.slice(capacity));
}
