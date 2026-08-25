# THE FIRST NIGHT — Crafting, Wreckfall and Island Industry

> **GOVERNED BY LAWS 239, 240 AND 241.** This chapter was quarantined by its own author
> pending ratification, and that quarantine was lifted by three laws filed with it under
> [[D-192]]. They are reproduced verbatim in **Ratified amendments** at the end of this
> document and they govern everything above them. Do not read, quote or implement any part
> of this chapter without them.


## Design chapter v2.9

Status: design proposal for Director review. This chapter extends the v2.8 capability graph without silently changing its 222 governed nodes. The companion catalogue contains 422 unique proposed names: 88 natural tools and weapon components, 226 salvage objects, 66 material routes, 36 disassembly actions, 15 recurring beach events, 51 electricity/steam components, and 17 research sources.

## The decision

Do not enrich the game by adding hundreds of recipes to a menu. Enrich it by giving matter a longer life and the player more verbs.

The island should become a circular material civilization:

> Natural matter gives the survivor first capability. Wreckfall introduces manufactured forms and mechanisms. Knowledge determines whether an object is reused intact, repaired, dismantled, reshaped, recycled, quarantined, or discarded.

Wood, stone, and fiber are not the “low-tier materials” that disappear when metal arrives. They remain the player’s handles, jigs, scaffolds, insulation, filters, packing, patterns, molds, fuel, workholding, and emergency repair materials. Salvage does not replace the natural economy; it interlocks with it.

The companion workbook is the complete name-level review surface. Its `Expansion Index v0.2` sheet is deliberately flat and filterable so the Director can mark every proposed name as Keep, Rename, Split variants, Merge, Remove, or Research.

## Why the current three materials can support a real toolkit

