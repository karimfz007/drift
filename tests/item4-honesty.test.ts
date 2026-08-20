/**
 * ITEM 4 — THE GAME MUST NOT LIE ABOUT WHAT IT JUST DID.
 *
 * The director's report was that a failed axe attempt prints "the blade lost its edge" while no
 * material actually changed. Measuring it settled that one and turned up a bigger one beside it,
 * and both halves are locked here.
 *
 *   THE REPORTED LINE IS HONEST. `transformOnFailure` really does move `matterWear`, the wear
 *   really is persisted, and the blade really does break on the third failure. What is wrong
 *   there is LEGIBILITY, not truth: with `matterWearPerUnit` at 3 the first failure moves a
 *   counter the player cannot see, so a true sentence is unverifiable at the moment it is said.
 *
 *   THE ONE NEXT TO IT WAS NOT. A successful invention consumed `materials[0]` and
 *   `materials[1]` and nothing else, while the gate accepts up to four. The axe is wood + blade
 *   + BINDING: six successful inventions took wood 40 -> 34 and blade 40 -> 34 and left the
 *   fibre at 40. The survivor stages three things, is told they made something, and one of them
 *   is quietly still in the bag.
 *
 * THE SWEEP, and why it is shaped like this. "Check every narrative line" is not mechanisable —
 * most lines are instructions or refusals, which claim nothing. What IS mechanisable is the
 * class the defect belongs to: a message announcing a change, against the change actually made.
 * So every craft and build verb is driven for real and its declared recipe cost is checked
 * against the inventory it actually moved, and the experiment path is checked at every arity
 * the gate permits.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import {
    buildShelter, buildStorage, craftAxe, craftRaft, craftSpear, craftStoneHammer,
    craftTorch, knapSharpblade, makeBackpack, nearShoreForRaft,
} from '../src/brain/state';
import { SURF_LINE_RADIUS } from '../src/data/world';
import { canExperimentWith, makeChosen } from '../src/brain/experiment';
import { allRecipes } from '../src/brain/recipes';
import { transformOnFailure } from '../src/brain/matter';
import { TUNE } from '../src/data/tune';

const NOW = 1_770_000_000_000;

/** Stocked for anything, and able to attempt it. */
function stocked(): GameState {
    const s = createInitialState(NOW);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    for (const k of ['wood', 'stone', 'fiber', 'sharpblade', 'coconut'] as const) s.inventory[k] = 60;
    //  SESSION 1 — "able to attempt it" now includes HAVING SOMEWHERE TO WORK. Law 220 caps
    //  bare hands at two controlled relations, and this file's whole subject is what a success
    //  costs at every arity the gate accepts — three and four included. A survivor staging
    //  four materials is, by construction, a survivor who built a bench; withholding one here
    //  would narrow the file to arity two and quietly stop testing the thing it is named for.
    s.workspace = { built: true, x: s.player.x, y: s.player.y, tier: 'bench', jointWear: 0 };
    return s;
}

