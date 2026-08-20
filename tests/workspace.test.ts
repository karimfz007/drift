/**
 * THE WORKSPACE LADDER (SESSION 1) — BOUNDARY 3, closed.
 *
 * The third staging position had been blocked since Slice 2C on a physical enabler nobody
 * built. [[D-092]] recorded exactly why it stayed blocked rather than being half-shipped:
 * *"Building the gate without the enabler would make position 3 unreachable and would fail
 * the REACHABILITY-PROOF law at the first harness check. The gate and its enabler are one
 * piece of work and must ship together."* This file asserts both halves together.
 *
 * FOUR CLAIMS, each of which would rot silently:
 *
 *   1. LAW 220 IS A NUMBER NOW. Two relations in bare hands; three at a bench; and the term
 *      that lifts it reads the WORLD, never the survivor — *"experience alone does not create
 *      extra invisible hands."*
 *   2. THE BENCH OPENS OPERATIONS, NEVER RECIPES. Law 167/219, and an AUTOMATIC-FAILURE clause
 *      in two bibles: *"the design fails if a workbench adds recipes."* Building one must not
 *      change what the survivor knows by so much as one entry.
 *   3. UPKEEP FOLLOWS EVIDENCE, NOT A CLOCK. Law 181 forbids a universal repair meter, so
 *      slack accrues per USE — which also makes the whole loop D-011-safe by construction.
 *   4. THE LADDER IS ONE OBJECT. The bench is the mat, framed, in place.
 */
import { describe, expect, it } from 'vitest';
import {
    buildWorkbench, buildWorkmat, canBuildWorkbench, canBuildWorkmat, benchHasRacked,
    canRetensionBench, createInitialState, retensionBench, wearBenchJoints,
} from '../src/brain/state';
import { atWorkspace, canExperimentWith, combineSlate, recipeDisplayName, relationsFor } from '../src/brain/experiment';
import { allRecipes } from '../src/brain/recipes';
import { migrate, serialize, deserialize } from '../src/brain/save';
import { SCHEMA_VERSION, type GameState } from '../src/brain/types';
import { TUNE } from '../src/data/tune';

const NOW = 1_770_000_000_000;

/** Stocked, standing at the origin, with a hammer in the pack. */
function ready(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
    s.inventory.sharpblade = 5; s.inventory.stonehammer = 1;
    return s;
}

/** A survivor who has climbed the ladder for real, through the shipped builders. */
function benched(): GameState {
    const s = ready();
    expect(buildWorkmat(s, 0, 0), 'the mat refused a fully stocked survivor').toBe(true);
    expect(buildWorkbench(s), 'the bench refused a survivor standing at their own mat').toBe(true);
    return s;
}

describe('LAW 220 — slot count represents controlled relations', () => {
    it('bare hands hold two, and the number reads the WORLD rather than the survivor', () => {
        const s = ready();
        expect(relationsFor(s)).toBe(TUNE.relationsAtW0);
        //  "Experience alone does not create extra invisible hands" — the load-bearing half of
        //  the law. Max out every domain and capacity the game has and the answer must not move.
        for (const d of Object.values(s.knowledge.domains)) {
            d.technique = 100; d.understanding = 100; d.adaptation = 100;
        }
        for (const k of Object.keys(s.capacities) as Array<keyof typeof s.capacities>) {
            (s.capacities[k] as number) = 100;
        }
        expect(relationsFor(s), 'practice grew a third hand').toBe(TUNE.relationsAtW0);
    });

    it('a bench holds three — and only while you are standing at it', () => {
        const s = benched();
        expect(atWorkspace(s)).toBe(true);
        expect(relationsFor(s)).toBe(TUNE.relationsAtBench);

        s.player = { x: 60, y: 60 };
        expect(atWorkspace(s)).toBe(false);
        expect(relationsFor(s), 'a bench across the island held the work').toBe(TUNE.relationsAtW0);
    });

    it('THE MAT ADDS NOTHING — it is W0 made real, not a rung above it', () => {
        //  The v2.8 module table is explicit: `woven work mat`, `Relations added = 0`, and
        //  §6.1 lists `mat` inside the two-relation W0 row. The mat buys a place, not a hand.
        const s = ready();
        buildWorkmat(s, 0, 0);
        expect(s.workspace.tier).toBe('mat');
        expect(relationsFor(s)).toBe(TUNE.relationsAtW0);
    });

    it('racked joints hold nothing, and the bench is never deleted for it', () => {
        const s = benched();
        s.workspace.jointWear = 1;
        expect(benchHasRacked(s)).toBe(true);
        expect(relationsFor(s)).toBe(TUNE.relationsAtW0);
        expect(s.workspace.built, 'disrepair became deletion').toBe(true);
        expect(s.workspace.tier, 'a racked bench forgot it was a bench').toBe('bench');
    });

    it('the axe is what the third relation buys — refused bare-handed, made at the bench', () => {
        //  The amendment sheet's own example: "the workbench is the thing that holds what your
        //  second hand cannot." Haft, head and binding is the one genuine two-hand job.
        const bare = ready();
        expect(canExperimentWith(bare, ['wood', 'sharpblade', 'fiber'])).toMatch(/workbench/i);
        expect(canExperimentWith(benched(), ['wood', 'sharpblade', 'fiber'])).toBeNull();
    });

    it('...and the refusal names the ENABLER, never the outcome (Law 95)', () => {
        const said = canExperimentWith(ready(), ['wood', 'sharpblade', 'fiber']) ?? '';
        expect(said).toMatch(/workbench/i);
        for (const leak of [/axe/i, /haft/i, /blade/i]) {
            expect(said, `the refusal leaked the outcome: "${said}"`).not.toMatch(leak);
        }
    });
});

