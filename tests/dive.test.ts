/**
 * THE UNDERWATER SLICE — the air budget, the five stages, the cold, and D-011.
 *
 * The suite is ordered by what would hurt most if it broke: the absence law first, because a
 * survivor who drowns while the tab is shut is the one failure this project has declared
 * unacceptable outright; then the two-warnings contract; then depth, cold and salvage.
 */
import { describe, expect, it } from 'vitest';
import {
    airCapacityOf,
    canSubmerge,
    createInitialState,
    depthAt,
    developFromDiving,
    diveCostsFor,
    diveNote,
    diveSpeedMultiplierOf,
    diveStageOf,
    diveTrainingContext,
    divableDepthOf,
    divePartYield,
    gatherNode,
    isDrowningAt,
    realSecondsFromGameHours,
    reconcile,
    submerge,
    submergeForNode,
    submergedDepthForThermal,
    surface,
    trainingStimulus,
    type DiveStage,
    type GameState,
} from '../src/brain';
//  `thermal` is deliberately NOT on the brain's public surface — the body reads heat through
//  `bodyReport`, not directly — so the depth term is exercised at its own module.
import { netHeatFlowPerGameHour, type ThermalContext } from '../src/brain/thermal';
//  The absence path is a SESSION concern now, not a `reconcile` one — see the block below.
import { Session } from '../src/brain/session';
import { MemorySaveRepository, deserialize } from '../src/brain/save';
import { SCHEMA_VERSION } from '../src/brain/types';
import { TUNE } from '../src/data/tune';
import { DIVE_PARTS, DIVE_SITE, WORLD, groundHeight } from '../src/data/world';

const NOW = 1_770_000_000_000;

/** A complete thermal context. Every field the shipped model reads, so nothing comes back NaN. */
const THERMAL_BASE: ThermalContext = {
    isNight: true, sheltered: false, shelterGrade: null, windExposed: true,
    fireLit: false, atFire: false, wet: 0, bedding: 'bare-ground',
    clothing: 0, resting: false, activity: 1, nutrition: 80, enclosed: false,
};

function fresh(): GameState {
    return createInitialState(NOW);
}

/** A survivor standing over the dive site, on the bottom's own coordinates. */
function atSite(): GameState {
    const s = fresh();
    s.player.x = DIVE_SITE.x;
    s.player.y = DIVE_SITE.y;
    return s;
}

function under(air: number = TUNE.diveAirCapacityBase): GameState {
    const s = atSite();
    s.dive.submerged = true;
    s.dive.air = air;
    return s;
}

describe('the dive site is genuinely deep', () => {
    it('sits under about seven metres of water, which is what the air budget is tuned against', () => {
        const d = depthAt(DIVE_SITE.x, DIVE_SITE.y);
        expect(d).toBeGreaterThan(6.5);
        expect(d).toBeLessThan(7.5);
        //  The stated arithmetic, not a re-derivation of it: flat seabed under a fixed sea.
        expect(groundHeight(DIVE_SITE.x, DIVE_SITE.y)).toBeCloseTo(WORLD.seaLevel - d, 6);
    });

    it('puts every authored salvage point deep enough to submerge into', () => {
        for (const [dx, dz] of DIVE_PARTS) {
            const d = depthAt(DIVE_SITE.x + dx, DIVE_SITE.y + dz);
            expect(d).toBeGreaterThanOrEqual(TUNE.diveMinDepthM);
        }
    });

    it('spreads the points wider than one interact radius, so a breath is a budget', () => {
        //  If every point were reachable from one spot the air would never be a decision.
        let maxSpan = 0;
        for (const a of DIVE_PARTS) {
            for (const b of DIVE_PARTS) {
                maxSpan = Math.max(maxSpan, Math.hypot(a[0] - b[0], a[1] - b[1]));
            }
        }
        expect(maxSpan).toBeGreaterThan(TUNE.interactRadiusM * 2);
    });

    it('reports zero depth on dry land, and refuses a dive there', () => {
        const s = fresh();
        expect(divableDepthOf(s)).toBe(0);
        expect(canSubmerge(s)).toBe(false);
        expect(submerge(s)).toBe(false);
        expect(s.dive.submerged).toBe(false);
    });

    it('refuses a dive from aboard the raft — you are ON the water, not in it', () => {
        const s = atSite();
        expect(canSubmerge(s)).toBe(true);
        s.raft.aboard = true;
        expect(divableDepthOf(s)).toBe(0);
        expect(canSubmerge(s)).toBe(false);
    });
});

