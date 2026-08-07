/**
 * THE JUNK & FLAVOUR CATALOGUE (Ch.3) — FIRST REPRESENTATIVES.
 *
 * Six objects with no mechanical function and real presence. Almost everything about them is
 * an absence — no yield, no topic, no rate, no decay — so most of this file asserts that those
 * absences are REAL rather than merely intended. An inert object is easy to write and easy to
 * make accidentally live: one plausible-looking `goods` entry would put wreck-era metal on the
 * spawn beach and quietly undo the crossing.
 *
 * NOT THE FULL CATALOGUE. Six is the representative set this pass ships; the rest is future
 * work, and `expect(JUNK_SITES.length).toBe(6)` below is a statement about THIS pass rather
 * than a ceiling on the idea.
 */
import { describe, expect, it } from 'vitest';
import {
    allSites,
    createInitialState,
    hasRead,
    junkAffordanceOf,
    materialSatisfies,
    namesAFinishedAnswer,
    readTrace,
    readingFor,
    reconcile,
    traceById,
    traceSites,
    traceSuggests,
    traceWithinReach,
    tracesRead,
    type GameState,
} from '../src/brain';
import { allRecipes } from '../src/brain/recipes';
import { ALL_MATERIAL_KINDS } from '../src/brain/materials';
import {
    DIVE_PARTS, DIVE_SITE, FAR_ISLAND, JUNK_SITES, TRACE_SITES, WORLD, WRECK, WRECK_PARTS,
    groundHeight, surfaceHeightAt,
} from '../src/data/world';
import { TUNE } from '../src/data/tune';
import { fullBody } from './_baseline';

const NOW = 1_770_000_000_000;

function fresh(): GameState {
    return fullBody(createInitialState(NOW));
}

/** Stand the survivor at a site, close enough to touch it. */
function at(id: string): GameState {
    const s = fresh();
    const site = traceById(id)!;
    s.player.x = site.x;
    s.player.y = site.y;
    return s;
}

const NOTED = JUNK_SITES.filter((j) => j.note !== null);
const UNNOTED = JUNK_SITES.filter((j) => j.note === null);

// ---------------------------------------------------------------------------
describe('the catalogue — first representatives, deliberately not the whole idea', () => {
    it('ships six authored objects, split roughly half noted and half not', () => {
        expect(JUNK_SITES.length).toBe(6);
        expect(NOTED.length).toBe(3);
        expect(UNNOTED.length).toBe(3);
    });

    it('spreads across the three zones that are actually built, not clustered in one', () => {
        const zoneOf = (x: number, y: number) => {
            if (Math.hypot(x - FAR_ISLAND.x, y - FAR_ISLAND.y) <= FAR_ISLAND.radius) return 'far';
            if (Math.hypot(x - WRECK.x, y - WRECK.y) <= TUNE.wreckArrivalRadiusM) return 'wreck';
            return 'spawn';
        };
        const zones = JUNK_SITES.map((j) => zoneOf(j.x, j.y));
        for (const zone of ['spawn', 'wreck', 'far']) {
            expect(zones.filter((z) => z === zone).length, `${zone} has no junk`).toBeGreaterThan(0);
        }
    });

    it('gives every object a unique id that cannot collide with a far-island trace', () => {
        const ids = allSites().map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(JUNK_SITES.every((j) => j.id.startsWith('jk-'))).toBe(true);
        expect(TRACE_SITES.every((t) => t.id.startsWith('tr-'))).toBe(true);
    });

    it('leaves the far island\'s own three traces exactly as they were', () => {
        //  Junk is a SEPARATE catalogue of the same type. If it ever leaked into `traceSites()`
        //  the far island's own count assertions would start measuring this pass's work.
        expect(traceSites().length).toBe(3);
        expect(allSites().length).toBe(3 + JUNK_SITES.length);
    });

    it('does not sit on top of anything else that can be tapped', () => {
        //  A junk object inside another object's forgiveness radius would make one of them
        //  unreachable, which is the picking collision the storage crate and the shelter
        //  already produced once.
        const others = [
            ...TRACE_SITES.map((t) => ({ id: t.id, x: t.x, y: t.y })),
            ...WRECK_PARTS.map(([dx, dz]: readonly [number, number], i: number) =>
                ({ id: `wr${i + 1}`, x: WRECK.x + dx, y: WRECK.y + dz })),
            ...DIVE_PARTS.map(([dx, dz]: readonly [number, number], i: number) =>
                ({ id: `dv${i + 1}`, x: DIVE_SITE.x + dx, y: DIVE_SITE.y + dz })),
        ];
        for (const j of JUNK_SITES) {
            for (const o of others) {
                const d = Math.hypot(j.x - o.x, j.y - o.y);
                expect(d, `${j.id} sits on ${o.id}`).toBeGreaterThan(TUNE.traceTapRadiusM);
            }
            for (const k of JUNK_SITES) {
                if (k.id === j.id) continue;
                expect(Math.hypot(j.x - k.x, j.y - k.y), `${j.id} sits on ${k.id}`)
                    .toBeGreaterThan(TUNE.traceTapRadiusM);
            }
        }
    });

    it('is placed where its own mesh will actually be visible', () => {
        //  The two at the wreck are over an eight-metre seabed. Drawn at `groundHeight` they
        //  would be on the bottom, out of sight and out of reach — [[D-124]] again, which is
        //  why the builder uses `surfaceHeightAt`.
        for (const j of JUNK_SITES) {
            expect(surfaceHeightAt(j.x, j.y), `${j.id} is below the sea`)
                .toBeGreaterThanOrEqual(WORLD.seaLevel);
        }
        const offshore = JUNK_SITES.filter((j) => groundHeight(j.x, j.y) < WORLD.seaLevel);
        expect(offshore.length, 'no junk is offshore, so the waterline rule is untested')
            .toBeGreaterThan(0);
        for (const j of offshore) {
            expect(surfaceHeightAt(j.x, j.y)).toBe(WORLD.seaLevel);
        }
    });
});

