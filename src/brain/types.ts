/**
 * BRAIN — data model. Pure TypeScript. Zero rendering engine (Ops v1.3 §5 law 1).
 */

/**
 * v1 — Cycles 01–02 (warmth, wood, fire).
 * v2 — Cycle 03: three vitals, death/respawn, expanded inventory, the first tool and
 *      loot, and two seed skills. Migration v1→v2 lives in save.ts.
 * v3 — Cycle 05: the 5th vital (energy), the wet condition, shelter, and storage.
 *      Migration v2→v3 lives in save.ts.
 * v4 — Cycle 05 PERFECT (D-051): the renewability law (nodes regrow; nothing is globally
 *      exhaustible), the stone quarry, and beach salvage spawns. Migration v3→v4 lives in
 *      save.ts and heals an existing save — every depleted node comes back at once ("while
 *      you were away, the island came back to life").
 * v5 — Living Island Track A FIX package (D-052): the torch (a new carried light source,
 *      FIX 5) and a per-death log on the trace (FIX 2). Migration v4→v5 lives in save.ts;
 *      a returning player simply hasn't crafted a torch yet, the same reasoning v2→v3 used
 *      for shelter/storage.
 * v6 — Ch.1 v3, buildable content (D-055): the sharp-blade intermediate (a new carried
 *      material, knapped from raw stone with the new stone hammer); the stone hammer
 *      itself (a new Tier-0 tool); a grade (crude/serviceable/refined/exceptional) on the
 *      axe/torch/shelter; and the null-outcome combination journal (Ch.1's knowledge
 *      layer). Migration v5→v6 lives in save.ts; a returning player simply hasn't knapped
 *      a blade or made a hammer yet, and every ALREADY-owned axe/torch/shelter heals in at
 *      the baseline `serviceable` grade — the honest "we don't know what grade it would
 *      have rolled" answer, never a retroactive upgrade or downgrade.
 * v7 — Ch.2, "The Knowledge Model" (MAJOR artifact, AUDITED-GO): a per-domain
 *      `KnowledgeState.domains` (Technique/Understanding/Adaptation, seven domains, every
 *      score starting at an innate floor). Brain-layer only — no new player-facing UI
 *      surface (Ch.4 owns the reveal). Migration v6→v7 lives in save.ts; a returning
 *      player's `nullPairs`/`events` carry over untouched, and every domain starts fresh
 *      at the innate floor — no retroactive Understanding credit for null pairs discovered
 *      before this chapter shipped, the same "we don't know what it would have been"
 *      honesty D-055's own grade migration already established.
 * v8 — Ch.6, "The Body Model" (D-058): `fatigue` (accrued on energy debt, shed by rest)
 *      and `resting` (true only while asleep, driving the new recovery rates that replaced
 *      C05's instant sleep-refill). The death log's entries additionally carry the
 *      cause-specific respawn message and what the death actually cost. Migration v7→v8
 *      lives in save.ts; a returning player wakes with zero fatigue and not resting — the
 *      honest "we have no record of how tired you were" answer, and the kind one.
 * v9 — Tree parity (D-059): 14 treeline positions promoted from decorative scenery to real
 *      harvestable `tree` nodes, bringing trees to the same real:decorative ratio rocks
 *      already had. Migration v8→v9 lives in save.ts and MERGES the new nodes into an
 *      existing save's node list — without it a returning player would keep their old
 *      five-tree island forever, since `hydrate` deliberately preserves a save's own nodes.
 *      The same "new content is merged in, nothing existing is disturbed" shape v3→v4 used
 *      for the quarry.
 * v10 — Embodied inventory + experimentation (v0_7 §9/§10.6, D-063): the six-zone
 *      `loadout` (hands/belt/pockets as physical positions), and `blueprints` +
 *      `experimentCount` for Try-Combining. Migration v9→v10 lives in save.ts; a returning
 *      player gets an empty loadout with nothing positioned and no plans yet — their tools
 *      are all still owned and simply sit in general carry, which is exactly where they
 *      effectively were before positions existed.
 * v23 — THE MARITIME SLICE: the raft (`raft`) and the crossing's one recorded fact
 *      (`wreck.reached`). A returning player has neither — no raft, and a wreck they have
 *      still only ever looked at. Merging in a raft nobody built would hand over the exact
 *      thing this slice exists to make someone earn, and marking the wreck reached would be
 *      the game telling a player they went somewhere they have never been.
 * v25 — THE FAR ISLAND (traces-first): `traces`, the ids of trace sites the survivor has
 *      read. Migrates in EMPTY — a returning player has not crossed 296 m of open water to
 *      read a stranger's note, and crediting them would hand over the one thing the far
 *      island exists to make someone go and find. The island and its sites themselves are
 *      terrain and content, stored nowhere, so they simply appear — the same split v21->v22
 *      drew for the cave and v23->v24 for the wreck.
 * v24 — THE WRECK SLICE: the four wreck-era materials (metal/wiring/glass/medicine), the
 *      hull's `instability`, and six `wreckpart` nodes. The materials migrate in at ZERO and
 *      the nodes MERGE — the same split v21->v22 drew for the cave: a stock is a fact about
 *      a body and we have no record of this one, while the wreck is a fact about the world
 *      and has been in that water since before the survivor washed ashore.
 * v34 — ITEM 3 (this batch): the stone hammer moves from `Tools.stoneHammer` (boolean) to
 *      `Inventory.stonehammer` (count) — a genuine combinable item, staged for knapping the
 *      same way any other material is, per the ruling that this "fully supersedes RULING 1's
 *      original visibility promise" (see the ledger entry). Migration v33->v34 lives in
 *      save.ts: `state.tools.stoneHammer === true` becomes `state.inventory.stonehammer = 1`,
 *      `false` becomes `0` — the fact does not change, only where it is recorded.
 * v35 — SESSION 1, BOUNDARY 3: `workspace`, the W0 mat upgraded in place to the W1 bench.
 *      Migrates in ABSENT — a returning survivor has not built one, because there was
 *      nothing to build. That is the same "you have not found this yet" default every tool
 *      migration in save.ts has used, and it is the honest one here for a second reason:
 *      the bench is what grants Law 220's third relation, and handing over a controlled
 *      relation nobody pegged together would be the migration inventing capability rather
 *      than declining to invent history.
 */
export const SCHEMA_VERSION = 35;

export type ControlMode = 'tap' | 'joystick';

/**
 * Every kind of resource node on the island. `driftwood`/`deadfall` are Cycle 01's;
 * most of the rest arrive with Cycle 03's bigger island. `quarry` (one, high-capacity,
 * repeat-minable) and `salvage` (randomly spawned beach finds) are D-051. What each
 * yields, and what gate it asks for, lives in state.ts — one place, keyed by kind.
 */
export type NodeKind =
    | 'driftwood'
    | 'deadfall'
    | 'tree'
    | 'rock'
    | 'berrybush'
    | 'coconutpalm'
    | 'reed'
    | 'shellfish'
    | 'crashbox'
    | 'quarry'
    /** DROP 2 — the bedrock bluff. Effectively inexhaustible, deliberately slow. */
    | 'boulder'
    | 'salvage'
    /**
     * THE WRECK SLICE — one workable part of the hull. Authored at fixed offsets from
     * `WRECK`, worked with the SAME gather verb as everything else on the island, and
     * shifting back into reach as the sea moves the wreckage (v0_10's Zone U0: *"the
     * boundary where waves, tide and wreckage repeatedly move"*).
     */
    | 'wreckpart'
    /**
     * THE UNDERWATER SLICE — one submerged salvage point. Worked with the SAME gather verb as
     * everything else, in the one place where the survivor cannot breathe while doing it.
     */
    | 'divepart'
    /**
     * FISHING — a patch of water that holds fish. NOT a thing you pick up: it is a PLACE
     * with a population, worked by three different verbs, and the node model is used for it
     * because the node model is already exactly the two-state population this needs —
     * `available` (present) plus `depletedAtGameHours` and `pool`, which is the same
     * machinery the quarry's finite seam and every regrowing bush already run on.
     */
    | 'fishingspot';

