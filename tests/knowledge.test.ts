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
    tryFactorsFor, masteryFor, masteryDomainForNodeKind, masteryForNodeKind } from '../src/brain/knowledge';
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
    repairStructure, nodeHoldSeconds, nodeSpec, ALL_NODE_KINDS } from '../src/brain/state';
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
    //  C3 NOTE: a hand-typed copy used to SHADOW the derived import here — the A8 pattern
    //  surviving 300 lines above the fix that introduced it, so a new node kind was skipped
    //  in this block in silence. The import is used directly now; there is no second list.

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
            //  THE WRECK SLICE. NULL here on purpose: working the wreck is not harvesting or
            //  fabrication, and it trains `navigationSeamanship` through an explicit
            //  `recordTrying` at the gather call site rather than through this map. Listed so
            //  the manifest stays total — a kind missing from it is the drift this test exists
            //  to catch.
            wreckpart: null,
            //  DROP 2 — the boulder formation trains NOTHING, deliberately. It is the one
            //  inexhaustible face in the game, so a channel from it to a domain score would
            //  be an XP faucet that never runs dry. Mastery still SPEEDS the work (it is in
            //  `masteryDomainForNodeKind`), which is the asymmetry the anti-grind rule wants:
            //  getting better makes the job quicker, doing the job forever teaches nothing.
            boulder: null,
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

// ---- Gate 0 item 3: mastery made real ------------------------------------

describe('mastery is embodied, not merely recorded (Gate 0 item 3)', () => {
    const treeState = () => {
        const s = createInitialState(0);
        s.tools.axe = true;
        s.energy = TUNE.energyMax;
        return s;
    };

    //  THE REGRESSION IS THE REPORT. Ch.2 shipped the domain scores and every channel that
    //  trains them, and then nothing read them — a survivor could reach 100 understanding
    //  and fell a tree in exactly a first-day castaway's time for exactly the same wood.
    //  This raises the domain and measures what actually changed, and prints it, so the
    //  claim "mastery is real" is a number in the test output rather than an assertion of
    //  faith. Proven to FAIL on the pre-mastery tree (both deltas 0.0%) per D-066(b).
    it('REPORT — raising a domain measurably speeds the work and raises the yield', () => {
        const novice = treeState();
        const master = treeState();
        for (const d of KNOWLEDGE_DOMAINS) {
            master.knowledge.domains[d] = { technique: 100, understanding: 100, adaptation: 100 };
        }

        const tree = novice.nodes.find((n) => n.kind === 'tree')!;
        const masterTree = master.nodes.find((n) => n.id === tree.id)!;

        const noviceHold = nodeHoldSeconds(novice, tree);
        const masterHold = nodeHoldSeconds(master, masterTree);
        const speedGain = (1 - masterHold / noviceHold) * 100;

        //  Yield is sampled across many nodes because the fractional remainder resolves from
        //  a seeded roll per node — one tree would measure the roll, not the mastery.
        const totalFor = (s: typeof novice) => {
            let wood = 0;
            for (const n of s.nodes.filter((x) => x.kind === 'tree')) {
                const before = s.inventory.wood;
                gatherNode(s, n.id);
                wood += s.inventory.wood - before;
            }
            return wood;
        };
        const noviceWood = totalFor(novice);
        const masterWood = totalFor(master);
        const yieldGain = (masterWood / noviceWood - 1) * 100;

        console.log(
            `\n  MASTERY REPORT — felling, novice vs master:\n` +
            `    hold time   ${noviceHold.toFixed(2)}s -> ${masterHold.toFixed(2)}s  (${speedGain.toFixed(1)}% faster)\n` +
            `    wood yield  ${noviceWood} -> ${masterWood}          (${yieldGain.toFixed(1)}% more)\n`
        );

        expect(masterHold).toBeLessThan(noviceHold);
        expect(speedGain).toBeGreaterThan(20);
        expect(masterWood).toBeGreaterThan(noviceWood);
        expect(yieldGain).toBeGreaterThan(20);
    });

    it('a novice is genuinely unaffected — mastery adds, it never taxes the beginner', () => {
        const s = treeState();
        const tree = s.nodes.find((n) => n.kind === 'tree')!;
        const m = masteryFor(s, 'harvestingFabrication');
        //  EXACTLY neutral at the innate floor. Mastery is measured from what this person
        //  learned, not from zero, so a first-day castaway gets the plain base numbers — no
        //  unearned bonus, and equally no penalty for being new. (Measuring from zero handed
        //  a novice 5 stone from a 4-stone quarry tap; a renewability test caught it.)
        expect(m.speedMultiplier).toBe(1);
        expect(m.yieldMultiplier).toBe(1);
        expect(nodeHoldSeconds(s, tree)).toBeGreaterThan(0);
    });
});

// ---- Director's playtest: mastery must be visible on EVERY verb ----------

