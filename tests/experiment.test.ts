import { describe, expect, it } from 'vitest';
import {
    COMBINE_ALWAYS_SUCCEEDS,
    canExperiment,
    experimentGameHoursFor,
    experimentPairKey,
    hasTried,
    relationshipFor,
    successChanceFor,
    tryCombine,
    makeChosen,
    announcementFor,
    type ExperimentResult
} from '../src/brain/experiment';
import { allRecipes } from '../src/brain/recipes';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState } from '../src/brain/types';
//  STAGE-THEN-CONFIRM. Since the never-auto-commit ruling, `tryCombineWith` returns a
//  QUESTION and spends nothing; the attempt happens when the survivor answers it. These tests
//  exercise attempts, so they answer it — see tests/helpers/confirmed.ts.
import { attemptConfirmed } from './helpers/confirmed';

function run(): GameState {
    return createInitialState(0);
}

/** A castaway with plenty of everything, well fed and rested — so a refusal in a test is
 *  about the combination, never about the body. */
function ready(): GameState {
    const s = run();
    s.inventory.wood = 20;
    s.inventory.stone = 20;
    s.inventory.fiber = 20;
    s.inventory.berries = 20;
    s.inventory.sharpblade = 20;
    s.energy = TUNE.energyMax;
    return s;
}

/** Force the attempt to succeed/fail deterministically by moving Technique, which is what
 *  the confidence curve actually reads. */
function withTechnique(s: GameState, value: number): GameState {
    for (const d of Object.keys(s.knowledge.domains) as Array<keyof typeof s.knowledge.domains>) {
        s.knowledge.domains[d].technique = value;
    }
    return s;
}

describe('experiment — no invented recipes: valid pairs come from the Ch.1 tree only (§10.6)', () => {
    it('wood + fibre is a real relationship (the torch: handle + binding)', () => {
        const recipe = relationshipFor('wood', 'fiber');
        expect(recipe).not.toBeNull();
        expect(allRecipes().map((r) => r.id)).toContain(recipe!.id);
    });

    it('berries go with nothing — food satisfies no structural slot', () => {
        expect(relationshipFor('berries', 'wood')).toBeNull();
        expect(relationshipFor('berries', 'stone')).toBeNull();
    });

    it('a material paired with itself is never a relationship', () => {
        expect(relationshipFor('wood', 'wood')).toBeNull();
    });

    it('two materials that satisfy the SAME slot are alternatives, not partners', () => {
        //  Both are `masonry`; they fill the same role, so combining them invents nothing.
        expect(relationshipFor('stone', 'stone')).toBeNull();
    });

    it('every relationship it reports really is two DIFFERENT slots of one recipe', () => {
        const recipe = relationshipFor('wood', 'stone');
        if (recipe) {
            expect(recipe.slots.length).toBeGreaterThanOrEqual(2);
        }
        expect(relationshipFor('wood', 'fiber')!.slots.length).toBeGreaterThanOrEqual(2);
    });

    it('the pair key is order-independent — the same experiment either way round', () => {
        expect(experimentPairKey('wood', 'fiber')).toBe(experimentPairKey('fiber', 'wood'));
    });
});

