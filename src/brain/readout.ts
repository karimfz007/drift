/**
 * THE READOUT — DROP 6. What the body knows, said in the body's own terms.
 *
 * ONE GRAMMAR, NOT EIGHT PATCHES. Six separate findings all said the same thing in different
 * words: the game develops the survivor and never tells them. Mastery speeds the swing, breath
 * lengthens the dive, capacities climb — all of it shipped, all of it invisible. This module is
 * the single answer, and every surface reads from it rather than deriving its own version.
 *
 * ---------------------------------------------------------------------------------------
 * IT ADDS NO STATE AND NO MECHANIC. Everything below is a PURE READING of models that already
 * ship: `masteryFor`, `airCapacityOf`, `standingOf`. There is no XP, no tree, no counter, and
 * no new field anywhere — the brief forbids all four, and more importantly a readout that
 * needed its own store would be a second opinion about the survivor, free to disagree with the
 * first. The refuge report was called "the liar" for exactly that.
 *
 * ---------------------------------------------------------------------------------------
 * CONCRETE, NOT NUMERIC (Bible v2.3). Experience rewards INFORMATION GAINED, not actions
 * repeated, so what a survivor is told is a CHANGE THEY CAN FEEL — *"a second and a half faster
 * with the axe"*, *"eleven seconds longer under"* — and a band they can see themselves moving
 * through. Never a score. `standingOf`'s four bands are the progression indicator, reused
 * rather than re-invented: a player must be able to feel the difference between two adjacent
 * bands, and eleven shades of "slightly stronger" is a number wearing a word.
 *
 * THE COMPARISON IS AGAINST THE DAY THEY LANDED, and that is what makes it sayable without
 * storing anything. `masteryFor` is exactly 1 at the innate floor by construction, and
 * `airCapacityOf` is exactly the base there — so "what would this have cost me on day one?" is
 * a derivation, not a memory. No previous-best field, no running average, nothing to migrate.
 *
 * ---------------------------------------------------------------------------------------
 * WORLD FIRST (Law 26). The ACT reads differently before any panel confirms it: the swing
 * genuinely lands sooner and the breath genuinely lasts longer, because `holdSecondsFor` and
 * `airCapacityOf` already say so. What was missing was the sentence at the moment it happens.
 * `noticedAtWork` is that sentence, and it is deliberately silent until the change is worth
 * noticing — a game that narrates every ordinary moment has no way left to raise its voice.
 */
import { TUNE, realSecondsPerGameHour } from '../data/tune';
import { airCapacityOf } from './dive';
import { domainStandingOf, standingOf, type Standing } from './growth';
import { masteryFor } from './knowledge';
import type { CapacityScores } from './capacities';
import type { GameState, KnowledgeDomain } from './types';

export interface Reading {
    /** What changed, in the survivor's own words. Concrete; never a score. */
    sentence: string;
    /** Where they stand, for the visible progression indicator. */
    standing: Standing;
    /** 0..1 — how far through the bands, for a bar. Derived, never stored. */
    progress: number;
    /** Is this worth SAYING at the moment it happens? */
    noticeable: boolean;
}

