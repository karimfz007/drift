/**
 * A SURVIVOR IN KNOWN BASELINE CONDITION — full on every vital.
 *
 * WHY THIS EXISTS. Most suites here measure a RATE: drain so much per game hour, recover so
 * much by a fire, cost so much per swing. They were written when `createInitialState` returned
 * six full bars, so they asserted absolute end values and silently inherited "starts at 100"
 * as an unstated premise.
 *
 * Laws 115-117 changed that premise: a castaway now WASHES ASHORE hurt, and `createInitialState`
 * applies the crash-arrival profile. Sixteen tests failed, every one of them a rate test
 * reading a different absolute number — none of them describing a broken rate.
 *
 * The fix is to make the premise VISIBLE rather than to re-fit the expected numbers. Re-fitting
 * would have quietly re-anchored each test to whatever the arrival profile happens to be today,
 * so a future change to the profile would break the drain tests all over again — and worse, a
 * genuine drain-rate regression could be absorbed by a profile tweak. A rate test should not
 * depend on where the bar started; where it cannot be written that way, it should at least SAY
 * where it started.
 */
import type { GameState } from '../src/brain/types';
import { TUNE } from '../src/data/tune';

export function fullBody<T extends GameState>(s: T): T {
    s.warmth = TUNE.warmthMax;
    s.thirst = TUNE.thirstMax;
    s.hunger = TUNE.hungerMax;
    s.health = TUNE.healthMax;
    s.energy = TUNE.energyMax;
    s.wet = 0;
    return s;
}

/**
 * A THERMALLY COMFORTABLE body — the only one that pays the neutral 1 for every body term.
 *
 * DISTINCT FROM `fullBody`, and the distinction is not pedantry. `fullBody` means "every bar
 * at max", which is what a DRAIN-RATE test needs to subtract from. But `warmthMax` is
 * **heat-strain** — §12 is explicit that more warmth is not automatically better, and
 * `thermalStrain` costs the top of the band exactly as it costs the bottom.
 *
 * So a full-bar body is the wrong baseline for measuring what an ACTIVITY costs: the One Body
 * Resolver applies an environment multiplier, and a survivor at 100 warmth is being charged
 * for cooking. Five energy-cost tests caught precisely this when the resolver landed, reading
 * a legitimate 1.3 as if the resolver were overcharging.
 *
 * Rate tests want `fullBody`. Cost tests want this. Naming both stops the next person from
 * discovering the difference the hard way.
 */
export function comfortableBody<T extends GameState>(s: T): T {
    fullBody(s);
    s.warmth = (TUNE.thermalComfortLow + TUNE.thermalComfortHigh) / 2;
    return s;
}
