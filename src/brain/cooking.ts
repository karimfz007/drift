/**
 * COOKING — the discovery the game has been promising itself since Drop 1.
 *
 * WHAT WAS ACTUALLY WRONG. Nothing. Cooking was never broken, because cooking was never
 * built: a survivor could stalk a boar, survive its charges, kill it, carry four units of
 * meat back to a lit fire, stand there, and find nothing on the wheel that would do anything
 * with it. The meat then went off in her hands. Four separate places in this codebase said
 * so out loud and in the same words — *"cooking is the NEXT discovery, deliberately not
 * built"* — in `types.ts` twice, in `state.ts`, and in `tune.ts`. Two of Drop 1's tuned
 * constants were written as promises about this file:
 *
 *   `meatHungerRestore: 18`   "Deliberately modest: raw is worse than COOKED WILL BE, and
 *                              the gap is the reason to learn fire-cooking later."
 *   `meatSpoilGameHours: 48`  "Fast enough that meat is an event rather than a stockpile,
 *                              which is what makes COOKING worth wanting."
 *
 * So the shape was specified before this file existed, and this file is that shape and not a
 * new invention: cooked meat must be worth more hunger than raw, and must keep longer than
 * raw, because those two sentences are the only reason the raw numbers are as low as they are.
 *
 * THE MODEL — one conversion, one cost, one thing that skill moves.
 *
 *   CONVERSION  All the raw meat in hand becomes cooked meat, one for one. Not a yield roll:
 *               a batch that came back short would need a "you burnt some of it" story, and
 *               the honest version of that story is the clock below, not a vanished stack.
 *   COST        An hour at a lit fire, through `spendGameHours` — the same hour writing a
 *               journal and steeping a remedy already cost, down the same path. The world
 *               moves while you cook: hunger falls, the fire burns down, and the boars walk.
 *   SKILL       HOW LONG IT KEEPS, and nothing else. Exactly one functional stat moves with
 *               competence, which is the rule `ItemGrade` already states for made things.
 *               A novice renders it badly and it keeps three game days; an expert gets seven.
 *
 * WHY SKILL MOVES THE CLOCK RATHER THAN THE YIELD. A yield fraction is exploitable in a way
 * that reads as silly rather than as difficult — cook one unit at a time and rounding hands
 * a novice a perfect score. The clock cannot be gamed by batching, because the stack it
 * lands on takes the WORST of what is in it (see `cookMeat`), so a poor cook cannot launder
 * bad work by adding one good piece to an old pile.
 *
 * AND IT REUSES THE LADDER RATHER THAN GROWING A SECOND ONE. `rungForCompetence` is the
 * Weighted Shore's own vocabulary — novice/basic/competent/skilled/expert — already read
 * onto a hull by `repairRung`. A fire asks the same question of a different domain, so it
 * asks it with the same function.
 */

import type { GameState, TeardownRung } from './types';
import { TUNE } from '../data/tune';
import { rungForCompetence } from './heavyObjects';
import { recordTrying } from './knowledge';
import { addPerishable, isSpoiled, retirePerishable } from './matter';

/**
 * HOW GOOD A COOK THIS SURVIVOR IS, on the teardown ladder's 0–100 scale.
 *
 * `survivalcraft` is the domain, weighted the way every other competence in the game is
 * weighted: mostly what your hands can do, partly what you understand about it.
 *
 * AND THE FIRE IS THE WORKHOLDING (Law 219, read onto a hearth). A guttering fire is not a
 * cooking surface — it is a thing you crouch over hoping. A fire with real fuel in it plays
 * the part the cleared workspace plays at the bench, and is worth the same bonus, for the
 * same reason: steady work needs something steady under it.
 */
export function cookCompetence(state: GameState): number {
    const domain = state.knowledge.domains.survivalcraft;
    const base = domain.technique * TUNE.teardownTechniqueWeight
        + domain.understanding * TUNE.teardownUnderstandingWeight;
    const steady = state.fire.fuel >= TUNE.cookSteadyFireFuel ? TUNE.teardownWorkspaceBonus : 0;
    return Math.min(100, base + steady);
}

/** The rung this survivor would cook at, right now, at this fire. */
export function cookRung(state: GameState): TeardownRung {
    return rungForCompetence(cookCompetence(state));
}

