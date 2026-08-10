/**
 * A STAGED, SCHEDULED EVENT — the one piece of machinery every timed thing in this game runs on.
 *
 * WHY THIS FILE EXISTS, and it is a brief's instruction rather than a tidiness urge. Drop 3B(i)
 * needed "an event that is scheduled at a game-hour, advances through named stages by elapsed
 * game hours on the online tick, and is announced when it crosses a boundary". The storm
 * ([[D-133]]) already had exactly that, welded to rain. The instruction was: *extend it, do not
 * parallel it — build no third scheduling system.* So the shape comes out here and the storm
 * takes its stages from it, unchanged in behaviour and one caller shorter.
 *
 * WHAT IS SHARED IS THE CLOCK, NOT THE WEATHER. `stepStaged` knows about idling on a schedule,
 * stage durations, and crossing exactly one boundary per call. It knows nothing about rain,
 * smoke, wetness or salvage — those stay with their own events, where they belong.
 *
 * AT MOST ONE STAGE PER CALL, and that is load-bearing rather than an optimisation. A span long
 * enough to cross two boundaries is a span the online tick never produces (they are sixteen
 * milliseconds), and allowing it would let a single call skip a stage entirely — which is how
 * a two-free-warnings contract quietly becomes one. The storm's own comment said this first;
 * it is now true for every event that will ever use this.
 */

export interface StagedState<S extends string> {
    stage: S;
    inStageGameHours: number;
    /** Island-clock reading at which the IDLE stage gives way to the first real one. */
    nextAtGameHours: number;
}

export interface StagedRules<S extends string> {
    /** The stage that waits on the clock rather than on a duration. */
    idle: S;
    /** What the idle stage becomes when its appointment comes round. */
    first: S;
    durationOf: (stage: S) => number;
    nextOf: (stage: S) => S;
    /**
     * Game hours until the NEXT appointment, measured from the moment this one returns to
     * idle. `null` means the event happens once and never reschedules — which is the
     * difference between weather and an appointment.
     */
    intervalAfter: number | null;
}

export interface StagedStep<S extends string> {
    stage: S;
    /** True on the tick a boundary was crossed — the body announces on these. */
    changed: boolean;
    /** The stage this span left, so a caller can owe something exactly once on leaving it. */
    from: S;
}

/**
 * ONE SPAN. Returns the next state and what happened; mutates nothing.
 *
 * The idle stage transitions WITHOUT consuming any of the span, because an appointment coming
 * round is an instant rather than a duration — and charging the first real stage for the tick
 * that started it would make every event's opening stage a fraction short.
 */
export function stepStaged<S extends string>(
    state: StagedState<S>,
    nowGameHours: number,
    gameHours: number,
    rules: StagedRules<S>,
): { next: StagedState<S>; step: StagedStep<S> } {
    const idle: StagedStep<S> = { stage: state.stage, changed: false, from: state.stage };
    if (!(gameHours > 0)) return { next: state, step: idle };

    if (state.stage === rules.idle) {
        if (nowGameHours < state.nextAtGameHours) return { next: state, step: idle };
        return {
            next: { stage: rules.first, inStageGameHours: 0, nextAtGameHours: state.nextAtGameHours },
            step: { stage: rules.first, changed: true, from: state.stage },
        };
    }

    const elapsed = state.inStageGameHours + gameHours;
    if (elapsed < rules.durationOf(state.stage)) {
        return {
            next: { ...state, inStageGameHours: elapsed },
            step: { stage: state.stage, changed: false, from: state.stage },
        };
    }

    const to = rules.nextOf(state.stage);
    return {
        next: {
            stage: to,
            inStageGameHours: 0,
            //  Rescheduled from the moment this one ENDS, so a long event does not eat into
            //  the quiet that follows it. An event with no interval never comes round again.
            nextAtGameHours: to === rules.idle && rules.intervalAfter !== null
                ? nowGameHours + rules.intervalAfter
                : state.nextAtGameHours,
        },
        step: { stage: to, changed: true, from: state.stage },
    };
}
