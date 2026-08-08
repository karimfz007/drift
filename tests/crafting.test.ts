import { describe, expect, it } from 'vitest';
import {
    axeShortfall,
    canCraftAxe,
    canCraftStoneHammer,
    canDrinkAtPond,
    canKnapSharpblade,
    craftAxe,
    craftStoneHammer,
    createInitialState,
    drinkAtPond,
    drinkFlask,
    eat,
    fillFlask,
    isAtPond,
    knapSharpblade,
    stoneHammerShortfall
} from '../src/brain/state';
import { grantXp, newSkill, skillMultiplier, xpToNextLevel } from '../src/brain/skills';
import { TUNE } from '../src/data/tune';
import { POND, SPAWN } from '../src/data/world';
import { closeSurvivor } from '../src/brain/succession';

function run() {
    return createInitialState(0);
}

describe('crafting — the crude axe (four gates)', () => {
    it('needs wood, a sharp blade, and fibre, and refuses without them', () => {
        const s = run();
        expect(canCraftAxe(s)).toBe(false);
        expect(axeShortfall(s)).toEqual({
            wood: TUNE.axeWoodCost,
            sharpblade: TUNE.axeSharpbladeCost,
            fiber: TUNE.axeFiberCost
        });
        expect(craftAxe(s)).toBe(false);
        expect(s.tools.axe).toBe(false);
    });

    it('spends exactly the recipe and yields the axe', () => {
        const s = run();
        s.inventory.wood = TUNE.axeWoodCost + 1;
        s.inventory.sharpblade = TUNE.axeSharpbladeCost;
        s.inventory.fiber = TUNE.axeFiberCost + 2;
        expect(canCraftAxe(s)).toBe(true);
        expect(craftAxe(s)).toBe(true);
        expect(s.tools.axe).toBe(true);
        expect(s.inventory.wood).toBe(1);
        expect(s.inventory.sharpblade).toBe(0);
        expect(s.inventory.fiber).toBe(2);
    });

    it('cannot be crafted twice', () => {
        const s = run();
        s.inventory.wood = 99;
        s.inventory.sharpblade = 99;
        s.inventory.fiber = 99;
        craftAxe(s);
        expect(canCraftAxe(s)).toBe(false);
        expect(craftAxe(s)).toBe(false);
    });
});

