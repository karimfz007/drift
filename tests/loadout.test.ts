import { describe, expect, it } from 'vitest';
import {
    ACCESS_ZONES,
    TOOL_IDS,
    assignToBelt,
    assignToPocket,
    carriedBulk,
    drawFromBelt,
    equipToActiveHand,
    fitsInPocket,
    freshLoadout,
    isTwoHanded,
    loadoutView,
    ownedTools,
    ownsTool,
    stowActiveHand,
    syncLoadoutToOwnership,
    zoneOf
} from '../src/brain/loadout';
import { loadBandOf } from '../src/brain/body';
import { reconcile } from '../src/brain/reconcile';
import { deserialize } from '../src/brain/save';
import { buildStorage, createInitialState, useStorage } from '../src/brain/state';
import { realSecondsFromGameHours } from '../src/brain/clock';
import { SCHEMA_VERSION, type GameState } from '../src/brain/types';
import { TUNE } from '../src/data/tune';

function run(): GameState {
    return createInitialState(0);
}

/** A castaway who owns every tool — the state most of these laws are about. */
function fullyEquipped(): GameState {
    const s = run();
    s.tools.axe = true;
    //  P0-4 — the spear joins TOOL_IDS, so "fully equipped" has to mean it too. Without this
    //  the fixture's own name became a lie and `zoneOf` correctly returned null for a tool
    //  nobody owned; widening the list is what made that visible.
    s.tools.spear = true;
    s.inventory.stonehammer = 1;
    s.tools.flask = true;
    s.torch = { owned: true, lit: false, fuelGameHoursRemaining: 3, grade: 'serviceable' };
    //  ...and the two zones that are POSSESSIONS rather than body positions. The hub no longer
    //  renders a row for a pack nobody owns or a crate nobody built, so a fixture called
    //  "fully equipped" that had neither was quietly describing a survivor with their arms
    //  full and no crate — and every zone assertion built on it inherited that.
    s.tools.backpack = true;
    s.storage = { ...s.storage, built: true };
    return s;
}

describe('loadout — the six access zones exist and are distinct (v0_7 §9)', () => {
    it('names exactly the six zones §9 lists', () => {
        expect(ACCESS_ZONES).toEqual(['activeHand', 'supportHand', 'belt', 'pocket', 'backpack', 'storage']);
    });

    it('a fresh loadout has nothing positioned, with real empty positions', () => {
        const l = freshLoadout();
        expect(l.activeHand).toBeNull();
        expect(l.supportHand).toBeNull();
        expect(l.belt).toHaveLength(TUNE.beltPositions);
        expect(l.pockets).toHaveLength(TUNE.pocketPositions);
        expect(l.belt.every((x) => x === null)).toBe(true);
    });

    it('quick-slot positions are LIMITED — that is the point of a physical slot', () => {
        expect(TUNE.beltPositions).toBeGreaterThan(0);
        expect(TUNE.beltPositions).toBeLessThan(TOOL_IDS.length + 4);
        expect(TUNE.pocketPositions).toBeGreaterThan(0);
    });

    it('an unowned tool is in no zone at all', () => {
        const s = run();
        for (const tool of TOOL_IDS) expect(zoneOf(s, tool)).toBeNull();
    });

    it('an owned but unpositioned tool reports as backpack — general carry', () => {
        const s = fullyEquipped();
        for (const tool of TOOL_IDS) expect(zoneOf(s, tool)).toBe('backpack');
    });
});

describe('loadout — hands, and the two-handed rule (item 2: equip/switch)', () => {
    it('equipping puts the tool in the active hand', () => {
        const s = fullyEquipped();
        expect(equipToActiveHand(s, 'axe')).toEqual({ ok: true, displaced: null });
        expect(s.loadout.activeHand).toBe('axe');
        expect(zoneOf(s, 'axe')).toBe('activeHand');
    });

    it('refuses a tool the run does not own', () => {
        const s = run();
        expect(equipToActiveHand(s, 'axe')).toEqual({ ok: false, reason: 'not-owned' });
        expect(s.loadout.activeHand).toBeNull();
    });

    it('switching tools replaces the held one — one active hand, always', () => {
        const s = fullyEquipped();
        equipToActiveHand(s, 'axe');
        equipToActiveHand(s, 'torch');
        expect(s.loadout.activeHand).toBe('torch');
        expect(zoneOf(s, 'axe')).toBe('backpack'); // the axe went back to general carry
    });

    it('the axe and hammer are two-handed; the torch and flask are not', () => {
        expect(isTwoHanded('axe')).toBe(true);
        expect(isTwoHanded('stoneHammer')).toBe(true);
        expect(isTwoHanded('torch')).toBe(false);
        expect(isTwoHanded('flask')).toBe(false);
    });

    it('a two-handed tool empties the support hand, and reports what it displaced', () => {
        const s = fullyEquipped();
        s.loadout.supportHand = 'torch';
        const result = equipToActiveHand(s, 'axe');
        expect(result).toEqual({ ok: true, displaced: 'torch' });
        expect(s.loadout.supportHand).toBeNull();
        //  Displaced, never destroyed.
        expect(ownsTool(s, 'torch')).toBe(true);
        expect(zoneOf(s, 'torch')).toBe('backpack');
    });

    it('a one-handed tool leaves the support hand alone', () => {
        const s = fullyEquipped();
        s.loadout.supportHand = 'flask';
        expect(equipToActiveHand(s, 'torch')).toEqual({ ok: true, displaced: null });
        expect(s.loadout.supportHand).toBe('flask');
    });

    it('stowing empties the hand without destroying the tool', () => {
        const s = fullyEquipped();
        equipToActiveHand(s, 'axe');
        expect(stowActiveHand(s)).toBe(true);
        expect(s.loadout.activeHand).toBeNull();
        expect(ownsTool(s, 'axe')).toBe(true);
        expect(stowActiveHand(s)).toBe(false); // nothing left to stow
    });
});