/** What a beach salvage find turns out to hold, rolled once at spawn (D-051). */
export type SalvageLoot = 'driftwood' | 'cordage' | 'stone' | 'bundle';

/** A gatherable node, as placed by the authored island (src/data/world.ts) or spawned. */
export interface WoodNode {
    id: string;
    kind: NodeKind;
    x: number;
    y: number;
    /** False once consumed (or, for the quarry, once its pool hits 0). The renewability
     *  law (D-051) means this is temporary for every kind except `crashbox` — a one-time
     *  story beat, not a resource — which is exempt and never regrows. */
    available: boolean;
    /** Game-hours timestamp this node was last depleted; null while available (or never
     *  yet depleted). Drives regrowth — elapsed time since this, checked against the
     *  kind's regrow duration (D-051, `regrowGameHoursFor` in state.ts). */
    depletedAtGameHours: number | null;
    /** Remaining stone in a repeat-minable quarry. Undefined for every other kind — those
     *  stay single-shot (one gather, then regrow from scratch). */
    pool?: number;
    /** Which reward a `salvage` find holds, rolled once at spawn. Undefined for every
     *  other kind. */
    salvageLoot?: SalvageLoot;
}

export interface FireState {
    built: boolean;
    /** Wood units remaining. Fractional as it burns. Lit means built && fuel > 0. */
    fuel: number;
    x: number;
    y: number;
}

export interface PlayerState {
    x: number;
    y: number;
}

/**
 * What the castaway is carrying. Counts, all of them — the minimal inventory the spec
 * asks for. `wood` is Cycle 01's; berries/coconut/shellfish are Cycle 03's; `sharpblade`
 * is Ch.1 v3 (D-055) — a refined material, knapped from raw stone, not gathered directly.
 */
export interface Inventory {
    wood: number;
    stone: number;
    fiber: number;
    berries: number;
    coconut: number;
    shellfish: number;
    /** FISHING — one fish. Perishable (see `freshUntil`) and structurally inert. */
    fish: number;
    sharpblade: number;
    /** DROP 1 — raw meat from a killed boar. Spoils fast; cooking is the NEXT discovery. */
    meat: number;

    /**
     * THE COCONUT SHELL — what is LEFT when a coconut is drunk.
     *
     * A coconut was consumed whole: `eat` decremented the stack and nothing came back, so the
     * husk a survivor is plainly holding simply stopped existing. `vessel.ts` has described a
     * "coconut-shell cup" since the water slice, which is the game already saying out loud
     * that the shell is a thing; this is the thing.
     *
     * Structurally inert on purpose — it is a by-product, not a new economy. It weighs almost
     * nothing, it perishes never, and what it is FOR is left to whoever wants it next.
     */
    shell: number;

    //  ---- THE WRECK-ERA FAMILY (the Wreck Slice) --------------------------------------
    //
    //  The codex has named these since Cycle 01 — *"Metal parts (plane / ship salvage) ...
    //  Salvage payoff — the crash gives back"* — and nothing on the island could produce
    //  them, because the only place they exist is 115 m offshore. They are the answer to
    //  "why did I build the raft".
    //
    //  They are NOT survival-critical, deliberately: you can live a full life on this island
    //  without one gram of metal. That is what lets the wreck be finite-per-visit without
    //  touching the renewability law ([[D-051]]), whose subject is the survival FLOOR.

    /** Hull plate, fasteners, structural members. Heavy; an edge without knapping. */
    metal: number;
    /** Salt-stiff cable and loom. Lashing that does not rot. */
    wiring: number;
    /** Port glass and instrument faces. Cuts, and is the only transparent thing here. */
    glass: number;
    /** A sealed medical store. The one thing out there that answers a shipped problem. */
    medicine: number;

    /**
     * THE STONE HAMMER, MIGRATED HERE FROM `Tools` (v34, item 3 of this batch). It was a
     * `boolean` there — "made or not" — which was true and incomplete: made-or-not is a
     * fact about EVERY tool, but the hammer is also the one tool that is another recipe's
     * INGREDIENT (knapping). `Tools` has nowhere to stage a thing; `Inventory` already does,
     * for exactly this reason — every combine already reads reach from here, unchanged.
     *
     * A COUNT THAT NEVER MOVES PAST 1 in practice (you cannot craft a second while holding
     * one — `canCraftStoneHammer` still refuses), but a count and not a boolean, because
     * `MaterialKind = keyof Inventory` and only a counted field can sit in that union and be
     * staged as a real combine chip. NEVER SPENT ON COMBINE: `spendFromReach` (experiment.ts)
     * carries the one explicit exception — a catalyst is used, not used UP, the same fact
     * [[D-172]] already stated for the old boolean ("the hammer is the tool, and it was
     * never consumed") and this migration must not quietly break.
     */
    stonehammer: number;
}

/** Every kind of carried material — the key set `Inventory` actually holds. Ch.1 v3's
 *  material-family/tag schema (`src/brain/materials.ts`) is keyed by this. */
export type MaterialKind = keyof Inventory;

/**
 * Grade (Ch.1 v3, D-055): four tiers, rolled once at craft time via a seeded hash — the
 * same determinism technique `deadfallYield`/`spawnSalvageNode` already use, not a fresh
 * mechanic. Exactly ONE functional stat moves per item type with grade (never more): the
 * axe's fell speed, the torch's burn duration, the shelter's warmth bonus. Cosmetic too —
 * a small mesh-level tell per grade, the same pattern as the harvest blaze-mark/depletion-
 * stump system (grade is drawn, not just stated).
 */
export type ItemGrade = 'crude' | 'serviceable' | 'refined' | 'exceptional';

/** Tools and carried gear. Booleans in v1; each is a made-or-found milestone. */
export interface Tools {
    /** The crude axe: fells trees, opens the crash box. */
    axe: boolean;
    /** DROP 1 — the spear. The only made thing that answers a boar. */
    spear: boolean;
    /**
     * The backpack. Until it is MADE, the survivor carries what their arms and pockets can
     * take — `backpackLoadPenaltyKg` is subtracted from both load-band thresholds, so an
     * unequipped castaway hits Working and Heavy sooner. Crafting it restores full capacity.
     *
     * Existing saves migrate in at `true`: a survivor mid-run has been carrying things all
     * along, and retroactively stranding them under a new gate would be the same insult as
     * injuring them for loading their own save.
     */
    backpack: boolean;
    /** The water flask: found in the crash box; carries drinks inland. */
    flask: boolean;
    /** Drinks currently in the flask (0..flaskCapacitySips). */
    flaskSips: number;
    //  THE STONE HAMMER LEFT (v34, item 3) — `Inventory.stonehammer` now, a genuine
    //  combinable count rather than a boolean here, because knapping needed it staged
    //  alongside stone the same way any other recipe's materials are, "same interaction as
    //  any other combine" per the ruling. See `Inventory.stonehammer`'s own doc for why.
    /** Rolled once at craft time (Ch.1 v3, D-055); scales fell speed only. */
    axeGrade: ItemGrade;
    /** A line to fish with (Slice 2). A CAPABILITY, not a consumable — it is what makes the
     *  pond's circle divide a third time. D-086's six-state ladder will later replace this
     *  boolean with a position on that ladder; it is a boolean now because the ladder does
     *  not exist yet and pretending otherwise would be inventing the spec. */
    fishingLine: boolean;
    /**
     * FISHING — a made net. A CAPABILITY like the line and the spear, and like them a
     * boolean rather than a count: you own a net or you do not, and setting it puts it in
     * the world rather than spending it. Where the net currently IS lives in
     * `FishingState.net`, because a set net is a fact about the island, not about the body.
     */
    net: boolean;
    /** WAVE 1 — a real tool set, found on the shore rather than made (a TOOL-fate item, the
     *  rarest of the four — Laws 175-177). Feeds `heavyObjects.ts`'s teardown competence
     *  bonus the same way a workspace does: Law 217's "adequate tools" made a concrete,
     *  ownable fact rather than an abstract modifier. */
    salvageTools: boolean;
}

