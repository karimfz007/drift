/**
 * THE FOUR REMAINING P0 ITEMS — the halves that are provable where they are pure.
 *
 * THE STANDING LESSON THIS FILE IS WRITTEN AGAINST: this project has now shipped three separate
 * checks that were green while the thing they named was broken — a spear witnessed through
 * `TOOL_IDS`, a screen position witnessed through `isFinite` at y = -35, and a fire's falloff
 * witnessed through the arithmetic that computes it rather than the output that applies it. So
 * nothing here asserts that a function returns a number. Each test names the SPECIFIC wrong
 * behaviour the director reported and fails on it.
 *
 * WHAT IS DELIBERATELY NOT HERE. Whether a fever actually slows the survivor ON SCREEN, whether
 * the housing is actually visible in the water, and whether the confirm circle actually opens
 * are claims about the body and the renderer. They are witnessed in the device sweep, against
 * meshes and positions, because that is the only place they can be witnessed honestly.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import {
    EXPERIMENT_CHOICE,
    hasUnknownRival,
    heldMatches,
    knownMatches,
    makeChosen,
    namingQuestionFor,
    needsNaming,
    recipesMatching,
    tryCombineWith,
} from '../src/brain/experiment';
import { illnessSpeedMultiplierOf, illnessStage, illnessCosts } from '../src/brain/illness';
import { capacityEaseOf, practiceShareOf } from '../src/brain/capacities';
import { effectiveCarriedKg, loadSpeedMultiplierOf, walkEaseOf, carriedWeightKg } from '../src/brain/body';
import { swimSpeedEaseOf, waterSpeedMultiplierOf } from '../src/brain/water';
import { airCapacityOf } from '../src/brain/dive';
import { wreckPartSight } from '../src/brain/radio';
import { TUNE } from '../src/data/tune';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => createInitialState(NOW);

/**
 * A survivor who can attempt things, and who HOLDS the plan for the pile under test.
 *
 * The plan is the SPEAR, not the axe, and that correction came from this file's own first run:
 * `wood + sharpblade` matches the spear — the axe needs a binding as well — so a fixture
 * holding the axe plan fell straight through the new gate and invented a spear. The test was
 * wrong about the recipe tree, and said so out loud rather than being quietly adjusted around.
 */
