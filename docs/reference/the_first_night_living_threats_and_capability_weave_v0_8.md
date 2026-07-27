# THE FIRST NIGHT — The Island Pressure & Human Capability Weave

**Living Threat, Food Ecology and Signature Progression Specification v0.8 —  
26 July 2026**

**Project:** THE FIRST NIGHT  
**Internal codename:** DRIFT  
**Engine and target:** Godot 4.x; first-person 3D; web and Android  
**Status:** Authoritative supplement to *One Life on the Living Island v0.7*

This specification extends v0.7. It does not replace its material, body,
permanent-death, social, maritime, ending, or implementation constitutions.
Where this document is more specific about environmental escalation, food
production, human capacities, skill branching, or cross-domain combinations,
v0.8 governs.

---

## 1. Executive ruling

THE FIRST NIGHT should not become harder by giving animals more health,
draining bars faster, or dropping arbitrary disasters on successful players.
Its difficulty should emerge from **interacting pressures in a persistent
place**:

> **The island combines pressures; the human combines capabilities.**

The island side is the **Pressure Weave**:

> Weather + terrain + ecology + infrastructure + human decisions + anomaly
> state → a particular crisis or opportunity.

The character side is the **Capability Weave**:

> Body capacity + practiced technique + principle knowledge + perception +
> tools/materials + present condition → a particular way of solving it.

This is the game's signature progression system. There is no universal player
level, no pool of skill points, and no magical perk purchase. A capability
appears when a particular human has developed and demonstrated the necessary
combination.

Examples:

- **Strength without Stamina** moves one heavy object briefly but cannot sustain
  a long carry.
- **Strength + Stamina** enables controlled hauling, paddling, casualty carries,
  and long felling work.
- **Strength without reasoning or rigging knowledge** can pull harder.
- **Strength + reasoning + rigging** can redirect force through anchors,
  pulleys, braces, and mechanical advantage.
- **Reasoning without hand technique** can understand a radio diagram but may
  damage a connector while repairing it.
- **Reasoning + Dexterity + electrical knowledge** enables reliable diagnosis
  and fine repair.
- **Gardening knowledge without observation** remembers procedures.
- **Gardening knowledge + Perception + varied practice** recognizes salt burn,
  overwatering, pests, nutrient stress, and viable seed before a crop is lost.

Difficulty and progression therefore use the same grammar: **combinations
matter more than totals**.

---

## 2. Constitutional additions

### Law 12 — No disaster exists alone

An event becomes dangerous through prior conditions. Heavy rain is not a
generic damage field. It fills catchments, cools bodies, wets fuel, saturates
slopes, floods caves, overloads roofs, spreads contamination, damages exposed
electronics, and changes crop disease pressure.

### Law 13 — Every major threat has a life cycle

Except for a few physically sudden events, threats progress through:

> **Precursors → watch → commitment → impact → aftermath → changed world**

The player may notice precursors directly, learn them from another survivor,
read them in recovered knowledge, or build instruments that extend warning
time.

### Law 14 — Preparedness may defeat a threat

The game does not scale every event upward to penetrate the player's newest
defence. If the player has correctly sited, built, maintained, supplied, and
staffed a cyclone shelter, surviving a cyclone with little injury is a deserved
victory.

### Law 15 — Capability is demonstrated, not purchased

A node in the capability interface is evidence that the character can
currently recognize or perform something. It cannot be bought with abstract XP.

### Law 16 — Capacity is not immunity

Strength, Stamina, Dexterity, Perception, reasoning, Composure, and mastery
extend safe options. They do not negate current, temperature, infection,
structural loads, poison, sleep, weather, or material limits.

### Law 17 — Food security is an ecology

Food is not a berry respawn timer or farm tile. It connects wild populations,
seed, soil, fresh water, labor, season, pests, disease, preservation, nutrition,
trade, conflict, storms, and voyage planning.

### Law 18 — Permanent death requires honest warning

Common fatal chains must provide readable information and at least one
reasonable intervention before terminal commitment. Rare sudden threats may
offer little time, but they must arise from a coherent world state rather than
an invisible punishment roll.

---

## 3. The dual weave

The complete challenge loop is:

> **World pressure creates a need → the player reads evidence → available
> capabilities suggest different responses → action changes the body and world
> → success or failure creates new evidence → the island remembers.**

Six world pressures run continuously:

| Pressure | Built from | Player-readable expressions |
|---|---|---|
| Atmosphere and sea | Heat, humidity, cloud, wind, rain, lightning, swell, tide, current and storm track | Sky, sound, surf, instruments, animal behavior and radio |
| Land and water | Slope saturation, erosion, drainage, groundwater, salinity, fire load and cave state | Cracks, leaning trees, muddy flow, water taste, springs and smoke |
| Ecology and food | Population, harvest pressure, pollination, pests, disease, soil condition and crop stage | Tracks, damaged leaves, failed flowers, fewer catches and spoilage |
| Human body | Injury, infection, hydration, nutrition, sleep, thermal state, fatigue and adaptation debt | Motion, sensation, performance, symptoms and companion observation |
| Infrastructure and society | Wear, corrosion, fuel, storage, sanitation, workmanship, ownership, trust and sabotage | Leaks, noise, looseness, records, disputes, missing stock and tamper evidence |
| Triangle anomaly | Field phase, electrical disturbance, time disagreement, displaced matter and observation | Compass conflict, radio echoes, clock disagreement, strange weather and wreckfall |

These values are not shown as six arcade meters. Players experience their
consequences and gradually build better ways to measure them.

The world may generate an event when a valid causal combination exists:

```text
heavy rain
+ saturated steep slope
+ disturbed vegetation
+ occupied runout path
= landslide crisis
```

```text
drought
+ dry litter
+ wind
+ lightning or escaped ember
+ no cleared firebreak
= wildfire
```

```text
storm surge
+ low garden
+ unprotected freshwater lens
+ poor drainage
= salinated soil and crop failure
```

```text
abundant catch
+ warm storage
+ damaged drying rack
+ poor hygiene
= spoilage, pests, and foodborne illness
```

---

## 4. Threat life-cycle and fairness contract

### 4.1 Six event stages

| Stage | World behavior | Player opportunity |
|---|---|---|
| Precursors | Conditions accumulate; subtle evidence appears | Observe, record, compare, ask, inspect |
| Watch | Several indicators align | Change plan, gather supplies, move vulnerable assets |
| Commitment | The event is now likely or unavoidable locally | Shelter, evacuate, isolate, shut down, rescue |
| Impact | Energy, water, fire, organism, or social action reaches the target | Execute prepared procedure; adapt if it fails |
| Aftermath | Secondary hazards remain | Account for people, suppress fire, treat water, inspect structures |
| Changed world | Terrain, ecology, stock, trust, or access has permanently changed | Rebuild, relocate, learn, exploit new opportunity |

