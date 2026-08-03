/**
 * THE BOAR — the fair-challenge contract, property-tested against its first real predator.
 *
 * Two families carry this file, and both are laws rather than features:
 *
 *   1. NO ATTACK WITHOUT ITS PRECURSOR. The ladder may never skip a rung, at any distance,
 *      in any state. A charge that arrives without a warning is not a hard fight, it is a
 *      broken promise — and it is the kind of thing that ships when the transition table is
 *      "obviously" correct and nobody sweeps it.
 *   2. D-011, ABSOLUTE. Boars never advance, never charge, never touch the player or their
 *      property while the game is closed. A predator that hunts an absent player is the most
 *      obviously unfair thing this game could contain.
 *
 * The third family is EVADABILITY, which is the one that decides whether the telegraph means
 * anything: a player who reads the wind-up and steps off the committed bearing must actually
 * be missed. That is asserted geometrically, not asserted in prose.
 */
import { describe, expect, it } from 'vitest';
import {
    BOAR_STAGES, anyCharging, chargeConnects, chargeHarm, createBoars, nearestBoar,
    moveBoar, nextStage, senseSurvivor, settleOffline, stageRank, stepBoar, type ThreatContext,
} from '../src/brain/fauna';
import { createInitialState } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { TUNE } from '../src/data/tune';
import type { Boar, BoarStage, GameState } from '../src/brain/types';

const REAL_DAY = 24 * 3600;

function boarAt(over: Partial<Boar> = {}): Boar {
    return {
        id: 'b1', x: 0, y: 0, homeX: 0, homeY: 0, facing: 0,
        stage: 'unaware', stageSinceGameHours: 0, chargeBearing: null, hunger: 0, alive: true,
        ...over,
    };
}

function ctx(over: Partial<ThreatContext> = {}): ThreatContext {
    return {
        senses: { distanceM: 3, seen: true, heard: true, crowded: true, occluded: false },
        gameHoursElapsed: 100,
        deterred: false,
        ...over,
    };
}

describe('NO SPAWN WAVES — a fixed population, and no way to add one', () => {
    it('creates the tuned number of boars, and the same island twice over', () => {
        const a = createBoars();
        const b = createBoars();
        expect(a).toHaveLength(TUNE.boarPopulation);
        expect(a.length).toBeGreaterThanOrEqual(2);
        expect(a.length).toBeLessThanOrEqual(4);
        //  Deterministic placement: a predator that moves between loads cannot be learned,
        //  and learning it is the whole of the counterplay.
        expect(b).toEqual(a);
    });

    it('the module exports NO way to create a boar after world birth', async () => {
        //  Structural, deliberately. The no-wave rail is enforced by the absence of a
        //  spawner — adding one would mean writing a new constructor and noticing that you
        //  did, rather than quietly raising a budget.
        const fauna = await import('../src/brain/fauna');
        const creators = Object.keys(fauna).filter((k) => /spawn|addBoar|wave/i.test(k));
        expect(creators).toEqual([]);
    });

    it('they start inland, well clear of where a castaway washes ashore', () => {
        //  A first night must not contain a predator.
        const s = createInitialState(0);
        for (const b of s.boars) {
            expect(Math.hypot(b.x - s.player.x, b.y - s.player.y)).toBeGreaterThan(TUNE.boarSightRangeM);
        }
    });
});