describe('D-011 — no absence of any length can spend a breath', () => {
    it('leaves air EXACTLY where it was across a three-day absence', () => {
        //  This is the law, and it is a statement about `reconcile` containing no air term at
        //  all. Not "no worse" — UNCHANGED, to the bit.
        const s = under(70);
        const after = reconcile(s, 3 * 24 * 3600).state;
        expect(after.dive.air).toBe(70);
    });

    it('never lowers health for drowning across an absence, at any air level', () => {
        //  A property across the whole reserve, including empty — the state a drowning
        //  survivor closes the tab in, and the one a naive elapsed-time term would kill.
        for (const air of [0, 1, 8, 16, 40, 55, 100]) {
            for (const seconds of [30, 600, 3600, 8 * 3600, 3 * 24 * 3600]) {
                const s = under(air);
                const healthBefore = s.health;
                const after = reconcile(s, seconds).state;
                expect(after.health).toBeGreaterThanOrEqual(healthBefore);
            }
        }
    });

    it('is STRUCTURAL: the whole absence path contains no term that lowers air', () => {
        //  The vacuity guard for the two above. A 400-second span is long enough for a real
        //  drain to show and short enough that nothing else has bottomed out, so this cannot
        //  pass by both sides hitting the same floor — the failure mode that made an earlier
        //  version of this project's D-011 test pass while proving nothing.
        const submergedRun = reconcile(under(50), 400).state;
        const surfacedRun = reconcile(atSite(), 400).state;
        expect(submergedRun.dive.air).toBe(50);
        expect(submergedRun.health).toBe(surfacedRun.health);
        //  And the witness that the span was real: something else DID move over those 400 s.
        expect(submergedRun.gameHoursElapsed).toBeGreaterThan(0);
        expect(submergedRun.thirst).toBeLessThan(under(50).thirst);
    });
});

