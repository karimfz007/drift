/**
 * THE SURVIVOR'S JOURNAL ([[D-068]]) — the only way anything a survivor KNEW outlives them.
 *
 * Everything else in Slice 3 is subtraction: the body dies, what it carried dies, what it
 * understood dies. The journal is the one addition, and it is deliberately expensive, because
 * a cheap journal would quietly undo the whole cycle — if writing were free, every successor
 * would inherit everything and death would cost nothing again.
 *
 * SO IT COSTS WHAT WRITING ACTUALLY COSTS:
 *
 *   - MATERIALS to make one at all, and it has to be MADE, like anything else.
 *   - LIGHT. You cannot write in the dark. A lit fire (or a lit torch) is required — which
 *     is why D-068 says "by the fire" and not "in a menu": the act has a place.
 *   - TIME, in game hours, spent not doing the other things the night needed doing.
 *   - ENERGY, because it is the end of a day and you are tired.
 *
 * THE THREE RULES THAT MAKE IT HONEST, each enforced below rather than trusted:
 *
 *   1. **You can only write what you actually know.** `writableTopics` reads the ladder, so
 *      a survivor cannot leave instructions for something they never made. A journal that
 *      could contain anything would be a catalogue with extra steps.
 *   2. **The carrier is mortal.** It is an object at a place, with a condition. Damp takes
 *      it down; fire takes it faster; carrying it means it burns with you. Storing it means
 *      it survives you — and that is the actual decision D-068 wants on the table.
 *   3. **Reading is comprehension-gated.** An entry is not a blueprint transfer. A legible
 *      entry about a recipe lifts a successor to `conceptually-suspected` — a strong hint
 *      from someone who was there — and no further. They still have to make the thing work.
 *      Notes are not skill, and a successor who could read their way to `demonstrated` would
 *      make the previous life's hands irrelevant.
 *
 * UNWRITTEN EXPERIENCE DIES WITH THE BODY. That is the property, and it is enforced by
 * construction: `succeedJournal` is the *only* thing that survives `closeSurvivor`, and it
 * carries entries, never knowledge state.
 */
import { TUNE } from '../data/tune';
import { ladderFor, atLeast } from './ladder';
import { OUTCOME_SPECS } from './construction';
import type { GameState, JournalEntry, JournalState } from './types';

/** Below this the ink has run: the entry is there, and cannot be read. */
export const LEGIBILITY_FLOOR = TUNE.journalLegibilityFloor;

/** Is this entry readable at the journal's current condition? */
export function isLegible(journal: JournalState): boolean {
    return journal.condition >= LEGIBILITY_FLOOR;
}

/** Why writing is not possible right now. Exactly one reason: the first thing to fix. */
export type WriteBlock = 'no-journal' | 'no-light' | 'no-time' | 'too-tired' | 'nothing-to-say' | 'illegible';

export interface WriteReading {
    canWrite: boolean;
    blocked: WriteBlock | null;
    /** One sentence naming what to fix. Never "requirements not met". */
    reason: string | null;
    /** The recipes this survivor could honestly write about, right now. */
    topics: string[];
}

/**
 * WHAT THIS SURVIVOR COULD HONESTLY WRITE DOWN. Reads the ladder: `demonstrated` and above,
 * meaning they made it work at least once. Anything below that is a guess, and a journal of
 * guesses would teach a successor to trust guesses.
 *
 * Excludes topics already written legibly — a survivor does not sit down by the fire to write
 * out the same instructions twice, and allowing it would let the journal be padded.
 */
export function writableTopics(state: GameState): string[] {
    const already = new Set(
        state.journal.entries.filter((e) => e.topic !== null).map((e) => e.topic as string),
    );
    return OUTCOME_SPECS
        .map((s) => s.recipeId)
        .filter((id) => atLeast(ladderFor(state, id), 'demonstrated'))
        .filter((id) => !already.has(id))
        .sort();
}

/** Is there light enough to write by? A lit fire nearby, or a lit torch in hand. */
export function hasWritingLight(state: GameState): boolean {
    if (state.torch.owned && state.torch.lit) return true;
    if (!state.fire.built || state.fire.fuel <= 0) return false;
    const d = Math.hypot(state.fire.x - state.player.x, state.fire.y - state.player.y);
    return d <= TUNE.journalFireRadiusM;
}

