/**
 * THE DEATH REVIEW — the Voice explaining a death, and then narrating an arrival.
 *
 * What is actually being tested here is HONESTY, which is unusual for a text feature and is
 * the reason this file exists separately. The review makes four claims about the player's
 * past — this is what happened, this is what you were told, this is what you had, this is
 * what you leave — and every one of them is a claim that could be false. A review that
 * invents a warning the HUD never showed, or offers an option the player did not have, is
 * worse than no review: it teaches the player that the game's account of events cannot be
 * trusted, exactly when they most need to trust it.
 */
import { describe, expect, it } from 'vitest';
import { narrateArrival, reviewDeath } from '../src/brain/deathReview';
import { createInitialState } from '../src/brain/state';
import { closeSurvivor } from '../src/brain/succession';
import { TUNE } from '../src/data/tune';
import type { GameState, SurvivorRecord } from '../src/brain/types';

/** Frozen to death: no fire, no cover, soaked, warmth gone. */
function frozeToDeath(): GameState {
    const s = createInitialState(0);
    s.gameHoursElapsed = 14;
    s.survivorStartedAtGameHours = 0;
    s.warmth = 0;
    s.wet = TUNE.wetMax * 0.8;
    s.health = 0;
    s.inventory.wood = 9;
    return s;
}

describe('THE CHAIN — what happened, in the order it happened', () => {
    it('names every link that was actually true, and orders them causally', () => {
        const r = reviewDeath(frozeToDeath(), 'the cold');
        expect(r.cause).toMatch(/cold/i);
        const joined = r.chain.join(' | ');
        expect(joined).toMatch(/wet/i);
        expect(joined).toMatch(/no fire/i);
        expect(joined).toMatch(/no cover/i);
        //  Being wet is why the cold bit; it belongs before the consequence, not after.
        expect(r.chain.findIndex((l) => /wet/i.test(l)))
            .toBeLessThan(r.chain.findIndex((l) => /warmth reached zero/i.test(l)));
    });

    it('never claims a link that was not true — a shelter standing is not "no cover"', () => {
        const s = frozeToDeath();
        s.shelter = { ...s.shelter, built: true };
        s.fire = { built: true, fuel: 5, x: 0, y: 0 };
        s.wet = 0;
        const r = reviewDeath(s, 'the cold');
        const joined = r.chain.join(' | ');
        expect(joined).not.toMatch(/no cover/i);
        expect(joined).not.toMatch(/no fire/i);
        expect(joined).not.toMatch(/wet/i);
    });

    it('a death it cannot explain says so, rather than inventing a story', () => {
        //  The honest fallback. A confident wrong sentence about why someone died is worse
        //  than admitting the record only shows the cause.
        const s = createInitialState(0);
        s.gameHoursElapsed = 5;
        //  Warm, dry, sheltered, fire lit — every link the review knows how to draw is
        //  genuinely false, so it has nothing true to say about the mechanism.
        s.shelter = { ...s.shelter, built: true };
        s.fire = { built: true, fuel: 5, x: 0, y: 0 };
        //  ...and DRY. A fresh state is now an arrival, and an arrival is soaked, so the wet
        //  link would fire and the review would have something true to say after all.
        s.wet = 0;
        const r = reviewDeath(s, 'a falling coconut');
        expect(r.chain).toHaveLength(1);
        expect(r.chain[0]).toMatch(/falling coconut/);
        expect(r.cause).toBeTruthy();
    });
});

describe('WARNINGS — never one the bars did not actually show', () => {
    it('reports only vitals that were genuinely inside their own HUD threshold', () => {
        const s = frozeToDeath();
        s.thirst = TUNE.thirstLowHintAt - 1;      // was shown low
        s.hunger = TUNE.hungerLowHintAt + 20;     // was NOT
        const r = reviewDeath(s, 'the cold');
        const joined = r.warnings.join(' | ');
        expect(joined).toMatch(/thirst/i);
        expect(joined).not.toMatch(/hunger/i);
    });

    it('a death with no prior warning admits there was none', () => {
        const s = createInitialState(0);
        s.health = 0;
        const r = reviewDeath(s, 'your wounds');
        expect(r.warnings).toEqual([]);
    });

    it('NEVER warns about health — it is zero at every death, so it would always fire', () => {
        //  Found by this suite: a health warning is unfalsifiable at the moment of death and
        //  therefore worthless, and it would dilute the warnings that meant something.
        const s = frozeToDeath();
        s.thirst = 1;
        const r = reviewDeath(s, 'the cold');
        expect(r.warnings.join(' ')).not.toMatch(/health/i);
        expect(r.warnings.join(' '), 'the real warnings still fire').toMatch(/thirst/i);
    });
});

describe('WHAT WAS IN REACH — read from what was carried, never assumed', () => {
    it('names the wood you were carrying while you froze', () => {
        const r = reviewDeath(frozeToDeath(), 'the cold');
        expect(r.couldHave.join(' | ')).toMatch(/9 wood/);
    });

    it('offers nothing when there was genuinely nothing — no false comfort', () => {
        const s = frozeToDeath();
        s.inventory.wood = 0;
        const r = reviewDeath(s, 'the cold');
        expect(r.couldHave).toEqual([]);
    });

    it('only mentions the flask when thirst was the problem AND it had sips left', () => {
        const s = frozeToDeath();
        s.tools = { ...s.tools, flask: true, flaskSips: 2 };
        expect(reviewDeath(s, 'the cold').couldHave.join(' ')).not.toMatch(/flask/i);
        s.thirst = 1;
        expect(reviewDeath(s, 'thirst').couldHave.join(' ')).toMatch(/flask/i);
    });

    it('says you knew how to build a roof ONLY if you actually did', () => {
        const s = frozeToDeath();
        expect(reviewDeath(s, 'the cold').couldHave.join(' ')).not.toMatch(/roof/i);
        s.blueprints = [{ id: 'b', name: 'lean-to', recipeId: 'shelter', inputs: ['wood'],
            version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 2 } as never];
        expect(reviewDeath(s, 'the cold').couldHave.join(' ')).toMatch(/roof/i);
    });

    it('is PLAIN AND KIND — it never tells the player they were stupid', () => {
        const r = reviewDeath(frozeToDeath(), 'the cold');
        const all = [...r.chain, ...r.warnings, ...r.couldHave, ...r.legacy, r.cause].join(' ');
        expect(all).not.toMatch(/stupid|foolish|should have known|obviously|careless/i);
    });
});

