/**
 * BRAIN — Ch.2, "The Knowledge Model" (MAJOR artifact, AUDITED-GO from C1). Brain-layer
 * only this pass: no new player-facing UI surface (Ch.4 owns the actual reveal — the
 * depth-dial admission test below is its debt, not something paid here).
 *
 * Every unit tracks three scores per domain, across seven domains (`KnowledgeDomain` in
 * types.ts): Technique (how well you DO it), Understanding (how well you know WHY it
 * works), Adaptation (how well you apply it somewhere genuinely new). All three start at
 * an innate floor, not zero (`freshDomainScores`) — most domains will sit untouched for a
 * long time, and that is correct, the same forward-compatible-plumbing precedent D-055's
 * material-family schema already set: content that hasn't arrived yet (Mechanical systems,
 * Electrical & radio, Navigation & seamanship — nothing in this codebase touches them yet)
 * is not a gap to fill artificially.
 *
 * STAGED PERCEIVABILITY (C1 amendment C, binding): every score here is internal only this
 * pass — never surfaced to the player as a raw number, a bar, or any UI at all. That is
 * Ch.4's OWN sequencing, not a permanent waiver: Ch.4 owns the actual reveal, and with it,
 * the depth-dial admission test (perceive / influence / narrate) this system has NOT yet
 * been checked against. That debt is real, unpaid, and named here explicitly so it cannot
 * later be mistaken for resolved.
 *
 * ADAPTATION FEEDER (C1 amendment A): nothing in this pass ever produces an Adaptation
 * delta — `evaluateLearningEvent` only returns Technique/Understanding. What WOULD feed
 * it, left undesigned rather than half-built: applying a technique genuinely learned in
 * one domain to a novel situation tagged with a DIFFERENT domain's context — e.g., a
 * player who has built Harvesting & fabrication's Understanding of "sharp edges cut fibre
 * cleanly" reaching for that same insight the first time Construction throws a fibre-like
 * binding problem at them. Detecting that crossover honestly needs a notion of "which
 * domain's context this specific moment belongs to" that does not exist yet (no domain
 * tagging on individual world moments, only on verbs) — deliberate plumbing for a later
 * pass, not a dead float; this comment is that pass's starting note.
 */

import { TUNE } from '../data/tune';
import type { DomainScore, GameState, KnowledgeDomain, NodeKind } from './types';

/** One place, keyed by domain — the same convention `MATERIAL_PROFILE`/`NODE_SPECS`
 *  already use. Order matches the ruling's own list. */
export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [
    'survivalcraft',
    'foragingMedicine',
    'harvestingFabrication',
    'construction',
    'mechanicalSystems',
    'electricalRadio',
    'navigationSeamanship'
];

/** A fresh domain score: the innate channel (#5) IS this floor — there is no separate
 *  runtime path for "innate," it is simply where every domain starts. */
export function freshDomainScore(): DomainScore {
    return {
        technique: TUNE.knowledgeInnateFloor,
        understanding: TUNE.knowledgeInnateFloor,
        adaptation: TUNE.knowledgeInnateFloor
    };
}

export function freshDomainScores(): Record<KnowledgeDomain, DomainScore> {
    const scores = {} as Record<KnowledgeDomain, DomainScore>;
    for (const domain of KNOWLEDGE_DOMAINS) scores[domain] = freshDomainScore();
    return scores;
}

/** Deep-clones every domain's score object — `cloneState` needs this so two states never
 *  share a mutable `DomainScore`, the same reasoning it already applies to inventory/tools. */
export function cloneDomainScores(domains: Record<KnowledgeDomain, DomainScore>): Record<KnowledgeDomain, DomainScore> {
    const cloned = {} as Record<KnowledgeDomain, DomainScore>;
    for (const domain of KNOWLEDGE_DOMAINS) cloned[domain] = { ...domains[domain] };
    return cloned;
}

/**
 * The five channels a domain score can move through (minimally, per the ruling). Only
 * 'trying' has a real runtime path this pass, via `recordTrying`/`applyLearningEvent`
 * below — the type itself is what this pass ships for the other four:
 *
 * - 'trying': every successful gather/build/craft action, automatically (see
 *   `domainForNodeKind`, `recipeDomain` in recipes.ts, and the inline calls in state.ts/
 *   session.ts). Also covers a genuine null-outcome combination attempt (D-055's journal,
 *   wired for real below) — trying and failing informatively is still trying.
 * - 'teaching' / 'watching': data model only, unreachable in solo play. No producer, no
 *   UI, no trigger exists this pass — per D-054's "design multiplayer-shaped, build
 *   single-player-first" law, there is no second unit to teach or watch yet.
 * - 'foundContent': stubbed the same way — no source exists until Ch.3, so there is
 *   nothing yet to attach this channel's events to.
 * - 'innate': not a runtime path at all — it IS `freshDomainScore`'s own floor.
 */
export type LearningChannel = 'trying' | 'teaching' | 'watching' | 'foundContent' | 'innate';

/** The five factors a learning event is scored on, each 0..1. Never surfaced to the
 *  player as raw numbers — internal only, this pass. */
export interface LearningFactors {
    /** How hard the action was relative to what's already mastered. */
    challenge: number;
    /** How unfamiliar the outcome or situation was. */
    novelty: number;
    /** How clear and immediate the causal feedback was — did you SEE why it worked. */
    feedback: number;
    /** How much was genuinely at stake. */
    consequence: number;
    /** How much active attention the moment drew, versus autopilot. */
    reflection: number;
}

