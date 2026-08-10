/**
 * DROP 3B(i) — THE APPOINTMENT. The island's first deadline.
 *
 * THE FIVE CLAIMS THIS SUITE EXISTS FOR:
 *
 *   1.  IT IS A DIFFERENT PLACE FROM THE WRECK. Not the same site, not the same nodes, not the
 *       same state. Easy to blur later, and blurring it would collapse a deadline into a
 *       permanent salvage location — the exact opposite of what this drop is.
 *   2.  D-011, AND STRICTER THAN ANY HAZARD BEFORE IT. The window cannot open, run or close
 *       during an absence. Missing it while away must be STRUCTURALLY impossible, not unlikely.
 *   3.  RAIN'S GRAMMAR, NOT A SECOND ONE. Two free stages before anything is at stake, and the
 *       same scheduling primitive underneath — asserted against `staged.ts` itself.
 *   4.  FAIR CHALLENGE. Reading the smoke and setting out beats ignoring it, measurably.
 *   5.  ABANDON IS A LEGITIMATE ANSWER. A survivor who reads the situation and stays home
 *       loses nothing they had.
 */
import { describe, expect, it } from 'vitest';
import {
    ALL_CRASH_STAGES,
    abandonCost,
    advanceCrash,
    atCrashSite,
    crashBlocked,
    crashBlockedReason,
    crashGone,
    crashSighting,
    crashSiteIsInland,
    crashStageDuration,
    crashWorkable,
    crashYield,
    createInitialState,
    freshCrash,
    namesAFinishedAnswer,
    reconcile,
    stepStaged,
    workCrashSite,
    type CrashStage,
    type GameState,
} from '../src/brain';
import { Session } from '../src/brain/session';
import { MemorySaveRepository } from '../src/brain/save';
import { CRASH_SITE, WORLD, WRECK, isWalkablePoint } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => fullBody(createInitialState(NOW));

/** Run the appointment forward on the ONLINE path, in small spans, to a given stage. */
function runTo(s: GameState, stage: CrashStage, cap = 4000): GameState {
    for (let i = 0; i < cap && s.crash.stage !== stage; i += 1) {
        s.gameHoursElapsed += 0.05;
        advanceCrash(s, 0.05);
    }
    return s;
}

function atSite(s: GameState): GameState {
    s.player.x = CRASH_SITE.x;
    s.player.y = CRASH_SITE.y;
    return s;
}

// ---------------------------------------------------------------------------
describe('it is a NEW site, and not the Wreck', () => {
    it('sits inland, inside the treeline, nowhere near the wreck', () => {
        expect(crashSiteIsInland()).toBe(true);
        expect(Math.hypot(CRASH_SITE.x, CRASH_SITE.y)).toBeLessThan(WORLD.treelineRadius);
        expect(isWalkablePoint(CRASH_SITE.x, CRASH_SITE.y)).toBe(true);
        //  A DIFFERENT PLACE. The wreck is 115 m out to sea; this is in the forest.
        expect(Math.hypot(CRASH_SITE.x - WRECK.x, CRASH_SITE.y - WRECK.y)).toBeGreaterThan(100);
    });

    it('the column has trees to rise over — that is what makes it an announcement', () => {
        //  Law 26: the world tells you first. A crash on open sand would be a thing you simply
        //  see; smoke OVER the treeline is a thing you read.
        expect(Math.hypot(CRASH_SITE.x, CRASH_SITE.y)).toBeLessThan(WORLD.treelineRadius);
    });

    it('working it never touches the wreck, its nodes, or its instability', () => {
        const s = atSite(runTo(fresh(), 'fresh'));
        const wreckBefore = JSON.stringify(s.wreck);
        const nodesBefore = JSON.stringify(s.nodes);
        expect(workCrashSite(s)).toBeTruthy();
        expect(JSON.stringify(s.wreck), 'the appointment moved the wreck').toBe(wreckBefore);
        expect(JSON.stringify(s.nodes), 'the appointment moved a node').toBe(nodesBefore);
    });

    it('yields only wreck-era families — no new material enters the game here', () => {
        const allowed = new Set(['metal', 'wiring', 'glass', 'medicine']);
        for (const stage of ALL_CRASH_STAGES) {
            for (const kind of Object.keys(crashYield(stage))) {
                expect(allowed.has(kind), `${stage} yields ${kind}, which is not wreck-era`).toBe(true);
            }
        }
    });
});

