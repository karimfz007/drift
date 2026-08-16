/**
 * DISCOVERY ROUTES (Slice 2B Stage A).
 *
 * The pre-scan that opened this stage found that emptying the manufacture catalogue is a
 * DEPENDENCY INVERSION, not a deletion: thirty-one harness checks and a new player's whole
 * first night run through the catalogue. So the routes must exist before the list goes. The
 * first test below is that dependency written down — it fails the moment someone empties the
 * catalogue for an item nobody can arrive at, which is precisely the accident to prevent.
 *
 * The other property worth guarding hardest is the one that decides whether this pivot means
 * anything: a discovery prompt may describe a NEED and a MATERIAL, and may never name the
 * product. Told "build a lean-to", the catalogue is back — it has just been retyped one
 * sentence at a time, in a nicer font. That test borrows `affordance.ts`'s own detector so
 * the two layers cannot drift apart on what "naming the answer" means.
 */
import { describe, expect, it } from 'vitest';
import {
    DISCOVERY_ROUTES, activeSuspicions, hasDiscoveryRoute, hasHandled, suspicionFor,
} from '../src/brain/discovery';
import { namesAFinishedAnswer } from '../src/brain/affordance';
import { revealedInPanel } from '../src/brain/reveal';
import { ladderFor } from '../src/brain/ladder';
import { createInitialState } from '../src/brain/state';
import { allRecipes } from '../src/brain/recipes';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState, MaterialKind } from '../src/brain/types';

/** The five items the Build panel currently pre-lists — the ones the catalogue hands over. */
const PRE_LISTED = ['axe', 'torch', 'shelter', 'storage', 'stonehammer'];

function give(s: GameState, ...kinds: MaterialKind[]): GameState {
    for (const k of kinds) s.inventory[k] = (s.inventory[k] ?? 0) + 3;
    return s;
}

/**
 * The clock, read from TUNE rather than assumed. The run starts at hour 18 — the crash lands
 * you at dusk — so `gameHoursElapsed = 0` is ALREADY night, and a raw hour count means the
 * opposite of what it looks like. My first cut of these fixtures had day and night inverted
 * for exactly that reason. Deriving both from TUNE also means a retuned day length moves the
 * fixtures with it instead of quietly making them test the wrong half of the cycle.
 */
function hoursUntilHourOfDay(target: number): number {
    let delta = target - TUNE.startHourOfDay;
    while (delta < 0) delta += TUNE.gameHoursPerDay;
    return delta;
}
const AT_NIGHT = hoursUntilHourOfDay(TUNE.nightStartHour + 2);
const AT_MIDDAY = hoursUntilHourOfDay(12);

/** Night, which is the need behind torch and shelter both. */
function atNight(s: GameState): GameState {
    s.gameHoursElapsed = AT_NIGHT;
    return s;
}

/** Broad daylight, and warm — the absence of both night-needs. */
function atMidday(s: GameState): GameState {
    s.gameHoursElapsed = AT_MIDDAY;
    s.warmth = 100;
    return s;
}

describe('every pre-listed item has a route to it', () => {
    it('all five — this is the dependency the catalogue may not be emptied without', () => {
        for (const id of PRE_LISTED) {
            expect(hasDiscoveryRoute(id), `${id} has no discovery route`).toBe(true);
        }
    });

    it('every route points at a recipe that actually ships', () => {
        const shipped = new Set(allRecipes().map((r) => r.id));
        for (const route of DISCOVERY_ROUTES) {
            expect(shipped.has(route.recipeId), `${route.recipeId} is not a real recipe`).toBe(true);
        }
    });

    it('a recipe with no route reports so honestly rather than throwing', () => {
        expect(hasDiscoveryRoute('nonesuch')).toBe(false);
        expect(suspicionFor(createInitialState(0), 'nonesuch')).toBeNull();
    });
});