// ---------------------------------------------------------------------------
describe('INERT BY CONSTRUCTION — the brief\'s third item, as a lock rather than a hope', () => {
    it('yields nothing at all. Not a little. Nothing.', () => {
        for (const j of JUNK_SITES) {
            expect(Object.keys(j.goods), `${j.id} hands something over`).toEqual([]);
        }
    });

    it('and reading a noted one adds not one unit to the pack', () => {
        for (const j of NOTED) {
            const s = at(j.id);
            const before = { ...s.inventory };
            const out = readTrace(s, j.id);
            expect(out.ok).toBe(true);
            expect(out.gained).toEqual({});
            expect(s.inventory).toEqual(before);
        }
    });

    it('CANNOT feed a craft signature, because it never hands over a material', () => {
        //  THE COLLISION THE BRIEF ASKS ABOUT, and the honest answer to it.
        //
        //  A rusted iron head is, in fiction, METAL — and `metal` is wreck-era, the material
        //  whose whole point is that a fresh castaway cannot have one without crossing. Junk
        //  that handed one over on the spawn beach would silently undo the Wreck slice's
        //  central claim, and it would do it through a channel nobody was watching.
        //
        //  So the fiction and the mechanics are made to agree rather than the mechanics
        //  quietly refusing what the fiction promised: the rust goes all the way through, and
        //  nothing here yields anything. This walks every recipe slot against every material a
        //  junk object could conceivably produce, which is the empty set — asserted, not assumed.
        const produced = new Set<string>();
        for (const j of JUNK_SITES) for (const k of Object.keys(j.goods)) produced.add(k);
        expect(produced.size).toBe(0);

        //  ...AND THE WALK IS NOT VACUOUS, which is the half that matters. An empty set
        //  trivially satisfies nothing, so "junk feeds no recipe" would pass on a walk that
        //  was broken. The SAME walk is run over the far island's traces, which genuinely do
        //  leave goods — and it finds a real match there. That is the difference between
        //  proving an absence and failing to look.
        const traceGoods = new Set<string>();
        for (const t of TRACE_SITES) for (const k of Object.keys(t.goods)) traceGoods.add(k);
        expect(traceGoods.size, 'the traces yield nothing either — this check proves nothing')
            .toBeGreaterThan(0);
        const satisfies = (k: string) => ALL_MATERIAL_KINDS.includes(k as never)
            && allRecipes().some((r) => r.slots.some((slot) => materialSatisfies(k as never, slot.require)));
        expect([...traceGoods].some(satisfies),
            'the walk found no craft match even among the traces — it is not working').toBe(true);
        //  And run over junk, the same working walk finds nothing, because there is nothing.
        expect([...produced].some(satisfies)).toBe(false);
    });

    it('teaches no recipe — the ladder cannot hear it', () => {
        for (const j of JUNK_SITES) expect(j.topic).toBeNull();
        const s = fresh();
        s.traces = { read: JUNK_SITES.map((j) => j.id) };
        for (const recipe of allRecipes()) {
            expect(traceSuggests(s, recipe.id), `${recipe.id} is suggested by junk`).toBe(false);
        }
    });

    it('has no rate, no decay and no threat — an absence changes nothing about it', () => {
        //  [[D-011]] for this stage, and it is nearly a tautology: there is no junk state for
        //  `reconcile` to touch. Asserted anyway, because "it obviously cannot" is how the
        //  offline-death law would eventually be broken.
        const s = fresh();
        s.traces = { read: [NOTED[0].id] };
        const before = s.health;
        const after = reconcile(s, 3 * 24 * 3600).state;
        expect(after.traces.read).toEqual([NOTED[0].id]);
        expect(after.health).toBeGreaterThanOrEqual(before);
        //  ...and the witness that the span was real.
        expect(after.gameHoursElapsed).toBeGreaterThan(s.gameHoursElapsed);
    });
});