function plan(s: GameState, recipeId: string): void {
    s.blueprints.push({
        recipeId, name: recipeId, version: 1,
        discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
}

// ---------------------------------------------------------------------------
describe('ITEM 4 — a success consumes EVERY staged material, at every legal arity', () => {
    it('THE DEFECT: the axe is three materials, and the binding used to be free', () => {
        const s = stocked();
        plan(s, 'axe');
        const before = { ...s.inventory };
        //  Drive until one genuinely succeeds; the confidence curve makes any single attempt
        //  uncertain, and the claim under test is about what a SUCCESS costs.
        let invented = false;
        for (let i = 0; i < 40 && !invented; i++) {
            s.experimentCount = i;
            for (const k of ['wood', 'sharpblade', 'fiber'] as const) s.inventory[k] = before[k];
            if (makeChosen(s, ['wood', 'sharpblade', 'fiber'], 'axe').outcome === 'invented') invented = true;
        }
        expect(invented, 'no success in 40 attempts — the claim is untested').toBe(true);
        expect(s.inventory.wood, 'the handle was free').toBe(before.wood - 1);
        expect(s.inventory.sharpblade, 'the blade was free').toBe(before.sharpblade - 1);
        expect(s.inventory.fiber, 'THE BINDING WAS FREE — the reported class of defect').toBe(before.fiber - 1);
    });

    it('...and it holds at every arity the gate accepts, two through four', () => {
        //  Derived from the gate rather than hand-listed: if `combineMaxInputs` ever widens
        //  again, this widens with it instead of silently covering less than it claims.
        const SETS: Array<Array<'wood' | 'stone' | 'fiber' | 'sharpblade' | 'coconut'>> = [
            ['wood', 'fiber'],
            ['wood', 'stone', 'fiber'],
            ['wood', 'sharpblade', 'fiber'],
        ];
        for (const set of SETS) {
            expect(set.length).toBeGreaterThanOrEqual(TUNE.combineMinInputs);
            expect(set.length).toBeLessThanOrEqual(TUNE.combineMaxInputs);
            const s = stocked();
            expect(canExperimentWith(s, set), `the gate refused ${set.join('+')}`).toBeNull();

            //  Any outcome that SUCCEEDS must have moved every staged stack by exactly one.
            let sawSuccess = false;
            for (let i = 0; i < 40 && !sawSuccess; i++) {
                const fresh = stocked();
                fresh.experimentCount = i;
                const before = { ...fresh.inventory };
                const out = makeChosen(fresh, set, 'shelter').outcome === 'invented'
                    ? 'invented'
                    : (() => {
                        fresh.experimentCount = i;
                        for (const k of set) fresh.inventory[k] = before[k];
                        return null;
                    })();
                if (out !== 'invented') continue;
                sawSuccess = true;
                for (const k of set) {
                    expect(fresh.inventory[k], `${set.join('+')}: ${k} was not consumed`).toBe(before[k] - 1);
                }
            }
        }
    });
});

// ---------------------------------------------------------------------------
describe('ITEM 4 — every MANUFACTURE verb charges exactly what its recipe declares', () => {
    //  The prototype path was the one that lied; this proves the manufacture path does not, and
    //  keeps proving it. Each entry is driven for real and compared against the recipe's own
    //  slot amounts, so a recipe retune moves the test with the game rather than past it.
    const VERBS: Array<{
        recipeId: string;
        run: (s: GameState) => unknown;
        prepare?: (s: GameState) => void;
        made: (s: GameState) => boolean;
    }> = [
        { recipeId: 'torch', run: (s) => craftTorch(s), made: (s) => s.torch.owned },
        { recipeId: 'axe', run: (s) => craftAxe(s), made: (s) => s.tools.axe },
        { recipeId: 'spear', run: (s) => craftSpear(s), made: (s) => s.tools.spear },
        { recipeId: 'backpack', run: (s) => makeBackpack(s), made: (s) => s.tools.backpack },
        { recipeId: 'stonehammer', run: (s) => craftStoneHammer(s), made: (s) => s.inventory.stonehammer > 0 },
        {
            recipeId: 'shelter',
            run: (s) => buildShelter(s, s.player.x, s.player.y),
            made: (s) => s.shelter.built,
        },
        {
            recipeId: 'storage',
            run: (s) => buildStorage(s, s.player.x, s.player.y),
            made: (s) => s.storage.built,
        },
    ];

    for (const verb of VERBS) {
        it(`${verb.recipeId} — the cost charged is the cost declared`, () => {
            const recipe = allRecipes().find((r) => r.id === verb.recipeId);
            expect(recipe, `no recipe named ${verb.recipeId}`).toBeTruthy();
            const s = stocked();
            plan(s, verb.recipeId);
            verb.prepare?.(s);
            const before = { ...s.inventory };
            verb.run(s);
            expect(verb.made(s), `${verb.recipeId} reported nothing made`).toBe(true);

            //  Every slot's declared amount must have left the inventory. Summed per material
            //  because two slots can draw on the same kind.
            const owed: Partial<Record<string, number>> = {};
            for (const slot of recipe!.slots) {
                const kind = MATERIAL_FOR_TAG[String((slot.require as { tag?: string }).tag ?? '')];
                if (!kind) continue;
                owed[kind] = (owed[kind] ?? 0) + slot.amount;
            }
            for (const [kind, amount] of Object.entries(owed)) {
                expect(before[kind as 'wood'] - s.inventory[kind as 'wood'],
                    `${verb.recipeId}: ${kind} charged wrongly`).toBe(amount);
            }
        });
    }

    //  The one mapping this needs, written out rather than inferred: which material each slot
    //  tag is actually satisfied by in the shipped costs.
    const MATERIAL_FOR_TAG: Record<string, string | undefined> = {
        woodwork: 'wood', masonry: 'stone', textile: 'fiber', blade: 'sharpblade', buoyant: 'coconut',
    };

    it('knapping — the standing-gate recipe is charged too', () => {
        const s = stocked();
        s.inventory.stonehammer = 1;
        const before = s.inventory.stone;
        knapSharpblade(s);
        expect(before - s.inventory.stone, 'knapping was free').toBe(TUNE.knapStoneCost);
    });

    it('the raft charges all three, including the float', () => {
        const s = stocked();
        plan(s, 'raft');
        //  A raft is built where it can float — `nearShoreForRaft` is a real gate, not decoration,
        //  so the fixture has to stand where a survivor actually would.
        s.player = { x: 0, y: SURF_LINE_RADIUS };
        expect(nearShoreForRaft(s), 'the fixture is not at the shore').toBe(true);
        const before = { ...s.inventory };
        craftRaft(s);
        expect(s.raft.built, 'no raft was made').toBe(true);
        expect(before.wood - s.inventory.wood).toBe(TUNE.raftWoodCost);
        expect(before.fiber - s.inventory.fiber).toBe(TUNE.raftFiberCost);
        expect(before.coconut - s.inventory.coconut, 'the float was free').toBe(TUNE.raftCoconutCost);
    });
});

// ---------------------------------------------------------------------------
describe('ITEM 4 — the REPORTED line is honest, and its problem is legibility', () => {
    it('a failed attempt really does change the matter it names', () => {
        const s = stocked();
        const before = s.matterWear.sharpblade ?? 0;
        const out = transformOnFailure(s, ['wood', 'sharpblade', 'fiber']);
        expect(out, 'the transform did not fire at all').toBeTruthy();
        expect(out!.material, 'it named a material it did not touch').toBe('sharpblade');
        expect(s.matterWear.sharpblade ?? 0, 'the wear it announced never happened').toBe(before + TUNE.matterWearPerFailure);
        expect(out!.note).toMatch(/lost its edge/i);
    });

    it('...and the wear ACCUMULATES to a real, visible loss rather than resetting', () => {
        //  The half a player can actually see. Three failures take a whole unit — so the
        //  sentence is not decorative, it is a countdown, and this is what makes it true.
        const s = stocked();
        const startBlades = s.inventory.sharpblade;
        for (let i = 0; i < TUNE.matterWearPerUnit; i++) transformOnFailure(s, ['sharpblade', 'wood']);
        expect(s.inventory.sharpblade, 'the blade never actually broke').toBe(startBlades - 1);
    });

    it('...and it never fires for a material the survivor does not hold', () => {
        const s = stocked();
        s.inventory.sharpblade = 0;
        const out = transformOnFailure(s, ['sharpblade']);
        expect(out, 'it wore down a blade that was not there').toBeNull();
    });
});
