/**
 * THIS SESSION'S THREE ITEMS, locked where they are pure.
 *
 * Each one is written against the director's own words, and against the case he reported, so a
 * silent revert fails here rather than in his hands.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, eat, gatherNode, type GameState } from '../src/brain';
import {
    EXPERIMENT_CHOICE, hasUnknownRival, heldMatches, knownMatches,
    makeChosen, needsNaming, tryCombineWith,
} from '../src/brain/experiment';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => {
    const s = createInitialState(NOW);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    return s;
};
const plan = (s: GameState, recipeId: string) => {
    s.blueprints.push({
        recipeId, name: recipeId, version: 1,
        discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
};

// ---------------------------------------------------------------------------
describe('1 — never auto-commit: staging always asks, whatever is known', () => {
    it("THE DIRECTOR'S CASE: stone + wood on a fresh life no longer just makes something", () => {
        //  Measured before the fix: `invented — "You work out how it fits: Stone hammer."` with
        //  no ask at all. The gate only fired for plans already HELD, so a first-time pattern —
        //  which is most of the game — went straight to a finished product.
        const s = fresh();
        s.inventory.wood = 10; s.inventory.stone = 10;
        const before = JSON.stringify({ inv: s.inventory, bp: s.blueprints, e: s.energy });
        const asked = tryCombineWith(s, ['wood', 'stone']);
        expect(asked.outcome, 'it built something without asking').toBe('choose');
        expect(JSON.stringify({ inv: s.inventory, bp: s.blueprints, e: s.energy }),
            'being asked spent something').toBe(before);
    });

    it('...and LAW 95 still holds: the question names no product nobody has worked out', () => {
        const s = fresh();
        s.inventory.wood = 10; s.inventory.stone = 10;
        const asked = tryCombineWith(s, ['wood', 'stone']);
        expect(heldMatches(s, ['wood', 'stone']), 'a product was offered by name').toEqual([]);
        expect(asked.reason ?? '').not.toMatch(/hammer|crate|storage|shelter/i);
        //  It names the ATTEMPT instead, which is what makes it an ask rather than a menu.
        expect(asked.reason ?? '').toMatch(/put them together|worked these out/i);
    });

    it('ONE known plan: the attempt is NAMED, and waits', () => {
        const s = fresh();
        s.inventory.wood = 10; s.inventory.sharpblade = 10;
        plan(s, 'spear');
        const asked = tryCombineWith(s, ['wood', 'sharpblade']);
        expect(asked.outcome).toBe('choose');
        expect(asked.reason ?? '').toMatch(/trying to make/i);
        expect(asked.reason ?? '').toMatch(/spear/i);
    });

    it('MORE THAN ONE known plan: every attemptable outcome is named in the list', () => {
        const s = fresh();
        s.inventory.wood = 10; s.inventory.stone = 10;
        plan(s, 'storage');
        plan(s, 'stonehammer');
        const offered = heldMatches(s, ['wood', 'stone']).map((r) => r.id);
        //  The LIST is the answer, not a vague single option that resolves to whatever matched.
        expect(offered).toContain('storage');
        expect(offered).toContain('stonehammer');
        expect(knownMatches(s, ['wood', 'stone']).length).toBeGreaterThanOrEqual(2);
        expect(tryCombineWith(s, ['wood', 'stone']).reason ?? '').toMatch(/which are you making/i);
    });

    it('ONE surface, not two: the same predicate governs every case', () => {
        const none = fresh(); none.inventory.wood = 5; none.inventory.stone = 5;
        const one = fresh(); one.inventory.wood = 5; one.inventory.sharpblade = 5; plan(one, 'spear');
        const many = fresh(); many.inventory.wood = 5; many.inventory.stone = 5;
        plan(many, 'storage'); plan(many, 'stonehammer');
        for (const [label, s, mats] of [
            ['unknown', none, ['wood', 'stone']],
            ['one held', one, ['wood', 'sharpblade']],
            ['two held', many, ['wood', 'stone']],
        ] as Array<[string, GameState, Array<'wood' | 'stone' | 'sharpblade'>]>) {
            expect(needsNaming(s, mats), `${label} did not go through the staging surface`).toBe(true);
            expect(tryCombineWith(s, mats).outcome, `${label} committed without asking`).toBe('choose');
        }
    });

    it('...and confirming still builds the thing, so nothing is walled off', () => {
        const s = fresh();
        s.inventory.wood = 10; s.inventory.stone = 10;
        expect(hasUnknownRival(s, ['wood', 'stone'])).toBe(true);
        const made = makeChosen(s, ['wood', 'stone'], EXPERIMENT_CHOICE);
        expect(made.outcome, 'confirming an experiment was refused').not.toBe('refused');
        expect(made.outcome).not.toBe('choose');
    });
});

// ---------------------------------------------------------------------------
describe('2 — the backpack', () => {
    it('(a) a fresh survivor does NOT have one', () => {
        expect(fresh().tools.backpack).toBe(false);
    });

    it('(c) the FIRST crate always holds one', () => {
        const s = fresh();
        const crate = s.nodes.find((n) => n.kind === 'crashbox');
        expect(crate, 'no crate on the island to open').toBeTruthy();
        //  A crate is an AXE node (`needsAxe: true`), so opening one at all presumes an axe.
        //  Noted rather than changed: it bears on how EARLY this second path really is, and
        //  that is a design question for the director, not this fixture's to answer.
        s.tools.axe = true;
        s.player = { x: crate!.x, y: crate!.y };
        expect(s.tools.backpack).toBe(false);
        const out = gatherNode(s, crate!.id);
        expect(out.ok, `the crate refused: ${out.reason}`).toBe(true);
        expect(out.foundBackpack, 'the first crate held no pack').toBe(true);
        expect(s.tools.backpack, 'the pack did not reach the survivor').toBe(true);
    });

    it('...and a LATER crate does not guarantee it', () => {
        const s = fresh();
        const crates = s.nodes.filter((n) => n.kind === 'crashbox');
        //  Simulate a life in which one crate has already been opened. If the island only ever
        //  holds one crate this still proves the rule: the counter, not the crate, decides.
        s.trace.cratesOpened = 1;
        s.tools.backpack = false;
        s.tools.axe = true;
        const crate = crates[crates.length - 1];
        s.player = { x: crate.x, y: crate.y };
        const out = gatherNode(s, crate.id);
        expect(out.ok).toBe(true);
        expect(out.foundBackpack, 'a later crate handed over a second guaranteed pack').toBe(false);
        expect(s.tools.backpack).toBe(false);
    });

    it('...and the counter is additive, so an older save is not cheated out of its first', () => {
        //  A save written before this field existed merges in at zero, which means its owner's
        //  next crate is still their first — which is the kind thing and the correct thing.
        expect(fresh().trace.cratesOpened).toBe(0);
    });
});

// ---------------------------------------------------------------------------
describe('3 — the coconut shell', () => {
    it('drinking a coconut leaves the shell in hand', () => {
        const s = fresh();
        s.inventory.coconut = 2;
        s.hunger = 40; s.thirst = 40;
        const before = s.inventory.shell;
        expect(eat(s, 'coconut'), 'the coconut could not be drunk').toBe(true);
        expect(s.inventory.coconut, 'the coconut was not consumed').toBe(1);
        expect(s.inventory.shell, 'the shell was lost entirely — the reported defect').toBe(before + 1);
    });

    it('...and every coconut leaves one, not just the first', () => {
        const s = fresh();
        s.inventory.coconut = 3;
        s.hunger = 10; s.thirst = 10;
        for (let i = 0; i < 3; i++) eat(s, 'coconut');
        expect(s.inventory.shell).toBe(3);
    });

    it('...and nothing ELSE leaves a shell behind', () => {
        const s = fresh();
        s.inventory.berries = 2; s.inventory.shellfish = 2;
        s.hunger = 30; s.thirst = 30;
        eat(s, 'berries');
        eat(s, 'shellfish');
        expect(s.inventory.shell, 'a shell came from something that is not a coconut').toBe(0);
    });

    it('...and a fresh survivor starts with none', () => {
        expect(fresh().inventory.shell).toBe(0);
    });
});