describe('coming back up is what an ABSENCE does, and only an absence', () => {
    /** A session holding an arbitrary body, with the clock parked at T0. */
    const sessionWith = (mutate: (s: GameState) => void) => {
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        mutate(session.state);
        session.state.lastSeenMs = NOW;
        return session;
    };

    it('brings a submerged survivor UP, with a full breath, on a BACKGROUNDED-TAB return', () => {
        const session = sessionWith((s) => {
            s.player.x = DIVE_SITE.x; s.player.y = DIVE_SITE.y;
            s.dive.submerged = true; s.dive.air = 1;
        });
        session.resume(NOW + 4 * 3600 * 1000);
        expect(session.state.dive.submerged).toBe(false);
        expect(session.state.dive.air).toBe(airCapacityOf(session.state.capacities));
    });

    it('...and on a RELOAD, which is the other absence path and the one I first missed', () => {
        //  THE DEFECT THE DEVICE FOUND, and it is why `afterAbsence` is a named function.
        //  `Session.start` folds in the time a reload was away; `Session.resume` folds in the
        //  time a backgrounded tab was away. Same event to a player, two call sites to me —
        //  and surfacing went into `resume` alone. The harness reloads, so it came back with
        //  a survivor at health 0.000, still submerged, drowned across four hours of absence.
        //  D-011 breached by a missing line. Both paths are checked here, forever.
        const repo = new MemorySaveRepository();
        const first = Session.start(repo, NOW).session;
        first.state.player.x = DIVE_SITE.x;
        first.state.player.y = DIVE_SITE.y;
        first.state.dive.submerged = true;
        first.state.dive.air = 1;
        first.state.health = 40;
        first.persist(NOW);

        const reloaded = Session.start(repo, NOW + 4 * 3600 * 1000).session;
        expect(reloaded.state.dive.submerged, 'a reload left the survivor underwater').toBe(false);
        expect(reloaded.state.dive.air).toBe(airCapacityOf(reloaded.state.capacities));
        expect(reloaded.state.health, 'the absence drowned them').toBeGreaterThan(0);
    });

    it('and a four-hour absence costs a submerged body EXACTLY what it costs a floating one', () => {
        //  The real D-011 claim, as a paired comparison. Absence still costs thirst and
        //  warmth — it always did — so "health did not fall" would be the wrong test. What
        //  must be true is that being UNDER added nothing to the bill.
        const dived = sessionWith((s) => {
            s.player.x = DIVE_SITE.x; s.player.y = DIVE_SITE.y;
            s.dive.submerged = true; s.dive.air = 1; s.health = 40;
        });
        const afloat = sessionWith((s) => {
            s.player.x = DIVE_SITE.x; s.player.y = DIVE_SITE.y;
            s.dive.submerged = false; s.dive.air = 1; s.health = 40;
        });
        dived.resume(NOW + 4 * 3600 * 1000);
        afloat.resume(NOW + 4 * 3600 * 1000);
        expect(dived.state.health).toBe(afloat.state.health);
    });

    it('DOES NOT surface anybody on an ordinary online tick — the defect that shipped', () => {
        //  THE REGRESSION THIS FILE EXISTS FOR, and the reason `surfaceOnAbsence` no longer
        //  lives in `reconcile`. `Session.tick` calls `reconcile` too, with a 16 ms span, so
        //  a courtesy written as "an absence brings the diver up" ran sixty times a second
        //  and surfaced them the instant they went under. Every test in this file passed
        //  throughout, because every one of them called `reconcile` directly with a LONG
        //  span and never once with a frame. The device harness found it in one run.
        const session = sessionWith((s) => {
            s.player.x = DIVE_SITE.x; s.player.y = DIVE_SITE.y;
            s.dive.submerged = true; s.dive.air = 90;
        });
        for (let frame = 0; frame < 30; frame++) session.tick(NOW + (frame + 1) * 16);
        expect(session.state.dive.submerged, 'a frame surfaced the diver').toBe(true);
        //  ...and the online tick IS spending the breath, or the check above would pass on a
        //  diver nothing is happening to at all.
        expect(session.state.dive.air).toBeLessThan(90);
    });

    it('surfaces a diver whose water stopped being deep, and only then', () => {
        const session = sessionWith((s) => {
            s.player.x = DIVE_SITE.x; s.player.y = DIVE_SITE.y;
            s.dive.submerged = true; s.dive.air = 90;
        });
        session.tick(NOW + 16);
        expect(session.state.dive.submerged).toBe(true);
        //  Ashore mid-dive: the model refuses to describe someone as submerged on dry land.
        session.state.player.x = 0;
        session.state.player.y = 0;
        session.tick(NOW + 32);
        expect(session.state.dive.submerged).toBe(false);
    });
});