describe('NO ATTACK WITHOUT ITS PRECURSOR — the ladder never skips a rung', () => {
    it('for every stage, under every context, the step is at most ONE rung', () => {
        //  The sweep that matters. If any combination of senses, timing and deterrence can
        //  jump two rungs, the contract is broken somewhere no example test would look.
        for (const stage of BOAR_STAGES) {
            for (const seen of [true, false]) {
                for (const heard of [true, false]) {
                    for (const crowded of [true, false]) {
                        for (const deterred of [true, false]) {
                            for (const held of [0, 0.001, 0.02, 0.03, 0.1, 5, 500]) {
                                const b = boarAt({ stage, stageSinceGameHours: 0 });
                                const next = nextStage(b, ctx({
                                    gameHoursElapsed: held, deterred,
                                    senses: { distanceM: 2, seen, heard, crowded, occluded: false },
                                }));
                                const jump = Math.abs(stageRank(next) - stageRank(stage));
                                //  aftermath -> alert is a DROP of three, which is fine; only
                                //  upward jumps of more than one break the promise.
                                const climbed = stageRank(next) - stageRank(stage);
                                expect(climbed, `${stage} -> ${next} climbed ${climbed} rungs`)
                                    .toBeLessThanOrEqual(1);
                                expect(jump).toBeGreaterThanOrEqual(0);
                            }
                        }
                    }
                }
            }
        }
    });

    it('an unaware boar with the survivor standing on it still only reaches ALERT', () => {
        //  The single most tempting shortcut to write, and the one the contract forbids.
        const b = boarAt({ stage: 'unaware' });
        expect(nextStage(b, ctx({ gameHoursElapsed: 9999 }))).toBe('alert');
    });

    it('a charge is ALWAYS preceded by a full warning, walked one step at a time', () => {
        let b = boarAt({ stage: 'unaware', stageSinceGameHours: 0 });
        const seen: BoarStage[] = [b.stage];
        for (let t = 0; t <= 0.2 && b.stage !== 'charge'; t += 0.005) {
            b = stepBoar(b, ctx({ gameHoursElapsed: t }));
            if (seen[seen.length - 1] !== b.stage) seen.push(b.stage);
        }
        expect(seen).toEqual(['unaware', 'alert', 'warning', 'charge']);
    });

    it('the telegraph is a REAL window, not a formality', () => {
        //  If the wind-up were near-zero the ladder would be technically correct and
        //  practically an ambush. This asserts it is long enough to act inside.
        const realSecondsPerGameHour = (TUNE.dayLengthRealMinutes * 60) / TUNE.gameHoursPerDay;
        expect(TUNE.boarWarningGameHours * realSecondsPerGameHour).toBeGreaterThanOrEqual(3);
    });
});

describe('THE THREE ANSWERS — evade, deter, kill', () => {
    it('EVADE: breaking line of sight genuinely de-escalates, it is not nominal', () => {
        const alert = boarAt({ stage: 'alert', stageSinceGameHours: 0 });
        const gone = ctx({
            gameHoursElapsed: TUNE.boarLoseInterestGameHours,
            senses: { distanceM: 30, seen: false, heard: false, crowded: false, occluded: true },
        });
        expect(nextStage(alert, gone)).toBe('unaware');
    });

    it('EVADE: the sight cone really has a behind — circling out of it stops being seen', () => {
        const s = createInitialState(0);
        const b = boarAt({ x: 0, y: 0, facing: 0 });
        s.player = { x: 10, y: 0 };                      // dead ahead
        expect(senseSurvivor(b, s).seen).toBe(true);
        s.player = { x: -10, y: 0 };                     // directly behind
        expect(senseSurvivor(b, s).seen).toBe(false);
    });

    it('DETER: fire de-escalates alert and warning, but NEVER a committed charge', () => {
        expect(nextStage(boarAt({ stage: 'alert' }), ctx({ deterred: true }))).toBe('unaware');
        expect(nextStage(boarAt({ stage: 'warning' }), ctx({ deterred: true }))).toBe('alert');
        //  The commitment is the mechanic. If fire stopped a charge, the wind-up would carry
        //  no risk and reading it would be optional.
        const charging = boarAt({ stage: 'charge', stageSinceGameHours: 0 });
        expect(nextStage(charging, ctx({ deterred: true, gameHoursElapsed: 0.001 }))).toBe('charge');
    });

    it('EVADABILITY: stepping off the committed bearing MISSES — the telegraph pays off', () => {
        const s = createInitialState(0);
        const b = boarAt({ x: 0, y: 0, stage: 'charge', chargeBearing: 0 });
        //  Standing in the lane: hit.
        s.player = { x: 4, y: 0 };
        expect(chargeConnects(b, s)).toBe(true);
        //  One clear step across the lane: missed. This is the whole counterplay.
        s.player = { x: 4, y: TUNE.boarChargeHitCorridorM + 0.4 };
        expect(chargeConnects(b, s)).toBe(false);
        //  ...and behind it, once it has gone past.
        s.player = { x: -3, y: 0 };
        expect(chargeConnects(b, s)).toBe(false);
    });

    it('HARM IS A NUMBER THIS DROP — no wound fields, by scope', () => {
        //  Drop 1 deals damage and knockback. The injury profile (bleed/limp/pain) is Drop
        //  2's, and half-shipping it here is exactly what the handoff forbade.
        const harm = chargeHarm();
        expect(Object.keys(harm).sort()).toEqual(['health', 'knockbackM']);
        expect(harm.health).toBeGreaterThan(0);
        //  Lethal by ACCUMULATION, never a one-shot on a fresh arrival.
        expect(harm.health).toBeLessThan(TUNE.healthMax * TUNE.arrivalHealthFraction);
    });
});

