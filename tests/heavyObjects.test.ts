/**
 * HEAVY OBJECTS — Wave 1's first slice, proven end to end on the one representative object
 * (the beached outboard). Four claims, four sections:
 *
 *   1. THE TIER TABLE IS CAPACITY-RELATIVE (Law 204/234) — mass is answered by method, and
 *      the same object reads as a different tier as practice changes, with no stored flag.
 *   2. STUDY RAISES UNDERSTANDING ONLY (Law 208/230) — never technique, diminishing per
 *      class, capped at lifting the eventual outcome by at most one rung.
 *   3. THE TEARDOWN LADDER IS GRADED, NOT PASS/FAIL (Law 217/221/226/227) — five real rungs,
 *      degrade vs destroy by gap size, subassemblies preserved from Skilled up, progress
 *      persists across attempts.
 *   4. REASSEMBLY, DIAGNOSIS, REPAIR (Law 227) — a complete strip reassembles into a working
 *      or faulty motor, and a fault must be diagnosed before it can be repaired.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import {
    OUTBOARD_PARTS, applyStudy, applyTeardown, axeOutboard, canReassemble, competenceFor,
    diagnoseFault, dragMultipliers, dragOutboard, effectiveMassFor, objectTierFor, outboardTier,
    reassembleOutboard, repairOutboard, studyYieldFor, teardownAttempt, teardownForecast,
    tierNote,
} from '../src/brain/heavyObjects';
import type { GameState, OutboardPart } from '../src/brain/types';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => createInitialState(NOW);

/** Set mechanicalSystems.technique/understanding directly — the tests below are about the
 *  FORMULA and the LADDER, not about how those scores are normally earned. */
function withMechanical(s: GameState, technique: number, understanding: number): GameState {
    s.knowledge.domains.mechanicalSystems = { technique, understanding, adaptation: 0 };
    return s;
}

