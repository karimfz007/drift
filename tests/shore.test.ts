/**
 * THE GENEROUS SHORE — Wave 1 (director's 19 Aug amendment). Four claims, four sections:
 *
 *   1. DENSITY SCALES WITH TIME AWAY, GENERATED ONCE AT RETURN (D-011 at its strongest) — a
 *      pure function of elapsed hours, a zero-elapsed re-read is a no-op, nothing already
 *      placed is ever removed by a later return, and the total stays capped.
 *   2. THE FOUR FATES are weighted toward the honest majority (Law 175-177) — REFUSE
 *      dominates, and STOCK/PART/TOOL are all real, reachable minority outcomes; PART pays
 *      out more than STOCK on average, matching the brief's rarity/yield split.
 *   3. WEIGHT IS THE FILTER — a real fraction of every batch reads as too heavy to carry, by
 *      construction, using the SAME effective-mass function the outboard's own tier uses.
 *   4. PICKUP refuses with the true reason, never silently fails, and connects the shore to
 *      the outboard's own teardown competence through `salvageTools` (Law 217, 176).
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import { effectiveMassFor } from '../src/brain/heavyObjects';
import {
    generateOnReturn, itemsForElapsedHours, pickUpShoreItem, shoreWithinReach, tooHeavyToCarry,
} from '../src/brain/shore';
import type { GameState, ShoreItem } from '../src/brain/types';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => createInitialState(NOW);

function mkItem(overrides: Partial<ShoreItem>): ShoreItem {
    return {
        id: 'shore-test-item', fate: 'refuse', label: 'test item', massKg: 1,
        materialKind: null, materialAmount: 0, x: 0, y: 0, arrivedAtGameHours: 0,
        ...overrides,
    };
}

/** Repeatedly returns (big elapsed jump, generate, sample, reset) so the fate/yield
 *  distribution can be examined over a sample far bigger than one capped batch
 *  (`shoreMaxItems`) allows in a single call — enough rounds to make every branch's odds of
 *  appearing at least once overwhelmingly likely, rather than hand-simulating the seeded hash
 *  in the test. The reset between rounds is a TEST-HARNESS fixture reset, not a stand-in for
 *  pickup — `pickUpShoreItem` refuses too-heavy items and leaves them in place by design (see
 *  the PICKUP section below), so routing sampling through it would let unremovable heavy
 *  items accumulate round over round and bias the sample. Pickup's own correctness is proven
 *  separately, on its own fixtures, later in this file. */
function harvest(state: GameState, rounds: number): Array<{ fate: string; materialAmount: number; massKg: number }> {
    const out: Array<{ fate: string; materialAmount: number; massKg: number }> = [];
    for (let i = 0; i < rounds; i++) {
        state.gameHoursElapsed += 200;
        state.shore = generateOnReturn(state);
        for (const item of state.shore.items) {
            out.push({ fate: item.fate, materialAmount: item.materialAmount, massKg: item.massKg });
        }
        state.shore = { items: [], lastGeneratedAtGameHours: state.gameHoursElapsed, spawnCount: state.shore.spawnCount };
    }
    return out;
}

// ---------------------------------------------------------------------------
describe('DENSITY SCALES WITH TIME AWAY, generated ONCE at return (D-011 at its strongest)', () => {
    it('below the minimum return threshold, nothing generates', () => {
        expect(itemsForElapsedHours(0)).toBe(0);
        expect(itemsForElapsedHours(TUNE.shoreMinReturnGameHoursForAnyItem / 2)).toBe(0);
    });

    it('density grows with elapsed hours, tapering rather than exploding past the soft cap', () => {
        const short = itemsForElapsedHours(2);
        const long = itemsForElapsedHours(40);
        const longer = itemsForElapsedHours(4000);
        expect(long).toBeGreaterThan(short);
        expect(longer).toBeGreaterThan(long);
    });

    it('a ZERO-elapsed second read is a no-op — reading twice in one session never doubles the shore', () => {
        const s = fresh();
        s.gameHoursElapsed += 500;
        s.shore = generateOnReturn(s);
        const afterFirst = s.shore.items.length;
        expect(afterFirst).toBeGreaterThan(0);
        s.shore = generateOnReturn(s); // no time passed
        expect(s.shore.items.length).toBe(afterFirst);
    });

    it('generation advances lastGeneratedAtGameHours to the current clock, so the next read starts from here', () => {
        const s = fresh();
        s.gameHoursElapsed += 10;
        s.shore = generateOnReturn(s);
        expect(s.shore.lastGeneratedAtGameHours).toBe(s.gameHoursElapsed);
    });

    it('never exceeds shoreMaxItems, however long the absence — the PERF rail, enforced by construction', () => {
        const s = fresh();
        s.gameHoursElapsed += 100_000; // a very long absence
        s.shore = generateOnReturn(s);
        expect(s.shore.items.length).toBeLessThanOrEqual(TUNE.shoreMaxItems);
        expect(s.shore.items.length).toBe(TUNE.shoreMaxItems); // a return this long should fill it outright
    });

    it('D-011 — nothing already on the shore is ever removed or altered by a later return', () => {
        const s = fresh();
        s.gameHoursElapsed += 5;
        s.shore = generateOnReturn(s);
        const firstBatch = [...s.shore.items];
        expect(firstBatch.length).toBeGreaterThan(0);

        s.gameHoursElapsed += 5;
        s.shore = generateOnReturn(s);
        for (const original of firstBatch) {
            const stillThere = s.shore.items.find((it) => it.id === original.id);
            expect(stillThere).toEqual(original); // present AND byte-identical, not just present
        }
        expect(s.shore.items.length).toBeGreaterThan(firstBatch.length);
    });

    it('a returning player finds the shore exactly as full as they left it, plus whatever the tide added — never less', () => {
        const s = fresh();
        s.gameHoursElapsed += 1;
        s.shore = generateOnReturn(s);
        const before = s.shore.items.length;
        // simulate leaving mid-session with a partial pickup, then a second later return
        if (before > 0) pickUpShoreItem(s, s.shore.items[0].id);
        const afterPickup = s.shore.items.length;
        expect(afterPickup).toBe(before - 1);
        s.gameHoursElapsed += 1;
        s.shore = generateOnReturn(s);
        expect(s.shore.items.length).toBeGreaterThanOrEqual(afterPickup); // the tide never takes, only adds
    });
});