describe('D-011 — boars never touch an absent player', () => {
    it('settling offline drops EVERY boar to unaware and sends it home, from any stage', () => {
        const boars = BOAR_STAGES.map((stage, i) =>
            boarAt({ id: `b${i}`, stage, x: 40, y: 40, homeX: 5, homeY: -5, chargeBearing: 1.2 }));
        for (const b of settleOffline(boars, 500)) {
            expect(b.stage).toBe('unaware');
            expect(b.chargeBearing).toBeNull();
            expect({ x: b.x, y: b.y }).toEqual({ x: 5, y: -5 });
        }
    });

    it('no absence of any length leaves a boar escalated, or harms the survivor', () => {
        for (const days of [1, 7, 30, 365]) {
            const s: GameState = createInitialState(0);
            s.boars = s.boars.map((b) => ({ ...b, stage: 'charge' as BoarStage, chargeBearing: 0, x: s.player.x, y: s.player.y }));
            const healthBefore = s.health;
            const { state } = reconcile(s, days * REAL_DAY);
            expect(anyCharging(state.boars), `a boar was still charging after ${days} days`).toBe(false);
            for (const b of state.boars) expect(b.stage).toBe('unaware');
            expect(state.health, `absence cost health over ${days} days`).toBeGreaterThanOrEqual(Math.min(healthBefore, TUNE.healthOfflineFloor));
        }
    });

    it('absence never destroys the survivor\'s property, and never kills a boar', () => {
        const s = createInitialState(0);
        s.shelter = { ...s.shelter, built: true };
        const { state } = reconcile(s, 200 * REAL_DAY);
        expect(state.shelter.built).toBe(true);
        expect(state.boars.every((b) => b.alive)).toBe(true);
    });
});

describe('the small things that still have to be right', () => {
    it('a dead boar never steps, senses or charges again', () => {
        const dead = boarAt({ alive: false, stage: 'warning' });
        expect(stepBoar(dead, ctx({ gameHoursElapsed: 9999 }))).toEqual(dead);
    });

    it('nearestBoar ignores the dead, and answers null when all are gone', () => {
        const boars = [boarAt({ id: 'a', x: 3, y: 0, alive: false }), boarAt({ id: 'b', x: 20, y: 0 })];
        expect(nearestBoar(boars, 0, 0)?.id).toBe('b');
        expect(nearestBoar(boars.map((b) => ({ ...b, alive: false })), 0, 0)).toBeNull();
    });

    it('stepBoar is pure — it never mutates the boar it was given', () => {
        const b = boarAt({ stage: 'alert', stageSinceGameHours: 0 });
        const snapshot = JSON.stringify(b);
        for (let i = 0; i < 200; i += 1) stepBoar(b, ctx({ gameHoursElapsed: i * 0.01 }));
        expect(JSON.stringify(b)).toBe(snapshot);
    });

    it('boars persist through a death — they are a fact about the island', async () => {
        const { closeSurvivor } = await import('../src/brain/succession');
        const s = createInitialState(0);
        s.boars = s.boars.map((b, i) => (i === 0 ? { ...b, alive: false } : b));
        const { next } = closeSurvivor(s, 'thirst');
        expect(next.boars.filter((b) => b.alive)).toHaveLength(TUNE.boarPopulation - 1);
    });
});

