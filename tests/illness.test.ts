import { describe, expect, it } from 'vitest';
import { TUNE } from '../src/data/tune';
import { createInitialState, drinkAtPond, drinkFlask, eat } from '../src/brain/state';
import { reconcile } from '../src/brain/reconcile';
import {
    brewRemedy, canBrewRemedy, freshIllness, illnessCosts, illnessNote, illnessStage,
    onsetFrom, settleIllnessOffline, stepIllness, susceptibility,
} from '../src/brain/illness';
import { POND } from '../src/data/world';
import type { GameState, IllnessCause, IllnessState } from '../src/brain/types';

const CAUSES: IllnessCause[] = ['chill', 'bad-water', 'spoiled-food', 'exhaustion'];

function well(): GameState {
    const s = createInitialState(0);
    s.health = TUNE.healthMax; s.hunger = TUNE.hungerMax; s.warmth = TUNE.warmthMax; s.fatigue = 0;
    return s;
}

describe('ILLNESS — D-011 is absolute, and it is the first thing asserted', () => {
    /**
     * THE HEADLINE PROPERTY, the same shape `vitals.test.ts` uses for offline death. An illness
     * that drains health is precisely the mechanic that would kill an absent player, so the
     * guarantee is swept rather than sampled.
     */
    it('for 2000 random illnesses × random long absences, absence NEVER worsens one', () => {
        let checked = 0;
        for (let i = 0; i < 2000; i++) {
            const severity = ((i * 37) % 101) / 100;
            const before = { severity, cause: CAUSES[i % 4], gameHoursSick: (i % 90) };
            const after = settleIllnessOffline(before);
            expect(after.severity, `absence worsened an illness at severity ${severity}`)
                .toBeLessThanOrEqual(before.severity + 1e-9);
            checked++;
        }
        //  The Vacuity Law: prove the sweep actually swept.
        expect(checked).toBe(2000);
    });

    it('and the grave cases ease BELOW the line where illness costs anything', () => {
        const settled = settleIllnessOffline({ severity: 1, cause: 'chill', gameHoursSick: 40 });
        expect(settled.severity).toBe(TUNE.illnessOfflineCeiling);
        expect(illnessCosts(settled), 'a returning survivor woke still being harmed').toBe(false);
    });

    it('but absence is NOT a cure — closing the game must not be the best medicine', () => {
        const mild = { severity: 0.15, cause: 'bad-water' as IllnessCause, gameHoursSick: 2 };
        expect(settleIllnessOffline(mild).severity).toBe(0.15);
    });

    /** The structural half: the real absence path, end to end, never harms a sick survivor. */
    it('a real 3-day absence on a gravely ill survivor costs no health at all', () => {
        const s = well();
        s.illness = { severity: 1, cause: 'chill', gameHoursSick: 30 };
        s.health = 40;
        const { state } = reconcile(s, 3 * 24 * 60 * 60);
        expect(state.health).toBeGreaterThanOrEqual(TUNE.healthOfflineFloor);
        expect(state.illness.severity).toBeLessThanOrEqual(TUNE.illnessOfflineCeiling);
    });
});

describe('ILLNESS — the five-stage grammar tells you TWICE before it bites', () => {
    it('the first two rungs cost nothing and still say something', () => {
        for (const severity of [0.05, 0.19, 0.25, 0.44]) {
            const ill = { severity, cause: 'chill' as IllnessCause, gameHoursSick: 1 };
            expect(illnessCosts(ill), `severity ${severity} took health before feverish`).toBe(false);
            expect(illnessNote(ill), `severity ${severity} said nothing`).toBeTruthy();
            expect(stepIllness(ill, 5, 0).healthLost).toBe(0);
        }
    });

    it('and health only starts moving at feverish', () => {
        const feverish = { severity: TUNE.illnessFeverishAt, cause: 'chill' as IllnessCause, gameHoursSick: 1 };
        expect(illnessStage(feverish)).toBe('feverish');
        expect(stepIllness(feverish, 2, 0).healthLost).toBeGreaterThan(0);
    });

    it('every rung names its cause — a readout that cannot be traced is the thing forbidden', () => {
        for (const cause of CAUSES) {
            const note = illnessNote({ severity: 0.5, cause, gameHoursSick: 1 });
            expect(note, `${cause} produced no note`).toBeTruthy();
            expect(note!.length).toBeGreaterThan(20);
        }
        expect(illnessNote(freshIllness())).toBeNull();
    });
});

