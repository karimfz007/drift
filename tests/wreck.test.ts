/**
 * THE WRECK — what the crossing arrives at (the Wreck Slice).
 *
 * Four claims carry this slice, and each has a section:
 *
 *   1. It is EXPLORABLE through the shipped verb, not a parallel mechanic — the wreck's parts
 *      are ordinary nodes worked with `gatherNode`.
 *   2. The salvage is REAL and it is the wreck-era family, structurally inert on this island
 *      by design, with exactly one member that answers a shipped problem.
 *   3. The RISK matches the crossing's stakes: the hull is not inert, two spoken warnings come
 *      before anything is taken, and lingering is a choice.
 *   4. **D-011 holds, by a stronger mechanism than the water's**: instability has no
 *      elapsed-time term that can raise it, so an absence can only ever make the wreck safer.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState, gatherNode, wreckPartYield } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import {
    atWreckSite, disturb, harmFromWorking, hullNote, hullStageOf, hullWillBite,
    settleOverGameHours, wreckNoteFor,
} from '../src/brain/wreck';
import { canTakeMedicine, medicineBlocker, takeMedicine, illnessStage } from '../src/brain/illness';
import { materialSatisfies, ALL_MATERIAL_KINDS, MATERIAL_PROFILE } from '../src/brain/materials';
import { allRecipes } from '../src/brain/recipes';
import { deserialize } from '../src/brain/save';
import { nodeSpec, regrowGameHoursFor } from '../src/brain/state';
import { SCHEMA_VERSION } from '../src/brain/types';
import { WRECK } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';
import type { GameState, MaterialKind } from '../src/brain/types';

function fresh(): GameState {
    return fullBody(createInitialState(1_700_000_000_000));
}

/** The survivor, alongside the wreck, able to reach its parts. */
function atWreck(s: GameState): GameState {
    s.player.x = WRECK.x;
    s.player.y = WRECK.y;
    return s;
}

const WRECK_PART_IDS = createInitialState(0).nodes
    .filter((n) => n.kind === 'wreckpart').map((n) => n.id);

/** The four the crossing exists to bring home. */
const WRECK_ERA: MaterialKind[] = ['metal', 'wiring', 'glass', 'medicine'];

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ---------------------------------------------------------------------------
describe('the wreck is EXPLORABLE — through the shipped verb, not a new mechanic', () => {
    it('it has real, workable parts, and they are ordinary nodes', () => {
        expect(WRECK_PART_IDS.length).toBeGreaterThan(3);
        //  Not a bespoke interaction: hold-work, no axe, like a deadfall or a rock.
        expect(nodeSpec('wreckpart').interaction).toBe('hold');
        expect(nodeSpec('wreckpart').needsAxe).toBe(false);
    });

    it('every part is at the wreck, and reachable from a raft moored alongside', () => {
        const s = createInitialState(0);
        for (const id of WRECK_PART_IDS) {
            const n = s.nodes.find((x) => x.id === id)!;
            const d = Math.hypot(n.x - WRECK.x, n.y - WRECK.y);
            expect(d, `${id} is outside the arrival radius`).toBeLessThanOrEqual(TUNE.wreckArrivalRadiusM);
        }
    });

    it('...and they are SPREAD, so exploring means moving around a structure', () => {
        const s = createInitialState(0);
        const parts = WRECK_PART_IDS.map((id) => s.nodes.find((x) => x.id === id)!);
        let closest = Infinity;
        for (let i = 0; i < parts.length; i++) {
            for (let j = i + 1; j < parts.length; j++) {
                closest = Math.min(closest, Math.hypot(parts[i].x - parts[j].x, parts[i].y - parts[j].y));
            }
        }
        //  Further apart than a single interact radius, or "explore the wreck" is one tap
        //  repeated six times from one spot.
        expect(closest).toBeGreaterThan(TUNE.interactRadiusM * 2);
    });

    it('working one yields through the real gather path, and it is EFFORTFUL', () => {
        const s = atWreck(fresh());
        const before = s.energy;
        const r = gatherNode(s, WRECK_PART_IDS[0]);
        expect(r.ok).toBe(true);
        expect(Object.keys(r.gained ?? {}).length).toBeGreaterThan(0);
        expect(s.energy, 'prying metal in open water must cost something').toBeLessThan(before);
    });

    it('the sea shifts it back into reach — the wreck is not a one-visit strip-mine', () => {
        expect(regrowGameHoursFor('wreckpart')).toBeGreaterThan(0);
        //  Slower than a tree: the tide does this work, not a season.
        expect(regrowGameHoursFor('wreckpart')).toBeGreaterThan(regrowGameHoursFor('tree'));
    });

    it('it trains SEAMANSHIP, the domain the crossing itself trains', () => {
        const s = atWreck(fresh());
        const before = s.knowledge.domains.navigationSeamanship.technique;
        gatherNode(s, WRECK_PART_IDS[0]);
        expect(s.knowledge.domains.navigationSeamanship.technique).toBeGreaterThan(before);
        //  ...and NOT the island's harvesting domain. Working a wreck is not felling a tree.
        expect(s.knowledge.domains.harvestingFabrication.technique)
            .toBe(fresh().knowledge.domains.harvestingFabrication.technique);
    });
});