// ---------------------------------------------------------------------------
describe('the world tells you first (Law 26)', () => {
    it('there is nothing to see before it comes down, and something to see the moment it does', () => {
        const before = fresh();
        expect(crashSighting(before).visible).toBe(false);
        expect(crashSighting(before).note).toBeNull();

        const sighted = runTo(fresh(), 'sighted');
        const look = crashSighting(sighted);
        expect(look.visible).toBe(true);
        expect(look.column).toBeGreaterThan(0);
        expect(look.note).toMatch(/smoke|came down/i);
    });

    it('the column THINS as the forest takes it, and is gone when the site is', () => {
        const columns = ALL_CRASH_STAGES.map((stage) => {
            const s = fresh();
            s.crash = { ...s.crash, stage };
            return { stage, column: crashSighting(s).column };
        });
        const by = (st: CrashStage) => columns.find((c) => c.stage === st)!.column;
        expect(by('sighted')).toBeGreaterThan(by('standing'));
        expect(by('standing')).toBeGreaterThan(by('fresh'));
        expect(by('fresh')).toBeGreaterThan(by('picked-over'));
        expect(by('overgrown')).toBe(0);
        expect(by('none')).toBe(0);
    });

    it('the sighting gives a BEARING, never a destination or an instruction', () => {
        const s = runTo(fresh(), 'sighted');
        s.player.x = 0;
        s.player.y = 100;
        const look = crashSighting(s);
        expect(look.bearingDeg).toBeGreaterThanOrEqual(0);
        expect(look.bearingDeg).toBeLessThan(360);
        expect(look.distanceM).toBeGreaterThan(0);
        //  ...and the words never resolve it for the player.
        for (const stage of ALL_CRASH_STAGES) {
            const t = fresh();
            t.crash = { ...t.crash, stage };
            const note = crashSighting(t).note;
            if (note) expect(namesAFinishedAnswer(note), `"${note}" instructs`).toBe(false);
        }
    });

    it('WRECKFALL IS ALWAYS EMPTY OF THE LIVING — arrival canon, swept', () => {
        const living = /\bsurvivor|\bbody|\bbodies|\bcrew\b|\bpilot|\bpassenger|\bwounded|\bscream|\bvoice|\bcalling\b/i;
        for (const stage of ALL_CRASH_STAGES) {
            const s = fresh();
            s.crash = { ...s.crash, stage };
            const note = crashSighting(s).note;
            if (note) expect(living.test(note), `"${note}" puts a person in the wreckfall`).toBe(false);
        }
        for (const s of [fresh()]) {
            expect(living.test(crashBlockedReason(s) ?? '')).toBe(false);
        }
    });
});

