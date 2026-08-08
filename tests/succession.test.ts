/**
 * THE CASTAWAY CYCLE — permadeath, succession, and the line that must never be crossed.
 *
 * The load-bearing test in this file is `every personal field is at its fresh value` under
 * PROPERTY, not example. An example test proves that the fields someone remembered to check
 * are reset; the property proves that the fields nobody remembered are reset too, and the
 * second is the one that will actually fire in two years when a new personal field is added
 * to `GameState` and nobody thinks about death while adding it.
 *
 * v2.5 §11 names inherited undocumented knowledge as an automatic whole-game failure
 * condition. So these are not regression tests in the ordinary sense — they are the thing
 * standing between the game and that condition, and they are written to fail loudly.
 */
import { describe, expect, it } from 'vitest';
import { closeSurvivor, arrivalProfile, evidenceOnArrival, survivorsLost, PERSISTS_THROUGH_DEATH, DIES_WITH_THE_SURVIVOR } from '../src/brain/succession';
import { createInitialState } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { atLeast, ladderFor } from '../src/brain/ladder';
import { TUNE } from '../src/data/tune';
import { SPAWN } from '../src/data/world';
import type { Blueprint, GameState } from '../src/brain/types';

//  ONE GAME HOUR, IN REAL SECONDS. `reconcile` takes REAL seconds, and at
//  `dayLengthRealMinutes: 60` a game hour is 150 of them, not 3600. Writing 3600 here (a
//  real hour) silently turns a "12-hour night" into a twelve-DAY absence, which lands on the
//  offline floors and measures something else entirely. Derived from TUNE, never typed out,
//  so a change to day length cannot quietly re-point every measurement in this file.
const GAME_HOUR = (TUNE.dayLengthRealMinutes * 60) / TUNE.gameHoursPerDay;
const REAL_DAY = 24 * 3600;

/**
 * PLAY THE NIGHT, DO NOT SKIP IT. `reconcile` classifies any span longer than
 * `morningReportMinRealMinutes` as an ABSENCE, and an absence is governed by D-011: floors
 * apply and health cannot fall. Handing it the whole night in one call therefore measures the
 * OFFLINE path — where by law nothing bad happens — and reports a comfortable first night no
 * matter how brutal the online one is.
 *
 * This steps the night the way `Session.tick` does, in slices well under that threshold, so
 * what comes out is what a player awake at their phone would actually live through. The two
 * paths are supposed to differ here; measuring the wrong one is how a first night gets
 * certified as survivable when it is not, or as deadly when it is not.
 */
function playThrough(start: GameState, gameHours: number): GameState {
    const sliceReal = 60;                                   // one real minute per step
    const steps = Math.round((gameHours * GAME_HOUR) / sliceReal);
    let s = start;
    for (let i = 0; i < steps; i += 1) s = reconcile(s, sliceReal).state;
    return s;
}

/** A survivor who got somewhere: knowledge, tools, structures, a worked-over island. */
function accomplished(): GameState {
    const s = createInitialState(0);
    s.gameHoursElapsed = 96;
    s.survivorStartedAtGameHours = 0;
    s.inventory = { wood: 30, stone: 22, fiber: 15, berries: 4, coconut: 2, shellfish: 3, sharpblade: 2, meat: 0, fish: 0, metal: 0, wiring: 0, glass: 0, medicine: 0 };
    s.tools = { axe: true, spear: false, backpack: true, flask: true, flaskSips: 3, stoneHammer: true, axeGrade: 'refined', fishingLine: true, net: true };
    s.torch = { owned: true, lit: true, fuelGameHoursRemaining: 4, grade: 'refined' };
    s.skills.woodcutting.level = 5;
    s.skills.foraging.level = 4;
    s.shelter = { built: true, x: 12, y: -8, durability: 64, grade: 'refined', defects: { lashing: 0, thatch: 0, footing: 0 } };
    s.storage = { built: true, x: 18, y: -4, durability: 77, stored: { wood: 50, stone: 40, fiber: 25 } };
    s.fire = { built: true, fuel: 6, x: 10, y: -10 };
    s.nodes[0].available = false;
    s.nodes[0].depletedAtGameHours = 40;
    s.nodes[1].available = false;
    s.salvageSpawnCount = 7;
    s.knowledge.nullPairs = ['wood|stone', 'fiber|stone'];
    s.knowledge.domains.harvestingFabrication.technique = 61;
    s.knowledge.domains.harvestingFabrication.understanding = 44;
    s.capacities.endurance = 55;
    s.confidence.lastPractisedGameHours = { shelter: 90 };
    s.matterWear.wood = 3;
    s.blueprints = [{
        id: 'bp-1', name: 'A lean-to', recipeId: 'shelter', inputs: ['wood', 'fiber'], version: 1,
        workmanship: 'refined', author: 'castaway', discoveredAtGameHours: 20,
    } as Blueprint];
    s.experimentCount = 11;
    s.settings.controlMode = 'joystick';
    return s;
}