describe('the five stages, and the two warnings', () => {
    it('reads surfaced when not under, whatever the air says', () => {
        const s = atSite();
        s.dive.air = 0;
        expect(diveStageOf(s)).toBe('surfaced');
    });

    it('walks holding -> burning -> failing -> blacking-out as the air falls', () => {
        expect(diveStageOf(under(TUNE.diveAirCapacityBase))).toBe('holding');
        expect(diveStageOf(under(TUNE.diveBurningAir + 0.01))).toBe('holding');
        expect(diveStageOf(under(TUNE.diveBurningAir))).toBe('burning');
        expect(diveStageOf(under(TUNE.diveFailingAir + 0.01))).toBe('burning');
        expect(diveStageOf(under(TUNE.diveFailingAir))).toBe('failing');
        expect(diveStageOf(under(0.01))).toBe('failing');
        expect(diveStageOf(under(0))).toBe('blacking-out');
    });

    it('says NOTHING at holding, and speaks exactly twice before harm', () => {
        expect(diveNote('surfaced')).toBeNull();
        //  The silence is the mechanism. Two warnings only carry if the stage before them
        //  does not — the same rule that keeps `swimming` and a sound hull quiet.
        expect(diveNote('holding')).toBeNull();
        const spoken = (['burning', 'failing'] as DiveStage[]).map(diveNote);
        expect(spoken.every((n) => typeof n === 'string' && n.length > 0)).toBe(true);
        expect(new Set(spoken).size).toBe(2);
        expect(diveNote('blacking-out')).toBeTruthy();
    });

    it('lets exactly one stage take health, and it is the last one', () => {
        const stages: DiveStage[] = ['surfaced', 'holding', 'burning', 'failing', 'blacking-out'];
        expect(stages.filter(isDrowningAt)).toEqual(['blacking-out']);
    });

    it('charges nothing at any stage but the last', () => {
        for (const air of [TUNE.diveAirCapacityBase, TUNE.diveBurningAir, TUNE.diveFailingAir, 0.5]) {
            expect(diveCostsFor(under(air)).healthPerGameHour).toBe(0);
        }
        expect(diveCostsFor(under(0)).healthPerGameHour).toBeGreaterThan(0);
    });

    it('gives each warning the time its own job needs', () => {
        //  The design of the stage, as two numbers. `burning` must leave room to finish a
        //  thought and start up; `failing` must be long enough that "go up" is a real option
        //  and short enough that "one more point" is not.
        const secondsAt = (air: number) => {
            const costs = diveCostsFor(under(air));
            return realSecondsFromGameHours(air / costs.airPerGameHour);
        };
        const burning = secondsAt(TUNE.diveBurningAir);
        const failing = secondsAt(TUNE.diveFailingAir);
        expect(burning).toBeGreaterThan(4);
        expect(burning).toBeLessThan(12);
        expect(failing).toBeGreaterThan(1);
        expect(failing).toBeLessThan(8);
        //  And the silence before the first warning is the longest stretch of the dive.
        const silence = secondsAt(TUNE.diveAirCapacityBase) - burning;
        expect(silence).toBeGreaterThan(burning);
    });
});

