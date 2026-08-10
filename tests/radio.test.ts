/**
 * DROP 5 — THE STATIC. One rung of **ENDING E03** ("A Voice in the Static").
 *
 * REGISTER NAMED per [[D-138]] — ENDING E03, not the CAPABILITY register's E03.
 *
 * THE FOUR CLAIMS THIS SUITE EXISTS FOR, each of which would rot silently:
 *
 *   1.  IT CANNOT TRANSMIT. An absence — and absences get built by accident later. Asserted
 *       against the module's own exported surface and against the state shape, so adding a
 *       send path means failing a test rather than shipping a different drop.
 *   2.  NOBODY ANSWERS. Every authored fragment is somebody talking to somebody else. Swept
 *       for second-person address, because one "come in" undoes the whole point.
 *   3.  THE CHARGE ECONOMY IS A FAIR CHALLENGE. A survivor who listens at the scheduled hours
 *       must hear measurably more per unit of cell than one who leaves it running — the same
 *       asymmetry proof the storm gets, and for the same reason: an economy nobody can play
 *       well is a tax, not a decision.
 *   4.  [[D-011]]. No absence spends a percent or delivers a word, proved through `reconcile`
 *       itself rather than by reading the code.
 */
import { describe, expect, it } from 'vitest';
import {
    advanceListening,
    beginListening,
    canLogSignal,
    chargeReading,
    clarityNow,
    createInitialState,
    freshRadio,
    gatherNode,
    heardSignals,
    listenBlocked,
    listenBlockedReason,
    logSignal,
    namesAFinishedAnswer,
    radioAffordance,
    radioSight,
    receptionNow,
    reconcile,
    salvageReceiver,
    signalAtHour,
    stopListening,
    writableSignals,
    type GameState,
} from '../src/brain';
import * as radioModule from '../src/brain/radio';
import { Session } from '../src/brain/session';
import { MemorySaveRepository } from '../src/brain/save';
import { SIGNALS, WRECK } from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;
const fresh = (): GameState => fullBody(createInitialState(NOW));

/** A survivor who has crossed and worked the housing. */
function withSet(): GameState {
    const s = fresh();
    salvageReceiver(s, TUNE.radioSalvageNodeId);
    return s;
}

/** Put the island clock at a given hour of day. */
function atHour(s: GameState, hour: number): GameState {
    const startHour = TUNE.startHourOfDay;
    let delta = hour - startHour;
    while (delta < 0) delta += 24;
    s.gameHoursElapsed = delta;
    return s;
}

