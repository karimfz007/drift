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
    carriedBulk,
    carriedWeightKg,
    cleanSips,
    heldSips,
    hasVessel,
    rawSips,
    totalCapacity,
    vesselCount,
    vesselsBulk,
    vesselsMassKg,
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
        expect(s.water.vessels.map((v) => v.kind)).toEqual(['shell-cup']);
        expect(s.inventory.coconut).toBe(1);
        expect(s.inventory.sharpblade, 'the blade was consumed').toBe(blades);
    });

    it('holds more than the flask a survivor might FIND — that is why it is worth the coconut', () => {
        expect(vesselCapacity('shell-cup')).toBeGreaterThan(TUNE.flaskCapacitySips);
    });

    it('AN INVENTORY AFTER ALL — a second cup is made from a second husk', () => {
        //  THIS ASSERTED THE OPPOSITE, under the title "one vessel, not an inventory". That
        //  rule was never about water integrity: the per-cup ceiling is what stops a cup
        //  outgrowing itself ([[D-190]]), and it is untouched. What this refused was a
        //  survivor turning their second husk into their second cup — so every coconut after
        //  the first was dead weight, and a long walk inland could carry two sips.
        const s = atPondWithMakings();
        //  SHELLS ONLY, so the refusal at the end is about running out rather than about the
        //  whole-coconut route still being open behind it.
        s.inventory.shell = 2;
        s.inventory.coconut = 0;
        makeShellCup(s);
        expect(canMakeShellCup(s), 'the second cup was refused while holding the first').toBe(true);
        expect(makeShellCup(s)).toBe(true);
        expect(vesselCount(s)).toBe(2);
        //  ...AND THE REFUSAL, WHEN IT COMES, NAMES THE MATERIAL rather than the cup in hand.
        expect(canMakeShellCup(s)).toBe(false);
        expect(shellCupBlocker(s)).toMatch(/coconut|shell/i);
        expect(shellCupBlocker(s), 'the refusal still blames the cup you are holding')
            .not.toMatch(/already have/i);
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

    it('JOINS the set rather than replacing the cup, and keeps the water already boiled', () => {
        //  THIS ASSERTED THE OPPOSITE and was right at the time: with ONE vessel field there
        //  was nowhere to put a pan except over the cup, so `makeFoundPan` overwrote it and the
        //  best that could be said was that it carried the treated water across. That is a made
        //  object being silently destroyed by an upgrade, and it stopped being necessary the
        //  moment vessels became a list.
        //
        //  THE PROPERTY THAT MATTERED IS UNCHANGED AND STRONGER: making a pan destroys no
        //  treated water — and now destroys no cup either.
        const s = atPondWithMakings();
        makeShellCup(s);
        fillVessel(s);
        withLitFire(s);
        boil(s);
        const boiled = cleanSips(s);
        expect(boiled).toBeGreaterThan(0);

        s.inventory.metal = TUNE.foundPanMetalCost;
        expect(makeFoundPan(s)).toBe(true);
        expect(s.water.vessels.map((v) => v.kind), 'the pan replaced the cup instead of joining it')
            .toEqual(['shell-cup', 'found-pan']);
        expect(cleanSips(s), 'adding a vessel threw away treated water').toBe(boiled);
        expect(totalCapacity(s), 'the set does not hold both vessels worth of water')
            .toBe(vesselCapacity('shell-cup') + vesselCapacity('found-pan'));
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
        const raw = rawSips(s);
        expect(raw).toBe(vesselCapacity('shell-cup'));
        expect(boil(s)).toBe(raw);
        expect(rawSips(s)).toBe(0);
        expect(cleanSips(s)).toBe(raw);
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
        expect(cleanSips(after)).toBe(0);
        expect(rawSips(after)).toBe(0);
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
        const cap = vesselCapacity(s.water.vessels[0].kind);
        expect(canFillVessel(s)).toBe(true);
        fillVessel(s);
        expect(boil(s)).toBe(cap);
        expect(cleanSips(s)).toBe(cap);
        //  The raw slot is empty and the cup is FULL. Reading only `rawSips` said otherwise.
        expect(rawSips(s)).toBe(0);
        expect(canFillVessel(s), 'a full cup accepted more water').toBe(false);
    });

    it('...and ten trips to the pond cannot beat it', () => {
        const s = filled();
        const cap = vesselCapacity(s.water.vessels[0].kind);
        for (let i = 0; i < 10; i++) { fillVessel(s); boil(s); }
        expect(rawSips(s) + cleanSips(s), 'the cup outgrew itself').toBeLessThanOrEqual(cap);
    });

    it('drinking makes room again, which is the only thing that should', () => {
        const s = filled();
        const cap = vesselCapacity(s.water.vessels[0].kind);
        fillVessel(s); boil(s);
        expect(canFillVessel(s)).toBe(false);
        s.thirst = 10;
        expect(drinkClean(s)).toBe(true);
        expect(cleanSips(s)).toBe(cap - 1);
        expect(canFillVessel(s), 'space that opened up was not usable').toBe(true);
        //  ...and topping up fills only the room there is, never past the brim.
        fillVessel(s);
        expect(rawSips(s) + cleanSips(s)).toBe(cap);
    });

    it('...AND MORE CUPS ARE ALLOWED, each with its own ceiling, however they were got', () => {
        //  THE OTHER HALF OF THE ORIGINAL REPORT was "pulling shells out of storage and making
        //  more cups", and this asserted that route was closed. It is open now, deliberately —
        //  a husk from a crate is the same husk — and the thing that keeps the water honest is
        //  not the count of cups but the ceiling on each of them.
        const s = filled();
        const held = heldSips(s);
        s.inventory.shell = 5;
        expect(canMakeShellCup(s), 'a second cup was refused').toBe(true);
        expect(makeShellCup(s)).toBe(true);
        expect(s.inventory.shell, 'the husk was not spent').toBe(4);
        expect(vesselCount(s)).toBe(2);
        //  A NEW CUP ARRIVES EMPTY. It adds capacity, never water: if making one could hand a
        //  survivor sips they had not carried, that would be the original defect with extra
        //  steps.
        expect(heldSips(s), 'a new cup arrived with water already in it').toBe(held);
        expect(s.water.vessels[1].rawSips + s.water.vessels[1].cleanSips).toBe(0);
    });
});