describe('LAW 167/219 — a workbench opens OPERATIONS, never recipes', () => {
    it('building the whole ladder changes what the survivor KNOWS by exactly nothing', () => {
        //  An AUTOMATIC-FAILURE clause in two bibles ("the design fails if a workbench adds
        //  recipes"), and a named forbidden UI string ("recipe unlocked by Workbench Level 2").
        //  Asserted against the real slate for a pile the bench genuinely unlocks the STAGING
        //  of, so this cannot pass by asking a question the bench was never near.
        const before = ready();
        const plansBefore = before.blueprints.map((b) => b.recipeId).sort();

        const after = benched();
        expect(after.blueprints.map((b) => b.recipeId).sort(), 'the bench minted a plan')
            .toEqual(plansBefore);

        //  The pile is now STAGEABLE where it was not — and still resolves to nothing named,
        //  because knowing is earned by doing and a bench does not do it for you.
        expect(canExperimentWith(after, ['wood', 'sharpblade', 'fiber'])).toBeNull();
        expect(combineSlate(after, ['wood', 'sharpblade', 'fiber']).known,
            'the bench handed over a named outcome').toEqual([]);
    });

    it('neither rung is named for the capability it carries', () => {
        //  "Workbench", never "Workbench (3 slots)".
        for (const id of ['workmat', 'workbench']) {
            const name = recipeDisplayName(id);
            expect(name).not.toMatch(/\d/);
            expect(name).not.toMatch(/slot|relation|position|level|tier|unlock/i);
        }
    });
});

describe('the ladder is ONE object, upgraded in place (D-165)', () => {
    it('the bench is the mat, framed — same ground, no second siting', () => {
        const s = ready();
        buildWorkmat(s, 7, -3);
        const { x, y } = s.workspace;
        //  Walk to the mat before framing it. Writing this test with the survivor left at the
        //  origin is what proved the standing-at-it rule has teeth: `buildWorkbench` refused
        //  outright at 7.6 m, and the tier stayed `mat`.
        s.player = { x: 7, y: -3 };
        buildWorkbench(s);
        expect(s.workspace.tier).toBe('bench');
        expect({ x: s.workspace.x, y: s.workspace.y },
            'the bench moved rather than upgrading where the work already was').toEqual({ x, y });
    });

    it('the bench needs a mat already laid, and the survivor standing at it', () => {
        const noMat = ready();
        expect(canBuildWorkbench(noMat), 'a bench framed onto bare ground').toBe(false);

        const away = ready();
        buildWorkmat(away, 0, 0);
        away.player = { x: 50, y: 50 };
        expect(canBuildWorkbench(away), 'a bench framed from across the island').toBe(false);
    });

    it('the hammer drives the pegs and is NEVER spent — the catalyst rule', () => {
        const s = ready();
        buildWorkmat(s, 0, 0);
        const hammersBefore = s.inventory.stonehammer;
        buildWorkbench(s);
        expect(s.inventory.stonehammer, 'the bench ate the hammer').toBe(hammersBefore);
    });

    it('...and without a hammer there is nothing to drive them with', () => {
        const s = ready();
        buildWorkmat(s, 0, 0);
        s.inventory.stonehammer = 0;
        expect(canBuildWorkbench(s)).toBe(false);
    });

    it('one workspace, not a field of them', () => {
        const s = benched();
        expect(canBuildWorkmat(s), 'a second work surface was allowed').toBe(false);
    });
});

