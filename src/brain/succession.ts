/**
 * THE CASTAWAY CYCLE (Slice 3) — death is final, and the island is not.
 *
 * This retires the interim respawn. That function resurrected the *same person*: same body,
 * same knowledge, diminished vitals, a scolding message. It was always scaffolding, and it
 * quietly taught the opposite of what this game is about — that dying is a setback you walk
 * off. **A survivor who can be resurrected has no stakes, and a world that resets with them
 * has no history.**
 *
 * WHAT REPLACES IT. The survivor ends. A different person washes ashore into everything the
 * last one built, and has to work out what it was for.
 *
 * THE PERSISTS / DOES-NOT TABLE (v13 §18) is declared below as DATA rather than scattered
 * through the reset, because it is the constitutional part: every future system has to
 * declare which side it falls on, and a table can be read and argued with in a way that
 * fifty assignments cannot.
 *
 *   PERSISTS — matter and the marks on it. Structures, their condition and contents. The
 *   ground: what was felled, quarried, foraged, and what has grown back. Fires and their
 *   fuel. Anything written down that survived. The dead, as a record.
 *
 *   DOES NOT PERSIST — the person. Body and vitals, what they carried, what they KNEW. A
 *   successor inherits a place, never a mind.
 *
 * MATTER, NOT MEMORY ([[D-069]]). The hard line, and the one most likely to be softened by
 * accident later: **knowledge does not transfer.** A standing shelter proves a shelter is
 * possible — that is real evidence and it genuinely helps — but the newcomer has not built
 * one and does not know how. They arrive at `conceptually-suspected`, not `demonstrated`,
 * and the gap between those two rungs is the whole of what the previous life earned. An
 * inherited station granting undocumented personal knowledge is named in v2.5 §11 as an
 * automatic whole-game failure condition; this module is where that is prevented.
 *
 * LAW 29 — TECHNICAL UNCERTAINTY SUSPENDS DEATH. `closeSurvivor` is pure and total: it
 * computes the entire next state in one pass and returns it, so a caller either commits the
 * whole succession or none of it. There is no window in which the survivor is dead, the
 * island is half-rewritten and a crash leaves neither. **Fault recovery is never rollback**
 * — the dead stay dead once the commit lands; what a crash may cost is the commit, not the
 * truth.
 */
import { succeedJournal } from './journal';
import { createInitialState } from './state';

export { arrivalProfile, type ArrivalProfile } from './arrival';
import type { GameState, SurvivorRecord } from './types';

/** The v13 §18 table, as data. Every future system declares its side here. */
export const PERSISTS_THROUGH_DEATH = [
    'shelter (built, position, grade, durability)',
    'storage (built, position, durability, contents)',
    'fire (built, position, remaining fuel)',
    'the ground — felled, quarried and foraged nodes, and their regrowth',
    'the world clock and the island\'s own history',
    'the memorial record of everyone who has died here',
    'anything written down, if its carrier survived',
] as const;

export const DIES_WITH_THE_SURVIVOR = [
    'the body — health, warmth, thirst, hunger, energy, fatigue, wetness',
    'everything carried',
    'personal knowledge — blueprints, domain understanding, technique',
    'confidence and recency in every practised thing',
    'developed capacities',
    'unwritten experience of any kind',
] as const;

/** What the island itself tells a newcomer, before they know anything. Evidence, not memory. */
export function evidenceOnArrival(state: GameState): string[] {
    const seen: string[] = [];
    if (state.shelter.built) seen.push('Someone built a shelter here. It is still standing.');
    if (state.storage.built) seen.push('There is a store box, set deliberately, with things in it.');
    if (state.fire.built) seen.push('A fire ring, and ash. Not long cold.');
    const felled = state.nodes.filter((n) => !n.available).length;
    if (felled > 0) seen.push('The ground has been worked — stumps, and stone taken out in pieces.');
    return seen;
}

/**
 * CLOSE ONE SURVIVOR, OPEN THE NEXT. Pure and total: computes the whole next state and
 * returns it, so the commit is atomic (Law 29). Never mutates what it was given.
 */
