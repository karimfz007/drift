/**
 * THE `reveal.ts` SWEEP — every enumeration in the file, not just the one that broke.
 *
 * WHY THIS FILE EXISTS. `reveal.ts` has now had a hardcoded list go stale in THREE separate
 * slices, each time silently, each time found by a human rather than by a test:
 *
 *   - [[D-053]]: the body's Build-button gate listed product flags, and every clause went
 *     false on a long-running save. Fixed by APPENDING the torch.
 *   - [[D-114]]: the spear and the backpack shipped and were not appended, so a fully-equipped
 *     survivor had no route to either. Fixed by DERIVING `makerOffers` from `allRecipes()`.
 *   - [[D-122]]: `satisfied()` had no `raft` case and `panelHints()` walked a hardcoded five,
 *     so a built raft stayed an offer forever and the raft's discovery prompt could never
 *     reach the screen at all.
 *
 * The file's own header says the rule out loud — *"a gate you have to remember to extend is a
 * defect with a delay on it"* — and then the file kept three more gates you have to remember
 * to extend. Fixing the fourth occurrence would be the fourth patch. This sweeps the CLASS.
 *
 * WHAT IT ASSERTS, and deliberately BEHAVIOURALLY rather than by reading the source. A test
 * that greps for `case 'raft'` proves a string is present; it does not prove the answer is
 * right, and it breaks on formatting. Every assertion below drives the real functions and
 * reads what a player would get.
 */
import { describe, expect, it } from 'vitest';
import { makerOffers, panelHints, revealedInPanel, SURVIVAL_BASIC } from '../src/brain/reveal';
import { allRecipes } from '../src/brain/recipes';
import { DISCOVERY_ROUTES, suspicionFor } from '../src/brain/discovery';
import { createInitialState } from '../src/brain/state';
import { TUNE } from '../src/data/tune';
import type { Blueprint, GameState } from '../src/brain/types';

const RECIPE_IDS = allRecipes().map((r) => r.id);

/**
 * The ONE documented exemption, named here so the sweep can be total.
 *
 * `knap` is repeatable and has no "done" state (D-055), so it is never satisfied and never
 * stops being an offer. That is a deliberate design fact, stated in `reveal.ts`'s own comment,
 * and the difference between an exemption and an oversight is that someone wrote it down.
 */
const NEVER_SATISFIED = ['knap'];

function fresh(): GameState {
    return createInitialState(1_700_000_000_000);
}

/** Every recipe demonstrated, so `revealedInPanel` is true for all of them. */
function knowingEverything(s: GameState): GameState {
    s.blueprints = RECIPE_IDS.map((id, i): Blueprint => ({
        id: `bp-${i}`,
        name: id,
        recipeId: id,
        inputs: ['wood'],
        version: 1,
        workmanship: 'crude',
        author: 'castaway',
        discoveredAtGameHours: 1,
    }));
    return s;
}

/** ...and every product actually made or standing. */
function havingEverything(s: GameState): GameState {
    s.torch.owned = true;
    s.tools.axe = true;
    s.tools.spear = true;
    s.tools.backpack = true;
    s.tools.stoneHammer = true;
    s.shelter.built = true;
    s.storage.built = true;
    s.raft.built = true;
    s.tools.fishingLine = true;
    s.tools.net = true;
    return s;
}

describe('reveal.ts sweep — enumeration 1: SURVIVAL_BASIC', () => {
    /**
     * A `Set<string>` of recipe ids with no type relationship to the recipes. `new Set(['torhc'])`
     * would silently switch Law 113's fire scaffold off — the first night stops being
     * scaffolded, blind experimentation becomes the only route to fire, and NOTHING fails.
     * That is the most expensive silent failure available in this file.
     */
    it('every member names a recipe that actually exists', () => {
        expect(SURVIVAL_BASIC.size).toBeGreaterThan(0);
        for (const id of SURVIVAL_BASIC) {
            expect(RECIPE_IDS, `SURVIVAL_BASIC names "${id}", which is not a recipe`).toContain(id);
        }
    });

    it('...and it still DOES its job — a suspected basic is revealed with no blueprint', () => {
        //  The behavioural half. The set being well-formed proves nothing if the scaffold has
        //  stopped working; this drives the real path a cold, empty-handed castaway walks.
        const s = fresh();
        s.inventory.wood = 3;
        s.inventory.fiber = 3;
        s.warmth = TUNE.warmthLowThreshold - 5;
        for (const id of SURVIVAL_BASIC) {
            expect(suspicionFor(s, id)?.suspected, `${id} has no live suspicion in its own need`).toBe(true);
            expect(revealedInPanel(s, id), `${id} is survival-basic and suspected, and is not revealed`).toBe(true);
        }
    });

    it('...and it is a FLOOR, not a ceiling — a non-basic stays hidden until demonstrated', () => {
        //  The boundary that keeps the scaffold from becoming the catalogue again.
        const s = fresh();
        s.inventory.wood = 30; s.inventory.fiber = 30; s.inventory.stone = 30; s.inventory.coconut = 30;
        s.warmth = TUNE.warmthLowThreshold - 5;
        const notBasic = RECIPE_IDS.filter((id) => !SURVIVAL_BASIC.has(id));
        expect(notBasic.length).toBeGreaterThan(4);
        for (const id of notBasic) {
            expect(revealedInPanel(s, id), `${id} is revealed without ever being demonstrated`).toBe(false);
        }
    });
});