describe('LAW 181 — maintenance follows evidence, never a repair meter', () => {
    it('slack accrues per USE, and a use is the only thing that moves it', () => {
        const s = benched();
        expect(s.workspace.jointWear).toBe(0);
        wearBenchJoints(s);
        expect(s.workspace.jointWear).toBeCloseTo(TUNE.benchJointWearPerUse, 6);
    });

    it('D-011 BY CONSTRUCTION — no elapsed time can rack a bench, at any length', () => {
        //  Not a guard that could be forgotten: there is no time term in the upkeep path at
        //  all, so this asserts the property through the real reconcile-and-return door.
        const s = benched();
        const before = s.workspace.jointWear;
        const away = deserialize(serialize(s, NOW));
        expect(away).not.toBeNull();
        expect(away!.state.workspace.jointWear, 'absence racked a bench nobody worked at')
            .toBe(before);
        expect(away!.state.workspace.tier).toBe('bench');
    });

    it('a mat has no joints to slacken', () => {
        const s = ready();
        buildWorkmat(s, 0, 0);
        wearBenchJoints(s);
        expect(s.workspace.jointWear).toBe(0);
    });

    it('re-tensioning costs cord and restores the third relation', () => {
        const s = benched();
        s.workspace.jointWear = 1;
        expect(relationsFor(s)).toBe(TUNE.relationsAtW0);
        const fibreBefore = s.inventory.fiber;

        expect(canRetensionBench(s)).toBe(true);
        expect(retensionBench(s)).toBe(true);
        expect(s.inventory.fiber).toBe(fibreBefore - TUNE.benchRetensionFiberCost);
        expect(s.workspace.jointWear).toBe(0);
        expect(relationsFor(s), 're-tensioning did not bring the third relation back')
            .toBe(TUNE.relationsAtBench);
    });

    it('...and a bench that is already tight is not a repair job', () => {
        expect(canRetensionBench(benched()), 'busywork on a sound frame').toBe(false);
    });
});

describe('REACHABILITY — the gate and its enabler shipped together (D-090/D-092)', () => {
    it('both rungs are buildable with the two relations a body already has', () => {
        for (const id of ['workmat', 'workbench']) {
            const recipe = allRecipes().find((r) => r.id === id)!;
            expect(recipe.slots.length, `${id} needs more hands than W0 has`)
                .toBeLessThanOrEqual(TUNE.relationsAtW0);
        }
    });

    it('a survivor who lands with nothing can reach the third relation through real builders', () => {
        //  End to end, through the shipped functions and nothing else: gather, lay, frame.
        const s = createInitialState(NOW);
        s.player = { x: 0, y: 0 };
        expect(relationsFor(s)).toBe(TUNE.relationsAtW0);

        s.inventory.fiber = TUNE.workmatFiberCost;
        s.inventory.stone = TUNE.workmatStoneCost;
        expect(canBuildWorkmat(s)).toBe(true);
        expect(buildWorkmat(s, 0, 0)).toBe(true);

        s.inventory.wood = TUNE.workbenchWoodCost;
        s.inventory.stonehammer = 1;
        expect(canBuildWorkbench(s)).toBe(true);
        expect(buildWorkbench(s)).toBe(true);
        expect(relationsFor(s)).toBe(TUNE.relationsAtBench);
    });
});

describe('save — a v34 save migrates to v35 with no workspace', () => {
    it('a returning survivor arrives without one, and without a third relation', () => {
        const v34 = {
            schemaVersion: 34,
            savedAtMs: NOW,
            state: { ...createInitialState(NOW), schemaVersion: 34 },
        } as unknown as Parameters<typeof migrate>[0];
        delete (v34.state as unknown as Record<string, unknown>).workspace;

        const out = migrate(v34);
        expect(out).not.toBeNull();
        expect(out!.schemaVersion).toBe(SCHEMA_VERSION);
        expect(out!.state.workspace.built, 'the migration handed over a bench nobody built')
            .toBe(false);
        expect(relationsFor(out!.state)).toBe(TUNE.relationsAtW0);
    });

    it('...and a workspace already standing survives the trip intact', () => {
        const s = benched();
        s.workspace.jointWear = 0.5;
        const round = deserialize(serialize(s, NOW));
        expect(round!.state.workspace).toEqual(s.workspace);
    });
});
