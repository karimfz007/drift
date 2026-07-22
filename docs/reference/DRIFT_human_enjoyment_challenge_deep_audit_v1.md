# DRIFT — Human Enjoyment & Challenge Deep Audit

**Version:** 1.0  
**Date:** 2026-07-22  
**Basis:** DRIFT Charter v0.2, Ops Protocol v1.1, State, Decisions Log, Cycle Log, Codex, and external player-experience research.

---

## Executive verdict

DRIFT has a strong fantasy, a distinctive return loop, disciplined technical architecture, and a credible long-term arc. Its greatest product risk is no longer “can this be built?” It is **building a correct survival simulation that is more demanding than enjoyable**.

The current documents are strongest at:

- long-term purpose: survive → operate → escape;
- ownership and consequence;
- offline continuity and the morning report;
- architecture, testing, and delivery discipline;
- avoiding destructive offline punishment;
- reducing scope through small cycles.

They are weakest at:

- the immediate pleasure of touching and controlling the game;
- a formal definition of fair, enjoyable challenge;
- meaningful choice at the moment-to-moment level;
- tension-and-relief pacing;
- curiosity as a designed loop rather than a setting promise;
- onboarding and accessibility;
- measuring player experience instead of relying on intuition alone;
- distinguishing healthy uncertainty from compulsion-oriented reward design.

**Recommendation:** proceed without delaying Cycle 01, but amend the governing documents before or during its Stage 0. Add rules and measurements, not major features. The highest-value changes are:

1. Add a **Human Experience Constitution** to the charter.
2. Add a **Fair Challenge Constitution**.
3. Replace the charter’s oversimplified psychology claims.
4. Add a lightweight **experience hypothesis and playtest scorecard** to every cycle.
5. Amend Cycle 01 to include minimal action feedback, contextual onboarding, and a local playtest trace.
6. Reopen the claim that anti-grind is “resolved.”
7. Define DRIFT’s primary player before tuning difficulty.

These additions increase quality while keeping the library-first, work-smart-and-fast strategy intact.

---

# 1. What humans generally enjoy in games

No single theory explains all game enjoyment. The strongest practical pattern across player-experience research is that enjoyable games repeatedly support several human experiences at once.

## 1.1 Competence: “I am learning and becoming capable”

Players enjoy feeling effective, understanding cause and effect, improving, and overcoming challenges that appear possible. Research applying Self-Determination Theory to games found in-game competence and autonomy associated with enjoyment and future play. Difficulty research also indicates that harder is not automatically better: challenge must fit the player’s experience and preserve a sense of competence.

**DRIFT implication:** survival pressure should make the player think and adapt, not merely drain meters. Every early failure must reveal a cause and a remedy. Progression should visibly change what the player can do, not only increase hidden percentages.

## 1.2 Autonomy and agency: “I chose this, and my choice mattered”

Autonomy is not the same as presenting many menu options. It is the feeling that the player acts voluntarily and can pursue more than one viable plan. Agency requires visible consequences from those decisions.

**DRIFT implication:** the important choice is not “press the only available build button.” It is deciding where to spend limited time and resources: reinforce shelter or improve water; burn wood tonight or reserve it; take a dangerous shortcut or return safely. Choices need understandable tradeoffs and more than one viable answer.

## 1.3 Curiosity: “I need to know what is over there or what happens next”

Recent work on curiosity in games identifies curiosity-driven exploration as an important contributor to engagement. A large 2024 experiment on action feedback found curiosity was the strongest predictor of enjoyment and the only predictor of voluntary playtime in that study. Importantly, feedback amplification by itself was not always beneficial; legible action-outcome relationships and uncertain-but-understandable success mattered more.

**DRIFT implication:** the Bermuda mystery should operate as a repeating question loop:

> visible anomaly or information gap → safe partial investigation → clue or useful reward → partial answer → larger question

Mystery should not be delivered only as lore text in Phase 3. Small visual promises should begin early, without violating the grounded-first tone.

## 1.4 Control and effectance: “The game understood my intention”

Good controls are not simply functional. Players need immediate confirmation that the game registered their intent. The Player Experience Inventory treats ease of control, progress feedback, goal clarity, audiovisual appeal, and challenge as direct functional parts of player experience.

**DRIFT implication:** every frequent action needs four readable states:

1. available target;
2. action engaged;
3. progress or resistance;
4. success, partial success, or clear failure.

