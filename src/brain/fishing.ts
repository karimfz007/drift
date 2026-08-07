/**
 * FISHING — three methods, one fish, one population model.
 *
 * The island has had a `fish` verb on the pond's radial circle since Slice 2 and a
 * `fishingLine` boolean in `Tools` since v11, and neither ever did anything: the verb
 * explained "you cast, and wait — nothing yet", and no recipe anywhere could make the line.
 * This is that parked thing, built, and two more beside it.
 *
 * ---------------------------------------------------------------------------------------
 * WHY THREE, AND WHAT MAKES THEM THREE RATHER THAN ONE WITH SKINS.
 *
 * A method that is strictly better than another is a method the other two are never chosen
 * over. So each of these is deliberately the WORST option in somebody's situation, and the
 * thing each one spends is different:
 *
 *   HANDLINE spends your ATTENTION. Cheapest to make — two fibre — and while it is cast you
 *            are standing at that spot doing nothing else. Walk away and you lose the cast.
 *            One fish at a time, and gentlest on the water.
 *
 *   NET      spends a PLACE. It fishes while your hands are busy, but only while you stay
 *            within `netTendRadiusM` of it, and it holds nothing at all until it has soaked.
 *            The best yield in the game and the worst answer to "I am hungry now".
 *
 *   SPEAR    spends the SITE. No new tool — this is the ALREADY-SHIPPED spear and its
 *            already-shipped `thrust`, given a second valid target. Instant, no setup, best
 *            per hit, and a miss scares the shoal anyway: the worst thrower is hardest on
 *            the water, which is the whole of its skill expression.
 *
 * ---------------------------------------------------------------------------------------
 * THE POPULATION MODEL IS THE ONE ALREADY HERE. Two states per site — present, or locally
 * depleted — and both of them are `WoodNode.available`, which every bush and the quarry seam
 * have used since [[D-051]]. A site carries `pool` (the quarry's own field), each catch
 * spends some of it, and at zero the node depletes with `depletedAtGameHours` set and comes
 * back through `regrowGameHoursFor` like everything else. There is no second depletion
 * system here, and deliberately no per-species stock, no migration and no carrying capacity:
 * the dossier's minimum was two states, and two states is what this is.
 *
 * What the METHOD chooses is how fast the water empties — a line takes six fish from a site,
 * a spear three attempts, a net two hauls — and that is the population model doing its job.
 *
 * ---------------------------------------------------------------------------------------
 * D-011, BY THE SAME STRUCTURE AS EVERY STAGE BEFORE IT.
 *
 * `Session.advanceFishing` is the only function that advances a cast or a soak, and it runs
 * on the online tick and nowhere else. There is no elapsed-time term on either anywhere in
 * the absence path. Nothing here can take health at all — no method has a harm term — so the
 * law is satisfied twice over: absence cannot spend a soak, and there is nothing for it to
 * spend one INTO.
 *
 * That is also why fishing does not quietly become idle income. A net that filled while the
 * tab was shut would be exactly the offline progression this project has refused everywhere
 * else, and the fix is not a cap — it is that the absence path cannot reach the net.
 */
import { TUNE } from '../data/tune';
import { waterDepthAt } from '../data/world';
import type { GameState, WoodNode } from './types';

export type FishingMethod = 'handline' | 'net' | 'spear';

/**
 * A SITE'S POPULATION, in the two states the dossier asked for and no more.
 *
 * Read from the node, never stored twice. `available` IS the state — a third field naming
 * the same fact is how two sources of truth start.
 */
export type SpotState = 'present' | 'locally-depleted';

export function spotStateOf(node: WoodNode): SpotState {
    return node.available ? 'present' : 'locally-depleted';
}

/** Every fishing spot on the island, in whatever state it is in. */
export function fishingSpots(state: GameState): WoodNode[] {
    return state.nodes.filter((n) => n.kind === 'fishingspot');
}

/**
 * The nearest spot the survivor could actually work, or null.
 *
 * NEAREST-WITHIN-REACH, the same shape `nearestBoar` uses for the thrust, so the three
 * fishing verbs can be computed without threading a site id through `verbsFor`'s signature.
 * A depleted site is deliberately still RETURNED — the circle has to be able to say "this
 * water is fished out" rather than going silent, which is Ch.2's nearest-true-reason rule.
 */