// ---------------------------------------------------------------------------
describe('SEVERAL CUPS AT ONCE — the single-vessel restriction, removed', () => {
    /** A survivor at the pond with a pocketful of emptied husks. */
    const withShells = (n: number): GameState => {
        const s = atPondWithMakings();
        s.inventory.shell = n;
        s.inventory.coconut = 0;
        return s;
    };

    it('A SECOND CUP IS NO LONGER REFUSED — one shell, one cup, as many as you have', () => {
        //  THE OVER-FIX THIS UNDOES. [[D-190]] closed real infinite-water generation inside a
        //  single cup, and left standing a much older rule beside it: `canMakeShellCup` began
        //  with `if (state.water.vessel !== null) return false`. So every husk after the first
        //  was dead weight and a survivor walking inland carried two sips however many
        //  coconuts they had opened. The per-cup ceiling was the fix; the one-cup rule was not.
        const s = withShells(3);
        expect(makeShellCup(s)).toBe(true);
        expect(canMakeShellCup(s), 'the second cup was refused while holding the first').toBe(true);
        expect(makeShellCup(s)).toBe(true);
        expect(makeShellCup(s)).toBe(true);
        expect(vesselCount(s)).toBe(3);
        expect(s.inventory.shell, 'a cup was made without spending a husk').toBe(0);
        expect(shellCupBlocker(s), 'out of shells, and the refusal names the shell').toMatch(/coconut|shell/i);
    });

    it('...and the SET holds the sum of what its cups hold', () => {
        const s = withShells(3);
        makeShellCup(s); makeShellCup(s); makeShellCup(s);
        expect(totalCapacity(s)).toBe(3 * vesselCapacity('shell-cup'));
        expect(fillVessel(s), 'one tap at the pond did not fill everything carried')
            .toBe(3 * vesselCapacity('shell-cup'));
        expect(rawSips(s)).toBe(3 * vesselCapacity('shell-cup'));
        expect(canFillVessel(s), 'a full set was still offered a fill').toBe(false);
    });

    it('EVERY CUP KEEPS ITS OWN CEILING — three cups is three ceilings, not one loophole', () => {
        //  The half of [[D-190]] that must survive this change. If the cap had been re-read as
        //  a total across the set, one cup could quietly hold six sips as long as two others
        //  were empty — which is the original defect wearing a plural shape.
        const s = withShells(3);
        makeShellCup(s); makeShellCup(s); makeShellCup(s);
        fillVessel(s);
        for (const v of s.water.vessels) {
            expect(v.rawSips + v.cleanSips, 'a cup outgrew itself')
                .toBeLessThanOrEqual(vesselCapacity(v.kind));
        }
    });

    it('...and the fill/boil loop cannot outgrow the set either', () => {
        //  The director's original sequence, run against three cups instead of one: fill,
        //  boil, do not drink, fill again. Ten passes.
        const s = withShells(3);
        makeShellCup(s); makeShellCup(s); makeShellCup(s);
        withLitFire(s);
        for (let pass = 0; pass < 10; pass++) {
            s.player = { x: POND.x, y: POND.y };
            fillVessel(s);
            boil(s);
        }
        expect(heldSips(s), 'the set outgrew itself over ten fill/boil passes')
            .toBeLessThanOrEqual(totalCapacity(s));
        for (const v of s.water.vessels) {
            expect(v.rawSips + v.cleanSips).toBeLessThanOrEqual(vesselCapacity(v.kind));
        }
    });

    it('BOILING DOES NOT MOVE WATER BETWEEN CUPS', () => {
        //  Each cup's raw becomes that same cup's clean. Pooling it would let a boil hand one
        //  vessel more than it holds, which is the one operation that used to be able to.
        const s = withShells(2);
        makeShellCup(s); makeShellCup(s);
        fillVessel(s);
        const before = s.water.vessels.map((v) => v.rawSips + v.cleanSips);
        withLitFire(s);
        boil(s);
        expect(s.water.vessels.map((v) => v.rawSips + v.cleanSips), 'water moved between cups')
            .toEqual(before);
        expect(rawSips(s)).toBe(0);
        expect(cleanSips(s)).toBe(before.reduce((a, b) => a + b, 0));
    });

    it('DRINKING DRAINS THE FULLEST CUP FIRST, so a set does not end up all dregs', () => {
        const s = withShells(2);
        makeShellCup(s); makeShellCup(s);
        fillVessel(s);
        withLitFire(s);
        boil(s);
        //  Make them uneven, then drink: the fuller one should give.
        s.water.vessels[0].cleanSips = 1;
        s.thirst = 10;
        expect(drinkClean(s)).toBe(true);
        expect(s.water.vessels[1].cleanSips, 'the emptier cup was drained first')
            .toBe(vesselCapacity('shell-cup') - 1);
        expect(s.water.vessels[0].cleanSips).toBe(1);
    });

    it('CARRYING CUPS COSTS SOMETHING — the vessels and their water have mass and bulk', () => {
        //  WITHOUT THIS THE WHOLE ITEM IS A HOLE. A vessel lives in `state.water`, never in
        //  `Inventory`, so `carriedWeightKg` has never seen one — free while a survivor could
        //  hold exactly one, and unlimited free water storage the moment they can hold ten.
        //  MEASURED AGAINST CARRYING NOTHING, not against carrying the husks. The first cut of
        //  this compared a survivor holding four shells to the same survivor holding the four
        //  cups made from them and expected the load to RISE — and it did not move at all,
        //  which is correct and is worth saying out loud: the husk IS the cup ([[D-183]]), so
        //  turning one into the other is mass-neutral by construction. A cup that weighed more
        //  than the husk it was made from would be matter appearing from nowhere.
        const bare = withShells(0);
        const cups = withShells(4);
        makeShellCup(cups); makeShellCup(cups); makeShellCup(cups); makeShellCup(cups);
        expect(carriedWeightKg(cups), 'four cups weighed nothing at all')
            .toBeGreaterThan(carriedWeightKg(bare));
        expect(carriedBulk(cups), 'four cups took up no room at all')
            .toBeGreaterThan(carriedBulk(bare));
        expect(vesselsMassKg(cups)).toBeCloseTo(4 * TUNE.vesselMassKg['shell-cup'], 6);
        expect(vesselsBulk(cups)).toBeCloseTo(4 * TUNE.vesselBulk['shell-cup'], 6);

        //  THE CONVERSION IS MASS-NEUTRAL, asserted rather than assumed.
        const husks = withShells(4);
        expect(carriedWeightKg(cups), 'a cup and the husk it came from weigh different amounts')
            .toBeCloseTo(carriedWeightKg(husks), 6);

        const empty = cups;

        //  ...AND THE WATER IN THEM WEIGHS TOO, which is what stops a full set being free.
        const dry = carriedWeightKg(empty);
        fillVessel(empty);
        expect(carriedWeightKg(empty), 'a full set of cups weighed the same as an empty one')
            .toBeGreaterThan(dry);
        expect(carriedWeightKg(empty) - dry)
            .toBeCloseTo(heldSips(empty) * TUNE.waterMassKgPerSip, 6);
    });

    it('...and drinking it makes the survivor lighter again', () => {
        const s = withShells(2);
        makeShellCup(s); makeShellCup(s);
        fillVessel(s);
        withLitFire(s);
        boil(s);
        const heavy = carriedWeightKg(s);
        s.thirst = 10;
        expect(drinkClean(s)).toBe(true);
        expect(carriedWeightKg(s), 'a sip drunk left its weight behind').toBeLessThan(heavy);
    });

    it('NOTHING IS CARRIED BY DEFAULT, and `hasVessel` says so', () => {
        const s = fresh();
        expect(hasVessel(s)).toBe(false);
        expect(vesselCount(s)).toBe(0);
        expect(vesselsMassKg(s)).toBe(0);
        expect(waterNote(s)).toBeNull();
        expect(canFillVessel(s)).toBe(false);
        expect(canBoil(s)).toBe(false);
        expect(boilRefusalFor(s)).toMatch(/nothing that would hold water/i);
    });

    it('THE READOUT COUNTS THE WHOLE SET, and names what it can hold', () => {
        const s = withShells(3);
        makeShellCup(s); makeShellCup(s); makeShellCup(s);
        fillVessel(s);
        const note = waterNote(s)!;
        expect(note).toMatch(/3 coconut-shell cups/i);
        expect(note, 'the ceiling is not said out loud once there is a set')
            .toContain(String(totalCapacity(s)));
    });

    it('D-011 — no length of absence adds, empties or spoils a single cup in the set', () => {
        const s = withShells(3);
        makeShellCup(s); makeShellCup(s); makeShellCup(s);
        fillVessel(s);
        withLitFire(s);
        boil(s);
        const before = JSON.stringify(s.water);
        for (const hours of [0.01, 1, 25, 24 * 7, 24 * 365]) {
            const { state: later } = reconcile(s, hours * 3600);
            expect(JSON.stringify(later.water), `${hours}h away changed the water`).toBe(before);
        }
    });
});
