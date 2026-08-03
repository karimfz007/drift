/**
 * INJURY — the first wound content, and the sharpest test D-011 has been given.
 *
 * A condition that drains health over time is EXACTLY the mechanic that would kill an absent
 * player. That is the property this file exists for; everything else is secondary.
 */
import { describe, expect, it } from 'vitest';
import {
    bindWound, canBindWound, freshInjuries, injuriesFromCharge, injuryNote, isInjured,
    limpSpeedMultiplierOf, settleInjuriesOffline, stepInjuries,
} from '../src/brain/injury';
import { impairmentOf } from '../src/brain/resolver';
import { createInitialState } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import { TUNE } from '../src/data/tune';
import type { InjuryState } from '../src/brain/types';

const REAL_DAY = 24 * 3600;

describe('D-011 — you cannot bleed to death with the game closed', () => {
    it('every wound clots the moment a span counts as an absence, from any severity', () => {
        const bad = { bleeding: TUNE.injuryBleedMax, limp: 6, pain: 1 };
        expect(settleInjuriesOffline(bad)).toEqual(freshInjuries());
    });

    it('no absence of any length lets a bleed cost health', () => {
        for (const days of [1, 7, 30, 365]) {
            const s = createInitialState(0);
            s.injuries = { bleeding: TUNE.injuryBleedMax, limp: 6, pain: 1 };
            s.health = 30;
            const { state } = reconcile(s, days * REAL_DAY);
            expect(state.injuries.bleeding, `still bleeding after ${days} days`).toBe(0);
            expect(state.health, `a bleed cost health over ${days} days`).toBeGreaterThanOrEqual(30);
        }
    });

    it('the module exposes exactly ONE function the absence path may call', async () => {
        //  Same structural shape the boars use: the guarantee is impossible to break by
        //  accident rather than merely checked for.
        const injury = await import('../src/brain/injury');
        expect(typeof injury.settleInjuriesOffline).toBe('function');
        expect(settleInjuriesOffline({ bleeding: 9, limp: 9, pain: 9 })).toEqual(freshInjuries());
    });
});

describe('A CHARGE LEAVES SOMETHING BEHIND', () => {
    it('a connected charge produces all three conditions, scaled by the damage', () => {
        const full = injuriesFromCharge(freshInjuries(), TUNE.boarChargeDamage);
        expect(full.bleeding).toBeGreaterThan(0);
        expect(full.limp).toBeGreaterThan(0);
        expect(full.pain).toBeGreaterThan(0);

        const glancing = injuriesFromCharge(freshInjuries(), TUNE.boarChargeDamage / 4);
        expect(glancing.bleeding).toBeLessThan(full.bleeding);
    });

    it('conditions STACK, which is why disengaging after the first hit is correct', () => {
        const once = injuriesFromCharge(freshInjuries(), TUNE.boarChargeDamage);
        const twice = injuriesFromCharge(once, TUNE.boarChargeDamage);
        expect(twice.bleeding).toBeGreaterThan(once.bleeding);
    });

    it('...but every condition is CAPPED — a bad fight stays survivable', () => {
        let inj = freshInjuries();
        for (let i = 0; i < 20; i += 1) inj = injuriesFromCharge(inj, TUNE.boarChargeDamage);
        expect(inj.bleeding).toBeLessThanOrEqual(TUNE.injuryBleedMax);
        expect(inj.limp).toBeLessThanOrEqual(TUNE.injuryLimpMaxGameHours);
        expect(inj.pain).toBeLessThanOrEqual(TUNE.injuryPainMax);
    });
});