/**
 * The torch (Living Island Track A, FIX 5): a carried, consumable light source — the
 * inverse of the fixed structures below. `owned` is true from the moment it is crafted
 * (unlit) until its fuel burns out (consumed, not just "off"); `lit` only ever becomes
 * true at an active fire. Burn-down is handled in reconcile.ts, the same closed-form
 * treatment as structure durability decay — nothing else's rate depends on exactly when
 * it crosses zero.
 */
export interface TorchState {
    /** True once crafted; false again once fully burned down. A fresh torch must be
     *  crafted to replace a spent one — there is no "refuel". */
    owned: boolean;
    /** True while lit. Never true unless `owned`; extinguishes itself at 0 fuel. */
    lit: boolean;
    /** Game hours of burn remaining. Only ticks down while `lit`; set to
     *  `torchBurnGameHoursFor(grade)` on craft. */
    fuelGameHoursRemaining: number;
    /** Rolled once at craft time (Ch.1 v3, D-055); scales burn duration only. */
    grade: ItemGrade;
}

/**
 * A placed structure (Cycle 05): the shelter or the storage crate. Both share the same
 * shape — a location and a durability that decays over game hours and pauses the
 * structure's bonus at 0 until repaired. Nothing is ever destroyed (charter honest-systems
 * law) — disrepair, never deletion.
 */
export interface Structure {
    built: boolean;
    x: number;
    y: number;
    /** 0–100. At 0 the structure's bonus pauses until repaired; never deleted. */
    durability: number;
}

/**
 * THE WORKSPACE LADDER (SESSION 1, closing BOUNDARY 3) — §6.1's W0-W6 states, of which two
 * are built: the mat (W0) and the bench (W1).
 *
 * ONE STRUCTURE WITH A TIER, not two structures, and the distinction is load-bearing. §6.1
 * puts `mat` and `bench` in the same W0-W6 table as rungs of one ladder, and v2.6's own
 * capability chain reads `field work mat/support -> bench with clamps/vice` as one line. So
 * the bench is the mat, improved IN PLACE — the same shape [[D-165]] ruled for the shelter
 * ("improvements make THIS shelter better rather than replacing it with a differently-named
 * tier"). Siting happens once, at the mat; the bench never asks where it goes, because it
 * goes where the work already is.
 */
export type WorkspaceTier = 'mat' | 'bench';

export interface WorkspaceState {
    built: boolean;
    x: number;
    y: number;
    tier: WorkspaceTier;
    /**
     * 0..1. Joint slack, and it is NOT a durability meter — this is the one field in this
     * file that deliberately does not follow `Structure`'s shape, because Law 181
     * ("Maintenance follows evidence") forbids exactly that: *"Inspection, cleaning,
     * tightening... respond to causal condition — **not a universal repair meter**."*
     *
     * So slack accrues per BENCH-ASSISTED COMBINE — evidence of work actually done — and
     * never per game-hour. A bench nobody has worked at is as tight as the day it was
     * pegged, however long the survivor has been away, which also makes this [[D-011]]-safe
     * BY CONSTRUCTION rather than by a check: absence performs no combines, so there is no
     * code path by which time alone can rack a bench.
     *
     * At 1 the joints have racked (W1's own named failure mode, `rack / overturn`) and the
     * third relation is gone until the joints are re-tensioned. The bench is never deleted —
     * disrepair, never deletion, the same honest-systems law every other structure holds to.
     */
    jointWear: number;
}

/** The shelter specifically — the one structure with a grade (Ch.1 v3, D-055): its
 *  warmth bonus, and only its warmth bonus, scales with it. Storage has no grade — the
 *  spec names exactly one stat per item TYPE, and storage has none listed. */
/**
 * ENTROPY & MAINTENANCE (v0.11 §8) — wear at each named place, 0..1.
 *
 * A NUMBER PER PLACE, never a number for the building. The stored fractions are the mechanism
 * and are deliberately never shown: every reader goes through `stageOf`, which turns one into
 * a NAMED STAGE, and it is the stage that reaches a player. See `upkeep.ts` for why the
 * dossier rejects the single bar this sits beside.
 */
export interface ShelterDefects {
    /** The windward cross-brace. Works loose over nights; the wind gets in. */
    lashing: number;
    /** The roof covering. Thins with weathering; the cold gets in. */
    thatch: number;
    /** Where the frame meets the ground. Rots on a damp SITE, and takes both with it. */
    footing: number;
}

export interface ShelterState extends Structure {
    /**
     * The three named places this lean-to fails, and how far gone each is.
     *
     * This does NOT replace `durability` — the C05/[[D-098]] disrepair-never-deletion model
     * stands exactly as it was, and its own tests still pass unchanged. It sits alongside it,
     * answering a question the bar never could: not "how bad is the shelter" but "WHERE is it
     * compromised", which is Shelter Law 4 and the only shape the pressure-transfer ledger
     * (v0.14 L3) could ever hang an entry on.
     */
    defects: ShelterDefects;
    /** Rolled once at build time; scales the warmth-drain-reduction bonus only. */
    grade: ItemGrade;
}

/** The storage crate's contents — raw materials only, a second pool from personal carry. */
export interface StorageInventory {
    wood: number;
    stone: number;
    fiber: number;
}

export interface StorageState extends Structure {
    stored: StorageInventory;
}

/** One skill in the Development Tree seed. Levels through meaningful use (§I.9). */
export interface Skill {
    level: number;
    /** XP accumulated toward the NEXT level. */
    xp: number;
}

export interface Skills {
    woodcutting: Skill;
    foraging: Skill;
}

export interface Settings {
    controlMode: ControlMode;
}

