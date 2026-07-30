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
    fireTapRadius: 1.6,
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
    combineMinInputs: 2,
    combineMaxInputs: 4,

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
    /** [TUNE] C03+ — extra metres of forgiveness when tapping the pond to drink. */
    pondTapSlack: 1,
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

    // ---- Death and respawn (FIX-1 pkg item 2, Living Island Track A; interim only — the
    // full death design is a later dossier chapter) ---------------------------------------
    /** [TUNE] FIX-2 — thirst/hunger/energy wake at this fraction of max on respawn, not
     *  full. Root cause closed: respawn used to refill every vital to full, an exploitable
     *  free-refill loop indistinguishable from genuinely eating/drinking/sleeping. Warmth
     *  is deliberately NOT scaled by this (kept at max, see `respawn()` in state.ts) — it
     *  is the acute killer (Rule of Threes, charter §I.6), and stacking a second cold-death
     *  on the heels of the first is a design tradeoff for the full death chapter, not this
     *  interim fix. */
    respawnVitalFraction: 0.5,
    /** [TUNE] FIX-2 — health wakes at this fraction of max — lower than the other vitals on
     *  purpose (the task's own bracket): a death should read as a real setback, not a
     *  reset with a coat of paint. Comfortably above 0 so a respawn cannot immediately
     *  re-trigger the online death path on the very next tick. */
    respawnHealthFraction: 0.3,

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

    // ---- Structure upkeep (C05) — disrepair, never deletion ----------------
    /** [TUNE] C05 — full durability, for any structure (shelter or storage). */
    structureDurabilityMax: 100,
    /** [TUNE] C05 — durability lost per game hour, for any structure. ~4 days from full to 0
     *  — long enough that neglect, not attentiveness, is what triggers it. */
    structureDurabilityDecayPerGameHour: 1,
    /** [TUNE] C05 — durability restored per wood spent repairing (any structure). Whole
     *  numbers only in practice — one tap with wood in hand is one repair. */
    repairDurabilityPerWood: 15,

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
        shellfish: 0.3,
        sharpblade: 0.4
    },
    /** [TUNE] Ch.6 — fixed mass in kg of each owned tool. Charged once when owned, not per
     *  use — a carried axe weighs the same whether or not you are swinging it. The flask's
     *  mass is its own; the sips inside it are not separately weighed (a mouthful of water
     *  is noise against a 1 kg flask). */
    toolMassKg: {
        axe: 1.8,
        flask: 0.9,
        stoneHammer: 1.5,
        torch: 0.7
    },
    /** [TUNE] Ch.6 — load-band thresholds in kg. At or below `loadWorkingAtKg` the castaway
     *  is Light (unencumbered); above it, Working; above `loadHeavyAtKg`, Heavy. Sized
     *  against real early-game carries: a full trip home from the quarry (~10 stone = 20 kg)
     *  should land in Working, not Heavy — Heavy is for genuine hoarding, not ordinary play. */
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
        shellfish: 0.5,
        sharpblade: 0.2
    },
    /** [TUNE] §9 — bulk per tool, same units. */
    toolBulk: { axe: 5, flask: 1.5, stoneHammer: 4, torch: 2.5 },
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
    deathResourceLossFraction: 0.25
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
