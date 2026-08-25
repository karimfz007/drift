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
import type { GameState, Vessel, WaterState } from './types';

export type VesselKind = 'shell-cup' | 'found-pan';

export function freshWater(): WaterState {
    return { vessels: [] };
}

/** How many sips a vessel holds. The pan is the better vessel; the cup is the one you can make. */
export function vesselCapacity(kind: VesselKind): number {
    return kind === 'found-pan' ? TUNE.foundPanSips : TUNE.shellCupSips;
}

export function vesselName(kind: VesselKind): string {
    return kind === 'found-pan' ? 'a found pan' : 'a coconut-shell cup';
}

/** Plain plural for a count of vessels, for readouts that summarise a set of them. */
export function vesselsName(state: GameState): string {
    const { vessels } = state.water;
    if (vessels.length === 0) return 'nothing to carry water in';
    if (vessels.length === 1) return vesselName(vessels[0].kind);
    const pans = vessels.filter((v) => v.kind === 'found-pan').length;
    const cups = vessels.length - pans;
    const parts: string[] = [];
    if (cups > 0) parts.push(`${cups} coconut-shell cup${cups === 1 ? '' : 's'}`);
    if (pans > 0) parts.push(`${pans} found pan${pans === 1 ? '' : 's'}`);
    return parts.join(' and ');
}

/** Does the survivor carry ANY vessel of their own? The question every caller used to ask
 *  as `water.vessel !== null`, kept as a function so the shape behind it can change again. */
export function hasVessel(state: GameState): boolean {
    return state.water.vessels.length > 0;
}

/** How many vessels are carried. */
export function vesselCount(state: GameState): number {
    return state.water.vessels.length;
}

/**
 * WHAT THE VESSELS AND THEIR WATER WEIGH — and why plural vessels forced this to exist.
 *
 * A vessel has never been in `Inventory`: [[D-183]] put the cup in `state.water` on purpose,
 * because the husk IS the cup and a cup is not a stackable material. That was free while a
 * survivor could hold exactly ONE — a quarter-kilo rounding error nobody could exploit.
 *
 * The moment several can be carried it stops being a rounding error and becomes a hole of
 * exactly the kind [[D-190]] closed at the other end: unlimited water storage at no cost,
 * because `carriedWeightKg` walks `Inventory` and would never see any of it. So the vessels
 * and the water in them weigh, and a survivor who wants to carry a day's water pays for it in
 * the load system that already exists rather than in a rule invented here.
 *
 * THERE IS NO CAP ON HOW MANY CUPS A SURVIVOR MAY HOLD, deliberately. The limits are the
 * shells they have and the weight on their back — the world, not a number in a predicate.
 */
export function vesselsMassKg(state: GameState): number {
    let kg = 0;
    for (const v of state.water.vessels) {
        kg += TUNE.vesselMassKg[v.kind];
        kg += (v.rawSips + v.cleanSips) * TUNE.waterMassKgPerSip;
    }
    return kg;
}

/** ...and what they take up. Same reasoning as the mass; read by `carriedBulk`. */
export function vesselsBulk(state: GameState): number {
    let bulk = 0;
    for (const v of state.water.vessels) bulk += TUNE.vesselBulk[v.kind];
    return bulk;
}

// ---------------------------------------------------------------------------
// W1 — the coconut shell cup. Coconut + a cutting edge.
// ---------------------------------------------------------------------------

/**
 * THE HUSK YOU ALREADY OPENED COUNTS.
 *
 * REPORTED AS "I have a coconut shell but Fill cup is not offered", and the pond circle was
 * telling the truth: a `shell` is not a vessel, and the only route to one demanded a WHOLE
 * coconut plus a blade. But `eat()` has handed back a `shell` on every coconut eaten since
 * the vessel shipped — "the emptied husk", `materials.ts`'s own words — and that husk is the
 * exact object this operation produces.
 *
 * ONE CUP PER SHELL, AND AS MANY CUPS AS SHELLS. The single-vessel restriction that used to
 * open this function — *"you already have a coconut-shell cup"* — was an over-reach: it made
 * every shell after the first useless and capped a survivor's water at one cup's worth on a
 * long walk. Each cup keeps its OWN ceiling ([[D-190]]'s fix, untouched and still needed);
 * what is gone is the rule that there could only ever be one of them.
 */
