/**
 * THE SURVIVOR'S JOURNAL (D-068) — the one channel through which knowledge outlives a body.
 *
 * The tests that carry weight here are the LIMITS, not the feature. A journal that works is
 * easy; a journal that cannot be used to launder inheritance is the whole design. So the
 * ones to read first are:
 *
 *   - you cannot write what you never did          (`writableTopics` reads the ladder)
 *   - reading stops at `conceptually-suspected`    (notes are not skill)
 *   - a ruined journal grants nothing              (the carrier is mortal, and it matters)
 *   - a carried journal dies with you              (the storage decision has real teeth)
 *
 * Break any one of those and the journal quietly becomes "death costs nothing", which is the
 * failure the entire castaway cycle exists to prevent.
 */
import { describe, expect, it } from 'vitest';
import {
    burnJournal, hasWritingLight, isLegible, journalSuggests, readWrite, readableBy,
    succeedJournal, weatherJournal, writableTopics, writeEntry,
} from '../src/brain/journal';
import { createInitialState } from '../src/brain/state';
import { closeSurvivor } from '../src/brain/succession';
import { ladderFor } from '../src/brain/ladder';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState, JournalState } from '../src/brain/types';

function withJournal(s: GameState, over: Partial<JournalState> = {}): GameState {
    s.journal = { exists: true, x: 0, y: 0, carried: false, condition: 1, entries: [],
        lastWrittenAtGameHours: null, ...over };
    return s;
}

function knows(s: GameState, ...recipeIds: string[]): GameState {
    for (const recipeId of recipeIds) {
        s.blueprints = [...s.blueprints, {
            id: `bp-${recipeId}`, name: 'A plan', recipeId, inputs: ['wood'], version: 1,
            workmanship: 'crude', author: 'castaway', discoveredAtGameHours: 3,
        } as Blueprint];
    }
    return s;
}

/** A survivor sitting by a lit fire with a journal and something worth saying. */
function byTheFire(): GameState {
    const s = knows(withJournal(createInitialState(0)), 'shelter');
    s.fire = { built: true, fuel: 10, x: s.player.x, y: s.player.y };
    s.energy = 80;
    return s;
}

describe('YOU CANNOT WRITE WHAT YOU NEVER DID', () => {
    it('writableTopics reads the LADDER, never the inventory or the world', () => {
        const empty = withJournal(createInitialState(0));
        empty.inventory.wood = 99;
        expect(writableTopics(empty), 'materials are not knowledge').toEqual([]);

        //  A shelter STANDING is not a licence to write about it either — that is
        //  `found-intact`, two rungs below demonstrated. You can see it. You did not do it.
        empty.shelter = { ...empty.shelter, built: true };
        expect(writableTopics(empty)).toEqual([]);

        expect(writableTopics(knows(empty, 'shelter'))).toContain('shelter');
    });

    it('a topic already written cannot be written again — no padding the book', () => {
        const s = byTheFire();
        const first = writeEntry(s, 'shelter');
        expect(first).not.toBeNull();
        s.journal = first!.journal;
        expect(writableTopics(s)).not.toContain('shelter');
        expect(writeEntry(s, 'shelter')).toBeNull();
    });

    it('writeEntry refuses a topic that is not on the list, even if asked directly', () => {
        //  The list is the gate. A caller that hands in an arbitrary recipe id must be
        //  refused, or the gate is decoration.
        expect(writeEntry(byTheFire(), 'storage')).toBeNull();
        expect(writeEntry(byTheFire(), 'not-a-real-recipe')).toBeNull();
    });
});