describe('a prompt may name a need and a material — never the product', () => {
    it('no route prompt names a finished answer', () => {
        for (const route of DISCOVERY_ROUTES) {
            expect(
                namesAFinishedAnswer(route.prompt),
                `${route.recipeId}: "${route.prompt}" hands over the answer`,
            ).toBe(false);
        }
    });

    it('no prompt contains the product it leads to, spelled out', () => {
        //  The blunt version of the same rule. "Build a shelter" would pass a regex sweep
        //  written for other phrasings; the product's own name never appears, full stop.
        for (const route of DISCOVERY_ROUTES) {
            expect(route.prompt.toLowerCase()).not.toContain(route.recipeId.toLowerCase());
        }
    });
});

describe('all three legs, or no suspicion', () => {
    it('the need alone, with nothing in hand, is not an idea', () => {
        const s = atNight(createInitialState(0));
        const sus = suspicionFor(s, 'shelter')!;
        expect(sus.needFelt).toBe(true);
        expect(sus.suspected).toBe(false);
        expect(sus.prompt).toBeNull();
    });

    it('the makings alone, with no need, is not an idea either', () => {
        const s = atMidday(give(createInitialState(0), 'wood', 'stone', 'fiber'));
        const sus = suspicionFor(s, 'shelter')!;
        expect(sus.needFelt).toBe(false);
        expect(sus.suspected).toBe(false);
    });

    it('a PARTIAL handful is not the beginning of an idea', () => {
        const s = give(atNight(createInitialState(0)), 'wood', 'stone');   // no fibre
        const sus = suspicionFor(s, 'shelter')!;
        expect(sus.needFelt).toBe(true);
        expect(sus.missing).toEqual(['fiber']);
        expect(sus.suspected).toBe(false);
    });

    it('need plus every making is a survivor with a reason to wonder', () => {
        const s = give(atNight(createInitialState(0)), 'wood', 'stone', 'fiber');
        const sus = suspicionFor(s, 'shelter')!;
        expect(sus.suspected).toBe(true);
        expect(sus.missing).toEqual([]);
        expect(sus.prompt).toBeTruthy();
    });
});

describe('each of the five needs is a real reading of state', () => {
    it('torch — THE CLOCK NO LONGER DECIDES: warm, in broad daylight, still suspected', () => {
        //  SUPERSEDED BY THE DIRECTOR'S RULING, and this test is rewritten rather than deleted
        //  so the reversal is legible. It used to assert the opposite of its first line — that
        //  midday with the makings in hand suspected NOTHING — because the route's need was
        //  `isNight || cold`. The ruling is that a survivor holding a stick and dry fibre can
        //  work out what they are for at any hour.
        const day = atMidday(give(createInitialState(0), 'wood', 'fiber'));
        day.warmth = TUNE.warmthMax;
        expect(suspicionFor(day, 'torch')!.suspected, 'daylight still withheld the idea').toBe(true);
        expect(suspicionFor(atNight(day), 'torch')!.suspected, 'and night must not have lost it').toBe(true);
    });

    it('torch — ...but the MAKINGS still gate it, which is the half that did not change', () => {
        //  The scaffold is unconditional in TIME and not in MATTER. Wood alone is not a torch
        //  route, and a survivor holding nothing is not handed the thought.
        const empty = atNight(createInitialState(0));
        expect(suspicionFor(empty, 'torch')!.suspected, 'suspected with empty hands').toBe(false);
        const woodOnly = atNight(give(createInitialState(0), 'wood'));
        expect(suspicionFor(woodOnly, 'torch')!.suspected, 'suspected on wood alone').toBe(false);
    });

    it('torch — ...and a suspicion is still NOT a row (Law 95 / the invention pivot)', () => {
        const day = atMidday(give(createInitialState(0), 'wood', 'fiber'));
        expect(suspicionFor(day, 'torch')!.suspected).toBe(true);
        expect(revealedInPanel(day, 'torch'), 'a daylight hunch minted a Build row').toBe(false);
    });

    it('axe — a blade in the palm, and no axe yet', () => {
        const s = atMidday(give(createInitialState(0), 'wood', 'fiber', 'sharpblade'));
        expect(suspicionFor(s, 'axe')!.suspected).toBe(true);
        s.tools.axe = true;
        expect(suspicionFor(s, 'axe')!.suspected, 'already has one').toBe(false);
    });

    it('axe — no blade means no question; the handle idea comes FROM the blade', () => {
        const s = atMidday(give(createInitialState(0), 'wood', 'fiber'));
        expect(suspicionFor(s, 'axe')!.needFelt).toBe(false);
    });

    it('stonehammer — stone that will not yield, and no hammer yet', () => {
        const s = atMidday(give(createInitialState(0), 'wood', 'stone'));
        expect(suspicionFor(s, 'stonehammer')!.suspected).toBe(true);
        s.tools.stoneHammer = true;
        expect(suspicionFor(s, 'stonehammer')!.suspected).toBe(false);
    });

    it('storage — arms full, which is a count of KINDS, not of mass', () => {
        const s = atMidday(createInitialState(0));
        give(s, 'wood', 'stone');                       // two kinds
        expect(suspicionFor(s, 'storage')!.needFelt).toBe(false);
        give(s, 'fiber');                               // three
        expect(suspicionFor(s, 'storage')!.needFelt).toBe(true);
        expect(suspicionFor(s, 'storage')!.suspected).toBe(true);
    });

    it('storage — a built one ends the question', () => {
        const s = atMidday(give(createInitialState(0), 'wood', 'stone', 'fiber'));
        s.storage.built = true;
        expect(suspicionFor(s, 'storage')!.suspected).toBe(false);
    });

    it('shelter — a built one ends the question even on the coldest night', () => {
        const s = give(atNight(createInitialState(0)), 'wood', 'stone', 'fiber');
        s.warmth = 0;
        s.shelter.built = true;
        expect(suspicionFor(s, 'shelter')!.suspected).toBe(false);
    });
});