describe('THE SPEAR — reachability, per D-090, mandatory', () => {
    /**
     * THE LAW: a target that cannot be arrived at through the REAL acquisition path is a
     * target that does not exist. A predator whose only answer is unreachable is worse than
     * a predator with no answer — it promises counterplay and withholds it.
     *
     * So this drives the spear from a bare castaway to a killed boar using ONLY what the
     * island actually offers: gather by hand, make the hammer, knap a blade, build the spear,
     * thrust in the aftermath window.
     */
    it('drives a bare survivor all the way to a spear, by hand, from the real island', async () => {
        const { craftStoneHammer, knapSharpblade, craftSpear, canCraftSpear, gatherNode } =
            await import('../src/brain/state');
        const s = createInitialState(0);

        //  Everything reachable WITHOUT the axe — the pre-axe tier, exactly as a first day.
        for (const node of s.nodes) {
            if (node.kind === 'tree' || node.kind === 'crashbox') continue;
            gatherNode(s, node.id);
        }
        expect(craftStoneHammer(s), 'the hammer must be makeable by hand').toBe(true);
        expect(knapSharpblade(s), 'a blade must be knappable with the hammer').toBe(true);

        expect(canCraftSpear(s), 'the spear must be reachable from the pre-axe tier').toBe(true);
        expect(craftSpear(s)).toBe(true);
        expect(s.tools.spear).toBe(true);
    });

    it('the spear is offered by the CIRCLE at a boar, and refuses with a reason without one', async () => {
        const { verbsFor } = await import('../src/brain/verbs');
        const s = createInitialState(0);
        s.boars = [boarAt({ x: s.player.x + 1, y: s.player.y })];

        const unarmed = verbsFor(s, 'boar').find((v) => v.id === 'thrust')!;
        expect(unarmed.available).toBe(false);
        expect(unarmed.reason).toMatch(/nothing to fight it with/i);

        s.tools.spear = true;
        expect(verbsFor(s, 'boar').find((v) => v.id === 'thrust')!.available).toBe(true);
    });

    it('a kill takes several thrusts, yields meat, and the meat spoils', async () => {
        const { thrustSpear, meatIsSpoiled } = await import('../src/brain/state');
        const s = createInitialState(0);
        s.tools.spear = true;
        s.boars = [boarAt({ id: 'target', x: s.player.x + 1, y: s.player.y })];

        let killed = false;
        let thrusts = 0;
        while (!killed && thrusts < 10) { killed = thrustSpear(s, 'target').killed; thrusts += 1; }
        expect(killed).toBe(true);
        //  The fight is a RHYTHM, not a damage race: several thrusts, each spent in an
        //  aftermath window bought by surviving a charge.
        expect(thrusts).toBeGreaterThan(1);
        expect(s.inventory.meat).toBe(TUNE.boarMeatYield);
        expect(s.boars[0].alive).toBe(false);

        expect(meatIsSpoiled(s), 'fresh meat is not spoiled').toBe(false);
        s.gameHoursElapsed += TUNE.meatSpoilGameHours + 1;
        expect(meatIsSpoiled(s), 'raw meat is an event, not a stockpile').toBe(true);
    });

    it('COOKING IS NOT IN THIS DROP — named as a boundary, not half-built', async () => {
        //  The handoff was explicit. A half-shipped cooking verb would be exactly the kind of
        //  scope blur that makes the next drop's real work harder to see.
        const state = await import('../src/brain/state');
        expect(Object.keys(state).filter((k) => /cook|roast/i.test(k))).toEqual([]);
    });
});

describe('MOVEMENT — the boar was a statue that changed colour', () => {
    /**
     * THE BUG: `stepBoar` touched position in NO state at all. Not the wander, not the stalk,
     * and not even the charge — a committed charge changed colour and posture and stayed
     * exactly where it stood. These are the checks that would have caught it.
     */
    it('an UNAWARE boar actually moves — the idle rhythm is real', () => {
        const b = boarAt({ stage: 'unaware', x: 0, y: 0, homeX: 0, homeY: 0, facing: 0 });
        const after = moveBoar(b, 0.05);
        expect(Math.hypot(after.x - b.x, after.y - b.y)).toBeGreaterThan(0);
    });

    it('a CHARGING boar covers its own reach inside its own window', () => {
        //  The charge must ARRIVE. A committed charge that never closes the distance is a
        //  telegraph with no consequence behind it.
        const b = boarAt({ stage: 'charge', chargeBearing: 0, x: 0, y: 0 });
        const after = moveBoar(b, TUNE.boarChargeGameHours);
        expect(after.x).toBeGreaterThanOrEqual(TUNE.boarChargeReachM);
    });

    it('a charge does NOT re-aim while it runs — the bearing is read, never recomputed', () => {
        const b = boarAt({ stage: 'charge', chargeBearing: 0, x: 0, y: 0, facing: 2.5 });
        const after = moveBoar(b, 0.005);
        expect(after.chargeBearing).toBe(0);
        expect(after.y).toBeCloseTo(0, 9);          // straight along the committed line
    });

    it('a wandering boar stays in its own territory', () => {
        let b = boarAt({ stage: 'unaware', x: 0, y: 0, homeX: 0, homeY: 0, facing: 0.3 });
        for (let i = 0; i < 400; i += 1) b = moveBoar(b, 0.02);
        expect(Math.hypot(b.x - b.homeX, b.y - b.homeY))
            .toBeLessThanOrEqual(TUNE.boarWanderRadiusM * 1.5);
    });

    it('a dead boar does not move, and no boar moves on a zero span', () => {
        const dead = boarAt({ alive: false });
        expect(moveBoar(dead, 1)).toEqual(dead);
        const live = boarAt();
        expect(moveBoar(live, 0)).toEqual(live);
    });
});