describe('experiment — an attempt costs the body, win or lose (§10.6)', () => {
    it('charges energy, hunger, thirst and time on a FAILED attempt too', () => {
        const s = withTechnique(ready(), 0);
        const before = { energy: s.energy, hunger: s.hunger, thirst: s.thirst, clock: s.gameHoursElapsed };
        const result = attemptConfirmed(s, ['berries', 'wood']); // no relationship — a real attempt
        expect(result.ok).toBe(true);
        expect(s.energy).toBeCloseTo(before.energy - TUNE.experimentEnergyCost, 9);
        expect(s.hunger).toBeCloseTo(before.hunger - TUNE.experimentHungerCost, 9);
        expect(s.thirst).toBeCloseTo(before.thirst - TUNE.experimentThirstCost, 9);
        expect(s.gameHoursElapsed).toBeGreaterThan(before.clock);
        expect(result.spent).not.toBeNull();
    });

    it('refuses, with a legible reason, when too spent to concentrate (D-042 fail-loud)', () => {
        const s = ready();
        s.energy = 0;
        expect(canExperiment(s, 'wood', 'fiber')).toBeTruthy();
        const result = attemptConfirmed(s, ['wood', 'fiber']);
        expect(result.ok).toBe(false);
        expect(result.outcome).toBe('refused');
        expect(result.reason).toMatch(/spent|concentrat/i);
    });

    it('refuses when you do not actually hold both things', () => {
        const s = ready();
        s.inventory.fiber = 0;
        const result = attemptConfirmed(s, ['wood', 'fiber']);
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(/in hand/i);
    });

    it('refuses two of the same thing, plainly', () => {
        const s = ready();
        expect(attemptConfirmed(s, ['wood', 'wood']).reason).toMatch(/two different/i);
    });

    it('costs NOTHING to re-try a pair already known to be a dead end — the answer is known', () => {
        const s = withTechnique(ready(), 0);
        attemptConfirmed(s, ['berries', 'wood']);
        const before = { energy: s.energy, clock: s.gameHoursElapsed, count: s.experimentCount };

        const again = attemptConfirmed(s, ['berries', 'wood']);
        expect(again.outcome).toBe('already-known');
        expect(s.energy).toBe(before.energy);
        expect(s.gameHoursElapsed).toBe(before.clock);
        expect(s.experimentCount).toBe(before.count);
        expect(again.reason).toMatch(/already know/i);
    });
});

describe('experiment — failures teach through D-055\'s journal, and nothing else (§10.6)', () => {
    it('a no-relationship attempt journals the pair and fires a knowledge event', () => {
        const s = ready();
        expect(hasTried(s, 'berries', 'wood')).toBe(false);
        attemptConfirmed(s, ['berries', 'wood']);
        expect(hasTried(s, 'berries', 'wood')).toBe(true);
        expect(s.knowledge.events.some((e) => e.kind === 'combination-tried')).toBe(true);
    });

    it('it grants Understanding but NOT Technique — nothing was actually made', () => {
        const s = ready();
        const before = { ...s.knowledge.domains.harvestingFabrication };
        attemptConfirmed(s, ['berries', 'wood']);
        const after = s.knowledge.domains.harvestingFabrication;
        expect(after.understanding).toBeGreaterThan(before.understanding);
        expect(after.technique).toBe(before.technique);
    });

    it('a failed attempt mints NO blueprint and consumes no materials', () => {
        const s = ready();
        const wood = s.inventory.wood;
        attemptConfirmed(s, ['berries', 'wood']);
        expect(s.blueprints).toHaveLength(0);
        expect(s.inventory.wood).toBe(wood); // nothing was made, nothing was spent
    });
});