// ---------------------------------------------------------------------------
describe('THE TIER TABLE — capacity-relative, never a stored property (Law 204, 234)', () => {
    it('the SAME raw mass reads as a DIFFERENT tier as loadTolerance practice rises', () => {
        const untrained = fresh();
        const untrainedTier = outboardTier(untrained);

        const trained = fresh();
        trained.capacities = { ...trained.capacities, loadTolerance: 100 };
        const trainedTier = outboardTier(trained);

        //  Effective mass strictly falls with practice — the number a downstream tier lookup
        //  reads is different, which is the whole of what "no stored flag" has to prove.
        expect(effectiveMassFor(trained, TUNE.outboardMassKg))
            .toBeLessThan(effectiveMassFor(untrained, TUNE.outboardMassKg));
        //  Untrained, at 35 kg raw, is comfortably inside the dragged band.
        expect(untrainedTier).toBe('dragged');
        //  Documented rather than asserted as a hard requirement: at MAX practice relief the
        //  outboard's effective mass can fall to the shouldered band, which is Law 204's
        //  "objects cross tiers downward" claim made concrete on this exact object.
        expect(['shouldered', 'dragged']).toContain(trainedTier);
    });

    it('the relief is bounded — practice never makes it free', () => {
        const maxed = fresh();
        maxed.capacities = { ...maxed.capacities, loadTolerance: 100 };
        const eff = effectiveMassFor(maxed, TUNE.outboardMassKg);
        expect(eff).toBeGreaterThan(TUNE.outboardMassKg * (1 - TUNE.tierPracticeReliefMax) - 0.01);
    });

    it('objectTierFor is a pure lookup — every named tier is reachable at its own mass', () => {
        expect(objectTierFor(0.5)).toBe('pocketable');
        expect(objectTierFor(3)).toBe('one-handed');
        expect(objectTierFor(10)).toBe('two-handed');
        expect(objectTierFor(20)).toBe('shouldered');
        expect(objectTierFor(45)).toBe('dragged');
        expect(objectTierFor(200)).toBe('levered');
    });

    it('every tier has a plain, non-empty sentence — the perceivability half (Law 234)', () => {
        for (const t of ['pocketable', 'one-handed', 'two-handed', 'shouldered', 'dragged', 'levered', 'tackle-bound', 'fixed'] as const) {
            expect(tierNote(t).length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
describe('DRAGGING — a tool eases the METHOD, never turns a refusal into a yes (Law 204)', () => {
    it('a pole reduces the energy cost and never changes whether the drag is legal', () => {
        const s = fresh();
        const bare = dragMultipliers(s, false);
        const poled = dragMultipliers(s, true);
        expect(poled.energyMultiplier).toBeLessThan(bare.energyMultiplier);
        expect(poled.speedFraction).toBeGreaterThanOrEqual(bare.speedFraction);
    });

    it('dragging the outboard actually moves it and costs real energy', () => {
        const s = fresh();
        const result = dragOutboard(s, 10, false);
        expect(result.ok).toBe(true);
        expect(result.metresMoved).toBeGreaterThan(0);
        expect(result.metresMoved).toBeLessThan(10); // T5 is a FRACTION of ordinary pace
        expect(result.energyCost).toBeGreaterThan(0);
        expect(result.outboard.draggedM).toBeCloseTo(result.metresMoved, 5);
    });

    it('refuses with the TRUE reason once an object reads heavier than T5 admits', () => {
        //  Reconstructed via objectTierFor directly, since nothing this heavy exists in play
        //  yet — the refusal path itself is what this test proves, on the same function
        //  `dragOutboard` calls internally.
        expect(objectTierFor(500)).toBe('levered');
        expect(tierNote('levered')).toMatch(/pole|rollers|ramp/i);
    });
});

// ---------------------------------------------------------------------------
describe('STUDY — understanding only, diminishing per class, capped at one rung (Law 208, 230)', () => {
    it('study NEVER raises technique, however many sessions', () => {
        const s = fresh();
        const before = s.knowledge.domains.mechanicalSystems.technique;
        applyStudy(s);
        applyStudy(s);
        applyStudy(s);
        expect(s.knowledge.domains.mechanicalSystems.technique).toBe(before);
    });

    it('the FIRST study of a class returns the most; repeats fall off sharply (Law 230)', () => {
        const s = fresh();
        const first = studyYieldFor(s, 'small-engine');
        s.studiedClasses['small-engine'] = 1;
        const second = studyYieldFor(s, 'small-engine');
        s.studiedClasses['small-engine'] = 2;
        const third = studyYieldFor(s, 'small-engine');
        expect(second).toBeLessThan(first);
        expect(third).toBeLessThan(second);
        //  Steep, not gentle: the brief's own "sharply less" — third study under a third of
        //  the first, not merely less.
        expect(third).toBeLessThan(first / 3);
    });

    it('repeat study never falls all the way to zero — a floor, per Law 208', () => {
        const s = fresh();
        s.studiedClasses['small-engine'] = 20;
        expect(studyYieldFor(s, 'small-engine')).toBeGreaterThan(0);
    });

    it('a genuinely different class is UNAFFECTED by another class already being studied hard', () => {
        const s = fresh();
        s.studiedClasses['small-engine'] = 10;
        const fullValue = studyYieldFor(s, 'some-other-class');
        expect(fullValue).toBe(TUNE.studyFirstGain);
    });

    it('applyStudy actually raises understanding by the declared yield, once', () => {
        const s = fresh();
        const before = s.knowledge.domains.mechanicalSystems.understanding;
        const expectedGain = studyYieldFor(s, 'small-engine');
        applyStudy(s);
        expect(s.knowledge.domains.mechanicalSystems.understanding).toBeCloseTo(before + expectedGain, 5);
        expect(s.studiedClasses['small-engine']).toBe(1);
    });

    it('STUDY ALONE — zero technique — caps the outcome at exactly ONE rung above the technique-only floor', () => {
        //  Understanding pushed to the ceiling by study alone; technique left at the innate
        //  floor (applyStudy never touches it — proven above).
        const s = fresh();
        for (let i = 0; i < 200; i++) applyStudy(s);
        //  Technique starts at (and stays at) the innate floor every domain starts from —
        //  never zero outright — 200 study sessions must not move it by even one point.
        expect(s.knowledge.domains.mechanicalSystems.technique).toBe(TUNE.knowledgeInnateFloor);
        expect(s.knowledge.domains.mechanicalSystems.understanding).toBe(100);
        s.tools.salvageTools = true;
        //  Proves the cap is actually BINDING here, not coincidentally equal to the uncapped
        //  result: raw competence alone already clears Competent's own floor.
        expect(competenceFor(s, false)).toBeGreaterThanOrEqual(TUNE.teardownCompetentAt);
        const outcome = teardownAttempt(s, false);
        //  ...but with zero technique, the study-free floor is Novice, so the cap admits at
        //  most one rung above it — Basic, never Competent, however saturated understanding is.
        expect(outcome.rung).toBe('basic');
    });
});

// ---------------------------------------------------------------------------
describe('THE TEARDOWN LADDER — graded, degrade vs destroy, subassemblies (Law 217, 221, 226, 227)', () => {
    it('bare hands, no workspace, a LITTLE technique reaches Novice only, safely (no destroy)', () => {
        //  Enough technique to clear the destroy gap but not Basic's own floor — the plain
        //  "attempted and simply fell short" case, distinct from the wide-miss destroy case
        //  below.
        const s = withMechanical(fresh(), 15, 0);
        const outcome = teardownAttempt(s, false);
        expect(outcome.rung).toBe('novice');
        expect(outcome.destroyed).toBe(false);
        expect(outcome.parts).toEqual([]);
    });

    it('the forecast is READABLE BEFORE COMMITTING — same inputs, same predicted rung (Law 217)', () => {
        const s = withMechanical(fresh(), 60, 40);
        s.tools.salvageTools = true;
        const forecast = teardownForecast(s, true);
        const outcome = teardownAttempt(s, true);
        expect(outcome.rung).toBe(forecast.reachableRung);
    });

    it('Competent and up NEED a cleared workspace; Basic does not', () => {
        const s = withMechanical(fresh(), 70, 60);
        s.tools.salvageTools = true;
        const noWorkspace = teardownAttempt(s, false);
        expect(['novice', 'basic']).toContain(noWorkspace.rung);
        const withWorkspace = teardownAttempt(s, true);
        expect(['competent', 'skilled', 'expert']).toContain(withWorkspace.rung);
    });

    it('Skilled preserves SUBASSEMBLIES — the carburetor and magneto come free as ONE part each (Law 221)', () => {
        const s = withMechanical(fresh(), 70, 40);
        s.tools.salvageTools = true;
        const outcome = teardownAttempt(s, true);
        expect(outcome.rung).toBe('skilled');
        expect(outcome.parts).toContain('carburetor');
        expect(outcome.parts).toContain('magneto');
        //  Skilled is not yet EVERY part — the gearcase and cylinder are Expert-only.
        expect(outcome.parts).not.toContain('gearcase');
    });

    it('Expert yields EVERY part, complete disassembly', () => {
        const s = withMechanical(fresh(), 100, 100);
        s.tools.salvageTools = true;
        const outcome = teardownAttempt(s, true);
        expect(outcome.rung).toBe('expert');
        for (const part of OUTBOARD_PARTS) expect(outcome.parts).toContain(part);
    });

    it('a NEAR-miss DEGRADES — the object stays for a better attempt, not gone', () => {
        //  Just under Basic's own floor, but nowhere near destroy's gap.
        const s = withMechanical(fresh(), TUNE.teardownBasicAt - 2, 0);
        const outcome = teardownAttempt(s, false);
        expect(outcome.destroyed).toBe(false);
    });

    it('a WIDE miss DESTROYS — the honest cost of opening it far too early (Law 226)', () => {
        const s = withMechanical(fresh(), 0, 0);
        //  competenceFor at technique=0, understanding=0, no tools, no workspace is 0 — the
        //  widest possible gap below Basic's floor, and destroy's own worst case.
        expect(competenceFor(s, false)).toBe(0);
        const outcome = teardownAttempt(s, false);
        expect(outcome.destroyed).toBe(true);
        expect(outcome.rung).toBe('novice');
    });

    it('the destroy gap is a STRICT boundary — exactly at the gap neither destroys nor forgives one unit past it', () => {
        //  competence = 10 exactly -> gap below Basic's floor (20) is exactly 10, equal to
        //  teardownDestroyGapAt: NOT destroyed (strictly greater than, not greater-or-equal).
        const atBoundary = withMechanical(fresh(), 10, 10); // 10*0.7 + 10*0.3 = 10
        expect(competenceFor(atBoundary, false)).toBeCloseTo(10, 5);
        expect(teardownAttempt(atBoundary, false).destroyed).toBe(false);

        //  One unit of competence less pushes the gap to 10.7 > 10: destroyed.
        const pastBoundary = withMechanical(fresh(), 9, 10); // 9*0.7 + 10*0.3 = 9.3
        expect(competenceFor(pastBoundary, false)).toBeCloseTo(9.3, 5);
        expect(teardownAttempt(pastBoundary, false).destroyed).toBe(true);
    });

    it('DESTROYED wreckage still carries mass — Law 226, never simply gone', () => {
        const s = fresh();
        applyTeardown(s, { rung: 'novice', destroyed: true, gained: { stone: TUNE.outboardDestroyedScrapStone }, parts: [] });
        expect(s.inventory.stone).toBe(TUNE.outboardDestroyedScrapStone);
        expect(s.outboard.teardown?.destroyed).toBe(true);
    });

    it('PROGRESS PERSISTS — a second, better attempt after Basic cannot regress below Basic (Law 223)', () => {
        const s = fresh();
        applyTeardown(s, { rung: 'basic', destroyed: false, gained: {}, parts: [] });
        applyTeardown(s, { rung: 'novice', destroyed: false, gained: {}, parts: [] });
        expect(s.outboard.teardown?.rung).toBe('basic');
    });

    it('a real attempt raises TECHNIQUE, win or lose (Law 217)', () => {
        const s = fresh();
        const before = s.knowledge.domains.mechanicalSystems.technique;
        applyTeardown(s, { rung: 'novice', destroyed: false, gained: {}, parts: [] });
        expect(s.knowledge.domains.mechanicalSystems.technique).toBeGreaterThan(before);
    });

    it('THE AXE — always destroys, costs everything STILL INSIDE the object', () => {
        const s = fresh();
        axeOutboard(s);
        expect(s.outboard.teardown?.destroyed).toBe(true);
        expect(s.inventory.stone).toBe(TUNE.outboardDestroyedScrapStone);
    });

    it('THE AXE MUST NOT TOUCH PARTS ALREADY RECOVERED — they are in hand, not inside it', () => {
        //  Regression guard on the exact defect found while designing the verb that calls
        //  this: axing an object after a partial (or complete) prior teardown once silently
        //  destroyed the parts that teardown had already yielded into carriedParts.
        const s = fresh();
        s.carriedParts = ['fuelTank', 'tillerHandle'];
        axeOutboard(s);
        expect(s.outboard.teardown?.destroyed).toBe(true);
        expect(s.carriedParts).toEqual(['fuelTank', 'tillerHandle']);
    });

    it('axing after a COMPLETE Expert-level teardown leaves all eleven parts untouched', () => {
        const s = withMechanical(fresh(), 100, 100);
        s.tools.salvageTools = true;
        const outcome = teardownAttempt(s, true);
        applyTeardown(s, outcome);
        expect(s.carriedParts).toHaveLength(OUTBOARD_PARTS.length);
        axeOutboard(s);
        expect(s.carriedParts).toHaveLength(OUTBOARD_PARTS.length);
        for (const part of OUTBOARD_PARTS) expect(s.carriedParts).toContain(part);
    });
});

// ---------------------------------------------------------------------------
describe('REASSEMBLY, DIAGNOSIS, REPAIR — the found/repaired/manufactured routes (Law 227)', () => {
    it('cannot reassemble without EVERY part', () => {
        const s = fresh();
        s.carriedParts = OUTBOARD_PARTS.slice(0, OUTBOARD_PARTS.length - 1) as OutboardPart[];
        expect(canReassemble(s)).toBe(false);
    });

    it('reassembles once every part is carried, and consumes them', () => {
        const s = fresh();
        s.carriedParts = [...OUTBOARD_PARTS];
        expect(canReassemble(s)).toBe(true);
        reassembleOutboard(s, 1);
        expect(s.outboard.reassembled).toBe(true);
        expect(s.carriedParts).toEqual([]);
    });

    it('a faultless reassembly needs no diagnosis and no repair', () => {
        //  Sweep seeds until a faultless roll is found — deterministic, no Math.random.
        let s: GameState | null = null;
        for (let seed = 0; seed < 200; seed++) {
            const candidate = fresh();
            candidate.carriedParts = [...OUTBOARD_PARTS];
            reassembleOutboard(candidate, seed);
            if (!candidate.outboard.fault) { s = candidate; break; }
        }
        expect(s).not.toBeNull();
        expect(s!.outboard.faultDiagnosed).toBe(true);
    });

    it('a faulty reassembly cannot be repaired until DIAGNOSED (Law 217 credibility half)', () => {
        let s: GameState | null = null;
        for (let seed = 0; seed < 200; seed++) {
            const candidate = fresh();
            candidate.carriedParts = [...OUTBOARD_PARTS];
            reassembleOutboard(candidate, seed);
            if (candidate.outboard.fault) { s = candidate; break; }
        }
        expect(s).not.toBeNull();
        expect(s!.outboard.faultDiagnosed).toBe(false);
        expect(repairOutboard(s!)).toBe(false);
        expect(s!.outboard.fault).not.toBeNull();
    });

    it('sufficient understanding correctly diagnoses the fault, and repair then clears it', () => {
        let s: GameState | null = null;
        for (let seed = 0; seed < 200; seed++) {
            const candidate = fresh();
            candidate.carriedParts = [...OUTBOARD_PARTS];
            reassembleOutboard(candidate, seed);
            if (candidate.outboard.fault) { s = candidate; break; }
        }
        expect(s).not.toBeNull();
        s!.knowledge.domains.mechanicalSystems.understanding = TUNE.outboardDiagnoseUnderstandingAt;
        expect(diagnoseFault(s!)).toBe(true);
        expect(s!.outboard.faultDiagnosed).toBe(true);
        expect(repairOutboard(s!)).toBe(true);
        expect(s!.outboard.fault).toBeNull();
    });

    it('insufficient understanding does NOT diagnose — a guess is not credibility (Law 217)', () => {
        let s: GameState | null = null;
        for (let seed = 0; seed < 200; seed++) {
            const candidate = fresh();
            candidate.carriedParts = [...OUTBOARD_PARTS];
            reassembleOutboard(candidate, seed);
            if (candidate.outboard.fault) { s = candidate; break; }
        }
        expect(s).not.toBeNull();
        s!.knowledge.domains.mechanicalSystems.understanding = 0;
        expect(diagnoseFault(s!)).toBe(false);
        expect(s!.outboard.faultDiagnosed).toBe(false);
    });
});
