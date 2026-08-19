/**
 * THE RADIAL CIRCLE — the interaction matrix (Slice 2).
 *
 * THE DEFAULT-VERB LAW (C1, binding): a tap ALWAYS fires the context's default verb, and the
 * circle opens on HOLD. My first cut opened it on tap whenever two options existed, which
 * carried a defect class C1 named — a survivor carrying wood tapped their shelter and got a
 * menu instead of sleep, so the most frequent action in the game silently cost two taps.
 *
 * The negative half is the half worth testing hardest, and it is a sweep rather than a
 * spot-check: no capability, at any target, may ever change what a tap does.
 */
import { describe, expect, it } from 'vitest';
import {
    availableVerbs, canFish, declaredDefaultVerbId, defaultVerb, holdOpensCircle,
    tapOpensCircle, verbsFor, verbsWith, UNIVERSAL_VERBS, type UniversalVerb, type VerbTarget,
} from '../src/brain/verbs';
import { buildShelter, buildStorage, createInitialState } from '../src/brain/state';
import { POND } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

/** A thirsty survivor standing in the pond, carrying nothing. */
function atPond(): GameState {
    const s = createInitialState(1);
    s.player.x = POND.x;
    s.player.y = POND.y;
    s.thirst = 40;
    return s;
}

const ids = (list: { id: string }[]) => list.map((v) => v.id);

describe('THE ACCEPTANCE CASE — the pond divides as capability arrives', () => {
    it('no flask, no line: DRINK ONLY, and no circle opens', () => {
        const s = atPond();
        expect(ids(availableVerbs(s, 'pond'))).toEqual(['drink']);
        expect(tapOpensCircle(s, 'pond')).toBe(false);
        expect(defaultVerb(s, 'pond')?.id).toBe('drink');
    });

    it('+ flask: drink OR fill — the circle divides in two, ON HOLD', () => {
        const s = atPond();
        s.tools.flask = true;
        s.tools.flaskSips = 0;
        expect(ids(availableVerbs(s, 'pond'))).toEqual(['drink', 'fill-flask']);
        expect(holdOpensCircle(s, 'pond')).toBe(true);
        //  THE DEFAULT-VERB LAW: the tap still drinks. Acquiring a flask must not tax the
        //  reason you walked to the water in the first place.
        expect(tapOpensCircle(s, 'pond')).toBe(false);
        expect(defaultVerb(s, 'pond')?.id).toBe('drink');
    });

    it('+ fishing line: THREE segments on the hold, and the tap STILL drinks', () => {
        const s = atPond();
        s.tools.flask = true;
        s.tools.flaskSips = 0;
        s.tools.fishingLine = true;
        expect(ids(availableVerbs(s, 'pond'))).toEqual(['drink', 'fill-flask', 'fish']);
        expect(holdOpensCircle(s, 'pond')).toBe(true);
        expect(defaultVerb(s, 'pond')?.id).toBe('drink');
    });

    it('the three stages are strictly cumulative — capability only ever ADDS options', () => {
        //  The property behind the case: no acquisition may take a verb away. A survivor who
        //  finds a flask must never discover that drinking got harder.
        const bare = atPond();
        const withFlask = atPond(); withFlask.tools.flask = true;
        const withBoth = atPond(); withBoth.tools.flask = true; withBoth.tools.fishingLine = true;
        const a = ids(availableVerbs(bare, 'pond'));
        const b = ids(availableVerbs(withFlask, 'pond'));
        const c = ids(availableVerbs(withBoth, 'pond'));
        expect(b).toEqual(expect.arrayContaining(a));
        expect(c).toEqual(expect.arrayContaining(b));
        expect([a.length, b.length, c.length]).toEqual([1, 2, 3]);
    });
});

