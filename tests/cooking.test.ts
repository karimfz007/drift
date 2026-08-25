import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/brain/state';
import { verbsFor } from '../src/brain/verbs';
import {
    canCookMeat, cookBlocker, cookCompetence, cookMeat, cookNote, cookRung, keepingHoursFor,
} from '../src/brain/cooking';
import { addPerishable, isSpoiled, perishOnTick, retirePerishable } from '../src/brain/matter';
import { foodValue } from '../src/brain/vitals';
import { eat } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { TUNE } from '../src/data/tune';
import type { GameState, TeardownRung } from '../src/brain/types';

const NOW = 1_770_000_000_000;
const RUNGS: TeardownRung[] = ['novice', 'basic', 'competent', 'skilled', 'expert'];

/** A survivor at a lit fire with a boar's worth of meat in her hands. */
function atTheFire(meat: number = TUNE.boarMeatYield): GameState {
    const s = createInitialState(NOW);
    s.player = { x: 0, y: 90 };
    s.fire = { ...s.fire, built: true, fuel: 10, x: 0, y: 92 };
    s.inventory.meat = meat;
    if (meat > 0) s.freshUntil = { ...s.freshUntil, meat: TUNE.meatSpoilGameHours };
    return s;
}

/** ...and one who knows what she is doing at it. */
function ableCook(meat: number = TUNE.boarMeatYield): GameState {
    const s = atTheFire(meat);
    s.knowledge.domains.survivalcraft.technique = 60;
    s.knowledge.domains.survivalcraft.understanding = 40;
    return s;
}

describe('COOKING — the discovery Drop 1 promised and did not build', () => {
    it('THE VERB EXISTS AND IS ON THE FIRE, which is the whole of the report', () => {
        //  *"Meat cannot be cooked."* It could not: `fireVerbs` had six entries and none of
        //  them touched `inventory.meat`, so a survivor could kill a boar, carry it to a lit
        //  fire, and find nothing there that would do anything with it.
        const s = atTheFire();
        const ids = verbsFor(s, 'fire').map((v) => v.id);
        expect(ids, 'the fire still offers no way to cook').toContain('cook-meat');
        expect(canCookMeat(s), 'a lit fire and meat in hand, and still refused').toBe(true);
    });

    it('...and it is NOT on any other circle', () => {
        //  It needs a place. Cooking from a menu would delete the walk, which is the cost.
        for (const target of ['pond', 'shelter', 'ground', 'boat', 'storage'] as const) {
            expect(verbsFor(s0(), target).map((v) => v.id), `${target} offered cooking`)
                .not.toContain('cook-meat');
        }
        function s0() { return atTheFire(); }
    });

    it('THE VERB IS HIDDEN UNTIL THERE IS SOMETHING TO COOK, and shown the moment there is', () => {
        //  The one staged verb on the fire — see `fireVerbs`. Carrying a kill IS the
        //  discovery, and it is the only fire verb whose subject must be in your hands.
        const empty = atTheFire(0);
        expect(verbsFor(empty, 'fire').map((v) => v.id)).not.toContain('cook-meat');
        const holding = atTheFire(1);
        expect(verbsFor(holding, 'fire').map((v) => v.id)).toContain('cook-meat');
    });

    it('EVERY OTHER FIRE VERB IS STILL ALWAYS LISTED — this staged one thing, not the wheel', () => {
        const empty = atTheFire(0);
        const ids = verbsFor(empty, 'fire').map((v) => v.id);
        for (const verb of ['boil-water', 'feed-fire', 'light-torch', 'make-journal',
            'write-journal', 'brew-remedy']) {
            expect(ids, `${verb} stopped being listed at the fire`).toContain(verb);
        }
    });
});

describe('COOKING — what it refuses, and what it says instead of "no"', () => {
    it('names ONE enabler at a time, nearest last (Law 95)', () => {
        const none = createInitialState(NOW);
        expect(cookBlocker(none)).toMatch(/no fire here/i);

        const cold = atTheFire();
        cold.fire = { ...cold.fire, fuel: 0 };
        expect(cookBlocker(cold)).toMatch(/fire is out/i);

        const empty = atTheFire(0);
        expect(cookBlocker(empty)).toMatch(/no raw meat/i);

        const ok = atTheFire();
        expect(cookBlocker(ok)).toBeNull();
    });

    it('REFUSES TO COOK MEAT THAT HAS ALREADY TURNED, rather than spending an hour on it', () => {
        const s = atTheFire();
        s.freshUntil = { ...s.freshUntil, meat: 0 };
        expect(isSpoiled(s, 'meat')).toBe(true);
        expect(canCookMeat(s)).toBe(false);
        expect(cookBlocker(s)).toMatch(/already turned/i);
        expect(cookMeat(s), 'spoiled meat was cooked anyway').toBe(0);
        expect(s.inventory.meat, 'the spoiled meat vanished into a refusal').toBe(TUNE.boarMeatYield);
    });

    it('a refusal changes nothing at all', () => {
        const s = atTheFire(0);
        const before = JSON.stringify(s.inventory) + JSON.stringify(s.freshUntil);
        expect(cookMeat(s)).toBe(0);
        expect(JSON.stringify(s.inventory) + JSON.stringify(s.freshUntil)).toBe(before);
    });
});

