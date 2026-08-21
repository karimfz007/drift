/**
 * THIRTEEN ITEMS — the ones with a brain-side claim. Three were REPEAT reports on work
 * previously called fixed, so each of those asserts the thing that was actually wrong.
 */
import { describe, expect, it } from 'vitest';
import {
    createInitialState, buildStorage, depositToStorage, withdrawFromStorage, storageActionsFor,
} from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

const NOW = 1_770_000_000_000;
function boxed(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    //  Built through the real builder, stocked first — a crate that never went up would make
    //  every assertion below pass for the wrong reason (`storageActionsFor` short-circuits on
    //  `!built`), which is exactly how the first draft of this file went green-adjacent.
    s.inventory.wood = 40; s.inventory.stone = 40;
    expect(buildStorage(s, 0, 0), 'the crate refused a stocked survivor').toBe(true);
    s.inventory.wood = 0; s.inventory.stone = 0;
    return s;
}

describe('ITEM 11 — the box gives without being fed first', () => {
    it('a survivor with FULL HANDS can still take from a full box', () => {
        //  THE REPEAT REPORT, and the previous pass fixed WHAT the box may hold rather than
        //  HOW it is used. `useStorage` inferred its mode: carrying anything took the deposit
        //  branch, so withdrawal was reachable only with completely empty hands — you had to
        //  surrender everything you carried to get anything back.
        const s = boxed();
        s.storage.stored = { wood: 9 };
        s.inventory.stone = 3;

        const acts = storageActionsFor(s);
        expect(acts.canDeposit, 'holding stone, depositing should be possible').toBe(true);
        expect(acts.canWithdraw, 'a full box offered nothing to a survivor with full hands').toBe(true);

        const took = withdrawFromStorage(s);
        expect(took.ok).toBe(true);
        expect(s.inventory.wood, 'nothing came out of the box').toBeGreaterThan(0);
        expect(s.inventory.stone, 'taking silently dumped what was being carried').toBe(3);
    });

    it('...and the two acts are independent, in either order', () => {
        const s = boxed();
        s.storage.stored = { fiber: 4 };
        s.inventory.berries = 2;
        withdrawFromStorage(s);
        expect(s.inventory.fiber).toBeGreaterThan(0);
        expect(s.inventory.berries).toBe(2);
        depositToStorage(s);
        expect(s.inventory.berries, 'depositing after taking did nothing').toBe(0);
        expect(s.storage.stored.berries).toBe(2);
    });

    it('WIDENING THE BOX AMPLIFIED THIS — a single berry used to force the deposit branch', () => {
        //  Recorded against my own previous pass: while STORABLE_KEYS was wood/stone/fibre,
        //  three kinds forced deposit-mode; once it became every carried kind, ANY item did.
        const s = boxed();
        s.storage.stored = { wood: 5 };
        s.inventory.berries = 1;
        expect(storageActionsFor(s).canWithdraw,
            'one berry in hand still hid the whole box').toBe(true);
    });
});

describe('ITEM 12 — the batch is deliberate, and it is not a cap on the box', () => {
    it('the box HOLDS any amount; one reach brings out a batch per kind', () => {
        const s = boxed();
        s.storage.stored = { wood: 40 };
        expect(s.storage.stored.wood, 'the box refused to hold more than a batch').toBe(40);

        withdrawFromStorage(s);
        expect(s.inventory.wood).toBe(TUNE.storageWithdrawBatch);
        expect(s.storage.stored.wood).toBe(40 - TUNE.storageWithdrawBatch);

        //  ...and reaching again brings out another batch, so nothing is stranded.
        withdrawFromStorage(s);
        expect(s.inventory.wood).toBe(TUNE.storageWithdrawBatch * 2);
    });

    it('depositing is NOT batched — it is all-or-nothing, and that asymmetry is the real story', () => {
        const s = boxed();
        s.inventory.stone = 37;
        depositToStorage(s);
        expect(s.storage.stored.stone, 'the deposit was batched too').toBe(37);
        expect(s.inventory.stone).toBe(0);
    });
});
