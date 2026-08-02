/**
 * THE CRASH-ARRIVAL PROFILE (Laws 115–117) — how EVERY castaway lands.
 *
 * Its own module for a reason that is structural, not stylistic: both `state.ts` (the first
 * life) and `succession.ts` (every life after) must apply the identical profile, and if it
 * lived in either one the other would have to import it — closing a cycle. Putting it here
 * makes "the same landing for everyone" enforceable by construction rather than by memory.
 *
 * THE BUG THIS FILE EXISTS TO CLOSE. The profile shipped in `closeSurvivor` and nowhere else,
 * so successors arrived hurt and soaked while the FIRST survivor — the one every new player
 * meets — still woke at six full bars. The director reported it as "100% spawn" and it was
 * real. It survived a slice whose own handoff said *first life and every successor*, survived
 * a test suite that measured the first night, and survived because that test applied the
 * profile to a fresh state by hand: it measured a starting condition the game never produced.
 * **A measurement that constructs its own input proves the formula, not the game.**
 *
 * AUTHORED, NOT ROLLED. A random arrival is a coin flip with the run on it. Every value is a
 * fraction of max, derived from a shipped drain rate — see `tune.ts` for each basis — and
 * verified by measurement through the real `reconcile`, on the online path.
 */
import { TUNE } from '../data/tune';

export interface ArrivalProfile {
    warmth: number;
    thirst: number;
    hunger: number;
    energy: number;
    health: number;
    wet: number;
    /** One sentence the survivor could say about their own body. */
    condition: string;
}

export function arrivalProfile(): ArrivalProfile {
    return {
        //  Cold and soaked from the water, but not hypothermic — the sea took heat, not life.
        warmth: TUNE.warmthMax * TUNE.arrivalWarmthFraction,
        wet: TUNE.wetMax * TUNE.arrivalWetFraction,
        //  Thirsty and hungry enough to matter within the first day, not within the hour.
        thirst: TUNE.thirstMax * TUNE.arrivalThirstFraction,
        hunger: TUNE.hungerMax * TUNE.arrivalHungerFraction,
        //  Winded. Enough to walk and work, not enough to do it carelessly.
        energy: TUNE.energyMax * TUNE.arrivalEnergyFraction,
        //  Hurt. The one that persists past the first night and shapes what is sensible.
        health: TUNE.healthMax * TUNE.arrivalHealthFraction,
        condition: 'Soaked, winded, and hurt somewhere that will not let you forget it.',
    };
}