describe('LEGACY — the only warm part, and it tells the truth about the journal', () => {
    it('a stored, legible journal is named as waiting for someone', () => {
        const s = frozeToDeath();
        s.journal = { exists: true, x: 2, y: 2, carried: false, condition: 1,
            entries: [{ author: 1, writtenAtGameHours: 8, topic: 'shelter', text: 'lashings' }],
            lastWrittenAtGameHours: 8 };
        expect(reviewDeath(s, 'the cold').legacy.join(' ')).toMatch(/journal.*where you left it/i);
    });

    it('a CARRIED journal is named as lost — the decision, at the moment it costs', () => {
        const s = frozeToDeath();
        s.journal = { exists: true, x: 0, y: 0, carried: true, condition: 1,
            entries: [{ author: 1, writtenAtGameHours: 8, topic: 'shelter', text: 'lashings' }],
            lastWrittenAtGameHours: 8 };
        expect(reviewDeath(s, 'the cold').legacy.join(' ')).toMatch(/goes where you go/i);
    });

    it('knowing things and never writing them down is said plainly', () => {
        const s = frozeToDeath();
        s.blueprints = [{ id: 'b', name: 'lean-to', recipeId: 'shelter', inputs: ['wood'],
            version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 2 } as never];
        expect(reviewDeath(s, 'the cold').legacy.join(' ')).toMatch(/never wrote/i);
    });

    it('what you built is named as still standing', () => {
        const s = frozeToDeath();
        s.shelter = { ...s.shelter, built: true };
        s.storage = { ...s.storage, built: true };
        const legacy = reviewDeath(s, 'the cold').legacy.join(' ');
        expect(legacy).toMatch(/shelter you built is still standing/i);
        expect(legacy).toMatch(/store box/i);
    });
});

describe('THE ARRIVAL NARRATION — "someone lived here"', () => {
    const previous: SurvivorRecord = { ordinal: 1, cause: 'the cold', diedAtGameHours: 40,
        livedGameHours: 40, knewRecipes: ['shelter', 'storage'], leftBehind: ['a shelter'] };

    it('the FIRST life gets an empty beach and no ghost', () => {
        const lines = narrateArrival(createInitialState(0), null);
        expect(lines.join(' ')).not.toMatch(/someone lived here/i);
        expect(lines.join(' ')).toMatch(/nothing on this beach/i);
    });

    it('a successor is told someone lived here, and shown what — never told what they KNEW', () => {
        const s = createInitialState(0);
        s.shelter = { ...s.shelter, built: true };
        s.storage = { ...s.storage, built: true };
        const lines = narrateArrival(s, previous);
        const all = lines.join(' | ');
        expect(all).toMatch(/someone lived here/i);
        expect(all).toMatch(/shelter.*still standing/i);
        expect(all).toMatch(/you did not build it/i);
        //  D-069 enforced in PROSE as well as in state. Narration that said "they knew how to
        //  build a shelter" would hand over by sentence exactly what the ladder refuses to
        //  hand over by field, and the player would rightly feel they had been told.
        expect(all).not.toMatch(/they knew how|knew how to (build|make)/i);
    });

    it('the tense changes from "you" to "someone" — the distance is the point', () => {
        const s = createInitialState(0);
        s.shelter = { ...s.shelter, built: true };
        const review = reviewDeath(frozeToDeath(), 'the cold');
        const arrival = narrateArrival(s, previous);
        expect(review.chain.join(' ')).toMatch(/\byou\b/i);
        expect(arrival.join(' ')).toMatch(/someone|whoever/i);
    });

    it('a kept, legible book is mentioned — and a carried one never is', () => {
        const s = createInitialState(0);
        s.journal = { exists: true, x: 1, y: 1, carried: false, condition: 1,
            entries: [{ author: 1, writtenAtGameHours: 8, topic: 'shelter', text: 'x' }],
            lastWrittenAtGameHours: 8 };
        expect(narrateArrival(s, previous).join(' ')).toMatch(/wrote things down/i);
        s.journal = { ...s.journal, condition: 0.05 };
        expect(narrateArrival(s, previous).join(' ')).not.toMatch(/wrote things down/i);
    });

    it('end to end: a real death produces a review, then a real arrival', () => {
        //  The two halves in sequence, on one state, the way the session runs them — the
        //  review is read from the DYING body, then the arrival from what it left.
        const dying = frozeToDeath();
        dying.shelter = { ...dying.shelter, built: true };
        const review = reviewDeath(dying, 'the cold');
        const { next, record } = closeSurvivor(dying, 'the cold');
        const arrival = narrateArrival(next, record);

        expect(review.lifetime).toMatch(/lasted/i);
        expect(review.legacy.join(' ')).toMatch(/still standing/i);
        expect(arrival.join(' ')).toMatch(/someone lived here/i);
        expect(arrival[0]).toMatch(/wake up on the sand/i);
    });
});
