/**
 * BRAIN — embodied inventory and access (v0_7 §9, D-063). Pure TypeScript, zero rendering.
 *
 * Six physical access zones, not an inventory grid:
 *
 *   activeHand   — the immediate primary action. One hand; a two-handed item occupies
 *                  support as well (`isTwoHanded`).
 *   supportHand  — the immediate secondary; unavailable while a two-handed item is held.
 *   belt         — direct quick slots, a LIMITED number of positions.
 *   pockets      — fast small-item access, gated on bulk (`pocketMaxBulk`).
 *   backpack     — general carried storage. This is the existing `Inventory`; §9's "lite"
 *                  scope does not re-model material stacks, it puts an access layer over
 *                  them.
 *   storage      — a deliberately opened container. Already `StorageState`; what this
 *                  chapter adds is that its contents are INSPECTABLE without hauling
 *                  everything out first (the C05 note this unparks).
 *
 * **Hotkeys are physical references, never queries.** A quick slot names a POSITION, and
 * the position holds a specific item. The law that follows from that, and the one most
 * worth testing: *if the item is consumed, moved, broken, dropped or stolen, the position
 * goes empty — it is never silently refilled from storage.* `syncLoadoutToOwnership` is
 * the single enforcement point, and it runs after every verb that can destroy a tool.
 *
 * **Load is mass + bulk + grip + access, not inventory Tetris.** Mass and the bands are
 * Ch.6's, untouched — §9 is explicit that this is "UI on top of that, not a new system".
 * Bulk is genuinely tracked and surfaced, and gates pocket eligibility; it deliberately
 * does NOT feed the bands.
 */

import { TUNE } from '../data/tune';
import { carriedWeightKg } from './body';
import type { GameState, LoadoutState, MaterialKind, ToolId } from './types';

/** The six zones, in the order §9 lists them (hand outwards to the world). */
export type AccessZone = 'activeHand' | 'supportHand' | 'belt' | 'pocket' | 'backpack' | 'storage';

export const ACCESS_ZONES: AccessZone[] = ['activeHand', 'supportHand', 'belt', 'pocket', 'backpack', 'storage'];

/** Every tool that can occupy a physical position. Materials live in the backpack as
 *  stacks; tools are the things you hold. */
//  P0-4 — THE SPEAR WAS MISSING FROM THIS LIST, and this list is the only thing that reaches
//  the pack readout and the equip path. `state.tools.spear` has existed since Drop 1 and kills
//  a boar with it, so the tool was real, owned and usable — and invisible, because `ownedTools`
//  filters TOOL_IDS and TOOL_IDS did not mention it. [[D-114]]'s defect class in its purest
//  form: the field exists, the verb exists, and the one line reaching them does not.
export const TOOL_IDS: ToolId[] = ['axe', 'spear', 'stoneHammer', 'torch', 'flask'];

/** The axe, the spear and the stone hammer are worked with both hands — holding any of them
 *  leaves the support hand unavailable, which is the whole reason `supportHand` is modelled at
 *  all. The spear joins them because a thrust is a two-handed act: Drop 1's own answer to a
 *  charge is a braced thrust, not a one-handed jab. */
export function isTwoHanded(tool: ToolId): boolean {
    return tool === 'axe' || tool === 'spear' || tool === 'stoneHammer';
}

export function toolBulk(tool: ToolId): number {
    return TUNE.toolBulk[tool];
}

/** A pocket takes small things only. The axe and hammer are deliberately too bulky; the
 *  flask and a knapped blade are deliberately not. */
export function fitsInPocket(tool: ToolId): boolean {
    return toolBulk(tool) <= TUNE.pocketMaxBulk;
}

/** Does the run actually own this tool right now? The single source of truth for whether
 *  a physical position may legally reference it. */
export function ownsTool(state: GameState, tool: ToolId): boolean {
    switch (tool) {
        case 'axe': return state.tools.axe;
        case 'spear': return state.tools.spear;
        case 'stoneHammer': return state.tools.stoneHammer;
        case 'flask': return state.tools.flask;
        //  The torch is the interesting one: it is CONSUMED, not merely put down. When it
        //  burns out `owned` goes false, and every position referencing it must empty.
        case 'torch': return state.torch.owned;
    }
}

export function ownedTools(state: GameState): ToolId[] {
    return TOOL_IDS.filter((t) => ownsTool(state, t));
}

// ---- Bulk ---------------------------------------------------------------

const BULK_KINDS = Object.keys(TUNE.materialBulk) as MaterialKind[];

/** Total carried bulk: every backpack stack at its per-unit bulk, plus every owned tool.
 *  Surfaced beside mass in the panel — §9's "contents plus mass/bulk visible". */
