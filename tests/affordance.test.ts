/**
 * INSPECTION (Slice 2B Stage A) — properties and questions, never a finished answer.
 *
 * The rule is about TEXT, and text erodes one helpful edit at a time. So the guard is a
 * property test over every string the module ships, not a review note.
 */
import { describe, expect, it } from 'vitest';
import {
    affordanceOf, inspectableMaterials, namesAFinishedAnswer,
} from '../src/brain/affordance';

describe('inspection reveals properties and questions', () => {
    it('every inspectable material offers both — an observation and something to wonder', () => {
        const kinds = inspectableMaterials();
        expect(kinds.length).toBeGreaterThan(3);
        for (const k of kinds) {
            const a = affordanceOf(k)!;
            expect(a.properties.length).toBeGreaterThan(0);
            expect(a.questions.length).toBeGreaterThan(0);
        }
    });

    it('an unknown material inspects to nothing rather than inventing something', () => {
        expect(affordanceOf('unobtanium')).toBeNull();
    });
});

describe('IT NEVER NAMES A FINISHED ANSWER', () => {
    it('no shipped line tells the player what to go and make', () => {
        //  The whole invention pivot in one assertion. A pre-listed catalogue tells the player
        //  what the designers thought of; properties plus questions let the player think of
        //  it. The moment inspection says "this would make a good X", the Build panel has
        //  grown back in prose.
        let lines = 0;
        for (const k of inspectableMaterials()) {
            const a = affordanceOf(k)!;
            for (const line of [...a.properties, ...a.questions]) {
                expect(namesAFinishedAnswer(line)).toBe(false);
                lines++;
            }
        }
        //  WITNESS (D-066 a): the sweep must have actually read some text.
        expect(lines).toBeGreaterThan(20);
    });

    it('the guard itself catches the phrasings it exists to catch', () => {
        //  A detector that never fires is not a guard. These are the shapes that would
        //  reintroduce the catalogue, and each must be recognised.
        for (const bad of [
            'You could make a knife from this.',
            'Would make an excellent axe haft.',
            'Use this to build a shelter.',
            'Combine it with fiber for cordage.',
            'A recipe for cordage.',
        ]) {
            expect(namesAFinishedAnswer(bad)).toBe(true);
        }
    });

    it('...and does not fire on honest observation', () => {
        for (const good of [
            'Fractures to an edge',
            'Holds liquid',
            'What would it take to shape it?',
            'Stronger twisted',
        ]) {
            expect(namesAFinishedAnswer(good)).toBe(false);
        }
    });
});