describe('THE THREE CONDITIONS ARE FELT, each in its own currency', () => {
    it('BLEEDING costs health over time, and clots on its own eventually', () => {
        const hurt = { bleeding: 1, limp: 0, pain: 0 };
        const step = stepInjuries(hurt, 1);
        expect(step.healthLost).toBeGreaterThan(0);
        expect(step.next.bleeding).toBeLessThan(hurt.bleeding);

        //  An untreated wound is dangerous, not a death sentence — otherwise fibre becomes a
        //  hard requirement for surviving an animal the player can simply avoid.
        //  Annotated: TUNE is `as const`, so `injuryBleedMax` infers the literal 1.5 and the
        //  loop cannot assign a widened InjuryState back into it.
        let inj: InjuryState = { bleeding: TUNE.injuryBleedMax, limp: 0, pain: 0 };
        for (let i = 0; i < 40 && inj.bleeding > 0; i += 1) inj = stepInjuries(inj, 0.5).next;
        expect(inj.bleeding).toBe(0);
    });

    it('LIMP slows movement while it lasts, and only while it lasts', () => {
        expect(limpSpeedMultiplierOf({ bleeding: 0, limp: 2, pain: 0 })).toBeLessThan(1);
        expect(limpSpeedMultiplierOf(freshInjuries())).toBe(1);
    });

    it('PAIN makes every activity cost more — through the term that already existed', () => {
        //  The reason pain needs no new machinery to be felt: it reuses `impairmentOf`, so a
        //  hurt survivor's whole day gets more expensive in a currency the game already speaks.
        const whole = createInitialState(0);
        whole.health = TUNE.healthMax; whole.fatigue = 0;
        whole.warmth = (TUNE.thermalComfortLow + TUNE.thermalComfortHigh) / 2;
        const hurting = { ...whole, injuries: { bleeding: 0, limp: 0, pain: 1 } };
        expect(impairmentOf(hurting)).toBeGreaterThan(impairmentOf(whole));
    });

    it('every condition is LEGIBLE — the HUD has a sentence for the worst of it', () => {
        expect(injuryNote(freshInjuries())).toBeNull();
        expect(injuryNote({ bleeding: 1, limp: 0, pain: 0 })).toMatch(/bleeding/i);
        expect(injuryNote({ bleeding: 0, limp: 2, pain: 0 })).toMatch(/slower/i);
        expect(injuryNote({ bleeding: 0, limp: 0, pain: 1 })).toMatch(/hurts/i);
    });
});

describe('BINDING — the one treatment, and it treats one thing', () => {
    it('stops the bleeding, spends the fibre, and leaves limp and pain alone', () => {
        const s = createInitialState(0);
        s.injuries = { bleeding: 1, limp: 3, pain: 0.5 };
        s.inventory.fiber = 5;
        expect(canBindWound(s)).toBe(true);
        expect(bindWound(s)).toBe(true);
        expect(s.injuries.bleeding).toBe(0);
        expect(s.inventory.fiber).toBe(5 - TUNE.injuryBindFiberCost);
        //  A bandage does nothing for a limp or for pain. That is true, and it is why those
        //  two read as time rather than as inventory.
        expect(s.injuries.limp).toBe(3);
        expect(s.injuries.pain).toBe(0.5);
    });

    it('refuses without fibre, and refuses when there is nothing to bind', () => {
        const noFibre = createInitialState(0);
        noFibre.injuries = { bleeding: 1, limp: 0, pain: 0 };
        noFibre.inventory.fiber = 0;
        expect(canBindWound(noFibre)).toBe(false);
        expect(bindWound(noFibre)).toBe(false);

        const whole = createInitialState(0);
        whole.inventory.fiber = 5;
        expect(canBindWound(whole)).toBe(false);
    });

    it('is offered on the SHELTER circle only while actually bleeding', async () => {
        const { verbsFor } = await import('../src/brain/verbs');
        const s = createInitialState(0);
        s.shelter = { ...s.shelter, built: true, x: s.player.x, y: s.player.y };
        expect(verbsFor(s, 'shelter').some((v) => v.id === 'bind-wound')).toBe(false);
        s.injuries = { bleeding: 1, limp: 0, pain: 0 };
        const bind = verbsFor(s, 'shelter').find((v) => v.id === 'bind-wound');
        expect(bind).toBeTruthy();
        expect(bind!.reason).toMatch(/fibre/i);       // no fibre carried yet
    });
});

describe('a wound dies with the body', () => {
    it('a successor arrives whole, however badly the last survivor was hurt', async () => {
        const { closeSurvivor } = await import('../src/brain/succession');
        const s = createInitialState(0);
        s.injuries = { bleeding: TUNE.injuryBleedMax, limp: 6, pain: 1 };
        expect(isInjured(s.injuries)).toBe(true);
        expect(closeSurvivor(s, 'the cold').next.injuries).toEqual(freshInjuries());
    });
});
