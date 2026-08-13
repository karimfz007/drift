/**
 * THE STATIC — DROP 5, ONE RUNG OF **ENDING E03** ("A Voice in the Static").
 *
 * REGISTER NAMED, per [[D-138]]. `E03` is "A Voice in the Static" in the ENDING register and
 * "Defended homestead" in the CAPABILITY register; a bare `E03` is not a citation. Everything
 * in this file means ENDING E03, and one rung of it — not the ending.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT THIS DROP IS, stated first so the caps are legible before the code.
 *
 * A survivor salvages a RECEIVER from the wreck, powers it from a salvaged cell, and listens.
 * At certain hours there is traffic on the air. It is not for them. A call sign, a schedule, a
 * bearing — evidence that the world outside runs on a timetable, kept by people who do not
 * know this island exists. **Nobody answers, because nothing here can call.**
 *
 * IT CANNOT TRANSMIT, and that is enforced rather than merely intended. There is no send
 * function, no key, no antenna length, no power-out term, and no UI affordance anywhere that
 * could be mistaken for one. A test asserts the module exports nothing that could transmit,
 * because "we did not build it" is exactly the kind of absence that gets built by accident
 * later — and the moment a survivor can answer, this stops being the drop it is.
 *
 * THE EMOTIONAL POINT IS THE ASYMMETRY. You can hear them; they cannot hear you. Softening
 * that into anything resembling contact — an acknowledgement, a reply, a name spoken back —
 * would spend the whole of ENDING E03's first rung for a moment of comfort.
 *
 * ---------------------------------------------------------------------------------------
 * WHY THE WRECK AND NOT THE BOAT. Both were offered; the wreck is where a receiver already
 * belongs. `wr3` has been "the instrument housing, off the bow" since [[D-124]] authored the
 * six parts, and it already yields `glass` and `wiring` — the set is the thing that housing
 * was built to hold. The crossing already gates it, so the receiver inherits a real journey
 * rather than needing one invented for it. The boat ([[D-135]]) is at stage B0 with an explicit
 * cap against restoration mechanics; hanging salvage on her would have implied work on her
 * hull, which is precisely what that cap exists to prevent.
 *
 * ---------------------------------------------------------------------------------------
 * POWER IS THE COST, AND IT IS FINITE. One salvaged cell, no generator, no solar, no bench.
 * Listening burns it. When it is gone the set is a box of glass and wire. That is the whole
 * economy, and it is what makes WHEN you listen a decision rather than a habit.
 *
 * RECEPTION IS CONDITIONAL, NEVER A MENU. Traffic exists at authored hours and nowhere else,
 * and weather degrades it — through Rain's own shipped stages ([[D-133]]), read directly. There
 * is no second weather system here and no weather term of this module's own: `rainIntensity`
 * is the input, exactly as `advanceStorm` already consumes it.
 *
 * ---------------------------------------------------------------------------------------
 * [[D-011]], STRUCTURALLY, and by the same shape as every hazard before it. `advanceListening`
 * is the only function that spends charge or catches a fragment, and it runs on `Session`'s
 * ONLINE TICK alone. `reconcile` has no term for the radio at all — no drain, no reception, no
 * schedule. An absence cannot spend a single percent of the cell, and it cannot deliver a
 * single word: coming back to a flat battery for having been away would be the offline-death
 * law wearing a different coat, and coming back to a log full of traffic you never sat
 * through would be the offline-GIFT defect the same law forbids in the other direction.
 *
 * The set is also switched OFF by an absence (`clearListeningOnAbsence`). Nobody left a radio
 * running for eight hours; modelling that they did would be inventing a cost out of not
 * playing, which is the one thing absence may never do.
 */
import { TUNE } from '../data/tune';
import { SIGNALS, type Signal } from '../data/world';
import { timeOfDay } from './clock';
import { rainIntensity } from './storm';
import { isLegible, hasWritingLight } from './journal';
import type { Affordance } from './affordance';
import type { GameState, JournalEntry, RadioState } from './types';

export function freshRadio(): RadioState {
    return { owned: false, charge: 0, listening: false, heard: [], logged: [] };
}

// ---------------------------------------------------------------------------
// The set itself.
// ---------------------------------------------------------------------------

/**
 * SALVAGED FROM THE INSTRUMENT HOUSING, once. Called from `gatherNode`'s `wreckpart` case, so
 * it costs the crossing, the effort and the hull's own risk — the same price every other
 * thing at the wreck costs, and no new verb for the taking.
 *
 * The cell comes with it and is the only one there will ever be this drop. Returns whether
 * this gather was the one that found it, so the body can say so.
 */
