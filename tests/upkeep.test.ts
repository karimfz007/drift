/**
 * ENTROPY & MAINTENANCE (v0.11 §8) — the decay half, on the shelter.
 *
 * The claim under test is not "the shelter wears out" — it did that already, as a bar. It is
 * that wear is now SPECIFIC AND PER-LOCATION: three named places, each with its own driver,
 * each attacking the refuge answer that place is responsible for, and none of them ever
 * reaching a player as a number.
 */
import { describe, expect, it } from 'vitest';
import {
    ALL_DEFECTS,
    advanceDefects,
    answerLoss,
    builtShelterProfile,
    canRepairStructure,
    createInitialState,
    defectCue,
    defectPlace,
    degradeProfile,
    freshDefects,
    hasOutstandingWork,
    mendWorst,
    outstandingWork,
    reconcile,
    refugeReport,
    repairStructureDetailed,
    stageOf,
    threatsOf,
    upkeepNote,
    verbsFor,
    wearRates,
    worstDefect,
    type DefectId,
    type GameState,
} from '../src/brain';
import { Session } from '../src/brain/session';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';
import { WORLD } from '../src/data/world';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;

/** A survivor standing at a sound shelter, well inland so the footing is dry. */
function sheltered(): GameState {
    const s = fullBody(createInitialState(NOW));
    s.shelter = { built: true, x: 6, y: -12, durability: TUNE.structureDurabilityMax, grade: 'serviceable', defects: freshDefects() };
    s.player.x = 6;
    s.player.y = -12;
    s.inventory.wood = 5;
    return s;
}

function withDefect(id: DefectId, wear: number): GameState {
    const s = sheltered();
    s.shelter = { ...s.shelter, defects: { ...s.shelter.defects, [id]: wear } };
    return s;
}

const SHOWING = TUNE.defectShowingAt + 0.01;
const FAILING = TUNE.defectFailingAt + 0.01;

// ---------------------------------------------------------------------------
describe('NAMED PLACES, not a percentage bar', () => {
    it('has three of them, and every one is a place rather than a symptom', () => {
        expect([...ALL_DEFECTS].sort()).toEqual(['footing', 'lashing', 'thatch']);
        for (const id of ALL_DEFECTS) {
            expect(defectPlace(id).length, `${id} has no place`).toBeGreaterThan(5);
        }
    });

    it('reads out as a STAGE, and the stored number never reaches anybody', () => {
        expect(stageOf(0)).toBe('sound');
        expect(stageOf(TUNE.defectShowingAt - 0.001)).toBe('sound');
        expect(stageOf(TUNE.defectShowingAt)).toBe('showing');
        expect(stageOf(TUNE.defectFailingAt - 0.001)).toBe('showing');
        expect(stageOf(TUNE.defectFailingAt)).toBe('failing');
        expect(stageOf(1)).toBe('failing');
    });

    it('never puts a number or a percent in anything a player reads', () => {
        //  The dossier's objection is to the SHAPE of "63% durability". A named model that
        //  quietly printed a number would be the same thing wearing a costume.
        const lines: string[] = [];
        for (const id of ALL_DEFECTS) {
            lines.push(defectPlace(id));
            for (const stage of ['showing', 'failing'] as const) lines.push(defectCue(id, stage)!);
        }
        lines.push(upkeepNote(withDefect('lashing', FAILING))!);
        for (const line of lines) {
            expect(line, `"${line}" quotes a number`).not.toMatch(/\d/);
            expect(line).not.toMatch(/%/);
        }
    });

    it('says nothing at all while a place is sound — silence is the baseline', () => {
        for (const id of ALL_DEFECTS) expect(defectCue(id, 'sound')).toBeNull();
        expect(upkeepNote(sheltered())).toBeNull();
        expect(outstandingWork(sheltered())).toEqual([]);
        expect(worstDefect(sheltered())).toBeNull();
    });

    it('gives each stage its OWN sentence — two spoken warnings, not one repeated', () => {
        for (const id of ALL_DEFECTS) {
            const showing = defectCue(id, 'showing')!;
            const failing = defectCue(id, 'failing')!;
            expect(showing).not.toBe(failing);
            expect(showing.length).toBeGreaterThan(20);
            expect(failing.length).toBeGreaterThan(20);
        }
    });
});