describe('COOKING — the conversion', () => {
    it('turns ALL the raw meat into cooked meat, one for one', () => {
        const s = ableCook(4);
        expect(cookMeat(s)).toBe(4);
        expect(s.inventory.meat).toBe(0);
        expect(s.inventory.cookedMeat).toBe(4);
    });

    it('RETIRES THE RAW CLOCK WITH THE RAW MEAT', () => {
        //  A `freshUntil.meat` left behind would have `isSpoiled` answering about a stack
        //  nobody holds, and `perishOnTick` counting down nothing, forever.
        const s = ableCook(3);
        expect(s.freshUntil.meat).toBeDefined();
        cookMeat(s);
        expect(s.freshUntil.meat, 'the raw clock outlived the raw meat').toBeUndefined();
        expect(s.freshUntil.cookedMeat).toBeGreaterThan(0);
    });

    it('AND COOKING TEACHES COOKING — otherwise the rung could never rise by doing it', () => {
        const s = ableCook(2);
        const before = s.knowledge.domains.survivalcraft.technique;
        cookMeat(s);
        expect(s.knowledge.domains.survivalcraft.technique,
            'an hour at the coals taught nothing').toBeGreaterThan(before);
    });
});

describe('COOKING — the benefit, which is the point of building it', () => {
    it('COOKED MEAT IS WORTH MORE HUNGER THAN RAW, which `meatHungerRestore` has promised since Drop 1', () => {
        //  *"Deliberately modest: raw is worse than cooked will be, and the gap is the reason
        //  to learn fire-cooking later."* That sentence was a promise about a file that did
        //  not exist. This is the assertion that makes it true.
        expect(foodValue('cookedMeat').hunger).toBeGreaterThan(foodValue('meat').hunger);
    });

    it('...and it is the best meal on the island, because it is the only one that must be MADE', () => {
        for (const food of ['berries', 'coconut', 'shellfish', 'meat', 'fish'] as const) {
            expect(foodValue('cookedMeat').hunger,
                `${food} is worth as much as a cooked meal for none of the work`)
                .toBeGreaterThan(foodValue(food).hunger);
        }
    });

    it('...and still does not END hunger, which nothing in this game does', () => {
        expect(foodValue('cookedMeat').hunger).toBeLessThan(TUNE.hungerMax);
    });

    it('IT KEEPS LONGER THAN RAW AT EVERY RUNG, including the worst cook alive', () => {
        //  A discovery that made food go off faster at some rung would not be worth making.
        for (const rung of RUNGS) {
            expect(keepingHoursFor(rung), `a ${rung} cook made it keep less than raw`)
                .toBeGreaterThan(TUNE.meatSpoilGameHours);
        }
    });

    it('...and the ladder runs strictly upward, novice to expert', () => {
        for (let i = 1; i < RUNGS.length; i++) {
            expect(keepingHoursFor(RUNGS[i]), `${RUNGS[i]} is no better than ${RUNGS[i - 1]}`)
                .toBeGreaterThan(keepingHoursFor(RUNGS[i - 1]));
        }
    });

    it('AND IT ACTUALLY EATS — the whole defect `Food` was widened to close', () => {
        const s = ableCook(2);
        cookMeat(s);
        s.hunger = 20;
        expect(eat(s, 'cookedMeat')).toBe(true);
        expect(s.hunger).toBe(20 + TUNE.cookedMeatHungerRestore);
        expect(s.inventory.cookedMeat).toBe(1);
    });
});

