/**
 * SESSION 2 — THE BOAT, B0 TO B2 (Laws 124 and 125).
 *
 * SEVEN CLAIMS, each of which would rot silently:
 *
 *   1. FIVE SYSTEMS, NOT ONE REPAIR METER. Hull integrity, watertightness, flotation, load and
 *      mooring are separate fields with separate verbs and separate costs. Law 124 forbids
 *      "one repair recipe" by name, and the only way that stays true is if fixing one provably
 *      does not fix another.
 *   2. THE STAGE IS EARNED. `boatStage` is DERIVED from work done, so no amount of knowledge,
 *      no migration and no single action can hand back a rung nobody worked for.
 *   3. THE LADDER IS REAL, AND IT READS THE BOAT'S OWN DOMAIN. Every rung elsewhere in this
 *      file is hand-written into `s.boat`, which is right for testing the arithmetic
 *      DOWNSTREAM of a rung and useless for testing the rung itself — so a whole describe
 *      block walks `repairHullStructure`/`sealHull` through their real front door. It exists
 *      because a build in which `repairRung` returned a constant passed 1690 unit tests and 34
 *      device checks without a murmur, which is not a hypothetical.
 *   4. FAIR CHALLENGE, ON A GATE THAT CAN ACTUALLY REFUSE. The float forecast and the float
 *      test must agree on the same inputs — and the test must be failable by playing badly,
 *      or the forecast is decoration. Both halves, plus the ROUTE OUT of a failure, because a
 *      reachable refusal with no way forward is a dead end rather than a challenge.
 *   5. THE LOOP CLOSES ON THE BOAT. Working her trains the domain her competence reads, so
 *      "go and get better at hulls" is something a survivor can do at the hull.
 *   6. [[D-011]] ABSOLUTE, BY PROPERTY. Nothing about a hull changes during an absence — every
 *      combination of the five systems, at every rung, across absences from a minute to a year.
 *   7. DEATH IS NOT ABSENCE. The hull crosses to a successor as matter; what only a witness
 *      could know does not.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/brain/state';
import {
    freshBoat, boatStage, stageNote, boatCapabilityNote,
    canSurveyHull, surveyBlocker, surveyHull, surveyFindings,
    canShoreUp, shoreUpBlocker, shoreUpBoat,
    canDewater, dewaterBlocker, dewaterBoat,
    canRepairStructure2, structuralBlocker, repairHullStructure,
    canSealHull, sealBlocker, sealHull,
    hullCompetence, repairRung, couldImprove, rungIsBetter, partsInHand,
    canFloatTest, floatTestBlocker, floatTestForecast, runFloatTest, floatForecastNote,
    postTrialFindings, weaknessOf, boatCapacityKg, learnLoad, loadNote,
    canBoardBoat, boardBlocker, canMoor, moorBlocker, moorBoat,
    canFerry, ferryBlocker, ferryForecast, runFerry, ferryFindings, ferryNote,
} from '../src/brain/boat';
import { canReassemble, OUTBOARD_PARTS } from '../src/brain/heavyObjects';
import { verbsFor, availableVerbs, holdOpensCircle } from '../src/brain/verbs';
import { serialize, deserialize, migrate } from '../src/brain/save';
import { reconcile } from '../src/brain/reconcile';
import { closeSurvivor } from '../src/brain/succession';
import { readTrace } from '../src/brain/traces';
import { MANUALS } from '../src/data/world';

const MANUAL = MANUALS[0];
import { SCHEMA_VERSION, type GameState } from '../src/brain/types';
import { TUNE, realSecondsPerGameHour } from '../src/data/tune';

const NOW = 1_770_000_000_000;

/**
 * THE FIXTURES NAME A COMPETENCE, NOT JUST A STATE — and that distinction is load-bearing.
 *
 * Every rung in this file used to be hand-written straight into `s.boat.structural`, which
 * meant NOT ONE test ever called `repairRung` or `hullCompetence`. A build in which
 * `repairRung` simply returned a constant passed the whole suite and the whole device
 * section. So the fixtures below reach their rungs by BEING that good at boats, and the
 * hand-written rungs are kept only where the point is the arithmetic downstream of a rung.
 */

/** Barely over the survey threshold: she understands hulls, and her work shows it. */
function ready(): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 14, y: 100 };
    s.inventory.wood = 40; s.inventory.fiber = 40; s.inventory.stone = 40;
    s.knowledge.domains.navigationSeamanship.technique = TUNE.boatSeamanshipTechnique + 5;
    s.tools.flask = true;
    s.outboard.teardown = {
        rung: 'expert', destroyed: false, gained: {},
        parts: ['mountingBracket', 'cowling', 'prop'],
    };
    //  THE HANDS, NOT THE RECORD. `outboard.teardown.parts` is what that teardown yielded;
    //  `carriedParts` is what the survivor is actually holding, and it is the ledger both
    //  `canReassemble` and (now) the boat read. Setting only the first gave a fixture a
    //  bracket the game could see and the survivor did not have.
    s.carriedParts = ['mountingBracket', 'cowling', 'prop'];
    return s;
}

/** A real boatwright — enough seamanship that her repairs are `competent` or better. */
function capable(): GameState {
    const s = ready();
    s.knowledge.domains.navigationSeamanship.technique = 50;
    s.knowledge.domains.navigationSeamanship.understanding = 30;
    return s;
}

/** Walked all the way to B1: surveyed, propped, bailed. Still the barely-able survivor. */
function stabilized(): GameState {
    const s = ready();
    expect(surveyHull(s)).toBe(true);
    expect(shoreUpBoat(s)).toBe(true);
    expect(dewaterBoat(s)).toBe(true);
    return s;
}

/** B1, by a survivor good enough to float her. */
function stabilizedCapable(): GameState {
    const s = capable();
    expect(surveyHull(s)).toBe(true);
    expect(shoreUpBoat(s)).toBe(true);
    expect(dewaterBoat(s)).toBe(true);
    return s;
}

/**
 * ...and both repairs in her, done by hands that can do the job — so she is ready to be
 * floated. The rungs here are EARNED through `repairHullStructure`/`sealHull`, never written.
 */
function repaired(): GameState {
    const s = stabilizedCapable();
    expect(repairHullStructure(s)).not.toBeNull();
    expect(sealHull(s)).not.toBeNull();
    return s;
}