The response should be immediate, but amplification must remain grounded. Excessive particles and screen shake can reduce clarity and agency.

## 1.5 Clear goals across multiple horizons

Flow-oriented game research consistently includes clear goals, immediate feedback, control, and challenge-skill balance. DRIFT’s distant goal—escape—is excellent, but the immediate and session goals need a formal rule.

At nearly every moment, the player should understand:

- **Now:** what matters in the next 10–30 seconds;
- **Session:** what they are trying to complete before leaving;
- **Run:** how the current work advances survival, operation, or escape.

This does not require quest markers everywhere. It requires readable needs, environmental cues, and progress visibility.

## 1.6 Tension and relief

Continuous pressure becomes fatigue. Enjoyable survival games usually alternate between threat and temporary safety.

**DRIFT implication:** fire must be more than a warmth multiplier. It is the first sanctuary: visual warmth, calmer sound, reduced immediate pressure, and a moment to plan. Every danger system should have a reliable relief state that the player can earn.

The desired emotional waveform is:

> warning → decision → commitment → danger → resolution → relief → reward → new question

Not:

> drain → drain → maintenance → random loss → more drain

## 1.7 Ownership and meaning

DRIFT correctly recognizes that players care about things they build. The safest way to deepen attachment is through visible history, personalization, improvement, and useful memories—not by frequently threatening deletion.

**DRIFT implication:** a repaired wall, named shelter, scarred tool, run log, and accumulated morning reports can create attachment without relying on severe loss.

---

# 2. What makes challenge enjoyable rather than frustrating

Difficulty is the amount of demand. Challenge is the player’s experience of confronting demand with a plausible path to success. Frustration appears when cost is high but information, control, or recovery is low.

## 2.1 The fair-challenge test

Before a punishment or failure ships, all six questions should be answerable “yes”:

1. **Was the danger telegraphed?**
2. **Could the player understand the relevant rule?**
3. **Did the player have at least one reasonable preventive or mitigating action?**
4. **Can the player explain why the result occurred afterward?**
5. **Does failure teach a useful adjustment?**
6. **Is recovery proportional to how predictable and avoidable the failure was?**

If the answer is no, the system is generating frustration rather than fair challenge.

## 2.2 Difficulty should grow through decisions before numbers

The cheapest way to increase difficulty is to increase drain, health, damage, cost, or action time. It is also the fastest way to create grind.

Prefer this order:

1. introduce a new readable decision;
2. combine two already-mastered systems;
3. reduce certainty while preserving clues;
4. require planning across a longer horizon;
5. tighten numerical margins only after the above work.

Examples:

- Better: rain is coming; choose roof repair or water collection.
- Worse: warmth now drains 20% faster.
- Better: a cave route is shorter but leaves no dry fuel on the return path.
- Worse: cave enemies receive 3× health.

## 2.3 One primary challenge at a time during onboarding

The current priority ladder—fire, shelter, water, food—is good, but all four vitals must not become equally urgent at once. Early play should teach one pressure, provide relief, then introduce the next.

Recommended Phase 1 teaching order:

1. exposure and fire;
2. shelter and night safety;
3. thirst and water planning;
4. hunger and food variety;
5. energy and expedition timing.

The player may see future needs before they become acute, but only one should dominate the first minutes.

## 2.4 Player-selected risk is more satisfying than invisible adjustment

Difficulty research indicates that player preference and experience matter, not merely measured ability. Secret dynamic difficulty can weaken trust if the player senses that the rules are being manipulated.

DRIFT should prefer:

- optional dangerous routes;
- explicit expedition risk ratings;
- visible weather and threat forecasts;
- voluntary longer offline production with greater exposure;
- accessibility and assist settings;
- a later hardcore ruleset.

Use adaptive assistance carefully and transparently: contextual hints, a larger interaction radius, or slower early drains after repeated failure are preferable to secretly changing loot rolls or enemy outcomes.

## 2.5 Failure should preserve momentum

A corpse run can be exciting when the route, cause, and recovery are understandable. It is miserable when it repeats a long chore.

Rules to add:

- mastered setup work should become faster or automatable;
- repeated failure should shorten re-entry, not lengthen it;
- recovery routes should contain a changed decision, not identical repetition;
- catastrophic loss requires explicit player commitment to a known risk;
- generic randomness may not destroy escape-critical or identity-defining items.

The offline fairness constitution already covers much of this for absence. The same philosophy should govern active play.