describe('depth is felt, as time and as cold', () => {
    it('costs more air per hour the deeper the diver is', () => {
        const shallow = under();
        shallow.player.x = 0;
        shallow.player.y = 0;
        //  Somewhere genuinely in the water but not out at the site's depth.
        let found = false;
        for (let y = 90; y < 240 && !found; y += 2) {
            shallow.player.y = y;
            if (divableDepthOf(shallow) >= TUNE.diveMinDepthM && divableDepthOf(shallow) < 5) found = true;
        }
        expect(found).toBe(true);
        const deep = diveCostsFor(under());
        const near = diveCostsFor(shallow);
        expect(deep.depthM).toBeGreaterThan(near.depthM);
        expect(deep.airPerGameHour).toBeGreaterThan(near.airPerGameHour);
    });

    it('costs nothing at all while surfaced', () => {
        const costs = diveCostsFor(atSite());
        expect(costs.airPerGameHour).toBe(0);
        expect(costs.healthPerGameHour).toBe(0);
        expect(costs.stage).toBe('surfaced');
    });

    it('scales the SHIPPED evaporative term rather than adding a rival to it', () => {
        const soaked: ThermalContext = { ...THERMAL_BASE, wet: TUNE.wetMax };
        const dry = netHeatFlowPerGameHour(soaked);
        const deep = netHeatFlowPerGameHour({ ...soaked, submergedDepthM: 7 });
        //  Not a NaN pair agreeing with itself: both must be real numbers first. An earlier
        //  draft of this check passed an incomplete context, got NaN on both sides, and the
        //  sibling test below went green on Object.is(NaN, NaN) — vacuous, D-066's leg (a).
        expect(Number.isFinite(dry.net)).toBe(true);
        expect(Number.isFinite(deep.net)).toBe(true);
        expect(deep.net).toBeLessThan(dry.net);
        //  It lands on the EVAPORATIVE term specifically, not on the total by some other road.
        expect(deep.evaporativeLoss).toBeLessThan(soaked.wet === 0 ? 1 : dry.evaporativeLoss);
        expect(deep.evaporativeLoss).toBeCloseTo(dry.evaporativeLoss * (1 + 7 * TUNE.thermalDepthChillPerMetre), 6);
        //  And ONE multiplier on the wet term means a body that is not wet cannot be chilled
        //  by depth — the proof it is not a second opinion about heat.
        const dryBody = netHeatFlowPerGameHour({ ...THERMAL_BASE, wet: 0 });
        const dryBodyDeep = netHeatFlowPerGameHour({ ...THERMAL_BASE, wet: 0, submergedDepthM: 7 });
        expect(Number.isFinite(dryBody.net)).toBe(true);
        expect(dryBodyDeep.net).toBe(dryBody.net);
    });

    it('leaves every pre-diving caller bit-for-bit unchanged', () => {
        const ctx: ThermalContext = { ...THERMAL_BASE, wet: 40, clothing: 0.3, nutrition: 80 };
        const shipped = netHeatFlowPerGameHour(ctx);
        expect(Number.isFinite(shipped.net)).toBe(true);
        expect(netHeatFlowPerGameHour({ ...ctx, submergedDepthM: 0 }).net).toBe(shipped.net);
        expect(netHeatFlowPerGameHour({ ...ctx, submergedDepthM: undefined }).net).toBe(shipped.net);
        //  A negative depth cannot warm anybody, which is what the Math.max in the term is for.
        expect(netHeatFlowPerGameHour({ ...ctx, submergedDepthM: -5 }).net).toBe(shipped.net);
    });

    it('reports depth to the thermal model only while actually under', () => {
        expect(submergedDepthForThermal(atSite())).toBe(0);
        expect(submergedDepthForThermal(under())).toBeGreaterThan(6.5);
    });

    it('and the SHIPPED game actually asks it — a live dive costs warmth faster', () => {
        //  THE ZERO-CALLER CHECK, and it is here because the depth chill did not have one.
        //  `submergedDepthM` existed on the context, the multiplier existed in the balance,
        //  and NOTHING in the game ever passed it: the whole "deeper is colder" claim was a
        //  field, a formula and no wire. Same shape as `craftSpear` (D-114), the Backpack
        //  door, and the trace tap — four times now, so this checks the wire and not the
        //  formula. It runs the real `Session.tick` and compares two identical bodies in the
        //  same water, one under and one on top of it.
        const repo = new MemorySaveRepository();
        const build = (submerged: boolean) => {
            const { session } = Session.start(new MemorySaveRepository(), NOW);
            const s = session.state;
            s.player.x = DIVE_SITE.x; s.player.y = DIVE_SITE.y;
            s.warmth = 80;
            s.wet = TUNE.wetMax;
            s.dive.submerged = submerged;
            s.dive.air = TUNE.diveAirCapacityBase * 100;   // never runs out inside the window
            s.lastSeenMs = NOW;
            return session;
        };
        void repo;
        const deep = build(true);
        const shallow = build(false);
        for (let i = 1; i <= 40; i++) {
            deep.tick(NOW + i * 250);
            shallow.tick(NOW + i * 250);
        }
        expect(deep.state.dive.submerged, 'the diver surfaced mid-test').toBe(true);
        expect(deep.state.warmth).toBeLessThan(shallow.state.warmth);
        //  ...and the surfaced one did lose warmth too, so this is not "one froze, one didn't".
        expect(shallow.state.warmth).toBeLessThan(80);
    });

    it('but an ABSENCE never pays it — the diver is up before an hour of it is counted', () => {
        //  The other half of the wire. `reconcile` is shared between the online tick and both
        //  absence paths, so the depth chill would have reached four hours of not-playing if
        //  `afterAbsence` ran after it instead of before. Two identical bodies, one submerged,
        //  four hours away: the warmth bill must be identical to the bit.
        const away = (submerged: boolean) => {
            const repo = new MemorySaveRepository();
            const { session } = Session.start(repo, NOW);
            session.state.player.x = DIVE_SITE.x;
            session.state.player.y = DIVE_SITE.y;
            session.state.warmth = 80;
            session.state.wet = TUNE.wetMax;
            session.state.dive.submerged = submerged;
            session.state.lastSeenMs = NOW;
            session.resume(NOW + 4 * 3600 * 1000);
            return session.state.warmth;
        };
        expect(away(true)).toBe(away(false));
    });

    it('slows a submerged diver, and a fumbling one more', () => {
        expect(diveSpeedMultiplierOf(atSite())).toBe(1);
        const holding = diveSpeedMultiplierOf(under());
        const fumbling = diveSpeedMultiplierOf(under(TUNE.diveFailingAir));
        expect(holding).toBeLessThan(1);
        expect(fumbling).toBeLessThan(holding);
    });
});

