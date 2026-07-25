import { describe, expect, it } from 'vitest';
import {
    buildFire,
    canCraftTorch,
    canLightTorch,
    craftTorch,
    createInitialState,
    feedFire,
    lightTorch,
    torchShortfall
} from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { realSecondsFromGameHours } from '../src/brain/clock';
import { TUNE } from '../src/data/tune';

function run() {
    return createInitialState(0);
}

describe('FIX-5 (Living Island Track A) — the torch, crafting-tree entry #1', () => {
    it('needs wood and fibre only (no stone gate), and refuses without them', () => {
        const s = run();
        expect(canCraftTorch(s)).toBe(false);
        expect(torchShortfall(s)).toEqual({ wood: TUNE.torchWoodCost, fiber: TUNE.torchFiberCost });
        expect(craftTorch(s)).toBe(false);
        expect(s.torch.owned).toBe(false);
    });

    it('spends exactly the recipe and yields an unlit, unowned-until-now torch', () => {
        const s = run();
        s.inventory.wood = TUNE.torchWoodCost + 3;
        s.inventory.fiber = TUNE.torchFiberCost + 1;
        expect(craftTorch(s)).toBe(true);
        expect(s.inventory.wood).toBe(3);
        expect(s.inventory.fiber).toBe(1);
        expect(s.torch.owned).toBe(true);
        expect(s.torch.lit).toBe(false);
        //  A grade was rolled (Ch.1 v3, D-055) — one of the four, and fuel matches whatever
        //  that grade's burn-duration multiplier says. The grade roll itself is covered in
        //  tests/grades.test.ts; this test is about the recipe spend, not the roll.
        expect(['crude', 'serviceable', 'refined', 'exceptional']).toContain(s.torch.grade);
    });

    it('cannot be crafted twice while one is already owned', () => {
        const s = run();
        s.inventory.wood = 99;
        s.inventory.fiber = 99;
        expect(craftTorch(s)).toBe(true);
        expect(canCraftTorch(s)).toBe(false);
        expect(craftTorch(s)).toBe(false);
    });

    it('cannot be lit without an active fire, or without owning one, or once already lit', () => {
        const s = run();
        s.inventory.wood = 99;
        s.inventory.fiber = 99;
        craftTorch(s);

        // No fire at all.
        expect(canLightTorch(s)).toBe(false);
        expect(lightTorch(s)).toBe(false);

        // A fire built but not lit is impossible in this brain (buildFire always lights it
        // with fuel), so instead prove the OTHER direction: no torch owned, fire lit.
        const s2 = run();
        buildFire(s2, 0, 0);
        expect(canLightTorch(s2)).toBe(false); // no torch owned
        expect(lightTorch(s2)).toBe(false);
    });

    it('lights at an active fire, and only then', () => {
        const s = run();
        s.inventory.wood = TUNE.torchWoodCost + TUNE.woodPerFire;
        s.inventory.fiber = TUNE.torchFiberCost;
        craftTorch(s);
        buildFire(s, 0, 0);
        expect(canLightTorch(s)).toBe(true);
        expect(lightTorch(s)).toBe(true);
        expect(s.torch.lit).toBe(true);
        // Lighting again does nothing further (already lit).
        expect(canLightTorch(s)).toBe(false);
        expect(lightTorch(s)).toBe(false);
    });

    it('burns down over elapsed game hours ONLY while lit, and is spent (not just off) at 0 fuel', () => {
        const s = run();
        s.inventory.wood = TUNE.torchWoodCost * 2 + TUNE.woodPerFire;
        s.inventory.fiber = TUNE.torchFiberCost * 2;
        craftTorch(s);
        //  This test is about the burn-down MECHANISM, not the grade roll (covered
        //  separately in tests/grades.test.ts) — force the baseline grade so the duration
        //  math below is exact rather than whatever this seed happened to roll.
        s.torch.grade = 'serviceable';
        s.torch.fuelGameHoursRemaining = TUNE.torchBurnGameHours;
        buildFire(s, 0, 0);
        lightTorch(s);

        // Half the burn duration: still lit, fuel down by half.
        const halfway = reconcile(s, realSecondsFromGameHours(TUNE.torchBurnGameHours / 2));
        expect(halfway.state.torch.owned).toBe(true);
        expect(halfway.state.torch.lit).toBe(true);
        expect(halfway.state.torch.fuelGameHoursRemaining).toBeCloseTo(TUNE.torchBurnGameHours / 2, 6);

        // Past the full burn duration: consumed — owned AND lit both fall false, fuel at 0.
        const spent = reconcile(halfway.state, realSecondsFromGameHours(TUNE.torchBurnGameHours));
        expect(spent.state.torch.owned).toBe(false);
        expect(spent.state.torch.lit).toBe(false);
        expect(spent.state.torch.fuelGameHoursRemaining).toBe(0);

        // A spent torch must be recrafted — canCraftTorch is true again.
        expect(canCraftTorch(spent.state)).toBe(true);
    });

    it('an unlit, owned torch does not burn down at all while carried unlit', () => {
        const s = run();
        s.inventory.wood = TUNE.torchWoodCost;
        s.inventory.fiber = TUNE.torchFiberCost;
        craftTorch(s);
        s.torch.grade = 'serviceable';
        s.torch.fuelGameHoursRemaining = TUNE.torchBurnGameHours;
        const { state } = reconcile(s, realSecondsFromGameHours(100));
        expect(state.torch.owned).toBe(true);
        expect(state.torch.lit).toBe(false);
        expect(state.torch.fuelGameHoursRemaining).toBe(TUNE.torchBurnGameHours);
    });

    it('feeding the fire and lighting the torch are independent — one never starves the other', () => {
        const s = run();
        s.inventory.wood = TUNE.torchWoodCost + TUNE.woodPerFire + 5;
        s.inventory.fiber = TUNE.torchFiberCost;
        craftTorch(s);
        buildFire(s, 0, 0);
        expect(lightTorch(s)).toBe(true);
        // Still enough wood left to feed the fire afterward — lighting the torch spent none.
        expect(feedFire(s)).toBe(true);
    });
});