export function carriedBulk(state: GameState): number {
    let bulk = 0;
    for (const kind of BULK_KINDS) bulk += state.inventory[kind] * TUNE.materialBulk[kind];
    for (const tool of TOOL_IDS) if (ownsTool(state, tool)) bulk += toolBulk(tool);
    return bulk;
}

// ---- The loadout itself -------------------------------------------------

/** A fresh, empty loadout: nothing positioned. Every owned tool sits in general carry. */
export function freshLoadout(): LoadoutState {
    return {
        activeHand: null,
        supportHand: null,
        belt: new Array<ToolId | null>(TUNE.beltPositions).fill(null),
        pockets: new Array<ToolId | null>(TUNE.pocketPositions).fill(null)
    };
}

export function cloneLoadout(loadout: LoadoutState): LoadoutState {
    return {
        activeHand: loadout.activeHand,
        supportHand: loadout.supportHand,
        belt: [...loadout.belt],
        pockets: [...loadout.pockets]
    };
}

/** Every position currently holding this tool, across all physical zones. A tool is a
 *  single physical object, so it can only legally be in one — `clearTool` relies on this. */
function clearTool(loadout: LoadoutState, tool: ToolId): void {
    if (loadout.activeHand === tool) loadout.activeHand = null;
    if (loadout.supportHand === tool) loadout.supportHand = null;
    for (let i = 0; i < loadout.belt.length; i++) if (loadout.belt[i] === tool) loadout.belt[i] = null;
    for (let i = 0; i < loadout.pockets.length; i++) if (loadout.pockets[i] === tool) loadout.pockets[i] = null;
}

/**
 * THE LAW (§9, and the one most worth a regression): a position holds a specific physical
 * item, so when that item stops existing the position goes EMPTY. It is never silently
 * refilled from storage, and the game never quietly substitutes another item of the same
 * kind. Run after any verb that can destroy or consume a tool — the torch burning out in
 * `reconcile` is the live case today.
 *
 * Idempotent and cheap, so it is safe to call defensively.
 */
export function syncLoadoutToOwnership(state: GameState): void {
    for (const tool of TOOL_IDS) {
        if (!ownsTool(state, tool)) clearTool(state.loadout, tool);
    }
}

export type EquipResult =
    | { ok: true; displaced: ToolId | null }
    | { ok: false; reason: 'not-owned' | 'already-held' | 'two-handed' | 'other-hand-full' };

/**
 * Put a tool in the active hand — item 2's equip/switch, expressed as a zone operation
 * rather than a separate system. A two-handed tool empties the support hand as it goes in
 * (the displaced item is reported, never destroyed: it returns to the backpack, which is
 * where tools conceptually live when not positioned).
 */
export function equipToActiveHand(state: GameState, tool: ToolId): EquipResult {
    if (!ownsTool(state, tool)) return { ok: false, reason: 'not-owned' };
    if (state.loadout.activeHand === tool) return { ok: false, reason: 'already-held' };

    //  Taking it in hand vacates whatever position it occupied — one physical object.
    clearTool(state.loadout, tool);
    let displaced: ToolId | null = null;
    if (isTwoHanded(tool) && state.loadout.supportHand) {
        displaced = state.loadout.supportHand;
        state.loadout.supportHand = null;
    }
    state.loadout.activeHand = tool;
    return { ok: true, displaced };
}

/**
 * THE SUPPORT HAND — item 3's other half, and it reuses `equipToActiveHand`'s exact rules
 * rather than inventing a second set. Two refusals are specific to this hand and both are
 * physical facts rather than UI policy:
 *
 *   - a TWO-HANDED tool cannot go here at all, because it is already using both hands;
 *   - and it cannot go here while a two-handed tool is in the active hand, for the same
 *     reason from the other direction. `supportHand` is modelled precisely so that
 *     constraint is expressible instead of implied.
 */
export function equipToSupportHand(state: GameState, tool: ToolId): EquipResult {
    if (!ownsTool(state, tool)) return { ok: false, reason: 'not-owned' };
    if (state.loadout.supportHand === tool) return { ok: false, reason: 'already-held' };
    if (isTwoHanded(tool)) return { ok: false, reason: 'two-handed' };
    if (state.loadout.activeHand && isTwoHanded(state.loadout.activeHand)) {
        return { ok: false, reason: 'other-hand-full' };
    }
    clearTool(state.loadout, tool);
    state.loadout.supportHand = tool;
    return { ok: true, displaced: null };
}

/** Empty the support hand. Same contract as `stowActiveHand`. */
export function stowSupportHand(state: GameState): boolean {
    if (!state.loadout.supportHand) return false;
    state.loadout.supportHand = null;
    return true;
}

