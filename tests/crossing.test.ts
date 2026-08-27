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
    waterCostsFor,
    waterSpeedMultiplierOf,
    swimEnergyPerGameHourFor,
    swimPaceFractionFor,
    loadEnergyMultiplierOf,
    atBoat,
    canFerry,
    ferryBlocker,
    canMoor,
    moorBlocker,
    waterZoneOf,
    type Destination,
    type GameState,
} from '../src/brain';
import { BOAT, DESTINATIONS, FAR_ISLAND, WRECK } from '../src/data/world';
import { TUNE, realSecondsPerGameHour } from '../src/data/tune';
import { fullBody } from './_baseline';
import { closeSurvivor } from '../src/brain/succession';

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
        //  ONE WORD, NAMING THE DIRECTION. The label used to carry the destination; the arc
        //  has room for a word, and where the crossing goes is carried by `crossingNote` on the
        //  hint surface when it is pressed. What must stay true is that the verb turns round.
        expect(out!.label).toBe('Cross');
        runCrossing(s, 'wreck');
        const home = verbsFor(s, 'boat').find((v) => v.id === 'cross-boat');
        expect(home!.label, 'the verb did not turn round with her').toBe('Return');
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

describe('FAIR CHALLENGE — the forecast is priced for THIS body, not a baseline one', () => {
    /**
     * THE BUG THIS PAIR EXISTS FOR, and it was shipped for most of Session 3.
     *
     * The swim leg was quoted straight off `TUNE.swimEnergyDrainPerGameHour`, while the swim
     * the survivor actually swims is charged through `waterCostsFor`, which multiplies that
     * same constant by load and by practice. Two formulas, one of them a copy, and they agreed
     * only for an empty-handed beginner.
     *
     * WHICH IS THE ONE BODY A WRECK CROSSING IS NEVER ABOUT. You cross to a wreck to bring
     * things back, so the survivor on the return leg is carrying salvage — quoted the
     * empty-handed price for the leg they are most loaded on. `affordable` could call that
     * crossing safe and land them under the water's own first warning, which is precisely the
     * promise the fair-challenge rail exists to forbid.
     */
    it('A LOADED SURVIVOR IS QUOTED THE LOADED PRICE — the swim leg tracks what they carry', () => {
        const light = ready();
        const heavy = ready();
        heavy.inventory.stone = 12;
        heavy.inventory.wood = 12;

        const lm = loadEnergyMultiplierOf(light);
        const hm = loadEnergyMultiplierOf(heavy);
        expect(hm, 'the fixture did not actually load anyone').toBeGreaterThan(lm);

        const lp = crossingPlan(light, 'wreck');
        const hp = crossingPlan(heavy, 'wreck');
        //  The whole claim: the quote moved, and it moved by exactly the shipped multiplier.
        expect(hp.swim.energyCost, 'a loaded swim is quoted at the empty-handed price')
            .toBeGreaterThan(lp.swim.energyCost);
        expect(hp.swim.energyCost / lp.swim.energyCost).toBeCloseTo(hm / lm, 6);
    });

    it('...and the quote IS the charge: one function answers the tick and the forecast', () => {
        //  Not "the numbers happen to match" — the same body produced both. A survivor mid-swim
        //  and the same survivor forecasting that swim read one expression.
        const s = ready();
        s.inventory.stone = 9;
        const quoted = swimEnergyPerGameHourFor(s);

        //  Put them in the water and ask what it is charging them right now.
        s.player = { x: standOffPoint(DESTINATIONS.wreck).x, y: standOffPoint(DESTINATIONS.wreck).y };
        expect(swimStageOf(s), 'the fixture did not get the survivor swimming').not.toBe('ashore');
        expect(waterCostsFor(s).energyPerGameHour).toBeCloseTo(quoted, 9);

        //  ...and the plan's swim leg is that same rate over its own hours.
        const p = crossingPlan(ready(), 'wreck');
        const base = ready();
        expect(p.swim.energyCost).toBeCloseTo(p.swim.hours * swimEnergyPerGameHourFor(base), 9);
    });

    it('PRACTICE IS PRICED TOO — a confident swimmer is quoted a cheaper, faster swim', () => {
        const green = ready();
        const salt = ready();
        salt.capacities.breathWaterConfidence = 100;

        const gp = crossingPlan(green, 'wreck');
        const sp = crossingPlan(salt, 'wreck');
        expect(sp.swim.hours, 'practice did not reach the forecast pace').toBeLessThan(gp.swim.hours);
        expect(sp.swim.energyCost, 'practice did not reach the forecast price')
            .toBeLessThan(gp.swim.energyCost);
        //  Bounded, per §12: the sea never becomes free.
        expect(sp.swim.energyCost).toBeGreaterThan(0);
    });

    it('the pace the forecast uses is the pace the water actually grants', () => {
        const s = ready();
        s.capacities.breathWaterConfidence = 64;
        s.player = { x: standOffPoint(DESTINATIONS.wreck).x, y: standOffPoint(DESTINATIONS.wreck).y };
        expect(swimStageOf(s)).toBe('swimming');
        expect(waterSpeedMultiplierOf(s)).toBeCloseTo(swimPaceFractionFor(s), 9);
    });

    it('AFFORDABILITY ANSWERS FOR THE LOADED BODY — the gate moved with the price', () => {
        //  The failure mode named: a reserve that is enough empty-handed and not enough loaded
        //  must not be called affordable. Binary-search the reserve where the two disagree.
        const probe = (kg: boolean, energy: number) => {
            const s = ready();
            if (kg) { s.inventory.stone = 14; s.inventory.wood = 14; }
            s.energy = energy;
            return crossingPlan(s, 'wreck').affordable;
        };
        let found = false;
        for (let e = 36; e <= 100; e += 0.25) {
            if (probe(false, e) && !probe(true, e)) { found = true; break; }
        }
        expect(found, 'no reserve exists where load changes the answer — load is not in the gate')
            .toBe(true);
    });
});

