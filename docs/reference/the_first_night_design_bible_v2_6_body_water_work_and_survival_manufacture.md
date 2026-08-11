# THE FIRST NIGHT — THE BODY IS THE FIRST TOOL
## Design Bible v2.6 — Physical Condition, Water Truth, Continuous Work, and Survival-Manufacture Constitution

**Authoritative specialist constitution — 11 August 2026**  
**Project:** THE FIRST NIGHT / DRIFT / RUSTED  
**Authority:** Amends and makes more specific the embodied-development rules of v2.3, the crash/thermal/combination rules of v2.4, and the causal-resolver and machine-testable-graph requirements of v2.5. It does not repeal the one-life, two-island, empty-pattern-book, physical-knowledge, living-wreck, Homeward Engine, or True Return laws.  
**Production truth:** This is design canon, not a claim of implementation or acceptance. The present Godot prototype does not implement this body, disease, water, manufacture, or time model. RT0/v0.1.2 still requires Director-device acceptance before feature expansion.

---

# 0. Executive ruling

Physical condition is **partly covered** in the existing Bible, but it is not yet complete enough to govern the game.

The canon already names the right elements:

- asymmetric crash injury;
- Health, Stamina, Hunger, Thirst, Energy, and Warmth;
- pain, wetness, body-part impairment, illness, contamination, sleep debt, and recovery debt;
- strength, endurance, load tolerance, mobility, dexterity, water confidence, acclimatization, and composure;
- causal workload, recovery-gated adaptation, and non-magical carrying;
- continuous thermal simulation during sleep;
- an empty build/manufacture book and evidence-bound invention.

What it does **not** yet close is the most important player-facing question:

> **How does this particular body, in this particular condition, with this particular load, tool, route, illness, and experience, actually move and work—and how does the player feel the difference without reading a spreadsheet?**

The pond-water report proves the gap. If contaminated water merely changes a hidden variable, the simulation is technically present but experientially absent. The game needs a complete chain:

> **source history → hazard class → exposure dose → incubation → early bodily evidence → functional impairment → diagnosis → treatment/support → recovery or deterioration → learned source/treatment knowledge**

The water also needs a complete material chain:

> **find source → judge source → collect → transport → clarify if needed → treat the correct hazard → cool → store without recontamination → consume/use → observe outcome → improve the system**

And the body needs a complete performance chain:

> **structural body + trained capacity + current readiness + impairment + technique + equipment + task/environment → movement/work outputs → fatigue/injury/learning stimulus → recovery → adaptation or breakdown**

v2.6 therefore establishes four governing systems:

1. **The Felt Body:** every condition changes performance through legible physical outputs, not only bars.
2. **The Water Truth Chain:** water is never simply clean/dirty; hazard and treatment must match.
3. **The Survival-Manufacture Graph:** every survival and thriving capability is back-chained through matter, tools, workspaces, body, knowledge, skill, time, and proof.
4. **Continuous Human Time:** work happens in the world and consumes time; long processes continue; sleep accelerates the clock but never fabricates outcomes.

The signature rule is:

> **The body must remember the road. Water must remember its source. Every object must remember its ancestry. Time must remember the work.**

---

# 1. Fresh gap audit

## 1.1 What the previous canon solved

| Existing strength | Governing source | What remains valid |
|---|---|---|
| Six readable primary states with deeper causal variables | v2.3/v2.4 | Health is not labor currency; Stamina is not Endurance; Warmth is bidirectional. |
| Crash start below full condition | v2.4 | The first castaway begins mobile but wet, hurt, tired, and asymmetrically impaired. |
| Continuous heat balance during sleep | v2.4 | Sleep has no positive Warmth term; wind, wetness, ground, shelter, fire, clothing, illness, and metabolism continue. |
| Load zones rather than one inventory number | v2.3 | Matter remains matter; carts, caches, leverage, flotation, and teamwork beat overload grinding. |
| Adaptation after workload plus recovery | v2.3/v2.4 | Harmful exhausted repetition creates breakdown, not optimal growth. |
| Empty pattern book and proof-bound discovery | v2.3/v2.4 | Found items, manuals, and skill levels never inject manufacture-ready recipes. |
| Dependency vectors for every creation | v2.4 | Matter, operations, tools, knowledge, technique, workspace, body, environment, time, and verification remain separate gates. |
| Central causal resolver requirement | v2.5 | One activity must be charged once, with shared consequences returned to every system. |

## 1.2 What is still weak or absent

| Gap | Current danger | Required correction |
|---|---|---|
| No complete body-performance output model | Traits exist but may change only hidden multipliers | Resolve pace, acceleration, balance, work cadence, precision, recovery, safe duration, and route availability. |
| No castaway phenotype constitution | Every successor risks feeling like the same body with different bars | Give each life stable structure, starting history, trainable capacities, limitations, and one credible strength. |
| No measured growth curve | Walking/chopping may award visible XP without believable adaptation | Separate familiarization, neural/technical economy, physiological adaptation, maintenance, overload, injury, and detraining. |
| No “felt change” acceptance | A 10% improvement may exist only numerically | Require route, breath, animation, rest, stability, tool, and recovery differences that players identify blind. |
| Illness is not a temporal system | Pond water can make the survivor “sick” with no visible cause or effect | Author exposure, incubation, symptom clusters, functional penalties, hydration loss, monitoring, and resolution. |
| Water treatment is too generic | Boiling risks becoming a universal purifier buff | Separate microbes, turbidity, salt, chemicals, algal toxins, sediment, storage, and recontamination. |
| No complete vessel ancestry | “Use fire to boil” ignores what holds water | Back-chain coconut shell, organic/skin vessel, found cookware, pottery, fabricated metal, tank, and distribution routes. |
| Aircraft aluminum is treated too casually | A contaminated coated alloy can become magical foodware | Require provenance, decontamination, coating removal where safe, forming, joining, leak, heat, and conservative food-contact qualification. |
| Survival item families remain prose | Late capabilities may be unreachable or depend on implied tools | Put every canonical node and edge in a machine-testable graph. |
| Crafting time lacks one law | Instant menu output and tedious holding are both possible | Define embodied active work, interruptible projects, unattended processes, batching, and safe acceleration. |
| Sleep acceleration lacks clock ownership | Time compression could skip threats or fabricate recovery | Advance the entire simulation in bounded steps, interrupt on readable danger, and govern multiplayer separately. |

## 1.3 The central design danger

The game can fail in two opposite ways:

- **spreadsheet realism:** hundreds of correct variables that the player cannot perceive or act on;
- **arcade contradiction:** a Strength number, Dirty Water debuff, and Craft Time bar that ignore material and bodily causes.

The solution is not more meters. It is a smaller number of **felt outputs** produced by a deeper shared model.

---

# 2. Research translated into design

## 2.1 Load, lifting, and walking

