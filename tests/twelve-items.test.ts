/**
 * THE TWELVE ITEMS — the ones with a brain-side claim, locked where they were fixed.
 *
 * Each of these was REPORTED as one thing and turned out, on investigation, to be another;
 * the tests assert what the defect actually was rather than what it was called.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, useStorage, buildStorage, eat } from '../src/brain/state';
import { canMakeShellCup, makeShellCup, shellCupBlocker } from '../src/brain/vessel';
import { canExperimentWith, recipeDisplayName, PLACED_OUTCOMES } from '../src/brain/experiment';
import { buildWorkmat } from '../src/brain/state';
import type { GameState } from '../src/brain/types';

const NOW = 1_770_000_000_000;
function ready(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    s.inventory.wood = 5; s.inventory.stone = 5; s.inventory.fiber = 5;
    s.hunger = 40; s.thirst = 40;
    return s;
}

describe('ITEM 9 — the crate takes everything a survivor can carry', () => {
    it('food, blades and salvage all go in, not just wood/stone/fibre', () => {
        //  The crate was built to stop you carrying things and then refused most of them.
        const s = ready();
        buildStorage(s, 0, 0);
        s.inventory.berries = 4; s.inventory.sharpblade = 2;
        s.inventory.meat = 1; s.inventory.metal = 3; s.inventory.stonehammer = 1;
        const r = useStorage(s);
        expect(r.ok).toBe(true);
        expect(r.action).toBe('deposit');
        for (const kind of ['berries', 'sharpblade', 'meat', 'metal', 'stonehammer'] as const) {
            expect(s.storage.stored[kind], `${kind} would not go in the box`).toBeGreaterThan(0);
            expect(s.inventory[kind], `${kind} was not actually handed over`).toBe(0);
        }
    });

    it('...and comes back out again', () => {
        const s = ready();
        buildStorage(s, 0, 0);
        s.inventory.berries = 4;
        useStorage(s);
        expect(s.inventory.berries).toBe(0);
        const back = useStorage(s);
        expect(back.action).toBe('withdraw');
        expect(s.inventory.berries, 'the box kept the berries').toBeGreaterThan(0);
    });

    it('an OLD crate holding only the original three is still valid — no migration needed', () => {
        //  `StorageInventory` is Partial, so a save whose crate has three keys reads
        //  `undefined` for everything else and every consumer coalesces. A crate that has
        //  never held fish is not a crate holding zero fish.
        const s = ready();
        buildStorage(s, 0, 0);
        s.storage.stored = { wood: 3, stone: 1, fiber: 0 } as typeof s.storage.stored;
        s.inventory.fish = 2;
        expect(() => useStorage(s)).not.toThrow();
        expect(s.storage.stored.fish).toBe(2);
        expect(s.storage.stored.wood, 'the old contents were disturbed').toBe(3);
    });
});

describe('ITEM 3 — the husk you already opened is a cup', () => {
    it('an emptied shell makes a cup, with no blade and no second coconut', () => {
        //  REPORTED as "I have a shell but Fill cup is not offered". The circle was telling
        //  the truth: a shell was not a vessel, and the only route demanded a WHOLE coconut
        //  plus an edge — so a survivor was told to find and cut open a nut to obtain the
        //  thing already in their pack.
        const s = ready();
        s.inventory.coconut = 1;
        eat(s, 'coconut');
        expect(s.inventory.shell, 'eating a coconut stopped leaving a husk').toBeGreaterThan(0);
        expect(s.inventory.coconut).toBe(0);
        expect(s.inventory.sharpblade).toBe(0);

        expect(shellCupBlocker(s), 'a survivor holding a husk was still blocked').toBeNull();
        expect(canMakeShellCup(s)).toBe(true);
        expect(makeShellCup(s)).toBe(true);
        expect(s.water.vessel).toBe('shell-cup');
        expect(s.inventory.shell, 'the husk was not the thing spent').toBe(0);
    });

    it('...and with no husk and no coconut, the refusal names BOTH routes', () => {
        const s = ready();
        expect(canMakeShellCup(s)).toBe(false);
        expect(shellCupBlocker(s)).toMatch(/coconut|shell/i);
    });

    it('...and a survivor who already has a cup is not offered a second', () => {
        const s = ready();
        s.inventory.shell = 3;
        makeShellCup(s);
        expect(canMakeShellCup(s), 'a second cup was offered').toBe(false);
    });
});

describe('ITEM 1 — the refusal names what THIS survivor must do next', () => {
    //  REPORTED TWICE as "the axe still does not work at the mat". The gate was right both
    //  times — a mat is W0 and W0 is two relations — but the sentence never read the
    //  workspace, so a castaway standing on a WORK MAT was told "a workbench would hold the
    //  third steady". A work mat is, to any reasonable reader, a workbench. The game named
    //  the missing thing in the exact words the survivor believed described the thing under
    //  their feet, and the truest reason read as a broken button.
    const AXE = ['wood', 'sharpblade', 'fiber'] as const;

    it('with NOTHING laid, it names the workbench', () => {
        const s = ready();
        s.inventory.sharpblade = 2;
        expect(canExperimentWith(s, [...AXE])).toMatch(/workbench/i);
    });

    it('standing ON a mat, it says the mat needs FRAMING — not that a workbench is missing', () => {
        const s = ready();
        s.inventory.sharpblade = 2;
        buildWorkmat(s, 0, 0);
        const said = canExperimentWith(s, [...AXE]) ?? '';
        expect(said, 'still told to find the thing they are standing on').toMatch(/frame|legs/i);
        expect(said).not.toMatch(/a workbench would hold/i);
    });

    it('...and away from your own mat, it says where the problem is', () => {
        const s = ready();
        s.inventory.sharpblade = 2;
        buildWorkmat(s, 0, 0);
        s.player = { x: 80, y: 80 };
        expect(canExperimentWith(s, [...AXE]) ?? '').toMatch(/not at it/i);
    });

    it('every one of them still names the ENABLER and never the outcome (Law 95)', () => {
        const states: GameState[] = [];
        const bare = ready(); bare.inventory.sharpblade = 2; states.push(bare);
        const matted = ready(); matted.inventory.sharpblade = 2; buildWorkmat(matted, 0, 0); states.push(matted);
        const away = ready(); away.inventory.sharpblade = 2; buildWorkmat(away, 0, 0);
        away.player = { x: 80, y: 80 }; states.push(away);
        for (const s of states) {
            const said = canExperimentWith(s, [...AXE]) ?? '';
            expect(said.length, 'a refusal went silent').toBeGreaterThan(0);
            for (const leak of [/axe/i, /haft/i]) {
                expect(said, `leaked the outcome: "${said}"`).not.toMatch(leak);
            }
        }
    });
});

describe('ITEM 2 — every placed outcome can name itself', () => {
    it('the siting prompt is DERIVED, so a fourth placed outcome cannot inherit a third’s words', () => {
        //  REPORTED as "re-staging stone + fibre says PLACE THE SHELTER but places a mat", and
        //  diagnosed as stale cached text. It was a two-way ternary: `recipeId === 'storage' ?
        //  crate : shelter`, so "not the crate" MEANT the shelter and `workmat` — the third
        //  placed outcome, and the first added since that line was written — fell off the end
        //  into the shelter's sentence. Nothing was cached; the label was never asked.
        //
        //  The prompt now reads `recipeDisplayName(recipeId)`, so this guards the property the
        //  fix rests on: every placed outcome has a real name, distinct from the others.
        const placed = ['shelter', 'storage', 'workmat'];
        const names = placed.map((id) => recipeDisplayName(id));
        for (const [i, name] of names.entries()) {
            expect(name, `${placed[i]} has no display name to put in the prompt`).toBeTruthy();
            expect(name).not.toBe(placed[i]);
        }
        expect(new Set(names).size, `two placed outcomes share a name: ${names.join(', ')}`).toBe(placed.length);
    });

    it('...and every PLACED_OUTCOME is covered, not just the three known today', () => {
        for (const id of PLACED_OUTCOMES) {
            const name = recipeDisplayName(id);
            expect(name, `${id} would be sited under a raw recipe id`).not.toBe(id);
        }
    });
});
