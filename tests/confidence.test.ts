/**
 * THE CONFIDENCE / RECENCY LAYER, AND THE LINE IT MUST NOT CROSS (Slice 2B Stage B).
 *
 * C1's ruling is narrow and this file is written to enforce it rather than to describe it:
 * confidence is a NEW layer sitting ALONGSIDE `KnowledgeState`, never inside it.
 *
 *   "Pattern stays in the book"        = knowledge. Never decays. Ever.
 *   "First renewed attempt takes longer" = confidence. This layer, and only this layer.
 *
 * The instruction was explicit that avoiding a violation is not the same as proving one
 * cannot happen: *"verify this explicitly with a property test that would catch a violation,
 * don't just avoid writing one."* So the first block below is not a test of confidence at
 * all. It drives the entire layer — decay across enormous absences, practise, rehearsal, the
 * lot — over thousands of randomised states, and asserts `state.knowledge` comes out DEEP
 * EQUAL to a snapshot taken before. It fails the moment anyone reaches into `knowledge` from
 * this module, whatever their reason, and the second test proves the guard has teeth by
 * showing it catches a deliberately planted violation.
 *
 * The pre-existing never-decays-offline property test in `tests/vitals.test.ts` is untouched
 * by this work and must stay that way — it is the other half of the same law, guarding
 * `reconcile` where this file guards the new layer.
 */
import { describe, expect, it } from 'vitest';
import {
    confidenceFor, executionTimeMultiplier, freshConfidence, isRusty, practise, rehearse,
    rustNote,
} from '../src/brain/confidence';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { GameState, KnowledgeDomain } from '../src/brain/types';

const DOMAINS: KnowledgeDomain[] = [
    'survivalcraft', 'foragingMedicine', 'harvestingFabrication', 'construction',
    'mechanicalSystems', 'electricalRadio', 'navigationSeamanship',
];

/** A cheap deterministic PRNG — no Math.random, so a failure is reproducible. */
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function randomState(r: () => number): GameState {
    const s = createInitialState(0);
    s.gameHoursElapsed = r() * 5000;
    for (const d of DOMAINS) {
        s.knowledge.domains[d] = {
            technique: r() * 100,
            understanding: r() * 100,
            adaptation: r() * 100,
        };
    }
    s.knowledge.nullPairs = r() > 0.5 ? ['axe-blade|wood'] : [];
    s.confidence = { lastPractisedGameHours: { torch: r() * 1000, shelter: r() * 1000 } };
    return s;
}

describe('THE LAW: this layer never touches KnowledgeState', () => {
    it('for 3000 random states driven through the WHOLE layer, knowledge is untouched', () => {
        const r = rng(20260730);
        for (let i = 0; i < 3000; i++) {
            const state = randomState(r);
            const before = JSON.parse(JSON.stringify(state.knowledge));

            //  Everything the layer can do, including absences long enough to floor it.
            const now = state.gameHoursElapsed + r() * 100_000;
            confidenceFor(state, 'torch', now);
            confidenceFor(state, 'shelter', now);
            confidenceFor(state, 'never-tried', now);
            state.confidence = practise(state.confidence, 'torch', now);
            state.confidence = rehearse(state.confidence, 'shelter', now);
            executionTimeMultiplier(confidenceFor(state, 'torch', now));
            isRusty(confidenceFor(state, 'shelter', now));
            rustNote('made a torch', confidenceFor(state, 'shelter', now));

            expect(state.knowledge, `iteration ${i}`).toEqual(before);
        }
    });

    it('...and that guard has TEETH — it catches a planted violation', () => {
        //  If the assertion above could not fail, it would be decoration. This plants the
        //  exact mutation the law forbids — a domain score nudged DOWNWARD by something in
        //  the confidence path — and proves the comparison catches it.
        const state = randomState(rng(7));
        const before = JSON.parse(JSON.stringify(state.knowledge));
        const violate = (s: GameState) => {
            s.knowledge.domains.survivalcraft.technique -= 0.001;
        };
        violate(state);
        expect(() => expect(state.knowledge).toEqual(before)).toThrow();
    });

    it('practise and rehearse return a ConfidenceState, never a GameState', () => {
        //  The boundary is enforced by the type signature before any test runs: these
        //  functions never receive a GameState, so they cannot reach knowledge even by
        //  accident. This asserts the shape stays that way.
        const c = practise(freshConfidence(), 'torch', 10);
        expect(Object.keys(c)).toEqual(['lastPractisedGameHours']);
        expect(Object.keys(rehearse(c, 'shelter', 20))).toEqual(['lastPractisedGameHours']);
    });
});

