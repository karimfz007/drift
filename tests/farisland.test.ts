/**
 * THE FAR ISLAND, TRACES-FIRST (the curiosity promise, made land).
 *
 * Four claims:
 *   1. It EXISTS as real land, with a real shore, and costs no new water rules to have one.
 *   2. It is REACHABLE — by raft, and provably NOT by swimming.
 *   3. Its traces enter through the SHIPPED found-content channel at the journal's rung, and
 *      never one higher: reading is not doing, for a stranger exactly as for a predecessor.
 *   4. D-011 holds — a trace cannot act, so absence can neither harm nor strand.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { ladderFor } from '../src/brain/ladder';
import { closeSurvivor } from '../src/brain/succession';
import { deserialize } from '../src/brain/save';
import {
    freshTraces, hasRead, readTrace, readingFor, traceSites, traceSuggests,
    traceWithinReach, tracesRead,
} from '../src/brain/traces';
import { waterZoneAt } from '../src/brain/water';
import { namesAFinishedAnswer } from '../src/brain/affordance';
import { SCHEMA_VERSION } from '../src/brain/types';
import {
    FAR_ISLAND, SURF_LINE_RADIUS, TRACE_SITES, WORLD, WRECK,
    groundHeight, isDryLand, surfaceHeightAt, waterDepthAt,
} from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { realSecondsPerGameHour } from '../src/brain/clock';
import { fullBody } from './_baseline';
import type { GameState } from '../src/brain/types';

function fresh(): GameState {
    return fullBody(createInitialState(1_700_000_000_000));
}

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ---------------------------------------------------------------------------
describe('it EXISTS — real land, with a real shore, for free', () => {
    it('its centre is dry ground well above the sea', () => {
        expect(isDryLand(FAR_ISLAND.x, FAR_ISLAND.y)).toBe(true);
        expect(groundHeight(FAR_ISLAND.x, FAR_ISLAND.y)).toBeGreaterThan(WORLD.seaLevel + 3);
    });

    it('and open water between here and there is genuinely open', () => {
        //  Halfway out on the bearing: must be sea, or the two islands have merged into one
        //  landmass and the crossing has quietly stopped existing.
        const midX = (FAR_ISLAND.x + WRECK.x) / 2;
        const midY = (SURF_LINE_RADIUS + FAR_ISLAND.y - FAR_ISLAND.radius) / 2;
        expect(waterZoneAt(midX, midY)).toBe('swimming');
        expect(waterZoneAt(WRECK.x, WRECK.y), 'the wreck must still float in open water').toBe('swimming');
    });

    it('WITNESS: it has its own dry / wading / swimming bands, from the shipped rules', () => {
        //  The payoff of deriving everything from `groundHeight`: a new landmass gets the whole
        //  Maritime Slice with no new rule. Walk a radial out from its centre and all three
        //  zones must appear, in order.
        const seen = [];
        let last = '';
        for (let d = 0; d <= FAR_ISLAND.radius + 40; d += 0.5) {
            const z = waterZoneAt(FAR_ISLAND.x, FAR_ISLAND.y + d);
            if (z !== last) { seen.push(z); last = z; }
        }
        expect(seen).toEqual(['dry', 'wading', 'swimming']);
    });

    it('...and floating objects there aim at the waterline, like everywhere else', () => {
        const offshore = FAR_ISLAND.y + FAR_ISLAND.radius + 25;
        expect(waterDepthAt(FAR_ISLAND.x, offshore)).toBeGreaterThan(0);
        expect(surfaceHeightAt(FAR_ISLAND.x, offshore)).toBe(WORLD.seaLevel);
    });

    it('HOME IS UNTOUCHED — not one metre of Spawn Island moved', () => {
        //  A second landmass must not perturb the first. `farIslandHeight` returns -Infinity
        //  outside its own radius and `Math.max` does the rest, but that is a claim to prove.
        for (let x = -120; x <= 120; x += 4) {
            for (let z = -120; z <= 120; z += 4) {
                if (Math.hypot(x, z) >= WORLD.islandRadius) continue;
                expect(Number.isFinite(groundHeight(x, z))).toBe(true);
            }
        }
        //  The shore, the wreck's water and the spawn point specifically.
        expect(isDryLand(0, SURF_LINE_RADIUS - 1)).toBe(true);
        expect(isDryLand(0, SURF_LINE_RADIUS + 1)).toBe(false);
        expect(isDryLand(0, 104)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
describe('it is REACHABLE — by raft, and provably not by swimming', () => {
    const openWaterM = (FAR_ISLAND.y - FAR_ISLAND.radius) - SURF_LINE_RADIUS;

    it('it is genuinely far — beyond the wreck, on the same bearing', () => {
        expect(openWaterM).toBeGreaterThan(200);
        expect(FAR_ISLAND.y).toBeGreaterThan(WRECK.y);
    });

    it('SWIMMING THERE IS IMPOSSIBLE, from a full reserve, one way', () => {
        //  The first place in the game that is raft-only. If this ever becomes swimmable the
        //  raft has stopped being the answer and the crossing has stopped being a decision.
        const swimSpeed = TUNE.walkSpeedMps * TUNE.swimSpeedMultiplier;
        const gameHours = TUNE.energyMax / TUNE.swimEnergyDrainPerGameHour;
        const metres = swimSpeed * gameHours * realSecondsPerGameHour;
        expect(metres).toBeLessThan(openWaterM);
    });

    it('...and the raft makes it an affordable journey rather than a gamble', () => {
        const raftSpeed = TUNE.walkSpeedMps * TUNE.raftSpeedMultiplier;
        const seconds = openWaterM / raftSpeed;
        const gameHours = seconds / realSecondsPerGameHour;
        const energy = TUNE.raftEnergyDrainPerGameHour * gameHours;
        //  Comfortably affordable one way, so what the trip actually costs is TIME and
        //  provisioning rather than a race against the reserve.
        expect(energy).toBeLessThan(TUNE.energyMax / 3);
        //  ...but still a real passage, not a hop.
        expect(seconds).toBeGreaterThan(120);
    });
});

// ---------------------------------------------------------------------------
describe('the traces — the shipped channel, at the journal\'s rung and no higher', () => {
    const camp = TRACE_SITES.find((t) => t.topic === 'raft')!;

    function atSite(s: GameState, id: string): GameState {
        const site = TRACE_SITES.find((t) => t.id === id)!;
        s.player.x = site.x;
        s.player.y = site.y;
        return s;
    }

    it('there are three, all on the far island, all on dry ground', () => {
        expect(TRACE_SITES.length).toBe(3);
        for (const t of TRACE_SITES) {
            expect(Math.hypot(t.x - FAR_ISLAND.x, t.y - FAR_ISLAND.y),
                `${t.id} is not on the island`).toBeLessThan(FAR_ISLAND.radius);
            expect(isDryLand(t.x, t.y), `${t.id} is in the water`).toBe(true);
        }
    });

    it('...and they are SPREAD, so finding them means crossing the island', () => {
        let closest = Infinity;
        for (let i = 0; i < TRACE_SITES.length; i++) {
            for (let j = i + 1; j < TRACE_SITES.length; j++) {
                closest = Math.min(closest, Math.hypot(
                    TRACE_SITES[i].x - TRACE_SITES[j].x, TRACE_SITES[i].y - TRACE_SITES[j].y));
            }
        }
        expect(closest).toBeGreaterThan(TUNE.interactRadiusM * 8);
    });

    it('a survivor who has not read it suspects nothing', () => {
        const s = fresh();
        expect(traceSuggests(s, 'raft')).toBe(false);
        //  Standing on it is not reading it.
        atSite(s, camp.id);
        expect(traceSuggests(s, 'raft')).toBe(false);
        expect(readingFor(s, camp.id)?.note, 'the note must not be readable before it is read').toBeNull();
    });

    it('reading it grants EXACTLY `conceptually-suspected` — never `demonstrated`', () => {
        const s = atSite(fresh(), camp.id);
        expect(ladderFor(s, 'raft')).toBe('physically-possible');
        expect(readTrace(s, camp.id).ok).toBe(true);
        expect(traceSuggests(s, 'raft')).toBe(true);
        //  THE LINE. A stranger's note is a stranger's hands: it says the thing is possible and
        //  that there is a wrong way to do it, and it stops there.
        expect(ladderFor(s, 'raft')).toBe('conceptually-suspected');
    });

    it('the note never instructs — the same guard the inspection layer keeps', () => {
        for (const t of TRACE_SITES) {
            expect(namesAFinishedAnswer(t.note), `${t.id}'s note instructs`).toBe(false);
            expect(namesAFinishedAnswer(t.sight), `${t.id}'s sight line instructs`).toBe(false);
        }
    });

    it('it hands over what was left, ONCE', () => {
        const s = atSite(fresh(), 'tr-cache');
        const before = { ...s.inventory };
        const first = readTrace(s, 'tr-cache');
        expect(first.ok).toBe(true);
        expect(Object.keys(first.gained).length).toBeGreaterThan(0);
        expect(s.inventory.metal).toBeGreaterThan(before.metal);

        const after = { ...s.inventory };
        const second = readTrace(s, 'tr-cache');
        expect(second.ok, 'a trace is a thing a person left, not a respawning node').toBe(false);
        expect(s.inventory).toEqual(after);
    });

    it('reach is the same radius every object in this game uses', () => {
        const s = fresh();
        s.player.x = camp.x; s.player.y = camp.y;
        expect(traceWithinReach(s)?.id).toBe(camp.id);
        s.player.y = camp.y + TUNE.interactRadiusM + 3;
        expect(traceWithinReach(s)).toBeNull();
    });

    it('having READ is personal — it dies with the survivor, the notes do not', () => {
        const s = atSite(fresh(), camp.id);
        readTrace(s, camp.id);
        expect(tracesRead(s).length).toBe(1);

        const { next } = closeSurvivor(s, 'the cold');
        //  The successor must cross and look for themselves. What is gone is having
        //  understood it, not the note.
        expect(next.traces.read).toEqual([]);
        expect(hasRead(next, camp.id)).toBe(false);
        expect(traceSuggests(next, 'raft')).toBe(false);
        expect(traceSites().length, 'the notes are still out there').toBe(3);
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — a trace cannot act, so absence can neither harm nor strand', () => {
    it('PROPERTY: any body, any elapsed, any set of traces read — nobody dies', () => {
        const random = rng(20260806);
        let withTraces = 0;
        for (let i = 0; i < 1200; i++) {
            const s = createInitialState(0);
            s.warmth = random() * TUNE.warmthMax;
            s.thirst = random() * TUNE.thirstMax;
            s.hunger = random() * TUNE.hungerMax;
            s.health = 1 + random() * (TUNE.healthMax - 1);
            s.energy = random() * TUNE.energyMax;
            s.gameHoursElapsed = random() * 240;
            //  On the far island, in its water, or at home — all three.
            s.player.x = FAR_ISLAND.x + (random() - 0.5) * 200;
            s.player.y = FAR_ISLAND.y + (random() - 0.5) * 200;
            s.traces = { read: TRACE_SITES.filter(() => random() < 0.5).map((t) => t.id) };
            if (s.traces.read.length > 0) withTraces++;
            const { state } = reconcile(s, 60 + random() * 86400 * 3);
            expect(state.health, 'died during an absence on the far island').toBeGreaterThan(0);
        }
        //  WITNESS (D-066 a): a sweep where nothing was ever read proves nothing about traces.
        expect(withTraces).toBeGreaterThan(800);
    }, 30_000);

    it('STRUCTURAL: reconcile does not touch trace state at all', () => {
        const s = fresh();
        s.traces = { read: ['tr-camp'] };
        const { state } = reconcile(s, 86400 * 3);
        expect(state.traces.read).toEqual(['tr-camp']);
    });

    it('...and an absence can never make a read trace UNREAD — no lost progress', () => {
        const s = fresh();
        s.traces = { read: TRACE_SITES.map((t) => t.id) };
        const { state } = reconcile(s, 86400 * 7);
        expect(state.traces.read.length).toBe(3);
    });

    it('NO UNANSWERABLE STATE: every site is standable-on and re-readable state is stable', () => {
        //  A trace you cannot reach would be a promise the world refuses to keep. Each site
        //  sits on dry ground (asserted above) and reading it only ever adds an id.
        const s = fresh();
        for (const t of TRACE_SITES) {
            s.player.x = t.x; s.player.y = t.y;
            expect(traceWithinReach(s)?.id).toBe(t.id);
        }
        expect(freshTraces()).toEqual({ read: [] });
    });
});

// ---------------------------------------------------------------------------
describe('the save', () => {
    it('MIGRATION v24 -> v25: the island appears, what was learned there does not', () => {
        const old = fresh() as unknown as Record<string, unknown>;
        delete old.traces;
        const loaded = deserialize(JSON.stringify({
            schemaVersion: 24, savedAtMs: 1_700_000_000_000, state: { ...old, schemaVersion: 24 },
        }));
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);
        //  Read nothing: crossing 296 m of open water to find a stranger's note is an
        //  achievement, not a fact about the world.
        expect(loaded!.state.traces.read).toEqual([]);
        //  ...but the island and its sites are simply there, stored in no save.
        expect(isDryLand(FAR_ISLAND.x, FAR_ISLAND.y)).toBe(true);
        expect(TRACE_SITES.length).toBe(3);
    });

    it('an existing reader keeps what they read', () => {
        const cur = fresh();
        cur.traces = { read: ['tr-marker'] };
        const loaded = deserialize(JSON.stringify({
            schemaVersion: 24, savedAtMs: 1_700_000_000_000, state: { ...cur, schemaVersion: 24 },
        }));
        expect(loaded!.state.traces.read).toEqual(['tr-marker']);
    });
});