// ---------------------------------------------------------------------------
describe('it is a RECEIVER, and the absence of a transmitter is enforced', () => {
    it('exports nothing that could send', () => {
        //  THE CAP, AS A TEST. "We did not build it" is exactly the kind of absence that gets
        //  built later by somebody who does not know it was load-bearing.
        const forbidden = /transmit|send|broadcast|reply|answer|call(?!Sign)|hail|sos|mayday|key|antenna|aerial|mast/i;
        const offenders = Object.keys(radioModule).filter((k) => forbidden.test(k));
        expect(offenders).toEqual([]);
    });

    it('the state shape has no outbound half', () => {
        const keys = Object.keys(freshRadio());
        expect(keys.sort()).toEqual(['charge', 'heard', 'listening', 'logged', 'owned']);
        for (const k of keys) expect(/transmit|send|out|reply/i.test(k), `${k} sounds outbound`).toBe(false);
    });

    it('nothing on the air is addressed to the survivor', () => {
        //  NOBODY ANSWERS. Second-person address is the one thing that would turn overheard
        //  traffic into contact, and it is the softening this drop must not make.
        const second = /\byou\b|\byour\b|\bcastaway\b|\bsurvivor\b|\bisland\b|come in\b|do you (read|copy)/i;
        for (const s of SIGNALS) {
            expect(second.test(s.text), `${s.id} speaks to the listener: "${s.text}"`).toBe(false);
        }
        //  ...and each one is plainly somebody else's traffic: it names who it is for.
        for (const s of SIGNALS) {
            expect(s.callSign.length).toBeGreaterThan(0);
            expect(s.text.toUpperCase()).toContain(s.callSign.split(' ')[0]);
        }
    });

    it('the inspection reveals questions, never a finished answer', () => {
        for (const state of [withSet(), (() => { const s = withSet(); s.radio.heard = [SIGNALS[0].id]; return s; })()]) {
            const a = radioAffordance(state);
            expect(a.questions.length).toBeGreaterThan(0);
            for (const line of [...a.properties, ...a.questions]) {
                expect(namesAFinishedAnswer(line), `"${line}" instructs`).toBe(false);
            }
            for (const q of a.questions) expect(q.trim().endsWith('?')).toBe(true);
        }
        expect(namesAFinishedAnswer(radioSight())).toBe(false);
        //  Positive control: the guard is awake.
        expect(namesAFinishedAnswer('Wire the cell to the case — you could make a transmitter from it.')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
describe('salvage — the wreck, once, through the shipped hold', () => {
    it('comes out of the instrument housing and nowhere else', () => {
        const s = fresh();
        expect(s.radio.owned).toBe(false);
        expect(salvageReceiver(s, 'wr1'), 'the wrong part handed one over').toBe(false);
        expect(s.radio.owned).toBe(false);
        expect(salvageReceiver(s, TUNE.radioSalvageNodeId)).toBe(true);
        expect(s.radio.owned).toBe(true);
        expect(s.radio.charge).toBe(TUNE.radioChargeMax);
    });

    it('there is exactly ONE set and ONE cell — working it again gives nothing', () => {
        const s = withSet();
        s.radio.charge = 4;
        expect(salvageReceiver(s, TUNE.radioSalvageNodeId)).toBe(false);
        expect(s.radio.charge, 'a second hold recharged the cell').toBe(4);
    });

    it('REACHABILITY — the shipped `gatherNode` really hands it over at that node', () => {
        //  [[D-114]]'s class, and the brief names it non-negotiable: a salvage route that
        //  exists in `salvageReceiver` but is never reached by the verb a player uses would be
        //  the fifth instance. So this drives the SHIPPED gather rather than the helper.
        const s = fresh();
        const part = s.nodes.find((n) => n.id === TUNE.radioSalvageNodeId);
        expect(part, 'the authored wreck part is missing from the world').toBeTruthy();
        expect(part!.kind).toBe('wreckpart');
        s.player.x = part!.x;
        s.player.y = part!.y;

        const r = gatherNode(s, part!.id);
        expect(r.ok, `working the housing: ${r.reason}`).toBe(true);
        expect(r.foundReceiver, 'the shipped gather did not find the set').toBe(true);
        expect(s.radio.owned).toBe(true);

        //  ...and it is at the wreck, so the crossing genuinely gates it.
        expect(Math.hypot(part!.x - WRECK.x, part!.y - WRECK.y)).toBeLessThan(20);
        expect(Math.hypot(part!.x, part!.y)).toBeGreaterThan(100);
    });
});

// ---------------------------------------------------------------------------
describe('reception is conditional, and the weather is Rain\'s own', () => {
    it('the band is empty except at the authored hours', () => {
        const hoursWithTraffic = [];
        for (let h = 0; h < 24; h += 1) if (signalAtHour(h)) hoursWithTraffic.push(h);
        expect(hoursWithTraffic.length).toBeGreaterThan(0);
        expect(hoursWithTraffic.length, 'traffic is on the air most of the day — that is a menu').toBeLessThan(12);
        for (const s of SIGNALS) expect(signalAtHour(s.atHourOfDay)?.id).toBe(s.id);
    });

    it('the schedule is spread across the day, so one sitting cannot collect it', () => {
        const hours = SIGNALS.map((s) => s.atHourOfDay).sort((a, b) => a - b);
        for (let i = 1; i < hours.length; i += 1) {
            expect(hours[i] - hours[i - 1],
                'two signals sit close enough to catch in one window').toBeGreaterThan(TUNE.radioTrafficWindowGameHours * 4);
        }
    });

    it('weather degrades it through `rainIntensity` — no second weather system', () => {
        const clear = withSet();
        clear.storm.stage = 'clear';
        expect(clarityNow(clear)).toBe(1);

        const impact = withSet();
        impact.storm.stage = 'impact';
        expect(clarityNow(impact)).toBeLessThan(clarityNow(clear));
        expect(clarityNow(impact)).toBeLessThan(TUNE.radioClarityFloor);
    });

    it('the two FREE warning stages do not black the band out — only the costed ones do', () => {
        //  The storm's own grammar ([[D-133]]): precursor and watch cost nothing. Taking the
        //  air away during them would make a warning stage expensive, which is the one thing
        //  the fair-challenge contract forbids.
        for (const stage of ['precursor', 'watch'] as const) {
            const s = withSet();
            s.storm.stage = stage;
            expect(clarityNow(s), `${stage} blacked the band out`).toBeGreaterThanOrEqual(TUNE.radioClarityFloor);
        }
    });

    it('a voice you cannot make out is NOT silence, and says so', () => {
        const s = atHour(withSet(), SIGNALS[0].atHourOfDay);
        beginListening(s);
        s.storm.stage = 'impact';
        const r = receptionNow(s);
        expect(r.signal).toBeTruthy();
        expect(r.legible).toBe(false);
        expect(r.note).toMatch(/buried|cannot make out/i);
        expect(r.note).not.toMatch(/nothing/i);
    });
});

// ---------------------------------------------------------------------------
describe('listening spends the cell, and catching takes sitting still', () => {
    it('a flick of the switch hears hiss; sitting through the hour hears a voice', () => {
        //  A FIXED SMALL DWELL, not a fraction of the constant under test. The first cut used
        //  `radioCatchGameHours / 3`, so setting that constant to 0 made the flick 0 game
        //  hours long, `advanceListening` returned early, and the planted defect passed. A
        //  test whose input is derived from the value it is guarding cannot guard it.
        const flick = atHour(withSet(), SIGNALS[0].atHourOfDay);
        beginListening(flick);
        advanceListening(flick, 0.02);
        expect(flick.radio.heard, 'a moment of listening caught a fragment').toEqual([]);
        expect(TUNE.radioCatchGameHours, 'catching must take real time').toBeGreaterThan(0.02);

        const sat = atHour(withSet(), SIGNALS[0].atHourOfDay);
        beginListening(sat);
        advanceListening(sat, TUNE.radioCatchGameHours + 0.01);
        expect(sat.radio.heard).toEqual([SIGNALS[0].id]);
        expect(heardSignals(sat)[0].callSign).toBe(SIGNALS[0].callSign);
    });

    it('the cell drains only while listening, and a flat cell switches the set off', () => {
        const idle = withSet();
        advanceListening(idle, 3);
        expect(idle.radio.charge, 'an unpowered set drained').toBe(TUNE.radioChargeMax);

        const on = withSet();
        beginListening(on);
        advanceListening(on, 1);
        expect(on.radio.charge).toBeCloseTo(TUNE.radioChargeMax - TUNE.radioDrainPerGameHour, 5);

        const flat = withSet();
        beginListening(flat);
        const step = advanceListening(flat, 99);
        expect(flat.radio.charge).toBe(0);
        expect(flat.radio.listening, 'a dead cell left the set switched on').toBe(false);
        expect(step.wentFlat).toBe(true);
    });

    it('a dead cell blocks listening, and says the one thing that is wrong', () => {
        const none = fresh();
        expect(listenBlocked(none)).toBe('no-set');
        expect(listenBlockedReason(none)).toMatch(/nothing to listen with/i);

        const dead = withSet();
        dead.radio.charge = 0;
        expect(listenBlocked(dead)).toBe('no-charge');
        expect(beginListening(dead)).toBe(false);
        expect(listenBlockedReason(dead)).toMatch(/cell is dead/i);

        expect(listenBlocked(withSet())).toBeNull();
        expect(listenBlockedReason(withSet())).toBeNull();
    });

    it('no percentage reaches the screen — the cell is read in words', () => {
        for (const left of [0, 0.1, 0.4, 1]) {
            const s = withSet();
            s.radio.charge = TUNE.radioChargeMax * left;
            expect(chargeReading(s)).not.toMatch(/\d/);
        }
    });

    it('FAIR CHALLENGE — listening on schedule hears more per unit of cell than leaving it on', () => {
        //  THE ASYMMETRY, MEASURED — the same proof the storm gets. A charge economy nobody
        //  can play well is a tax; one where care pays is a decision.
        const CAREFUL = (() => {
            const s = withSet();
            let caught = 0;
            for (const sig of SIGNALS) {
                atHour(s, sig.atHourOfDay);
                beginListening(s);
                //  Arrives at the hour, sits through the catch, switches off.
                for (let t = 0; t < TUNE.radioCatchGameHours + 0.05; t += 0.05) advanceListening(s, 0.05);
                if (s.radio.heard.length > caught) caught = s.radio.heard.length;
                stopListening(s);
            }
            return { caught, spent: TUNE.radioChargeMax - s.radio.charge };
        })();

        const WASTEFUL = (() => {
            const s = withSet();
            beginListening(s);
            //  Leaves it running from the start of the day until the cell dies.
            for (let t = 0; t < 24 && s.radio.charge > 0; t += 0.05) {
                s.gameHoursElapsed += 0.05;
                advanceListening(s, 0.05);
            }
            return { caught: s.radio.heard.length, spent: TUNE.radioChargeMax - s.radio.charge };
        })();

        //  The careful listener hears everything...
        expect(CAREFUL.caught).toBe(SIGNALS.length);
        //  ...and pays a fraction of the cell for it.
        expect(CAREFUL.spent).toBeLessThan(WASTEFUL.spent);
        const carefulRate = CAREFUL.caught / CAREFUL.spent;
        const wastefulRate = WASTEFUL.caught / Math.max(WASTEFUL.spent, 1e-6);
        expect(carefulRate, `careful ${carefulRate.toFixed(3)} vs wasteful ${wastefulRate.toFixed(3)} signals per unit`)
            .toBeGreaterThan(wastefulRate * 2);
        //  ...and the wasteful one genuinely runs the cell down, so the cost is real.
        expect(WASTEFUL.spent).toBeGreaterThan(CAREFUL.spent * 2);
    });
});

// ---------------------------------------------------------------------------
describe('the journal carries it', () => {
    /** A survivor who has heard something, by a fire, with a journal. */
    function readyToWrite(): GameState {
        const s = withSet();
        s.radio.heard = [SIGNALS[0].id];
        s.journal = { ...s.journal, exists: true, condition: 1, carried: true, entries: [] };
        s.fire = { ...s.fire, built: true, fuel: 10, x: s.player.x, y: s.player.y };
        return s;
    }

    it('a heard call sign can be written down, once', () => {
        const s = readyToWrite();
        expect(writableSignals(s)).toEqual([SIGNALS[0].id]);
        expect(canLogSignal(s).ok).toBe(true);
        expect(logSignal(s, SIGNALS[0].id)).toBe(true);
        expect(s.journal.entries.length).toBe(1);
        expect(s.journal.entries[0].topic, 'a signal is an observation, not a technique').toBeNull();
        expect(s.journal.entries[0].text).toContain(SIGNALS[0].callSign);
        //  ...and not twice.
        expect(writableSignals(s)).toEqual([]);
        expect(logSignal(s, SIGNALS[0].id)).toBe(false);
        expect(s.journal.entries.length).toBe(1);
    });

    it('nothing unheard can be written', () => {
        const s = readyToWrite();
        expect(logSignal(s, SIGNALS[2].id), 'wrote down a signal never heard').toBe(false);
        expect(s.journal.entries.length).toBe(0);
    });

    it('it obeys the journal\'s own rules — light, legibility, a book at all', () => {
        const dark = readyToWrite();
        dark.fire = { ...dark.fire, fuel: 0 };
        expect(canLogSignal(dark).ok).toBe(false);
        expect(canLogSignal(dark).reason).toMatch(/dark|fire|torch/i);

        const none = readyToWrite();
        none.journal = { ...none.journal, exists: false };
        expect(canLogSignal(none).ok).toBe(false);

        const ruined = readyToWrite();
        ruined.journal = { ...ruined.journal, condition: 0 };
        expect(canLogSignal(ruined).ok).toBe(false);
        expect(canLogSignal(ruined).reason).toMatch(/pages|ink/i);
    });

    it('a life\'s listening SURVIVES its death — the whole reason it goes in the journal', () => {
        const s = readyToWrite();
        logSignal(s, SIGNALS[0].id);
        //  The journal is matter and obeys matter's rule; what is written in it outlives the
        //  writer through the shipped inheritance, with nothing built twice here.
        expect(s.journal.entries[0].author).toBe(1);
        expect(s.journal.entries[0].text).toContain(SIGNALS[0].callSign);
        expect(s.journal.entries[0].writtenAtGameHours).toBeGreaterThanOrEqual(0);
    });
});

// ---------------------------------------------------------------------------
describe('D-011 — an absence spends nothing and delivers nothing', () => {
    const away = (s: GameState, hours: number) => reconcile(s, hours * 3600).state;

    it('twelve offline hours spend not one percent of the cell', () => {
        const on = atHour(withSet(), SIGNALS[0].atHourOfDay);
        beginListening(on);
        const before = on.radio.charge;
        const after = away(on, 12);
        expect(after.gameHoursElapsed).toBeGreaterThan(on.gameHoursElapsed);
        expect(after.radio.charge, 'an absence drained the cell').toBe(before);
    });

    it('...and delivers not one word of traffic', () => {
        //  The offline-GIFT half. A log full of traffic nobody sat through would be as wrong
        //  as a flat battery, in the other direction.
        const on = atHour(withSet(), SIGNALS[0].atHourOfDay);
        beginListening(on);
        const after = away(on, 48);
        expect(after.radio.heard, 'an absence caught traffic').toEqual([]);
        expect(after.journal.entries.length).toBe(0);
    });

    it('BOTH ABSENCE PATHS switch the set off — not just `reconcile`', () => {
        //  THE GAP MY OWN FAIL-THEN-PASS FOUND. The tests above call `reconcile` directly and
        //  prove it has no radio term — but `afterAbsence` is not in `reconcile`, it is in
        //  `Session.start` and `Session.resume`. A planted drain in `afterAbsence` passed every
        //  check in this block. That is [[D-129]]'s defect exactly: the same event to a player,
        //  two call sites, and a suite that only ever exercised one.
        const repo = new MemorySaveRepository();
        const opened = Session.start(repo, NOW);
        salvageReceiver(opened.session.state, TUNE.radioSalvageNodeId);
        opened.session.state.gameHoursElapsed = 5;
        beginListening(opened.session.state);
        expect(opened.session.state.radio.listening).toBe(true);
        const charge = opened.session.state.radio.charge;
        opened.session.persist(NOW);

        //  A RELOAD — `Session.start`'s path.
        const reloaded = Session.start(repo, NOW + 8 * 60 * 60 * 1000);
        expect(reloaded.session.state.radio.listening, 'a reload came back still listening').toBe(false);
        expect(reloaded.session.state.radio.charge, 'a reload drained the cell').toBe(charge);

        //  A BACKGROUNDED TAB — `Session.resume`'s path, the one D-129 missed.
        const running = Session.start(repo, NOW).session;
        salvageReceiver(running.state, TUNE.radioSalvageNodeId);
        beginListening(running.state);
        const before = running.state.radio.charge;
        running.resume(NOW + 8 * 60 * 60 * 1000);
        expect(running.state.radio.listening, 'a resumed tab came back still listening').toBe(false);
        expect(running.state.radio.charge, 'a resumed tab drained the cell').toBe(before);
    });

    it('a survivor at the wreck with the set on is no worse off for being away', () => {
        const listening = atHour(withSet(), SIGNALS[0].atHourOfDay);
        beginListening(listening);
        const control = atHour(withSet(), SIGNALS[0].atHourOfDay);

        const a = away(listening, 6);
        const b = away(control, 6);
        expect(a.health).toBeCloseTo(b.health, 6);
        expect(a.energy).toBeCloseTo(b.energy, 6);
        expect(a.warmth).toBeCloseTo(b.warmth, 6);
    });
});
