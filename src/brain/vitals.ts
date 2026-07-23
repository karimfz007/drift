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

/** What eating one unit of a food restores. */
export interface FoodValue {
    hunger: number;
    thirst: number;
}

export function foodValue(food: 'berries' | 'coconut' | 'shellfish'): FoodValue {
    switch (food) {
        case 'berries':
            return { hunger: TUNE.berryHungerValue, thirst: 0 };
        case 'coconut':
            return { hunger: TUNE.coconutHungerValue, thirst: TUNE.coconutThirstValue };
        case 'shellfish':
            return { hunger: TUNE.shellfishHungerValue, thirst: 0 };
    }
}

/** Apply a food's effect to (hunger, thirst). Returns the clamped new values. */
export function applyFood(
    food: 'berries' | 'coconut' | 'shellfish',
    hunger: number,
    thirst: number
): { hunger: number; thirst: number } {
    const value = foodValue(food);
    return {
        hunger: clampVital(hunger + value.hunger, TUNE.hungerMax),
        thirst: clampVital(thirst + value.thirst, TUNE.thirstMax)
    };
}