### 4.2 Forecast quality

Forecasts should be probabilistic because the survivor never sees the hidden
world state perfectly. Confidence comes from:

- duration and consistency of observation;
- instrument quality and calibration;
- relevant weather, geology, ecology, or mechanical knowledge;
- multiple independent indicators;
- trusted reports from other people;
- comparison with prior events;
- Triangle interference.

A novice sees “dark clouds.” A practiced weather observer notices wind shift,
pressure trend, swell direction, cloud structure, animal retreat, and the
catchment's remaining capacity. An expert still does not know the future with
certainty, but understands the range and the cost of being wrong.

### 4.3 Catastrophe fairness

The threat scheduler must obey all of the following:

1. It may select only events supported by current world conditions.
2. It may not target a player merely because the player is succeeding.
3. A severe event cannot silently spawn inside a safe structure.
4. Ordinary survival resources must remain recoverable somewhere; difficulty
   may relocate or constrain them but must not create an unwinnable basic-needs
   hard lock.
5. A player protected by correct preparation is allowed to win cleanly.
6. Consecutive crises must respect a recovery budget unless the second crisis
   is a disclosed consequence of the first.
7. Offline characters cannot be killed.
8. Server error, input loss, or loading failure cannot commit permanent death.
9. Rare world-changing events require stronger evidence and longer warning than
   ordinary storms.
10. Every permanent death records the actual causal chain.

---

## 5. The island threat ecology

The game needs more than named disasters. It needs hazard families whose
members combine, escalate, and leave useful aftermaths.

### 5.1 Weather and ocean

| Threat | Useful side | Escalation and damage | Primary counterplay |
|---|---|---|---|
| Light rain | Drinking water, cooling, planting window, track visibility | Wet fuel, slick surfaces, reduced visibility | Cover, drainage, dry storage |
| Persistent rain | Full cisterns, crop establishment | Damp bedding, rot, fungal growth, trench overflow | Ventilation, roof upkeep, raised storage |
| Cloudburst/heavy rain | Rapid water capture | Flash flood, contamination, erosion, cave flooding | High routes, spillways, catchment isolation |
| Wind squall | Sailing and drying after passage | Falling branches, loose roofing, fire spread | Tie-downs, pruning, bracing, fire discipline |
| Thunderstorm | Water and nitrogen input | Lightning, fire, electrical surge, violent gust | Grounding, safe refuge, disconnects, fire watch |
| Tropical cyclone | Large drift salvage after passage | Wind, rain, waves, surge, debris, landslide and crop loss | Forecast, shutters, anchors, high refuge, reserves |
| Storm surge | New marine deposits and stranded salvage | Coastal inundation, drowning, salinity, structure loss | Elevation, evacuation, sacrificial waterfront design |
| High surf/swell | Better access for some craft only after it falls | Breakers, reef impact, mooring loads, beach erosion | Observation, setback, protected landing, no-go decision |
| Rip current/current reversal | Route information | Offshore transport, exhaustion and separation | Recognition, flotation, lateral escape, support |
| Waterspout/tornado-scale vortex | Rare salvage displacement | Localized wind and debris damage | Visual warning, solid refuge, abandon exposed work |
| Heatwave | Drying and solar output | Heat illness, water demand, crop stress and fire load | Shade, work timing, hydration, irrigation and rest |
| Drought | Easier access to some caves/shore resources | Water deficit, crop failure, fire, wildlife pressure | Storage, rationing, mulching, diverse sources |
| Unseasonal cool/wet spell | Reduced heat load | Hypothermia, slow drying, crop delay and disease | Dry layers, shelter, fuel, variety |
| Fog/low cloud | Concealment and moisture capture | Navigation loss, collision, missed rescue | Sound signals, route marks, compass cross-check |

### 5.2 Geological and terrain threats

| Threat | Trigger state | Warnings | Changed world |
|---|---|---|---|
| Flash flood | Intense rain above a confined channel | Rising noise, debris, color and water level | Scoured route, moved resources, contaminated pools |
| Landslide/debris flow | Saturated or disturbed slope | Cracks, leaning trees, new seepage, falling stones, rumble | Blocked route, exposed soil/stone, buried structures |
| Rockfall | Weathering, vibration, mining or storm | Fresh fragments, cracking, small falls | Talus, damaged access, possible new seam |
| Sinkhole collapse | Karst void, water change or excavation | Subsidence, cracks, hollow sound, lost drainage | New cave access or permanent loss |
| Cave flood | Rain, tide, surge or blocked drainage | Water marks, pressure sound, rising pools | Moved sediment, trapped salvage, altered air |
| Earthquake | Regional geology or Triangle displacement | Animal response, small foreshocks only sometimes | Structural damage, landslide, tsunami risk |
| Local tsunami | Earthquake, submarine slide, collapse, rare impact | Strong/long shaking, ocean roar, sudden withdrawal/rise | Salinated coast, wreck movement, new debris and mass loss |
| Shore erosion | Repeated wave and storm action | Scarping, exposed roots, changing beach profile | Lost coast, uncovered wreckage, altered landing |
| Soil erosion | Bare ground, runoff and poor cultivation | Rills, muddy outflow, exposed roots | Lower fertility, silted storage and reef damage |
| Salinity intrusion | Surge, overwash or overdrawn fresh water | Brackish taste, leaf burn, poor germination | Lost beds, need for leaching/relocation |

The natural tsunami warning pattern follows real guidance: strong or prolonged
shaking, a loud ocean roar, or unusual rapid withdrawal/rise are reasons to move
inland and uphill immediately. The first wave need not be the largest.

### 5.3 Fire and atmosphere

Fire is not one event type. It is a reaction network.

| Fire source | What makes it dangerous | Counterplay and learning |
|---|---|---|
| Campfire/hearth | Wind, dry fuel, poor clearance, sleep, unstable pot | Siting, ring, clearance, watch, extinguishing water |
| Cooking/grease | Enclosed shelter, wrong response, loose clothing | Lid/smother, layout, practiced shutdown |
| Forge/kiln | Heat load, sparks, fuel, fumes, fatigue | Fire zone, PPE, ventilation, shift limits |
| Fuel/battery | Vapor, leakage, short circuit and water | Isolation, inspection, correct suppression, quarantine |
| Lightning ignition | Drought, litter, wind and delayed discovery | Lookout, firebreak, accessible water, controlled retreat |
| Deliberate arson | Access, motive, concealment and dry conditions | Custody, watch, evidence, redundant refuge |
| Wildfire | Fuel continuity, wind, slope and drought | Early detection, defensible space, escape routes, back-up caches |

Smoke reduces visibility and respiratory capacity before flame arrives.
Wildfire can damage soil, increase later runoff and debris-flow risk, and open
new ecological succession. Suppression saves current assets but is never a
source of free “firefighting XP.”

