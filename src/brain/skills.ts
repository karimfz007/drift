/**
 * BRAIN — the Development Tree seed: XP and levels for the two starting skills.
 * Pure functions over TUNE. Zero rendering engine.
 *
 * The anti-grind principle (charter §I.9, D-016): a mastered action becomes faster or
 * richer — never the same chore with a bigger number. XP is granted only for meaningful
 * *outcomes* (a felled tree, a foraged meal), never for spam, and each level pays out as a
 * visible speed/yield bonus the player feels in the action itself.
 */

import { TUNE } from '../data/tune';
import type { Skill } from './types';

export function newSkill(): Skill {
    return { level: 1, xp: 0 };
}

/** XP needed to advance FROM `level` to the next. Level N → N+1 costs N × the per-level XP. */
export function xpToNextLevel(level: number): number {
    return level * TUNE.xpToLevelPerLevel;
}

/**
 * Grant XP to a skill and roll over any levels it earns. Returns the number of levels
 * gained (0 if none) so the body can play the level-up beat. Mutates the skill in place.
 */
export function grantXp(skill: Skill, amount: number): number {
    if (amount <= 0) return 0;
    skill.xp += amount;
    let gained = 0;
    while (skill.xp >= xpToNextLevel(skill.level)) {
        skill.xp -= xpToNextLevel(skill.level);
        skill.level += 1;
        gained += 1;
    }
    return gained;
}

/**
 * The speed/yield multiplier a skill's level grants. Level 1 is the baseline (×1); every
 * level above adds `skillSpeedBonusPerLevel`. Used to shorten a chop and could enrich a
 * yield — mastery changing the action, not the number over its head.
 */
export function skillMultiplier(level: number): number {
    return 1 + (level - 1) * TUNE.skillSpeedBonusPerLevel;
}

/** Progress toward the next level, 0..1 — for the HUD. */
export function levelProgress(skill: Skill): number {
    const need = xpToNextLevel(skill.level);
    return need <= 0 ? 0 : Math.max(0, Math.min(1, skill.xp / need));
}
