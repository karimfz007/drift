/**
 * COMBINE MAKES THE THING — every known outcome, hand-held or placed.
 *
 * The defect this closes: a known outcome chosen from the slate only bumped its plan version
 * ("You refine your plan for X"), because the combine path mints PLANS and the Build panel
 * turned plans into OBJECTS. Once shelter and storage got a real build from the slate, a crate
 * went up and a spear did not.
 *
 * The brain half of that is `recipeCost`: it has to agree, to the unit, with what each shipped
 * maker actually deducts. The body wires the makers, and a device section drives them; what is
 * asserted here is the contract they all rest on.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import { isPlaced, recipeCost, placedCost, recipeDisplayName } from '../src/brain/experiment';
import {
    craftAxe, craftFishingLine, craftNet, craftSpear, craftStoneHammer, craftTorch,
    makeBackpack, buildShelter, buildStorage,
} from '../src/brain/state';
import { allRecipes } from '../src/brain/recipes';

type Maker = (s: GameState) => boolean;

/** Every outcome the slate can offer, with the maker that actually produces it. */
const MAKERS: Array<{ id: string; make: Maker }> = [
    { id: 'torch', make: craftTorch },
    { id: 'axe', make: craftAxe },
    { id: 'spear', make: craftSpear },
    { id: 'backpack', make: makeBackpack },
    { id: 'stonehammer', make: craftStoneHammer },
    { id: 'fishingline', make: craftFishingLine },
    { id: 'net', make: craftNet },
    { id: 'shelter', make: (s) => buildShelter(s, 0, 96) },
    { id: 'storage', make: (s) => buildStorage(s, 0, 96) },
];

const stocked = (): GameState => {
    const s = createInitialState(1_770_000_000_000);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    for (const k of ['wood', 'stone', 'fiber', 'sharpblade', 'coconut'] as const) {
        (s.inventory as unknown as Record<string, number>)[k] = 60;
    }
    return s;
};

describe('what Combine charges is what the maker charges', () => {
    for (const { id, make } of MAKERS) {
        it(`${id} — recipeCost agrees with the maker to the unit`, () => {
            const s = stocked();
            const before = { ...s.inventory } as unknown as Record<string, number>;
            expect(make(s), `${id} refused with everything in hand`).toBe(true);
            const cost = recipeCost(id);
            expect(cost.length, `${id} has no cost table`).toBeGreaterThan(0);
            for (const { kind, amount } of cost) {
                expect(before[kind] - ((s.inventory as unknown as Record<string, number>)[kind] ?? 0),
                    `${id}: recipeCost says ${amount} ${kind}, the maker took something else`).toBe(amount);
            }
            //  ...and NOTHING outside the cost table moved. A maker that quietly spends a
            //  material the table does not mention would let the box top-up under-draw.
            //
            //  `kind === id` IS ALSO EXEMPT (item 3, this batch). The stone hammer is now a
            //  genuine `Inventory` key, so it is both this recipe's OWN output and one of the
            //  kinds this loop walks — `craftStoneHammer` setting `inventory.stonehammer` from
            //  0 to 1 is the recipe's YIELD, not an unaccounted spend, and the cost table
            //  correctly never lists an item as its own ingredient. No other maker in this
            //  list writes an `Inventory` key that shares its own recipe id, so this exemption
            //  changes nothing for the rest of them.
            for (const kind of Object.keys(before)) {
                if (kind === id) continue;
                if (cost.some((c) => c.kind === kind)) continue;
                expect((s.inventory as unknown as Record<string, number>)[kind] ?? 0,
                    `${id} spent ${kind}, which its cost table does not list`).toBe(before[kind]);
            }
        });
    }

    it('the raft is costed too, even though its maker also wants water', () => {
        //  Not built here: `canCraftRaft` needs a shore, which is a body-side fact. The cost
        //  table is still asserted, because `drawIntoHands` uses it before the maker runs.
        const cost = recipeCost('raft');
        expect(cost.map((c) => c.kind).sort()).toEqual(['fiber', 'pontoon', 'wood']);
        for (const c of cost) expect(c.amount).toBeGreaterThan(0);
    });

    it('EVERY recipe the slate can offer has a cost table', () => {
        //  `knap` is a NAMED exemption now (item 3, this batch), not an arity accident. It
        //  is a genuine two-slot recipe like everything else here — hammer plus stone — so
        //  it can reach the slate same as any other combine. It still has no cost table,
        //  and correctly so: `Game.MAKERS.knap` (`knapSharpblade`) is fully self-sufficient
        //  and spends the stone itself, so a cost-table entry would be drawn into hands and
        //  then charged AGAIN by the maker. `recipeCost`'s own doc comment (experiment.ts)
        //  states the same rule from the production side.
        for (const r of allRecipes()) {
            if (r.id === 'knap') { expect(recipeCost(r.id)).toEqual([]); continue; }
            if (r.slots.length < 2) { expect(recipeCost(r.id)).toEqual([]); continue; }
            expect(recipeCost(r.id).length, `${r.id} would be offered with no way to charge it`)
                .toBeGreaterThan(0);
        }
    });

    it('placedCost stays the narrower question and answers it the same way', () => {
        expect(placedCost('shelter')).toEqual(recipeCost('shelter'));
        expect(placedCost('storage')).toEqual(recipeCost('storage'));
        for (const id of ['axe', 'spear', 'torch', 'net']) expect(placedCost(id)).toEqual([]);
    });
});

describe('placed and hand-held stay distinguishable', () => {
    it('exactly three outcomes ask WHERE — and the BENCH is deliberately not one of them', () => {
        //  SESSION 1: `workmat` joins the crate and the shelter because laying it IS choosing
        //  where the work happens. `workbench` stays out: it upgrades that mat in place, so
        //  asking "where does the bench go" would re-ask a question the ground already
        //  answers — [[D-165]]'s "improvements make THIS one better", applied to the ladder.
        const placed = allRecipes().map((r) => r.id).filter(isPlaced);
        expect(placed.sort()).toEqual(['shelter', 'storage', 'workmat']);
        expect(isPlaced('workbench')).toBe(false);
    });

    it('...and every other maker puts the thing in your hands or on your back', () => {
        for (const { id, make } of MAKERS) {
            if (isPlaced(id)) continue;
            const s = stocked();
            expect(make(s), `${id} refused`).toBe(true);
        }
    });
});

describe('the shelter is called a Shelter', () => {
    it('the display name is Shelter, not a tier name', () => {
        expect(recipeDisplayName('shelter')).toBe('Shelter');
    });

    it('...and nothing in the model is a tier to begin with', () => {
        //  The ruling is that improvements make THIS shelter better rather than replacing it
        //  with a differently-named thing. That needed no restructuring: there is one shelter
        //  object with `built`, `durability` and named defects — no ladder, no second id.
        const s = stocked();
        buildShelter(s, 0, 96);
        expect(s.shelter.built).toBe(true);
        expect('tier' in s.shelter, 'a tier field appeared').toBe(false);
        expect(allRecipes().filter((r) => r.id.includes('shelter')).map((r) => r.id))
            .toEqual(['shelter']);
    });

    it('...and no display name anywhere still says lean-to', () => {
        for (const r of allRecipes()) {
            expect(recipeDisplayName(r.id), `${r.id} still reads as a lean-to`)
                .not.toMatch(/lean-to/i);
        }
    });
});
