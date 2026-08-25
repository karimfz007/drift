/**
 * WHAT ONE BOX HOLDS — the last unbounded store in the game, given a ceiling.
 *
 * The crate took every carried kind in full and never said no, so a survivor could bank a
 * hundred logs in a box the size of a crate. That is the same shape as the two holes already
 * closed at the other end of the same economy — a cup that refilled past its own brim
 * ([[D-190]]) and a pile whose spoilage clock reset when you added to it — and this is the
 * third and last of them.
 *
 * MEASURED IN BULK, because a crate is a volume and `materialBulk` already answers that
 * question for every material in the game. Counting units instead would price two hundred
 * berries the same as two hundred logs.
 */
import { describe, expect, it } from 'vitest';
import {
    bulkPerUnit,
    createInitialState,
    depositToStorage,
    moveOneKind,
    reconcile,
    storageActionsFor,
    storageCapacityBulk,
    storageFitsFor,
    storageFullBlocker,
    storageRoomBulk,
    storedBulk,
    withdrawFromStorage,
    type GameState,
} from '../src/brain';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;

/** A survivor standing at a built, empty crate. */
function atCrate(): GameState {
    const s = fullBody(createInitialState(NOW));
    s.storage = { built: true, x: s.player.x, y: s.player.y, durability: 100, tier: 'crate', stored: {} };
    return s;
}