// ---------------------------------------------------------------------------
describe('the closing window — a deadline, not a place', () => {
    it('six stages, ending in one that never ends', () => {
        expect(ALL_CRASH_STAGES).toEqual(['none', 'sighted', 'standing', 'fresh', 'picked-over', 'overgrown']);
        expect(crashStageDuration('none')).toBe(Infinity);
        expect(crashStageDuration('overgrown'), 'overgrown is a stage that ends').toBe(Infinity);
        for (const stage of ['sighted', 'standing', 'fresh', 'picked-over'] as const) {
            expect(crashStageDuration(stage)).toBeGreaterThan(0);
            expect(crashStageDuration(stage)).toBeLessThan(Infinity);
        }
    });

    it('TWO FREE STAGES before anything is at stake — Rain\'s contract, restated', () => {
        //  A survivor who sees the smoke and does nothing has not yet lost anything. The two
        //  stages that cost nothing are what make the deadline fair.
        for (const stage of ['sighted', 'standing'] as const) {
            expect(crashWorkable(stage), `${stage} is workable — a warning stage with stakes`).toBe(false);
            expect(crashYield(stage)).toEqual({});
        }
        //  ...and the preparation window is the LONGER of the two.
        expect(crashStageDuration('standing')).toBeGreaterThan(crashStageDuration('sighted'));
    });

    it('once overgrown it is gone FOR GOOD — no second crash, ever', () => {
        const s = runTo(fresh(), 'overgrown');
        expect(crashGone(s.crash.stage)).toBe(true);
        //  Run it a long way further. It must stay gone.
        for (let i = 0; i < 4000; i += 1) { s.gameHoursElapsed += 0.5; advanceCrash(s, 0.5); }
        expect(s.crash.stage).toBe('overgrown');
        expect(crashWorkable(s.crash.stage)).toBe(false);
        expect(workCrashSite(atSite(s))).toBeNull();
    });

    it('working it neither shortens nor extends the window', () => {
        //  What makes it a deadline rather than a resource bar: you cannot buy time by hurrying.
        const worked = atSite(runTo(fresh(), 'fresh'));
        const idle = atSite(runTo(fresh(), 'fresh'));
        for (let i = 0; i < 6; i += 1) workCrashSite(worked);
        expect(worked.crash.inStageGameHours).toBeCloseTo(idle.crash.inStageGameHours, 6);
        expect(worked.crash.stage).toBe(idle.crash.stage);
    });

    it('REACHABILITY — a survivor who walks to it is in range, and one who does not is not', () => {
        //  The gate the body checks before it will let anybody work the site. A gate no
        //  walkable point satisfies would make the whole appointment unreachable while every
        //  other test here still passed — [[D-114]]'s class, which the brief names
        //  non-negotiable at four confirmed instances.
        expect(atCrashSite(atSite(runTo(fresh(), 'fresh')))).toBe(true);

        const far = runTo(fresh(), 'fresh');
        far.player.x = 0;
        far.player.y = 100;
        expect(atCrashSite(far)).toBe(false);

        //  ...and the range is generous enough to stand beside the wreckage, not inside it.
        const edge = runTo(fresh(), 'fresh');
        edge.player.x = CRASH_SITE.x;
        edge.player.y = CRASH_SITE.y - (TUNE.interactRadiusM + TUNE.crashSiteRadiusM) + 0.2;
        expect(atCrashSite(edge)).toBe(true);
    });

    it('names the ONE thing in the way, and never "requirements not met"', () => {
        const before = fresh();
        expect(crashBlocked(before)).toBe('not-there');
        expect(crashBlockedReason(before)).toMatch(/nothing has come down/i);

        const far = runTo(fresh(), 'fresh');
        far.player.x = 0; far.player.y = 100;
        expect(crashBlocked(far)).toBe('too-far');
        expect(crashBlockedReason(far)).toMatch(/too far|walk in/i);

        const gone = atSite(runTo(fresh(), 'overgrown'));
        expect(crashBlocked(gone)).toBe('gone');
        expect(crashBlockedReason(gone)).toMatch(/closed over/i);

        expect(crashBlocked(atSite(runTo(fresh(), 'fresh')))).toBeNull();
    });
});

// ---------------------------------------------------------------------------
describe('no third scheduling system — the storm\'s own primitive, extended', () => {
    it('the appointment runs on `stepStaged`, and so does the weather', () => {
        //  Asserted against the primitive itself rather than by reading two files: a hand-rolled
        //  copy would drift the moment one of them was tuned.
        const rules = {
            idle: 'none' as CrashStage,
            first: 'sighted' as CrashStage,
            durationOf: crashStageDuration,
            nextOf: (st: CrashStage) => ALL_CRASH_STAGES[Math.min(ALL_CRASH_STAGES.indexOf(st) + 1, ALL_CRASH_STAGES.length - 1)],
            intervalAfter: null,
        };
        const start = { stage: 'none' as CrashStage, inStageGameHours: 0, nextAtGameHours: 10 };
        //  Idles until its appointment...
        expect(stepStaged(start, 5, 0.1, rules).next.stage).toBe('none');
        //  ...then crosses WITHOUT consuming the span.
        const opened = stepStaged(start, 10, 0.1, rules);
        expect(opened.next.stage).toBe('sighted');
        expect(opened.next.inStageGameHours).toBe(0);
        expect(opened.step.changed).toBe(true);
    });

    it('crosses at most ONE boundary per call — a free stage can never be skipped', () => {
        const s = fresh();
        s.gameHoursElapsed = TUNE.crashFirstAtGameHours;
        advanceCrash(s, 0.05);
        expect(s.crash.stage).toBe('sighted');
        //  A single enormous span must not leap past `standing` into the workable window.
        advanceCrash(s, 10_000);
        expect(s.crash.stage, 'one call skipped a stage').toBe('standing');
    });
});