Load carriage research supports a relational model: energetic cost rises with added mass; load position, speed, terrain, gradient, body mass, equipment, and fatigue change the result. Manual-lifting safety also depends on reach, height, asymmetry, frequency, grip/coupling, and task geometry, which is why the NIOSH lifting model is not a universal kilogram cap. [Load-carriage mechanics](https://pmc.ncbi.nlm.nih.gov/articles/PMC3922835/), [NIOSH Revised Lifting Equation](https://www.cdc.gov/niosh/ergonomics/about/RNLE.html)

Design translation:

- there is no single Carry Weight stat;
- carrying, lifting, dragging, holding, climbing, and placing are different problems;
- load relative to body mass is only one input;
- bulk, center of mass, hand occupation, pack fit, terrain, footwear, pain, heat, and return distance matter;
- the intelligent solution to heavy matter is usually a second trip, cache, sled, cart, lever, tripod, hoist, flotation, or team;
- strength changes controllable force and short-haul routes, not gravity.

The category lesson from **Death Stranding** is player-facing rather than physiological: weight and placement alter mobility and balance visibly, and equipment changes the route. THE FIRST NIGHT should adopt that legibility without turning ordinary walking into constant trigger correction or camera sickness. [Official Death Stranding cargo guide](https://www.kojimaproductions.jp/en/death-stranding-directors-cut-beginners-guide)

## 2.2 Training and recovery

Strength and endurance improve through repeated appropriate stimulus, progression, and recovery—not through arbitrary XP attached to any movement. Early improvement includes coordination and economy; slower structural adaptation requires days and weeks. Excessive load, poor sleep, dehydration, illness, pain, or inadequate nutrition can turn training into fatigue and injury. The current ACSM resistance-training position emphasizes that regular participation and progressive challenge drive improvement, while unnecessary complexity is not the goal. [ACSM 2026 resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/)

Design translation:

- walking first improves route familiarity, gait economy, and pacing;
- endurance and load tolerance change more slowly;
- strength requires sufficiently forceful work, not simply time on feet;
- adaptation is applied during recovered intervals, especially sleep;
- a stimulus can maintain, develop, overload, or damage depending on the current body;
- exact repetition saturates;
- illness, underfeeding, dehydration, and fragmented sleep reduce or reverse adaptation.

## 2.3 Sleep, cognition, and acclimatization

Sleep loss affects reaction time, coordination, judgment, and recovery, though effects vary by task and time. Heat acclimatization develops across repeated exposures and fades when exposure stops; it is not permanent immunity. [Sleep-deprivation reaction-time study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3307962/), [NIOSH acclimation decay study](https://stacks.cdc.gov/view/cdc/218351)

Design translation:

- Energy modifies attention, motor control, learning, and risk before collapse;
- sleep quality matters more than a binary “slept” flag;
- heat acclimatization lowers strain for familiar conditions but does not neutralize dehydration or heat illness;
- a new successor does not inherit another person’s body adaptation.

## 2.4 Water treatment truth

WHO, CDC, and EPA guidance distinguishes source protection, clarification, disinfection, storage, and chemical safety. A rolling boil is a powerful early answer for bacteria, viruses, and protozoa, but ordinary boiling does not remove salt or most chemical contaminants and can concentrate nonvolatile chemicals as water evaporates. Cloudy water should be settled or filtered before treatment for handling and effectiveness, and treated water must be stored safely to prevent recontamination. [EPA emergency disinfection](https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water), [WHO drinking-water guidance](https://www.who.int/news-room/fact-sheets/detail/drinking-water)

Design translation:

- the game records hazard classes, not one contamination percentage;
- boiling earns a **microbial-treatment claim**, not a universal Safe flag;
- seawater remains unsafe after boiling;
- fuel, hydraulic fluid, heavy-metal, and anomaly contamination require avoidance or specialized treatment;
- clear appearance and pleasant taste are evidence but not proof;
- safe storage and handling are part of the treatment chain.

## 2.5 Illness timing

Waterborne illness is rarely an instant poison event. CDC’s travel-medicine guidance notes that toxin-mediated illness may appear within hours; bacterial and viral illness often appears across roughly 6–96 hours; protozoal illness often takes one to two weeks. Symptoms and severity vary, but diarrhea and vomiting create their most immediate survival danger through fluid and electrolyte loss. [CDC Travelers’ Diarrhea](https://www.cdc.gov/yellow-book/hcp/preparing-international-travelers/travelers-diarrhea.html), [WHO diarrhoeal disease](https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease)

Design translation:

- drinking pond water creates an exposure record, not instant health damage;
- later symptoms must point back to plausible recent exposures;
- illness changes thirst, stamina recovery, energy, appetite, body temperature, concentration, gait, and work safety;
- oral rehydration supports the body but does not magically remove the cause;
- severe dehydration, blood, persistent fever, altered consciousness, or inability to drink are crisis evidence, not a generic red icon.

## 2.6 Containers before pottery and metal

Experimental archaeology supports heating water in some organic containers through direct or heated-stone methods, while also showing that performance varies and that not every organic vessel reliably reaches or sustains a full boil. This makes emergency coconut-shell and hide/bark routes plausible but limited. [Speth on perishable-container boiling](https://paleoanthro.org/media/journal/content/PA20150054.pdf), [experimental organic-vessel study](https://eprints.whiterose.ac.uk/id/eprint/203677/1/s12520_023_01843_z.pdf)

Design translation:

- a coconut shell is a small emergency vessel, not a free cooking pot;
- hot-stone heating needs suitable stones, tongs/sticks, a stable hearth, replacement stones, and a burn/scald/fracture warning;
- an organic or skin vessel may heat or pasteurize water before it can reliably roll-boil it;
- pottery and known cookware are major capability gains because volume, repeatability, cleanliness, and fire control improve.

## 2.7 Salvaged metal and food contact

Cookware safety depends on the material and surface, not merely “metal.” Worn, pitted, unknown, or contaminated metal and coatings can transfer unwanted substances; aircraft wreckage can also carry fuel, oil, hydraulic fluid, paint, primers, corrosion, and mixed alloys. [Health Canada cookware guidance](https://www.canada.ca/en/health-canada/services/household-products/safe-use-cookware.html), [FDA lead in foodwares](https://www.fda.gov/food/environmental-contaminants-food/lead-food-and-foodwares)

Design translation:

- found recognized cookware is the safest salvage shortcut after cleaning and inspection;
- a clean, known, uncoated food can or galley vessel is preferable to unknown aircraft skin;
- aircraft sheet may first serve as roof, reflector, wind shield, tray, gutter, patch, or non-food basin;
- an advanced survivor may fabricate a boiling vessel from a suitable, isolated, cleaned sheet, but must form, join, deburr, stabilize, leak-test, and heat-test it;
- unknown coatings and fuel/hydraulic contamination can permanently disqualify a piece from food contact.

## 2.8 Continuous work in survival games

Useful precedents separate active work from long processes. **Vintage Story** gives materials specific verbs such as knapping and clay forming; **Project Zomboid** uses timed actions and is explicitly expanding surface-based and machine-based crafting; **UnReal World** allows long crafts to be paused and resumed. The danger in all three is repetition after the player already understands the operation. [Vintage Story crafting](https://wiki.vintagestory.at/Crafting), [Project Zomboid surface crafting](https://projectzomboid.com/blog/news/2024/02/leapdoid/), [UnReal World pausable crafting](https://www.unrealworld.fi/forums/index.php?topic=7269.0)

Design translation:

- no item appears after a menu-confirm cut-to-black;
- active work occupies the person and advances the world clock;
- long drying, curing, soaking, firing, growing, charging, cooling, and smoking continue in the world;
- complex projects preserve partial progress and physical state;
- mastery, jigs, and machines reduce repeated input and error, not matter or time to zero.

---

# 3. New constitutional laws

## Law 138 — The body is a performance system

A characteristic is not complete until it changes at least one player-perceivable movement, work, recovery, or decision output.

## Law 139 — Every body state belongs to one of four layers

Stable structure, trainable capacity, current readiness, and injury/illness burden remain distinct. One meter may summarize them; one variable may not replace them.

## Law 140 — No universal carry cap exists

Backpack travel, hand carry, lift, drag, hold, climb, swim, and hoist each resolve different constraints.

## Law 141 — Development requires stimulus plus recovery

Activity creates a candidate adaptation stimulus. Only appropriate load followed by adequate recovery realizes growth. Overload without recovery creates fatigue, injury, or regression.

## Law 142 — The same route is the honest benchmark

Character growth is proved when the same representative route or task becomes measurably calmer, safer, more efficient, or more controllable under comparable conditions.

## Law 143 — Growth never deletes anatomy

Strength, endurance, skill, and acclimatization expand capability bands. They do not remove mass, joints, sleep, hydration, heat, illness, reach, or the need for tools.

## Law 144 — Injury and illness change verbs before they change death

Painful gait, weak grip, cramps, nausea, coughing, tremor, slowed recovery, poor attention, and altered temperature must affect play before a late Health collapse.

## Law 145 — Symptoms are evidence, not labels

The survivor first perceives bodily evidence. A named diagnosis appears only when personal knowledge, records, examination, comparison, or external help justifies it.

## Law 146 — Water exposure has a future

Every meaningful unsafe-water use records source, condition, amount, treatment, container, time, and route. Consequences resolve through incubation and dose rather than instant punishment.

## Law 147 — Treatment must match hazard

Clarification, filtration, disinfection, boiling, adsorption, distillation, and source avoidance solve different problems. No single treatment creates a universal Safe state.

## Law 148 — Boiling earns one specific claim

A correctly completed boil can support a microbial-inactivation claim. It does not remove salt, most dissolved chemicals, unknown metals, fuel, or all toxins.

## Law 149 — The vessel is part of water safety

Capacity, material, cleanliness, stability, heat route, joining, lid, cooling, pouring, storage, and recontamination risk belong to the water operation.

## Law 150 — Food contact requires provenance

Unknown coated, corroded, burned, fuel-soaked, hydraulic-contaminated, lead-bearing, or otherwise suspect material cannot become cookware by Crafting skill alone.

## Law 151 — Treated water can become unsafe again

Dirty hands, an unclean ladle, an open vessel, pests, runoff, mixing, or a contaminated container can reintroduce risk.

## Law 152 — Water knowledge is outcome-bound

The journal may record “boiled correctly and no later illness observed,” not “all water of this appearance is safe.”

## Law 153 — Every survival capability enters the graph

No tool, container, shelter part, treatment, machine, boat system, or return component may enter production without source, operation, tool, workspace, body, knowledge, skill, time, failure, proof, maintenance, and downstream-use records.

## Law 154 — Found equipment buys time, not ancestry

A pan, knife, filter, motor, radio, or medicine may solve an immediate problem. It does not teach how to reproduce, repair, dose, or replace itself.

## Law 155 — Work never pauses the world

Active manufacture advances weather, light, tide, fire, hunger, thirst, illness, pain, wear, and opportunity windows.

## Law 156 — No black-screen completion

The person must begin, continue, interrupt, resume, inspect, and finish work in the world. Interface confirmation cannot skip the material operation.

## Law 157 — Long processes become world state

Drying, soaking, fermenting, curing, firing, cooling, charging, growing, smoking, settling, and corrosion continue whether the survivor watches them or not.

## Law 158 — Sleep accelerates time, not outcomes

Accelerated sleep runs the same body, fire, weather, tide, illness, security, and world simulation in bounded steps and interrupts on readable danger.

## Law 159 — Mastery compresses repetition, not meaning

Proven routine work may use batches, templates, jigs, assistants, or machines. First discovery, diagnosis, high-risk work, changed material, and critical tests remain embodied.

## Law 160 — Body, skill, knowledge, tool, and workspace never substitute silently

A stronger body cannot replace engine knowledge. Mechanical knowledge cannot lift an unsupported engine. A hoist cannot diagnose corrosion. A workbench cannot reveal a pattern.

## Law 161 — Every critical endpoint has a recovery route

Loss of one rare item may change the path or cost. It may not permanently make water continuity, a first refuge, or the authored True Return route unreachable.

## Law 162 — Character change must be felt blind

A playtester who is not shown numbers must be able to distinguish meaningful improvement or impairment through movement, breath, balance, work, recovery, and decision margin.

---

# 4. The Felt Body architecture

## 4.1 Four body layers

### Layer A — Stable structure and life history

These change little or not at all during one life:

| Characteristic | Gameplay relevance | Guardrail |
|---|---|---|
| Stature and limb reach | stride tendency, overhead reach, leverage, fitting spaces, boat ergonomics | never a universal advantage |
| Body mass and current composition | load ratios, thermal inertia/insulation tendency, buoyancy, energy reserve | no moral or class ranking |
| Frame/joint history | tolerance to some carries/postures, prior pain, rehabilitation route | never hidden unavoidable failure |
| Age band | recovery tendency, experience history, some strength/endurance ceilings | older does not mean incapable; younger does not mean skilled |
| Hand dominance | one-handed precision, injury consequences, adapted technique | off-hand can improve through use |
| Vision/hearing baseline | observation range, low-light/signal recognition, tool precision | accessibility options remain separate |
| Prior occupation/activity | hypotheses, familiar gestures, initial technique evidence | never grants unproven recipes |
| Swimming exposure | initial composure and stroke economy | no immunity to surf, cold, fatigue, or drowning |
| Chronic condition/medication dependency where authored | altered planning, burden, or equipment need | never random concealed death; must add humane play, not token punishment |

The first authored castaway receives a controlled profile. Later castaways vary within fairness bands. The user does not reroll bodies as loot tiers.

### Layer B — Trainable capacities

| Capacity | Main felt outputs | Main stimuli | Main limits |
|---|---|---|---|
| Strength | controllable force, lift/hold route, heavy-tool stability, short climb/pull reserve | progressive lifting, striking, climbing, hauling, resistance | joints, technique, grip, geometry, recovery |
| Endurance | sustainable pace, Stamina capacity, recovery between efforts, expedition reserve | sustained walking, paddling, swimming, labor | hydration, heat, illness, sleep, nutrition |
| Load tolerance | pack comfort, foot/shoulder tolerance, sway control, sustained loaded gait | progressive fitted carriage over real routes | overload, footwear, pack design, terrain |
| Mobility | crouch, climb, reach, work posture, recovery from awkward positions | varied movement, rehabilitation, task practice | injury, age/history, equipment |
| Balance | uneven ground, boat motion, loaded turning, fall correction | varied terrain, boats, climbing, controlled practice | load asymmetry, fatigue, pain, motion |
| Dexterity/coordination | hand steadiness, fitting tolerance, knot/cut cadence, manipulation error | material-specific precise work with feedback | cold, fatigue, pain, low light, tremor |
| Grip endurance | sustained tool/control work, rope, carry, climbing | progressive gripping with recovery | skin, tendon, pain, wetness, tool fit |
| Water confidence | calm breathing, stroke economy, reboarding decisions, task composure | staged swimming/reboarding/rescue practice | air, surf, current, cold, fatigue |
| Heat acclimatization | lower perceived strain and better pacing in familiar heat | repeated gradual heat work with recovery | dehydration, illness, absence/decay |
| Cold familiarity | earlier clothing/fire decisions, controlled movement, less panic | safe repeated exposure and knowledge | no strong “cold immunity”; tissue/core limits remain |
| Composure | wider attention, better abort judgment, steadier procedures | recovered exposure, rehearsal, evidence, successful rescue | not fearlessness; severe threat still matters |
| General recovery capacity | repair of fatigue, adaptation realization, illness resilience tendency | sleep, nutrition, safe workload, rehabilitation | age/history, infection, chronic burden, deprivation |

### Layer C — Current readiness

These change across seconds, hours, and days:

- Stamina reserve and recovery rate;
- hydration and electrolyte strain;
- available energy, appetite, and longer nutritional debt;
- sleep pressure, sleep fragmentation, and alertness;
- thermal state: skin comfort, core trend, heat/cold debt;
- wetness by layer;
- stress and composure;
- local muscle/work fatigue;
- bowel/bladder urgency where relevant;
- oxygen/breath reserve in water, smoke, or confined air.

### Layer D — Burden and impairment

These have location, cause, severity, stage, and restrictions:

- cuts, bleeding, burns, bruises, sprains, fractures, crush injury;
- foot blisters, shoulder abrasion, tendon irritation, back strain;
- smoke inhalation and respiratory irritation;
- wound contamination and infection;
- gastrointestinal illness;
- fever and systemic illness;
- poisoning or chemical exposure;
- dehydration and heat/cold illness;
- disability, rehabilitation, and adapted technique.

## 4.2 Performance outputs

The resolver does not return “Body 63.” It returns a performance vector:

```text
preferred walking pace
maximum sustainable pace
acceleration and stopping control
sprint/escape reserve
stamina cost and recovery rate
gait stability and fall margin
safe climb/crouch/reach routes
comfortable/working/overload carriage bands
short-lift and sustained-hold control
tool cadence and force consistency
fine-work precision and inspection quality
task interruption need
work duration before error rises
learning quality and adaptation stimulus
injury/illness warning and risk
```

Every activity reads only the outputs it needs.

## 4.3 Locomotion seed model

The companion workbook supplies editable seed values. The governing relationship is:

```text
sustainable pace
  = personal preferred pace
  × terrain/gradient factor
  × load-and-balance factor
  × footwear/route factor
  × readiness factor
  × injury/illness factor
  × thermal factor
  × chosen reserve policy
```

Important constraints:

- unloaded healthy level walking is tuned around an individual reference, not one universal speed;
- sand, mud, slope, surf, vegetation, darkness, and loose rock change both pace and stability;
- the survivor may choose a faster pace than sustainable, spending Stamina and increasing heat/error;
- “auto-walk faster because Endurance leveled” is insufficient; animation, breath, recovery, and reserve must agree;
- severe encumbrance changes turning, stopping, climbing, hand use, view, and fall response—not only top speed.

## 4.4 Carry and force architecture

The game displays four honest answers rather than one green/red number:

| Question | Output |
|---|---|
| Can I lift it from here? | force, reach, grip, posture, obstruction, pain, and stability determine the attempt route |
| Can I hold/control it? | local endurance, balance, coupling, asymmetry, and support determine seconds/minutes of control |
| Can I transport it there? | distance, terrain, heat, pack/container, return reserve, and recovery determine viability |
| Can I move it intelligently? | drag, roll, split, sled, cart, lever, hoist, float, or team routes become alternatives |

Recommended carriage zones are relative tuning bands, not hard simulation truth:

| Zone | Typical backpack relation before personal/equipment modifiers | Play meaning |
|---|---:|---|
| Free/light | up to roughly 5–10% body mass | near-natural gait; bulk and hand use may still matter |
| Working | roughly 10–25% | visible cost; viable expedition load with suitable pack and route |
| Training-heavy | roughly 25–35% | slower, hotter, frequent management; useful only for prepared short/medium routes |
| Operational overload | roughly 35–50% | short controlled haul; high reserve and injury cost |
| Reject backpack route | beyond the individual/task-safe band | split, cache, drag, cart, hoist, float, or team |

These bands do not authorize a universal 50% carry. A small unstable box in the hands can be worse than a heavier balanced pack; a long beam can be impossible through vegetation; a well-supported sled changes the problem entirely.

## 4.5 How development becomes felt

| Change | Player should feel |
|---|---|
| Endurance improves | same Water Run needs fewer pauses; breathing settles faster; more reserve remains on return |
| Strength improves | heavy tool/head oscillates less; short lift is steadier; controlled-force route opens |
| Load tolerance improves | same fitted pack causes less sway/shoulder/foot burden; sustainable pace rises modestly |
| Balance improves | boat/rock/loaded turn produces fewer correction events and larger warning margin |
| Dexterity improves | hands settle faster; alignment/fit feedback is clearer; fewer corrective strokes are needed |
| Water confidence improves | breathing is calmer; camera/view remains usable; abort/reboard decisions occur earlier |
| Heat acclimatization improves | lower strain and more stable pace in familiar heat, while thirst still rises honestly |
| Sleep debt worsens | delayed reactions, missed cues, slower diagnosis, inconsistent tool timing |
| GI illness emerges | guarded gait, cramps, nausea, reduced appetite, urgent pauses, weaker recovery, rising thirst |
| Foot injury emerges | shortened/asymmetric step, downhill penalty, load redistribution, route rethink |

Camera shake is never the only feedback. Reduced-motion accessibility may suppress camera movement while preserving animation, speed, sound, controller response, timing, posture, and explicit body language.

---

# 5. Growth, maintenance, breakdown, and recovery

## 5.1 Adaptation event

Every meaningful physical activity produces a capacity-specific event:

```text
capacity targeted
relative challenge
duration and repetition
movement/force pattern
technique quality
current fatigue and pain
environmental load
novelty/familiarity
recovery required
injury warning
```

The resolver classifies it:

| Class | Meaning | Result after recovery |
|---|---|---|
| Below threshold | ordinary movement below current challenge | health/maintenance value; little new adaptation |
| Productive | sufficient, controlled, recoverable challenge | modest capacity stimulus |
| High productive | near current limit with good technique and reserve | stronger stimulus, larger recovery need |
| Overload | force/duration exceeds useful control | fatigue, error, injury risk; little extra benefit |
| Breakdown | work continues through severe pain, illness, heat, dehydration, or exhaustion | capacity regression, injury, or illness worsening |

## 5.2 Time scale of change

The game must distinguish:

1. **Immediate familiarization (minutes to sessions):** better button/gesture control, route memory, pack arrangement, tool grip, pacing, and diagnosis.
2. **Early economy (days):** less wasted motion, faster recovery between familiar efforts, improved heat pacing, fewer balance corrections.
3. **Physiological adaptation (weeks):** modest but meaningful changes in endurance, strength, load tolerance, and tissue capacity.
4. **Mature conditioning (months):** large life-specific differences earned by sustained work and recovery.
5. **Maintenance/detraining:** unused timing and acclimatization fade before core knowledge; severe deprivation reduces capacity.

This prevents “walk one beach and gain +1 speed.” It also allows the player to feel improvement early through technique while deeper bodily change remains credible.

## 5.3 Recovery allocation

Sleep/rest does not simply fill bars. Recovery resources are allocated among:

- acute Stamina restoration;
- sleep-pressure reduction;
- tissue repair;
- immune/illness burden;
- adaptation realization;
- cognitive consolidation;
- thermal and hydration stabilization;
- chronic recovery debt.

A warm, dry, hydrated, fed, low-pain sleep can serve all channels. A cold, wet, feverish, repeatedly interrupted night may restore little and can worsen several.

## 5.4 Anti-grind rules

- the same low-challenge walk becomes maintenance;
- carrying junk in circles does not remain productive load training;
- chopping while exhausted adds breakdown faster than strength;
- dropping and lifting the same object without a real work objective rapidly saturates;
- deliberate self-injury produces no useful medical mastery;
- changed route, load distribution, terrain, weather, tool, material, precision, or successful controlled tolerance can renew evidence;
- building a sled may teach more logistics and mechanics than repeating ten overloaded carries.

## 5.5 Successor bodies

The island persists; the body does not.

Each new castaway receives:

- a different stable profile;
- a different crash/interference condition;
- one credible existing practical strength;
- one limitation that changes route or tool choice;
- no inherited physical conditioning;
- access to physical infrastructure, tools, records, clothing, and aids left behind;
- the possibility of requalifying documented techniques faster through evidence and equipment.

An Arrival Station is therefore not a stat booster. It is a humane environment: clean water, clothing sizes, simple food, splints, lighting, maps, tested tools, labeled hazards, a dry bed, and proof left for a stranger.

---

# 6. Water Truth system

## 6.1 Water is a hazard vector

Internally, a water lot records:

```text
source and location
collection time and weather
volume and turbidity
microbial-risk band
salt/mineral load
chemical/fuel/oil suspicion
algal/toxin suspicion
sediment and debris
treatment history
container history and cleanliness
storage time/temperature/closure
mixtures and transfers
observations and later outcomes
```

The player does not see laboratory numbers. They inspect evidence:

- source type and upstream/downstream context;
- runoff after rain;
- animal tracks, feces, carcass, algae, insects, odor, sheen, foam, color, sediment;
- proximity to wreck, fuel, metal, salt spray, latrine, garden, or waste;
- whether water moved, stagnated, flooded, or mixed with tide;
- container smell, residue, corrosion, coating, and previous contents;
- past documented treatment and later health outcomes.

## 6.2 Source classes

| Source | Likely strengths | Main risks | Early rational posture |
|---|---|---|---|
| Fresh rain caught directly | low dissolved salt; visible event | dirty catch surface, first flush, open storage | discard first dirty runoff; collect into clean covered vessel |
| Upland spring/seep | often clear and cool | animal/wildlife contamination, geology, surface ingress | prefer over pond but still assess/treat until proven |
| Moving stream | renewal and easier collection | upstream feces/carcass/runoff, sediment after storm | collect upstream of camp activity; clarify/treat |
| Pond/lagoon | reliable visible volume | stagnation, feces, protozoa/bacteria, algae, insects, salt intrusion | emergency source only; full risk assessment and microbial treatment; avoid suspect blooms/chemicals |
| Coconut water or sealed found drink | immediately drinkable if intact/fresh | spoilage, damage, finite supply | use as bridge, not permanent system |
| Roof/wreck runoff | large collection surface | fuel, oil, paint, salt, bird/animal waste, corrosion | only known-clean surfaces; first flush; avoid contaminated wreck skins |
| Brackish water | accessible near coast | salt load and microbes | not made potable by boiling; seek rain/fresh source or distill later |
| Seawater | abundant | salt causes worsening dehydration | never drink; distillation/desalination required |
| Wreck/container water | possible trapped fresh stock | unknown chemicals, corrosion, biological growth | provenance and seal inspection; avoid when unknown |
| Algal/scummed water | visible warning | toxins may remain after ordinary boiling | avoid source; no early heroic treatment |
| Fuel/chemical-sheen water | visible/odor warning | hydrocarbons and other dissolved chemicals | avoid; boiling is specifically forbidden as a solution |
| Anomaly-altered water | unknown behavior | unclassified physical/biological effects | research sample only; never basic survival dependency |

## 6.3 Treatment claims

| Operation | What it can credibly improve | What it cannot claim |
|---|---|---|
| Settle/decant | heavy particles and turbidity | disinfection, salt/chemical removal |
| Cloth/sand prefilter | suspended matter; protects later processes | reliable pathogen removal by itself |
| Rolling boil | microbial inactivation when correctly completed | salt, most dissolved chemicals/metals, all toxins, clean storage |
| Chemical disinfection with known product/dose/contact | many microbes in sufficiently clear water | unknown dose, some resistant organisms, chemicals/salt |
| Solar/UV route with suitable clear vessel and exposure evidence | microbial risk under controlled conditions | turbid water, chemicals/salt, all weather |
| Ceramic/membrane filter | size-dependent removal according to tested build/component | universal virus/chemical/salt removal |
| Charcoal/adsorption stage | taste/odor and some organics depending on media/contact | universal pathogen, salt, or metal removal |
| Distillation | salt and many nonvolatile contaminants | volatile chemicals without separation/control; free energy |
| Known sealed stored water | preserved safety if container remains intact | infinite shelf life after opening/contamination |
| Source avoidance | prevents exposure | no water supply—must be paired with another source |

## 6.4 Pond illness timeline

The first representative illness should be an authored **acute gastroenteritis syndrome**, not a roulette of named pathogens.

Example sequence:

| Stage | Time after exposure seed | Player-facing evidence | Functional consequence |
|---|---|---|---|
| Exposure | at drink/use | pond source, taste/odor/sediment, treatment history recorded | no automatic instant Health loss |
| Incubation | hours to days | usually none; survivor may forget unless journal/source memory exists | ordinary play continues |
| Prodrome | emerging | nausea, appetite loss, abdominal unease, malaise, unsettled sleep | slower Energy recovery; reduced food tolerance; attention distraction |
| Active illness | hours/days | cramps, diarrhea and/or vomiting, weakness, thirst, possible fever | fluid/electrolyte loss; Stamina recovery falls; work interruptions; heat control and balance worsen |
| Dehydration risk | if losses exceed intake | dry mouth, eager drinking, reduced urination, dizziness, weakness, poor skin/eye evidence where appropriate | pace, lift, cognition, and recovery decline; collapse risk rises |
| Recovery | supported/causal | losses slow, appetite and sleep normalize gradually | capacity returns over time; recovery debt remains |
| Persistent/complicated | specific evidence | prolonged illness, blood, high/persistent fever, inability to drink, confusion | urgent care, advanced knowledge/supply, or death risk |

The exact incubation is seeded from hazard class and dose. The player receives cause-finding evidence rather than a guaranteed pathogen name.

## 6.5 Illness must be visible in play

Minimum embodied feedback:

- guarded abdomen posture and altered idle;
- intermittent cramps that interrupt rather than constantly stun;
- appetite aversion and nausea cues;
- urgent voluntary interruption opportunity before forced loss;
- slower Stamina recovery and rising perceived effort;
- more frequent thirst and reduced safe heat/work duration;
- poor sleep and temperature instability if fever is present;
- journal comparison: “Symptoms began the morning after untreated pond water”;
- optional discreet presentation settings for players who do not want explicit bowel/vomit audio or visuals.

The game must not hide the condition, but it also must not turn illness into humiliation or control theft.

## 6.6 Support, treatment, and diagnosis

Early survival support:

- stop using the suspected source;
- obtain correctly treated water;
- rest in shade/shelter;
- take small repeat fluids when tolerated;
- maintain hygiene and clean handling;
- use a correctly measured oral rehydration solution when the survivor has the knowledge, clean water, sugar, salt, and measurement route;
- monitor urine, thirst, alertness, fever, stool/vomiting, and ability to drink;
- reduce work and heat exposure.

WHO/UNICEF describe oral rehydration as clean water with the correct glucose/salt balance; an emergency household formula commonly uses **1 litre safe water + 6 level teaspoons sugar + 1/2 level teaspoon salt**. The game may expose this exact pattern only through a credible personal background, medical carrier, label/manual, teaching, or successful measured learning—not universal narrator knowledge. Incorrect concentration can worsen the situation. [WHO cholera/ORS guidance](https://www.who.int/news-room/questions-and-answers/item/cholera-outbreaks)

Antibiotics are never a generic “food poisoning cure.” A found supply requires identity, indication, contraindication, dose, course, expiry/storage, and evidence. Supportive hydration remains the early governing play.

## 6.7 Water-memory journal

The physical journal may hold:

- source sketch/location;
- date, weather, tide/rain relation;
- visible/odor/taste evidence;
- treatment steps and vessel used;
- who consumed it and roughly how much;
- later symptoms/no observed symptoms;
- confidence and unresolved hazards;
- maintenance date for filters, catchment, cistern, and storage.

One symptom-free use increases confidence modestly. It does not prove permanent safety.

---

# 7. The complete water-vessel and treatment ancestry

## 7.1 Emergency routes before a pot

| Route | Matter | Tools/operations | Knowledge/skill | Body/time cost | Proof and limits |
|---|---|---|---|---|---|
| Drink rain directly | rainfall, clean leaf/surface | position/channel | source cleanliness | low capacity; exposure time | minimal storage; contaminated surfaces remain risky |
| Coconut-shell cup | mature coconut shell | open, clean, stabilize | edge use, food/source judgment | small active task | cup/collection only until heat tested |
| Coconut-shell direct heat | cleaned shell full of water, support, controlled coals | cut/open, stable support, fire control | heat route, crack/scald warning | slow; small batch; fuel | sustained hot/boil evidence; shell can crack/char; no salt/chemical removal |
| Coconut-shell hot-stone heat | shell, suitable dry stones, fire, transfer sticks/tongs | heat stones, transfer, exchange, avoid ash | stone/thermal familiarity | laborious and burn-prone | temperature/boil evidence; stone fracture and low capacity |
| Folded leaf/bark vessel | suitable non-toxic flexible sheet, support/binding | fold, seam, stabilize | plant/material identification | short-lived | collection/transport; heating only after tested material route |
| Lined pit/container | clean depression/support + leaf/bark/hide liner | excavate, line, seal | contamination and material fit | stationary | bulk holding/stone heating; cannot transport |
| Organic/skin pouch | prepared suitable hide/organic membrane + seam/binding | clean, scrape, sew/seal, support | hide preparation, hygiene | advanced early survival | flexible transport; heating performance varies; direct food safety must be proven |

### Ruling on coconut shell

The Director’s proposed coconut shell is accepted as a **credible emergency branch** with limits:

- it begins as a cup/collector;
- the survivor must discover or know a stable heating arrangement;
- a direct/coals route and a hot-stone route are distinct patterns;
- the shell’s small volume creates fuel and labor inefficiency;
- cracked, burned-through, overturned, ash-contaminated, and scald outcomes are possible;
- success teaches controlled water heating, not generic Pottery or Metalwork.

## 7.2 Found cookware route

The easiest strong early route is a recognized food vessel salvaged from a boat, ship box, galley compartment, campsite, or sealed cargo.

Required operation:

1. locate and recover the box/compartment;
2. inspect external contamination, corrosion, seal, markings, and contents;
3. stabilize/open without destroying the vessel;
4. identify prior use and material as far as evidence permits;
5. clean with the best available safe-water route;
6. inspect pitting, seams, handles, coating, and residue;
7. leak-test cold;
8. heat-test empty only when appropriate to material—otherwise with water under control;
9. boil a small noncritical batch;
10. cool and inspect odor, residue, deformation, leakage, and surface change;
11. document its safe-use limits.

A found pan accelerates water, cooking, cleaning, medicine, dye, glue, wax, and material experimentation. That is why it is valuable. It remains finite, repairable matter rather than a recipe unlock.

## 7.3 Fired-clay vessel route

```text
locate suitable clay
→ remove debris / prepare temper
→ make forming support and water for hands
→ form walls/base/lip
→ dry slowly and evenly
→ inspect cracks/warping
→ discover controlled firing
→ cool without thermal shock
→ water/leak test
→ gradual heat test
→ first noncritical boil
→ document vessel limits
```

Required ancestors:

- digging/scooping tool;
- clean mixing surface and water;
- forming skill and shape support;
- suitable temper/material knowledge;
- dry protected space;
- controlled fire/kiln relationship;
- fuel and thermal management;
- handling tongs/support;
- patience through irreducible drying/cooling time.

Failures remain physical: slumping, cracking, spalling, leakage, thermal shock, underfiring, contamination, and unstable shape.

## 7.4 Fabricated aircraft-aluminum vessel route

Aircraft sheet is a **late salvage-fabrication branch**, not the normal first boil.

Mandatory gates:

| Gate | Requirement |
|---|---|
| Provenance | identify component location/history; reject fuel tank, hydraulic, fire-damaged, unknown coated, battery-adjacent, or heavily corroded material |
| Isolation | safely detach sheet without sharp tears, mixed sealants, or contamination transfer |
| Surface | remove/avoid paint, primer, adhesive, corrosion products, and unknown coatings without creating new toxic exposure |
| Alloy/workability evidence | test a noncritical coupon for bending, cracking, springback, heat response, and corrosion |
| Pattern/layout | sufficient clean sheet; rim, base, seam, and handle/support geometry |
| Tools | snips/chisel/saw route, files/abrasives, mallet/form, drill/punch, rivet/fold tools, clamps/workholding |
| Joining | folded seam, suitable rivets/fasteners, or another demonstrated food-compatible join; ordinary resin/pitch does not belong on the hot inner surface |
| Stability | flat/supportable base, safe grip or bail, no razor edges, controlled pouring |
| Testing | cold leak, hot-water leak, repeated heat-cycle, residue/odor/surface inspection |
| Use limits | initially freshwater boiling only; avoid acidic/salty storage when material confidence is low |

Possible outputs:

- folded boiling tray;
- riveted/seamed pot;
- kettle body with later spout/lid;
- larger wash/sterilization vessel;
- still boiler only after seals, vapor path, condenser, pressure avoidance, and contamination knowledge.

## 7.5 Water system progression

| Human threshold | Operating capability | Required ancestors | New obligations |
|---|---|---|---|
| W0 — Mouthful | direct rain/coconut water/safe found drink | source recognition | no continuity |
| W1 — Carried water | shell, bottle, pouch, can, or found pan | container cleaning, grip/transport | breakage, spill, contamination |
| W2 — Treated batch | fire + viable vessel + correct process | fuel, heat, timing, cooling | labor/fuel, recontamination |
| W3 — Protected reserve | lid, clean storage, labels, scoop/spout | storage station and hygiene | cleaning schedule, inventory |
| W4 — Rain continuity | catchment, first flush, channel, tank | roof/surface, slope, seal, overflow | storm damage, pests, dry periods |
| W5 — Filter/treatment train | settling + prefilter + tested microbial barrier/disinfection | media preparation, vessel flow, maintenance | replacement, breakthrough, false confidence |
| W6 — Distribution | cistern, hose/pipe, valve, pump, drainage | joining, flow, pressure/leak test | stagnation, leaks, governance |
| W7 — Sanitation/irrigation reserve | separated potable, wash, fire, and crop water | source budgeting and waste separation | cross-connection and contamination risk |
| W8 — Distillation/desalination | boiler, condenser, receiver, heat recovery, materials control | mature thermal/metal/ceramic workspace | large energy cost, salt/scale, volatile contamination |
| W9 — Community utility | multiple sources, monitoring, isolation, spares, standards | archive, trained operators, ownership | rationing, sabotage, maintenance, public health |

---

# 8. Game-complete survival and thriving manufacture atlas

“Complete” means every canonical **capability family** required from arrival through thriving and return. Cosmetic shapes and equivalent substitutions inherit these records; they do not multiply arbitrary recipes. The companion workbook owns the detailed node/edge graph.

## 8.1 Body care, medicine, hygiene, and sanitation

| Capability chain | Source roots | Tool/workspace ancestors | Skill/body dependencies | Later systems fed |
|---|---|---|---|---|
| clean pressure dressing | clean cloth/fiber, safe water, optional antiseptic supply | cutter, clean surface, drying/boiling route | medicine/hygiene, dexterity, composure | wound stabilization, clinic |
| sling and splint | cloth/cord + straight member/padded support | cutter, binding, fit/test | body assessment, knotting, support geometry | mobility, rehabilitation |
| crutch/cane/brace | selected pole/metal tube, grip, padding, fastener | cutter, boring, shaping, bench | gait assessment, construction, dexterity | successor accessibility, work return |
| stretcher/litter | poles/frame + textile/rope | binding/joining, handles, load test | medicine + logistics + teamwork | casualty transport, clinic route |
| handwashing station | treated water container + controlled outlet + catch/drain | vessel, valve/pour, stand | hygiene, water management | food, medicine, illness prevention |
| latrine/waste separation | digging, cover, drainage, distance/site logic | earthwork tools, marking | sanitation/ecology | source protection, community health |
| soap/cleaning agent route | suitable fat/oil + alkali knowledge or found supply | heat vessel, measurement, curing | chemistry/hygiene; burn risk | hands, cloth, clinic, kitchen |
| ORS capability | safe water + correctly measured sugar/salt or sealed sachet | clean vessel, measure, stir, label | medicine, measurement, diagnosis | illness recovery, heat response |
| clinic station | clean/dry enclosure + light + water + storage + bed + records | mature shelter/workbench | medicine, construction, archive | surgery-support limits, quarantine, teaching |

## 8.2 Cutting, percussion, leverage, and workholding

| Capability chain | First route | Mature route | What it opens |
|---|---|---|---|
| cutting edge | natural/shaped stone, shell, found shard | replaceable metal edge, shears, saw | fiber, food, timber, hide, salvage |
| controlled hand cutter | edge + wrap/grip/guard | fitted knife with sheath and maintained bevel | medicine, food, cordage, fine work |
| chopping tool | robust head + prepared haft + fastening/test | axe/adze families, repairable head/handle | bulk timber, boat, shelter |
| striker/mallet/hammer | hammerstone/weighted branch | fitted hammers, punches, rivet tools | stone, joinery, metal, engines |
| wedge/chisel/pry | hard edge/wedge and controlled support | alloy chisels, pry bars, pullers | sealed crates, fasteners, wreck panels |
| boring | thorn/bone/stone awl | bow/hand drill, brace, bits, repaired powered drill | pegs, sewing, rivets, pipes, wiring |
| abrasion/finishing | rough stone/sand | file, plane, grindstone, powered grinder | fit, seals, safe edges, sharpening |
| workholding | forked stick, foot/knee brace, lash jig | bench, clamp, vise, alignment jig | multi-part work, safety, repeatability |
| measurement/layout | body/cord/shadow/water level | gauge, square, level, calipers, scale, templates | structures, boats, engines, radio |

## 8.3 Fire, heat, fuel, and material transformation

| Capability chain | Required matter | Required proof | Feeds |
|---|---|---|---|
| captured flame | existing safe flame + transfer fuel | preserve, move, extinguish | first heat without independent ignition |
| ignition | spark/friction/lens/found device + tinder | repeat under controlled variation | fire pattern |
| sustained hearth | graded tinder/kindling/fuel + airflow + containment | useful heat, smoke/escape, extinguish | warmth, boil, cooking |
| pot support/heat control | stable stones/frame, vessel, distance | no tip, controlled boil, safe handling | water, food, medicine |
| charcoal | selected dry wood, limited oxygen, containment | yield/quality and fire control | filter media, forge, high steady heat |
| kiln/firing | refractory/clay, fuel, draft, loading, cooling | fired test pieces and defect diagnosis | pottery, lime, molds, refractory |
| forge | charcoal/fuel, refractory hearth, air, tongs/anvil/hammer | controllable heat and forged test stock | metal tools, fasteners, repair |
| casting | known metal/alloy, crucible, mold, heat, handling | sound test coupon/component | fittings, pulleys, repair parts |
| stove/oven/smoker | enclosure, draft, rack/vessel, fuel | temperature/time and smoke/fire safety | efficient cooking/preservation |

## 8.4 Containers, cordage, textiles, and storage

| Capability chain | Ancestors | Body/skill | Uses |
|---|---|---|---|
| hand-twisted cord | identified fiber + preparation + twist/splice | dexterity, fiber knowledge | binding, fire drill, carrying |
| rope | longer graded fibers/strands + twisting/laying jig | endurance, consistency, testing | rigging, hoist, boat, rescue |
| knot/fastening set | cord/rope + load-specific geometry | technique evidence | shelters, nets, lifting, sailing |
| mat/basket | prepared strips/fiber + frame/form | dexterity, pattern, repair | bedding, carrying, walls, filters |
| pouch/bag | textile/hide + seam + closure | cutting/sewing, hygiene | inventory, water/food, medicine |
| pack frame/harness | frame + webbing/rope + padding + adjustment | construction, fit, load trials | viable hauling, injury reduction |
| net | cord + gauge/frame + mesh/edge/repair | repeated precise work; ecology knowledge | fishing, carrying, screens |
| sail/canopy | broad textile/panel + seams + reinforced points | textile + load paths + weather | boat, shelter, catchment |
| dry cache | raised/enclosed container + lid + drainage/pest exclusion | storage diagnosis | food, fuel, records, tools |
| chest/lockbox | panels/frame + joints + closure/lock | construction/fabrication | unique components, medicines, archive |

## 8.5 Shelter, sleep, and home

| Capability chain | Minimum assemblies | Proof | New attachment |
|---|---|---|---|
| windbreak | frame/anchors + barrier oriented to actual wind | occupied wind comparison | temporary safe pocket |
| roofed refuge | frame + roof coverage + drainage | rain coverage and egress | dry work/sleep zone |
| raised sleep | support + dry insulation/bedding | ground-loss and stability comparison | useful recovery |
| working hearth exterior/vented | containment, separation, fuel, smoke route | fire/smoke/egress test | sustained warmth/boiling |
| repairable shelter | modular joints, access, stored spares | dismantle/repair test | maintenance not replacement |
| working home | water, storage, kitchen, workshop, clinic edge | integrated daily cycle | expedition anchor |
| resilient house | bracing, shutters, drainage, redundant exits, fire separation | staged storm/fire/local failure | long-term protection |
| legacy compound | archive, Arrival Station, distributed caches/utilities | successor recovery drill | civilization and inheritance |

## 8.6 Food, cooking, preservation, hunting, fishing, and cultivation

| Capability chain | Required ancestors | Knowledge | Failure/ethics |
|---|---|---|---|
| safe forage | container + cutter where needed | species, season, part, preparation, dose | poisoning, ecological depletion |
| fishing line/hook | cord + hook/point + bait/lure + retrieval | water/species/landing | hook injury, lost gear, overharvest |
| fish trap/pot/net | frame/mesh/entrance + marker/retrieval | selectivity and check interval | bycatch, ghost gear |
| spear/bow/harpoon | shaft + point + fastening + balance/test | handling, range, recovery | self-injury, wounded animal, retrieval |
| selective land trap | trigger/restraint/barrier + marker | sign, species, humane dispatch/check | bycatch, injury, unattended suffering |
| clean butchery station | clean surface, water, edge, containers | anatomy, contamination separation | disease, spoilage, cuts |
| cooked meal | safe food + heat + vessel/support | time/temperature/species | undercook, burn, fuel cost |
| drying/smoking/salting | clean cut, rack/chamber, airflow/smoke/salt | weather, thickness, spoilage evidence | false preservation |
| cool storage | shade/earth/evaporation/insulation, later refrigeration | temperature history | hidden spoilage, power dependency |
| garden bed | earthwork + soil knowledge + seed/plant + water | viability, season, pests | water burden, soil depletion |
| compost/soil improvement | separated organic input + aeration/moisture/time | contamination and maturity | pests/pathogens if mismanaged |
| seed continuity | harvest maturity + cleaning + drying + labeled storage | lineage and germination tests | genetic/viability loss |

## 8.7 Water, plumbing, irrigation, and fire reserve

The complete W0–W9 chain in Section 7 governs this family. Additional endpoints:

- gutter and first-flush diverter;
- covered rain tank/cistern;
- hand pump;
- gravity line and shutoff;
- potable/nonpotable separation;
- wash station and drainage;
- irrigation channel/drip route;
- fire-water reserve and bucket/pump line;
- distiller/desalinator;
- community isolation, metering, records, spares, and fallback.

## 8.8 Logistics, lifting, routes, and salvage

| Capability chain | Ancestors | Proof | New scale |
|---|---|---|---|
| sling/shoulder pole | cord/webbing + balanced containers | carry trial | water/food/fuel pairs |
| drag travois/sled | runners/poles + lash + tow point | loaded route/braking | timber, casualty, wreck parts |
| rollers/levers | poles/round stock + fulcrum + chocks | staged movement and hold | heavy hull/engine/beam |
| handcart | frame + axle/wheel/runner + bearings + brake/handle | loaded slope/turn/stop | reliable bulk transport |
| tripod/A-frame | rated members + anchors + rope/cable | proof load and exclusion zone | vertical lift |
| pulley/tackle | rated rope + sheave/block + anchors | mechanical advantage and brake | engine, salvage, construction |
| winch/capstan | drum, bearings, frame, brake, rope/cable | controlled raise/lower | boatyard, dock, wreck |
| dock/landing | piles/anchors, deck, fenders, ladder, drainage | tide/load/reboarding | maritime logistics |
| wreck bracing/access | survey + supports + isolation + cutting/fastening | stability before entry | compartments and modules |
| salvage preservation | clean, label, dry/oil/isolate/package | later functional test | engines, radio, medicine, archive |

## 8.9 Boat, diving, navigation, and sea work

| Capability chain | Required systems | Proof |
|---|---|---|
| flotation aid | buoyant matter + restraint/grip | person-supported water test and release |
| raft | buoyancy + structure + deck/load restraint + paddle/steer | loaded freeboard, steer/stop, reboard, capsize recovery |
| fishing boat B0–B3 | secured wreck → stabilized shell → floating hull → paddled workboat | leak, load, launch/land, reboard, repair |
| sail route | mast/partners + rigging + sail + steering + reef/furl | controlled sheltered-water trials and abort |
| motor route | mount + fuel + lubrication + cooling + electrical + controls + propulsion | bench/mounted tests, safe start/stop, sea trial, manual fallback |
| navigation kit | markers + chart + bearing/time/weather tools | repeated known-route fix and return reserve |
| shore-dive station | line + marker + cutting + exposure + surface support + first aid | abort, entanglement, lost-line, reboarding |
| submerged lift | rated line + float/lift bag + attachment + surface control | test load, controlled ascent, recovery |

## 8.10 Workshop, ceramics, metal, power, and machines

| Capability chain | Early state | Mature state | Endpoint use |
|---|---|---|---|
| field work mat/support | cleared dry surface + supports | bench with clamps/vice | safer assembly |
| measuring set | marked stick/cord/level | square, gauge, scale, calipers, templates | repeatable fit |
| ceramic line | clay preparation/form/dry/fire | kiln, refractory, molds, crucibles | water, food, casting |
| ferrous line | found stock + cold work | forge, heat treatment, fastener/edge making | tools, structure, repair |
| nonferrous line | sorted copper/aluminum/brass | forming, rivet/braze/cast where justified | vessels, conductors, fittings |
| mechanical bench | clean/disassemble/label | pullers, gauges, bearings, seals, alignment | pump, winch, motor |
| electrical test | cell + lamp/continuity relation | meter, fuses, terminals, isolation, protected bench | power, radio, sensors |
| generation | found battery/finite charge | wind/bicycle/water/generator adaptation | light, pump, radio, refrigeration |
| storage/grid | inspected cells + protection + conductors | regulated bank, distribution, fault isolation | utilities and signal |
| automation | jig/fixture/batch | powered machine with guards/maintenance | reduces repetition; creates upkeep |

## 8.11 Communication, archive, return, and legacy

| Capability chain | Material/knowledge ancestry | Qualification |
|---|---|---|
| signal fire/visual marker | fire, fuel, contrast, site, safe control | visible from test location without burning home |
| receiver/listening post | preserved radio core, power, antenna, dry site | identifiable reception and logged conditions |
| directional antenna | conductors, geometry, mast, insulators, bearings | repeatable signal comparison |
| transmitter | oscillator/amplifier/control, power, matched antenna, cooling | controlled transmission and power/fault test |
| authentication package | Human Thread facts, black-box/identity evidence, logs, repeated contact | external party responds to information only castaway/system could provide |
| rescue beacon | signal system + protected power + deployment site + schedule | detected, acknowledged, sustained, recoverable |
| direct-return craft | seaworthy vessel + navigation + stores + repair + proof | staged range and sea-state trials with fallback |
| continuity archive | patterns, samples, tolerances, failures, maps, maintenance, provenance | successor reproduces a representative capability without narrator knowledge |
| Arrival Station | dry shelter, safe water, food, clothing, body care, map, tools, archive | a new body can stabilize without chores or automatic expertise |
| Triangle apparatus | normal instrument + anomaly evidence + protected test route | normal system understood first; remote/reversible tests; truth-ledger compliance |

## 8.12 Graph completeness rule

Every authored node must have:

- at least one source or incoming dependency unless it is a true world source;
- at least one operation;
- at least one test or observation;
- at least one downstream use unless it is a declared endpoint;
- a failure state that transforms matter/state causally;
- maintenance or disposal where relevant;
- a discoverability path;
- a successor-knowledge rule;
- a body/work/time declaration;
- a substitution or recovery plan for critical campaign gates.

The workbook must reject:

- dangling ingredients;
- outputs with no use;
- circular prerequisite sets without a source entry;
- a critical endpoint with one irreplaceable random wreck item;
- a “skill level” used as the only dependency;
- hidden recipe grants from workbench, book, item pickup, or character level;
- an advanced component whose tool ancestry is missing.

---

# 9. Skill, knowledge, body, equipment, and quality binding

## 9.1 The five independent contributors

Every operation resolves:

| Contributor | Answers | Cannot replace |
|---|---|---|
| Body | Can this person supply/control the required force, posture, precision, duration, and recovery today? | knowledge, material, fixture |
| Practical skill | Have their hands performed and diagnosed this operation across relevant variation? | theory, missing tool, safe environment |
| Knowledge | Do they understand the function, principle, hazard, sequence, and test? | demonstrated control |
| Tool/equipment | Can force/heat/measurement/holding be applied credibly and safely? | operator judgment and maintenance |
| Workspace/environment | Can the work be supported, lit, ventilated, cleaned, isolated, dried, heated, or aligned? | material and skill |

## 9.2 Operation difficulty vector

Each operation is rated separately for:

- force;
- endurance/duration;
- precision/tolerance;
- sequencing;
- measurement;
- material variability;
- hazard severity;
- workholding/support;
- environmental sensitivity;
- diagnosis/verification;
- consequence of failure;
- coordination/team requirement.

An “easy” stone edge may have low prior knowledge but real hand and eye hazard. An engine lift may be simple mechanically but high in force, support, crush consequence, and coordination. A radio fault may require little force but high diagnosis and unique-component consequence.

## 9.3 Workmanship output

```text
workmanship
  = material suitability
  × operation control
  × tool/workholding effectiveness
  × readiness
  × environmental suitability
  × verification quality
```

The result stores causes:

- alignment;
- edge/shape consistency;
- joint security;
- seal/leak behavior;
- surface/contamination state;
- heat history;
- known load/temperature limits;
- defects;
- maker/tester evidence;
- maintenance due.

Quality is never a random “Poor/Common/Rare” color detached from matter.

## 9.4 Failure and learning

Failure can:

- consume time/fuel;
- blunt, crack, bend, stretch, scorch, contaminate, misalign, leak, jam, spill, or partly transform matter;
- damage a replaceable sacrificial component;
- create a repairable defect;
- injure the survivor through a readable hazard;
- reveal material, sequence, tolerance, or tool evidence.

Failure may not silently delete a unique component because a hidden roll said “craft failed.”

Learning value depends on:

- a plausible hypothesis;
- novelty or meaningful changed condition;
- observed material response;
- diagnosis;
- responsibility for the critical step;
- comparison to a prior result;
- documentation or later reproduction.

---

# 10. Continuous Human Time constitution

## 10.1 Interpretation of “actual crafting time, no skips”

The governing interpretation is:

> **Crafting is never instant and never completed through a black-screen time jump. The survivor and work remain in the world while time, weather, fire, illness, tide, light, danger, and opportunity advance.**

This does **not** require a player to hold one button for eight literal real-world hours. The game preserves physical duration through a consistent world clock, embodied phases, partial progress, unattended processes, and equipment that legitimately reduces labor.

## 10.2 Five temporal modes

| Mode | Typical real interaction target | Examples | Rules |
|---|---:|---|---|
| Immediate handling | under 2 seconds | pick up, sip, place, open known latch | no fake progress bar; condition still matters |
| Micro-operation | 2–20 seconds | cut a short fiber, add fuel, tie familiar knot, stage object | embodied feedback; cancelable |
| Active task | 20 seconds–5 minutes | shape edge, ignite difficult fire, patch seam, form vessel, inspect engine subsystem | phased, interruptible, partial state retained |
| Long process | minutes to days of game time, mostly unattended | settle water, dry clay, smoke food, cure adhesive, make charcoal, charge battery, grow crop | exists in world; requires conditions/maintenance/checks |
| Major project | hours to seasons across sessions/lives | shelter, kiln, fishing boat, water network, transmitter, legacy house | decomposed into useful tested subassemblies |

## 10.3 Clock seed for testing

Recommended prototype seed—not permanent tuning:

- awake world rate: **20 simulated seconds per real second**;
- one game hour: **3 real minutes**;
- one full day: **72 real minutes**;
- first-ever crash start placed so readable first-night pressure begins after the required onboarding/survival window;
- solo sleep acceleration: target roughly **45–90 real seconds for a stable 7–9 hour sleep**, with bounded simulation and interrupts;
- dangerous, fragmented, or short sleep may take less real time because the survivor wakes early.

The existing 36:1 prototype clock and 75-second onset of night pressure remain rejected as a final balance. v0.14’s 150–180-second first-pressure band remains a **minimum vertical-slice tutorial target**, not the mature campaign’s final day rhythm.

## 10.4 Representative task-time seeds

| Task | Game-time seed | Active/unattended structure |
|---|---:|---|
| clean/open coconut vessel | 5–15 min | mostly active |
| heat small emergency water batch | 10–30 min | prepare actively; watch/manage while nearby work remains possible |
| boil found-pan batch | 10–25 min plus cooling | fire/vessel setup + managed process; cooling unattended |
| make first sharp stone edge | 5–20 min | active and feedback-rich |
| make safe handled cutter | 20–60 min | prepare subassemblies, bind/seat, test |
| twist useful short cord | 10–30 min | active early; jig/batch later |
| form small clay pot | 30–90 min active | drying hours/days unattended; firing/cooling managed |
| build truthful first refuge | 2–5 h total work | many carry/cut/place/test phases; useful before perfect |
| prepare one fuel load | 10–30 min | gather/split/dry/grade; drying may be long |
| fabricate aluminum boiling tray/pot | 3–12 h across phases | survey, detach, clean, coupon, form, join, test |
| repair boat hull section | 4–20 h per operation | dry, clean, fit, seal/fasten, cure, leak-test |
| engine subsystem restoration | days/weeks | diagnose, preserve, bench work, parts, mounted test, sea trial |

Exact times must be tested for fun. The relationship—ancestry, active body time, waiting, and interruption—cannot be removed for convenience.

## 10.5 Productive parallelism

The player should be able to:

- heat water while preparing dry storage nearby;
- let sediment settle while collecting fuel;
- dry clay while repairing a roof;
- smoke food while maintaining airflow and doing camp work;
- soak fiber while exploring;
- charge a battery while rationing other loads;
- cure a boat seam while documenting and preparing the next panel.

This makes time planning enjoyable rather than making the player stare at bars.

## 10.6 Mastery and labor compression

Mastery may:

- reduce corrective strokes and failed starts;
- improve staging and material yield;
- allow safe batching;
- use templates/jigs;
- delegate known routine work;
- use a treadle, motor, wind/water power, or specialized machine;
- maintain multiple unattended processes reliably.

It may not:

- turn a first unknown manufacture into a one-click craft;
- remove drying, curing, cooling, growth, or chemical time;
- make unique diagnosis automatic;
- let a player safely abandon active heat, pressure, lifting, or unstable wreck work without controls.

## 10.7 Sleep acceleration

Before sleep, provide a **Rest Read** and a clock forecast:

- thermal trend and wetness;
- expected fire/coals duration;
- pain/illness interruption risk;
- thirst and likely wake need;
- tide/weather/security evidence;
- active processes that may finish, fail, burn, overflow, or require attention;
- earliest safe wake alarm the survivor can establish.

During sleep, the simulation advances in bounded steps. It must interrupt for:

- worsening thermal/respiratory danger while the survivor can respond;
- severe vomiting/diarrhea/dehydration evidence;
- fire/smoke/structural threat;
- tide/flooding;
- animal/human intrusion;
- a deliberately set alarm or watched process;
- pain or bodily need exceeding the current sleep depth threshold.

Sleep acceleration is a solo-first feature. Community Island multiplayer later requires shared clock authority. The server may accelerate only under a defined consensus/safe-state rule; one sleeping player may not fast-forward other active people.

---

# 11. Player-facing UI and feedback

## 11.1 Backpack remains three tabs

The backpack contains only:

- **Inventory** — carried matter and access zones;
- **Vitals** — present body state, trend, dominant causes, impairment, and treatment evidence;
- **Skills** — practical domains, body-capacity trends, demonstrated techniques, and known limits.

There is no global Craft or Build button.

## 11.2 Vitals presentation

The six primary states remain readable, but the body view explains cause:

```text
THIRST — worsening
Main causes: repeated diarrhea, heat, low intake
Effect now: stamina returns slowly; dizziness when rising
Useful response: treated fluid, shade/rest, measured rehydration if known
Danger evidence: unable to keep fluid down, confusion, collapse
```

Do not show an invisible infection countdown. Show evidence as it becomes perceivable.

## 11.3 Skills and capacities

Skills tab distinguishes:

- **Practical skill:** what operations the hands have demonstrated;
- **Knowledge:** principles/hazards carried in the survivor’s mind and physical records;
- **Body capacity:** improving, maintained, strained, recovering, or declining;
- **Material familiarity:** what variation has been observed;
- **Pattern confidence:** hypothesis, crude, demonstrated, proven, refined, documented.

Examples of felt progress notes:

- “The Water Run leaves more reserve than it did six days ago.”
- “This pack sits badly; strength will not correct the low hanging load.”
- “Your right-hand cuts are steady until the fingers cool.”
- “You can sustain the paddle rhythm longer, but reboarding still exhausts you.”
- “The stomach illness is easing; dehydration debt remains.”

## 11.4 Combining and manufacture

World-surface interaction remains:

1. state a need or choose a placed material;
2. inspect available affordances;
3. stage up to the currently controllable active relations;
4. choose/apply an operation;
5. position/support/tension/heat/strike/measure;
6. observe response;
7. inspect/test;
8. continue, repair, abandon, repurpose, or document.

The two-position beginning remains. Prepared subassemblies may occupy one position. Additional relations require workholding and demonstrated coordination—not a magical Crafting level.

## 11.5 Accessibility

- reduced motion never removes mechanical state;
- hold-to-work has toggle/alternate input;
- repetitive mastered actions may use assisted rhythm without changing outcome rules;
- color is never the only contamination, quality, or body cue;
- illness presentation can be discreet without becoming invisible;
- fine placement uses generous functional snap and explicit confirmation;
- mobile input never requires drag outside the gameplay frame;
- interruption/cancel/resume and safe undo are always available where physically credible.

---

# 12. Technical authoring model

## 12.1 Castaway body record

```yaml
castaway_body:
  stable:
    stature_m: 1.74
    body_mass_kg: 72
    age_band: adult
    dominant_hand: right
    reach_band: medium
    prior_activity_evidence: [recreational_walking, basic_swimming]
  capacities:
    strength: 0.46
    endurance: 0.42
    load_tolerance: 0.34
    mobility: 0.58
    balance: 0.51
    dexterity: 0.55
    grip_endurance: 0.41
    water_confidence: 0.43
    heat_acclimatization: 0.24
    composure: 0.47
  readiness:
    stamina: 0.42
    hydration: 0.68
    energy: 0.55
    thermal_core_trend: cooling
    sleep_debt: 0.38
    recovery_debt: 0.22
  burdens:
    - {id: bruised_ribs, location: torso, severity: mild, restrictions: [overhead_force, deep_breath]}
    - {id: contaminated_cut, location: right_hand, severity: minor, restrictions: [grip, clean_work]}
```

## 12.2 Activity request and resolved output

```yaml
activity_request:
  activity: carry_water_home
  duration_s: 420
  route: pond_to_refuge_sand_slope
  load:
    mass_kg: 12
    bulk_m3: 0.018
    balance: asymmetric
    hands_occupied: 2
  equipment: improvised_yoke_v1
  chosen_pace: conservative

activity_result:
  distance_m: 430
  elapsed_s: 480
  stamina_delta: -0.31
  hydration_pressure: 0.08
  thermal_delta: heat_gain
  local_fatigue: [shoulders, feet]
  gait_instability_events: 3
  work_output: delivered_10_8_l
  learning: [packing, yoke_fit, route]
  adaptation_candidate: [endurance, load_tolerance]
  recovery_required_h: 8
  warnings: [right_shoulder_hotspot]
```

## 12.3 Water lot and exposure

```yaml
water_lot:
  id: pond_north_004_lot_031
  source: north_pond
  collected_at: 12:40
  volume_l: 4.0
  evidence: [stagnant, animal_tracks, moderate_turbidity]
  hazards:
    microbial: high_unknown
    salt: low
    chemical: unknown_low
    algal_toxin: no_visible_bloom_not_proven_absent
  treatments:
    - {operation: cloth_prefilter, completed: true}
    - {operation: rolling_boil, completed: false}
  container: coconut_shell_02
  storage: open

exposure:
  castaway: survivor_001
  water_lot: pond_north_004_lot_031
  use: drank
  volume_l: 0.45
  time: 12:52
  incubation_seed: server_owned
```

## 12.4 Manufacture node

```yaml
manufacture_node:
  id: aluminum_boiling_vessel_v1
  purpose: microbial_water_treatment
  dependencies:
    sources: [qualified_clean_aluminum_sheet]
    processed: [deburred_sheet, suitable_rivets_or_folded_seam]
    tools: [metal_cutting, file, forming_mallet, punch_or_drill, clamp]
    workspace: [salvage_bench]
    knowledge: [food_contact_provenance, sheet_forming, seam, heat_safety]
    practical_evidence: [coupon_bend, cold_leak_test, heat_cycle_test]
    body: {force: moderate, dexterity: high, endurance: moderate}
    environment: [clean_surface, ventilation, fresh_test_water]
  time:
    active_min: 300
    passive_min: 60
  failure_modes: [cracked_fold, sharp_edge, leaking_seam, coating_residue, distortion]
  qualification: [stable, leak_free, no_residue_or_odor, repeat_heat_cycle]
  pattern_entry: demonstrated_only_after_useful_safe_test
```

## 12.5 Clock state

```yaml
world_clock:
  awake_scale: 20.0
  mode: awake
  sleep_scale: 360.0
  max_sim_step_game_minutes: 5
  active_processes: [fire_07, water_boiling_02, clay_drying_04]
  interrupt_rules: [thermal_danger, smoke, flood, illness_crisis, alarm, threat]
```

## 12.6 Determinism and authority

- server/local simulation authority owns elapsed time, exposure seeds, illness progression, adaptation, item state, and process completion;
- a client reports intent and input, never its own XP, time worked, pathogen outcome, or quality;
- offline reconciliation may advance stable unattended processes but may not kill a survivor during uncertain technical state;
- sleep acceleration uses the same resolver at larger bounded steps;
- every state transition remains explainable from stored cause records;
- performance models are tuning tools, not clinical diagnosis claims.

---

# 13. Production gates

## Gate BW0 — RT0/v0.1.2 physical acceptance

No v2.6 breadth enters production until current movement, look, collection, inventory, making, placement, save/reload, mobile layout, pointer recovery, and camera comfort pass on real Director hardware.

## Gate BW1 — Felt Body Lab

Implement one castaway, one flat route, one sand/slope route, four load configurations, one foot impairment, and one sleep-debt state.

Pass when blind testers distinguish:

- unloaded versus working versus overload;
- balanced pack versus awkward hand load;
- rested versus sleep-deprived;
- healthy gait versus foot impairment;
- improvement after a controlled capacity change without being shown numbers.

## Gate BW2 — Recovery and adaptation lab

Run the same Water Run across controlled days with productive workload, overload, adequate recovery, and inadequate recovery.

Pass when:

- technique improves before physiology;
- recovered productive work produces modest measurable adaptation;
- overload produces worse next-day readiness and higher injury risk;
- identical easy repetition saturates;
- growth is felt but does not make mass irrelevant.

## Gate BW3 — Pond Exposure and Visible Illness

Implement one pond, treated/untreated lots, exposure records, delayed acute GI syndrome, hydration consequences, symptom feedback, supportive care, and recovery.

Pass when a tester can explain:

- what likely caused the illness;
- why it did not appear instantly;
- which functions changed;
- why clean fluids/ORS/rest help;
- why boiling the next water does not cure the existing illness.

## Gate BW4 — Three-vessel Water Lab

Implement:

1. coconut shell emergency batch;
2. found pan recovery/clean/leak/boil route;
3. fired-clay vessel route.

Aircraft-aluminum fabrication remains out until these prove fun and legible.

Pass when every route has a distinct advantage, labor cost, failure, proof, and knowledge result.

## Gate BW5 — Empty-book Water Run

Begin with no water recipe. Give source evidence, materials, fire opportunity, and recoverable experimentation.

Pass when most new players form at least two plausible containment/treatment hypotheses without a wiki and complete one safe batch through evidence.

## Gate BW6 — Machine-testable survival graph

Import the canonical nodes/edges into game data and run audits for sources, reachability, cycles, missing tools, missing body/time declarations, dangling outputs, and single-source critical failure.

## Gate BW7 — Continuous time and sleep

Implement active work, partial progress, one unattended process, one heat process, and accelerated sleep with interrupts.

Pass when:

- world threats/time continue during work;
- cancel/resume preserves physical state;
- the player can do useful nearby work while a safe process runs;
- sleep cannot raise Warmth under non-positive heat;
- a dangerous trend wakes the capable survivor;
- no process completes because the UI merely closed.

## Gate BW8 — Water continuity and sanitation

Add rain catchment, first flush, protected storage, handwashing, waste/source separation, and a simple maintenance failure.

## Gate BW9 — Advanced fabrication representative

Only after BW0–BW8 pass, implement one qualified aircraft-sheet non-food use and one advanced boiling-vessel fabrication path.

Pass when the player understands why most wreck sheet is rejected from food contact and why the accepted piece required specific evidence.

## Gate BW10 — Controlled survival-family expansion

Expand one representative chain at a time. No broad catalogue is approved until its core verb, body coupling, time, failure, maintenance, and successor evidence pass.

---

# 14. Acceptance constitution

## 14.1 Physical condition

Pass only if:

- different castaways feel bodily different without being better/worse tiers;
- walking speed, acceleration, balance, breath, stamina recovery, and tool control respond consistently;
- carry, lift, drag, hold, climb, swim, and hoist are distinct;
- injury affects relevant body functions rather than a global damage multiplier;
- illness affects play before Health collapse;
- adaptation requires meaningful work and recovery;
- excessive workload can cause breakdown;
- the same route proves improvement;
- accessibility can reduce camera motion without hiding state.

## 14.2 Water

Pass only if:

- pond use records an exposure and later symptom path;
- treatment claims remain hazard-specific;
- boiling kills the modeled microbial threat but does not desalinate or remove modeled chemicals;
- contaminated/unknown wreck runoff can remain unsafe after boiling;
- treated water can be recontaminated through handling/storage;
- source, container, treatment, and storage all affect outcome;
- no invisible Dirty Water debuff is the only feedback;
- a novice can discover one basic safe route without external lookup;
- no early campaign is lost solely because a random pan failed to spawn.

## 14.3 Crafting/manufacture

Pass only if:

- every item has a graph record;
- found objects do not grant reproduction patterns;
- the pattern book starts empty;
- body, skill, knowledge, tool, workspace, material, time, and proof are separate;
- work changes matter physically;
- failure leaves evidence and conserved consequences;
- quality stores causes and limits;
- critical endpoints have substitution/recovery routes;
- advanced tools expose ancestry;
- mastered repetition becomes less input-heavy without becoming zero-time magic.

## 14.4 Time and sleep

Pass only if:

- active work advances the entire world;
- long processes persist and can be inspected;
- major projects retain partial state across save/load/death;
- sleep acceleration runs the same simulation;
- danger can interrupt sleep;
- no healthy eight-hour sleep is guaranteed merely because a bed was selected;
- real-time work is engaging rather than prolonged button holding;
- background processes create planning, not appointment anxiety.

## 14.5 Automatic failure conditions

The design fails if any of the following ships:

- Strength directly raises a universal carry-slot number with no gait/route consequences;
- walking gives endless Stamina XP regardless of challenge/recovery;
- a heavier pack is always optimal training;
- disease appears only as an unexplained icon or Health drain;
- untreated pond water causes immediate generic poison every time;
- boiled seawater becomes drinkable;
- boiling removes fuel, metals, or unknown chemical contamination;
- a coconut shell behaves like an indestructible large pot;
- any aircraft panel can become cookware after one Craft command;
- a found pan teaches metal-vessel fabrication;
- Workbench placement unlocks water or tool recipes;
- a craft finishes while the world is paused;
- sleep skips fire, tide, illness, weather, or attack simulation;
- a player must watch an unattended process without other meaningful work;
- a rare random wreck item is the only way to complete the first safe-water loop;
- the body changes numerically but blind testers cannot feel it.

---

# 15. Director-level rulings closed by v2.6

1. Physical conditions were present but incomplete; v2.6 now owns their performance and felt-change layer.
2. The first castaway does not begin at 100% and later castaways receive different fair body profiles.
3. Walking speed and carrying change through body, condition, load, terrain, equipment, and route—not one stat.
4. Walking can improve economy/endurance only when challenging enough and recovered.
5. Loaded walking can improve load tolerance/endurance and sometimes strength, but also raises heat, thirst, energy, foot/shoulder stress, fall risk, and delayed nutrition.
6. Pond-water illness is delayed, causal, visible, and functionally meaningful.
7. Boiling is the default early microbial solution but not a universal purification operation.
8. Coconut shell is an accepted emergency vessel route with limited capacity and real heat/control failures.
9. A found pan is a powerful early shortcut that must be recovered, identified, cleaned, inspected, and tested.
10. Fired clay is the first reliable fully reproducible high-capacity vessel route where suitable clay exists.
11. Aircraft-aluminum cookware is advanced, evidence-gated fabrication; most wreck sheet is better used elsewhere.
12. Treated water needs cooling, protected storage, clean handling, and maintenance.
13. Every survival and thriving capability belongs to the machine-testable manufacture graph.
14. Crafting has no black-screen completion; active and passive time are distinct.
15. Sleep time accelerates only by simulating the whole world faster and interrupting on danger.
16. The player’s growth must be visible in repeated routes and tasks, not only UI numbers.

---

# 16. Final governing identity

THE FIRST NIGHT should not feel like a healthy avatar spending meters to buy recipes.

It should feel like this:

- a hurt person stands differently after the crash;
- the first walk home with water is slow, awkward, and costly;
- days later the same road is known, the pack is better, breathing settles sooner, and more reserve remains;
- a drink from the pond seems harmless until the body tells a delayed story;
- the player remembers the source, checks the journal, and understands what the illness is doing;
- fire becomes useful only when water can be held;
- a coconut shell makes one precious hot batch;
- a recovered pan changes the entire camp;
- clay makes the capability reproducible;
- salvage sheet becomes a vessel only after civilization has rebuilt the tools, judgment, cleanliness, and proof required to trust it;
- every tool opens a material, every material creates a new operation, every operation develops a person, and every person leaves something the next stranger can use;
- work takes time, but time becomes planning rather than waiting;
- sleep moves the night faster without forgiving bad shelter, bad water, a dying fire, or a worsening body;
- strength, endurance, skill, knowledge, equipment, and home all matter because none can impersonate the others.

The signature is:

> **Let the first container be small enough to matter. Let the first illness arrive late enough to be understood. Let the first heavy road teach logistics before strength. Let every improvement return to the player’s hands, breath, balance, time, and choices. Civilization is not a menu of objects. It is the growing ability of vulnerable bodies to make reliable relationships survive them.**

---

# Research and precedent references

## Human performance and recovery

- [Mechanics and energetics of load carriage during human walking](https://pmc.ncbi.nlm.nih.gov/articles/PMC3922835/)
- [NIOSH Revised Lifting Equation](https://www.cdc.gov/niosh/ergonomics/about/RNLE.html)
- [U.S. Army quantitative physiology: predicting human limits](https://medcoe.army.mil/pfw-images/borden/mil-quantitative-physiology/QPchapter01.pdf)
- [ACSM updated resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/)
- [Effect of sleep deprivation on reaction time and performance](https://pmc.ncbi.nlm.nih.gov/articles/PMC3307962/)
- [NIOSH heat-acclimation decay and reacclimation](https://stacks.cdc.gov/view/cdc/218351)

## Water, illness, and rehydration

- [WHO drinking-water fact sheet](https://www.who.int/news-room/fact-sheets/detail/drinking-water)
- [EPA emergency disinfection of drinking water](https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water)
- [WHO household water treatment and safe storage](https://iris.who.int/bitstream/handle/10665/206916/9789290616153_eng.pdf)
- [CDC Travelers’ Diarrhea incubation guidance](https://www.cdc.gov/yellow-book/hcp/preparing-international-travelers/travelers-diarrhea.html)
- [WHO diarrhoeal disease and dehydration signs](https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease)
- [WHO cholera and emergency ORS guidance](https://www.who.int/news-room/questions-and-answers/item/cholera-outbreaks)

## Vessels, cookware, and materials

- [When Did Humans Learn to Boil?](https://paleoanthro.org/media/journal/content/PA20150054.pdf)
- [Experimental study of wet-cooking in organic vessels](https://eprints.whiterose.ac.uk/id/eprint/203677/1/s12520_023_01843_z.pdf)
- [Health Canada: safe use of cookware and bakeware](https://www.canada.ca/en/health-canada/services/household-products/safe-use-cookware.html)
- [FDA: lead in food and foodwares](https://www.fda.gov/food/environmental-contaminants-food/lead-food-and-foodwares)
- [NACA/NASA: weathering of aircraft aluminum alloy sheet](https://ntrs.nasa.gov/citations/19930091564)

## Game-system precedents

- [Death Stranding Director’s Cut cargo and balance guide](https://www.kojimaproductions.jp/en/death-stranding-directors-cut-beginners-guide)
- [Vintage Story crafting](https://wiki.vintagestory.at/Crafting)
- [Vintage Story time model](https://wiki.vintagestory.at/Time)
- [Project Zomboid surface crafting](https://projectzomboid.com/blog/news/2024/02/leapdoid/)
- [Project Zomboid Build 42 crafting direction](https://projectzomboid.com/blog/upcoming-features-b42/)
- [UnReal World pausable long crafts](https://www.unrealworld.fi/forums/index.php?topic=7269.0)