describe('IT COSTS WHAT WRITING COSTS — light, time, energy', () => {
    it('you cannot write in the dark', () => {
        const s = byTheFire();
        s.fire = { built: false, fuel: 0, x: 0, y: 0 };
        expect(hasWritingLight(s)).toBe(false);
        expect(readWrite(s).blocked).toBe('no-light');
    });

    it('a burnt-out fire is darkness — built is not lit', () => {
        const s = byTheFire();
        s.fire = { ...s.fire, fuel: 0 };
        expect(hasWritingLight(s)).toBe(false);
    });

    it('a fire across the island is not YOUR fire', () => {
        const s = byTheFire();
        s.fire = { ...s.fire, x: s.player.x + TUNE.journalFireRadiusM + 1 };
        expect(hasWritingLight(s)).toBe(false);
    });

    it('a lit torch in hand will do — the light is the requirement, not the fire', () => {
        const s = byTheFire();
        s.fire = { built: false, fuel: 0, x: 0, y: 0 };
        s.torch = { owned: true, lit: true, fuelGameHoursRemaining: 2, grade: 'crude' };
        expect(hasWritingLight(s)).toBe(true);
        expect(readWrite(s).canWrite).toBe(true);
    });

    it('too tired to hold a pen', () => {
        const s = byTheFire();
        s.energy = TUNE.journalEnergyCost - 1;
        expect(readWrite(s).blocked).toBe('too-tired');
    });

    it('a successful write returns BOTH costs, so a caller cannot pay half', () => {
        const out = writeEntry(byTheFire(), 'shelter')!;
        expect(out.energyCost).toBe(TUNE.journalEnergyCost);
        expect(out.gameHours).toBe(TUNE.journalWriteGameHours);
        expect(out.gameHours).toBeGreaterThan(0);
    });

    it('the entry records what you DID, not a recipe — form follows the epistemic claim', () => {
        const out = writeEntry(byTheFire(), 'shelter')!;
        //  If the text were a parts list, reading it really would be enough to build from,
        //  and the comprehension gate below would be a lie told politely.
        expect(out.text).not.toMatch(/\d+\s*(wood|stone|fibre|fiber)/i);
        expect(out.text.length).toBeGreaterThan(40);
    });

    it('with no journal at all, that is the first thing you are told', () => {
        const s = createInitialState(0);
        expect(readWrite(s).blocked).toBe('no-journal');
        expect(readWrite(s).reason).toBeTruthy();
    });
});

describe('READING IS NOT DOING — the comprehension gate', () => {
    function bequeathed(): GameState {
        //  One survivor writes about shelter, stores the book, and dies.
        const first = byTheFire();
        first.journal = writeEntry(first, 'shelter')!.journal;
        first.gameHoursElapsed = 40;
        return closeSurvivor(first, 'thirst').next;
    }

    it('a legible entry lifts a successor to conceptually-suspected — and no further', () => {
        const heir = bequeathed();
        expect(heir.blueprints).toEqual([]);
        expect(journalSuggests(heir, 'shelter')).toBe(true);
        expect(ladderFor(heir, 'shelter')).toBe('conceptually-suspected');
        //  The line that matters: notes never reach `demonstrated`.
        expect(ladderFor(heir, 'shelter')).not.toBe('demonstrated');
    });

    it('...which is genuinely BETTER than nothing — the writing was worth doing', () => {
        //  A gate that granted nothing would make the journal pointless. The heir with notes
        //  stands one rung above the heir without them, and that rung is the bequest.
        const withNotes = bequeathed();
        const withoutNotes = closeSurvivor(knows(createInitialState(0), 'shelter'), 'thirst').next;
        expect(ladderFor(withNotes, 'shelter')).toBe('conceptually-suspected');
        expect(ladderFor(withoutNotes, 'shelter')).toBe('physically-possible');
    });

    it('you cannot read your own handwriting into knowledge', () => {
        const s = byTheFire();
        s.journal = writeEntry(s, 'shelter')!.journal;
        //  The author is the living survivor; readableBy must give them nothing back.
        expect(readableBy(s, s.memorial.length + 1)).toEqual([]);
        expect(journalSuggests(s, 'shelter')).toBe(false);
    });

    it('a RUINED journal grants nothing, however good the notes were', () => {
        const heir = bequeathed();
        expect(ladderFor(heir, 'shelter')).toBe('conceptually-suspected');
        heir.journal = { ...heir.journal, condition: TUNE.journalLegibilityFloor - 0.01 };
        expect(isLegible(heir.journal)).toBe(false);
        expect(readableBy(heir, 99)).toEqual([]);
        expect(ladderFor(heir, 'shelter')).toBe('physically-possible');
    });

    it('and a ruined journal cannot be written in either', () => {
        const s = byTheFire();
        s.journal = { ...s.journal, condition: 0.1 };
        expect(readWrite(s).blocked).toBe('illegible');
    });
});

