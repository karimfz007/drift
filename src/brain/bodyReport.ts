/**
 * THE VITALS TAB'S CONTENT (Law 126, Slice 2C Boundary 1).
 *
 * Law 126 gives the Backpack exactly three primary tabs — **Inventory, Vitals, Skills** — and
 * two of the three already existed as separate surfaces: the loadout panel and the growth
 * card. Vitals was the one with nowhere to live. It has always been HUD bars, which answer
 * *"how bad is it"* and never *"why, and what would help"*.
 *
 * So this is the reading layer for the third tab, and it is a BRAIN module for the same
 * reason `growth.ts` is: §22's progressive-disclosure ruling and the depth-dial admission
 * test are claims about CONTENT, and content asserted only by markup is asserted by nobody.
 *
 * IT DERIVES, IT NEVER RE-DERIVES. Every line here reads a shipped function — `thermalStrain`
 * and `netHeatFlowPerGameHour` from Law 118's balance, `fatigueStageOf` and `loadBandOf` from
 * Ch.6, `isNearlySpent` from Law 128. A vitals panel that computed its own numbers would be
 * a second source of truth about the body, and the first time it disagreed with `reconcile`
 * the player would be told a confident lie while watching the real bar move the other way.
 *
 * NO RAW NUMBERS in the causal lines, for the same reason the growth card has none: "Warmth
 * 52" is a readable summary, not a literal percentage of body temperature (§6.1). The bars
 * already carry the summary. This tab carries the CAUSE — what is taking your heat, what the
 * load is doing to you, what is nearly worn through — because that is what a player can act on.
 */
import { fatigueStageOf, loadBandOf, type FatigueStage, type LoadBand } from './body';
import { heatFlowNote, netHeatFlowPerGameHour, strainCosts, thermalStrain, type ThermalStrain } from './thermal';
import { isNearlySpent } from './matter';
import { ALL_MATERIAL_KINDS } from './materials';
import { isSheltered } from './state';
import { timeOfDay } from './clock';
import { TUNE } from '../data/tune';
import type { GameState } from './types';

export interface VitalLine {
    /** What it is, in the player's own words. */
    label: string;
    /** Where it stands — a phrase, never a number. */
    standing: string;
    /** Why, and what would change it. Null when there is nothing worth saying. */
    cause: string | null;
    /** True when this is actively costing the survivor something right now. */
    pressing: boolean;
}

export interface BodyReport {
    lines: VitalLine[];
    /** One honest sentence for the top of the tab. */
    summary: string;
}

const STRAIN_WORD: Record<ThermalStrain, string> = {
    hypothermic: 'dangerously cold',
    cold: 'cold',
    comfortable: 'comfortable',
    hot: 'hot',
    'heat-strain': 'overheating',
};

const FATIGUE_WORD: Record<FatigueStage, string> = {
    none: 'rested',
    mild: 'tiring',
    moderate: 'weary',
    severe: 'exhausted',
};

//  The shipped bands are light / working / heavy — three, not the four I first assumed.
//  Reading the union rather than inventing one is the difference between a tab that reports
//  the body and a tab that reports a body I imagined.
const LOAD_WORD: Record<LoadBand, string> = {
    light: 'travelling light',
    working: 'a working load',
    heavy: 'heavily loaded',
};

export function bodyReport(state: GameState): BodyReport {
    const lines: VitalLine[] = [];

    //  THERMAL — the one that killed people before Law 118, and the one where "why" matters
    //  most. The note names the LARGEST loss rather than listing all of them, because a
    //  survivor deciding whether to sleep here needs the one thing to fix, not a table.
    const strain = thermalStrain(state.warmth);
    const sheltered = isSheltered(state);
    const flow = netHeatFlowPerGameHour({
        isNight: timeOfDay(state.gameHoursElapsed).isNight,
        sheltered,
        shelterGrade: sheltered ? state.shelter.grade : null,
        windExposed: true,
        fireLit: state.fire.built && state.fire.fuel > 0,
        atFire: sheltered,
        wet: state.wet,
        bedding: state.resting ? (sheltered ? 'dry-bedding' : 'ground-cover') : 'bare-ground',
        clothing: 0,
        resting: state.resting,
        activity: 1,
        nutrition: 100,
        enclosed: false,
    });
    lines.push({
        label: 'Warmth',
        standing: STRAIN_WORD[strain],
        cause: heatFlowNote(flow),
        pressing: strainCosts(strain) || flow.net < 0,
    });

    //  WETNESS is contextual (§12: a state that appears when relevant, not a permanent bar).
    if (state.wet > TUNE.wetMax * 0.15) {
        lines.push({
            label: 'Wet',
            standing: state.wet > TUNE.wetMax * 0.6 ? 'soaked through' : 'damp',
            cause: 'Being wet costs you heat wherever you are — a roof does not dry you.',
            pressing: state.wet > TUNE.wetMax * 0.6,
        });
    }

    //  REST — a rate, never a jump (Ch.6), and never a heater (Law 118).
    const fatigue = fatigueStageOf(state);
    lines.push({
        label: 'Rest',
        standing: FATIGUE_WORD[fatigue],
        cause: fatigue === 'none'
            ? null
            : 'Sleep restores this over time. It will not warm you — that is the fire’s job.',
        pressing: fatigue === 'severe',
    });

    //  LOAD — §11 forbids carrying weight represented ONLY by slower movement, so the tab
    //  says what it is actually doing rather than leaving the player to infer it from pace.
    const band = loadBandOf(state);
    lines.push({
        label: 'Carrying',
        standing: LOAD_WORD[band],
        cause: band === 'heavy'
            ? 'Every effort costs more while you are loaded like this. Cache what you can spare.'
            : null,
        pressing: band === 'heavy',
    });

    //  MATTER — Law 128's warning surfaced where a player would look for it, so "your last
    //  blade broke" is never the first they hear of it.
    const worn = ALL_MATERIAL_KINDS.filter((m) => (state.inventory[m] ?? 0) > 0 && isNearlySpent(state, m));
    if (worn.length > 0) {
        lines.push({
            label: 'Wear',
            standing: 'something is nearly through',
            cause: 'Work has told on what you are carrying. One more failed attempt may finish it.',
            pressing: true,
        });
    }

    const pressing = lines.filter((l) => l.pressing);
    //  §6.4's pressure budget, stated to the player rather than only enforced behind the
    //  scenes: one dominant pressure is ordinary, three at once is the shape of a bad night.
    const summary = pressing.length === 0
        ? 'Nothing is pressing. This is the time to get work done.'
        : pressing.length === 1
            ? `One thing needs attention: ${pressing[0].label.toLowerCase()}.`
            : `${pressing.length} things need attention at once. Deal with the worst and retreat if you must.`;

    return { lines, summary };
}