describe('PERMADEATH — the interim respawn is gone, not deprecated', () => {
    it('nothing in the brain exports a resurrection path any more', async () => {
        //  Structural, and deliberately so. A test that only checked BEHAVIOUR would stay
        //  green if `respawn` came back and simply was not called yet — and "not called yet"
        //  is precisely how a retired mechanic returns.
        const state = await import('../src/brain/state');
        const body = await import('../src/brain/body');
        expect(Object.keys(state)).not.toContain('respawn');
        expect(Object.keys(state)).not.toContain('lastRespawnMessage');
        expect(Object.keys(body)).not.toContain('respawnMessageFor');
        expect(Object.keys(body)).not.toContain('deathResourceLoss');
    });

    it('the tunables that priced the old mercy are gone too', () => {
        //  A tunable with no caller is one careless import away from reviving the mechanic.
        expect(TUNE).not.toHaveProperty('respawnVitalFraction');
        expect(TUNE).not.toHaveProperty('respawnHealthFraction');
    });

    it('closeSurvivor never mutates the state it is given — the commit is atomic', () => {
        //  Law 29. If this function mutated as it went, a crash mid-call would leave a
        //  survivor half-dead on an island half-inherited, and no recovery could tell which.
        const before = accomplished();
        const snapshot = JSON.parse(JSON.stringify(before));
        closeSurvivor(before, 'thirst');
        expect(JSON.parse(JSON.stringify(before))).toEqual(snapshot);
    });
});