describe('ILLNESS — caused, never rolled', () => {
    it('one full-strength cause on a well body lands inside the FREE warning band', () => {
        const s = well();
        s.illness = onsetFrom(s, 'chill', 1);
        expect(illnessCosts(s.illness), 'a single exposure went straight to costing health').toBe(false);
        expect(illnessStage(s.illness)).toBe('unsettled');
    });

    it('the resistance ladder is real: a wrecked body takes the same cause far harder', () => {
        const strong = well();
        const weak = well();
        weak.fatigue = TUNE.fatigueMax;
        expect(susceptibility(weak)).toBeGreaterThan(susceptibility(strong));
        const a = onsetFrom(strong, 'exhaustion', 1).severity;
        const b = onsetFrom(weak, 'exhaustion', 1).severity;
        expect(b).toBeGreaterThan(a);
    });

    it('the cause STICKS to what started it, so the readout cannot lie about origin', () => {
        const s = well();
        s.illness = onsetFrom(s, 'bad-water', 1);
        s.illness = onsetFrom(s, 'chill', 1);
        expect(s.illness.cause).toBe('bad-water');
    });

    it('drinking untreated pond water is a real, traceable cause', () => {
        const s = well();
        s.thirst = 10;
        //  Drive the SHIPPED verb, standing where a survivor would stand. A cause the player
        //  cannot reach through a real action is not a cause, and my first cut wrote
        //  `if (drinkAtPond(s)) expect(...)` — which passes silently when the drink never
        //  happens. That is the Vacuity Law's clause (b) written by hand, so the drink is
        //  asserted to have LANDED before anything is concluded from it.
        s.player = { x: POND.x, y: POND.y };
        expect(drinkAtPond(s), 'the drink never happened — nothing below means anything').toBe(true);
        expect(s.illness.severity).toBeGreaterThan(0);
        expect(s.illness.cause).toBe('bad-water');
    });

    it('...and the carried flask is deliberately NOT a cause — that is the decision', () => {
        const s = well();
        s.thirst = 10;
        s.tools.flask = true;
        s.tools.flaskSips = 3;
        expect(drinkFlask(s)).toBe(true);
        expect(s.illness.severity, 'the flask made the survivor ill').toBe(0);
    });

    it('eating spoiled matter is a cause; eating sound food is not', () => {
        const sound = well();
        sound.inventory.berries = 3;
        sound.hunger = 20;
        eat(sound, 'berries');
        expect(sound.illness.severity, 'sound food made the survivor ill').toBe(0);

        const spoiled = well();
        spoiled.inventory.berries = 3;
        spoiled.hunger = 20;
        spoiled.matterWear = { ...spoiled.matterWear, berries: 2 };
        eat(spoiled, 'berries');
        expect(spoiled.illness.severity).toBeGreaterThan(0);
        expect(spoiled.illness.cause).toBe('spoiled-food');
    });
});

describe('ILLNESS — recovery, and sleep as the treatment', () => {
    it('an untreated illness runs its course rather than lasting forever', () => {
        let ill: IllnessState = { severity: 0.5, cause: 'chill', gameHoursSick: 0 };
        for (let h = 0; h < 40 && ill.severity > 0; h++) ill = stepIllness(ill, 1, 0).next;
        expect(ill.severity).toBe(0);
        expect(ill.cause, 'a cured illness kept its cause').toBeNull();
    });

    /** ITEM 4, and the whole point of reusing the shipped rest model rather than a second one. */
    it('a sheltered sleep heals faster than sleeping rough, which beats staying awake', () => {
        const start = { severity: 0.6, cause: 'chill' as IllnessCause, gameHoursSick: 0 };
        const awake = stepIllness(start, 4, 0).next.severity;
        const rough = stepIllness(start, 4, TUNE.groundSleepRecoveryMultiplier).next.severity;
        const sheltered = stepIllness(start, 4, 1).next.severity;
        expect(sheltered).toBeLessThan(rough);
        expect(rough).toBeLessThan(awake);
    });

    it('the remedy needs a fire, relieves rather than cures, and trains Foraging & medicine', () => {
        const s = well();
        s.illness = { severity: 0.7, cause: 'bad-water', gameHoursSick: 3 };
        s.inventory.fiber = 5; s.inventory.berries = 5;

        s.fire = { ...s.fire, built: false, fuel: 0 };
        expect(canBrewRemedy(s), 'brewed with no fire').toBe(false);

        s.fire = { ...s.fire, built: true, fuel: 3 };
        const before = s.knowledge.domains.foragingMedicine.technique;
        expect(brewRemedy(s)).toBe(true);
        expect(s.illness.severity).toBeCloseTo(0.7 - TUNE.remedySeverityRelief, 6);
        expect(s.illness.severity, 'one brew cured outright — the clock IS the system').toBeGreaterThan(0);
        expect(s.knowledge.domains.foragingMedicine.technique).toBeGreaterThan(before);
    });
});
