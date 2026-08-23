/**
 * INCREMENTAL CONSTRUCTION — a structure you can start before you can afford it.
 *
 * The old economy was stage-everything-or-do-not-begin. The new one lets a frame go up with
 * whatever was carried and be fed over as many visits as it takes. This file guards the four
 * things that make that safe rather than merely possible:
 *
 *   1. A FRAME IS NOT A SHELTER. `shelter.built` is read in thirty-five places across fourteen
 *      files and almost all of them mean "is there a working roof". The frame is a separate
 *      field precisely so none of them can accidentally see it — asserted here directly,
 *      because a miss would hand an empty frame the full warmth bonus.
 *   2. NOTHING IS LOST, in either direction: never over-fed, never charged twice.
 *   3. [[D-011]] — an incomplete structure is exactly as safe across an absence as a complete
 *      one. No decay, no loss, no penalty for having been away.
 *   4. NEVER A DEAD END — [[D-184]]'s law, kept in the one form that still applies.
 */
import { describe, expect, it } from 'vitest';
import {
    createInitialState, isNearShelter, completeShelterFromSite, buildShelter, buildStorage,
    moveStructure, structureSite, moveStructureBlocker,
} from '../src/brain/state';
import {
    beginConstruction, canBeginConstruction, beginBlocker, contributeToSite,
    siteShortfall, siteIsComplete, siteProgress, siteShortfallNote, canContribute,
    contributionAvailable,
} from '../src/brain/build';
import { verbsFor, availableVerbs, holdOpensCircle } from '../src/brain/verbs';
import { serialize, deserialize, migrate } from '../src/brain/save';
import { reconcile } from '../src/brain/reconcile';
import { ALL_MATERIAL_KINDS } from '../src/brain/materials';
import { SCHEMA_VERSION, type GameState } from '../src/brain/types';
import { TUNE } from '../src/data/tune';

const NOW = 1_770_000_000_000;

/** The director's own shape: enough to START, nowhere near enough to FINISH. */
function poor(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    s.inventory.wood = 2; s.inventory.stone = 2; s.inventory.fiber = 2;
    return s;
}

function rich(): GameState {
    const s = poor();
    s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
    return s;
}

/** A frame standing at the origin, fed with whatever `poor()` was carrying. */
function framed(): GameState {
    const s = poor();
    expect(beginConstruction(s, 'shelter', 0, 0), 'the frame refused a survivor with something').toBe(true);
    return s;
}

describe('starting a structure you cannot yet afford', () => {
    it('THE NEW ECONOMY: a frame goes up with whatever was carried, and takes it', () => {
        const s = poor();
        expect(canBeginConstruction(s, 'shelter')).toBe(true);
        expect(beginConstruction(s, 'shelter', 3, 4)).toBe(true);

        const site = s.construction!;
        expect(site.recipeId).toBe('shelter');
        expect(site.x).toBe(3);
        expect(site.y).toBe(4);
        //  What was carried is now IN the frame, not still in the pack — the timber is the
        //  structure. Nothing was destroyed; it moved.
        expect(site.contributed.wood).toBe(2);
        expect(s.inventory.wood).toBe(0);
        expect(siteIsComplete(site)).toBe(false);
    });

    it('...and it says exactly what it still wants', () => {
        const s = framed();
        const missing = siteShortfall(s.construction!);
        expect(missing.wood).toBe(TUNE.shelterWoodCost - 2);
        expect(missing.stone).toBe(TUNE.shelterStoneCost - 2);
        expect(missing.fiber).toBe(TUNE.shelterFiberCost - 2);
        expect(siteShortfallNote(s.construction!)).toMatch(/still needs/i);
    });

    it('D-184’S LAW SURVIVES, narrowed: carrying NOTHING it wants refuses to begin', () => {
        //  The affordability guard is superseded — starting short is the intended path now.
        //  What is NOT superseded is "never arm something the player cannot resolve": a frame
        //  begun with no investment at all would be an empty object claiming a tap.
        const empty = createInitialState(NOW);
        empty.inventory.wood = 0; empty.inventory.stone = 0; empty.inventory.fiber = 0;
        expect(canBeginConstruction(empty, 'shelter')).toBe(false);
        expect(beginBlocker(empty, 'shelter')).toMatch(/carrying none/i);
        //  ...and it names what to go and find, rather than "not enough".
        expect(beginBlocker(empty, 'shelter')).toMatch(/wood/i);
        expect(beginConstruction(empty, 'shelter', 0, 0)).toBe(false);
        expect(empty.construction).toBeNull();
    });

    it('...and one of anything is enough to begin, because from then on it is resolvable', () => {
        const s = createInitialState(NOW);
        s.inventory.wood = 1; s.inventory.stone = 0; s.inventory.fiber = 0;
        expect(canBeginConstruction(s, 'shelter')).toBe(true);
        expect(beginConstruction(s, 'shelter', 0, 0)).toBe(true);
        expect(s.construction!.contributed.wood).toBe(1);
    });

    it('refuses a SECOND frame while one still stands — one thing half-built at a time', () => {
        const s = framed();
        s.inventory.wood = 5;
        expect(canBeginConstruction(s, 'shelter')).toBe(false);
        expect(beginBlocker(s, 'shelter')).toMatch(/already have something half-built/i);
    });
});