/** Can the survivor write, here, now — and if not, which one thing is in the way? */
export function readWrite(state: GameState): WriteReading {
    const topics = writableTopics(state);
    const no = (blocked: WriteBlock, reason: string): WriteReading =>
        ({ canWrite: false, blocked, reason, topics });

    if (!state.journal.exists) {
        return no('no-journal', 'You have nothing to write on or with.');
    }
    if (!isLegible(state.journal)) {
        return no('illegible', 'The pages are too far gone. Ink will not hold on them.');
    }
    if (!hasWritingLight(state)) {
        return no('no-light', 'Too dark to write. You need a fire, or a lit torch.');
    }
    if (state.energy < TUNE.journalEnergyCost) {
        return no('too-tired', 'Your hands are shaking. Rest first.');
    }
    if (topics.length === 0) {
        return no('nothing-to-say', 'Nothing you have done yet is worth setting down.');
    }
    return { canWrite: true, blocked: null, reason: null, topics };
}

/**
 * The sentence a survivor would actually write. Note what it is NOT: a recipe, a quantity, a
 * list of inputs. Someone writing at night by a fire records what they DID and what they
 * noticed, and that is also why reading it cannot grant `demonstrated` — the text genuinely
 * does not contain enough to build from. Form follows the epistemic claim.
 */
const ENTRY_TEXT: Record<string, string> = {
    shelter: 'Got a roof up before the rain. Wood laid across, fibre lashed at every crossing '
        + '— the lashing is the whole of it. Slope it or it pools and comes through.',
    storage: 'Made a box to keep things off the ground. Stone at the base so it sits square. '
        + 'Everything I left out got wet or went missing.',
};

/**
 * WRITE ONE ENTRY. Pure: returns the next journal and the costs to charge. The caller applies
 * both together, so a write is never half-paid.
 */
export function writeEntry(state: GameState, topic: string): {
    journal: JournalState;
    energyCost: number;
    gameHours: number;
    text: string;
} | null {
    const reading = readWrite(state);
    if (!reading.canWrite || !reading.topics.includes(topic)) return null;

    const entry: JournalEntry = {
        author: state.memorial.length + 1,
        writtenAtGameHours: state.gameHoursElapsed,
        topic,
        text: ENTRY_TEXT[topic] ?? 'I made this work once. Writing down what I remember of it.',
    };
    return {
        journal: {
            ...state.journal,
            entries: [...state.journal.entries, entry],
            lastWrittenAtGameHours: state.gameHoursElapsed,
        },
        energyCost: TUNE.journalEnergyCost,
        gameHours: TUNE.journalWriteGameHours,
        text: entry.text,
    };
}

/**
 * WHAT A SUCCESSOR CAN READ. Only legible entries, and only from someone else — reading your
 * own handwriting is not a discovery. Returned as text plus topic so the found-content
 * channel can present it as a thing found, never as a skill granted.
 */
export function readableBy(state: GameState, survivorOrdinal: number): JournalEntry[] {
    if (!state.journal.exists || !isLegible(state.journal)) return [];
    return state.journal.entries.filter((e) => e.author !== survivorOrdinal);
}

/**
 * Does the journal hold a legible entry about this recipe, from someone else? This is the
 * hook `ladderFor` uses for comprehension-gated inheritance — see the rung it grants, and
 * note that it is `conceptually-suspected` and not one rung higher.
 */
export function journalSuggests(state: GameState, recipeId: string): boolean {
    return readableBy(state, state.memorial.length + 1).some((e) => e.topic === recipeId);
}

/**
 * THE CARRIER IS MORTAL. Condition falls with damp and with time; a carried journal takes the
 * survivor's own wetness, a stored one is protected by the box it sits in. Never rises: paper
 * does not recover, and a journal that healed would make the storage decision meaningless.
 */
export function weatherJournal(journal: JournalState, opts: {
    gameHours: number; carrierWet: number; sheltered: boolean;
}): JournalState {
    if (!journal.exists || opts.gameHours <= 0) return journal;
    const wetShare = Math.max(0, Math.min(1, opts.carrierWet / TUNE.wetMax));
    const exposure = journal.carried
        ? wetShare
        : (opts.sheltered ? 0 : wetShare * TUNE.journalStoredExposureShare);
    const loss = exposure * TUNE.journalDampLossPerGameHour * opts.gameHours;
    if (loss <= 0) return journal;
    return { ...journal, condition: Math.max(0, journal.condition - loss) };
}

/** Fire takes it all at once. The cost of writing by firelight, made literal. */
export function burnJournal(journal: JournalState): JournalState {
    return journal.exists ? { ...journal, condition: 0 } : journal;
}

/**
 * WHAT SURVIVES THE SURVIVOR. A carried journal burns/sinks with the body; a journal set down
 * stays where it was left. That asymmetry is the decision: carry it and it is useful to YOU,
 * store it and it is useful to WHOEVER COMES NEXT — and you cannot have both.
 */
export function succeedJournal(journal: JournalState): JournalState {
    if (!journal.exists) return journal;
    if (journal.carried) {
        return { exists: false, x: 0, y: 0, carried: false, condition: 1, entries: [], lastWrittenAtGameHours: null };
    }
    return { ...journal, carried: false };
}