export function canMakeShellCup(state: GameState): boolean {
    if (state.inventory.shell >= TUNE.shellCupShellCost) return true;
    return state.inventory.coconut >= TUNE.shellCupCoconutCost
        && state.inventory.sharpblade >= TUNE.shellCupBladeCost;
}

/** One sentence naming the single thing in the way. Never "requirements not met". */
export function shellCupBlocker(state: GameState): string | null {
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
    //  whole-coconut route consumes the nut. Charging the coconut unconditionally would have
    //  driven the stack negative for a survivor who had none.
    if (state.inventory.shell >= TUNE.shellCupShellCost) state.inventory.shell -= TUNE.shellCupShellCost;
    else state.inventory.coconut -= TUNE.shellCupCoconutCost;
    //  The blade is a TOOL used, not a material spent — opening a shell does not consume an
    //  edge. The model's operation list is open/clean/stabilize; none of those eats the knife.
    state.water = { vessels: [...state.water.vessels, { kind: 'shell-cup', rawSips: 0, cleanSips: 0 }] };
    return true;
}

// ---------------------------------------------------------------------------
// W2c — the found pan. Recovered recognised cookware, and deliberately scarce.
// ---------------------------------------------------------------------------

export function canMakeFoundPan(state: GameState): boolean {
    //  "Recovered recognized cookware" — wreck-era metal, which means the crossing. Scarce by
    //  construction rather than by a roll: there is no other source of `metal` in the game,
    //  which is why this needs no count limit of its own.
    return state.inventory.metal >= TUNE.foundPanMetalCost;
}

export function foundPanBlocker(state: GameState): string | null {
    if (state.inventory.metal < TUNE.foundPanMetalCost) return 'You would need cookware off the wreck.';
    return null;
}

export function makeFoundPan(state: GameState): boolean {
    if (!canMakeFoundPan(state)) return false;
    state.inventory.metal -= TUNE.foundPanMetalCost;
    //  IT JOINS THE SET RATHER THAN REPLACING IT. This used to overwrite the cup — "one
    //  vessel, and the better one wins" — which silently destroyed a made object and the raw
    //  water in it. With vessels plural there is nothing to win: a pan is a bigger carrier
    //  beside the cups, not instead of them.
    state.water = { vessels: [...state.water.vessels, { kind: 'found-pan', rawSips: 0, cleanSips: 0 }] };
    return true;
}

// ---------------------------------------------------------------------------
// Filling, and what may never be boiled.
// ---------------------------------------------------------------------------

/** What one vessel is holding, raw and treated together. */
export function sipsIn(v: Vessel): number {
    return v.rawSips + v.cleanSips;
}

/** Room left in ONE vessel, in sips. Zero when it is full of anything. */
export function roomIn(v: Vessel): number {
    return Math.max(0, vesselCapacity(v.kind) - sipsIn(v));
}

/**
 * HOW MUCH WATER IS CARRIED AT ALL — raw and treated together, across every vessel, because
 * a cup holds water and does not care whether it has been boiled.
 *
 * THE BUG THIS EXISTS TO CLOSE, reported as *"four cups of boiled water"* from one cup.
 * `canFillVessel` compared `rawSips` alone against the capacity, and `boil` moves the water
 * from raw to clean — emptying the raw slot. So every boil made the cup fillable again, and
 * clean water accumulated with no ceiling whatsoever:
 *
 *      pass 1: raw 0 clean 2      pass 4: raw 0 clean  8
 *      pass 2: raw 0 clean 4      pass 5: raw 0 clean 10
 *      pass 3: raw 0 clean 6      ...  in a TWO-sip cup
 *
 * THAT CEILING IS PER VESSEL AND STAYS THAT WAY. Carrying three cups is three ceilings, not
 * one loophole: `roomIn` is asked of each cup separately and no cup can hold more than a cup
 * holds. What changed in this pass is only how many cups there may be.
 */
