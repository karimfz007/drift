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
import { KNOWLEDGE_DOMAINS } from './knowledge';
import { TUNE } from '../data/tune';
import type { GameState, KnowledgeDomain } from './types';

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

// ---------------------------------------------------------------------------
// THE SEVEN DOMAINS — the fourth system built with no entry point.
// ---------------------------------------------------------------------------

/**
 * WHAT THE SURVIVOR HAS LEARNED, IN WORDS.
 *
 * This module's header says Stage B shipped §12's capacities and §15's crossings and gave the
 * player no way to see either — "the third time this project has built a whole system with no
 * entry point". Ch.2's SEVEN KNOWLEDGE DOMAINS are the fourth. They are trained by felling,
 * knapping, quarrying, salvage, building, surveying a hull, sealing her, reaching the wreck
 * and working it — and the only way to learn where any of them stood was to walk into a gate
 * and be refused by it.
 *
 * WHICH IS EXACTLY HOW ITEM 1 OF THIS BATCH HAPPENED. A survivor met "you do not know hull
 * work well enough yet" with no way to find out that seamanship was a thing they had, let
 * alone how close they were to enough of it. The refusal and this surface are two halves of
 * one answer.
 *
 * ADDITIVE TO LAW 234, NOT A REPLACEMENT. The law is that growth must be FELT without opening
 * anything, and all of it still is: mastery speeds the work, the boat's gate opens, the
 * refusal changes its sentence. This answers the different question a player asks after they
 * have felt it — "where do I stand, and what moves this?" Both, not either.
 *
 * NO NUMBERS, for the same reason the capacities carry none. `score` rides on the line for the
 * harness and for a later bar, exactly as `CapacityLine.score` does; the screen shows a band.
 */
export interface DomainLine {
    domain: KnowledgeDomain;
    label: string;
    standing: Standing;
    /** PERCEIVE — where they stand in this domain. */
    where: string;
    /** INFLUENCE — what actually raises it, naming acts this island really contains. */
    how: string;
    /** Nothing in the shipped game trains it. Said plainly rather than dressed up. */
    dormant: boolean;
    /** Raw technique. NOT shown by the panel. */
    score: number;
}

/**
 * THE BANDS FOR A DOMAIN, and this function exists because the capacity bands were being used
 * on knowledge scores and were wrong by roughly a factor of three.
 *
 * `standingOf` above is calibrated for capacities: floor `capacityInnateFloor` (10), stronger
 * at 40, practised at 70. A domain's floor is `knowledgeInnateFloor` (5), and technique climbs
 * with decaying headroom — `1.35 × (1 − technique/100)` per event — so twelve events, every
 * maritime thing the game contains done once, reaches about 19. Read through the capacity
 * bands that is still "finding it easier", and 'practised' at 70 would need on the order of
 * ninety events. **Every domain therefore read as barely-moved forever**, which is precisely
 * why a player could not tell they had been learning anything.
 *
 * Same four words, because a fifth vocabulary on a screen that already has four would be its
 * own defect. Different thresholds, because they are a different scale — the same reasoning
 * that keeps the two innate floors apart instead of collapsing them.
 */
export function domainStandingOf(score: number): Standing {
    if (score >= TUNE.domainStandingPractisedAt) return 'practised';
    if (score >= TUNE.domainStandingAroundAt) return 'noticeably stronger';
    if (score > TUNE.knowledgeInnateFloor) return 'finding it easier';
    return 'as you landed';
}

/**
 * The names, in the phrasing this codebase has used in prose since Ch.2 — `knowledge.ts`,
 * `types.ts` and `tune.ts` have all been calling them these things in comments. The screen
 * should not introduce an eighth vocabulary for the seven things it is naming.
 */
export const DOMAIN_LABEL: Record<KnowledgeDomain, string> = {
    survivalcraft: 'Survivalcraft',
    foragingMedicine: 'Foraging & medicine',
    harvestingFabrication: 'Harvesting & fabrication',
    construction: 'Construction',
    mechanicalSystems: 'Mechanical systems',
    electricalRadio: 'Electrical & radio',
    navigationSeamanship: 'Navigation & seamanship',
};

/**
 * THE SHORT REGISTER, for a floating cue where the long name would not fit. `game.ts` kept its
 * own copy of this and it was the second label map for one set of things; one source, two
 * registers, so they cannot drift into disagreeing about what a domain is called.
 */
export const DOMAIN_LABEL_SHORT: Record<KnowledgeDomain, string> = {
    survivalcraft: 'Survivalcraft',
    foragingMedicine: 'Foraging',
    harvestingFabrication: 'Harvesting',
    construction: 'Construction',
    mechanicalSystems: 'Mechanics',
    electricalRadio: 'Electrics',
    navigationSeamanship: 'Seamanship',
};

/**
 * WHAT ACTUALLY RAISES EACH ONE — and this is item 1's lesson generalised.
 *
 * A screen that told a survivor to "keep practising" would be the same failure as telling them
 * to work more boats: advice with nothing behind it. So each sentence names acts this island
 * really contains, and a domain with no producer says so plainly instead of inventing one.
 */
const DOMAIN_HOW: Record<KnowledgeDomain, string> = {
    survivalcraft: 'keeping yourself alive — fire, water, warmth, the work around a camp',
    foragingMedicine: 'finding what is edible, and treating what goes wrong with you',
    harvestingFabrication: 'felling, knapping, quarrying and salvage — turning materials into things',
    construction: 'building and mending what stands up: the shelter, the store, the frame',
    mechanicalSystems: 'stripping and rebuilding machinery — the outboard is what this island has',
    electricalRadio: 'nothing here yet. No radio work exists on this island to learn it from',
    navigationSeamanship: 'the water and the hulls on it — the raft, the crossing, the wreck, and her',
};

/**
 * Domains nothing in the shipped game trains. ASSERTED IN TESTS against the real producers, so
 * the day something starts feeding one, the claim that it is dormant fails rather than quietly
 * lying to the player — the same failure mode as a comment that outlives its premise.
 */
export const DORMANT_DOMAINS: ReadonlyArray<KnowledgeDomain> = ['electricalRadio'];

export function domainLines(state: GameState): DomainLine[] {
    return KNOWLEDGE_DOMAINS.map((domain) => {
        //  TECHNIQUE IS THE AXIS THE SCREEN READS, and the choice is worth stating. A domain
        //  carries three — technique, understanding, adaptation — and showing all three would
        //  be twenty-one rows of spreadsheet, which is the stat sheet this module exists
        //  instead of. `adaptation` also has NO producer anywhere in `src/`, so a third column
        //  would be permanently frozen at the floor for every domain: a row that can never
        //  move is worse than no row. Technique is what the game's own gates read
        //  (`handsUnderstand`, `competenceFor`, `hullCompetence`) and what `recordTrying`
        //  moves most, so it is the honest single answer to "where do I stand".
        const score = state.knowledge?.domains?.[domain]?.technique ?? TUNE.knowledgeInnateFloor;
        const dormant = DORMANT_DOMAINS.includes(domain);
        const standing = domainStandingOf(score);
        return {
            domain,
            label: DOMAIN_LABEL[domain],
            standing,
            where: dormant ? 'Nothing on this island has asked this of you yet.' : WHERE[standing],
            how: DOMAIN_HOW[domain],
            dormant,
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
    /** Ch.2’s seven domains, which had no reading layer at all until now. */
    domains: DomainLine[];
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

    return { capacities: lines, domains: domainLines(state), crossings, summary };
}
