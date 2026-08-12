/**
 * THE THREE WATER RUNGS — the complete, buildable answer to "boil it with what?"
 *
 * Taken from the filed v2.6 model (`docs/reference/model/the_first_night_body_water_work_
 * manufacture_model_v2_6.xlsx`, sheets "Water Craft Tree" and "Treatment Matrix") rather than
 * guessed at. The three rungs and their exact prerequisites are that sheet's own:
 *
 *   W1   C-COCONUT-CUP      Coconut + cutting edge · open/clean/stabilize · small, cracks, spills
 *   W2a  C-COCONUT-BOILER   Shell cup + hearth + fuel · support/heat/manage/cool · small, slow
 *   W2c  C-FOUND-PAN        Recovered recognised cookware · inspect/clean/leak/heat test · scarce
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS IS NOT THE FLASK AGAIN. The flask is FOUND — `foundFlask` drops it out of salvage —
 * and it holds one sip. A survivor who never finds one has no way to carry water at all, and no
 * way to treat it wherever they are. The coconut is already a shipped material, so the cup is
 * the first vessel a castaway can MAKE, and boiling is the first treatment they can perform.
 * That is the model's whole point about this rung being the highest value per node: it turns
 * water from a place you must walk to into something you can carry and make safe.
 *
 * ---------------------------------------------------------------------------------------
 * A TREATMENT EARNS ONLY THE CLAIMS IT CAN PHYSICALLY SUPPORT — the Treatment Matrix's own
 * first line, and the reason `boilRefusalFor` exists. A rolling boil takes biological pathogens
 * and NOTHING else: not salt, not chemicals, not toxins. So boiling seawater is refused, in the
 * model's own words, rather than quietly producing something drinkable. A game that let you
 * boil the sea would be teaching a survival lie.
 *
 * ---------------------------------------------------------------------------------------
 * [[D-011]]. Every function here runs inside a VERB. `reconcile` has no water term whatsoever —
 * nothing fills, boils, spoils or empties while the game is closed. An absence cannot cost a
 * survivor their treated water and cannot hand them any either.
 */
import { TUNE } from '../data/tune';
import { isAtPond, isFireLit } from './state';
import { applyDrink } from './vitals';
import type { GameState, WaterState } from './types';

export type VesselKind = 'shell-cup' | 'found-pan';

export function freshWater(): WaterState {
    return { vessel: null, rawSips: 0, cleanSips: 0 };
}

/** How many sips a vessel holds. The pan is the better vessel; the cup is the one you can make. */
export function vesselCapacity(kind: VesselKind): number {
    return kind === 'found-pan' ? TUNE.foundPanSips : TUNE.shellCupSips;
}

export function vesselName(kind: VesselKind): string {
    return kind === 'found-pan' ? 'a found pan' : 'a coconut-shell cup';
}

// ---------------------------------------------------------------------------
// W1 — the coconut shell cup. Coconut + a cutting edge.
// ---------------------------------------------------------------------------

export function canMakeShellCup(state: GameState): boolean {
    return state.water.vessel === null
        && state.inventory.coconut >= TUNE.shellCupCoconutCost
        && state.inventory.sharpblade >= TUNE.shellCupBladeCost;
}

/** One sentence naming the single thing in the way. Never "requirements not met". */
export function shellCupBlocker(state: GameState): string | null {
    if (state.water.vessel !== null) return `You already have ${vesselName(state.water.vessel)}.`;
    if (state.inventory.coconut < TUNE.shellCupCoconutCost) return 'You would need a coconut.';
    if (state.inventory.sharpblade < TUNE.shellCupBladeCost) return 'You would need something with an edge to open it.';
    return null;
}

export function makeShellCup(state: GameState): boolean {
    if (!canMakeShellCup(state)) return false;
    state.inventory.coconut -= TUNE.shellCupCoconutCost;
    //  The blade is a TOOL used, not a material spent — opening a shell does not consume an
    //  edge. The model's operation list is open/clean/stabilize; none of those eats the knife.
    state.water = { ...state.water, vessel: 'shell-cup' };
    return true;
}

// ---------------------------------------------------------------------------
// W2c — the found pan. Recovered recognised cookware, and deliberately scarce.
// ---------------------------------------------------------------------------

export function canMakeFoundPan(state: GameState): boolean {
    //  "Recovered recognized cookware" — wreck-era metal, which means the crossing. Scarce by
    //  construction rather than by a roll: there is no other source of `metal` in the game.
    return state.water.vessel !== 'found-pan'
        && state.inventory.metal >= TUNE.foundPanMetalCost;
}

