/**
 * WAVE 0, PART ONE — P0-1, P0-4 and P0-6, each director-confirmed in play.
 *
 * THE THREE ARE ONE DEFECT WEARING THREE COATS: a system that works perfectly and cannot be
 * reached, seen or felt. The combination resolver chose for the player; the spear existed and
 * was invisible; the illness cost health and said nothing. None of them is a missing feature.
 *
 * P0-4 IS THE NINTH INSTANCE of one live list being the only thing between a working system
 * and an invisible one — `craftSpear`, `makeBackpack`, `submergedDepthM`, `fishRingSpent`, the
 * trace tap, `manuals()`, `BOAT_LADDER`, the boat's undertuned technique route, and now
 * `TOOL_IDS`. So the invariant below is not written for the spear: it is written for the LIST,
 * and it asserts that every tool the state can own resolves through it.
 */
import { describe, expect, it } from 'vitest';
import {
    TOOL_IDS,
    bindBlocker,
    bindWound,
    canBindWound,
    createInitialState,
    illnessNote,
    illnessStage,
    illnessSymptom,
    isAmbiguousToPlayer,
    isTwoHanded,
    knownMatches,
    makeChosen,
    ownedTools,
    tryCombineWith,
    type GameState,
    type ToolId,
} from '../src/brain';
import { allRecipes } from '../src/brain/recipes';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => fullBody(createInitialState(NOW));