/** The same hull, rushed: repaired by a survivor who had only just learned to read one. */
function rushed(): GameState {
    const s = stabilized();
    expect(repairHullStructure(s)).not.toBeNull();
    expect(sealHull(s)).not.toBeNull();
    return s;
}

describe('B0 — the secured wreck, and the ladder up from it', () => {
    it('a fresh hull is B0, and B0 says honestly what it is NOT', () => {
        const s = ready();
        expect(boatStage(s)).toBe('B0');
        expect(stageNote('B0')).toMatch(/will not float/i);
        //  "A successful start is not a completed repair" — every stage names its own ceiling.
        expect(boatCapabilityNote(s)).toMatch(/not flotation/i);
    });

    it('THE SURVEY IS STUDY BEFORE THE ATTEMPT, and it needs understanding by either route', () => {
        const blind = createInitialState(NOW);
        blind.player = { x: 14, y: 100 };
        expect(canSurveyHull(blind), 'a survivor who knows nothing surveyed a hull').toBe(false);
        expect(surveyBlocker(blind)).toMatch(/work more boats|wrote it down/i);

        const s = ready();
        expect(canSurveyHull(s)).toBe(true);
        expect(surveyHull(s)).toBe(true);
        //  ...and what it teaches is that these are TWO jobs, which is the whole design.
        const found = surveyFindings(s);
        expect(found.join(' ')).toMatch(/hull/i);
        expect(found.join(' ')).toMatch(/seams/i);
        expect(found.join(' '), 'the survey did not say they are separate').toMatch(/two different jobs/i);
    });

    it('...and the survey spends NOTHING — it is knowledge, not work', () => {
        const s = ready();
        const before = { ...s.inventory };
        surveyHull(s);
        expect(s.inventory).toEqual(before);
    });
});

describe('B1 — the stabilized shell, and Law 125 rigging over strength', () => {
    it('PROPPING IS TIMBER, NOT MUSCLE — no technique substitutes for wood under the bilge', () => {
        const strong = ready();
        strong.knowledge.domains.navigationSeamanship.technique = 100;
        surveyHull(strong);
        strong.inventory.wood = 0;
        expect(canShoreUp(strong), 'strength propped a boat').toBe(false);
        expect(shoreUpBlocker(strong)).toMatch(/more wood/i);
    });

    it('...and you must know where to put them before you put them there', () => {
        const s = ready();
        expect(canShoreUp(s), 'propped a hull nobody had surveyed').toBe(false);
        expect(shoreUpBlocker(s)).toMatch(/go over her first/i);
    });

    it('BAILING NEEDS HER HELD FIRST — the safety claim, not a difficulty knob', () => {
        const s = ready();
        surveyHull(s);
        expect(canDewater(s)).toBe(false);
        expect(dewaterBlocker(s)).toMatch(/not until she is propped/i);
        shoreUpBoat(s);
        expect(canDewater(s)).toBe(true);
    });

    it('...and something to bail WITH', () => {
        const s = ready();
        s.tools.flask = false;
        surveyHull(s); shoreUpBoat(s);
        expect(canDewater(s), 'bailed a hull with bare hands').toBe(false);
        expect(dewaterBlocker(s)).toMatch(/something to bail with/i);
    });

    it('surveyed + propped + bailed IS B1, and not one of the three alone', () => {
        const s = ready();
        surveyHull(s);
        expect(boatStage(s)).toBe('B0');
        shoreUpBoat(s);
        expect(boatStage(s), 'props alone promoted her').toBe('B0');
        dewaterBoat(s);
        expect(boatStage(s)).toBe('B1');
        expect(boatCapabilityNote(s)).toMatch(/do not trust her in the water/i);
    });
});

describe('FIVE SYSTEMS, NOT ONE REPAIR METER (Law 124)', () => {
    it('THE STRUCTURAL REPAIR DOES NOT MAKE HER TIGHT, and the seal does not make her strong', () => {
        //  The claim Law 124 forbids collapsing. Each repair moves its OWN system and leaves
        //  the other exactly where it was.
        const s = stabilized();
        expect(repairHullStructure(s)).not.toBeNull();
        expect(s.boat.structural, 'the hull repair did nothing').not.toBeNull();
        expect(s.boat.seal, 'backing the frames sealed the seams too').toBeNull();
        expect(canFloatTest(s), 'an unsealed hull was cleared to float').toBe(false);
        expect(floatTestBlocker(s)).toMatch(/seams are still open/i);

        const t = stabilized();
        expect(sealHull(t)).not.toBeNull();
        expect(t.boat.seal).not.toBeNull();
        expect(t.boat.structural, 'paying the seams backed the frames too').toBeNull();
        expect(floatTestBlocker(t)).toMatch(/frames are still sprung/i);
    });

    it('...and they cost DIFFERENT things, which is what makes them different jobs', () => {
        const s = stabilized();
        const before = { ...s.inventory };
        repairHullStructure(s);
        expect(s.inventory.wood, 'the structural repair did not want timber').toBeLessThan(before.wood);
        expect(s.inventory.fiber, 'the structural repair ate fibre as well').toBe(before.fiber);

        const mid = { ...s.inventory };
        sealHull(s);
        expect(s.inventory.fiber, 'the seal did not want fibre').toBeLessThan(mid.fiber);
        expect(s.inventory.wood, 'the seal ate timber as well').toBe(mid.wood);
    });

    it('THE STRUCTURAL REPAIR USES A SALVAGED PART, and consumes it into the hull', () => {
        //  The reason this session follows the Weighted Shore: the bracket comes off the
        //  outboard the survivor tore down.
        const s = stabilized();
        expect(canRepairStructure2(s)).toBe(true);
        const done = repairHullStructure(s)!;
        expect(done.usedParts).toContain('mountingBracket');
        //  OUT OF THE HANDS — `carriedParts` is the ledger `canReassemble` reads, and consuming
        //  from the teardown RECORD instead left one bracket doing two jobs.
        expect(s.carriedParts, 'the bracket is still in her hands').not.toContain('mountingBracket');
        //  ...and the other parts are untouched, in both ledgers.
        expect(s.carriedParts).toContain('cowling');
        expect(s.outboard.teardown!.parts, 'the teardown record was rewritten').toContain('mountingBracket');
    });

    it('...and without the bracket it says so, naming the part', () => {
        const s = stabilized();
        s.carriedParts = [];
        expect(canRepairStructure2(s)).toBe(false);
        expect(structuralBlocker(s)).toMatch(/mounting bracket/i);
    });

    it('neither repair may be attempted with water still in her', () => {
        const s = ready();
        surveyHull(s); shoreUpBoat(s);
        expect(structuralBlocker(s)).toMatch(/bail her out/i);
        expect(sealBlocker(s)).toMatch(/bail her out/i);
    });
});

