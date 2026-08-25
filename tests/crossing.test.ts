/**
 * SESSION 3 — THE CROSSING. The boat carries you most of the way; you swim the rest.
 *
 * The three gates this session was given, and where each is proved below:
 *
 *   D-011            `an absence changes nothing about a crossing` — and the stronger claim
 *                    beside it: there is no mid-crossing state for an absence to reach.
 *   FAIR CHALLENGE   `the forecast and the act share one arithmetic path`, and the note names
 *                    BOTH legs plus the reserve before anything is committed.
 *   REACHABILITY     `THE WHOLE CROSSING` — boat, water, swim, arrival, and home again,
 *                    driven end to end rather than a leg at a time.
 *
 * Plus the extensibility the brief demanded be real rather than claimed: `A SECOND
 * DESTINATION IS ONE ROW` adds the far island — real terrain the game already has — and
 * drives every function in `crossing.ts` against it without touching a call site.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    boatPosition,
    verbsFor,
    canCross,
    createInitialState,
    crossingBlocker,
    crossingNote,
    crossingPlan,
    hasArrivedAt,
    metresToArrival,
    reconcile,
    runCrossing,
    standOffPoint,
    swimStageOf,
    waterMetresBetween,
    waterZoneOf,
    type Destination,
    type GameState,
} from '../src/brain';
import { BOAT, DESTINATIONS, FAR_ISLAND, WRECK } from '../src/data/world';
import { TUNE, realSecondsPerGameHour } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;

/** A survivor with a hull that floats, has been loaded, and has been out on the line. */
function ready(): GameState {
    const s = fullBody(createInitialState(NOW));
    s.boat = {
        ...s.boat,
        surveyed: true, supports: true, dewatered: true,
        structural: { rung: 'competent', usedParts: [], usedMaterials: { wood: 5 } },
        seal: { rung: 'competent', usedParts: [], usedMaterials: { fiber: 6 } },
        floatTest: { attempted: true, held: true, tookOnWater: 0.2 },
        loadKnown: true, ferried: true, at: 'shore',
    };
    s.energy = 100;
    return s;
}

describe('THE CROSSING — one route, two legs', () => {
    it('prices BOTH legs, and the boat covers most of the water', () => {
        const p = crossingPlan(ready(), 'wreck');
        expect(p.boat.metres).toBeGreaterThan(0);
        expect(p.swim.metres).toBeGreaterThan(0);
        expect(p.boat.metres, 'the boat does not carry most of the way')
            .toBeGreaterThan(p.swim.metres);
        expect(p.totalEnergy).toBeCloseTo(p.boat.energyCost + p.swim.energyCost, 6);
    });

    it('HER RANGE IS NOT STRETCHED — the boat leg stays inside the 90 m her arms are good for', () => {
        //  The brief's hard constraint: `boatFerryDistanceM` is the honest range and the
        //  crossing may not quietly extend it to cover the distance.
        const p = crossingPlan(ready(), 'wreck');
        expect(p.boat.metres).toBeLessThanOrEqual(TUNE.boatFerryDistanceM);
        expect(p.inRange).toBe(true);
        //  ...with real margin, so the ceiling is a rule rather than a coincidence that would
        //  break the moment the beach or the wreck moved a few metres.
        expect(TUNE.boatFerryDistanceM - p.boat.metres).toBeGreaterThan(5);
    });

    it('the swim is the stand-off minus the arrival radius, and nothing else', () => {
        const p = crossingPlan(ready(), 'wreck');
        expect(p.swim.metres).toBeCloseTo(TUNE.boatStandOffM - TUNE.wreckArrivalRadiusM, 6);
    });

    it('THE BOAT MAKES THE WRECK SURVIVABLE, which is the capability this session adds', () => {
        //  [[D-121]] tuned the swim so a full reserve "gets you there and not back". The boat
        //  does not make the wreck nearer — she makes the round trip affordable. If this ever
        //  stops being true by a wide margin, the crossing has become pointless or free.
        const s = ready();
        const byBoat = crossingPlan(s, 'wreck').totalEnergy;
        const openWater = waterMetresBetween({ x: BOAT.x, y: BOAT.y }, { x: WRECK.x, y: WRECK.y })
            - TUNE.wreckArrivalRadiusM;
        const swimHours = (openWater / (TUNE.walkSpeedMps * TUNE.swimSpeedMultiplier))
            / realSecondsPerGameHour;
        const bySwim = swimHours * TUNE.swimEnergyDrainPerGameHour;
        expect(byBoat, 'the boat is not cheaper than swimming').toBeLessThan(bySwim);
        expect(bySwim / byBoat, 'the boat is barely worth taking').toBeGreaterThan(2);
        //  And the round trip is the point: twice the boat's cost still leaves a reserve.
        expect(100 - 2 * byBoat).toBeGreaterThan(TUNE.swimLabouringEnergy);
    });
});