// ---------------------------------------------------------------------------
describe('SHELTER LAW 4 — a wall is a load path, not a hit-point total', () => {
    it('attacks the answer the PLACE is responsible for, and not the others', () => {
        //  A slack lashing lets the wind in. It does not make the roof colder, because the
        //  roof is still a roof — which is the entire difference between this and one bar.
        const wind = answerLoss(withDefect('lashing', FAILING));
        expect(wind.wind).toBeGreaterThan(0);
        expect(wind.cold).toBe(0);

        const cold = answerLoss(withDefect('thatch', FAILING));
        expect(cold.cold).toBeGreaterThan(0);
        expect(cold.wind).toBe(0);
    });

    it('and the FOOTING takes both, because everything is standing on it', () => {
        expect([...threatsOf('footing')].sort()).toEqual(['cold', 'wind']);
        const loss = answerLoss(withDefect('footing', FAILING));
        expect(loss.wind).toBeGreaterThan(0);
        expect(loss.cold).toBeGreaterThan(0);
    });

    it('never invents an answer the lean-to does not give', () => {
        //  DERIVED FROM THE SHELTER, not from a list. This was written as "rain and ground damp
        //  are 0 and must stay 0", which was true when the lean-to answered exactly two
        //  threats — and RAIN & WET ESCALATION gave it a third, because a roof that kept no
        //  rain off is a roof in name only. The hardcoded version went red for a change that
        //  was correct.
        //
        //  What the rule actually protects is unchanged: a defect may only ever degrade an
        //  answer the building genuinely gives. Asking `builtShelterProfile` means a future
        //  threat cannot break this test by being added, only by being degraded wrongly.
        const sound = builtShelterProfile('serviceable');
        for (const id of ALL_DEFECTS) {
            const loss = answerLoss(withDefect(id, FAILING));
            for (const [threat, taken] of Object.entries(loss) as Array<[string, number]>) {
                const key = threat === 'ground-damp' ? 'groundDamp' : threat;
                const answered = (sound as unknown as Record<string, number>)[key];
                if (answered > 0) continue;
                expect(taken, `${id} invented a ${threat} term the shelter never gave`).toBe(0);
            }
        }
        //  ...and the ground is still one the lean-to never answers, so it stays untouched.
        expect(sound.groundDamp).toBe(0);
        for (const id of ALL_DEFECTS) expect(answerLoss(withDefect(id, FAILING))['ground-damp']).toBe(0);
    });

    it('and the THATCH now costs rain as well as cold — the storm reaching the roof', () => {
        //  RAIN & WET ESCALATION's one edit to this model, and the tie that makes "no disaster
        //  exists alone" mechanical rather than thematic. The covering is what rain falls on.
        expect([...threatsOf('thatch')].sort()).toEqual(['cold', 'rain']);
        const loss = answerLoss(withDefect('thatch', FAILING));
        expect(loss.rain).toBeGreaterThan(0);
        //  The other two places are untouched by rain: a slack lashing lets wind in, not water.
        expect(answerLoss(withDefect('lashing', FAILING)).rain).toBe(0);
        expect(answerLoss(withDefect('footing', FAILING)).rain).toBe(0);
    });

    it('only ever SUBTRACTS, and never below nothing', () => {
        const wrecked = sheltered();
        wrecked.shelter = { ...wrecked.shelter, defects: { lashing: 1, thatch: 1, footing: 1 } };
        const sound = builtShelterProfile('serviceable');
        const bad = degradeProfile(sound, answerLoss(wrecked));
        expect(bad.wind).toBeLessThan(sound.wind);
        expect(bad.cold).toBeLessThan(sound.cold);
        //  A broken roof is a bad shelter, not a machine for making the night worse than open
        //  ground. The cave earns a negative coefficient; this never does.
        expect(bad.wind).toBeGreaterThanOrEqual(0);
        expect(bad.cold).toBeGreaterThanOrEqual(0);
    });

    it('leaves a SOUND shelter bit-for-bit what it always was', () => {
        //  The invariant the whole change rests on: with nothing wrong, this pass is a no-op.
        const sound = builtShelterProfile('serviceable');
        expect(degradeProfile(sound, answerLoss(sheltered()))).toEqual(sound);
    });
});