describe('reveal.ts sweep — enumeration 2: satisfied()', () => {
    /**
     * THE FOURTH OCCURRENCE, made structurally impossible to reach a fifth.
     *
     * `satisfied()` is a switch over recipe ids with `default: false`. A craftable added
     * without a case falls through and stays a live offer FOREVER — the maker door going on
     * citing something already made. It cost the raft this exact bug in [[D-122]].
     *
     * This is total by construction: it asks the real function about EVERY recipe, in a state
     * where every product is genuinely made. A future craftable with no case shows up by name.
     */
    it('every recipe is answered — a new craftable cannot silently fall to `default: false`', () => {
        const s = havingEverything(knowingEverything(fresh()));
        const stillOffered = makerOffers(s).filter((id) => id !== 'rest');
        expect(stillOffered.sort(),
            'these recipes are made and still being offered — add a `satisfied()` case, or document the exemption in NEVER_SATISFIED')
            .toEqual([...NEVER_SATISFIED].sort());
    });

    it('WITNESS: the same state before anything is made offers all of them', () => {
        //  Without this the assertion above passes on a state where nothing was ever offered,
        //  which would make it vacuous — D-066 (a), applied to my own sweep.
        const s = knowingEverything(fresh());
        const offered = makerOffers(s).filter((id) => id !== 'rest');
        expect(offered.sort()).toEqual([...RECIPE_IDS].sort());
    });

    it('the documented exemption is genuinely exempt, and says why in the file', async () => {
        //  An exemption nobody wrote down is an oversight. This asserts the reasoning is
        //  present where the next author will read it, not merely in a test.
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/brain/reveal.ts', 'utf8');
        for (const id of NEVER_SATISFIED) {
            expect(src, `${id} is exempt from satisfied() and the file never explains why`).toContain(id);
        }
        expect(src).toMatch(/repeatable/i);
    });
});

describe('reveal.ts sweep — enumeration 3: panelHints()', () => {
    /**
     * Already corrected in [[D-122]] to walk `DISCOVERY_ROUTES`. Locked here at the level of
     * the PROPERTY rather than the loop, so a future author who re-hardcodes it fails.
     */
    it('every routed, unrevealed, live suspicion can reach the panel as a hint', () => {
        const s = fresh();
        for (const k of Object.keys(s.inventory) as Array<keyof typeof s.inventory>) s.inventory[k] = 30;
        s.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        s.warmth = 1;
        s.storage.built = false;
        s.tools.stoneHammer = false;

        const live = DISCOVERY_ROUTES
            .map((r) => r.recipeId)
            .filter((id) => suspicionFor(s, id)?.suspected === true && !revealedInPanel(s, id));
        expect(live.length, 'no unrevealed route fired — the fixture cannot witness anything').toBeGreaterThan(1);

        const reachable = new Set(panelHints(s).map((h) => h.recipeId));
        for (const id of live) {
            expect(reachable.has(id), `${id} is suspected, unrevealed, and has no way to say so`).toBe(true);
        }
    });

    it('a hint NEVER names its product — the invention pivot, at the surface', () => {
        const s = fresh();
        for (const k of Object.keys(s.inventory) as Array<keyof typeof s.inventory>) s.inventory[k] = 30;
        s.capacities.breathWaterConfidence = TUNE.capacityInnateFloor + 5;
        s.warmth = 1;
        const hints = panelHints(s);
        expect(hints.length).toBeGreaterThan(0);
        for (const h of hints) {
            expect(h.prompt.toLowerCase(),
                `the hint for ${h.recipeId} names the thing it is supposed to make you wonder about`)
                .not.toContain(h.recipeId.toLowerCase());
        }
    });

    it('a REVEALED recipe stops hinting — the hint has done its work', () => {
        //  The other side of the rule, so "derive from the routes" cannot be over-read into
        //  "hint about everything forever".
        const s = knowingEverything(fresh());
        for (const k of Object.keys(s.inventory) as Array<keyof typeof s.inventory>) s.inventory[k] = 30;
        s.warmth = 1;
        expect(panelHints(s)).toEqual([]);
    });
});

describe('reveal.ts sweep — the class, stated once', () => {
    /**
     * The durable guard. Every recipe-id enumeration in this file must either be DERIVED from
     * a single source, or be a deliberate, documented set with a test above proving it
     * well-formed. This asserts the one remaining structural fact: no function in `reveal.ts`
     * carries a literal array of recipe ids.
     *
     * Comments are stripped first — the file discusses recipe names in prose at length, and a
     * check that cannot tell code from commentary would either false-positive forever or be
     * quietly loosened until it caught nothing.
     */
    it('no function in the file carries a literal array of recipe ids', async () => {
        const { readFileSync } = await import('node:fs');
        const raw = readFileSync('src/brain/reveal.ts', 'utf8');
        const code = raw
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .filter((l) => !l.trim().startsWith('//'))
            .join('\n');

        //  Two or more quoted recipe ids inside one bracketed literal is the shape that rotted
        //  three times: ['torch', 'shelter', 'axe', 'stonehammer', 'storage'].
        const arrays = code.match(/\[[^\]\n]*'[^']+'[^\]\n]*,[^\]\n]*'[^']+'[^\]\n]*\]/g) ?? [];
        const offending = arrays.filter((a) =>
            RECIPE_IDS.filter((id) => a.includes(`'${id}'`)).length >= 2);
        expect(offending,
            'a hardcoded recipe-id list is back in reveal.ts — derive it, or this rots for the fourth time')
            .toEqual([]);
    });
});