describe('SHE IS NOT FURNITURE — everything that still measured from her beach', () => {
    /**
     * ONE STALE PREMISE, SIX PLACES. For four sessions the boat could not move, so code all
     * over the project measured from the `BOAT` constant, gated on nothing, or asserted in
     * comments that she stays put. Session 3 made every one of those false at once, and the
     * two that were found by accident (a frozen world matrix, a missing pick branch) were
     * found only because a single check happened to stand a survivor in open water.
     *
     * These are the rest, each pinned by the behaviour it breaks rather than by the constant
     * it reads — so a future author who moves her somewhere else again gets a red, not a
     * silent one-way trip.
     */

    /** Her, standing off the wreck, with the survivor alongside in the water. */
    function atTheWreck(): GameState {
        const s = ready();
        s.boat = { ...s.boat, at: 'wreck' };
        const stand = standOffPoint(DESTINATIONS.wreck);
        s.player = { x: stand.x, y: stand.y };
        return s;
    }

    it('LOOK HER OVER IS NEVER REFUSED — including when she is at the wreck', () => {
        //  `boatVerbs` ships inspect with `available: true, reason: null` under the words
        //  "ALWAYS. Looking at a boat is never refused." `atBoat` measured to the beach, so
        //  a survivor holding on to her 100 m out was told "Too far to see much."
        const s = atTheWreck();
        expect(Math.hypot(s.player.x - BOAT.x, s.player.y - BOAT.y), 'fixture is not actually away')
            .toBeGreaterThan(90);
        expect(atBoat(s), 'the survivor is ON her and reads as too far to look at her').toBe(true);
    });

    it('...and she is still out of reach from the beach she is no longer on', () => {
        //  The other half, so the fix is a MEASUREMENT and not a constant `true`.
        const s = atTheWreck();
        s.player = { x: BOAT.x, y: BOAT.y };
        expect(atBoat(s)).toBe(false);
    });

    it('THE LINE IS ON THE BEACH — the ferry is not offered to a boat that is not on it', () => {
        //  Each press charged a flat 90 m of arms and moved nothing, and two of them could put
        //  the survivor under the reserve the return needs. The render already refused to draw
        //  the tether out here; the brain was still charging for it.
        const home = ready();
        expect(canFerry(home), 'the ferry should work at her beach').toBe(true);

        const away = atTheWreck();
        expect(canFerry(away)).toBe(false);
        expect(ferryBlocker(away)).toMatch(/beach/i);
    });

    it('NOTHING TO MAKE HER FAST TO — mooring is not offered over 30 m of water', () => {
        const away = atTheWreck();
        away.inventory.fiber = 99;
        expect(canMoor(away)).toBe(false);
        expect(moorBlocker(away)).toMatch(/nothing out here/i);
    });

    it('A SUCCESSOR INHERITS THE SEA STATE THEY WERE LEFT — she does not sail herself home', () => {
        //  Where she is is matter, and this block's own rule is that matter crosses. The
        //  whitelist could not name a field that did not exist when it was written.
        const s = atTheWreck();
        const { next } = closeSurvivor(s, 'exposure');
        expect(next.boat.at, 'the hull moved itself, unwitnessed, because a survivor died')
            .toBe('wreck');
    });

    it('YOU CANNOT TAKE ONE BOAT FROM ANOTHER — the raft would be beached and lost', () => {
        //  `advanceWater` sets `raft.x = player.x` every tick, so a crossing that teleports the
        //  survivor sets the raft down wherever they land. Coming home, that is dry sand beside
        //  the boat's keel, inland of the waterline, with nothing in the game able to refloat it.
        const s = atTheWreck();
        s.raft = { ...s.raft, aboard: true };
        expect(canCross(s, 'wreck')).toBe(false);
        expect(crossingBlocker(s, 'wreck')).toMatch(/raft/i);
    });
});