export function nearestSpot(state: GameState): WoodNode | null {
    let best: WoodNode | null = null;
    let bestD = TUNE.interactRadiusM + TUNE.fishSpotTapRadiusM;
    for (const n of fishingSpots(state)) {
        const d = Math.hypot(n.x - state.player.x, n.y - state.player.y);
        if (d <= bestD) { best = n; bestD = d; }
    }
    return best;
}

export function spotById(state: GameState, id: string): WoodNode | null {
    return state.nodes.find((n) => n.id === id && n.kind === 'fishingspot') ?? null;
}

/** How much water is over a spot. Reused from the maritime model, never re-derived. */
export function depthAtSpot(node: WoodNode): number {
    return Math.max(0, waterDepthAt(node.x, node.y));
}

// ---------------------------------------------------------------------------
// Spending a site's population — the one place a catch costs the water anything.
// ---------------------------------------------------------------------------

/**
 * Take `cost` out of a site, depleting it if that empties the pool.
 *
 * ONE FUNCTION FOR ALL THREE METHODS, because three copies of "decrement and maybe deplete"
 * is three chances for one of them to forget the timestamp and leave a site that never grows
 * back. Returns the state the site is in afterwards, so a caller can say so.
 */
export function spendPool(state: GameState, node: WoodNode, cost: number): SpotState {
    const index = state.nodes.findIndex((n) => n.id === node.id);
    if (index < 0) return 'locally-depleted';
    const current = state.nodes[index];
    const left = Math.max(0, (current.pool ?? 0) - cost);
    const emptied = left <= 0;
    state.nodes[index] = {
        ...current,
        pool: left,
        available: !emptied,
        //  The regrow clock starts the moment it empties, and ONLY then — stamping it on
        //  every catch would restart the recovery of a site somebody is still working.
        depletedAtGameHours: emptied ? state.gameHoursElapsed : current.depletedAtGameHours,
    };
    return emptied ? 'locally-depleted' : 'present';
}

// ---------------------------------------------------------------------------
// What blocks each method — the nearest TRUE reason, per Ch.2.
// ---------------------------------------------------------------------------

/** Null when the method is available; otherwise the ONE truest obstacle, in the player's words. */
export function handlineBlocker(state: GameState): string | null {
    const spot = nearestSpot(state);
    if (!spot) return 'There is no water to fish here.';
    if (!state.tools.fishingLine) return 'You have no line to fish with.';
    if (!spot.available) return 'This water is fished out. Give it time.';
    if (state.fishing.line) return 'Your line is already in the water.';
    return null;
}

export function setNetBlocker(state: GameState): string | null {
    const spot = nearestSpot(state);
    if (!spot) return 'There is no water to set a net in.';
    if (!state.tools.net) return 'You have no net.';
    if (!spot.available) return 'This water is fished out. Give it time.';
    if (state.fishing.net) return 'Your net is already set.';
    return null;
}

export function haulNetBlocker(state: GameState): string | null {
    if (!state.fishing.net) return 'You have no net in the water.';
    const spot = spotById(state, state.fishing.net.spotId);
    if (!spot) return 'You have no net in the water.';
    const d = Math.hypot(spot.x - state.player.x, spot.y - state.player.y);
    if (d > TUNE.interactRadiusM + TUNE.fishSpotTapRadiusM) return 'Your net is elsewhere. Go to it.';
    return null;
}

/**
 * SPEAR-FISHING'S OWN GATE, and the depth clause is the interesting one.
 *
 * You throw a spear from your FEET. Past `spearFishMaxDepthM` — just under the maritime
 * slice's own `swimDepthM` — a survivor is swimming, and a swimmer has nothing to brace
 * against. That single line is why the 7 m dive site is not a fishery and why spear-fishing
 * belongs to the shallows: it reuses the water model rather than declaring a new rule.
 */
export function spearFishBlocker(state: GameState): string | null {
    const spot = nearestSpot(state);
    if (!spot) return 'There is no water to fish here.';
    if (!state.tools.spear) return 'You have nothing to strike with.';
    if (!spot.available) return 'This water is fished out. Give it time.';
    if (depthAtSpot(spot) > TUNE.spearFishMaxDepthM) return 'Too deep to stand and strike.';
    if (state.energy < TUNE.spearFishEnergy) return 'You have nothing left to throw with.';
    return null;
}

