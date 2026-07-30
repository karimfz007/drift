/**
 * THE INVENTION PIVOT (Slice 2B Stage 2b) — what the Build panel is allowed to show.
 *
 * The test that matters most is the first one: at minute zero the panel is EMPTY. Everything
 * else in this stage is machinery in service of that one sentence. A castaway who has just
 * washed ashore does not know what a lean-to is, and the old panel told them anyway — five
 * rows, present from the first second, answering a question they had not earned the right to
 * ask. If that first test ever passes trivially again, the pivot has been undone.
 *
 * The second-most important is the pair around Law 113's scaffold: fire is authored, and the
 * scaffold must be a FLOOR for the inexperienced rather than a catalogue in a smaller font.
 * So it appears when the need and the makings are both real and not before — and, once
 * earned, it stops depending on the need at all, because knowledge does not switch off when
 * the sun comes up.
 */
import { describe, expect, it } from 'vitest';
import { SURVIVAL_BASIC, panelHints, revealedInPanel } from '../src/brain/reveal';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState, MaterialKind } from '../src/brain/types';

const PRE_LISTED = ['axe', 'torch', 'shelter', 'storage', 'stonehammer'];

function give(s: GameState, ...kinds: MaterialKind[]): GameState {
    for (const k of kinds) s.inventory[k] = (s.inventory[k] ?? 0) + 3;
    return s;
}

function hoursUntilHourOfDay(target: number): number {
    let delta = target - TUNE.startHourOfDay;
    while (delta < 0) delta += TUNE.gameHoursPerDay;
    return delta;
}
const AT_MIDDAY = hoursUntilHourOfDay(12);

/** Midday and warm — the absence of every night-need, so nothing is suspected by weather. */
function calm(s: GameState): GameState {
    s.gameHoursElapsed = AT_MIDDAY;
    s.warmth = 100;
    return s;
}

function withBlueprint(s: GameState, recipeId: string): GameState {
    const plan: Blueprint = {
        id: `bp-${recipeId}`, name: 'A plan', recipeId, inputs: ['wood'], version: 1,
        workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 3,
    };
    s.blueprints = [...s.blueprints, plan];
    return s;
}

describe('THE PIVOT — the panel starts empty', () => {
    it('a castaway who has just washed ashore is offered NOTHING', () => {
        const fresh = calm(createInitialState(0));
        for (const id of PRE_LISTED) {
            expect(revealedInPanel(fresh, id), `${id} is still being handed over`).toBe(false);
        }
    });

    it('and is not even hinted at, holding nothing', () => {
        expect(panelHints(calm(createInitialState(0)))).toEqual([]);
    });
});

describe('a row exists because you EARNED it', () => {
    it('a blueprint is the whole qualification — demonstrated or above', () => {
        const s = withBlueprint(calm(createInitialState(0)), 'axe');
        expect(revealedInPanel(s, 'axe')).toBe(true);
    });

    it('and it reveals ONLY that item — earning an axe teaches you nothing about storage', () => {
        const s = withBlueprint(calm(createInitialState(0)), 'axe');
        expect(revealedInPanel(s, 'storage')).toBe(false);
        expect(revealedInPanel(s, 'shelter')).toBe(false);
        expect(revealedInPanel(s, 'stonehammer')).toBe(false);
    });

    it('a suspicion alone is NOT enough for anything that is not survival-basic', () => {
        //  Cold, at night, holding every input for a shelter: the survivor has every reason
        //  to wonder, and wondering is not knowing. Try-Combine is the way through.
        const s = give(createInitialState(0), 'wood', 'stone', 'fiber');
        s.warmth = 0;
        expect(revealedInPanel(s, 'shelter')).toBe(false);
        expect(panelHints(s).map((h) => h.recipeId)).toContain('shelter');
    });
});

describe('Law 113 — fire is scaffolded, and the scaffold is a floor not a catalogue', () => {
    it('torch is the survival-basic list, explicitly and alone', () => {
        expect([...SURVIVAL_BASIC]).toEqual(['torch']);
    });

    it('NOT shown at minute zero, warm and empty-handed', () => {
        expect(revealedInPanel(calm(createInitialState(0)), 'torch')).toBe(false);
    });

    it('NOT shown to a cold survivor holding nothing — the makings are half the test', () => {
        const s = calm(createInitialState(0));
        s.warmth = 0;
        expect(revealedInPanel(s, 'torch')).toBe(false);
    });

    it('NOT shown to a warm survivor holding wood and fibre in daylight', () => {
        const s = calm(give(createInitialState(0), 'wood', 'fiber'));
        expect(revealedInPanel(s, 'torch')).toBe(false);
    });

    it('SHOWN when both are real — cold, and holding something that burns', () => {
        const s = calm(give(createInitialState(0), 'wood', 'fiber'));
        s.warmth = TUNE.warmthLowThreshold - 1;
        expect(revealedInPanel(s, 'torch')).toBe(true);
    });

    it('once EARNED it stops depending on the need — knowledge does not switch off at dawn', () => {
        const s = withBlueprint(calm(createInitialState(0)), 'torch');
        //  Warm, midday, empty-handed: every leg of the suspicion is false.
        expect(revealedInPanel(s, 'torch')).toBe(true);
    });

    it('the scaffold does not leak to the other four', () => {
        const s = give(createInitialState(0), 'wood', 'stone', 'fiber', 'sharpblade');
        s.warmth = 0;
        expect(revealedInPanel(s, 'torch'), 'survival-basic').toBe(true);
        for (const id of ['axe', 'shelter', 'storage', 'stonehammer']) {
            expect(revealedInPanel(s, id), id).toBe(false);
        }
    });
});

describe('the hints are the teaching half — never ship subtraction alone', () => {
    it('a suspected-but-unrevealed item hints, so an empty panel is an invitation', () => {
        const s = give(createInitialState(0), 'wood', 'stone', 'fiber');
        s.warmth = 0;
        const hints = panelHints(s);
        expect(hints.length).toBeGreaterThan(0);
        for (const h of hints) expect(h.prompt.length).toBeGreaterThan(0);
    });

    it('a REVEALED item stops hinting — the hint has done its work', () => {
        const s = calm(give(createInitialState(0), 'wood', 'fiber'));
        s.warmth = TUNE.warmthLowThreshold - 1;
        expect(revealedInPanel(s, 'torch')).toBe(true);
        expect(panelHints(s).map((h) => h.recipeId)).not.toContain('torch');
    });

    it('an EARNED item stops hinting too', () => {
        const s = withBlueprint(give(createInitialState(0), 'wood', 'stone', 'fiber'), 'shelter');
        s.warmth = 0;
        expect(panelHints(s).map((h) => h.recipeId)).not.toContain('shelter');
    });
});