export interface LearningDelta {
    technique: number;
    understanding: number;
}

/**
 * Pure. Scores one action's five factors into a small (Technique, Understanding) delta.
 * Deliberately MULTIPLICATIVE, not additive, in both halves: Technique is gated entirely
 * by `challenge` (times `feedback`), Understanding entirely by `novelty` (times a
 * reflection/consequence blend) — so "repeating an already-mastered action with no new
 * information produces a near-zero delta" falls straight out of the arithmetic whenever a
 * caller's own factors correctly go to zero for that case (see `tryFactorsFor`'s headroom
 * derivation below); there is no `if (alreadyMastered) return 0` anywhere in this file.
 * Never negative — nothing in this pass ever un-learns something (see amendment B,
 * enforced structurally in reconcile.ts, which never even reads this function).
 */
export function evaluateLearningEvent(factors: LearningFactors): LearningDelta {
    const technique = TUNE.knowledgeTechniqueMaxDelta * factors.challenge * factors.feedback;
    const understanding =
        TUNE.knowledgeUnderstandingMaxDelta *
        factors.novelty *
        (TUNE.knowledgeReflectionWeight * factors.reflection + TUNE.knowledgeConsequenceWeight * factors.consequence);
    return { technique, understanding };
}

/**
 * Factors for the generic "trying" channel — any ordinary successful gather/build/craft.
 * `challenge`/`novelty` are each the domain's own remaining HEADROOM (1 at the innate
 * floor, shrinking to 0 at the ceiling) — not a flag, not a repeat counter. A domain
 * already at its ceiling has zero headroom on both, so `evaluateLearningEvent` above
 * returns (0, 0) for it regardless of feedback/consequence/reflection — the "near-zero on
 * repetition, by construction" property this system is required to have. Feedback stays
 * high across the board: every direct-world action is immediately visible in hand (D-042),
 * so there is nothing domain-specific to derive there this pass.
 */
export function tryFactorsFor(score: DomainScore): LearningFactors {
    const headroom = (current: number) => Math.max(0, 1 - current / TUNE.knowledgeScoreMax);
    return {
        challenge: headroom(score.technique),
        novelty: headroom(score.understanding),
        feedback: TUNE.tryingFeedbackFactor,
        consequence: TUNE.tryingConsequenceFactor,
        reflection: TUNE.tryingReflectionFactor
    };
}

/**
 * Factors for a genuine null-outcome combination attempt (D-055's journal, item 3 — wired
 * for real, not just recorded). Discovering "this doesn't fit" is itself information: novelty
 * and feedback are both effectively certain — the journal's own dedup guarantees this is
 * genuinely the first time this exact pair has ever been tried, and the Build panel makes
 * the mismatch legible at a glance. `challenge` and `consequence` stay at 0 — nothing was
 * actually made, nothing was risked — so Technique's delta comes out EXACTLY 0 (not merely
 * small) by `evaluateLearningEvent`'s own multiplicative construction: a null attempt is a
 * genuine Understanding gain and nothing else.
 */
export function nullOutcomeFactors(): LearningFactors {
    return {
        challenge: 0,
        novelty: TUNE.nullOutcomeNoveltyFactor,
        feedback: TUNE.nullOutcomeFeedbackFactor,
        consequence: 0,
        reflection: TUNE.nullOutcomeReflectionFactor
    };
}

/** Apply a learning event's delta to one domain, in place, clamped at the ceiling. Returns
 *  the delta actually computed (before clamping) for anything that wants to know. */
export function applyLearningEvent(state: GameState, domain: KnowledgeDomain, factors: LearningFactors): LearningDelta {
    const delta = evaluateLearningEvent(factors);
    const score = state.knowledge.domains[domain];
    score.technique = Math.min(TUNE.knowledgeScoreMax, score.technique + delta.technique);
    score.understanding = Math.min(TUNE.knowledgeScoreMax, score.understanding + delta.understanding);
    return delta;
}

/** The 'trying' channel's own entry point — every successful gather/build/craft call site
 *  in state.ts/session.ts calls this exactly once, with the domain the verb maps to. */
export function recordTrying(state: GameState, domain: KnowledgeDomain): LearningDelta {
    return applyLearningEvent(state, domain, tryFactorsFor(state.knowledge.domains[domain]));
}

/**
 * Which domain a gathered node kind trains, mapping ONLY the verbs the ruling names
 * ("felling/knapping/quarrying/salvage → Harvesting & fabrication") — `null` for every
 * other kind, left at the innate floor this pass, expected rather than a bug. Notably
 * `rock` (a smaller, standalone outcrop distinct from the quarry) and `crashbox` are NOT
 * mapped, even though both use the axe — the ruling names "quarrying" specifically, not
 * every stone-yielding or axe-gated verb, and foraging (driftwood/deadfall/berries/
 * coconut/reed/shellfish) stays untouched entirely this pass, matching Foraging &
 * medicine's own explicit "sits untouched for a long time" framing.
 */
export function domainForNodeKind(kind: NodeKind): KnowledgeDomain | null {
    switch (kind) {
        case 'tree': // felling
        case 'quarry': // quarrying
        case 'salvage': // salvage
            return 'harvestingFabrication';
        default:
            return null;
    }
}