export function heldSips(state: GameState): number {
    let n = 0;
    for (const v of state.water.vessels) n += sipsIn(v);
    return n;
}

/** Total room across everything carried, in sips. */
export function roomLeft(state: GameState): number {
    let n = 0;
    for (const v of state.water.vessels) n += roomIn(v);
    return n;
}

/** Total capacity across everything carried — what a full load of water would be. */
export function totalCapacity(state: GameState): number {
    let n = 0;
    for (const v of state.water.vessels) n += vesselCapacity(v.kind);
    return n;
}

export function canFillVessel(state: GameState): boolean {
    return hasVessel(state)
        && isAtPond(state)
        //  ROOM FOR WATER, not room for RAW water. See `heldSips`.
        && roomLeft(state) > 0;
}

/**
 * FILL WHAT YOU CARRY, to the brim of each, and the brim counts what is already in there.
 *
 * EVERY VESSEL AT ONCE, because kneeling at a pond with three cups and being made to tap
 * three times is a tax rather than a decision. Each is topped up by ITS OWN room, so a cup
 * holding a boiled sip takes one and a fresh pan takes four.
 */
export function fillVessel(state: GameState): number {
    if (!canFillVessel(state)) return 0;
    let filled = 0;
    state.water = {
        vessels: state.water.vessels.map((v) => {
            const room = roomIn(v);
            filled += room;
            return room > 0 ? { ...v, rawSips: v.rawSips + room } : v;
        }),
    };
    return filled;
}

/**
 * WHAT BOILING CANNOT DO, in the Treatment Matrix's own words.
 *
 * "Rolling boil · improves bacteria/viruses/protozoa · CANNOT CLAIM salt, most
 * chemicals/metals, all toxins." So the sea is refused here rather than treated, and the
 * refusal says why. Returning null means the boil is legal.
 */
export function boilRefusalFor(state: GameState): string | null {
    if (!hasVessel(state)) return 'You have nothing that would hold water over a fire.';
    if (rawSips(state) <= 0) return 'There is nothing in it to boil.';
    if (!state.fire.built) return 'You would need a fire under it.';
    if (!isFireLit(state)) return 'The fire is out. Boiling needs a real one.';
    return null;
}

/** Raw sips carried, across every vessel. */
export function rawSips(state: GameState): number {
    let n = 0;
    for (const v of state.water.vessels) n += v.rawSips;
    return n;
}

/** Treated sips carried, across every vessel. */
export function cleanSips(state: GameState): number {
    let n = 0;
    for (const v of state.water.vessels) n += v.cleanSips;
    return n;
}

export function canBoil(state: GameState): boolean {
    return boilRefusalFor(state) === null;
}

/**
 * W2a — THE BOIL. Raw becomes clean, in every vessel on the fire, and nothing else changes.
 *
 * The model calls the qualification "completed boil + clean cooling/storage", which is why
 * this moves the water from raw to clean rather than setting a flag: the treated state is a
 * different quantity of a different thing, and a survivor can hold both.
 *
 * THE WATER DOES NOT MOVE BETWEEN VESSELS. Each cup's raw becomes that same cup's clean, so
 * no vessel can end a boil holding more than it holds — the per-cup ceiling survives the one
 * operation that used to be able to slip past it.
 */
export function boil(state: GameState): number {
    if (!canBoil(state)) return 0;
    let boiled = 0;
    state.water = {
        vessels: state.water.vessels.map((v) => {
            if (v.rawSips <= 0) return v;
            boiled += v.rawSips;
            return { ...v, rawSips: 0, cleanSips: v.cleanSips + v.rawSips };
        }),
    };
    return boiled;
}

