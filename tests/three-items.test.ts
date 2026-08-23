/**
 * THREE ITEMS — the aimed reach, the moved structure, and the shell that was never lost.
 *
 * Each block states the reported symptom first and then what was actually true, because two
 * of the three were not the defect they were reported as, and a test that only asserted the
 * fix would lose that distinction the moment somebody re-reads this file.
 */
import { describe, expect, it } from 'vitest';
import {
    createInitialState, buildStorage, buildShelter, buildWorkmat,
    moveOneKind, storageContents, depositToStorage, withdrawFromStorage,
    moveStructure, canMoveStructure, moveStructureBlocker, structureSite,
} from '../src/brain/state';
import { siteIsViable, type MovableKind } from '../src/brain/construction';
import { canMakeShellCup, makeShellCup, fillVessel, boil, boilRefusalFor, vesselChip } from '../src/brain/vessel';
import { verbsFor, availableVerbs, tapEligibleVerbs, defaultVerb, holdOpensCircle } from '../src/brain/verbs';
import { serialize, deserialize } from '../src/brain/save';
import { reconcile } from '../src/brain/reconcile';
import { ALL_MATERIAL_KINDS } from '../src/brain/materials';
import { TUNE } from '../src/data/tune';
import { POND } from '../src/data/world';
import type { GameState } from '../src/brain/types';

const NOW = 1_770_000_000_000;

function stocked(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    s.inventory.wood = 20; s.inventory.stone = 20; s.inventory.fiber = 20;
    s.inventory.berries = 7; s.inventory.shell = 2;
    return s;
}

/** A survivor with a crate standing, something in it, and something still in hand. */
function atBox(): GameState {
    const s = stocked();
    expect(buildStorage(s, 6, 6), 'the crate refused a stocked survivor').toBe(true);
    s.inventory.wood = 12; s.inventory.stone = 9; s.inventory.fiber = 4; s.inventory.berries = 7;
    s.storage.stored.wood = 30; s.storage.stored.stone = 8; s.storage.stored.berries = 2;
    return s;
}

describe('ITEM 1 — the box can be reached into for ONE thing', () => {
    it('THE DEFECT, NAMED: both shipped acts are blanket sweeps across every kind', () => {
        //  Asserted rather than described, so "5 of everything" is a measured claim rather
        //  than a repeated complaint. If either sweep is ever narrowed this goes red and the
        //  premise gets re-read instead of being inherited.
        const a = atBox();
        const deposited = depositToStorage(a);
        expect(Object.keys(deposited.moved).length, 'deposit stopped being a sweep').toBeGreaterThan(1);
        expect(a.inventory.wood, 'deposit took a batch rather than the whole stack').toBe(0);

        const b = atBox();
        const taken = withdrawFromStorage(b);
        expect(Object.keys(taken.moved).length, 'withdraw stopped being a sweep').toBeGreaterThan(1);
    });

    it('...and the aimed reach moves exactly ONE kind, leaving every other stack alone', () => {
        const s = atBox();
        const before = { ...s.inventory };
        const boxBefore = { ...s.storage.stored };

        const r = moveOneKind(s, 'stone', 'withdraw');
        expect(r.ok).toBe(true);
        expect(r.action).toBe('withdraw');
        expect(Object.keys(r.moved)).toEqual(['stone']);
        expect(s.inventory.stone).toBe(before.stone + TUNE.storageWithdrawBatch);
        expect(s.storage.stored.stone).toBe((boxBefore.stone ?? 0) - TUNE.storageWithdrawBatch);
        //  THE WHOLE POINT OF THE ITEM: nothing else moved, in either direction.
        for (const k of ALL_MATERIAL_KINDS) {
            if (k === 'stone') continue;
            expect(s.inventory[k], `${k} left the pack on a stone withdrawal`).toBe(before[k]);
            expect(s.storage.stored[k] ?? 0, `${k} left the box on a stone withdrawal`).toBe(boxBefore[k] ?? 0);
        }
    });

    it('...and deposits the same way, one kind at a time', () => {
        const s = atBox();
        const before = { ...s.inventory };
        const r = moveOneKind(s, 'berries', 'deposit');
        expect(Object.keys(r.moved)).toEqual(['berries']);
        expect(s.inventory.berries).toBe(before.berries - Math.min(before.berries, TUNE.storageWithdrawBatch));
        expect(s.inventory.wood, 'a berry deposit emptied the wood as well').toBe(before.wood);
    });

    it('never moves more than is there, and never drives a stack negative', () => {
        const s = atBox();
        s.storage.stored.fiber = 2;               // less than one batch
        const r = moveOneKind(s, 'fiber', 'withdraw');
        expect(r.moved.fiber).toBe(2);
        expect(s.storage.stored.fiber).toBe(0);
        //  ...and asking again gets an honest no rather than a negative stack.
        const again = moveOneKind(s, 'fiber', 'withdraw');
        expect(again.ok).toBe(false);
        expect(s.storage.stored.fiber).toBe(0);
    });

    it('refuses when there is no crate, and when the amount is nonsense', () => {
        const none = stocked();
        expect(moveOneKind(none, 'wood', 'deposit').ok, 'stored into a crate that does not exist').toBe(false);
        const s = atBox();
        expect(moveOneKind(s, 'wood', 'deposit', 0).ok).toBe(false);
        expect(moveOneKind(s, 'wood', 'deposit', -5).ok).toBe(false);
        expect(moveOneKind(s, 'wood', 'deposit', Number.NaN).ok).toBe(false);
        expect(s.inventory.wood, 'a refused move still moved something').toBe(12);
    });

    it('the per-kind list is DERIVED, so a new material cannot become unofferable', () => {
        //  The exact drift that once left a survivor carrying only food with no storage button
        //  at all: the surface kept its own `['wood','stone','fiber']` while `STORABLE_KEYS`
        //  widened to every carried kind, and the two silently disagreed.
        const s = atBox();
        s.inventory.shell = 3;
        const kinds = storageContents(s).map((r) => r.kind);
        expect(kinds, 'a carried kind was missing from the box list').toContain('shell');
        expect(kinds).toContain('berries');
        //  Only what one side actually holds — a row for every material would be noise.
        expect(kinds).not.toContain('metal');
        const wood = storageContents(s).find((r) => r.kind === 'wood')!;
        expect(wood.carried).toBe(12);
        expect(wood.stored).toBe(30);
    });
});