describe('THE DEFAULT-VERB LAW — no capability may ever tax the frequent verb', () => {
    //  C1's ruling, as a sweep rather than a spot-check. The defect class: an object's most
    //  common action becoming SLOWER because a rarer one became possible. My first cut had
    //  exactly that — a survivor carrying wood taps their shelter and gets a menu instead of
    //  sleep. This walks every target through every capability grant and asserts the tap
    //  never changes what it does.
    const CAPABILITIES: Array<(s: GameState) => void> = [
        (s) => { s.tools.flask = true; s.tools.flaskSips = 0; },
        (s) => { s.tools.fishingLine = true; },
        (s) => { s.inventory.wood = 20; },              // makes mending possible everywhere
        (s) => { s.shelter.durability = 40; },          // ...and worth doing
        (s) => { s.storage.durability = 40; },
    ];
    //  WAVE 1 — 'outboard' joins this list (not 'shoreitem'): drag/study/strip/axe are ALWAYS
    //  present entries regardless of state, the same "always declares a default" property
    //  'pond'/'shelter'/'storage'/'fire' have and 'dropped'/'boar'/'raft'/'fishingspot' do
    //  not — a shore find can legitimately be absent, same as those four.
    //  RULING (C1) — 'ground' joins too: sleep-rough/build-shelter are unconditional, never
    //  gated by anything a capability could grant, so the tap-stability claim holds trivially
    //  and is worth sweeping for that exact reason — a target with no way to fail this check
    //  is not a reason to skip it.
    const TARGETS: VerbTarget[] = ['pond', 'shelter', 'storage', 'fire', 'outboard', 'ground'];

    it('acquiring ANY capability never changes what a tap does, at any target', () => {
        let compared = 0;
        for (const target of TARGETS) {
            const base = builtEverything();
            const before = defaultVerb(base, target)?.id ?? null;
            for (const grant of CAPABILITIES) {
                const after = builtEverything();
                grant(after);
                const now = defaultVerb(after, target)?.id ?? null;
                //  The tap may go from nothing to something as capability arrives. It may
                //  never go from something to nothing, and never swap to a different verb.
                if (before !== null) expect(now).toBe(before);
                compared++;
            }
        }
        //  WITNESS (D-066 a): the sweep must actually have compared combinations.
        expect(compared).toBe(TARGETS.length * CAPABILITIES.length);
    });

    it('the shelter defect C1 named is gone: wood in hand still sleeps on a tap', () => {
        const s = builtEverything();
        s.inventory.wood = 20;
        s.shelter.durability = 40;
        expect(availableVerbs(s, 'shelter').map((v) => v.id)).toEqual(['sleep', 'mend']);
        expect(defaultVerb(s, 'shelter')?.id).toBe('sleep');
        expect(tapOpensCircle(s, 'shelter')).toBe(false);
        expect(holdOpensCircle(s, 'shelter')).toBe(true);
    });

    it('every target declares a default, and it is one of that target own verbs', () => {
        for (const target of TARGETS) {
            const declared = declaredDefaultVerbId(target);
            const known = verbsFor(createInitialState(9), target).map((v) => v.id);
            expect(known).toContain(declared);
        }
    });

    it('a tap asks ONLY when the default is blocked and more than one thing remains', () => {
        const s = atPond();
        s.thirst = TUNE.thirstMax;              // not thirsty: drink, the default, is blocked
        s.tools.flask = true; s.tools.flaskSips = 0;
        s.tools.fishingLine = true;             // fill AND fish remain
        expect(defaultVerb(s, 'pond')).toBeNull();
        expect(tapOpensCircle(s, 'pond')).toBe(true);
    });

    it('when the default is blocked with ONE thing left, the tap just does it', () => {
        const s = builtEverything();
        s.shelter.durability = 0;               // collapsed: sleep blocked
        s.inventory.wood = 20;                  // mend is the only remaining option
        expect(defaultVerb(s, 'shelter')?.id).toBe('mend');
        expect(tapOpensCircle(s, 'shelter')).toBe(false);
    });
});

