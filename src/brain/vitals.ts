/**
 * BRAIN — the vitals rules. Pure functions over TUNE and vital values; zero rendering
 * engine. reconcile.ts drives these across time; state.ts calls them for drink/eat.
 *
 * The Rule of Threes ladder (charter §I.6): warmth is the acute killer, thirst the
 * mid-term pressure, hunger the slow one. An empty vital does not kill directly — it
 * drains health, and empty vitals STACK. Health is the thing that actually runs out.
 *
 * The law this cycle turns on (D-011 / D-025 resolved): **active play can kill you;
 * absence cannot.** Online, a vital's floor is 0 and health can reach 0 → death. Offline
 * (a span long enough to earn a report), every floor is positive, so health cannot reach
 * 0 for any elapsed time or starting state. reconcile enforces it; a property test proves
 * it (A1).
 */

import { TUNE } from '../data/tune';

/** Values at or below this count as empty / floored (float guard). */
export const VITAL_EPSILON = 1e-9;

export function isEmpty(value: number): boolean {
    return value <= VITAL_EPSILON;
}

/**
 * The lowest a vital may fall over a span. Online (a short, non-report span) that is 0 —
 * the vital can empty and health can run out. Offline it is the D-011 floor, but never
 * higher than where the vital already was: absence may sting, it may not *raise* a vital.
 */
export function vitalLowerBound(startValue: number, offlineFloor: number, qualifiesOffline: boolean): number {
    return qualifiesOffline ? Math.min(startValue, offlineFloor) : 0;
}

/**
 * Net health change per game hour, given the other vitals' current values.
 * Negative = draining (each empty vital stacks its drain); positive = recovering.
 *
 * `online` gates recovery: the report-worthy offline path never regens health (absence is
 * for drift, not healing), and it never needs to — its floors already hold the line.
 */
export function healthRatePerGameHour(
    thirst: number,
    hunger: number,
    warmth: number,
    health: number,
    online: boolean
): number {
    let drain = 0;
    if (isEmpty(thirst)) drain += TUNE.healthDrainPerGameHourPerEmptyVital;
    if (isEmpty(hunger)) drain += TUNE.healthDrainPerGameHourPerEmptyVital;
    if (isEmpty(warmth)) drain += TUNE.warmthEmptyHealthDrainPerGameHour;

    if (drain > 0) return -drain;

    //  Nothing is empty. Health climbs back, online, up to full — a crisis survived is one
    //  you climb out of (§I.18 rule 3). Offline holds it flat.
    if (online && health < TUNE.healthMax) return TUNE.healthRegenPerGameHour;
    return 0;
}

/** An honest, specific death cause from whichever vital(s) were empty when health ran out. */
export function deathCauseFrom(thirst: number, hunger: number, warmth: number): string {
    const empties: string[] = [];
    if (isEmpty(warmth)) empties.push('the cold');
    if (isEmpty(thirst)) empties.push('thirst');
    if (isEmpty(hunger)) empties.push('hunger');

    if (empties.length === 0) return 'your wounds'; // defensive; not reachable this cycle
    if (empties.length === 1) return empties[0];
    if (empties.length === 2) return `${empties[0]} and ${empties[1]}`;
    return `${empties[0]}, ${empties[1]}, and ${empties[2]}`;
}

// ---- Drink and eat (instantaneous player actions; state.ts calls these) ----

function clampVital(value: number, max: number): number {
    return Math.max(0, Math.min(max, value));
}

/** Restore thirst by one sip. Returns the new thirst value. */
export function applyDrink(thirst: number): number {
    return clampVital(thirst + TUNE.drinkPerSip, TUNE.thirstMax);
}

/**
 * WHAT CAN BE EATEN — and `meat` and `fish` are here because otherwise they cannot be.
 *
 * THE DEFECT THIS CLOSES, found while wiring fish into "the existing food chain": there was
 * no existing food chain at the eating end. Drop 1 shipped `boarMeatYield`,
 * `meatHungerRestore`, `meatSpoilGameHours`, a freshness stamp and a `meatIsSpoiled`
 * predicate — and the food union never included `meat`, so a survivor could kill a boar,
 * carry the meat, be slowed by its weight, watch it spoil, and never once eat it. Every
 * constant existed and the one line that reaches them did not: [[D-114]]'s shape again.
 *
 * So the fish does not plug into a chain — it completes one.
 *
 * It lives HERE, beside the values, rather than in state.ts where it started: the module
 * that knows what a food is worth is the module that should say what a food is.
 */
export type Food = 'berries' | 'coconut' | 'shellfish' | 'meat' | 'fish';

/** What eating one unit of a food restores. */
export interface FoodValue {
    hunger: number;
    thirst: number;
}

export function foodValue(food: Food): FoodValue {
    switch (food) {
        case 'berries':
            return { hunger: TUNE.berryHungerValue, thirst: 0 };
        case 'coconut':
            return { hunger: TUNE.coconutHungerValue, thirst: TUNE.coconutThirstValue };
        case 'shellfish':
            return { hunger: TUNE.shellfishHungerValue, thirst: 0 };
        //  DROP 1's constant, finally readable by something. See `Food` in state.ts for the
        //  defect this closes — the number existed from the day the boar shipped.
        case 'meat':
            return { hunger: TUNE.meatHungerRestore, thirst: 0 };
        //  FISHING — the best forage on the island, and still not a meal that ends hunger.
        case 'fish':
            return { hunger: TUNE.fishHungerValue, thirst: 0 };
    }
}

/** Apply a food's effect to (hunger, thirst). Returns the clamped new values. */
export function applyFood(
    food: Food,
    hunger: number,
    thirst: number
): { hunger: number; thirst: number } {
    const value = foodValue(food);
    return {
        hunger: clampVital(hunger + value.hunger, TUNE.hungerMax),
        thirst: clampVital(thirst + value.thirst, TUNE.thirstMax)
    };
}