describe('THE CRAFT PRESERVES MAKER HISTORY AND DEFECTS', () => {
    it('a repair records the rung it was done at and what went into it', () => {
        const s = stabilized();
        const done = repairHullStructure(s)!;
        expect(done.rung, 'the rung was not the one her hands could actually do').toBe('basic');
        expect(done.usedMaterials.wood).toBe(TUNE.boatStructuralWoodCost);
        //  ...and it is still on the boat afterwards, not thrown away.
        expect(s.boat.structural).toEqual(done);
    });

    it('HONEST DEGRADE, NOT PASS/FAIL — a poor repair holds, it just weeps', () => {
        //  The Weighted Shore's degrade-not-destroy language, spoken about water. Every rung
        //  produces a REAL repair; they differ in how much they leak.
        const rungs = ['novice', 'basic', 'competent', 'skilled', 'expert'] as const;
        let last = 2;
        for (const rung of rungs) {
            const w = weaknessOf({ rung, usedParts: [], usedMaterials: {} });
            expect(w, `${rung} leaks more than the rung below it`).toBeLessThan(last);
            expect(w, `${rung} is not a real repair`).toBeLessThanOrEqual(1);
            last = w;
        }
        //  ...and no repair at all is worse than the worst repair.
        expect(weaknessOf(null)).toBeGreaterThan(weaknessOf({ rung: 'novice', usedParts: [], usedMaterials: {} }));
    });
});

/**
 * THE LADDER, THROUGH ITS OWN FRONT DOOR.
 *
 * Every other rung in this file is hand-written into `s.boat`, which is right for testing the
 * arithmetic downstream of a rung and useless for testing the rung itself. Nothing in the
 * suite called `repairRung` or `hullCompetence`, and a build where `repairRung` returned a
 * constant passed all of it — 1690 unit tests and 34 device checks — without a murmur. These
 * are the assertions that would have said so.
 */
describe('the repair ladder is REAL, and it reads the boat\u2019s own domain', () => {
    it('A BARELY-ABLE SURVIVOR MAKES BASIC WORK; A BOATWRIGHT MAKES BETTER — through the real verbs', () => {
        const poor = rushed();
        const good = repaired();
        expect(poor.boat.structural!.rung, 'a barely-able survivor did better than basic').toBe('basic');
        expect(poor.boat.seal!.rung).toBe('basic');
        expect(rungIsBetter(good.boat.structural!.rung, poor.boat.structural!.rung),
            'skill made no difference to the frames').toBe(true);
        expect(rungIsBetter(good.boat.seal!.rung, poor.boat.seal!.rung),
            'skill made no difference to the seams').toBe(true);
    });

    it('THE LADDER IS REUSED; THE DOMAIN IS NOT — engines do not teach you to caulk', () => {
        //  `competenceFor` reads `mechanicalSystems`, which is right for stripping an outboard
        //  and wrong for sistering frames. If the boat ever borrowed that domain by mistake,
        //  this is what would catch it: a master mechanic who has never worked a hull.
        const mechanic = stabilized();
        mechanic.knowledge.domains.mechanicalSystems.technique = 100;
        mechanic.knowledge.domains.mechanicalSystems.understanding = 100;
        const plain = stabilized();
        expect(hullCompetence(mechanic), 'engine knowledge moved the hull ladder')
            .toBe(hullCompetence(plain));
        expect(repairRung(mechanic)).toBe(repairRung(plain));

        //  ...and the domain that DOES move it is the one the raft and the crossing train.
        const sailor = stabilized();
        sailor.knowledge.domains.navigationSeamanship.technique = 90;
        sailor.knowledge.domains.navigationSeamanship.understanding = 70;
        expect(hullCompetence(sailor)).toBeGreaterThan(hullCompetence(plain));
        expect(rungIsBetter(repairRung(sailor), repairRung(plain))).toBe(true);
    });

    it('...and the manual is worth real competence at the hull, not merely permission', () => {
        const hands = stabilized();
        const alsoRead = stabilized();
        expect(readTrace(alsoRead, MANUAL.id).ok, 'the manual must be readable').toBe(true);
        expect(hullCompetence(alsoRead), 'reading it changed nothing at the hull')
            .toBeGreaterThan(hullCompetence(hands));
    });
});

/**
 * THE GATE THAT CAN REFUSE, AND THE ROUTE BACK OUT OF ITS REFUSAL.
 *
 * A gate that cannot refuse is not a gate, and a refusal with no route out is a dead end.
 * Both halves are asserted here because either alone is worse than neither.
 */
