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
