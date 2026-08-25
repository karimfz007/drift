/**
 * THE COMBINATION-EVIDENCE PREVIEW — what the survivor is told about a pile before they
 * commit to it, and why the answer changes with what they actually know.
 *
 * THE WHOLE DESIGN IS THAT THE THREE TIERS SAY GENUINELY DIFFERENT KINDS OF THING. This is
 * not one message with the confidence dialled up and down; it is three different claims:
 *
 *   NEVER ATTEMPTED — **properties only.** What the materials are LIKE, drawn from Law 95's
 *   closed seven-term list: sharp, rigid, springy, absorbent, heat-safe, buoyant, conductive.
 *   Observed geometry may show. **IMPLIED FUNCTION MAY NOT.** "Could hold liquid" is the
 *   named counter-example and it is rejected precisely because it is not a property — it is
 *   the ANSWER, wearing a property's clothes. Saying it hands over the discovery the survivor
 *   is standing in front of, which is the whole of the invention pivot.
 *
 *   DEMONSTRATED — the outcome, **with its uncertainty and its constraints.** Not a clean
 *   product name. A survivor who has made a thing once knows they can probably make it again;
 *   they do not know it will come out the same. "Probably X, given what you know" is the
 *   honest register at this tier, and the distinction is real rather than decorative: it is
 *   the difference between having done something and understanding it.
 *
 *   UNDERSTOOD — **full reliability.** Functional slots and known substitutions, stated
 *   plainly. This is the only tier where "produce reliably" applies, which is what makes the
 *   rung worth climbing.
 *
 * KNOWN-MULTIPLE-RESULTS IS NOT BUILT, and deliberately not referenced anywhere a player
 * could see. It is conditional on Boundary 3 (the work-mat entity, Law 127 position 3), which
 * is entirely unbuilt — Slice 2C closed without it. A UI that hinted at it would be promising
 * a surface that does not exist.
 */
import { atLeast, ladderFor, type LadderState } from './ladder';
import { MATERIAL_PROFILE } from './materials';
import { resolveRecipe } from './experiment';
import type { GameState, MaterialKind } from './types';

/**
 * LAW 95's CLOSED LIST. Seven terms, and the closure is the point: a preview that could
 * invent an eighth could describe anything, and "describes anything" is how implied function
 * gets back in. Adding a term is a constitutional change, not a content edit.
 */
export const PROPERTY_TERMS = [
    'sharp', 'rigid', 'springy', 'absorbent', 'heat-safe', 'buoyant', 'conductive',
] as const;

export type PropertyTerm = (typeof PROPERTY_TERMS)[number];

/**
 * What each material is LIKE. Every value is one of the seven; nothing here names a use.
 * Derived from the shipped tag vocabulary so a material cannot gain a property by being
 * described twice in two places.
 */
const PROPERTIES: Record<MaterialKind, PropertyTerm[]> = {
    wood: ['rigid', 'buoyant'],
    stone: ['rigid'],
    fiber: ['springy', 'absorbent'],
    sharpblade: ['sharp', 'rigid'],
    coconut: ['rigid', 'buoyant'],
    //  Empty, it floats better than it did full, and it still holds its shape.
    shell: ['rigid', 'buoyant'],
    //  THE WRECK SLICE — and `conductive` finally has a material that IS one. The term has
    //  been in `PROPERTY_TERMS` since Ch.1 describing nothing on this island, because nothing
    //  on this island conducts. Cable does.
    metal: ['rigid', 'sharp', 'conductive'],
    wiring: ['springy', 'conductive'],
    glass: ['sharp', 'rigid'],
    medicine: ['absorbent'],
    shellfish: ['rigid'],
    berries: ['absorbent'],
    meat: ['absorbent'],
    cookedMeat: ['absorbent'],
    //  FISHING — slippery and soft, and NOTHING structural. A fish has no property this
    //  game builds with, which is the same answer meat and berries give.
    fish: ['absorbent'],
    //  ITEM 3 (this batch) — the stone hammer, now a real `MaterialKind`. `rigid` for the
    //  same reason stone itself is: it is worked stone, and nothing about being a tool
    //  changes what it is made of.
    stonehammer: ['rigid'],
};

export function propertiesOf(kind: MaterialKind): PropertyTerm[] {
    return PROPERTIES[kind] ?? [];
}

export type EvidenceTier = 'never-attempted' | 'demonstrated' | 'understood';

export interface EvidencePreview {
    tier: EvidenceTier;
    /** What the survivor is told. One or more lines, in the tier's own register. */
    lines: string[];
    /** The properties in play, for a surface that wants to chip them. Never a use. */
    properties: PropertyTerm[];
}

/** Which tier a staged pile sits at, read from the shipped ladder rather than a new store. */
export function tierFor(state: GameState, materials: MaterialKind[]): EvidenceTier {
    const recipe = resolveRecipe(state, materials);
    if (!recipe) return 'never-attempted';
    const rung: LadderState = ladderFor(state, recipe.id);
    if (atLeast(rung, 'understood')) return 'understood';
    if (atLeast(rung, 'demonstrated')) return 'demonstrated';
    return 'never-attempted';
}

/**
 * THE PREVIEW. Reads the ladder and says the one kind of thing that rung permits.
 *
 * Note what `never-attempted` deliberately does NOT do: it never consults the resolved
 * recipe, even though `tierFor` had to. Knowing which recipe a pile WOULD make and then
 * describing only its properties would still leak — the description would be selected by the
 * answer. So the properties come from the MATERIALS alone, which is the only source that
 * cannot know what they are for.
 */
export function previewFor(state: GameState, materials: MaterialKind[]): EvidencePreview {
    const tier = tierFor(state, materials);
    const properties = [...new Set(materials.flatMap(propertiesOf))].sort();

    if (tier === 'never-attempted') {
        return {
            tier,
            properties,
            lines: properties.length === 0
                ? ['Nothing about these suggests anything yet.']
                : [`What you have here is ${listOf(properties)}.`, 'What that makes is yours to find out.'],
        };
    }

    const recipe = resolveRecipe(state, materials)!;
    if (tier === 'demonstrated') {
        return {
            tier,
            properties,
            lines: [
                //  UNCERTAINTY IS THE REGISTER, not a hedge bolted on. Having made a thing
                //  once is not knowing how it works, and the tier exists to say so.
                `Probably ${recipe.id}, from what you remember of it.`,
                'You have made one. You could not say yet why it held.',
                'It may come out better or worse than the last.',
            ],
        };
    }

    return {
        tier,
        properties,
        //  FULL RELIABILITY, and the slots stated plainly — this is the only rung where the
        //  game promises an outcome, which is what makes climbing to it worth doing.
        lines: [
            `${recipe.id}. You know how this goes together.`,
            `It takes ${recipe.slots.map((s) => `${s.amount} ${s.require.tag}`).join(' and ')}.`,
            'Anything with the same properties will serve.',
        ],
    };
}

function listOf(terms: readonly string[]): string {
    if (terms.length === 1) return terms[0];
    return `${terms.slice(0, -1).join(', ')} and ${terms[terms.length - 1]}`;
}

/** Every material's profile has a property entry — a new material cannot arrive undescribed. */
export function propertyCoverageComplete(): boolean {
    return (Object.keys(MATERIAL_PROFILE) as MaterialKind[]).every((k) => PROPERTIES[k] !== undefined);
}