export function salvageReceiver(state: GameState, nodeId: string): boolean {
    if (nodeId !== TUNE.radioSalvageNodeId) return false;
    if (state.radio.owned) return false;
    state.radio = { ...state.radio, owned: true, charge: TUNE.radioChargeMax };
    return true;
}

/**
 * P0-H — WHAT THIS PART OF THE WRECK IS, BEFORE IT IS WORKED. Null for the five ordinary ones.
 *
 * THE DEFECT, director-confirmed: the radio was never found. Not gated wrong, not broken — the
 * receiver has come out of `wr3` since [[D-124]] and still does. It was UNFINDABLE. `wr3` is
 * "the instrument housing, off the bow" in this file's header and in the TUNE comment, and it
 * drew as the same plate and rib as its five siblings, so the one rung of ENDING E03 standing
 * in the world was a one-in-six blind guess behind a 296 m crossing and a hull that wounds you.
 *
 * The housing is a shape in the water now (see `entities.ts`), which is the half a survivor
 * finds by looking. This is the half that says it out loud when they get close enough to work
 * it — the same evidence grammar the journal and the boat already use: observable properties,
 * no promise of what it will do, and nothing about what it might be made to become.
 */
export function wreckPartSight(nodeId: string): string | null {
    if (nodeId !== TUNE.radioSalvageNodeId) return null;
    return 'Not plating — a housing, with a glass face and a dial behind it. Whatever this was, it was made to be read.';
}

/** What the set is, before anything is switched on. */
export function radioSight(): string {
    return 'A receiver, out of the instrument housing. Heavier than it looks, and the case is intact.';
}

/**
 * WHAT HANDLING IT TELLS YOU — Drop 4's evidence grammar, applied to a second object.
 *
 * Observable properties and open questions, never a finished answer. Note what is absent from
 * every line: any suggestion that it could be made to send. The questions are about POWER and
 * TIME, because those are the two things a listener actually has to reckon with.
 */
const UNPOWERED: Affordance = {
    properties: [
        'A dial, a speaker grille, and a socket for a cell — nothing else on the case',
        'The tuning is fixed; whoever set it was listening for one thing',
        'No key, no microphone socket, no aerial post: it was built to receive',
        'The cell it takes is the size of a fist and there was one in the housing',
    ],
    questions: [
        'How long will a cell that age hold anything?',
        'If the tuning is fixed, who fixed it, and to what?',
        'Is there a time of day when there is anything to hear at all?',
        'What does weather do to a signal this faint?',
    ],
};

const POWERED: Affordance = {
    properties: [
        'It draws the moment the cell goes in — the grille hisses even with nothing on the air',
        'The hiss changes with the weather before any voice does',
        'Traffic comes and goes on a clock, not at random',
        'Whatever it hears, it hears one way: there is nothing on this set that talks back',
    ],
    questions: [
        'Which hours are worth spending the cell on?',
        'Are those call signs the same ones each time, or a rotation?',
        'A bearing is only a bearing from somewhere — from where?',
        'How much of the cell is left, and what is it worth spending it on?',
    ],
};

export function radioAffordance(state: GameState): Affordance {
    return state.radio.heard.length > 0 ? POWERED : UNPOWERED;
}

/** How much cell is left, in the survivor's own words. No percentage reaches the screen. */
export function chargeReading(state: GameState): string {
    const left = state.radio.charge / TUNE.radioChargeMax;
    if (left <= 0) return 'The cell is dead. The set is a box of glass and wire now.';
    if (left < 0.2) return 'The cell is nearly gone. Minutes, not hours.';
    if (left < 0.55) return 'The cell has been used. There is a while in it yet.';
    return 'The cell is strong.';
}

// ---------------------------------------------------------------------------
// What is on the air, and whether you can make it out.
// ---------------------------------------------------------------------------

/**
 * THE SCHEDULE IS THE WORLD'S, NOT YOURS. A signal exists inside its own window of the day and
 * nowhere else, so listening at the wrong hour spends the cell on hiss. That is the point: the
 * timetable belongs to people who do not know you are here.
 */
export function signalAtHour(hourOfDay: number): Signal | null {
    for (const s of SIGNALS) {
        //  CIRCULAR DISTANCE ON A 24-HOUR DIAL, so a window that straddles midnight works.
        //  The first cut wrote this inside-out (`12 - |((h - a + 36) % 24) - 12|`) and returned
        //  a signal only when the clock was TWELVE HOURS from its slot — the band was empty at
        //  every authored hour and open at every wrong one. Four tests went red on the first
        //  run and named it exactly.
        const raw = (((hourOfDay - s.atHourOfDay) % 24) + 24) % 24;
        const apart = Math.min(raw, 24 - raw);
        if (apart <= TUNE.radioTrafficWindowGameHours) return s;
    }
    return null;
}