// ---------------------------------------------------------------------------
describe('THREE DRIVERS, all inputs the game already had', () => {
    it('wears the lashing faster at night than in daylight', () => {
        const day = sheltered();
        day.gameHoursElapsed = 12;      // midday
        const night = sheltered();
        night.gameHoursElapsed = 0;     // the small hours
        expect(wearRates(night).lashing).toBeGreaterThan(wearRates(day).lashing);
        //  ...and daylight is not zero. The wind does not stop at dawn.
        expect(wearRates(day).lashing).toBeGreaterThan(0);
    });

    it('rots the footing by the SITE, so where it was pitched is a decision after the fact', () => {
        const inland = sheltered();
        const onTheSand = sheltered();
        onTheSand.shelter = { ...onTheSand.shelter, x: 0, y: WORLD.beachRadius + 6 };
        expect(wearRates(inland).footing).toBe(0);
        expect(wearRates(onTheSand).footing).toBeGreaterThan(0);
    });

    it('thins the thatch at a rate nothing can slow — weathering is what a roof is for', () => {
        const day = sheltered();
        day.gameHoursElapsed = 12;
        const night = sheltered();
        night.gameHoursElapsed = 0;
        expect(wearRates(day).thatch).toBe(wearRates(night).thatch);
        expect(wearRates(day).thatch).toBeGreaterThan(0);
    });

    it('wears nothing at all when there is no shelter to wear', () => {
        const none = fullBody(createInitialState(NOW));
        expect(wearRates(none)).toEqual({ lashing: 0, thatch: 0, footing: 0 });
        const before = { ...none.shelter.defects };
        advanceDefects(none, 500);
        expect(none.shelter.defects).toEqual(before);
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — deferred maintenance is never something an absence does to you', () => {
    it('leaves every named place EXACTLY as it was across a three-day absence', () => {
        const s = withDefect('lashing', SHOWING);
        const before = { ...s.shelter.defects };
        const after = reconcile(s, 3 * 24 * 3600).state;
        expect(after.shelter.defects).toEqual(before);
    });

    it('is STRUCTURAL: reconcile has no term that worsens a defect, at any span', () => {
        for (const seconds of [30, 600, 3600, 8 * 3600, 3 * 24 * 3600]) {
            const s = sheltered();
            const after = reconcile(s, seconds).state;
            expect(after.shelter.defects).toEqual({ lashing: 0, thatch: 0, footing: 0 });
        }
        //  ...and the span was real — the shipped durability bar DOES decay offline, which is
        //  what proves this is a deliberate difference rather than reconcile doing nothing.
        const witness = reconcile(sheltered(), 3 * 24 * 3600).state;
        expect(witness.shelter.durability).toBeLessThan(TUNE.structureDurabilityMax);
    });

    it('cannot make a returning survivor colder than the one who left', () => {
        //  The law, at the point it actually bites: the refuge answer a body wakes up to.
        const s = withDefect('thatch', SHOWING);
        const before = degradeProfile(builtShelterProfile(s.shelter.grade), answerLoss(s));
        const after = reconcile(s, 3 * 24 * 3600).state;
        const later = degradeProfile(builtShelterProfile(after.shelter.grade), answerLoss(after));
        expect(later.cold).toBeGreaterThanOrEqual(before.cold);
        expect(later.wind).toBeGreaterThanOrEqual(before.wind);
    });

    it('DOES wear on the online tick — or the whole model is inert', () => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        session.state.shelter = { built: true, x: 0, y: WORLD.beachRadius + 6, durability: TUNE.structureDurabilityMax, grade: 'serviceable', defects: freshDefects() };
        session.state.lastSeenMs = NOW;
        for (let i = 1; i <= 60; i++) session.tick(NOW + i * 1000);
        expect(session.state.shelter.defects.thatch).toBeGreaterThan(0);
        expect(session.state.shelter.defects.footing).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
describe('MAINTENANCE DEBT — cues and confidence, not a hidden tick', () => {
    it('changes what the player is TOLD the moment a place starts showing', () => {
        expect(upkeepNote(sheltered())).toBeNull();
        const note = upkeepNote(withDefect('footing', SHOWING));
        expect(note).toBe(defectCue('footing', 'showing'));
    });

    it('names ONE place and counts the rest — never three sentences in one breath', () => {
        const s = sheltered();
        s.shelter = { ...s.shelter, defects: { lashing: SHOWING, thatch: SHOWING, footing: FAILING } };
        const note = upkeepNote(s)!;
        expect(note).toContain(defectCue('footing', 'failing')!);
        expect(note).toContain('2 more places');
        //  ...and the other two cues are NOT quoted in full.
        expect(note).not.toContain(defectCue('thatch', 'showing')!);
    });

    it('changes what the refuge report CLAIMS, so confidence tracks reality', () => {
        //  This file's header calls `refugeReport` "the liar" and means it. A defective
        //  shelter that still reported its sound number would be exactly that.
        const sound = refugeReport(sheltered());
        const bad = refugeReport(withDefect('thatch', FAILING));
        expect(bad.reductionPct).toBeLessThan(sound.reductionPct);
        //  The gap between what it holds and what it WOULD hold is the debt, stated.
        expect(bad.potentialPct).toBe(sound.potentialPct);
        expect(bad.line).toContain('sound, it would hold');
        expect(bad.upkeep).toBe(defectCue('thatch', 'failing'));
        //  A sound shelter says nothing about upkeep at all.
        expect(sound.upkeep).toBeNull();
        expect(sound.line).not.toContain('sound, it would hold');
    });

    it('sorts the debt worst-first, so the report names the thing holding the rest up', () => {
        const s = sheltered();
        s.shelter = { ...s.shelter, defects: { lashing: FAILING, thatch: SHOWING, footing: 0 } };
        expect(outstandingWork(s).map((w) => w.id)).toEqual(['lashing', 'thatch']);
        expect(worstDefect(s)!.id).toBe('lashing');
    });
});

// ---------------------------------------------------------------------------
describe('the work itself — one wood, one place, and a trip you have to make', () => {
    it('mends the WORST place and says which, rather than moving a bar', () => {
        const s = withDefect('footing', FAILING);
        const out = repairStructureDetailed(s, 'shelter');
        expect(out.ok).toBe(true);
        expect(out.mended!.id).toBe('footing');
        expect(out.mended!.from).toBe('failing');
        expect(s.shelter.defects.footing).toBeLessThan(FAILING);
    });

    it('takes TWO trips to put a failing place right, and one for a showing one', () => {
        //  The debt, made concrete. Deferring does not accrue a hidden multiplier — it accrues
        //  WOOD AND WALKING, which is the only form of debt a player can plan around.
        //
        //  This is also the check that grounded `defectMendPerWood`. At its first value a
        //  defect sitting on the failing threshold went straight to sound in one visit, so the
        //  constant's own comment was describing something it did not do. It is now exactly
        //  `defectShowingAt`, which makes the claim true at every point in the range rather
        //  than in the middle of it.
        const late = withDefect('lashing', FAILING);
        expect(repairStructureDetailed(late, 'shelter').mended!.to).not.toBe('sound');
        expect(repairStructureDetailed(late, 'shelter').mended!.to).toBe('sound');

        //  ...and from the WORST it can be, still only two — the debt grows in trips, and
        //  those trips are bounded, so neglect is expensive rather than unrecoverable.
        const ruined = withDefect('lashing', 1);
        expect(repairStructureDetailed(ruined, 'shelter').mended!.to).not.toBe('sound');
        expect(repairStructureDetailed(ruined, 'shelter').mended!.to).toBe('sound');

        const early = withDefect('lashing', SHOWING);
        expect(repairStructureDetailed(early, 'shelter').mended!.to).toBe('sound');
    });

    it('spends the wood on the NAMED work before the bar', () => {
        const s = withDefect('thatch', SHOWING);
        s.shelter = { ...s.shelter, durability: 40 };
        const before = s.shelter.durability;
        const out = repairStructureDetailed(s, 'shelter');
        expect(out.mended!.id).toBe('thatch');
        expect(s.shelter.durability, 'the bar was topped up instead of the roof').toBe(before);
        expect(s.inventory.wood).toBe(4);
    });

    it('falls back to the bar when every named place is sound', () => {
        const s = sheltered();
        s.shelter = { ...s.shelter, durability: 40 };
        const out = repairStructureDetailed(s, 'shelter');
        expect(out.mended).toBeNull();
        expect(s.shelter.durability).toBeGreaterThan(40);
    });

    it('is OFFERED for named work even at full durability — the refusal this removes', () => {
        //  Before this pass a shelter with a parted lashing and a full bar could not be
        //  mended at all: `canRepairStructure` gated on durability alone. That is a real
        //  refusal of real work, and it is what "extend, don't replace" had to fix.
        const s = withDefect('lashing', FAILING);
        expect(s.shelter.durability).toBe(TUNE.structureDurabilityMax);
        expect(hasOutstandingWork(s)).toBe(true);
        expect(canRepairStructure(s, 'shelter')).toBe(true);
    });

    it('still refuses when there is genuinely nothing to do', () => {
        const s = sheltered();
        expect(canRepairStructure(s, 'shelter')).toBe(false);
        expect(repairStructureDetailed(s, 'shelter').ok).toBe(false);
        expect(verbsFor(s, 'shelter').find((v) => v.id === 'mend')!.reason)
            .toBe('It is sound. Nothing to mend.');
    });

    it('NAMES THE PLACE on the verb itself, so the choice is legible before it is made', () => {
        const s = withDefect('footing', SHOWING);
        const mend = verbsFor(s, 'shelter').find((v) => v.id === 'mend')!;
        expect(mend.label).toBe(`Mend ${defectPlace('footing')}`);
        expect(mend.available).toBe(true);
        //  A sound shelter's verb keeps the plain label.
        expect(verbsFor(sheltered(), 'shelter').find((v) => v.id === 'mend')!.label).toBe('Mend');
    });

    it('does nothing when there is nothing outstanding', () => {
        const s = sheltered();
        expect(mendWorst(s)).toBeNull();
        expect(s.shelter.defects).toEqual(freshDefects());
    });
});

// ---------------------------------------------------------------------------
describe('the save', () => {
    it('MIGRATION v27 -> v28: a returning shelter is sound at every named place', () => {
        const old = sheltered() as unknown as Record<string, unknown>;
        const shelter = { ...(old.shelter as object) } as Record<string, unknown>;
        delete shelter.defects;
        old.shelter = shelter;

        const loaded = deserialize(JSON.stringify({
            schemaVersion: 27, savedAtMs: NOW, state: { ...old, schemaVersion: 27 },
        }));
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);
        //  We have no record of which brace was slack, and inventing one would charge a
        //  survivor for wear that never happened.
        expect(loaded!.state.shelter.defects).toEqual({ lashing: 0, thatch: 0, footing: 0 });
        //  ...and the C05 bar is untouched: this pass sits alongside it, not on top of it.
        expect(loaded!.state.shelter.durability).toBe(TUNE.structureDurabilityMax);
    });

    it('keeps the named wear a current save already carries', () => {
        const s = withDefect('footing', SHOWING);
        const loaded = deserialize(JSON.stringify({
            schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: { ...s, schemaVersion: SCHEMA_VERSION },
        }));
        expect(loaded!.state.shelter.defects.footing).toBeCloseTo(SHOWING, 6);
    });

    it('does not let two states share one roof', () => {
        //  `defects` is an object, and a shallow copy anywhere in the clone/succession path
        //  would let a cloned state mend the original's shelter.
        const s = withDefect('thatch', SHOWING);
        const after = reconcile(s, 60).state;
        after.shelter.defects.thatch = 0;
        expect(s.shelter.defects.thatch, 'the clone shares the original object').toBeCloseTo(SHOWING, 6);
    });
});