describe('loadout — belt and pockets are physical references, not queries (§9)', () => {
    it('assigns a tool to a belt position and draws it back into the hand', () => {
        const s = fullyEquipped();
        expect(assignToBelt(s, 0, 'torch')).toEqual({ ok: true });
        expect(s.loadout.belt[0]).toBe('torch');
        expect(zoneOf(s, 'torch')).toBe('belt');

        expect(drawFromBelt(s, 0)).toEqual({ ok: true, displaced: null });
        expect(s.loadout.activeHand).toBe('torch');
        //  Drawing vacates the belt position — one physical object, one place.
        expect(s.loadout.belt[0]).toBeNull();
    });

    it('drawing from an empty position plainly fails rather than conjuring an item', () => {
        const s = fullyEquipped();
        expect(drawFromBelt(s, 1)).toEqual({ ok: false, reason: 'not-owned' });
        expect(s.loadout.activeHand).toBeNull();
    });

    it('refuses an out-of-range position instead of growing the belt', () => {
        const s = fullyEquipped();
        expect(assignToBelt(s, TUNE.beltPositions, 'axe')).toEqual({ ok: false, reason: 'bad-position' });
        expect(assignToBelt(s, -1, 'axe')).toEqual({ ok: false, reason: 'bad-position' });
        expect(s.loadout.belt).toHaveLength(TUNE.beltPositions);
    });

    it('a pocket takes small things only — the axe and hammer are too bulky', () => {
        const s = fullyEquipped();
        expect(fitsInPocket('flask')).toBe(true);
        expect(fitsInPocket('axe')).toBe(false);
        expect(assignToPocket(s, 0, 'axe')).toEqual({ ok: false, reason: 'too-bulky' });
        expect(assignToPocket(s, 0, 'flask')).toEqual({ ok: true });
        expect(zoneOf(s, 'flask')).toBe('pocket');
    });

    it('a tool occupies exactly one position — assigning moves it, never clones it', () => {
        const s = fullyEquipped();
        assignToBelt(s, 0, 'torch');
        assignToBelt(s, 2, 'torch');
        expect(s.loadout.belt[0]).toBeNull();
        expect(s.loadout.belt[2]).toBe('torch');
        expect(s.loadout.belt.filter((t) => t === 'torch')).toHaveLength(1);
    });
});

describe('loadout — THE LAW: a consumed item empties its position, never silently refilled (§9)', () => {
    it('REGRESSION — a torch burning out clears the belt position it was in', () => {
        const s = fullyEquipped();
        s.torch = { owned: true, lit: true, fuelGameHoursRemaining: 0.5, grade: 'serviceable' };
        assignToBelt(s, 1, 'torch');
        expect(s.loadout.belt[1]).toBe('torch');

        //  Burn it out through the real reconcile path, not by hand.
        const { state } = reconcile(s, realSecondsFromGameHours(4));
        expect(state.torch.owned).toBe(false);
        expect(state.loadout.belt[1]).toBeNull();
    });

    it('REGRESSION — a torch burning out empties the HAND too', () => {
        const s = fullyEquipped();
        s.torch = { owned: true, lit: true, fuelGameHoursRemaining: 0.5, grade: 'serviceable' };
        equipToActiveHand(s, 'torch');
        const { state } = reconcile(s, realSecondsFromGameHours(4));
        expect(state.loadout.activeHand).toBeNull();
    });

    it('the position is NOT refilled from storage — no substitute is conjured', () => {
        const s = fullyEquipped();
        s.inventory.wood = TUNE.storageWoodCost;
        s.inventory.stone = TUNE.storageStoneCost;
        buildStorage(s, s.player.x, s.player.y);
        s.torch = { owned: true, lit: true, fuelGameHoursRemaining: 0.5, grade: 'serviceable' };
        assignToBelt(s, 0, 'torch');

        const { state } = reconcile(s, realSecondsFromGameHours(4));
        expect(state.loadout.belt[0]).toBeNull();
        expect(state.loadout.belt.every((t) => t === null || t !== 'torch')).toBe(true);
    });

    it('syncLoadoutToOwnership is idempotent and leaves owned tools alone', () => {
        const s = fullyEquipped();
        assignToBelt(s, 0, 'axe');
        equipToActiveHand(s, 'flask');
        syncLoadoutToOwnership(s);
        syncLoadoutToOwnership(s);
        expect(s.loadout.belt[0]).toBe('axe');
        expect(s.loadout.activeHand).toBe('flask');
    });
});