// ---------------------------------------------------------------------------
describe('the salvage is REAL — the wreck-era family, and what it may not do', () => {
    it('all four exist, are carried, and weigh something', () => {
        const s = fresh();
        for (const kind of WRECK_ERA) {
            expect(s.inventory[kind], `${kind} is not carried`).toBe(0);
            expect(ALL_MATERIAL_KINDS).toContain(kind);
            expect(TUNE.materialMassKg[kind], `${kind} is weightless`).toBeGreaterThan(0);
        }
    });

    it('a fresh castaway can never get one on the island — they exist only out there', () => {
        //  The claim that makes the crossing matter. Every island node's yield is checked
        //  against the wreck-era family; not one of them may produce it.
        const s = createInitialState(0);
        const islandKinds = new Set(s.nodes.filter((n) => n.kind !== 'wreckpart').map((n) => n.kind));
        expect(islandKinds.size).toBeGreaterThan(5);
        const home = fullBody(createInitialState(0));
        for (const node of s.nodes) {
            if (node.kind === 'wreckpart') continue;
            const probe = fullBody(createInitialState(0));
            probe.player.x = node.x; probe.player.y = node.y;
            probe.tools.axe = true;
            gatherNode(probe, node.id);
            for (const kind of WRECK_ERA) {
                expect(probe.inventory[kind], `${node.kind} produced ${kind} on the island`)
                    .toBe(home.inventory[kind]);
            }
        }
    });

    it('the medical store is a PLACE on the wreck, not a roll', () => {
        //  Authored per part: the same part gives the same thing every time, so a survivor can
        //  learn the wreck's layout rather than re-rolling the same water.
        const withMedicine = WRECK_PART_IDS.filter((id) => (wreckPartYield(id).medicine ?? 0) > 0);
        expect(withMedicine.length, 'exactly one part carries the medical store').toBe(1);
        expect(wreckPartYield(withMedicine[0])).toEqual(wreckPartYield(withMedicine[0]));
    });

    it('between them the parts yield every wreck-era material', () => {
        const produced = new Set<string>();
        for (const id of WRECK_PART_IDS) {
            for (const k of Object.keys(wreckPartYield(id))) produced.add(k);
        }
        for (const kind of WRECK_ERA) {
            expect(produced.has(kind), `nothing on the wreck yields ${kind}`).toBe(true);
        }
    });

    it('THE BOUNDARY: they are structurally inert — no existing recipe resolves on them', () => {
        /**
         * The correction I made to my own first cut. I had tagged metal `blade`+`masonry`,
         * wiring `textile`, glass `blade` — spending the [[D-055]] tag schema. But the cost
         * gates in `state.ts` are still exact-kind: `canCraftAxe` asks for `sharpblade` BY
         * NAME. So a survivor holding hull plate would Try-Combine wood + metal + fibre,
         * `resolveRecipe` would answer AXE on the `blade` tag, a blueprint would mint, and the
         * Build panel would then demand a knapped stone blade they do not have.
         *
         * Discovery promising what the craft gate refuses is [[D-114]]'s exact defect shape.
         * This asserts I did not ship it.
         */
        for (const recipe of allRecipes()) {
            for (const slot of recipe.slots) {
                for (const kind of WRECK_ERA) {
                    expect(materialSatisfies(kind, slot.require),
                        `${kind} satisfies ${recipe.id}'s ${slot.id} — discovery would promise a craft the gate refuses`)
                        .toBe(false);
                }
            }
        }
    });

    it('medicine is NOT food — it can never be eaten by a shared tag', () => {
        expect(MATERIAL_PROFILE.medicine.tags).not.toContain('food');
        expect(materialSatisfies('medicine', { tag: 'food' })).toBe(false);
    });

    it('`conductive` finally describes something — the property vocabulary spent', async () => {
        const { propertiesOf } = await import('../src/brain/evidence');
        expect(propertiesOf('wiring')).toContain('conductive');
        //  Nothing on the ISLAND conducts, which is why the term described nothing until now.
        for (const kind of ['wood', 'stone', 'fiber', 'coconut'] as const) {
            expect(propertiesOf(kind)).not.toContain('conductive');
        }
    });
});

