/**
 * TUNE — every tunable number in The First Night lives here, and only here.
 * Ops v1.3 §5 law 2: no magic numbers in code; the cycle log's TUNE ledger mirrors this file.
 *
 * Rows marked C01 were introduced by Cycle 01 "First Fire"; C01+ were added by C2 during
 * that build; C02 by the 3D pivot, "Boots on Sand".
 *
 * **Units changed at C02.** The 2D body measured space in screen pixels; the 3D body
 * measures it in **metres**. The brain never knew the difference — it only ever asked for
 * a distance on a plane — which is why `/src/brain` and `/tests` are byte-identical across
 * the pivot (D-030). Spatial constants below were re-expressed, not re-invented.
 */

export const TUNE = {
    // ---- The clock (one clock, online and offline) -------------------------
    /** [TUNE] C01 — one full game day per this many real minutes. 1 game hour = 2.5 real minutes. */
    dayLengthRealMinutes: 60,
    /** [TUNE] C01+ — hours in a game day. Real days have 24; kept explicit so the clock has no literals. */
    gameHoursPerDay: 24,
    /** [TUNE] C01+ — the crash lands you at dusk. Game hour-of-day the run starts on. */
    startHourOfDay: 18,
    /** [TUNE] C01+ — night begins at this hour-of-day (inclusive). */
    nightStartHour: 18,
    /** [TUNE] C01+ — night ends / day begins at this hour-of-day (inclusive). 12-hour night. */
    dayStartHour: 6,

    // ---- Warmth ------------------------------------------------------------
    /** [TUNE] C01 — full warmth. */
    warmthMax: 100,
    /** [TUNE] C01 — warmth lost per game hour, at night, outside a lit fire's radius.
     *  Without fire you bottom out ~8 game hours into a 12-hour night — fire is priority #1. */
    warmthDrainPerGameHourNight: 12,
    /** [TUNE] C01 — warmth regained per game hour inside a lit fire's radius (replaces the drain). */
    warmthRegenPerGameHourAtFire: 30,
    /** [TUNE] C01+ — offline fairness floor (charter §II.10 / D-011): an absence may sting but may
     *  never bottom you out. Absences that qualify for a morning report stop at this warmth. */
    warmthOfflineFloor: 15,
    /** [TUNE] C01+ — at or below this warmth the HUD reads "freezing" and the world desaturates. */
    warmthLowThreshold: 30,

    // ---- Wood --------------------------------------------------------------
    /** [TUNE] C01 — loose driftwood: instant tap pickup, the first reward in seconds. */
    driftwoodTapYield: 1,
    /** [TUNE] C01 — real seconds of tap-hold to salvage a deadfall. */
    deadfallHoldSeconds: 1.5,
    /** [TUNE] C01 — wood per completed deadfall hold (min). */
    deadfallYieldMin: 2,
    /** [TUNE] C01 — wood per completed deadfall hold (max). */
    deadfallYieldMax: 3,

    // ---- Fire --------------------------------------------------------------
    /** [TUNE] C01 — wood cost to build a campfire. */
    woodPerFire: 5,
    /** [TUNE] C01 — game hours of burn per unit of wood. 5 wood ≈ 10 game hours ≈ most of one night. */
    fireBurnGameHoursPerWood: 2,
    /** [TUNE] C01+ · **metres at C02** (was 140 screen px) — radius of the fire's warmth and
     *  light. Inside it, warmth recovers. Sized so the fire is a place you stand, not a pixel. */
    fireWarmthRadius: 7,
    /** [TUNE] C01+ — maximum wood a single fire can hold, so the pit can't be turned into a silo. */
    fireMaxFuel: 12,

    // ---- Reach and aim (metres at C02) -------------------------------------
    /** [TUNE] C01+ · **metres at C02** (was 74 px) — how close you must stand to take wood. */
    interactRadius: 2.6,
    /** [TUNE] C01+ · **metres at C02** (was 34 px) — forgiveness around a node when the tap ray
     *  misses the mesh. A difficulty number, not a decoration (D-026). */
    nodeTapSlack: 0.9,
    /** [TUNE] C01+ · **metres at C02** (was 40 px) — how close a tap must land to the fire to feed it. */
    /**
     * [TUNE] THE PIT AS IT IS ACTUALLY DRAWN — `firePit` is a cylinder of this radius, and it
     * is the ONLY pickable part of the fire. Lives here rather than in `entities.ts` so the
     * interaction boundary and the mesh cannot drift apart: `fireReachM` derives from it, and
     * the renderer builds the cylinder from it. One number, one fire.
     */
    firePitRadius: 0.75,
    /**
     * [TUNE] Finger allowance BEYOND the reachable floor — see `fireReachM`, which is where
     * the real boundary is computed. Deliberately small: the pit is a 1.5 m saucer, and every
     * metre of allowance past it is a metre of open ground where a hold means the fire.
     */
    fireTapSlackM: 0.35,
    /** [TUNE] C02 — how far in front of you the fire is laid, in metres. In 2D the fire
     *  was built "at your spot"; in 3D that puts you standing in the flames, so it goes
     *  down an arm's length ahead — and the firelight becomes somewhere you step into. */
    fireBuildOffsetM: 1.7,

    // ---- Collision and gesture (C03; moved from the body at the C03 audit, D-038) -----
    /** [TUNE] C03+ — the castaway's collision radius, in metres. Governs how close you can
     *  get to a trunk or a rock — a reachability number, so it belongs here (D-026's rule). */
    playerCollisionRadius: 0.4,

    /** [TUNE] Slice 1 — the unified collision fix. Below this fraction of the REQUESTED speed,
     *  the part of the request running along the surface counts as "nothing survived": the
     *  contact was dead-on, and the mover DEFLECTS along the surface instead of stopping.
     *  A circle approached head-on has exactly zero tangential component, so without this the
     *  mover pins — the one cause behind the movement hard-block, the shelter pin, and the
     *  quarry/storage approach stall. Raise it and glancing blows start deflecting too.
     *
     *  Measured against the REQUEST, not the current velocity (the press trace, C1's ruling).
     *  For the first fifth of a second after any fresh press the velocity is the accelerator
     *  still catching up — it points somewhere neither the old motion nor the new request
     *  does, and judging it there read a dead-on press as 31 deg glancing. The fraction is
     *  unchanged, because against a steady velocity the two readings agree; they diverge only
     *  on the transient, which is exactly where the old one was wrong. */
    /** [TUNE] Slice 2B Stage A — domain understanding at or above which a demonstrated
     *  recipe counts as UNDERSTOOD on the six-state ladder (D-086). Above this, execution is
     *  reliable by shaping (b); below it, grade variance is legal but arbitrary failure is
     *  never. Not a difficulty dial so much as the line between repeating and explaining. */
    ladderUnderstoodAt: 60,
    /** [TUNE] Slice 2B Stage A — how many DISTINCT material kinds a survivor must be carrying
     *  before "somewhere to put this down" becomes a felt need. Kinds rather than mass: the
     *  annoyance that suggests storage is juggling several things, not carrying one heavy one. */
    discoveryStorageKinds: 3,
    /** [TUNE] Try-Combine's arity, matching the crafting spec's own "two to four inputs".
     *  The old hard pair was the discovery PROBE's arity, never the spec's — and it left
     *  `storage` and `stonehammer` unreachable, because wood+stone always resolved to the
     *  shelter. See `resolveRecipe`. */
    /** [TUNE] How long a float-text message stays up, in ms — the SHARED source for every
     *  one of them: what a gather yielded, what a combination produced, what was crafted.
     *  Was a hardcoded 900 ms on a 900 ms fade-throughout animation, so nothing was ever
     *  fully opaque for more than a fraction of it. The director could not read the outcome
     *  of a combination, and separately could not read the yield at the big stone node —
     *  one mechanism, one complaint, one fix. */
    floatTextMs: 2200,

    //  ---- LAW 118: THE HEAT BALANCE (Bible v2.4) ---------------------------------------
    //  Sleep has NO direct positive warmth term. These are the live inputs that replaced it.
    //
    //  CALIBRATED TO REPRODUCE THE SHIPPED AWAKE RATES EXACTLY, so the only behaviour this
    //  law changes is the one it is about. A fed, dry, awake survivor in daylight nets ZERO
    //  (metabolic exactly offsets the baseline loss); at night outdoors, -12; under a crude
    //  roof, -6.6; beside a fire at night, +30. Those are the shipped numbers, and the first
    //  night's pacing rests on them. What changes is sleep, which now runs this balance like
    //  everything else instead of setting a floor under it.
    /** [TUNE] Heat a fed, working body makes per game hour. */
    thermalMetabolicBase: 5.0,
    /** [TUNE] A sleeping body's effort multiplier — the LOWEST of any state. This is the
     *  honest replacement for the deleted sleep bonus, and it points DOWNWARD: an
     *  unprotected night is worse asleep than awake, which is the physical truth the old
     *  `Math.max` refused to say. */
    thermalRestingActivity: 0.55,
    /** [TUNE] What a starving body can still generate, as a fraction. Cold and hunger
     *  compound rather than merely coexisting. */
    thermalStarvedMetabolicFloor: 0.35,
    /** [TUNE] Baseline body-to-air loss, which a fed awake body exactly cancels — this is
     *  what makes a mild day net zero without giving metabolism a free ride. */
    thermalBaselineLoss: 5.0,
    /** [TUNE] What a clear night takes, before any roof. With wind (3) this sums to the
     *  shipped 12 outdoors, and a crude roof reduces BOTH — which is what keeps F3's
     *  certified 45% intact. */
    thermalNightLoss: 9,
    /** [TUNE] A fire you are beside. 42 rather than 30 because it is now ADDITIVE against the
     *  night loss it has to overcome: 42 - 12 = the shipped +30 at night, and a fire in mild
     *  air is worth more, which is physically right and was not expressible before. */
    thermalFireGain: 42,
    /** [TUNE] ...and the same fire in a sealed space. Scenario five: warmth can rise past
     *  comfortable into heat strain, because more warmth is not automatically better. */
    thermalEnclosedFireMultiplier: 1.9,
    /** [TUNE] Wind, at night and unsheltered. There is no wind model yet, so it applies where
     *  it actually bites: an open night. A roof is not a windbreak, and the two stay separate
     *  because a lean-to open to the weather is the case being slept through. */
    thermalWindLoss: 3.0,
    /** [TUNE] Conduction into what you are lying on — ONLY while lying on it. Applying this
     *  to someone standing up was my own first error here: a walking survivor is not losing
     *  heat through their whole back. Bare ground takes more than the wind does. */
    thermalGroundLossBare: 4.0,
    thermalGroundLossCover: 2.0,
    thermalGroundLossBedding: 0.6,
    /** [TUNE] Evaporative loss at maximum wetness, as its OWN additive term. The shipped
     *  model multiplied the outdoor night drain, so being wet cost nothing under a roof or
     *  beside a fire — Law 118 wants the real thing, and wet costs you everywhere. */
    thermalWetLoss: 6.0,
    /** [TUNE] How much clothing blunts passive loss, and wind specifically. Never wetness. */
    thermalClothingInsulation: 0.45,
    thermalClothingWindShield: 0.6,
    /** [TUNE] The comfort band and its two costly ends (§12: overheating matters too). */
    thermalHypothermicAt: 12,
    thermalComfortLow: 45,
    thermalComfortHigh: 82,
    thermalHeatStrainAt: 95,
    //  ---- LAW 128: a failed attempt transforms matter (Slice 2C) ----------------------
    /** [TUNE] Wear one failed attempt puts on the material it actually stressed. */
    /** [TUNE] §9.6 — how far a new anchor must sit from anything already standing. The site
     *  IS the decision, so the world has to be able to refuse a site; without a spacing rule
     *  every placement is legal and "where" stops meaning anything. */
    constructionMinSpacingM: 4,
    matterWearPerFailure: 1,
    /** [TUNE] Wear a unit will take before it finally goes. THREE failures, not one: loss
     *  must be earned and announced, never a hidden roll deleting a rare part (§11 names
     *  that as an automatic whole-game failure condition). */
    matterWearPerUnit: 3,
    /** [TUNE] Fraction of the threshold at which the survivor is warned plainly. */
    matterNearlySpentAt: 0.66,
    combineMinInputs: 2,
    combineMaxInputs: 4,

    //  ---- SESSION 1, BOUNDARY 3: the workspace ladder (§6.1, Law 220) -------------------
    //
    //  LAW 220 IS THE WHOLE OF THIS BLOCK: *"W0 begins with two active relations because the
    //  body can stabilize only so much. Added surfaces, clamps, pegs, jigs, and fixtures
    //  expand controlled relations. Experience alone does not create extra invisible hands."*
    //  `combineMaxInputs` above is the CEILING the ladder climbs toward (W2's "four to six"),
    //  never the number a bare-handed survivor gets — which it silently was until this slice,
    //  because the gate the law describes had never been built.
    /** [TUNE] §6.1 W0 — what two hands can hold steady with no work surface at all. */
    relationsAtW0: 2,
    /** [TUNE] §6.1 W2 — "four to six relations; repeatable fit". The bench keeps a rung above
     *  the mat so the ladder still climbs and framing one is still worth doing. */
    relationsAtBench: 4,
    /**
     * [TUNE] A LAID MAT NOW HOLDS THREE — REVISED after a fourth report of the axe being
     * unmakeable, and this is a reading change rather than a rule bent to suit a complaint.
     *
     * §6.1's W0 row is "mat, flat stone, stump, **body bracing**" — a list of things a
     * survivor IMPROVISES with when they have built nothing at all. That is the bare state.
     * A deliberately sited, pegged work mat is not that: it is a surface someone chose a
     * place for and put down, which is what W1's "stable support" describes. Law 220's own
     * sentence is the authority and it is explicit about the mechanism — *"**Added surfaces**,
     * clamps, pegs, jigs, and fixtures expand controlled relations"* — and a laid mat is an
     * added surface before it is anything else. The v2.8 module table's `woven work mat,
     * Relations added = 0` is a line about a W0 MODULE, not about a placed workspace.
     *
     * WHAT THE OLD READING COST, measured rather than asserted: the axe is three loose parts,
     * so it needed the bench; the bench needs six timber; and felling trees for timber wants
     * the axe. The director hit it with two wood and a blade in hand — holding exactly the
     * right materials for the axe, standing on his own work surface, correctly refused. A
     * gate that is right four times running and reads as broken every time is a gate whose
     * reading is wrong, not a player who keeps making the same mistake.
     */
    relationsAtMat: 3,
    /** [TUNE] The mat: fibre woven over flat stone (§6.1's own W0 forms, `mat` + `flat stone`). */
    workmatFiberCost: 3,
    workmatStoneCost: 2,
    /** [TUNE] The bench: timber, pegged. Canon's own input list is `R-WOOD + P-CORD + T-AXE +
     *  T-HAMMER`, and the AXE is deliberately dropped from it here — the axe is a three-slot
     *  recipe, so requiring one to build the thing that grants the third slot is a genuine
     *  cycle (canon has it too: `W-BENCH -> P-PLANK -> T-SAW -> W-BENCH`, which the graph
     *  audit does not catch). v2.8 §9.2's own escape hatch is "split log/slab **or lashed
     *  poles**", so the bench is built from timber driven together with the hammer. */
    workbenchWoodCost: 6,
    /** [TUNE] How much joint slack ONE bench-assisted combine puts into the frame. Per USE,
     *  never per hour — Law 181 forbids a universal repair meter, and a use-driven number is
     *  also what makes this D-011-safe by construction rather than by a check. */
    benchJointWearPerUse: 0.08,
    /** [TUNE] Re-tensioning the joints: cord, and the survivor's own hands. */
    benchRetensionFiberCost: 1,
    /** [TUNE] How close the survivor must stand for the bench to be holding their work. */
    /** [TUNE] Raised 3 -> 4. Three metres is inside the mat's own footprint plus a stride,
     *  and 'standing over it' should not be a precision task — the reach question was raised
     *  directly this round, and a metre of forgiveness costs nothing a player can exploit. */
    workspaceReachM: 4,
    workspaceCollisionRadius: 0.8,

    //  ---- Slice 2B Stage B (§12, §15) --------------------------------------------------
    /** [TUNE] Where the eight long-term capacities start. Never zero: a castaway who has
     *  survived a plane crash and swum ashore is not a person with no body. */
    capacityInnateFloor: 10,
    /** [TUNE] One recoverable, meaningful bout of work. Small on purpose — capacities are
     *  the two-months-here difference, and a number that moves fast is a stat, not a body. */
    capacityGainPerBout: 0.4,
    /** [TUNE] The two band edges the growth panel reads. FOUR bands, not ten: a player must
     *  be able to feel the difference between two adjacent ones, and eleven shades of
     *  "slightly stronger" is a number wearing a word. */
    standingStrongerAt: 40,
    standingPractisedAt: 70,
    /** [TUNE] Stamina's ceiling at zero endurance, and at full. §12: stamina is a current
     *  RESERVE and endurance is the capacity that shapes it — this is that relationship. */
    staminaCeilingBase: 60,
    staminaCeilingMax: 100,
    /** [TUNE] §15 — the body leg and the knowledge leg of a crossed capability. Both must
     *  clear, and neither substitutes for the other; that is the whole section. */
    crossCapacityThreshold: 40,
    crossUnderstandingThreshold: 40,
    /** [TUNE] What crossing buys: mechanical advantage, bounded. §15 is explicit that
     *  reasoning never REPLACES force — it changes where the force is applied — so this is
     *  a discount on raw effort, never a route around it. */
    crossLeverageMultiplier: 0.65,

    //  ---- The confidence / recency layer -----------------------------------------------
    /** [TUNE] How rusty hands can ever get. WELL above zero, deliberately: a survivor who
     *  once built a shelter is never again someone who has never built one. The worst case
     *  is slower, never helpless — rust, not amnesia. */
    confidenceFloor: 0.55,
    /** [TUNE] Days of not doing a thing before rust starts at all. Taking a week off is not
     *  a mistake the game should tax. */
    confidenceGraceGameHours: 72,
    /** [TUNE] How long past the grace period until confidence reaches the floor. */
    confidenceHalfLifeGameHours: 240,
    /** [TUNE] The most a rusty first attempt can cost, as a time multiplier. It costs TIME
     *  and nothing else — never a failure, never a worse object. */
    confidenceMaxTimePenalty: 1.6,
    /** [TUNE] Below this, say so before the player commits. */
    confidenceRustyBelow: 0.85,

    // ---- Bible v2.3 §13 — the workload formula and its channels (Slice 2B Stage B) ----
    //  Every activity declares its own factors; these are the per-unit rates the single
    //  workload number is routed through. §14 forbids authoring an activity as
    //  "-5 food, +2 strength", so nothing here is a per-action constant — they are rates.
    /** [TUNE] §13 — stamina drawn per unit of workload. The seconds-to-minutes reserve. */
    workStaminaPerUnit: 6,
    /** [TUNE] §13 — hydration lost per unit, before the heat multiplier. Sweat and breath. */
    workHydrationPerUnit: 4,
    /** [TUNE] §13 — alertness spent and recovery debt accrued per unit. NOT stamina. */
    workEnergyPerUnit: 2.5,
    /** [TUNE] §13 — nutrition DEBT accrued per unit. Delayed and accumulated: this becomes
     *  hunger later, and is never an instant per-swing subtraction. */
    workNutritionDebtPerUnit: 1.8,
    /** [TUNE] §13 — metabolic heat produced per unit of work. */
    workThermalGainPerUnit: 1.2,

    /** [TUNE] §13 — carried-load zone boundaries, as a fraction of the individual's own
     *  capacity. Ratios, never a universal kg cap: the same mass is a different zone for a
     *  different castaway on a different route. */
    loadZoneFreeAt: 0.2,
    loadZoneWorkingAt: 0.5,
    loadZoneTrainingAt: 0.75,
    loadZoneOverloadAt: 1.0,
    /** [TUNE] §13 — how much harder the same act is in each zone. */
    loadZoneEffortMultiplier: {
        free: 1.0, working: 1.25, 'training-heavy': 1.6,
        'operational-overload': 2.2, immovable: 3.5,
    } as Record<'free' | 'working' | 'training-heavy' | 'operational-overload' | 'immovable', number>,

    /** [TUNE] §13 walking — base demand of putting one foot in front of the other. Low: on
     *  level ground unloaded walking drains little stamina, by the director's explicit rule. */
    walkBaseDemand: 0.8,
    /** [TUNE] §13 walking — a walk trains endurance only when it is a MEANINGFUL stimulus
     *  relative to what this body can already do. Expressed as distance over current
     *  capacity, so the same stroll that trains a newcomer is a rest day for a walker. */
    walkStimulusFraction: 0.6,
    slideDeflectThreshold: 0.35,
    /** [TUNE] Slice 1 — how close the mover must stay to a surface, in metres, to still count
     *  as sliding along it for the purpose of remembering WHICH WAY.
     *
     *  Contact means penetration, and a mover coasting along a curved surface leaves it by
     *  millimetres — the press trace measured 2.5 cm — which ends "contact" while the castaway
     *  is still, in every sense a player would recognise, leaning on the thing. The direction
     *  memory was gated on contact, so it was wiped every time the stick was released, and
     *  each fresh press re-picked a side. That is the second half of the feel court's wobble.
     *
     *  Sized to the phenomenon, and measured rather than guessed: the largest excursion seen
     *  on a real device press is 8.2 cm, so 10 cm carries it with about 18% to spare.
     *
     *  It is a DISTANCE, deliberately, not a timer. An earlier draft of this comment claimed a
     *  mover walking away clears it "within a single frame at walking pace" — that was simply
     *  false and C3 caught it: one frame at walking pace is 5.8 cm, LESS than the band, and a
     *  mover that has to reverse 3.5 -> -3.5 m/s at `moveAccelMps2` first takes 23 frames
     *  (383 ms) to get clear. The correct argument is the geometric one: to inherit a stale
     *  direction you must come within 10 cm of another surface, and two surfaces that close
     *  together ARE a notch — which is the one case where committing to a direction is the
     *  behaviour we want anyway. */
    slideMemoryGapM: 0.1,
    /** [TUNE] Slice 1 — fraction of the incoming speed kept while sliding along a surface.
     *  Not 1.0: pressing into a wall should cost something, or the wall reads as a conveyor. */
    slideRetention: 0.72,
    /** [TUNE] C03+ — collision footprints, in metres, for the things you cannot walk through. */
    treeCollisionRadius: 0.8,
    rockCollisionRadius: 1.1,
    palmCollisionRadius: 0.5,
    crashboxCollisionRadius: 0.9,
    fireCollisionRadius: 0.9,
    /** [TUNE] D-051 — the quarry's footprint: a real landmark, wider than any single rock.
     *  Bounded above by `interactRadiusM` (below): `quarryCollisionRadius + playerCollisionRadius`
     *  must clear it, or the player's own collision push-out puts them permanently out of
     *  interact range — a real bug this cycle's harness caught (2.4 + 0.4 = 2.8 > 2.5, so a
     *  mining tap could arm a hold but the in-range check cancelled it every frame; the
     *  quarry was silently un-minable at any collision-legal standing distance). */
    quarryCollisionRadius: 1.6,
    /** [TUNE] C03+ — footprint multiplier for the decorative treeline/rock instances. */
    decorTreeCollisionRadius: 0.7,
    decorRockCollisionScale: 1.4,
    /** [TUNE] C03+ — a press this short and this still (screen px) is a tap, not a look-drag. */
    tapMaxMs: 320,
    tapMaxMovePx: 14,

    // ---- Feel: camera, movement, interaction (C04 — D-040…D-042) -----------
    /** [TUNE] C04 — reach for a direct-world interaction (tap the thing to use it, D-042). */
    interactRadiusM: 2.5,
    /** [TUNE] C04 — how fast the camera catches up to the player each frame (0..1). Damped
     *  follow — the camera glides after you instead of being welded to you (D-040 #1). */
    cameraFollowLerp: 0.12,
    /** [TUNE] C04 — how fast yaw/pitch chase the drag target (0..1). Smoothed look, no snap. */
    cameraLookSmoothing: 0.15,
    /** [TUNE] C04 — how fast the castaway turns to face travel, as a slerp rate (per second). */
    turnSlerpSpeed: 10,
    /** [TUNE] C04 — acceleration and deceleration on foot, m/s². No instant velocity. */
    moveAccelMps2: 14,
    /** [TUNE] C04 — jank budget: p95 frame time (ms) through a scripted move-and-orbit (A3). */
    frameTimeP95BudgetMs: 33,
    /** [TUNE] C04 — portrait shows a rotate-to-landscape prompt; the game plays sideways (D-041). */
    rotatePromptEnabled: true,
    /** [TUNE] C04 — shortest camera boom (m): how close the camera may be pulled when a trunk
     *  or a rise would otherwise clip or occlude the player. */
    cameraMinBoomM: 1.4,
    /** [TUNE] C04 — minimum real-ms between auto-sips while standing in the pond: one tap is a
     *  gulp, loitering tops you up. Governs how fast you rehydrate at the water. */
    pondSipMinIntervalMs: 600,

    // ---- Movement and camera (C02) -----------------------------------------
    /** [TUNE] C02 — metres per second on foot. */
    walkSpeedMps: 3.5,
    /** [TUNE] C02 — close third-person camera distance, in metres. */
    cameraDistanceM: 6,
    /** [TUNE] C02, raised C04 PERFECT pass (2026-07-23) — drag-to-orbit multiplier, 1.0 -> 1.35
     *  for a quicker camera turn. Persisted setting (readSensitivity() falls back to this). */
    lookSensitivity: 1.35,
    /** [TUNE] C02 — horizontal field of view, in radians. Horizontal-fixed so the view
     *  does not narrow on a tall phone screen. */
    cameraFovHorizontalRad: 1.05,
    /** [TUNE] C02 — camera height above the player's feet, in metres. */
    cameraHeightM: 2.1,
    /** [TUNE] C02 — how far above the horizon the camera may be pitched, in degrees. */
    cameraPitchMaxDeg: 62,
    /** [TUNE] C02 — how far below the horizon the camera may be pitched, in degrees. */
    cameraPitchMinDeg: -12,
    /** [TUNE] C02 — how fast the player turns to face the direction of travel, in degrees/second. */
    turnRateDegPerSecond: 620,

    // ---- Onboarding & feel -------------------------------------------------
    /** [TUNE] C01 — seconds of inactivity (or repeated failure) before one contextual hint appears. */
    idleHintSeconds: 10,
    /** [TUNE] C01+ — seconds a contextual hint stays on screen. */
    hintVisibleSeconds: 6,
    /** [TUNE] C01+ — virtual joystick radius in screen pixels (thumb travel for full speed).
     *  Screen space on purpose: a thumb is a thumb whatever the world is measured in. */
    joystickRadius: 78,
    /** [TUNE] C01+ — joystick deadzone as a fraction of its radius. */
    joystickDeadzone: 0.18,

    // ---- Performance budget (C02) ------------------------------------------
    /** [TUNE] C02 — cold-load ceiling on 4G, in seconds. */
    coldLoadBudgetSeconds: 8,
    /** [TUNE] C02 — median FPS floor on the director's device. Below this after a dedicated
     *  optimization pass, the Godot native hatch (D-028) triggers a fork. */
    fpsFloorMedian: 30,

    // ---- Vitals (C03) — the island makes demands ---------------------------
    /** [TUNE] C03 — full thirst. */
    thirstMax: 100,
    /** [TUNE] C03 — thirst lost per game hour. ~3 game-days to empty (Rule of Threes). */
    thirstDrainPerGameHour: 1.4,
    /** [TUNE] C03 — full hunger. */
    hungerMax: 100,
    /** [TUNE] C03 — hunger lost per game hour. ~7 game-days to empty; the slow pressure. */
    hungerDrainPerGameHour: 0.6,
    /** [TUNE] C03 — full health. */
    healthMax: 100,
    /** [TUNE] C03 — health lost per game hour for EACH empty vital (thirst or hunger at 0). Stacks. */
    healthDrainPerGameHourPerEmptyVital: 5,
    /** [TUNE] C03 — health lost per game hour while warmth is at 0. Adds to the stack. */
    warmthEmptyHealthDrainPerGameHour: 6,
    /** [TUNE] P0-3 — how close a tap must land to a dropped stack to mean THAT stack.
     *  Tight on purpose: a pile is a small thing at your feet, and a generous radius would let
     *  an abandoned bundle swallow taps meant for the sand around it. */
    droppedTapRadiusM: 1.2,
    /** [TUNE] C03+ — health recovered per game hour, ONLINE only, while no vital is empty.
     *  Recovery preserves momentum (§I.18 rule 3): a crisis survived is a crisis you climb out of. */
    healthRegenPerGameHour: 4,

    /** [TUNE] C03+ — at or below these, the HUD bar reads "low" and a hint nudges the player.
     *  One threshold per vital, so the bar's own cue and the hint system always agree (D-038). */
    thirstLowHintAt: 35,
    hungerLowHintAt: 30,
    healthLowHintAt: 30,

    /** [TUNE] C03 — D-011 offline floors: absence drifts these here and stops. */
    thirstOfflineFloor: 10,
    hungerOfflineFloor: 10,
    /** [TUNE] C03 — D-011 offline floor for health. Offline death is IMPOSSIBLE (property-tested). */
    healthOfflineFloor: 25,

    // ---- THE CRASH-ARRIVAL PROFILE (Slice 3, Laws 115-117) -------------------------------
    //
    //  Every arrival — the first life and every successor — lands here. NEVER six full bars,
    //  never a random roll. The six fractions below are DERIVED from the shipped drain rates
    //  and the length of the first night, and the derivation is checked by measurement rather
    //  than trusted: `tests/arrival.test.ts` runs a real 12-hour night through `reconcile`
    //  from this profile and asserts the envelope both ways (no fire -> critical but alive;
    //  fire -> comfortable). If a drain rate above ever changes, that test fails here, which
    //  is the entire point of deriving instead of picking.
    //
    //  A note on why full bars were always wrong: a castaway who washes ashore at 100% has
    //  not survived anything, and the first night has to be a night you SURVIVED. The profile
    //  is where the story and the simulation say the same thing.
    /** [TUNE] Slice 3 — warmth on arrival. Basis: at `warmthDrainPerGameHourNight` (12/h)
     *  this empties ~3.75h into a 12h night, leaving ~8h of `warmthEmptyHealthDrainPerGameHour`
     *  to eat into the arrival injury. That is what makes fire the first night's real task
     *  rather than a nicety — from full warmth, doing nothing at all is survivable. */
    arrivalWarmthFraction: 0.45,
    /** [TUNE] Slice 3 — soaked from the water. Drives the wet-multiplied warmth loss above,
     *  and is the one condition the player can act on immediately (get out of the wind, get
     *  dry by a fire) — which is why arrival is wet rather than merely cold. */
    arrivalWetFraction: 0.6,
    /** [TUNE] Slice 3 — thirst on arrival. Basis: `thirstLowHintAt` (35) plus ~8h of
     *  `thirstDrainPerGameHour` (1.4) = 46.2. So thirst crosses into the visible "low" state
     *  during the night — legible and actionable, the pond being reachable — and reaches dawn
     *  near 28: a first job for the morning, never a first-night death. */
    arrivalThirstFraction: 0.45,
    /** [TUNE] Slice 3 — hunger on arrival. Basis: comfortably above `hungerLowHintAt` (30)
     *  plus a night's `hungerDrainPerGameHour` (7.2), so the first night carries NO hunger
     *  pressure. Hunger is the slow one (~7 game-days) and the first night has enough to say
     *  without it; arriving visibly not-full is the whole of its job here. */
    arrivalHungerFraction: 0.6,
    /** [TUNE] Slice 3 — energy on arrival. Basis: one night's passive drain is 24
     *  (`energyDrainPerGameHour` x 12), leaving ~36 for the night's necessary work — a fire
     *  and the wood for it. Winded, in other words: able to work, not able to work carelessly. */
    arrivalEnergyFraction: 0.6,
    /** [TUNE] Slice 3 — the arrival injury. The most load-bearing of the six. Basis: it is
     *  the buffer the warmth-empty health drain eats through on a failed night. High enough
     *  to stay clear of `healthLowHintAt` (30) on arrival — a permanent alarm state is
     *  cruelty, not authorship — and low enough that a night with no fire ends in the danger
     *  zone rather than mildly inconvenienced. It heals at `healthRegenPerGameHour` once the
     *  crisis is past, so it shapes the first night and then lets go. */
    arrivalHealthFraction: 0.65,

    // ---- DROP 1: THE BOAR ----------------------------------------------------------------
    //  The island's first predator. Every number here is a fair-challenge number before it is
    //  a difficulty number: the telegraph durations exist so a player who reads them lives.
    /** [TUNE] Drop 1 — how many boars live on the island. FIXED at world birth, never added
     *  to; there is no spawner and no wave. Three sits mid-range of the 2-4 band so the
     *  forest has presence without the island becoming a hunting ground. */
    boarPopulation: 3,
    /** [TUNE] Drop 1 — the inland ring they live on. Basis: `WALKABLE_RADIUS` is 108 and the
     *  survivor lands at the shore; 55 puts them squarely inland — far enough that a first
     *  night contains no predator, near enough that the forest is theirs and you know it. */
    boarRingRadiusM: 55,
    /** [TUNE] Drop 1 — phase offset so the ring does not place one boar due north of spawn,
     *  which would make the first walk inland a scripted encounter. */
    boarRingPhase: 0.7,
    /** [TUNE] Drop 1 — sight range. Basis: comfortably beyond `interactRadiusM` (2.5) and
     *  beyond the fire's `fireWarmthRadius` (7), so a boar sees you before you are in reach
     *  of anything — being noticed must precede being threatened. */
    boarSightRangeM: 22,
    /** [TUNE] Drop 1 — half-angle of the sight cone, radians (~50 deg each side). Wide
     *  enough to be a real threat, narrow enough that circling behind it genuinely works —
     *  which is what makes "break line of sight" an answer rather than a slogan. */
    boarSightHalfAngleRad: 0.9,
    /** [TUNE] Drop 1 — hearing, which ignores facing entirely. Deliberately shorter than
     *  sight: you can be heard before you are seen only when close, so sneaking is about
     *  staying out of the cone rather than about silence, which this game does not model. */
    boarHearingRadiusM: 12,
    /** [TUNE] Drop 1 — close enough that nothing else matters. Basis: `interactRadiusM`
     *  (2.5) doubled — if you can nearly touch it, it knows. */
    boarProximityRadiusM: 5,
    /** [TUNE] Drop 1 — game hours from alert to warning. Basis: `dayLengthRealMinutes` makes
     *  one game hour 150 real seconds, so 0.02 is ~3 real seconds — long enough to notice
     *  the head come up and back away, short enough to feel like it decided. */
    boarAlertToWarningGameHours: 0.02,
    /** [TUNE] Drop 1 — THE TELEGRAPH. The single most important number in the drop: how long
     *  the snort and ground-paw last before the charge commits. ~4.5 real seconds. That is
     *  the window the fair-challenge contract promises, and it is why a charge that connects
     *  is a charge you did not read. */
    boarWarningGameHours: 0.03,
    /** [TUNE] Drop 1 — how long a committed charge runs. ~2 real seconds: fast, final, and
     *  over. A long charge would let it re-aim in practice even if the code says otherwise. */
    boarChargeGameHours: 0.013,
    /** [TUNE] Drop 1 — spent, and briefly harmless. ~4.5 real seconds to get clear or to
     *  close in with the spear; the counter-attack window is real and it is short. */
    boarAftermathGameHours: 0.03,
    /** [TUNE] Drop 1 — an unbothered boar forgets you. ~15 real seconds of not being noticed
     *  and it goes back to rooting; walking away is genuinely an answer. */
    boarLoseInterestGameHours: 0.1,
    /** [TUNE] Drop 1 — how far a charge travels. Basis: `boarProximityRadiusM` (5) plus the
     *  run-up, so it covers the ground a survivor at warning range is standing on. */
    boarChargeReachM: 9,
    /** [TUNE] Drop 1 — the CORRIDOR a charge hits, not a radius. A line, so stepping aside
     *  works; a radius would make the sidestep worthless and the telegraph a lie. Basis:
     *  roughly a boar's own width plus the survivor's `playerCollisionRadius`. */
    boarChargeHitCorridorM: 1.3,
    /** [TUNE] Drop 1 — health a connected charge takes. Basis: the arrival profile lands at
     *  65 health, so a full connect costs about a quarter of a fresh castaway and three of
     *  them kill — a predator that is lethal by accumulation, never a one-shot. HARM ONLY;
     *  the injury profile (bleed/limp/pain) is Drop 2's and is deliberately not here. */
    //  RAISED 16 -> 28 (item 6, this batch). The comment above still holds — lethal by
    //  ACCUMULATION, never a one-shot — and 28 keeps that: a survivor at full health survives
    //  three connects and dies on the fourth, where 16 took SEVEN and read as a scratch. The
    //  director's report was that a charge cost a minor tick rather than a real portion of
    //  health; 28% of `healthMax` is a portion you feel and can still walk away from once.
    boarChargeDamage: 28,
    /** [TUNE] Drop 1 — how far a connect throws you. Enough to be a real interruption and to
     *  read as impact, not enough to fling a survivor into the sea. */
    boarKnockbackM: 3,
    /** [TUNE] Drop 1 — a lit fire or torch within this radius de-escalates. Basis: inherits
     *  `fireWarmthRadius` (7) — the light you are warmed by is the light it will not enter,
     *  and two radii would eventually disagree on screen. */
    boarFireDeterRadiusM: 7,
    /** [TUNE] Drop 1 — beyond this the boar is not drawn at all. The standing perf rail:
     *  this is the first genuinely new render-heavy entity type since the collision-model
     *  work. Basis: comfortably past `boarSightRangeM` (22), so a boar that can see you is
     *  always one you can see back — being able to be threatened by something off-screen
     *  would break the perceivability half of the fair-challenge contract. */
    boarRenderRadiusM: 34,
    /** [TUNE] Drop 1 FIX — idle wander speed, m per game hour. Basis: a rooting boar covers
     *  its territory slowly; this crosses `boarWanderRadiusM` in roughly an hour of game
     *  time, which reads as "living there" rather than "patrolling". */
    /** [TUNE] Drop 1 FIX — the boar's solid body. Basis: sits between
     *  `decorTreeCollisionRadius` and the shelter's — a boar is a big animal you cannot walk
     *  through, and matching a tree's feel is right because that is the collision the player
     *  has already learned. Push-out only: the charge delivers its own knockback, and a
     *  second shove on top of it would read as the world fighting you. */
    /** [TUNE] The frame rate `slideRetention` is expressed at. Basis: 60 Hz, the rate every
     *  shipped movement number was measured and tuned at — so at 60 fps the normalisation is
     *  exactly 1 and nothing moves. It exists so the retention is a decay per SECOND rather
     *  than per FRAME, which is what it always claimed to be. */
    slideRetentionReferenceHz: 60,
    // ---- DROP 2: INJURY -------------------------------------------------------------------
    /** [TUNE] Drop 2 — bleeding severity from one full-damage charge. Units are severity, and
     *  `injuryBleedHealthPerGameHour` prices them. One clean hit leaves you bleeding but not
     *  in a spiral; two stack toward the cap, which is what makes disengaging correct. */
    injuryBleedFromCharge: 0.6,
    /** [TUNE] Drop 2 — the cap. Bleeding cannot stack past this however many times you are
     *  hit, so a bad fight is survivable if you break away and bind it. */
    injuryBleedMax: 1.5,
    /** [TUNE] Drop 2 — health per game hour at severity 1. Basis: `healthRegenPerGameHour`
     *  (4) — bleeding at full severity slightly OUTPACES natural recovery, so it is a real
     *  clock and not a nuisance, but a light bleed loses to a resting body. */
    injuryBleedHealthPerGameHour: 5,
    /** [TUNE] Drop 2 — severity clotted per game hour untreated. Basis: a full-severity bleed
     *  stops on its own in ~5 game hours, having cost roughly 12 health. Dangerous, not a
     *  death sentence — the survivor must be able to simply avoid an animal without fibre
     *  becoming a hard requirement for surviving it. */
    injuryBleedClotPerGameHour: 0.3,
    /** [TUNE] Drop 2 — fibre to bind a wound. Cheap on purpose: the decision is whether to
     *  stop and do it under pressure, not whether you can afford it. */
    injuryBindFiberCost: 1,

    // ---- DROP 3, THE MEDICINE SLICE ----------------------------------------------------
    //  Every number below is derived from a shipped one, per the tune law. The anchor is
    //  `healthRegenPerGameHour` (4) throughout, the same anchor bleeding priced itself
    //  against, so the two condition systems sit on one scale rather than two.

    /** [TUNE] Severity ceiling. 1.0 so severity reads as a fraction and
     *  `illnessImpairmentShare` needs no rescaling — the resolver's impairment terms are all
     *  0..1 shares and this joins them as one. */
    illnessSeverityMax: 1,
    /** [TUNE] Rung 2 of 5. Basis: a fifth of the range, so the pure-telegraph band
     *  (`unsettled`) is wide enough to be noticed and acted on before `ailing`. */
    illnessAilingAt: 0.2,
    /** [TUNE] Rung 3 → 4, AND THE FAIR-CHALLENGE LINE: health starts moving here. Basis: 45%
     *  of the range, so nearly half of an illness is spent being warned rather than harmed.
     *  Two full rungs of plain-language notice before the first point of health is lost. */
    illnessFeverishAt: 0.45,
    /** [TUNE] Rung 5. Basis: the top quarter is the grave band. */
    illnessGraveAt: 0.75,
    /** [TUNE] Health per game hour at full severity. Basis: `healthRegenPerGameHour` (4) —
     *  set just BELOW it, unlike `injuryBleedHealthPerGameHour` (5) which sits just above.
     *  A bleed outruns a resting body; a fever does not. Illness is the slow one: it wears
     *  you down over a night, and a survivor who stops and rests is genuinely winning. */
    illnessHealthPerGameHour: 3.5,
    /** [TUNE] P0-D — the slowest a fever ever makes a body walk, as a fraction of normal pace,
     *  reached only at full severity. Basis: `swimSpentSpeedMultiplier` and
     *  `diveFumblingSpeedMultiplier`, which are BOTH 0.55 — the two constants this game already
     *  uses for "a body still working, at its limit". A fever belongs in that company rather
     *  than with `loadOverloadSpeedFloor` (0.35), which is a crushing 200 kg and a harsher
     *  sentence than being ill should pass. Well above zero on purpose: a survivor must always
     *  be able to reach the fire, the shelter and the remedy that fix them, so this slows a run
     *  down and never quietly ends one. */
    illnessSlowestMultiplier: 0.55,
    /** [TUNE] Severity shed per game hour awake. Basis: an untreated illness runs its course
     *  in ~14 game hours, a little over one night — long enough to reshape a day's plans,
     *  short enough that it is an event and not a condition you live with. */
    illnessRecoveryPerGameHour: 0.07,
    /** [TUNE] How much resting multiplies recovery, scaled by sleep quality. Basis: a proper
     *  sheltered sleep (quality 1) makes recovery 3x, so a full night genuinely answers an
     *  illness; sleeping rough (`groundSleepRecoveryMultiplier`, 0.55) gives ~2.1x, which is
     *  help but visibly worse. The gap IS item 4 — one rest model, two outcomes. */
    illnessRestRecoveryBonus: 2,
    /** [TUNE] The floor an absence eases the worst cases to. Basis: `illnessFeverishAt`
     *  (0.45) minus a margin — a survivor who closes the game at death's door does not open
     *  it there, and lands just below the line where illness costs anything. D-011 in a
     *  number: never worse, never fatal, and deliberately NOT a cure. */
    illnessOfflineCeiling: 0.4,

    // ---- Drop 3 Part 2: the vulnerability map and the cave ----
    /** [TUNE] The cave answers wind almost fully. Basis: stone across the entrance's flank —
     *  0.9 rather than 1.0 because an open mouth still funnels, and because a refuge with no
     *  weakness on a threat gives the map nothing to say about it. */
    caveWindAnswered: 0.9,
    /** [TUNE] Rain, fully. Basis: stone does not leak, and this is the one threat where a cave
     *  is unambiguously better than anything buildable at this tier — it is why you would move. */
    caveRainAnswered: 1.0,
    /** [TUNE] Cold, well but short of the best built shelter. Basis: 0.6 sits between `crude`
     *  (0.45) and `refined` (0.65) — a cave is a windbreak and a heat sink at once, so it beats
     *  the first thing you can build and loses to a shelter you worked for. */
    caveColdAnswered: 0.6,
    /** [TUNE] NEGATIVE, and the reason the map exists. Basis: -0.5 makes bare cave floor cost
     *  1.5x open ground (4.0 -> 6.0/game-hour), so moving in without bedding trades a windy
     *  night for a colder back. Dry bedding (0.6 base) still fixes it, at 0.9 — the survivor's
     *  existing answer keeps working, which is what stops this being a punishment. */
    caveGroundDampAnswered: -0.5,
    /** [TUNE] How close the survivor must be to a cave mouth to be sheltering in it, metres.
     *  Basis: mirrors `shelterRadiusM` so "am I inside" reads the same for both refuges. */
    caveShelterRadiusM: 3.0,
    /** [TUNE] The bluff's solid footprint, metres. Basis: 4.2 against a 9.6 m base, offset
     *  BACK from the mouth so the opening stays walkable — a radius covering the whole mass
     *  would wall the survivor out of the only place they are trying to get into, which is
     *  the quarry's own unminable-at-any-legal-distance defect (D-051) wearing new geometry. */
    caveCollisionRadiusM: 4.2,
    /** [TUNE] The bluff's collider RING — how far each block sits from the cave's centre.
     *  Basis: the bluff's base is 9.6 m across (radius 4.8); a ring at 3.6 with blocks of
     *  1.6 puts their outer edge at 5.2, just proud of the rock, and their inner edge at 2.0,
     *  which leaves the mouth's own recess clear. */
    caveWallRingRadiusM: 3.6,
    /** [TUNE] How many blocks make the wall. Eight at 45 degrees, with a 3.6 m ring and 1.6 m
     *  blocks, puts neighbouring centres 2.76 m apart against a 3.2 m reach — they OVERLAP,
     *  which is what makes it a wall rather than a picket fence. `ringIsContinuous` checks it. */
    caveWallBlocks: 8,
    /** [TUNE] Each block's radius, metres. See the ring radius above for the arithmetic. */
    caveWallBlockRadiusM: 1.6,
    /** [TUNE] Half-width of the DOORWAY, in radians, centred on the mouth's own bearing.
     *  Basis: 0.62 rad (~35 deg) drops exactly the one block facing the mouth and leaves a
     *  ~1.9 m gap between its neighbours' edges — wider than the survivor and narrower than
     *  the 3.2 m mouth, so the opening reads as the opening and the rock reads as rock. */
    caveMouthOpenHalfAngleRad: 0.62,

    // ---- Drop 3 Part 2 item 3: the LDOE placement bar ----
    /** [TUNE] Property 3 — "I can tell if a spot is good from a reasonable distance." Metres at
     *  which a site must already be readable. Basis: 12 m is roughly two shelter-lengths and
     *  comfortably beyond `interactRadiusM`, so the bar is only met if the read genuinely does
     *  NOT require walking there. The director set the property; this number is C2's and is
     *  the first thing to move at playtest. */
    placementReadableFromM: 12.0,
    /** [TUNE] Floor of the resistance ladder — how vulnerable a survivor in perfect condition
     *  still is. Basis: 0.25, so being well-rested, warm, whole and fed cuts onset to a
     *  quarter but never to zero. The charter's own line: highly capable, never immune. */
    illnessBaseSusceptibility: 0.25,
    /** [TUNE] Converts an exposure magnitude into severity. Basis: one full-strength cause
     *  (`exposure` 1) on a perfectly-conditioned survivor lands at 0.25 * 0.5 = 0.125 —
     *  inside `unsettled`, the free warning band. You always get told first. */
    illnessOnsetScale: 0.5,
    /** [TUNE] How wet counts as wet enough to chill you. Basis: over half of `wetMax`,
     *  so a light splash is not an illness risk and a night in the rain is. */
    wetIllnessThreshold: 55,
    /** [TUNE] Exposure per game hour spent hypothermic AND wet. Basis: ~4 game hours of
     *  it to cross into `ailing` on an average body — a bad night, not a bad minute. */
    chillExposurePerGameHour: 0.22,
    /** [TUNE] Fatigue at which the body starts losing the argument. Basis: the severe
     *  fatigue band — the stage the survivor is already being told about in words. */
    fatigueIllnessThreshold: 75,
    /** [TUNE] Exposure per game hour at or past that threshold. Basis: deliberately
     *  gentler than a chill — running yourself down is a slower way to get sick than
     *  sleeping in a storm, and it takes most of a day to reach `ailing`. */
    exhaustionExposurePerGameHour: 0.09,
    /** [TUNE] Exposure from one drink of untreated pond water. Basis: a single sip on a
     *  well-conditioned survivor stays inside the free warning band; drinking it all day
     *  while cold and tired is what actually makes you ill. */
    badWaterExposurePerDrink: 0.30,
    /** [TUNE] Exposure from eating spoiled matter. Basis: sharper than water — you can
     *  see that it has turned, so eating it anyway is a real decision. */
    spoiledFoodExposure: 0.55,
    /** [TUNE] Fibre for one remedy. Basis: `injuryBindFiberCost` (1) — a remedy is steeped,
     *  so it costs the same fibre plus something to steep. */
    remedyFiberCost: 1,
    /** [TUNE] Berries for one remedy. Basis: the cheapest forage on the island, so the
     *  medicine shelf opens to anyone who has walked a beach, not just a specialist. */
    remedyBerryCost: 2,
    /** [TUNE] Game hours spent steeping one remedy. Basis: `journalWriteGameHours` — the
     *  same hour writing costs, through the same `spendGameHours` path, because both are
     *  things you sit at a fire and do rather than tap. */
    remedyGameHours: 1,
    /** [TUNE] Severity a remedy removes. Basis: `illnessFeverishAt` (0.45) minus
     *  `illnessAilingAt` (0.2) — one brew reliably drops a fever back below the line where
     *  it costs health. Relief, not a cure: the recovery clock is the system. */
    remedySeverityRelief: 0.25,
    /** [TUNE] Drop 2 — game hours of limp from one full charge. ~6 real minutes: long enough
     *  to change how you plan the next errand, short enough not to become the game. */
    injuryLimpFromCharge: 2.5,
    injuryLimpMaxGameHours: 6,
    /** [TUNE] Drop 2 — how much slower a limp makes you. Basis: gentler than
     *  `energySlowWalkMultiplier`, because exhaustion is a state you chose and an injury is
     *  one that happened to you. */
    injuryLimpSpeedMultiplier: 0.75,
    /** [TUNE] Drop 2 — pain from one full charge, 0..1. Feeds `impairmentOf` in the resolver,
     *  so a hurt survivor's whole day gets more expensive in a currency the game already
     *  speaks — no new machinery needed for it to be felt. */
    injuryPainFromCharge: 0.5,
    injuryPainMax: 1,
    /** [TUNE] Drop 2 — pain fades per game hour. ~2 game hours from a full hit. */
    injuryPainFadePerGameHour: 0.5,

    /** [TUNE] Item 2 — how long a dropped stack lasts, in game hours. Three game days, as
     *  specified. Long enough that a deliberate cache survives a real play session; short
     *  enough that the beach does not silently fill with abandoned piles. The timer runs
     *  ONLINE ONLY — see `dropped.ts` for why D-011 requires that. */
    dropDespawnGameHours: 72,
    boarCollisionRadius: 0.9,
    boarWanderSpeedMPerGameHour: 26,
    /** [TUNE] Drop 1 FIX — how far it drifts from home before turning back. Keeps a boar in
     *  its own territory, which is what makes the forest learnable. */
    boarWanderRadiusM: 14,
    /** [TUNE] Drop 1 FIX — charge speed, m per game hour. Basis: `boarChargeReachM` (9)
     *  covered within `boarChargeGameHours` (0.013) — the charge must actually ARRIVE inside
     *  its own window or the commitment means nothing. 9/0.013 rounded up. */
    boarChargeSpeedMPerGameHour: 720,
    /** [TUNE] Drop 1 FIX — alert/warning creep speed. It closes slowly while sizing you up;
     *  a boar frozen at 20m while snorting reads as broken, not as menacing. */
    boarStalkSpeedMPerGameHour: 40,

    // ---- DROP 1: THE SPEAR AND THE MEAT ---------------------------------------------------
    /** [TUNE] Drop 1 — the spear: a shaft, a knapped blade, and binding. Costs mirror the
     *  axe's (`axeWoodCost` 3 / `axeSharpbladeCost` 1 / `axeFiberCost` 2) because it is the
     *  same tier of made thing — one blade, one haft, lashing — and pricing it differently
     *  would say something about difficulty that the fiction does not support. */
    spearWoodCost: 3,
    spearSharpbladeCost: 1,
    spearFiberCost: 2,
    /** [TUNE] Drop 1 — damage per thrust. Basis: `boarChargeDamage` (16) against a boar's
     *  own health pool below, so a kill takes several committed thrusts and the aftermath
     *  windows they must be spent in — the fight is a rhythm, not a damage race. */
    spearThrustDamage: 22,
    /** [TUNE] Drop 1 — a boar's health. Three thrusts and a little, so at one thrust per
     *  aftermath window a kill costs three survived charges. That is the intended shape:
     *  you beat it by reading it, repeatedly, not by out-damaging it. */
    boarHealth: 70,
    /** [TUNE] Drop 1 — meat from one boar. Enough to matter, not enough to end hunger as a
     *  concern; it spoils before it can. */
    boarMeatYield: 4,
    /** [TUNE] Drop 1 — game hours before raw meat is spoiled and worthless. ~2 game days.
     *  Fast enough that meat is an event rather than a stockpile, which is what makes
     *  cooking (the NEXT discovery, explicitly not this drop) worth wanting. */
    meatSpoilGameHours: 48,
    /** [TUNE] Drop 1 — hunger restored by raw meat. Deliberately modest: raw is worse than
     *  cooked will be, and the gap is the reason to learn fire-cooking later. */
    meatHungerRestore: 18,
    // ---- COOKING (the discovery Drop 1 promised) ---------------------------------
    //  Every number here is answerable to two sentences written above, which are the
    //  only reason raw meat is priced as low as it is: raw is "worse than cooked WILL
    //  be", and meat spoils fast so that cooking is "worth wanting". If cooked meat
    //  were not clearly better on both axes, those two constants would be lies.
    /** [TUNE] Hunger restored by one unit of COOKED meat. Basis: it must beat every
     *  other food in the game, because it is the only one that costs an hour, a lit
     *  fire and a discovery. The forage ladder it has to sit above is berries 12,
     *  coconut 14, raw meat 18, fish 20, shellfish 22 — so 30 is a clear best meal
     *  without being a meal that ENDS hunger, which nothing in this game is. */
    cookedMeatHungerRestore: 30,
    /** [TUNE] Game hours a COMPETENTLY cooked batch keeps. Basis: raw is 48 (~2 game
     *  days), so this is the same food turned from an event into something you can
     *  actually plan around — five days — without becoming a stockpile that retires
     *  hunger as a concern. The other four rungs are this ± the step below. */
    cookedMeatSpoilGameHours: 120,
    /** [TUNE] What one rung of cooking skill is worth, in game hours of keeping. Basis:
     *  a whole game day per rung, so the ladder runs novice 72 → expert 168 and even
     *  the worst cook beats raw meat's 48. A discovery that could make food go off
     *  FASTER at some rung would not be worth discovering. */
    cookedMeatRungStepGameHours: 24,
    /** [TUNE] Fuel below which the fire is guttering rather than cooking, and the
     *  steady-fire bonus is withheld. Basis: `fireBurnGameHoursPerWood` is 2, so this
     *  is "enough fire left to still be a fire when the hour is up" — Law 219's
     *  workholding, read onto a hearth. */
    cookSteadyFireFuel: 4,
    /** [TUNE] Hours at the fire to cook a batch. Basis: exactly the hour writing and
     *  brewing already cost, down the same `spendGameHours` path, because all three
     *  are "stand at the fire and do the thing" and should not be priced differently. */
    cookGameHours: 1,
    // ---- THE ONE BODY RESOLVER (Part 3) -------------------------------------------------
    //  §13's terms that are read from the BODY rather than declared by the activity. Each is
    //  a multiplier on the one workload line, and each is bounded on purpose: an impaired
    //  body works harder, never impossibly hard. An unbounded term lets a bad state multiply
    //  into an unpayable cost, which reads to a player as the game breaking rather than as
    //  their own body failing them.
    /** [TUNE] Part 3 — the ceiling on `impairmentOf`. Basis: `loadOverloadMultiplier` (1.6)
     *  is what the heaviest sustainable burden already costs; being wounded, frozen or
     *  wrung out is priced at the same order, so no single bad state outweighs carrying
     *  everything you own. Reached only at zero health, zero warmth, or full fatigue. */
    impairmentMaxMultiplier: 1.6,
    /** [TUNE] Part 3 — work costs this much more at the extremes of the thermal band
     *  (hypothermic or heat-strained). Basis: the midpoint between neutral and
     *  `impairmentMaxMultiplier`, so environment and impairment can stack to roughly the
     *  cost of a second worker without either alone dominating. */
    environmentStrainMultiplier: 1.3,
    /** [TUNE] Part 3 — and this much in the merely cold/hot bands. Half the strain term:
     *  uncomfortable is a real cost, and it is not the same cost as dangerous. */
    environmentMildStrainMultiplier: 1.15,
    /** [TUNE] Part 3 — sweat loss multiplier under heat strain (§13 names heat as the
     *  intensifier of the hydration channel specifically). Basis: matched to
     *  `environmentStrainMultiplier` so the two extremes cost comparably in their own
     *  currencies rather than one silently dominating. */
    hydrationHeatMultiplier: 1.3,
    /** [TUNE] Part 3 — and in the merely hot band. Same halving as the environment pair. */
    hydrationWarmMultiplier: 1.15,
    /** [TUNE] Part 3 — what share of accrued nutrition DEBT settles onto hunger immediately.
     *  §13 is explicit that nutrition is a delayed, accumulated demand and not calories
     *  removed per swing. Basis: `workNutritionDebtPerUnit` (1.8) against
     *  `hungerDrainPerGameHour` (0.6) — at this share a hard hour of work costs roughly one
     *  extra hour of ordinary hunger, which is a debt a player can feel without it
     *  outrunning the slow clock hunger is designed to be. */
    nutritionDebtSettleShare: 0.2,

    // ---- THE SURVIVOR'S JOURNAL (Slice 3, D-068) -----------------------------------------
    /** [TUNE] D-068 — below this condition the ink has run and entries cannot be read. Not a
     *  cliff by accident: a journal degrades visibly for a long while before it stops working,
     *  so the decision to store it rather than carry it arrives with warning. */
    journalLegibilityFloor: 0.35,
    /** [TUNE] D-068 — how close to a lit fire you must be to write by it. Inherits
     *  `fireWarmthRadius` (7) deliberately: the light you can write by and the warmth you can
     *  feel are the same fire, and two radii would eventually disagree on screen. */
    journalFireRadiusM: 7,
    /** [TUNE] D-068 — energy spent writing one entry. Basis: `experimentEnergyCost` (6) is
     *  what a deliberate, careful act costs in this game; writing is one of those, at the end
     *  of a day, and is priced the same. */
    journalEnergyCost: 6,
    /** [TUNE] D-068 — game hours one entry takes. Real time, at night, not spent on the other
     *  things the night needed. The cost is the point: an entry has to be worth an hour. */
    journalWriteGameHours: 1,
    /** [TUNE] D-068 — condition lost per game hour at full exposure (soaked, carried). Basis:
     *  ~14 game-hours of being carried while soaked takes a fresh journal to the legibility
     *  floor — about one bad day. Paper in a wet pocket does not last a week. */
    journalDampLossPerGameHour: 0.045,
    /** [TUNE] D-068 — fibre to make the pages. Basis: `torchFiberCost` (2) is what a small
     *  made object costs in this game; a journal is one. Cheap to MAKE, expensive to fill —
     *  the cost that matters is the hour and the light, not the materials. */
    journalFiberCost: 2,
    /** [TUNE] D-068 — wood, burnt down for the charcoal to write with. Same basis, and the
     *  reason a fire is required to make one at all. */
    journalWoodCost: 1,
    /** [TUNE] D-068 — a stored journal still takes this share of the damp a carried one would.
     *  Not zero: a box is protection, not a seal. This is what makes storing it a good decision
     *  rather than a free one. */
    journalStoredExposureShare: 0.15,

    // ---- Death and respawn — RETIRED (Slice 3) -------------------------------------------
    //  `respawnVitalFraction` / `respawnHealthFraction` are GONE, with the function they fed.
    //  They described a survivor waking up from death with 50% vitals; there is no such
    //  survivor now. Death is final, and what washes ashore afterwards is a different person
    //  landing on the arrival profile above. Deliberately not left as unused constants: a
    //  tunable with no caller is an invitation to resurrect the mechanic by accident.

    // ---- Food and water (C03) ----------------------------------------------
    /** [TUNE] C03 — thirst restored per drink, at the pond or from a full flask. */
    drinkPerSip: 25,
    /** [TUNE] C03+ — hunger a handful of berries restores. */
    berryHungerValue: 12,
    /** [TUNE] C03+ — hunger a coconut restores. */
    coconutHungerValue: 14,
    /** [TUNE] C03+ — thirst a coconut also restores (coconut water). */
    coconutThirstValue: 10,
    /** [TUNE] C03+ — hunger shellfish restore; the richest forage. */
    shellfishHungerValue: 22,

    // ---- The first tool and loot (C03) — the four gates made concrete ------
    /** [TUNE] C03 — crude axe recipe: wood + a blade + fibre. Knowledge is innate in v1.
     *  Ch.1 v3 (D-055) replaced the direct `axeStoneCost` with `axeSharpbladeCost` — the
     *  axe now needs a knapped blade, not raw stone directly; the stone hammer + knapping
     *  is the new Tier-0 step that unlocks it. */
    axeWoodCost: 3,
    axeSharpbladeCost: 1,
    axeFiberCost: 2,
    /** [TUNE] C03 — real seconds to fell a standing tree, at level 1, with the axe. */
    treeChopSecondsWithAxe: 4,
    /** [TUNE] C03 — wood a felled tree yields; timber, where hands got scraps. */
    treeWoodYield: 8,
    /** [TUNE] C03+ — stone per rock outcrop. */
    stoneNodeYield: 2,
    /** [TUNE] C04 — husk fibre per coconut palm (was `fiberPerCoconutPalm`; renamed for the D-043
     *  legibility pass — palms show husks at the trunk base). A pre-axe fibre source. */
    palmHuskFiberYield: 2,
    /** [TUNE] C04 — fibre per reed clump: the *obvious* fibre source, the material that looks
     *  like what it makes (D-043). Reeds grow by the pond and scattered inland. */
    reedFiberYield: 2,
    /** [TUNE] C03+ — the sealed crash box's contents, opened only with the axe. */
    crashBoxFiber: 3,
    crashBoxFlask: 1,
    /** [TUNE] C03+ — drinks the water flask carries inland. */
    flaskCapacitySips: 1,

    // ---- The torch (FIX-1 pkg item 5, Living Island Track A) — crafting-tree entry #1 ----
    /** [TUNE] FIX-5 — torch recipe: wood + fibre only, no stone gate (a simpler, earlier
     *  craft than the axe — the first entry in the crafting tree, Ch.1). */
    torchWoodCost: 2,
    torchFiberCost: 2,
    /** [TUNE] FIX-5 — game hours a lit torch burns before it is spent and must be
     *  recrafted. Roughly a third of a night (`nightStartHour`..`dayStartHour` = 12 game
     *  hours) — enough for one real excursion, not a permanent light. */
    torchBurnGameHours: 4,

    // ---- The Development Tree seed (C03) — mastery changes the action ------
    /** [TUNE] C03 — XP for one meaningful outcome (a felled tree, a foraged meal). Never spam. */
    xpPerMeaningfulAction: 5,
    /** [TUNE] C03 — XP to reach level N = N × this. */
    xpToLevelPerLevel: 25,
    /** [TUNE] C03 — each skill level makes its action this much faster/richer (fraction). */
    skillSpeedBonusPerLevel: 0.08,

    // ---- Offline / morning report -----------------------------------------
    /** [TUNE] C01 — an absence shorter than this produces no morning report. */
    morningReportMinRealMinutes: 2,

    // ---- Energy — the 5th vital (C05, "Foundations") -----------------------
    /** [TUNE] C05 — full energy. */
    energyMax: 100,
    /** [TUNE] C05, RETUNED FIX-1 (Living Island Track A) — energy lost per game hour, at
     *  ALL times regardless of activity — the ambient/idle rate. Root cause of the energy
     *  inversion this fix closes: this was the ONLY drain that existed, so a punishing hour
     *  of quarry-mining and an idle hour cost identically nothing extra for the effort.
     *  Lowered from 5 now that effortful gathers below ALSO charge a per-action cost on top
     *  of this — an unchanged total-drain feel was the goal, not a harder game. Never feeds
     *  health drain (see the C05 spec's SCOPE OUT — a soft debuff only). */
    energyDrainPerGameHour: 2,
    /** [TUNE] FIX-1 (Living Island Track A) — energy spent per successful EFFORTFUL gather
     *  (a `hold`-interaction node: deadfall, tree, rock, coconut palm, the crash box,
     *  quarry — see `NODE_SPECS` in state.ts). Instant `tap` pickups (driftwood, berries,
     *  reeds, shellfish, salvage) stay free — a tap is not exertion the way a timed hold
     *  is. Scaled loosely to each action's hold duration/yield; a first pass, open to a
     *  playtest retune. Clamped at 0 — a gather is never blocked by low energy this pass. */
    energyCostTreeChop: 4,
    /** [TUNE] FIX-1 — deadfall: a shorter hold than a standing tree, costs less. */
    energyCostDeadfallGather: 1.5,
    /** [TUNE] FIX-1 — a standalone rock outcrop: the same hold length as deadfall. */
    energyCostRockMine: 1.5,
    /** [TUNE] FIX-1 — one quarry-mining tap. Charged every tap (the quarry is
     *  repeat-minable, D-051) — the pool being large is not a reason mining it is free. */
    energyCostQuarryMine: 2,
    /** [TUNE] Drop 2 — see `boulderEnergySwing`; the bluff is priced apart from the seam. */
    /** [TUNE] FIX-1 — shaking down a coconut palm. */
    energyCostCoconutGather: 1.5,
    /** [TUNE] FIX-1 — forcing open the sealed crash box (one-time; costed for consistency
     *  with every other hold-interaction verb, not because it recurs). */
    energyCostCrashboxOpen: 2,
    /** [TUNE] C05 — D-011-style offline floor, for consistency with every other vital —
     *  not required for safety (energy is not a death vector), just kindness. */
    energyOfflineFloor: 15,
    /** [TUNE] C05 — at or below this, the castaway is sluggish: `walkSpeedMps` is scaled by
     *  `energySlowWalkMultiplier` and the HUD says why. Soft debuff, never death. */
    energyLowThreshold: 25,
    /** [TUNE] C05 — walk-speed multiplier while exhausted (below `energyLowThreshold`). */
    energySlowWalkMultiplier: 0.65,
    /** [TUNE] D-059 — hold-duration multiplier for an effortful gather while exhausted
     *  (at or below `energyLowThreshold`). Above 1 = the swing takes LONGER, the same
     *  "the action gets slower, the reward does not shrink" shape woodcutting skill and axe
     *  grade already use on this exact stat (§I.9). **Root cause this closes:** through Ch.6
     *  nothing about energy touched gathering at all — `nodeHoldSeconds` read skill level and
     *  axe grade only, and `isExhausted` was consumed in exactly three places, all of them
     *  movement speed or hint text. Mining at 0 energy was byte-identical to mining at 100. */
    exhaustedHoldMultiplier: 1.8,
    /** [TUNE] D-059 — hold-duration multiplier at the point of total collapse (energy 0),
     *  interpolated toward from `exhaustedHoldMultiplier` as energy falls from the low
     *  threshold to nothing. Gives the last stretch a real gradient instead of a cliff, so
     *  "nearly spent" and "utterly spent" are not the same thing. */
    collapsedHoldMultiplier: 2.6,
    /** [TUNE] C05 — game hours a sleep at the shelter advances the clock by (§4). Reuses the
     *  exact reconcile path an absence already uses — a voluntary, floor-protected span. */
    sleepDurationGameHours: 8,
    /** [TUNE] Sleeping ROUGH — on the ground, no shelter. Recovery rates are scaled by this
     *  relative to a sheltered sleep, so resting anywhere is always possible and always
     *  worse. 0.55 makes a night on the ground worth about half a night under a roof: a real
     *  fallback, never a substitute. Shelter-sleep's own rates are untouched. */
    groundSleepRecoveryMultiplier: 0.55,

    // ---- Wet condition (C05) — not a vital, not a death vector -------------
    /** [TUNE] C05 — full wetness. */
    wetMax: 100,
    /** [TUNE] C05 — wetness gained per game hour standing in the pond. Fast: a few real
     *  minutes of wading is enough to soak through. */
    wetGainPerGameHourInPond: 240,
    /** [TUNE] C05 — wetness lost per game hour on dry land, away from the shelter. */
    wetDecayPerGameHourDry: 15,
    /** [TUNE] C05 — wetness lost per game hour within the shelter's radius — drying off
     *  under a roof is the shelter's second job, alongside warmth (§5). */
    wetDecayPerGameHourSheltered: 60,
    /** [TUNE] C05 — warmth's night-time drain rate is multiplied by this at full wetness
     *  (linearly interpolated from 1.0 at wet=0). Applies only to the drain case, not to
     *  the fire's regen — wet makes the cold worse; it does not cancel the fire. */
    wetWarmthDrainMultiplierAtMaxWet: 1.5,

    // ---- THE WATER (the Maritime Slice) ------------------------------------
    //
    //  COLD-WATER EXPOSURE HAS NO CONSTANTS HERE, and that absence is the design. Immersion
    //  reuses `wet` — swimming is simply maximal wetness — so it arrives at warmth through
    //  `thermalWetLoss` and the existing heat balance, exactly like rain would. A parallel
    //  "water chill" rate would have been a second thermal system for one situation, and the
    //  first time it disagreed with `netHeatFlowPerGameHour` the panel would be lying about
    //  which loss to fix. What swimming adds that rain does not is WORK, and that is below.

    /** [TUNE] Maritime — water this deep or deeper takes your feet off the bottom. Basis:
     *  chest-deep on a standing adult. Below it you are wading; at it you are swimming, and
     *  the difference is the whole of what the shore-shelf ramp exists to make gradual. */
    swimDepthM: 1.35,
    /** [TUNE] Maritime — fraction of `walkSpeedMps` a swimmer makes. Basis: 3.5 × 0.29 =
     *  1.02 m/s, an unhurried but real front crawl, against a brisk walk. Slow enough that
     *  distance is felt as time rather than read off a map. */
    swimSpeedMultiplier: 0.29,
    /** [TUNE] Maritime — fraction of `walkSpeedMps` while wading. Basis: water to the thigh
     *  roughly halves a walking pace, and the band is only a few metres wide, so this is a
     *  transition the body feels rather than a zone it lives in. */
    wadeSpeedMultiplier: 0.5,
    /** [TUNE] Maritime — a spent swimmer's speed, as a fraction of the swimming speed. Not
     *  zero: a swimmer who cannot move at all is a swimmer who is already drowning, and the
     *  stage that takes health is named separately and comes after this one. */
    swimSpentSpeedMultiplier: 0.55,

    /** [TUNE] Maritime — energy per game hour spent swimming, before capacity and load.
     *  Basis, and this is the number the whole crossing balances on: at 70/h a full 100
     *  energy buys 1.43 game hours = 214 real seconds = **~218 m of swimming**. The wreck is
     *  ~115 m off the shore, so a round trip is ~230 m — just past what a rested survivor can
     *  pay for. **Swimming to the wreck is meant to be very nearly survivable and not quite**;
     *  the raft is what turns "nearly" into "there and back". The `energyDrainPerGameHour`
     *  ambient of 2 is left alone underneath it — this is work on top of living. */
    swimEnergyDrainPerGameHour: 70,
    /** [TUNE] Maritime — energy per game hour while wading. Real effort, a fraction of the
     *  swim: you are still walking, against water. */
    wadeEnergyDrainPerGameHour: 12,
    /** [TUNE] Maritime — energy per game hour paddling a raft. Basis: work you do with your
     *  arms while your body is out of the water and carrying nothing. An order below the
     *  swim, which is exactly why the raft is the answer to the crossing. */
    raftEnergyDrainPerGameHour: 9,

    /** [TUNE] Maritime — energy at or below which a swimmer is LABOURING. The first of the
     *  two warnings owed before the water may take anything (the same fair-challenge contract
     *  the boar's five stages and illness's five stages already keep). */
    swimLabouringEnergy: 35,
    /** [TUNE] Maritime — energy at or below which a swimmer is SPENT. The second warning:
     *  speed drops, the sentence changes, and health is still untouched. */
    swimSpentEnergy: 12,
    /** [TUNE] Maritime — health per game hour once a swimmer is GOING UNDER (energy at 0 and
     *  still in deep water). §12's `unsafe-continued`, which is one of the six causes health
     *  is allowed to move for; ordinary work is not, and swimming below this stage is not.
     *  Basis: 40/h leaves ~2.5 game hours from full health, so even the last stage is a long,
     *  loud, survivable-if-you-turn-now emergency rather than a trapdoor. */
    swimGoingUnderHealthPerGameHour: 40,

    /** [TUNE] Maritime — how much of the swim's energy cost a fully developed
     *  breath/water confidence removes. Capped well short of free: §12's own boundary for
     *  this capacity is "does not extend human physiology without limit". */
    swimConfidenceEnergyRelief: 0.35,
    /** [TUNE] P0-E — the most that confidence adds to SWIM PACE, as a fraction, reached only at
     *  capacity 100. The largest of the three felt gains, deliberately: a beginner swims at
     *  `swimSpeedMultiplier` (0.29) — frighteningly slow, and correctly so — and the water is
     *  the one act in this game whose entire character is confidence. At 0.3 a practised
     *  swimmer crosses at ~0.38 of walking pace instead of 0.29, which is the difference
     *  between the sea winning and the survivor winning, and is still far slower than land. */
    swimConfidenceSpeedGainMax: 0.3,
    /** [TUNE] Maritime — game hours of swimming that count as one training bout, feeding
     *  `capacityGainPerBout`. Basis: 0.15 gh = ~22 real seconds of continuous swimming, so a
     *  capacity worth ~30 points of development is ~11 game hours in the water spread over a
     *  run — a long-term capacity, developed the way §12 says it is developed. */
    swimBoutGameHours: 0.15,

    // ---- THE RAFT (the Maritime Slice) -------------------------------------
    /** [TUNE] Maritime — logs for a deck. Basis: the largest wood cost in the game by some
     *  way (the shelter's is 8), because a raft is the largest thing anyone has built here
     *  and the cost is most of what makes the crossing a decision rather than an errand. */
    raftWoodCost: 14,
    /** [TUNE] Maritime — coir to lash it. Basis: proportional to the deck; a raft is mostly
     *  rope by count of hands' work. */
    raftFiberCost: 10,
    /** [TUNE] Maritime — coconut husks lashed underneath for buoyancy. Basis: this is also
     *  what gives the recipe its OWN tag signature ({woodwork, textile, food}), so the raft
     *  is discovered by its own gesture instead of becoming a third contender for the
     *  wood+fibre one ([[D-114]]: sharing a signature costs an attempt, never access — but
     *  three recipes on one gesture is a lottery, and a lottery is not a discovery). */
    raftCoconutCost: 4,
    /** [TUNE] Maritime — fraction of `walkSpeedMps` a paddled raft makes. Basis: 3.5 × 0.46
     *  = 1.61 m/s, comfortably above a swim (1.02) and well below a walk. The ~115 m open
     *  crossing is then ~71 real seconds each way: long enough to be a passage, short enough
     *  that a phone session contains one. */
    raftSpeedMultiplier: 0.46,
    /** [TUNE] Maritime — how close to the waterline you must stand to build a raft, in
     *  metres. Basis: a raft built inland is a raft you cannot move; the siting rule is the
     *  §9.6 lesson (the site IS the decision) applied to the one object that must be at the
     *  edge of the world to be worth anything. */
    raftBuildMaxShoreDistanceM: 12,
    /** [TUNE] Maritime — how far OUTSIDE the waterline a newly built raft is moored, in
     *  metres. Basis: far enough to be unambiguously afloat (`steerRaft` refuses dry ground,
     *  so a raft moored on the line itself could be un-steerable), near enough to board from
     *  the sand without swimming for it. */
    raftMooringOffsetM: 2.5,
    /** [TUNE] Maritime — how far back toward the island stepping off a raft may reach for dry
     *  ground, in metres. Basis: a little over the shore band's own width, so nosing into the
     *  shallows lands you on the beach — and no wider, or stepping off would teleport a
     *  survivor across water they should have had to paddle. */
    raftStepAshoreReachM: 8,
    /** [TUNE] Maritime — how close to the wreck counts as having reached it. Basis: the hull
     *  silhouette is ~6.5 m across and listing; this is arriving alongside, not threading a
     *  hatch, and the crossing's beat should not hinge on pixel steering. */
    wreckArrivalRadiusM: 14,
    /** [TUNE] Far Island — tap forgiveness around a trace site, in metres.
     *
     *  THE DEFECT THIS CLOSES, and the device leg is the only thing that could have found it.
     *  A tap is aimed at the ground plus 0.4 m, which is correct for a box or a cairn and
     *  WRONG for a fire ring: the camp is a torus 0.29 m tall, so the ray passed clean over it
     *  and struck the terrain behind. The cache (0.62 m) was hit; the ring never was.
     *
     *  A flat thing lying on the ground needs forgiveness rather than a taller mesh, because
     *  making the ring stand up to be tappable would be letting the input model dictate what
     *  the world looks like. The raft already has exactly this for exactly this reason. */
    traceTapRadiusM: 2.6,

    // ---- DIVING (the Underwater Slice) -------------------------------------
    //
    //  THE WHOLE STAGE BALANCES ON ONE NUMBER: how long a breath lasts at the site's depth.
    //  Everything else is arranged around it, and the arithmetic is written out here rather
    //  than discovered later, because "surfacing in time" is only a skill if the time is real.

    /** [TUNE] Dive — water shallower than this is a duck, not a descent. Basis: chest-deep is
     *  `swimDepthM` (1.35); at 2.2 m a survivor is genuinely under rather than standing. */
    diveMinDepthM: 2.2,
    /** [TUNE] Dive — a base breath, in air units where the drain below is per game hour.
     *  Basis, worked against the site's REAL depth rather than a guess: the seabed past the
     *  shelf is -8.0 and `seaLevel` is -1.0, so the site sits under **7.0 m** of water. At
     *  620/h x the 1.63 depth factor that is 1011/h, and 100 units is 0.099 gh = **~15 real
     *  seconds** under. A real breath-hold: long enough to descend, work one thing and come
     *  up; short enough that a second target is a decision rather than a formality. */
    diveAirCapacityBase: 100,
    /** [TUNE] Dive — how much a fully practised `breathWaterConfidence` adds, as a fraction of
     *  the base. Capped well short of doubling: §12's boundary for this capacity is "does not
     *  extend human physiology without limit", and 45% is a diver who has learned to be calm,
     *  not one who has grown gills. */
    diveAirCapacityFromConfidence: 0.45,
    /** [TUNE] Dive — air per game hour at zero depth, before the depth factor. */
    diveAirDrainPerGameHour: 620,
    /** [TUNE] Dive — extra air cost per metre of depth, as a fraction. Basis: 0.09 makes the
     *  site's 7 m cost 1.63x the surface rate, shortening a breath from 24 s to ~15 s. Depth
     *  is FELT as time, which is the only way a player can feel it at all. */
    diveAirCostPerMetre: 0.09,
    /** [TUNE] Dive — air recovered per game hour at the surface. Basis: fast. A breath is
     *  quick; it is the descent that costs. ~4 real seconds to refill from empty. */
    diveAirRecoveryPerGameHour: 3800,

    /** [TUNE] Dive — air at or below which the chest BURNS: the first spoken warning. Basis:
     *  40% of a base breath. At the site that is **~8.9 s of silence**, then the warning with
     *  ~5.9 s of air still in hand — told early enough to finish a thought and go up. */
    diveBurningAir: 40,
    /** [TUNE] Dive — air at or below which the diver is FAILING: the second warning, and the
     *  last stage that costs nothing. Basis: **~2.4 s** at the site. Surfacing is a VERB, not
     *  a swim, so that is enough to act on and nowhere near enough to work one more point —
     *  which is the decision the whole stage is built to pose. */
    diveFailingAir: 16,
    /** [TUNE] Dive — health per game hour while blacking out. §12's `unsafe-continued`, and
     *  the only cause here that may move health. Basis: 150/h is ~2.4 real seconds per point
     *  — genuinely frightening, and still not a trapdoor: a diver who turns for the surface
     *  the moment it starts survives it. */
    diveDrowningHealthPerGameHour: 150,

    /** [TUNE] Dive — fraction of the swim speed while submerged. Basis: moving in three
     *  dimensions against water is slower than moving across it. */
    diveSpeedMultiplier: 0.72,
    /** [TUNE] Dive — DISORIENTATION, made mechanical. A fumbling diver's speed as a fraction
     *  of the dive speed. Deliberately not a camera trick: this game's honest-systems rail
     *  forbids misleading a player about real state, so what a failing diver loses is
     *  coordination, expressed in the multiplier the water already owns. */
    diveFumblingSpeedMultiplier: 0.55,
    /** [TUNE] Dive — game hours of diving that count as one training bout. Basis: 0.05 gh is
     *  ~7.5 real seconds under, so a single good breath is most of a bout. */
    diveBoutGameHours: 0.05,

    /** [TUNE] Dive — how much colder each metre of depth makes the existing evaporative term,
     *  as a fraction. Basis: 0.10 makes the site's 7.0 m cost 1.70x the surface's wet loss. It
     *  scales the SHIPPED term in `netHeatFlowPerGameHour` rather than adding a rival to it,
     *  so there is still exactly one opinion about where a body's heat is going. */
    thermalDepthChillPerMetre: 0.10,

    /** [TUNE] Dive — effort to work one submerged salvage point. Basis: above the wreck's
     *  9 (prying metal in open water) because you are doing it without breathing. */
    divePartEffortEnergy: 11,
    /** [TUNE] Dive — game hours before the sea shifts a worked point back into reach. Basis:
     *  matched to `wreckPartRegrowGameHours`; the same tide moves both. */
    divePartRegrowGameHours: 120,
    /** [TUNE] How long a freshly-opened panel ignores hit-tested input, in milliseconds.
     *
     *  THE WINDOW IS THE PANEL'S OWN FADE-IN, so this is not an invented number: `.panel`
     *  transitions opacity over 300 ms in `index.html`, and this is exactly "while it is
     *  still appearing". Every panel is full-screen and is created DURING the tap that opens
     *  it, so the browser's trailing compatibility click for that same touch lands on the
     *  panel — the gesture that opened it also presses it. A device probe caught the Backpack
     *  switching itself to the Skills tab because `.growth-btn` sat at the pixel the player
     *  tapped their pack at. See `panel()` in `src/body/hud.ts`.
     *
     *  Shorter and the stray click still lands on a half-faded panel; longer and a genuinely
     *  quick second press starts getting eaten. Tied to the transition rather than tuned
     *  against it, so the two cannot drift apart. */
    panelArmDelayMs: 300,

    // ---- WAVE 0 — THE THREE WATER RUNGS (v2.6's Water Craft Tree) ------------
    //
    //  EVERY NUMBER HERE IS READ OFF THE FILED MODEL, not invented. The sheet gives matter,
    //  prerequisites, operations and an active-time seed per rung; what it does not give is a
    //  sip count, because the model measures capability rather than our thirst units. So the
    //  capacities are derived from the sheet's own SIZE language — W1 is "small; cracks; spills"
    //  and W2c is scarce recovered cookware — against the shipped flask's one sip.

    /** [TUNE] W1 — a coconut for the shell cup. The sheet's matter line is "Coconut + cutting
     *  edge", and one coconut is one shell. */
    shellCupCoconutCost: 1,
    /** [TUNE] item 3 — an ALREADY-EMPTIED husk is the cheaper route to the same cup, and needs
     *  no blade: the cutting is what made it a shell. `eat()` has handed one back on every
     *  coconut eaten since the vessel shipped, and until now that husk could become nothing. */
    shellCupShellCost: 1,
    /** [TUNE] W1 — a cutting edge to open it. NOT consumed: the sheet's operations are
     *  open/clean/stabilize and none of those eats a knife, so this is a requirement rather
     *  than a cost. */
    shellCupBladeCost: 1,
    /** [TUNE] W1 capacity, in sips. Basis: the sheet says "small", and the shipped flask holds
     *  1 — so the first vessel a survivor can MAKE holds a little more than the one they might
     *  find, which is what makes building it worth the coconut. */
    shellCupSips: 2,
    /** [TUNE] W2c — recovered recognised cookware, in wreck-era metal. Basis: 1 is the whole of
     *  the scarcity, because `metal` has exactly one source in the game and it is across 115 m
     *  of open water. The sheet's own limit line is "Scarce; corrosion/coating". */
    foundPanMetalCost: 1,
    /** [TUNE] W2c capacity, in sips. Basis: the pan is the better vessel on the sheet's own
     *  ladder — more volume per boil, which is the reason to carry one at all. Kept modest so a
     *  pan is an improvement rather than an end to the water problem. */
    foundPanSips: 4,
    // ---- WHAT A VESSEL WEIGHS (item 1, this batch) ------------------------------
    //  A vessel has never been in `Inventory`, so `carriedWeightKg` has never seen one.
    //  That was free while a survivor could hold exactly ONE. Now that they can hold
    //  several, the load system has to see them or "carry more cups" is unlimited water
    //  storage at no cost — the same shape of hole [[D-190]] closed inside a single cup.
    /** [TUNE] Mass of one carried vessel, empty. Basis: a shell cup IS an emptied husk,
     *  so it weighs exactly what `materialMassKg.shell` says one weighs (0.25) — the same
     *  object cannot weigh two different amounts depending on which field it sits in. The
     *  pan is wreck-era cookware: heavier than a husk, lighter than a hull plate. */
    vesselMassKg: { 'shell-cup': 0.25, 'found-pan': 0.7 },
    /** [TUNE] Bulk of one carried vessel. Basis: the same husk again — `materialBulk.shell`
     *  is 1.6, "bulky for its weight: a rigid open bowl does not pack down", which is if
     *  anything MORE true once it is a cup you are trying not to spill. */
    vesselBulk: { 'shell-cup': 1.6, 'found-pan': 2.2 },
    /** [TUNE] Mass of one sip of water. Basis: a coconut shell holds roughly a quarter of a
     *  litre and `shellCupSips` is 2, so a sip is ~125 ml and water is a kilo a litre. A
     *  full pan (4 sips) is then half a kilo, which is what half a litre ought to feel
     *  like on a long walk — not nothing, and not a reason never to carry water. */
    waterMassKgPerSip: 0.125,

    // ---- DROP 6 — THE READOUT: what the body knows, made perceivable --------
    //
    //  ONE constant, because this drop adds no mechanic — everything else it says is a pure
    //  reading of models that already ship.

    /** [TUNE] How much a piece of work must have improved before the game says so, in seconds.
     *
     *  Basis: below about a second a survivor cannot tell a real gain from ordinary variation,
     *  so speaking would be noise; above it, the change is one they have just felt in their
     *  hands. A game that narrates every ordinary moment has no way left to raise its voice —
     *  the same reasoning that keeps `holding` silent in the dive and `swimming` silent in the
     *  water. This is the threshold that keeps the readout worth reading. */
    readoutNoticeableSeconds: 1.0,
    /** [TUNE] The reference job the panel quotes its seconds against, in seconds.
     *  Basis: `deadfallHoldSeconds`-scale work — a piece of ordinary island labour, so the
     *  figure a survivor reads is the figure their own hands have been feeling. Quoting an
     *  abstract unit would be a score with a costume on. */
    readoutAxeReferenceSeconds: 6,

    // ---- DROP 3B(i) — THE APPOINTMENT: the island's first deadline -----------
    //
    //  STRUCTURAL HALF ONLY. These are the durations and yields the MECHANISM needs to exist
    //  and to be provable; the pressure pass (Drop 3B(ii)) is explicitly held on the
    //  director's own play, and nothing here guesses at hunger, thirst or the night curve.

    /** [TUNE] Island-clock hour the column goes up, on a fresh run. Basis: comfortably past
     *  the first night, so a castaway meets the island's first deadline having already met
     *  cold, thirst and dark — an appointment on night one would be a second emergency
     *  during the first, which is what Laws 115-117's arrival profile exists to prevent. */
    crashFirstAtGameHours: 30,
    /** [TUNE] The column at its thickest, in game hours. FREE — nothing is at stake yet. */
    crashSightedGameHours: 4,
    /** [TUNE] The column holding, in game hours. FREE, and the longest of the run-up: this is
     *  the preparation window, and reading the sky has to be worth more than reacting to it —
     *  Rain's own reasoning ([[D-133]]) applied to a deadline instead of a hazard. */
    crashStandingGameHours: 10,
    /** [TUNE] How long the site stays FRESH. The whole of the reward for having set out
     *  during the free stages. */
    crashFreshGameHours: 14,
    /** [TUNE] How long it stays workable but picked over. Deliberately longer than `fresh`:
     *  a survivor who arrives late still finds SOMETHING, so being slow is a worse outcome
     *  rather than a wasted journey. */
    crashPickedGameHours: 20,
    /** [TUNE] Tap forgiveness at the site, in metres. Basis: matched to `boatTapRadiusM`
     *  (4.5) — a scatter of wreckage across the trees is at least as big as a beached hull
     *  and must never be fiddly to reach. */
    crashSiteRadiusM: 4.5,

    //  WHAT ONE ARMFUL IS WORTH. Wreck-era families only ([[D-124]]) — no new material enters
    //  the game here. Fresh beats picked-over on every line, and that gap IS the asymmetry the
    //  fair-challenge review measures.
    crashFreshMetal: 3,
    crashFreshWiring: 2,
    crashFreshGlass: 2,
    crashPickedMetal: 1,
    crashPickedWiring: 1,

    // ---- DROP 5 — THE STATIC: one rung of ENDING E03 ------------------------
    //
    //  REGISTER NAMED per [[D-138]]. Six constants: what the cell holds, what listening costs,
    //  when there is anything to hear, what weather does to it, and how long you have to sit
    //  with it. There is no transmit constant because there is no transmit.

    /** [TUNE] Which wreck part the receiver comes out of. `wr3` has been "the instrument
     *  housing, off the bow" since [[D-124]] authored the six, and already yields glass and
     *  wiring — the set is the thing that housing was built to hold. Named here rather than
     *  hardcoded in `radio.ts` so the authored world and the rule cannot drift apart. */
    radioSalvageNodeId: 'wr3',
    /** [TUNE] What the one salvaged cell holds. The scale is arbitrary; what matters is the
     *  ratio to the drain below, which is what decides how many scheduled hours it buys. */
    radioChargeMax: 100,
    /** [TUNE] Charge burned per game hour of listening.
     *
     *  BASIS, COUNTED: at 26/gh a full cell is 3.85 game hours of listening. Three signals sit
     *  at 05, 14 and 22, each with a 0.6 gh window, so hearing all three costs at minimum
     *  3 x `radioCatchGameHours` (0.75 gh) of listening IN the windows — about a fifth of the
     *  cell. The other four-fifths are what a survivor spends by listening at the wrong hours.
     *  That gap IS the fair-challenge asymmetry, and `tests/radio.test.ts` measures it. */
    radioDrainPerGameHour: 26,
    /** [TUNE] Half-width of a signal's window, in game hours. Basis: 0.6 gh is comfortably
     *  more than `radioCatchGameHours` (0.25), so a survivor who arrives at the right hour has
     *  real slack to sit through it — the schedule is a thing to learn, not a reflex test. */
    radioTrafficWindowGameHours: 0.6,
    /** [TUNE] Game hours of continuous LEGIBLE listening needed to make a fragment out.
     *  Basis: long enough that flicking the set on and off hears only hiss, short enough to
     *  fit inside a window twice over. */
    radioCatchGameHours: 0.25,
    /** [TUNE] How much clarity full rain costs, 0..1. Basis: at 0.7, `rainIntensity` above
     *  ~0.79 puts clarity under `radioClarityFloor` — so the storm's COMMITTED and IMPACT
     *  stages black the band out and its two free warning stages do not. Weather takes the
     *  air away exactly when it is already taking everything else. */
    radioRainClarityLoss: 0.7,
    /** [TUNE] Below this clarity nothing is legible — a voice is there and cannot be made
     *  out, which is a different and worse thing than silence. */
    radioClarityFloor: 0.45,

    // ---- DROP 4 — THE PULL: the way home, visible ---------------------------
    //
    //  IT BEGAN AS TWO CONSTANTS — a reach and a threshold — because the boat was a promise
    //  made visible rather than a system to master. SESSION 2 gave her a ladder, so the block
    //  below now carries the prices of the work as well: what it costs to prop her, back her,
    //  seal her, moor her, and what she leaks and carries when you have. Every one of those is
    //  a SEPARATE number, because Law 124 forbids one repair recipe and shared costs are how a
    //  single recipe grows back.

    /** [TUNE] Boat — tap forgiveness around the hull, in metres. Basis: she is 7.6 m long and
     *  2.6 m in the beam, so half her diagonal is ~4.0; this is that plus a hand's slack. A
     *  hull is the largest thing on this beach and must never be fiddly to touch. */
    boatTapRadiusM: 4.5,
    /** [TUNE] Boat — `navigationSeamanship` Technique at which a survivor's own hands can read
     *  the hull, without ever finding the manual (Law 125's second route).
     *
     *  BASIS, COUNTED RATHER THAN GUESSED — and it shipped wrong first, which is the reason
     *  the counting is written down here. The value was 34 on the reasoning that it was "past
     *  the point where somebody has plainly been doing this", with a basis line claiming the
     *  domain is trained by "building the raft, making the crossing, working the wreck and all
     *  three fishing methods". Fishing trains nothing: it never reaches `gatherNode` and has no
     *  `recordTrying` of its own. And the domain's real producers, counted, are FOUR:
     *
     *    crafting the raft        1   (the recipe's own domain)
     *    reaching the wreck       1   (`Session`, once — guarded by `wreck.reached`)
     *    working a wreck part     6   (six nodes)
     *    working a dive part      4   (four nodes)
     *
     *  Technique gains decay with headroom, so twelve events — every maritime thing the game
     *  contains, done once — reach 19.3. Thirty-four needs twenty-seven, which is three full
     *  regrow cycles of the wreck AND the dive site. The second route would have existed and
     *  been unreachable, which is [[D-114]]'s defect class exactly.
     *
     *  14 is the eighth event: build the raft, cross open water, work the six parts of the
     *  hull. That is the sentence `boat.ts` uses for this route, and now it is also the
     *  arithmetic. It needs no dive and no regrow, and at nearly three times
     *  `knowledgeInnateFloor` (5) a fresh castaway can never arrive holding it. */
    boatSeamanshipTechnique: 14,
    /** [TUNE] SESSION 2 — timber to crib and prop her so she stops moving under the work.
     *  Law 125's rigging route priced: no amount of strength substitutes for wood under the
     *  bilge, so this is a real cost a survivor must go and meet rather than push through. */
    boatSupportWoodCost: 6,
    /** [TUNE] The structural repair — frames and a backing patch. Wants a salvaged bracket as
     *  well (see `structuralBlocker`); the timber is what the bracket is fastened through. */
    boatStructuralWoodCost: 5,
    /** [TUNE] The seal — caulking the garboard the length of her. Fibre driven into the seam,
     *  which is what oakum actually is. Deliberately a SEPARATE cost from the structure above:
     *  Law 124 forbids one repair recipe, and two costs is the honest shape of two systems. */
    boatSealFiberCost: 6,
    /** [TUNE] How much water she takes in a float test, per point of unaddressed weakness.
     *  Read by `floatTestForecast` AND by the test itself, so the preview cannot lie. */
    boatLeakPerWeakness: 0.34,
    /** [TUNE] Above this, the test is a failure and she comes back out. Below it she swims.
     *
     *  RETUNED FROM 0.5, WHICH MADE THE GATE UNFAILABLE. Measured: the lowest competence a
     *  survivor can actually reach at repair time is 20.609 — the hands route crosses the
     *  survey gate there, and propping her is mandatory before repairing, so the +8 workspace
     *  term is always in. That is rung `basic`, weakness 0.6 on each system, and 1.2 x 0.34 =
     *  **0.408** — under 0.5, in every reachable state. A sweep of technique 0..100 against
     *  three understanding profiles found ZERO states where she failed to swim.
     *
     *  0.25 IS CHOSEN TO MEAN ONE LEGIBLE SENTENCE: *no `basic` repair may remain in her*.
     *  basic/basic is 0.408 and basic/competent 0.323 — both above it; competent/competent is
     *  0.238, below it with room. So the gate refuses exactly the hull that was rushed, the
     *  forecast says so before a survivor commits, and the post-trial inspection names which
     *  of the two is the weak one. It is only fair because a repair can now be REDONE — see
     *  `structuralBlocker`; a reachable failure with no route out would be a dead end. */
    boatSwampAt: 0.25,
    /** [TUNE] How far a paddled boat travels per stroke-effort, as a fraction of a walk. She
     *  is a platform in flat water, not a way to outrun anything. */
    boatPaddleSpeedFraction: 0.42,
    /** [TUNE] What a sound hull of this size carries before her freeboard goes. Scaled DOWN by
     *  how well she was actually repaired, so load reads the hull rather than duplicating it. */
    boatBaseCapacityKg: 180,
    /** [TUNE] Cordage for a painter, so she is where you left her. */
    boatMooringFiberCost: 3,
    /** [TUNE] SESSION 2 — how far a short line-ferry actually goes: out to the end of a line
     *  you can still haul her back on, and home again. Metres of water, round trip.
     *
     *  BASIS, AND IT IS A CEILING RATHER THAN A DISTANCE. The wreck lies ~115 m off this
     *  shore — the number `swimEnergyDrainPerGameHour` is balanced against and counted in.
     *  90 m round trip is 45 m out, comfortably short of it, and short ON PURPOSE: the wreck
     *  is a B3 destination and a B2 hull has no business arriving there. The tether is the
     *  honest reason a survivor cannot simply paddle away, and this is its length as a number. */
    boatFerryDistanceM: 90,

    // ---- RAIN & WET ESCALATION — the second hazard family --------------------
    //
    //  THE SHAPE THESE SERVE. Two free warning stages, then two that cost, then a soaked
    //  aftermath — and the whole event fits inside a phone session so a survivor sees it end.
    //  The two warnings together are the preparation window, and they are deliberately the
    //  longest part of the event: reading the sky has to be worth more than reacting to rain.

    /** [TUNE] Storm — game hours before the FIRST storm of a run. Basis: 30 gh is past the
     *  first night and the first shelter, so nobody's opening hour is a storm they had no
     *  tools to answer. The island introduces itself before it tests anybody. */
    stormFirstAtGameHours: 30,
    /** [TUNE] Storm — game hours of clear weather between storms. Basis: ~2.5 game days, so a
     *  storm is an event a survivor remembers rather than weather they stop reading. */
    stormIntervalGameHours: 60,

    /** [TUNE] Storm — the PRECURSOR stage, in game hours. Costs nothing. Basis: 1.2 gh is
     *  ~3 real minutes — long enough to walk home from anywhere on the island. */
    stormPrecursorGameHours: 1.2,
    /** [TUNE] Storm — the WATCH stage. Also costs nothing. Basis: 0.8 gh, shorter than the
     *  precursor because it is the second warning: the time to finish what you started, not
     *  to start something. Together the two give ~5 real minutes of free preparation. */
    stormWatchGameHours: 0.8,
    /** [TUNE] Storm — COMMITTED, the first rain. Basis: 1.0 gh at reduced intensity — the
     *  stage where a survivor who ignored both warnings can still get under cover having
     *  paid something rather than everything. */
    stormCommittedGameHours: 1.0,
    /** [TUNE] Storm — IMPACT, the weight of it. Basis: 2.0 gh, the longest costed stage, so
     *  the answer to a storm is a place to be rather than a sprint to outlast it. */
    stormImpactGameHours: 2.0,
    /** [TUNE] Storm — AFTERMATH: no more rain, everything soaked. Basis: 1.5 gh. Nothing is
     *  falling, so the cost is drying off — which the shipped `wetDecayPerGameHour*` rates
     *  already price, and a sheltered survivor already dries four times faster. */
    stormAftermathGameHours: 1.5,

    /** [TUNE] Storm — how hard it rains at COMMITTED, as a fraction of the impact.
     *
     *  READ AGAINST THE DRYING RATE, not against zero, which is the correction its own test
     *  forced. `wetDecayPerGameHourDry` (15/gh) runs the whole time, so the number that
     *  matters is the NET: at 0.35 an exposed survivor gained 55×0.35 − 15 = +4.25/gh, and
     *  "the first of it comes down, fat and cold" delivered a faint dampening.
     *
     *  0.5 nets +12.5/gh — unmistakably getting wet, and still a third of the impact's
     *  +40/gh, which is what keeps the committed stage a genuine last chance rather than the
     *  storm proper arriving early. */
    stormCommittedIntensity: 0.5,
    /** [TUNE] Storm — wetness gained per game hour in full, unsheltered rain.
     *
     *  SET AGAINST THE TWO DRYING RATES IT IS FIGHTING, which is the correction the device
     *  harness forced. Written first as 55 — chosen against `wetGainPerGameHourInPond` (240)
     *  on the reasoning that a downpour is not a pond, and against no decay rate at all. But
     *  `wetDecayPerGameHourSheltered` is 60/gh, so ANY survivor standing at their shelter
     *  dried faster than the hardest rain could wet them. Sound roof and holed roof both read
     *  +0.00, and the tie to the maintenance model this stage exists to prove could not
     *  manifest.
     *
     *  100/gh, and the three cases it has to separate:
     *    EXPOSED             100 against `wetDecayPerGameHourDry` (15) — net +85/gh, so an
     *                        exposed survivor soaks through in a little over a game hour.
     *    SOUND ROOF          100 × (1 − 0.55) = 45 against 60 — net NEGATIVE. A sound roof
     *                        keeps you dry through the worst of it, which is what a roof is.
     *    FAILING THATCH      the defect takes 0.6 of the rain answer, leaving 0.22, so
     *                        100 × 0.78 = 78 against 60 — net +18/gh. The roof is still
     *                        helping and is no longer enough, which is exactly the felt
     *                        difference a named defect is supposed to buy. */
    stormWetGainPerGameHour: 100,

    /** [TUNE] Storm — how much of the rain a SOUND lean-to keeps off, 0..1.
     *
     *  This is `builtShelterProfile`'s `rain` answer, which has been 0 since Drop 3 for the
     *  honest reason that nothing had ever rained.
     *
     *  0.55, and the number is set by the CAVE rather than by the rain. `caveRainAnswered` is
     *  1.0, so a lean-to at the 0.85 this was first written as left the best roof on the
     *  island a fifteen-point edge — erasing the one thing a cave is unambiguously better at,
     *  in the very stage that finally gives that statistic a question. A lean-to is a roof and
     *  one open side; a cave is stone on every side but the mouth, and in a storm that gap
     *  should be the difference between damp and dry.
     *
     *  It is also the one shipped number this coefficient moves: the evaporative term reads
     *  `(1 - refuge.rain)`, so a WET SHELTERED body now loses less than it did before this
     *  pass. That is correct — a roof keeps the weather off you, which is thermal.ts's own
     *  stated reading of this term — and it is a real change to a case the refuge grid
     *  explicitly holds at wet=0, so it is pinned by its own test rather than assumed neutral. */
    shelterRainAnswered: 0.55,

    /** [TUNE] Storm — wear added to the ROOF COVERING when an impact ends.
     *
     *  0.12, which is just OVER a third of `defectShowingAt` (0.34) — so three unanswered
     *  storms land at 0.36 and the roof is visibly thinning, and two land at 0.24 and it is
     *  not. Written first as 0.11, where three storms reached 0.33 and the comment claiming
     *  "roughly three" was claiming a number the constant did not deliver; its own test caught
     *  it, the same way `defectMendPerWood`'s did a stage earlier.
     *
     *  The storm hands WORK to the maintenance model rather than taking health, and that is
     *  what "no disaster exists alone" buys: a hazard whose aftermath is a debt at a named
     *  place, payable in wood and walking. */
    stormThatchDamage: 0.12,
    /** [TUNE] Storm — wear added to the FOOTING when an impact ends. Basis: half the thatch's,
     *  because standing water is what rots a post and the rain has to pool before it does.
     *  The LASHING is deliberately untouched: this hazard is rain, not wind. */
    stormFootingDamage: 0.055,

    // ---- ENTROPY & MAINTENANCE (v0.11 §8) — the decay half ------------------
    //
    //  THE SHAPE THESE NUMBERS SERVE. Three named places, three different drivers, and two
    //  spoken stages before anything is taken. The rates below are sized so that a shelter
    //  left entirely alone reaches its FIRST warning inside a couple of game days and its
    //  first real consequence a couple after that — slow enough that a survivor doing other
    //  things is not nagged, fast enough that ignoring it for a week is visibly a choice.

    /** [TUNE] Upkeep — wear at which a defect starts SHOWING: the first spoken warning, and
     *  it costs a little. Basis: a third of the way to failure, so the warning arrives with
     *  most of the runway still ahead of it. */
    defectShowingAt: 0.34,
    /** [TUNE] Upkeep — wear at which a defect is FAILING: the consequence, after two spoken
     *  stages. Basis: 0.75 rather than 1.0 so the last quarter is a survivor living with a
     *  known-bad building rather than a bar filling to the end. */
    defectFailingAt: 0.75,

    /** [TUNE] Upkeep — how much of the affected answer a SHOWING defect takes, as a fraction.
     *  Basis: a quarter. Noticeable in the refuge line and on a cold night, and nowhere near
     *  enough to make a warned survivor's shelter useless. */
    defectShowingAnswerLoss: 0.25,
    /** [TUNE] Upkeep — how much a FAILING defect takes. Basis: 0.6 — most of that answer, but
     *  never all of it: a racked frame is still a frame. Only the FOOTING reaches two answers
     *  at once, and that is the load path doing what a load path does. */
    defectFailingAnswerLoss: 0.6,

    /** [TUNE] Upkeep — the lashing works loose per game hour OF NIGHT. Basis: 0.010/h reaches
     *  the first warning in ~34 night hours, which at this island's day length is a few
     *  nights of weather. The wind is what unpicks a knot, so the night is what charges it. */
    defectLashingPerNightHour: 0.010,
    /** [TUNE] Upkeep — the fraction of that rate the lashing wears during the DAY. Basis: a
     *  fifth. Not zero — the wind does not stop at dawn — but the night is the driver, and a
     *  rate that ignored daylight entirely would be a rule rather than weather. */
    defectLashingDayFraction: 0.2,

    /** [TUNE] Upkeep — the thatch thins per game hour, always. Basis: 0.0045/h reaches the
     *  first warning in ~76 h, about three game days. This is the slowest of the three and
     *  the only one nothing can slow down: weathering is what a roof is FOR. */
    defectThatchPerGameHour: 0.0045,

    /** [TUNE] Upkeep — the footing rots per game hour on a fully damp site. Basis: the fastest
     *  of the three (0.014/h, ~24 h to the first warning) because it is the one the player
     *  chose: a shelter pitched on wet sand tells you so within a day, and a shelter pitched
     *  inland never raises it at all. */
    defectFootingPerGameHour: 0.014,
    /** [TUNE] Upkeep — the fraction of that rate on a site that is near the water but not IN
     *  it. Basis: half. The beach is damp underfoot without standing water on it. */
    defectFootingDampSite: 0.5,
    /** [TUNE] Upkeep — how far from the island's centre counts as a damp site, in metres.
     *  Basis: `beachRadius` (96) — the sand, which is exactly the ground that stays wet. A
     *  shelter in the scrub or under the treeline never rots at the feet. */
    defectFootingDampRadiusM: 96,

    /** [TUNE] Upkeep — wear removed by spending one wood on ONE named place.
     *
     *  EXACTLY `defectShowingAt`, and the equality is the point rather than a coincidence:
     *  one wood clears a SHOWING defect precisely, and a FAILING one is by definition past
     *  that threshold, so it always takes two. Written first as a flat 0.45, where a defect
     *  sitting on the failing threshold dropped straight to sound in one visit — the comment
     *  claimed two and the number delivered one, which its own test caught.
     *
     *  That is the maintenance debt made concrete: deferring does not accrue a hidden
     *  multiplier, it accrues TRIPS — wood carried and distance walked, the only kind of debt
     *  a player can plan around. */
    defectMendPerWood: 0.34,

    // ---- FISHING (three methods, one fish) ---------------------------------
    //
    //  THE SHAPE OF THE WHOLE STAGE, stated once here so the numbers below can be read
    //  against it. Three methods, three genuinely different prices:
    //
    //    HANDLINE  cheap to make, and it costs your ATTENTION. You stand there and wait.
    //    NET       costs a PLACE. It fishes while you do other things, but only near it,
    //              and it takes real setup before it holds anything worth lifting.
    //    SPEAR     costs the SITE. Instant, no setup, best per hit — and a miss scares the
    //              fish, so a poor thrower empties a pool learning to throw.
    //
    //  A method that is strictly better than another is a method the other two never get
    //  chosen over, so each of these is deliberately the worst option in someone's situation.

    /** [TUNE] Fishing — fibre to spin one line. Basis: below the torch's binding (2), because
     *  a line is the cheapest made thing in the game and it has to be the first one a hungry
     *  castaway can reach. */
    fishingLineFiberCost: 2,
    /** [TUNE] Fishing — blades to barb a line. One: a hook is a chip of edge, not a tool. */
    fishingLineBladeCost: 1,
    /** [TUNE] Fishing — fibre in a net. Basis: above the raft's lashing (10) — a net is more
     *  cordage than anything else here, which is the whole reason it is not the first thing
     *  you make. */
    netFiberCost: 12,
    /** [TUNE] Fishing — blades to cut a net to shape. One, and it is what makes the net's
     *  discovery signature ({textile, blade}) unique in the game. */
    netSharpbladeCost: 1,

    /** [TUNE] Fishing — game hours a cast handline waits before it resolves. Basis: 0.12 gh
     *  is ~18 real seconds of standing still. Long enough to be a decision you regret when a
     *  boar appears; short enough to fit a phone session. */
    handlineBiteGameHours: 0.12,
    /** [TUNE] Fishing — fish per handline bite. One. The baseline is one fish. */
    handlineYield: 1,
    /** [TUNE] Fishing — how much of a site's pool one handline catch spends. The gentlest of
     *  the three: a line takes fish one at a time and does not frighten the rest. */
    handlinePoolCost: 1,

    /** [TUNE] Fishing — game hours before a set net holds anything at all. Basis: 0.35 gh is
     *  ~53 real seconds. That dead window IS the net's cost — it is a bad choice for a
     *  survivor who wants a fish now, and the right one for a survivor who is about to spend
     *  a while nearby. */
    netSoakGameHours: 0.35,
    /** [TUNE] Fishing — fish a soaking net accrues per game hour once it has soaked. Basis:
     *  well under the handline's effective rate (1 per 0.12 gh = 8.3/gh), because the net is
     *  not meant to be faster — it is meant to run while your hands are busy. */
    netCatchPerGameHour: 3.5,
    /** [TUNE] Fishing — the most a net can hold before it is full and stops. Basis: a full
     *  net is ~2 game hours of soaking, and a haul that big is a genuine carry decision at
     *  `materialMassKg.fish`. */
    netCapacity: 7,
    /** [TUNE] Fishing — how near the survivor must stay for a set net to keep fishing, in
     *  metres. Basis: comfortably beyond `interactRadiusM` (2.5) so "nearby" means the area
     *  and not the spot, and well short of the island, so it is a real tether. */
    netTendRadiusM: 22,
    /** [TUNE] Fishing — pool spent when a net is hauled. The heaviest of the three: a net
     *  takes the whole shoal at once, and the site shows it. */
    netHaulPoolCost: 3,

    /** [TUNE] Fishing — fish per successful spear strike. Twice the handline's, because a
     *  strike is one committed moment against a line's patient minutes. */
    spearFishYield: 2,
    /** [TUNE] Fishing — pool spent by a spear attempt, hit OR MISS. The miss is the point:
     *  a thrown spear scares the shoal whether or not it lands, which is why the worst
     *  thrower is hardest on the water. */
    spearFishPoolCost: 2,
    /** [TUNE] Fishing — chance of a spear strike landing with no technique at all. Basis:
     *  matched to `experimentBaseSuccessChance` (0.35) — this game already decided what an
     *  unpractised attempt at something is worth, and a second opinion would drift. */
    spearFishBaseChance: 0.35,
    /** [TUNE] Fishing — chance added per point of survivalcraft Technique. Basis: the same
     *  0.006 the experiment curve uses, so 100 Technique adds 0.6 and a practised survivor
     *  lands most strikes without ever being certain of one. */
    spearFishChancePerTechnique: 0.006,
    /** [TUNE] Fishing — the ceiling on a spear strike. Never 1: water bends light, and a
     *  formality is not a skill. Matches `experimentMaxSuccessChance`. */
    spearFishMaxChance: 0.95,
    /** [TUNE] Fishing — deepest water a spear can be thrown into, in metres. Basis: just
     *  under `swimDepthM` (1.35), so spear-fishing is a WADING act. Off your feet you have
     *  nothing to throw against — which is also why the 7 m dive site is not a fishery. */
    spearFishMaxDepthM: 1.3,
    /** [TUNE] Fishing — energy one spear attempt costs. Basis: between a shellfish tap (0)
     *  and a deadfall gather (2). Throwing is work; standing holding a line is not. */
    spearFishEnergy: 2,

    /** [TUNE] Fishing — catches a site yields before it is locally depleted. Basis: 6 lets a
     *  handline take six, or a spear take three, or a net take two hauls — so the METHOD
     *  chooses how fast the water empties, which is the population model's whole job. */
    fishSpotPool: 6,
    /** [TUNE] Fishing — game hours before a depleted site has fish in it again. Basis: above
     *  the shellfish's 18 and below a berry bush's 36 — fish move back into a quiet pool
     *  faster than a bush fruits, and slower than you can walk a circuit of the island. */
    fishSpotRegrowGameHours: 26,
    /** [TUNE] Fishing — hunger one fish restores. Basis: between shellfish (22) and raw meat
     *  (18), and closer to shellfish: a fish is the best forage on this island and still not
     *  a meal that ends hunger as a concern. */
    fishHungerValue: 20,
    /** [TUNE] Fishing — game hours a fish stays fresh. Basis: HALF the meat's 48. A fish goes
     *  off faster than anything else you can carry, which is what makes the net's big haul a
     *  genuine decision rather than a stockpile. */
    fishFreshGameHours: 24,

    /** [TUNE] Fishing — tap forgiveness around a fishing spot, in metres. Basis: matched to
     *  `traceTapRadiusM` (2.6). A spot is a patch of water, not an object, and the ring that
     *  marks it is flat — the exact case `traceTapRadiusM` was added for. */
    fishSpotTapRadiusM: 2.6,

    //  NO `diveTapRadiusM`. One was written and then deleted unused: a submerged point is an
    //  ordinary node, so `pickNode`'s `nodeTapSlack` fallback already forgives a near miss,
    //  and `screenOfMesh` aims at the mesh rather than the water above it. A constant with
    //  zero callers is the defect this project has now found four times (the spear, the
    //  Backpack door, the trace tap); the fix is to not add the fifth.
    /**
     * [TUNE] MARITIME 3d's fixture headroom, in energy above `swimSpentEnergy`.
     *
     * IT IS HERE RATHER THAN TYPED INTO THE HARNESS because two numbers have to agree and
     * neither is allowed to drift: how far the fixture starts above the SPENT threshold, and
     * how long the harness is willing to wait for the swim to close that gap. The check has
     * now failed twice for opposite reasons — once because the gap was too SMALL for the boot
     * window (D-128), once because it was too LARGE for the poll (D-134) — and both times the
     * two numbers lived in different files with nothing comparing them.
     *
     * 10 energy at `swimEnergyDrainPerGameHour` (70/gh) over `realSecondsPerGameHour` (150)
     * is 21.4 real seconds of swimming. `swimSpentPollBudgetSeconds` below is what the harness
     * waits, and `tests/water.test.ts` asserts the second comfortably exceeds the first.
     *
     * TEN RATHER THAN SIX, and six is what D-128 left. The comparison this pass added found
     * that a 15-second boot — the figure D-128's own note cites as the worst case — drains
     * 7.0 energy, so the headroom never actually covered the failure it was raised to prevent.
     * It was made rarer and then recorded as fixed. Ten clears it with margin.
     */
    swimSpentFixtureHeadroom: 10,
    /**
     * [TUNE] How long MARITIME 3d waits for the swim to reach SPENT, in real seconds.
     *
     * A DEADLINE, NOT AN ITERATION COUNT, and that distinction IS the D-134 fix. The check
     * polled `60 × 120 ms` — 7.2 s of sleep against a 12.9 s swim — so it could only ever pass
     * when each round-trip to the browser cost 214 ms or more. It passed on a loaded machine
     * and failed on a healthy one, which is why three sessions read it as a load artifact and
     * had the causality exactly backwards.
     *
     * 60 s is a little under three times the 21.4 s need. Generous, bounded, and — because a
     * unit test DERIVES it against the headroom rather than trusting it — it cannot silently
     * stop being enough when somebody retunes the swim. The poll stops the moment the stage
     * is seen, so the budget is a ceiling on failure, not a cost paid every run.
     */
    swimSpentPollBudgetSeconds: 60,

    /** [TUNE] Maritime — tap forgiveness around the raft, in metres. Basis: the deck is
     *  2.4 × 2.8 m, so half its diagonal is ~1.85; this is that plus the ~1.5 m of slack the
     *  shelter and the crate already get, on a phone, over water, from a moving camera. */
    raftTapRadiusM: 3.4,

    // ---- THE WRECK (the Wreck Slice) ---------------------------------------
    //
    //  WHAT THE CROSSING BUYS. Six workable parts, each yielding once and shifting back into
    //  reach as the sea moves the wreckage. Yields are deliberately SMALL per part: v0_10's
    //  ruling on what a wreck is — *"a worksite, not a treasure room"* — and a haul that
    //  filled the pack in one visit would make the second crossing pointless.

    /** [TUNE] Wreck — hull plating, per worked part. Basis: enough that a crossing returns
     *  with something that reads as a haul, small enough that the wreck is a place you go
     *  BACK to. Six parts at these yields is roughly one pack-load per full visit. */
    wreckMetalYield: 3,
    /** [TUNE] Wreck — salt-stiff cable from the run where the mast came down. */
    wreckWiringYield: 2,
    /** [TUNE] Wreck — port glass and instrument faces. Scarcer: most of it broke on impact. */
    wreckGlassYield: 2,
    /** [TUNE] Wreck — the ship's medical store. **One.** It is the single most valuable thing
     *  out there and the only salvage that answers a shipped problem, so it is the one a
     *  survivor decides whether to spend now or carry home. */
    wreckMedicineYield: 1,
    /** [TUNE] Wreck — game hours before a worked part shifts back into reach. Basis: longer
     *  than a tree's 96 h, because the sea does the work rather than the season, and because
     *  the crossing should not become a commute. */
    wreckPartRegrowGameHours: 120,
    /** [TUNE] Wreck — energy a single worked part costs, before the resolver's own load,
     *  impairment and environment terms. Basis: above the deadfall's effort — this is prying
     *  metal apart in open water — and it stacks on the paddle out. */
    wreckPartEffortEnergy: 9,

    //  ---- THE HULL'S OWN STAKES ----
    //
    //  The crossing is tuned so a full reserve gets you there and NOT back. The wreck needs a
    //  reason to be careful that matches, and it is the hull itself: every part you take
    //  shifts what is left. Lingering is a real choice rather than a free harvest.
    //
    //  IT RISES ONLY ON AN ACTION, never over time — that is what makes [[D-011]] structural
    //  here rather than checked. It SETTLES over elapsed hours, which is absence making things
    //  better, and is therefore always legal.

    /** [TUNE] Wreck — the instability ceiling; the scale every threshold below reads against. */
    wreckInstabilityMax: 100,
    /** [TUNE] Wreck — how much working one part shifts the hull.
     *
     *  **RETUNED FROM 22, AND ITS OWN TEST CAUGHT WHY.** At 22 the arithmetic in this comment
     *  was simply wrong: three parts is 66, `wreckGroaningAt` is 66, and `hullStageOf`
     *  compares with `>=` — so the THIRD part warned, not the fourth, and a survivor could not
     *  take half the wreck in a sitting the way this line claimed. The check that found it
     *  asserts the BEHAVIOUR ("half the wreck, unwarned"), not the number, which is why it
     *  could catch a number that disagreed with its own stated intent.
     *
     *  At 18 the whole six-part visit reads: 18 / 36 / 54 quiet, **72 groaning (warning 1)**,
     *  **90 giving way (warning 2)**, and only the SIXTH part — worked after both warnings —
     *  is charged. Three quiet, two spoken, then a price. */
    wreckInstabilityPerPart: 18,
    /** [TUNE] Wreck — instability shed per game hour left alone. Basis: 8/h means a fully
     *  destabilised hull is settled again in ~12 game hours — long enough that a survivor
     *  cannot simply wait out a warning on the spot, short enough that a return trip a day
     *  later finds the wreck sound. */
    wreckSettlePerGameHour: 8,
    /** [TUNE] Wreck — instability at or above which the hull is GROANING: the first spoken
     *  warning. Costs nothing. */
    wreckGroaningAt: 66,
    /** [TUNE] Wreck — instability at or above which it is GIVING WAY: the second spoken
     *  warning, and the last stage that costs nothing. */
    wreckGivingWayAt: 88,
    /** [TUNE] Wreck — bleeding severity from a shift that catches the survivor. Reuses the
     *  SHIPPED injury model ([[D-111]]) rather than inventing a wreck-specific harm: torn on
     *  sharp metal is a wound, and this game already knows what a wound does. */
    wreckShiftBleeding: 0.5,
    /** [TUNE] Wreck — health taken outright by the shift that causes the wound. Basis: well
     *  under the boar's charge — the danger out here is the WOUND plus the 115 m back, not the
     *  hit itself, and a one-shot kill at the far end of the crossing would be a trapdoor. */
    wreckShiftHealth: 10,

    /** [TUNE] Wreck — how much illness severity one medical store removes. Basis: comfortably
     *  more than `remedySeverityRelief` (the brewed remedy) — it is a real medicine rather
     *  than a poultice, and it is the payoff for a crossing. Still RELIEF, never a cure: it
     *  cannot take severity below zero and it does not touch the cause. */
    medicineSeverityRelief: 0.75,

    // ---- Shelter (C05) — the lean-to, one tier this cycle ------------------
    /** [TUNE] C05 — build cost: a meaningful step up from the axe, matching "construction". */
    shelterWoodCost: 8,
    shelterStoneCost: 4,
    shelterFiberCost: 3,
    /** [TUNE] C05 — metres from the shelter its bonuses (warmth relief, faster drying) reach. */
    shelterRadius: 6,
    /** [TUNE] C05, replaced by a per-grade table at Ch.1 v3 (D-055) — see
     *  `shelterGradeWarmthMultiplier` below. Within the shelter's radius, warmth's
     *  NIGHT-TIME DRAIN (not the fire's regen) is multiplied by the built shelter's own
     *  grade entry — a partial relief independent of the fire, so the shelter's value
     *  shows even between fire visits. `serviceable` (0.5) reproduces this constant's old
     *  value exactly, so a shelter healed to that grade on migration feels unchanged. */
    /** [TUNE] C05 — how far in front of the player the shelter is placed, in metres — the
     *  same "an arm's length ahead" reasoning as the fire (`fireBuildOffsetM`). */
    shelterBuildOffsetM: 2.2,
    /** [TUNE] C05 — collision footprint of a built shelter, in metres. */
    shelterCollisionRadius: 1.3,

    // ---- Storage (C05) — a second pool for raw materials -------------------
    /** [TUNE] C05 — build cost: wood and stone only, no fibre gate. */
    storageWoodCost: 5,
    storageStoneCost: 3,
    /** [TUNE] C05 — how far in front of the player storage is placed, in metres. */
    storageBuildOffsetM: 2.2,
    /** [TUNE] C05 — collision footprint of a built storage crate, in metres. */
    storageCollisionRadius: 0.9,
    /** [TUNE] C05 — per-resource amount withdrawn per tap when the crate holds any and the
     *  player is carrying none — the disjoint-state rule the pond's fill/drink conflict
     *  proved out (D-042 audit), applied up front here instead of found by a bug report. */
    storageWithdrawBatch: 5,
    // ---- WHAT ONE BOX HOLDS (item 2, this batch) --------------------------------
    /** [TUNE] Capacity of each storage tier, in the SAME bulk units `materialBulk` uses.
     *  Keyed by tier so a later upgrade adds a row rather than editing a global.
     *
     *  BASIS FOR 240, worked from what a survivor can actually carry. Wood is 1.2 kg and
     *  4 bulk a unit, and `loadHeavyAtKg` is 30 — so one HEAVY backpack of timber is 25
     *  wood, which is 100 bulk. A crate at 240 therefore holds about two and a half full
     *  loads of the bulkiest thing worth hoarding (60 wood), or 200 stone, or 96 fibre.
     *
     *  A REALISTIC MID-GAME BASE STOCK — 25 wood, 30 stone, 20 fibre, 10 coconut, 20
     *  berries and a few days of meat — comes to about 220 and fits with room to spare.
     *  So the ceiling is invisible to a survivor who is living out of the box, and bites
     *  exactly when one is deliberately stockpiling a single material, which is the
     *  moment an upgrade ought to start looking worth building. */
    storageCapacityBulk: { crate: 240 },
    /** [TUNE] The smallest footprint the box will describe for one unit of anything.
     *  Basis: `materialBulk.stonehammer` is deliberately 0 ("not to add a second count"),
     *  which was harmless while bulk was a readout and becomes an unlimited store the
     *  moment bulk is a ceiling. A tenth of a unit is small enough to be no tax on the
     *  things that legitimately pack down, and enough that nothing is free. */
    storageMinBulkPerUnit: 0.1,

    // ---- Structure upkeep (C05) — disrepair, never deletion ----------------
    /** [TUNE] C05 — full durability, for any structure (shelter or storage). */
    structureDurabilityMax: 100,
    /** [TUNE] C05 — durability lost per game hour, for any structure. ~4 days from full to 0
     *  — long enough that neglect, not attentiveness, is what triggers it. */
    structureDurabilityDecayPerGameHour: 1,
    /** [TUNE] C05 — durability restored per wood spent repairing (any structure). Whole
     *  numbers only in practice — one tap with wood in hand is one repair. */
    repairDurabilityPerWood: 15,

    // ---- Fire sound falloff (P0-G) ----------------------------------------
    /** [TUNE] P0-G — within this many metres of the fire, the loop plays at full authored
     *  volume. Roughly the firelight's own useful circle: if you can warm your hands at it,
     *  you hear it properly. */
    fireSoundFullAtM: 6,
    /** [TUNE] P0-G — beyond this, the fire is inaudible. It was audible from ANYWHERE before,
     *  at a fixed gain, which is why a fire on the far beach sat on top of the whole mix.
     *  Between the two radii the factor falls off linearly. */
    fireSoundSilentAtM: 34,

    // ---- Renewability law (D-051) — no resource is globally exhaustible ----
    /** [TUNE] D-051 — game hours for a spent node of each kind to regrow. First-pass
     *  numbers; revisit at the next TUNE feedback pass. Ordered fast-to-slow. */
    shellfishRegrowGameHours: 18,
    reedRegrowGameHours: 24,
    driftwoodRegrowGameHours: 12,
    berrybushRegrowGameHours: 36,
    coconutpalmRegrowGameHours: 60,
    rockRegrowGameHours: 72,
    deadfallRegrowGameHours: 48,
    treeRegrowGameHours: 96,
    quarryRegrowGameHours: 120,
    /** [TUNE] D-051 — below this fraction of `treeRegrowGameHours` elapsed, a regrowing
     *  tree reads as a bare stump; at or above it, as a sapling — until fully regrown. */
    treeSaplingAtFraction: 0.5,

    // ---- The stone quarry (D-051) — one large, repeat-minable outcrop ------
    /** [TUNE] D-051 — total stone the quarry holds before it needs to regrow. */
    quarryStoneCapacity: 220,
    // ---- THE BOULDER FORMATION (Drop 2) ---------------------------------------------------
    /** [TUNE] Drop 2 — stone per swing at the bluff. STRICTLY BELOW `quarryYieldPerTap` (4),
     *  which is the spec's own binding constraint: the inexhaustible tier must never be the
     *  fast one, or the finite quarry stops being a decision. Two thirds of a quarry swing. */
    boulderYieldPerSwing: 2,
    /** [TUNE] Drop 2 — energy per swing. Higher than `energyCostQuarryMine` (2) because you
     *  are breaking bedrock rather than lifting loose seam. Together with the halved yield
     *  this makes the bluff cost ~2.7x the quarry's energy per unit of stone — always
     *  available, never fast, never free. */
    boulderEnergySwing: 3.6,
    /** [TUNE] Drop 2 — seconds per swing by hand. Miserable on purpose. */
    boulderHoldSecondsByHand: 5.5,
    /** [TUNE] Drop 2 — with the stone hammer. Basis: a little over half the by-hand time, so
     *  the hammer is the difference between viable and punishing without making it fast. A
     *  future pick takes this further. */
    boulderHoldSecondsWithHammer: 3.0,
    /** [TUNE] Drop 2 — how long a chip scar stays before the rock face weathers smooth. The
     *  island's SKIN heals; its mass never changes. ~2 game days. */
    boulderScarFadeGameHours: 48,
    /** [TUNE] Drop 2 — the bluff's footprint. Larger than `quarryCollisionRadius` because it
     *  is a bigger thing; you walk around bedrock, you do not squeeze past it. */
    boulderCollisionRadius: 2.6,
    /** [TUNE] D-051 — stone spent from the pool per successful mining tap. */
    quarryYieldPerTap: 4,

    // ---- Beach salvage (D-051, pulled forward from Phase 2) ----------------
    /** [TUNE] D-051 — real-minute range between salvage spawns while online; reconcile
     *  advances the same schedule offline, by elapsed game hours (the one clock, D-011). */
    salvageSpawnMinutesMin: 6,
    salvageSpawnMinutesMax: 14,
    /** [TUNE] D-051 — at most this many unclaimed salvage finds exist at once. */
    salvageMaxActive: 3,
    /** [TUNE] FIX-3 (Living Island Track A) — a salvage spawn's radius is bounded by
     *  `WALKABLE_RADIUS` minus this margin, in metres, never by `WORLD.islandRadius`
     *  directly. Root cause closed: the old bound (`islandRadius - 4` = 118 m) reached up
     *  to 10 m past `WALKABLE_RADIUS` (108 m) — into the shore falloff, unreachable on
     *  foot. This margin keeps every spawn genuinely inland of the waterline, not just
     *  technically inside it. */
    salvageShoreMarginM: 3,
    /** [TUNE] D-051 — the common salvage rewards: one resource, a modest amount. */
    salvageWoodAmount: 3,
    salvageFiberAmount: 2,
    salvageStoneAmount: 2,
    /** [TUNE] D-051 — plain odds of the rare bundle over a common single-resource find —
     *  stated as a number, not dressed up as a loot box (honest-systems law). */
    salvageBundleOdds: 0.12,
    /** [TUNE] D-051 — the rare bundle's contents: a genuinely better find, still modest. */
    salvageBundleWoodAmount: 4,
    salvageBundleStoneAmount: 3,
    salvageBundleFiberAmount: 3,

    // ---- Testing aid (D-051 SON addendum) -----------------------------------
    /** [TUNE] D-051 — "Fast movement (testing)" settings toggle multiplier, applied on top
     *  of `walkSpeedMps` (itself unchanged). Off by default; a labelled test aid, not a
     *  gameplay mechanic. */
    testSpeedMultiplier: 3,

    // ---- The stone hammer + knapping (Ch.1 v3, D-055) — Tier-0 -------------
    /** [TUNE] D-055 — stone hammer recipe: a cheap Tier-0 craft, wood + stone. */
    stoneHammerWoodCost: 2,
    stoneHammerStoneCost: 3,
    /** [TUNE] D-055 — raw stone spent per knap; a refining ratio, not 1:1 — the sharp
     *  blade is a step up from the raw material, not a relabel of it. */
    knapStoneCost: 2,
    /** [TUNE] D-055 — sharp blades produced per knap. */
    knapSharpbladeYield: 1,

    // ---- Grades (Ch.1 v3, D-055) — rolled once at craft time ----------------
    /** [TUNE] D-055 — plain, stated odds for the grade roll (honest-systems law, no
     *  loot-box dressing) — crude is common, exceptional is rare. Same order every
     *  roll checks: crude, then serviceable, then refined, then exceptional. First-pass
     *  numbers; revisit at the next TUNE feedback pass. */
    gradeOddsCrude: 0.5,
    gradeOddsServiceable: 0.35,
    gradeOddsRefined: 0.12,
    gradeOddsExceptional: 0.03,
    /** [TUNE] D-055 — axe fell-speed by grade, multiplying `treeChopSecondsWithAxe`
     *  (below 1 is faster). `serviceable` reproduces the old flat rate exactly, so an
     *  axe healed to that grade on migration chops at the same speed as before grades
     *  existed. */
    axeGradeChopMultiplier: { crude: 1.2, serviceable: 1.0, refined: 0.85, exceptional: 0.65 },
    /** [TUNE] D-055 — torch burn-hours by grade, multiplying `torchBurnGameHours`.
     *  `serviceable` reproduces the pre-grade duration exactly. */
    torchGradeBurnMultiplier: { crude: 0.7, serviceable: 1.0, refined: 1.4, exceptional: 2.0 },
    /** [TUNE] D-055 — shelter's warmth-drain multiplier by grade (replaces the old flat
     *  `shelterWarmthDrainMultiplier`; lower is better, same meaning as before).
     *  `serviceable` (0.5) reproduces the pre-grade value exactly. */
    shelterGradeWarmthMultiplier: { crude: 0.55, serviceable: 0.5, refined: 0.35, exceptional: 0.2 },
    //  [TUNE] F3 (Slice 1 item 2): `crude` moved 0.65 -> 0.55. The first shelter a castaway
    //  can build on night one now cuts 45% of the night's cold, inside F3's 40-50% target
    //  band; at 0.65 it cut 35% and missed the band low. `serviceable` (0.5 = 50%) sits at
    //  the top of the band, and the better grades deliberately exceed it — the target is the
    //  BASELINE refuge, not a ceiling on the ones you work for.

    // ---- Ch.2, "The Knowledge Model" (MAJOR artifact) — domain scores ------
    /** [TUNE] Ch.2 — every domain score's ceiling (Technique/Understanding/Adaptation). */
    knowledgeScoreMax: 100,
        /** [TUNE] Ch.2 mastery, made real (Gate 0 item 3). At FULL technique (100) an effortful
     *  hold takes `1/(1+this)` of its base time — 0.6 means a master works in ~62% of a
     *  novice's time. Stacks multiplicatively with the per-skill level bonus and the tool's
     *  own grade: mastery is the person, grade is the tool, level is the practised verb. */
    masteryTechniqueSpeedBonusAtFull: 0.6,
    /** [TUNE] Ch.2 mastery, made real. At FULL understanding (100) a gather yields
     *  `1+this` times its base — 0.5 means a master takes half again as much from the same
     *  tree. Fractional remainders resolve deterministically from the seeded hash, never
     *  `Math.random`, so the same gather always gives the same answer. */
    masteryUnderstandingYieldBonusAtFull: 0.5,
/** [TUNE] Ch.2 — every domain starts here, not zero — most domains sit untouched for a
     *  long time (no producer exists yet for Foraging & medicine, Mechanical systems,
     *  Electrical & radio, or Navigation & seamanship this pass), and that is correct, not
     *  a gap to fill artificially. */
    knowledgeInnateFloor: 5,
    /** [TUNE] Ch.2 — the evaluator's per-event ceiling for a Technique/Understanding delta
     *  (`evaluateLearningEvent` in knowledge.ts). First-pass numbers; revisit at the next
     *  TUNE feedback pass, the same as every other freshly introduced system this project
     *  has shipped (grades, energy costs, regrow hours). */
    knowledgeTechniqueMaxDelta: 1.5,
    knowledgeUnderstandingMaxDelta: 1.2,
    /** [TUNE] Ch.2 — how Understanding splits between "it mattered" (consequence) and "I
     *  thought about it" (reflection); the two sum to 1 so a factor pair both at 1
     *  saturates the Understanding formula exactly at its ceiling, no more. */
    knowledgeReflectionWeight: 0.6,
    knowledgeConsequenceWeight: 0.4,
    /** [TUNE] Ch.2 — the "trying" channel's baseline factors for an ordinary successful
     *  gather/build/craft: feedback stays high across the board (every direct-world action
     *  is immediately visible in hand, D-042); consequence and reflection are modest —
     *  routine survival play, not a crisis or a deliberate study session. Challenge/novelty
     *  are NOT here — they are each domain's own remaining headroom (`tryFactorsFor` in
     *  knowledge.ts), never a flat constant. */
    tryingFeedbackFactor: 0.9,
    tryingConsequenceFactor: 0.25,
    tryingReflectionFactor: 0.3,
    /** [TUNE] Ch.2 — a null-outcome combination attempt's factors (D-055's journal, wired
     *  for real this pass): novelty and feedback are both effectively certain — the
     *  journal's own dedup guarantees this is genuinely the first time this exact pair has
     *  been tried, and the Build panel makes the non-match legible at a glance. */
    nullOutcomeNoveltyFactor: 1,
    nullOutcomeFeedbackFactor: 1,
    nullOutcomeReflectionFactor: 0.4,

    // ---- Ch.6, "The Body Model" — carry weight (D-058) ---------------------
    /** [TUNE] Ch.6 — mass in kg per ONE unit of each carried material. Keyed by the same
     *  `MaterialKind` set `MATERIAL_PROFILE` (materials.ts) already uses, so a new material
     *  cannot be added without deciding what it weighs. Rough real-world proportions: stone
     *  and its knapped blade are the dense ones; fibre and food are near-negligible
     *  individually and only matter in bulk. First-pass numbers; revisit at the next TUNE
     *  feedback pass. */
    materialMassKg: {
        wood: 1.2,
        stone: 2.0,
        fiber: 0.15,
        berries: 0.1,
        coconut: 1.4,
        //  The husk once the water and flesh are gone — light, and mostly air.
        shell: 0.25,
        shellfish: 0.3,
        //  FISHING — heavier than a shellfish, lighter than a coconut. A full net is 7 of
        //  these, which is a real carry decision and is meant to be.
        fish: 0.45,
        sharpblade: 0.4,
        //  DROP 1 — a unit of boar meat. Between shellfish (0.3) and coconut (1.4): heavy
        //  enough that carrying a whole kill home is a real load decision.
        meat: 0.5,
        //  COOKING drives the water out of it, so a cooked unit is LIGHTER than the raw
        //  unit it came from. A small, honest reward for the hour: a whole boar carried
        //  home cooked is a lighter load than the same boar carried home raw.
        cookedMeat: 0.4,
        //  THE WRECK SLICE. Metal is the heaviest thing in the game — heavier per unit than
        //  stone — and that is the point: a full haul off the wreck is a real load to paddle
        //  home, so what you take is a decision made 115 m out with a load band watching.
        metal: 3.0,
        wiring: 0.6,
        glass: 0.5,
        medicine: 0.2,
        //  ITEM 3 (this batch) — the stone hammer, migrated from `toolMassKg.stoneHammer`
        //  (same 1.5 kg, unchanged) now that it is a real `Inventory`/`MaterialKind` entry
        //  and this table's own compile-time guarantee ("a new material cannot be added
        //  without deciding what it weighs") applies to it like anything else. Read through
        //  the SAME generic per-unit loop (`carriedWeightKg`, body.ts) as every other
        //  material — no special case left for it there any more.
        stonehammer: 1.5
    },
    /** [TUNE] Ch.6 — fixed mass in kg of each owned tool. Charged once when owned, not per
     *  use — a carried axe weighs the same whether or not you are swinging it. The flask's
     *  mass is its own; the sips inside it are not separately weighed (a mouthful of water
     *  is noise against a 1 kg flask). */
    toolMassKg: {
        axe: 1.8,
        //  P0-4 — the spear had no mass because it had never been a tool. A shaft plus a
        //  knapped head is lighter than the axe and longer than everything else: cheap to
        //  carry, and the reason a survivor keeps one on their back rather than at camp.
        spear: 1.2,
        flask: 0.9,
        //  `stoneHammer` LEFT (v34, item 3) — see `materialMassKg.stonehammer` above.
        torch: 0.7
    },
    /** [TUNE] Ch.6 — load-band thresholds in kg. At or below `loadWorkingAtKg` the castaway
     *  is Light (unencumbered); above it, Working; above `loadHeavyAtKg`, Heavy. Sized
     *  against real early-game carries: a full trip home from the quarry (~10 stone = 20 kg)
     *  should land in Working, not Heavy — Heavy is for genuine hoarding, not ordinary play. */
    /** [TUNE] Item 1 — how much LESS a survivor can carry before making a backpack. Both
     *  load-band thresholds drop by this. Basis: `loadWorkingAtKg` is 14, and a full trip
     *  home from the quarry (~10 stone = 20 kg) is meant to land in Working; without a pack
     *  that same trip should land in HEAVY, so the pack is the difference between hauling and
     *  struggling. Not a hard cap — you can still carry everything, it just costs more. */
    backpackLoadPenaltyKg: 6,
    /** [TUNE] Item 1 — what a backpack costs. Fibre and wood: a frame and a lashing. Cheap
     *  enough to be an early win, expensive enough to be a decision on day one. */
    backpackFiberCost: 6,
    backpackWoodCost: 2,
    /** [TUNE] Item 1 — an edge to cut and shape the fibre. One blade, not consumed lightly. */
    backpackBladeCost: 1,
    loadWorkingAtKg: 14,
    loadHeavyAtKg: 30,
    /** [TUNE] Ch.6 — walk-speed multiplier per load band, applied on top of `walkSpeedMps`
     *  (the base constant itself never changes) and stacking with the existing exhaustion
     *  multiplier. Light is deliberately exactly 1 — an unencumbered castaway moves exactly
     *  as they did before Ch.6 existed, so this system is invisible until it is earned. */
    loadSpeedMultiplier: { light: 1, working: 0.88, heavy: 0.7 },
    /** [TUNE] Ch.6 — energy-cost multiplier per load band. Multiplies BOTH the ambient
     *  per-game-hour drain (reconcile.ts) and every effortful gather's own cost
     *  (`effortEnergyCostFor`, D-052) — reusing that existing plumbing rather than adding a
     *  parallel drain. Light is exactly 1, for the same "invisible until earned" reason. */
    loadEnergyMultiplier: { light: 1, working: 1.25, heavy: 1.6 },
    /** [TUNE] D-059 — OVERLOAD, past the top band. Root cause of "100 rock produced no
     *  observable effect": the three bands saturate. `loadHeavyAtKg` is 30, so 16 stone and
     *  100 stone both read `heavy` and were byte-identical — ×0.7 speed, ×1.6 energy — with
     *  no cap anywhere to stop the pile growing. Weight past the Heavy threshold now keeps
     *  costing, continuously, one step at a time. The bands themselves are UNCHANGED, so
     *  everything Ch.6 tuned and tested below 30 kg behaves exactly as it did. */
    loadOverloadStepKg: 20,
    /** [TUNE] D-059 — speed multiplier lost per overload step, and the floor it may never
     *  cross. **The floor is a safety rail, not a tuning knob**: a castaway must always be
     *  able to walk home and drop their load, so no amount of weight can ever approach a
     *  soft-lock. At 200 kg (100 stone) this bottoms out at the floor — the director's
     *  reported case now moves at roughly half the Heavy-band speed. */
    loadOverloadSpeedPenaltyPerStep: 0.06,
    loadOverloadSpeedFloor: 0.35,
    /** [TUNE] P0-E — the most of a load's weight that practice ever buys off, as a fraction,
     *  reached only at capacity 100. Basis: `swimConfidenceEnergyRelief`'s own shape — the
     *  shipped precedent for "a capacity buys off a bounded fraction of a cost" — kept modest
     *  because this one reaches BOTH speed and energy through the load curves, so it is felt
     *  twice where the swim relief is felt once. At 0.2 a fully practised carrier moves 20 kg
     *  as if it were 16: enough to drop a band and be noticed in the act, never enough to make
     *  weight stop mattering, which is §12's boundary for every capacity. */
    loadToleranceReliefMax: 0.2,
    /** [TUNE] P0-E — the most that practice at going far adds to walking pace, as a fraction,
     *  reached only at capacity 100. Deliberately the SMALLEST of the three felt gains:
     *  walking is continuous, so this multiplies more of the game's minutes than anything else
     *  here, and a large number would rescale the island's distances rather than reward the
     *  survivor. At 0.08 a practised walker crosses the island noticeably but not alarmingly
     *  faster, and a fresh castaway's pace is bit-for-bit unchanged. */
    enduranceWalkSpeedGainMax: 0.08,
    /** [TUNE] D-059 — energy multiplier added per overload step, and its ceiling. Capped so
     *  a huge haul is punishing but never instantly drains a full bar. */
    loadOverloadEnergyPerStep: 0.15,
    loadOverloadEnergyCeiling: 3,

    // ---- Embodied inventory and access (v0_7 §9, D-063) ---------------------
    /** [TUNE] §9 — belt positions and pocket positions. Both are *limited* by design:
     *  the point of a physical quick slot is that it competes for space, otherwise it is
     *  just a second backpack with a nicer name. */
    beltPositions: 4,
    pocketPositions: 2,
    /** [TUNE] §9 — BULK per unit, the second half of "load is mass + bulk + grip + access."
     *  Deliberately NOT wired into the load bands: §9 says the bands stay Ch.6's ("this is
     *  UI on top of that, not a new system"), so bulk is surfaced to the player and used
     *  for pocket eligibility, and nothing else. Loosely, litres. */
    materialBulk: {
        wood: 4,
        stone: 1.2,
        fiber: 2.5,
        berries: 0.4,
        coconut: 2,
        //  Bulky for its weight: a rigid open bowl does not pack down.
        shell: 1.6,
        shellfish: 0.5,
        //  FISHING — awkward for its weight, the way meat is.
        fish: 0.8,
        sharpblade: 0.2,
        //  DROP 1 — bulky for its weight, the way meat is.
        meat: 0.9,
        //  ...and it packs down with the water: less awkward than the raw cut.
        cookedMeat: 0.7,
        //  THE WRECK SLICE. Cable is the BULKIEST thing here without being the heaviest —
        //  a coil eats a pack. Metal plate is dense but stacks flat, which is the honest
        //  inversion: the heavy thing and the awkward thing are not the same thing.
        metal: 1.5,
        wiring: 2.2,
        glass: 0.8,
        medicine: 0.3,
        //  ITEM 3 (this batch) — the stone hammer. ZERO HERE ON PURPOSE, unlike its mass
        //  (`materialMassKg.stonehammer`, which DID migrate the real number): `toolBulk`
        //  below, driven by `TOOL_IDS`/`ownsTool` (loadout.ts's `carriedBulk`), is a
        //  pre-existing, still-correct mechanism that already counts it — the same one
        //  axe/spear/flask/torch ride on, untouched by this migration. This entry exists
        //  only to satisfy `materialBulk`'s own compile-time "every MaterialKind has a
        //  bulk" guarantee, not to add a second count.
        stonehammer: 0
    },
    /** [TUNE] §9 — bulk per tool, same units. */
    //  P0-4 — the spear is the BULKIEST thing a survivor carries and among the lightest.
    //  That asymmetry is the point: a two-metre shaft is awkward on a full pack long
    //  before it is heavy, which is exactly why it lives in a hand rather than in the bag.
    toolBulk: { axe: 5, spear: 6, flask: 1.5, stoneHammer: 4, torch: 2.5 },
    /** [TUNE] §9 — a pocket is for SMALL items only: anything bulkier than this cannot be
     *  assigned to one. The axe and hammer are deliberately above it; the flask and a
     *  knapped blade are deliberately below. */
    pocketMaxBulk: 2,

    // ---- Try-Combining / experimentation (v0_7 §10.6, D-063) ----------------
    /** [TUNE] §10.6 — what one attempt costs the body, win or lose. An experiment is real
     *  work: it burns energy, time, and both food vitals. Costs are charged on EVERY
     *  attempt including a failure, which is what stops brute-force enumeration from being
     *  free — the null-outcome journal makes a repeat attempt free, but only because it is
     *  already KNOWN, never because trying is cheap. */
    experimentEnergyCost: 6,
    experimentGameHours: 0.75,
    experimentHungerCost: 2.5,
    experimentThirstCost: 3.5,
    /** [TUNE] §10.6 — the confidence curve. A first attempt at an unfamiliar combination is
     *  far from certain; practice in the relevant domain raises both the chance it works and
     *  how fast it goes. Expressed against the domain's Technique score so it reuses Ch.2's
     *  existing curve rather than inventing a second progression. */
    experimentBaseSuccessChance: 0.35,
    experimentSuccessPerTechnique: 0.006,
    experimentMaxSuccessChance: 0.95,
    /** [TUNE] §10.6 — time multiplier at zero Technique, falling toward 1 as it climbs. */
    experimentSlowStartMultiplier: 1.6,

    // ---- Ch.6 — rest, recovery, and fatigue (D-058) ------------------------
    /** [TUNE] Ch.6 — energy recovered per game hour while resting. Replaces C05's instant
     *  refill: sleep is now a RATE over elapsed time, never a jump to full. Deliberately
     *  sized so a FULL sleep from empty lands short of the ceiling — see
     *  `sleepRecoveryMultiplier`. A first pass at 9 was caught by this chapter's own
     *  regression test: 9 × 1.5 × 8 = 108 against a 100 ceiling meant every full sleep
     *  capped out, making the new curve behaviourally identical to the instant refill it
     *  was supposed to replace, in exactly the case that matters most. */
    energyRecoveryPerGameHourResting: 7,
    /** [TUNE] Ch.6 — warmth recovered per game hour while resting (under a roof, out of the
     *  weather). Independent of the fire — a bed is its own, slower warmth source. */
    warmthRecoveryPerGameHourResting: 8,
    /** [TUNE] Ch.6 — how much faster recovery runs while actually asleep in a bed, versus
     *  merely at rest. Multiplies both recovery rates above. Chosen against the ceiling on
     *  purpose: a full `sleepDurationGameHours` (8) sleep recovers 8 × 7 × 1.5 = **84**
     *  energy, so an ordinarily-tired castaway wakes full, but one who ran themselves to
     *  empty wakes genuinely short and has to sleep again or push on tired. That gap is the
     *  whole point of replacing the instant refill — without it, "a rate" and "a jump" are
     *  the same thing at the only load that matters. */
    sleepRecoveryMultiplier: 1.5,
    /** [TUNE] Ch.6 — full fatigue. */
    fatigueMax: 100,
    /** [TUNE] Ch.6 — fatigue accrued per game hour while ONLINE and in energy debt (energy
     *  at or below `energyLowThreshold`). Never accrues offline, ever — see reconcile.ts and
     *  the property test that locks it (the Ch.6 analogue of Ch.2's amendment B). */
    fatigueGainPerGameHourInDebt: 3.5,
    /** [TUNE] Ch.6 — fatigue shed per game hour while resting. Faster than it accrues, so a
     *  single good sleep genuinely clears a bad day rather than half-clearing it. */
    fatigueRecoveryPerGameHourResting: 12,
    /** [TUNE] Ch.6 — the three perceivable stages. Below `fatigueMildAt` the castaway reads
     *  as fine and no status text shows at all. */
    fatigueMildAt: 30,
    fatigueModerateAt: 55,
    fatigueSevereAt: 80,

    // ---- Ch.6 — death cost (D-058) ------------------------------------------
    /** [TUNE] Ch.6 — fraction of each CARRIED loose resource stack lost on death. Applied
     *  with `Math.floor`, so a stack of 1–3 loses nothing and no stack is ever wiped by
     *  rounding. Tools, stored goods, skills, and KnowledgeState are all untouched (the
     *  last of those is Ch.2's amendment B, which this second system also respects).
     *  Sized to be recoverable inside roughly one session: at a realistic death you are
     *  carrying perhaps 10–20 units total, so this costs 2–5 units, against a single felled
     *  tree yielding 8 wood — minutes of play, a real sting that is never a setback spiral. */
    deathResourceLossFraction: 0.25,

    // ═══════════════════════════════════════════════════════════════════════
    // WAVE 1 — THE WEIGHTED SHORE, FIRST SLICE (Law 204/217/221-223/226-227/230/234)
    // ═══════════════════════════════════════════════════════════════════════
    //
    //  ONE representative heavy object, end to end, per the director's explicit scope
    //  boundary — not a catalogue. See src/brain/heavyObjects.ts for the tier table and the
    //  teardown ladder, src/brain/shore.ts for the generous-shore density system.

    // ---- THE OBJECT — a beached outboard, still bolted to its transom ------------------
    /** [TUNE] Wave 1 — the outboard's raw mass. Basis: a real single-cylinder outboard of
     *  this era runs 30–40 kg; 35 sits mid-band, heavy enough that T5 (dragged) is the
     *  honest tier for an untrained survivor without tipping into T6/T7 territory this
     *  slice does not build the movement mechanics for. */
    outboardMassKg: 35,
    /** [TUNE] Wave 1 — the raw stone/salvage-adjacent mass that must be dragged clear of the
     *  outboard before Competent-and-up teardown may begin: the workspace requirement (Law
     *  219 read onto field conditions rather than a bench). Below Competent, no workspace is
     *  needed — a novice pulling the fuel cap needs no clearance. */
    outboardWorkspaceClearRadiusM: 2,
    /** [TUNE] Wave 1 — tap-forgiveness radius for the outboard's mesh, the same role
     *  `raftTapRadiusM`/`boatTapRadiusM` play for those objects. Between the two: bigger
     *  than a dropped stack, smaller than the derelict boat it came off. */
    outboardTapRadiusM: 2.2,
    /** [TUNE] Wave 1 — tap-forgiveness radius for a single shore find. Matches
     *  `droppedTapRadiusM` exactly — a small thing at your feet, deliberately tight so an
     *  abandoned find does not swallow taps meant for the sand around it, same reasoning. */
    shoreItemTapRadiusM: 1.2,

    // ---- THE TIER TABLE (Law 204) — thresholds relative to CURRENT capacity, not fixed ----
    //
    //  Mirrors `effectiveCarriedKg`'s own pattern exactly: practice reduces what a load reads
    //  as to this body, never to zero, never past a floor. An object's TIER is therefore a
    //  function of (object mass, survivor's current effective strength) recomputed live, not
    //  a stored property of the object — which is what makes "objects cross tiers as the
    //  survivor trains" true without any code that explicitly moves anything.
    /** [TUNE] Wave 1 — kg at/under which an object is T1 Pocketable, for a baseline (untrained)
     *  survivor. Scales down with practice like every other effective-weight read. */
    tierPocketableMaxKg: 1,
    /** [TUNE] Wave 1 — T2 One-handed ceiling. */
    tierOneHandedMaxKg: 5,
    /** [TUNE] Wave 1 — T3 Two-handed ceiling. */
    tierTwoHandedMaxKg: 15,
    /** [TUNE] Wave 1 — T4 Shouldered ceiling. */
    tierShoulderedMaxKg: 25,
    /** [TUNE] Wave 1 — T5 Dragged ceiling. Above this a lone survivor cannot move it at all
     *  without T6 apparatus (pole/rollers/skids/ramp) — not built this slice; an object
     *  above this ceiling is inert to `drag` and says so rather than silently refusing. */
    tierDraggedMaxKg: 60,
    /** [TUNE] Wave 1 — how much a load-tolerance-practised survivor's EFFECTIVE mass drops
     *  for tier purposes, reusing `loadToleranceReliefMax`'s own bounded-fraction shape so a
     *  35 kg outboard is always felt as heavy, never free. */
    tierPracticeReliefMax: 0.35,

    // ---- DRAGGING (T5's one implemented movement) -----------------------------------------
    /** [TUNE] Wave 1 — fraction of ordinary walking pace while dragging a T5 object. Basis:
     *  Law 204's own T5 definition, "a fraction of walking pace." */
    dragSpeedFraction: 0.35,
    /** [TUNE] Wave 1 — energy multiplier while dragging, on the same curve family
     *  `loadEnergyMultiplierForKg` already uses for carried weight. */
    dragEnergyMultiplier: 2.2,
    /** [TUNE] Wave 1 — with a pole/lever tool in hand, how much that multiplier eases (Law
     *  204: the tool changes the METHOD, never turns a "no" into a "yes" that was not
     *  already possible). A pole does not unlock dragging; it makes dragging cost less. */
    dragPoleEaseFraction: 0.3,
    /** [TUNE] Wave 1 — base energy cost per metre dragged, before the drag energy multiplier.
     *  Basis: dragging 35 kg of dead-weight metal across sand is real labour; at the T5
     *  ceiling (energyMultiplier near `dragEnergyMultiplier`'s own value) a full metre costs
     *  noticeably more than an ordinary walked one. */
    outboardDragEnergyPerMetre: 0.35,
    /** [TUNE] Wave 1 — metres attempted by a single "Drag it" tap. One hearty pull, not a
     *  continuous hold — this slice has no held-drag gesture, matching how a single thrust or
     *  a single gather is one bounded unit of work rather than a rate. `dragOutboard` itself
     *  turns this into fewer ACTUAL metres via `dragSpeedFraction`. */
    outboardDragMetresPerPull: 2,

    // ---- STUDY (Law 208, 230) --------------------------------------------------------------
    /** [TUNE] Wave 1 — game hours one study session costs. */
    studyGameHours: 1.5,
    /** [TUNE] Wave 1 — understanding gained by the FIRST study of an object class. */
    studyFirstGain: 18,
    /** [TUNE] Wave 1 — how sharply repeat study of the SAME class falls off. Basis: Law 230,
     *  "reproduction is not proof of transfer" — the third study of the same class returns
     *  roughly a tenth of the first, which is steep enough that grinding study on one object
     *  is visibly a poor use of time next to finding a genuinely different one. */
    studyRepeatDecay: 0.35,
    /** [TUNE] Wave 1 — floor on repeat-study value, so it never reaches exactly zero (a
     *  survivor re-examining something always learns a LITTLE, per Law 208's own "evidence,
     *  context limits" language) but stays negligible. */
    studyRepeatFloor: 0.08,
    /** [TUNE] Wave 1 — study alone may lift the eventual teardown outcome by at most this
     *  many ladder rungs. Hard cap named directly in the brief; not a soft diminishing curve
     *  because the brief specifies an exact ceiling, not a taper. */
    studyMaxRungLift: 1,

    // ---- THE TEARDOWN LADDER (Law 217, 221, 226, 227) --------------------------------------
    //
    //  Gap = f(technique, understanding, tools, workspace). The five thresholds below are
    //  read against a single 0-100 "competence" score computed in heavyObjects.ts; each
    //  threshold is the MINIMUM competence that rung requires, so the gap below Basic's own
    //  floor decides degrade-vs-destroy on a miss (see `teardownAttempt`'s own doc).
    /** [TUNE] Wave 1 — competence at/above which Basic (loose fasteners) is reached. Below
     *  this, only Novice (consumables) is reachable regardless of attempt. */
    teardownBasicAt: 20,
    /** [TUNE] Wave 1 — competence at/above which Competent (robust parts survive, delicate
     *  parts lost) is reached. */
    teardownCompetentAt: 42,
    /** [TUNE] Wave 1 — competence at/above which Skilled (subassemblies preserved) is
     *  reached. */
    teardownSkilledAt: 65,
    /** [TUNE] Wave 1 — competence at/above which Expert (complete disassembly, reassembles,
     *  diagnosable/repairable) is reached. */
    teardownExpertAt: 85,
    /** [TUNE] Wave 1 — how far below `teardownBasicAt` competence must fall for a Novice-only
     *  result to DESTROY rather than DEGRADE (only Novice can ever destroy; Basic and up
     *  always degrade toward the rung already banked, per Law 223). A near-miss (competence
     *  just under Basic's floor) mangles the object; a wide miss (next to no technique, no
     *  tools) destroys it — the honest cost of opening something far too early, per the
     *  director's own framing. MUST stay strictly below `teardownBasicAt` itself, or the
     *  branch is unreachable — competence cannot go negative, so the largest possible
     *  shortfall against Basic's floor is `teardownBasicAt` at competence 0. */
    teardownDestroyGapAt: 10,
    /** [TUNE] Wave 1 — mechanicalSystems technique contributed per point of competence,
     *  i.e. the weight technique carries in the gap formula relative to understanding. Set
     *  above understanding's own weight because Law 217 makes ATTEMPT (technique) the thing
     *  that closes real gaps; study (understanding) assists but is capped separately above. */
    teardownTechniqueWeight: 0.7,
    /** [TUNE] Wave 1 — understanding's weight in the same formula. */
    teardownUnderstandingWeight: 0.3,
    /** [TUNE] Wave 1 — flat competence bonus for having a real tool set in hand (a wrench
     *  standing in for "adequate tools" — Law 217's own listed factor) versus bare hands. */
    teardownToolBonus: 12,
    /** [TUNE] Wave 1 — flat competence bonus for a cleared workspace, required from
     *  Competent up (see `outboardWorkspaceClearRadiusM`). */
    teardownWorkspaceBonus: 8,
    /** [TUNE] Wave 1 — mechanicalSystems technique gained by a real strip attempt, win or
     *  lose — Law 217's "the attempt teaches" line, and the ONLY thing that raises
     *  technique this slice (study raises understanding only, per Law 208). */
    teardownAttemptTechniqueGain: 6,
    /** [TUNE] Wave 1 — stone-equivalent scrap mass yielded by a DESTROYED outboard. Law 226:
     *  wreckage keeps mass and possible reuse even when the object itself is gone; this is
     *  that floor, deliberately far below any real rung's yield. */
    outboardDestroyedScrapStone: 3,
    /** [TUNE] Wave 1 — loose-fastener salvage yielded from Basic rung up (added to, not
     *  replaced by, whatever a higher rung also yields — fasteners come loose at every
     *  depth of teardown, not only the shallowest one). */
    outboardBasicFastenerStone: 2,
    /** [TUNE] Wave 1 — chance a freshly reassembled outboard hides a fault (Law 227's
     *  repaired route, proven rather than merely claimed — a reassembly that always works
     *  perfectly would never exercise diagnosis or repair at all). */
    outboardReassemblyFaultChance: 0.4,
    /** [TUNE] Wave 1 — mechanicalSystems.understanding required to correctly diagnose the
     *  reassembled outboard's fault. Set above `studyFirstGain` alone, so a single study
     *  session never guarantees a correct diagnosis on its own — real technique from at
     *  least one teardown attempt has to contribute too. */
    outboardDiagnoseUnderstandingAt: 24,

    // ---- THE GENEROUS SHORE (director's 19 Aug amendment, supersedes "occasional wash-up") --
    //
    //  Density is generated ONCE, at the moment of return, as a pure function of elapsed
    //  hours — never simulated during the absence itself (D-011 at its strongest). See
    //  shore.ts's own header for why this is the actual fix for the measured exhaustion
    //  defect, and why the existing `salvage` node's regrowth rate is deliberately untouched.
    /** [TUNE] Wave 1 — items generated per game hour away, before diminishing returns. Basis:
     *  "return after two days: the beach has been working for you" — 2 days = 48 gh should
     *  read as a genuinely full session's worth of sorting, not a chore. */
    shoreItemsPerGameHourAway: 0.6,
    /** [TUNE] Wave 1 — the point past which additional absence keeps adding items but ever
     *  more slowly — a season-long absence must not spawn thousands of objects (the PERF
     *  rail). Modelled as a soft ceiling via `shoreDensityFor`'s own sqrt-taper, not a hard
     *  cap, so "more time away" always means "somewhat more," never "identical." */
    shoreItemsSoftCapGameHours: 96,
    /** [TUNE] Wave 1 — absolute maximum items the shore may ever hold at once, measured
     *  rather than assumed — see the device PERF finding this ships with. Generation stops
     *  adding once the beach is at this count; nothing already visible is ever removed to
     *  make room, because taking something back that was already there would be exactly the
     *  D-011 violation the rail forbids. */
    shoreMaxItems: 40,
    /** [TUNE] Wave 1 — floor on a genuine return: even ten minutes away earns a small chance
     *  at one item, so the tide never reads as switched off during active play. */
    shoreMinReturnGameHoursForAnyItem: 0.05,
    /** [TUNE] Wave 1 — of newly generated items, the fraction that are REFUSE (worth nothing,
     *  still weighs something — D-131's inert-object precedent, weighted toward the honest
     *  majority per the director's own instruction). */
    shoreFateRefuseShare: 0.62,
    /** [TUNE] Wave 1 — the STOCK share of the remainder after REFUSE — raw material by mass. */
    shoreFateStockShare: 0.24,
    /** [TUNE] Wave 1 — the PART share of the remainder — a real, named component. */
    shoreFatePartShare: 0.1,
    //  TOOL is whatever remains (0.04 of the whole) — deliberately not its own named
    //  constant, so the four shares are provably exhaustive by construction: three declared
    //  fractions plus "the rest," rather than four numbers that could silently drift from
    //  summing to 1.
    /** [TUNE] Wave 1 — of newly generated items, the fraction whose mass alone exceeds what
     *  the survivor can currently carry — the "weight is the filter" guarantee that the
     *  shore always holds a too-heavy-for-now reward in plain sight. */
    shoreHeavyItemShare: 0.15,
    /** [TUNE] Wave 1 — mass of a "too heavy to carry yet" shore item, before effective-weight
     *  practice relief. MUST exceed `tierShoulderedMaxKg` (25) — `tooHeavyToCarry` checks
     *  effective mass against that exact ceiling, so anything at or under it is still
     *  shoulderable and the "weight is the filter" guarantee silently never fires (found by
     *  testing: the original 18 sat below the ceiling it needed to clear). Kept below the
     *  outboard's own 35 kg so the outboard still reads as the singular heavy centrepiece
     *  rather than one of many identical heavy items. */
    shoreHeavyItemMassKg: 30,
    /** [TUNE] Wave 1 — storm density multiplier. Basis: the director's own rhythm rule,
     *  "storms deliver more and worse; calm delivers less and better" — this is the MORE
     *  half. */
    shoreStormDensityMultiplier: 1.8,
    /** [TUNE] Wave 1 — the WORSE half of the same rule: added weight toward REFUSE, taken
     *  from STOCK/PART/TOOL, during a storm batch — a churned-up sea throws ashore mostly
     *  junk fast. Calm subtracts this instead (bounded so REFUSE never drops to zero): fewer
     *  items, and what does wash in has more often survived intact enough to be worth
     *  something. Checked against the brief's own wording before writing this, not assumed
     *  from the variable's name alone — an earlier draft of this constant's comment had the
     *  direction backwards. */
    shoreStormQualityShift: 0.12
} as const;

