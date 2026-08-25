/**
 * THE CROSSING — the boat carries you most of the way, and you swim the rest.
 *
 * WHAT THIS SESSION IS FOR. [[D-121]] built the crossing as a SWIM: ~97 m of open water to
 * the wreck, tuned so *"a full reserve gets you there and not back."* That is a real
 * decision and it has been a one-way decision ever since. [[D-187]]–[[D-190]] built a boat
 * and stopped her at the end of a line, and her own forecast says so out loud: *"the line is
 * the length of it; the wreck is further than that."*
 *
 * This joins the two. The boat does not make the wreck NEARER — she makes it SURVIVABLE:
 *
 *      swimming alone   44.7 energy out, 89.4 there and back   (from a reserve of 100)
 *      by boat          14.9 energy out, 29.7 there and back
 *
 * Three times cheaper, and — the part that matters — a round trip a survivor can actually
 * afford. The capability Session 3 adds is not reach. It is COMING BACK.
 *
 * ---------------------------------------------------------------------------------------
 * THE BOAT'S RANGE IS NOT STRETCHED TO COVER IT. `boatFerryDistanceM` is 90 m and stays 90 m:
 * that is the water her arms are good for, and it is one budget spent two ways —
 *
 *      on the line     out and back, 90 m covered, and she brings you home
 *      on a crossing   all of it one way, and she does not
 *
 * which is exactly why a crossing is a commitment and the line is not. A destination whose
 * open water exceeds that budget is simply out of range and says so, rather than being
 * quietly brought closer.
 *
 * ---------------------------------------------------------------------------------------
 * SHE STANDS OFF, AND THAT IS THE DROP-OFF POINT. A patched hull does not go alongside a
 * listing steel wreck that shifts every time it is worked ([[D-124]]'s instability model) —
 * she stands off `standOffM` and you go in from there. So the hand-off is not a system
 * boundary dressed as fiction; it is the reason the swim exists.
 *
 * ---------------------------------------------------------------------------------------
 * [[D-011]] — AND THE ANSWER IS STRUCTURAL RATHER THAN A CHECK. **The crossing has no
 * mid-state of its own.** The boat leg is ATOMIC: one act, one cost, one new position. What
 * exists afterwards is a survivor in the water beside a moored boat — two situations this
 * game already protects, by machinery that predates this file. `reconcile` has no crossing
 * term because there is no crossing to have a term about, and no field added here can rot,
 * drift or expire while the tab is shut. That is Law 239’s protected absence ([[D-192]]) obtained by
 * construction: there is no property in flight to lose.
 *
 * ---------------------------------------------------------------------------------------
 * ONE ROW ADDS A DESTINATION. `DESTINATIONS` is a table and every function here takes a
 * `Destination` rather than reaching for the wreck. The far island already exists in the
 * terrain — (60, 420), with a real waterline that `waterDepthAt` gives it for free — and it
 * is deliberately NOT in the shipped table: adding it is a content call, not a builder's.
 * `crossing.test.ts` adds it as a row and drives every function in this file against it to
 * prove the seam is real rather than claimed.
 */

import { TUNE } from '../data/tune';
import { BOAT, waterDepthAt } from '../data/world';
import { boatStage } from './boat';
import { realSecondsPerGameHour } from '../data/tune';
import type { Destination, DestinationId, GameState } from './types';
import { DESTINATIONS } from '../data/world';

/** Where the boat actually is right now. Derived from `boat.at`, never stored as a position. */
export function boatPosition(state: GameState): { x: number; y: number } {
    const at = state.boat.at;
    if (at === 'shore') return { x: BOAT.x, y: BOAT.y };
    const dest = DESTINATIONS[at];
    //  A destination that has been removed from the table leaves her at her beach rather than
    //  at a coordinate nobody can name. Content can be withdrawn; a boat cannot be nowhere.
    if (!dest) return { x: BOAT.x, y: BOAT.y };
    return standOffPoint(dest);
}

/**
 * THE POINT SHE STOPS AT — `standOffM` short of the destination, on the line in from her
 * beach. Derived so that moving the beach or the destination moves this with them.
 */
export function standOffPoint(dest: Destination): { x: number; y: number } {
    const dx = dest.x - BOAT.x;
    const dy = dest.y - BOAT.y;
    const total = Math.hypot(dx, dy);
    if (total <= dest.standOffM) return { x: BOAT.x, y: BOAT.y };
    const t = (total - dest.standOffM) / total;
    return { x: BOAT.x + dx * t, y: BOAT.y + dy * t };
}

