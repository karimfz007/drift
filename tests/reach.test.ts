/**
 * THE REACH — combining from what you hold AND from a box that is open in front of you.
 *
 * The scope is the whole design: an OPEN container extends what a combine can draw on, and
 * nothing else does. Walking away closes it and the reach shrinks back to what is carried.
 *
 * ...and PLACED outcomes: shelter and storage go in the world rather than in your hands, so
 * choosing one from the slate is a different commit from choosing a spear.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/brain';
import {
    COMBINE_ALWAYS_SUCCEEDS, canExperimentWith, combineSlate, discoverWith, isPlaced,
    drawIntoHands, makeChosen, matchPool, placedCost, reachFor, spendFromReach,
} from '../src/brain/experiment';
import { buildShelter, buildStorage } from '../src/brain/state';

const fresh = (): GameState => {
    const s = createInitialState(1_770_000_000_000);
    s.energy = 100; s.hunger = 100; s.thirst = 100;
    return s;
};
const demonstrate = (s: GameState, id: string) => {
    s.blueprints.push({
        recipeId: id, name: id, version: 1, discoveredAtGameHours: 0, workmanship: 'serviceable',
    } as GameState['blueprints'][number]);
};
/** Nothing in hand, everything in the box, and the box built. */
const boxOnly = (): GameState => {
    const s = fresh();
    s.storage.built = true;
    s.inventory.wood = 0; s.inventory.stone = 0; s.inventory.fiber = 0; s.inventory.sharpblade = 0;
    Object.assign(s.storage.stored, { wood: 9, stone: 9 });
    return s;
};

describe('the reach: held, plus an OPEN box', () => {
    it('closed, the reach is exactly what is carried', () => {
        const s = boxOnly();
        const closed = reachFor(s, false);
        expect(closed.withStorage).toBe(false);
        expect(closed.counts.wood ?? 0, 'a closed box was reachable').toBe(0);
    });

    it('open, the box adds to what is carried rather than replacing it', () => {
        const s = boxOnly();
        s.inventory.wood = 2;
        const open = reachFor(s, true);
        expect(open.withStorage).toBe(true);
        expect(open.counts.wood).toBe(11);
        expect(open.counts.stone).toBe(9);
    });

    it('...and a box that was never built is not a box', () => {
        const s = boxOnly();
        s.storage.built = false;
        expect(reachFor(s, true).withStorage, 'an unbuilt crate was reachable').toBe(false);
        expect(reachFor(s, true).counts.wood ?? 0).toBe(0);
    });

    it('the GATE refuses empty hands with the box shut, and allows it open', () => {
        const s = boxOnly();
        expect(canExperimentWith(s, ['wood', 'stone'], false)).toBeTruthy();
        expect(canExperimentWith(s, ['wood', 'stone'], true)).toBeNull();
    });

    it('...and its refusal SAYS which world the survivor is in', () => {
        const s = boxOnly();
        s.storage.stored.wood = 0;
        //  Open, short of wood: the sentence must not tell them to look in their hands only.
        expect(canExperimentWith(s, ['wood', 'stone'], true)).toMatch(/in the box/i);
        expect(canExperimentWith(s, ['wood', 'stone'], false)).toMatch(/in hand/i);
    });

    it('SPENDING takes from the hands FIRST, then the box', () => {
        const s = boxOnly();
        s.inventory.wood = 1;
        expect(spendFromReach(s, 'wood', true)).toBe(true);
        expect(s.inventory.wood, 'the box was raided while a hand was full').toBe(0);
        expect(s.storage.stored.wood).toBe(9);
        //  Hands empty now — the next one comes out of the box.
        expect(spendFromReach(s, 'wood', true)).toBe(true);
        expect(s.storage.stored.wood).toBe(8);
    });

    it('...and never from a closed box, however empty the hands are', () => {
        const s = boxOnly();
        expect(spendFromReach(s, 'wood', false)).toBe(false);
        expect(s.storage.stored.wood, 'a closed box was spent from').toBe(9);
    });

    it('A WHOLE COMBINE from the box alone works, and charges the box', () => {
        const s = boxOnly();
        demonstrate(s, 'storage');
        const before = s.storage.stored.wood;
        const r = makeChosen(s, ['wood', 'stone'], 'storage', true);
        expect(r.outcome, r.reason ?? '').toBe('invented');
        expect(s.storage.stored.wood, 'the box was not charged').toBe((before ?? 0) - 1);
        expect(s.inventory.wood, 'empty hands went negative').toBe(0);
    });

    it('...and the same combine with the box shut is refused, spending nothing', () => {
        const s = boxOnly();
        demonstrate(s, 'storage');
        const r = makeChosen(s, ['wood', 'stone'], 'storage', false);
        expect(r.ok).toBe(false);
        expect(s.storage.stored.wood, 'a refusal charged the box').toBe(9);
    });

    it('DISCOVER reaches into the box too', () => {
        const s = boxOnly();
        const r = discoverWith(s, ['wood', 'stone'], true);
        expect(r.outcome, r.reason ?? '').toBe('invented');
        expect(s.blueprints.length).toBe(1);
    });

    it('the SLATE is unchanged by the reach — it is about kinds, not counts', () => {
        //  Worth pinning: the slate reads `matchPool`, which never asked how much of anything
        //  there was. Storage widens what can be STAGED, never what a pile could become.
        const s = boxOnly();
        expect(combineSlate(s, ['wood', 'stone']).unknownCount)
            .toBe(matchPool(['wood', 'stone']).length);
    });

    it('LAW 95 still holds with the box open', () => {
        const s = boxOnly();
        const slate = combineSlate(s, ['wood', 'stone']);
        expect(slate.known).toEqual([]);
        expect(Object.keys(slate).sort()).toEqual(['known', 'unknownCount']);
        expect(JSON.stringify(slate)).not.toMatch(/storage|crate|hammer/i);
    });

    it('D-011 — none of this is reachable while the game is closed', () => {
        //  The reach is computed per combine from live state and stored nowhere; there is no
        //  field for an absence path to advance. Asserted as a shape claim: the reach must not
        //  have leaked into the save.
        const s = boxOnly();
        expect('reach' in s).toBe(false);
        expect('combineReach' in s).toBe(false);
    });
});