describe('COOKING — skill, and the one stat it moves', () => {
    it('a better cook makes meat that keeps longer', () => {
        const poor = atTheFire(2);
        const good = ableCook(2);
        expect(cookCompetence(good)).toBeGreaterThan(cookCompetence(poor));
        cookMeat(poor);
        cookMeat(good);
        expect(good.freshUntil.cookedMeat!, 'skill bought nothing')
            .toBeGreaterThan(poor.freshUntil.cookedMeat!);
    });

    it('...but NOT more meat: the count is the count, at every rung', () => {
        //  Skill moves exactly one functional stat, which is the rule `ItemGrade` states for
        //  every made thing. A yield fraction would also have been trivially gamed by
        //  cooking one unit at a time and letting rounding hand a novice a perfect score.
        for (const s of [atTheFire(4), ableCook(4)]) {
            expect(cookMeat(s)).toBe(4);
            expect(s.inventory.cookedMeat).toBe(4);
        }
    });

    it('A STEADY FIRE IS THE WORKHOLDING (Law 219, read onto a hearth)', () => {
        const guttering = ableCook(2);
        guttering.fire = { ...guttering.fire, fuel: TUNE.cookSteadyFireFuel - 1 };
        const banked = ableCook(2);
        banked.fire = { ...banked.fire, fuel: TUNE.cookSteadyFireFuel };
        expect(cookCompetence(banked), 'a banked fire was worth nothing over a guttering one')
            .toBeGreaterThan(cookCompetence(guttering));
    });

    it('THE FORECAST AND THE ACT SHARE ONE ARITHMETIC PATH', () => {
        //  A note that promised a number the act then did not deliver is the exact defect
        //  the fair-challenge rule exists to prevent — so the note is derived from the same
        //  two functions the act reads, and this proves they cannot drift apart.
        const s = ableCook(3);
        const promised = Math.round(keepingHoursFor(cookRung(s)) / 24);
        const note = cookNote(s);
        expect(note).toContain(`${promised} days`);
        cookMeat(s);
        expect(Math.round(s.freshUntil.cookedMeat! / 24), 'the note promised a keeping it did not deliver')
            .toBe(promised);
        //  ...AND THE FIGURE IT COMPARES AGAINST IS DERIVED TOO. “instead of two days” was a
        //  literal in the first cut — a sentence about `meatSpoilGameHours` that would not have
        //  moved with it. Retune raw meat and this catches a note still quoting the old number.
        expect(note, 'the note quotes a raw keeping the tuning no longer says')
            .toContain(`instead of ${Math.round(TUNE.meatSpoilGameHours / 24)}`);
    });

    it('...and a blocked forecast says the blocker rather than a number', () => {
        const s = atTheFire(0);
        expect(cookNote(s)).toBe(cookBlocker(s));
    });
});

describe('COOKING — the pile behaves like a pile', () => {
    it('A NEW BATCH CANNOT REFRESH AN OLD ONE: the stack takes the WORST of what is in it', () => {
        //  `freshUntil` holds ONE number per material. Without the minimum, a survivor could
        //  cook a single unit a day and nothing she owned would ever go off — the spoilage
        //  system defeated by drip-feeding it.
        const s = ableCook(2);
        cookMeat(s);
        const fresh = s.freshUntil.cookedMeat!;
        perishOnTick(s, 40);
        const aged = s.freshUntil.cookedMeat!;
        expect(aged).toBeLessThan(fresh);

        s.inventory.meat = 1;
        s.freshUntil = { ...s.freshUntil, meat: TUNE.meatSpoilGameHours };
        expect(cookMeat(s)).toBe(1);
        expect(s.freshUntil.cookedMeat!, 'one fresh piece laundered the whole old pile')
            .toBe(aged);
    });

    it('...and cooked meat DOES still spoil, only slower', () => {
        const s = ableCook(2);
        cookMeat(s);
        expect(isSpoiled(s, 'cookedMeat')).toBe(false);
        perishOnTick(s, keepingHoursFor(cookRung(s)) + 1);
        expect(isSpoiled(s, 'cookedMeat'), 'cooking made meat immortal').toBe(true);
    });

    it('SPOILAGE STILL ONLY HARMS YOU IF YOU CHOOSE TO EAT IT', () => {
        //  Same rule raw meat already keeps: going off costs nothing by itself.
        const s = ableCook(2);
        cookMeat(s);
        const health = s.health;
        perishOnTick(s, keepingHoursFor(cookRung(s)) + 5);
        expect(s.health, 'meat going off in the pack took health').toBe(health);
    });
});