/**
 * METRES OF WATER ON A ROUTE, sampled off the real terrain rather than assumed.
 *
 * The beach between the boat and the waterline is a DRAG, not a paddle, and charging arms
 * for it would price walking as rowing. So the leg is the wet part of the line, measured by
 * asking `waterDepthAt` along it — the same terrain the swim reads, so the two legs of one
 * crossing can never disagree about where the sea starts.
 */
export function waterMetresBetween(
    from: { x: number; y: number },
    to: { x: number; y: number },
    samples: number = TUNE.crossingRouteSamples,
): number {
    const total = Math.hypot(to.x - from.x, to.y - from.y);
    if (total <= 0) return 0;
    const step = total / samples;
    let wet = 0;
    for (let i = 0; i < samples; i++) {
        //  Midpoint of each step, so a step is counted wet when most of it is.
        const t = (i + 0.5) / samples;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        if (waterDepthAt(x, y) > 0) wet += step;
    }
    return wet;
}

/** One leg of a crossing, priced. */
export interface CrossingLeg {
    metres: number;
    hours: number;
    energyCost: number;
}

/**
 * THE WHOLE ROUTE, PRICED BEFORE IT IS COMMITTED TO — the fair-challenge contract, and the
 * same function `runCrossing` itself calls so the promise and the act cannot drift apart.
 *
 * BOTH LEGS TOGETHER, which is the point. A survivor deciding whether to go needs one
 * number for boat-plus-swim, not two numbers they are expected to add while standing in the
 * surf. `affordable` answers the question they are actually asking.
 */
export interface CrossingPlan {
    destination: Destination;
    /** Out from her beach, or home from the stand-off. */
    direction: 'out' | 'home';
    boat: CrossingLeg;
    /** The open water left between the stand-off and arrival. Zero when there is none. */
    swim: CrossingLeg;
    /** What the whole route costs in energy, both legs. */
    totalEnergy: number;
    /** Energy left on arrival, if it is attempted now. */
    energyOnArrival: number;
    /** Could this boat cover her leg at all? False when the destination is beyond her range. */
    inRange: boolean;
    /** Enough reserve for BOTH legs, with the swim's own warning band left intact. */
    affordable: boolean;
    blocker: string | null;
}

function legFor(metres: number, speedFraction: number, drainPerGameHour: number): CrossingLeg {
    const seconds = metres / (TUNE.walkSpeedMps * speedFraction);
    const hours = seconds / realSecondsPerGameHour;
    return { metres, hours, energyCost: hours * drainPerGameHour };
}

export function crossingPlan(state: GameState, destId: DestinationId): CrossingPlan {
    const dest = DESTINATIONS[destId];
    const direction: 'out' | 'home' = state.boat.at === 'shore' ? 'out' : 'home';
    const stand = standOffPoint(dest);
    const beach = { x: BOAT.x, y: BOAT.y };

    //  THE BOAT'S LEG IS THE SAME WATER IN BOTH DIRECTIONS. Priced once so the trip home can
    //  never be cheaper than the trip out for any reason other than the survivor's own state.
    const boatMetres = waterMetresBetween(beach, stand);
    const boat = legFor(boatMetres, TUNE.boatPaddleSpeedFraction, TUNE.raftEnergyDrainPerGameHour);

    //  ...AND THE SWIM IS ONLY ON THE WAY OUT. Coming home you swim BACK to a boat that is
    //  already floating where you left her, which is the same water again — so the swim leg
    //  is priced for both and simply named by the direction the plan is describing.
    const swimMetres = Math.max(0, dest.standOffM - dest.arrivalRadiusM);
    const swim = legFor(swimMetres, TUNE.swimSpeedMultiplier, TUNE.swimEnergyDrainPerGameHour);

    const totalEnergy = boat.energyCost + swim.energyCost;
    const energyOnArrival = state.energy - totalEnergy;
    const inRange = boatMetres <= TUNE.boatFerryDistanceM;
    //  AFFORDABLE MEANS ARRIVING ABOVE THE WATER'S OWN FIRST WARNING, not merely arriving
    //  alive. `swimLabouringEnergy` is where the sea starts telling you the shore is a long
    //  way back; a forecast that called it affordable to arrive below that would be promising
    //  a crossing that ends in the stage before drowning.
    const affordable = energyOnArrival > TUNE.swimLabouringEnergy;

    return {
        destination: dest, direction, boat, swim,
        totalEnergy, energyOnArrival, inRange, affordable,
        blocker: crossingBlocker(state, destId),
    };
}

/**
 * THE ONE TRUEST OBSTACLE (Law 95), ordered from the thing furthest from the survivor to the
 * thing nearest. Null means the crossing is legal.
 */
