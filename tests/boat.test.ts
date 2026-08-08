/**
 * DROP 4 — THE PULL: THE WAY HOME, VISIBLE. Laws 124–125.
 *
 * WHAT THIS SUITE IS GUARDING, stated plainly, because a promise is unusually easy to break by
 * accident. The boat is not a system: it holds no state, runs no rate and cannot be advanced.
 * Almost everything true about it is therefore an ABSENCE, and absences rot in silence — one
 * plausible-looking summation in `boatUnderstanding`, one line of INFORMED text that names a
 * material, and the drop stops being a promise and becomes a walkthrough.
 *
 * So the four things asserted hardest here are the four that would go quietly:
 *
 *   1.  TWO ROUTES, NEVER SUMMED. Both reach the same rung; doing both reaches no further.
 *   2.  QUESTIONS, NEVER A PARTS LIST — swept by the same guard the junk catalogue uses, on the
 *       INFORMED reading especially, which is the one under pressure to be helpful.
 *   3.  THE SCOPE CAP IS REAL. B0 is the only stage that exists, and there is no repair verb.
 *   4.  D-011. Absence cannot reach her, and "there is nothing to break" is proved rather than
 *       asserted — because that sentence is exactly how the offline-death law gets broken.
 *
 * And one more that is not about the brain at all: THE VISUAL SENTENCE. Its geometry lives in
 * `world.ts`, so it can be proved here — the far island must be over open water from where she
 * lies, not behind the island's own hill.
 */
import { describe, expect, it } from 'vitest';
import {
    allSites,
    atBoat,
    boatAffordance,
    boatSight,
    boatStage,
    boatUnderstanding,
    boatUnderstandingNote,
    boatWorkBlocker,
    createInitialState,
    gatherNode,
    handsUnderstand,
    manualUnderstands,
    namesAFinishedAnswer,
    readTrace,
    recordTrying,
    reconcile,
    rung,
    traceById,
    type GameState,
} from '../src/brain';
import { BOAT, FAR_ISLAND, MANUALS, SPAWN, WORLD, WRECK, groundHeight, isWalkablePoint, surfaceHeightAt } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;
const MANUAL = MANUALS[0];

function fresh(): GameState {
    return fullBody(createInitialState(NOW));
}

/** A survivor standing alongside her. */
function alongside(): GameState {
    const s = fresh();
    s.player.x = BOAT.x;
    s.player.y = BOAT.y;
    return s;
}

/** THE MANUAL ROUTE, taken. Reading it is the whole of it. */
function readTheBook(s: GameState): GameState {
    const r = readTrace(s, MANUAL.id);
    expect(r.ok, 'the manual must actually be readable').toBe(true);
    return s;
}