describe('COOKING — D-011: an absence may never worsen a body', () => {
    it('PROPERTY: no length of absence spoils a cooked meal, or a raw one', () => {
        //  D-011 through the REAL absence path — `reconcile`, the same door the boat's own
        //  property test uses — rather than a JSON round-trip, which proves only that objects
        //  copy. The first cut of this test did exactly that and would have passed against a
        //  `reconcile` that rotted the pack while the tab was shut.
        //
        //  AND THIS IS WHERE COOKING COULD HAVE BROKEN IT. Every other perishable in the game
        //  counts down on the ONLINE tick only, so food does not go off during an absence;
        //  a new material that had its clock wired to the wall would be a stack that decays
        //  while you sleep, which is exactly the harm D-011 names.
        const HOURS = [0.01, 1, 25, 24 * 7, 24 * 90, 24 * 365];
        let cases = 0;
        for (const rung of [atTheFire(4), ableCook(4)]) {
            expect(cookMeat(rung)).toBe(4);
            rung.inventory.meat = 2;
            rung.freshUntil = { ...rung.freshUntil, meat: TUNE.meatSpoilGameHours };
            const cooked = rung.freshUntil.cookedMeat!;
            const raw = rung.freshUntil.meat!;
            for (const h of HOURS) {
                const { state: later } = reconcile(rung, h * 3600);
                expect(later.freshUntil.cookedMeat, `${h}h away aged the cooked meat`).toBe(cooked);
                expect(later.freshUntil.meat, `${h}h away aged the raw meat`).toBe(raw);
                expect(later.inventory.cookedMeat, `${h}h away ate the cooked meat`).toBe(4);
                expect(isSpoiled(later, 'cookedMeat'), `${h}h away spoiled it`).toBe(false);
                cases++;
            }
        }
        expect(cases, 'the property swept nothing').toBe(2 * HOURS.length);
    });
});

describe('THE PILE TAKES THE WORST OF WHAT IS IN IT — one rule, three writers', () => {
    //  FOUND WHILE BUILDING COOKING rather than reported. `cookMeat` needed this rule for its
    //  own stack; writing it there alone would have left the game giving two different answers
    //  to one question, so `addPerishable` is shared and these are its three callers.

    it('A SECOND KILL DOES NOT REFRESH THE FIRST KILL’S MEAT', () => {
        //  The hole this closes: `thrustSpear` set `freshUntil.meat` outright, so a survivor
        //  carrying one nearly-rotten unit who killed another boar had the WHOLE pile put back
        //  to a full 48 hours — the old unit included. Kill something every other day and
        //  nothing you carry ever goes off.
        const s = atTheFire(2);
        perishOnTick(s, TUNE.meatSpoilGameHours - 3);
        const nearlyGone = s.freshUntil.meat!;
        expect(nearlyGone).toBeLessThan(5);

        addPerishable(s, 'meat', TUNE.meatSpoilGameHours);
        s.inventory.meat += TUNE.boarMeatYield;
        expect(s.freshUntil.meat, 'a fresh kill un-aged the meat already in the pack')
            .toBe(nearlyGone);
    });

    it('...and neither does a fresh catch, for the fish', () => {
        const s = atTheFire(0);
        s.inventory.fish = 1;
        addPerishable(s, 'fish', TUNE.fishFreshGameHours);
        perishOnTick(s, TUNE.fishFreshGameHours - 2);
        const old = s.freshUntil.fish!;
        addPerishable(s, 'fish', TUNE.fishFreshGameHours);
        expect(s.freshUntil.fish, 'a fresh catch un-aged yesterday’s').toBe(old);
    });

    it('...but the FIRST stock of a kind sets the clock outright', () => {
        //  The minimum must not be taken against a clock that is not there — `Math.min` with
        //  `undefined` is NaN, and a NaN clock is neither fresh nor spoiled.
        const s = atTheFire(0);
        expect(s.freshUntil.fish).toBeUndefined();
        s.inventory.fish = 2;
        addPerishable(s, 'fish', TUNE.fishFreshGameHours);
        expect(s.freshUntil.fish).toBe(TUNE.fishFreshGameHours);
        expect(Number.isNaN(s.freshUntil.fish!)).toBe(false);
    });

    it('AND A CLOCK IS RETIRED WITH THE LAST UNIT, never left ticking over nothing', () => {
        const s = atTheFire(1);
        expect(s.freshUntil.meat).toBeDefined();
        retirePerishable(s, 'meat');
        expect(s.freshUntil.meat, 'retired a clock for stock still in hand').toBeDefined();
        s.inventory.meat = 0;
        retirePerishable(s, 'meat');
        expect(s.freshUntil.meat, 'the clock outlived the last unit').toBeUndefined();
    });
});