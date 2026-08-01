/**
 * THE DEATH REVIEW — what the Voice says when a survivor dies, and what it says to the one
 * who washes ashore afterwards.
 *
 * The interim death message was a scold: one line naming the vital that hit zero. It answered
 * "what killed you" and not one of the questions a player actually has, which are **why**,
 * **when did it become inevitable**, and **what would have worked**. A death the player cannot
 * reconstruct reads as the game cheating, and permadeath multiplies that by everything they
 * lost — so the review is not a courtesy here, it is what makes finality fair.
 *
 * PLAIN AND KIND, and specifically not the two failure modes either side of it:
 *
 *   NOT a scold. "You should have built a fire" tells someone who is already looking at the
 *   consequence that they were stupid. The review states what happened and what was in reach.
 *
 *   NOT a shrug. "You died of cold" with no chain leaves them unable to learn, which is the
 *   same as telling them it was luck.
 *
 * THE CHAIN IS READ, NEVER GUESSED. Every line below comes from state that existed at the
 * moment of death — the vitals, the fire, the shelter, what was carried, what the ladder had
 * reached. Nothing is inferred about intent, because the game does not know intent, and a
 * confident wrong sentence about what the player was thinking is worse than no sentence.
 *
 * WARNINGS MISSED are drawn from the same low-hint thresholds the HUD uses, so the review can
 * never claim to have warned about something the bar did not show. One source of truth for
 * "you were told", or the review becomes a liar with a good memory.
 */
import { TUNE } from '../data/tune';
import { atLeast, ladderFor } from './ladder';
import { isLegible } from './journal';
import { OUTCOME_SPECS } from './construction';
import type { GameState, SurvivorRecord } from './types';

export interface DeathReview {
    /** "You died of thirst." One sentence, no euphemism. */
    cause: string;
    /** The causal chain, oldest first. What actually happened, in order. */
    chain: string[];
    /** What the bars had already shown before the end. Never a warning that was not given. */
    warnings: string[];
    /** What was in reach at the time. Empty if genuinely nothing was — which is worth saying. */
    couldHave: string[];
    /** How long this life lasted, said the way a person would say it. */
    lifetime: string;
    /** What this survivor leaves for whoever is next. The only kind thing about it. */
    legacy: string[];
}

const CAUSE_LINE: Record<string, string> = {
    thirst: 'You died of thirst.',
    hunger: 'You starved.',
    cold: 'You died of cold.',
    warmth: 'You died of cold.',
    exposure: 'The cold finished it.',
};

function causeLine(cause: string): string {
    const key = Object.keys(CAUSE_LINE).find((k) => cause.toLowerCase().includes(k));
    return key ? CAUSE_LINE[key] : `You died of ${cause}.`;
}

function saidHours(h: number): string {
    if (h < 24) return `${Math.max(1, Math.round(h))} hours`;
    const days = Math.floor(h / 24);
    return days === 1 ? 'a day and a night' : `${days} days`;
}

/**
 * Build the review from the state AS IT WAS AT DEATH. Call this BEFORE `closeSurvivor` —
 * afterwards the body it describes no longer exists, and a review assembled from the
 * successor's state would describe the wrong person entirely.
 */
