/**
 * BRAIN — the save. Versioned from day one (Ops v1.2 §5 law 5): the offline DNA is
 * worthless if a save does not survive an update.
 *
 * Storage sits behind `SaveRepository` so the localStorage implementation shipped this
 * cycle can be swapped for IndexedDB (or a native store) without the brain noticing.
 */

import { TUNE } from '../data/tune';
import { freshDomainScores } from './knowledge';
import { freshLoadout } from './loadout';
import { SCHEMA_VERSION, type Blueprint, type GameState, type MaterialKind } from './types';
import { freshCapacities } from './capacities';
import { freshConfidence } from './confidence';
import { freshJournal } from './state';
import { freshMatterWear } from './matter';
import { createInitialState } from './state';

/** Keep a loaded vital in [0, max]; fall back to a fresh-run default if it is not a number. */
function clampVital(value: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(max, value));
}

export interface SaveEnvelope {
    schemaVersion: number;
    /** Real epoch ms the save was written. The anchor for the absence calculation. */
    savedAtMs: number;
    state: GameState;
}

export interface SaveRepository {
    read(): string | null;
    write(payload: string): void;
    clear(): void;
}

export const SAVE_KEY = 'drift.save.v1';

// ---- Serialisation ------------------------------------------------------

export function serialize(state: GameState, savedAtMs: number): string {
    const envelope: SaveEnvelope = {
        schemaVersion: SCHEMA_VERSION,
        savedAtMs,
        state: { ...state, schemaVersion: SCHEMA_VERSION }
    };
    return JSON.stringify(envelope);
}

/**
 * Parse and migrate. Returns null for absent, corrupt, or unmigratable saves —
 * the caller then starts a fresh run rather than crashing on someone's old data.
 */
export function deserialize(payload: string | null): SaveEnvelope | null {
    if (!payload) return null;

    let raw: unknown;
    try {
        raw = JSON.parse(payload);
    } catch {
        return null;
    }

    if (typeof raw !== 'object' || raw === null) return null;
    const envelope = raw as Partial<SaveEnvelope>;
    if (typeof envelope.schemaVersion !== 'number') return null;
    if (typeof envelope.savedAtMs !== 'number') return null;
    if (typeof envelope.state !== 'object' || envelope.state === null) return null;

    const migrated = migrate(envelope as SaveEnvelope);
    if (!migrated) return null;

    return { ...migrated, state: hydrate(migrated.state) };
}

/**
 * Migration ladder. Each schema bump adds one step here and never touches the steps below
 * it. v1 is the floor: anything older predates the save format. A save from the future
 * belongs to a newer build than this one — refuse it rather than silently corrupt it.
 */
export function migrate(envelope: SaveEnvelope): SaveEnvelope | null {
    let current = envelope;

    if (current.schemaVersion > SCHEMA_VERSION) return null;

    if (current.schemaVersion === 1) current = migrateV1toV2(current);
    if (current.schemaVersion === 2) current = migrateV2toV3(current);
    if (current.schemaVersion === 3) current = migrateV3toV4(current);
    if (current.schemaVersion === 4) current = migrateV4toV5(current);
    if (current.schemaVersion === 5) current = migrateV5toV6(current);
    if (current.schemaVersion === 6) current = migrateV6toV7(current);
    if (current.schemaVersion === 7) current = migrateV7toV8(current);
    if (current.schemaVersion === 8) current = migrateV8toV9(current);
    if (current.schemaVersion === 9) current = migrateV9toV10(current);
    if (current.schemaVersion === 10) current = migrateV10toV11(current);
    if (current.schemaVersion === 11) current = migrateV11toV12(current);
    if (current.schemaVersion === 12) current = migrateV12toV13(current);
    if (current.schemaVersion === 13) current = migrateV13toV14(current);
    if (current.schemaVersion === 14) current = migrateV14toV15(current);

    return current.schemaVersion === SCHEMA_VERSION ? current : null;
}