---

# 3. Audit of the current DRIFT documents

## 3.1 Charter v0.2

### Strong and retain

- The three-act reward handoff is excellent.
- The morning report is a credible signature ritual.
- Authored-first island is the correct speed-and-quality decision.
- Offline fairness is unusually thoughtful.
- The brain/body architecture supports fast iteration.
- Escape gives the game a destination.
- The embodied character idea supports competence and identity.

### Missing or weak

#### A. Psychology is currently too reductive

The charter states that dopamine fires on anticipation rather than receipt, variable-ratio rewards hook hardest, loss aversion is approximately twice as strong, and scarcity is the strongest retention lever. These are not suitable as constitutional design laws. They flatten context-dependent research into slogans and can bias the game toward anxiety-driven retention.

**Replace with:**

> DRIFT earns return play through competence, autonomy, curiosity, ownership, and anticipation. Uncertainty is used to create discovery and strategic preparation, never to obscure odds, manufacture compulsion, or punish absence. Guaranteed progress forms the base; variable surprises are optional spice. Loss is proportional, attributable, and recoverable.

Also replace **“vulnerability → domination”** with:

> **vulnerability → capability → earned command, with residual risk**

Total domination removes the survival game’s tension. The player should become capable, not immune to all consequence.

#### B. “Anti-grind resolved” is premature

The output formula can make active work more efficient than idle work, but it does not prevent players from repeating an optimal action for XP or resources.

Change the status from **resolved** to **hypothesis under test**. Add:

- XP for meaningful outcomes, not every animation tick;
- diminishing value from trivial repetition;
- bonuses for challenge, quality, novelty, and varied contexts;
- mastery that removes chores or unlocks alternatives;
- automation of solved work in Act 2.

#### C. No formal human-experience rules

Add the Human Experience Constitution proposed in Section 5.

#### D. No explicit target player

Add a primary player statement:

> DRIFT is first designed for an adult mobile player who enjoys survival and base-building, may only have 2–5 minutes for a check-in, but sometimes wants a 15–30 minute expedition. They may not be a survival expert. The game must be readable one-thumb, deep without menu friction, and demanding without requiring constant attendance.

Hardcore survival veterans are a secondary audience supported later through explicit difficulty rules.

#### E. Curiosity exists as setting, not system

Add a Curiosity Ladder section and require every phase to create at least one unanswered question, one obtainable clue, and one newly visible possibility.

#### F. Accessibility is absent

Add baseline rules:

- no essential information communicated by color alone;
- scalable text and large touch targets;
- hold actions have tap/auto-hold alternatives where reasonable;
- motion and screen-shake controls;
- audio cues also represented visually;
- left/right control placement options;
- difficulty and accessibility are separate settings.

## 3.2 Codex

The Codex is efficient but records only function and gates. Add one lightweight column:

**Experience role** — the human purpose of the entry.

Examples:

- Wood: immediate visible progress; first resource certainty.
- Campfire: sanctuary, relief, and visible preparation payoff.
- Shelter: ownership and permanence.
- Fishing: patient risk/reward and anticipation.
- Wreck container: curiosity and uncertain bonus.

Optionally add **mastery path** only when an entry risks becoming a repeated chore: how tools, skill, or automation reduce friction later.

This prevents the Codex from becoming a technically complete catalogue of items that do not create decisions or emotion.

## 3.3 State document

Add two lines under “Now”:

- **Current experience hypothesis:** what the current cycle should make the player feel.
- **Largest human-risk:** the main way the cycle could be boring, confusing, unfair, or uncomfortable.

For Cycle 01:

- Experience hypothesis: “Turning cold driftwood into a warm refuge feels immediate, understandable, and worth returning to.”
- Largest human-risk: “Gathering and movement feel slow or ambiguous before the player reaches the payoff.”

## 3.4 Decisions log

Add standing decisions D-015 through D-021 from Section 6.

## 3.5 Cycle log

The current Cycle 01 is disciplined, but its body acceptance checks verify completion, not enjoyment. It also excludes audio entirely and uses a 3-second tap-hold per wood with five wood required, creating at least 15 seconds of uninterrupted holding before travel and other actions. That may test patience more than skill.

Cycle 01 should remain small, but add a minimal feedback and onboarding layer. Exact amendments appear in Section 7.

## 3.6 Ops Protocol

The three-gate definition of done is good. Do not add a heavy fourth bureaucracy gate. Instead, make the director’s existing feel gate more structured and make every cycle declare one experience hypothesis.