describe('the breath itself', () => {
    it('grows with breathWaterConfidence, and never without limit', () => {
        const none = airCapacityOf({ ...fresh().capacities, breathWaterConfidence: 0 });
        const full = airCapacityOf({ ...fresh().capacities, breathWaterConfidence: 100 });
        expect(none).toBe(TUNE.diveAirCapacityBase);
        expect(full).toBeGreaterThan(none);
        //  §12: "does not extend human physiology without limit."
        expect(full).toBeLessThan(none * 2);
        //  And it cannot be pushed past full by an out-of-range score.
        expect(airCapacityOf({ ...fresh().capacities, breathWaterConfidence: 400 })).toBe(full);
    });

    it('goes under and comes back up, and each refuses the state it is already in', () => {
        const s = atSite();
        expect(submerge(s)).toBe(true);
        expect(submerge(s)).toBe(false);
        expect(surface(s)).toBe(true);
        expect(surface(s)).toBe(false);
    });
});

describe('breathWaterConfidence gains its second producer', () => {
    it('credits an ordinary breath-hold', () => {
        const before = fresh().capacities;
        const after = developFromDiving(before, 'holding', TUNE.diveBoutGameHours);
        expect(after.breathWaterConfidence).toBeGreaterThan(before.breathWaterConfidence);
        expect(after.mobilityBalance).toBeGreaterThan(before.mobilityBalance);
    });

    it('credits NOTHING for diving to the edge of drowning', () => {
        const before = fresh().capacities;
        //  Or "dive until you nearly die" becomes the optimal way to get better at diving,
        //  which is the shape of every grind this project has refused.
        for (const stage of ['failing', 'blacking-out'] as DiveStage[]) {
            const after = developFromDiving(before, stage, TUNE.diveBoutGameHours * 20);
            expect(after.breathWaterConfidence).toBe(before.breathWaterConfidence);
        }
    });

    it('states its legs in the capacity model\'s own vocabulary, and they hold', () => {
        expect(diveTrainingContext('blacking-out').recoverable).toBe(false);
        expect(diveTrainingContext('failing').overloaded).toBe(true);
        expect(diveTrainingContext('holding').meaningfulStimulus).toBe(true);
        //  The legs are not decoration: `trainingStimulus` is what actually reads them.
        expect(trainingStimulus('breathWaterConfidence', diveTrainingContext('blacking-out'))).toBe(0);
        expect(trainingStimulus('breathWaterConfidence', diveTrainingContext('holding'))).toBeGreaterThan(0);
    });

    it('develops by DURATION, so frame rate cannot change how fast anyone learns', () => {
        const before = fresh().capacities;
        const oneSpan = developFromDiving(before, 'holding', 0.04);
        let stepped = before;
        for (let i = 0; i < 8; i++) stepped = developFromDiving(stepped, 'holding', 0.005);
        expect(stepped.breathWaterConfidence).toBeCloseTo(oneSpan.breathWaterConfidence, 6);
    });
});

describe('the salvage down there', () => {
    it('authors a distinct yield per point, so the site can be LEARNED', () => {
        const yields = ['dv1', 'dv2', 'dv3', 'dv4'].map((id) => JSON.stringify(divePartYield(id)));
        expect(new Set(yields).size).toBe(4);
    });

    it('holds the game\'s other medical store, and it is behind a breath', () => {
        expect(divePartYield('dv4').medicine).toBeGreaterThan(0);
    });

    it('falls back to plating for an id it has never heard of, rather than throwing', () => {
        expect(divePartYield('dv99').metal).toBeGreaterThan(0);
    });

    it('is worked with the ORDINARY gather verb and pays out for real', () => {
        const s = under();
        const part = s.nodes.find((n) => n.id === 'dv1');
        expect(part).toBeTruthy();
        s.player.x = part!.x;
        s.player.y = part!.y;
        const before = s.inventory.metal;
        const result = gatherNode(s, 'dv1');
        expect(result.ok).toBe(true);
        expect(s.inventory.metal).toBeGreaterThan(before);
        expect(s.inventory.glass).toBeGreaterThan(0);
    });

    it('charges effort for the work, above the wreck\'s, because you are not breathing', () => {
        expect(TUNE.divePartEffortEnergy).toBeGreaterThan(TUNE.wreckPartEffortEnergy);
    });

    it('adds NO second threat on top of the air — the air IS the threat', () => {
        const s = under();
        const part = s.nodes.find((n) => n.id === 'dv3')!;
        s.player.x = part.x;
        s.player.y = part.y;
        const healthBefore = s.health;
        gatherNode(s, 'dv3');
        //  Unlike the wreck's giving-way hull, working a submerged point never wounds. One
        //  legible danger reads; two stacked on each other read as neither.
        expect(s.health).toBe(healthBefore);
    });
});