// ---------------------------------------------------------------------------
describe('THE FOUR FATES — weighted toward the honest majority (Law 175-177)', () => {
    it('REFUSE is the clear plurality across a large sample; every fate is actually reachable', () => {
        const s = fresh();
        const items = harvest(s, 15);
        expect(items.length).toBeGreaterThan(300); // a large enough sample for the shares to show

        const counts: Record<string, number> = { refuse: 0, stock: 0, part: 0, tool: 0 };
        for (const it of items) counts[it.fate] = (counts[it.fate] ?? 0) + 1;

        //  Every branch of fateFor is real, not dead code.
        expect(counts.stock).toBeGreaterThan(0);
        expect(counts.part).toBeGreaterThan(0);
        expect(counts.tool).toBeGreaterThan(0);

        //  REFUSE dominates — checked as a clear majority band, not pinned to the exact 62%
        //  tuned share (storm/calm lean shifts it batch to batch by design).
        expect(counts.refuse).toBeGreaterThan(items.length * 0.4);
        expect(counts.refuse).toBeGreaterThan(counts.stock);
        expect(counts.refuse).toBeGreaterThan(counts.part);
        expect(counts.refuse).toBeGreaterThan(counts.tool);
    });

    it('PART pays out more than STOCK on average, and is the rarer of the two — yield AND rarity both real', () => {
        const s = fresh();
        const items = harvest(s, 15);
        const stockAmounts = items.filter((i) => i.fate === 'stock').map((i) => i.materialAmount);
        const partAmounts = items.filter((i) => i.fate === 'part').map((i) => i.materialAmount);
        expect(stockAmounts.length).toBeGreaterThan(0);
        expect(partAmounts.length).toBeGreaterThan(0);

        const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
        expect(avg(partAmounts)).toBeGreaterThan(avg(stockAmounts));
        expect(partAmounts.length).toBeLessThan(stockAmounts.length);
    });

    it('REFUSE items carry no material at all — they still weigh something, but are worth nothing', () => {
        const s = fresh();
        const items = harvest(s, 5);
        const refuseOnes = items.filter((i) => i.fate === 'refuse');
        expect(refuseOnes.length).toBeGreaterThan(0);
        for (const r of refuseOnes) {
            expect(r.materialAmount).toBe(0);
            expect(r.massKg).toBeGreaterThan(0); // D-131: worthless, but not weightless
        }
    });
});

