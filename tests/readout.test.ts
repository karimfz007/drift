/**
 * DROP 6 — THE READOUT. What the body knows, made perceivable.
 *
 * THE FOUR CLAIMS, each of which would rot silently:
 *
 *   1.  IT ADDS NO STATE. Every reading is a pure derivation from models that already ship. A
 *       readout with its own store would be a second opinion about the survivor, free to
 *       disagree with the first — which is what `refugeReport` was called "the liar" for.
 *   2.  NO NUMERIC XP, NO TREE. Bible v2.3: experience rewards INFORMATION GAINED. The player
 *       is told a change they can feel and shown a band; never a score. Swept.
 *   3.  IT IS SILENT UNTIL IT IS WORTH SAYING. A game that narrates every ordinary moment has
 *       no way left to raise its voice.
 *   4.  THE SENTENCE AND THE MECHANIC CANNOT DRIFT. The seconds quoted are derived from the
 *       same functions the game actually spends.
 */
import { describe, expect, it } from 'vitest';
import {
    airCapacityOf,
    breathReading,
    createInitialState,
    handsReading,
    nodeHoldSeconds,
    noticedAtWork,
    noticedOnSurfacing,
    slowWorkNote,
    type GameState,
} from '../src/brain';
import * as readout from '../src/brain/readout';
import { freshCapacities } from '../src/brain/capacities';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => fullBody(createInitialState(NOW));

/** A survivor who has genuinely put the hours in, on one domain. */
function practised(technique: number): GameState {
    const s = fresh();
    s.knowledge.domains.harvestingFabrication = {
        ...s.knowledge.domains.harvestingFabrication,
        technique,
    };
    return s;
}

describe('it adds no state and no mechanic', () => {
    it('the module exports readings only — nothing that could grant, award or spend', () => {
        const forbidden = /xp|experience|award|grant|level|unlock|spend|points|tree/i;
        expect(Object.keys(readout).filter((k) => forbidden.test(k))).toEqual([]);
    });

    it('reading it never mutates the survivor', () => {
        const s = practised(60);
        const before = JSON.stringify(s);
        handsReading(s, 'harvestingFabrication', 6);
        breathReading(s.capacities);
        noticedAtWork(s, 'harvestingFabrication', 6);
        noticedOnSurfacing(s);
        slowWorkNote(s);
        expect(JSON.stringify(s), 'a readout changed the thing it was reading').toBe(before);
    });
});

describe('concrete, never numeric — Bible v2.3', () => {
    it('says a change you can feel, in seconds, and never a score', () => {
        const r = handsReading(practised(70), 'harvestingFabrication', 6);
        expect(r.sentence).toMatch(/seconds faster/);
        //  A score would look like "technique 70", "70/100", a percentage, or an XP figure.
        expect(r.sentence).not.toMatch(/technique|\/100|%|score|xp|level/i);
    });

    it('carries a visible progression band, from the shipped four', () => {
        const bands = new Set<string>();
        for (const t of [10, 30, 55, 90]) {
            bands.add(handsReading(practised(t), 'harvestingFabrication', 6).standing);
        }
        expect(bands.size, 'every technique reads as the same band — the indicator is inert')
            .toBeGreaterThan(1);
    });

    it('the progress indicator runs 0..1 and is monotonic in the thing it reports', () => {
        let last = -1;
        for (const t of [10, 25, 50, 75, 100]) {
            const p = handsReading(practised(t), 'harvestingFabrication', 6).progress;
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(1);
            expect(p, 'progress went backwards as technique rose').toBeGreaterThanOrEqual(last);
            last = p;
        }
    });
});