export function crossingBlocker(state: GameState, destId: DestinationId): string | null {
    const dest = DESTINATIONS[destId];
    if (boatStage(state) !== 'B2') return 'She does not float yet. There is nothing to cross in.';
    if (!state.boat.loadKnown) return 'Get into her first and feel what she does with weight in her.';
    const stand = standOffPoint(dest);
    const boatMetres = waterMetresBetween({ x: BOAT.x, y: BOAT.y }, stand);
    //  OUT OF RANGE IS NOT A DIFFICULTY, it is a fact about the hull, and it is said as one.
    if (boatMetres > TUNE.boatFerryDistanceM) {
        return `${dest.label} is further than she will go. Her arms are good for about`
            + ` ${Math.round(TUNE.boatFerryDistanceM)} metres of water and that is ${Math.round(boatMetres)}.`;
    }
    const plan = planWithoutBlocker(state, dest);
    if (!plan.affordable) {
        return 'You have not the reserve for the crossing and the swim at the other end.';
    }
    return null;
}

/** The plan's arithmetic without its blocker, so `crossingBlocker` can consult it safely. */
function planWithoutBlocker(state: GameState, dest: Destination): { affordable: boolean } {
    const stand = standOffPoint(dest);
    const boatMetres = waterMetresBetween({ x: BOAT.x, y: BOAT.y }, stand);
    const boat = legFor(boatMetres, TUNE.boatPaddleSpeedFraction, TUNE.raftEnergyDrainPerGameHour);
    const swimMetres = Math.max(0, dest.standOffM - dest.arrivalRadiusM);
    const swim = legFor(swimMetres, TUNE.swimSpeedMultiplier, TUNE.swimEnergyDrainPerGameHour);
    return { affordable: state.energy - (boat.energyCost + swim.energyCost) > TUNE.swimLabouringEnergy };
}

export function canCross(state: GameState, destId: DestinationId): boolean {
    return crossingBlocker(state, destId) === null;
}

/**
 * ONE SENTENCE NAMING BOTH LEGS AND THE RESERVE (Law 26, [[D-042]] — the world tells you
 * first). Derived from `crossingPlan`, so the sentence and the act read the same arithmetic.
 */
export function crossingNote(state: GameState, destId: DestinationId): string {
    const p = crossingPlan(state, destId);
    if (p.blocker) return p.blocker;
    const to = p.direction === 'out' ? `out to ${p.destination.label}` : 'home';
    return `About ${Math.round(p.boat.metres)} metres of water under the paddle ${to},`
        + ` then ${Math.round(p.swim.metres)} to swim from where she stands off.`
        + ` It would cost you about ${Math.round(p.totalEnergy)} of your reserve, and leave`
        + ` you around ${Math.round(p.energyOnArrival)}.`;
}

/**
 * TAKE HER ACROSS — and this is ATOMIC on purpose, which is the whole [[D-011]] answer.
 *
 * One act moves the boat, moves the survivor with her, and charges the arms. There is no
 * half-crossed state to protect over an absence because there is no half-crossed state at
 * all: when this returns, the survivor is in the water beside a moored boat, and both of
 * those are situations the game protected before this file existed.
 *
 * THE SURVIVOR GOES OVER THE SIDE AT THE STAND-OFF, in the water rather than on a deck.
 * That is what makes the last stretch a swim rather than a second ride, and it is why the
 * plan prices both legs as one decision.
 */
export function runCrossing(state: GameState, destId: DestinationId): CrossingPlan | null {
    if (!canCross(state, destId)) return null;
    const plan = crossingPlan(state, destId);
    const goingOut = plan.direction === 'out';
    const to = goingOut ? standOffPoint(plan.destination) : { x: BOAT.x, y: BOAT.y };

    state.energy = Math.max(0, state.energy - plan.boat.energyCost);
    state.boat = { ...state.boat, at: goingOut ? destId : 'shore', ferried: true };
    state.player = { ...state.player, x: to.x, y: to.y };
    return plan;
}

/** Metres of open water still between the survivor and arrival. The swim, as it stands. */
export function metresToArrival(state: GameState, destId: DestinationId): number {
    const dest = DESTINATIONS[destId];
    const gap = Math.hypot(state.player.x - dest.x, state.player.y - dest.y);
    return Math.max(0, gap - dest.arrivalRadiusM);
}

/** Has the survivor actually reached it? The one question the whole route is about. */
export function hasArrivedAt(state: GameState, destId: DestinationId): boolean {
    return metresToArrival(state, destId) <= 0;
}
