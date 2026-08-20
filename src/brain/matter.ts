/**
 * LAW 128 — A FAILED ATTEMPT TRANSFORMS MATTER (Bible v2.4, Slice 2C).
 *
 * THE PRE-SCAN'S FINDING, which inverts the law's own phrasing. Law 128 reads as a
 * prohibition — *"it must NEVER simply delete intact inputs on failure"* — and the audit in
 * [[D-092]] found we were not violating it. We were not doing anything at all: on a
 * plausible-but-failed attempt the inputs were left completely untouched, because materials
 * are consumed only on success. So the missing piece is the **positive half**. Matter must
 * come out of a failure CHANGED.
 *
 * That absence was quietly teaching the wrong lesson. A failure that costs only the body says
 * the world is indifferent to what you did to it; you can hammer the same stone against the
 * same stone forever and the stone stays perfect. Law 128 says the opposite: the attempt was
 * real, it happened to real matter, and the matter remembers.
 *
 * WHAT "TRANSFORMS" MEANS HERE, concretely. Wood shortens and cracks; stone blunts and
 * fractures; fibre frays and soaks; a blade dulls. Each failed attempt puts WEAR on the one
 * input the operation actually stressed — not on all of them, because a failed lashing does
 * not blunt the stone it was tied around.
 *
 * AND LOSS, WHEN IT COMES, IS EARNED AND ANNOUNCED. A unit is only consumed once accumulated
 * wear passes a threshold, and every step of that accumulation was reported to the player in
 * plain language first. That is the difference between *"your stick finally broke"* — which
 * is a story — and *"a hidden roll deleted your only sharp blade"*, which §11 names as an
 * automatic whole-game failure condition. **No rare critical part can vanish to an unseen
 * roll**; it can only wear out in front of you.
 */
import { TUNE } from '../data/tune';
import type { GameState, MaterialKind } from './types';

/** §128's own vocabulary. What actually happened to the stuff. */
export type Transformation =
    | 'loosened' | 'bent' | 'blunted' | 'cracked' | 'contaminated' | 'shortened'
    | 'soaked' | 'charred' | 'spilled' | 'misaligned' | 'seized' | 'broken';

/** Accumulated wear per material kind. A JSON-safe partial record, like `nullPairs`. */
export type MatterWear = Partial<Record<MaterialKind, number>>;

export function freshMatterWear(): MatterWear {
    return {};
}

/**
 * Which material a failed attempt actually stressed.
 *
 * The one being WORKED, not the one being worked against — a lashing that slips has strained
 * the cord, not the timber. Ordered by how much force the operation puts through each: a
 * blade takes the edge damage, then stone, then fibre, then wood as the fallback, because
 * wood is the thing most attempts are ultimately shaping.
 */
const STRESS_ORDER: MaterialKind[] = ['sharpblade', 'stone', 'fiber', 'wood', 'coconut', 'shellfish', 'berries'];

export function stressedMaterial(materials: MaterialKind[]): MaterialKind | null {
    for (const kind of STRESS_ORDER) {
        if (materials.includes(kind)) return kind;
    }
    return materials[0] ?? null;
}

/**
 * What physically happens to this material when the attempt fails. Chosen per material rather
 * than rolled: the same stuff fails the same way, and a player who has cracked one stone
 * should recognise the next one.
 */
const TRANSFORM: Record<MaterialKind, Transformation> = {
    wood: 'cracked',
    stone: 'blunted',
    fiber: 'loosened',
    sharpblade: 'blunted',
    coconut: 'cracked',
    shell: 'cracked',
    shellfish: 'spilled',
    berries: 'contaminated',
    //  THE WRECK SLICE. Each fails the way that material actually fails: plate BENDS before
    //  it breaks, cable comes LOOSE at the terminal, glass CRACKS, and a breached sterile
    //  store is CONTAMINATED — which is the one that matters, because it is the difference
    //  between a spoiled medicine and a lost one.
    metal: 'bent',
    wiring: 'loosened',
    glass: 'cracked',
    medicine: 'contaminated',
    //  DROP 1 — a failed attempt on meat spoils it. Matter comes out CHANGED (Law 128).
    meat: 'contaminated',
    //  FISHING — a fish fails the way meat does, and it is the same word on purpose: `eat`
    //  already treats `contaminated` as the food that can make you ill, so the fish joins
    //  that rule by HAVING the property rather than by a second branch checking its name.
    fish: 'contaminated',
    //  ITEM 3 (this batch) — the stone hammer. Practically unreachable: `Game.MAKERS.knap`
    //  intercepts every real knap attempt before `tryCombineWith`'s failure branch could
    //  ever run, and `isRecipeKnown` makes Discover refuse a hammer-owning survivor's pile
    //  outright (it is never "unknown"). Given an entry anyway, for the same reason
    //  `Blueprint.inputs` got a real value while dormant — a type that claims total coverage
    //  should not lie about one branch. `blunted`, matching stone's own answer: it is worked
    //  stone, and a hammer fails the way its own material does.
    stonehammer: 'blunted',
};

export function transformationFor(material: MaterialKind): Transformation {
    return TRANSFORM[material];
}

export interface MatterOutcome {
    material: MaterialKind;
    transformation: Transformation;
    /** Wear on this kind AFTER the attempt. */
    wear: number;
    /** Did accumulated wear finally cost a unit? Only ever true after visible warnings. */
    consumed: boolean;
    /** Plain language, for the float message. Never a number. */
    note: string;
}