describe('loadout — mass and bulk are both visible; bands stay Ch.6\'s (§9)', () => {
    it('bulk counts materials and owned tools', () => {
        const s = run();
        expect(carriedBulk(s)).toBe(0);
        s.inventory.wood = 2;
        expect(carriedBulk(s)).toBeCloseTo(2 * TUNE.materialBulk.wood, 9);
        s.tools.axe = true;
        expect(carriedBulk(s)).toBeCloseTo(2 * TUNE.materialBulk.wood + TUNE.toolBulk.axe, 9);
    });

    it('the view surfaces BOTH mass and bulk — §9\'s "contents plus mass/bulk visible"', () => {
        const s = fullyEquipped();
        s.inventory.stone = 5;
        const view = loadoutView(s);
        expect(view.massKg).toBeGreaterThan(0);
        expect(view.bulk).toBeGreaterThan(0);
    });

    it('bulk deliberately does NOT drive the load bands — §9 says the bands stay Ch.6\'s', () => {
        //  Two states with identical mass but very different bulk must band identically.
        const dense = run();
        const bulky = run();
        dense.inventory.stone = 10; // 20 kg, low bulk
        bulky.inventory.wood = Math.round((10 * TUNE.materialMassKg.stone) / TUNE.materialMassKg.wood); // same mass, far bulkier
        expect(carriedBulk(bulky)).toBeGreaterThan(carriedBulk(dense));
        expect(loadBandOf(bulky)).toBe(loadBandOf(dense));
    });
});

describe('loadout — the panel view, and storage inspectable in place (unparks the C05 note)', () => {
    it('reports every zone that EXISTS — and no row for a thing nobody owns', () => {
        //  This asserted all six unconditionally, which is what let the hub show a "Backpack"
        //  row to a survivor with no pack and a "Storage" row with no crate built. The
        //  director read the empty Backpack row as the game telling him he had one.
        //
        //  Fully equipped, all six are real and all six appear — and 'arms' does NOT, because
        //  this survivor has a pack to carry things in.
        const view = loadoutView(fullyEquipped());
        expect(view.zones.map((z) => z.zone)).toEqual(ACCESS_ZONES);
        expect(view.zones.map((z) => z.zone)).not.toContain('arms');
    });

    it('...and a survivor with no pack and no crate is shown neither', () => {
        const bare = run();
        bare.tools.backpack = false;
        bare.storage = { ...bare.storage, built: false };
        const zones = loadoutView(bare).zones.map((z) => z.zone);
        expect(zones, 'a backpack row for a survivor with no backpack').not.toContain('backpack');
        expect(zones, 'a storage row for a crate that was never built').not.toContain('storage');
        //  The carrying row still exists — the materials have to be somewhere visible — and it
        //  is named for what is actually true.
        expect(zones, 'the survivor cannot see what they are carrying at all').toContain('arms');
    });

    it('a positioned tool appears in its own zone and NOT in the backpack', () => {
        const s = fullyEquipped();
        equipToActiveHand(s, 'axe');
        assignToBelt(s, 0, 'torch');
        const view = loadoutView(s);
        const zone = (z: string) => view.zones.find((x) => x.zone === z)!;
        expect(zone('activeHand').tools).toEqual(['axe']);
        expect(zone('belt').tools).toEqual(['torch']);
        expect(zone('backpack').tools).not.toContain('axe');
        expect(zone('backpack').tools).not.toContain('torch');
        //  ...and the ones still in general carry do show there.
        expect(zone('backpack').tools).toContain('flask');
    });

    it('storage contents are inspectable WITHOUT withdrawing them first', () => {
        const s = run();
        s.inventory.wood = TUNE.storageWoodCost + 9;
        s.inventory.stone = TUNE.storageStoneCost;
        buildStorage(s, s.player.x, s.player.y);
        useStorage(s); // deposit everything carried
        expect(s.inventory.wood).toBe(0);

        const view = loadoutView(s);
        const storage = view.zones.find((z) => z.zone === 'storage')!;
        expect(view.storageOpen).toBe(true);
        expect(storage.materials.find((m) => m.kind === 'wood')!.count).toBeGreaterThan(0);
        //  And the player is still carrying nothing — inspection moved nothing.
        expect(s.inventory.wood).toBe(0);
    });

    it('storage is ABSENT before a crate is built, never a phantom container', () => {
        //  The name was right and the assertion was the opposite of it: an empty row IS the
        //  phantom. A crate that was never built has no row at all now.
        const view = loadoutView(run());
        expect(view.storageOpen).toBe(false);
        expect(view.zones.find((z) => z.zone === 'storage'), 'a phantom container').toBeUndefined();
    });

    it('carried and stored contents are never merged — you can always tell them apart', () => {
        const s = run();
        s.inventory.wood = TUNE.storageWoodCost + 6;
        s.inventory.stone = TUNE.storageStoneCost;
        buildStorage(s, s.player.x, s.player.y);
        useStorage(s);
        s.inventory.wood = 3; // now carrying some again

        const view = loadoutView(s);
        //  The CARRY row, by whichever name is true — this survivor has no pack, so it is
        //  'arms'. The claim under test is carried-vs-stored, which holds either way.
        const carried = view.zones.find((z) => z.zone === 'backpack' || z.zone === 'arms')!;
        const storage = view.zones.find((z) => z.zone === 'storage')!;
        expect(carried.materials.find((m) => m.kind === 'wood')!.count).toBe(3);
        expect(storage.materials.find((m) => m.kind === 'wood')!.count).toBeGreaterThan(0);
    });
});