describe('THE CARRIER IS MORTAL — and that is the decision', () => {
    it('a CARRIED journal goes into the sea with the body', () => {
        const s = byTheFire();
        s.journal = { ...writeEntry(s, 'shelter')!.journal, carried: true };
        const { next } = closeSurvivor(s, 'thirst');
        expect(next.journal.exists).toBe(false);
        expect(next.journal.entries).toEqual([]);
    });

    it('a STORED journal waits for whoever comes next, entries intact', () => {
        const s = byTheFire();
        s.journal = { ...writeEntry(s, 'shelter')!.journal, carried: false, x: 12, y: 5 };
        const { next } = closeSurvivor(s, 'thirst');
        expect(next.journal.exists).toBe(true);
        expect(next.journal.entries).toHaveLength(1);
        expect(next.journal).toMatchObject({ x: 12, y: 5, carried: false });
    });

    it('damp takes a carried journal down, and a stored one far more slowly', () => {
        const fresh: JournalState = { exists: true, x: 0, y: 0, carried: true, condition: 1,
            entries: [], lastWrittenAtGameHours: null };
        const carried = weatherJournal(fresh, { gameHours: 10, carrierWet: TUNE.wetMax, sheltered: false });
        const stored = weatherJournal({ ...fresh, carried: false },
            { gameHours: 10, carrierWet: TUNE.wetMax, sheltered: false });
        expect(carried.condition).toBeLessThan(1);
        expect(stored.condition).toBeGreaterThan(carried.condition);
        //  A box is protection, not a seal — "stored" must not mean "immortal".
        expect(stored.condition).toBeLessThan(1);
    });

    it('a dry survivor ruins nothing, and shelter protects a stored book completely', () => {
        const fresh: JournalState = { exists: true, x: 0, y: 0, carried: true, condition: 1,
            entries: [], lastWrittenAtGameHours: null };
        expect(weatherJournal(fresh, { gameHours: 50, carrierWet: 0, sheltered: false }).condition).toBe(1);
        expect(weatherJournal({ ...fresh, carried: false },
            { gameHours: 50, carrierWet: TUNE.wetMax, sheltered: true }).condition).toBe(1);
    });

    it('condition NEVER rises — paper does not recover', () => {
        //  If it healed, storing it would stop being a decision and start being a delay.
        let j: JournalState = { exists: true, x: 0, y: 0, carried: true, condition: 0.5,
            entries: [], lastWrittenAtGameHours: null };
        for (let i = 0; i < 40; i += 1) {
            const before = j.condition;
            j = weatherJournal(j, { gameHours: 3, carrierWet: i % 2 === 0 ? TUNE.wetMax : 0, sheltered: false });
            expect(j.condition).toBeLessThanOrEqual(before);
        }
        expect(j.condition).toBeGreaterThanOrEqual(0);
    });

    it('fire takes it all at once — the cost of writing by firelight, made literal', () => {
        const j: JournalState = { exists: true, x: 1, y: 1, carried: false, condition: 0.95,
            entries: [{ author: 1, writtenAtGameHours: 5, topic: 'shelter', text: 'x' }],
            lastWrittenAtGameHours: 5 };
        const burnt = burnJournal(j);
        expect(burnt.condition).toBe(0);
        expect(isLegible(burnt)).toBe(false);
        //  The pages are still THERE. Ruined is not the same as never-written, and the
        //  difference is what makes losing it hurt.
        expect(burnt.entries).toHaveLength(1);
    });

    it('succeeding a journal that never existed is a no-op, not a crash', () => {
        const none = createInitialState(0).journal;
        expect(succeedJournal(none)).toEqual(none);
        expect(weatherJournal(none, { gameHours: 99, carrierWet: 100, sheltered: false })).toEqual(none);
    });
});

describe('UNWRITTEN EXPERIENCE DIES WITH THE BODY — the property', () => {
    it('everything demonstrated but never written is gone, across ten lives', () => {
        //  The claim in its strongest form: a chain of survivors, each of whom worked things
        //  out and never wrote them down, leaves a successor with nothing.
        let s = createInitialState(0);
        for (let i = 0; i < 10; i += 1) {
            s = knows(s, 'shelter', 'storage');
            s.gameHoursElapsed += 30;
            s = closeSurvivor(s, 'thirst').next;
        }
        expect(s.blueprints).toEqual([]);
        expect(s.journal.exists).toBe(false);
        //  Nothing was ever built, so not even `found-intact` is available to them.
        expect(ladderFor(s, 'shelter')).toBe('physically-possible');
    });
});