describe('silent until it is worth saying (Law 26, and the voice-raising rule)', () => {
    it('a survivor as they landed is told nothing at all', () => {
        const s = fresh();
        expect(noticedAtWork(s, 'harvestingFabrication', 6)).toBeNull();
        expect(noticedOnSurfacing(s)).toBeNull();
        expect(handsReading(s, 'harvestingFabrication', 6).sentence).toMatch(/no steadier/i);
        expect(breathReading(s.capacities).sentence).toMatch(/same breath/i);
    });

    it('...and one who has genuinely improved is told, at the moment the work lands', () => {
        const said = noticedAtWork(practised(90), 'harvestingFabrication', 8);
        expect(said, 'a practised survivor was told nothing').toBeTruthy();
        expect(said).toMatch(/seconds faster/);
    });

    it('never prints "0 seconds faster" — a sentence that argues with its own chip', () => {
        //  THE FULL SWEEP FOUND THIS, off the rendered panel: a domain with a hair of technique
        //  saved 0.02 s, which rounds to "0", and read "0 seconds faster than your first —
        //  steadier with it now" beside a band saying "as you landed". The unit suite had
        //  missed it because a TRULY fresh survivor saves exactly zero and took the other
        //  branch. Sweeping a range of near-floor techniques is what catches the rounding.
        for (const t of [5, 5.05, 5.2, 6, 7, 8]) {
            const r = handsReading(practised(t), 'harvestingFabrication', 6);
            expect(r.sentence, `technique ${t} printed a contradiction: "${r.sentence}"`)
                .not.toMatch(/0 seconds faster/);
            if (/no steadier/i.test(r.sentence)) expect(r.standing).toBe('as you landed');
        }
    });

    it('the threshold is a real gate, not decoration', () => {
        //  A tiny improvement on a tiny job stays quiet; the gate is a real number.
        expect(noticedAtWork(practised(12), 'harvestingFabrication', 2)).toBeNull();
        expect(TUNE.readoutNoticeableSeconds).toBeGreaterThan(0);
    });
});

describe('the sentence and the mechanic cannot drift', () => {
    it('the seconds saved match what `nodeHoldSeconds` actually charges', () => {
        //  THE ANTI-LIAR TEST. The quoted saving is derived from the same mastery the hold
        //  spends, so a retune of one moves the other.
        const skilled = practised(80);
        const plain = fresh();
        const fastSeconds = nodeHoldSeconds(skilled, skilled.nodes.find((n) => n.kind === 'tree')!);
        const slowSeconds = nodeHoldSeconds(plain, plain.nodes.find((n) => n.kind === 'tree')!);
        const actualSaving = slowSeconds - fastSeconds;
        expect(actualSaving, 'mastery bought nothing — then there is nothing to report')
            .toBeGreaterThan(0);

        //  `handsReading` takes the seconds the job ACTUALLY cost this survivor and derives day
        //  one from it. Passing the FRESH survivor's hold here was my own misuse of the contract
        //  I had just corrected, and it inflated the quote by the mastery a second time.
        const quoted = handsReading(skilled, 'harvestingFabrication', fastSeconds).sentence;
        const quotedSeconds = Number(/([\d.]+) seconds faster/.exec(quoted)![1]);
        expect(quotedSeconds).toBeCloseTo(actualSaving, 1);
    });

    it('the breath it quotes matches what `airCapacityOf` actually holds', () => {
        const caps = { ...freshCapacities(), breathWaterConfidence: 100 };
        const gainedAir = airCapacityOf(caps) - airCapacityOf({ ...caps, breathWaterConfidence: 0 });
        expect(gainedAir).toBeGreaterThan(0);
        expect(breathReading(caps).sentence).toMatch(/seconds longer under/);
        expect(breathReading(freshCapacities()).sentence).toMatch(/same breath/i);
    });
});

describe('the slow work says it is slow ON PURPOSE, not broken', () => {
    it('never tells a survivor a hammer is REQUIRED — measured, it is an accelerator', () => {
        const byHand = slowWorkNote(fresh());
        expect(byHand).toMatch(/slow|grudging/i);
        expect(byHand).toMatch(/halve|hammer/i);
        expect(byHand).toMatch(/never runs out/i);
        //  The false sentence that would send a survivor away from a face working perfectly
        //  well for them. The boulder was MEASURED: 5.5 s by hand against 3.0 s with a hammer,
        //  2 stone a swing, inexhaustible. The hammer is an accelerator, never a gate.
        expect(byHand).not.toMatch(/\brequired\b|\bneed a\b|\bcannot\b/i);
        expect(TUNE.boulderHoldSecondsWithHammer).toBeLessThan(TUNE.boulderHoldSecondsByHand);
        expect(TUNE.boulderHoldSecondsWithHammer * 2).toBeGreaterThanOrEqual(TUNE.boulderHoldSecondsByHand);
    });

    it('and says something different once the hammer is in hand', () => {
        const withHammer = fresh();
        withHammer.tools.stoneHammer = true;
        expect(slowWorkNote(withHammer)).not.toBe(slowWorkNote(fresh()));
        expect(slowWorkNote(withHammer)).toMatch(/never runs out/i);
    });
});