/**
 * v1 (Cycles 01–02: warmth, wood, fire) → v2 (Cycle 03: three vitals, expanded inventory,
 * tools, skills, death). A returning player keeps their clock, warmth, wood, fire, and
 * position; they wake to a full set of vitals and an island that has grown demands. The
 * old island's node layout is discarded — the world genuinely changed — and regenerated,
 * so the pond, forage, trees, and crash box exist for them. (A1: a c02 save loads and
 * gains the new vitals sensibly.)
 */
function migrateV1toV2(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);

    const state: GameState = {
        ...fresh,
        startedAtMs: num(old.startedAtMs, fresh.startedAtMs),
        lastSeenMs: num(old.lastSeenMs, fresh.lastSeenMs),
        gameHoursElapsed: num(old.gameHoursElapsed, 0),
        //  Warmth carries over; the three new vitals start FULL — explicitly, not by
        //  inheriting `fresh`.
        //
        //  This became load-bearing when Laws 115-117 made `createInitialState` an ARRIVAL:
        //  it now returns a body that is soaked, winded and hurt, which is right for someone
        //  who has just washed ashore and wrong for everyone else. A returning player did not
        //  wash ashore — they have been here for six game-hours with a fire burning. Letting
        //  a migration inherit the crash profile would injure a survivor for the crime of
        //  loading their own save, which is the same class of insult as a death that forgets
        //  what you built.
        //
        //  So arrivals and migrations are stated separately on purpose: **`createInitialState`
        //  answers "how does a castaway land"; a migration answers "what did this survivor
        //  not have yet".** Those are different questions and they must not share a default.
        warmth: num(old.warmth, TUNE.warmthMax),
        thirst: TUNE.thirstMax,
        hunger: TUNE.hungerMax,
        health: TUNE.healthMax,
        energy: TUNE.energyMax,
        wet: 0,
        // Only wood existed in v1; the rest of the inventory starts empty.
        inventory: { ...fresh.inventory, wood: num((old.inventory as Record<string, unknown>)?.wood, 0) },
        fire: isObject(old.fire)
            ? {
                  built: Boolean((old.fire as Record<string, unknown>).built),
                  fuel: num((old.fire as Record<string, unknown>).fuel, 0),
                  x: num((old.fire as Record<string, unknown>).x, 0),
                  y: num((old.fire as Record<string, unknown>).y, 0)
              }
            : fresh.fire,
        player: isObject(old.player)
            ? { x: num((old.player as Record<string, unknown>).x, fresh.player.x), y: num((old.player as Record<string, unknown>).y, fresh.player.y) }
            : fresh.player,
        settings: isObject(old.settings)
            ? { controlMode: (old.settings as Record<string, unknown>).controlMode === 'joystick' ? 'joystick' : 'tap' }
            : fresh.settings,
        // Keep whatever of the old trace survives; the rest defaults.
        trace: { ...fresh.trace, ...(isObject(old.trace) ? (old.trace as Partial<GameState['trace']>) : {}) },
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v2 (Cycle 03: three vitals, death/respawn) → v3 (Cycle 05: energy, wet, shelter,
 * storage). Everything a v2 save has carries over untouched; the new fields start at
 * their fresh-run defaults (full energy, dry, nothing built yet) — a returning player
 * simply hasn't built anything yet, which is the honest truth for a save from before
 * construction existed.
 */
function migrateV2toV3(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);

    const state: GameState = {
        ...(old as unknown as GameState),
        energy: fresh.energy,
        wet: fresh.wet,
        shelter: fresh.shelter,
        storage: fresh.storage,
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v3 (Cycle 05: shelter/storage) → v4 (D-051: the renewability law, the quarry, beach
 * salvage). Everything carries over untouched EXCEPT the node list heals at once: every
 * node the player had depleted comes back available, on this one migration only — "while
 * you were away, the island came back to life." New content (the quarry) is merged in from
 * a fresh state, since an old save has no entry for it at all. No wipe; nothing is lost.
 */
function migrateV3toV4(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);
    const oldNodes = Array.isArray(old.nodes) ? (old.nodes as Array<Record<string, unknown>>) : [];

    const nodes = fresh.nodes.map((freshNode) => {
        const match = oldNodes.find((n) => n.id === freshNode.id);
        if (!match) return freshNode; // new content (the quarry) — the old save never had it
        return {
            ...freshNode,
            x: num(match.x, freshNode.x),
            y: num(match.y, freshNode.y),
            available: true, // the heal: everything the player had picked clean comes back
            depletedAtGameHours: null
        };
    });

    const state: GameState = {
        ...(old as unknown as GameState),
        nodes,
        salvageSpawnCount: fresh.salvageSpawnCount,
        nextSalvageSpawnAtGameHours: num(old.gameHoursElapsed, 0) + fresh.nextSalvageSpawnAtGameHours,
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v4 (D-051: renewability, quarry, salvage) → v5 (D-052, Living Island Track A FIX
 * package): the torch (a new carried light source, FIX 5) and a per-death log on the
 * trace (FIX 2). Everything else carries over untouched; a returning player simply hasn't
 * crafted a torch yet — the same "hasn't built it yet" reasoning v2→v3 used for
 * shelter/storage — and an old save's trace gains an empty death log rather than a
 * fabricated history.
 */
function migrateV4toV5(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);

    const state: GameState = {
        ...(old as unknown as GameState),
        torch: fresh.torch,
        trace: { ...fresh.trace, ...(isObject(old.trace) ? (old.trace as Partial<GameState['trace']>) : {}) },
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v5 (D-052: the torch, the death log) → v6 (Ch.1 v3, D-055): the sharp-blade
 * intermediate, the stone hammer, grades on the axe/torch/shelter, and the null-outcome
 * combination journal. Everything else carries over untouched. Every ALREADY-owned
 * axe/torch/shelter heals in at the baseline `serviceable` grade — the honest "we don't
 * know what grade it would have rolled" answer, never a retroactive upgrade or downgrade;
 * `serviceable` is defined (see `tune.ts`'s per-grade multiplier tables) to reproduce
 * every pre-grade constant exactly, so this is functionally invisible to a returning
 * player. A returning player simply hasn't made a stone hammer or knapped a blade yet,
 * the same "hasn't built it yet" reasoning every prior migration in this file has used.
 */
function migrateV5toV6(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const oldInventory = isObject(old.inventory) ? old.inventory : {};
    const oldTools = isObject(old.tools) ? old.tools : {};
    const oldShelter = isObject(old.shelter) ? old.shelter : {};
    const oldTorch = isObject(old.torch) ? old.torch : {};

    const state: GameState = {
        ...(old as unknown as GameState),
        inventory: { ...(oldInventory as unknown as GameState['inventory']), sharpblade: num(oldInventory.sharpblade, 0) },
        tools: {
            ...(oldTools as unknown as GameState['tools']),
            stoneHammer: Boolean(oldTools.stoneHammer),
            axeGrade: 'serviceable'
        },
        shelter: { ...(oldShelter as unknown as GameState['shelter']), grade: 'serviceable' },
        torch: { ...(oldTorch as unknown as GameState['torch']), grade: 'serviceable' },
        craftRollCount: num(old.craftRollCount, 0),
        //  This step's own concern is only the fields named in its own doc comment above
        //  (sharpblade/hammer/grades); `domains` did not exist until v7 and is filled in by
        //  `migrateV6toV7` immediately after — TS still requires a complete `KnowledgeState`
        //  here, so a fresh set stands in for one step, replaced one migration later.
        knowledge: { nullPairs: [], events: [], domains: freshDomainScores() },
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v6 (Ch.1 v3: grades, the stone hammer, the null-outcome journal) → v7 (Ch.2, "The
 * Knowledge Model"): every unit gains a per-domain score (`knowledge.domains`). A
 * returning player's `nullPairs`/`events` carry over exactly as they were; `domains`
 * starts fresh at the innate floor for every domain — no retroactive Understanding credit
 * for null pairs discovered before this chapter shipped. The honest "we don't know what it
 * would have been" answer, the same reasoning D-055's own grade migration already used for
 * an axe/torch/shelter healing to `serviceable` rather than a fabricated roll.
 */
function migrateV6toV7(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const oldKnowledge = isObject(old.knowledge) ? old.knowledge : {};

    const state: GameState = {
        ...(old as unknown as GameState),
        knowledge: {
            nullPairs: Array.isArray(oldKnowledge.nullPairs) ? (oldKnowledge.nullPairs as string[]) : [],
            events: Array.isArray(oldKnowledge.events) ? (oldKnowledge.events as GameState['knowledge']['events']) : [],
            domains: freshDomainScores()
        },
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v7 (Ch.2: the knowledge model) → v8 (Ch.6, "The Body Model"): `fatigue` and `resting`.
 * A returning player wakes with **zero fatigue and not resting** — the honest "we have no
 * record of how tired you were" answer, and the kind one: this chapter's own offline law
 * says absence may never hand back a body in worse condition, and inventing a fatigue
 * number for a save that predates the system would be doing exactly that. Carry weight
 * needs no migration at all: it is derived from inventory and tools, which every v7 save
 * already has. The death log's new per-entry fields are optional by design, so existing
 * entries stay valid, unrewritten, rather than gaining a fabricated message for a death
 * that happened before the lesson existed.
 */
function migrateV7toV8(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;

    const state: GameState = {
        ...(old as unknown as GameState),
        fatigue: 0,
        resting: false,
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v8 (Ch.6: the body model) → v9 (tree parity, D-059): 14 treeline positions became real
 * harvestable tree nodes. **A returning player would never see them without this step** —
 * `hydrate` deliberately keeps a save's own `nodes` array (that is what preserves which
 * nodes you have depleted), so new world content has to be merged in explicitly. Exactly
 * the shape v3→v4 used when the quarry was added.
 *
 * Every node the save already has is kept EXACTLY as it is, including its depleted state
 * and regrow timestamp — a tree the player felled an hour ago stays felled and keeps
 * counting down. Only genuinely new ids are appended, available and ready. Nothing is
 * healed, reset, or reordered: this migration adds, and does nothing else.
 */
function migrateV8toV9(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;
    const fresh = createInitialState(typeof old.startedAtMs === 'number' ? old.startedAtMs : 0);
    const oldNodes = Array.isArray(old.nodes) ? (old.nodes as GameState['nodes']) : [];
    const known = new Set(oldNodes.map((n) => n.id));
    const added = fresh.nodes.filter((n) => !known.has(n.id));

    const state: GameState = {
        ...(old as unknown as GameState),
        nodes: [...oldNodes, ...added],
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v9 (tree parity) → v10 (embodied inventory + experimentation, v0_7 §9/§10.6, D-063):
 * the six-zone `loadout`, plus `blueprints` and `experimentCount`.
 *
 * A returning player gets an EMPTY loadout — nothing in hand, nothing on the belt, no
 * pockets filled — and no plans yet. Every tool they own is still owned; it simply sits in
 * general carry, which is exactly where it effectively was before positions existed. This
 * is the honest reading: the game has no record of where they were keeping things, and
 * inventing positions would be fabricating a history. No blueprint is granted for anything
 * they already knew how to make either — a plan is a thing you worked out, and the run has
 * no evidence they ever did.
 */
function migrateV9toV10(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as Record<string, unknown>;

    const state: GameState = {
        ...(old as unknown as GameState),
        loadout: freshLoadout(),
        blueprints: [],
        experimentCount: 0,
        schemaVersion: SCHEMA_VERSION
    };

    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v10 → v11 (Slice 2): the fishing line, a CAPABILITY that divides the pond's circle a third
 * time. A returning castaway simply has not found one — the same reasoning every tool
 * migration before this has used. Nothing else moves: the circle is a new way to reach verbs
 * that already existed, so no save carries stale state about it.
 */
function migrateV10toV11(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as GameState;
    const state: GameState = {
        ...old,
        tools: { ...old.tools, fishingLine: false },
        schemaVersion: SCHEMA_VERSION,
    };
    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v11 → v12 (Slice 2B Stage 2d): THE INVENTION PIVOT'S MIGRATION.
 *
 * When the manufacture catalogue empties, "what you can build" stops being a list the game
 * hands you and becomes a record of what you have actually done. That is the right shape for
 * a new run — and a theft from an existing one. The director's live save has a shelter
 * standing, an axe in hand, a hammer that knapped a blade. A pivot that reset those to
 * `physically-possible` would tell a survivor holding their own axe that they have never
 * heard of one, and they would have to rediscover it by Try-Combine to get the list back.
 *
 * So the migration reads the save for EVIDENCE OF PRIOR CRAFT and mints the blueprint that
 * evidence implies. Two rules govern what counts:
 *
 *   1. **Possession is proof.** A built shelter, an owned axe, a hammer — these are things
 *      that only exist because the survivor made them. Nothing is granted on a guess.
 *   2. **Nothing is overwritten.** A survivor who already has a blueprint for a thing keeps
 *      the one they earned, with its own version and workmanship. This only ever fills gaps.
 *
 * The result is `demonstrated` on the ladder — they have done it — and NOT `understood` or
 * `documented`, which are earned through domain understanding and are not implied by having
 * once succeeded. `migratedLadderFor` states the same rule from the reading side.
 *
 * STRUCTURES ARE MATTER AND ARE NOT TOUCHED. `shelter.built`, `storage.built`, their
 * durabilities and positions pass through untouched — a standing shelter is a physical fact
 * about the island, not an entry in a list, and no knowledge pivot may take it down.
 */
function migrateV11toV12(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as GameState;

    //  Possession is proof. Each pair is (recipe, the evidence that it was once made).
    const evidence: Array<[string, boolean, string, MaterialKind[]]> = [
        ['shelter', old.shelter?.built === true, 'Lean-to, as built', ['wood', 'stone', 'fiber']],
        ['storage', old.storage?.built === true, 'Store, as built', ['wood', 'stone']],
        ['axe', old.tools?.axe === true, 'Hafted axe, as made', ['wood', 'sharpblade', 'fiber']],
        ['stonehammer', old.tools?.stoneHammer === true, 'Stone hammer, as made', ['wood', 'stone']],
        ['torch', old.torch?.owned === true, 'Torch, as made', ['wood', 'fiber']],
        ['knap', (old.inventory?.sharpblade ?? 0) > 0, 'Knapped blade', ['stone']],
    ];

    const known = new Set(old.blueprints?.map((b) => b.recipeId) ?? []);
    const minted: Blueprint[] = [];
    for (const [recipeId, proven, name, inputs] of evidence) {
        if (!proven || known.has(recipeId)) continue;
        minted.push({
            id: `bp-migrated-${recipeId}`,
            name,
            recipeId,
            inputs,
            version: 1,
            //  Crude, deliberately. The save records that they made one, not how well — and
            //  inventing a grade they never earned would be the same lie in the other
            //  direction. Workmanship is evidence, never a gift (§10.6).
            workmanship: 'crude',
            author: 'castaway',
            discoveredAtGameHours: old.gameHoursElapsed ?? 0,
        });
    }

    const state: GameState = {
        ...old,
        blueprints: [...(old.blueprints ?? []), ...minted],
        schemaVersion: SCHEMA_VERSION,
    };
    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v12 → v13 (Slice 2B Stage B): §12's eight capacities and the confidence layer.
 *
 * Both start FRESH, and the reason is the same honesty D-055's grade migration and Ch.2's
 * domain migration both settled on: we do not know what they would have been. A returning
 * survivor has certainly done work that would have built strength and load tolerance, but
 * nothing in the save records how much, and inventing a number is worse than starting one.
 *
 * Confidence starts EMPTY rather than stale, which matters more than it looks. An empty
 * record reads as "never practised", and `confidenceFor` returns FULL confidence for that —
 * so nobody is charged rust for time that passed before the layer existed. Seeding it with
 * the current clock would have had the same effect today and quietly become wrong the moment
 * a save sat unopened for a week between this migration and the next session.
 */
function migrateV12toV13(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as GameState;
    //  FILL, never overwrite — the same rule v11→v12 settled on for blueprints. A v12 save
    //  should not have these fields at all, but "should not" is not "cannot": a hand-edited
    //  save, or one written by a newer build and opened by an older one, can carry a partial
    //  set. Replacing wholesale would silently discard real values, and a migration that
    //  destroys data it did not understand is worse than one that refuses to run.
    const state: GameState = {
        ...old,
        capacities: { ...freshCapacities(), ...old.capacities },
        confidence: {
            lastPractisedGameHours: {
                ...freshConfidence().lastPractisedGameHours,
                ...old.confidence?.lastPractisedGameHours,
            },
        },
        schemaVersion: SCHEMA_VERSION,
    };
    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v13 → v14 (Slice 2C, Law 128): accumulated matter wear.
 *
 * Starts EMPTY, and fills rather than overwrites — a returning survivor's materials are as
 * good as they left them, which is the honest reading: nothing wore them out while the game
 * was closed. Wear is a record of attempts, and no attempts happened.
 */
function migrateV13toV14(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as GameState;
    const state: GameState = {
        ...old,
        matterWear: { ...freshMatterWear(), ...old.matterWear },
        schemaVersion: SCHEMA_VERSION,
    };
    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

/**
 * v14 → v15 (Slice 3, the castaway cycle). Adds the memorial, the survivor's own clock, and
 * the journal.
 *
 * THE ONLY INTERESTING QUESTION HERE is what `survivorStartedAtGameHours` should be for a
 * save written before survivors had a start time — and the answer is 0, meaning "this person
 * has been here since the beginning". That is TRUE for every existing save: nobody had ever
 * been succeeded, because succession did not exist. A returning player is still themselves,
 * their whole life so far counts as their life so far, and the island's graveyard is empty
 * because nobody has yet died a death that stuck. Any other value would invent a history
 * that never happened.
 *
 * Note what is NOT done: old `deathLog` entries are left exactly as they are, including the
 * `lost` amounts recorded under the retired resource-loss rule. Those deaths really did cost
 * that, at the time. Rewriting the record to match today's rules would be falsifying history
 * to make the schema tidy, which is the one thing a migration must never do.
 */
function migrateV14toV15(envelope: SaveEnvelope): SaveEnvelope {
    const old = envelope.state as unknown as GameState;
    const state: GameState = {
        ...old,
        memorial: Array.isArray(old.memorial) ? old.memorial : [],
        survivorStartedAtGameHours: num((old as Partial<GameState>).survivorStartedAtGameHours, 0),
        journal: old.journal ?? freshJournal(),
        schemaVersion: SCHEMA_VERSION,
    };
    return { ...envelope, schemaVersion: SCHEMA_VERSION, state };
}

function num(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** Fill in any field a hand-edited or partial save is missing, using a fresh run as the default. */
function hydrate(state: GameState): GameState {
    const base = createInitialState(state.startedAtMs ?? 0);
    return {
        ...base,
        ...state,
        inventory: { ...base.inventory, ...state.inventory },
        tools: { ...base.tools, ...state.tools },
        skills: {
            woodcutting: { ...base.skills.woodcutting, ...state.skills?.woodcutting },
            foraging: { ...base.skills.foraging, ...state.skills?.foraging }
        },
        fire: { ...base.fire, ...state.fire },
        //  Per-capacity merge, not a whole-object fallback: a hand-edited or partially
        //  written save that has SOME capacities must keep them and gain only the missing
        //  ones. `...state` alone would let a save with a truncated capacities object
        //  silently drop the rest to undefined, which reads as NaN the first time anything
        //  compares them — the same class of failure the TUNE mirror's Proxy exists to make
        //  loud rather than quiet.
        capacities: { ...base.capacities, ...state.capacities },
        matterWear: { ...base.matterWear, ...state.matterWear },
        confidence: {
            lastPractisedGameHours: {
                ...base.confidence.lastPractisedGameHours,
                ...state.confidence?.lastPractisedGameHours,
            },
        },
        shelter: { ...base.shelter, ...state.shelter },
        storage: { ...base.storage, ...state.storage, stored: { ...base.storage.stored, ...state.storage?.stored } },
        torch: { ...base.torch, ...state.torch },
        player: { ...base.player, ...state.player },
        settings: { ...base.settings, ...state.settings },
        trace: { ...base.trace, ...state.trace },
        knowledge: {
            ...base.knowledge,
            ...state.knowledge,
            domains: { ...base.knowledge.domains, ...state.knowledge?.domains }
        },
        nodes: Array.isArray(state.nodes) && state.nodes.length > 0 ? state.nodes : base.nodes,
        //  Defensive clamp on load. Vitals are now life-and-death, so a corrupt or
        //  hand-edited save must not carry an out-of-band value (a negative health would
        //  otherwise be held negative forever by reconcile's floor). A health of 0 self-heals
        //  on the next online tick — death, then a merciful respawn. (C3 audit, C03.)
        warmth: clampVital(state.warmth, TUNE.warmthMax, base.warmth),
        thirst: clampVital(state.thirst, TUNE.thirstMax, base.thirst),
        hunger: clampVital(state.hunger, TUNE.hungerMax, base.hunger),
        health: clampVital(state.health, TUNE.healthMax, base.health),
        energy: clampVital(state.energy, TUNE.energyMax, base.energy),
        wet: clampVital(state.wet, TUNE.wetMax, base.wet),
        //  Ch.6: fatigue gets the same defensive clamp — a hand-edited or corrupt save must
        //  not carry an out-of-band value into a system the HUD reads stages off.
        fatigue: clampVital(state.fatigue, TUNE.fatigueMax, base.fatigue),
        //  `resting` is a transient of the sleep action, never a saved mode. A save that
        //  somehow captured it mid-span (a crash during sleep) heals to false rather than
        //  resuming into permanent accelerated recovery.
        resting: false,
        //  D-063: a hand-edited or partial save must still produce a well-formed loadout —
        //  the panel indexes belt/pocket positions directly, so a missing array would be a
        //  crash rather than a cosmetic gap.
        loadout: { ...base.loadout, ...state.loadout },
        blueprints: Array.isArray(state.blueprints) ? state.blueprints : base.blueprints,
        schemaVersion: SCHEMA_VERSION
    };
}

// ---- Repositories -------------------------------------------------------

/** In-memory repository — the test double, and the fallback when storage is unavailable. */
export class MemorySaveRepository implements SaveRepository {
    private payload: string | null = null;

    read(): string | null {
        return this.payload;
    }

    write(payload: string): void {
        this.payload = payload;
    }

    clear(): void {
        this.payload = null;
    }
}

/**
 * localStorage repository. Cycle 01's storage (Ops §5 law 5). Every call is guarded:
 * private-mode Safari and storage-full both throw on write, and neither is a reason to
 * lose the running game.
 */
export class LocalStorageSaveRepository implements SaveRepository {
    constructor(private readonly key: string = SAVE_KEY) {}

    static isAvailable(): boolean {
        try {
            if (typeof localStorage === 'undefined') return false;
            const probe = '__drift_probe__';
            localStorage.setItem(probe, '1');
            localStorage.removeItem(probe);
            return true;
        } catch {
            return false;
        }
    }

    read(): string | null {
        try {
            return localStorage.getItem(this.key);
        } catch {
            return null;
        }
    }

    write(payload: string): void {
        try {
            localStorage.setItem(this.key, payload);
        } catch {
            /* Storage refused the write; the run continues in memory. */
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(this.key);
        } catch {
            /* nothing to do */
        }
    }
}

/** Pick the best repository this environment offers. */
export function createSaveRepository(): SaveRepository {
    return LocalStorageSaveRepository.isAvailable()
        ? new LocalStorageSaveRepository()
        : new MemorySaveRepository();
}