### 5.4 Biological and food-system threats

- toxic or misidentified plants and fungi;
- venomous or defensive animals;
- sharks and other marine hazards responding to place and behavior;
- insects that bite, transmit disease, or destroy crops and stores;
- rodents and birds consuming seed, fruit, dried food, and cordage;
- parasites from raw or poorly handled fish/meat;
- harmful algal bloom or fish kill;
- mold and mycotoxin-like spoilage risk in warm damp storage;
- crop fungal, bacterial, and viral disease;
- invasive species arriving with displaced wreckage;
- pollinator loss;
- prey depletion after overhunting or habitat damage;
- fish decline after excessive take, silt, pollution, or reef damage;
- carcass and waste attracting scavengers and contaminating water;
- latrine overflow after rain;
- contaminated floodwater entering wounds, wells, or food areas;
- single-crop dependence followed by pest, salt, drought, or storm loss;
- nutritional deficiency despite adequate calories.

These threats turn food production into observation and stewardship rather than
a larger inventory count.

### 5.5 Infrastructure and settlement threats

- roof uplift and progressive joint loosening;
- foundation undermining or settlement;
- hidden timber rot and insect damage;
- corroded fasteners;
- rope, sail, seal, hose, and gasket aging;
- overloaded storage collapse;
- cistern contamination or deliberate poisoning;
- stove, generator, or kiln carbon monoxide accumulation;
- electrical ground fault in rain;
- battery thermal event;
- generator fire, exhaust, or fuel leak;
- pressure vessel, boiler, or compressor failure;
- crane, hoist, anchor, scaffold, or bridge collapse;
- refrigeration loss followed by invisible food risk;
- pump failure during flood or fire;
- sanitation breakdown as population grows;
- maintenance backlog during injury, conflict, or bad weather;
- dependence on one specialist, one part, one route, or one power source.

Infrastructure is power converted into obligation. Large settlements are not
punished for being large; they are challenged by the real coordination and
maintenance surfaces they create.

### 5.6 Social and human threats

- panic, misinformation, and rumor during warnings;
- leader fixation on a failing plan;
- hidden illness or injury;
- exhaustion concealed to retain status;
- resource hoarding during shortage;
- theft of seed, medicine, fuel, or navigation evidence;
- sabotage of anchors, water, alarms, crops, radios, or departure craft;
- negligent teaching or corrupted plans;
- coercive work allocation;
- factional disagreement over evacuation, rescue, or departure;
- outsider arrival carrying injury, knowledge, conflict, or disease;
- rescue attempts that create second casualties;
- violence under permanent death.

Every hostile act must change physical or social state, leave plausible
evidence, and permit prevention, detection, response, or recovery.

### 5.7 Triangle-specific pressure

The Bermuda mystery deserves signature threats more relevant than ordinary
fantasy meteors:

| Anomaly | Pressure created | Capability opportunity |
|---|---|---|
| Compass divergence | Navigation disagreement | Cross-instrument comparison and anomaly mapping |
| Radio echo/false return | Deceptive rescue evidence | Signal analysis, authentication and triangulation |
| Clock disagreement | Spoilage, watch and route uncertainty | Redundant timekeeping and event correlation |
| Local weather inversion | Forecast failure in bounded zone | Sensor grid, probes and safe stand-off |
| Wreckfall | A ship, aircraft, cargo, or debris field appears/displaces | Rescue, salvage, new knowledge and new hazards |
| Dead-current corridor | Normal drift model fails | Floats, dye, timed probes and route mapping |
| Material phase change | Known component behaves differently | Containment, comparison and limited endgame engineering |
| Memory/evidence conflict | Witnesses and instruments disagree | Logs, recordings, independent observation and trust |

### 5.8 Meteor ruling

Meteors may appear visually, but a damaging meteorite or airburst is not an
ordinary recurring difficulty event. Real damaging impacts are too rare and
too indiscriminate for routine survival pacing.

THE FIRST NIGHT may use one **anomaly-mediated bolide/impact program** as an
ultra-rare, world-changing event:

1. unusual sky and radio observations;
2. repeated instrument tracks;
3. visible approach or airburst;
4. pressure wave, fire starts, wave disturbance, or ejecta depending on scale;
5. a changed zone containing scientifically/anomalously valuable material;
6. no guaranteed direct strike on an occupied player;
7. an opt-in endgame investigation and evacuation problem.

The more characteristic event is **wreckfall**: the Triangle deposits a vessel
or aircraft from another time. It creates rescue, fire, fuel, disease,
conflict, materials, knowledge, and new routes while reinforcing the game's
central fiction.

---

## 6. Cascading challenge examples

### 6.1 Heavy rain is six different games

1. An early survivor catches water and avoids dehydration.
2. A poor roof wets bedding, reducing recovery and increasing illness risk.
3. A mature camp's overflowing latrine contaminates a low cistern.
4. A deforested hillside saturates and moves.
5. A wet electrical bench develops a fault during urgent radio work.
6. A prepared settlement fills separated clean storage, shuts down exposed
   circuits, moves livestock/seed, and correctly evacuates the slide path.

No hidden “rain difficulty level” is required. Complexity arises from the
world the players built.

### 6.2 Cyclone campaign

> Long swell and pressure fall → observers compare records → community argues
> over forecast → boats hauled above surge → crops harvested early → shutters
> and roof ties inspected → injured person moved to refuge → cyclone impact →
> fire suppressed during lull → false calm recognized → second wall passes →
> casualties accounted → water isolated and tested → new wreck located →
> salvage/rescue expedition → damaged soil and seed plan → rebuilt settlement.

The storm is preparation, impact, rescue, aftermath, and opportunity—not a
cut-scene.

### 6.3 Drought–fire–food cascade

> Weak wet season → reduced spring flow → irrigation conflict → crops stressed
> → dry litter accumulates → lightning strike → wind-driven fire → smoke stops
> work → pump fuel rationed between fire and water → seed archive threatened →
> firebreak holds or fails → rain later causes erosion on burned slope.

Possible solutions come from cultivation, hydrology, weather, construction,
firecraft, logistics, social trust, medicine, and navigation.

### 6.4 Tsunami chain

> Strong earthquake → immediate self-protection → sea withdrawal/roar →
> high-ground evacuation → accountability at assembly point → repeated waves →
> coast and farms salinated → wrecks displaced → freshwater protected or lost
> → search and rescue → temporary food dependence → soil recovery/relocation →
> new salvage and altered reef routes.

The correct response is movement and judgment, not hitting the wave with a
high-level building.

---

## 7. The complete island food ecology

### 7.1 Four food time horizons