describe('rust, not amnesia', () => {
    const at = (lastPractised: number): GameState => {
        const s = createInitialState(0);
        s.confidence = { lastPractisedGameHours: { torch: lastPractised } };
        return s;
    };

    it('something never practised is FULL, not floored — inexperience is not rust', () => {
        expect(confidenceFor(createInitialState(0), 'torch', 9999)).toBe(1);
    });

    it('inside the grace period nothing is lost — a week off is not a mistake', () => {
        expect(confidenceFor(at(0), 'torch', TUNE.confidenceGraceGameHours)).toBe(1);
    });

    it('past the grace period it dips', () => {
        const c = confidenceFor(at(0), 'torch', TUNE.confidenceGraceGameHours + 60);
        expect(c).toBeLessThan(1);
        expect(c).toBeGreaterThan(TUNE.confidenceFloor);
    });

    it('and it BOTTOMS OUT at the floor, however long passes — never zero, never helpless', () => {
        for (const idle of [1e3, 1e5, 1e7, 1e9]) {
            expect(confidenceFor(at(0), 'torch', idle)).toBe(TUNE.confidenceFloor);
        }
        expect(TUNE.confidenceFloor).toBeGreaterThan(0.5);
    });

    it('MONOTONIC in time — confidence never rises on its own while unused', () => {
        const s = at(0);
        let prev = 1;
        for (let t = 0; t < 4000; t += 37) {
            const c = confidenceFor(s, 'torch', t);
            expect(c).toBeLessThanOrEqual(prev + 1e-9);
            prev = c;
        }
    });
});

describe('what rust costs: time, and nothing else', () => {
    it('full confidence costs nothing', () => {
        expect(executionTimeMultiplier(1)).toBe(1);
    });

    it('the floor costs the most it can ever cost, and that is bounded', () => {
        expect(executionTimeMultiplier(TUNE.confidenceFloor))
            .toBeCloseTo(TUNE.confidenceMaxTimePenalty, 6);
        expect(TUNE.confidenceMaxTimePenalty).toBeLessThan(2);
    });

    it('the penalty is never below 1 — rust cannot make you FASTER', () => {
        for (let c = 0; c <= 1.2; c += 0.05) {
            expect(executionTimeMultiplier(c)).toBeGreaterThanOrEqual(1);
        }
    });
});

describe('rehearsal restores control', () => {
    it('a rusty technique comes fully back — rehearsal is not a grind with a progress bar', () => {
        const s = createInitialState(0);
        s.confidence = { lastPractisedGameHours: { torch: 0 } };
        const rustyAt = 100_000;
        expect(confidenceFor(s, 'torch', rustyAt)).toBe(TUNE.confidenceFloor);
        s.confidence = rehearse(s.confidence, 'torch', rustyAt);
        expect(confidenceFor(s, 'torch', rustyAt)).toBe(1);
    });

    it('and restores only the thing rehearsed', () => {
        const s = createInitialState(0);
        s.confidence = { lastPractisedGameHours: { torch: 0, shelter: 0 } };
        const t = 100_000;
        s.confidence = rehearse(s.confidence, 'torch', t);
        expect(confidenceFor(s, 'torch', t)).toBe(1);
        expect(confidenceFor(s, 'shelter', t)).toBe(TUNE.confidenceFloor);
    });

    it('says so before the player commits, and never names it a failure', () => {
        const note = rustNote('made a torch', TUNE.confidenceFloor);
        expect(note).toBeTruthy();
        expect(note!.toLowerCase()).toContain('you still know how');
        expect(note!.toLowerCase()).not.toContain('fail');
        expect(rustNote('made a torch', 1)).toBeNull();
    });
});