describe('B1 → B2 — the gate refuses a rushed hull, and says so first', () => {
    it('A HULL RUSHED AT BASIC WILL NOT SWIM — the failure is REACHABLE by playing badly', () => {
        const s = rushed();
        expect(s.boat.structural!.rung).toBe('basic');
        const f = floatTestForecast(s);
        expect(f.wouldHold, 'a hull backed at basic floated anyway').toBe(false);
        //  ...and the survivor is told BEFORE committing, in words, which is fair challenge.
        expect(floatForecastNote(s), 'the forecast did not warn her').toMatch(/fill faster than you could bail/i);
        const result = runFloatTest(s)!;
        expect(result.wouldHold).toBe(false);
        expect(boatStage(s)).toBe('B1');
    });

    it('...AND THERE IS ALWAYS A WAY FORWARD: get better, do it again, float her', () => {
        const s = rushed();
        runFloatTest(s);
        expect(boatStage(s)).toBe('B1');
        //  The post-trial inspection named the fault. This is the survivor acting on it.
        s.knowledge.domains.navigationSeamanship.technique = 50;
        s.knowledge.domains.navigationSeamanship.understanding = 30;
        expect(canRepairStructure2(s), 'a better survivor could not touch her own bad work').toBe(true);
        expect(canSealHull(s)).toBe(true);
        expect(repairHullStructure(s)!.rung).toBe('competent');
        expect(sealHull(s)!.rung).toBe('competent');
        expect(runFloatTest(s)!.wouldHold, 'she still would not swim after real work').toBe(true);
        expect(boatStage(s), 'the route out did not reach B2').toBe('B2');
    });

    it('THE REDO IS GATED ON DOING BETTER, and the refusal names the enabler (Law 95)', () => {
        const s = rushed();
        //  Unchanged hands: there is nothing to gain, so there is nothing to spend.
        expect(couldImprove(s, s.boat.structural)).toBe(false);
        expect(canRepairStructure2(s)).toBe(false);
        expect(structuralBlocker(s)).toMatch(/could do no better/i);
        expect(structuralBlocker(s), 'the refusal did not name the work already in her').toMatch(/basic/i);
        expect(sealBlocker(s)).toMatch(/would not better it/i);

        const before = { ...s.inventory };
        expect(repairHullStructure(s), 'a pointless redo was allowed').toBeNull();
        expect(s.inventory, 'a refused redo still charged for it').toEqual(before);
    });

    it('THE BRACKET IS SPENT OUT OF THE SURVIVOR\u2019S HANDS, so it cannot ALSO rebuild the motor', () => {
        //  There are two ledgers: `outboard.teardown.parts` records what a teardown yielded,
        //  and `carriedParts` is what the survivor holds — the one `canReassemble` reads.
        //  Consuming the bracket out of the record only left it in the hands, so backing the
        //  frames and rebuilding the outboard both worked off one piece of steel.
        const s = stabilizedCapable();
        s.carriedParts = [...OUTBOARD_PARTS];
        expect(canReassemble(s), 'the fixture could not have rebuilt the motor to begin with').toBe(true);
        expect(repairHullStructure(s)).not.toBeNull();
        expect(s.carriedParts, 'the bracket is still in her hands after going into the hull')
            .not.toContain('mountingBracket');
        expect(canReassemble(s), 'one bracket backed the frames AND rebuilt the motor').toBe(false);
        //  ...and the teardown’s own record is untouched: it says what that attempt yielded,
        //  which stays true after the part is spent.
        expect(s.outboard.teardown!.parts, 'the teardown record was rewritten').toContain('mountingBracket');
    });

    it('THE BRACKET IS WANTED ONCE — a redo does not demand a part that is already in her', () => {
        const s = rushed();
        expect(partsInHand(s), 'the bracket was not consumed on the first repair').not.toContain('mountingBracket');
        s.knowledge.domains.navigationSeamanship.technique = 50;
        s.knowledge.domains.navigationSeamanship.understanding = 30;
        //  There is no second bracket in the world. If the redo demanded one, this is a dead end.
        expect(structuralBlocker(s), 'the redo asked for a bracket that no longer exists').toBeNull();
        expect(repairHullStructure(s)).not.toBeNull();
    });

    it('THE CRAFT KEEPS HER HISTORY: timber in her frames counts BOTH attempts', () => {
        const s = rushed();
        const first = s.boat.structural!.usedMaterials.wood;
        const firstFibre = s.boat.seal!.usedMaterials.fiber;
        s.knowledge.domains.navigationSeamanship.technique = 50;
        s.knowledge.domains.navigationSeamanship.understanding = 30;
        repairHullStructure(s); sealHull(s);
        expect(s.boat.structural!.usedMaterials.wood, 'the second backing forgot the first')
            .toBe(first! + TUNE.boatStructuralWoodCost);
        expect(s.boat.seal!.usedMaterials.fiber).toBe(firstFibre! + TUNE.boatSealFiberCost);
        expect(s.boat.structural!.usedParts, 'the bracket fell out of her record').toContain('mountingBracket');
    });
});

describe('B1 → B2 — the tethered float test, and fair challenge', () => {
    it('THE FORECAST AND THE TEST AGREE ON THE SAME INPUTS (the fair-challenge rule)', () => {
        //  The teardown's own note: a preview that can disagree with the real roll fails the
        //  fair-challenge half outright. Driven across every combination of repair quality.
        const rungs = ['novice', 'basic', 'competent', 'skilled', 'expert'] as const;
        for (const hull of rungs) {
            for (const seam of rungs) {
                const s = stabilized();
                s.boat.structural = { rung: hull, usedParts: [], usedMaterials: {} };
                s.boat.seal = { rung: seam, usedParts: [], usedMaterials: {} };
                const forecast = floatTestForecast(s);
                const result = runFloatTest(s)!;
                expect(result.wouldTake, `${hull}/${seam} forecast disagreed with the test`).toBe(forecast.wouldTake);
                expect(result.wouldHold).toBe(forecast.wouldHold);
                expect(s.boat.floatTest!.held).toBe(forecast.wouldHold);
            }
        }
    });

    it('...and the forecast is READABLE before committing, in the amounts it means', () => {
        const s = repaired();
        const note = floatForecastNote(s);
        expect(note.length).toBeGreaterThan(0);
        expect(note, 'the forecast said nothing about what would happen').toMatch(/swim|fill|weep/i);
    });

    it('A FAILED TEST COSTS THE AFTERNOON AND NOTHING ELSE', () => {
        //  Tethered: she comes back up the sand with every repair still in her. That is
        //  degrade-not-destroy applied to the gate itself.
        const s = stabilized();
        s.boat.structural = { rung: 'novice', usedParts: [], usedMaterials: {} };
        s.boat.seal = { rung: 'novice', usedParts: [], usedMaterials: {} };
        const before = { ...s.inventory };
        const result = runFloatTest(s)!;
        expect(result.wouldHold, 'two novice repairs floated').toBe(false);
        expect(boatStage(s), 'a failed test promoted her anyway').toBe('B1');
        expect(s.boat.structural, 'a failed test destroyed the repair').not.toBeNull();
        expect(s.boat.seal).not.toBeNull();
        expect(s.inventory, 'a failed test cost materials').toEqual(before);
    });

    it('...and the post-trial inspection reads BOTH systems separately, not pass/fail', () => {
        const s = stabilized();
        s.boat.structural = { rung: 'expert', usedParts: [], usedMaterials: {} };
        s.boat.seal = { rung: 'novice', usedParts: [], usedMaterials: {} };
        runFloatTest(s);
        const found = postTrialFindings(s).join(' ');
        expect(found, 'the inspection never mentioned the frames').toMatch(/frames/i);
        expect(found, 'the inspection never mentioned the seams').toMatch(/seams|garboard/i);
        //  ...and it distinguishes them: the good one is praised, the bad one named.
        expect(found).toMatch(/knew what they were about/i);
        expect(found).toMatch(/not driven home/i);
    });

    it('a hull with BOTH repairs done well reaches B2, and B2 names its own ceiling', () => {
        const s = repaired();
        expect(canFloatTest(s)).toBe(true);
        const result = runFloatTest(s)!;
        expect(result.wouldHold).toBe(true);
        expect(boatStage(s)).toBe('B2');
        //  The source: B2 is a real milestone AND it is not the end.
        expect(boatCapabilityNote(s)).toMatch(/not the open sea/i);
        expect(boatCapabilityNote(s)).toMatch(/no engine/i);
    });
});

