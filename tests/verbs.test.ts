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
    tapEligibleVerbs, tapOpensCircle, verbsFor, verbsWith, UNIVERSAL_VERBS, type UniversalVerb, type VerbTarget,
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
    //  `workspace` JOINS THE PROPERTY SET (item 2). It was added as the eleventh target this
    //  batch, and a new target that no property test covers is a target whose invariants are
    //  nobody's job — which is how the boar shipped with no circle path at all.
    const TARGETS: VerbTarget[] = ['pond', 'shelter', 'storage', 'fire', 'outboard', 'ground', 'workspace'];

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
        //  `move-structure` joins the CIRCLE here (item 2) and must never reach the tap: it
        //  is `holdOnly`, so it is absent from `tapEligibleVerbs` and cannot participate in
        //  the default. Both halves are asserted, because the half that matters to this test
        //  is the one that would silently regress.
        expect(availableVerbs(s, 'shelter').map((v) => v.id)).toEqual(['sleep', 'mend', 'move-structure']);
        expect(tapEligibleVerbs(s, 'shelter').map((v) => v.id)).toEqual(['sleep', 'mend']);
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
    //  `workspace` JOINS THE PROPERTY SET (item 2). It was added as the eleventh target this
    //  batch, and a new target that no property test covers is a target whose invariants are
    //  nobody's job — which is how the boar shipped with no circle path at all.
    const TARGETS: VerbTarget[] = ['pond', 'shelter', 'storage', 'fire', 'outboard', 'ground', 'workspace'];

    it('every blocked segment across every target carries a reason, and every available one does not', () => {
        //  Property, not a spot-check: the invariant is that `available` and `reason` are
        //  exact complements. A blocked segment with a null reason is a grey button that
        //  teaches nothing, which is the thing Ch.2's rule forbids.
        //  A READOUT IS NOT A REFUSAL, and this is the exemption that STRENGTHENS the rule
        //  rather than punching a hole in it. `inspect-workspace` used to satisfy this test by
        //  marking itself unavailable and putting a DESCRIPTION in the reason field — it has no
        //  handler and can never become available, so it was a reading wearing a refusal's
        //  clothes, and it passed here precisely because the invariant could not tell them
        //  apart. A row that is not an action must carry no obstacle (there is none to name)
        //  and must carry a `detail` instead, which is asserted below rather than waived.
        let blocked = 0;
        let readouts = 0;
        for (const target of TARGETS) {
            for (const s of [createInitialState(3), atPond(), builtEverything()]) {
                for (const v of verbsFor(s, target)) {
                    if (v.readout) {
                        expect(v.reason, `${target}/${v.id}: a reading named an obstacle`).toBeNull();
                        expect(v.detail, `${target}/${v.id}: a reading that says nothing`).toBeTruthy();
                        expect(v.available, `${target}/${v.id}: a reading that claims to be doable`).toBe(false);
                        readouts++;
                    } else if (v.available) expect(v.reason).toBeNull();
                    else { expect(v.reason, `${target}/${v.id} is a mute refusal`).toBeTruthy(); blocked++; }
                }
            }
        }
        //  WITNESS (D-066 a): the sweep must actually have found blocked segments.
        expect(blocked).toBeGreaterThan(6);
        expect(readouts, 'the readout branch was never exercised').toBeGreaterThan(0);
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
        //  Move joins the list at the END (item 2) — appended by the universal tail, which is
        //  what keeps the shelter's own most-ordinary act as the first segment.
        expect(ids(verbsFor(s, 'shelter'))).toEqual(['sleep', 'mend', 'move-structure']);
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

    it('CARRIES EXACTLY ONE in production — Move, and still no Examine', () => {
        //  The seam was shipped empty and proven empty. item 2 is its first real inhabitant:
        //  Move belongs to four targets and would otherwise have meant editing four target
        //  functions and trusting the next person to find all four — the precise cost this
        //  seam was built to avoid. Examine is still designed-and-unbuilt, and this keeps
        //  saying so rather than being loosened into "some verbs exist".
        expect(UNIVERSAL_VERBS).toHaveLength(1);
        for (const t of ALL) {
            expect(verbsFor(createInitialState(4), t).map((v) => v.id)).not.toContain('examine-stub');
        }
    });

    it('...and the one it carries reaches ONLY the things that can actually be moved', () => {
        //  A universal verb that applied everywhere would put "Move" on the pond. The seam's
        //  contract is that a verb may return null where it does not apply, and this is the
        //  witness for it on the real one rather than on a stub.
        const s = builtEverything();
        for (const t of ALL) {
            const ids = verbsFor(s, t).map((v) => v.id);
            const movable = t === 'shelter' || t === 'storage' || t === 'fire';
            expect(ids.includes('move-structure'), `${t} answered ${ids.join(', ')}`).toBe(movable);
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

describe('THE LIST DESCRIBES, IT DOES NOT ONLY REFUSE', () => {
    /**
     * TWO REPORTS, ONE GAP. A survivor could not tell `Inspect` from `Survey` at the boat, and
     * could not tell what `Upgrade` needed or what `Work mat` even was at the mat. Both are the
     * same missing thing: `reason` is the ONE TRUEST OBSTACLE and is null whenever a verb is
     * usable, so the overflow list could only ever explain why you CANNOT do something.
     *
     * Counted across one ordinary state when this was written: 28 verbs reachable, 13 of them
     * READY and therefore completely silent. `detail` is the other half — what a thing IS —
     * and it is shown whatever the state, so two verbs can finally be compared.
     */
    it('the two verbs the report could not tell apart now say what each one is', () => {
        const s = createInitialState(3);
        s.player = { x: 14, y: 100 };
        const boat = verbsFor(s, 'boat');
        const inspect = boat.find((v) => v.id === 'inspect-boat')!;
        const survey = boat.find((v) => v.id === 'survey-hull')!;

        //  THE READY ONE IS NO LONGER SILENT. This is the half that was impossible before:
        //  a usable verb has no reason by law, so it had no text at all.
        expect(inspect.available).toBe(true);
        expect(inspect.reason, 'a usable verb must still name no obstacle').toBeNull();
        expect(inspect.detail, 'Inspect is still a bare button').toBeTruthy();

        //  ...and the two descriptions actually distinguish them: one is free looking, the
        //  other is work that names faults.
        expect(inspect.detail!).toMatch(/costs nothing|look/i);
        expect(survey.detail, 'Survey says only why it is refused').toBeTruthy();
        expect(survey.detail!).toMatch(/name what is wrong|plank/i);
        expect(inspect.detail).not.toBe(survey.detail);
    });

    it('the mat says what it IS and what the upgrade WANTS, concretely', () => {
        const s = createInitialState(3);
        s.player = { x: 0, y: 0 };
        s.workspace = { built: true, x: 0, y: 0, tier: 'mat', jointWear: 0 };
        const rows = verbsFor(s, 'workspace');

        //  "Work mat" is a reading, not an action the survivor is being denied.
        const mat = rows.find((v) => v.id === 'inspect-workspace')!;
        expect(mat.readout, 'the reading still claims to be a blocked action').toBe(true);
        expect(mat.detail).toMatch(/holds/i);

        //  ...and the upgrade names the WHOLE requirement, not just the first missing thing.
        const up = rows.find((v) => v.id === 'frame-bench')!;
        expect(up.detail, 'Upgrade does not say what it takes').toBeTruthy();
        expect(up.detail!, 'the timber is not named').toContain(`${TUNE.workbenchWoodCost} wood`);
        expect(up.detail!, 'the hammer is not named').toMatch(/hammer/i);
        expect(up.detail!, 'the experience is not named').toMatch(/hands|building|mending/i);
    });

    it('...and the whole requirement is stated even when the joinery is the blocker', () => {
        //  THE DEFECT THIS PINS, from [[D-197]]. `makerBlocker` returns the joinery gap first,
        //  so `benchShortfallNote` — the sentence naming the wood and the hammer — was
        //  UNREACHABLE whenever the joinery was also short, which for a fresh survivor is
        //  always. The refusal keeps Law 95's one obstacle; the detail carries the rest.
        const s = createInitialState(3);
        s.player = { x: 0, y: 0 };
        s.workspace = { built: true, x: 0, y: 0, tier: 'mat', jointWear: 0 };
        s.inventory.wood = 0;
        s.inventory.stonehammer = 0;
        const up = verbsFor(s, 'workspace').find((v) => v.id === 'frame-bench')!;

        expect(up.reason!, 'the refusal stopped naming the truest obstacle').toMatch(/finer work/i);
        expect(up.detail!, 'the pack was never mentioned').toMatch(/wood/i);
        expect(up.detail!).toMatch(/hammer/i);
    });
});