describe('ITEM 2 — what you built can be picked up and put down again', () => {
    const ALL_MOVABLE: MovableKind[] = ['shelter', 'storage', 'fire', 'workspace'];

    function everything(): GameState {
        const s = stocked();
        s.inventory.wood = 60; s.inventory.stone = 60; s.inventory.fiber = 60;
        expect(buildShelter(s, 20, 0)).toBe(true);
        expect(buildStorage(s, 30, 0)).toBe(true);
        expect(buildWorkmat(s, 40, 0)).toBe(true);
        s.fire = { built: true, fuel: 12, x: 50, y: 0 };
        return s;
    }

    it('REACHABILITY (D-090): Move is offered at every movable thing and NOWHERE else', () => {
        const s = everything();
        for (const t of ['shelter', 'storage', 'fire', 'workspace'] as const) {
            expect(availableVerbs(s, t).map((v) => v.id), `${t} cannot be moved`).toContain('move-structure');
            expect(holdOpensCircle(s, t), `${t} has no circle to offer it from`).toBe(true);
        }
        for (const t of ['pond', 'boar', 'raft', 'ground', 'dropped'] as const) {
            expect(verbsFor(s, t).map((v) => v.id), `${t} offered a Move`).not.toContain('move-structure');
        }
    });

    it('...and it is HOLD-ONLY, so it can never tax a tap (the Default-Verb Law)', () => {
        const s = everything();
        //  A collapsed shelter has exactly one thing left to do, and a tap must still do it.
        //  An always-available verb is precisely what breaks that, which is why Move is absent
        //  from the tap-eligible set at every target it appears on. This is the assertion that
        //  went red when the verb was first written without `holdOnly`.
        s.shelter.durability = 0;
        //  STANDING AT IT, which is the only state its circle can be open in: a survivor
        //  arrives within `interactRadiusM` (2.5) and `canRepairStructure` asks for
        //  `shelterRadius` (6), so arrival always satisfies the mend gate. A fixture across
        //  the island would be asserting about a state the game cannot actually produce.
        s.player = { x: 20, y: 0 };
        expect(tapEligibleVerbs(s, 'shelter').map((v) => v.id)).not.toContain('move-structure');
        expect(defaultVerb(s, 'shelter')?.id, 'Move stole the tap from mending a wreck').toBe('mend');
        for (const t of ['shelter', 'storage', 'fire', 'workspace'] as const) {
            expect(defaultVerb(s, t)?.id, `${t} fires a move on a bare tap`).not.toBe('move-structure');
        }
    });

    it('carries the CONTENTS across — a crate is moved, never re-made', () => {
        const s = everything();
        s.storage.stored.wood = 17; s.storage.stored.berries = 3;
        s.storage.durability = 42;
        expect(moveStructure(s, 'storage', 30, 40)).toBe(true);
        expect(s.storage.x).toBe(30);
        expect(s.storage.y).toBe(40);
        expect(s.storage.stored.wood, 'the box was emptied by moving it').toBe(17);
        expect(s.storage.stored.berries).toBe(3);
        expect(s.storage.durability, 'moving it counted as wear').toBe(42);
    });

    it('...and the fire keeps burning, and the bench keeps its slack', () => {
        const s = everything();
        s.fire.fuel = 9;
        expect(moveStructure(s, 'fire', 50, 40)).toBe(true);
        expect(s.fire.fuel, 'moving the pit put the fire out').toBe(9);
        expect(s.fire.built).toBe(true);

        s.workspace = { ...s.workspace, tier: 'bench', jointWear: 0.4 };
        expect(moveStructure(s, 'workspace', 40, 40)).toBe(true);
        expect(s.workspace.tier).toBe('bench');
        expect(s.workspace.jointWear, 'the frame re-tensioned itself by being carried').toBe(0.4);
    });

    it('costs NOTHING — the thing it replaces is abandoning one and building a second', () => {
        const s = everything();
        const before = { ...s.inventory };
        expect(moveStructure(s, 'shelter', 20, 40)).toBe(true);
        for (const k of ALL_MATERIAL_KINDS) {
            expect(s.inventory[k], `${k} was charged for dragging a shelter`).toBe(before[k]);
        }
    });

    it('EXCLUDES ITSELF from the spacing rule — a thing is always beside itself', () => {
        const s = everything();
        //  Its own current spot must read as viable FOR THE MOVER and not for anything else.
        expect(siteIsViable(s, 20, 0, 'shelter'), 'a shelter could not stand where it stands').toBe(true);
        expect(siteIsViable(s, 20, 0), 'the spacing rule stopped seeing the shelter').toBe(false);
        //  ...but another structure's ring still refuses it, and a refusal moves nothing.
        expect(moveStructure(s, 'shelter', 30, 0), 'moved a shelter onto the crate').toBe(false);
        expect(s.shelter.x, 'a refused move moved it anyway').toBe(20);
    });

    it('refuses what does not exist, and names it', () => {
        const s = stocked();
        for (const kind of ALL_MOVABLE) {
            expect(canMoveStructure(s, kind), `${kind} was movable before it was built`).toBe(false);
            expect(moveStructureBlocker(s, kind), `${kind} refused without a reason`).toBeTruthy();
            expect(structureSite(s, kind)).toBeNull();
        }
    });

    it('D-011: NO LENGTH OF ABSENCE MOVES ANYTHING — there is no move term in reconcile', () => {
        //  The director asked specifically about a structure caught mid-move. There is no such
        //  state to be caught in: the armed "where?" lives in the body and is never
        //  serialized, and the move itself is a single write. So the only D-011 question left
        //  is whether time alone can move a building, and this is the witness that it cannot.
        const s = everything();
        const sites = ALL_MOVABLE.map((k) => structureSite(s, k)!);
        //  ELAPSED SECONDS, and `reconcile` returns a new state rather than mutating.
        const { state: later } = reconcile(s, 30 * 3600);   // thirty hours away
        ALL_MOVABLE.forEach((k, i) => {
            const after = structureSite(later, k)!;
            expect(after.x, `${k} drifted across an absence`).toBe(sites[i].x);
            expect(after.y, `${k} drifted across an absence`).toBe(sites[i].y);
        });
    });

    it('...and a move SURVIVES a save, because it is only where the thing is', () => {
        const s = everything();
        expect(moveStructure(s, 'storage', 30, 40)).toBe(true);
        const env = deserialize(serialize(s, NOW))!;
        expect(env.state.storage.x).toBe(30);
        expect(env.state.storage.y).toBe(40);
    });
});