/**
 * HOW CLEARLY IT COMES THROUGH. One term, and it is Rain's ([[D-133]]) — `rainIntensity` is
 * read directly rather than re-derived, so a storm degrades reception through the same number
 * that decides how wet you get. There is no weather model in this file.
 */
export function clarityNow(state: GameState): number {
    const rain = rainIntensity(state.storm.stage);
    return Math.max(0, 1 - rain * TUNE.radioRainClarityLoss);
}

export interface Reception {
    /** The traffic on the air right now, or null when the band is empty. */
    signal: Signal | null;
    clarity: number;
    /** Is it legible enough to make anything out of? */
    legible: boolean;
    /** One line for the goal readout. Never a menu, never a list of what else exists. */
    note: string;
}

export function receptionNow(state: GameState): Reception {
    const clarity = clarityNow(state);
    const signal = signalAtHour(timeOfDay(state.gameHoursElapsed).hourOfDay);
    const legible = signal !== null && clarity >= TUNE.radioClarityFloor;
    const note = !state.radio.listening
        ? 'The set is off.'
        : signal === null
            ? 'Hiss. Nothing on the band but the sea.'
            : legible
                ? 'Someone is talking. Not to you.'
                : 'A voice, buried in the weather. You cannot make out a word of it.';
    return { signal, clarity, legible, note };
}

// ---------------------------------------------------------------------------
// Listening — the only thing that spends the cell.
// ---------------------------------------------------------------------------

export type ListenBlock = 'no-set' | 'no-charge' | null;

export function listenBlocked(state: GameState): ListenBlock {
    if (!state.radio.owned) return 'no-set';
    if (state.radio.charge <= 0) return 'no-charge';
    return null;
}

/** One sentence naming the single thing in the way, or null. Never "requirements not met". */
export function listenBlockedReason(state: GameState): string | null {
    switch (listenBlocked(state)) {
        case 'no-set': return 'You have nothing to listen with.';
        case 'no-charge': return 'The cell is dead. Nothing will bring it back.';
        default: return null;
    }
}

export function beginListening(state: GameState): boolean {
    if (listenBlocked(state) !== null) return false;
    state.radio = { ...state.radio, listening: true };
    return true;
}

export function stopListening(state: GameState): void {
    state.radio = { ...state.radio, listening: false };
}

/**
 * THE ONLINE TICK, AND THE ONLY PLACE CHARGE IS SPENT OR A FRAGMENT IS CAUGHT.
 *
 * See this file's header for why it lives here and nowhere else. `reconcile` has no term for
 * any of this, so an absence of any length spends nothing and delivers nothing.
 *
 * CATCHING IS NOT INSTANT. A fragment needs `radioCatchGameHours` of continuous listening
 * INSIDE its own window and above the clarity floor — so a survivor who flicks the set on and
 * off hears hiss, and one who sits with it through a scheduled hour hears a voice. That is
 * what makes the schedule worth learning rather than worth ignoring.
 */
export function advanceListening(state: GameState, gameHours: number): { caught: Signal | null; wentFlat: boolean } {
    if (!state.radio.listening || gameHours <= 0) return { caught: null, wentFlat: false };

    const spend = Math.min(state.radio.charge, TUNE.radioDrainPerGameHour * gameHours);
    const charge = state.radio.charge - spend;
    const wentFlat = charge <= 0 && state.radio.charge > 0;

    const reception = receptionNow(state);
    let held = reception.legible ? state.radio.dwellGameHours ?? 0 : 0;
    let caught: Signal | null = null;

    if (reception.legible && reception.signal) {
        held += gameHours;
        if (held >= TUNE.radioCatchGameHours && !state.radio.heard.includes(reception.signal.id)) {
            caught = reception.signal;
            held = 0;
        }
    }

    state.radio = {
        ...state.radio,
        charge,
        //  A flat cell switches the set off rather than leaving it "on" with nothing coming
        //  through — the fail-loud rule applied to a resource running out.
        listening: charge > 0 && state.radio.listening,
        dwellGameHours: held,
        heard: caught ? [...state.radio.heard, caught.id] : state.radio.heard,
    };
    return { caught, wentFlat };
}

/**
 * ABSENCE SWITCHES THE SET OFF. Nobody left it running for eight hours. Called from
 * `afterAbsence`, alongside surfacing a diver and ending a storm — absence making things
 * better is legal where absence making them worse never is.
 */