export function foundPanBlocker(state: GameState): string | null {
    if (state.water.vessel === 'found-pan') return 'You already have a found pan.';
    if (state.inventory.metal < TUNE.foundPanMetalCost) return 'You would need cookware off the wreck.';
    return null;
}

export function makeFoundPan(state: GameState): boolean {
    if (!canMakeFoundPan(state)) return false;
    state.inventory.metal -= TUNE.foundPanMetalCost;
    //  It REPLACES a cup rather than stacking: one vessel, and the better one wins. The model
    //  treats these as rungs of one ladder, not as an inventory.
    state.water = { ...state.water, vessel: 'found-pan', rawSips: 0, cleanSips: state.water.cleanSips };
    return true;
}

// ---------------------------------------------------------------------------
// Filling, and what may never be boiled.
// ---------------------------------------------------------------------------

export function canFillVessel(state: GameState): boolean {
    return state.water.vessel !== null
        && isAtPond(state)
        && state.water.rawSips < vesselCapacity(state.water.vessel);
}

export function fillVessel(state: GameState): boolean {
    if (!canFillVessel(state)) return false;
    state.water = { ...state.water, rawSips: vesselCapacity(state.water.vessel!) };
    return true;
}

/**
 * WHAT BOILING CANNOT DO, in the Treatment Matrix's own words.
 *
 * "Rolling boil · improves bacteria/viruses/protozoa · CANNOT CLAIM salt, most
 * chemicals/metals, all toxins." So the sea is refused here rather than treated, and the
 * refusal says why. Returning null means the boil is legal.
 */
export function boilRefusalFor(state: GameState): string | null {
    if (state.water.vessel === null) return 'You have nothing that would hold water over a fire.';
    if (state.water.rawSips <= 0) return 'There is nothing in it to boil.';
    if (!state.fire.built) return 'You would need a fire under it.';
    if (!isFireLit(state)) return 'The fire is out. Boiling needs a real one.';
    return null;
}

export function canBoil(state: GameState): boolean {
    return boilRefusalFor(state) === null;
}

/**
 * W2a — THE BOIL. Raw becomes clean, and nothing else changes.
 *
 * The model calls the qualification "completed boil + clean cooling/storage", which is why this
 * moves the water from `rawSips` to `cleanSips` rather than setting a flag: the treated state
 * is a different quantity of a different thing, and a survivor can hold both.
 */
export function boil(state: GameState): number {
    if (!canBoil(state)) return 0;
    const boiled = state.water.rawSips;
    state.water = { ...state.water, rawSips: 0, cleanSips: state.water.cleanSips + boiled };
    return boiled;
}

// ---------------------------------------------------------------------------
// Drinking it, which is the whole point.
// ---------------------------------------------------------------------------

export function canDrinkClean(state: GameState): boolean {
    return state.water.cleanSips > 0 && state.thirst < TUNE.thirstMax;
}

/**
 * DRINK THE TREATED WATER — and this is the one water in the game that costs nothing.
 *
 * No `onsetFrom('bad-water')` here, deliberately and by the matrix: a completed boil takes the
 * biological risk out, and the pond's risk IS biological ("Pond/lagoon · microbial risk H ·
 * representative illness source"). Drinking AT the pond still costs, because that water is
 * untreated. That difference is the reward for building the rung.
 */
export function drinkClean(state: GameState): boolean {
    if (!canDrinkClean(state)) return false;
    state.water = { ...state.water, cleanSips: state.water.cleanSips - 1 };
    //  The SAME `applyDrink` the pond and the flask use — one rule for what a sip is worth,
    //  so treated water can never quietly become a better drink than untreated.
    state.thirst = applyDrink(state.thirst);
    return true;
}

/** What the survivor is carrying, for the readout. Never a bare number on its own. */
export function waterNote(state: GameState): string | null {
    const { vessel, rawSips, cleanSips } = state.water;
    if (vessel === null) return null;
    if (cleanSips > 0 && rawSips > 0) return `${vesselName(vessel)}: ${cleanSips} boiled, ${rawSips} raw.`;
    if (cleanSips > 0) return `${vesselName(vessel)}, ${cleanSips} sip(s) of boiled water.`;
    if (rawSips > 0) return `${vesselName(vessel)}, ${rawSips} sip(s) of pond water. Untreated.`;
    return `${vesselName(vessel)}, empty.`;
}