describe('ITEM 3 — the coconut shell, and what actually happened to it', () => {
    function withShells(n: number): GameState {
        const s = stocked();
        s.inventory.shell = n;
        s.inventory.coconut = 0;
        s.player = { x: POND.x, y: POND.y };
        return s;
    }

    it('NO MATERIAL WAS LOST: the husk IS the cup, and the cup is really there', () => {
        //  REPORTED AS "2 shells became 1, with no filled shell anywhere in inventory". The
        //  first half is correct and by design — `makeShellCup` spends the husk, which is what
        //  a cup is made of. The second half was true of the SURFACE and not of the state: the
        //  cup lives in `state.water`, which only the Vitals tab ever rendered, so the pack
        //  showed a loss and no corresponding gain.
        const s = withShells(2);
        expect(canMakeShellCup(s)).toBe(true);
        expect(makeShellCup(s)).toBe(true);
        expect(s.inventory.shell, 'the husk was not spent').toBe(1);
        expect(s.water.vessel, 'a shell was spent and nothing came back').toBe('shell-cup');
    });

    it('...and the cup is legible where the survivor looked — a real inventory chip', () => {
        //  THE FIX. Without `vesselChip` there is no reading of the vessel anywhere on the
        //  strip, and that absence is the whole of what was reported as item loss.
        const s = withShells(2);
        makeShellCup(s);
        expect(vesselChip(s), 'the made cup has no chip').not.toBeNull();
        expect(vesselChip(s)!.state, 'a fresh cup did not read as empty').toBe('empty');
        expect(vesselChip(s)!.label).toBe('Cup');

        fillVessel(s);
        expect(vesselChip(s)!.state).toBe('raw');
        expect(vesselChip(s)!.sips).toBe(TUNE.shellCupSips);
    });

    it('...and it says BOILED once it is, which is the difference that matters', () => {
        const s = withShells(1);
        makeShellCup(s); fillVessel(s);
        s.fire = { built: true, fuel: 10, x: 0, y: 0 };
        expect(boil(s)).toBeGreaterThan(0);
        expect(vesselChip(s)!.state).toBe('clean');
    });

    it('a survivor with NO vessel has no chip — the strip stays quiet until there is one', () => {
        expect(vesselChip(stocked())).toBeNull();
    });

    it('WHY BOILING WAS DISABLED, in the game own words at every stage', () => {
        //  The second half of the report. Boiling was never broken: each refusal names the one
        //  true obstacle, and the FIRST of them is the one the director actually met — an
        //  empty cup he did not know he was carrying, because nothing had told him.
        const none = stocked();
        expect(boilRefusalFor(none)).toMatch(/nothing that would hold water/i);

        const empty = withShells(1);
        makeShellCup(empty);
        expect(boilRefusalFor(empty), 'an empty cup blamed the fire').toMatch(/nothing in it/i);

        const unlit = withShells(1);
        makeShellCup(unlit); fillVessel(unlit);
        expect(boilRefusalFor(unlit)).toMatch(/would need a fire/i);
        unlit.fire = { built: true, fuel: 0, x: 0, y: 0 };
        expect(boilRefusalFor(unlit)).toMatch(/fire is out/i);
        unlit.fire.fuel = 5;
        expect(boilRefusalFor(unlit), 'a filled cup at a lit fire still refused').toBeNull();
    });

    it('...and the whole sequence survives a save, so nothing vanishes on a reload', () => {
        const s = withShells(2);
        makeShellCup(s); fillVessel(s);
        const env = deserialize(serialize(s, NOW))!;
        expect(env.state.inventory.shell).toBe(1);
        expect(env.state.water.vessel).toBe('shell-cup');
        expect(env.state.water.rawSips).toBe(TUNE.shellCupSips);
    });

    it('a second cup is refused rather than eating a second husk', () => {
        //  The loss path that WOULD have been real, asserted so that it stays closed.
        const s = withShells(2);
        makeShellCup(s);
        expect(makeShellCup(s)).toBe(false);
        expect(s.inventory.shell, 'a refused cup still ate a husk').toBe(1);
    });
});