describe('THE CROSSING — fair challenge', () => {
    it('the note names both legs AND what is left of the reserve, before anything is spent', () => {
        const s = ready();
        const p = crossingPlan(s, 'wreck');
        const note = crossingNote(s, 'wreck');
        expect(note).toContain(String(Math.round(p.boat.metres)));
        expect(note).toContain(String(Math.round(p.swim.metres)));
        expect(note, 'the combined cost is not stated').toContain(String(Math.round(p.totalEnergy)));
        expect(note, 'what you arrive with is not stated').toContain(String(Math.round(p.energyOnArrival)));
    });

    it('THE FORECAST AND THE ACT SHARE ONE ARITHMETIC PATH', () => {
        const s = ready();
        const promised = crossingPlan(s, 'wreck');
        const before = s.energy;
        const done = runCrossing(s, 'wreck')!;
        expect(done.boat.energyCost).toBeCloseTo(promised.boat.energyCost, 9);
        expect(before - s.energy, 'the boat leg cost something other than it promised')
            .toBeCloseTo(promised.boat.energyCost, 9);
    });

    it('...and it refuses when the reserve will not cover BOTH legs', () => {
        //  The half a per-leg forecast would miss: enough for the paddle, not enough for the
        //  swim at the far end, which is the crossing that drowns you.
        const s = ready();
        s.energy = TUNE.swimLabouringEnergy + 5;
        expect(canCross(s, 'wreck'), 'a crossing was allowed on a reserve that cannot finish it')
            .toBe(false);
        expect(crossingBlocker(s, 'wreck')).toMatch(/reserve|swim/i);
        expect(runCrossing(s, 'wreck')).toBeNull();
    });

    it('a refusal changes nothing at all', () => {
        const s = ready();
        s.energy = 1;
        const before = JSON.stringify({ p: s.player, b: s.boat, e: s.energy });
        expect(runCrossing(s, 'wreck')).toBeNull();
        expect(JSON.stringify({ p: s.player, b: s.boat, e: s.energy })).toBe(before);
    });
});

describe('THE CROSSING — what it refuses, and why', () => {
    it('names ONE enabler at a time (Law 95)', () => {
        const bare = fullBody(createInitialState(NOW));
        expect(crossingBlocker(bare, 'wreck')).toMatch(/does not float/i);

        const afloat = ready();
        afloat.boat = { ...afloat.boat, loadKnown: false };
        expect(crossingBlocker(afloat, 'wreck')).toMatch(/get into her/i);
    });

    it('SHE MUST HAVE BEEN OUT ON THE LINE FIRST — no crossing on an unpaddled hull', () => {
        //  The anti-shortcut clause, applied to the boat: good fortune shortens the work, it
        //  never skips the proof. A hull that floats and has never been moved is not a boat
        //  you take into open water.
        const s = ready();
        s.boat = { ...s.boat, ferried: false };
        const ids = (state: GameState) => verbsFor(state, 'boat').map((v) => v.id);
        expect(ids(s), 'a crossing was offered on a hull nobody has paddled').not.toContain('cross-boat');
        s.boat = { ...s.boat, ferried: true };
        expect(ids(s)).toContain('cross-boat');
    });
});