describe('THE CRATE HAS A CEILING', () => {
    it('a built crate reports a real, finite capacity', () => {
        const s = atCrate();
        const cap = storageCapacityBulk(s.storage);
        expect(cap).toBeGreaterThan(0);
        expect(Number.isFinite(cap)).toBe(true);
        expect(cap).toBe(TUNE.storageCapacityBulk.crate);
        expect(storedBulk(s.storage)).toBe(0);
        expect(storageRoomBulk(s.storage)).toBe(cap);
    });

    it('DEPOSITING STOPS AT THE BRIM instead of swallowing whatever is offered', () => {
        //  THE DEFECT THIS CLOSES. `depositToStorage` moved `held` in full, unconditionally.
        const s = atCrate();
        const wood = 500;
        s.inventory.wood = wood;
        const out = depositToStorage(s);
        expect(out.ok).toBe(true);
        expect(s.storage.stored.wood, 'the crate swallowed five hundred logs')
            .toBeLessThan(wood);
        expect(storedBulk(s.storage)).toBeLessThanOrEqual(storageCapacityBulk(s.storage));
        //  WHAT DID NOT FIT IS STILL IN THE PACK, not destroyed. A partial deposit is the
        //  honest outcome; a silent loss would be worse than an unlimited box.
        expect((s.inventory.wood ?? 0) + (s.storage.stored.wood ?? 0)).toBe(wood);
    });

    it('...and the per-kind reach stops at the brim too', () => {
        const s = atCrate();
        s.inventory.stone = 1000;
        for (let i = 0; i < 400; i++) moveOneKind(s, 'stone', 'deposit', 5);
        expect(storedBulk(s.storage)).toBeLessThanOrEqual(storageCapacityBulk(s.storage));
        expect((s.inventory.stone ?? 0) + (s.storage.stored.stone ?? 0), 'stone went missing')
            .toBe(1000);
    });

    it('A FULL CRATE REFUSES, AND SAYS SO — never a silent no-op (Law 26)', () => {
        const s = atCrate();
        s.inventory.wood = 500;
        depositToStorage(s);
        expect(storageRoomBulk(s.storage)).toBeLessThan(bulkPerUnit('wood'));

        //  Still holding wood, and the box will not take it: the surface must not offer the act.
        expect(s.inventory.wood).toBeGreaterThan(0);
        expect(storageActionsFor(s).canDeposit, 'a full crate still offered to be filled').toBe(false);
        expect(storageFullBlocker(s)).toMatch(/full/i);
        const again = depositToStorage(s);
        expect(again.ok, 'a full crate accepted another deposit').toBe(false);
    });

    it('...and an unbuilt crate names the crate, not the room in it', () => {
        const s = fullBody(createInitialState(NOW));
        expect(s.storage.built).toBe(false);
        expect(storageFullBlocker(s)).toMatch(/no crate/i);
        expect(storageFitsFor(s.storage, 'wood')).toBe(0);
    });

    it('TAKING SOMETHING OUT MAKES ROOM AGAIN', () => {
        const s = atCrate();
        s.inventory.wood = 500;
        depositToStorage(s);
        const full = storageRoomBulk(s.storage);
        withdrawFromStorage(s);
        expect(storageRoomBulk(s.storage), 'emptying the box freed no room').toBeGreaterThan(full);
        expect(storageActionsFor(s).canDeposit).toBe(true);
    });

    it('BULK IS THE UNIT, so a crate of berries is not a crate of logs', () => {
        //  The reason for measuring volume rather than counting things: 4 bulk a log against
        //  0.4 a handful of berries is a tenfold difference in what a box will hold, and a
        //  unit count would have said they were the same.
        const s = atCrate();
        expect(storageFitsFor(s.storage, 'berries'))
            .toBeGreaterThan(storageFitsFor(s.storage, 'wood'));
        expect(storageFitsFor(s.storage, 'wood'))
            .toBe(Math.floor(storageCapacityBulk(s.storage) / TUNE.materialBulk.wood));
    });

    it('NOTHING IS FREE — a kind declared at zero bulk still takes room', () => {
        //  `materialBulk.stonehammer` is 0 on purpose ("not to add a second count"), which was
        //  harmless while bulk was a readout and becomes an unlimited store the moment bulk is
        //  a ceiling. `bulkPerUnit` floors it, so a crate cannot hold infinitely many.
        expect(TUNE.materialBulk.stonehammer, 'the premise of this check has changed').toBe(0);
        expect(bulkPerUnit('stonehammer')).toBeGreaterThan(0);

        const s = atCrate();
        s.inventory.stonehammer = 100_000;
        depositToStorage(s);
        expect(s.storage.stored.stonehammer, 'the crate took a hundred thousand hammers')
            .toBeLessThan(100_000);
        expect(storedBulk(s.storage)).toBeLessThanOrEqual(storageCapacityBulk(s.storage));
    });

    it('EVERY STORABLE KIND HAS A REAL FOOTPRINT, checked as a property', () => {
        const s = atCrate();
        for (const kind of Object.keys(TUNE.materialBulk) as Array<keyof typeof TUNE.materialBulk>) {
            expect(bulkPerUnit(kind), `${kind} is free to store`).toBeGreaterThan(0);
            expect(storageFitsFor(s.storage, kind), `${kind} fits infinitely`)
                .toBeLessThan(Number.POSITIVE_INFINITY);
        }
    });

    it('THE CAPACITY IS A QUESTION ASKED OF A BOX, which is the seam upgrades land on', () => {
        //  Nothing about upgrades is built in this pass. What is built is that no call site
        //  reads a global: every one asks THIS container what it holds, so a later tier is a
        //  row in `storageCapacityBulk` and nothing here has to change.
        const s = atCrate();
        expect(s.storage.tier).toBe('crate');
        expect(storageCapacityBulk(s.storage)).toBe(TUNE.storageCapacityBulk[s.storage.tier]);
        //  ...and the figure is per-tier rather than a bare number, so adding one is additive.
        expect(Object.keys(TUNE.storageCapacityBulk)).toContain('crate');
    });

    it('A SENSIBLE BASE STOCK FITS — the ceiling is invisible until you hoard', () => {
        //  The number has to be defensible from play, not just from arithmetic: a survivor
        //  living out of the box should never meet it. This is a realistic mid-game cache.
        const s = atCrate();
        s.inventory.wood = 25;
        s.inventory.stone = 30;
        s.inventory.fiber = 20;
        s.inventory.coconut = 10;
        s.inventory.berries = 20;
        const out = depositToStorage(s);
        expect(out.ok).toBe(true);
        for (const kind of ['wood', 'stone', 'fiber', 'coconut', 'berries'] as const) {
            expect(s.inventory[kind], `${kind} did not fit in a normal base stock`).toBe(0);
        }
        expect(storageRoomBulk(s.storage), 'a normal base stock left no headroom at all')
            .toBeGreaterThan(0);
    });

    it('D-011 — an absence neither fills nor empties the box', () => {
        const s = atCrate();
        s.inventory.wood = 20;
        depositToStorage(s);
        //  THE CONTENTS, not the whole box. A crate WEATHERS over an absence — `reconcile`
        //  runs `structureDurabilityMax` down for every built structure, which is long-standing
        //  and deliberate and is not what this item governs. What must not move is what is IN
        //  it: an absence may neither fill the box nor empty it, and may not change what it
        //  will hold. Asserting the whole object caught the weathering and said nothing useful.
        const before = JSON.stringify({ stored: s.storage.stored, tier: s.storage.tier });
        //  `reconcile` has no storage term at all; this asserts nobody has added one.
        for (const hours of [1, 24, 24 * 365]) {
            const { state: later } = reconcile(s, hours * 3600);
            expect(JSON.stringify({ stored: later.storage.stored, tier: later.storage.tier }),
                `${hours}h away changed what the crate holds`).toBe(before);
            expect(storageCapacityBulk(later.storage), `${hours}h away changed what it CAN hold`)
                .toBe(storageCapacityBulk(s.storage));
        }
    });
});