export function reviewDeath(state: GameState, cause: string): DeathReview {
    const chain: string[] = [];
    const warnings: string[] = [];
    const couldHave: string[] = [];

    //  ---- THE CHAIN. Ordered as it happened, not as the fields happen to be declared. ----
    const lived = state.gameHoursElapsed - state.survivorStartedAtGameHours;

    if (state.wet > TUNE.wetMax * 0.4) {
        chain.push('You were wet, and wet costs heat faster than anything else out here.');
    }
    const fireOut = !state.fire.built || state.fire.fuel <= 0;
    if (fireOut) {
        chain.push(state.fire.built
            ? 'Your fire had burned out. Nothing was putting heat back in.'
            : 'There was no fire. Nothing was putting heat back in.');
    }
    if (!state.shelter.built) {
        chain.push('You had no cover, so the wind took what heat you had left.');
    }
    if (state.warmth <= 0) {
        chain.push('Your warmth reached zero, and after that the cold was taking health directly.');
    }
    if (state.thirst <= 0) chain.push('You had been out of water long enough for it to start costing health.');
    if (state.hunger <= 0) chain.push('You had been out of food long enough for it to start costing health.');
    if (chain.length === 0) {
        //  An honest fallback. Better than inventing a story about a death we cannot explain.
        chain.push(`Your health ran out. The cause recorded was ${cause}.`);
    }

    //  ---- WHAT YOU WERE TOLD. Same thresholds as the HUD; never a warning not given. ----
    //  DELIBERATELY NO HEALTH WARNING. Health is zero at every death by definition, so a
    //  "your health bar was low" line would fire every single time — always true, never
    //  informative, and it would crowd out the warnings that actually told the player
    //  something they could have acted on. A warning that cannot fail to appear is noise
    //  wearing a warning's clothes, and it makes the real ones read as boilerplate.
    if (state.thirst <= TUNE.thirstLowHintAt) warnings.push('Your thirst bar had been in the low band.');
    if (state.hunger <= TUNE.hungerLowHintAt) warnings.push('Your hunger bar had been in the low band.');
    if (state.warmth <= TUNE.warmthMax * 0.25) warnings.push('Your warmth bar had been in the low band.');

    //  ---- WHAT WAS IN REACH. Read from what was actually carried and actually known. ----
    if (fireOut && state.inventory.wood > 0) {
        couldHave.push(`You were carrying ${state.inventory.wood} wood. That was a fire.`);
    }
    if (state.thirst <= TUNE.thirstLowHintAt && state.tools.flask && state.tools.flaskSips > 0) {
        couldHave.push(`Your flask still had ${state.tools.flaskSips} sip(s) in it.`);
    }
    if (state.hunger <= TUNE.hungerLowHintAt
        && (state.inventory.berries > 0 || state.inventory.coconut > 0 || state.inventory.shellfish > 0)) {
        couldHave.push('You were still carrying food you had not eaten.');
    }
    if (!state.shelter.built && atLeast(ladderFor(state, 'shelter'), 'demonstrated')) {
        couldHave.push('You knew how to put a roof up, and had not.');
    }
    if (state.torch.owned && !state.torch.lit && state.warmth <= TUNE.warmthMax * 0.25) {
        couldHave.push('You had a torch you never lit.');
    }

    //  ---- LEGACY. What outlives them, and it is the only warm part of this. ----
    const legacy: string[] = [];
    if (state.shelter.built) legacy.push('The shelter you built is still standing.');
    if (state.storage.built) legacy.push('Your store box is where you left it, with what is in it.');
    if (state.journal.exists && !state.journal.carried && isLegible(state.journal)
        && state.journal.entries.length > 0) {
        legacy.push(`Your journal is where you left it — ${state.journal.entries.length} entry(s), still readable.`);
    } else if (state.journal.exists && state.journal.carried) {
        //  The decision made concrete, at the moment it costs something. This is the sentence
        //  that teaches the storage choice, and it can only be earned the hard way.
        legacy.push('Your journal was on you. It goes where you go.');
    } else {
        const unwritten = OUTCOME_SPECS
            .map((s) => s.recipeId)
            .filter((id) => atLeast(ladderFor(state, id), 'demonstrated'));
        if (unwritten.length > 0) {
            legacy.push('You never wrote any of it down. What you worked out goes with you.');
        }
    }

    return {
        cause: causeLine(cause),
        chain,
        warnings,
        couldHave,
        lifetime: `You lasted ${saidHours(Math.max(1, lived))}.`,
        legacy,
    };
}

/**
 * THE ARRIVAL NARRATION — spoken over the archaeology, after the review, to a NEW person.
 *
 * The tense change is the whole trick. The review says "you"; this says "someone". A player
 * who has just read their own death then reads about a stranger's handiwork, and the
 * strangeness is the point: they are meant to feel the distance between the person who built
 * this and the person now standing in front of it, because that distance is exactly what
 * requalification will make them close with their hands.
 */
export function narrateArrival(state: GameState, previous: SurvivorRecord | null): string[] {
    const lines: string[] = ['You wake up on the sand. Cold, soaked, and hurt.'];

    if (!previous) {
        lines.push('There is nothing on this beach but you and what the sea left.');
        return lines;
    }

    lines.push('Someone lived here.');
    if (state.shelter.built) lines.push('There is a shelter up the beach, still standing. You did not build it.');
    if (state.storage.built) lines.push('A box, set down deliberately, with things still in it.');
    if (state.fire.built) lines.push('A ring of stones, and old ash.');
    if (state.nodes.some((n) => !n.available)) lines.push('The trees near the water have been cut.');

    if (state.journal.exists && !state.journal.carried && isLegible(state.journal)
        && state.journal.entries.length > 0) {
        lines.push('And there is a book, kept dry. Someone wrote things down.');
    }

    //  Never "they knew how to build a shelter". The survivor sees a SHELTER, and has to work
    //  out what holds it up. Naming the knowledge here would hand over by narration exactly
    //  what the ladder refuses to hand over by state — [[D-069]], enforced in prose too.
    lines.push(`Whoever they were, ${lastWordsFor(previous)}`);
    return lines;
}

function lastWordsFor(previous: SurvivorRecord): string {
    return `they lasted ${saidHours(Math.max(1, previous.livedGameHours))}, and then they did not.`;
}