describe('B2 — what a floating hull is actually FOR', () => {
    function floating(): GameState {
        const s = repaired();
        expect(runFloatTest(s)!.wouldHold).toBe(true);
        return s;
    }

    it('LOAD IS ITS OWN SYSTEM — floating empty says nothing about what she carries', () => {
        const s = floating();
        expect(s.boat.loadKnown, 'she reported her capacity without ever being loaded').toBe(false);
        expect(loadNote(s)).toMatch(/no telling/i);
        expect(learnLoad(s)).toBe(true);
        expect(loadNote(s)).toMatch(/\d+ kg/);
    });

    it('...and what she carries READS THE HULL rather than duplicating it', () => {
        const good = floating();
        const poor = floating();
        poor.boat.structural = { rung: 'novice', usedParts: [], usedMaterials: {} };
        expect(boatCapacityKg(poor), 'a hopeful patch carried as much as a backed one')
            .toBeLessThan(boatCapacityKg(good));
    });

    it('BOARDING AND MOORING ARE B2 ONLY, and each says why when it is not', () => {
        const b0 = ready();
        expect(canBoardBoat(b0)).toBe(false);
        expect(boardBlocker(b0)).toMatch(/shell on the sand/i);
        const b1 = stabilized();
        expect(boardBlocker(b1)).toMatch(/float her first/i);

        const s = floating();
        expect(canBoardBoat(s)).toBe(true);
        expect(canMoor(s)).toBe(true);
        expect(moorBoat(s)).toBe(true);
        expect(s.boat.moored).toBe(true);
        expect(moorBlocker(s)).toMatch(/already made fast/i);
    });

    it('...and mooring costs a painter, which it names', () => {
        const s = floating();
        s.inventory.fiber = 0;
        expect(canMoor(s)).toBe(false);
        expect(moorBlocker(s)).toMatch(/more fibre/i);
    });
});