describe('experiment — a success mints a named Blueprint (§10.5/§10.6)', () => {
    /**
     * Run attempts until the confidence curve lands the TORCH specifically.
     *
     * It used to stop at the first success of any kind, which was safe while the torch was
     * the only recipe on {woodwork, textile}. The backpack now shares that gesture, and
     * `resolveRecipe`'s rotation deliberately alternates between them — so "the first
     * success" can be either, and running on can mint both. That is the matcher working as
     * designed; the helper was the thing assuming a monopoly.
     */
    function inventTorch(s: GameState) {
        for (let i = 0; i < 80; i++) {
            s.energy = TUNE.energyMax;
            s.inventory.wood = 20;
            s.inventory.fiber = 20;
            const r = attemptConfirmed(s, ['wood', 'fiber']);
            if (r.outcome === 'invented' && r.recipeId === 'torch') return r;
        }
        return null;
    }

    it('a success produces a NAMED plan, not "recipe #4"', () => {
        const s = withTechnique(ready(), TUNE.knowledgeScoreMax);
        const result = inventTorch(s);
        expect(result).not.toBeNull();
        expect(result!.blueprint).not.toBeNull();
        expect(result!.blueprint!.name).toMatch(/[A-Za-z]/);
        expect(result!.blueprint!.name).not.toBe(result!.blueprint!.recipeId);
    });

    it('the plan records its inputs, authorship, version and workmanship (§10.6)', () => {
        const s = withTechnique(ready(), TUNE.knowledgeScoreMax);
        inventTorch(s);
        const bp = s.blueprints.find((b) => b.recipeId === 'torch')!;
        expect(bp.inputs.sort()).toEqual(['fiber', 'wood']);
        expect(bp.author).toBeTruthy();
        expect(bp.version).toBe(1);
        expect(['crude', 'serviceable', 'refined', 'exceptional']).toContain(bp.workmanship);
        expect(bp.recipeId).toBe('torch');
    });

    it('a success consumes the two materials — the prototype is what they became', () => {
        const s = withTechnique(ready(), TUNE.knowledgeScoreMax);
        s.inventory.wood = 20;
        s.inventory.fiber = 20;
        const before = { wood: s.inventory.wood, fiber: s.inventory.fiber };
        const r = attemptConfirmed(s, ['wood', 'fiber']);
        if (r.outcome === 'invented') {
            expect(s.inventory.wood).toBe(before.wood - 1);
            expect(s.inventory.fiber).toBe(before.fiber - 1);
        }
    });

    it('re-deriving a plan you hold BUMPS its version rather than duplicating it (§10.5)', () => {
        //  Asserted on the TORCH's plan rather than on the total, which is what the claim was
        //  always about. The backpack shares this gesture and the matcher's rotation may mint
        //  it alongside — that is the tie-break working, not a duplicate.
        const s = withTechnique(ready(), TUNE.knowledgeScoreMax);
        const torchPlans = () => s.blueprints.filter((b) => b.recipeId === 'torch');
        inventTorch(s);
        expect(torchPlans()).toHaveLength(1);
        const v1 = torchPlans()[0].version;
        //  P0-1 — NAMED, not left to the resolver. Once a survivor holds BOTH plans wood+fibre
        //  makes (the torch and the backpack share that gesture), the pile is a QUESTION and the
        //  game refuses to answer it — which is the whole of P0-1. This test's claim is
        //  unchanged; what changed is that re-attempting a pattern you already know both ways
        //  now goes through the choice, exactly as a player does. Rewritten to the new law
        //  rather than deleted, so a silent revert of P0-1 still fails here.
        makeChosen(s, ['wood', 'fiber'], 'torch');
        expect(torchPlans(), 'still ONE torch plan').toHaveLength(1);
        expect(torchPlans()[0].version).toBeGreaterThan(v1);
    });

    it('minting is deterministic — no Math.random anywhere in the path', () => {
        const a = withTechnique(ready(), TUNE.knowledgeScoreMax);
        const b = withTechnique(ready(), TUNE.knowledgeScoreMax);
        inventTorch(a);
        inventTorch(b);
        expect(JSON.stringify(a.blueprints)).toBe(JSON.stringify(b.blueprints));
    });
});