describe('MATTER, NOT MEMORY — the property, not the examples (D-069)', () => {
    /**
     * THE FAILURE THIS CATCHES. Someone adds `GameState.techniqueNotes` in 2027, resets the
     * fields they were thinking about, and ships. Every example test passes. This one does
     * not, because it does not know or care what the personal fields are called — it asserts
     * that anything NOT on the persists list came back at its fresh value.
     */
    const PERSISTING_FIELDS = new Set([
        //  The island and the marks on it.
        'fire', 'shelter', 'storage', 'nodes', 'gameHoursElapsed',
        //  DROP 1 — the boars. Classified here because the property test DEMANDED it the
        //  moment the field appeared, which is the guard working exactly as designed: a new
        //  GameState field cannot be added without someone deciding which side of the v13
        //  §18 table it falls on. They are a fact about the PLACE — they watched the last
        //  survivor die and they are still out there.
        'boars',
        'salvageSpawnCount', 'nextSalvageSpawnAtGameHours', 'journal',
        //  The record of the dead, and the current survivor's own clock.
        'memorial', 'survivorStartedAtGameHours', 'lastDeathCause',
        //  Save-level bookkeeping and the human holding the phone.
        'schemaVersion', 'startedAtMs', 'lastSeenMs', 'settings', 'trace',
        //  The body, which lands on the authored arrival profile rather than a fresh one.
        'warmth', 'thirst', 'hunger', 'energy', 'health', 'wet',
    ]);

    it('EVERY field not on the persists list is reset to its fresh value', () => {
        const dead = accomplished();
        const { next } = closeSurvivor(dead, 'the cold');
        const fresh = createInitialState(dead.startedAtMs);

        const checked: string[] = [];
        for (const key of Object.keys(fresh) as Array<keyof GameState>) {
            if (PERSISTING_FIELDS.has(key)) continue;
            checked.push(key);
            expect(next[key], `${key} survived a death it had no right to survive`)
                .toEqual(fresh[key]);
        }
        //  Guard the guard: if GameState is ever refactored such that this loop checks
        //  nothing, the suite must fail rather than pass vacuously.
        expect(checked.length, 'the property checked no fields at all').toBeGreaterThan(5);
        expect(checked).toContain('blueprints');
        expect(checked).toContain('knowledge');
        expect(checked).toContain('skills');
        expect(checked).toContain('capacities');
        expect(checked).toContain('inventory');
        expect(checked).toContain('tools');
    });

    it('...and the persists list itself is not silently empty', () => {
        expect(PERSISTS_THROUGH_DEATH.length).toBeGreaterThan(4);
        expect(DIES_WITH_THE_SURVIVOR.length).toBeGreaterThan(4);
    });

    it('a successor arrives BELOW demonstrated for everything the last one mastered', () => {
        const dead = accomplished();
        expect(atLeast(ladderFor(dead, 'shelter'), 'demonstrated')).toBe(true);
        const { next } = closeSurvivor(dead, 'the cold');
        //  The shelter is still standing, so they are at `found-intact` — two rungs below
        //  demonstrated. They can SEE it works. They cannot build one.
        expect(ladderFor(next, 'shelter')).toBe('found-intact');
        expect(next.blueprints).toEqual([]);
    });

    it('the inherited rung dies with the evidence — a collapsed shelter takes it away', () => {
        const dead = accomplished();
        const { next } = closeSurvivor(dead, 'the cold');
        expect(ladderFor(next, 'shelter')).toBe('found-intact');
        next.shelter = { ...next.shelter, built: false };
        expect(ladderFor(next, 'shelter')).toBe('physically-possible');
    });

    it('repeated deaths never accumulate knowledge — ten successions, still nothing inherited', () => {
        //  The drift this catches: a per-death leak so small no single death shows it.
        let s = accomplished();
        for (let i = 0; i < 10; i += 1) {
            s.gameHoursElapsed += 24;
            s = closeSurvivor(s, 'thirst').next;
            expect(s.blueprints).toEqual([]);
            expect(s.knowledge.nullPairs).toEqual([]);
            expect(s.skills.woodcutting.level).toBe(1);
        }
        expect(survivorsLost(s)).toBe(10);
        expect(s.memorial.map((m) => m.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});

describe('THE ISLAND PERSISTS — arrival as archaeology', () => {
    it('every physical thing survives, down to the durability worn into it', () => {
        const dead = accomplished();
        const { next } = closeSurvivor(dead, 'thirst');
        expect(next.shelter).toEqual(dead.shelter);
        expect(next.storage).toEqual(dead.storage);
        expect(next.fire).toEqual(dead.fire);
        expect(next.salvageSpawnCount).toBe(7);
        expect(next.nodes[0].available).toBe(false);
        expect(next.nodes[0].depletedAtGameHours).toBe(40);
        expect(next.gameHoursElapsed).toBe(96);
    });

    it('the successor lands at the sea, and their own clock starts at that moment', () => {
        const dead = accomplished();
        const { next } = closeSurvivor(dead, 'thirst');
        expect(next.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
        expect(next.survivorStartedAtGameHours).toBe(96);
        //  ...so "how long have I lasted" is 0 for them while the island is four days old.
        expect(next.gameHoursElapsed - next.survivorStartedAtGameHours).toBe(0);
    });

    it('the player\'s own settings are not punished for the character\'s death', () => {
        const dead = accomplished();
        expect(dead.settings.controlMode).toBe('joystick');
        expect(closeSurvivor(dead, 'thirst').next.settings.controlMode).toBe('joystick');
    });

    it('the island tells the newcomer what it can, and only what is actually there', () => {
        const dead = accomplished();
        const seen = evidenceOnArrival(dead);
        expect(seen.join(' ')).toMatch(/shelter/i);
        expect(seen.join(' ')).toMatch(/box/i);

        const bare = createInitialState(0);
        expect(evidenceOnArrival(bare)).toEqual([]);
    });
});

describe('THE CRASH-ARRIVAL PROFILE — authored, survivable, legible (Laws 115-117)', () => {
    it('is never six full bars, and never zero either', () => {
        const p = arrivalProfile();
        expect(p.warmth).toBeLessThan(TUNE.warmthMax);
        expect(p.thirst).toBeLessThan(TUNE.thirstMax);
        expect(p.hunger).toBeLessThan(TUNE.hungerMax);
        expect(p.energy).toBeLessThan(TUNE.energyMax);
        expect(p.health).toBeLessThan(TUNE.healthMax);
        expect(p.wet).toBeGreaterThan(0);
        for (const v of [p.warmth, p.thirst, p.hunger, p.energy, p.health]) {
            expect(v).toBeGreaterThan(0);
        }
    });

    it('is AUTHORED, not rolled — identical every time it is asked for', () => {
        //  A random arrival is a coin flip with the run on it. Called a hundred times, the
        //  profile must be the same profile; anything else has smuggled in a die.
        const first = arrivalProfile();
        for (let i = 0; i < 100; i += 1) expect(arrivalProfile()).toEqual(first);
    });

    it('is LEGIBLE — it says in one sentence what is wrong with you', () => {
        expect(arrivalProfile().condition.length).toBeGreaterThan(20);
    });

    it('does NOT start in the alarm band — hurt is not the same as dying', () => {
        //  Arriving below the low-health hint would put a new survivor into a permanent
        //  red-bar state before they had done anything. That is cruelty, not authorship.
        expect(arrivalProfile().health).toBeGreaterThan(TUNE.healthLowHintAt);
    });
});

describe('THE FIRST NIGHT, MEASURED — the envelope, not my arithmetic (rail D)', () => {
    /**
     * The 7m lesson, applied. The arrival fractions were DERIVED from the drain rates, but a
     * derivation on paper is a hypothesis. These run a real 12-hour night through the real
     * `reconcile` from the real profile and measure the outcome. If any drain rate in TUNE
     * moves, this fails here — which is the entire reason to measure rather than assert.
     */
    function arrived(): GameState {
        const s = createInitialState(0);
        const p = arrivalProfile();
        return { ...s, warmth: p.warmth, thirst: p.thirst, hunger: p.hunger,
            energy: p.energy, health: p.health, wet: p.wet };
    }

    it('a night with NO fire and NO cover ends ALIVE — but it genuinely costs', () => {
        const state = playThrough(arrived(), 12);
        expect(state.health, 'the first night must be survivable').toBeGreaterThan(0);
        expect(state.health, 'the first night must COST something')
            .toBeLessThan(TUNE.healthMax * TUNE.arrivalHealthFraction);
    });

    it('a night WITH a fire ends better than the same night without one', () => {
        //  The COMPARISON is the claim. An absolute threshold would drift the moment a rate
        //  changed; "the fire was worth building" is the property that must hold forever.
        const withFire = arrived();
        withFire.fire = { built: true, fuel: 200, x: withFire.player.x, y: withFire.player.y };
        const cold = playThrough(arrived(), 12);
        const warm = playThrough(withFire, 12);
        expect(warm.warmth).toBeGreaterThan(cold.warmth);
        expect(warm.health).toBeGreaterThanOrEqual(cold.health);
        expect(warm.health).toBeGreaterThan(TUNE.healthLowHintAt);
    });

    it('thirst crosses into the visible low band during the night, and never empties', () => {
        //  The derivation's own claim, measured: thirst is the morning's first job, and it
        //  is a job rather than a death.
        const state = playThrough(arrived(), 12);
        expect(state.thirst).toBeLessThan(TUNE.thirstLowHintAt);
        expect(state.thirst).toBeGreaterThan(0);
    });

    it('hunger is NOT the first night\'s problem', () => {
        const state = playThrough(arrived(), 12);
        expect(state.hunger).toBeGreaterThan(TUNE.hungerLowHintAt);
    });
});

describe('D-011 RE-PROVEN against permadeath — absence can never kill (item 7)', () => {
    /**
     * The single most dangerous interaction in this slice. D-011 predates permadeath: when
     * dying meant waking up diminished, an offline death would have been unfair. Now it would
     * be UNRECOVERABLE — a player who closes the app and comes back to a stranger on the
     * beach has had their run taken by absence. Same law, far higher stakes, so it is
     * re-proven here directly against the new model rather than assumed to still hold.
     */
    it('no absence of any length kills the living survivor — swept, not sampled', () => {
        for (const days of [1, 3, 7, 30, 90, 365]) {
            const s = createInitialState(0);
            s.thirst = 1; s.hunger = 1; s.warmth = 0; s.health = 1; s.wet = TUNE.wetMax;
            const { state, result } = reconcile(s, days * REAL_DAY);
            expect(result.diedDuringSpan, `died during a ${days}-day absence`).toBe(false);
            expect(state.health, `health hit zero over ${days} days`).toBeGreaterThan(0);
            //  The floor is a floor for DRIFT, not a promise of recovery: a survivor who
            //  went offline already below it stays where they were rather than being healed
            //  by absence. So the honest assertion is that absence never took anything.
            expect(state.health, `absence COST health over ${days} days`)
                .toBeGreaterThanOrEqual(1);
        }
    });

    it('an absence never adds to the memorial — nobody dies while you are away', () => {
        const s = accomplished();
        s.thirst = 0; s.hunger = 0; s.warmth = 0; s.health = 1;
        const { state } = reconcile(s, 200 * REAL_DAY);
        expect(state.memorial).toHaveLength(0);
        expect(state.trace.deaths).toBe(0);
    });

    it('absence never erases the island, the memorial, or the journal', () => {
        //  "Absence never erases" applied to everything Slice 3 added. A player who is away
        //  for a year must find the graveyard and the notes exactly as they left them.
        const s = accomplished();
        s.memorial = [{ ordinal: 1, cause: 'thirst', diedAtGameHours: 10, livedGameHours: 10,
            knewRecipes: ['shelter'], leftBehind: ['a shelter'] }];
        s.journal = { exists: true, x: 3, y: 4, carried: false, condition: 0.9,
            entries: [{ author: 1, writtenAtGameHours: 9, topic: 'shelter', text: 'lashings' }],
            lastWrittenAtGameHours: 9 };
        const { state } = reconcile(s, 365 * REAL_DAY);
        expect(state.memorial).toHaveLength(1);
        expect(state.journal.entries).toHaveLength(1);
        expect(state.shelter.built).toBe(true);
        expect(state.storage.stored.wood).toBe(50);
    });

    it('the memorial is MONOTONIC — it only ever grows, under any operation', () => {
        //  The monotonicity family, extended to the new brain state. A memorial that could
        //  shrink would mean a death could be un-recorded, which is the same failure as an
        //  offline death in the opposite direction.
        let s = accomplished();
        let seen = 0;
        for (let i = 0; i < 6; i += 1) {
            s = reconcile(s, 6 * GAME_HOUR).state;
            expect(s.memorial.length).toBeGreaterThanOrEqual(seen);
            s = closeSurvivor(s, 'thirst').next;
            expect(s.memorial.length).toBeGreaterThan(seen);
            seen = s.memorial.length;
        }
    });
});
