import { describe, expect, it } from 'vitest';
import {
    KNOWLEDGE_DOMAINS,
    applyLearningEvent,
    domainForNodeKind,
    evaluateLearningEvent,
    freshDomainScore,
    freshDomainScores,
    nullOutcomeFactors,
    recordTrying,
    tryFactorsFor
} from '../src/brain/knowledge';
import { recipeDomain } from '../src/brain/recipes';
import {
    buildFire,
    buildShelter,
    buildStorage,
    canCraftAxe,
    craftAxe,
    craftStoneHammer,
    craftTorch,
    createInitialState,
    drinkAtPond,
    drinkFlask,
    eat,
    feedFire,
    fillFlask,
    gatherNode,
    knapSharpblade,
    lightTorch,
    repairStructure
} from '../src/brain/state';
import { recordCombinationAttempts } from '../src/brain/recipes';
import { TUNE } from '../src/data/tune';
import { POND } from '../src/data/world';
import type { GameState, NodeKind } from '../src/brain/types';

function run() {
    return createInitialState(0);
}

describe('knowledge — domain state starts at the innate floor, never zero', () => {
    it('every one of the seven domains starts at the same floor, on all three stats', () => {
        const scores = freshDomainScores();
        expect(KNOWLEDGE_DOMAINS.length).toBe(7);
        for (const domain of KNOWLEDGE_DOMAINS) {
            expect(scores[domain]).toEqual({
                technique: TUNE.knowledgeInnateFloor,
                understanding: TUNE.knowledgeInnateFloor,
                adaptation: TUNE.knowledgeInnateFloor
            });
        }
        expect(TUNE.knowledgeInnateFloor).toBeGreaterThan(0);
    });

    it('freshDomainScore matches freshDomainScores for any single domain', () => {
        expect(freshDomainScore()).toEqual(freshDomainScores().survivalcraft);
    });

    it('a fresh run state already has every domain populated', () => {
        const s = run();
        expect(Object.keys(s.knowledge.domains).length).toBe(7);
    });
});