describe('crafting — the stone hammer + knapping (Ch.1 v3, D-055) — Tier-0 unlocks the axe', () => {
    it('the hammer needs wood and stone, and refuses without them', () => {
        const s = run();
        expect(canCraftStoneHammer(s)).toBe(false);
        expect(stoneHammerShortfall(s)).toEqual({ wood: TUNE.stoneHammerWoodCost, stone: TUNE.stoneHammerStoneCost });
        expect(craftStoneHammer(s)).toBe(false);
    });

    it('spends exactly the recipe and yields the hammer; cannot be made twice', () => {
        const s = run();
        s.inventory.wood = TUNE.stoneHammerWoodCost;
        s.inventory.stone = TUNE.stoneHammerStoneCost + 5;
        expect(craftStoneHammer(s)).toBe(true);
        expect(s.tools.stoneHammer).toBe(true);
        expect(s.inventory.wood).toBe(0);
        expect(s.inventory.stone).toBe(5);
        expect(canCraftStoneHammer(s)).toBe(false);
        expect(craftStoneHammer(s)).toBe(false);
    });

    it('knapping needs the hammer, even with enough stone', () => {
        const s = run();
        s.inventory.stone = 99;
        expect(canKnapSharpblade(s)).toBe(false);
        expect(knapSharpblade(s)).toBe(false);
        expect(s.inventory.sharpblade).toBe(0);
    });

    it('knapping spends raw stone for sharp blades, and is repeatable — no "done" state', () => {
        const s = run();
        s.tools.stoneHammer = true;
        s.inventory.stone = TUNE.knapStoneCost * 2;
        expect(knapSharpblade(s)).toBe(true);
        expect(s.inventory.stone).toBe(TUNE.knapStoneCost);
        expect(s.inventory.sharpblade).toBe(TUNE.knapSharpbladeYield);
        // Repeatable: knap again with the stone left over.
        expect(canKnapSharpblade(s)).toBe(true);
        expect(knapSharpblade(s)).toBe(true);
        expect(s.inventory.stone).toBe(0);
        expect(s.inventory.sharpblade).toBe(TUNE.knapSharpbladeYield * 2);
    });

    it('refuses to knap without enough stone', () => {
        const s = run();
        s.tools.stoneHammer = true;
        s.inventory.stone = TUNE.knapStoneCost - 1;
        expect(canKnapSharpblade(s)).toBe(false);
        expect(knapSharpblade(s)).toBe(false);
    });

    it('the full tier: gather, make the hammer, knap a blade, then the axe recipe is met', () => {
        const s = run();
        s.inventory.wood = TUNE.stoneHammerWoodCost + TUNE.axeWoodCost;
        s.inventory.stone = TUNE.stoneHammerStoneCost + TUNE.knapStoneCost;
        s.inventory.fiber = TUNE.axeFiberCost;
        expect(canCraftAxe(s)).toBe(false); // no sharp blade yet

        expect(craftStoneHammer(s)).toBe(true);
        expect(knapSharpblade(s)).toBe(true);
        expect(canCraftAxe(s)).toBe(true);
        expect(craftAxe(s)).toBe(true);
        expect(s.tools.axe).toBe(true);
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

describe('death — the survivor ends, the island does not (Slice 3)', () => {
    it('takes the body and everything on it, and leaves everything built exactly as it stood', () => {
        //  This test replaces the FIX-2 respawn test outright. That one asserted the interim
        //  mercy — half vitals, a quarter of your stacks, same person back on their feet. The
        //  behaviour it described is gone, so an updated version of it would be a lie kept
        //  green. What is asserted here is the law that replaced it.
        const s = run();
        s.player = { x: 40, y: -30 };
        s.inventory.wood = 12;
        s.tools.axe = true;
        s.skills.woodcutting.level = 3;
        s.shelter = { built: true, x: 5, y: 5, durability: 71, grade: 'crude', defects: { lashing: 0, thatch: 0, footing: 0 } };
        s.storage = { built: true, x: 8, y: 8, durability: 62, stored: { wood: 40, stone: 30, fiber: 20 } };
        s.warmth = 0;
        s.thirst = 0;
        s.health = 0;
        s.gameHoursElapsed = 12.5;

        const { next, record } = closeSurvivor(s, 'thirst');

        //  THE PERSON IS GONE. Not diminished — gone. Nothing carried survives the body.
        expect(next.inventory.wood).toBe(0);
        expect(next.tools.axe).toBe(false);
        expect(next.skills.woodcutting.level).toBe(1);

        //  THE ISLAND IS UNTOUCHED, down to the durability the last survivor wore into it.
        //  ENTROPY & MAINTENANCE — and the named defects cross with it. A successor inherits
        //  the building AS IT STANDS, including whatever the last survivor let go.
        expect(next.shelter).toEqual({
            built: true, x: 5, y: 5, durability: 71, grade: 'crude',
            defects: { lashing: 0, thatch: 0, footing: 0 },
        });
        expect(next.storage.stored).toEqual({ wood: 40, stone: 30, fiber: 20 });
        expect(next.storage.durability).toBe(62);
        //  The world clock never resets. A successor arrives into a night already in progress.
        expect(next.gameHoursElapsed).toBe(12.5);

        //  ...and the successor is a NEW ARRIVAL, on the crash profile, at the shore.
        expect(next.player).toEqual({ x: SPAWN.x, y: SPAWN.y });
        expect(next.health).toBe(TUNE.healthMax * TUNE.arrivalHealthFraction);
        expect(next.survivorStartedAtGameHours).toBe(12.5);

        //  The dead are recorded, and the record is history — not a save slot to return to.
        expect(record.ordinal).toBe(1);
        expect(record.cause).toBe('thirst');
        expect(record.diedAtGameHours).toBe(12.5);
        expect(next.memorial).toHaveLength(1);
        expect(next.trace.deaths).toBe(1);
        expect(next.trace.deathLog).toHaveLength(1);
        expect(next.trace.deathLog[0]).toMatchObject({ cause: 'thirst', gameHoursElapsed: 12.5 });
    });
});