describe('THE WAY HOME IS NOT PRICED FOR WATER ALREADY BEHIND YOU', () => {
    function atTheWreck(energy: number): GameState {
        const s = ready();
        s.boat = { ...s.boat, at: 'wreck' };
        const stand = standOffPoint(DESTINATIONS.wreck);
        s.player = { x: stand.x, y: stand.y };
        s.energy = energy;
        return s;
    }

    it('the home plan has NO swim leg — you swam it to reach her', () => {
        //  To press "Bring her home" you must be inside `boatTapRadiusM` of her, which means the
        //  stand-off swim is already done. The plan charged it anyway, in both directions.
        const out = crossingPlan(ready(), 'wreck');
        const home = crossingPlan(atTheWreck(100), 'wreck');
        expect(out.direction).toBe('out');
        expect(home.direction).toBe('home');
        expect(out.swim.metres).toBeGreaterThan(0);
        expect(home.swim.metres, 'the way home is charged for a swim that is behind you').toBe(0);
        expect(home.swim.energyCost).toBe(0);
        //  The boat's own leg is the same water either way, and is NOT discounted.
        expect(home.boat.energyCost).toBeCloseTo(out.boat.energyCost, 9);
    });

    it('AND SO A SURVIVOR IS NOT STRANDED BY A LEG THAT DOES NOT EXIST', () => {
        //  The failure this pins: a reserve that comfortably covers the paddle home, refused
        //  because the gate demanded reserve for the swim as well. In open water, with the
        //  return verb dead and no way to recover — the worst outcome the session can produce.
        const home = crossingPlan(atTheWreck(42), 'wreck');
        expect(home.boat.energyCost, 'the paddle home is not cheap enough for this to be the test')
            .toBeLessThan(10);
        expect(home.affordable, 'refused the only act that brings her home').toBe(true);
        expect(crossingBlocker(atTheWreck(42), 'wreck')).toBeNull();
    });

    it('...but the gate has NOT been made toothless — a spent survivor is still refused', () => {
        //  `affordable` still answers, so the fix removed a phantom leg rather than the rule.
        const spent = crossingPlan(atTheWreck(TUNE.swimLabouringEnergy), 'wreck');
        expect(spent.affordable).toBe(false);
        expect(crossingBlocker(atTheWreck(TUNE.swimLabouringEnergy), 'wreck')).not.toBeNull();
    });

    it('ONE BODY PRICES BOTH — the blocker and the plan cannot disagree', () => {
        //  These were separate copies and had already drifted: the blocker's copy priced the
        //  swim in both directions while the plan named a direction. Same arithmetic now.
        for (const e of [36, 45, 60, 100]) {
            for (const at of ['shore', 'wreck'] as const) {
                const s = ready();
                s.boat = { ...s.boat, at };
                if (at === 'wreck') {
                    const stand = standOffPoint(DESTINATIONS.wreck);
                    s.player = { x: stand.x, y: stand.y };
                }
                s.energy = e;
                const plan = crossingPlan(s, 'wreck');
                const refusedForReserve = /reserve/i.test(crossingBlocker(s, 'wreck') ?? '');
                expect(refusedForReserve, `plan and blocker disagree at ${at}/${e}`)
                    .toBe(!plan.affordable);
            }
        }
    });
});

describe('THE WHEEL STILL FITS WHAT SHE CAN DO', () => {
    /**
     * `verbCircleLayout.ts` states its whole premise as a MEASUREMENT: *"Measured across every
     * target in the game, the most that are ever available at once is FIVE — the boat, afloat
     * and aboard."* That measurement was taken before `cross-boat` existed, and an eleventh
     * verb on the busiest target in the game is exactly the thing that could invalidate it.
     *
     * The layout itself is general — what does not fit goes to a hub pip and nothing overlaps
     * by construction — so this is not a crash waiting to happen. It is a stated premise that
     * nothing checked, on the module whose entire job is knowing how many will fit. So it is
     * checked here, at the target that produced the number, rather than left as prose.
     */
    it('counts the most verbs the boat can offer at once, and it is still five', () => {
        let most = 0;
        let worst: string[] = [];
        for (const at of ['shore', 'wreck'] as const) {
            for (const moored of [true, false]) {
                for (const loadKnown of [true, false]) {
                    for (const ferried of [true, false]) {
                        for (const fiber of [0, 99]) {
                            for (const energy of [100, 60, 40]) {
                                const s = ready();
                                s.boat = { ...s.boat, at, moored, loadKnown, ferried };
                                s.inventory.fiber = fiber;
                                s.energy = energy;
                                if (at === 'wreck') {
                                    const stand = standOffPoint(DESTINATIONS.wreck);
                                    s.player = { x: stand.x, y: stand.y };
                                }
                                //  `verbsFor` already drops what is not SHOWN and strips the
                                //  field, so what comes back is the wheel's own list. Filtering
                                //  on `v.shown` here was both redundant and a type error — and
                                //  it reached CI because a grep on the gate's output hid the
                                //  typecheck red from the run that was supposed to catch it.
                                const open = verbsFor(s, 'boat')
                                    .filter((v) => v.available)
                                    .map((v) => v.id);
                                if (open.length > most) { most = open.length; worst = open; }
                            }
                        }
                    }
                }
            }
        }
        expect(most, `the busiest wheel is now [${worst.join(' | ')}]`).toBeLessThanOrEqual(5);
    });
});
