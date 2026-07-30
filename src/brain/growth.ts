/**
 * WHAT THE BODY HAS LEARNED, IN WORDS (director's playtest, FIX 1).
 *
 * Stage B shipped §12's eight capacities and §15's crossings and gave the player no way to
 * see any of it — the third time this project has built a whole system with no entry point,
 * after the Build button and Try-Combining. So this is the reading layer, and it is a BRAIN
 * module rather than markup because the depth-dial admission test is a claim about content,
 * not about styling, and content that cannot be unit-tested gets asserted by nobody.
 *
 * THE DEPTH-DIAL ADMISSION TEST, which every line here has to pass:
 *
 *   **PERCEIVE** — you can tell where you stand. Not a number: a phrase a person would use.
 *      "Stronger than when you washed ashore" is perceivable; "Strength 34" is a spreadsheet.
 *   **INFLUENCE** — you know what would move it. Every capacity states what develops it, in
 *      §12's own terms, so the screen answers "how do I get better at this" without a wiki.
 *   **NARRATE** — you can say what happened and why. The crossings carry §15's own plain
 *      sentences about what each half alone actually does.
 *
 * NUMBERS ARE DELIBERATELY ABSENT from the player-facing strings. They exist on the report
 * for the harness and for any later UI that wants a bar, but `standingOf` is what the screen
 * shows, and it is a band with a name. A castaway does not know they are at 34%.
 *
 * WHAT IT MUST NOT BECOME: a stat sheet with a level-up button. Nothing here is spendable,
 * nothing is chosen, and there is no allocation. The only way any of it moves is doing the
 * work §12 says develops it, which is the entire point of a capacity as opposed to a skill
 * point.
 */
import { CAPACITIES, CAPACITY_SPEC, type Capacity, type CapacityScores } from './capacities';
import { allCrossReadings, type CrossReading } from './crossdev';
import { TUNE } from '../data/tune';
import type { GameState } from './types';

/** Where a capacity stands, as a person would say it rather than as a number. */
export type Standing = 'as you landed' | 'finding it easier' | 'noticeably stronger' | 'practised';

export interface CapacityLine {
    capacity: Capacity;
    /** The player-facing name. Sentence case, no jargon. */
    label: string;
    standing: Standing;
    /** PERCEIVE — one sentence about where they are. */
    where: string;
    /** INFLUENCE — what would move it, from §12's "developed by" column. */
    how: string;
    /** The raw score. NOT shown by the panel; here for the harness and any later bar. */
    score: number;
}

const LABEL: Record<Capacity, string> = {
    strength: 'Strength',
    endurance: 'Endurance',
    loadTolerance: 'Carrying',
    mobilityBalance: 'Footing and balance',
    coordinationDexterity: 'Hands',
    breathWaterConfidence: 'In the water',
    acclimatization: 'Weathering it',
    generalResilience: 'Constitution',
};

/**
 * The bands. Four, not ten: a player must be able to feel the difference between two
 * adjacent bands, and eleven shades of "slightly stronger" is a number wearing a word.
 */
export function standingOf(score: number): Standing {
    if (score >= TUNE.standingPractisedAt) return 'practised';
    if (score >= TUNE.standingStrongerAt) return 'noticeably stronger';
    if (score > TUNE.capacityInnateFloor) return 'finding it easier';
    return 'as you landed';
}

const WHERE: Record<Standing, string> = {
    'as you landed': 'No different from the day you washed ashore.',
    'finding it easier': 'The same work is starting to come easier.',
    'noticeably stronger': 'You notice the difference now, doing things that used to cost you.',
    'practised': 'This has become something you are simply good at.',
};

export function capacityLines(capacities: CapacityScores): CapacityLine[] {
    return CAPACITIES.map((capacity) => {
        const score = capacities[capacity] ?? 0;
        const standing = standingOf(score);
        return {
            capacity,
            label: LABEL[capacity],
            standing,
            where: WHERE[standing],
            //  Straight from §12's own column. Not paraphrased: the sentence that says what
            //  develops a capacity is the sentence that makes it influenceable, and rewriting
            //  it in the UI layer is how the screen and the spec drift apart.
            how: CAPACITY_SPEC[capacity].developedBy,
            score,
        };
    });
}

export interface CrossLine {
    id: string;
    title: string;
    /** NARRATE — §15's own words for what is or is not happening, and why. */
    note: string;
    /** Crossed, or one leg short. */
    achieved: boolean;
    /** What is missing, named — never "requirements not met". */
    missing: string | null;
}

const CROSS_TITLE: Record<string, string> = {
    'heavy-construction-control': 'Moving heavy things safely',
    'sustained-expedition': 'Going far and coming back',
    'precise-repairable-components': 'Work that can be mended',
};

function missingLegFor(r: CrossReading): string | null {
    switch (r.level) {
        case 'crossed': return null;
        case 'body-only': return 'The understanding is the part that is missing.';
        case 'knowledge-only': return 'The body is the part that is missing.';
        default: return 'Neither the body nor the understanding is there yet.';
    }
}

export function crossLines(state: GameState, capacities: CapacityScores): CrossLine[] {
    return allCrossReadings(state, capacities).map((r) => ({
        id: r.id,
        title: CROSS_TITLE[r.id] ?? r.id,
        note: r.note,
        achieved: r.safeControl,
        missing: missingLegFor(r),
    }));
}

export interface GrowthReport {
    capacities: CapacityLine[];
    crossings: CrossLine[];
    /** One honest sentence for the top of the panel. */
    summary: string;
}

export function growthReport(state: GameState, capacities: CapacityScores): GrowthReport {
    const lines = capacityLines(capacities);
    const moved = lines.filter((l) => l.standing !== 'as you landed');
    const crossings = crossLines(state, capacities);
    const crossed = crossings.filter((c) => c.achieved).length;

    //  The summary tells the truth about a fresh castaway rather than inventing encouragement.
    //  "You are just starting out" is honest and useful; a progress bar at 0% dressed up as
    //  "Level 1 Survivor" is neither.
    const summary = moved.length === 0
        ? 'The island has not changed you yet. It will.'
        : crossed > 0
            ? `${moved.length} of ${lines.length} have shifted since you landed, and ${crossed === 1 ? 'one thing has' : `${crossed} things have`} come together.`
            : `${moved.length} of ${lines.length} have shifted since you landed.`;

    return { capacities: lines, crossings, summary };
}