| Horizon | Goal | Main sources |
|---|---|---|
| Immediate | Avoid collapse today | Emergency rations, known fruit, shellfish, simple fish, safe edible plants |
| Repeatable | Establish predictable daily intake | Fishing routes, traps, managed forage, gardens, drying and clean storage |
| Resilient | Survive season, storm, injury and crop loss | Diversity, seed archive, orchard, protected beds, preserved stores and trade |
| Departure | Sustain a tested return route | Dense preserved food, water, micronutrient diversity, ration plan and backups |

### 7.2 Gathering branches

**Terrestrial foraging**

- fallen and tree fruit;
- nuts and seeds;
- edible greens and shoots;
- roots and tubers;
- medicinal/aromatic plants;
- fungi only after reliable identification;
- eggs and small game under population rules;
- insects where culturally and biologically appropriate.

**Shore and water gathering**

- shellfish with tide, contamination, and harvest-zone risk;
- crabs and crustaceans;
- seaweed with species and water-quality identification;
- reef/lagoon fishing;
- open-water line, net, trap, spear, and boat fishing;
- stranded or trapped fish after weather, with spoilage risk.

**Salvage food**

- emergency rations;
- canned/dry cargo;
- seed packets and agricultural stores;
- spices, salt, cultures, yeast, and preservation materials;
- refrigerated cargo whose safety depends on power history;
- animal stock only through a credible arrival event.

Every source has calories, nutritional contribution, hazard, renewal behavior,
labor, season, and ecological pressure.

### 7.3 Food populations

Wild food nodes do not simply respawn. Each local population tracks:

- abundance and age/reproductive structure;
- habitat quality;
- season and weather;
- harvest pressure and method;
- pollution/silt;
- predator and prey change;
- disease;
- migration or recruitment;
- recovery time.

A careful player can take some fruit without damaging the tree, leave breeding
fish, rotate gathering zones, protect nursery habitat, and gain a more reliable
future. Destructive methods produce a short surplus and long scarcity.

### 7.4 Cultivation branches

The cultivation capability web contains:

1. **Recognition:** species, maturity, edible part, toxicity and seed potential.
2. **Seed recovery:** clean removal, labeling, drying and storage.
3. **Viability:** damage, maturity, dormancy, mold, salt and test germination.
4. **Site:** light, wind, slope, drainage, soil depth and access.
5. **Soil building:** organic matter, compost, mulch, aeration and erosion
   control.
6. **Water:** capture, clean irrigation, moisture judgment, drainage and drought
   planning.
7. **Nursery:** controlled germination, seedling protection and transplanting.
8. **Crop care:** spacing, weed competition, support, pruning and protection.
9. **Plant health:** symptom comparison, pest scouting, sanitation and
   integrated control.
10. **Reproduction:** flowering, pollination, selection, grafting and
    propagation.
11. **System design:** rotation, intercropping, orchard/forest garden,
    windbreak, protected beds and seed reserve.
12. **Post-harvest:** curing, cleaning, grading, preservation and storage.

Experience does not secretly add a percentage to sterile seed. It improves the
player's capacity to obtain viable seed, recognize uncertainty, create correct
conditions, intervene early, and preserve the successful line.

### 7.5 Crop diversity

The food model should seek functional diversity, not hundreds of decorative
plants:

| Function | Example crop roles | System value |
|---|---|---|
| Fast greens | Leaves and shoots | Early micronutrients; fragile and perishable |
| Fruit | Tree/vine/bush fruit | Water, sugar, vitamins, seed, seasonality |
| Root/tuber | Starchy underground crop | Dependable calories; soil and cooking needs |
| Grain/seed | Dense dry seed | Storage, flour/feed, labor-intensive processing |
| Legume | Beans/peas appropriate to ecology | Protein and crop-system diversity |
| Oil/fat | Nuts, oily seed, coconut-like source | Energy density and cooking utility |
| Spice/medicinal | Flavor, treatment support and preservation | Morale, trade and specialist knowledge |
| Fiber/utility | Plant material with non-food uses | Cordage, mulch, basketry and fuel |

The game can author a compact set of species that fulfills these roles. It
should not expose individual vitamin meters. The body tracks rolling:

- energy adequacy;
- protein adequacy;
- fat adequacy;
- diet diversity/micronutrient risk;
- food safety;
- digestion and hydration burden.

Deficiency appears through a long causal history, not after missing one meal.

### 7.6 Soil is a living store

Each cultivated site records:

- texture and depth;
- organic matter;
- compaction;
- drainage;
- moisture;
- salinity;
- erosion;
- nutrient balance at a useful grouped level;
- disease/pest load;
- shade, wind, and heat;
- cultivation history.

Compost, mulch, cover, diverse roots, reduced unnecessary disturbance, drainage,
and rotation improve resilience. Flood, salt, erosion, overwork, contamination,
and continuous monoculture degrade it.

### 7.7 Pests and plant disease

The player never selects “pesticide +10.” Control follows:

> **Identify → estimate damage → find source/life stage → remove conditions →
> use physical/biological/cultural control → isolate if needed → compare
> outcome.**

Possible controls:

- hand removal and traps;
- barriers and netting;
- clean storage and field sanitation;
- rotation and fallow;
- resistant or better-adapted seed selection;
- habitat for beneficial organisms;
- pruning and removal of infected material;
- water and spacing correction;
- quarantining newly arrived plants/soil;
- carefully justified chemical use from finite salvage.

Misidentification can destroy beneficial organisms or worsen resistance,
pollination, and food safety.

### 7.8 Preservation ladder

| Method | Required capability | Trade-off |
|---|---|---|
| Immediate cooking | Fire, hygiene and timing | Safe now; short storage |
| Drying | Weather, rack, cutting and pest protection | Light, compact; humidity risk |
| Smoking | Fire control, airflow and food knowledge | Longer life; fuel and process risk |
| Salting/brining | Salt, container and concentration knowledge | Valuable at sea; water/salt burden |
| Fermentation | Clean vessel, culture, salt/temperature judgment | Nutrition/flavor and durability; contamination risk |
| Pickling | Acid, vessel and recipe knowledge | Strong preservation; finite ingredients |
| Cool/root storage | Site, drainage, ventilation and pest control | Low power; limited climate suitability |
| Canning/retort | Suitable container, heat/pressure knowledge and inspection | Long life; severe failure risk if done poorly |
| Refrigeration | Power, refrigerant/mechanical system and monitoring | High quality; dependency and hidden outage risk |
| Freeze or anomaly storage | Rare infrastructure and measurement | Endgame capability; unfamiliar failure modes |

Preservation transforms a successful harvest into time, storm resilience,
trade, rescue capacity, and range from the island.

### 7.9 Food enjoyment and culture

Cooking should create more than calories:

- familiar meals improve comfort and social cohesion;
- different survivors contribute recipes and techniques;
- spices, texture, fresh food, and variety matter;
- communal meals create teaching, negotiation, rumor, and celebration;
- exceptional preserved foods become gifts, trade goods, and voyage stores;
- a named seed line or recipe can outlive the person who developed it.