/** Local-only playtest trace (Ops: no external service; localStorage/debug only). */
export interface TraceState {
    msToFirstMove: number | null;
    msToFirstWood: number | null;
    msToFireLit: number | null;
    /** C03 milestones. */
    msToFirstDrink: number | null;
    msToFirstCraft: number | null;
    failedInteractionTaps: number;
    /**
     * Taps that resolved to bare ground — P0-1, and the number whose absence cost three
     * sessions. `failedInteractionTaps` counts only `explain()` calls, so it sees a refusal
     * that spoke and is blind to a tap that did nothing at all. The Director's log opened with
     * EIGHT consecutive bare-ground taps and the counter read zero for every one of them, which
     * is how "a new player's first eight interactions fail" stayed invisible in telemetry that
     * was working exactly as written. Counted separately because it is a different fact: a
     * never-mind gesture is legal, and eight in a row before anything lands is not.
     */
    groundTaps: number;
    /**
     * How many crates the survivor has broken open. Exists for one reason: the FIRST one always
     * holds a backpack, and "first" is a fact about a life, not about a crate.
     */
    cratesOpened: number;
    /**
     * Did the survivor ever USE the last two drops? C1 asked whether the Director found D-148's
     * bandage verb and drank boiled water, and the answer was unknowable: nothing in `vessel.ts`
     * or `injury.ts` touched the trace, the debug export dumps only this object, and a DOM button
     * press never reaches `recordTap` — so a shipped verb could go completely unused and look
     * identical to one that worked. Two counters, so the question is answerable next time
     * instead of argued about. Silence about a feature is not evidence that it works.
     */
    woundsBound: number;
    sipsBoiled: number;
    controlModeSwitches: number;
    steelThreadComplete: boolean;
    /** How many times the castaway has died and washed back ashore. */
    deaths: number;
    /** Real ms of active (foreground) play since the run started. */
    activeMs: number;
    /** Every death this run, cause and the game-clock moment it happened (FIX 2) — surfaced
     *  in the debug export (D-050's tool) so a death-loop report is diagnosable without
     *  relying on the player's memory of what killed them and when. Unbounded; a run's
     *  death count is never so large this matters for storage.
     *
     *  Ch.6 (D-058) extends each entry with the cause-specific respawn message the player
     *  was actually shown, and `lost` — exactly which carried resources the death cost,
     *  so "what did that death take from me" is answerable from the record rather than
     *  from memory. Both are optional: entries written before v8 have neither. */
    deathLog: Array<{
        cause: string;
        gameHoursElapsed: number;
        message?: string;
        lost?: Partial<Record<MaterialKind, number>>;
    }>;
}

/**
 * A knowledge event — Ch.1's null-outcome journal recording that trying is itself
 * knowledge (D-055). Ch.2 (knowledge/experimenting) does not exist yet in this codebase;
 * this is the stub hook for it — recorded, unwired beyond that, ready for Ch.2 to read.
 */
import type { CapacityScores } from './capacities';
import type { ConfidenceState } from './confidence';
import type { MatterWear } from './matter';

export interface KnowledgeEvent {
    kind: 'combination-tried';
    /** Plain-language detail — e.g. "wood does not satisfy the axe's blade slot." */
    detail: string;
    gameHoursElapsed: number;
}

/**
 * Ch.2, "The Knowledge Model" (v7): the seven domains a unit's knowledge is tracked across.
 * Most will sit untouched for a long time — Mechanical systems, Electrical & radio, and
 * Navigation & seamanship have no producer anywhere in this codebase yet, and that is
 * correct, not a gap (src/brain/knowledge.ts).
 */
export type KnowledgeDomain =
    | 'survivalcraft'
    | 'foragingMedicine'
    | 'harvestingFabrication'
    | 'construction'
    | 'mechanicalSystems'
    | 'electricalRadio'
    | 'navigationSeamanship';

/**
 * One domain's three scores (Ch.2, v7). All start at `TUNE.knowledgeInnateFloor`, never
 * zero — see `freshDomainScore` in knowledge.ts. `adaptation` has no producer this pass
 * (C1 amendment A) — it stays at the innate floor for every domain until a later pass
 * feeds it; see knowledge.ts's own doc comment for exactly what that producer would do.
 */
export interface DomainScore {
    technique: number;
    understanding: number;
    adaptation: number;
}

/**
 * The null-outcome combination journal (Ch.1 v3, D-055): every (recipe slot, material
 * kind) pair tried and found NOT to combine, so it is never re-evaluated. Encoded as
 * `${slotId}|${materialKind}` strings — a Set expressed as a JSON-safe array, the same
 * plain-array convention `trace.deathLog` already uses for small, append-only history.
 */
export interface KnowledgeState {
    nullPairs: string[];
    /** Unbounded, matching `trace.deathLog`'s own precedent — tiny data, a knowledge
     *  event only fires once per pair ever, never per frame. */
    events: KnowledgeEvent[];
    /** Ch.2 (v7): one score per domain. Never reduced by `reconcile` — offline absence may
     *  cost warmth or hunger; it can never cost what the unit has learned (C1 amendment B,
     *  property-tested in tests/vitals.test.ts alongside the offline-death-impossible law). */
    domains: Record<KnowledgeDomain, DomainScore>;
}

/**
 * The six physical access zones' state (v0_7 §9, D-063). Hands, belt and pockets hold
 * SPECIFIC items by position — a quick slot names a position, and the position holds a
 * thing. When that thing is consumed the position goes empty and is never silently
 * refilled (enforced by `syncLoadoutToOwnership` in loadout.ts). The backpack is
 * `GameState.inventory` and nearby storage is `GameState.storage`; neither is duplicated
 * here, because §9's scope is an access layer over them, not a replacement.
 */
export interface LoadoutState {
    activeHand: ToolId | null;
    supportHand: ToolId | null;
    belt: Array<ToolId | null>;
    pockets: Array<ToolId | null>;
}

/** Every tool that can occupy a physical access position (v0_7 §9, D-063). */
export type ToolId = 'axe' | 'spear' | 'stoneHammer' | 'torch' | 'flask';

/**
 * A Blueprint (v0_7 §10.5/§10.6, D-063): the NAMED PLAN a successful prototype becomes.
 * Physical by design — §10.5 says plans are "copyable, versioned, teachable, tradable,
 * stealable, corruptible, comparable against field evidence". This slice ships the object
 * and its authorship/versioning so those later verbs have something real to act on; the
 * social half (teaching, trading, theft) is Ch.8's and is deliberately not built here.
 *
 * §10.6's rule that a plan reproduces "the relationships, not the original quality for
 * free" is why `workmanship` is recorded but never re-applied on reproduction.
 */
export interface Blueprint {
    id: string;
    /** The named plan, e.g. "Knapped blade, hafted". */
    name: string;
    /** The recipe id in the Ch.1 tree this plan realises — plans never invent new recipes. */
    recipeId: string;
    /** What it was made of, as discovered. */
    inputs: MaterialKind[];
    /** Bumped when the same plan is re-derived with a better result — §10.5's versioning. */
    version: number;
    /** The grade the original prototype came out at. Recorded as evidence, NOT granted to
     *  anyone who later works from the plan (§10.6). */
    workmanship: ItemGrade;
    /** Who made it. Single-run today; the field exists so authorship survives into Ch.8. */
    author: string;
    discoveredAtGameHours: number;
}

/**
 * The whole run. Everything the game needs to be reconstructed from a cold start.
 * Serialised verbatim into the save (see save.ts).
 */
export interface GameState {
    schemaVersion: number;
    startedAtMs: number;
    lastSeenMs: number;
    gameHoursElapsed: number;

