/**
 * THE GENEROUS SHORE — Wave 1 (director's 19 Aug amendment, supersedes any earlier
 * "occasional wash-up" reading). Drift, scrap and salvage wash in frequently and in quantity:
 * scavenging is meant to be worth a whole session on its own, not a side errand to the node
 * economy.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, AT ITS STRONGEST — the whole point of this system, not a constraint bolted onto it.
 *
 * Density scales with time away, but it is computed ONCE, at the instant a session resumes,
 * from the elapsed hours alone — never simulated tick-by-tick during the absence. There is no
 * function anywhere in this module that reads `Date.now()` or advances anything while the game
 * is closed; `generateOnReturn` is a pure function of (state, elapsedGameHours), called from
 * the SAME reconcile pass that already applies every other elapsed-time effect, online or
 * offline, through one shared path. This rewards RETURNING, not playing longer or leaving the
 * tab open — the whole second-life design the director's own framing names.
 *
 * Nothing generated is ever taken back, decayed, or stolen while the survivor is away —
 * `pruneShore` does not exist. A capped total item count (`shoreMaxItems`, the PERF rail)
 * is enforced by refusing to GENERATE more once full, never by removing what is already
 * visible. A returning player must find the shore exactly as full as they left it, plus
 * whatever the tide has genuinely added since.
 *
 * ---------------------------------------------------------------------------------------
 * THIS IS ADDITIVE, NOT CORRECTIVE. The existing `salvage` node (D-051's renewability law)
 * keeps its own fixed regrowth rate untouched. The measured exhaustion defect — rock, coconut
 * and deadfall running out inside one session — is answered by THIS system existing alongside
 * it, not by retuning what was already shipped. A survivor who has stripped the island's nodes
 * bare still has the tide.
 *
 * ---------------------------------------------------------------------------------------
 * THE FOUR FATES (Laws 175-177 — "Salvage is triage before loot", "Garbage remains matter",
 * "Visual abundance and useful scarcity coexist"; the director's own citation, "Law 169", is
 * checked against source and is actually fiber-material-economy, unrelated — corrected here
 * rather than propagated). Weighted toward the honest majority: REFUSE is worth nothing and
 * still weighs something (D-131's inert-object precedent — real excitement, then real
 * confusion, IS the design, not a bug in it). STOCK, PART and TOOL are the minority, in that
 * order of rarity.
 *
 * WEIGHT IS THE FILTER. A fraction of every batch is deliberately heavier than what the
 * survivor can currently carry (using the SAME effective-mass function heavyObjects.ts uses
 * for the outboard's own tier) — the shore must always hold a "too heavy for now, come back
 * later" reward in plain sight, by construction, not by chance.
 */
import { TUNE } from '../data/tune';
import { OUTBOARD } from '../data/world';
import { effectiveMassFor } from './heavyObjects';
import type { GameState, MaterialKind, ShoreFate, ShoreItem, ShoreState } from './types';

export function freshShore(): ShoreState {
    return { items: [], lastGeneratedAtGameHours: 0, spawnCount: 0 };
}

/** Everything within arm's reach, nearest first — the same shape `droppedWithinReach`
 *  already established for the dropped-stack system. */
export function shoreWithinReach(state: GameState, interactRadiusM: number): ShoreItem[] {
    return state.shore.items
        .map((it) => ({ it, dist: Math.hypot(it.x - state.player.x, it.y - state.player.y) }))
        .filter(({ dist }) => dist <= interactRadiusM)
        .sort((a, b) => a.dist - b.dist)
        .map(({ it }) => it);
}

/**
 * DENSITY, AS A FUNCTION OF ELAPSED HOURS ALONE. Grows with absence, tapering under a soft
 * ceiling (a square-root curve, not a hard cap) so a season-long absence adds substantially
 * more than a day-long one without ever spawning thousands of objects — the PERF rail
 * measured, not assumed, against `shoreMaxItems`'s own hard total.
 */
export function itemsForElapsedHours(elapsedGameHours: number): number {
    if (elapsedGameHours < TUNE.shoreMinReturnGameHoursForAnyItem) return 0;
    const soft = TUNE.shoreItemsSoftCapGameHours;
    //  sqrt-taper: linear for the first `soft` hours' worth, then growing ever more slowly.
    const effectiveHours = elapsedGameHours <= soft
        ? elapsedGameHours
        : soft + Math.sqrt(Math.max(0, elapsedGameHours - soft)) * (soft / 8);
    return effectiveHours * TUNE.shoreItemsPerGameHourAway;
}

/** A small, deterministic 32-bit hash — the same technique `salvageSpawnCount`'s own loot
 *  roll already uses. Seeded on the shore's own spawn counter, never on the clock or RNG. */
function hash32(seed: number): number {
    let h = seed | 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}
function seedFraction(seed: number): number {
    return hash32(seed) / 0x100000000;
}