Add to every cycle spec:

- **PLAYER PROMISE:** one sentence.
- **EXPERIENCE HYPOTHESIS:** intended emotion/experience.
- **HUMAN-RISK:** largest boredom/confusion/frustration risk.
- **PLAYTEST QUESTION:** the one decision the playtest must answer.

Add to PLAYTEST:

A rapid scorecard immediately after play, using 1–5 ratings:

1. I always understood what mattered next.
2. The controls did what I intended.
3. My actions produced clear and satisfying results.
4. The pressure or challenge felt fair.
5. I wanted to continue.

Plus two prompts:

- Most satisfying moment?
- Most annoying or confusing moment?

This is a custom rapid production check, not a validated psychological scale. When external testing begins, use the validated PXI or miniPXI without rewriting its items.

---

# 4. The DRIFT enjoyment stack

Use this stack to prevent feature-led development.

| Layer | Player experience | DRIFT mechanism | Current strength |
|---|---|---|---|
| Tactile | My intent is recognized; actions feel good | movement, targeting, gathering feedback, sound | Weak / unproven |
| Cognitive | I make understandable tradeoffs | resource allocation, expedition planning, offline setup | Promising but underspecified |
| Emotional | I feel tension, relief, ownership, curiosity | fire sanctuary, base, threats, mystery | Strong conceptually |
| Motivational | I become capable and play my way | embodied skills, tools, alternative plans | Strong conceptually; grind risk |
| Long-term | My work leads somewhere | escape, run log, new island | Very strong |

**Production law:** never build upward while the layer below is failing. A long-term meta-loop cannot rescue unpleasant movement. A deep skill tree cannot rescue unclear actions.

---

# 5. Proposed Charter addition: Human Experience Constitution

Insert in Part I after the loops or as a new section before survival systems.

## Human Experience Constitution

1. **Competence before punishment.** The player learns the rule before the rule can impose a severe cost.
2. **Intent must be legible.** Frequent actions acknowledge input immediately and show target, progress, impact, and result.
3. **Choice must matter.** Meaningful decisions have at least two viable options, visible tradeoffs, and understandable consequences.
4. **Difficulty creates decisions.** New challenge comes first from planning, combination, and uncertainty—not inflated numbers or longer chores.
5. **Failure teaches.** Every important failure identifies its cause and suggests a credible adjustment.
6. **Recovery preserves momentum.** The cost of recovery is proportional to the predictability and voluntariness of the risk.
7. **Tension earns relief.** Every pressure system has an achievable sanctuary or recovery state.
8. **Three goal horizons stay visible.** The player can understand what matters now, this session, and for escape.
9. **Progress changes play.** Mastery opens options, reduces solved friction, or changes capability; it is not only percentage growth.
10. **Curiosity advances in steps.** Questions lead to clues, partial answers, and new possibilities.
11. **Guaranteed progress underlies uncertainty.** Random rewards add surprise but never replace reliable progress or conceal required outcomes.
12. **The player’s time is respected.** Absence, disability, control preference, and short sessions are accommodated without removing meaningful challenge.
13. **One human hypothesis per cycle.** Every cycle states the intended player experience and tests it on the target device.
14. **No orphan mechanics.** A system that creates no meaningful decision, emotion, expression, or progression is removed or deferred.

---

# 6. Proposed new standing decisions

## D-015 — Human Experience Constitution

The fourteen rules in Charter Part I govern all mechanics and cycle specs. Technical completion cannot compensate for failed control, clarity, competence, agency, curiosity, or fairness.

## D-016 — Fair Challenge Constitution

A costly failure must be telegraphed, understandable, preventable or mitigable, attributable afterward, educational, and proportionately recoverable. Difficulty grows through decisions and system combinations before numerical inflation.

## D-017 — Reward and retention ethics correction

Guaranteed progress is the base. Variable rewards are limited to optional discovery and bonus outcomes. DRIFT does not use obscured odds, artificial scarcity, escalating absence punishment, or compulsion-oriented reward schedules. The morning report is built around anticipation, causality, preparation, and recovery—not fear alone.

## D-018 — Experience evidence per cycle

Each cycle declares a player promise, experience hypothesis, human-risk, and playtest question. The director completes the five-item rapid scorecard and two open prompts after play. When external testers begin, the team adopts the validated PXI/miniPXI as written.