describe('REACHABILITY (D-090) — every verb is offered at the boat, at the rung it belongs to', () => {
    it('ALL TEN ARE REACHABLE ACROSS HER LADDER, and nowhere else', () => {
        //  THIS USED TO ASSERT ALL TEN ON ONE CIRCLE, and that is no longer the law — but
        //  D-090's actual question is unchanged and this still answers it. "Is every verb
        //  reachable?" was previously answered by looking at a single stage, because every
        //  stage showed everything; a survivor at B0 met `moor-boat` ("there is nothing
        //  afloat to make fast") before she had been told the hull was even holed.
        //
        //  So the union over the LADDER is what has to be complete now, and that is a
        //  strictly stronger check than the old one: it fails both if a verb is dropped
        //  from the source AND if the staging strands one at a rung nothing can reach.
        const EVERY_BOAT_VERB = ['inspect-boat', 'survey-hull', 'shore-up-boat', 'dewater-boat',
            'repair-frames', 'seal-seams', 'float-test', 'board-boat', 'ferry-boat', 'moor-boat'];

        const s = capable();
        const seen = new Set<string>();
        const sweep = () => verbsFor(s, 'boat').forEach((v) => seen.add(v.id));

        sweep();                                        //  B0, untouched
        expect(surveyHull(s)).toBe(true); sweep();      //  B0, surveyed
        expect(shoreUpBoat(s)).toBe(true); sweep();     //  B0, propped
        expect(dewaterBoat(s)).toBe(true); sweep();     //  B1, bailed
        expect(repairHullStructure(s)).not.toBeNull(); sweep();
        expect(sealHull(s)).not.toBeNull(); sweep();    //  B1, both systems worked
        expect(runFloatTest(s)).not.toBeNull(); sweep();//  B2, afloat
        expect(learnLoad(s)).toBe(true); sweep();       //  B2, boarded
        expect(moorBoat(s)).toBe(true); sweep();        //  B2, made fast

        for (const verb of EVERY_BOAT_VERB) {
            expect([...seen], `${verb} is unreachable at every rung of the ladder`).toContain(verb);
        }
        expect(seen.size, 'a verb exists that no reachability check names').toBe(EVERY_BOAT_VERB.length);
        expect(holdOpensCircle(s, 'boat'), 'the boat has no circle to offer them from').toBe(true);

        //  ...AND NO RUNG IS EMPTY OF EVERYTHING BUT LOOKING. Hiding a verb is only honest
        //  while there is always some other thing on the wheel; a stage that staged its way
        //  down to `inspect-boat` alone would be a dead end wearing a tidy wheel.
        const t = capable();
        const steps: Array<() => void> = [
            () => { surveyHull(t); }, () => { shoreUpBoat(t); }, () => { dewaterBoat(t); },
            () => { repairHullStructure(t); }, () => { sealHull(t); }, () => { runFloatTest(t); },
            () => { learnLoad(t); }, () => { moorBoat(t); },
        ];
        for (let i = 0; i <= steps.length; i++) {
            const ids = verbsFor(t, 'boat').map((v) => v.id);
            expect(ids.length, `rung ${i} offers nothing but looking: [${ids.join(', ')}]`)
                .toBeGreaterThan(1);
            expect(ids[0], `rung ${i} does not lead with looking`).toBe('inspect-boat');
            if (i < steps.length) steps[i]();
        }

        for (const target of ['pond', 'shelter', 'fire', 'ground', 'construction'] as const) {
            const other = verbsFor(s, target).map((v) => v.id);
            for (const verb of EVERY_BOAT_VERB) {
                if (verb === 'inspect-boat') continue;
                expect(other, `${target} offered ${verb}`).not.toContain(verb);
            }
        }
    });

    it('AND NO RUNG OF THE LADDER OVERFLOWS THE WHEEL — four is what the arc holds', () => {
        //  THE DEFECT THIS CLOSES, reported from a device: "23 wood, 8 fibre, axe in hand,
        //  long-press the boat, only Look her over is active." Ten verbs on an arc that
        //  carries four drew FOUR segments at 71px — too narrow to print a refusal under a
        //  label — and sent six to the pip. The gate that was actually stopping her
        //  (`survey-hull` wants seamanship 14; a fresh survivor has 5) could not say so.
        //
        //  Bounded HERE, in the brain, rather than only in the device harness: the layout can
        //  prove a wheel of four is drawable, but only this can prove the boat never asks it
        //  to draw more on the way up.
        const t = capable();
        const steps: Array<() => void> = [
            () => { surveyHull(t); }, () => { shoreUpBoat(t); }, () => { dewaterBoat(t); },
            () => { repairHullStructure(t); }, () => { sealHull(t); }, () => { runFloatTest(t); },
            () => { learnLoad(t); }, () => { moorBoat(t); },
        ];
        for (let i = 0; i <= steps.length; i++) {
            const ids = verbsFor(t, 'boat').map((v) => v.id);
            expect(ids.length, `rung ${i} wants ${ids.length} segments: [${ids.join(', ')}]`)
                .toBeLessThanOrEqual(4);
            if (i < steps.length) steps[i]();
        }
    });

    it('...and the ONE state that does exceed it is named rather than claimed away', () => {
        //  HONESTY ABOUT THE BOUND. Walking the ladder never wants more than four, and it
        //  would be easy to state that as "the boat never overflows" — but there is exactly
        //  one reachable state where it does, and a claim that quietly excluded it would be
        //  this session's own recurring defect: a sentence whose subject drifted out from
        //  under it.
        //
        //  THE STATE IS: floated, then GOT BETTER AT HULLS. Both repairs become improvable
        //  again (`canRepairStructure2`/`canSealHull` read `couldImprove`), and if she has not
        //  yet been boarded or made fast those one-shots are still pending too — five things
        //  worth doing at once, on an arc that carries four.
        //
        //  IT IS LEFT AT FIVE DELIBERATELY. The alternative was to hide a repair she is now
        //  good enough to better, which would delete a real capability — `boatCapacityKg`
        //  reads the repair rung — to protect a tidier number. The pip exists for exactly
        //  this, and [[D-188]] made it carry the COMPLETE surface with every reason in full.
        const s = capable();
        surveyHull(s); shoreUpBoat(s); dewaterBoat(s);
        repairHullStructure(s); sealHull(s); runFloatTest(s);
        expect(boatStage(s), 'the fixture did not reach B2').toBe('B2');
        const walked = verbsFor(s, 'boat').map((v) => v.id);
        expect(walked.length, `afloat as repaired: [${walked.join(', ')}]`).toBeLessThanOrEqual(4);

        s.knowledge.domains.navigationSeamanship.technique = 95;
        s.knowledge.domains.navigationSeamanship.understanding = 90;
        const better = verbsFor(s, 'boat');
        const ids = better.map((v) => v.id);
        expect(ids, 'better hands did not reopen the frames').toContain('repair-frames');
        expect(ids, 'better hands did not reopen the seams').toContain('seal-seams');
        expect(ids.length, `the improvement corner: [${ids.join(', ')}]`).toBe(5);
        //  ...AND THE FIFTH IS NOT LOST, which is the only thing that makes five acceptable.
        //  Every one of them is live, so the arc carries four and the pip carries the rest —
        //  nothing here is a refusal a survivor cannot read.
        expect(better.every((v) => v.available), `something in the corner is dead: `
            + better.filter((v) => !v.available).map((v) => v.id).join(', ')).toBe(true);

        //  AND IT CLOSES ITSELF AS SHE USES IT: board her and moor her, and the one-shots
        //  retire, taking it back under the arc's capacity without anything being hidden.
        learnLoad(s);
        moorBoat(s);
        const settled = verbsFor(s, 'boat').map((v) => v.id);
        expect(settled.length, `after the one-shots retire: [${settled.join(', ')}]`)
            .toBeLessThanOrEqual(4);
    });

    it('THERE IS ALWAYS SOMETHING TO DO AT HER BESIDES LOOK, at every stage', () => {
        //  The first version asserted `availableVerbs(...).length > 0`, which `inspect-boat`
        //  satisfies on its own — it is a hard-coded `available: true` — so the check read the
        //  same green on a build where the entire nine-verb ladder was permanently locked.
        //  D-090 asks whether there is a WAY FORWARD, and looking at her is not one.
        for (const s of [ready(), stabilized(), stabilizedCapable(), repaired()]) {
            const doing = availableVerbs(s, 'boat').filter((v) => v.id !== 'inspect-boat');
            expect(doing.length, `nothing but looking is possible at ${boatStage(s)}`).toBeGreaterThan(0);
        }
    });

    it('...and every blocked verb carries a reason (Law 26 — never a silent grey)', () => {
        for (const s of [ready(), stabilized(), repaired()]) {
            for (const v of verbsFor(s, 'boat')) {
                if (v.available) expect(v.reason, `${v.id} was available AND gave a reason`).toBeNull();
                else expect(v.reason, `${v.id} is blocked with no reason at ${boatStage(s)}`).toBeTruthy();
            }
        }
    });
});