// ---------------------------------------------------------------------------
// Drinking it, which is the whole point.
// ---------------------------------------------------------------------------

export function canDrinkClean(state: GameState): boolean {
    return cleanSips(state) > 0 && state.thirst < TUNE.thirstMax;
}

/**
 * DRINK THE TREATED WATER — and this is the one water in the game that costs nothing.
 *
 * No `onsetFrom('bad-water')` here, deliberately and by the matrix: a completed boil takes the
 * biological risk out, and the pond's risk IS biological ("Pond/lagoon · microbial risk H ·
 * representative illness source"). Drinking AT the pond still costs, because that water is
 * untreated. That difference is the reward for building the rung.
 *
 * DRAINED FROM THE FULLEST VESSEL FIRST, so a survivor who tops up as they go ends the day
 * with one part-full cup rather than five cups holding a mouthful each.
 */
export function drinkClean(state: GameState): boolean {
    if (!canDrinkClean(state)) return false;
    let best = -1;
    state.water.vessels.forEach((v, i) => {
        if (v.cleanSips > 0 && (best < 0 || v.cleanSips > state.water.vessels[best].cleanSips)) best = i;
    });
    if (best < 0) return false;
    state.water = {
        vessels: state.water.vessels.map((v, i) => (i === best ? { ...v, cleanSips: v.cleanSips - 1 } : v)),
    };
    //  The SAME `applyDrink` the pond and the flask use — one rule for what a sip is worth,
    //  so treated water can never quietly become a better drink than untreated.
    state.thirst = applyDrink(state.thirst);
    return true;
}

/**
 * THE VESSEL AS AN INVENTORY CHIP — the same truth `waterNote` tells, shaped for the strip.
 *
 * REPORTED AS ITEM LOSS: a survivor made a cup, watched `shell` go 2 -> 1, and found nothing
 * new in their pack. Nothing was lost — the husk IS the cup, and it survives a save — but the
 * only place the cup was ever rendered is the Vitals tab, and the pack is where a person looks
 * for a thing they just made.
 *
 * ONE CHIP FOR THE WHOLE SET, counting sips across every vessel, because what a survivor
 * wants at a glance is how much water they have — not an inventory of crockery.
 */
export function vesselChip(state: GameState): { label: string; state: 'empty' | 'raw' | 'clean' | 'both'; sips: number } | null {
    const { vessels } = state.water;
    if (vessels.length === 0) return null;
    const raw = rawSips(state);
    const clean = cleanSips(state);
    const pans = vessels.filter((v) => v.kind === 'found-pan').length;
    const base = pans === vessels.length ? 'Pan' : pans > 0 ? 'Water' : 'Cup';
    const label = vessels.length > 1 ? `${base} x${vessels.length}` : base;
    if (clean > 0 && raw > 0) return { label, state: 'both', sips: clean + raw };
    if (clean > 0) return { label, state: 'clean', sips: clean };
    if (raw > 0) return { label, state: 'raw', sips: raw };
    return { label, state: 'empty', sips: 0 };
}

/** What the survivor is carrying, for the readout. Never a bare number on its own. */
export function waterNote(state: GameState): string | null {
    const { vessels } = state.water;
    if (vessels.length === 0) return null;
    const raw = rawSips(state);
    const clean = cleanSips(state);
    const what = vesselsName(state);
    //  THE CEILING IS SAID OUT LOUD once there is more than one vessel, because "4 boiled" is
    //  not a number a survivor can act on unless they know what the set holds.
    const of = vessels.length > 1 ? ` of ${totalCapacity(state)}` : '';
    if (clean > 0 && raw > 0) return `${what}: ${clean} boiled, ${raw} raw${of}.`;
    if (clean > 0) return `${what}, ${clean} sip(s) of boiled water${of}.`;
    if (raw > 0) return `${what}, ${raw} sip(s) of pond water${of}. Untreated.`;
    return `${what}, empty.`;
}