// ---------------------------------------------------------------------------
describe('the medical store answers a shipped problem — the payoff, made real', () => {
    function ill(sev: number): GameState {
        const s = atWreck(fresh());
        s.illness = { severity: sev, cause: 'chill', gameHoursSick: 5 };
        return s;
    }

    it('it relieves a real illness, anywhere, with no fire and no forage', () => {
        const s = ill(1.2);
        s.inventory.medicine = 1;
        const before = s.illness.severity;
        expect(canTakeMedicine(s)).toBe(true);
        expect(takeMedicine(s)).toBe(true);
        expect(s.illness.severity).toBeLessThan(before);
        expect(s.inventory.medicine).toBe(0);
    });

    it('...and it is STRONGER than what the island can brew', () => {
        //  The crossing has to be worth it. If the beach answer were as good, it would not be.
        expect(TUNE.medicineSeverityRelief).toBeGreaterThan(TUNE.remedySeverityRelief);
    });

    it('it is RELIEF, never a cure — severity floors at zero and the cause is kept', () => {
        const s = ill(0.2);
        s.inventory.medicine = 1;
        takeMedicine(s);
        expect(s.illness.severity).toBe(0);
        //  Fully relieved, so the cause clears — the same rule `brewRemedy` keeps. While ANY
        //  severity remains the cause must survive, or the readout could lie about origin.
        const partial = ill(2.0);
        partial.inventory.medicine = 1;
        takeMedicine(partial);
        expect(partial.illness.severity).toBeGreaterThan(0);
        expect(partial.illness.cause).toBe('chill');
    });

    it('refuses with the ONE truest reason, never a generic no', () => {
        const none = ill(1.0);
        expect(canTakeMedicine(none)).toBe(false);
        expect(medicineBlocker(none)).toMatch(/nothing/i);

        const well = atWreck(fresh());
        well.inventory.medicine = 2;
        expect(canTakeMedicine(well)).toBe(false);
        expect(medicineBlocker(well)).toMatch(/not ill/i);
        //  ...and refusing costs nothing.
        expect(takeMedicine(well)).toBe(false);
        expect(well.inventory.medicine).toBe(2);
    });

    it('taking it can walk the shipped five-stage grammar back down', () => {
        const s = ill(TUNE.illnessSeverityMax);
        s.inventory.medicine = 3;
        const before = illnessStage(s.illness);
        takeMedicine(s);
        takeMedicine(s);
        expect(illnessStage(s.illness)).not.toBe(before);
    });
});

