/**
 * TRACES — evidence that someone else was here (the Far Island, traces-first).
 *
 * WHAT A TRACE IS, and the line it must never cross. A trace is proof that another person
 * solved this before you. It is NOT a delivery of their solution. Every note here enters
 * through the SAME found-content channel the Survivor's Journal already uses ([[D-068]]), and
 * therefore grants exactly what that channel grants: `conceptually-suspected`, and no further.
 *
 * That rung is the whole design. Reading that someone lashed their cross-pieces underneath
 * tells you a raft is possible and that there is a wrong way to do it; it does not put the
 * raft in your hands, and the ladder has said since [[D-086]] that reading is not doing. A
 * trace that granted `demonstrated` would make the previous person's hands irrelevant, which
 * is the inheritance Slice 3 forbids — and it would forbid it just as hard for a stranger as
 * for a predecessor.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, AND WHY THIS MODULE NEEDS ALMOST NO ARGUMENT FOR IT.
 *
 * A trace has no rate, no timer, no decay and no threat. It does not act; it only ever answers
 * being read. `reconcile` never touches trace state, and there is nothing here for it to
 * touch — the only mutation in this file is `readTrace`, which is a player action and cannot
 * happen while a player is absent.
 *
 * So absence cannot harm through a trace, and it cannot create an unanswerable state either:
 * the worst an absence can do is leave a note unread, which is exactly where it started. A
 * property test asserts it anyway rather than resting on that reasoning, because "it obviously
 * cannot" is how the offline-death law would eventually be broken.
 * ---------------------------------------------------------------------------------------
 */
import { TUNE } from '../data/tune';
import { TRACE_SITES, type TraceSite } from '../data/world';
import type { GameState, MaterialKind, TracesState } from './types';

export function freshTraces(): TracesState {
    return { read: [] };
}

export function traceSites(): readonly TraceSite[] {
    return TRACE_SITES;
}

export function traceById(id: string): TraceSite | null {
    return TRACE_SITES.find((t) => t.id === id) ?? null;
}

/** Has this site already given up what it holds? */
export function hasRead(state: GameState, id: string): boolean {
    return state.traces.read.includes(id);
}

/** The nearest site within arm's reach, or null. Same radius every object uses. */
export function traceWithinReach(state: GameState): TraceSite | null {
    let best: TraceSite | null = null;
    let bestD = Infinity;
    for (const t of TRACE_SITES) {
        const d = Math.hypot(t.x - state.player.x, t.y - state.player.y);
        if (d <= TUNE.interactRadiusM && d < bestD) { bestD = d; best = t; }
    }
    return best;
}

export interface TraceReading {
    site: TraceSite;
    /** What you can see without touching anything — shown on approach. */
    sight: string;
    /** The note, once read. Null while unread: the point is to go and look. */
    note: string | null;
    alreadyRead: boolean;
}

export function readingFor(state: GameState, id: string): TraceReading | null {
    const site = traceById(id);
    if (!site) return null;
    const been = hasRead(state, id);
    return { site, sight: site.sight, note: been ? site.note : null, alreadyRead: been };
}

/**
 * Read a trace. Mutates: records it, and hands over whatever was left behind.
 *
 * ONCE. Left goods are a thing a person actually left, not a respawning node — the
 * renewability law ([[D-051]]) governs SURVIVAL resources and explicitly exempts one-time
 * finds, which is what these are. Nothing here is on the survival floor: the island's own
 * wood, stone, fibre and food are all still reachable through active play alone.
 */
export function readTrace(state: GameState, id: string): { ok: boolean; gained: Partial<Record<MaterialKind, number>> } {
    const site = traceById(id);
    if (!site || hasRead(state, id)) return { ok: false, gained: {} };

    state.traces = { read: [...state.traces.read, id] };
    const gained: Partial<Record<MaterialKind, number>> = {};
    for (const [kind, amount] of Object.entries(site.goods) as Array<[MaterialKind, number]>) {
        state.inventory[kind] += amount;
        gained[kind] = amount;
    }
    return { ok: true, gained };
}

/**
 * Does a READ trace bear on this recipe? The hook `ladderFor` consumes, and the reason it
 * grants the same rung `journalSuggests` does rather than a higher one.
 *
 * Gated on having actually read it: standing next to a cairn teaches nothing, and a survivor
 * who has never crossed to this island has no business suspecting anything from it.
 */
export function traceSuggests(state: GameState, recipeId: string): boolean {
    return TRACE_SITES.some((t) =>
        t.topic === recipeId && state.traces.read.includes(t.id));
}

/** Everything read so far — for the morning report and the Skills tab. */
export function tracesRead(state: GameState): TraceSite[] {
    return TRACE_SITES.filter((t) => state.traces.read.includes(t.id));
}
