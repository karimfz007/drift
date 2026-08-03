/**
 * THE BOULDER FORMATION — the third stone tier, and the D-051 First Amendment it carries.
 *
 * The amendment's new clause is the thing under test: **the survival floor must be reachable
 * through ACTIVE PLAY ALONE.** Absence-restock is a gift, never the only path. Before this
 * node existed, a present player who had emptied the surface stone and the quarry had nothing
 * to do but wait for the tide — which made the tide load-bearing, which is exactly what the
 * amendment forbids.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, effortEnergyCostFor, gatherNode, regrowGameHoursFor } from '../src/brain/state';
import { domainForNodeKind, masteryDomainForNodeKind } from '../src/brain/knowledge';
import { TUNE } from '../src/data/tune';
import type { GameState } from '../src/brain/types';

const boulderOf = (s: GameState) => s.nodes.find((n) => n.kind === 'boulder')!;

describe('D-051 FIRST AMENDMENT — the survival floor is reachable by active play alone', () => {
    it('the bluff NEVER becomes unavailable, however long you work it', () => {
        //  The amendment's whole point. A present player must never be reduced to waiting.
        const s = createInitialState(0);
        const b = boulderOf(s);
        for (let i = 0; i < 500; i += 1) {
            const r = gatherNode(s, b.id);
            expect(r.ok, `the bluff refused on swing ${i + 1}`).toBe(true);
        }
        expect(boulderOf(s).available).toBe(true);
        expect(s.inventory.stone).toBe(500 * TUNE.boulderYieldPerSwing);
    });

    it('it has no pool — there is no counter that could ever reach zero', () => {
        //  Structural: a pool is how the quarry ends, and the bluff must not have the
        //  machinery for an ending at all.
        expect(boulderOf(createInitialState(0)).pool).toBeUndefined();
    });

    it('and it never enters the regrow queue, because it is never spent', () => {
        expect(regrowGameHoursFor('boulder')).toBe(Infinity);
    });

    it('THE OTHER TWO TIERS ARE UNCHANGED — the amendment tightens, it does not rewrite', () => {
        //  Surface stone still restocks on the tide (legal now that the bluff supplies the
        //  active path), and the quarry is still finite forever (legal because it was never
        //  the survival floor). D-070's regression stands.
        expect(regrowGameHoursFor('rock')).toBeLessThan(Infinity);
        expect(regrowGameHoursFor('quarry')).toBe(Infinity);
        expect(createInitialState(0).nodes.find((n) => n.kind === 'quarry')!.pool)
            .toBe(TUNE.quarryStoneCapacity);
    });
});

describe('ALWAYS AVAILABLE, NEVER FAST, NEVER FREE', () => {
    it('yields STRICTLY LESS per swing than the quarry — the binding constraint', () => {
        //  If the inexhaustible tier were also the fast one, the finite quarry would stop
        //  being a decision and the whole three-tier geology would collapse to one.
        expect(TUNE.boulderYieldPerSwing).toBeLessThan(TUNE.quarryYieldPerTap);
    });

    it('costs MORE energy per swing than the quarry, and far more per unit of stone', () => {
        expect(effortEnergyCostFor('boulder')).toBeGreaterThan(effortEnergyCostFor('quarry'));
        const bluffPerStone = effortEnergyCostFor('boulder') / TUNE.boulderYieldPerSwing;
        const seamPerStone = effortEnergyCostFor('quarry') / TUNE.quarryYieldPerTap;
        expect(bluffPerStone).toBeGreaterThan(seamPerStone * 2);
    });

    it('is miserable by hand and workable with the hammer', () => {
        expect(TUNE.boulderHoldSecondsWithHammer).toBeLessThan(TUNE.boulderHoldSecondsByHand);
        //  Workable, not fast: the hammer must not turn the bluff into a quarry.
        expect(TUNE.boulderHoldSecondsWithHammer).toBeGreaterThan(TUNE.deadfallHoldSeconds);
    });
});

describe('HONESTY RULES — it never pretends to deplete', () => {
    it('working it leaves a SCAR clock, never a depletion', () => {
        const s = createInitialState(0);
        s.gameHoursElapsed = 12;
        gatherNode(s, boulderOf(s).id);
        const after = boulderOf(s);
        //  The timestamp exists — that is the chip scar's clock, so the face can weather
        //  smooth again. What must NOT happen is the node going away.
        expect(after.depletedAtGameHours).toBe(12);
        expect(after.available).toBe(true);
    });

    it('ANTI-GRIND: it trains no domain at all, by construction', () => {
        //  Ch.2's rule on the one face that could be ground forever. Mastery still SPEEDS the
        //  work; doing the job forever teaches nothing, because there is no channel from the
        //  bluff to a score.
        expect(domainForNodeKind('boulder')).toBeNull();
        expect(masteryDomainForNodeKind('boulder')).toBe('harvestingFabrication');
    });

    it('a thousand swings move no knowledge score whatsoever', () => {
        const s = createInitialState(0);
        const before = JSON.stringify(s.knowledge.domains);
        for (let i = 0; i < 1000; i += 1) gatherNode(s, boulderOf(s).id);
        expect(JSON.stringify(s.knowledge.domains)).toBe(before);
    });
});

describe('MIGRATION — an existing island grows the bluff', () => {
    it('a v17 save gains the Boulder Formation, and gains it exactly once', async () => {
        //  Without this a returning player keeps an island with no active-play stone path,
        //  which would make the amendment false for every save that predates it.
        const { migrate } = await import('../src/brain/save');
        const s = createInitialState(0);
        const v17 = {
            schemaVersion: 17,
            savedAtMs: 1_700_000_000_000,
            state: { ...s, nodes: s.nodes.filter((n) => n.kind !== 'boulder'), schemaVersion: 17 },
        };
        const out = migrate(v17 as never)!;
        expect(out).not.toBeNull();
        const bluffs = out.state.nodes.filter((n) => n.kind === 'boulder');
        expect(bluffs).toHaveLength(1);
        expect(bluffs[0].available).toBe(true);
    });

    it('...and a save that already has one is left alone', async () => {
        const { migrate } = await import('../src/brain/save');
        const s = createInitialState(0);
        const v17 = { schemaVersion: 17, savedAtMs: 1_700_000_000_000, state: { ...s, schemaVersion: 17 } };
        const out = migrate(v17 as never)!;
        expect(out.state.nodes.filter((n) => n.kind === 'boulder')).toHaveLength(1);
    });
});

describe('THE BACKPACK IS EARNED (item 1)', () => {
    it('a fresh castaway has NO pack, and hits the load bands sooner without one', async () => {
        const { loadBandForKg } = await import('../src/brain/body');
        expect(createInitialState(0).tools.backpack).toBe(false);
        //  Same weight, two verdicts. Not a hard cap: you can still pick everything up, it
        //  simply costs you sooner — a refusal would be a decision the player did not make.
        const kg = TUNE.loadWorkingAtKg - 1;
        expect(loadBandForKg(kg, true)).toBe('light');
        expect(loadBandForKg(kg, false)).toBe('working');
    });

    it('making one restores full capacity, and spends real materials', async () => {
        const { makeBackpack, canMakeBackpack } = await import('../src/brain/state');
        const s = createInitialState(0);
        expect(canMakeBackpack(s)).toBe(false);            // nothing carried yet
        s.inventory.fiber = TUNE.backpackFiberCost;
        s.inventory.wood = TUNE.backpackWoodCost;
        expect(makeBackpack(s)).toBe(true);
        expect(s.tools.backpack).toBe(true);
        expect(s.inventory.fiber).toBe(0);
        expect(makeBackpack(s), 'never twice').toBe(false);
    });

    it('an existing save migrates in ALREADY CARRYING one — never retroactively stranded', async () => {
        const { migrate } = await import('../src/brain/save');
        const s = createInitialState(0);
        const v18 = { schemaVersion: 18, savedAtMs: 1_700_000_000_000,
            state: { ...s, tools: { ...s.tools, backpack: undefined }, schemaVersion: 18 } };
        expect(migrate(v18 as never)!.state.tools.backpack).toBe(true);
    });
});

describe('THE PIVOT LAW HOLDS FOR THE BACKPACK TOO (device-caught regression)', () => {
    it('a fresh castaway is offered NOTHING — the Backpack row included', async () => {
        //  I shipped this row as `revealed: true` and the device harness caught it inside one
        //  run. SLICE 2B's pivot is that the panel starts EMPTY; a hardcoded reveal put a
        //  Backpack in front of someone four seconds off the beach. Not mine to except.
        const { revealedInPanel } = await import('../src/brain/reveal');
        expect(revealedInPanel(createInitialState(0), 'backpack')).toBe(false);
    });

    it('KNOWN-OPEN: the backpack has no discovery route, so the gated row never appears', async () => {
        //  Stated as a defect rather than hidden. Gating the row restored SLICE 2B's pivot
        //  law — the thing the device caught — but `revealedInPanel` needs a DEMONSTRATED
        //  ladder, which needs a blueprint, which needs a recipe in the discovery table. The
        //  backpack has none, so the row is now correctly gated and permanently closed.
        //
        //  Restoring the recipe is NOT a one-line change: recipe ORDER decides resolution,
        //  and inserting it ahead of the torch flipped two shipped tests immediately. That is
        //  matcher work, and I am not tuning list order blind at the end of a session — the
        //  last three times I pushed on with partial information this session I was wrong.
        //
        //  Closed by: the next session, alongside item 5's combination-evidence work, which
        //  touches the same surface. The craft itself remains reachable directly.
        const { allRecipes } = await import('../src/brain/recipes');
        const { revealedInPanel } = await import('../src/brain/reveal');
        expect(allRecipes().map((r) => r.id)).not.toContain('backpack');
        expect(revealedInPanel(createInitialState(0), 'backpack')).toBe(false);
    });
});