// ---------------------------------------------------------------------------
describe('P0-4 — the spear was real, owned, usable and invisible', () => {
    it('THE INVARIANT: every tool the state can own is either HELD or MADE — never neither', () => {
        //  THE LIST IS THE DEFECT CLASS, not the spear, and the first cut of this check found
        //  three more names before it found the right shape. `ownedTools` filters TOOL_IDS and
        //  TOOL_IDS is the only thing reaching the pack readout and the equip path — but not
        //  every tool is HELD. A backpack is worn, a fishing line and a net are deployed at the
        //  water. Those three are legitimately absent from TOOL_IDS, and they are legitimately
        //  visible: each has a Build-panel row, which `revealedInPanel` keys by id.
        //
        //  So the invariant is the union, and it is the one that actually catches the defect:
        //  a tool must be reachable EITHER by hand OR by panel. The spear was in neither, which
        //  is precisely why it could be owned, used to kill a boar, and never seen. Adding a
        //  new tool now forces that decision instead of allowing it to be forgotten.
        const s = fresh();
        //  Not tools: the flask's sip counter and the axe's grade are properties OF a tool.
        const notATool = new Set(['flaskSips', 'axeGrade']);
        //  MADE means the catalogue has a recipe for it, which is what puts a row on the Build
        //  panel and gives the tool a surface. `revealedInPanel` is the wrong question here and
        //  my first probe asked it: it gates on the LADDER (`demonstrated`), so a tool merely
        //  set owned still reads false and every non-held tool looked invisible. Whether the
        //  panel CAN show a thing is a fact about the catalogue, not about this survivor.
        const recipeIds = new Set(allRecipes().map((r) => r.id));
        const panelIdFor: Record<string, string> = { stoneHammer: 'stonehammer', fishingLine: 'fishingline' };
        const invisible = Object.keys(s.tools)
            .filter((k) => !notATool.has(k))
            .filter((k) => !TOOL_IDS.includes(k as ToolId))
            .filter((k) => !recipeIds.has(panelIdFor[k] ?? k.toLowerCase()));
        expect(invisible,
            `owned by the model, not held, and with no panel row — invisible: ${invisible.join(', ')}`)
            .toEqual([]);
    });

    it('...and the spear specifically is HELD, which is the half that was missing', () => {
        expect(TOOL_IDS).toContain('spear');
    });

    it('a survivor holding a spear can SEE it', () => {
        const s = fresh();
        expect(ownedTools(s), 'a fresh castaway owns a spear').not.toContain('spear');
        s.tools.spear = true;
        expect(ownedTools(s), 'the spear is owned and still invisible').toContain('spear');
    });

    it('...and it is two-handed, because a braced thrust is', () => {
        expect(isTwoHanded('spear')).toBe(true);
        expect(isTwoHanded('axe')).toBe(true);
        expect(isTwoHanded('torch')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('P0-1 — when both are known, the player chooses', () => {
    /** A survivor who has already made both of the things wood+stone can be. */
    function knowsBoth(): GameState {
        const s = fresh();
        s.blueprints = [
            { recipeId: 'storage', discoveredAtGameHours: 1, author: 'them' },
            { recipeId: 'stonehammer', discoveredAtGameHours: 2, author: 'them' },
        ] as GameState['blueprints'];
        s.inventory.wood = 9;
        s.inventory.stone = 9;
        s.inventory.fiber = 9;
        return s;
    }

    it('two known patterns for one pile is a QUESTION, not an attempt', () => {
        const s = knowsBoth();
        expect(isAmbiguousToPlayer(s, ['wood', 'stone'])).toBe(true);
        const offered = knownMatches(s, ['wood', 'stone']).map((r) => r.id).sort();
        expect(offered).toEqual(['stonehammer', 'storage']);
    });

    it('the game REFUSES to pick, and being asked costs nothing', () => {
        const s = knowsBoth();
        const before = JSON.stringify({ inv: s.inventory, bp: s.blueprints, energy: s.energy });
        const r = tryCombineWith(s, ['wood', 'stone']);
        expect(r.outcome).toBe('choose');
        expect(JSON.stringify({ inv: s.inventory, bp: s.blueprints, energy: s.energy }),
            'being asked a question spent something').toBe(before);
    });

    it('...and answering it builds the thing the player NAMED', () => {
        for (const want of ['stonehammer', 'storage']) {
            const s = knowsBoth();
            const r = makeChosen(s, ['wood', 'stone'], want);
            expect(r.outcome, `choosing ${want} did not resolve`).not.toBe('choose');
            expect(r.recipeId ?? want).toBe(want);
        }
    });

    it('DISCOVERY IS UNTOUCHED — an unknown pattern still resolves, and still hints only', () => {
        //  Law 95's rule is not this drop's to move. A survivor who knows NEITHER thing is
        //  inventing, and inventing must never be handed a menu of named products.
        const s = fresh();
        s.blueprints = [];
        s.inventory.wood = 9;
        s.inventory.stone = 9;
        expect(isAmbiguousToPlayer(s, ['wood', 'stone']),
            'a survivor who knows nothing was offered a choice of named things').toBe(false);
        expect(knownMatches(s, ['wood', 'stone'])).toEqual([]);
        expect(tryCombineWith(s, ['wood', 'stone']).outcome).not.toBe('choose');
    });

    it('one known pattern is not a question either', () => {
        const s = fresh();
        s.blueprints = [{ recipeId: 'storage', discoveredAtGameHours: 1, author: 'them' }] as GameState['blueprints'];
        s.inventory.wood = 9;
        s.inventory.stone = 9;
        expect(isAmbiguousToPlayer(s, ['wood', 'stone'])).toBe(false);
    });

    it('every recipe the choice can offer is one the survivor could actually name', () => {
        //  A choice listing something they have never made would BE the catalogue, arriving
        //  through the one door the pivot left open.
        const s = knowsBoth();
        for (const r of knownMatches(s, ['wood', 'stone'])) {
            expect(s.blueprints.some((bp) => bp.recipeId === r.id),
                `offered ${r.id}, which this survivor has never made`).toBe(true);
            expect(allRecipes().some((x) => x.id === r.id)).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
describe('P0-6 — illness is FELT before it is diagnosed', () => {
    const sick = (cause: 'bad-water' | 'chill', severity: number): GameState => {
        const s = fresh();
        s.illness = { severity, cause, gameHoursSick: 3 };
        return s;
    };

    it('the two FREE stages speak a sensation, not a label', () => {
        //  Law 145: symptoms as evidence. A survivor knows their stomach turned over; they do
        //  not know the words "bad water" until the world has taught them.
        for (const cause of ['bad-water', 'chill'] as const) {
            const first = illnessSymptom(sick(cause, 0.1).illness);
            expect(first, `${cause} said nothing at its first stage`).toBeTruthy();
            expect(first!).not.toMatch(/bad.?water|dysentery|infection|illness|sick(ness)?\b/i);
        }
    });

    it('drinking bad water is FELT — the director\'s own report', () => {
        const s = sick('bad-water', 0.1);
        expect(illnessStage(s.illness)).toBe('unsettled');
        expect(illnessSymptom(s.illness)).toMatch(/stomach/i);
    });

    it('the second sensation is a DIFFERENT sentence, and still free', () => {
        const first = illnessSymptom(sick('bad-water', 0.1).illness);
        const worse = illnessSymptom(sick('bad-water', 0.3).illness);
        expect(worse).toBeTruthy();
        expect(worse).not.toBe(first);
    });

    it('a well survivor feels nothing, and the diagnostic voice takes over later', () => {
        expect(illnessSymptom(fresh().illness)).toBeNull();
        //  Past the warning stages `illnessNote` is the voice — the symptom channel goes quiet
        //  rather than both of them talking at once.
        const bad = sick('bad-water', 2.4);
        expect(illnessSymptom(bad.illness)).toBeNull();
        expect(illnessNote(bad.illness)).toBeTruthy();
    });

    it('every cause has both sensations — no cause is silent', () => {
        for (const cause of ['bad-water', 'chill', 'spoiled-food', 'exhaustion'] as const) {
            expect(illnessSymptom(sick(cause as 'chill', 0.1).illness), `${cause} first`).toBeTruthy();
            expect(illnessSymptom(sick(cause as 'chill', 0.3).illness), `${cause} worse`).toBeTruthy();
        }
    });
});

// ---------------------------------------------------------------------------
describe('P0-2 / A-BANDAGE — the bandage verb, and the prose that lied about it', () => {
    //  CAUGHT BY ITS OWN FAIL-THEN-PASS. Planting "You would need to be at the shelter." into
    //  `bindBlocker` left the suite GREEN — nothing tested it at all. The Vitals tab had said
    //  exactly that sentence for two drops while `canBindWound` has never had a location term,
    //  so a bleeding survivor was sent on a walk they did not need and given no button when
    //  they arrived. This is the check that makes the prose answerable to the rule.
    const bleeding = (fiber: number): GameState => {
        const s = fresh();
        s.injuries = { ...s.injuries, bleeding: 2 };
        s.inventory.fiber = fiber;
        return s;
    };

    it('NEVER names a place — binding has no location requirement and never had one', () => {
        for (const fiber of [0, 1, 5, 20]) {
            const said = bindBlocker(bleeding(fiber)) ?? '';
            expect(said, `"${said}" sends the survivor somewhere`)
                .not.toMatch(/shelter|fire|camp|go to|walk|at the/i);
        }
    });

    it('names FIBRE when fibre is the missing thing, and nothing when it is not', () => {
        expect(bindBlocker(bleeding(0))).toMatch(/fibre/i);
        expect(bindBlocker(bleeding(TUNE.injuryBindFiberCost))).toBeNull();
    });

    it('and the verb itself works anywhere — the rule the prose was contradicting', () => {
        for (const at of [{ x: 0, y: 96 }, { x: -40, y: -40 }, { x: 20, y: 10 }]) {
            const s = bleeding(TUNE.injuryBindFiberCost);
            s.player = at;
            expect(canBindWound(s), `refused at ${at.x},${at.y}`).toBe(true);
            expect(bindWound(s)).toBe(true);
            expect(s.injuries.bleeding).toBe(0);
        }
    });

    it('a survivor who is not bleeding is not told anything', () => {
        expect(bindBlocker(fresh())).toBeNull();
        expect(canBindWound(fresh())).toBe(false);
    });
});