describe('a suspicion moves the ladder — up, and only up', () => {
    it('need plus makings lifts a recipe off the bottom rung', () => {
        const bare = createInitialState(0);
        expect(ladderFor(bare, 'shelter')).toBe('physically-possible');
        const wondering = give(atNight(createInitialState(0)), 'wood', 'stone', 'fiber');
        expect(ladderFor(wondering, 'shelter')).toBe('conceptually-suspected');
    });

    it('MONOTONIC — a fired suspicion never pulls a known thing back down', () => {
        //  The rule that must hold for every reader of the spine: knowledge does not fall.
        //  A survivor who has BUILT a shelter and then stands cold in the dark holding timber
        //  has not forgotten how. `conceptually-suspected` sits below `demonstrated`, so a
        //  reader that checked suspicion first would do exactly that damage.
        const s = give(atNight(createInitialState(0)), 'wood', 'stone', 'fiber');
        const plan: Blueprint = {
            id: 'bp-shelter', name: 'A plan', recipeId: 'shelter', inputs: ['wood'],
            version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 3,
        };
        s.blueprints = [plan];
        expect(suspicionFor(s, 'shelter')!.suspected, 'the suspicion IS firing').toBe(true);
        expect(ladderFor(s, 'shelter')).toBe('demonstrated');
    });

    it('a recipe with no route is unaffected — discovery adds, it never subtracts', () => {
        const s = give(atNight(createInitialState(0)), 'wood', 'stone', 'fiber');
        expect(hasDiscoveryRoute('knap')).toBe(false);
        expect(ladderFor(s, 'knap')).toBe('physically-possible');
    });
});

describe('the active set is what the survivor could be wondering right now', () => {
    it('empty at the start — a castaway with nothing in hand wonders nothing', () => {
        expect(activeSuspicions(createInitialState(0))).toEqual([]);
    });

    it('several at once, and every one of them genuinely suspected', () => {
        const s = give(atNight(createInitialState(0)), 'wood', 'stone', 'fiber');
        const active = activeSuspicions(s);
        expect(active.length).toBeGreaterThanOrEqual(3);
        for (const sus of active) expect(sus.suspected).toBe(true);
        expect(active.map((a) => a.recipeId)).toContain('shelter');
    });

    it('handled reads the pack — the interim signal, stated as such in the module', () => {
        const s = createInitialState(0);
        expect(hasHandled(s, 'stone')).toBe(false);
        give(s, 'stone');
        expect(hasHandled(s, 'stone')).toBe(true);
    });
});