describe('mastery reaches every harvesting verb, not just the named training ones', () => {
    const mk = (master: boolean) => {
        const s = createInitialState(0);
        s.tools.axe = true;
        s.energy = TUNE.energyMax;
        if (master) for (const d of KNOWLEDGE_DOMAINS) s.knowledge.domains[d] = { technique: 100, understanding: 100, adaptation: 100 };
        return s;
    };

    //  THE PLAYTEST BUG. `domainForNodeKind` answers "what does this verb TRAIN?" and Ch.2
    //  deliberately named only felling, quarrying and salvage. Mastery read that same map,
    //  so breaking surface rock got no benefit at all however practised the survivor was —
    //  which is why the director could report mastery "only visibly affects forging".
    //  Training is unchanged; the EFFECT now covers every effortful harvesting verb.
    //  Fails on the pre-fix tree at `rock` (1.50 -> 1.50, 0.0% faster) per D-066(b).
    it('REPORT — fell, mine surface rock, and quarry each show a real delta', () => {
        const rows: string[] = [];
        for (const kind of ['tree', 'rock', 'quarry'] as const) {
            const novice = mk(false);
            const master = mk(true);
            const nNode = novice.nodes.find((n) => n.kind === kind)!;
            const mNode = master.nodes.find((n) => n.kind === kind)!;

            const nHold = nodeHoldSeconds(novice, nNode);
            const mHold = nodeHoldSeconds(master, mNode);
            const faster = (1 - mHold / nHold) * 100;
            const yieldMult = masteryForNodeKind(master, kind).yieldMultiplier;

            rows.push(`    ${kind.padEnd(7)} hold ${nHold.toFixed(2)}s -> ${mHold.toFixed(2)}s  (${faster.toFixed(1)}% faster), yield x${yieldMult.toFixed(2)}`);
            expect(mHold).toBeLessThan(nHold);
            expect(faster).toBeGreaterThan(20);
            expect(yieldMult).toBeGreaterThan(1.2);
        }
        console.log(`\n  MASTERY REPORT — every harvesting verb:\n${rows.join('\n')}\n`);
    });

    it('training stays exactly as Ch.2 ruled it — the effect widened, the ruling did not', () => {
        //  Only the named verbs train. Widening the EFFECT must not quietly widen the
        //  constitutional training rule underneath it.
        expect(domainForNodeKind('tree')).toBe('harvestingFabrication');
        expect(domainForNodeKind('quarry')).toBe('harvestingFabrication');
        expect(domainForNodeKind('salvage')).toBe('harvestingFabrication');
        expect(domainForNodeKind('rock')).toBeNull();
        expect(domainForNodeKind('deadfall')).toBeNull();
        //  ...while the effect reaches them.
        expect(masteryDomainForNodeKind('rock')).toBe('harvestingFabrication');
        expect(masteryDomainForNodeKind('deadfall')).toBe('harvestingFabrication');
    });

    it('a gather REPORTS what it taught, so the body can say so', () => {
        const s = mk(false);
        const tree = s.nodes.find((n) => n.kind === 'tree')!;
        const result = gatherNode(s, tree.id);
        expect(result.learned).not.toBeNull();
        expect(result.learned!.domain).toBe('harvestingFabrication');
        expect(result.learned!.techniqueAfter).toBeGreaterThan(result.learned!.techniqueBefore);
        //  An untrained verb reports nothing rather than lying about it.
        const rock = s.nodes.find((n) => n.kind === 'rock')!;
        expect(gatherNode(s, rock.id).learned).toBeNull();
    });
});

describe('mastery only ever rewards effortful work (structural guard)', () => {
    //  THE GUARD THAT SHOULD HAVE EXISTED. F4 was fixed by hand for `reed` and
    //  `coconutpalm`, and `salvage` survived the same sweep purely because it sat in the
    //  original list — a tap-kind node quietly taking a yield bonus, on loot that was
    //  already rolled at spawn. A hand-maintained list drifts; this asserts the rule itself,
    //  so any kind added to the mastery map in future must be hold-kind or fail here.
    it('every kind in the mastery map is hold-kind, and no tap-kind sneaks in', () => {
        //  Derived, never re-typed (C3 finding A8): a kind added to the game and forgotten
        //  in a hand-written list would be skipped here in silence.
        const ALL: NodeKind[] = ALL_NODE_KINDS;
        //  One named exemption: `crashbox` is hold-kind but is a one-time story beat with
        //  fixed contents, not a resource — the same exemption regrowth already makes. Named
        //  here so the rule stays exact instead of being loosened to accommodate it.
        const EXEMPT: NodeKind[] = ['crashbox'];
        const wrong: string[] = [];
        for (const kind of ALL) {
            const hasMastery = masteryDomainForNodeKind(kind) !== null;
            const shouldHave = nodeSpec(kind).interaction === 'hold' && !EXEMPT.includes(kind);
            if (hasMastery !== shouldHave) wrong.push(`${kind}: mastery=${hasMastery} expected=${shouldHave}`);
        }
        expect(wrong).toEqual([]);
    });
});