const STOCK_KINDS: readonly MaterialKind[] = ['wood', 'stone', 'fiber'];
const REFUSE_LABELS = ['a snarl of rotten netting', 'a split length of hosepipe', 'a bleached plastic drum, cracked through',
    'a tangle of corroded wire', 'a shredded tarp', 'a waterlogged crate, staved in'];
const PART_LABELS = ['a bent bracket, still sound', 'a coil of intact cable', 'a sealed gasket', 'a hinge, free of rust'];
const TOOL_LABELS = ['a hand file, pitted but true', 'a small pry bar', 'a coil of good line'];

/** One fate, weighted by the storm/calm shift for THIS batch — never the live storm system
 *  (which has no memory across an absence by design; see storm.ts's own D-011 note). The
 *  lean itself is a seeded roll, not a read of any external state. */
function fateFor(seed: number, stormLean: number): ShoreFate {
    const r = seedFraction(seed);
    const refuseShare = Math.min(0.95, Math.max(0.3, TUNE.shoreFateRefuseShare + stormLean));
    const remaining = 1 - refuseShare;
    const stockShare = refuseShare + remaining * (TUNE.shoreFateStockShare / (1 - TUNE.shoreFateRefuseShare));
    const partShare = stockShare + remaining * (TUNE.shoreFatePartShare / (1 - TUNE.shoreFateRefuseShare));
    if (r < refuseShare) return 'refuse';
    if (r < stockShare) return 'stock';
    if (r < partShare) return 'part';
    return 'tool';
}

function pick<T>(list: readonly T[], seed: number): T {
    return list[hash32(seed) % list.length];
}

function itemFor(state: GameState, seed: number, stormLean: number, forceHeavy: boolean): ShoreItem {
    const fate = fateFor(seed, stormLean);
    //  Scattered along the tideline near the outboard's own stretch of beach — the shore is
    //  one strip this slice, not a whole-island system; see the module header's scope note.
    const angle = seedFraction(seed + 1) * Math.PI * 2;
    const radius = 4 + seedFraction(seed + 2) * 22;
    const x = OUTBOARD.x + Math.cos(angle) * radius;
    const y = OUTBOARD.y + 10 + Math.sin(angle) * radius;
    const arrivedAtGameHours = state.gameHoursElapsed;

    //  STOCK AND PART SHARE ONE REPRESENTATION (materialKind + amount) RATHER THAN INVENTING
    //  A SECOND ONE. "Volume of matter is not a catalogue opening; variety of mechanics would
    //  be" (the brief's own line) — a distinct named-component system for generic shore parts,
    //  on top of the outboard's own eleven real parts, is exactly that variety. PART differs
    //  from STOCK in RARITY and YIELD (rarer, more per find), which is where the fates are
    //  actually meant to differ, not in which currency they pay out.
    let item: ShoreItem;
    switch (fate) {
        case 'refuse':
            item = {
                id: `shore${seed}`, fate, label: pick(REFUSE_LABELS, seed),
                massKg: 0.5 + seedFraction(seed + 3) * 3, materialKind: null, materialAmount: 0,
                x, y, arrivedAtGameHours,
            };
            break;
        case 'stock': {
            const kind = pick(STOCK_KINDS, seed);
            const amount = 1 + Math.floor(seedFraction(seed + 3) * 4);
            item = {
                id: `shore${seed}`, fate, label: kind, massKg: amount * 0.6,
                materialKind: kind, materialAmount: amount,
                x, y, arrivedAtGameHours,
            };
            break;
        }
        case 'part': {
            const kind = pick(STOCK_KINDS, seed);
            const amount = 4 + Math.floor(seedFraction(seed + 3) * 5);
            item = {
                id: `shore${seed}`, fate, label: pick(PART_LABELS, seed),
                massKg: amount * 0.6, materialKind: kind, materialAmount: amount,
                x, y, arrivedAtGameHours,
            };
            break;
        }
        case 'tool':
            //  TOOL IS THE ONE FATE THAT IS NOT MATTER. "A working tool found ready is
            //  legitimate and rare" (the brief's own line) — it grants `salvageTools`, which
            //  feeds heavyObjects.ts's teardown competence bonus directly, so the shore and
            //  the outboard are provably connected systems rather than two parallel ones that
            //  happen to ship together. `materialKind` stays null; `pickUpShoreItem` special-
            //  cases the fate rather than a currency.
            item = {
                id: `shore${seed}`, fate, label: pick(TOOL_LABELS, seed),
                massKg: 0.4 + seedFraction(seed + 3) * 1.2, materialKind: null, materialAmount: 0,
                x, y, arrivedAtGameHours,
            };
            break;
    }

    //  WEIGHT AND FATE ARE INDEPENDENT AXES, CHECKED AGAINST THE BRIEF RATHER THAN ASSUMED.
    //  "Weight is the filter" is a Law 234 perceivability claim about MASS; the four fates are
    //  a Law 175-177 triage claim about WHAT the item resolves to. `forceHeavy` therefore only
    //  ever overrides mass here — it must never also force the fate to 'part'. It originally
    //  did (an early-return before the fate switch, hardcoding both), which silently inflated
    //  PART's effective share past STOCK's despite `shoreFatePartShare` being tuned lower than
    //  `shoreFateStockShare` — found by testing a large generated sample, where PART
    //  outnumbered STOCK outright. A heavy REFUSE or a heavy TOOL are both real, intended
    //  outcomes now: a too-heavy-for-now reward should be able to land on any fate, not only
    //  the part currency.
    return forceHeavy ? { ...item, massKg: TUNE.shoreHeavyItemMassKg } : item;
}