/** THE HANDS ROUTE, taken. Technique in the domain everything afloat already trains. */
function didTheWork(s: GameState): GameState {
    s.knowledge.domains.navigationSeamanship.technique = TUNE.boatSeamanshipTechnique;
    return s;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

// ---------------------------------------------------------------------------
describe('she is on home ground, and a shore walk finds her', () => {
    it('sits on Spawn Island, on dry sand, above the tideline', () => {
        //  "Beached" is a claim about the ground under her, so it is read off the ground.
        expect(isWalkablePoint(BOAT.x, BOAT.y)).toBe(true);
        expect(groundHeight(BOAT.x, BOAT.y)).toBeGreaterThan(WORLD.seaLevel);
        expect(surfaceHeightAt(BOAT.x, BOAT.y)).toBeGreaterThan(WORLD.seaLevel);
        //  On the BEACH ring specifically — not in the trees, not in the surf.
        const r = Math.hypot(BOAT.x, BOAT.y);
        expect(r).toBeGreaterThan(WORLD.beachRadius);
        expect(r).toBeLessThan(WORLD.islandRadius);
    });

    it('is nowhere near the far island and needs no raft to reach', () => {
        //  The brief's own boundary: a SEPARATE vessel, on home ground.
        expect(dist(BOAT.x, BOAT.y, FAR_ISLAND.x, FAR_ISLAND.y))
            .toBeGreaterThan(FAR_ISLAND.radius * 2);
        //  And she is reachable by walking, from the point the survivor wakes at.
        const walk = dist(SPAWN.x, SPAWN.y, BOAT.x, BOAT.y);
        expect(walk).toBeLessThan(40);
        expect(walk).toBeGreaterThan(TUNE.interactRadiusM + TUNE.boatTapRadiusM);
    });

    it('REACHABILITY — a survivor who walks to her is in range, and one who does not is not', () => {
        //  The whole inspection route in one assertion pair: `atBoat` is the gate the body
        //  checks before it will say anything, so a gate that no walkable point satisfies
        //  would make the entire drop unreachable while every other test still passed.
        expect(atBoat(alongside())).toBe(true);

        const far = fresh();
        far.player.x = SPAWN.x;
        far.player.y = SPAWN.y;
        expect(atBoat(far)).toBe(false);

        //  And the range is generous enough to stand at her stern rather than inside her.
        const edge = fresh();
        edge.player.x = BOAT.x;
        edge.player.y = BOAT.y - (TUNE.interactRadiusM + TUNE.boatTapRadiusM) + 0.2;
        expect(atBoat(edge)).toBe(true);
    });

    it('THE VISUAL SENTENCE — from where she lies, the far island is over open water', () => {
        //  This is the composition the drop exists for, and it is geometry, so it is provable.
        //  Walk the sight line from the boat to the far island: once it has left the island it
        //  must never come back over it, or the "way home" would be sitting behind the hill.
        const dx = FAR_ISLAND.x - BOAT.x;
        const dy = FAR_ISLAND.y - BOAT.y;
        let leftLand = false;
        for (let t = 0; t <= 1; t += 0.001) {
            const r = Math.hypot(BOAT.x + dx * t, BOAT.y + dy * t);
            if (!leftLand && r > WORLD.islandRadius) leftLand = true;
            else if (leftLand && r <= WORLD.islandRadius) {
                throw new Error(`sight line re-enters Spawn Island at t=${t.toFixed(3)}`);
            }
        }
        expect(leftLand, 'the sight line never leaves the island at all').toBe(true);

        //  And she POINTS there. Her heading in `island.ts` is this bearing; asserting it here
        //  means a future nudge to either coordinate breaks a test rather than the sentence.
        const bearing = Math.atan2(dx, dy);
        const outward = Math.atan2(BOAT.x, BOAT.y);
        expect(Math.abs(bearing - outward)).toBeLessThan(0.35);
    });

    it('the manual is on home ground too — neither route needs the crossing', () => {
        expect(isWalkablePoint(MANUAL.x, MANUAL.y)).toBe(true);
        expect(groundHeight(MANUAL.x, MANUAL.y)).toBeGreaterThan(WORLD.seaLevel);
        expect(dist(MANUAL.x, MANUAL.y, FAR_ISLAND.x, FAR_ISLAND.y)).toBeGreaterThan(FAR_ISLAND.radius * 2);
        //  Far enough from the boat that finding one is not finding the other.
        expect(dist(MANUAL.x, MANUAL.y, BOAT.x, BOAT.y)).toBeGreaterThan(20);
    });
});

// ---------------------------------------------------------------------------
describe('two routes to one understanding (Law 125), and neither is mandatory', () => {
    it('a survivor who has done neither understands nothing yet', () => {
        const s = fresh();
        expect(manualUnderstands(s)).toBe(false);
        expect(handsUnderstand(s)).toBe(false);
        expect(boatUnderstanding(s)).toBe('physically-possible');
        expect(boatUnderstandingNote(s)).toBeNull();
    });

    it('THE MANUAL ROUTE alone reaches understanding', () => {
        const s = readTheBook(fresh());
        expect(manualUnderstands(s)).toBe(true);
        expect(handsUnderstand(s), 'reading must not grant technique').toBe(false);
        expect(rung(boatUnderstanding(s))).toBeGreaterThanOrEqual(rung('conceptually-suspected'));
    });

    it('THE HANDS ROUTE alone reaches the same understanding', () => {
        const s = didTheWork(fresh());
        expect(handsUnderstand(s)).toBe(true);
        expect(manualUnderstands(s), 'work must not forge a document').toBe(false);
        expect(rung(boatUnderstanding(s))).toBeGreaterThanOrEqual(rung('conceptually-suspected'));
    });

    it('NEITHER IS MANDATORY — each arrives at exactly what the other arrives at', () => {
        const byBook = boatAffordance(readTheBook(fresh()));
        const byHands = boatAffordance(didTheWork(fresh()));
        expect(byBook).toEqual(byHands);
        expect(boatUnderstanding(readTheBook(fresh()))).toEqual(boatUnderstanding(didTheWork(fresh())));
    });

    it('NEVER SUMMED — doing both arrives no further than doing either', () => {
        //  THE ONE THAT WOULD GO QUIETLY. If the two routes ever stack, "do both" silently
        //  becomes the optimal play and two paths collapse back into one long one — and the
        //  game would look fine the whole time, because both routes still work.
        const both = didTheWork(readTheBook(fresh()));
        expect(manualUnderstands(both)).toBe(true);
        expect(handsUnderstand(both)).toBe(true);
        expect(boatUnderstanding(both)).toEqual(boatUnderstanding(readTheBook(fresh())));
        expect(boatAffordance(both)).toEqual(boatAffordance(didTheWork(fresh())));
    });

    it('the note names the ROUTE and never the contents', () => {
        expect(boatUnderstandingNote(readTheBook(fresh()))).toBeTruthy();
        expect(boatUnderstandingNote(didTheWork(fresh()))).toBeTruthy();
        expect(boatUnderstandingNote(readTheBook(fresh())))
            .not.toEqual(boatUnderstandingNote(didTheWork(fresh())));
        const both = boatUnderstandingNote(didTheWork(readTheBook(fresh())));
        expect(both).toBeTruthy();
        for (const note of [
            boatUnderstandingNote(readTheBook(fresh())),
            boatUnderstandingNote(didTheWork(fresh())),
            both,
        ]) {
            expect(namesAFinishedAnswer(note!), `"${note}" instructs`).toBe(false);
        }
    });

    it('the manual reaches the ladder through the SHIPPED channel, with no branch of its own', () => {
        //  `ladderFor` is untouched by this drop. It answers for 'boat' because the site
        //  carries the topic — the same way the far island's raft note works.
        expect(MANUAL.topic).toBe('boat');
        expect(allSites().some((t) => t.id === MANUAL.id)).toBe(true);
        expect(traceById(MANUAL.id)).toBeTruthy();
        //  ...and it stops at rung 3. Reading is not doing.
        const s = readTheBook(fresh());
        expect(boatUnderstanding(s)).toBe('conceptually-suspected');
    });

    it('the hands route is a real threshold, not a formality', () => {
        const almost = fresh();
        almost.knowledge.domains.navigationSeamanship.technique = TUNE.boatSeamanshipTechnique - 1;
        expect(handsUnderstand(almost)).toBe(false);
        //  Above where a survivor starts, and below the ceiling.
        expect(TUNE.boatSeamanshipTechnique).toBeLessThan(TUNE.knowledgeScoreMax);
        expect(TUNE.boatSeamanshipTechnique)
            .toBeGreaterThan(fresh().knowledge.domains.navigationSeamanship.technique);
    });

    it('REACHABILITY — the hands route is crossed by working the wreck, through the real producers', () => {
        //  THE ASSERTION ABOVE IS NOT A REACHABILITY PROOF, and this exists because the first
        //  version of this suite thought it was. "Between the floor and the ceiling" is true of
        //  every number in that range, including ones the game cannot produce: the threshold
        //  shipped at 34, which takes twenty-seven seamanship events against the twelve the
        //  game contains before anything regrows. The route existed and was unreachable —
        //  [[D-114]] — and every test here was green.
        //
        //  So drive the SHIPPED producers instead of the arithmetic. Craft nothing, grant
        //  nothing: build the raft, reach the wreck, work its six parts, exactly as a survivor
        //  who has "built a raft, crossed open water and worked a hull" would.
        const s = fresh();
        expect(handsUnderstand(s)).toBe(false);

        //  The raft — the recipe's own domain is `navigationSeamanship`.
        recordTrying(s, 'navigationSeamanship');
        //  The crossing — `Session` records this once, guarded by `wreck.reached`.
        recordTrying(s, 'navigationSeamanship');

        //  The hull, worked. `gatherNode` is the shipped verb and it records the lesson itself.
        const parts = s.nodes.filter((n) => n.kind === 'wreckpart').map((n) => n.id);
        expect(parts.length, 'the wreck has parts to work').toBeGreaterThan(3);
        s.player.x = WRECK.x;
        s.player.y = WRECK.y;
        for (const id of parts) {
            const node = s.nodes.find((n) => n.id === id)!;
            s.player.x = node.x;
            s.player.y = node.y;
            const r = gatherNode(s, id);
            expect(r.ok, `working ${id}: ${r.reason}`).toBe(true);
        }

        const earned = s.knowledge.domains.navigationSeamanship.technique;
        expect(handsUnderstand(s),
            `one pass through the wreck earned ${earned.toFixed(2)} against a threshold of ${TUNE.boatSeamanshipTechnique}`)
            .toBe(true);
        expect(rung(boatUnderstanding(s))).toBeGreaterThanOrEqual(rung('conceptually-suspected'));

        //  ...and it is not free either: the same survivor NINE events short is still outside.
        const short = fresh();
        recordTrying(short, 'navigationSeamanship');
        recordTrying(short, 'navigationSeamanship');
        expect(handsUnderstand(short)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('inspection reveals questions, never a parts list', () => {
    const readings = () => [
        { name: 'uninformed', a: boatAffordance(fresh()) },
        { name: 'informed (book)', a: boatAffordance(readTheBook(fresh())) },
        { name: 'informed (hands)', a: boatAffordance(didTheWork(fresh())) },
    ];

    it('no line in any reading hands over a finished answer', () => {
        for (const { name, a } of readings()) {
            for (const line of [...a.properties, ...a.questions]) {
                expect(namesAFinishedAnswer(line), `${name}: "${line}" instructs`).toBe(false);
            }
        }
        expect(namesAFinishedAnswer(boatSight()), 'the sight line instructs').toBe(false);
        //  Positive control: the guard is awake, and would catch a parts list if one appeared.
        expect(namesAFinishedAnswer('The hole needs fibreglass — you could make a patch from it.')).toBe(true);
    });

    it('UNDERSTANDING BUYS BETTER QUESTIONS, not fewer of them', () => {
        //  The failure mode this drop is most exposed to: an "informed" reading that resolves
        //  into statements. If knowing more ever empties the questions, the affordance layer
        //  has become a walkthrough with extra steps.
        for (const { name, a } of readings()) {
            expect(a.questions.length, `${name} has no questions left`).toBeGreaterThan(0);
            expect(a.properties.length, `${name} observes nothing`).toBeGreaterThan(0);
            for (const q of a.questions) expect(q.trim().endsWith('?'), `${name}: "${q}"`).toBe(true);
        }
    });

    it('the informed reading is genuinely different, and the difference is ORDER', () => {
        const cold = boatAffordance(fresh());
        const warm = boatAffordance(readTheBook(fresh()));
        expect(warm).not.toEqual(cold);
        //  Not merely longer: it says something the uninformed reading does not.
        expect(warm.properties.some((p) => !cold.properties.includes(p))).toBe(true);
        expect(warm.questions.some((q) => !cold.questions.includes(q))).toBe(true);
    });

    it('no reading names a material, a recipe or a quantity', () => {
        //  A narrower net than the shared guard, aimed at this drop's own temptation: the
        //  boat's needs are HULL, SEALANT, ENGINE, FUEL, and the moment any of those is spelt
        //  as a thing to fetch, the questions have become a checklist.
        const forbidden = /\b(fibreglass|fiberglass|resin|epoxy|tar|pitch|petrol|gasoline|diesel|outboard|motor|nails?|screws?)\b/i;
        for (const { name, a } of readings()) {
            for (const line of [...a.properties, ...a.questions]) {
                expect(forbidden.test(line), `${name}: "${line}" names a part`).toBe(false);
            }
        }
        expect(forbidden.test(MANUAL.note!), 'the manual names a part').toBe(false);
        expect(namesAFinishedAnswer(MANUAL.note!), 'the manual instructs').toBe(false);
        expect(namesAFinishedAnswer(MANUAL.sight), "the manual's sight line instructs").toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('the scope cap is real, not a promise in a comment', () => {
    it('B0 is the only stage there is, at every level of understanding', () => {
        expect(boatStage()).toBe('B0');
        for (const s of [fresh(), readTheBook(fresh()), didTheWork(fresh()), didTheWork(readTheBook(fresh()))]) {
            expect(boatUnderstanding(s)).toBeDefined();
            expect(boatStage()).toBe('B0');
        }
    });

    it('there is no repair verb, and the absence SPEAKS', () => {
        //  [[D-042]]: silence is never a legal outcome. A survivor who came expecting a verb
        //  gets a sentence, so "nothing happened" and "nothing is offered" stay distinguishable.
        const blocker = boatWorkBlocker();
        expect(blocker.length).toBeGreaterThan(0);
        expect(namesAFinishedAnswer(blocker)).toBe(false);
        //  ...and it stays true however much the survivor knows. Understanding is not a key.
        expect(boatWorkBlocker()).toBe(blocker);
    });

    it('the boat holds no state, so nothing about her can be saved, migrated or lost', () => {
        //  A hard structural claim, and the reason no save migration ships with this drop:
        //  the boat adds no key to GameState. Everything it reads already existed.
        const s = fresh();
        const keys = Object.keys(s);
        expect(keys.some((k) => k.toLowerCase().includes('boat'))).toBe(false);
        //  The one thing that DOES persist is the manual, and it persists in `traces.read` —
        //  a field that has shipped since the far island.
        const read = readTheBook(fresh());
        expect(read.traces.read).toContain(MANUAL.id);
        expect(Object.keys(read)).toEqual(keys);
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — absence cannot reach her', () => {
    //  `reconcile` takes ELAPSED REAL SECONDS and RETURNS a new state; it does not mutate.
    //  Both facts matter here and I got both wrong on the first pass — a timestamp read as a
    //  span, and the pre-absence object read back as though it were the outcome. Every
    //  assertion in this block passed, and every one of them was vacuous ([[D-066]] (a): the
    //  branch must be witnessed). This helper makes the units and the return value impossible
    //  to get wrong the same way twice.
    const afterHoursAway = (s: GameState, hours: number): GameState =>
        reconcile(s, hours * 3600).state;

    it('four offline hours change nothing about what the boat is or what it says', () => {
        const before = alongside();
        const understandingBefore = boatUnderstanding(before);
        const affordanceBefore = boatAffordance(before);

        const after = afterHoursAway(alongside(), 4);

        //  The witness: the absence really did happen to this object.
        expect(after.gameHoursElapsed).toBeGreaterThan(before.gameHoursElapsed);

        expect(boatUnderstanding(after)).toEqual(understandingBefore);
        expect(boatAffordance(after)).toEqual(affordanceBefore);
        expect(boatStage()).toBe('B0');
    });

    it('absence neither grants understanding nor takes it away', () => {
        //  Both directions, because only one of them is the offline-death law. The other is
        //  the offline-GIFT defect: a promise that resolves itself while nobody is playing.
        const ignorant = afterHoursAway(fresh(), 12);
        expect(ignorant.gameHoursElapsed).toBeGreaterThan(fresh().gameHoursElapsed);
        expect(boatUnderstanding(ignorant)).toBe('physically-possible');
        expect(boatUnderstandingNote(ignorant)).toBeNull();

        const read = readTheBook(fresh());
        const note = boatUnderstandingNote(read);
        const learned = afterHoursAway(read, 12);
        expect(learned.traces.read).toContain(MANUAL.id);
        expect(rung(boatUnderstanding(learned))).toBeGreaterThanOrEqual(rung('conceptually-suspected'));
        expect(boatUnderstandingNote(learned)).toBe(note);
    });

    it('standing next to her over an absence costs a body nothing extra', () => {
        //  The structural half of D-011: the boat must not be a place that is worse to be
        //  away from than anywhere else. Measured against a control on open sand at the same
        //  radius, so the only difference between the two survivors is the hull beside one.
        const away = fresh();
        away.player.x = -BOAT.x;
        away.player.y = BOAT.y;

        const atHer = afterHoursAway(alongside(), 6);
        const control = afterHoursAway(away, 6);

        expect(atHer.health).toBeCloseTo(control.health, 6);
        expect(atHer.warmth).toBeCloseTo(control.warmth, 6);
        expect(atHer.energy).toBeCloseTo(control.energy, 6);
        expect(atHer.wet).toBeCloseTo(control.wet, 6);
        //  And the control genuinely paid something, so "equal" is not "both untouched".
        expect(control.energy).toBeLessThan(fresh().energy);
    });
});
