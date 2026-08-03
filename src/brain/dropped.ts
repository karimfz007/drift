/**
 * DROPPED ITEMS — putting something down, and the island tidying up after you.
 *
 * A survivor can now set materials down rather than carrying everything forever. Dropped
 * stacks persist for three game days and then weather away, which is inventory hygiene: it
 * stops the beach silently filling with a hundred abandoned piles nobody will ever collect.
 *
 * THE TIMER IS PER ITEM, and that is the whole of the design. Each stack carries its own
 * `droppedAtGameHours`, so picking one up and putting it down again resets THAT stack and
 * touches nothing else. A single global sweep would mean the pile you set down a minute ago
 * vanishes because of one you abandoned yesterday — which reads as the game eating your
 * things rather than as the world moving on.
 *
 * D-011, AND THE READING THAT MATTERS. The instruction is that despawn is hygiene and
 * "never an offline-harm vector", and the only way to guarantee that is for **the timer not
 * to run while the game is closed at all.** Absence never erases: storage contents survive,
 * structures survive, the journal survives. A dropped stack is the survivor's property by
 * exactly the same logic, and a player who sets something down and closes the app must find
 * it where they left it — a week later or a year later.
 *
 * So `pruneDropped` is called from the ONLINE tick only, and there is deliberately no
 * absence-path counterpart. That is the same structural shape the boars and the injuries
 * use: the guarantee holds because no code path exists that could break it, not because
 * something remembered to check.
 */
import { TUNE } from '../data/tune';
import type { DroppedItem, GameState, MaterialKind } from './types';

/** How much of one kind a single drop puts down. Everything carried, in one stack. */
export function dropAll(state: GameState, kind: MaterialKind): DroppedItem | null {
    const amount = state.inventory[kind] ?? 0;
    if (amount <= 0) return null;
    state.inventory[kind] = 0;
    const item: DroppedItem = {
        //  The counter is the id, the same "counter as seed" determinism `salvageSpawnCount`
        //  and `craftRollCount` already established — no clock read, no RNG.
        id: `drop${state.dropCount + 1}`,
        kind,
        amount,
        x: state.player.x,
        y: state.player.y,
        droppedAtGameHours: state.gameHoursElapsed,
    };
    state.dropCount += 1;
    state.dropped = [...state.dropped, item];
    return item;
}

/** Everything within arm's reach, nearest first. */
export function droppedWithinReach(state: GameState): DroppedItem[] {
    return state.dropped
        .map((d) => ({ d, dist: Math.hypot(d.x - state.player.x, d.y - state.player.y) }))
        .filter(({ dist }) => dist <= TUNE.interactRadiusM)
        .sort((a, b) => a.dist - b.dist)
        .map(({ d }) => d);
}

/**
 * PICK ONE BACK UP. The stack rejoins the inventory and its entry is gone — so dropping it
 * again mints a NEW entry with a NEW timestamp, which is what "resets its own timer" means
 * mechanically. There is no separate reset call to forget.
 */
export function pickUpDropped(state: GameState, id: string): boolean {
    const item = state.dropped.find((d) => d.id === id);
    if (!item) return false;
    state.inventory[item.kind] = (state.inventory[item.kind] ?? 0) + item.amount;
    state.dropped = state.dropped.filter((d) => d.id !== id);
    return true;
}

/** How long this stack has left, in game hours. Negative once it is due to go. */
export function gameHoursLeft(item: DroppedItem, nowGameHours: number): number {
    return TUNE.dropDespawnGameHours - (nowGameHours - item.droppedAtGameHours);
}

/**
 * SWEEP THE EXPIRED. ONLINE ONLY — see the module note. Each stack is judged against its own
 * timestamp, never a shared clock, so a fresh pile is never taken by an old one's expiry.
 */
export function pruneDropped(state: GameState): DroppedItem[] {
    const gone = state.dropped.filter((d) => gameHoursLeft(d, state.gameHoursElapsed) <= 0);
    if (gone.length > 0) {
        state.dropped = state.dropped.filter((d) => gameHoursLeft(d, state.gameHoursElapsed) > 0);
    }
    return gone;
}

/** One plain sentence for a stack the survivor is standing over. */
export function droppedNote(item: DroppedItem, nowGameHours: number): string {
    const left = gameHoursLeft(item, nowGameHours);
    const days = Math.max(0, left / TUNE.gameHoursPerDay);
    if (days < 1) return `${item.amount} ${item.kind} — will not last the day.`;
    return `${item.amount} ${item.kind} — ${Math.floor(days)} day(s) before it weathers away.`;
}