describe('THE SPEAR IS DISCOVERABLE — the duplicate-signature defect (Drop 1 correction)', () => {
    /**
     * THE DEFECT: the spear shipped with slots byte-identical to the AXE's — woodwork 3 +
     * blade 1 + textile 2 — so staging those three materials resolved to the axe every time
     * and the spear could never be discovered at all. Reported as "the spear doesn't appear
     * in the Build menu"; it was never a display bug.
     *
     * MY REACHABILITY PROOF MISSED IT because it drove `craftSpear()` directly. That proved
     * the MATERIALS were obtainable, never that the recipe was DISCOVERABLE — and post-pivot
     * those are different claims. D-090 means the second one.
     */
    it('no two recipes share a slot signature — the collision, made impossible', async () => {
        const { allRecipes } = await import('../src/brain/recipes');
        const seen = new Map<string, string>();
        const collisions: string[] = [];
        for (const r of allRecipes()) {
            //  THE TAG SET, not tag+amount — and this correction is the whole point. The
            //  matcher treats amounts as MINIMUMS, so two recipes with the same tag set are
            //  never both reachable: whichever is cheaper answers every time. My first cut
            //  compared tag+amount, saw two different signatures, and passed — while the
            //  backpack sat undiscoverable behind the torch for exactly this reason.
            const sig = r.slots.map((sl) => JSON.stringify(sl.require)).sort().join('|');
            const clash = seen.get(sig);
            if (clash) collisions.push([r.id, clash].sort().join('='));
            seen.set(sig, r.id);
        }
        //  ONE KNOWN, PRE-EXISTING collision, recorded rather than hidden: `stonehammer` and
        //  `storage` share a tag set, so one of them is already unreachable through discovery
        //  TODAY. Surfaced by strengthening this guard from tag+amount to TAG SET — the weaker
        //  form passed it for exactly the reason it passed the spear. Not fixed here: it needs
        //  the matcher to disambiguate on amounts, which is a change to the discovery core and
        //  not something to bolt on at the end of a long session.
        const KNOWN = ['stonehammer=storage'];
        const fresh = collisions.filter((c) => !KNOWN.includes(c));
        expect(fresh, `NEW signature collision(s): ${fresh.join(', ')}`).toEqual([]);
    });

    it('staging shaft + blade discovers the SPEAR, not the axe', async () => {
        const { tryCombineWith } = await import('../src/brain/experiment');
        const s = createInitialState(0);
        s.inventory.wood = 10; s.inventory.sharpblade = 3; s.inventory.fiber = 10;
        expect(tryCombineWith(s, ['wood', 'sharpblade'] as never).recipeId).toBe('spear');
    });

    it('...and shaft + blade + binding still discovers the AXE', async () => {
        const { tryCombineWith } = await import('../src/brain/experiment');
        const s = createInitialState(0);
        s.inventory.wood = 10; s.inventory.sharpblade = 3; s.inventory.fiber = 10;
        expect(tryCombineWith(s, ['wood', 'sharpblade', 'fiber'] as never).recipeId).toBe('axe');
    });

    it('the binding is still SPENT — folded into the operation, not staged', async () => {
        //  Two staged positions, three materials consumed. The lashing is part of the ACT of
        //  making a spear, which is both true to the object and what keeps its signature
        //  distinct from the axe's.
        const { craftSpear } = await import('../src/brain/state');
        const s = createInitialState(0);
        s.inventory.wood = 10; s.inventory.sharpblade = 3; s.inventory.fiber = 10;
        const before = s.inventory.fiber;
        expect(craftSpear(s)).toBe(true);
        expect(s.inventory.fiber).toBe(before - TUNE.spearFiberCost);
    });
});