// ---------------------------------------------------------------------------
// 1. THE HANDLINE — cast, and wait.
// ---------------------------------------------------------------------------

export function castHandline(state: GameState): boolean {
    if (handlineBlocker(state) !== null) return false;
    const spot = nearestSpot(state)!;
    state.fishing.line = { spotId: spot.id, waitedGameHours: 0 };
    return true;
}

/** Reel in without a fish. The player's own "never mind", and it must always be allowed. */
export function reelIn(state: GameState): boolean {
    if (!state.fishing.line) return false;
    state.fishing.line = null;
    return true;
}

export interface BiteResult {
    caught: number;
    /** The site's state after the catch — so the body can say "and that was the last of them". */
    spot: SpotState | null;
}

/**
 * Advance a cast line by a span, and resolve it if it has waited long enough.
 *
 * THE LINE IS HELD, NOT SET, and this is where that is enforced: walk out of reach of the
 * spot and the cast is lost. That is the handline's whole cost — it is not that it is slow,
 * it is that the slowness is time you cannot spend on anything else.
 */
export function advanceHandline(state: GameState, gameHours: number): BiteResult {
    const line = state.fishing.line;
    if (!line || !(gameHours > 0)) return { caught: 0, spot: null };
    const spot = spotById(state, line.spotId);
    if (!spot) { state.fishing.line = null; return { caught: 0, spot: null }; }

    const d = Math.hypot(spot.x - state.player.x, spot.y - state.player.y);
    if (d > TUNE.interactRadiusM + TUNE.fishSpotTapRadiusM) {
        state.fishing.line = null;
        return { caught: 0, spot: null };
    }
    //  A site that emptied under someone else's net while this line was out simply has no
    //  fish left to bite. The cast ends; nothing is owed.
    if (!spot.available) { state.fishing.line = null; return { caught: 0, spot: 'locally-depleted' }; }

    const waited = line.waitedGameHours + gameHours;
    if (waited < TUNE.handlineBiteGameHours) {
        state.fishing.line = { ...line, waitedGameHours: waited };
        return { caught: 0, spot: 'present' };
    }
    state.fishing.line = null;
    const after = spendPool(state, spot, TUNE.handlinePoolCost);
    gainFish(state, TUNE.handlineYield);
    return { caught: TUNE.handlineYield, spot: after };
}

// ---------------------------------------------------------------------------
// 2. THE NET — set it, stay nearby, come back for it.
// ---------------------------------------------------------------------------

export function setNet(state: GameState): boolean {
    if (setNetBlocker(state) !== null) return false;
    const spot = nearestSpot(state)!;
    state.fishing.net = { spotId: spot.id, soakedGameHours: 0, holding: 0 };
    return true;
}

/** Is the survivor near enough for a set net to keep working? */
export function netIsTended(state: GameState): boolean {
    const net = state.fishing.net;
    if (!net) return false;
    const spot = spotById(state, net.spotId);
    if (!spot) return false;
    return Math.hypot(spot.x - state.player.x, spot.y - state.player.y) <= TUNE.netTendRadiusM;
}

/**
 * Advance a set net by a span.
 *
 * IT ONLY WORKS WHILE YOU ARE NEAR IT, and that is the tether the whole method is built on.
 * A net that fished the island while you were on the far side of it would be a resource
 * faucet, and the honest fiction agrees with the balance: a net nobody is watching is a net
 * the tide empties. Walking away does not LOSE what it holds — it simply stops.
 */
export function advanceNet(state: GameState, gameHours: number): void {
    const net = state.fishing.net;
    if (!net || !(gameHours > 0)) return;
    if (!netIsTended(state)) return;
    const spot = spotById(state, net.spotId);
    if (!spot || !spot.available) return;

    const soaked = net.soakedGameHours + gameHours;
    if (soaked < TUNE.netSoakGameHours) {
        state.fishing.net = { ...net, soakedGameHours: soaked };
        return;
    }
    //  Only the span PAST the soak window earns anything, so a net does not pay out for the
    //  dead time — which is the difference between a setup cost and a delay.
    const fishing = Math.min(gameHours, soaked - TUNE.netSoakGameHours);
    const holding = Math.min(TUNE.netCapacity, net.holding + TUNE.netCatchPerGameHour * fishing);
    state.fishing.net = { spotId: net.spotId, soakedGameHours: soaked, holding };
}