// ---------------------------------------------------------------------------
describe('the NOTED half — the found-content channel, not a second reading system', () => {
    it('reads once, through exactly the mechanism the traces and the Journal use', () => {
        const j = NOTED[0];
        const s = at(j.id);
        expect(hasRead(s, j.id)).toBe(false);
        expect(readingFor(s, j.id)!.note, 'the note is given away before it is read').toBeNull();

        expect(readTrace(s, j.id).ok).toBe(true);
        expect(hasRead(s, j.id)).toBe(true);
        expect(readingFor(s, j.id)!.note).toBe(j.note);
        //  ...and never twice.
        expect(readTrace(s, j.id).ok).toBe(false);
    });

    it('shows up in what has been read, alongside the far island\'s own traces', () => {
        const s = fresh();
        s.traces = { read: [NOTED[0].id, 'tr-camp'] };
        expect(tracesRead(s).map((t) => t.id).sort()).toEqual([NOTED[0].id, 'tr-camp'].sort());
    });

    it('offers no observations — one tap, one voice', () => {
        //  A noted object answers with the words somebody left. Giving it handling notes too
        //  would be two answers to one gesture.
        for (const j of NOTED) {
            expect(readingFor(fresh(), j.id)!.observed, `${j.id} speaks twice`).toBeNull();
            expect(readingFor(fresh(), j.id)!.hasNote).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
describe('the UNNOTED half — inspected, never consumed', () => {
    it('refuses to be read at all, and records nothing by trying', () => {
        for (const j of UNNOTED) {
            const s = at(j.id);
            expect(readTrace(s, j.id).ok, `${j.id} was consumed`).toBe(false);
            expect(s.traces.read, `${j.id} left a mark`).toEqual([]);
        }
    });

    it('is never "already read" — there is no state for it to be in', () => {
        for (const j of UNNOTED) {
            const s = at(j.id);
            s.traces = { read: [j.id] };   // even if something wrote one
            const reading = readingFor(s, j.id)!;
            expect(reading.alreadyRead, `${j.id} claims to be spent`).toBe(false);
            expect(reading.hasNote).toBe(false);
        }
    });

    it('answers the hundredth look exactly as it answered the first', () => {
        const j = UNNOTED[0];
        const s = at(j.id);
        const first = readingFor(s, j.id)!;
        for (let i = 0; i < 100; i++) readTrace(s, j.id);
        const last = readingFor(s, j.id)!;
        expect(last.sight).toBe(first.sight);
        expect(last.observed).toEqual(first.observed);
    });

    it('is NEVER SILENT — every one has something a survivor could actually observe', () => {
        //  The world-truth law, as a check. An object that looks interactable and answers with
        //  nothing is the exact defect this rule exists to forbid, and it is the easiest one to
        //  ship by accident: authoring a mesh is one edit, authoring what it tells you is another.
        for (const j of UNNOTED) {
            const observed = junkAffordanceOf(j.id);
            expect(observed, `${j.id} is a silent prop`).not.toBeNull();
            expect(observed!.properties.length, `${j.id} has nothing to observe`).toBeGreaterThan(1);
            expect(observed!.questions.length, `${j.id} raises no question`).toBeGreaterThan(0);
        }
    });

    it('and everything in the catalogue answers a tap ONE way or the other', () => {
        //  Noted or unnoted, no object may be reachable and mute.
        for (const j of JUNK_SITES) {
            const reading = readingFor(fresh(), j.id)!;
            expect(reading.sight.length, `${j.id} has no sight line`).toBeGreaterThan(10);
            expect(reading.hasNote || reading.observed !== null, `${j.id} answers with nothing`).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
describe('the prose — observation, never instruction', () => {
    it('never names a finished answer, across every string this catalogue ships', () => {
        //  The affordance layer's own law, applied to the newer half of the writing. It is a
        //  rule about TEXT, and text is exactly the thing that erodes one helpful edit at a time.
        for (const j of JUNK_SITES) {
            expect(namesAFinishedAnswer(j.sight), `${j.id}'s sight line instructs`).toBe(false);
            if (j.note !== null) {
                expect(namesAFinishedAnswer(j.note), `${j.id}'s note instructs`).toBe(false);
            }
            const observed = junkAffordanceOf(j.id);
            for (const line of [...(observed?.properties ?? []), ...(observed?.questions ?? [])]) {
                expect(namesAFinishedAnswer(line), `${j.id}: "${line}" instructs`).toBe(false);
            }
        }
    });

    it('and the guard would catch it if one did', () => {
        //  D-066 (a): a law that cannot fail is not a law. This is the sentence the rule exists
        //  to stop, run through the same function.
        expect(namesAFinishedAnswer('The edge is ground straight — you could make a knife from it.')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
describe('reach — the same arm\'s length everything else uses', () => {
    it('is found by the shared proximity rule, over BOTH catalogues', () => {
        for (const j of JUNK_SITES) {
            expect(traceWithinReach(at(j.id))?.id, `${j.id} is out of its own reach`).toBe(j.id);
        }
        //  ...and the far island's traces still are, which is what proves the union rather than
        //  a replacement.
        const s = fresh();
        const camp = traceById('tr-camp')!;
        s.player.x = camp.x;
        s.player.y = camp.y;
        expect(traceWithinReach(s)?.id).toBe('tr-camp');
    });

    it('is not in reach from anywhere else on the island', () => {
        const s = fresh();
        s.player.x = 0;
        s.player.y = 0;
        expect(traceWithinReach(s)).toBeNull();
    });
});