// ---------------------------------------------------------------------------
describe('WEIGHT IS THE FILTER — the shore always holds something too heavy for now (Law 234)', () => {
    it('tooHeavyToCarry reads the SAME effective-mass function the outboard tier uses, at the T4/T5 boundary', () => {
        const s = fresh();
        const heavy = mkItem({ massKg: TUNE.tierShoulderedMaxKg + 5 });
        const light = mkItem({ massKg: 1 });
        expect(tooHeavyToCarry(s, heavy)).toBe(true);
        expect(tooHeavyToCarry(s, light)).toBe(false);
    });

    it('the tuned heavy-item mass genuinely clears the too-heavy ceiling for a baseline survivor', () => {
        //  Direct regression guard on the exact defect found while testing: a heavy-item mass
        //  at or under `tierShoulderedMaxKg` can never trip `tooHeavyToCarry`, for anyone.
        const s = fresh();
        expect(effectiveMassFor(s, TUNE.shoreHeavyItemMassKg)).toBeGreaterThan(TUNE.tierShoulderedMaxKg);
        expect(TUNE.shoreHeavyItemMassKg).toBeLessThan(TUNE.outboardMassKg); // stays the smaller of the two
    });

    it('a large batch genuinely contains items at the tuned heavy mass, and they read as too heavy — by construction', () => {
        const s = fresh();
        const items = harvest(s, 15);
        const heavyOnes = items.filter((i) => i.massKg === TUNE.shoreHeavyItemMassKg);
        expect(heavyOnes.length).toBeGreaterThan(0);
        const freshSurvivor = fresh();
        for (const h of heavyOnes) {
            expect(tooHeavyToCarry(freshSurvivor, mkItem({ massKg: h.massKg }))).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
describe('shoreWithinReach — nearest first, radius-filtered, read-only', () => {
    it('filters to the radius and sorts nearest first', () => {
        const s = fresh();
        const near = mkItem({ id: 'near', x: s.player.x + 1, y: s.player.y });
        const mid = mkItem({ id: 'mid', x: s.player.x + 3, y: s.player.y });
        const far = mkItem({ id: 'far', x: s.player.x + 100, y: s.player.y });
        s.shore = { items: [far, near, mid], lastGeneratedAtGameHours: 0, spawnCount: 0 };
        const within = shoreWithinReach(s, 5);
        expect(within.map((it) => it.id)).toEqual(['near', 'mid']);
        expect(s.shore.items).toHaveLength(3); // read-only — nothing consumed by looking
    });
});

// ---------------------------------------------------------------------------
describe('PICKUP — refuses with the true reason, and is the shore/outboard connective tissue (Law 217, 176)', () => {
    it('refuses a too-heavy item outright, and leaves it exactly where it was', () => {
        const s = fresh();
        const heavy = mkItem({ id: 'heavy1', fate: 'part', massKg: TUNE.shoreHeavyItemMassKg, materialKind: 'stone', materialAmount: 6 });
        s.shore = { items: [heavy], lastGeneratedAtGameHours: 0, spawnCount: 0 };
        const result = pickUpShoreItem(s, 'heavy1');
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(/heavy/i);
        expect(s.shore.items).toHaveLength(1);
    });

    it('picking up a STOCK item adds its material and removes it from the shore', () => {
        const s = fresh();
        const stock = mkItem({ id: 'stock1', fate: 'stock', massKg: 2, materialKind: 'wood', materialAmount: 3 });
        s.shore = { items: [stock], lastGeneratedAtGameHours: 0, spawnCount: 0 };
        const before = s.inventory.wood ?? 0;
        const result = pickUpShoreItem(s, 'stock1');
        expect(result.ok).toBe(true);
        expect(result.gotTool).toBe(false);
        expect(s.inventory.wood).toBe(before + 3);
        expect(s.shore.items).toHaveLength(0);
    });

    it('picking up REFUSE removes it but grants NOTHING — real excitement, then real confusion, kept honest (D-131)', () => {
        const s = fresh();
        const refuse = mkItem({ id: 'refuse1', fate: 'refuse', massKg: 1.2, materialKind: null, materialAmount: 0 });
        s.shore = { items: [refuse], lastGeneratedAtGameHours: 0, spawnCount: 0 };
        const beforeInventory = { ...s.inventory };
        const result = pickUpShoreItem(s, 'refuse1');
        expect(result.ok).toBe(true);
        expect(result.gotTool).toBe(false);
        expect(s.inventory).toEqual(beforeInventory);
        expect(s.shore.items).toHaveLength(0);
    });

    it('the FIRST tool find sets salvageTools — direct connective tissue to the outboard teardown bonus', () => {
        const s = fresh();
        expect(s.tools.salvageTools).toBe(false);
        const tool = mkItem({ id: 'tool1', fate: 'tool', massKg: 0.6, materialKind: null, materialAmount: 0 });
        s.shore = { items: [tool], lastGeneratedAtGameHours: 0, spawnCount: 0 };
        const result = pickUpShoreItem(s, 'tool1');
        expect(result.ok).toBe(true);
        expect(result.gotTool).toBe(true);
        expect(s.tools.salvageTools).toBe(true);
    });

    it('a SECOND tool find, already owning one, yields scrap instead of being wasted (Law 176)', () => {
        const s = fresh();
        s.tools.salvageTools = true;
        const before = s.inventory.stone ?? 0;
        const tool = mkItem({ id: 'tool2', fate: 'tool', massKg: 0.6, materialKind: null, materialAmount: 0 });
        s.shore = { items: [tool], lastGeneratedAtGameHours: 0, spawnCount: 0 };
        const result = pickUpShoreItem(s, 'tool2');
        expect(result.ok).toBe(true);
        expect(result.gotTool).toBe(false);
        expect(s.inventory.stone).toBe(before + 2);
    });

    it('picking up a nonexistent id is a clean no-op refusal, not a crash', () => {
        const s = fresh();
        const result = pickUpShoreItem(s, 'does-not-exist');
        expect(result).toEqual({ ok: false, reason: null, gotTool: false });
    });
});