The system stays enjoyable because routine known meals can be batched at an
equipped kitchen. Identification, first preparation, preservation trials,
shortage decisions, illness diagnosis, and celebratory meals remain active.

---

## 8. The Human Capability Weave

### 8.1 Why it is not a conventional skill tree

A tree implies that one purchased node causes the next. Human survival is a
network: swimming supports rescue; ropework supports climbing, hauling,
construction, sailing, and rescue; plant observation supports foraging,
gardening, medicine, and weather awareness.

The player-facing interface may look like branching roots and constellations,
but runtime capabilities are **junctions** formed from demonstrated evidence.

### 8.2 Seven human capacities

| Capacity | Meaning | Develops through | Current limit changes with |
|---|---|---|---|
| Strength | Safe force production and load control | Progressive lifting, carrying, pulling, striking and recovery | Injury, nutrition, fatigue, illness and leverage |
| Stamina | Sustainable work and recovery between efforts | Appropriately dosed walking, swimming, paddling and labor | Hydration, heat, sleep, illness, load and pacing |
| Dexterity | Precision, timing, bilateral hand control and fine force | Tool use, repair, knots, medical work and corrected practice | Hand injury, cold, fatigue, stress and workspace |
| Mobility | Balance, reach, footing, climbing and body positioning | Varied movement and safe task practice | Pain, load, terrain, footwear and injury |
| Perception | Noticing relevant sensory and environmental evidence | Observation, comparison, tracking, inspection and feedback | Light, noise, attention, fatigue, weather and instruments |
| Reasoning | Relating evidence, principles, cause, uncertainty and plan | Study, explanation, diagnosis, experimentation and reflection | Knowledge, brain state, stress, sleep and bad information |
| Composure | Maintaining attention and coordinated decisions under pressure | Graduated real responsibility, drills, rescue, teamwork and recovery | Fear, grief, pain, trust, fatigue and situation novelty |

“Intelligence” is represented primarily by **reasoning applied to acquired
knowledge**, not a magical IQ stat. A brilliant character with no plant
knowledge cannot identify an unknown fruit by intelligence alone.

### 8.3 Physical adaptation

Physical work produces:

1. immediate cost;
2. technique evidence;
3. an adaptation stimulus;
4. recovery demand;
5. possible injury or chronic burden.

Adaptation is consolidated only when the dose is appropriate and the character
receives enough food, water, sleep, warmth/cooling, and time. Excessive,
repetitive, injured, dehydrated, or heat-stressed work can reduce capacity and
learning.

Strength and Stamina are compatible but not identical. A player can develop
both, but training emphasis, recovery, body mass, injury, and task specificity
create genuine differences. No permanent class choice is required.

### 8.4 Knowledge domains

The eight broad v0.7 interface domains remain, but v0.8 exposes these
cross-linked disciplines beneath them:

1. water and sanitation;
2. fire, cooking and preservation;
3. ecology and foraging;
4. cultivation and soil;
5. medicine and rescue;
6. forestry and timber;
7. tools and fine fabrication;
8. construction and structures;
9. geology, quarrying and materials;
10. rigging, loads and lifting;
11. mechanics, fluids and machines;
12. electricity, power and radio;
13. weather, terrain and forecasting;
14. swimming and water rescue;
15. fishing and marine ecology;
16. seamanship, navigation and naval construction;
17. leadership, teaching and investigation;
18. anomaly observation and containment.

These are not eighteen grind bars. The interface groups them and reveals only
the branches the player has encountered.

### 8.5 Technique evidence

Techniques are narrow and embodied:

- axe alignment;
- controlled hammer strike;
- saw tracking;
- sharpening angle;
- knot dressing;
- anchor placement;
- breath and stroke timing;
- casualty tow;
- sterile handling;
- splint fitting;
- solder heat control;
- gasket seating;
- seed extraction;
- transplant handling;
- pruning cut;
- sail trim;
- weather logging.

A technique becomes reliable through varied successful use, correction, and
retention—not task count.

---

## 9. Signature junction capabilities

The following junctions show why combinations matter. Names are player-facing
capability descriptors, not superhero perks.

| Junction | Required combination | What opens | What is missing without the combination |
|---|---|---|---|
| Controlled Power | Strength + Dexterity + relevant tool technique | Precise axe/hammer work, forging control, stuck-part removal | Strength alone wastes material and increases breakage |
| Load Bearer | Strength + Stamina + load/route practice | Sustained hauling, rescue carry, paddling and heavy team work | Strength alone provides only a short effort |
| Applied Leverage | Strength + reasoning + rigging principles | Wedges, pry plans, pulley systems, braced extraction | Reasoning designs; Strength alone pulls |
| Tension Reader | Strength + Perception + rope/timber familiarity | Feel unsafe load change, tree lean, binding saw and failing anchor | Force is available but poorly directed |
| Expedition Pacing | Stamina + reasoning + body/weather knowledge | Choose load, route, rests, water and turnaround time | Endurance is consumed without a plan |
| Surf Endurance | Stamina + swimming technique + Perception + Composure | Read sets, conserve energy, cross/return through a tested route | Fitness alone cannot read current or find an exit |
| Repetitive Precision | Stamina + Dexterity + workstation practice | Long sawing, weaving, net repair, milling and assembly with stable quality | Fine work deteriorates rapidly under fatigue |
| Sure Footing | Mobility + Perception + terrain practice | Safer cliff, reef, wreck and storm movement | Agility without reading terrain remains reckless |
| Fine Fabrication | Dexterity + reasoning + plan/material knowledge | Radio, instruments, seals, medicine tools and precise joints | Understanding or hands alone cannot guarantee function |
| Living Diagnosis | Perception + reasoning + domain knowledge | Distinguish disease, deficiency, salt, drought, tampering or wear | Observation notices symptoms but not cause |
| Calm Hands | Dexterity + Composure + emergency practice | Wound care, electrical isolation, rescue knots and urgent repair | Technique degrades under crisis |
| Rescue Judgment | Perception + reasoning + Composure + rescue knowledge | Choose reach/throw/row/go, avoid second casualty and manage triage | Courage or strength alone may multiply casualties |
| Weather Sense | Perception + reasoning + long records | Forecast ranges, recognize outliers and decide early | Instruments produce numbers without judgment |
| Systems Planner | Reasoning + cross-domain knowledge + verified projects | Coordinate water, food, power, maintenance and storm redundancy | Intelligence remains theoretical |
| Teacher-Practitioner | Demonstrated mastery + reasoning + Composure + trust | Demonstrate, diagnose learner error, fade support and verify | Expertise alone does not make a safe teacher |
| Forensic Maintainer | Perception + material/mechanical knowledge + records | Separate wear, bad workmanship and sabotage | A defect is visible but attribution is uncertain |
| Adaptive Gardener | Perception + cultivation knowledge + varied crop practice | Select site, diagnose stress, protect line and adapt technique | Memorized instructions fail in changed conditions |
| Seed Steward | Dexterity + Perception + seed knowledge + record discipline | Recover, clean, test, store, label and select seed lines | Seeds are damaged, mixed or falsely trusted |
| Food Safety Keeper | Perception + cooking/preservation + sanitation knowledge | Detect process deviation, isolate unsafe batch and trace cause | Good cooking does not ensure safe storage |
| Shipwright's Eye | Perception + joinery + materials + hydrodynamic principles | Fair hull, load paths, seams, repair access and inspection | Carpenter can build parts but not prove a vessel |
| Navigator's Synthesis | Perception + reasoning + weather/seamanship records | Combine sun, stars, current, drift, charts, radio and uncertainty | One instrument becomes a dangerous authority |
| Anomaly Scientist | Perception + reasoning + instruments + disciplined records + Composure | Compare contradictions, design probes and set abort limits | Curiosity becomes uncontrolled exposure |

