/**
 * THE THREE WATER RUNGS — W1, W2a, W2c, and the claims a boil may NOT make.
 *
 * Every expectation here is checked against the filed v2.6 model rather than against my
 * judgement: `docs/reference/model/the_first_night_body_water_work_manufacture_model_v2_6.xlsx`,
 * sheets "Water Craft Tree", "Treatment Matrix" and "Water Sources".
 *
 *   W1   Coconut shell cup       Coconut + cutting edge          small; cracks; spills
 *   W2a  Coconut direct-heat     Shell cup + hearth + fuel       small; slow; crack/scald
 *   W2c  Found pan route         Recovered recognised cookware   scarce; corrosion/coating
 *
 *   Rolling boil · improves bacteria/viruses/protozoa · CANNOT CLAIM salt, most
 *   chemicals/metals, all toxins · qualification: completed boil + clean cooling/storage
 *
 *   Pond/lagoon · microbial risk H · "Representative illness source"
 */
import { describe, expect, it } from 'vitest';
import {
    boil,
    boilRefusalFor,
    canBoil,
    canDrinkClean,
    canFillVessel,
    canMakeFoundPan,
    canMakeShellCup,
    createInitialState,
    drinkAtPond,
    drinkClean,
    fillVessel,
    foundPanBlocker,
    illnessStage,
    makeFoundPan,
    makeShellCup,
    reconcile,
    shellCupBlocker,
    vesselCapacity,
    waterNote,
    type GameState,
} from '../src/brain';
import { POND } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => fullBody(createInitialState(NOW));

/** At the pond, with a coconut and an edge — everything W1 asks for. */
function atPondWithMakings(): GameState {
    const s = fresh();
    s.player.x = POND.x;
    s.player.y = POND.y;
    s.inventory.coconut = 2;
    s.inventory.sharpblade = 1;
    return s;
}

/** A lit fire under it — W2a's "hearth + fuel". */
function withLitFire(s: GameState): GameState {
    s.fire = { built: true, fuel: 20, x: s.player.x, y: s.player.y };
    return s;
}

// ---------------------------------------------------------------------------
describe('W1 — the coconut shell cup, the first vessel a survivor can MAKE', () => {
    it('needs a coconut and an edge, and says which is missing', () => {
        const bare = fresh();
        expect(canMakeShellCup(bare)).toBe(false);
        expect(shellCupBlocker(bare)).toMatch(/coconut/i);

        const noEdge = fresh();
        noEdge.inventory.coconut = 1;
        expect(canMakeShellCup(noEdge)).toBe(false);
        expect(shellCupBlocker(noEdge)).toMatch(/edge/i);

        const ready = atPondWithMakings();
        expect(canMakeShellCup(ready)).toBe(true);
        expect(shellCupBlocker(ready)).toBeNull();
    });

    it('spends the coconut and NOT the blade — opening a shell does not eat a knife', () => {
        const s = atPondWithMakings();
        const blades = s.inventory.sharpblade;
        expect(makeShellCup(s)).toBe(true);
        expect(s.water.vessel).toBe('shell-cup');
        expect(s.inventory.coconut).toBe(1);
        expect(s.inventory.sharpblade, 'the blade was consumed').toBe(blades);
    });

    it('holds more than the flask a survivor might FIND — that is why it is worth the coconut', () => {
        expect(vesselCapacity('shell-cup')).toBeGreaterThan(TUNE.flaskCapacitySips);
    });

    it('one vessel, not an inventory — a second cup is refused', () => {
        const s = atPondWithMakings();
        makeShellCup(s);
        expect(canMakeShellCup(s)).toBe(false);
        expect(shellCupBlocker(s)).toMatch(/already have/i);
    });
});

// ---------------------------------------------------------------------------
describe('W2c — the found pan, and its scarcity is structural', () => {
    it('needs wreck-era cookware, which means the crossing', () => {
        const s = fresh();
        expect(canMakeFoundPan(s)).toBe(false);
        expect(foundPanBlocker(s)).toMatch(/wreck/i);
        s.inventory.metal = TUNE.foundPanMetalCost;
        expect(canMakeFoundPan(s)).toBe(true);
    });

    it('is the better rung — more volume than the cup', () => {
        expect(vesselCapacity('found-pan')).toBeGreaterThan(vesselCapacity('shell-cup'));
    });

    it('REPLACES the cup rather than stacking, and keeps the water already boiled', () => {
        const s = atPondWithMakings();
        makeShellCup(s);
        fillVessel(s);
        withLitFire(s);
        boil(s);
        const boiled = s.water.cleanSips;
        expect(boiled).toBeGreaterThan(0);

        s.inventory.metal = TUNE.foundPanMetalCost;
        expect(makeFoundPan(s)).toBe(true);
        expect(s.water.vessel).toBe('found-pan');
        expect(s.water.cleanSips, 'upgrading the vessel threw away treated water').toBe(boiled);
    });
});