describe('save — a v9 save migrates to v10 with an empty loadout (D-063)', () => {
    function v9Save(): string {
        const fresh = createInitialState(1_700_000_000_000);
        const state = { ...fresh, schemaVersion: 9, tools: { ...fresh.tools, axe: true, flask: true } };
        delete (state as unknown as Record<string, unknown>).loadout;
        delete (state as unknown as Record<string, unknown>).blueprints;
        delete (state as unknown as Record<string, unknown>).experimentCount;
        return JSON.stringify({ schemaVersion: 9, savedAtMs: 1_700_000_300_000, state });
    }

    it('gains a well-formed, EMPTY loadout — positions are never invented', () => {
        const s = deserialize(v9Save())!.state;
        expect(s.schemaVersion).toBe(SCHEMA_VERSION);
        expect(s.loadout.activeHand).toBeNull();
        expect(s.loadout.belt).toHaveLength(TUNE.beltPositions);
        expect(s.loadout.belt.every((x) => x === null)).toBe(true);
    });

    it('keeps every tool owned — they simply sit in general carry', () => {
        const s = deserialize(v9Save())!.state;
        expect(s.tools.axe).toBe(true);
        expect(ownedTools(s)).toContain('axe');
        expect(zoneOf(s, 'axe')).toBe('backpack');
    });

    it('mints a blueprint for the axe this save already owns — possession is proof, D-063 does not exempt it', () => {
        //  THIS ASSERTED THE OPPOSITE UNTIL A REAL SAVE.TS BUG WAS FIXED ALONGSIDE ITEM 3
        //  (this batch): most `migrateVNtoVN+1` steps stamped `schemaVersion: SCHEMA_VERSION`
        //  — the ALWAYS-CURRENT top-level constant — instead of their own literal target
        //  version. `migrate()`'s dispatcher is a flat run of `if (current.schemaVersion ===
        //  N)` checks, so the very first such step a save hit jumped it straight to the
        //  live constant and made every later check false, silently truncating the ladder.
        //  For this fixture that meant `migrateV11toV12` — the invention-pivot step that
        //  mints a blueprint from evidence of prior craft — never ran at all, so `axe: true`
        //  in the raw v9 tools never got read, and `[]` merely reflected a chain that gave
        //  up nine steps early. `migrateV11toV12`'s own doc comment states the rule this
        //  test now actually exercises: "possession is proof... nothing is granted on a
        //  guess" — and this fixture's whole point (see `v9Save` above) is that it DOES
        //  possess one, on purpose, for the sibling test just above this one.
        const s = deserialize(v9Save())!.state;
        expect(s.blueprints).toEqual([{
            id: 'bp-migrated-axe',
            name: 'Hafted axe, as made',
            recipeId: 'axe',
            inputs: ['wood', 'sharpblade', 'fiber'],
            version: 1,
            workmanship: 'crude',
            author: 'castaway',
            discoveredAtGameHours: 0,
        }]);
        expect(s.experimentCount).toBe(0);
    });
});