describe('experiment — the confidence curve reuses Ch.2, never a second progression (§10.6)', () => {
    it('success chance rises with the domain\'s own Technique score', () => {
        const novice = withTechnique(ready(), 0);
        const expert = withTechnique(ready(), TUNE.knowledgeScoreMax);
        expect(successChanceFor(expert, 'harvestingFabrication')).toBeGreaterThan(
            successChanceFor(novice, 'harvestingFabrication')
        );
    });

    it('never reaches certainty — an experiment is never a formality', () => {
        const expert = withTechnique(ready(), TUNE.knowledgeScoreMax * 10);
        expect(successChanceFor(expert, 'harvestingFabrication')).toBeLessThanOrEqual(TUNE.experimentMaxSuccessChance);
        expect(TUNE.experimentMaxSuccessChance).toBeLessThan(1);
    });

    it('attempts get FASTER with practice — the "and speed" half of the curve', () => {
        const novice = withTechnique(ready(), 0);
        const expert = withTechnique(ready(), TUNE.knowledgeScoreMax);
        expect(experimentGameHoursFor(expert, 'harvestingFabrication')).toBeLessThan(
            experimentGameHoursFor(novice, 'harvestingFabrication')
        );
    });

    //  PARKED WITH THE FEATURE, NOT DELETED. `COMBINE_ALWAYS_SUCCEEDS` makes every combine and
    //  discovery succeed by explicit direction, so a check that waits for a failure would hang
    //  forever on a product that is behaving exactly as ruled. `skipIf` keys off the SAME
    //  constant the behaviour does, so flipping it back re-arms this in the same edit — the
    //  claim is suspended, never weakened, and Law 128 comes back with its own witness.
    it.skipIf(COMBINE_ALWAYS_SUCCEEDS)('even a real relationship can fail while unpractised — practice is what makes it reliable', () => {
        const novice = withTechnique(ready(), 0);
        let failures = 0;
        for (let i = 0; i < 20; i++) {
            novice.energy = TUNE.energyMax;
            novice.inventory.wood = 20;
            novice.inventory.fiber = 20;
            //  P0-1: attempt normally, and NAME the torch only once the pile has become a
            //  question — which it does after the second invention, because the torch and the
            //  backpack share wood+fibre. Naming it earlier is refused (you cannot choose a
            //  plan you have not worked out), and not naming it later returns `choose`, which
            //  is not an attempt. Either way this stays a real attempt on a real relationship,
            //  which is the claim. Rewritten to the new law rather than deleted, so a silent
            //  revert of P0-1 still fails here.
            //  P0-C widens P0-1: naming is required at ONE held plan, not only at two, so the
            //  predicate that decides whether this pile must be named is `needsNaming`.
            //  `isAmbiguousToPlayer` still answers its own narrower question (which of two?) and
            //  is deliberately not reused here — reading it would fall through to a bare
            //  `tryCombine` that now returns `choose`, and the attempt would never happen.
            //  ONE CALL, NOT A BRANCH. `needsNaming` is now true for any pile that MAKES
            //  something, so branching on it routed an unknown pattern into
            //  `makeChosen('torch')` — correctly refused, so the attempt never happened
            //  and this loop counted zero failures. The helper answers the question the way
            //  the survivor actually would, held or not.
            const attempt = attemptConfirmed(novice, ['wood', 'fiber']);
            if (attempt.outcome === 'failed-attempt') failures += 1;
        }
        expect(failures).toBeGreaterThan(0);
    });

    it('a failed attempt on a REAL relationship still teaches (Technique moves)', () => {
        const s = withTechnique(ready(), 0);
        const before = s.knowledge.domains.survivalcraft.technique;
        for (let i = 0; i < 5; i++) {
            s.energy = TUNE.energyMax;
            s.inventory.wood = 20;
            s.inventory.fiber = 20;
            attemptConfirmed(s, ['wood', 'fiber']);
        }
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before);
    });

    it('a real relationship is NEVER journalled as a dead end, however often it fails', () => {
        const s = withTechnique(ready(), 0);
        for (let i = 0; i < 15; i++) {
            s.energy = TUNE.energyMax;
            s.inventory.wood = 20;
            s.inventory.fiber = 20;
            attemptConfirmed(s, ['wood', 'fiber']);
        }
        expect(hasTried(s, 'wood', 'fiber')).toBe(false);
    });
});

// ---- F3 remediation: the regression FIX 2 shipped without --------------