/**
 * HOW LONG A BATCH COOKED AT THIS RUNG KEEPS, in game hours.
 *
 * Derived from two constants rather than a five-row table, so the ladder cannot drift out of
 * order: `cookedMeatSpoilGameHours` is the COMPETENT case, and each rung either side moves it
 * by `cookedMeatRungStepGameHours`. Every rung, including novice, keeps longer than the 48
 * hours raw meat gets — cooking that made food go off FASTER at any rung would be a discovery
 * not worth making.
 */
export function keepingHoursFor(rung: TeardownRung): number {
    const steps: Record<TeardownRung, number> = {
        novice: -2, basic: -1, competent: 0, skilled: 1, expert: 2,
    };
    return TUNE.cookedMeatSpoilGameHours + steps[rung] * TUNE.cookedMeatRungStepGameHours;
}

/**
 * THE NEAREST TRUE REASON YOU CANNOT COOK (Law 95: a refusal names ONE enabler).
 *
 * Ordered from the thing furthest from the survivor to the thing nearest it, so the sentence
 * she gets is the one she can act on soonest.
 */
export function cookBlocker(state: GameState): string | null {
    if (!state.fire.built) return 'There is no fire here yet.';
    if (state.fire.fuel <= 0) return 'The fire is out. Cooking needs a real one.';
    if (state.inventory.meat <= 0) return 'You have no raw meat to put on it.';
    //  YOU CANNOT UN-ROT MEAT, and the game should say so rather than let an hour be spent
    //  learning it. Spoiled meat is still edible-at-a-price through `eat`; this refuses only
    //  the pretence that fire would fix it.
    if (isSpoiled(state, 'meat')) return 'It has already turned. Fire will not bring it back.';
    return null;
}

export function canCookMeat(state: GameState): boolean {
    return cookBlocker(state) === null;
}

/**
 * ONE SENTENCE NAMING THE COST AND THE OUTCOME BEFORE THE SURVIVOR COMMITS (Law 26, D-042:
 * the world tells you first). The forecast and the act read the SAME functions — `cookRung`
 * and `keepingHoursFor` — so the promise made here and the thing that happens cannot disagree.
 */
export function cookNote(state: GameState): string {
    const blocker = cookBlocker(state);
    if (blocker) return blocker;
    const n = state.inventory.meat;
    const hours = keepingHoursFor(cookRung(state));
    //  BOTH NUMBERS DERIVED, neither written. “two days” was a literal here in the first cut,
    //  which is a sentence about `meatSpoilGameHours` that would not have moved with it — the
    //  exact shape of defect this batch found three times elsewhere.
    const raw = Math.round(TUNE.meatSpoilGameHours / 24);
    return `${n} of meat over the coals, and about an hour of your day gone with it.`
        + ` Cooked, it would keep something like ${Math.round(hours / 24)} days instead of ${raw}`
        + ' — and it would be worth more to you than raw.';
}

/**
 * COOK IT. Returns how many units went on the fire, or 0 if nothing did.
 *
 * THE STACK TAKES THE WORST OF WHAT IS IN IT. `freshUntil` holds ONE number per material, so
 * a survivor adding a freshly cooked piece to an older pile would otherwise reset the whole
 * pile's clock — cook one unit a day and nothing you own ever goes off. Taking the minimum
 * makes the pile behave like a pile: it is only as good as its oldest piece, and there is
 * nothing to be gained by drip-feeding it.
 */
export function cookMeat(state: GameState): number {
    if (!canCookMeat(state)) return 0;
    const cooked = state.inventory.meat;
    //  READ THE RUNG BEFORE THE WORK TEACHES ANYTHING — what you learn doing a job cannot
    //  improve the job you are doing. The same ordering `boat.ts` keeps for every repair.
    const hours = keepingHoursFor(cookRung(state));

    state.inventory.meat -= cooked;
    state.inventory.cookedMeat += cooked;
    addPerishable(state, 'cookedMeat', hours);
    //  RAW MEAT'S CLOCK GOES WITH THE RAW MEAT. Leaving a stale `meat` entry behind would
    //  leave `isSpoiled(state, 'meat')` answering about a stack that no longer exists, and
    //  `perishOnTick` counting down a thing nobody holds.
    retirePerishable(state, 'meat');
    //  COOKING TEACHES COOKING. Without this the rung could never rise by cooking, and the
    //  only route to better-keeping meat would be to go and do something else entirely —
    //  which is the same broken loop `recordTrying` was added to the boat verbs to close.
    recordTrying(state, 'survivalcraft');
    return cooked;
}