// ---------------------------------------------------------------------------
describe('FAIR CHALLENGE — reading the smoke pays, measurably', () => {
    it('a survivor who sets out during the free stages salvages more than one who does not', () => {
        //  THE ASYMMETRY, the same standard the storm gets. Both work the site the same number
        //  of times; the only difference is WHEN they arrive, which is the only thing reading
        //  the smoke could ever buy.
        const PREPARED = (() => {
            const s = atSite(runTo(fresh(), 'fresh'));
            for (let i = 0; i < 4; i += 1) workCrashSite(s);
            return s.inventory.metal + s.inventory.wiring + s.inventory.glass;
        })();

        const LATE = (() => {
            const s = atSite(runTo(fresh(), 'picked-over'));
            for (let i = 0; i < 4; i += 1) workCrashSite(s);
            return s.inventory.metal + s.inventory.wiring + s.inventory.glass;
        })();

        const IGNORED = (() => {
            const s = atSite(runTo(fresh(), 'overgrown'));
            for (let i = 0; i < 4; i += 1) workCrashSite(s);
            return s.inventory.metal + s.inventory.wiring + s.inventory.glass;
        })();

        expect(PREPARED).toBeGreaterThan(LATE);
        expect(LATE).toBeGreaterThan(IGNORED);
        expect(IGNORED).toBe(0);
        //  ...and the gap is worth the walk, not a rounding difference.
        expect(PREPARED).toBeGreaterThan(LATE * 1.5);
    });

    it('being LATE is a worse outcome, never a wasted journey', () => {
        //  A survivor who arrives during `picked-over` still finds something. Turning up late
        //  to nothing would make the window a trap rather than a deadline.
        expect(Object.keys(crashYield('picked-over')).length).toBeGreaterThan(0);
        expect(crashStageDuration('picked-over')).toBeGreaterThan(crashStageDuration('fresh'));
    });

    it('ABANDONING COSTS NOTHING — reading it correctly is not a failure state', () => {
        const stayed = fresh();
        const before = JSON.stringify({ inv: stayed.inventory, health: stayed.health, energy: stayed.energy });
        runTo(stayed, 'overgrown');
        const after = JSON.stringify({ inv: stayed.inventory, health: stayed.health, energy: stayed.energy });
        expect(after, 'letting the window close took something').toBe(before);
        expect(abandonCost()).toBe(0);
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — the window cannot open, run, or close while you are away', () => {
    it('`reconcile` has no crash term at all, over any span', () => {
        for (const hours of [4, 48, 24 * 30]) {
            const s = runTo(fresh(), 'standing');
            const stage = s.crash.stage;
            const inStage = s.crash.inStageGameHours;
            const after = reconcile(s, hours * 3600).state;
            expect(after.gameHoursElapsed).toBeGreaterThan(s.gameHoursElapsed);
            expect(after.crash.stage, `${hours} h away moved the appointment`).toBe(stage);
            expect(after.crash.inStageGameHours).toBeCloseTo(inStage, 9);
        }
    });

    it('MISSING IT WHILE AWAY IS STRUCTURALLY IMPOSSIBLE — a month offline, then the full window', () => {
        //  The strongest form of the claim, and the reason this is stricter than the storm.
        //  A month of absence must leave the appointment untouched AND still fully available.
        const repo = new MemorySaveRepository();
        const { session } = Session.start(repo, NOW);
        session.state.crash = { ...freshCrash(), nextAtGameHours: 1 };
        session.persist(NOW);

        const back = Session.start(repo, NOW + 30 * 24 * 60 * 60 * 1000).session;
        expect(back.state.crash.stage, 'a month away opened the window').toBe('none');

        //  ...and now, online, the whole thing is still there to be had.
        runTo(back.state, 'fresh');
        expect(back.state.crash.stage).toBe('fresh');
        expect(crashWorkable(back.state.crash.stage)).toBe(true);
        expect(workCrashSite(atSite(back.state))).toBeTruthy();
    });

    it('a BACKGROUNDED TAB cannot close the window either', () => {
        //  `Session.resume`'s path — the one [[D-129]] missed for the divers.
        const repo = new MemorySaveRepository();
        const running = Session.start(repo, NOW).session;
        runTo(running.state, 'fresh');
        const inStage = running.state.crash.inStageGameHours;
        running.resume(NOW + 12 * 60 * 60 * 1000);
        expect(running.state.crash.stage, 'a backgrounded tab advanced the window').toBe('fresh');
        expect(running.state.crash.inStageGameHours).toBeCloseTo(inStage, 9);
    });

    it('standing at the site over an absence costs a body nothing extra', () => {
        const there = atSite(runTo(fresh(), 'fresh'));
        const away = runTo(fresh(), 'fresh');
        away.player.x = 0;
        away.player.y = 40;
        const a = reconcile(there, 6 * 3600).state;
        const b = reconcile(away, 6 * 3600).state;
        expect(a.health).toBeCloseTo(b.health, 6);
        expect(a.energy).toBeCloseTo(b.energy, 6);
    });
});