describe('experimentation outcomes are a closed contract (C3 finding F3/F2 on D-073)', () => {
    //  FIX 2 shipped with no regression at all, and the body then tested
    //  `outcome === 'failed'` — a string that is not one of the five real outcomes — so
    //  `failed-attempt`, `already-known` AND `refused` were every one of them announced to
    //  the player as a SUCCESS, with the unlock cue. An `as { outcome: string }` cast is
    //  what let it compile. This locks the contract the body switches on.
    //  SIX, NOT FIVE. `choose` has been a real outcome since P0-1 and is now the COMMON one:
//  staging anything that makes something returns the question first.
const OUTCOMES = ['invented', 'failed-attempt', 'no-relationship', 'already-known', 'refused', 'choose'];

    it('every outcome tryCombine can return is one of the five named ones', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 400; i++) {
            const s = createInitialState(i);
            s.energy = i % 3 === 0 ? 0 : 100;          // drive refusals too
            s.inventory.wood = i % 5; s.inventory.fiber = i % 4; s.inventory.berries = i % 3;
            for (const d of Object.keys(s.knowledge.domains) as Array<keyof typeof s.knowledge.domains>) {
                s.knowledge.domains[d].technique = (i * 7) % 100;
            }
            const pairs: Array<[string, string]> = [['wood', 'fiber'], ['berries', 'wood'], ['wood', 'wood']];
            for (const [a, b] of pairs) {
                const r = tryCombine(s, a as 'wood', b as 'wood');
                expect(OUTCOMES).toContain(r.outcome);
                seen.add(r.outcome);
            }
        }
        //  WITNESS (D-066 a): the sweep must actually reach several distinct outcomes, or
        //  "they are all valid" is a claim about one branch wearing a corpus's clothes.
        expect(seen.size).toBeGreaterThanOrEqual(3);
    });

    it('only `invented` carries a blueprint — the success branch cannot be entered without one', () => {
        //  The body announces a success and names the plan from `result.blueprint`. If any
        //  non-invented outcome ever carried one, or `invented` ever lacked one, the message
        //  would lie. This is the assertion that would have caught F2's real damage.
        for (let i = 0; i < 300; i++) {
            const s = createInitialState(i);
            s.energy = 100; s.inventory.wood = 20; s.inventory.fiber = 20;
            for (const d of Object.keys(s.knowledge.domains) as Array<keyof typeof s.knowledge.domains>) {
                s.knowledge.domains[d].technique = 100;
            }
            const r = attemptConfirmed(s, ['wood', 'fiber']);
            if (r.outcome === 'invented') expect(r.blueprint?.name).toBeTruthy();
            else expect(r.blueprint).toBeNull();
        }
    });
});

// ---- A4 remediation: the regression F2 ACTUALLY needed ------------------

describe('what the player is TOLD is only ever triumphant for a real invention (C3 finding A4)', () => {
    //  C3: the F3 remediation above locks the brain's outcome contract — and the brain's
    //  contract was never broken. It passes on the pre-fix tree, so it is a contract lock,
    //  not F2's regression. F2's damage was a MISTRANSLATION in the body: `outcome ===
    //  'failed'` matched none of the five outcomes, so three non-successes were announced
    //  with the unlock cue. The body cannot be tested here (Babylon; the purity law), so
    //  the decision moved into `announcementFor` and these are the assertions that would
    //  have caught the real bug.
    const OUTCOMES = ['invented', 'failed-attempt', 'no-relationship', 'already-known', 'refused', 'choose'] as const;
    const resultWith = (outcome: (typeof OUTCOMES)[number], over: Partial<ExperimentResult> = {}): ExperimentResult => ({
        ok: outcome !== 'refused',
        outcome,
        reason: outcome === 'refused' ? 'Too tired to try.' : null,
        blueprint: null,
        recipeId: null,
        spent: null,
        ...over,
    });

    it('ONLY `invented` is triumphant — the unlock cue cannot fire on a non-success', () => {
        for (const outcome of OUTCOMES) {
            const said = announcementFor(resultWith(outcome));
            expect(said.triumphant).toBe(outcome === 'invented');
            //  Presentation must agree: a float reads as a reward, an explain as news.
            expect(said.presentation).toBe(outcome === 'invented' ? 'float' : 'explain');
        }
    });

    it('every outcome says SOMETHING — silence is not a legal outcome (D-042 fail-loud)', () => {
        //  A button that says nothing is indistinguishable from a broken one, which is
        //  precisely how experimentation stayed invisible from D-063 until the playtest.
        for (const outcome of OUTCOMES) {
            expect(announcementFor(resultWith(outcome)).text.trim().length).toBeGreaterThan(0);
        }
        //  Including a refusal whose reason came back empty, which `??` would have let through.
        expect(announcementFor(resultWith('refused', { reason: '' })).text.trim().length).toBeGreaterThan(0);
    });

    it('a real invention NAMES the plan — the field is `blueprint`, not `blueprintName`', () => {
        //  The other half of F2: a genuine success announced "Something works" forever,
        //  because the body read a field that does not exist and TypeScript could not say
        //  so through the `as { outcome: string }` cast.
        const plan: Blueprint = {
            id: 'bp', name: 'Cordage', recipeId: 'cordage', inputs: ['fiber'], version: 1,
            workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 3,
        };
        const said = announcementFor(resultWith('invented', { blueprint: plan, recipeId: 'cordage' }));
        expect(said.text).toContain('Cordage');
    });
});