    // Vitals.
    warmth: number;
    thirst: number;
    hunger: number;
    health: number;
    /** The 5th vital (Cycle 05): a slow, full-day rhythm. A soft debuff only — never a
     *  death vector this cycle (see the C05 spec's SCOPE OUT). Restored by sleeping. */
    energy: number;
    /** Not a vital: a 0–100 condition, not part of the health-drain path. Rises in the
     *  pond, decays on dry land (faster within the shelter's radius), and raises warmth's
     *  drain rate while high — the reason a roof matters even with a fire already lit. */
    wet: number;
    /**
     * Ch.6 (D-058): 0–`fatigueMax`. Accrues while ONLINE and in energy debt; shed by rest.
     * **Never accrues offline, ever** — absence may cost warmth or hunger, but it may never
     * make the body worse, the same law Ch.2's amendment B set for knowledge. Deliberately
     * NOT part of the health-drain path: fatigue is a perceivable soft state (three stages,
     * `fatigueStage` in body.ts), never a death vector, which is what keeps the
     * offline-death-impossible law (D-011) structurally intact with it added.
     */
    fatigue: number;
    /**
     * Ch.6 (D-058): true only while actually asleep in a bed. Drives the accelerated
     * energy/warmth recovery rates and fatigue shedding in `reconcile`, and is cleared the
     * moment the sleep span ends — this is a transient of the sleep action, never a mode
     * the player is left sitting in. Replaces C05's instant sleep-refill: recovery is now a
     * RATE over elapsed time, so a sleep from empty genuinely may not reach full.
     */
    resting: boolean;

    inventory: Inventory;
    tools: Tools;
    skills: Skills;

    fire: FireState;
    /** The lean-to (Cycle 05): warmth-drain relief and faster drying in its radius; once
     *  built, it is also where death and absence respawn the castaway (D-042/C05 §2). */
    shelter: ShelterState;
    /** The storage crate (Cycle 05): a second pool for raw materials only. */
    storage: StorageState;
    /** The work surface (SESSION 1): W0's mat, upgraded in place to W1's bench. The bench is
     *  what holds what a second hand cannot — Law 220's third controlled relation. */
    workspace: WorkspaceState;
    /** The carried torch (Living Island Track A, FIX 5). */
    torch: TorchState;
    player: PlayerState;
    nodes: WoodNode[];
    /** How many salvage nodes have ever been spawned — the id/seed counter (D-051). Also
     *  doubles as the deterministic seed for each spawn's position and loot roll, keeping
     *  reconcile pure (no clock or RNG reads — same law as `deadfallYield`'s id hash). */
    salvageSpawnCount: number;
    /** The game-hours clock value the next salvage spawn is due. Reconcile advances this
     *  the same way it advances everything else — by math over elapsed time, identically
     *  online and offline (D-051). */
    nextSalvageSpawnAtGameHours: number;
    /** How many crafts (of any kind) have ever rolled a grade — the seed counter for each
     *  roll (Ch.1 v3, D-055), the same "counter as seed" determinism `salvageSpawnCount`
     *  already established, kept pure (no clock or RNG reads). */
    craftRollCount: number;
    /** Ch.1's knowledge layer, v3 (D-055): the null-outcome combination journal. */
    knowledge: KnowledgeState;
    /**
     * §12's eight long-term capacities (v13). The body's own record of work done. Separate
     * from `knowledge` because they are different things that fail differently, and separate
     * from the six indicators because no bar shows them.
     */
    capacities: CapacityScores;
    /**
     * The confidence / recency layer (v13). Timing and confidence, NEVER knowledge — see
     * `confidence.ts` for the boundary and the property test that enforces it. Stores only
     * WHEN each technique was last practised; the confidence value itself is derived on
     * every read, so there is no second source of truth to drift from the clock.
     */
    confidence: ConfidenceState;
    /**
     * Law 128 (v14): accumulated wear per material kind, put there by failed attempts. Matter
     * comes out of a failure CHANGED — and a unit is only ever lost after wear the player was
     * told about, never to a hidden roll.
     */
    matterWear: MatterWear;
    /** The six physical access zones (v0_7 §9, D-063). Hands/belt/pockets hold specific
     *  items by position; the backpack is `inventory` and nearby storage is `storage`. */
    loadout: LoadoutState;
    /** Named plans minted by successful experiments (v0_7 §10.6, D-063). */
    blueprints: Blueprint[];
    /** How many experiments have ever been attempted — the id/seed counter for minted
     *  blueprints, the same "counter as seed" determinism `craftRollCount` established. */
    experimentCount: number;
    settings: Settings;
    trace: TraceState;

    /**
     * The cause of the most recent death, for the death overlay ("You died of thirst").
     * Null until the first death; set the instant a death is actioned, cleared when the
     * player acknowledges it. Not part of the survival sim — a message, not a state.
     */
    lastDeathCause: string | null;

    /**
     * SLICE 3 — the castaway cycle. Everyone who has died on this island, oldest first. This
     * is a property of the PLACE, not a save slot: it survives every death, and it is the
     * only thing a dead survivor leaves behind that a successor can be certain of.
     *
     * Recorded as HISTORY and never read back as knowledge — see `succession.ts` for the
     * matter-not-memory line ([[D-069]]) and the property test that enforces it.
     */
    memorial: SurvivorRecord[];
    /**
     * The island-clock reading when the CURRENT survivor washed ashore. Zero for the first.
     * Every "how long have I lasted" question is this subtracted from `gameHoursElapsed` —
     * the world clock never resets, so a successor's age has to be measured, not stored.
     */
    survivorStartedAtGameHours: number;
    /**
     * THE SURVIVOR'S JOURNAL ([[D-068]]) — the one channel by which anything a survivor
     * knew can outlive them, and only because they spent real time and real light writing
     * it down. Absent until one is made. The carrier is mortal.
     */
    journal: JournalState;
    /**
     * DROP 1 — the island's first predator. A FIXED population of individuals, created once
     * at world birth and never added to; there is deliberately no spawner. Persists through
     * death like everything else physical: the boars were here before you and stay after.
     */
    boars: Boar[];
    /**
     * DROP 1 — the island-clock reading after which raw meat is spoiled. Null when carrying
     * none. Raw meat is an EVENT, not a stockpile: it goes off before it can solve hunger,
     * which is precisely what makes cooking — the NEXT discovery, deliberately not built in
     * this drop — worth wanting.
     */
    /**
     * RETIRED, and kept as a comment rather than deleted silently. This was
     * `meatFreshUntilGameHours: number | null` — one field for one perishable, compared
     * against `gameHoursElapsed`. `freshUntil` above replaces it for meat AND fish at once;
     * the v26 -> v27 migration carries a live meat clock across rather than dropping it.
     */
    /**
     * DROP 2 — what a connected charge leaves behind. `bleeding` is a severity that costs
     * health per game hour until bound or clotted; `limp` and `pain` are game-hour timers.
     * All three clot to zero the moment a span counts as an absence ([[D-011]]).
     */
    injuries: InjuryState;
    /** DROP 3, the Medicine Slice. Caused, never rolled; held on absence, never worsened. */
    illness: IllnessState;
    /**
     * THE FAR ISLAND — which traces this survivor has read. Ids only; the sites themselves are
     * authored content in `world.ts`, not save state.
     *
     * A fact about the PERSON, not the place: a successor arrives having read nothing, and has
     * to cross and look for themselves. That is the same line `wreck.reached` draws from the
     * other side — the island remembers that someone got there, and nobody inherits what they
     * understood when they did.
     */
    traces: TracesState;
    /**
     * THE CAVE (Drop 3 Part 2 item 2) — a refuge made of terrain rather than materials.
     *
     * `found` is knowledge, `sheltering` is position, and they are separate because a survivor
     * who knows where the cave is has something even when they are nowhere near it: somewhere
     * to run to. Collapsing them into one flag would lose that.
     */
    cave: { found: boolean; x: number; y: number; sheltering: boolean };
    /**
     * Item 2 — stacks the survivor has set down. Each carries its OWN drop timestamp, so
     * picking one up and dropping it again resets that stack alone. The timer runs on the
     * ONLINE tick only: absence never erases, and a dropped stack is property like anything
     * else in the store box.
     */
    dropped: DroppedItem[];
    /** The id counter for drops — "counter as seed", no clock read and no RNG. */
    dropCount: number;
    /**
     * THE RAFT (the Maritime Slice). The first thing this game has built that MOVES, and the
     * first structure whose position is not decided once and then frozen.
     */
    raft: RaftState;
    /**
     * THE CROSSING'S one recorded fact. Deliberately the smallest possible record: whether
     * anyone has ever come alongside the wreck, and when.
     *
     * It is a fact about the ISLAND'S history, not about the current survivor's knowledge, so
     * it survives a death the same way the memorial and the standing shelter do — a successor
     * washes ashore knowing someone got out there, which is exactly the `found-intact` shape
     * of inheritance [[D-069]] already allows: matter and evidence, never technique.
     */
    wreck: WreckState;
    /**
     * THE UNDERWATER SLICE. Whether the survivor is under, and how much breath is left.
     *
     * `air` is the only new resource this stage adds, and it is the clock every risk down
     * there is measured against. It falls ONLY in `Session.advanceDive` — the online tick —
     * so no absence can spend a breath; and an absence actively SURFACES the diver
     * (`surfaceOnAbsence`), because absence making things better is legal where absence
     * making them worse never is.
     */
    dive: DiveState;
    /**
     * FISHING — the cast line and the set net. Both live on the ONLINE tick only
     * (`Session.advanceFishing`), which is [[D-011]] for this stage: an absence cannot
     * advance a soak or resolve a bite, so nothing here can be worse — or better — for
     * having closed the tab.
     */
    fishing: FishingState;
    /**
     * RAIN & WET ESCALATION — the second hazard family, and the first that is not a creature.
     *
     * Advanced by `Session.advanceStorm` on the online tick and nowhere else; an absence ENDS
     * a storm rather than running one, because nobody stood in the rain for eight hours.
     */
    storm: StormState;
    /** DROP 5 — the receiver. See `RadioState`: there is no transmit half. */
    radio: RadioState;
    /** DROP 3B(i) — the appointment. Advanced on the online tick ONLY. */
    crash: CrashState;
    /** WAVE 0 — the water rungs. Every change happens inside a verb; see `vessel.ts`. */
    water: WaterState;

