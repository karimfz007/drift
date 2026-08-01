/**
 * THE CASTAWAY CYCLE, END TO END — the deliverable, as a test.
 *
 * Everything else in this slice proves a part. This proves the WHOLE, through the real verb
 * system, in the order a player would actually do it:
 *
 *   build a fire -> make a journal at it -> write what you worked out ->
 *   leave the book in the box -> die -> wash ashore as someone else ->
 *   find the book -> be able to read it
 *
 * D-090's reachability law is the reason it exists: a target that cannot be arrived at
 * through the real acquisition path is a target that does not exist. Every part of this slice
 * could pass its own tests while the chain between them was broken — a verb never offered, a
 * gate no sequence can open — and the player would experience a game with no journal in it
 * at all. So this walks the chain, using only what the circle actually offers.
 */
import { describe, expect, it } from 'vitest';
import { availableVerbs, verbsFor } from '../src/brain/verbs';
import { createInitialState, makeJournal, setJournalCarried } from '../src/brain/state';
import { readWrite, writeEntry } from '../src/brain/journal';
import { closeSurvivor } from '../src/brain/succession';
import { narrateArrival, reviewDeath } from '../src/brain/deathReview';
import { ladderFor } from '../src/brain/ladder';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState } from '../src/brain/types';

/** A survivor with a fire lit at their feet and a shelter they worked out themselves. */
function atTheFire(): GameState {
    const s = createInitialState(0);
    s.fire = { built: true, fuel: 12, x: s.player.x, y: s.player.y };
    s.storage = { ...s.storage, built: true, x: s.player.x, y: s.player.y };
    s.inventory.wood = 10;
    s.inventory.fiber = 10;
    s.energy = 90;
    s.gameHoursElapsed = 20;
    s.blueprints = [{
        id: 'bp-shelter', name: 'A lean-to', recipeId: 'shelter', inputs: ['wood', 'fiber'],
        version: 1, workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 12,
    } as Blueprint];
    return s;
}

const idsAt = (s: GameState, target: 'fire' | 'storage') =>
    availableVerbs(s, target).map((v) => v.id);

describe('REACHABILITY — every step is offered by the circle, not just callable', () => {
    it('the fire offers making a journal once you have a fire and the makings', () => {
        expect(idsAt(atTheFire(), 'fire')).toContain('make-journal');
    });

    it('...and does NOT, with no fire, no fuel, or nothing to make it from', () => {
        const noFire = atTheFire();
        noFire.fire = { built: false, fuel: 0, x: 0, y: 0 };
        expect(idsAt(noFire, 'fire')).not.toContain('make-journal');

        const out = atTheFire();
        out.fire = { ...out.fire, fuel: 0 };
        expect(idsAt(out, 'fire')).not.toContain('make-journal');

        const broke = atTheFire();
        broke.inventory.fiber = 0;
        expect(idsAt(broke, 'fire')).not.toContain('make-journal');
        //  ...and the refusal NAMES what is short, so the player can go and get it.
        const blocked = verbsFor(broke, 'fire').find((v) => v.id === 'make-journal');
        expect(blocked!.reason).toMatch(/more fibre/i);
    });

    it('writing is offered only once a journal exists AND there is something to say', () => {
        const s = atTheFire();
        expect(idsAt(s, 'fire'), 'no journal yet').not.toContain('write-journal');

        expect(makeJournal(s)).toBe(true);
        expect(idsAt(s, 'fire')).toContain('write-journal');

        const ignorant = atTheFire();
        ignorant.blueprints = [];
        makeJournal(ignorant);
        expect(idsAt(ignorant, 'fire'), 'nothing demonstrated to write about')
            .not.toContain('write-journal');
        expect(verbsFor(ignorant, 'fire').find((v) => v.id === 'write-journal')!.reason)
            .toMatch(/worth setting down/i);
    });

    it('the storage box offers the put-it-down decision, both ways', () => {
        const s = atTheFire();
        expect(idsAt(s, 'storage'), 'no journal to store').not.toContain('store-journal');

        makeJournal(s);
        expect(s.journal.carried, 'a new journal is in hand').toBe(true);
        expect(idsAt(s, 'storage')).toContain('store-journal');

        setJournalCarried(s, false);
        expect(idsAt(s, 'storage')).toContain('take-journal');
        expect(idsAt(s, 'storage')).not.toContain('store-journal');
    });

    it('the fire keeps its old verbs — the new ones displaced nothing', () => {
        //  The frequent-verb-slowdown rule, checked directly. Adding two verbs to the fire
        //  must not have taxed feeding it, which is what a survivor is there to do.
        const s = atTheFire();
        expect(idsAt(s, 'fire')).toContain('feed-fire');
        s.torch = { owned: true, lit: false, fuelGameHoursRemaining: 3, grade: 'crude' };
        expect(idsAt(s, 'fire')).toContain('light-torch');
    });
});