export interface HaulResult {
    caught: number;
    spot: SpotState | null;
}

/**
 * Lift the net and take what is in it.
 *
 * Hauling LIFTS the net — it comes back to you, and setting it again is a fresh decision
 * with a fresh soak. A net that stayed set and kept paying would make the first placement
 * the last decision the method ever asks for.
 */
export function haulNet(state: GameState): HaulResult {
    if (haulNetBlocker(state) !== null) return { caught: 0, spot: null };
    const net = state.fishing.net!;
    const spot = spotById(state, net.spotId)!;
    const caught = Math.floor(net.holding);
    state.fishing.net = null;
    if (caught <= 0) return { caught: 0, spot: spotStateOf(spot) };
    const after = spendPool(state, spot, TUNE.netHaulPoolCost);
    gainFish(state, caught);
    return { caught, spot: after };
}

// ---------------------------------------------------------------------------
// 3. THE SPEAR — no new tool, no waiting, and a real chance of nothing.
// ---------------------------------------------------------------------------

/**
 * The chance this survivor's strike lands, 0..1.
 *
 * READ OFF THE SHIPPED KNOWLEDGE MODEL, at the same base and slope the Try-Combining curve
 * uses, because this game already decided what an unpractised attempt at something is worth
 * and a second opinion would drift from it the first time either was retuned.
 */
export function spearFishChance(state: GameState): number {
    const technique = state.knowledge.domains.survivalcraft.technique;
    const raw = TUNE.spearFishBaseChance + technique * TUNE.spearFishChancePerTechnique;
    return Math.min(TUNE.spearFishMaxChance, Math.max(0, raw));
}

export interface StrikeResult {
    ok: boolean;
    caught: number;
    /** True when the strike missed — the fish scattered and the water paid for it anyway. */
    scared: boolean;
    spot: SpotState | null;
}

/**
 * ONE STRIKE. `roll` is 0..1 and comes from the caller.
 *
 * THE ROLL IS A PARAMETER, not a `Math.random()` in here, for the reason every pure function
 * in this brain takes its inputs: `reconcile` is documented as never rolling dice, and a
 * module that quietly did would make the whole layer untestable at exactly the point where
 * variance is the mechanic. The body rolls; this decides.
 *
 * A MISS STILL COSTS THE WATER. That is not a punishment bolted on — it is the method's
 * defining trade, and removing it would make the spear a strictly better handline.
 */
export function spearFish(state: GameState, roll: number): StrikeResult {
    if (spearFishBlocker(state) !== null) return { ok: false, caught: 0, scared: false, spot: null };
    const spot = nearestSpot(state)!;
    state.energy = Math.max(0, state.energy - TUNE.spearFishEnergy);
    const hit = roll < spearFishChance(state);
    const after = spendPool(state, spot, TUNE.spearFishPoolCost);
    if (!hit) return { ok: true, caught: 0, scared: true, spot: after };
    gainFish(state, TUNE.spearFishYield);
    return { ok: true, caught: TUNE.spearFishYield, scared: false, spot: after };
}

// ---------------------------------------------------------------------------
// The catch itself.
// ---------------------------------------------------------------------------

/**
 * Add fish to the pack and start (or restart) their freshness clock.
 *
 * THE CLOCK IS RESET ON EVERY CATCH, and the honest reading of that is "the freshest fish
 * sets the clock for the pile". Tracking each fish separately would be a per-unit spoilage
 * model, which is a bigger system than this stage needs and than the boar's meat ever had.
 */
export function gainFish(state: GameState, amount: number): void {
    if (!(amount > 0)) return;
    state.inventory.fish += amount;
    state.freshUntil = { ...state.freshUntil, fish: TUNE.fishFreshGameHours };
}

/** Fresh state for a new castaway: no line in the water, no net set. */
export function freshFishing(): GameState['fishing'] {
    return { line: null, net: null };
}