describe('the save', () => {
    it('MIGRATION v25 -> v26: the sunken points MERGE, the breath arrives full and surfaced', () => {
        const old = fresh() as unknown as Record<string, unknown>;
        old.nodes = (old.nodes as GameState['nodes']).filter((n) => n.kind !== 'divepart');
        delete old.dive;

        const loaded = deserialize(JSON.stringify({
            schemaVersion: 25, savedAtMs: NOW, state: { ...old, schemaVersion: 25 },
        }));
        expect(loaded).not.toBeNull();
        expect(loaded!.state.schemaVersion).toBe(SCHEMA_VERSION);

        //  MERGES, for the wreck's own reason: what sank has been down there since before
        //  anyone washed ashore, and a save without it is a save on a different sea.
        expect(loaded!.state.nodes.filter((n) => n.kind === 'divepart').length).toBe(DIVE_PARTS.length);
        //  The body arrives at the SURFACE with a full breath — the only honest state for a
        //  returning player, and the same one an absence produces.
        expect(loaded!.state.dive.submerged).toBe(false);
        expect(loaded!.state.dive.air).toBeGreaterThan(0);
        expect(loaded!.state.dive.deepestM).toBe(0);
        //  And no free salvage: what is down there still has to be gone and got.
        for (const kind of ['metal', 'wiring', 'glass', 'medicine'] as const) {
            expect(loaded!.state.inventory[kind]).toBe(0);
        }
    });

    it('does not hand an existing save a second set of sunken points', () => {
        const cur = fresh();
        const loaded = deserialize(JSON.stringify({
            schemaVersion: 25, savedAtMs: NOW, state: { ...cur, schemaVersion: 25 },
        }));
        expect(loaded!.state.nodes.filter((n) => n.kind === 'divepart').length).toBe(DIVE_PARTS.length);
    });

    it('keeps a survivor who was mid-dive when they last saved, and brings them up', () => {
        //  A save written while submerged is a real save. It must load — and it must load a
        //  survivor at the surface, because `Session.start` is an absence path.
        const mid = fresh() as unknown as Record<string, unknown>;
        (mid as { dive: GameState['dive'] }).dive = { submerged: true, air: 3, deepestM: 7 };
        const loaded = deserialize(JSON.stringify({
            schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: { ...mid, schemaVersion: SCHEMA_VERSION },
        }));
        //  `deserialize` alone preserves it — coming up is the SESSION's job, not the save's.
        expect(loaded!.state.dive.submerged).toBe(true);
        const repo = new MemorySaveRepository();
        repo.write(JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAtMs: NOW, state: loaded!.state }));
        const { session } = Session.start(repo, NOW + 60_000);
        expect(session.state.dive.submerged).toBe(false);
    });
});

describe('reaching for the bottom is what starts a dive', () => {
    it('submerges when a submerged point is the thing being reached for', () => {
        const s = atSite();
        expect(submergeForNode(s, 'dv1')).toBe(true);
        expect(s.dive.submerged).toBe(true);
    });

    it('does nothing for an ordinary land node, or an id that does not exist', () => {
        const s = atSite();
        const tree = s.nodes.find((n) => n.kind === 'tree')!;
        expect(submergeForNode(s, tree.id)).toBe(false);
        expect(submergeForNode(s, 'nope')).toBe(false);
        expect(s.dive.submerged).toBe(false);
    });

    it('refuses when the water where the survivor stands is too shallow to go under', () => {
        const s = fresh();
        expect(submergeForNode(s, 'dv1')).toBe(false);
        expect(s.dive.submerged).toBe(false);
    });
});