describe('THE WHOLE CHAIN — die, wash ashore, and read what you left yourself', () => {
    it('walks it end to end and lands with the successor able to read the book', () => {
        //  1. AT THE FIRE, having worked out a shelter for himself.
        const s = atTheFire();
        expect(ladderFor(s, 'shelter')).toBe('demonstrated');

        //  2. MAKE THE JOURNAL. It costs matter, and it arrives in hand.
        const fiberBefore = s.inventory.fiber;
        expect(makeJournal(s)).toBe(true);
        expect(s.inventory.fiber).toBe(fiberBefore - TUNE.journalFiberCost);
        expect(s.journal.exists).toBe(true);

        //  3. WRITE. It costs an hour and real energy, and only what he actually did.
        const reading = readWrite(s);
        expect(reading.canWrite).toBe(true);
        expect(reading.topics).toEqual(['shelter']);
        const written = writeEntry(s, 'shelter')!;
        expect(written.energyCost).toBeGreaterThan(0);
        expect(written.gameHours).toBeGreaterThan(0);
        s.journal = written.journal;
        expect(s.journal.entries).toHaveLength(1);

        //  4. LEAVE IT IN THE BOX. The decision that makes the rest of this possible.
        setJournalCarried(s, false);
        expect(s.journal.carried).toBe(false);

        //  5. DIE. The review is read from the dying body, and it names the legacy.
        s.shelter = { ...s.shelter, built: true, x: 4, y: 4 };
        s.warmth = 0; s.wet = 60; s.health = 0; s.gameHoursElapsed = 44;
        const review = reviewDeath(s, 'the cold');
        expect(review.cause).toMatch(/cold/i);
        expect(review.legacy.join(' ')).toMatch(/journal.*where you left it/i);

        //  6. WASH ASHORE AS SOMEONE ELSE, into everything he built.
        const { next, record } = closeSurvivor(s, 'the cold');
        expect(record.ordinal).toBe(1);
        expect(next.shelter.built, 'the shelter he built is still standing').toBe(true);
        expect(next.blueprints, 'and none of what he knew came with').toEqual([]);

        //  7. THE ARRIVAL, over the archaeology.
        const arrival = narrateArrival(next, record);
        expect(arrival.join(' ')).toMatch(/someone lived here/i);
        expect(arrival.join(' ')).toMatch(/wrote things down/i);

        //  8. AND THE BOOK IS THERE, AND READABLE — the successor stands one rung up from
        //     nothing because a stranger sat by a fire for an hour and wrote it down.
        expect(next.journal.exists).toBe(true);
        expect(next.journal.entries).toHaveLength(1);
        expect(next.journal.entries[0].author).toBe(1);
        expect(ladderFor(next, 'shelter')).toBe('conceptually-suspected');
        //  ...and still has to make it work themselves. The bequest is a head start, not a gift.
        expect(ladderFor(next, 'shelter')).not.toBe('demonstrated');
    });

    it('...and the same chain with the book CARRIED leaves the successor nothing', () => {
        //  The counterfactual, which is what gives step 4 its meaning. One decision, taken
        //  the other way, and everything the previous survivor wrote is at the bottom of the
        //  sea — while the shelter, being matter, is still standing.
        const s = atTheFire();
        makeJournal(s);
        s.journal = writeEntry(s, 'shelter')!.journal;
        expect(s.journal.carried).toBe(true);
        s.shelter = { ...s.shelter, built: true };
        s.gameHoursElapsed = 44;

        const { next } = closeSurvivor(s, 'the cold');
        expect(next.journal.exists).toBe(false);
        expect(ladderFor(next, 'shelter')).toBe('found-intact');
    });
});