    /**
     * HOW LONG EACH PERISHABLE HAS LEFT, in game hours, keyed by material.
     *
     * ONE CLOCK FOR EVERY PERISHABLE, replacing `meatFreshUntilGameHours` — which was a
     * single-material field, and adding a second one beside it for fish is precisely the
     * parallel food system this stage is not allowed to build. Absent means "not
     * perishable"; a number is game hours REMAINING, counted down on the online tick.
     *
     * REMAINING rather than an absolute deadline, deliberately. The old field compared
     * `gameHoursElapsed` against a stamp, and `gameHoursElapsed` advances across an
     * absence — so food rotted while the tab was shut, which is the same shape as the
     * dropped-stack rule this project already wrote the other way ("absence never erases").
     */
    freshUntil: Partial<Record<MaterialKind, number>>;

    /** WAVE 1 — the beached outboard, the one representative heavy object this slice proves
     *  the tier system and the teardown ladder on. See heavyObjects.ts. */
    outboard: OutboardState;
    /** WAVE 1 — parts already freed from the outboard (or any future heavy object) and
     *  carried loose. NOT `Inventory`: a part is a named, singular, reassemblable thing
     *  (Law 221's controlled relation), not a stackable material — folding it into
     *  `Inventory` would mean a fixed union field per part forever, for every future heavy
     *  object, which is the catalogue-before-the-loop-is-fun Law 235 forbids. */
    carriedParts: OutboardPart[];
    /** WAVE 1 (Law 230) — real study sessions completed per OBJECT CLASS, never per
     *  instance: a second object of the same class must show the same diminishing return the
     *  first did, which is the whole point of "reproduction is not proof of transfer." Keyed
     *  by a plain class id ('small-engine' this slice); read by `studyYieldFor`. */
    studiedClasses: Record<string, number>;
    /** WAVE 1 — the generous shore's own wash-up. See shore.ts. Generated ONCE per return,
     *  as a pure function of elapsed hours — never during the absence itself (D-011). */
    shore: ShoreState;
}

// ---- WAVE 1 — the weighted shore (Law 204, 217, 221-223, 226-227, 230, 234) --------------

/**
 * THE TIER TABLE (Law 204). A characteristic — here, effective strength — changes the METHOD
 * an object moves by, never whether it can be moved at all. Every threshold in `heavyObjects.ts`
 * is read against the SURVIVOR'S CURRENT capacity, so an object's tier is computed live and can
 * cross downward as practice accrues; it is never stored as a fixed property of the object.
 *
 * Only 'dragged' has an implemented movement mechanic this slice (the brief's own scope
 * boundary — T5 or T6, "not T8's full permanence yet"). The other seven exist in the table so
 * a FUTURE object can be typed correctly without a breaking change here.
 */
export type ObjectTier =
    | 'pocketable' | 'one-handed' | 'two-handed' | 'shouldered'
    | 'dragged' | 'levered' | 'tackle-bound' | 'fixed';

/** The five field-teardown rungs (Law 217's graded ladder, never pass/fail). */
export type TeardownRung = 'novice' | 'basic' | 'competent' | 'skilled' | 'expert';

/** One of the outboard's eleven real, named parts — what a complete Expert-rung strip yields,
 *  and what reassembly (Law 227) needs all eleven of back. */
export type OutboardPart =
    | 'fuelTank' | 'tillerHandle' | 'carburetor' | 'magneto' | 'prop' | 'shearPin'
    | 'cylinderHead' | 'piston' | 'gearcase' | 'cowling' | 'mountingBracket';

/** What one strip attempt (or the axe) actually produced — the ladder's result, not its
 *  input. `destroyed` is Law 226's line: DEGRADE keeps the object here for a better attempt
 *  later; DESTROY replaces it with wreckage that still has mass, hazard and reuse, but no
 *  more teardown. */
export interface TeardownOutcome {
    rung: TeardownRung;
    destroyed: boolean;
    gained: Partial<Record<MaterialKind, number>>;
    parts: OutboardPart[];
}

/**
 * THE OUTBOARD — one representative heavy object, present from world start (Wave 1 does not
 * build a discovery/reveal step for it; it is visible on the beach exactly as the brief asks,
 * "visible on the beach" being the FIRST listed requirement).
 */
export interface OutboardState {
    /** Cumulative metres dragged from its original wash-up point. Distance, not a position
     *  delta, so progress reads the same regardless of which direction it was hauled. */
    draggedM: number;
    /** Null until a strip attempt (or the axe) has been made. Once set, further attempts
     *  read and refine it rather than starting over — Law 223, progress persists. */
    teardown: TeardownOutcome | null;
    /** True once teardown has reached Expert AND every part has since been reassembled here
     *  (Law 227's repaired/manufactured route: a survivor who reassembles a complete
     *  outboard has a working motor, not merely eleven parts in a pile). */
    reassembled: boolean;
    /** Set at the moment of reassembly; null on a clean rebuild. A named, plain-language
     *  fault a survivor must diagnose before it can be repaired — Law 227's "repaired" route,
     *  proven rather than merely claimed. */
    fault: string | null;
    /** Has the fault been correctly diagnosed yet? Gates whether `repairOutboard` may act on
     *  it — Law 217's own "credibility" half: an undiagnosed fault cannot be legitimately
     *  fixed, only guessed at. */
    faultDiagnosed: boolean;
}