export function closeSurvivor(state: GameState, cause: string): {
    next: GameState;
    record: SurvivorRecord;
} {
    const record: SurvivorRecord = {
        ordinal: state.memorial.length + 1,
        cause,
        diedAtGameHours: state.gameHoursElapsed,
        livedGameHours: state.gameHoursElapsed - state.survivorStartedAtGameHours,
        knewRecipes: [...new Set(state.blueprints.map((b) => b.recipeId))].sort(),
        leftBehind: evidenceOnArrival(state),
    };

    //  THE SAFE DIRECTION, and the single most important line in this module.
    //
    //  The successor is built from a FRESH state and the island is copied ONTO it — not the
    //  other way round. Written the obvious way (`{...state, <reset the person>}`) every
    //  field added to GameState in future would default to SURVIVING the death, and the day
    //  someone adds a personal field and forgets to list it here, knowledge silently starts
    //  inheriting. That is the one failure this whole slice exists to prevent, and it would
    //  arrive as a quiet omission rather than a visible bug.
    //
    //  This way round, a forgotten new field defaults to dying. If it was personal, the
    //  default is correct. If it was worldly, the island forgets a detail and someone
    //  notices — a visible, benign, fixable failure. **Default to death.**
    //  The body is NOT set here, and that absence is deliberate. `createInitialState` now
    //  applies the arrival profile itself, so a fresh state IS an arrival — which is the
    //  fix for the director's "100% spawn". Re-applying the six values here would restore
    //  the very thing that went wrong: two places deciding how a castaway lands, free to
    //  drift apart. One arrival, one source.
    const fresh = createInitialState(state.startedAtMs);

    const next: GameState = {
        ...fresh,

        //  ---- PERSISTS: the island (v13 §18) --------------------------------------------
        //  Listed one by one, on purpose. This is the table made executable, and being
        //  forced to name each line is what keeps the table and the code from drifting.
        gameHoursElapsed: state.gameHoursElapsed,
        lastSeenMs: state.lastSeenMs,
        fire: { ...state.fire },
        shelter: { ...state.shelter },
        storage: { ...state.storage, stored: { ...state.storage.stored } },
        nodes: state.nodes.map((n) => ({ ...n })),
        //  Stacks on the ground are matter, and matter stays. A successor finds what the last
        //  survivor set down, exactly like the store box and the journal.
        dropped: state.dropped.map((d) => ({ ...d })),
        dropCount: state.dropCount,
        //  The boars are a fact about the PLACE. They watched the last survivor die and they
        //  are still out there — killing one is a permanent change to the island, exactly
        //  like felling a tree, and a successor inherits that too.
        boars: state.boars.map((b) => ({ ...b })),
        salvageSpawnCount: state.salvageSpawnCount,
        nextSalvageSpawnAtGameHours: state.nextSalvageSpawnAtGameHours,
        //  THE RAFT IS MATTER, so it stays — a successor finds it moored wherever the last
        //  survivor left it, exactly like the store box. `aboard` is forced FALSE rather than
        //  copied: it describes a body standing on a deck, and that body is dead. Inheriting
        //  it would wake a new castaway already at sea, aboard something they have never seen,
        //  which is the personal/worldly line this whole module is built on.
        raft: { ...state.raft, aboard: false },
        //  TRACES ARE NOT LISTED HERE, and that absence is the decision. Having READ a
        //  stranger's note is something that happened to a mind, not to the island — so it
        //  dies with the reader, and the successor must cross and look for themselves. The
        //  notes are still out there; what is gone is having understood them. Same line
        //  `wreck.reached` draws from the other side: the island remembers the crossing
        //  happened; nobody inherits what it taught.
        //  Someone got out there. That is a fact about this island's history and it is exactly
        //  the `found-intact` grade of inheritance [[D-069]] permits: the successor knows the
        //  crossing is possible and has no idea how it was done.
        wreck: { ...state.wreck },
        //  FISHING. The NET is matter and it is IN THE WORLD — a set net is a thing standing
        //  in the water, and it is still standing there when its owner dies, so
        //  `state.fishing` crosses untouched. The cast LINE does not: a line is held in a
        //  hand, and the hand is gone. `closeSurvivor` cannot know which without saying so,
        //  and this is that saying.
        fishing: { line: null, net: state.fishing.net ? { ...state.fishing.net } : null },
        //  Perishables do NOT cross. The successor inherits the pack (matter merges) but not
        //  its clocks — fish that has been in a dead survivor's bag is not fresh, and giving
        //  a new castaway a full countdown would be a small lie in their favour.
        freshUntil: {},
        //  NOT copied. Being underwater is a fact about a BODY, and that body drowned or died
        //  ashore; either way the successor washes up breathing. `createInitialState` already
        //  gives them a full one, so the absence of a line here IS the rule — the same
        //  default-to-death shape this whole table is built on.
        //  The journal is matter, and it obeys matter's rule: carried, it goes with the body;
        //  set down, it waits. `succeedJournal` owns that asymmetry.
        journal: succeedJournal(state.journal),
        //  The PLAYER's settings, not the character's — the person holding the phone did not
        //  die, and resetting their control mode would be the game punishing the wrong party.
        settings: { ...state.settings },
        //  Instrumentation is about the SAVE, not the survivor. A death is an event in it.
        trace: {
            ...state.trace,
            deaths: state.trace.deaths + 1,
            deathLog: [...state.trace.deathLog, {
                cause,
                gameHoursElapsed: state.gameHoursElapsed,
                message: deathLessonFor(record),
                lost: {},
            }],
        },

        //  ---- THE RECORD ----------------------------------------------------------------
        memorial: [...state.memorial, record],
        survivorStartedAtGameHours: state.gameHoursElapsed,
        lastDeathCause: cause,
        //  Washed ashore where the first one did. A successor arrives at the SEA, never at
        //  the shelter — the walk inland is how they find out someone was here.
        player: { ...fresh.player },
    };

    return { next, record };
}

/** What the death log records about a life. History, never a knowledge transfer. */
function deathLessonFor(record: SurvivorRecord): string {
    if (record.knewRecipes.length === 0) {
        return 'They died before they had worked anything out.';
    }
    return `They had worked out ${record.knewRecipes.length} thing(s). `
        + 'None of it came with you — only what they built, and anything they wrote down.';
}

/** How many have died here. The island's own count, readable by anything that needs it. */
export function survivorsLost(state: GameState): number {
    return state.memorial?.length ?? 0;
}