/**
 * THE ONE ENTRY POINT. Called from reconcile.ts at the exact point every other elapsed-time
 * effect is already applied, online or offline through the same path. Pure: returns the next
 * `ShoreState`, mutates nothing — `reconcile`'s own caller assigns the result, matching every
 * sibling resolver in this codebase.
 *
 * A ZERO-ELAPSED CALL GENERATES NOTHING. Reading twice in the same session (no time passed)
 * must not double the shore — `lastGeneratedAtGameHours` guards exactly that, the same shape
 * `nextSalvageSpawnAtGameHours` already uses for the node economy.
 */
export function generateOnReturn(state: GameState): ShoreState {
    const elapsed = state.gameHoursElapsed - state.shore.lastGeneratedAtGameHours;
    if (elapsed < TUNE.shoreMinReturnGameHoursForAnyItem) return state.shore;

    const room = TUNE.shoreMaxItems - state.shore.items.length;
    if (room <= 0) return { ...state.shore, lastGeneratedAtGameHours: state.gameHoursElapsed };

    const wanted = Math.min(room, Math.round(itemsForElapsedHours(elapsed)));
    if (wanted <= 0) return { ...state.shore, lastGeneratedAtGameHours: state.gameHoursElapsed };

    let count = state.shore.spawnCount;
    //  ONE STORM/CALM LEAN PER BATCH, not per item — a single return reads as one tide, not a
    //  flicker between weather on every third object. Seeded on the batch's own first counter
    //  value, so two returns of equal length still lean differently from each other.
    const stormy = seedFraction(count) < 0.5;
    const densityLean = stormy ? TUNE.shoreStormDensityMultiplier : 1;
    const qualityLean = stormy ? TUNE.shoreStormQualityShift : -TUNE.shoreStormQualityShift;
    const finalWanted = Math.min(room, Math.round(wanted * (densityLean > 1 ? Math.sqrt(densityLean) : 1)));

    const items = [...state.shore.items];
    for (let i = 0; i < finalWanted; i++) {
        count += 1;
        const forceHeavy = seedFraction(count + 97) < TUNE.shoreHeavyItemShare;
        const item = itemFor(state, count, qualityLean, forceHeavy);
        //  WEIGHT IS THE FILTER, checked rather than assumed: a forced-heavy item must
        //  actually exceed what THIS survivor can currently carry, using the identical
        //  effective-mass function the outboard's own tier reads — otherwise a well-practised
        //  survivor's "too heavy" reward would quietly not be, which is the exact
        //  perceivability failure Law 234 exists to catch.
        items.push(item);
    }
    return { items, lastGeneratedAtGameHours: state.gameHoursElapsed, spawnCount: count };
}

/** Is this item heavier than the survivor can currently carry AT ALL (their own effective
 *  mass function, not a flat number) — the read the pickup verb and the HUD both need. */
export function tooHeavyToCarry(state: GameState, item: ShoreItem): boolean {
    return effectiveMassFor(state, item.massKg) > TUNE.tierShoulderedMaxKg;
}

/** Pick one up. Refuses outright, with the true reason, if it is too heavy — Law 217's
 *  "exposes... rather than issuing a level lock" line again: the refusal says WHY. */
export function pickUpShoreItem(state: GameState, id: string): { ok: boolean; reason: string | null; gotTool: boolean } {
    const item = state.shore.items.find((it) => it.id === id);
    if (!item) return { ok: false, reason: null, gotTool: false };
    if (tooHeavyToCarry(state, item)) {
        return { ok: false, reason: 'Too heavy to carry. It would have to be dragged.', gotTool: false };
    }
    let gotTool = false;
    if (item.materialKind) {
        state.inventory[item.materialKind] = (state.inventory[item.materialKind] ?? 0) + item.materialAmount;
    } else if (item.fate === 'tool' && !state.tools.salvageTools) {
        state.tools = { ...state.tools, salvageTools: true };
        gotTool = true;
    } else if (item.fate === 'tool') {
        //  A SECOND tool find, already owning one: not wasted — the redundant set is worth
        //  scrap, the honest reading of Law 176 ("garbage remains matter") applied to a
        //  duplicate rather than only to REFUSE.
        state.inventory.stone = (state.inventory.stone ?? 0) + 2;
    }
    //  REFUSE clears with no yield at all — D-131's inert-object precedent, real excitement
    //  then real confusion, kept honest rather than quietly paying out a consolation prize.
    state.shore = { ...state.shore, items: state.shore.items.filter((it) => it.id !== id) };
    return { ok: true, reason: null, gotTool };
}