describe('feeding it, across as many visits as it takes', () => {
    it('takes what you bring, and NEVER more than it needs', () => {
        //  The material-loss shape this project has been bitten by: pouring twenty wood into a
        //  frame that wants six and losing fourteen. Capped at the shortfall, per kind.
        const s = framed();
        s.inventory.wood = 100;
        const moved = contributeToSite(s);
        expect(moved.wood).toBe(TUNE.shelterWoodCost - 2);
        expect(s.construction!.contributed.wood).toBe(TUNE.shelterWoodCost);
        expect(s.inventory.wood, 'the frame swallowed wood it did not need').toBe(100 - (TUNE.shelterWoodCost - 2));
    });

    it('...and it can be fed a little at a time, over and over', () => {
        const s = framed();
        for (let visit = 0; visit < 6; visit += 1) {
            s.inventory.wood += 1; s.inventory.stone += 1; s.inventory.fiber += 1;
            contributeToSite(s);
        }
        expect(siteIsComplete(s.construction!), 'six visits of one each never finished it').toBe(true);
    });

    it('...and progress only ever goes up', () => {
        const s = framed();
        let last = siteProgress(s.construction!);
        expect(last).toBeGreaterThan(0);
        expect(last).toBeLessThan(1);
        for (let i = 0; i < 5; i += 1) {
            s.inventory.wood += 2; s.inventory.fiber += 1;
            contributeToSite(s);
            const now = siteProgress(s.construction!);
            expect(now, 'progress went backwards').toBeGreaterThanOrEqual(last);
            last = now;
        }
    });

    it('AN OPEN CRATE IS PART OF THE REACH — the regression the grouped sweep caught', () => {
        //  The whole-build path has always drawn from an open box (`drawIntoHands`), so a frame
        //  that read only the pack made the new economy strictly WORSE than the one it replaced:
        //  a survivor at their own open crate with twenty of everything and empty hands was told
        //  "you are carrying none of what it takes". Device read it as `built false · box fibre
        //  20 -> 15`.
        const s = createInitialState(NOW);
        s.player = { x: 0, y: 0 };
        s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
        expect(buildStorage(s, 6, 6)).toBe(true);
        for (const k of ALL_MATERIAL_KINDS) s.inventory[k] = 0;
        s.storage.stored.wood = 20; s.storage.stored.stone = 20; s.storage.stored.fiber = 20;

        //  Hands empty and the box CLOSED: correctly refused.
        expect(canBeginConstruction(s, 'shelter', false), 'a closed box was counted').toBe(false);
        //  ...and with it OPEN, the frame goes up and is fed straight out of the crate.
        expect(canBeginConstruction(s, 'shelter', true), 'the open box was not counted').toBe(true);
        expect(beginConstruction(s, 'shelter', 0, 0, true)).toBe(true);
        expect(siteIsComplete(s.construction!), 'a full crate did not fill the frame').toBe(true);
        expect(s.storage.stored.wood, 'the box was not drawn from').toBe(20 - TUNE.shelterWoodCost);
    });

    it('offers nothing to give when you carry nothing it wants, and says what that is', () => {
        const s = framed();
        for (const k of ALL_MATERIAL_KINDS) s.inventory[k] = 0;
        expect(canContribute(s)).toBe(false);
        expect(contributionAvailable(s, s.construction!)).toEqual({});
        //  ...and the sentence is about the FRAME, not about the empty pack.
        expect(siteShortfallNote(s.construction!)).toMatch(/still needs/i);
    });
});

describe('finishing it', () => {
    it('completes into a real shelter, at the FRAME’S site, and charges nothing more', () => {
        const s = framed();
        s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
        contributeToSite(s);
        const held = { ...s.inventory };
        expect(siteIsComplete(s.construction!)).toBe(true);

        expect(completeShelterFromSite(s)).toBe(true);
        expect(s.shelter.built).toBe(true);
        expect(s.shelter.x).toBe(0);
        expect(s.shelter.y).toBe(0);
        expect(s.construction, 'the frame outlived the shelter it became').toBeNull();
        //  PAID ON THE WAY IN. Charging again here would take the same wood twice.
        for (const k of ALL_MATERIAL_KINDS) {
            expect(s.inventory[k], `${k} was charged a second time at completion`).toBe(held[k]);
        }
        expect(s.shelter.durability).toBe(TUNE.structureDurabilityMax);
    });

    it('refuses to finish an underfed frame, and says what it wants', () => {
        const s = framed();
        expect(completeShelterFromSite(s)).toBe(false);
        expect(s.shelter.built).toBe(false);
        expect(s.construction, 'a refused completion consumed the frame').not.toBeNull();
    });
});

