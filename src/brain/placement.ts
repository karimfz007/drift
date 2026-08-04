/**
 * THE LDOE PLACEMENT BAR, PINNED DOWN — Drop 3 Part 2 item 3.
 *
 * This bar has been cited since [[D-040]] closed Cycle 03 with *"systems pass, feel fails the
 * LDOE bar"*, and again at [[D-069]] as part of the construction slice's spine. In four
 * cycles of being referenced it was never once defined, which meant it could never be passed
 * — only invoked. A bar you cannot fail is not a bar, and *"make it feel as good as the
 * reference"* is not a specification.
 *
 * IT IS THE DIRECTOR'S DEFINITION, NOT MINE. The five properties below are his, close to
 * verbatim, given when this item asked for them. My contribution is the numbers (one of them,
 * `placementReadableFromM`) and the decision about which layer can honestly witness each one.
 * Both are explicitly the first things to move at playtest.
 *
 * WHAT MAKES THEM CHECKABLE. Three of the five are brain-side properties about the READING —
 * a verdict separable from its reason, an answer that does not change with distance, a point
 * that sits on the terrain — and those are property-tested here. Two are about the GESTURE —
 * a ghost you can see, one tap to commit and one to cancel — and no unit test can witness
 * those, so they are declared as device-only and the harness owns them. Saying which layer
 * owns which is half the point: a bar whose properties all claim to be unit-testable is a bar
 * that has quietly excluded the feel it exists to measure.
 */
import { TUNE } from '../data/tune';
import { siteIsViable, type SiteReading } from './construction';
import type { GameState } from './types';

/** Which layer can actually witness a property. A claim no test can reach is not a property. */
export type WitnessLayer = 'brain' | 'device';

export interface BarProperty {
    id: string;
    /** The director's own words. Kept verbatim so a later reading cannot drift the intent. */
    statement: string;
    witness: WitnessLayer;
    /** How it is actually checked — named, so a green suite cannot mean "nobody looked". */
    how: string;
}

/**
 * THE BAR. Five properties, and passing means all five, because they describe one gesture and
 * four out of five still produces the loop the bar exists to forbid.
 */
export const PLACEMENT_BAR: readonly BarProperty[] = [
    {
        id: 'ghost',
        statement: 'A clear ghost/preview of the structure shows before you commit — you are not placing blind.',
        witness: 'device',
        how: 'the harness asserts a preview element exists and is genuinely painted before any commit tap',
    },
    {
        id: 'glanceable',
        statement: 'Valid vs invalid is obvious at a glance, not something you have to read text to know — colour is enough (green = good, red = blocked), with the reason still available if I want it, not forced on me.',
        witness: 'brain',
        how: 'the reading carries a BINARY verdict that is separable from its reason string, so colour can be driven without text — asserted by `verdictIsSeparable`',
    },
    {
        id: 'readable-at-range',
        statement: 'I can tell if a spot is good from a reasonable distance before walking all the way there — no "walk up, get told no, walk somewhere else" loop.',
        witness: 'brain',
        how: 'the verdict at `placementReadableFromM` must EQUAL the verdict standing on the spot — property-tested over random states and points',
    },
    {
        id: 'one-tap',
        statement: 'One tap commits, one tap cancels — no multi-step confirmation dance.',
        witness: 'device',
        how: 'the harness counts taps from ghost-shown to structure-standing, and requires exactly one; and one tap from ghost-shown to ghost-gone',
    },
    {
        id: 'settled',
        statement: 'It settles cleanly on the terrain, no floating or clipping through the ground.',
        witness: 'brain',
        how: '`settleOnTerrain` returns the ground height verbatim, and is asserted to introduce no offset of its own',
    },
];

/**
 * A placement preview: everything the surface needs to draw a ghost and colour it, with the
 * verdict and the reason kept APART.
 *
 * They are separate fields rather than one nullable string because property 2 is precisely
 * that the colour must not require the text. A single `reason: string | null` would work —
 * null means valid — and would also mean every caller derives the colour by testing a string
 * for emptiness, which is the shape that eventually ships a red ghost with no reason or a
 * green one with a stale message attached.
 */
export interface PlacementPreview {
    /** Property 2: the whole of the colour decision. Nothing else is needed to paint it. */
    valid: boolean;
    /** Property 2: available if wanted, never required to know the verdict. */
    reason: string | null;
    /** Property 5: where the ghost sits. `groundY` verbatim — see `settleOnTerrain`. */
    at: { x: number; y: number; groundY: number };
}

/**
 * Property 5, as a function rather than a promise.
 *
 * It returns the terrain height UNCHANGED, and that is the entire content of the check: no
 * bias, no lift, no "+0.05 so it doesn't z-fight". Every floating-structure bug this project
 * has had came from a well-meant offset exactly like that — [[D-051]]'s remnant-scale bug
 * left depleted nodes hanging in the air for the same reason, a transform applied without
 * re-grounding. If a renderer needs a z-fight nudge it belongs in the renderer, where it can
 * be seen, not baked into the position the game believes.
 */
export function settleOnTerrain(x: number, y: number, groundHeightAt: (x: number, y: number) => number): { x: number; y: number; groundY: number } {
    return { x, y, groundY: groundHeightAt(x, y) };
}

/**
 * The preview for a point. Reuses `siteIsViable` and the caller's own `SiteReading` rather
 * than re-deriving buildability — two sources for "can I build here" is how the ghost and the
 * commit end up disagreeing, which reads to the player as the game lying to them.
 */
export function previewAt(
    state: GameState,
    x: number,
    y: number,
    groundHeightAt: (x: number, y: number) => number,
    reading?: SiteReading | null
): PlacementPreview {
    const viable = siteIsViable(state, x, y);
    const valid = viable && (reading ? reading.buildable : true);
    const reason = valid ? null : (reading?.reason ?? 'Too close to something already standing.');
    return { valid, reason, at: settleOnTerrain(x, y, groundHeightAt) };
}

/**
 * Property 2, asserted rather than assumed: the verdict is knowable without the reason.
 *
 * Written as a real predicate over a preview instead of a comment, so the test witnesses the
 * property on actual values. A preview that carried its verdict only inside the reason text
 * would fail this, which is what makes it worth having.
 */
export function verdictIsSeparable(p: PlacementPreview): boolean {
    return typeof p.valid === 'boolean' && (p.valid ? p.reason === null : typeof p.reason === 'string' && p.reason.length > 0);
}

/**
 * Property 3, as the only form of it that can be checked: the answer does not depend on where
 * you are standing.
 *
 * The loop the director described — walk up, get told no, walk somewhere else — exists when a
 * game withholds the verdict until you arrive. So the check is not "is there a readout at
 * range", which any UI can fake; it is that the verdict computed from `placementReadableFromM`
 * away is IDENTICAL to the one computed standing on the spot. If those can differ, the walk is
 * load-bearing and the bar is failed no matter what the screen shows on approach.
 */
export function verdictAtRangeMatches(
    state: GameState,
    x: number,
    y: number,
    groundHeightAt: (x: number, y: number) => number,
    reading?: SiteReading | null
): boolean {
    const near = previewAt({ ...state, player: { x, y } }, x, y, groundHeightAt, reading);
    const angle = (x + y) % (Math.PI * 2);
    const far = previewAt(
        { ...state, player: { x: x + Math.cos(angle) * TUNE.placementReadableFromM, y: y + Math.sin(angle) * TUNE.placementReadableFromM } },
        x, y, groundHeightAt, reading
    );
    return near.valid === far.valid;
}