// ---------------------------------------------------------------------------
describe('the RISK matches the crossing — two spoken warnings, then a price', () => {
    it('a sound hull is silent, and so is a lightly shifted one', () => {
        expect(hullNote('sound')).toBeNull();
        expect(hullNote('shifting')).toBeNull();
    });

    it('the two warnings SPEAK, and say different things', () => {
        expect(hullNote('groaning')).toBeTruthy();
        expect(hullNote('giving-way')).toBeTruthy();
        expect(hullNote('groaning')).not.toBe(hullNote('giving-way'));
    });

    it('NEITHER warning costs anything — the contract, asserted', () => {
        for (const v of [0, 1, TUNE.wreckGroaningAt, TUNE.wreckGivingWayAt - 1]) {
            const w = { reached: true, reachedAtGameHours: 0, instability: v, lastDisturbedAtGameHours: null };
            expect(harmFromWorking(w), `instability ${v} must be free`).toEqual({ health: 0, bleeding: 0 });
        }
    });

    it('...and only the stage AFTER both warnings bites', () => {
        const w = { reached: true, reachedAtGameHours: 0, instability: TUNE.wreckGivingWayAt, lastDisturbedAtGameHours: null };
        expect(hullWillBite(hullStageOf(w))).toBe(true);
        expect(harmFromWorking(w).health).toBeGreaterThan(0);
        expect(harmFromWorking(w).bleeding).toBeGreaterThan(0);
    });

    it('a survivor can take HALF the wreck without ever being warned', () => {
        //  Fair challenge is not only "you were told" — it is "you were not nagged". If the
        //  first part worked triggered a warning, the warning would mean nothing.
        const s = atWreck(fresh());
        let warned = false;
        for (let i = 0; i < 3; i++) {
            gatherNode(s, WRECK_PART_IDS[i]);
            if (hullNote(hullStageOf(s.wreck))) warned = true;
        }
        expect(warned).toBe(false);
    });

    it('...and IS warned before anything is taken from them', () => {
        const s = atWreck(fresh());
        let firstWarnAt = -1;
        let firstHarmAt = -1;
        for (let i = 0; i < WRECK_PART_IDS.length; i++) {
            const harmed = harmFromWorking(s.wreck).health > 0;
            if (harmed && firstHarmAt < 0) firstHarmAt = i;
            gatherNode(s, WRECK_PART_IDS[i]);
            if (hullNote(hullStageOf(s.wreck)) && firstWarnAt < 0) firstWarnAt = i;
        }
        expect(firstWarnAt, 'the hull never warned at all').toBeGreaterThanOrEqual(0);
        expect(firstHarmAt, 'the hull never bit, so the contract is untested').toBeGreaterThan(firstWarnAt);
    });

    it('the harm is a WOUND through the shipped injury model, not a bespoke harm', () => {
        const s = atWreck(fresh());
        s.wreck = { ...s.wreck, instability: TUNE.wreckInstabilityMax };
        const health = s.health;
        const bleeding = s.injuries.bleeding;
        const r = gatherNode(s, WRECK_PART_IDS[0]);
        expect(s.health).toBeLessThan(health);
        expect(s.injuries.bleeding).toBeGreaterThan(bleeding);
        //  ...and the survivor STILL gets the salvage. The wreck shifting does not cancel the
        //  work; it charges you for doing it anyway.
        expect(r.ok).toBe(true);
        expect(Object.keys(r.gained ?? {}).length).toBeGreaterThan(0);
    });

    it('it is not a one-shot kill at the far end of the crossing', () => {
        //  A trapdoor 115 m offshore would be the opposite of fair challenge.
        expect(TUNE.wreckShiftHealth).toBeLessThan(TUNE.healthMax / 2);
    });

    it('the warning is only spoken AT the wreck — not shouted across the island', () => {
        const s = fresh();
        s.wreck = { ...s.wreck, instability: TUNE.wreckInstabilityMax };
        s.player.x = 0; s.player.y = 0;
        expect(atWreckSite(s)).toBe(false);
        expect(wreckNoteFor(s)).toBeNull();
        expect(wreckNoteFor(atWreck(s))).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
describe('D-011: an absence can only ever make the wreck SAFER', () => {
    /**
     * A different mechanism from the water's, and a stronger one. `water.ts` keeps absence
     * safe by living only on the online tick. Instability keeps it safe by having **no
     * elapsed-time term that can raise it**: it rises in `disturb()`, which takes no duration
     * and is called from a player action, and it falls in `settleOverGameHours`.
     */
    it('PROPERTY: for any state and any elapsed time, reconcile never raises instability', () => {
        const random = rng(20260805);
        let sawNonZero = 0;
        for (let i = 0; i < 1200; i++) {
            const s = createInitialState(0);
            s.wreck = {
                reached: random() < 0.5,
                reachedAtGameHours: null,
                instability: random() * TUNE.wreckInstabilityMax,
                lastDisturbedAtGameHours: random() < 0.5 ? random() * 100 : null,
            };
            s.gameHoursElapsed = random() * 240;
            if (s.wreck.instability > 0) sawNonZero++;
            const before = s.wreck.instability;
            const { state } = reconcile(s, 1 + random() * 86400 * 3);
            expect(state.wreck.instability,
                `instability rose from ${before} across an absence`).toBeLessThanOrEqual(before);
            expect(state.wreck.instability).toBeGreaterThanOrEqual(0);
        }
        //  WITNESS (D-066 a): a sweep of already-settled hulls would prove nothing.
        expect(sawNonZero).toBeGreaterThan(900);
    }, 30_000);

    it('STRUCTURAL: the only thing that raises it takes no elapsed time at all', () => {
        //  Stated as a signature rather than a comment. `disturb` cannot be given a duration,
        //  so no amount of absence can be fed to it.
        const base = { reached: true, reachedAtGameHours: 0, instability: 10, lastDisturbedAtGameHours: null };
        expect(disturb(base, 5).instability).toBeGreaterThan(base.instability);
        //  ...and settling is monotonically non-increasing for ANY span, including absurd ones.
        for (const span of [0, 0.001, 1, 1000, 1e9]) {
            expect(settleOverGameHours(base, span).instability).toBeLessThanOrEqual(base.instability);
        }
    });

    it('a survivor who leaves a destabilised wreck comes back to a settled one', () => {
        const s = fresh();
        s.wreck = { ...s.wreck, instability: TUNE.wreckInstabilityMax };
        const { state } = reconcile(s, 86400);
        expect(state.wreck.instability).toBe(0);
    });

    it('...and no absence can hurt them for it — health is untouched by the hull', () => {
        const wrecked = fresh();
        wrecked.wreck = { ...wrecked.wreck, instability: TUNE.wreckInstabilityMax };
        const calm = fresh();
        wrecked.gameHoursElapsed = 0; calm.gameHoursElapsed = 0;
        const a = reconcile(wrecked, 400).state;
        const b = reconcile(calm, 400).state;
        expect(a.health).toBe(b.health);
    });
});

// ---------------------------------------------------------------------------
describe('the save', () => {
    it('MIGRATION v23 -> v24: the wreck MERGES, the salvage does not', () => {
        const old = fresh() as unknown as Record<string, unknown>;
        old.nodes = (old.nodes as GameState['nodes']).filter((n) => n.kind !== 'wreckpart');
        const inv = { ...(old.inventory as GameState['inventory']) } as Record<string, unknown>;
        for (const k of WRECK_ERA) delete inv[k];
        old.inventory = inv;
        delete (old.wreck as Record<string, unknown>).instability;

        const loaded = deserialize(JSON.stringify({
            schemaVersion: 23, savedAtMs: 1_700_000_000_000, state: { ...old, schemaVersion: 23 },
        }));
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);

        //  MERGES: the wreck has been in that water since before anyone washed ashore.
        const parts = loaded!.state.nodes.filter((n) => n.kind === 'wreckpart');
        expect(parts.length).toBe(WRECK_PART_IDS.length);
        //  DOES NOT: stock is a fact about a body, and crediting metal nobody crossed for
        //  would hand over the entire point of the crossing.
        for (const kind of WRECK_ERA) expect(loaded!.state.inventory[kind]).toBe(0);
        expect(loaded!.state.wreck.instability).toBe(0);
    });

    it('an existing save is not given a second set of wreck parts', () => {
        const cur = fresh();
        const loaded = deserialize(JSON.stringify({
            schemaVersion: 23, savedAtMs: 1_700_000_000_000, state: { ...cur, schemaVersion: 23 },
        }));
        expect(loaded!.state.nodes.filter((n) => n.kind === 'wreckpart').length)
            .toBe(WRECK_PART_IDS.length);
    });
});