describe('B2 — manual propulsion, which is what makes her a boat rather than a float', () => {
    /** Floated, sat in, and therefore ready to be paddled. */
    function afloat(): GameState {
        const s = repaired();
        expect(runFloatTest(s)?.wouldHold).toBe(true);
        expect(learnLoad(s)).toBe(true);
        return s;
    }

    it('A HULL THAT CANNOT BE MOVED IS NOT A BOAT — the paddle is refused below B2, by name', () => {
        for (const s of [ready(), stabilized(), repaired()]) {
            expect(canFerry(s), `she was paddled at ${boatStage(s)}`).toBe(false);
            expect(ferryBlocker(s), 'a silent refusal at ' + boatStage(s)).toBeTruthy();
        }
        //  ...and floating alone is not enough: you do not take the paddle to a boat you
        //  have never sat in. Ordering, and it is spoken rather than merely enforced.
        const floated = repaired();
        runFloatTest(floated);
        expect(canFerry(floated)).toBe(false);
        expect(ferryBlocker(floated)).toMatch(/get into her first/i);
    });

    it('THE COST IS ARMS, AND SLOWER MEANS LONGER RATHER THAN CHEAPER', () => {
        const s = afloat();
        const f = ferryForecast(s);
        expect(f.blocker).toBeNull();
        expect(f.metres).toBe(TUNE.boatFerryDistanceM);
        //  The speed fraction DIVIDES the time: a boat you can barely move is not cheaper
        //  to move. Asserted against a walk of the same distance rather than a magic number.
        const walkHours = (f.metres / TUNE.walkSpeedMps) / realSecondsPerGameHour;
        expect(f.hours, 'paddling was not slower than walking').toBeGreaterThan(walkHours);
        expect(f.energyCost).toBeGreaterThan(0);

        const before = s.energy;
        expect(runFerry(s)).not.toBeNull();
        expect(s.energy, 'the trip cost nothing').toBeLessThan(before);
        expect(s.energy).toBeCloseTo(before - f.energyCost, 6);
    });

    it('FAIR CHALLENGE — the forecast and the trip are the same arithmetic, at every quality', () => {
        const rungs = ['novice', 'basic', 'competent', 'skilled', 'expert'] as const;
        for (const hull of rungs) {
            for (const seam of rungs) {
                const s = afloat();
                s.boat.structural = { rung: hull, usedParts: [], usedMaterials: {} };
                s.boat.seal = { rung: seam, usedParts: [], usedMaterials: {} };
                const forecast = ferryForecast(s);
                const before = s.energy;
                const trip = runFerry(s)!;
                expect(trip.tookOnWater, `${hull}/${seam} disagreed on water`).toBeCloseTo(forecast.tookOnWater, 10);
                expect(before - s.energy, `${hull}/${seam} disagreed on effort`).toBeCloseTo(forecast.energyCost, 10);
            }
        }
    });

    it('...and a hopeful patch is felt EVERY time she is moved, not once at the gate', () => {
        const poor = afloat();
        poor.boat.structural = { rung: 'novice', usedParts: [], usedMaterials: {} };
        const good = afloat();
        good.boat.structural = { rung: 'expert', usedParts: [], usedMaterials: {} };
        good.boat.seal = { rung: 'expert', usedParts: [], usedMaterials: {} };
        expect(ferryForecast(poor).tookOnWater, 'a novice patch shipped no more water than an expert one')
            .toBeGreaterThan(ferryForecast(good).tookOnWater);
    });

    it('PROPULSION IS A CAPABILITY, NOT A RUNG — paddling neither advances nor undoes a stage', () => {
        const s = afloat();
        expect(boatStage(s)).toBe('B2');
        runFerry(s);
        expect(boatStage(s), 'the ferry moved the ladder').toBe('B2');
        //  Repeatable, because a boat you may only paddle once is a cutscene.
        expect(canFerry(s)).toBe(true);
        expect(runFerry(s)).not.toBeNull();
    });

    it('THE LINE IS THE CEILING, AND IT IS SPOKEN — the wreck is further than she goes', () => {
        const s = afloat();
        expect(ferryNote(s)).toMatch(/wreck is further/i);
        //  90 m round trip against a wreck ~115 m off the shore: short of it on purpose.
        expect(TUNE.boatFerryDistanceM / 2).toBeLessThan(115);
        runFerry(s);
        //  ...and the trip leaves evidence rather than a feeling.
        expect(s.boat.ferried).toBe(true);
        expect(ferryFindings(s).join(' ')).toMatch(/paddle/i);
        expect(boatCapabilityNote(s), 'B2 stopped naming its own ceiling').toMatch(/no engine/i);
    });

    it('...and D-011 reaches the ferry no more than it reaches the hull', () => {
        const s = afloat();
        runFerry(s);
        const before = JSON.stringify(s.boat);
        const { state: later } = reconcile(s, 96 * 3600);
        expect(JSON.stringify(later.boat)).toBe(before);
        expect(later.boat.ferried, 'a trip taken was forgotten while nobody was there').toBe(true);
    });
});
/**
 * DEATH IS NOT ABSENCE, AND THE HULL SURVIVES BOTH — but not the same parts of her.
 *
 * `closeSurvivor` builds the successor from a FRESH state and copies the island onto it, so
 * every field not named there defaults to dying with its owner. `boat` was not named, which
 * meant a survivor died and the next one walked up to bare sand where three days of work had
 * been — the same omission that once cost a director his workmat, and caught by the same rule.
 */
describe('the loop closes on the boat herself', () => {
    it('WORKING HER TEACHES YOU HER — so "go and get better" is a thing you can do AT the boat', () => {
        //  `hullCompetence` reads `navigationSeamanship`, and until the boat trained it the
        //  post-trial inspection could name a fault whose only cure was somewhere else.
        const s = stabilized();
        const before = s.knowledge.domains.navigationSeamanship.technique;
        surveyHull(s);   //  already surveyed by the fixture — refused, and a refusal teaches nothing
        expect(s.knowledge.domains.navigationSeamanship.technique,
            'a REFUSED verb taught the survivor something').toBe(before);

        repairHullStructure(s);
        const afterFrames = s.knowledge.domains.navigationSeamanship.technique;
        expect(afterFrames, 'backing her frames taught nothing about boats').toBeGreaterThan(before);
        sealHull(s);
        expect(s.knowledge.domains.navigationSeamanship.technique).toBeGreaterThan(afterFrames);
        const afterSeams = s.knowledge.domains.navigationSeamanship.technique;
        runFloatTest(s);
        expect(s.knowledge.domains.navigationSeamanship.technique,
            'putting her in the water taught nothing').toBeGreaterThan(afterSeams);
    });

    it('...and what you learn doing a job never improves the job you are doing', () => {
        //  The learning event fires AFTER the rung is read. If it fired first, a survivor on
        //  the cusp would get a rung they had not earned when they started.
        const s = stabilized();
        const expected = repairRung(s);
        expect(repairHullStructure(s)!.rung).toBe(expected);
    });
});

