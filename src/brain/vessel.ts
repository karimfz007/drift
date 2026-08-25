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

/**
 * THE HUSK YOU ALREADY OPENED COUNTS (item 3, this batch).
 *
 * REPORTED AS "I have a coconut shell but Fill cup is not offered", and the pond circle was
 * telling the truth: a `shell` is not a vessel, and the only route to one demanded a WHOLE
 * coconut plus a blade. But `eat()` has handed back a `shell` on every coconut eaten since
 * the vessel shipped — "the emptied husk", `materials.ts`'s own words — and that husk is the
 * exact object this operation produces. A survivor holding one was told to go and find an
 * unopened coconut and cut it open to obtain the thing already in their pack.
 *
 * So an emptied shell is the cheaper route to the same cup, and it needs NO blade: the
 * cutting is what made it a shell in the first place. The whole-coconut route is untouched.
 */
export function canMakeShellCup(state: GameState): boolean {
    if (state.water.vessel !== null) return false;
    if (state.inventory.shell >= TUNE.shellCupShellCost) return true;
    return state.inventory.coconut >= TUNE.shellCupCoconutCost
        && state.inventory.sharpblade >= TUNE.shellCupBladeCost;
}

/** One sentence naming the single thing in the way. Never "requirements not met". */
export function shellCupBlocker(state: GameState): string | null {
    if (state.water.vessel !== null) return `You already have ${vesselName(state.water.vessel)}.`;
    //  An emptied husk is the shortest route and needs nothing else, so it is checked first
    //  and never produces a blocker of its own.
    if (state.inventory.shell >= TUNE.shellCupShellCost) return null;
    if (state.inventory.coconut < TUNE.shellCupCoconutCost) return 'You would need a coconut, or an emptied shell.';
    if (state.inventory.sharpblade < TUNE.shellCupBladeCost) return 'You would need something with an edge to open it.';
    return null;
}

export function makeShellCup(state: GameState): boolean {
    if (!canMakeShellCup(state)) return false;
    //  SPEND WHAT WAS ACTUALLY USED. The husk route consumes the husk and nothing else; the
    //  whole-coconut route consumes the nut. Charging the coconut unconditionally, as this
    //  did, would have driven the stack negative for a survivor who had none — which is the
    //  shape a `-1 coconut` bug takes before anybody notices it.
    if (state.inventory.shell >= TUNE.shellCupShellCost) state.inventory.shell -= TUNE.shellCupShellCost;
    else state.inventory.coconut -= TUNE.shellCupCoconutCost;
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

/**
 * HOW MUCH WATER IS IN IT AT ALL — raw and treated together, because a cup holds water and
 * does not care whether it has been boiled.
 *
 * THE BUG THIS EXISTS TO CLOSE, reported as *"four cups of boiled water"* from one cup.
 * `canFillVessel` compared `rawSips` alone against the capacity, and `boil` moves the water
 * from `rawSips` to `cleanSips` — emptying the raw slot. So every boil made the cup fillable
 * again, and clean water accumulated with no ceiling whatsoever:
 *
 *      pass 1: raw 0 clean 2      pass 4: raw 0 clean  8
 *      pass 2: raw 0 clean 4      pass 5: raw 0 clean 10
 *      pass 3: raw 0 clean 6      ...  in a TWO-sip cup
 *
 * Unlimited treated water for the cost of walking pond to fire, which is the whole of the
 * water economy undone. The director’s report is exactly two passes of that loop.
 */
export function heldSips(state: GameState): number {
    return state.water.rawSips + state.water.cleanSips;
}

/** Room left in the vessel, in sips. Zero when it is full of anything. */
export function roomLeft(state: GameState): number {
    if (state.water.vessel === null) return 0;
    return Math.max(0, vesselCapacity(state.water.vessel) - heldSips(state));
}

export function canFillVessel(state: GameState): boolean {
    return state.water.vessel !== null
        && isAtPond(state)
        //  ROOM FOR WATER, not room for RAW water. See `heldSips`.
        && roomLeft(state) > 0;
}

/**
 * FILL IT TO THE BRIM, and the brim counts what is already in there.
 *
 * This used to set `rawSips` to the full capacity outright, which was the second half of the
 * same defect: even had the guard above been right, filling a cup holding one boiled sip
 * would have set raw to two and made three sips fit in a two-sip cup.
 */
export function fillVessel(state: GameState): boolean {
    if (!canFillVessel(state)) return false;
    state.water = { ...state.water, rawSips: state.water.rawSips + roomLeft(state) };
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

/**
 * THE VESSEL AS AN INVENTORY CHIP — the same truth `waterNote` tells, shaped for the strip.
 *
 * REPORTED AS ITEM LOSS (item 3): a survivor made a cup, watched `shell` go 2 -> 1, and found
 * nothing new in their pack. Nothing was lost — the husk IS the cup, and it survives a save —
 * but the only place the cup was ever rendered is the Vitals tab, and the pack is where a
 * person looks for a thing they just made. The found flask has had a chip the whole time.
 *
 * Lives HERE rather than in `hud.ts` so there is one answer to "what am I carrying water in",
 * shared with `waterNote`. Two derivations of that is how a readout ends up disagreeing with
 * the verb that reads the same state.
 */
export function vesselChip(state: GameState): { label: string; state: 'empty' | 'raw' | 'clean' | 'both'; sips: number } | null {
    const { vessel, rawSips, cleanSips } = state.water;
    if (vessel === null) return null;
    const label = vessel === 'found-pan' ? 'Pan' : 'Cup';
    if (cleanSips > 0 && rawSips > 0) return { label, state: 'both', sips: cleanSips + rawSips };
    if (cleanSips > 0) return { label, state: 'clean', sips: cleanSips };
    if (rawSips > 0) return { label, state: 'raw', sips: rawSips };
    return { label, state: 'empty', sips: 0 };
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