/** Empty the active hand. The tool is not destroyed — it goes back to general carry. */
export function stowActiveHand(state: GameState): boolean {
    if (!state.loadout.activeHand) return false;
    state.loadout.activeHand = null;
    return true;
}

export type AssignResult =
    | { ok: true }
    | { ok: false; reason: 'not-owned' | 'bad-position' | 'too-bulky' };

/**
 * Assign a tool to a belt or pocket position — §9's "hotkeys are physical references".
 * The binding is to the POSITION; what the position holds is this exact item.
 */
export function assignToBelt(state: GameState, position: number, tool: ToolId): AssignResult {
    if (!ownsTool(state, tool)) return { ok: false, reason: 'not-owned' };
    if (!Number.isInteger(position) || position < 0 || position >= state.loadout.belt.length) {
        return { ok: false, reason: 'bad-position' };
    }
    clearTool(state.loadout, tool);
    state.loadout.belt[position] = tool;
    return { ok: true };
}

export function assignToPocket(state: GameState, position: number, tool: ToolId): AssignResult {
    if (!ownsTool(state, tool)) return { ok: false, reason: 'not-owned' };
    if (!Number.isInteger(position) || position < 0 || position >= state.loadout.pockets.length) {
        return { ok: false, reason: 'bad-position' };
    }
    if (!fitsInPocket(tool)) return { ok: false, reason: 'too-bulky' };
    clearTool(state.loadout, tool);
    state.loadout.pockets[position] = tool;
    return { ok: true };
}

/** Draw whatever is at a belt position straight into the active hand — the quick-access
 *  verb the position exists for. Fails plainly if the position is empty, which it will be
 *  whenever the item that used to be there was consumed. */
export function drawFromBelt(state: GameState, position: number): EquipResult {
    const tool = state.loadout.belt[position];
    if (!tool) return { ok: false, reason: 'not-owned' };
    return equipToActiveHand(state, tool);
}

/** Where a tool physically is right now, or null if it is only in general carry. */
export function zoneOf(state: GameState, tool: ToolId): AccessZone | null {
    if (!ownsTool(state, tool)) return null;
    const l = state.loadout;
    if (l.activeHand === tool) return 'activeHand';
    if (l.supportHand === tool) return 'supportHand';
    if (l.belt.includes(tool)) return 'belt';
    if (l.pockets.includes(tool)) return 'pocket';
    return 'backpack';
}

// ---- What the panel shows ----------------------------------------------

export interface ZoneContents {
    zone: AccessZone;
    tools: ToolId[];
    /** Material stacks, for the zones that hold them (backpack and storage only). */
    materials: Array<{ kind: MaterialKind; count: number }>;
}

export interface LoadoutView {
    zones: ZoneContents[];
    massKg: number;
    bulk: number;
    /** True once `storage.built` — the panel can then inspect its contents in place,
     *  WITHOUT withdrawing them first. That is the C05 note this unparks. */
    storageOpen: boolean;
}

function materialsOf(counts: Partial<Record<MaterialKind, number>>): Array<{ kind: MaterialKind; count: number }> {
    return BULK_KINDS.filter((k) => (counts[k] ?? 0) > 0).map((k) => ({ kind: k, count: counts[k] as number }));
}

/**
 * Everything the panel needs, computed in the brain so the body only draws. Storage
 * contents are included whenever a crate is built — §9's inspectable-without-hauling
 * requirement — and are plainly separate from carried contents, never merged, so the
 * player can always tell what is on them from what is at home.
 */
export function loadoutView(state: GameState): LoadoutView {
    const l = state.loadout;
    const beltTools = l.belt.filter((t): t is ToolId => t !== null);
    const pocketTools = l.pockets.filter((t): t is ToolId => t !== null);
    const positioned = new Set<ToolId>([
        ...(l.activeHand ? [l.activeHand] : []),
        ...(l.supportHand ? [l.supportHand] : []),
        ...beltTools,
        ...pocketTools
    ]);
    //  The backpack holds every owned tool that is not in a more immediate position.
    const backpackTools = ownedTools(state).filter((t) => !positioned.has(t));

    return {
        zones: [
            { zone: 'activeHand', tools: l.activeHand ? [l.activeHand] : [], materials: [] },
            { zone: 'supportHand', tools: l.supportHand ? [l.supportHand] : [], materials: [] },
            { zone: 'belt', tools: beltTools, materials: [] },
            { zone: 'pocket', tools: pocketTools, materials: [] },
            { zone: 'backpack', tools: backpackTools, materials: materialsOf(state.inventory) },
            { zone: 'storage', tools: [], materials: state.storage.built ? materialsOf(state.storage.stored) : [] }
        ],
        massKg: carriedWeightKg(state),
        bulk: carriedBulk(state),
        storageOpen: state.storage.built
    };
}