describe('a tap is the DEFAULT VERB — the circle is the exception, not the rule', () => {
    it('exactly one available option means a default verb and NO circle', () => {
        const s = atPond();
        expect(availableVerbs(s, 'pond')).toHaveLength(1);
        expect(tapOpensCircle(s, 'pond')).toBe(false);
        expect(defaultVerb(s, 'pond')).not.toBeNull();
    });

    it('a BLOCKED segment still does not COUNT — availability is usable verbs, never total ones', () => {
        //  REWRITTEN BY THE UNIVERSAL LONG-PRESS RULING, not deleted, and the half that changed
        //  is worth separating from the half that did not.
        //
        //  WHAT CHANGED: this asserted `holdOpensCircle === false` for a survivor at the pond
        //  with only drink available, because a one-segment wheel was held to be ceremony. A
        //  hold now always asks, so that expectation is inverted below.
        //
        //  WHAT DID NOT: the trap the test was written for is still live. Counting TOTAL
        //  segments rather than usable ones would open a wheel of refusals at a target where
        //  nothing can be done — five grey options and no act — which is a worse failure under
        //  the new rule than it was under the old one, because now only the zero case stops it.
        const s = atPond();
        expect(verbsFor(s, 'pond').length).toBeGreaterThan(1);      // blocked segments exist...
        expect(availableVerbs(s, 'pond')).toHaveLength(1);          // ...only one is usable...
        expect(holdOpensCircle(s, 'pond')).toBe(true);              // ...and the hold asks anyway

        //  The zero case is the one the usable-vs-total distinction now carries alone.
        const away = createInitialState(2);
        expect(verbsFor(away, 'pond').length).toBeGreaterThan(1);
        expect(availableVerbs(away, 'pond')).toHaveLength(0);
        expect(holdOpensCircle(away, 'pond')).toBe(false);
    });

    it('nothing available means no default and no circle — the tap does nothing here', () => {
        const s = createInitialState(2);   // nowhere near the pond
        expect(availableVerbs(s, 'pond')).toHaveLength(0);
        expect(defaultVerb(s, 'pond')).toBeNull();
        expect(tapOpensCircle(s, 'pond')).toBe(false);
    });
});