## D-019 — Minimum game-feel baseline

Every shipped core action has immediate input acknowledgment, readable targeting, progress/resistance feedback, and a clear outcome. Grounded audiovisual feedback is required even with placeholder art. Excess feedback that obscures agency or information is rejected.

## D-020 — Anti-grind remains an open hypothesis

The output formula does not by itself solve grinding. Skill and resource progression must reward meaningful outcomes, novelty, challenge, quality, and investment; trivial repetition faces diminishing value; mastery eventually removes or automates solved chores.

## D-021 — Primary target player

The primary player is a busy adult mobile survival/base-building fan, not assumed to be a genre expert, using short check-ins plus occasional longer expeditions. Hardcore players are served through explicit optional rules, not by making the default opaque or punitive.

---

# 7. Cycle 01 amendment — smart, small, high-value

Do not add combat, more resources, skills, threats, or production. Amend only the human-facing steel thread.

## 7.1 Change the Cycle 01 goal wording

Current wording implies it proves DRIFT’s entire spine. Better:

> Prove DRIFT’s first tactile and emotional promise on a phone: intention becomes action, cold becomes refuge, absence produces an understandable return story, and the permanent architecture supports it.

## 7.2 Amend Scope In: Stage 2 — Body

Add:

- **Two wood interactions:** loose driftwood is instant tap-to-pick-up; deadfall is short tap-hold salvage yielding multiple wood. This tests responsiveness and deliberate action without requiring five identical three-second holds.
- **Grounded feedback kit:** target highlight, hold-progress ring, subtle character/tool motion, resource movement/count pulse, fire ignition animation, restrained particles, and minimal permissively licensed or generated sound.
- **Sanctuary transition:** fire visibly changes the immediate space—warm aura, clearer warmth recovery, calmer ambient presentation.
- **Contextual onboarding:** no long tutorial. Highlight the next relevant object/action; if the player is inactive or repeatedly fails, show one short contextual hint.
- **Local playtest trace:** record time to first move, first wood, five wood equivalent, fire placement, control-mode changes, and steel-thread completion. Store locally or expose in a debug summary; no external analytics service.

Change Scope Out from “audio” to:

> Real art, music, and final audio are out; minimal functional feedback audio is in.

## 7.3 Tune changes

Replace the single `gatherSecondsPerWood` assumption with:

- `looseWoodPickupSeconds = 0` `[TUNE]`
- `deadfallGatherSeconds = 1.5` `[TUNE]`
- `deadfallWoodYield = 2` or `3` `[TUNE]`

Keep `woodPerFire = 5` for now. The point is to create varied rhythm and faster first success, not simply halve all costs.

## 7.4 Add acceptance checks

- **A7 — Input legibility:** movement and interaction input receive visible acknowledgment by the next rendered frame; no stuck movement after release, scene transition, or tab return.
- **A8 — Action-state clarity:** a first-time player can distinguish target available, action engaged, progress, success, and insufficient-resource failure without reading documentation.
- **A9 — First-fire comprehension:** the director can complete the fire sequence without external instruction and can explain why warmth changed.
- **A10 — Experience evidence:** both control modes receive the rapid scorecard; the winner is chosen by intention accuracy and comfort, not only completion time.
- **A11 — Steel-thread trace:** the build can show the recorded times and actions for the completed run so tuning is based on evidence.

## 7.5 Keep out of Cycle 01

Do not add the first major mystery beat, meaningful resource tradeoff, threat, death, or larger challenge. Cycle 01 is already proving controls, gathering, refuge, saving, reconciliation, and return. Curiosity and meaningful planning should enter Cycle 02 with the offline fairness design.

---

# 8. Recommended challenge architecture by act

| Act | Primary challenge | Player skill being developed | Avoid | Relief/payoff |
|---|---|---|---|---|
| Survive | perception, prioritization, execution | reading environment, acting under light pressure | simultaneous meter panic; long chores | fire, shelter, safe morning |
| Operate | planning, tradeoffs, optimization | setting production, allocating stock, preparing absence | maintenance tax; solved repetition | reliable systems, surplus, automation |
| Escape | commitment, expedition risk, integration | combining learned systems toward a destination | pure resource wall; hidden prerequisites | completed vehicle, final departure |
| Replay | adaptation and self-expression | new build, route, island strategy | identical early grind | record comparison, different solutions |

The challenge curve should rotate the kind of thinking required. It should not merely raise all resource costs.