/**
 * Apply Law 128 to a failed attempt. MUTATES, like the rest of the experiment path.
 *
 * Returns null only when there is nothing to transform, which cannot happen through the real
 * verb — the gate requires the materials in hand — but is handled rather than assumed.
 */
export function transformOnFailure(
    state: GameState, materials: MaterialKind[],
): MatterOutcome | null {
    const material = stressedMaterial(materials);
    if (!material) return null;
    if ((state.inventory[material] ?? 0) <= 0) return null;

    const wear = (state.matterWear[material] ?? 0) + TUNE.matterWearPerFailure;
    const transformation = transformationFor(material);

    //  Loss is EARNED: only once wear crosses the threshold, and every step of the way there
    //  was announced. A part that vanishes to an unseen roll is a named whole-game failure.
    if (wear >= TUNE.matterWearPerUnit) {
        state.inventory[material] -= 1;
        state.matterWear = { ...state.matterWear, [material]: wear - TUNE.matterWearPerUnit };
        return {
            material, transformation: 'broken', wear: wear - TUNE.matterWearPerUnit,
            consumed: true,
            note: `${LABEL[material]} — worked past what it would take. It has broken.`,
        };
    }

    state.matterWear = { ...state.matterWear, [material]: wear };
    return {
        material, transformation, wear, consumed: false,
        note: `${LABEL[material]} — ${VERB[transformation]}.`,
    };
}

/**
 * ---------------------------------------------------------------------------------------
 * PERISHING — one clock, every perishable, counted down ONLINE only.
 *
 * WHAT THIS REPLACES, and why it is a change rather than an addition. Drop 1 stored
 * `meatFreshUntilGameHours`: one field, for one material, holding an absolute
 * `gameHoursElapsed` deadline. Two things were wrong with it, and the second is the reason
 * this stage could not simply add a second field beside it for fish:
 *
 *   1. AN ABSOLUTE DEADLINE ROTS OFFLINE. `gameHoursElapsed` advances across an absence, so
 *      food spoiled while the tab was shut — the same shape this project already wrote the
 *      other way for dropped stacks ("absence never erases, and a stack on the ground is the
 *      survivor's property"). Counting DOWN on the online tick makes the two agree.
 *
 *   2. ONE FIELD PER PERISHABLE IS A PARALLEL SYSTEM WAITING TO HAPPEN — a second for fish,
 *      a third for whatever gets cooked next, each with its own reader and its own drift.
 *
 * NOTHING HERE TAKES HEALTH. Spoiled food becomes harm only when a survivor CHOOSES to eat
 * it, in `eat`, which already routes through `onsetFrom('spoiled-food')`. Perishing is a
 * fact about the pack and never a hit on the body, and that is what keeps [[D-011]] out of it.
 */
export function perishOnTick(state: GameState, gameHours: number): void {
    if (!(gameHours > 0)) return;
    const next: Partial<Record<MaterialKind, number>> = {};
    for (const [kind, left] of Object.entries(state.freshUntil) as Array<[MaterialKind, number]>) {
        //  A kind nobody is carrying has no clock to run, so eating the last one clears it —
        //  and the next catch starts fresh rather than inheriting a stale countdown.
        if (state.inventory[kind] <= 0) continue;
        next[kind] = Math.max(0, left - gameHours);
    }
    state.freshUntil = next;
}

/**
 * Has this material gone off? True only for something actually carried whose clock has run
 * out — a kind with no clock at all is not perishable and can never be spoiled.
 */
export function isSpoiled(state: GameState, kind: MaterialKind): boolean {
    if (state.inventory[kind] <= 0) return false;
    const left = state.freshUntil[kind];
    return left !== undefined && left <= 0;
}

/** Game hours of freshness left, or null when this material does not perish. */
export function freshnessLeft(state: GameState, kind: MaterialKind): number | null {
    return state.freshUntil[kind] ?? null;
}

/** Is this material close enough to failing that the survivor should be told plainly? */
export function isNearlySpent(state: GameState, material: MaterialKind): boolean {
    return (state.matterWear[material] ?? 0) >= TUNE.matterWearPerUnit * TUNE.matterNearlySpentAt;
}

const LABEL: Record<MaterialKind, string> = {
    wood: 'The wood', stone: 'The stone', fiber: 'The fibre', sharpblade: 'The blade',
    coconut: 'The coconut', shell: 'The shell', shellfish: 'The shell', berries: 'The berries',
    meat: 'The meat', fish: 'The fish',
    metal: 'The plate', wiring: 'The cable', glass: 'The glass', medicine: 'The medicine',
    //  ITEM 3 (this batch) — practically unreachable, same reason `TRANSFORM`'s entry above is.
    stonehammer: 'The hammer',
};

const VERB: Record<Transformation, string> = {
    loosened: 'frayed where it was pulled',
    bent: 'bent out of true',
    blunted: 'lost its edge',
    cracked: 'split along the grain',
    contaminated: 'crushed and spoiled',
    shortened: 'lost length to the cut',
    soaked: 'soaked through',
    charred: 'charred where it was held',
    spilled: 'cracked and spilled',
    misaligned: 'sits crooked now',
    seized: 'seized and will not move',
    broken: 'broken',
};