describe('A FRAME IS NOT A SHELTER — the safety property the whole design rests on', () => {
    it('nothing that asks "is there a shelter" can see a half-built one', () => {
        //  THE REASON THIS IS A SEPARATE FIELD. `shelter.built` has thirty-five readers and
        //  almost all mean "is there a working roof". If a frame could satisfy any of them, an
        //  empty structure would grant real protection.
        const s = framed();
        s.player = { x: 0, y: 0 };            // standing right at the frame
        expect(s.shelter.built, 'a frame reported itself as a built shelter').toBe(false);
        expect(isNearShelter(s), 'a frame counted as being near shelter').toBe(false);
    });

    it('...and a finished shelter is untouched by the new field', () => {
        const s = rich();
        expect(buildShelter(s, 5, 5)).toBe(true);
        expect(s.shelter.built).toBe(true);
        expect(s.construction, 'building the old way left a frame behind').toBeNull();
    });
});

describe('D-011 — an incomplete structure is as safe across an absence as a complete one', () => {
    it('NO LENGTH OF ABSENCE touches a frame: no decay, no loss, no penalty', () => {
        //  Structural rather than guarded: `reconcile` has no construction term at all, so
        //  there is no code that could apply one. This is the witness for that.
        const s = framed();
        const before = JSON.stringify(s.construction);
        const { state: later } = reconcile(s, 72 * 3600);   // three days away
        expect(JSON.stringify(later.construction), 'a frame changed while nobody was there').toBe(before);
    });

    it('...and it survives a save exactly as it stood', () => {
        const s = framed();
        const env = deserialize(serialize(s, NOW))!;
        expect(env.state.construction).not.toBeNull();
        expect(env.state.construction!.contributed.wood).toBe(2);
        expect(env.state.construction!.x).toBe(0);
    });

    it('a save from BEFORE the idea migrates in with no frame, and its shelter stays finished', () => {
        //  The migration invents nothing and loses nothing: a v35 survivor never had a frame,
        //  and their finished shelter is complete by definition under the new model.
        const old = rich();
        expect(buildShelter(old, 5, 5)).toBe(true);
        const raw = JSON.parse(serialize(old, NOW));
        raw.schemaVersion = 35;
        delete raw.state.construction;
        raw.state.schemaVersion = 35;

        const migrated = migrate(raw)!;
        expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
        expect(migrated.state.construction, 'the migration invented a frame').toBeNull();
        expect(migrated.state.shelter.built, 'a finished shelter came back unfinished').toBe(true);
    });
});

describe('REACHABILITY (D-090) — and never a dead end', () => {
    it('both new verbs are offered at the frame, and NOWHERE else', () => {
        const s = framed();
        const ids = verbsFor(s, 'construction').map((v) => v.id);
        expect(ids).toContain('add-materials');
        expect(ids).toContain('complete-build');
        expect(holdOpensCircle(s, 'construction'), 'the frame has no circle to offer them from').toBe(true);
        for (const t of ['pond', 'shelter', 'storage', 'fire', 'ground', 'workspace'] as const) {
            const other = verbsFor(s, t).map((v) => v.id);
            expect(other, `${t} offered add-materials`).not.toContain('add-materials');
            expect(other, `${t} offered complete-build`).not.toContain('complete-build');
        }
    });

    it('THERE IS ALWAYS SOMETHING TO DO at a frame, even carrying nothing', () => {
        //  D-184's law in its general form: a target may never claim a tap and then offer the
        //  player nothing they can act on. Move is the unconditional escape hatch.
        const s = framed();
        for (const k of ALL_MATERIAL_KINDS) s.inventory[k] = 0;
        const usable = availableVerbs(s, 'construction').map((v) => v.id);
        expect(usable.length, 'a frame with nothing to give offered no action at all').toBeGreaterThan(0);
        expect(usable, 'the frame could not even be moved').toContain('move-structure');
    });

    it('...and every blocked verb carries a reason (Law 26 — never a silent grey)', () => {
        const s = framed();
        for (const k of ALL_MATERIAL_KINDS) s.inventory[k] = 0;
        for (const v of verbsFor(s, 'construction')) {
            if (v.available) expect(v.reason, `${v.id} was available AND gave a reason`).toBeNull();
            else expect(v.reason, `${v.id} is blocked with no reason`).toBeTruthy();
        }
    });

    it('the frame can be MOVED, and carries what has been put into it', () => {
        const s = framed();
        expect(moveStructureBlocker(s, 'construction')).toBeNull();
        expect(structureSite(s, 'construction')).toEqual({ x: 0, y: 0 });
        expect(moveStructure(s, 'construction', 30, 30)).toBe(true);
        expect(s.construction!.x).toBe(30);
        expect(s.construction!.contributed.wood, 'moving the frame emptied it').toBe(2);
    });

    it('...and says so plainly when there is nothing half-built to move', () => {
        expect(moveStructureBlocker(poor(), 'construction')).toMatch(/nothing half-built/i);
    });
});