export function clearListeningOnAbsence(state: GameState): void {
    if (!state.radio.listening && (state.radio.dwellGameHours ?? 0) === 0) return;
    state.radio = { ...state.radio, listening: false, dwellGameHours: 0 };
}

// ---------------------------------------------------------------------------
// The journal carries it.
// ---------------------------------------------------------------------------

/**
 * WHAT A LISTENER COULD HONESTLY WRITE DOWN — heard, and not yet written.
 *
 * v0.11 §10.6's "physical evidence they left behind", getting its first mechanical surface as
 * a CONSEQUENCE of what already ships rather than as a system of its own. The journal is
 * already an object with a condition, a legibility floor, a light requirement and an
 * inheritance rule ([[D-068]]); a call sign written into it survives its writer for exactly
 * the same reasons a shelter note does, and needs none of that built twice.
 */
export function writableSignals(state: GameState): string[] {
    return state.radio.heard.filter((id) => !state.radio.logged.includes(id));
}

export function canLogSignal(state: GameState): { ok: boolean; reason: string | null } {
    if (!state.journal.exists) return { ok: false, reason: 'You have nothing to write on or with.' };
    if (!isLegible(state.journal)) return { ok: false, reason: 'The pages are too far gone. Ink will not hold on them.' };
    if (!hasWritingLight(state)) return { ok: false, reason: 'Too dark to write. You need a fire, or a lit torch.' };
    if (writableSignals(state).length === 0) return { ok: false, reason: 'Nothing heard that is not already down.' };
    return { ok: true, reason: null };
}

/**
 * WRITE ONE HEARD FRAGMENT INTO THE JOURNAL. `topic: null` — the shipped shape for "a plain
 * observation", which is exactly what this is: not a technique, nothing a successor can build
 * from, just the fact that at this hour on this bearing somebody was talking.
 */
export function logSignal(state: GameState, id: string): boolean {
    if (!canLogSignal(state).ok || !writableSignals(state).includes(id)) return false;
    const signal = SIGNALS.find((s) => s.id === id);
    if (!signal) return false;

    const entry: JournalEntry = {
        author: state.memorial.length + 1,
        writtenAtGameHours: state.gameHoursElapsed,
        topic: null,
        text: `${signal.callSign}, heard at ${String(signal.atHourOfDay).padStart(2, '0')}00. ${signal.logged}`,
    };
    state.journal = { ...state.journal, entries: [...state.journal.entries, entry] };
    state.radio = { ...state.radio, logged: [...state.radio.logged, id] };
    return true;
}

/** What has been heard, in the order it was heard. For the body to read out. */
export function heardSignals(state: GameState): Signal[] {
    return state.radio.heard
        .map((id) => SIGNALS.find((s) => s.id === id))
        .filter((s): s is Signal => s !== undefined);
}

// ---------------------------------------------------------------------------
// What the body renders. Derived here so the panel re-derives nothing.
// ---------------------------------------------------------------------------

export interface RadioPanelView {
    owned: boolean;
    sight: string;
    /** Observations and open questions, in one list. Never a finished answer. */
    lines: string[];
    charge: string;
    /** What the set is doing and hearing, right now. */
    note: string;
    listening: boolean;
    /** Null when listening is possible; otherwise the ONE thing in the way. */
    blocker: string | null;
    /** Fragments made out, in the order they were heard. */
    heard: Array<{ id: string; callSign: string; text: string; loggable: boolean }>;
    /** Why nothing can be written down right now, or null. */
    writeBlocker: string | null;
}

/**
 * THE PANEL'S WHOLE SURFACE, derived once. A body that re-derived any of this would be a
 * second opinion about the radio, and the first disagreement would be a confident lie told
 * while the real cell drained — the shape `refugeReport` was called "the liar" for.
 *
 * NOTE WHAT IS NOT HERE: nothing to send with. There is no field a control could bind to.
 */
export function radioPanelView(state: GameState): RadioPanelView {
    const seen = radioAffordance(state);
    const write = canLogSignal(state);
    const writable = new Set(writableSignals(state));
    return {
        owned: state.radio.owned,
        sight: radioSight(),
        lines: [...seen.properties, ...seen.questions],
        charge: chargeReading(state),
        note: receptionNow(state).note,
        listening: state.radio.listening,
        blocker: listenBlockedReason(state),
        heard: heardSignals(state).map((sig) => ({
            id: sig.id,
            callSign: sig.callSign,
            text: sig.text,
            loggable: write.ok && writable.has(sig.id),
        })),
        writeBlocker: write.ok ? null : write.reason,
    };
}
