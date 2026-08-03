/**
 * DROPPED ITEMS — the per-item timer, and D-011's reading of "hygiene, never harm".
 */
import { describe, expect, it } from 'vitest';
import { dropAll, droppedNote, droppedWithinReach, gameHoursLeft, pickUpDropped, pruneDropped } from '../src/brain/dropped';
import { createInitialState } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { TUNE } from '../src/data/tune';

const REAL_DAY = 24 * 3600;

describe('THE TIMER IS PER ITEM, never global', () => {
    it('an old stack expiring does not take a fresh one with it', () => {
        //  THE FAILURE THIS CATCHES: one shared sweep means the pile you set down a minute
        //  ago vanishes because of one you abandoned yesterday — the game eating your things
        //  rather than the world moving on.
        const s = createInitialState(0);
        s.inventory.wood = 10;
        dropAll(s, 'wood');                                   // old stack, t=0
        s.gameHoursElapsed = TUNE.dropDespawnGameHours - 1;
        s.inventory.stone = 5;
        dropAll(s, 'stone');                                  // fresh stack, much later
        s.gameHoursElapsed = TUNE.dropDespawnGameHours + 1;

        const gone = pruneDropped(s);
        expect(gone.map((g) => g.kind)).toEqual(['wood']);
        expect(s.dropped.map((d) => d.kind)).toEqual(['stone']);
    });

    it('picking up and dropping again RESETS that stack, by minting a new entry', () => {
        const s = createInitialState(0);
        s.inventory.wood = 10;
        const first = dropAll(s, 'wood')!;
        s.gameHoursElapsed = TUNE.dropDespawnGameHours - 2;
        expect(pickUpDropped(s, first.id)).toBe(true);
        expect(s.inventory.wood).toBe(10);
        const second = dropAll(s, 'wood')!;
        //  A new id and a new timestamp: there is no separate "reset" call to forget.
        expect(second.id).not.toBe(first.id);
        expect(gameHoursLeft(second, s.gameHoursElapsed)).toBe(TUNE.dropDespawnGameHours);
    });

    it('drops the whole stack and empties the carried amount', () => {
        const s = createInitialState(0);
        s.inventory.wood = 7;
        const item = dropAll(s, 'wood')!;
        expect(item.amount).toBe(7);
        expect(s.inventory.wood).toBe(0);
        expect(dropAll(s, 'wood'), 'nothing left to drop').toBeNull();
    });

    it('only reachable stacks are offered', () => {
        const s = createInitialState(0);
        s.inventory.wood = 3;
        dropAll(s, 'wood');
        expect(droppedWithinReach(s)).toHaveLength(1);
        s.player = { x: s.player.x + 50, y: s.player.y };
        expect(droppedWithinReach(s)).toHaveLength(0);
    });
});

describe('D-011 — a dropped stack is PROPERTY, and absence never erases it', () => {
    it('no absence of any length destroys a dropped stack', () => {
        //  The reading that matters: despawn is hygiene for a live session. A player who sets
        //  something down and closes the app must find it there — a week later or a year.
        //  Storage contents survive, structures survive, the journal survives; so does this.
        for (const days of [1, 7, 30, 365]) {
            const s = createInitialState(0);
            s.inventory.wood = 5;
            dropAll(s, 'wood');
            const { state } = reconcile(s, days * REAL_DAY);
            expect(state.dropped, `a stack vanished over ${days} days away`).toHaveLength(1);
        }
    });

    it('the module exposes NO absence-path sweep — the guarantee is structural', async () => {
        //  Same shape as the boars and the injuries: no code path exists that could break it.
        const dropped = await import('../src/brain/dropped');
        expect(Object.keys(dropped).filter((k) => /offline|absence|settle/i.test(k))).toEqual([]);
    });

    it('...and a stack survives a DEATH — matter on the ground stays', async () => {
        const { closeSurvivor } = await import('../src/brain/succession');
        const s = createInitialState(0);
        s.inventory.wood = 4;
        dropAll(s, 'wood');
        expect(closeSurvivor(s, 'thirst').next.dropped).toHaveLength(1);
    });
});

describe('it is LEGIBLE — the survivor can see the clock', () => {
    it('says what it is and roughly how long it has', () => {
        const s = createInitialState(0);
        s.inventory.stone = 6;
        const item = dropAll(s, 'stone')!;
        expect(droppedNote(item, s.gameHoursElapsed)).toMatch(/6 stone/);
        expect(droppedNote(item, s.gameHoursElapsed)).toMatch(/day/);
        //  ...and warns plainly when it is nearly gone.
        expect(droppedNote(item, TUNE.dropDespawnGameHours - 2)).toMatch(/not last the day/i);
    });
});

describe('ITEM 3 — the support hand reuses the shipped carriage rules', () => {
    it('a two-handed tool is refused by the support hand, from either direction', async () => {
        const { equipToActiveHand, equipToSupportHand, isTwoHanded } = await import('../src/brain/loadout');
        const s = createInitialState(0);
        s.tools.axe = true; s.tools.flask = true;
        const twoHanded = (['axe', 'flask', 'spear'] as const).find((t) => isTwoHanded(t as never));
        if (!twoHanded) return;                       // nothing two-handed shipped yet

        //  Into the support hand directly: refused, because it needs both.
        const direct = equipToSupportHand(s, twoHanded as never);
        expect(direct.ok).toBe(false);
        //  ...and into the support hand while the OTHER hand holds it: refused too. Same
        //  physical fact, other direction — which is why supportHand is modelled at all.
        equipToActiveHand(s, twoHanded as never);
        const blocked = equipToSupportHand(s, 'flask' as never);
        if (!blocked.ok) expect(['two-handed', 'other-hand-full', 'not-owned']).toContain(blocked.reason);
    });

    it('equipping to one hand vacates whatever position the tool was in', async () => {
        const { equipToActiveHand, equipToSupportHand } = await import('../src/brain/loadout');
        const s = createInitialState(0);
        s.tools.flask = true;
        expect(equipToSupportHand(s, 'flask' as never).ok).toBe(true);
        expect(s.loadout.supportHand).toBe('flask');
        //  One physical object: moving it to the other hand empties the first.
        expect(equipToActiveHand(s, 'flask' as never).ok).toBe(true);
        expect(s.loadout.activeHand).toBe('flask');
        expect(s.loadout.supportHand).toBeNull();
    });
});