The earliest documented stone toolkit was already a system, not a single “stone tool”: hammerstones produced cores and sharp flakes, and those forms supported pounding, cutting, and scraping. Later points, awls, and scrapers added hafting, hide perforation, and specialized work on wood and animal material. [Smithsonian Human Origins](https://humanorigins.si.edu/evidence/behavior/stone-tools/early-stone-age-tools) and residue/use-wear evidence from Schöningen support distinct uses on wood, hide, and meat. [Journal of Human Evolution / PubMed](https://pubmed.ncbi.nlm.nih.gov/26387038/)

Wood is equally unsuitable as one generic unit. Grain direction, knots, splits, moisture, and defects change its strength; joints must account for loading direction and moisture movement. A dry straight-grained pole is possible handle stock. A knotted waterlogged branch is fuel, charcoal feed, or a low-load brace. They should not be equivalent. [USDA Forest Products Laboratory](https://research.fs.usda.gov/treesearch/62200)

Fiber is a family of processes: strip, ret, beat, comb, spin, ply, braid, weave, knot, splice, stitch, and proof. Coconut husk alone can lead to brushes, brooms, ropes, yarn, nets, bags, mats, and padding. [FAO, Coconut — Tree of Life](https://www.fao.org/4/y3612e/y3612e03.htm)

The game consequence is simple: each tool must add an action, improve control of an action, or preserve value during an action. If it only changes a timer, it is inventory decoration.

## Natural tool progression

The full natural roster contains 88 named objects and components. The following sequence should be implemented first because it creates a dense web of consequences with a small number of assets.

| Tool | Made from | Player verbs | What it opens |
|---|---|---|---|
| Hammerstone | Stone | Strike, crush, bruise, drive | Flakes, crushed food, prepared fiber, wedges |
| Stone core | Stone | Yield controlled flakes, coarse chop | Replaceable edges and points |
| Sharp stone flake | Stone | Slice, trim, skin, cut cord | Food processing, cordage, first joinery |
| Backed stone hand cutter | Stone + fiber grip | Cut with safer grip, whittle, seam-cut | Pegs, handles, traps, sewing |
| Side scraper | Stone | Scrape bark, wood, hide, residue | Clean handles, bark fiber, hide route |
| Stone awl | Stone + fiber grip | Perforate | Leather, bark cloth, packs, footwear |
| Stone wedge | Stone | Split and lift | Boards, shakes, mortise roughing |
| Wooden wedge set | Wood | Continue splits, level, clamp | Planks, workholding, construction |
| Carving baton | Wood | Drive cutters safely, tap joints | Controlled toolmaking |
| Wooden mallet | Wood + fiber | Drive pegs and wedges, seat joints | Frames, benches, non-marring assembly |
| Measuring cord | Fiber + wood markers | Transfer length, radius and straight lines | Repeatable parts and layouts |
| Plumb line | Fiber + stone | Check vertical, depth and shallow soundings | Straight structures, wells, anchors |
| Work mat | Woven fiber | Sort, isolate and catch parts | Cleaner toolmaking, sewing and salvage |
| Wedge clamp | Wood + fiber | Hold stock | Straight cuts, drilling, glued or lashed repairs |
| Bow drill | Wood + fiber + stone bearing | Make ember, bore repeated holes | Reliable fire and improved joinery |
| Hafted stone axe | Wood + stone + fiber | Fell, limb, split and rough-hew | Timber economy, shelter, boats and fuel |
| Hafted stone adze | Wood + stone + fiber | Hew faces and hollow wood | Bowls, troughs, boards, better work surfaces |
| Stone pick and mattock | Wood + stone + fiber | Break soil and roots, quarry clay | Drainage, agriculture and mineral access |
| Drop spindle | Wood + stone whorl | Spin consistent yarn | Thread, nets, sewing and stronger cord |
| Netting shuttle and gauge | Wood | Mend and produce repeatable mesh | Fishing nets, cargo nets, bags and hammocks |

These tools should not be granted by a character level or by picking up their ingredients. The character learns by the existing canon loop: attempt, observe, explain, control, prove, generalize, teach. A stone flake may be discovered accidentally; a reliable axe requires the survivor to understand stone quality, edge orientation, handle grain, binding geometry, head retention, and a repeated strike test.

### Condition should belong to parts

A composite tool should not have one durability bar. At minimum track:

- edge sharpness or point integrity;
- head condition;
- handle condition;
- binding condition;
- calibration or alignment where relevant.

This gives breakage meaningful outputs. A broken axe handle leaves a usable head and shorter handle stock. A ruined stone edge may become a scraper or abrasive. Loose binding can be retightened before catastrophic head loss. This is close to the procedural maintenance direction described by the official Project Zomboid development team, where head, handle, and sharpness fail and repair differently. [Project Zomboid](https://projectzomboid.com/blog/news/2023/12/zleigh-ride/)

## The coconut is the model for the whole game

The coconut example should become a universal content rule.

### Coconut life history

1. Whole coconut: seed, float marker, food and drink source after inspection.
2. Coconut flesh: fresh food, pressed milk, dried ration, bait, eventual compost.
3. Coconut water: immediate liquid and cooking ingredient; not automatically sterile long-term stored water.
4. Husk: scrubber, mulch or fuel when dry.
5. Ret and beaten husk: coir fiber and coir pith.
6. Coir fiber: yarn, cord, rope, brush, mat, net, bag, mattress fill and erosion mesh.
7. Coir pith: salt-washed growing medium, mulch or compost ingredient.
8. Shell half: cup, measure, scoop and rain collector.
9. Shell plus handle: ladle and small bailer.
10. Clean shell plus a controlled hot-stone method: small-volume water heating.
11. Shell plus wick and suitable oil: lamp.
12. Two matched shells plus hinge and stopper: small canteen or tinder case.
13. Drilled shell fragments: buttons, toggles, spacers and decorative inlay.
14. Final damaged shell: charcoal feedstock or aggregate.

Organic-vessel experiments show that water can be heated directly or with hot stones, but container material and method matter; not every vessel reaches boiling, and hot stones introduce thermal-management and contamination problems. The coconut shell should therefore be a small, inspect-before-use vessel rather than a magical permanent saucepan. [Little et al., 2023](https://doi.org/10.1007/s12520-023-01843-z)

Every other object should receive the same biography:

> intact use → maintained use → damaged secondary use → parts recovery → material recovery → waste or ecological return.

Examples:

- Sound stainless pot → cookware → wash basin → technical bath → sheet and handles.
- Sound sail → repaired sail → rain catch → tarp → bags and patches → straps → rags.
- Sound battery → tested storage → low-demand stationary storage → isolated hazardous recycle route.
- Sound hull plank → boat repair → shelter panel → bench stock → pegs and wedges → charcoal or fuel if coatings permit.
- Sound rope → rigging → hauling line → lashings → short cord → oakum or controlled disposal.

## Wreckfall: make the beach a living delivery system

Marine debris is not one material class. NOAA includes plastic, metal, rubber, paper, textile, derelict fishing gear and vessels, while ocean-based debris plausibly includes nets, lines, pots, traps, buoys, floats, bottles, equipment and spilled container cargo. Winds, waves, currents, eddies and shore geometry move and concentrate it. [NOAA Marine Debris Program](https://marinedebris.noaa.gov/discover-issue) [NOAA ocean-based debris](https://marinedebris.noaa.gov/discover-issue/ocean-based-marine-debris)

The beach should therefore run on 15 stateful event types, not a generic respawn timer:

1. Strandline trickle after ordinary tides.
2. Falling-tide reveal of partly buried small objects.
3. Spring-tide reach that deposits large items above the normal line.
4. Post-storm pulse with a dangerous, high-volume cohort.
5. Wreck-breakup clock that sheds named parts from a finite parent wreck.
6. Seasonal current switch that changes object origins and productive beaches.
7. Ghost-net emergency with trapped wildlife and urgent material decay.
8. Cargo-spill family whose objects share labels, color and damage history.
9. Instrument drift such as a weather buoy or beacon.
10. Derelict vessel grounding as a structural salvage site.
11. Aircraft debris-field weathering and gradual accessibility changes.
12. Biological strand of seaweed, fish, shell, bone or carcass.
13. Human-trace packet such as a message bottle, photo or crafted object.
14. Player-made recovery boom that intercepts small drift but needs tending.
15. Beach-cleanup consequence that changes animal health, pollution and later yields.

### Rules that prevent “loot rain”

- Every major wreck has finite mass. A hatch, mast, seat or engine part that reaches shore must come from a recorded parent assembly or cargo cohort.
- Parts preserve lineage: paint, serial fragments, fastener family, corrosion, compartment residue and break pattern.
- Objects move, bury, expose, foul and degrade. They do not vanish because a respawn timer expired.
- Storms change both quantity and danger.
- Cleanup is valuable. Ignored net and line can entangle wildlife and reduce fishing quality; NOAA notes that derelict gear may continue ghost fishing. [NOAA derelict fishing gear](https://marinedebris.noaa.gov/discover-issue/derelict-fishing-gear)
- Valuable finds have handling cost: weight, awkward shape, sharp edges, contamination, transport, drying, inspection and storage.
- Repeated arrivals should be consumables and repair stock more often than unique capability keys.

### Spatial placement

Use visible environmental logic:

- light foam, cloth and small plastic at the newest wrack line;
- heavy timber, tanks and wreck panels in storm fans and snag points;
- bottles, fasteners and shell fragments in gravel pockets;
- nets and lines around reefs, rocks and mangrove roots;
- related wreck parts down-current from the parent hull;
- oil, dead vegetation and odor near leaking machinery;
- birds and animal distress near edible strandings or ghost gear.

This lets the player read the beach rather than sweep it for glowing pickups.

## Salvage should arrive as objects and assemblies

The catalogue names 226 possible salvage objects. Their source families include natural drift, fishing gear, boat structure and rigging, machinery, plumbing, electrical systems, galley and personal effects, emergency equipment, and aircraft structure and systems.

The important unit is not “metal.” It is a recognizable form with a history:

- screw assortment;
- bolt, nut and washer set;
- hinge and latch;
- aluminum hull plate;
- copper tube;
- rubber gasket;
- rigging block and sheave;
- bearing, bushing, shaft and coupling;
- chain, sprocket, belt and pulley;
- hand pump, check valve and hose;
- alternator, starter motor and DC motor;
- wire harness, switch, fuse and connector;
- sailcloth panel, canvas cover and webbing strap;
- seat frame, restraint buckle and foam;
- stainless pot, kettle, bucket and food-grade barrel;
- pressure gauge, sight glass and relief valve;
- aircraft skin, ribs, stringers and fittings.

These forms matter because intact reuse is usually more valuable than recycling. A bearing is not “steel”; it is precision already purchased by another civilization.

## Found-tool roster

The player should encounter tools as prized capability finds, usually incomplete, corroded or missing a companion part. The following list is the recommended found-tool pool.

### Opening and fastening

- Slotted screwdriver.
- Phillips screwdriver.
- Pozidriv or JIS driver.
- Torx driver and tamper-resistant bits.
- Hex key set in metric or inch sizes.
- Shackle key.
- Adjustable wrench.
- Open-end and box wrench set.
- Socket and ratchet set.
- Nut driver set.
- Pipe wrench.
- Locking pliers.
- Needle-nose pliers.
- End-cutting pincers.
- Staple puller.
- Claw hammer.
- Small pry bar.

### Cutting, shaping and drilling

- Hacksaw frame.
- Fine, coarse and bi-metal hacksaw blades.
- Tin snips.
- Side cutters.
- Cable cutters.
- Utility knife and replaceable blades.
- File set: flat, half-round, round and triangular.
- Cold chisel.
- Center punch.
- Pin and rivet punches.
- Hand drill or brace.
- Twist drill-bit set.
- Countersink.
- Hand riveter.
- Rivet set and bucking bar.
- Tap and die set as an advanced find.
- Tubing cutter.
- Flaring tool.
- Bearing puller.

### Cloth, leather and rigging

- Heavy scissors or shears.
- Seam ripper.
- Sailmaker needle set.
- Sailmaker palm.
- Stitching awl.
- Fid.
- Marlinspike.
- Netting needle.
- Leather punch.

### Measurement and electrical diagnosis

- Steel rule.
- Carpenter square.
- Caliper.
- Feeler gauge.
- Thread-pitch gauge.
- Pressure gauge reference.
- Test lamp.
- Multimeter.
- Wire stripper.
- Crimping tool.
- Terminal-release picks.
- Soldering iron or charcoal-heated copper soldering bit.

### Workholding

- Bench vise.
- C-clamp or G-clamp.
- Spring clamp.
- Hand screw clamp.
- Drill guide or angle jig.

Do not make the screwdriver a universal salvage key. Head families, sizes and damage matter. FAA material on aircraft fasteners emphasizes that fasteners differ in material, strength, size, loading and locking, and that proper tightening, locking and inspection are distinct concerns. [FAA fastener lesson](https://www.faa.gov/lessons_learned/small_airplane/accidents/n310ca)

## Disassembly is a grammar

The catalogue defines 36 joint and closure families. A joint should expose four meaningful choices:

1. Identify: what holds this together, is it loaded, energized, pressurized or contaminated?
2. Prepare: support weight, release tension, clean a recess, apply penetrant, label wires, drain fluid.
3. Separate: use the matched driver, counterhold a nut, pull a cotter pin, drill a rivet head, unpick a seam.
4. Inspect and sort: intact working part, repairable donor, recyclable material, hazardous item, garbage.

Example — a corroded aluminum hatch:

- Correct screwdriver, penetrant and patience: hatch, hinge, latch, gasket, screws and washers.
- Wrong cross-head driver: stripped screws, delayed access and damaged paint.
- Drill the heads carefully: hatch and hardware bodies, but screws are lost and holes may enlarge.
- Pry immediately: bent hatch, torn hinge, sharp sheet and scrap-only fasteners.

The player always has a fallback, but the fallback changes yield, noise, time, injury risk and later repair quality.

### Condition vector for salvage

Use multiple qualities rather than one percentage:

- completeness;
- cleanliness or contamination;
- corrosion;
- dimensional damage;
- fatigue or crash loading;
- seal condition;
- electrical insulation;
- calibration confidence;
- known or unknown prior service.

This is especially important for rope, pressure components, batteries, gauges and aircraft parts. Shipbreaking guidance highlights fuel, hydraulic and lubricant residues, lead/cadmium/PCB coatings, asbestos, foam, wiring, sewage and pressure/fire systems; wreck inventory must precede yield calculation. [OSHA Shipbreaking eTool](https://www.osha.gov/etools/shipyard/shipbreaking)

## Material branches to add

### Plant and earth

- Bark fiber, bark cloth and paper pulp.
- Tannin-rich bark for the leather route.
- Resin and pitch adhesive.
- Plant latex or sap experiments.
- Reeds, bamboo and cane.
- Sea grass and kelp.
- Charcoal and wood ash.
- Clay, fired ceramic and grog.
- Sand, gravel, salt and shell lime.
- Coir fiber and coir pith.

### Animal

- Fresh hide.
- Rawhide.
- Tanned leather.
- Fur-on hide.
- Sinew.
- Bone.
- Antler and horn.
- Teeth and claws.
- Fat and tallow.
- Gut, intestine, stomach and bladder membranes.
- Feathers.
- Hair and wool.
- Fish oil, fish skin and scales.
- Crab or lobster shell.

These materials should be perishable before preservation. A hide is not leather at pickup. It must be skinned, fleshed, preserved, processed and tested. FAO notes both the value of hides and the loss caused by poor processing, which supports making knowledge and timing the real gate rather than the animal drop itself. [FAO — Higher value addition through hides and skins](https://www.fao.org/4/i0523e/i0523e00.htm)

### Manufactured

- Cloth, canvas, sailcloth and webbing.
- Leather goods and rubber sheet.
- Polymer rope, monofilament and net.
- Closed-cell foam and insulation.
- Acrylic and glass panels.
- Steel, stainless, aluminum, copper and brass in sheet, tube, wire, bar and casting forms.
- Screws, bolts, nuts, washers, rivets, cotter pins, springs, brackets and hinges.
- Bearings, bushings, gears, chains, sprockets, belts, pulleys, shafts and couplings.
- Valves, pumps, tanks, hoses, filters, gauges and seals.
- Motors, generators, batteries, switches, fuses, breakers, wire, connectors and circuit boards.

## Weapons belong in the same material ecology

Weapons should be visible and governed, but they should not become a detached combat crafting tree.

### Dedicated or governed hunting systems

- Four-prong fishing spear.
- Stone-tipped spear.
- Toggle harpoon and recovery line.
- Spear thrower and matched darts.
- Self bow.
- Bowstring.
- Arrow shaft.
- Stone arrowhead.
- Palm-leaf arrow vane.
- Fiber sling and selected sling stones.
- Snare trigger set.
- Fish trap and crab pot as passive capture systems.

### Dual-use tools

Hammerstone, axe, adze, gaff, pole hook, knife and digging tools can cause harm, but they should keep their tool identity. Their combat behavior comes from mass, reach, edge, grip and condition; crafting them should not automatically teach fighting technique.

For every ranged system, condition belongs to the system: bow limb, string, shaft straightness, point, binding and vane. A good point on a warped shaft is still poor ammunition. A strong bow with a wet, abraded string is a dangerous object.

## Electricity should precede steam

The player can generate useful electricity long before constructing a steam engine.

### Gate 1 — understand and protect

Readable diagrams, insulated tools, a test lamp, multimeter, fuse holder, main disconnect and labeled low-voltage DC bus.

### Gate 2 — store and use

A qualified battery, LED lights, radio charging and a small pump. Battery chemistry, protection and ventilation matter; a wet unknown pack is a hazard, not free energy.

### Gate 3 — make rotary electricity

Hand-crank generator, then treadle generator. Add waterwheel or wind rotor only when site conditions, bearings, transmission, guarding, braking and regulation are understood.

### Gate 4 — regulate

Generator head, rectifier, voltage regulator, charge controller, dump load, fuses and disconnects. The generator is not complete when it produces voltage; it is complete when it can survive speed and load changes without destroying storage or loads.

This sequence gives electricity early utility while preserving steam as an industrial achievement.

## The steam-electric plant

The existing endpoint should remain, but it must be decomposed into proved subsystems. The catalogue names 27 steam-plant components after the first 24 pre-steam electrical components.

### Heat and water side

- Boiler water reservoir.
- Feedwater treatment set.
- Feedwater pump and qualified check valves.
- Rated boiler shell.
- Firebox and grate.
- Chimney and damper.
- Water-level gauge.
- Boiler pressure gauge.
- Safety relief valve.
- Low-water protection.
- Main steam stop valve.
- Rated steam pipe and fittings.
- Steam separator and drain.
- Boiler blowdown valve.

### Engine side

- Steam-engine cylinder.
- Piston and rings or packing.
- Piston rod and crosshead.
- Connecting rod and crank.
- Flywheel with full guard.
- Valve gear.
- Mechanical governor.
- Lubricator.
- Exhaust condenser.
- Tachometer.

### Electrical coupling

- Engine-generator coupling.
- Generator head.
- Rectifier and voltage regulation.
- Charge control, storage, fuse, disconnect and distribution bus.

### Proof sequence

1. Inventory and identify every pressure-boundary material.
2. Prove water-side integrity without fire.
3. Calibrate pressure and water-level indications.
4. Prove relief, low-water trip, isolation and safe drainage.
5. Prove the engine on a safer low-energy test medium and slow manual rotation.
6. Run the engine uncoupled at low energy.
7. Prove governor and emergency stop.
8. Prove generator and regulator on another mechanical source.
9. Align and guard the coupling.
10. Commission with stepped load and a written log.

This is deliberately a game-level qualification sequence, not a real pressure-vessel construction guide. Salvaged sheet, fuel tanks, oxygen cylinders and extinguishers must never become automatic boiler recipes. Unknown and crash-loaded pressure vessels are hazards until safely identified and qualified.

## Balance: how to keep 422 proposals from becoming clutter

### One form, many uses

A metal bowl should be a bowl, reflector, mixing basin, wash basin, sand bath and sheet source—not six nearly identical recipe outputs.

### Families with meaningful variants

Split only when the difference changes action or risk:

- slotted, Phillips, Torx and hex drivers;
- wood screw, machine screw and self-tapping screw;
- bolt diameter, pitch, material and strength class;
- natural-fiber, nylon and polypropylene rope;
- canvas, sailcloth, clothing cloth and medical textile;
- rawhide, leather and fur-on hide;
- aluminum sheet, steel sheet, stainless vessel and copper tube;
- lead-acid and lithium batteries;
- ordinary, tempered, laminated and acrylic glazing.

### Knowledge replaces recipe spam

The inventory item can stay broad while the operation carries knowledge. “Screw assortment” is sortable by head, diameter, pitch, length and material at the workbench. The player does not need 200 inventory icons, but the simulation can still require a compatible screw.

### Value ladder

Prefer this order:

1. use intact;
2. clean and maintain;
3. repair;
4. dismantle into intact components;
5. reshape stock;
6. recycle material;
7. quarantine or discard.

Smelting a working hinge should usually be a loss, not the optimal strategy.

## Recommended first vertical slice

Build one dense chain before implementing the whole catalogue.

### Natural chain

Hammerstone → sharp flake → backed cutter → scraper → fiber preparation → cord → mallet → wedge clamp → hafted axe.

### Whole-use chain

Whole coconut → food and water → shell cup/rain collector → ladle or hot-stone boiler → lamp → button or charcoal route; husk → coir fiber and pith.

### Salvage site

One grounded dinghy containing:

- hatch lid;
- slotted and Phillips screws;
- hinge, latch, gasket and washers;
- sailcloth or canvas;
- polypropylene rope and a rigging block;
- aluminum panel and angle brackets;
- hand bilge pump, hose and clamps;
- small wire harness, switch, fuse and navigation lamp;
- contaminated fuel can as a negative find.

Give the player a damaged screwdriver, pliers, adjustable wrench and hacksaw. Every recovery method should produce visibly different intact yield and damage.

### First power chain

Meter → fuse → hand-crank generator → tested battery → DC light → water pump.

Only after those systems work should the first wind or water transmission be added. Steam follows once the workbench, measurement, plumbing, controls, guarding and proof systems exist.

## Acceptance criteria

The expansion is working when:

- The first 20 tools create at least 12 distinct action verbs.
- A composite tool can lose its edge, binding or handle independently.
- One coconut has at least eight useful states before waste.
- The dinghy can yield intact parts, donor parts or scrap depending on technique.
- The player can name why a screw failed instead of seeing “skill too low.”
- Drift appears where tide, current and obstacles make sense.
- Parent wreck mass decreases as parts strand or are removed.
- Ignored net has an ecological consequence.
- Cloth, leather, rope, sheet, wire and machinery each have reuse and terminal routes.
- Electricity provides a useful load before steam.
- The steam engine cannot operate without water level, pressure relief, feedwater, control, guarding, regulation and commissioning evidence.
- The pattern book remains empty until the player has evidence.

That will make the island feel less like a crafting menu and more like a place where intelligence changes the meaning of matter.

---

## Ratified amendments — Laws 239, 240 and 241

*Filed with this chapter under [[D-192]]. These three laws were ratified as the condition of lifting this chapter's quarantine, and they are reproduced here verbatim so that the chapter cannot be read, quoted or implemented without them. Where anything above conflicts with anything below, the law wins.*

### LAW 239 — PROTECTED ABSENCE

No event may cause loss while the player is offline: no decay, breakup, depletion, disappearance, spoilage, theft, flooding, contamination, drain, harm to wildlife, or bait consumed. No timed opportunity expires unattended. Positive arrivals may queue virtually but alter nothing until return. On return, a hazardous event begins its clock only after a VISIBLE WARNING and player proximity or interaction — it never retroactively catches up. The system may not create an emergency merely to punish absence.

**REFINEMENT (load-bearing):** this protects PROPERTY, not OPPORTUNITY. Caches, builds, tools, partial teardowns and stores are safe whenever the player is away from the game. An OPPORTUNITY that closes on the world's clock — [[D-141]]'s appointment, the wreck window, a tide — still closes while the player is present in the world but elsewhere on the island. Being offline is not a choice about the world; being on the far shore is. Read any wider and this law repeals the game's only clock. "Cannot reasonably respond" means OUT OF THE GAME, never merely out of walking range.

### LAW 240 — FINITE PROVENANCE

Every named component exists exactly once in its parent assembly. Recovery or destruction removes it permanently. Breakup transfers finite material and never duplicates it. Background drift carries natural debris, consumables, repair stock and common matter only — it may NEVER clone a wreck-specific or progression-critical part. This reconciles the generous shore with finite wrecks: abundance is background, scarcity is named, and the two never leak into each other.

### LAW 241 — HARM TRAVELS BY CONTACT, NEVER BY PROXIMITY

Contamination, corrosion, fire and fouling propagate only through actual contact, with bounded and physically-grounded consequences. No aura, no inventory-wide penalty, no invisible spread. Metal and glass are generally cleanable; porous materials in direct contact are downgraded to technical grade, never food, medical or clean-craft grade.

### Sequencing confirmation

The author's six-step macro-order matches the standing session order: Sessions 1–3 ARE its steps 2, 3 and 4. The anti-shortcut clause is adopted — a lucky, unusually complete salvaged boat still goes through the full workbench-supported inspect/repair/prove route. Good fortune shortens the work; it never skips the proof.

### What this chapter's 422 names are, and are not

Names in the companion catalogue enter the game **reactively**, under the standing rule: a name is minted when play reaches for it, never in advance of the need. Filing this chapter mints nothing. What exists after this filing is an **index** — family, section, count and threshold-ladder position — which is navigation, not evaluation, and explicitly not a pre-filtered shortlist. See [[D-192]] for the index as filed and for the one counting discrepancy found in the source.