function holdingSpearPlan(): GameState {
    const s = fresh();
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    s.inventory.wood = 20; s.inventory.fiber = 20; s.inventory.stone = 20; s.inventory.sharpblade = 20;
    s.blueprints.push({
        recipeId: 'spear', name: 'Fire-hardened spear', version: 1,
        discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
    return s;
}

// ---------------------------------------------------------------------------
describe('P0-C — a plan you HOLD is never committed without being named first', () => {
    it('THE DEFECT: one held plan used to commit silently, because the gate was set at two', () => {
        const s = holdingSpearPlan();
        const pile = recipesMatching(['wood', 'sharpblade']).map((r) => r.id);
        expect(pile, 'the fixture no longer matches the spear').toContain('spear');
        //  The OLD gate. `knownMatches` returns nothing below two by design, so it said "no
        //  question here" for exactly the pile the director says must be named — and this is
        //  the line that let the hands move before the survivor agreed to anything.
        expect(knownMatches(s, ['wood', 'sharpblade']), 'the old gate saw a question').toHaveLength(0);
        //  The NEW gate sees it.
        expect(heldMatches(s, ['wood', 'sharpblade']).map((r) => r.id)).toContain('spear');
        expect(needsNaming(s, ['wood', 'sharpblade'])).toBe(true);
    });

    it('...so the verb ASKS, and spends absolutely nothing while asking', () => {
        const s = holdingSpearPlan();
        const before = {
            energy: s.energy, hunger: s.hunger, thirst: s.thirst,
            wood: s.inventory.wood, blade: s.inventory.sharpblade,
            hours: s.gameHoursElapsed, attempts: s.experimentCount,
        };
        const asked = tryCombineWith(s, ['wood', 'sharpblade']);
        expect(asked.outcome, 'it committed instead of asking').toBe('choose');
        expect(asked.spent, 'being asked cost something').toBeNull();
        //  Being asked is not an attempt — every one of these must be untouched.
        expect(s.energy).toBe(before.energy);
        expect(s.hunger).toBe(before.hunger);
        expect(s.thirst).toBe(before.thirst);
        expect(s.inventory.wood).toBe(before.wood);
        expect(s.inventory.sharpblade).toBe(before.blade);
        expect(s.gameHoursElapsed).toBe(before.hours);
        expect(s.experimentCount, 'the attempt counter moved on a question').toBe(before.attempts);
    });

    it('...and the question NAMES THE ATTEMPT, which is the whole of the ruling', () => {
        const s = holdingSpearPlan();
        const asked = tryCombineWith(s, ['wood', 'sharpblade']);
        //  Not "which are you making?" — the director's words are "you are trying to make an
        //  axe", i.e. the THING is named. A single-match question wearing the plural phrasing
        //  would be the old behaviour with a new coat.
        expect(asked.reason ?? '').toMatch(/trying to make/i);
        expect(asked.reason ?? '', 'the thing itself is not named').toMatch(/spear/i);
    });

    it('two held plans still ask the PLURAL question — P0-1 is intact, not overwritten', () => {
        const s = holdingSpearPlan();
        s.blueprints.push({
            recipeId: 'storage', name: 'Storage crate', version: 1,
            discoveredAtGameHours: 0, workmanship: 'serviceable',
        } as GameState['blueprints'][number]);
        s.blueprints.push({
            recipeId: 'stonehammer', name: 'Stone hammer', version: 1,
            discoveredAtGameHours: 0, workmanship: 'serviceable',
        } as GameState['blueprints'][number]);
        expect(knownMatches(s, ['wood', 'stone']).length).toBeGreaterThanOrEqual(2);
        expect(namingQuestionFor(knownMatches(s, ['wood', 'stone']))).toMatch(/which are you making/i);
    });

    it('an UNKNOWN pattern is never named and still resolves — Law 95 holds', () => {
        //  The boundary that makes the whole ruling safe. A survivor holding no plan for this
        //  pile is not asked about it, because asking would name a product they have never
        //  worked out and hand over the catalogue.
        const s = fresh();
        s.energy = 100; s.hunger = 100; s.thirst = 100;
        s.inventory.wood = 20; s.inventory.sharpblade = 20;
        expect(s.blueprints, 'the fixture starts with plans').toHaveLength(0);
        expect(needsNaming(s, ['wood', 'sharpblade'])).toBe(false);
        expect(tryCombineWith(s, ['wood', 'sharpblade']).outcome).not.toBe('choose');
    });

    it('THE SOFT-LOCK THE RULING WOULD HAVE SHIPPED: a held plan must not wall off its rivals', () => {
        //  Taken literally, "name the held plan and wait" means a pile you know one answer for
        //  can only ever be that answer. `tests/combine-reach.test.ts` proved this in the worst
        //  way — `fishingline` became unreachable — so declining is a real, reachable answer.
        const s = holdingSpearPlan();
        expect(hasUnknownRival(s, ['wood', 'stone']), 'nothing left to invent from this pile').toBe(true);
        const before = s.blueprints.length;
        const out = makeChosen(s, ['wood', 'stone'], EXPERIMENT_CHOICE);
        expect(out.outcome, 'declining the known plan was refused').not.toBe('refused');
        expect(out.spent, 'a real attempt spent nothing').not.toBeNull();
        expect(s.blueprints.length, 'experimenting reached nothing new').toBeGreaterThan(before);
    });

    it('...but declining is refused when there is genuinely nothing else to find', () => {
        const s = holdingSpearPlan();
        for (const id of ['storage', 'stonehammer', 'shelter', 'torch', 'knap', 'backpack', 'fishingline', 'raft', 'net']) {
            s.blueprints.push({
                recipeId: id, name: id, version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable',
            } as GameState['blueprints'][number]);
        }
        if (!hasUnknownRival(s, ['wood', 'stone'])) {
            expect(makeChosen(s, ['wood', 'stone'], EXPERIMENT_CHOICE).outcome).toBe('refused');
        }
    });

    it('LAW 217 — attempt and outcome are separate: BOTH teach the technique', () => {
        //  Not a change, a lock. `applyLearningEvent` fires before the success/failure branch,
        //  so a failed attempt still returns information to the domain. The ruling names this
        //  explicitly, so it gets a test rather than a reading of the code.
        const domainOf = (s: GameState) => ({ ...s.knowledge.domains.harvestingFabrication });
        let sawFail = false, sawWin = false;
        for (let i = 0; i < 60 && !(sawFail && sawWin); i++) {
            const s = holdingSpearPlan();
            s.experimentCount = i;
            const before = domainOf(s);
            const out = makeChosen(s, ['wood', 'sharpblade'], 'spear');
            const after = domainOf(s);
            if (out.outcome === 'failed-attempt') {
                sawFail = true;
                expect(after.technique + after.understanding + after.adaptation,
                    'a FAILED attempt returned nothing to the technique')
                    .toBeGreaterThan(before.technique + before.understanding + before.adaptation);
            }
            if (out.outcome === 'invented') sawWin = true;
        }
        expect(sawFail, 'no failure occurred in 60 attempts — the claim is untested').toBe(true);
    });
});

// ---------------------------------------------------------------------------
describe('P0-D — an illness that is felt, not just read', () => {
    const ill = (severity: number) => ({ severity, cause: 'bad-water' as const, gameHoursSick: 5 });

    it('THE DEFECT: a well body and a fevered body walked at exactly the same speed', () => {
        //  `impairmentOf` already taxed a fever's ENERGY, and that is real and invisible. The
        //  number below is the one the director could actually perceive, and it was 1.
        expect(illnessSpeedMultiplierOf(ill(0))).toBe(1);
        expect(illnessStage(ill(0.9))).toBe('gravely-ill');
        expect(illnessSpeedMultiplierOf(ill(0.9)), 'gravely ill and walking at full pace')
            .toBeLessThan(1);
    });

    it('BOTH WARNING RUNGS STAY FREE — the fair-challenge grammar is untouched', () => {
        //  Two full stages of plain-language notice before anything at all is taken. This is
        //  the line the fix had to respect, and the reason it reads `illnessCosts`.
        for (const severity of [0.05, 0.1, 0.19, 0.2, 0.3, 0.44]) {
            const stage = illnessStage(ill(severity));
            expect(illnessCosts(ill(severity)), `${stage} started costing`).toBe(false);
            expect(illnessSpeedMultiplierOf(ill(severity)), `${stage} slowed the survivor`).toBe(1);
        }
    });

    it('...and the cost begins exactly where the readout says "It is costing you now"', () => {
        expect(illnessStage(ill(TUNE.illnessFeverishAt))).toBe('feverish');
        expect(illnessSpeedMultiplierOf(ill(TUNE.illnessFeverishAt))).toBeLessThan(1);
    });

    it('worse illness is always slower, and never below the floor that would strand a run', () => {
        let previous = Infinity;
        for (let severity = 0; severity <= 1.0001; severity += 0.02) {
            const m = illnessSpeedMultiplierOf(ill(severity));
            expect(m, `speed ROSE with severity at ${severity.toFixed(2)}`).toBeLessThanOrEqual(previous);
            expect(m, 'a fever stranded the survivor').toBeGreaterThanOrEqual(TUNE.illnessSlowestMultiplier);
            expect(m).toBeLessThanOrEqual(1);
            previous = m;
        }
        expect(illnessSpeedMultiplierOf(ill(1))).toBeCloseTo(TUNE.illnessSlowestMultiplier, 6);
    });
});

// ---------------------------------------------------------------------------
describe('P0-E — growth felt in carry, walk, swim and dive (Law 234)', () => {
    it('a fresh castaway is BIT-FOR-BIT unchanged — every gain starts at exactly zero', () => {
        //  The floor, not zero: every capacity starts at `capacityInnateFloor`, so measuring
        //  from zero would hand a survivor who has done nothing a slice of the bonus for free.
        expect(practiceShareOf(TUNE.capacityInnateFloor)).toBe(0);
        expect(capacityEaseOf(TUNE.capacityInnateFloor, 0.5)).toBe(1);

        const s = fresh();
        expect(walkEaseOf(s), 'a fresh castaway already walks faster').toBe(1);
        expect(swimSpeedEaseOf(s.capacities), 'a fresh castaway already swims faster').toBe(1);
        expect(effectiveCarriedKg(s), 'a fresh castaway already carries lighter')
            .toBeCloseTo(carriedWeightKg(s), 9);
    });

    it('CARRY: practice makes the same load genuinely lighter — and never weightless', () => {
        const green = fresh();
        green.inventory.stone = 10;
        const practised = fresh();
        practised.inventory.stone = 10;
        practised.capacities.loadTolerance = 100;

        expect(carriedWeightKg(practised), 'the rock changed weight').toBe(carriedWeightKg(green));
        expect(effectiveCarriedKg(practised), 'practice bought nothing')
            .toBeLessThan(effectiveCarriedKg(green));
        //  Bounded: §12's "does not extend human physiology without limit".
        expect(effectiveCarriedKg(practised)).toBeGreaterThan(0);
        expect(effectiveCarriedKg(practised))
            .toBeCloseTo(carriedWeightKg(green) * (1 - TUNE.loadToleranceReliefMax), 6);
    });

    it('...and it reaches the thing the player actually feels: the speed they walk at', () => {
        //  The point of routing carry through effective weight rather than a fourth multiplier:
        //  the SHIPPED load curve picks the gain up, so it is felt without a new grammar.
        //  20 stone is 40 kg — past `loadHeavyAtKg`, in the OVERLOAD region where the shipped
        //  curve is continuous. Inside a single band the multiplier is flat by construction, so
        //  a lighter effective load reads identically and the check would pass on nothing; the
        //  first cut of this test did exactly that (0.88 vs 0.88) and proved the point.
        const green = fresh();
        green.inventory.stone = 20;
        const practised = fresh();
        practised.inventory.stone = 20;
        practised.capacities.loadTolerance = 100;
        expect(loadSpeedMultiplierOf(practised), 'a practised carrier moved no faster')
            .toBeGreaterThan(loadSpeedMultiplierOf(green));
    });

    it('WALK: practice at going far makes going far faster, by a deliberately small amount', () => {
        const practised = fresh();
        practised.capacities.endurance = 100;
        expect(walkEaseOf(practised)).toBeGreaterThan(1);
        expect(walkEaseOf(practised)).toBeCloseTo(1 + TUNE.enduranceWalkSpeedGainMax, 6);
        //  Smallest of the three, because walking multiplies more of the game's minutes than
        //  anything else here.
        expect(TUNE.enduranceWalkSpeedGainMax).toBeLessThan(TUNE.swimConfidenceSpeedGainMax);
    });

    it('SWIM: confidence reaches PACE, not only the energy ledger it already reached', () => {
        const green = fresh();
        green.player = { x: 0, y: 0 };
        const practised = fresh();
        practised.capacities.breathWaterConfidence = 100;
        expect(swimSpeedEaseOf(practised.capacities)).toBeGreaterThan(1);
        //  ...and it is the largest gain, because the sea is where a beginner is genuinely slow.
        expect(TUNE.swimConfidenceSpeedGainMax).toBeGreaterThan(TUNE.loadToleranceReliefMax);
    });

    it('...but a raft is not a swimmer: practice pays out for the act it was earned by', () => {
        const practised = fresh();
        practised.capacities.breathWaterConfidence = 100;
        practised.raft = { ...practised.raft, aboard: true };
        expect(waterSpeedMultiplierOf(practised)).toBe(TUNE.raftSpeedMultiplier);
    });

    it('DIVE: already felt before this batch, and that is why it is not changed', () => {
        //  Stated as a test rather than as a claim in a report. `airCapacityOf` is the one
        //  capacity consumer that was ALREADY perceivable in the act — more air means longer
        //  under, which a diver notices immediately — so P0-E adds nothing to it. If this ever
        //  goes flat, dive has silently joined the other three and the coverage claim is false.
        const green = fresh();
        const practised = fresh();
        practised.capacities.breathWaterConfidence = 100;
        expect(airCapacityOf(practised.capacities), 'practice buys no more air')
            .toBeGreaterThan(airCapacityOf(green.capacities));
    });
});

// ---------------------------------------------------------------------------
describe('P0-H — the receiver was unfindable, not ungated', () => {
    it('THE INSTRUMENT HOUSING NAMES ITSELF, and the five ordinary parts stay silent', () => {
        const sight = wreckPartSight(TUNE.radioSalvageNodeId);
        expect(sight, 'the housing says nothing').toBeTruthy();
        //  Evidence, not a promise: what it looks like, never what it will do or become.
        expect(sight!).toMatch(/glass|dial/i);
        expect(sight!, 'the sight leaks the outcome').not.toMatch(/receiver|radio|signal|rescue/i);
    });

    it('...and every other part of the wreck is left exactly as it was', () => {
        for (const id of ['wr1', 'wr2', 'wr4', 'wr5', 'wr6']) {
            expect(wreckPartSight(id), `${id} started talking`).toBeNull();
        }
    });
});