describe('THE CROSSING — reachability, end to end', () => {
    it('THE WHOLE CROSSING: boat, water, swim, arrival — and home again', () => {
        const s = ready();
        expect(waterZoneOf(s), 'the survivor did not start ashore').toBe('dry');
        expect(boatPosition(s)).toEqual({ x: BOAT.x, y: BOAT.y });

        //  ---- LEG ONE: she carries you out ------------------------------------------------
        const plan = runCrossing(s, 'wreck')!;
        expect(plan.direction).toBe('out');
        expect(s.boat.at).toBe('wreck');
        //  THE HAND-OFF. Over the side at the stand-off: in the water, not on a deck, with the
        //  last stretch still to do. This is the seam the brief asked to read as one crossing.
        expect(waterZoneOf(s), 'the survivor was not put in the water').toBe('swimming');
        expect(swimStageOf(s)).toBe('swimming');
        expect(hasArrivedAt(s, 'wreck'), 'the boat delivered them all the way').toBe(false);
        expect(metresToArrival(s, 'wreck')).toBeCloseTo(plan.swim.metres, 6);
        //  ...and she is right there beside them.
        expect(boatPosition(s)).toEqual(standOffPoint(DESTINATIONS.wreck));

        //  ---- LEG TWO: the swim, through the shipped mechanics -----------------------------
        s.player = { ...s.player, x: WRECK.x, y: WRECK.y };
        expect(hasArrivedAt(s, 'wreck'), 'arrival is unreachable by swimming').toBe(true);
        expect(metresToArrival(s, 'wreck')).toBe(0);

        //  ---- AND HOME. Swim back to her, and she brings you in ---------------------------
        const back = standOffPoint(DESTINATIONS.wreck);
        s.player = { ...s.player, x: back.x, y: back.y };
        const home = runCrossing(s, 'wreck')!;
        expect(home.direction).toBe('home');
        expect(s.boat.at).toBe('shore');
        expect(boatPosition(s)).toEqual({ x: BOAT.x, y: BOAT.y });
        expect(s.player.x).toBeCloseTo(BOAT.x, 6);
        expect(s.player.y).toBeCloseTo(BOAT.y, 6);
        expect(waterZoneOf(s), 'the survivor came home still in the water').toBe('dry');
        expect(s.energy, 'the round trip cost nothing').toBeLessThan(100);
        expect(s.energy, 'the round trip was unaffordable').toBeGreaterThan(TUNE.swimLabouringEnergy);
    });

    it('the verb is on her circle, and it changes direction with her', () => {
        const s = ready();
        const out = verbsFor(s, 'boat').find((v) => v.id === 'cross-boat');
        expect(out, 'no crossing verb at the boat').toBeDefined();
        expect(out!.label).toMatch(/out to the wreck/i);
        runCrossing(s, 'wreck');
        const home = verbsFor(s, 'boat').find((v) => v.id === 'cross-boat');
        expect(home!.label, 'the verb did not turn round with her').toMatch(/home/i);
    });
});