/** One wash-up on the shore — REFUSE/STOCK/PART/TOOL, the four fates (Laws 175-177). */
export type ShoreFate = 'refuse' | 'stock' | 'part' | 'tool';

export interface ShoreItem {
    id: string;
    fate: ShoreFate;
    /** Plain sight-line description — what the fate actually IS in the survivor's terms.
     *  For 'stock', a MaterialKind name; for 'refuse'/'part'/'tool', a short label. Never a
     *  spoiler of value beyond what looking would tell a person standing over it. */
    label: string;
    /** Mass in kg. Weight is the filter (the brief's own phrase): some items are deliberately
     *  above what the survivor can currently carry, so the beach always holds a "come back
     *  later" reward in plain sight. */
    massKg: number;
    /** Only set for fate 'stock' — how much of which material, if picked up. */
    materialKind: MaterialKind | null;
    materialAmount: number;
    x: number;
    y: number;
    /** The game-hours clock value this item washed in at — for sorting/display only; nothing
     *  reads this as a despawn timer (D-011: nothing on the shore is ever taken back). */
    arrivedAtGameHours: number;
}

export interface ShoreState {
    items: ShoreItem[];
    /** The clock value generation last ran against. Density is computed from the GAP between
     *  this and the current clock at the moment of return, then this is advanced to match —
     *  so two reads in the same session (no elapsed time) generate nothing twice. */
    lastGeneratedAtGameHours: number;
    /** The id/seed counter — Wave 1's own instance of the "counter as seed" determinism
     *  `salvageSpawnCount`, `dropCount` and `craftRollCount` already established. No clock or
     *  RNG read anywhere in generation; this is the only source of variation. */
    spawnCount: number;
}

/**
 * FISHING — see `fishing.ts`. Two independent engagements, because the two methods that
 * take time have genuinely different shapes: a line is HELD (leave the spot and you lose the
 * cast) and a net is SET (walk away within reach and it keeps working).
 */
export interface FishingState {
    /** A cast handline: which spot, and how long it has waited. Null when not fishing. */
    line: { spotId: string; waitedGameHours: number } | null;
    /** A net in the water: where it is, how long it has soaked, and what it holds. */
    net: { spotId: string; soakedGameHours: number; holding: number } | null;
}

/**
 * RAIN & WET ESCALATION — where the weather is in its life cycle. See `storm.ts`.
 *
 * The STAGE is the fact; `inStageGameHours` is the mechanism and never reaches a player.
 * `nextAtGameHours` is a world-clock reading rather than a countdown, so it survives an
 * absence of any length unchanged — and `clearOnAbsence` pushes it out rather than leaving a
 * storm mid-flight for somebody to walk back into.
 */
export interface StormState {
    stage: StormStage;
    inStageGameHours: number;
    /** World-clock reading at which the next storm begins. */
    nextAtGameHours: number;
}

/**
 * The six-stage life cycle, in `storm.ts`'s own words. Declared here rather than imported so
 * `types.ts` stays the one module every other one may depend on without a cycle.
 */
export type StormStage = 'clear' | 'precursor' | 'watch' | 'committed' | 'impact' | 'aftermath';

/** See `GameState.dive` and `dive.ts`. */

export interface DiveState {
    submerged: boolean;
    /** 0..`airCapacityOf(capacities)`. Falls only while under; refills fast at the surface. */
    air: number;
    /** The deepest this survivor has ever been, in metres. History, never a gate. */
    deepestM: number;
}

/**
 * The raft. Shaped like `ShelterState`/`StorageState` where it can be — built, sited, graded
 * — and different in the one way that matters: `x`/`y` change while you are standing on it.
 */
export interface RaftState {
    built: boolean;
    /** Where it is floating right now. Follows the survivor while `aboard`. */
    x: number;
    y: number;
    /** Rolled once at build, like every other made thing (D-055). Moves its speed only. */
    grade: ItemGrade;
    /**
     * Standing on it. SAVED rather than transient, unlike `resting`: a player may close the
     * tab in the middle of the sea, and waking them in the water they left is the truthful
     * answer. It costs nothing while they are gone — no swim cost exists in `reconcile` at
     * all — so this cannot become an offline hazard.
     */
    aboard: boolean;
}

/** What the island remembers about the wreck. See `GameState.wreck`. */
export interface WreckState {
    reached: boolean;
    /** The island clock when someone first came alongside. Null until they do. */
    reachedAtGameHours: number | null;
    /**
     * HOW UNSETTLED THE HULL IS RIGHT NOW, 0..`wreckInstabilityMax`.
     *
     * Raised ONLY by working the wreck — an EVENT per salvage, never a rate — which is what
     * makes [[D-011]] structural here rather than checked: there is no elapsed-time term that
     * could raise it, so no absence can. It SETTLES over elapsed hours, in `reconcile`, which
     * is absence making things better and therefore always legal.
     */
    instability: number;
    /** The island clock when the hull was last disturbed — the settling clock's anchor. */
    lastDisturbedAtGameHours: number | null;
}

/**
 * THE FAR ISLAND — which traces have been read. Ids only, in the same JSON-safe shape
 * `nullPairs` and the memorial already use; the sites themselves are authored content in
 * `world.ts` and are not save state.
 *
 * Declared here rather than in `traces.ts` because `GameState` holds it and `traces.ts`
 * already imports `GameState` — the other way round would close an import cycle, which is the
 * same reason `JournalState` and `InjuryState` live here too.
 */
export interface TracesState {
    read: string[];
}

/** One stack on the ground. See `dropped.ts`. */
export interface DroppedItem {
    id: string;
    kind: MaterialKind;
    amount: number;
    x: number;
    y: number;
    /** Island-clock reading when it was set down. Its own clock, never a shared one. */
    droppedAtGameHours: number;
}

/** The three conditions. See `injury.ts` — proportionate on purpose, not an anatomy model. */
export interface InjuryState {
    /** 0..injuryBleedMax. Costs health continuously. The only one with a treatment. */
    bleeding: number;
    /** Game hours remaining. Slows movement; heals with time, cannot be treated. */
    limp: number;
    /** 0..1. Feeds the resolver's impairment term, so every activity costs more. */
    pain: number;
}

/** The five-stage grammar of the fair-challenge contract. See `fauna.ts`. */
export type BoarStage = 'unaware' | 'alert' | 'warning' | 'charge' | 'aftermath';

/**
 * The same five-stage grammar on a slower clock — the Medicine Slice. See `illness.ts`.
 * The first two rungs cost NOTHING and say something: the contract is that the game tells
 * you twice, in plain language, before an illness starts taking health.
 */
export type IllnessStage = 'well' | 'unsettled' | 'ailing' | 'feverish' | 'gravely-ill';

/**
 * Every illness in this game has one of exactly four causes, and it keeps the one that
 * started it. There is no random source anywhere in `illness.ts`: if a survivor is ill,
 * something they did or failed to do put them there, and the readout says which.
 */
export type IllnessCause = 'chill' | 'bad-water' | 'spoiled-food' | 'exhaustion';

/** One illness. Deliberately the same size as `InjuryState` — see `illness.ts`. */
export interface IllnessState {
    /** 0..illnessSeverityMax. Drives the stage; only costs health from `feverish` up. */
    severity: number;
    /** What started it. Sticks to the FIRST cause, so the readout cannot lie about origin. */
    cause: IllnessCause | null;
    /** How long this survivor has been carrying it — for the death review and the report. */
    gameHoursSick: number;
}