export type TuneTable = typeof TUNE;

// ---- Derived clock helpers (pure arithmetic over TUNE, no new constants) ----

/** Real seconds in one game hour. 60 real min/day ÷ 24 h = 2.5 real min = 150 real s. */
export const realSecondsPerGameHour =
    (TUNE.dayLengthRealMinutes * 60) / TUNE.gameHoursPerDay;

/** Game hours advanced by one real second. */
export const gameHoursPerRealSecond = 1 / realSecondsPerGameHour;

/** Real seconds an absence must reach before it earns a morning report. */
export const morningReportMinRealSeconds = TUNE.morningReportMinRealMinutes * 60;

/**
 * How loud a fire is from `metres` away, 0..1 (P0-G).
 *
 * Pure, and here rather than in `game.ts`, because the device bench CANNOT witness this: audio
 * never decodes headless, so the gain node does not exist and reading it returns null forever.
 * The arithmetic is provable in a unit test; the WIRING is witnessed on device by the factor the
 * game last handed the mixer. Splitting the claim is the only honest way to cover both halves.
 */
export function fireLoudnessAt(metres: number): number {
    if (metres <= TUNE.fireSoundFullAtM) return 1;
    if (metres >= TUNE.fireSoundSilentAtM) return 0;
    return 1 - (metres - TUNE.fireSoundFullAtM) / (TUNE.fireSoundSilentAtM - TUNE.fireSoundFullAtM);
}
