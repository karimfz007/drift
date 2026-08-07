/**
 * INSPECTION — what a material tells you when you look at it (Slice 2B Stage A).
 *
 * The rule that defines this whole module, and the one it would be easiest to quietly break:
 * **inspection reveals observable properties and open questions. It never names a finished
 * answer.** "Sharp" and "holds liquid" are observations a castaway can make by handling a
 * thing. "You could make a knife" is the game doing the inventing, which is precisely what
 * the invention pivot exists to stop.
 *
 * The distinction is not cosmetic. A pre-listed manufacture catalogue tells the player what
 * the designers thought of; properties plus questions let the player think of it. The moment
 * inspection says "this would make a good X", the Build panel has grown back in prose.
 *
 * `assertNoFinishedAnswers` is a real guard rather than a comment, because this is a rule
 * about TEXT and text is exactly the thing that erodes one helpful edit at a time.
 */
import type { MaterialKind } from './types';

export interface Affordance {
    /** What handling it tells you. Plain observation, no conclusion. */
    properties: string[];
    /** What it makes you wonder. Open, never leading to one named product. */
    questions: string[];
}

/**
 * Observable properties and open questions per material.
 *
 * Note what is absent: no `makes`, no `usedFor`, no recipe hint of any kind. A reader looking
 * for "what is this for" will not find it here, and that absence is the design.
 */
const AFFORDANCES: Record<string, Affordance> = {
    wood: {
        properties: ['Rigid along the grain', 'Splits rather than bends', 'Floats', 'Burns'],
        questions: ['What would it take to shape it?', 'Does the grain matter?'],
    },
    stone: {
        properties: ['Hard', 'Heavy for its size', 'Fractures to an edge', 'Does not burn'],
        questions: ['What happens if it is struck at an angle?', 'Are all stones the same?'],
    },
    fiber: {
        properties: ['Flexible', 'Weak alone', 'Stronger twisted', 'Holds a knot'],
        questions: ['How much would it take to hold weight?', 'What else behaves like this?'],
    },
    berries: {
        properties: ['Soft', 'Stains what it touches', 'Spoils quickly'],
        questions: ['Is the colour worth anything on its own?'],
    },
    coconut: {
        properties: ['Hard shell, hollow', 'Holds liquid', 'Fibrous husk'],
        questions: ['What else could the shell hold?', 'Is the husk the same as other fibre?'],
    },
    shellfish: {
        properties: ['Hard curved shell', 'Sharp when broken', 'Spoils quickly'],
        questions: ['Would a broken edge hold?'],
    },
};


/**
 * THE JUNK & FLAVOUR CATALOGUE'S OWN AFFORDANCES (Ch.3).
 *
 * SAME SHAPE, SAME LAW, SEPARATE MAP. These are keyed by SITE id rather than by material,
 * because a rusted tool head is not a material you carry — it is an object in the world, and
 * `inspectableMaterials()` feeds the Backpack's list of things in your pack. Putting a world
 * object in there would offer the player an inspection of something they are not holding.
 *
 * They live in THIS FILE rather than beside the catalogue in world.ts for one reason, and it
 * is the reason the whole module exists: `assertNoFinishedAnswers` sweeps *"every string this
 * module ships"*. Authoring junk prose anywhere else would put it outside the one guard that
 * stops observation drifting into instruction, one helpful edit at a time.
 *
 * ONLY THE UNNOTED HALF HAS AN ENTRY, and that is deliberate. A noted object answers with the
 * words somebody left; an unnoted one has nothing to say, so it has to be worth LOOKING at
 * instead — properties you could actually observe by handling it, and the question they
 * raise. An unnoted object with no affordance would be a silent decorative prop, which the
 * world-truth law forbids outright.
 */
const JUNK_AFFORDANCES: Record<string, Affordance> = {
    'jk-adze': {
        properties: [
            'Heavier than stone for its size',
            'One edge was ground straight, not fractured',
            'Rust flakes off in sheets and there is rust under that',
        ],
        questions: [
            'Who grinds an edge straight instead of knapping one?',
            'How long does iron have to sit to go through like this?',
        ],
    },
    'jk-figure': {
        properties: [
            'Cut from a broom handle, across the grain in places',
            'The face is worn smoother than the rest',
            'Whittled with something small and sharp',
        ],
        questions: [
            'How many hours does a thing like this take?',
            'Was it made to be kept, or to pass the time?',
        ],
    },
    'jk-plank': {
        properties: [
            'Salt-bleached grey the whole way through',
            'Square holes, cut — not split, not bored',
            'The spacing between them is even',
        ],
        questions: [
            'What was on the other side of those holes?',
            'Is even spacing something the sea can do?',
        ],
    },
};

/**
 * What handling a piece of junk tells you, or null when it holds a note instead.
 *
 * Null is not an oversight and the body must not treat it as one: a noted object answers
 * through the found-content channel, and giving it observations as well would be two voices
 * for one tap.
 */
export function junkAffordanceOf(siteId: string): Affordance | null {
    return JUNK_AFFORDANCES[siteId] ?? null;
}

/** Every junk id that answers with observation rather than with a note. */
export function inspectableJunk(): string[] {
    return Object.keys(JUNK_AFFORDANCES);
}

export function affordanceOf(material: MaterialKind | string): Affordance | null {
    return AFFORDANCES[material] ?? null;
}

export function inspectableMaterials(): string[] {
    return Object.keys(AFFORDANCES);
}

/**
 * Phrases that would turn an observation into an answer. Checked by a test across every
 * string this module ships, so the rule survives a well-meaning future edit.
 *
 * The list is about SHAPE, not vocabulary: a property may mention a knife if it is describing
 * something the castaway is holding, but no line may tell them what to GO AND MAKE.
 */
export const FINISHED_ANSWER_PATTERNS: RegExp[] = [
    /\byou (could|can|should) (make|build|craft)\b/i,
    /\bwould make an?\b/i,
    /\buse(d)? (this|it) to (make|build|craft)\b/i,
    /\brecipe\b/i,
    /\bcombine (this|it) with\b/i,
];

/** True when a line has stopped observing and started instructing. */
export function namesAFinishedAnswer(line: string): boolean {
    return FINISHED_ANSWER_PATTERNS.some((p) => p.test(line));
}
