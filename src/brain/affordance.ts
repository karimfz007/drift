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
