import { describe, expect, it } from 'vitest';
import {
    axeShortfall,
    canCraftAxe,
    canDrinkAtPond,
    craftAxe,
    createInitialState,
    drinkAtPond,
    drinkFlask,
    eat,
    fillFlask,
    isAtPond,
    respawn
} from '../src/brain/state';
import { grantXp, newSkill, skillMultiplier, xpToNextLevel } from '../src/brain/skills';
import { TUNE } from '../src/data/tune';
import { POND } from '../src/data/world';

function run() {
    return createInitialState(0);
}

describe('crafting — the crude axe (four gates)', () => {
    it('needs wood, stone and fibre, and refuses without them', () => {
        const s = run();
        expect(canCraftAxe(s)).toBe(false);
        expect(axeShortfall(s)).toEqual({
            wood: TUNE.axeWoodCost,
            stone: TUNE.axeStoneCost,
            fiber: TUNE.axeFiberCost
        });
        expect(craftAxe(s)).toBe(false);
        expect(s.tools.axe).toBe(false);
    });

    it('spends exactly the recipe and yields the axe', () => {
        const s = run();
        s.inventory.wood = TUNE.axeWoodCost + 1;
        s.inventory.stone = TUNE.axeStoneCost;
        s.inventory.fiber = TUNE.axeFiberCost + 2;
        expect(canCraftAxe(s)).toBe(true);
        expect(craftAxe(s)).toBe(true);
        expect(s.tools.axe).toBe(true);
        expect(s.inventory.wood).toBe(1);
        expect(s.inventory.stone).toBe(0);
        expect(s.inventory.fiber).toBe(2);
    });

    it('cannot be crafted twice', () => {
        const s = run();
        s.inventory.wood = 99;
        s.inventory.stone = 99;
        s.inventory.fiber = 99;
        craftAxe(s);
        expect(canCraftAxe(s)).toBe(false);
        expect(craftAxe(s)).toBe(false);
    });
});

describe('crafting — drink and eat', () => {
    it('drinking at the pond restores thirst, only when close and thirsty', () => {
        const s = run();
        s.thirst = 20;
        expect(canDrinkAtPond(s)).toBe(false); // spawn is far from the pond

        s.player = { x: POND.x, y: POND.y };
        expect(isAtPond(s)).toBe(true);
        expect(canDrinkAtPond(s)).toBe(true);
        expect(drinkAtPond(s)).toBe(true);
        expect(s.thirst).toBe(20 + TUNE.drinkPerSip);
    });

    it('a full flask carries one drink inland, then is empty', () => {
        const s = run();
        s.tools.flask = true;
        s.player = { x: POND.x, y: POND.y };
        expect(fillFlask(s)).toBe(true);
        expect(s.tools.flaskSips).toBe(TUNE.flaskCapacitySips);

        //  Walk inland, away from the pond, and drink from the flask.
        s.player = { x: 0, y: 0 };
        s.thirst = 10;
        expect(drinkFlask(s)).toBe(true);
        expect(s.thirst).toBe(10 + TUNE.drinkPerSip);
        expect(s.tools.flaskSips).toBe(0);
        expect(drinkFlask(s)).toBe(false); // empty now
    });

    it('coconut feeds and waters; berries and shellfish feed', () => {
        const s = run();
        s.hunger = 40;
        s.thirst = 40;
        s.inventory.coconut = 1;
        expect(eat(s, 'coconut')).toBe(true);
        expect(s.hunger).toBe(40 + TUNE.coconutHungerValue);
        expect(s.thirst).toBe(40 + TUNE.coconutThirstValue);

        s.inventory.shellfish = 1;
        expect(eat(s, 'shellfish')).toBe(true);
        expect(s.hunger).toBe(40 + TUNE.coconutHungerValue + TUNE.shellfishHungerValue);
    });

    it('cannot eat food you do not have', () => {
        const s = run();
        s.hunger = 10;
        expect(eat(s, 'berries')).toBe(false);
    });
});

describe('skills — XP and levels', () => {
    it('a skill starts at level 1 with no xp', () => {
        const skill = newSkill();
        expect(skill.level).toBe(1);
        expect(skill.xp).toBe(0);
    });

    it('xp to the next level scales with the level', () => {
        expect(xpToNextLevel(1)).toBe(1 * TUNE.xpToLevelPerLevel);
        expect(xpToNextLevel(3)).toBe(3 * TUNE.xpToLevelPerLevel);
    });

    it('granting xp rolls over levels and reports how many were gained', () => {
        const skill = newSkill();
        const gained = grantXp(skill, xpToNextLevel(1) + xpToNextLevel(2));
        expect(gained).toBe(2);
        expect(skill.level).toBe(3);
        expect(skill.xp).toBe(0);
    });

    it('each level makes the action measurably faster', () => {
        expect(skillMultiplier(1)).toBe(1);
        expect(skillMultiplier(2)).toBeCloseTo(1 + TUNE.skillSpeedBonusPerLevel, 9);
        expect(skillMultiplier(5)).toBeGreaterThan(skillMultiplier(4));
    });
});

describe('death — respawn keeps what you made', () => {
    it('washes you ashore, restores vitals, keeps inventory/tools/skills, counts the death', () => {
        const s = run();
        s.player = { x: 40, y: -30 };
        s.inventory.wood = 12;
        s.tools.axe = true;
        s.skills.woodcutting.level = 3;
        s.warmth = 0;
        s.thirst = 0;
        s.health = 0;

        respawn(s, 'thirst');

        expect(s.player.x).toBe(0); // back at spawn
        expect(s.health).toBe(TUNE.healthMax);
        expect(s.thirst).toBe(TUNE.thirstMax);
        expect(s.warmth).toBe(TUNE.warmthMax);
        expect(s.inventory.wood).toBe(12); // kept
        expect(s.tools.axe).toBe(true); // kept
        expect(s.skills.woodcutting.level).toBe(3); // kept
        expect(s.lastDeathCause).toBe('thirst');
        expect(s.trace.deaths).toBe(1);
    });
});