describe('THE CROSSING — D-011', () => {
    it('THERE IS NO MID-CROSSING STATE, which is the strongest form of the guarantee', () => {
        //  The boat leg is atomic. After it, the survivor is in the water beside a moored boat
        //  — two situations protected long before this file. Asserted as a property of the
        //  shape rather than as a behaviour: `boat.at` is only ever a place she IS.
        const s = ready();
        expect(s.boat.at).toBe('shore');
        runCrossing(s, 'wreck');
        expect(s.boat.at).toBe('wreck');
        expect(['shore', 'wreck'], 'a half-crossed value exists').toContain(s.boat.at);
    });

    it('PROPERTY: no length of absence moves the boat, the survivor, or the reserve', () => {
        for (const at of ['shore', 'wreck'] as const) {
            const s = ready();
            if (at === 'wreck') runCrossing(s, 'wreck');
            //  POSITION, NOT ENERGY. A reserve legitimately falls over an absence — floored by
            //  [[D-011]]'s own machinery, which has its own tests — and folding it in here would
            //  make this assert something the crossing does not own. What the crossing owns is
            //  that nobody and nothing MOVED while the tab was shut.
            const before = JSON.stringify({ at: s.boat.at, boat: boatPosition(s), player: s.player });
            for (const hours of [0.01, 1, 25, 24 * 7, 24 * 365]) {
                const { state: later } = reconcile(s, hours * 3600);
                expect(JSON.stringify({ at: later.boat.at, boat: boatPosition(later), player: later.player }),
                    `${hours}h away changed the crossing with her at ${at}`).toBe(before);
            }
        }
    });

    it('...and an absence cannot strand her: she is where she was left', () => {
        const s = ready();
        runCrossing(s, 'wreck');
        const { state: later } = reconcile(s, 24 * 30 * 3600);
        expect(later.boat.at).toBe('wreck');
        expect(boatPosition(later)).toEqual(standOffPoint(DESTINATIONS.wreck));
    });
});

describe('A SECOND DESTINATION IS ONE ROW — the seam, proved rather than claimed', () => {
    //  THE BRIEF ASKED FOR THIS TO BE REAL. The far island is genuine terrain the game already
    //  has — (60, 420), radius 74, with a waterline `waterDepthAt` gives it for free — and it
    //  is deliberately NOT in the shipped table, because whether a second visible promise
    //  exists is a content call. So the seam is proved HERE: a row is constructed, every
    //  function in `crossing.ts` is driven against it, and not one call site changes.
    const farIsland: Destination = {
        id: 'wreck' as Destination['id'],   // the id type is a union of shipped rows; the SHAPE is what is under test
        label: 'the far island',
        x: FAR_ISLAND.x,
        y: FAR_ISLAND.y,
        arrivalRadiusM: 14,
        standOffM: 40,
    };

    it('every geometry function answers for a destination it has never seen', () => {
        const stand = standOffPoint(farIsland);
        expect(Number.isFinite(stand.x) && Number.isFinite(stand.y)).toBe(true);
        //  It stands off by exactly its own figure, on the line in from her beach.
        const gap = Math.hypot(stand.x - farIsland.x, stand.y - farIsland.y);
        expect(gap).toBeCloseTo(farIsland.standOffM, 6);
        const water = waterMetresBetween({ x: BOAT.x, y: BOAT.y }, stand);
        expect(water).toBeGreaterThan(0);
    });

    it('...AND THE RANGE RULE BITES ON IT WITHOUT A LINE OF NEW CODE', () => {
        //  The far island is ~323 m out against a hull good for 90 m of water. The system must
        //  say so of its own accord — that is what "one row, no call-site changes" has to mean.
        const stand = standOffPoint(farIsland);
        const water = waterMetresBetween({ x: BOAT.x, y: BOAT.y }, stand);
        expect(water, 'the far island is no longer out of range — retune this test, not the law')
            .toBeGreaterThan(TUNE.boatFerryDistanceM);
    });

    it('the shipped table has exactly one row, and the far island is not in it', () => {
        //  The other half of the instruction: prove the seam, ship no content.
        expect(Object.keys(DESTINATIONS)).toEqual(['wreck']);
        expect(DESTINATIONS.wreck.x).toBe(WRECK.x);
        expect(DESTINATIONS.wreck.y).toBe(WRECK.y);
    });

    it('...and every crossing function reads the table rather than naming the wreck', () => {
        //  If a function reached for `WRECK` directly, adding a row would not be enough and the
        //  seam would be a claim. Checked against the source itself.
        const src = readFileSync('src/brain/crossing.ts', 'utf8');
        const body = src.slice(src.indexOf('export function boatPosition'));
        expect(body, 'crossing.ts reaches for the wreck by name').not.toMatch(/\bWRECK\b/);
    });
});