### 9.1 Junctions are graded, not binary

A character may possess a partial junction:

- understands it but cannot yet execute;
- executes it in normal conditions but not under fatigue;
- performs it with a mentor or jig;
- performs it independently;
- diagnoses failure;
- adapts it to new material;
- teaches and innovates.

The interface describes the actual boundary:

> “You understand the three-to-one haul, but your anchor placement is
> unverified in wet soil.”

This is more informative than “Rigging 17/20.”

---

## 10. Branching capability paths

### 10.1 Tree to bluewater vessel

```text
Tree observation
→ species/material familiarity
→ safe felling
→ log handling
→ drying/seasoning
→ controlled splitting and sawing
→ beams and planks
→ joinery and fastening
→ braced structures
→ curved/laminated members
→ hull form and load paths
→ caulking and sealing
→ rigging and propulsion
→ water-zone trials
→ repair under load
→ proven departure vessel
```

Key junctions:

- felling: Perception + forestry + axe technique + sufficient Strength;
- timber conversion: Repetitive Precision + sharpening + moisture knowledge;
- joinery: Fine Fabrication + geometry + material familiarity;
- construction: Applied Leverage + load paths + team coordination;
- naval construction: Shipwright's Eye + seamanship + tested seals;
- departure: Navigator's Synthesis + stores + weather proof + body readiness.

A strong character can fell and move timber early. A strong, perceptive
forester wastes less usable trunk and avoids a bad fall. A strong, reasoning
rigger moves whole timbers safely. A dexterous, knowledgeable joiner turns them
into durable components. No one attribute collapses the chain.

### 10.2 Fruit to resilient food system

```text
Safe identification
→ careful eating/recovery
→ seed lot
→ viability evidence
→ nursery
→ suitable bed
→ protected crop
→ harvest
→ preservation
→ seed selection
→ diverse rotation/orchard
→ storm reserve
→ voyage provisions
```

Branches:

- **Forager:** Perception + ecology + route knowledge.
- **Grower:** cultivation knowledge + Stamina + soil/water practice.
- **Seed steward:** Dexterity + Perception + record discipline.
- **Plant diagnostician:** Living Diagnosis + experiments + comparative beds.
- **Preserver:** Food Safety Keeper + fire/chemistry + containers.
- **Food systems planner:** Systems Planner + stores + population needs.

### 10.3 Spark to island fire service

```text
Ignition
→ fuel selection
→ safe hearth
→ cooking and water treatment
→ charcoal
→ kiln/forge
→ spark and fuel-load awareness
→ cleared zones and water points
→ fire watch
→ wildfire behavior records
→ settlement alarm and evacuation
→ post-fire erosion recovery
```

Fire mastery improves capability and creates more severe responsibility.

### 10.4 Rain to weather service

```text
Feel rain/wind
→ protect body and tinder
→ collect water
→ log timing and amount
→ compare tide/cloud/swell
→ improvise gauges
→ recover barometer/radio
→ maintain calibrated station
→ map microclimates
→ issue watch with confidence
→ coordinate storm preparation
→ predict anomaly divergence
```

### 10.5 Swim to return route

```text
Float and release
→ controlled breathing
→ efficient stroke
→ current recognition
→ reef exit
→ assisted rescue
→ towing and line work
→ boat reboarding
→ surf launch/recovery
→ seamanship
→ navigation
→ supported swim or vessel ending
```

Strength helps a tow; Stamina maintains it; Dexterity manages lines; Perception
reads the water; Composure controls breathing; reasoning decides whether to
enter at all.

### 10.6 Wound to community medicine

```text
Recognize danger
→ stop immediate mechanism
→ clean and protect
→ observe change
→ sanitation routine
→ diagnose common complications
→ teach first aid
→ maintain clinic and records
→ triage multiple casualties
→ support storm/industrial rescue
→ sustain departure health
```

Medicine is constrained by actual supplies, physiology, and knowledge. No skill
creates antibiotics or reverses irreversible death.

### 10.7 Salvage to recovered infrastructure

```text
Inspect
→ isolate energy
→ selective dismantling
→ sort and preserve
→ understand component
→ restore hand mechanism
→ repair pump/generator
→ establish protected workshop
→ build maintenance schedule
→ create redundant water/power
→ restore vessel/radio/aircraft subsystem
→ support escape
```

---

## 11. How a capability opens

A new capability requires some or all of six keys:

| Key | Question |
|---|---|
| Need | Has the character encountered a real problem that gives the capability meaning? |
| Evidence | Have they observed, read, been shown, or measured the relevant relationships? |
| Technique | Have they attempted and corrected the necessary embodied actions? |
| Capacity | Can their current body safely perform the required force, duration, control and position? |
| Means | Are suitable tools, materials, workstation, site and assistance available? |
| Proof | Has the result been inspected or tested under a relevant condition? |

There is no “unlock all” button. A manual may satisfy evidence; it does not
satisfy technique or proof. A mentor can shorten error discovery; the learner
still performs. A jig can reduce Dexterity demand; it does not teach the
principle automatically. A pulley reduces Strength demand but adds rigging and
anchor requirements.

### 11.1 Capability discovery

The game should reveal junctions through grounded thought:

> “The beam is too heavy to lift directly. You know a pulley changes direction,
> have used a secure hitch, and noticed the old mast step could take a
> compression post. Sketch a lift?”

The player chooses to:

- attempt a direct high-risk action;
- lighten or dismantle the object;
- recruit help;
- build a sled;
- construct a lever;
- design a hoist;
- postpone until conditions improve.

The skill system expands decisions rather than replacing play with a menu.

### 11.2 Failure and near-success

Failure may provide:

- technique correction;
- material evidence;
- a defect signature;
- a changed plan;
- injury or lost material;
- social consequences.

