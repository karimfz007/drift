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
 *   1. LAW 220 IS A NUMBER NOW. Two relations in bare hands; three on a laid mat; four at a
 *      framed bench; and the term that lifts it reads the WORLD, never the survivor —
 *      *"experience alone does not create extra invisible hands."* The mat's rung was a 2
 *      until [[D-182]], on a reading of §6.1's W0 row that turned out to close the only route
 *      to a three-part tool; Law 220's own *"added surfaces ... expand controlled relations"*
 *      is what the revision rests on.
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
    createInitialState, wearBenchJoints,
    buildShelter, buildStorage, makerBlocker, repairStructure,
} from '../src/brain/state';
import { atWorkspace, canExperimentWith, combineSlate, recipeDisplayName, relationsFor } from '../src/brain/experiment';
import { allRecipes } from '../src/brain/recipes';
import { migrate, serialize, deserialize } from '../src/brain/save';
import { reconcile } from '../src/brain/reconcile';
import { SCHEMA_VERSION, type GameState } from '../src/brain/types';
import { TUNE } from '../src/data/tune';

const NOW = 1_770_000_000_000;

/** Stocked, standing at the origin, with a hammer in the pack. */
function ready(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 0 };
    s.inventory.wood = 40; s.inventory.stone = 40; s.inventory.fiber = 40;
    s.inventory.sharpblade = 5; s.inventory.stonehammer = 1;
    //  SESSION 4 — AND THE HANDS TO FRAME WITH. The bench asks for `construction` technique
    //  now, not only for timber, so a fixture that stocked a pack and nothing else described a
    //  survivor who could not build the thing this file is about. Seeded rather than ground out
    //  through four real builds, because every test below is about the LADDER and not about how
    //  the joinery was earned — `the gate is real` and `it is reachable by ordinary building`
    //  below prove that half directly, through the shipped builders and nothing else.
    s.knowledge.domains.construction.technique = TUNE.benchJoineryTechnique;
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

    it('THE MAT IS A RUNG — a laid surface holds three, bare hands hold two', () => {
        //  REVISED after a FOURTH report of the axe being unmakeable. The mat used to add
        //  nothing, on the reading that §6.1 lists `mat` inside the two-relation W0 row — but
        //  that row is what a survivor IMPROVISES with having built nothing, and Law 220's own
        //  sentence is the authority over the table: *"ADDED SURFACES, clamps, pegs, jigs and
        //  fixtures expand controlled relations."* A woven mat, gathered and laid, is an added
        //  surface. The old reading also closed the only route in: a three-part tool needed the
        //  bench, the bench needs six timber, and cutting timber wants the axe.
        const s = ready();
        buildWorkmat(s, 0, 0);
        expect(s.workspace.tier).toBe('mat');
        expect(relationsFor(s)).toBe(TUNE.relationsAtMat);
        expect(TUNE.relationsAtMat, 'the mat stopped being a rung above bare hands')
            .toBeGreaterThan(TUNE.relationsAtW0);
        expect(TUNE.relationsAtBench, 'the bench stopped being worth framing')
            .toBeGreaterThan(TUNE.relationsAtMat);
    });

    it('racked joints hold nothing, and the bench is never deleted for it', () => {
        const s = benched();
        s.workspace.jointWear = 1;
        expect(benchHasRacked(s)).toBe(true);
        //  A RACKED FRAME FALLS BACK TO THE SURFACE UNDER IT, not to bare hands. The joints
        //  are what moved; the top is still a top, and it is still where the work is. Charging
        //  the mat's relation as well would be billing twice for one failure.
        expect(relationsFor(s)).toBe(TUNE.relationsAtMat);
        expect(s.workspace.built, 'disrepair became deletion').toBe(true);
        expect(s.workspace.tier, 'a racked bench forgot it was a bench').toBe('bench');
    });

    it('the axe is what the third relation buys — refused bare-handed, made on a laid mat', () => {
        //  The amendment sheet's own example: "the workbench is the thing that holds what your
        //  second hand cannot." Haft, head and binding is the one genuine two-hand job — and
        //  after four reports of it being unmakeable, the surface that holds it is the MAT,
        //  which a survivor can weave and lay on their first day. The bench still buys the
        //  fourth relation above it.
        const bare = ready();
        expect(canExperimentWith(bare, ['wood', 'sharpblade', 'fiber']), 'bare hands held three')
            .toBeTruthy();

        const matted = ready();
        expect(buildWorkmat(matted, 0, 0)).toBe(true);
        expect(canExperimentWith(matted, ['wood', 'sharpblade', 'fiber']),
            'THE FOUR-TIMES-REPORTED DEFECT: a laid mat, stood on, still refused the axe').toBeNull();
        expect(canExperimentWith(benched(), ['wood', 'sharpblade', 'fiber'])).toBeNull();
    });

    it('...and the refusal names the ENABLER, never the outcome (Law 95)', () => {
        //  NAMES THE NEAREST RUNG, not the top one. `canBuildWorkbench` requires an existing
        //  mat ([[D-165]], upgrade in place), so a bench is never one step away from nothing —
        //  pointing a castaway at it would send them after six timber they cannot yet cut.
        const said = canExperimentWith(ready(), ['wood', 'sharpblade', 'fiber']) ?? '';
        expect(said, 'sent a survivor with nothing laid to the far rung').toMatch(/mat/i);
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
        //  THIS TEST WAS VACUOUS AND AN AUDIT CAUGHT IT. It round-tripped the state through
        //  `serialize`/`deserialize` and compared the result — but a round-trip ADVANCES NO
        //  TIME, so it proved only that a number survives JSON. The claim is about ELAPSED
        //  TIME, so it has to run the thing that elapses it.
        //
        //  Started MID-RANGE, deliberately. At 0 an increase is detectable but a decrease is
        //  not, and at 1 nothing can move at all — 1 is simultaneously the clamp ceiling of
        //  the only writer (`Math.min(1, ...)`) and the racked threshold, so a fixture pinned
        //  there cannot fail in the one direction the claim forbids. The same mistake sits in
        //  the device section's own absence check, and was fixed there too.
        const s = benched();
        s.workspace.jointWear = 0.4;
        const { state: after } = reconcile(s, 60 * 60 * 8); // eight real hours away
        expect(after.workspace.jointWear, 'time alone moved the joints').toBe(0.4);
        expect(after.workspace.tier).toBe('bench');
        expect(benchHasRacked(after), 'an absence racked a bench nobody worked at').toBe(false);
    });

    it('a mat has no joints to slacken', () => {
        const s = ready();
        buildWorkmat(s, 0, 0);
        wearBenchJoints(s);
        expect(s.workspace.jointWear).toBe(0);
    });

    it('A RACKED FRAME IS ESCAPABLE — the gate shipped with its own way out (D-092)', () => {
        //  THE SOFT-LOCK THIS SLICE VERY NEARLY SHIPPED. Racking was wired and the escape was
        //  not: a racked bench could not be re-tensioned (nothing called the function that
        //  did it), not replaced (`canBuildWorkmat` demanded `!built`) and not re-framed
        //  (`canBuildWorkbench` demands `tier === 'mat'`). Thirteen bench-assisted combines
        //  and the third relation — and the axe with it — was gone from that save for good.
        //
        //  Driven end to end through the real builders, because the claim is REACHABILITY and
        //  a reachability claim proved by hand-assignment proves nothing.
        const s = benched();
        for (let i = 0; i < 100 && !benchHasRacked(s); i += 1) wearBenchJoints(s);
        expect(benchHasRacked(s), 'the bench never racked, so the escape is untested').toBe(true);
        expect(relationsFor(s), 'racking cost the surface as well as the frame').toBe(TUNE.relationsAtMat);

        s.inventory.fiber = TUNE.workmatFiberCost;
        s.inventory.stone = TUNE.workmatStoneCost;
        expect(canBuildWorkmat(s), 'a racked frame is a dead end — no way back to a work surface').toBe(true);
        expect(buildWorkmat(s, s.player.x, s.player.y)).toBe(true);
        expect(s.workspace.tier).toBe('mat');
        expect(s.workspace.jointWear).toBe(0);

        s.inventory.wood = TUNE.workbenchWoodCost;
        expect(canBuildWorkbench(s)).toBe(true);
        expect(buildWorkbench(s)).toBe(true);
        expect(relationsFor(s), 'the third relation never came back').toBe(TUNE.relationsAtBench);
    });

    it('...and a SOUND bench still refuses a second mat — one work surface, not a field of them', () => {
        //  The other side of the exemption above, so "escapable" cannot be over-read into
        //  "re-layable whenever you like".
        const s = benched();
        s.inventory.fiber = 40; s.inventory.stone = 40;
        expect(canBuildWorkmat(s), 'a working bench was paved over').toBe(false);
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
        //  End to end, through the shipped functions and nothing else: gather, lay, raise,
        //  store, frame. SESSION 4 ADDED TWO RUNGS TO THIS WALK and the law is unchanged — the
        //  bench now asks for `construction` technique as well as timber, so the proof has to
        //  show a survivor EARNING it rather than being handed it. Every builder used here
        //  works bare-handed or on the ground, which is why the gate cannot lock itself.
        const s = createInitialState(NOW);
        s.player = { x: 0, y: 0 };
        expect(relationsFor(s)).toBe(TUNE.relationsAtW0);

        s.inventory.fiber = TUNE.workmatFiberCost;
        s.inventory.stone = TUNE.workmatStoneCost;
        expect(canBuildWorkmat(s)).toBe(true);
        expect(buildWorkmat(s, 0, 0)).toBe(true);

        //  ...and a survivor who has laid one mat has not yet framed anything square.
        s.inventory.wood = TUNE.workbenchWoodCost;
        s.inventory.stonehammer = 1;
        expect(canBuildWorkbench(s), 'a single mat framed a bench').toBe(false);

        //  The other two things there are to build, both reachable with the hands they landed
        //  with: a shelter rests on the ground, a crate is two materials.
        s.inventory.wood += TUNE.shelterWoodCost + TUNE.storageWoodCost;
        s.inventory.stone += TUNE.shelterStoneCost + TUNE.storageStoneCost;
        s.inventory.fiber += TUNE.shelterFiberCost;
        expect(buildShelter(s, 6, 0), 'the shelter refused a stocked survivor').toBe(true);
        expect(buildStorage(s, -6, 0), 'the crate refused a stocked survivor').toBe(true);

        s.player = { x: 0, y: 0 };
        expect(canBuildWorkbench(s), 'three real builds did not earn the joinery').toBe(true);
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

describe('SESSION 4 — THE BENCH ASKS FOR HANDS, NOT ONLY TIMBER', () => {
    /**
     * A bench is the first thing on this island that is JOINED rather than piled, lashed or
     * propped — legs framed square to a surface and pegged true enough to hold work steady.
     * Six timber and a hammer never said that: it is what a lean-to costs, and a survivor who
     * had built nothing could frame a cabinetmaker's bench on their first afternoon.
     */
    it('THE GATE IS REAL: a stocked survivor who has built nothing cannot frame one', () => {
        const s = ready();
        s.knowledge.domains.construction.technique = TUNE.knowledgeInnateFloor;
        expect(buildWorkmat(s, 0, 0)).toBe(true);
        expect(canBuildWorkbench(s), 'timber alone framed a bench').toBe(false);
        expect(buildWorkbench(s), 'and it built one anyway').toBe(false);
        //  ...and it took nothing on the way out. A refusal that spent six wood is a trap.
        expect(s.inventory.wood).toBe(40 - TUNE.workmatFiberCost * 0);
        expect(s.workspace.tier).toBe('mat');
    });

    it('...and the refusal names the real gap, and only work that exists here', () => {
        const s = ready();
        s.knowledge.domains.construction.technique = TUNE.knowledgeInnateFloor;
        buildWorkmat(s, 0, 0);
        const why = makerBlocker(s, 'workbench') ?? '';
        //  It says what is short — the hands, not the timber.
        expect(why).toMatch(/finer work|framed square/i);
        //  ...and names acts this island really contains and that really train `construction`.
        expect(why, 'names no real way to close the gap').toMatch(/shelter|store|mend/i);
        //  D-194's law: no enabler that does not exist. There is one survivor and one island.
        expect(why).not.toMatch(/\b(someone|somebody|anyone|practise|practice)\b/i);
    });

    it('IT IS REACHABLE BY ORDINARY BUILDING — no deadlock, through real builders only', () => {
        //  THE SEQUENCING PROOF. Every producer of `construction` used here works bare-handed
        //  or on the ground, before any bench exists — so the bench can never be locked behind
        //  itself. Technique climbs 1.35 x (1 - t/100) from a floor of 5: 6.28, 7.55, 8.80,
        //  which is why the threshold is the THIRD build.
        const s = ready();
        s.knowledge.domains.construction.technique = TUNE.knowledgeInnateFloor;
        s.player = { x: 0, y: 0 };

        expect(buildWorkmat(s, 0, 0), 'the mat refused').toBe(true);            // 1
        s.player = { x: 0, y: 0 };
        expect(canBuildWorkbench(s), 'one build opened it').toBe(false);
        expect(buildShelter(s, 6, 0), 'the shelter refused').toBe(true);        // 2
        s.player = { x: 0, y: 0 };
        expect(canBuildWorkbench(s), 'two builds opened it').toBe(false);
        expect(buildStorage(s, -6, 0), 'the store refused').toBe(true);         // 3

        expect(s.knowledge.domains.construction.technique)
            .toBeGreaterThanOrEqual(TUNE.benchJoineryTechnique);
        s.player = { x: 0, y: 0 };
        expect(canBuildWorkbench(s), 'three real builds did not open the bench').toBe(true);
        expect(buildWorkbench(s)).toBe(true);
        expect(s.workspace.tier).toBe('bench');
    });
});

describe('SESSION 4 — THE SUCCESSOR CASE, which is where the gate bites hardest', () => {
    /**
     * `succession.ts` is explicit: **knowledge does not transfer.** A new survivor starts every
     * domain at the innate floor and inherits the island's structures STANDING — so the body
     * most likely to meet the joinery refusal is one holding a hammer beside a shelter and a
     * store they cannot build, because both already exist and both builders refuse a second.
     *
     * That is the exact shape [[D-194]] was written for: advice that cannot be taken. It is
     * also the exact shape a deadlock would take, so both halves are asserted here.
     */
    function inheritor(): GameState {
        const s = ready();
        //  The island as it was left, and hands as new as the day they washed up.
        expect(buildShelter(s, 6, 0)).toBe(true);
        expect(buildStorage(s, -6, 0)).toBe(true);
        s.knowledge.domains.construction.technique = TUNE.knowledgeInnateFloor;
        s.player = { x: 0, y: 0 };
        return s;
    }

    it('the refusal does not tell them to build what is already standing', () => {
        const s = inheritor();
        buildWorkmat(s, 0, 0);
        const why = makerBlocker(s, 'workbench') ?? '';
        expect(why, 'still says what is short').toMatch(/finer work/i);
        //  IMPOSSIBLE ADVICE, by name: both of these refuse for this survivor.
        expect(why, 'told a successor to raise a shelter that is already up').not.toMatch(/raise a shelter/i);
        expect(why, 'told a successor to build a store that is already built').not.toMatch(/build a store/i);
        //  ...and it names the one thing that IS open to them.
        expect(why).toMatch(/mend/i);
    });

    it('...and they are not deadlocked: mending is repeatable and decay always supplies it', () => {
        const s = inheritor();
        expect(buildWorkmat(s, 0, 0)).toBe(true);
        expect(canBuildWorkbench(s), 'a fresh successor framed a bench').toBe(false);

        //  Weather does this on its own — `reconcile` decays durability every game hour. Done
        //  directly here so the test asserts the RECOVERY and not the clock.
        for (let i = 0; i < 12 && !canBuildWorkbench(s); i++) {
            s.shelter.durability = TUNE.structureDurabilityMax - 5;
            s.storage.durability = TUNE.structureDurabilityMax - 5;
            s.player = { x: s.shelter.x, y: s.shelter.y };
            repairStructure(s, 'shelter');
            s.player = { x: s.storage.x, y: s.storage.y };
            repairStructure(s, 'storage');
            s.player = { x: 0, y: 0 };
        }
        expect(canBuildWorkbench(s), 'a successor could never reframe the bench').toBe(true);
    });
});