describe('D-011 — by property, not by fixture', () => {
    it('PROPERTY: no boat state, over any absence, changes by any amount', () => {
        //  The module header claimed a property test guarded this and there was none — the
        //  coverage was four hand-written states. This is the sentence made true: every
        //  combination of the five systems, at every rung, across absences from a minute to
        //  a year. `reconcile` has no boat term at all, so what this really asserts is that
        //  nobody has since added one.
        const RUNGS = [null, 'novice', 'basic', 'competent', 'skilled', 'expert'] as const;
        const HOURS = [0.01, 1, 25, 24 * 7, 24 * 90, 24 * 365];
        let cases = 0;
        for (const hull of RUNGS) {
            for (const seam of RUNGS) {
                for (const flags of [0, 1, 2, 3, 4, 5, 6, 7]) {
                    const s = ready();
                    s.boat = {
                        surveyed: (flags & 1) !== 0,
                        supports: (flags & 2) !== 0,
                        dewatered: (flags & 4) !== 0,
                        structural: hull ? { rung: hull, usedParts: [], usedMaterials: { wood: 5 } } : null,
                        seal: seam ? { rung: seam, usedParts: [], usedMaterials: { fiber: 6 } } : null,
                        floatTest: hull && seam ? { attempted: true, held: flags % 2 === 0, tookOnWater: 0.2 } : null,
                        loadKnown: (flags & 1) !== 0,
                        at: 'shore',
                        moored: (flags & 2) !== 0,
                        ferried: (flags & 4) !== 0,
                    };
                    const before = JSON.stringify(s.boat);
                    const stageBefore = boatStage(s);
                    for (const h of HOURS) {
                        const { state: later } = reconcile(s, h * 3600);
                        expect(JSON.stringify(later.boat),
                            `${hull}/${seam}/${flags} changed over ${h}h away`).toBe(before);
                        expect(boatStage(later),
                            `${hull}/${seam}/${flags} changed STAGE over ${h}h away`).toBe(stageBefore);
                        cases++;
                    }
                }
            }
        }
        expect(cases, 'the property swept nothing').toBe(RUNGS.length * RUNGS.length * 8 * HOURS.length);
    }, 30_000);
});

describe('succession — the hull crosses, the knowing does not', () => {
    it('THE WORK IN HER IS MATTER, AND A SUCCESSOR FINDS IT: props, patch, caulk, painter', () => {
        const s = repaired();
        expect(runFloatTest(s)!.wouldHold).toBe(true);
        learnLoad(s);
        moorBoat(s);
        runFerry(s);
        expect(boatStage(s)).toBe('B2');

        const { next } = closeSurvivor(s, 'exposure');
        expect(next.boat.supports, 'the cribbing vanished with its builder').toBe(true);
        expect(next.boat.dewatered).toBe(true);
        expect(next.boat.structural, 'the frames un-sistered themselves').not.toBeNull();
        expect(next.boat.structural!.rung, 'the successor inherited a different quality of work')
            .toBe(s.boat.structural!.rung);
        expect(next.boat.seal).not.toBeNull();
        expect(next.boat.moored, 'the painter untied itself').toBe(true);
        //  ...and it is a COPY, so the dead survivor and the successor cannot share a hull.
        expect(next.boat.structural).not.toBe(s.boat.structural);
    });

    it('...and what only a witness could know dies with the witness', () => {
        const s = repaired();
        runFloatTest(s);
        learnLoad(s);
        runFerry(s);
        const { next } = closeSurvivor(s, 'exposure');
        //  Somebody watched her swim. That is not a fact about the island.
        expect(next.boat.floatTest, 'the successor inherited a trial they never saw').toBeNull();
        expect(next.boat.loadKnown, 'the successor knew what she carries without lifting anything').toBe(false);
        expect(next.boat.ferried).toBe(false);
        //  So she reads B1: a hull that LOOKS finished, and nobody alive knows if she floats.
        expect(boatStage(next), 'a stage crossed that nobody earned').toBe('B1');
        expect(boatCapabilityNote(next)).toMatch(/do not trust her in the water/i);
    });

    it('...and floating her again costs an afternoon and no materials — not a dead end', () => {
        const s = repaired();
        runFloatTest(s);
        const { next } = closeSurvivor(s, 'exposure');
        const before = { ...next.inventory };
        expect(canFloatTest(next), 'the successor could not put her back in the water').toBe(true);
        expect(runFloatTest(next)!.wouldHold).toBe(true);
        expect(boatStage(next)).toBe('B2');
        expect(next.inventory, 're-proving her cost the successor materials').toEqual(before);
    });

    it('THE SURVEY CROSSES, because it is floorboards up rather than a thought', () => {
        //  Without it a propped, bailed, backed and sealed hull would read B0 — "a hull on
        //  dry sand" — which would be the island lying about a boat you can walk around.
        const s = repaired();
        const { next } = closeSurvivor(s, 'exposure');
        expect(next.boat.surveyed).toBe(true);
        expect(boatStage(next)).not.toBe('B0');
    });
});

describe('D-011 — absence cannot reach her hull', () => {
    it('NO LENGTH OF ABSENCE CHANGES ANYTHING ABOUT HER: no flooding, no decay', () => {
        //  Structural rather than guarded: `reconcile` has no boat term at all, so there is no
        //  code that could flood a bailed hull or rot a patch. Half-done work is exactly as
        //  safe as finished work, which is the whole of what the brief asks here.
        for (const s of [ready(), stabilized(), repaired()]) {
            const before = JSON.stringify(s.boat);
            const { state: later } = reconcile(s, 96 * 3600);   // four days away
            expect(JSON.stringify(later.boat), 'the hull changed while nobody was there').toBe(before);
        }
    });

    it('...and a PARTIAL hull is exactly as safe as a finished one across the same absence', () => {
        const half = stabilized();
        half.boat.seal = { rung: 'basic', usedParts: [], usedMaterials: {} };
        const before = JSON.stringify(half.boat);
        const { state: later } = reconcile(half, 240 * 3600);   // ten days
        expect(JSON.stringify(later.boat)).toBe(before);
        expect(boatStage(later), 'the stage moved while nobody was there').toBe('B1');
    });

    it('...and everything about her survives a save exactly as it stood', () => {
        const s = repaired();
        runFloatTest(s);
        learnLoad(s);
        const env = deserialize(serialize(s, NOW))!;
        expect(env.state.boat).toEqual(s.boat);
        expect(boatStage(env.state)).toBe('B2');
    });

    it('a save from BEFORE the work migrates in at B0 — nothing invented, nothing lost', () => {
        const old = ready();
        const raw = JSON.parse(serialize(old, NOW));
        raw.schemaVersion = 36;
        delete raw.state.boat;
        raw.state.schemaVersion = 36;

        const migrated = migrate(raw)!;
        expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
        expect(migrated.state.boat).toEqual(freshBoat());
        expect(boatStage(migrated.state), 'the migration handed back a stage nobody earned').toBe('B0');
    });
});