describe('knowledge — the evaluator: near-zero on repetition, by construction', () => {
    it('a domain already at the ceiling gets exactly zero on both stats — no headroom, no special case', () => {
        const maxed = { technique: TUNE.knowledgeScoreMax, understanding: TUNE.knowledgeScoreMax, adaptation: 0 };
        const delta = evaluateLearningEvent(tryFactorsFor(maxed));
        expect(delta.technique).toBe(0);
        expect(delta.understanding).toBe(0);
    });

    it('delta shrinks monotonically as a domain approaches the ceiling — a smooth curve, not a cliff', () => {
        const steps = [0, 25, 50, 75, 90, 99, 99.9]; // scores in [0, knowledgeScoreMax)
        let lastTechnique = Infinity;
        let lastUnderstanding = Infinity;
        for (const level of steps) {
            const score = { technique: level, understanding: level, adaptation: 0 };
            const delta = evaluateLearningEvent(tryFactorsFor(score));
            expect(delta.technique).toBeLessThanOrEqual(lastTechnique);
            expect(delta.understanding).toBeLessThanOrEqual(lastUnderstanding);
            expect(delta.technique).toBeGreaterThan(0); // still short of the exact ceiling
            expect(delta.understanding).toBeGreaterThan(0);
            lastTechnique = delta.technique;
            lastUnderstanding = delta.understanding;
        }
    });

    it('a null-outcome attempt is Understanding-only — Technique is exactly 0, not merely small', () => {
        const delta = evaluateLearningEvent(nullOutcomeFactors());
        expect(delta.technique).toBe(0);
        expect(delta.understanding).toBeGreaterThan(0);
    });

    it('never produces a negative delta, for any factor combination in range', () => {
        for (let i = 0; i <= 10; i++) {
            const f = i / 10;
            const delta = evaluateLearningEvent({ challenge: f, novelty: f, feedback: f, consequence: f, reflection: f });
            expect(delta.technique).toBeGreaterThanOrEqual(0);
            expect(delta.understanding).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('knowledge — applyLearningEvent / recordTrying: mutates in place, clamps at the ceiling', () => {
    it('recordTrying raises both stats from the floor and never lowers them', () => {
        const s = run();
        const before = { ...s.knowledge.domains.survivalcraft };
        recordTrying(s, 'survivalcraft');
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);
        expect(s.knowledge.domains.survivalcraft.understanding).toBeGreaterThan(before.understanding);
        //  Only the targeted domain moves.
        for (const domain of KNOWLEDGE_DOMAINS) {
            if (domain === 'survivalcraft') continue;
            expect(s.knowledge.domains[domain]).toEqual(freshDomainScore());
        }
    });

    it('repeated calls never push a domain past knowledgeScoreMax', () => {
        const s = run();
        for (let i = 0; i < 500; i++) recordTrying(s, 'harvestingFabrication');
        expect(s.knowledge.domains.harvestingFabrication.technique).toBeLessThanOrEqual(TUNE.knowledgeScoreMax);
        expect(s.knowledge.domains.harvestingFabrication.understanding).toBeLessThanOrEqual(TUNE.knowledgeScoreMax);
    });

    it('applyLearningEvent returns the delta it actually computed', () => {
        const s = run();
        const delta = applyLearningEvent(s, 'construction', nullOutcomeFactors());
        expect(delta.technique).toBe(0);
        expect(delta.understanding).toBeGreaterThan(0);
        expect(s.knowledge.domains.construction.understanding).toBeCloseTo(TUNE.knowledgeInnateFloor + delta.understanding, 9);
    });
});

describe('knowledge — item 4: mapping existing verbs to domains (only what the ruling names)', () => {
    const ALL_NODE_KINDS: NodeKind[] = [
        'driftwood', 'deadfall', 'tree', 'rock', 'berrybush', 'coconutpalm', 'reed', 'shellfish', 'crashbox', 'quarry', 'salvage'
    ];

    it('felling (tree), quarrying, and salvage map to Harvesting & fabrication; everything else stays unmapped (floor)', () => {
        const expected: Record<string, string | null> = {
            driftwood: null,
            deadfall: null,
            tree: 'harvestingFabrication',
            rock: null,
            berrybush: null,
            coconutpalm: null,
            reed: null,
            shellfish: null,
            crashbox: null,
            quarry: 'harvestingFabrication',
            salvage: 'harvestingFabrication'
        };
        for (const kind of ALL_NODE_KINDS) {
            expect(domainForNodeKind(kind)).toBe(expected[kind]);
        }
    });

    it('every recipe maps to a domain, matching item 4\'s buckets', () => {
        expect(recipeDomain('axe')).toBe('harvestingFabrication');
        expect(recipeDomain('stonehammer')).toBe('harvestingFabrication');
        expect(recipeDomain('knap')).toBe('harvestingFabrication');
        expect(recipeDomain('shelter')).toBe('construction');
        expect(recipeDomain('storage')).toBe('construction');
        expect(recipeDomain('torch')).toBe('survivalcraft');
    });

    it('recipeDomain throws on an unknown id rather than silently guessing', () => {
        expect(() => recipeDomain('bogus')).toThrow();
    });
});

describe('knowledge — wired for real: successful verbs train their claimed domain', () => {
    it('felling a tree trains Harvesting & fabrication; gathering driftwood trains nothing', () => {
        const s = run();
        s.tools.axe = true;
        const beforeHF = { ...s.knowledge.domains.harvestingFabrication };
        gatherNode(s, 'tr1');
        expect(s.knowledge.domains.harvestingFabrication.technique).toBeGreaterThan(beforeHF.technique);

        const beforeAll = { ...s.knowledge.domains };
        gatherNode(s, 'dw1'); // driftwood: no domain
        for (const domain of KNOWLEDGE_DOMAINS) {
            expect(s.knowledge.domains[domain]).toEqual(beforeAll[domain]);
        }
    });

    it('mining the quarry trains Harvesting & fabrication', () => {
        const s = run();
        const before = { ...s.knowledge.domains.harvestingFabrication };
        gatherNode(s, 'qr1');
        expect(s.knowledge.domains.harvestingFabrication.technique).toBeGreaterThan(before.technique);
    });

    it('the stone hammer, knapping, and the axe each train Harvesting & fabrication', () => {
        const s = run();
        s.inventory.wood = 999;
        s.inventory.stone = 999;
        s.inventory.fiber = 999;

        let before = { ...s.knowledge.domains.harvestingFabrication };
        expect(craftStoneHammer(s)).toBe(true);
        expect(s.knowledge.domains.harvestingFabrication.technique).toBeGreaterThan(before.technique);

        before = { ...s.knowledge.domains.harvestingFabrication };
        expect(knapSharpblade(s)).toBe(true);
        expect(s.knowledge.domains.harvestingFabrication.technique).toBeGreaterThan(before.technique);

        before = { ...s.knowledge.domains.harvestingFabrication };
        expect(canCraftAxe(s)).toBe(true);
        expect(craftAxe(s)).toBe(true);
        expect(s.knowledge.domains.harvestingFabrication.technique).toBeGreaterThan(before.technique);
    });

    it('the shelter, storage, and a repair each train Construction', () => {
        const s = run();
        s.inventory.wood = 999;
        s.inventory.stone = 999;
        s.inventory.fiber = 999;

        let before = { ...s.knowledge.domains.construction };
        expect(buildShelter(s, 0, 0)).toBe(true);
        expect(s.knowledge.domains.construction.technique).toBeGreaterThan(before.technique);

        before = { ...s.knowledge.domains.construction };
        expect(buildStorage(s, 10, 10)).toBe(true);
        expect(s.knowledge.domains.construction.technique).toBeGreaterThan(before.technique);

        s.shelter.durability = 10; // below the repair threshold
        s.player = { x: s.shelter.x, y: s.shelter.y };
        before = { ...s.knowledge.domains.construction };
        expect(repairStructure(s, 'shelter')).toBe(true);
        expect(s.knowledge.domains.construction.technique).toBeGreaterThan(before.technique);
    });

    it('fire, the torch, drinking, and eating each train Survivalcraft', () => {
        const s = run();
        s.inventory.wood = 999;
        s.inventory.fiber = 999;

        let before = { ...s.knowledge.domains.survivalcraft };
        expect(buildFire(s, 0, 0)).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);

        before = { ...s.knowledge.domains.survivalcraft };
        expect(feedFire(s)).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);

        before = { ...s.knowledge.domains.survivalcraft };
        expect(craftTorch(s)).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);

        before = { ...s.knowledge.domains.survivalcraft };
        expect(lightTorch(s)).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);

        s.player = { x: POND.x, y: POND.y };
        s.thirst = 10;
        before = { ...s.knowledge.domains.survivalcraft };
        expect(drinkAtPond(s)).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);

        s.tools.flask = true;
        expect(fillFlask(s)).toBe(true);
        s.player = { x: 0, y: 0 };
        s.thirst = 10;
        before = { ...s.knowledge.domains.survivalcraft };
        expect(drinkFlask(s)).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);

        s.hunger = 10;
        s.inventory.berries = 1;
        before = { ...s.knowledge.domains.survivalcraft };
        expect(eat(s, 'berries')).toBe(true);
        expect(s.knowledge.domains.survivalcraft.technique).toBeGreaterThan(before.technique);
    });
});

describe('knowledge — item 3: the null-outcome journal is wired for real', () => {
    function stateHoldingBerries(): GameState {
        const s = run();
        s.inventory.berries = 1; // berries satisfy no slot in any recipe (food, not woodwork/masonry/textile/blade)
        return s;
    }

    it('a genuinely new null pair grants Understanding (not Technique) in the recipe\'s own domain', () => {
        const s = stateHoldingBerries();
        const before = { ...s.knowledge.domains.harvestingFabrication }; // axe-blade slot -> harvestingFabrication
        recordCombinationAttempts(s);
        expect(s.knowledge.nullPairs.length).toBeGreaterThan(0);
        expect(s.knowledge.domains.harvestingFabrication.understanding).toBeGreaterThan(before.understanding);
        expect(s.knowledge.domains.harvestingFabrication.technique).toBe(before.technique);
    });

    it('a repeat attempt against the same held inventory is a genuine no-op — idempotent, not just deduped in the journal', () => {
        const s = stateHoldingBerries();
        recordCombinationAttempts(s);
        const afterFirst = JSON.parse(JSON.stringify(s.knowledge));
        recordCombinationAttempts(s);
        expect(s.knowledge).toEqual(afterFirst);
    });
});