/** Seconds, to one decimal, without a trailing `.0` — "1.5" and "11", never "11.0". */
function secs(n: number): string {
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// ---------------------------------------------------------------------------
// The hands.
// ---------------------------------------------------------------------------

/**
 * WHAT MASTERY HAS ACTUALLY BOUGHT, in seconds off a piece of work they have just done.
 *
 * `baseSeconds` is what the job costs before mastery, so the saving is `base − base × speed`.
 * Said as time rather than as a percentage because a survivor experiences seconds.
 */
export function handsReading(state: GameState, domain: KnowledgeDomain, secondsItCost: number): Reading {
    const { speedMultiplier } = masteryFor(state, domain);
    //  `secondsItCost` is what the job ACTUALLY took — mastery already applied, because that is
    //  what every caller has in its hand. Day one is therefore `cost / speed`, and the saving is
    //  the difference. My first cut treated the mastered figure as the BASE and multiplied the
    //  discount in a second time, which understated the saving by exactly the mastery again: a
    //  survivor at technique 82 computed 0.85 s and fell under the one-second threshold, so the
    //  readout stayed silent for a practised feller and the device check read an empty string.
    //  The boulder note fired throughout, which is what proved the wiring was live and the
    //  arithmetic was not.
    const dayOne = speedMultiplier > 0 ? secondsItCost / speedMultiplier : secondsItCost;
    const saved = Math.max(0, dayOne - secondsItCost);
    const technique = state.knowledge?.domains?.[domain]?.technique ?? 0;
    //  BANDED ON THE KNOWLEDGE SCALE, not the capacity one. This read `standingOf`, whose
    //  thresholds belong to capacities — floor 10, stronger at 40, practised at 70 — while a
    //  domain starts at 5 and climbs with decaying headroom, reaching about 19 after twelve
    //  events. So these two rows sat at "as you landed" or "finding it easier" essentially
    //  forever, and a survivor who had felled a forest was told the axe felt no different.
    //  The screen was disagreeing with the hands, which is the one thing this file exists to
    //  prevent — its own header calls the first disagreement between two versions of a
    //  reading "a confident lie".
    const standing = domainStandingOf(technique);
    return {
        //  THE BRANCH IS ON WHAT WOULD BE PRINTED, not on whether the number is above zero.
        //  Branching on `saved <= 0` let a saving of 0.02 s through, which `secs` rounded to
        //  "0" and produced "0 seconds faster than your first — steadier with it now" beside a
        //  band reading "as you landed": a sentence contradicting itself and its own chip. The
        //  unit suite missed it because a truly fresh survivor saves EXACTLY zero; the full
        //  sweep printed it off the rendered panel.
        //  ...AND THE SENTENCE MUST NOT ARGUE WITH THE BAND, which is the same rule stated
        //  above, now with a third case in it. Banding on the knowledge scale means a survivor
        //  with a hair of technique reads "finding it easier" — correctly, they have learned
        //  something — while the time saved still rounds to zero. "No steadier than the day
        //  you washed ashore" beside that chip is the original defect wearing the other face.
        //  So there are three honest states, not two: nothing yet, something the clock cannot
        //  see, and something it can.
        sentence: secs(saved) !== '0'
            ? `${secs(saved)} seconds faster than your first — steadier with it now.`
            : standing === 'as you landed'
                ? 'No steadier than the day you washed ashore.'
                : 'Not enough to show in the time yet, but it is starting to come.',
        standing,
        //  ...and measured from the KNOWLEDGE floor for the same reason. Dividing from
        //  `capacityInnateFloor` (10) made the first five points of every domain register as
        //  zero progress — a bar that cannot leave the left edge until a survivor is already
        //  a third of the way to the boat’s own gate.
        progress: Math.min(1, Math.max(0, (technique - TUNE.knowledgeInnateFloor) / Math.max(1, TUNE.knowledgeScoreMax - TUNE.knowledgeInnateFloor))),
        noticeable: saved >= TUNE.readoutNoticeableSeconds,
    };
}

// ---------------------------------------------------------------------------
// The lungs.
// ---------------------------------------------------------------------------

/**
 * WHAT THE BREATH HAS BECOME, in seconds of air over the breath they landed with.
 *
 * Read straight off `airCapacityOf`, which is the same function the dive itself spends — so
 * the sentence and the lungs cannot drift apart.
 */
export function breathReading(capacities: CapacityScores): Reading {
    //  THE BASELINE IS THE INNATE FLOOR, NOT ZERO — and my first cut used zero, which made a
    //  survivor who had never dived read "1.1 seconds longer under than your first breath" on
    //  the beach. `freshCapacities()` starts every capacity AT the floor (a human is not born
    //  unable to hold their breath), so zero is a body that has never existed. The same
    //  correction `masteryFor` already carries in its own header, arrived at the same way: by
    //  a test measuring what a fresh survivor is told.
    const base = airCapacityOf({ ...capacities, breathWaterConfidence: TUNE.capacityInnateFloor } as CapacityScores);
    const now = airCapacityOf(capacities);
    const gainedAir = Math.max(0, now - base);
    //  Air is spent per game hour under; turn it into the seconds a player actually feels.
    const secondsPerAir = realSecondsPerGameHour / TUNE.diveAirDrainPerGameHour;
    const gainedSeconds = gainedAir * secondsPerAir;
    const score = capacities.breathWaterConfidence ?? 0;
    return {
        //  Same rule as the hands: branch on what would be PRINTED.
        sentence: secs(gainedSeconds) === '0'
            ? 'The same breath you came ashore with.'
            : `${secs(gainedSeconds)} seconds longer under than your first breath.`,
        standing: standingOf(score),
        progress: Math.min(1, Math.max(0, (score - TUNE.capacityInnateFloor) / Math.max(1, 100 - TUNE.capacityInnateFloor))),
        noticeable: gainedSeconds >= TUNE.readoutNoticeableSeconds,
    };
}

// ---------------------------------------------------------------------------
// World first.
// ---------------------------------------------------------------------------

/**
 * THE SENTENCE THE ACT ITSELF EARNS, or null when there is nothing worth saying.
 *
 * Called at the moment a piece of work completes, BEFORE any panel is opened — Law 26's world
 * before interface, applied to the one thing the game had been changing silently. Null until
 * the difference clears `readoutNoticeableSeconds`, so the first few swings say nothing and
 * the one that has genuinely got easier says so.
 */
export function noticedAtWork(state: GameState, domain: KnowledgeDomain, baseSeconds: number): string | null {
    const r = handsReading(state, domain, baseSeconds);
    return r.noticeable ? r.sentence : null;
}

/** The same, for coming up from a dive. */
export function noticedOnSurfacing(state: GameState): string | null {
    const r = breathReading(state.capacities);
    return r.noticeable ? r.sentence : null;
}

// ---------------------------------------------------------------------------
// What a slow job is telling you.
// ---------------------------------------------------------------------------

/**
 * THE BOULDER IS SLOW ON PURPOSE, and a player cannot tell that from a broken node.
 *
 * Measured, not assumed: the bluff yields 2 stone a swing, repeats for ever, and takes 5.5 s by
 * hand against 3.0 s with a stone hammer. So the honest sentence is NOT "you need a hammer" —
 * the hammer is an ACCELERATOR, and saying otherwise would send a survivor away from a face
 * that is working perfectly well for them. What it says is: this is slow, it is meant to be,
 * a hammer halves it, and it never runs out.
 */
export function slowWorkNote(state: GameState): string {
    return state.inventory.stonehammer > 0
        ? 'Hard going, but the hammer earns its weight here. This face never runs out.'
        : 'Slow work by hand — it gives, just grudgingly. A stone hammer would halve it, and the face never runs out.';
}

// ---------------------------------------------------------------------------
// The panel. Same readings, same source — the screen derives nothing of its own.
// ---------------------------------------------------------------------------

export interface ReadoutRow {
    label: string;
    reading: Reading;
}

/**
 * WHAT THE SKILLS TAB SHOWS, and it is the SAME function the world-first announcements use.
 *
 * That identity is the whole point of the pass. Six findings said the game develops a survivor
 * and never tells them; the failure mode of fixing that is six surfaces each deriving their own
 * version, and the first disagreement between them is a confident lie. One grammar, one source.
 *
 * Capacity-and-growth must be SEEN rather than inferred — so every row carries a concrete
 * sentence AND a band AND a 0..1 progress for the bar, and never a score.
 */
export function readoutRows(state: GameState): ReadoutRow[] {
    return [
        //  A representative piece of work per domain, so the seconds quoted are the seconds
        //  that domain's own jobs actually cost. Reading a domain nobody has trained yet is
        //  legal and says so plainly.
        { label: 'With the axe', reading: handsReading(state, 'harvestingFabrication', TUNE.readoutAxeReferenceSeconds) },
        { label: 'Building', reading: handsReading(state, 'construction', TUNE.readoutAxeReferenceSeconds) },
        { label: 'On and under the water', reading: breathReading(state.capacities) },
    ];
}