describe('BLOCKED SEGMENTS STATE THEIR REASON — never hidden, never generic', () => {
    const TARGETS: VerbTarget[] = ['pond', 'shelter', 'storage', 'fire', 'outboard', 'ground'];

    it('every blocked segment across every target carries a reason, and every available one does not', () => {
        //  Property, not a spot-check: the invariant is that `available` and `reason` are
        //  exact complements. A blocked segment with a null reason is a grey button that
        //  teaches nothing, which is the thing Ch.2's rule forbids.
        let blocked = 0;
        for (const target of TARGETS) {
            for (const s of [createInitialState(3), atPond(), builtEverything()]) {
                for (const v of verbsFor(s, target)) {
                    if (v.available) expect(v.reason).toBeNull();
                    else { expect(v.reason).toBeTruthy(); blocked++; }
                }
            }
        }
        //  WITNESS (D-066 a): the sweep must actually have found blocked segments.
        expect(blocked).toBeGreaterThan(6);
    });

    it('no reason is a generic brush-off — each names a specific obstacle', () => {
        const generic = /^(you can't|cannot|not available|unavailable|no\.?$)/i;
        for (const target of TARGETS) {
            for (const v of verbsFor(createInitialState(4), target)) {
                if (v.reason) expect(v.reason).not.toMatch(generic);
            }
        }
    });

    it('the reason is the NEAREST true one — no flask beats a full flask', () => {
        //  Two obstacles are true at once for a survivor with no flask: they have nothing to
        //  carry water in, and (vacuously) it is not full. The useful one is the first.
        const s = atPond();
        const fill = verbsFor(s, 'pond').find((v) => v.id === 'fill-flask')!;
        expect(fill.reason).toMatch(/nothing to carry/i);

        s.tools.flask = true;
        s.tools.flaskSips = TUNE.flaskCapacitySips;
        expect(verbsFor(s, 'pond').find((v) => v.id === 'fill-flask')!.reason).toMatch(/already full/i);
    });
});

describe('the retired hacks — shelter and storage now answer for themselves', () => {
    it('the shelter offers SLEEP and MEND at the shelter, not from inside the Build card', () => {
        const s = builtEverything();
        expect(ids(verbsFor(s, 'shelter'))).toEqual(['sleep', 'mend']);
        expect(availableVerbs(s, 'shelter').map((v) => v.id)).toContain('sleep');
    });

    it('a collapsed shelter cannot be slept in, and says to mend it', () => {
        const s = builtEverything();
        s.shelter.durability = 0;
        const sleep = verbsFor(s, 'shelter').find((v) => v.id === 'sleep')!;
        expect(sleep.available).toBe(false);
        expect(sleep.reason).toMatch(/mend/i);
    });

    it('the store OPENS from the store — the Build-card detour is not the way in', () => {
        const s = builtEverything();
        expect(defaultVerb(s, 'storage')?.id).toBe('open-store');
    });

    it('mend appears on a damaged store and is absent-but-explained on a sound one', () => {
        const sound = builtEverything();
        const mendSound = verbsFor(sound, 'storage').find((v) => v.id === 'mend-store')!;
        expect(mendSound.available).toBe(false);
        expect(mendSound.reason).toMatch(/sound/i);

        const damaged = builtEverything();
        damaged.storage.durability = 20;
        damaged.inventory.wood = 5;
        expect(verbsFor(damaged, 'storage').find((v) => v.id === 'mend-store')!.available).toBe(true);
    });
});

describe('capability is a state question, not an inventory one', () => {
    it('canFish reads the line, and a fresh survivor has none', () => {
        expect(canFish(createInitialState(5))).toBe(false);
        const s = createInitialState(5);
        s.tools.fishingLine = true;
        expect(canFish(s)).toBe(true);
    });
});

/** A survivor with a shelter, a store and a fire, standing at them. */
function builtEverything(): GameState {
    const s = createInitialState(7);
    s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
    buildShelter(s, s.player.x, s.player.y);
    buildStorage(s, s.player.x + 1, s.player.y);
    s.fire.built = true;
    s.fire.x = s.player.x; s.fire.y = s.player.y;
    s.inventory.wood = 0;   // so "Feed" is blocked for a stated reason
    return s;
}

describe('UNIVERSAL LONG-PRESS — a hold ALWAYS asks, even when there is only one answer', () => {
    /**
     * THE RULING THAT SUPERSEDES THE ONE ABOVE. The circle used to open only when there was
     * something to choose BETWEEN, on the reasoning that a wheel with one segment is a
     * ceremony charged for nothing. The director overruled it: a hold must never auto-perform,
     * because "it only did the one thing that was possible" is exactly the reasoning that makes
     * an irreversible act arrive unannounced. The never-auto-commit discipline built for
     * crafting now governs every hold-to-act target.
     *
     * A TAP IS UNTOUCHED. The Default-Verb Law still holds on the frequent path: tap the pond
     * and drink, tap the fire and feed it. Only the deliberate gesture asks.
     */
    const ALL: VerbTarget[] = ['pond', 'shelter', 'storage', 'fire', 'boar', 'dropped', 'raft', 'fishingspot', 'outboard', 'shoreitem', 'ground'];

    it('ONE available verb still opens the circle — the case the old rule sent straight to the act', () => {
        const s = atPond();
        expect(availableVerbs(s, 'pond')).toHaveLength(1);
        expect(holdOpensCircle(s, 'pond')).toBe(true);
    });

    it('a lone verb opens the circle at EVERY target that can reach one, never just the crowded ones', () => {
        //  Swept rather than spot-checked: the defect this replaces was per-target reasoning
        //  about when a choice is "real enough" to show, and that reasoning is what produced a
        //  boar with no circle path at all.
        //
        //  AND THE SWEEP PROVES IT REACHED THE INTERESTING CASE. The first cut of this asserted
        //  `holdOpensCircle === (n >= 1)` across the targets and passed against the OLD code,
        //  because in that fixture every target happened to have zero verbs or several — never
        //  exactly one. A sweep that never meets the condition it exists for is green on
        //  nothing, so the count of one-verb targets is asserted too.
        const s = atPond();
        buildShelter(s, s.player.x, s.player.y);
        buildStorage(s, s.player.x + 1, s.player.y);
        const lone: string[] = [];
        for (const t of ALL) {
            const n = availableVerbs(s, t).length;
            if (n === 1) lone.push(t);
            expect(holdOpensCircle(s, t), `${t} with ${n} available verb(s)`).toBe(n >= 1);
        }
        expect(lone.length, `targets with exactly one available verb: [${lone.join(', ')}]`).toBeGreaterThan(0);
    });

    it('NOTHING available still opens nothing — an empty circle would be a menu of refusals', () => {
        const s = createInitialState(2);   // nowhere near the pond
        expect(availableVerbs(s, 'pond')).toHaveLength(0);
        expect(holdOpensCircle(s, 'pond')).toBe(false);
    });

    it('the TAP contract is untouched — the frequent path never became slower', () => {
        const s = atPond();
        expect(tapOpensCircle(s, 'pond')).toBe(false);
        expect(defaultVerb(s, 'pond')?.id).toBe('drink');
    });
});

describe('THE UNIVERSAL SEAM — room for Examine, proven while it is still empty', () => {
    /**
     * Examine/study is NOT built here. What is asserted is that the room for it works, because
     * an extension point nothing exercises is indistinguishable from a broken one and would
     * stay that way until the day it is needed — which is precisely when nobody wants to
     * discover it never worked.
     *
     * The seam exists because the audit found the eight per-target verb functions had no shared
     * composition point. Adding one verb that belongs everywhere meant editing all eight and
     * trusting whoever did it to find all eight; the boar's missing circle path is what that
     * costs when someone does not.
     */
    const ALL: VerbTarget[] = ['pond', 'shelter', 'storage', 'fire', 'boar', 'dropped', 'raft', 'fishingspot', 'outboard', 'shoreitem', 'ground'];
    const examineStub: UniversalVerb = () => ({
        id: 'examine-stub', label: 'Look closely', available: true, reason: null,
    });

    it('is EMPTY in production — no Examine shipped, no verb added anywhere', () => {
        expect(UNIVERSAL_VERBS).toHaveLength(0);
        for (const t of ALL) {
            expect(verbsFor(createInitialState(4), t).map((v) => v.id)).not.toContain('examine-stub');
        }
    });

    it('carries a verb to ALL ELEVEN targets when one is supplied — the room actually works', () => {
        const s = createInitialState(4);
        for (const t of ALL) {
            const ids = verbsWith([examineStub], s, t).map((v) => v.id);
            expect(ids, `${t} did not receive the universal verb`).toContain('examine-stub');
            //  APPENDED, never prepended: the target's own most-ordinary act stays the first
            //  segment, which is the muscle-memory guarantee `verbsFor` documents.
            expect(ids[ids.length - 1]).toBe('examine-stub');
        }
    });

    it('a universal verb reaches availability and the circle, with no further wiring', () => {
        //  The seam is only real if what comes through it is a first-class verb everywhere the
        //  target's own verbs are — otherwise Examine would need the eight-site edit anyway.
        const away = createInitialState(2);                 // nowhere near anything
        expect(availableVerbs(away, 'pond')).toHaveLength(0);
        expect(holdOpensCircle(away, 'pond')).toBe(false);
        const withSeam = verbsWith([examineStub], away, 'pond').filter((v) => v.available);
        expect(withSeam.map((v) => v.id)).toEqual(['examine-stub']);
    });

    it('a universal verb NEVER steals the tap — the declared default still wins', () => {
        //  Examine must not become what a tap does at the pond. `defaultVerb` resolves the
        //  declared default first and only falls back to a lone option, so this holds by
        //  construction — asserted because "by construction" is how the boar got its bespoke
        //  path too.
        const s = atPond();
        expect(defaultVerb(s, 'pond')?.id).toBe('drink');
        expect(declaredDefaultVerbId('pond')).toBe('drink');
    });
});
