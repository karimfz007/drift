/**
 * THE DEVICE VERDICT ON ae0f62d — the brain half of P0-1 and P0-A.
 *
 * THE THEME OF EVERY ITEM IN THIS BATCH IS A CHECK THAT WATCHED THE WRONG THING. P0-4's spear
 * check passed 17/17 while the spear was invisible, because it witnessed `TOOL_IDS` and a panel
 * row instead of the hand. So these tests are written against the thing the Director actually
 * saw: what the counter counts, and what the button does on a life that has just begun.
 *
 * The render half (the spear's mesh, the cave's inner faces, the fire's falloff) cannot be
 * proven here and is not attempted here — it belongs to the device sweep, witnessing meshes and
 * materials directly. That split is the whole lesson of P0-B.
 */
import { describe, expect, it } from 'vitest';
import {
    canBuildFire,
    createInitialState,
    type GameState,
} from '../src/brain';
import { deserialize, migrate } from '../src/brain/save';
import { SCHEMA_VERSION } from '../src/brain/types';
import { suspicionFor } from '../src/brain/discovery';
import { TUNE, fireLoudnessAt } from '../src/data/tune';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => createInitialState(NOW);

// ---------------------------------------------------------------------------
describe('P0-1 — a bare-ground tap is COUNTED, because eight of them read as zero', () => {
    it('the trace starts the count at zero, as its own number', () => {
        const s = fresh();
        expect(s.trace.groundTaps).toBe(0);
        //  Not folded into `failedInteractionTaps`: that one counts refusals that SPOKE, and
        //  merging them would re-hide the distinction the Director's log turned on.
        expect(s.trace.failedInteractionTaps).toBe(0);
    });

    it('A SAVE WRITTEN BEFORE THIS FIELD EXISTED still loads, and reads zero', () => {
        //  WHY THERE IS NO MIGRATION, PROVEN RATHER THAN ASSERTED. `hydrate` merges
        //  `{ ...fresh.trace, ...old.trace }`, so an additive counter is supplied by the fresh
        //  side for any save that predates it. This test is what makes that claim checkable —
        //  without it, "no migration needed" is a belief about code I read once.
        const old = fresh() as unknown as Record<string, unknown>;
        const trace = { ...(old.trace as Record<string, unknown>) };
        delete trace.groundTaps;
        const envelope = { schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: { ...old, trace } };
        const loaded = migrate(deserialize(JSON.stringify(envelope))!);
        expect(loaded, 'a save without the new counter failed to load at all').not.toBeNull();
        expect(loaded!.state.trace.groundTaps).toBe(0);
    });

    it('...and an existing count is preserved, not reset by the merge', () => {
        const old = fresh();
        old.trace.groundTaps = 8;
        old.trace.failedInteractionTaps = 25;
        const envelope = { schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: old };
        const loaded = migrate(deserialize(JSON.stringify(envelope))!);
        expect(loaded!.state.trace.groundTaps, 'the merge overwrote a real count').toBe(8);
        expect(loaded!.state.trace.failedInteractionTaps).toBe(25);
    });
});

// ---------------------------------------------------------------------------
describe('P0-A — the fire button is offered when fire can be BUILT, not when it is imagined', () => {
    it('THE MEASUREMENT THAT EXPLAINS THE REPORT: one stick and one strand is "knowing fire"', () => {
        //  This is not the fix, it is the finding, pinned so it cannot drift unnoticed. Law
        //  113's scaffold is "need plus makings", and the need is felt from the first second
        //  ashore — so `suspected` turns true at a single wood and a single fibre. Whatever the
        //  affordance rule is, it is built on top of a threshold this low.
        const s = fresh();
        expect(suspicionFor(s, 'torch')?.suspected, 'a bare castaway already knew').toBe(false);
        expect(suspicionFor(s, 'torch')?.needFelt, 'the need is felt from the start').toBe(true);
        s.inventory.wood = 1;
        s.inventory.fiber = 1;
        expect(suspicionFor(s, 'torch')?.suspected).toBe(true);
    });

    it('a survivor holding LESS than a fire\'s worth of wood may not be offered one', () => {
        //  The Director's log: clock 0.34 h, no deaths, `msToFireLit` null — and the button was
        //  there. `wood > 0` was the old visibility rule and this is the case it let through.
        for (let wood = 0; wood < TUNE.woodPerFire; wood++) {
            const s = fresh();
            s.inventory.wood = wood;
            s.inventory.fiber = 1;
            expect(canBuildFire(s), `offered a fire holding ${wood} wood`).toBe(false);
        }
    });

    it('...and IS offered one the moment both halves are true', () => {
        const s = fresh();
        s.inventory.wood = TUNE.woodPerFire;
        s.inventory.fiber = 1;
        expect(canBuildFire(s)).toBe(true);
    });

    it('knowledge alone is never enough, and matter alone is never enough', () => {
        //  Both halves, independently — the shape of the bug was one layer checking one half.
        const knowsOnly = fresh();
        knowsOnly.inventory.wood = 1;
        knowsOnly.inventory.fiber = 1;
        expect(canBuildFire(knowsOnly), 'knowledge without the wood offered a fire').toBe(false);

        const matterOnly = fresh();
        matterOnly.inventory.wood = 99;
        matterOnly.inventory.fiber = 0;
        expect(suspicionFor(matterOnly, 'torch')?.suspected, 'wood alone taught fire').toBe(false);
        expect(canBuildFire(matterOnly), 'matter without the knowledge offered a fire').toBe(false);
    });

    it('a standing fire is never offered again, however much wood is carried', () => {
        const s = fresh();
        s.inventory.wood = 99;
        s.inventory.fiber = 9;
        s.fire = { built: true, fuel: 20, x: 0, y: 0 };
        expect(canBuildFire(s)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('P0-G — the fire falls off with distance, which the bench cannot hear', () => {
    //  THE DEVICE HARNESS CANNOT PROVE THIS HALF. Audio never decodes headless, so no gain node
    //  is ever created and reading it returns null forever. Reading the game's own computed
    //  factor instead proved vacuous — it stayed GREEN with the line that applies it removed.
    //  So the curve is proven here, where it is pure, and the device check proves only that the
    //  mixer was told. Two honest halves beat one confident whole.
    it('full inside the firelight, silent past the far radius, falling in between', () => {
        expect(fireLoudnessAt(0)).toBe(1);
        expect(fireLoudnessAt(TUNE.fireSoundFullAtM)).toBe(1);
        expect(fireLoudnessAt(TUNE.fireSoundSilentAtM)).toBe(0);
        expect(fireLoudnessAt(TUNE.fireSoundSilentAtM + 50)).toBe(0);
    });

    it('never rises as you walk away — monotonic, across the whole range', () => {
        let previous = Infinity;
        for (let m = 0; m <= TUNE.fireSoundSilentAtM + 10; m += 0.5) {
            const here = fireLoudnessAt(m);
            expect(here, `loudness ROSE at ${m} m`).toBeLessThanOrEqual(previous);
            expect(here).toBeGreaterThanOrEqual(0);
            expect(here).toBeLessThanOrEqual(1);
            previous = here;
        }
    });

    it('the two radii are ordered, so the curve can never divide by zero or invert', () => {
        expect(TUNE.fireSoundSilentAtM).toBeGreaterThan(TUNE.fireSoundFullAtM);
    });
});