/**
 * One boar. A FIXED individual with a territory and a rhythm — never a spawn-wave unit.
 * `homeX`/`homeY` are its anchor: it wanders from there and D-011 returns it there.
 */
export interface Boar {
    id: string;
    x: number;
    y: number;
    /** Where it lives. Its own ground, and where an absence puts it back. */
    homeX: number;
    homeY: number;
    /** Radians. Decides the sight cone, and is frozen into `chargeBearing` at commitment. */
    facing: number;
    stage: BoarStage;
    /** Island-clock reading when it entered the current stage. The ladder's own timer. */
    stageSinceGameHours: number;
    /**
     * The bearing a charge was committed to, fixed at wind-up and NEVER recomputed. Null
     * unless charging. This one field is what makes a charge evadable.
     */
    chargeBearing: number | null;
    /** Its own need, driving the daily rhythm at coarse grain. */
    hunger: number;
    alive: boolean;
}

/** One life, closed. See `succession.ts`. Declared here because `GameState` carries it. */
export interface SurvivorRecord {
    /** Which castaway this was, counting from the first. */
    ordinal: number;
    cause: string;
    /** The island-clock reading when they died. */
    diedAtGameHours: number;
    /** How long they lasted, in game hours. */
    livedGameHours: number;
    /** What they had demonstrated. HISTORY — never read back as knowledge. */
    knewRecipes: string[];
    /** What they left standing. */
    leftBehind: string[];
}

/**
 * One entry, written by hand, by firelight. `topic` is the recipe the entry is ABOUT, and it
 * is the whole reason the journal is not just flavour text: a legible entry about `shelter`
 * is the evidence that lifts a successor's ladder for shelter. `text` is what the survivor
 * would have written — never a recipe listing, because a survivor writing at night writes
 * what they did, not a specification.
 */
/**
 * THE RECEIVER — Drop 5, one rung of ENDING E03 (register named per [[D-138]]).
 *
 * NO TRANSMIT FIELD, AND THAT ABSENCE IS THE TYPE'S MAIN STATEMENT. There is no power-out, no
 * aerial, no key, no outbound queue. The set receives; the shape says so before any function
 * does, so the day somebody reaches for a send path they have to add a field and notice.
 */
/**
 * THE APPOINTMENT — Drop 3B(i). Six stages, Rain's own grammar, and a terminal end.
 *
 * `overgrown` is not a stage that ends; it is the end. There is no field for a second crash
 * because there is no second crash — the shape says so before any function does.
 */
export type CrashStage = 'none' | 'sighted' | 'standing' | 'fresh' | 'picked-over' | 'overgrown';

/**
 * THE THREE WATER RUNGS (v2.6's Water Craft Tree). ONE vessel, and two quantities: what you
 * dipped and what you boiled. Two numbers rather than a treated flag, because the Treatment
 * Matrix's qualification is "completed boil + clean cooling/storage" — treated water is a
 * different thing from raw, not the same water wearing a label.
 */
export interface WaterState {
    vessel: 'shell-cup' | 'found-pan' | null;
    rawSips: number;
    cleanSips: number;
}

export interface CrashState {
    stage: CrashStage;
    inStageGameHours: number;
    /** Island-clock reading at which the column goes up. */
    nextAtGameHours: number;
    /** How many armfuls have come off it. Diagnostic, never a gate. */
    worked: number;
}

export interface RadioState {
    owned: boolean;
    /** The one salvaged cell, 0..`radioChargeMax`. There is no second one this drop. */
    charge: number;
    listening: boolean;
    /** Signal ids made out at least once. */
    heard: string[];
    /** Signal ids written into the journal. */
    logged: string[];
    /** Game hours of continuous legible listening on the current signal. Online only. */
    dwellGameHours?: number;
}

export interface JournalEntry {
    /** Which survivor wrote it. */
    author: number;
    writtenAtGameHours: number;
    /** The recipe this entry is about, or null for a plain observation. */
    topic: string | null;
    text: string;
}

/**
 * The journal as an OBJECT, subject to everything objects are subject to. `condition` runs
 * 0..1; damp and fire take it down; below the legibility floor the ink has run and the entry
 * is there but cannot be read. `carried` decides whether it burns with you or waits in the
 * store box — which is the actual decision D-068 wants the player to have to make.
 */
export interface JournalState {
    exists: boolean;
    /** Where it is when not carried. Meaningless while `carried`. */
    x: number;
    y: number;
    carried: boolean;
    /** 0..1. Damp, fire and time take it down. Never rises on its own. */
    condition: number;
    entries: JournalEntry[];
    /** Island-clock reading of the last write, so a session can rate-limit honestly. */
    lastWrittenAtGameHours: number | null;
}

export interface TimeOfDay {
    hourOfDay: number;
    dayNumber: number;
    isNight: boolean;
}

/** Which vital drove a death or a drain. Used for honest, specific causes. */
export type VitalName = 'thirst' | 'hunger' | 'warmth';

/** The drift of one vital across a reconcile span, for the morning report. */
export interface VitalDrift {
    vital: VitalName | 'health';
    before: number;
    after: number;
    /** The offline floor stopped this vital's fall. */
    floorHeld: boolean;
}

/** Everything that happened across an elapsed span. Input to the morning report. */
export interface ReconcileResult {
    elapsedRealSeconds: number;
    elapsedGameHours: number;

    warmthBefore: number;
    warmthAfter: number;
    /** True if any offline fairness floor (D-011) stopped a fall. */
    floorHeld: boolean;

    // The three C03 vitals, and per-vital drift for the report.
    thirstBefore: number;
    thirstAfter: number;
    hungerBefore: number;
    hungerAfter: number;
    healthBefore: number;
    healthAfter: number;
    /** Cycle 05: tracked for tests and the sleep summary; no new report line this cycle
     *  (the C05 spec scopes that out — the numbers are honest even unnarrated). */
    energyBefore: number;
    energyAfter: number;
    wetBefore: number;
    wetAfter: number;
    /** Ch.6 (D-058): tracked for tests and the sleep summary. No new morning-report line
     *  this slice — the numbers are honest even unnarrated, the same call energy's own
     *  C05 introduction made. */
    fatigueBefore: number;
    fatigueAfter: number;
    drifts: VitalDrift[];

    /**
     * A death occurred DURING this span (only possible for a non-qualifying online span;
     * the floors make it impossible for a qualifying offline span — that is the law).
     * The session actions the respawn; reconcile only reports it.
     */
    diedDuringSpan: boolean;
    deathCause: string | null;

    fireLitBefore: boolean;
    fireLitAfter: boolean;
    fireWentOutAtGameHours: number | null;
    woodBurned: number;
    shelteredByFire: boolean;

    timeBefore: TimeOfDay;
    timeAfter: TimeOfDay;
    dawnBroke: boolean;
    nightFell: boolean;

    /** Absence long enough to earn a morning report (TUNE.morningReportMinRealMinutes). */
    qualifiesForReport: boolean;

    // ---- Renewability law (D-051) ----
    /** True if this span restocked at least one depleted driftwood node — the tide, on
     *  any qualifying absence, regardless of that node's own regrow timer. */
    driftwoodRestocked: boolean;
    /** GEOLOGY V2: surface stone returned on the tide/erosion cycle during this absence.
     *  Drives its own morning-report line so the beach never silently repopulates. */
    stoneWashedUp: boolean;
    /** How many OTHER (non-driftwood) nodes regrew this span, via the general timer. */
    nodesRegrewCount: number;
    /** How many new beach salvage finds appeared this span. */
    salvageSpawnedCount: number;
}