Learning scales with honest feedback and diagnosis. Deliberately repeating a
known bad action, cancelling before consequence, or injuring oneself produces
negligible useful development.

### 11.3 Creativity

Innovation appears when several mature junctions overlap:

> **Encountered need + two or more relevant disciplines + contradictory or
> incomplete evidence + enabling material + prototype + test = innovation
> opportunity.**

Examples:

- cultivation + weather + plumbing → storm-isolating irrigation cistern;
- forestry + rigging + mechanics → portable timber mill;
- preservation + refrigeration + power → monitored communal cold store;
- swimming + rigging + boatbuilding → self-righting recovery ladder;
- weather + radio + anomaly → authenticated storm-echo predictor;
- medicine + fabrication + salvage → adjustable traction or sterilization rig.

Creativity is bounded by physics and available matter.

---

## 12. Activity consequences and development

Every activity resolves across eight outputs:

1. world/material change;
2. immediate body cost;
3. hazard exposure;
4. technique evidence;
5. knowledge evidence;
6. physical adaptation stimulus;
7. workmanship/result;
8. social/legacy record.

### 12.1 Worked examples

| Activity | Immediate costs | Development when well managed | Poorly managed consequence |
|---|---|---|---|
| Hammer stone | Thirst, energy, grip and Stamina; impact/vibration | Controlled Power, material reading, Strength stimulus | Waste, fragment injury, strain, heat illness |
| Fell tree | Energy, Stamina, focus, tool wear and noise | Axe technique, forestry, Strength, Tension Reader | Barber-chair/split, wrong fall, damaged timber, death |
| Dig garden | Water, energy, back/hand load and time | Soil familiarity, work capacity, cultivation | Compaction, erosion, overwork and poor bed |
| Swim reef route | Heat loss/gain, energy, breath, injury exposure | Stroke, current reading, Stamina and Composure | Exhaustion, cuts, current separation and drowning |
| Forge fitting | Heat, thirst, fuel, Stamina and fine control | Controlled Power, metallurgy, toolcraft | Burn, fire, poor temper, dehydration |
| Diagnose crop | Time and attention | Living Diagnosis, ecology and comparative reasoning | Wrong treatment, delayed harvest, lost seed |
| Teach knot | Time, trust and responsibility | Explanation, learner diagnosis and teacher consolidation | False confidence if learner is not verified |

### 12.2 No direct stat exchange

The engine never resolves “chopping gives +2 Strength and -3 Hunger.” It resolves
mechanisms:

- muscular work consumes available energy and creates heat;
- sweating increases water/electrolyte demand;
- duration and load use Stamina;
- technique changes wasted motion and injury risk;
- food, water, sleep, and health determine recovery;
- a suitable dose creates adaptation stimulus;
- excessive dose creates damage and suppresses learning;
- timber, tool, sound, ecology, and social state all change.

This preserves the v0.7 law: one action, many truthful consequences.

---

## 13. Character diversity without rigid classes

Characters arrive with histories, not classes. Background affects initial:

- body capacities and injuries;
- known vocabulary and principles;
- practiced techniques;
- confidence and blind spots;
- languages and relationships;
- fears, habits, and values.

Examples:

| Arrival | Early advantage | Important limitation | Possible growth |
|---|---|---|---|
| Dock laborer | Strength, Load Bearer evidence, ropes and cargo sense | Limited plant/medical knowledge | Rigger, builder, rescue leader |
| Student engineer | Reasoning, diagrams and mechanical principles | Low work capacity and hand practice | Systems planner, mechanic, radio innovator |
| Gardener | seed, soil, observation and seasonal practice | Limited salvage and open-water competence | Seed steward, food-system leader |
| Nurse/medic | triage, sanitation, Calm Hands and body observation | Finite supplies; not automatically a surgeon | Clinic, teaching and rescue |
| Swimmer/lifeguard | water technique, Stamina, rescue principles | No immunity to current, cold, wounds or distance | Surf pilot, rescue lead, navigator |
| Carpenter | tools, material feel, joinery and plans | Hulls, engines and agriculture remain distinct | Builder, millwright or shipwright |
| General survivor | few high competencies | Adaptable, no entrenched blind spot | Any branch through lived choices |

Every solo character can learn basic survival. Specialists shorten dangerous
learning paths and enable higher quality; they are never mandatory keys that
can permanently hard-lock all endings.

---

## 14. Player-facing progression

### 14.1 The capability map

The UI has three zoom levels:

1. **Needs now:** two or three relevant options for the present problem.
2. **My capability map:** visible branches, junctions, confidence and limiting
   factors.
3. **Knowledge archive:** plans, observations, teachers, experiments and
   unresolved questions.

It does not reveal the entire endgame tree on day one.

### 14.2 Node language

Good:

- “You can recognize three signs of slope movement.”
- “You can make this cut reliably in dry hardwood.”
- “Cold hands make this connector repair uncertain.”
- “You understand the design, but have not pressure-tested the seal.”
- “Mara can coach this attempt.”

Avoid:

- “Intelligence +5.”
- “Requires Level 20.”
- “25% chance to grow because Farming 8.”
- “Disaster resistance +30%.”
- “Recipe unlocked because XP spent.”

### 14.3 Readable growth

Growth appears in play:

- steadier and less wasteful animation;
- earlier contextual warning;
- improved estimate ranges;
- better substitution suggestions;
- shorter safe setup;
- more defect detail;
- credible advanced plan choices;
- reduced supervision on familiar work;
- new capacity to teach or verify.

### 14.4 Enjoyment and compression

The first successful action is interactive. Repeated, proven, safe work can be
compressed:

- garden routines become scheduled tasks with inspection exceptions;
- known recipes batch at an equipped kitchen;
- jigs automate repeated cuts;
- a maintained irrigation system waters within configured limits;
- watch schedules produce reports;
- trusted apprentices perform verified routine work.

Storm preparation, diagnosis, rescue, experimentation, sabotage investigation,
first construction, and departure testing remain active decisions.

---

## 15. Difficulty curve

Difficulty should shift in kind, not simply increase numerically.

| Campaign phase | Dominant question | Main pressures | New human response |
|---|---|---|---|
| Naked minute | Can I remain alive and oriented? | Water, fire, trauma, surf, heat/cold | Release, triage, observation, movement |
| First night | Can I create a safe recovery window? | Shelter, wetness, darkness, water, wound and fear | Fire/water/shelter braid |
| First week | Can emergencies become routines? | Food variability, infection, workload, weather and navigation | Repeatable camp and early specialization |
| Stable camp | Can routines survive disruption? | Pests, storage, storms, soil, maintenance and trust | Redundancy, cultivation, teaching and records |
| Workshop | Can power be controlled? | Fuel, electricity, pressure, loads, corrosion and scarcity | Specialization, inspection and maintenance |
| Settlement | Can people coordinate without becoming the threat? | Ownership, inequality, sabotage, sanitation and leadership | Institutions, evidence, public works and rescue |
| Return program | Can a complete chain be proven? | Weather window, vessel/aircraft, stores, body, route and consent | Cross-domain mastery and go/no-go discipline |
| Triangle endgame | Can contradiction be measured without surrendering safety? | Instrument conflict, displacement and unfamiliar dose | Probes, redundancy, abort limits and collective proof |