---

# 9. Fast playtest and instrumentation plan

## Internal director testing — every cycle

Use the rapid scorecard and open prompts. Record:

- completion time;
- repeated failed actions;
- idle/confused pauses;
- control-mode switches;
- abandonment point;
- first voluntary action not explicitly prompted;
- whether the player chooses to continue after the stated test goal.

## External testing — after the first integrated playable loop

Do not recruit broadly for Cycle 01. Once fire, shelter, water/food, one meaningful offline choice, and return are integrated, test with a small mixed group:

- survival-experienced players;
- casual mobile players;
- at least one player with lower dexterity or a strong accessibility need.

Use:

- direct observation and think-aloud sparingly;
- the validated miniPXI or full PXI without rewriting items;
- short interviews on satisfying, confusing, unfair, and memorable moments;
- telemetry only with clear consent and only for decisions the team is prepared to act on.

## Decision rule

A feature is not retained because players used it. Retain it when evidence shows it created its intended experience without unacceptable friction.

---

# 10. Priority plan

## P0 — before/during Cycle 01 Stage 0

1. Add D-015 through D-021.
2. Add the Human Experience Constitution.
3. Amend Cycle 01 with minimal feedback, contextual hints, varied wood interaction, and playtest trace.
4. Replace the psychology paragraph.
5. Change anti-grind from resolved to under test.

## P1 — Cycle 02 design

1. Introduce the first genuine planning choice before absence.
2. Apply the fair-challenge test to vital drift and offline outcomes.
3. Add three goal horizons.
4. Add one small curiosity promise.
5. Define transparent assist settings and contextual-help policy.

## P2 — first integrated Phase 1 build

1. Run a small external playtest.
2. Use miniPXI/PXI correctly.
3. Test tension-and-relief pacing.
4. Verify that mastered actions shorten or diversify rather than becoming repeated chores.
5. Validate whether the morning report creates curiosity and agency, not anxiety.

---

# 11. Final recommendation

**Yes, the project needs additions—but not more game systems.** It needs a small set of human-centered laws, evidence requirements, and Cycle 01 feel safeguards.

DRIFT is already unusually strong at purpose, persistence, and architecture. The smart and fast move is to protect those strengths by ensuring that each development cycle proves one human experience, not merely one technical capability.

The most important product sentence going forward is:

> **DRIFT should challenge the player’s judgment, not their patience; reward preparation, not attendance; and make every increase in capability change how survival feels.**

---

# Research basis

- Ryan, Rigby & Przybylski (2006), *The Motivational Pull of Video Games: A Self-Determination Theory Approach*. Motivation and Emotion. https://doi.org/10.1007/s11031-006-9051-8
- Sweetser & Wyeth (2005), *GameFlow: A Model for Evaluating Player Enjoyment in Games*. ACM Computers in Entertainment. https://doi.org/10.1145/1077246.1077253
- Schmierbach et al. (2014), *No One Likes to Lose: The Effect of Game Difficulty on Competency, Flow, and Enjoyment*. Journal of Media Psychology. https://doi.org/10.1027/1864-1105/a000120
- Alexander et al. (2013), *An Investigation of the Effects of Game Difficulty on Player Enjoyment*. Entertainment Computing. https://doi.org/10.1016/j.entcom.2012.09.001
- Vanden Abeele et al. (2020), *Development and Validation of the Player Experience Inventory*. International Journal of Human-Computer Studies. https://doi.org/10.1016/j.ijhcs.2019.102370
- Haider et al. (2022), *miniPXI: Development and Validation of an Eleven-Item Measure of the Player Experience Inventory*. PACM HCI / CHI PLAY. https://doi.org/10.1145/3549507
- Kao et al. (2024), *How Does Juicy Game Feedback Motivate? Testing Curiosity, Competence, and Effectance*. CHI 2024. https://doi.org/10.1145/3613904.3642656
- Tang et al. (2024/2025), *Exploring Curiosity in Games: A Framework and Questionnaire Study of Player Perspectives*. International Journal of Human–Computer Interaction. https://doi.org/10.1080/10447318.2024.2325171
- Pfau & Seif El-Nasr (2023), *On Video Game Balancing: Joining Player- and Data-Driven Analytics*. arXiv:2308.07576.
- Perrig et al. (2024), *Independent Validation of the Player Experience Inventory*. CHI 2024. https://doi.org/10.1145/3613904.3642270