// ---------------------------------------------------------------------------
describe('W2a — the boil, and it needs a fire under it', () => {
    it('names the ONE thing in the way, in order', () => {
        const noVessel = atPondWithMakings();
        expect(boilRefusalFor(noVessel)).toMatch(/nothing that would hold water/i);

        const empty = atPondWithMakings();
        makeShellCup(empty);
        expect(boilRefusalFor(empty)).toMatch(/nothing in it/i);

        const noFire = atPondWithMakings();
        makeShellCup(noFire);
        fillVessel(noFire);
        expect(boilRefusalFor(noFire)).toMatch(/need a fire/i);

        const dead = atPondWithMakings();
        makeShellCup(dead);
        fillVessel(dead);
        dead.fire = { built: true, fuel: 0, x: dead.player.x, y: dead.player.y };
        expect(boilRefusalFor(dead)).toMatch(/fire is out/i);

        const ready = withLitFire(atPondWithMakings());
        makeShellCup(ready);
        fillVessel(ready);
        expect(boilRefusalFor(ready)).toBeNull();
        expect(canBoil(ready)).toBe(true);
    });

    it('turns raw into clean — a different quantity, not the same water relabelled', () => {
        const s = withLitFire(atPondWithMakings());
        makeShellCup(s);
        fillVessel(s);
        const raw = s.water.rawSips;
        expect(raw).toBe(vesselCapacity('shell-cup'));
        expect(boil(s)).toBe(raw);
        expect(s.water.rawSips).toBe(0);
        expect(s.water.cleanSips).toBe(raw);
    });

    it('filling only works at the pond — water is somewhere you go', () => {
        const s = atPondWithMakings();
        makeShellCup(s);
        expect(canFillVessel(s)).toBe(true);
        s.player.x = 0;
        s.player.y = 96;
        expect(canFillVessel(s)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('P-CLEAN-WATER — what the rung is FOR', () => {
    it('boiled water quenches and does NOT make you ill; pond water does', () => {
        //  THE WHOLE REWARD, and it is the Treatment Matrix against the Water Source register:
        //  a pond is the "representative illness source" at microbial risk H, and a rolling boil
        //  is exactly what takes biological pathogens out.
        const boiledDrinker = withLitFire(atPondWithMakings());
        makeShellCup(boiledDrinker);
        fillVessel(boiledDrinker);
        boil(boiledDrinker);
        boiledDrinker.thirst = 40;
        expect(canDrinkClean(boiledDrinker)).toBe(true);
        expect(drinkClean(boiledDrinker)).toBe(true);
        expect(boiledDrinker.thirst).toBeGreaterThan(40);
        expect(illnessStage(boiledDrinker.illness), 'boiled water made someone ill').toBe('well');

        const rawDrinker = atPondWithMakings();
        rawDrinker.thirst = 40;
        expect(drinkAtPond(rawDrinker)).toBe(true);
        expect(rawDrinker.illness.severity, 'untreated pond water cost nothing').toBeGreaterThan(0);
    });

    it('a sip of treated water is worth exactly a sip of any other — one rule for a drink', () => {
        const treated = withLitFire(atPondWithMakings());
        makeShellCup(treated);
        fillVessel(treated);
        boil(treated);
        treated.thirst = 40;
        drinkClean(treated);

        const pond = atPondWithMakings();
        pond.thirst = 40;
        drinkAtPond(pond);
        expect(treated.thirst).toBeCloseTo(pond.thirst, 6);
    });

    it('runs out — treated water is a quantity, never a state', () => {
        const s = withLitFire(atPondWithMakings());
        makeShellCup(s);
        fillVessel(s);
        boil(s);
        //  Thirst is dropped BEFORE the guard, not inside the body — `fullBody` starts at max
        //  and `canDrinkClean` refuses a survivor who is not thirsty, so the first check failed
        //  and the loop never ran once. A guard evaluated before the state it depends on is set
        //  is the same mistake shape as reading a counter before the tick that moves it.
        let drinks = 0;
        s.thirst = 40;
        while (canDrinkClean(s)) { drinkClean(s); drinks += 1; s.thirst = 40; }
        expect(drinks).toBe(vesselCapacity('shell-cup'));
        expect(canDrinkClean(s)).toBe(false);
    });

    it('the readout says what is carried and marks untreated water as untreated', () => {
        const s = atPondWithMakings();
        expect(waterNote(s), 'nothing carried, nothing said').toBeNull();
        makeShellCup(s);
        expect(waterNote(s)).toMatch(/empty/i);
        fillVessel(s);
        expect(waterNote(s)).toMatch(/untreated/i);
        withLitFire(s);
        boil(s);
        expect(waterNote(s)).toMatch(/boiled/i);
        expect(waterNote(s)).not.toMatch(/untreated/i);
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — an absence neither fills, boils, nor empties', () => {
    it('four hours, two days and a month away leave the water exactly as it was', () => {
        for (const hours of [4, 48, 24 * 30]) {
            const s = withLitFire(atPondWithMakings());
            makeShellCup(s);
            fillVessel(s);
            boil(s);
            fillVessel(s);
            const before = JSON.stringify(s.water);
            const after = reconcile(s, hours * 3600).state;
            expect(after.gameHoursElapsed).toBeGreaterThan(s.gameHoursElapsed);
            expect(JSON.stringify(after.water), `${hours} h away moved the water`).toBe(before);
        }
    });

    it('...and an absence cannot GIVE treated water either', () => {
        //  The offline-gift half. A survivor who left with an empty cup comes back to one.
        const s = atPondWithMakings();
        makeShellCup(s);
        const after = reconcile(s, 24 * 3600).state;
        expect(after.water.cleanSips).toBe(0);
        expect(after.water.rawSips).toBe(0);
    });
});

/**
 * THE CUP HOLDS WHAT A CUP HOLDS — raw and boiled together.
 *
 * REPORTED AS "four cups of boiled water" out of one two-sip cup, in a precise sequence: fill,
 * boil, fill again, boil again. It was not a duplicated vessel and not a duplicated shell. It
 * was the capacity guard reading the wrong quantity: `canFillVessel` compared `rawSips` alone
 * against the capacity, and `boil` moves water from `rawSips` to `cleanSips` — emptying the raw
 * slot. So every boil made the cup fillable again and treated water accumulated with no
 * ceiling at all: a two-sip cup reached TEN clean sips in five pond-to-fire trips, and would
 * have gone on for as long as somebody kept walking.
 *
 * That is the water economy undone — boiling is the whole cost of clean water, and the cup was
 * a free multiplier on it.
 */
describe('a vessel cannot hold more than a vessel holds', () => {
    const filled = (): GameState => {
        const s = createInitialState(1_770_000_000_000);
        s.inventory.coconut = 1;
        s.inventory.sharpblade = 1;
        s.fire = { built: true, fuel: 10, x: 0, y: 92 };
        s.player = { x: -22, y: 8 };
        expect(makeShellCup(s)).toBe(true);
        return s;
    };

    it('FILL, BOIL, FILL AGAIN — the second fill is refused, and the cup stays at its capacity', () => {
        const s = filled();
        const cap = vesselCapacity(s.water.vessel!);
        expect(canFillVessel(s)).toBe(true);
        fillVessel(s);
        expect(boil(s)).toBe(cap);
        expect(s.water.cleanSips).toBe(cap);
        //  The raw slot is empty and the cup is FULL. Reading only `rawSips` said otherwise.
        expect(s.water.rawSips).toBe(0);
        expect(canFillVessel(s), 'a full cup accepted more water').toBe(false);
    });

    it('...and ten trips to the pond cannot beat it', () => {
        const s = filled();
        const cap = vesselCapacity(s.water.vessel!);
        for (let i = 0; i < 10; i++) { fillVessel(s); boil(s); }
        expect(s.water.rawSips + s.water.cleanSips, 'the cup outgrew itself').toBeLessThanOrEqual(cap);
    });

    it('drinking makes room again, which is the only thing that should', () => {
        const s = filled();
        const cap = vesselCapacity(s.water.vessel!);
        fillVessel(s); boil(s);
        expect(canFillVessel(s)).toBe(false);
        s.thirst = 10;
        expect(drinkClean(s)).toBe(true);
        expect(s.water.cleanSips).toBe(cap - 1);
        expect(canFillVessel(s), 'space that opened up was not usable').toBe(true);
        //  ...and topping up fills only the room there is, never past the brim.
        fillVessel(s);
        expect(s.water.rawSips + s.water.cleanSips).toBe(cap);
    });

    it('A SECOND CUP IS STILL REFUSED while one is held, however many husks are to hand', () => {
        //  The other half of the report: pulling shells OUT of storage and making more cups.
        const s = filled();
        s.inventory.shell = 5;
        expect(canMakeShellCup(s), 'a second cup was allowed').toBe(false);
        expect(makeShellCup(s)).toBe(false);
        expect(s.inventory.shell, 'a refused cup still ate a husk').toBe(5);
        expect(shellCupBlocker(s)).toMatch(/already have/i);
    });
});