### 15.1 Pressure does not rubber-band

A mature character may find first-night rain easy because they are prepared.
Their challenge comes from:

- a larger footprint to maintain;
- scarce components and depleted geology;
- responsibilities to other people;
- complex projects with more failure modes;
- chosen deeper exploration;
- seasonal and ecological consequences;
- departure proof;
- Triangle attention produced by high-energy investigation.

The island need not invent stronger rain to remain challenging.

---

## 16. Implementation sequence

This specification does not alter the v0.1.2 recovery priority.

### Gate 0 — Usability recovery

Finish and physically accept the current collect → inventory → craft → build
loop on browser and Android.

### Gate A — Small Pressure Weave

After v0.1.2:

- light/persistent/heavy rain;
- wind, wetness, catchment, fire, footing and shelter interaction;
- one forecast cue chain;
- one post-rain contamination chain;
- no cyclone, tsunami, or meteor yet.

### Gate B — Capability foundation

- Strength, Stamina, Dexterity, Perception, reasoning, and present-condition
  limits; Mobility and Composure may initially be derived but must remain
  separable in data;
- practice, study, coaching and recovery evidence;
- four junctions: Controlled Power, Load Bearer, Living Diagnosis and
  Expedition Pacing;
- player-facing limiting-factor text;
- anti-grind and retention tests.

### Gate C — Food web

- six functionally different wild foods;
- two fish/shore sources;
- four crops covering fast green, fruit, root/starch and protein/oil roles;
- seed lots and nursery;
- soil moisture, drainage, organic matter, salt and one pest/disease;
- cooking, drying and one fermentation/preservation process;
- diet diversity and food-safety history;
- storm damage and seed reserve.

### Gate D — Cascading hazards

- heat/drought/fire chain;
- heavy-rain/flash-flood/landslide chain;
- thunder/lightning/electrical/fire chain;
- cyclone with watch, preparation, impact and aftermath;
- settlement maintenance and evacuation plan.

### Gate E — Rare world events

- local tsunami only after high-ground routes, warning literacy, evacuation,
  changed coast and rescue systems are proven;
- Wreckfall as the primary Triangle world-change event;
- anomaly-mediated meteor/airburst only as a late authored program, never a
  random routine event.

### Gate F — Junction expansion

Implement junctions when their underlying activity is real. Never add a skill
node before the gameplay it changes exists.

---

## 17. Acceptance tests

The system fails if:

- a disaster appears without supporting world state;
- the safest prepared player is struck merely because difficulty must “scale”;
- a common lethal event has no readable cue or reasonable response;
- rain only changes a wetness number;
- gardening experience directly rerolls sterile seed;
- food is only calories;
- a wild food node respawns by timer despite local overharvest;
- Strength alone unlocks engineering knowledge;
- reasoning alone grants physical technique;
- repeated trivial crafting is optimal progression;
- deliberate injury is useful training;
- a manual instantly creates mastery;
- a capability ignores missing tools or materials;
- the UI becomes a spreadsheet required every minute;
- an offline or disconnected character dies;
- a meteor randomly deletes a one-life character;
- permanent death lacks a causal report.

The system passes when:

- the same storm is threat, resource, test, story and changed geography;
- two characters solve one problem differently because of lived capabilities;
- every activity affects body, world, learning and future choices coherently;
- a resilient food system is visibly earned through diversity and stewardship;
- preparation can neutralize a hazard;
- expertise primarily improves recognition, judgment, quality and adaptation;
- death remains possible, final, attributable and usually preventable;
- surviving creates credible new ways home.

---

## 18. Research basis

The design translates real hazard and food-system principles into playable
causal systems:

- The U.S. National Weather Service identifies tropical-cyclone hazards
  including storm surge, inland flooding, strong wind, tornadoes, rip currents,
  and large waves:
  <https://www.weather.gov/wrn/hurricane-hazards>
- NOAA describes natural tsunami warnings including strong/long earthquakes,
  ocean roar, and unusual rapid ocean withdrawal or rise:
  <https://ntwc.arh.noaa.gov/?page=tsunamiFAQ>
- The U.S. Geological Survey describes landslide warnings such as new cracks,
  leaning trees, new springs, falling rock, changing stream level, and rumbling:
  <https://www.usgs.gov/programs/landslide-hazards/what-are-signs-landslide-development-what-do-i-do-if-a-landslide-occurs>
- NASA distinguishes meteors from meteorites and documents the extreme rarity
  and potentially broad effects of meaningful impacts:
  <https://science.nasa.gov/solar-system/meteors-meteorites/facts/> and
  <https://science.nasa.gov/solar-system/asteroids/facts/>
- USDA NRCS soil-health guidance connects organic matter, biodiversity,
  minimized disturbance, water retention, runoff, erosion, nutrient cycling,
  and resilience to wet/dry extremes:
  <https://www.nrcs.usda.gov/conservation-basics/soil/soil-health>
- FAO guidance for small islands emphasizes diversified production, sustainable
  farming, water management, integrated pest management, processing,
  preservation, storage, and reducing post-harvest losses:
  <https://www.fao.org/4/y5203e/y5203e02.htm> and
  <https://www.fao.org/4/y5180e/y5180e02.htm>
- WHO frames healthy diet around adequacy, balance, moderation, diversity, and
  safety rather than calories alone:
  <https://www.who.int/news-room/fact-sheets/detail/healthy-diet>
- Motor-learning research supports separating observation, instruction,
  execution, retention, and transfer rather than treating exposure as instant
  competence:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC9407861/> and
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC10356990/>

These sources inform the relationships and warnings. THE FIRST NIGHT remains a
game: variables must be compressed into readable decisions without turning
survival into a professional simulator.

---

## 19. Final canon statement

THE FIRST NIGHT's difficulty and progression now share one identity:

> **The island never attacks with a number. It combines weather, terrain,
> ecology, things, people, and history.**

> **The character never defeats it with a level. They combine body, technique,
> knowledge, perception, tools, relationships, and judgment.**

Food growing, gathering, storms, fire, construction, swimming, salvage,
medicine, society, and escape are therefore not separate minigames. They are
different crossings of the same two living webs.

One life makes those crossings consequential:

> **Observe. Prepare. Act. Learn. Recover. Adapt. Leave—or die as the person you
> actually became.**