describe('placed outcomes are a different kind of commit', () => {
    it('shelter and storage are PLACED; hand-held things are not', () => {
        expect(isPlaced('shelter')).toBe(true);
        expect(isPlaced('storage')).toBe(true);
        for (const id of ['torch', 'axe', 'spear', 'backpack', 'stonehammer', 'raft', 'net', 'fishingline']) {
            expect(isPlaced(id), `${id} was treated as placed`).toBe(false);
        }
    });

    it('...and they are ordinary slate entries, named once earned', () => {
        const s = fresh();
        s.inventory.wood = 20; s.inventory.stone = 20; s.inventory.fiber = 20;
        demonstrate(s, 'shelter');
        const slate = combineSlate(s, ['wood', 'stone', 'fiber']);
        expect(slate.known.map((k) => k.recipeId)).toContain('shelter');
        expect(slate.known.find((k) => k.recipeId === 'shelter')!.name).not.toBe('shelter');
    });

    it('...and unearned they are anonymous, exactly like everything else', () => {
        const s = fresh();
        s.inventory.wood = 20; s.inventory.stone = 20; s.inventory.fiber = 20;
        const slate = combineSlate(s, ['wood', 'stone', 'fiber']);
        expect(slate.known).toEqual([]);
        expect(JSON.stringify(slate)).not.toMatch(/shelter|storage/i);
    });

    it('TEMPORARY — the guaranteed success covers the storage-fed path too', () => {
        expect(COMBINE_ALWAYS_SUCCEEDS).toBe(true);
        for (let i = 0; i < 20; i++) {
            const s = boxOnly();
            expect(discoverWith(s, ['wood', 'stone'], true).outcome).toBe('invented');
        }
    });
});

describe('what a placed outcome costs is what the builder charges', () => {
    it('storage — placedCost agrees with buildStorage to the unit', () => {
        const s = fresh();
        s.inventory.wood = 40; s.inventory.stone = 40;
        const before = { wood: s.inventory.wood, stone: s.inventory.stone };
        expect(buildStorage(s, 0, 96)).toBe(true);
        for (const { kind, amount } of placedCost('storage')) {
            expect(before[kind as 'wood'] - (s.inventory[kind] ?? 0),
                `placedCost says ${amount} of ${kind}, the builder took something else`).toBe(amount);
        }
    });

    it('shelter — the same, for all three materials', () => {
        const s = fresh();
        s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
        const before = { wood: s.inventory.wood, stone: s.inventory.stone, fiber: s.inventory.fiber };
        expect(buildShelter(s, 0, 96)).toBe(true);
        for (const { kind, amount } of placedCost('shelter')) {
            expect(before[kind as 'wood'] - (s.inventory[kind] ?? 0),
                `placedCost says ${amount} of ${kind}, the builder took something else`).toBe(amount);
        }
    });

    it('...and a hand-held outcome has no placed cost at all', () => {
        for (const id of ['axe', 'spear', 'torch', 'net']) expect(placedCost(id)).toEqual([]);
    });

    it('DRAWING from the box tops the hands up to exactly what is needed, no more', () => {
        const s = boxOnly();
        expect(drawIntoHands(s, 'wood', 5, true)).toBe(true);
        expect(s.inventory.wood, 'the hands were over-filled').toBe(5);
        expect(s.storage.stored.wood).toBe(4);
    });

    it('...and reports honestly when the box cannot cover it', () => {
        const s = boxOnly();
        s.storage.stored.wood = 2;
        expect(drawIntoHands(s, 'wood', 5, true)).toBe(false);
        //  What it could move, it moved — the caller refuses and nothing irreversible happened.
        expect(s.inventory.wood).toBe(2);
        expect(s.storage.stored.wood).toBe(0);
    });

    it('...and never touches the box when it is shut', () => {
        const s = boxOnly();
        expect(drawIntoHands(s, 'wood', 5, false)).toBe(false);
        expect(s.storage.stored.wood).toBe(9);
        expect(s.inventory.wood).toBe(0);
    });
});
