# Game Systems Research: Rust, Minecraft, and Fallout 2

**Compiled:** July 18, 2026 · **Revised:** July 22, 2026 — added dedicated PvP mechanics/culture coverage for Rust (§1.19) and Minecraft (§2.19), which the first pass under-covered.
**Purpose:** Reference material for a downstream design session synthesizing a new game concept from features across these three titles. This document is descriptive only — it catalogs each game's mechanics as they currently exist (or existed, for Fallout 2) and does not propose any merged design or make recommendations about which features to combine. That synthesis work is left to the session this document is handed off to.

**Method:** Compiled from official developer sources (Facepunch's Rust devblog, Mojang's official Minecraft site), primary community wikis (Rust Wiki, Rust Labs, Minecraft Wiki, the Fallout Wiki), and current guide sites, cross-checked against each other. Rust and Minecraft are both under active development, so their sections reflect the state of the games as of July 2026; Fallout 2 (1998, developed by Black Isle Studios) is a finished, unchanging game. A full source list is at the end of the document.

---

## Contents

- **Part 1 — Rust** (multiplayer survival PvP)
- **Part 2 — Minecraft** (sandbox survival/creative)
- **Part 3 — Fallout 2** (turn-based post-apocalyptic RPG)
- **Part 4 — Quick-Reference Feature Index**
- **Sources**

---

## Part 1 — Rust

### 1.1 Overview

- **Developer/Publisher:** Facepunch Studios (UK), self-published.
- **Release:** Early Access December 2013; full release (v1.0) February 2018. Passed its 12th anniversary in December 2025 and remains under active monthly development — in 2025 alone, Rust saw a peak of 259,646 concurrent Steam players and over 700 million hours played.
- **Genre:** Multiplayer-only open-world survival, heavy PvP focus, base building and raiding.
- **Platforms:** PC (Steam) primarily; a console edition exists (ported by Double Eleven); **Rust Mobile** is in closed beta with a global release planned for 2026.
- **Engine:** Unity.
- **Setting:** A procedurally generated (seed-based, regenerated each map/server) open island/continent with varied biomes — temperate, arctic/snow, desert, and (added 2025) jungle — plus, as of the 2026 Naval Update, an offshore "Deep Sea" region with additional islands.

### 1.2 Core Gameplay Loop

Spawn naked on a beach with only a rock and a torch → gather resources → craft tools → build a base → survive the environment and other players → raid or be raided → repeat until the server wipes. There is no scripted narrative, quest system, or NPC storyline — Rust is entirely emergent, player-driven survival and social interaction; it's often described as "a social experiment wrapped in a game." Servers wipe on a schedule (Facepunch forces an official monthly wipe on the first Thursday of each month, timed with the monthly update; many community servers wipe more often, sometimes resetting only blueprints on a faster cadence than the map).

### 1.3 Survival Mechanics

- **Vitals:** Health, Hunger (calories), Thirst (hydration), and body temperature (comfort/warmth vs. cold or heat exposure).
- **Bleeding:** accrues from damage; stops naturally over time or is treated with bandages/medical items.
- **Radiation:** accumulates in irradiated zones (most monuments, some biomes); tracked via a HUD indicator; hazmat suits and rad-resistant clothing mitigate exposure; untreated exposure becomes radiation poisoning.
- **Food spoiling:** perishable food decays in real time unless refrigerated (Fridge / Mini Fridge, both electrically powered — added 2025).
- **Temperature Teas** (Warming/Cooling, in Regular/Advanced/Pure grades) are brewable consumables giving temporary temperature resistance — a 2025 addition.
- **Death:** normally drops a lootable corpse/backpack containing the player's full inventory (a "corpse run" to recover it). In **Softcore** mode, players instead respawn immediately keeping 50% of their inventory, with no corpse to lose.

### 1.4 Resource Gathering & Tools

- **Core resources:** Wood, Stone, Metal Ore (smelted into Metal Fragments), Sulfur Ore (smelted into Sulfur; combined with Charcoal for gunpowder), Cloth, Leather, Scrap, Low Grade Fuel, and High Quality Metal (HQM — mined from specific nodes or obtained via recycling, not smelted from a common ore).
- **Gathering tools** progress from a starting Rock through Stone Hatchet/Pickaxe → Salvaged tools → Metal tools → power tools (Chainsaw, Jackhammer) for sharply faster yields.
- **Furnaces** smelt ore into usable fragments and must be fueled (wood or low-grade fuel); larger furnaces and refineries process more per batch.
- **Animals** — boar, deer/stag, bear, wolf, chicken — are hunted for meat, fat, and leather; cows and sheep with a full breeding system are on Facepunch's announced 2026 roadmap.
- **Monument loot** (crates, barrels, junkpiles) supplements raw gathering, especially for scrap and pre-made components.

### 1.5 Crafting, Blueprints & Tech Tree

- The **Crafting Menu** turns gathered materials into items; most recipes require a minimum-tier **Workbench** (Tier 1–3) nearby to craft.
- Nearly all non-trivial items must first be **learned as blueprints**, via two paths:
  - **Research Table** — consumes a physical copy of an item plus scrap to learn its blueprint directly.
  - **Tech Tree** (built into each workbench) — a node graph rooted at the bench; nodes unlock only if adjacent to an already-owned node, at a scrap cost that rises with tier. An "Experiment" button gambles a flat scrap fee for a random undiscovered blueprint of that tier.
- As of a 2025 rebalance, **Workbench Tier 2 and Tier 3 are themselves tech-tree-gated blueprints** — a player must unlock the next bench's blueprint before they can even build it, rather than simply affording it with scrap.
- **Blueprint Fragments** (partial progress toward a specific blueprint, introduced in the 2025 "Meta Shift" update) replaced a flat "tech tree tax" that existed previously. Blueprint progress typically resets alongside wipes.
- Specialized stations added in the 2025 Crafting Update include dedicated **Cooking** and **Engineering** Workbenches.

### 1.6 Base Building & Decay

- **Placement:** a cheap Building Plan (20 wood) lets a player place structural pieces — foundations, walls, floors, roofs, doorways, windows, stairs — via a radial building menu. Every piece starts at **Twig** tier.
- **Five building tiers, ascending:** Twig → Wood → Stone → Sheet Metal → Armored. Twig has only ~10 HP and offers no real raid resistance — it exists purely as temporary scaffolding. A Hammer upgrades a piece to the next tier at a resource cost; tiers can be skipped (e.g., Twig straight to Stone) if materials allow.
- **Tool Cupboard (TC):** the authority object of a base. It grants "building privilege" (only authorized players/teammates may build within roughly a 30 m radius) and is stocked with resources that are drained as **upkeep** — a fraction of each piece's build cost, pulled from the TC roughly every 24 hours, matched to that piece's tier (stone pieces draw stone, metal pieces draw metal fragments, etc.).
- **Decay:** once the TC runs out of the matching resource, pieces of that tier begin losing health on a timer until they collapse. Commonly cited full-decay times (version-dependent and server-configurable) are roughly Twig ~1h, Wood ~2–3h, Stone ~5h, Sheet Metal ~8h, Armored ~12h from full health once upkeep lapses.
- If a TC is destroyed while still holding resources, it burns up to ~24 hours of "grief protection" upkeep before the base actually starts decaying — a raided base isn't also instantly lost to decay.
- Established community base-design vocabulary — "honeycombing" (extra internal walls forcing raiders through more layers), soft-side/hard-side orientation, airlocks, dedicated loot rooms, and underground bunkers — is all built around these tiering and decay rules.
- **Locks:** Key Lock (physical, limited copies) and Code Lock (4-digit code, vulnerable to being watched or brute-forced) secure doors and containers.

### 1.7 Raiding & Explosives

- **Explosive raiding tools:** Explosive/Satchel Charges (early/mid raiding), Rockets, C4 (Timed Explosive Charge), High-Velocity Rockets, and explosive ammunition (grenades, 40mm HE).
- **Siege weapons** (added 2025, oriented around the Primitive game mode's non-firearm raiding meta): Battering Ram, Catapult, Mounted Ballista, Siege Tower.
- Non-explosive raiding also happens via exploiting weak honeycombing, roof camping, and — in Primitive mode specifically — melee/siege-based methods in place of firearms and explosives.
- **Softcore** raiding is deliberately softened: destroyed containers preserve roughly half their loot in a repairable, recoverable state rather than deleting it outright.

### 1.8 Combat & Weapons

- **Weapon categories:** melee (rocks, hatchets, machetes, swords, salvaged tools), bows/crossbows (Hunting Bow, Compound Bow, Crossbow, Mini Crossbow), primitive firearms (Waterpipe Shotgun, Eoka Pistol), and manufactured firearms — pistols, SMGs (MP5, Thompson, Custom SMG), shotguns (Pump, SPAS-12, Double Barrel), rifles (AK47, LR-300), sniper rifles (Bolt Action Rifle, L96), and heavy weapons (M249, MGL grenade launcher, Rocket Launcher, Minigun).
- **Attachments:** scopes, silencers (including improvised Soda Can/Oil Filter silencers), muzzle brakes, flashlights, and laser sights all modify handling.
- **Armor** runs from cloth/leather and hide through improvised road-sign gear up to full metal-plate and heavy-plate sets, with movement penalties scaling by weight; customizable armor "insert" slots were added in 2025.
- **Recovery items:** Bandages, Med Syringes (usable on players and, since 2025, on horses), Large Med Kits.
- Combat is real-time first/third-person shooting (not turn-based); hit-location multipliers (headshots, etc.) matter; PvP around monuments and bases is the dominant late-wipe activity.

### 1.9 Vehicles

Six broad families plus utility variants:

- **Land:** Horse (tameable or stable-bought; fuel-free, eats food instead; recently overhauled with speed/comfort/digestion mechanics), Modular Car (built on a 2/3/4-slot chassis mixing engine, cockpit, storage, flatbed, and passenger modules; shells found broken-down at junkyards), Bicycle, Motorbike (with sidecar variant), Snowmobile, Trike, Work Carts and a Locomotive (on the underground rail network), Magnetcrane.
- **Air:** Minicopter (2-seat, ~750 scrap from Bandit Camp's "Air Wolf" vendor), Scrap Transport Helicopter (larger, ~1,250 scrap), Attack Helicopter (rare/high-cost), Hot Air Balloon.
- **Water:** Rowboat, RHIB, Kayak, Boogie Board, Inner Tube, Tugboat, PT Boat, Solo Submarine, Duo Submarine (torpedo-armed for naval PvP), and — new with the 2026 Naval Update — player-buildable **Modular Boats** for reaching the new deep-sea islands and monuments.
- **Siege (2025, Primitive-oriented):** Battering Ram, Catapult, Mounted Ballista, Siege Tower.
- All motorized vehicles run on Low Grade Fuel (refined from Crude Oil, or made from animal fat + cloth at a Small Oil Refinery); the Horse is the sole fuel-free option.
- **Drones**, remote-controlled via a Computer Station for recon/camera relay, round out the mobility toolkit; recent updates raised their max range to 600 m and HP to 200.

### 1.10 Electricity System

A genuine node-based logic/power system — effectively a lightweight visual-programming layer built into the game:

- **Sources:** Small Generator, Test Generator, Large Solar Panel, Wind Turbine.
- **Storage:** Small / Medium / Large Rechargeable Battery (larger batteries store more and output more wattage).
- **Distribution:** Wire Tool (cables have a max length/connection-count limit), Root Combiner (merges two sources into one output), Electrical Branch (splits off a fixed amount), Splitter (divides power evenly).
- **Switches & sensors:** Switch/Button, Reactive Target, HBHF Sensor, Laser Detector, Pressure Pad.
- **Logic components:** Blocker, Memory Cell, Timer, Counter, RAND Switch, and true AND/OR/XOR Switches (AND outputs the lower of two live inputs, OR outputs whichever is live, XOR fires only when exactly one input is live), plus a newer Command Block for more advanced automation.
- **RF (wireless):** RF Broadcaster / Receiver / Transmitter / Pager, and RF-keyed Timed Explosive Charges.
- **Outputs:** Lights (Ceiling, Simple, Search, Flasher, Siren, Neon signs, Industrial Wall Light), Auto Turrets, Flame Turrets, Shotgun Traps, SAM Sites, powered doors/garage doors, sprinklers, and more.
- Power behaves as a simple wattage value flowing per server-tick down a wire — no voltage/current simulation — and any wattage a load doesn't consume is lost rather than returned upstream, which is why component *order* (source → battery → logic → output) determines whether a circuit is reliable. This system underlies both automated base defense (turret walls, sensor-triggered alarms/traps) and quality-of-life builds (auto-farms, elevators, timed doors).

### 1.11 Farming & Genetics

- **Planter Boxes** (small/large) and Triangle/Railroad Planters grow crops from seed: Hemp, Corn, Pumpkin, Potato, and Wheat (added 2025), plus multiple berry bush varieties that need no planter.
- Growing requires sunlight, water (via Sprinklers or manual watering — ideally automated through the electricity system), fertilizer (from compost or animal droppings; horse "dung" is an explicit harvestable resource), and suitable temperature (cold biomes reduce yield without Warming Teas or heaters).
- **Genetics:** every plant carries 6 genes drawn from a small set of types — **G** (growth speed), **Y** (yield/amount), and **H** (hardiness), among others. Roughly 20 minutes after planting, a plant enters a cross-breeding window where it can inherit gene values from directly adjacent plants in the same planter, letting players iteratively breed toward an all-G/all-Y "god clone." Community-built calculators exist solely to optimize cross-breeding paths.
- **Composting:** a Compost Bin converts spoiled food and scraps into fertilizer.

### 1.12 Animal Husbandry

- **Chickens:** a Chicken Coop deployable (2025) houses and breeds chickens for eggs and meat, with its own feeding/care UI.
- **Bees:** Beehives (2025) are seeded with a "nucleus," produce Honey over time, and can even be weaponized — a Bee Grenade and Bee Catapult Bomb use live bees as a disruptive area effect.
- **Horses:** tamed in the wild or bought at a Stable; overhauled in 2025 with digestion/dung mechanics, apple-triggered speed boosts, bread-based heal-over-time, and fire-proximity comfort bonuses.
- Facepunch's published 2026 roadmap explicitly promises **Cows and Sheep** with a full breeding system, extending husbandry beyond the current chicken/bee/horse set.

### 1.13 Monuments & Points of Interest

Dozens of hand-crafted "monuments" slot procedurally into each generated map, each with its own loot tables, hazards, and — for higher tiers — keycard-gated puzzles:

- **Safe zones** (no PvP, no radiation): **Outpost** (general vending/recycling/research hub, often the mission-based respawn point) and **Bandit Camp** (vending, gambling, scrap-based black-market shop).
- **Roadside / no-puzzle:** Oxum's Gas Station, Abandoned Supermarket, Mining Outpost, Lighthouse, Abandoned Cabins.
- **Tier 1 "Green Card":** Sewer Branch, Satellite Dish Array, The Dome, Harbor (Small/Large), Water Well variants.
- **Tier 2 "Blue Card":** Water Treatment Plant, Train Yard, Power Plant, Airfield (first monument with scientist NPC defenders), Arctic Research Base.
- **Tier 3 "Red Card" / endgame:** Launch Site (Bradley APC spawn, highest radiation), Military Tunnels, Oil Rig (Small/Large), Missile Silo (deepest, most heavily defended).
- **Other notable sites:** Giant Excavator Pit, Junkyard, HQM/Stone/Sulfur Quarries, Fishing Villages (boat vendors), Ferry Terminal, Underwater Labs (diving-gear-gated).
- **Jungle biome (2025):** Jungle Ziggurat, Jungle Ruins/Remnants, alongside tigers, crocodiles, panthers, snakes, and climbable/swingable vine trees.
- **Naval/Deep Sea (2026):** Floating Cities, Ghost Ships, Tropical Islands — reachable only by the new Modular Boats.
- **Announced for 2026:** an Apartment Complex monument.
- Higher-tier monuments generally require Green/Blue/Red keycards (found or earned through puzzle progression) and often fuses to power puzzle doors; loot value scales with monument tier and, in places, with the surrounding map "tier zone."

### 1.14 World Events

- **Patrol Helicopter ("Heli"):** an NPC-piloted attack helicopter on a multi-hour spawn timer that roams the map and aggressively attacks players carrying visible weapons/armor. Destroying it (best done by targeting its rotors) drops several high-tier loot crates at the crash site.
- **Bradley APC:** an armored cannon-and-machine-gun vehicle patrolling a fixed route at Launch Site; takes meaningful damage only from explosives; deploys extra Scientist/Heavy Scientist defenders as it's damaged — the closest thing Rust has to a boss fight.
- **Cargo Ship:** a large NPC-crewed vessel sailing a slow map patrol (roughly an hour, with a dedicated Harbor dock stop), guarded by numerous armed Blue Scientists, holding multiple lockable/hackable crates, and ending in a timed extraction (players must release a suspended RHIB before the ship's departure siren or go down with it).
- **Chinook Airdrop / Supply Signal:** a cargo helicopter drops a single Locked Crate at a monument on a timer, or in response to a thrown Supply Signal grenade; the crate takes several minutes to hack, drawing PvP attention.
- **Junkpile/roadside scientist spawns:** smaller ambush encounters tied to roadside loot piles.

### 1.15 NPCs

- **Blue Scientists:** the most common hostile NPC, guarding monuments and patrolling roads/the Cargo Ship; carry mid-tier firearms (MP5, SPAS-12, M92 pistol, LR-300).
- **Heavy Scientists:** a tougher variant spawned as Bradley's reinforcements and found in high-tier monuments.
- **Safe-zone vendor/mission NPCs:** non-hostile NPCs at Outpost and Bandit Camp; drawing a weapon or acting hostile near them triggers automatic turret retaliation.
- **Tunnel Dwellers** and **Underwater Dwellers:** specialized hostiles guarding the underground train-tunnel network and the Underwater Labs respectively.
- **Deep Sea/Naval Scientists:** new variants introduced with the 2026 Naval Update defending the new island and ghost-ship content.

### 1.16 Game Modes & Server Variants

- **Vanilla (Official/Community):** the standard experience described above.
- **Softcore:** reduced lethality — 50% inventory retained on death instead of a corpse drop, ~25% reduced PvP bullet damage, destroyed containers keep half their loot recoverable, and a destroyed Tool Cupboard still grants 48 hours of build-authorization protection.
- **Hardcore:** the opposite extreme, with harsher settings (e.g., disabled world map, fog of war); received a refresh in 2025.
- **Primitive:** a 2025-introduced mode stripping out modern firearms and electricity in favor of melee, bows, and siege weapons as the primary raiding toolkit.
- **Premium Servers:** a 2025-introduced official tier gating entry behind a minimum Steam Rust-inventory value (~$15) specifically to discourage cheaters — shown to retain a notably healthier population.
- **Modded/community servers** layer custom plugins (the Oxide/uMod ecosystem) atop any ruleset above for custom economies, kits, PvE-only variants, and more.

### 1.17 Progression, Wipes & Meta Systems

- **Wipe cycle:** an official forced monthly wipe (map + blueprints), timed to the monthly update on the first Thursday of each month; many third-party servers wipe more frequently, sometimes resetting only blueprints on a faster schedule than the map.
- **Anti-cheat:** an unusually large, publicized operation — an Easy Anti-Cheat partnership, a public HackerOne bug-bounty program (over $300,000 paid to date), server-side player culling (hiding fully-obscured players from the network stream to blunt ESP/aimbot cheats), and the Premium Server inventory gate above. 2025 saw 338,000+ total bans issued.
- **Monetization:** cosmetic item skins via Steam Workshop (over $32.7 million paid out to community skin creators to date) and DLC cosmetic packs, produced by a dedicated DLC team kept separate from core development; a battlepass-style system is under exploration for 2026 but not yet implemented.
- **Rust+ companion app:** links to a player's server for map viewing, remote camera/turret monitoring, and smart-device control — a real-world extension of the in-game electricity system.
- **Rust Mobile:** a separate in-development mobile version slated for global release in 2026.

### 1.18 Distinctive / Signature Systems

- Emergent, no-narrative, fully player-driven social/PvP sandbox — the "story" is whatever happens between players.
- A genuinely simulated electrical/logic system usable for real automation and base defense, not just decoration.
- A meaningful decay/upkeep system that forces ongoing resource investment rather than "build once and forget."
- Keycard/puzzle-gated monument loot tiering that creates a legible risk/reward geography across the map.
- Real-time raiding against a base's building-tier HP economy, rather than an instanced "raid mode."
- A genetics/cross-breeding farming system that rewards experimentation.
- A monthly forced-wipe cadence that resets the entire player economy on a fixed rhythm — unusual among survival games.

### 1.19 PvP & Social Structure

Rust has no separate "PvP mode" to describe — the entire game is a PvP sandbox by design, and PvE-flagged servers are a community/modded variant, not an official one. What follows is the layer this document's first pass left scattered across other sections, pulled into one place:

- **Teams:** the only built-in group structure. Default cap is 8 players, adjustable via the server's `maxteamsize` setting (this is how "solo," "duo," "trio," and "quad" servers are configured — they're just the same game at a lower team cap). There's no separate "clan" feature in vanilla Rust; large modded servers add clan tags and management through plugins. Being on a team does **not** automatically grant Tool Cupboard or Auto Turret authorization — each has its own separate authorization list teammates must be individually added to.
- **Server population format is the community's primary PvP-balance lever**, more than any single in-game setting. Solo/duo/trio-capped servers have been the fastest-growing format in recent years, specifically because they equalize the group-size ceiling in a fight and lower the skill floor for new players relative to unrestricted "zerg" (mass-clan) servers.
- **Raiding is PvP against a structure rather than a person** — full-loot base destruction with explosives, often while the owner is offline. This is why "offline raid protection" (via plugins like NoOfflineRaid, or timed protection windows) is one of the most common community-server modifications: it addresses a complaint that barely exists in other PvP genres — losing everything while not even playing.
- **Direct combat PvP** (§1.8) has no matchmaking, ranking, or lobby system in vanilla — encounters happen organically anywhere on the shared map. "KOS" (kill-on-sight) culture, alliances, and betrayal are entirely player-enforced social norms, not systemic rules.
- Dedicated PvP-only formats (arena/duel servers, faster-gather "battlefield" servers, in-game minigame arcades) exist as a community/modded layer alongside the main survival loop, not as an official replacement mode.

---

## Part 2 — Minecraft

### 2.1 Overview

- **Developer:** Mojang Studios (owned by Microsoft since 2014); original creator Markus "Notch" Persson.
- **Release:** Public alpha 2009; full release (v1.0) November 2011. The best-selling video game of all time (300M+ copies sold).
- **Genre:** Sandbox / survival / creative building game.
- **Platforms:** Effectively everywhere — PC (**Java Edition** and **Bedrock Edition**, separate codebases), consoles, and mobile. Bedrock enables cross-platform play across most non-Java platforms; Java has its own independent mod ecosystem.
- **World:** practically infinite, procedurally generated from a numeric seed, built from a 3D grid of 1 m³ blocks.
- **Update cadence:** shifted in 2023 from one big annual update to several smaller "game drops" through the year — 2025 saw Spring to Life, Chase the Skies, The Copper Age, and Mounts of Mayhem; 2026 has brought Tiny Takeover and Chaos Cubed, with a dappled-forest-biome drop planned for Q3. Version numbering also shifted from "1.2x" to a year-based "26.x" scheme in December 2025. A major visual overhaul, **Vibrant Visuals**, shipped for Bedrock in June 2025 and is in progress for Java.

### 2.2 Game Modes

- **Survival:** the full resource/hunger/health loop — the core game.
- **Creative:** unlimited resources, flight, no hunger or damage — pure building.
- **Adventure:** a map-maker-oriented mode where blocks generally can't be placed or broken without specific tools.
- **Spectator:** fly freely through the world and even through blocks and mobs, with no interaction.
- **Hardcore:** Survival with permadeath — one life, the world locks on death.

### 2.3 Core Gameplay Loop

Spawn in an unfamiliar world → punch trees for wood → craft basic tools → build shelter before nightfall → mine for stone and ores → progress through tool tiers → optionally travel to the Nether for materials → gear up enough to find a Stronghold, enter the End, and defeat the Ender Dragon (the closest thing to a "win" state) → open-ended building and exploration continue indefinitely afterward.

### 2.4 Survival Mechanics

- **Health:** 20 points (10 hearts); regenerates automatically once Hunger is high enough.
- **Hunger:** 20 points (10 "shanks"); depletes with activity, blocks natural regeneration and sprinting when empty, and can eventually cause damage on higher difficulties.
- **Saturation:** a hidden buffer above the hunger bar, built up by high-quality foods, that delays visible hunger depletion.
- **Environmental hazards:** fall damage, drowning, fire/lava, suffocation, starvation (Normal/Hard difficulty), and falling into the void.
- The **day/night cycle** (20 real-world minutes per in-game day) drives most hostile-mob spawning; sleeping in a bed skips the night and sets a respawn point (in multiplayer, this generally needs enough players in bed at once).
- **Difficulty settings** (Peaceful, Easy, Normal, Hard) globally scale hostile-mob spawning and damage; Peaceful removes all hostile mobs except bosses, Shulkers, Piglins, and Hoglins.

### 2.5 World Generation & Biomes

- Terrain generates procedurally from a seed; the same seed always reproduces the same world.
- Java Edition currently has roughly 60+ biomes across all three dimensions (about 53 Overworld, 5 Nether, 5 End), informally grouped into categories such as forests, plains, deserts, jungles, oceans, caves, mountains, and snowy regions, each with distinct terrain, mobs, and resources.
- Notable Overworld categories: Plains, Forests (oak/birch/dark/cherry variants), Deserts, Jungles, Savannas, Badlands/Mesa, Taiga (including snowy variants), Swamps (including Mangrove Swamp), Ice Spikes, Mushroom Fields (spawn-proof), ocean variants (warm/lukewarm/cold/frozen, with deep variants), and cave biomes (Lush Caves, Dripstone Caves, Deep Dark).
- World height was expanded in the Caves & Cliffs era to allow taller mountains and deeper cave systems with larger ore veins.

### 2.6 Dimensions

- **The Overworld:** the primary dimension — most biomes, structures, and mob variety; runs the day/night cycle; where players spawn and spend most of their time.
- **The Nether:** entered via a player-built obsidian portal frame (minimum 4×5, maximum 23×23 blocks) ignited with fire; a volcanic, fire-immune realm of biomes (Nether Wastes, Crimson Forest, Warped Forest, Soul Sand Valley, Basalt Deltas) with unique mobs (Piglins, Hoglins, Blazes, Ghasts, Wither Skeletons, Zombified Piglins) and structures (Nether Fortresses, Bastion Remnants). Because of its compressed geometry, one block traveled in the Nether generally corresponds to about eight blocks in the Overworld, making it a fast-travel shortcut. Neither the Wither nor the Ender Dragon can pass through portals.
- **The End:** entered via an End Portal — found, not built, inside a Stronghold — activated with Eyes of Ender; a void dimension of floating islands. The main island hosts the Ender Dragon fight (obsidian pillars topped with regenerating End Crystals that must be destroyed first); defeating the dragon opens an End Gateway to the outer End Midlands/Highlands islands, home to End Cities (Shulkers, Elytra, and loot-filled End Ships).

### 2.7 Blocks, Building & Crafting

- Thousands of distinct blocks exist: natural terrain, ores, building materials (wood, stone, concrete, terracotta, glass, wool variants), functional blocks (crafting table, furnace, chests), and purely decorative blocks.
- A 3×3 **Crafting Table** grid turns raw materials into tools, weapons, armor, and building blocks via fixed shaped or shapeless recipes.
- The **Furnace** (and its specialized/faster variants, the Blast Furnace for ores and tools and the Smoker for food) smelts raw materials using fuel (coal, charcoal, wood, lava buckets, and more).
- The **Stonecutter** and **Smithing Table** offer more efficient or specialized crafting paths, for stone-cutting and tool/armor upgrading respectively.

### 2.8 Mining & Resources

- **Tool tiers, ascending:** Wood → Stone → Iron → Diamond → Netherite, with Gold as a fast-but-fragile side branch. Netherite is reached by upgrading a Diamond tool or armor piece with a Netherite Ingot on a Smithing Table (using a Smithing Template) rather than being craftable outright.
- **Ore types:** Coal, Iron, Gold, Redstone, Lapis Lazuli, Diamond, Emerald, Copper, and the Nether-exclusive Ancient Debris (smelted into Netherite Scrap).
- Diamonds are most common at deep negative Y-levels in current world generation (roughly Y −59).
- Mining approaches range from simple strip mining to systematic branch mining to cave exploration; each tool tier can only harvest certain ores (a Stone Pickaxe, for instance, cannot mine Diamond Ore).

### 2.9 Redstone System

Minecraft's in-game logic/circuitry system, built from:

- **Power sources:** Redstone Torches, Blocks of Redstone, Buttons, Levers, Pressure Plates, Tripwire Hooks, Daylight Detectors, Lightning Rods, Sculk Sensors and Calibrated Sculk Sensors, Target Blocks.
- **Transmission:** Redstone Dust (wire), Redstone Repeaters (extend range, add delay), Redstone Comparators (compare or subtract signal strength; can read container fullness).
- **Mechanism/output components:** Pistons and Sticky Pistons, Doors/Trapdoors/Fence Gates, Dispensers/Droppers, Hoppers (item transport), Note Blocks (music, with the instrument sound set by the block placed underneath — including copper-based instruments added in the 2026 Tiny Takeover drop), Rails/Powered Rails/Detector Rails/Activator Rails for minecarts, and Observers (detect adjacent block updates).
- Used for everything from simple automatic doors to fully automated crop, mob, and villager-breeder farms, item-sorting systems, and — at the extreme end — working in-world computers.

### 2.10 Combat & Equipment

- **Weapons:** Swords (primary melee), Axes (secondary melee, slower but harder-hitting), Bows, Crossbows, Tridents (melee or thrown, enchantable with Riptide for water-propelled launches), and Maces (a heavier melee weapon that deals bonus fall-based damage).
- **Armor tiers:** Leather → Golden → Chainmail (not craftable, only found or traded) → Iron → Diamond → Netherite, each progressively more protective; Turtle Shells and the Elytra (a glider found in End Cities) fill specialty slots.
- **Shields** block or reduce incoming damage when raised.
- Combat runs on an attack-cooldown system: a full-strength hit requires waiting for the weapon's attack timer to recharge, rewarding paced attacks over rapid clicking.

### 2.11 Enchanting & Brewing

- The **Enchanting Table** (Diamonds, Obsidian, and a Book) consumes Experience Levels and Lapis Lazuli to apply randomized enchantments to gear; **Anvils** combine enchanted books/items and repair or rename gear, at an XP cost that rises with each use (the "prior work penalty").
- Enchantments span offense (Sharpness, Smite, Bane of Arthropods, Power), defense (Protection variants, Thorns), utility (Efficiency, Fortune, Silk Touch, Unbreaking, Mending, Respiration, Aqua Affinity, Frost Walker), and mobility (Feather Falling, Depth Strider, Soul Speed, Riptide).
- The **Brewing Stand** (a Blaze Rod plus stone) turns Water Bottles into Potions using Nether Wart as the base modifier, plus specific ingredients per effect (e.g., a Ghast Tear for Regeneration, a Golden Carrot for Night Vision). Redstone extends duration, Glowstone Dust intensifies the effect, Gunpowder converts a potion to a thrown Splash Potion, and Dragon's Breath converts it to a persistent-gas-cloud Lingering Potion.

### 2.12 Mobs

Categorized as **Passive** (never attacks — cows, pigs, sheep, chickens, villagers), **Neutral** (attacks only if provoked — wolves, bees, piglins, endermen, daytime spiders), **Hostile** (attacks on sight — zombies, skeletons, creepers, nighttime spiders, witches, phantoms), and **Bosses** (Ender Dragon, Wither).

- **Common Overworld hostiles:** Zombie (with Husk/Drowned variants), Skeleton (with Stray/Bogged variants), Creeper (silent, explodes on approach), Spider/Cave Spider, Witch, Slime, Phantom, Silverfish, Endermite.
- **"Illager" raid mobs:** Pillager, Vindicator, Evoker, Vex, Ravager — spawn during Village Raids triggered by the "Bad Omen" status effect.
- **Nether-exclusive:** Ghast, Blaze, Magma Cube, Wither Skeleton, Piglin/Piglin Brute (neutral toward a player wearing any gold armor), Hoglin/Zoglin, Strider.
- **The End:** Endermen (native habitat), Shulkers (found in End Cities, inflict levitation on hit).
- **Warden:** an extremely powerful blind mob native to the Deep Dark biome and Ancient City structure, summoned by Sculk Shriekers; detects players by vibration and smell rather than sight, and its "Sonic Boom" attack bypasses armor entirely — by raw stats the toughest mob in standard survival, though not formally classified as a boss.
- **Ender Dragon** (End boss, ~200 HP): fought atop the main End island; healed by End Crystals on obsidian pillars, which must be destroyed first; defeating it awards a large XP payout, a Dragon Egg, and opens the exit gateway. It can be re-summoned by placing 4 End Crystals on the exit portal.
- **Wither** (player-summoned boss, ~300 HP): built from a T-shape of 4 Soul Sand/Soul Soil topped with 3 Wither Skeleton Skulls; explodes on spawning; fires explosive Wither Skulls; becomes immune to projectiles below 50% health; drops a Nether Star used to craft a Beacon.
- **Recent mob additions (2025–26 drops):** Breeze (found only in Trial Chambers, drops Breeze Rods), Bogged (a Trial Chamber skeleton variant), Copper Golem, Happy Ghast (a passive, rideable flying mob), and Sniffer/Snifflet (an ancient-seed-sniffing passive mob).

### 2.13 Farming, Food & Animal Husbandry

- **Crops:** Wheat, Carrots, Potatoes, Beetroot, Melon, Pumpkin, Sugar Cane, Cocoa Beans, Nether Wart (Nether-only), and Sweet Berries — grown from seeds or cuttings on Farmland (tilled with a Hoe), generally needing nearby water.
- **Animal breeding:** feeding two adult animals of the same species their preferred food (wheat for cows/sheep, carrots for pigs, seeds for chickens, etc.) triggers "love mode" and spawns a baby — the standard way to build sustainable livestock. Villagers similarly "breed" given enough surplus food and available beds.
- **Fishing** (with a Fishing Rod) yields fish, junk, and "treasure" items (enchanted books, Name Tags, Nautilus Shells) on a loot-table basis; enchantments like Lure and Luck of the Sea improve the odds.
- **Cooking** (via Furnace or Smoker) improves a food's hunger/saturation value over its raw equivalent.

### 2.14 Villages & Trading

- Villages generate naturally in several biomes (Plains, Desert, Savanna, Taiga, Snowy), each with biome-specific building styles, populated by Villagers.
- **Villager professions** (13 total, assigned by proximity to a matching workstation): Farmer (Composter), Fisherman (Barrel), Fletcher (Fletching Table), Cartographer (Cartography Table), Cleric (Brewing Stand), Armorer (Blast Furnace), Weaponsmith (Grindstone), Toolsmith (Smithing Table), Butcher (Smoker), Leatherworker (Cauldron), Librarian (Lectern), Mason/Stonemason (Stonecutter), and Shepherd (Loom) — plus the unemployed "Nitwit" variant, which can never take a job.
- Trading uses Emeralds as currency across five escalating tiers per villager (Novice → Master), unlocked through successive trades; the Librarian (enchanted books, including the prized Mending enchantment) and Cleric (Ender Pearls) are especially valuable.
- **Raids:** looting certain village structures, or drinking a Potion of Bad Omen (from an Ominous Bottle) and entering a village, triggers a multi-wave Illager raid, defended by the village's Iron Golems and any player-recruited help.
- Curing a Zombie Villager (a Weakness potion, then a Golden Apple, then a wait) converts it back into a normal villager with permanent trade discounts.

### 2.15 Structures & Exploration

Naturally generating structures include: Villages, Pillager Outposts, Desert/Jungle Temples, Igloos, Witch Huts (Swamp), Ruined Portals, Shipwrecks, Ocean Ruins, Buried Treasure, Ocean Monuments (Guardians, Elder Guardians, Sponges), Woodland Mansions (Vindicators, Evokers, and the only reliable non-raid source of the Totem of Undying), Mineshafts, Dungeons (mob spawners), Desert Wells, Trail Ruins (Pottery Sherds), Amethyst Geodes, Strongholds (End Portal rooms, libraries), and Ancient Cities (Deep Dark, Warden-guarded, the best loot in the Overworld). **Trial Chambers** — copper-and-tuff structures containing Trial Spawners and loot Vaults, added in the 1.21 era — remain central to endgame gear farming. The Nether adds Nether Fortresses, Bastion Remnants, and Ruined Portals; the End adds End Cities and End Ships.

### 2.16 Progression (Advancements, XP, Endgame)

- **Advancements** (Java) / **Achievements** (Bedrock/console) track a soft progression tree of milestones from "getting wood" through defeating the Ender Dragon and beyond, with several hidden until a prerequisite is unlocked.
- **Experience Points/Levels**, earned from mining certain ores, killing mobs, breeding animals, smelting, and fishing, fuel Enchanting Table costs and Anvil repairs.
- There is no single mandatory endgame — defeating the Ender Dragon is the closest thing to a win condition and unlocks the credits, but the game continues indefinitely afterward with no forced ending.

### 2.17 Multiplayer

- **Realms:** Mojang's official subscription-based hosted-server service for small persistent group worlds.
- **Self-hosted/dedicated servers** are widely supported, especially on Java, with a large plugin (Bukkit/Spigot/Paper) and mod (Forge/Fabric/NeoForge) ecosystem enabling everything from minigames to total conversions.
- **LAN and console split-screen** support smaller-scale local co-op.
- Java and Bedrock have separate mod/plugin ecosystems and are not directly compatible except through Bedrock's own cross-platform play and certain bridging services.

### 2.18 Distinctive / Signature Systems

- A fully destructible and buildable voxel world at block-level granularity — arguably the genre-defining feature of modern sandbox games.
- Redstone as an in-world programmable logic system, capable at the extreme end of Turing-complete computation built entirely from in-game blocks.
- A soft, non-linear progression path — the "story" is player-authored, loosely punctuated by the Nether/End/Ender-Dragon/Wither milestones.
- An unusually long content tail sustained by a shift to frequent smaller "game drops" rather than single annual updates.
- Two parallel, actively developed editions (Java/Bedrock) with different codebases, mod ecosystems, and, at times, different feature sets.

### 2.19 PvP: Mechanics & the Competitive Server Scene

Unlike Rust, Minecraft's PvP is genuinely optional — but where it exists, it supports a competitive scene large enough to rival vanilla survival in player count.

- **PvP is a literal world setting, not a mode:** the `pvp` gamerule determines whether players can damage each other at all; it's commonly switched off entirely on cooperative-only worlds.
- **Combat mechanics have a real, still-contested version split.** Through Java Edition 1.8, there was no attack cooldown — players "spam-clicked" to attack as fast as possible, and a critical hit (1.5× damage) triggered simply by attacking while falling. The 1.9 "Combat Update" added a per-weapon recharge meter: a full-strength hit requires waiting for it to recharge, swords gained a sweep attack (small splash damage to nearby enemies) on a fully-charged, non-sprinting hit, and attacking before the meter recharges deals reduced damage. This is a genuine, still-live fault line in the competitive scene — many dedicated duel/PvP servers still run 1.8-style combat via plugins (e.g., OldCombatMechanics) because they consider its click-speed skill ceiling more spectator-friendly, while others run modern 1.9+ timing-based combat.
- **Named, documented advanced technique** exists in both styles: jump-crit chaining, "hit-selecting" to reduce knockback taken while trading blows, W-tapping/S-key movement resets to control spacing, and fighting at the exact edge of the 3-block attack reach.
- **The third-party competitive PvP server ecosystem is arguably as large as vanilla survival itself, and runs almost entirely on server-side plugins rather than core-game features.** Hypixel — Java Edition's largest independent server ever, a Guinness World Record holder with a historical peak above 216,000 concurrent players — centers on PvP minigames: **Bedwars** (4- or 8-team resource-and-base-defense; destroy the enemy team's bed to permanently deny their respawns), **SkyWars** (island loot-and-fight, with Ender Dragons pressuring the remaining players late-game), **Duels** (1v1 practice across many rulesets — UHC, Classic, Combo, NoDebuff), and **The Pit** (a persistent free-for-all arena with RPG-style progression). **The Hive** is the equivalent hub for Bedrock Edition (Xbox/PlayStation/Switch/mobile/Windows). **GommeHD** (EU) is the largest non-Hypixel Java competitive server. Anarchy servers (e.g., 2b2t) are a related but distinct PvP-adjacent phenomenon — no rules, no moderation, long-term survival and conflict on a single persistent world.
- Enchantments relevant specifically to PvP draw from the general list (§2.11) but are weighted differently in practice: Sharpness/Power for raw damage, Protection for survivability, Sweeping Edge to punish grouped opponents, Thorns for passive punishment, and Knockback/Punch for spacing control.

---

## Part 3 — Fallout 2

### 3.1 Overview

- **Developer:** Black Isle Studios. **Publisher:** Interplay Entertainment.
- **Release:** October 1998. Direct sequel to *Fallout* (1997).
- **Genre:** Isometric, turn-based, post-apocalyptic computer RPG.
- **Setting:** the year 2241 — roughly 80 years after the original *Fallout* and 164 years after the Great War that devastated civilization — across the Northern California/Nevada/Oregon stretch of the post-nuclear United States.
- **Protagonist:** the "Chosen One," a descendant of the first game's Vault Dweller, from the tribal village of Arroyo.
- **Presentation:** a 2D isometric, sprite-based world with real-time exploration, strictly turn-based combat, a mouse-driven point-and-click interface, and branching dialogue trees.

### 3.2 Core Gameplay Loop

Character creation (SPECIAL stats, traits, tagged skills) → begin in Arroyo and complete the Temple of Trials → travel the wasteland via a world map (risking random encounters between locations) → visit towns, resolve quests through dialogue, skill checks, or combat, and gather equipment → level up (skill points every level, a perk every third level) → progress the main quest (find the GECK, uncover and stop the Enclave) → reach one of many possible endings shaped by the cumulative state of every town and faction visited.

### 3.3 SPECIAL Stat System

- Seven primary stats, each ranging 1–10 at creation (point-buy, with extra points available from the Gifted trait): **S**trength, **P**erception, **E**ndurance, **C**harisma, **I**ntelligence, **A**gility, **L**uck.
- Each stat drives derived statistics (Hit Points, Action Points, Armor Class, carry weight, and more), skills' starting values, dialogue and perk availability, and in-world checks (e.g., a Strength check to force open a door).
- Extremely low stats carry real narrative consequences — an Intelligence of 1–3 renders the Chosen One nearly mute, locking out most dialogue and quest content for a distinctive "low-IN" playthrough.

### 3.4 Skills

- **18 skills** in total, each ranging from 0% to 300%: combat skills (Small Guns, Big Guns, Energy Weapons, Unarmed, Melee Weapons, Throwing), active skills (First Aid, Doctor, Sneak, Lockpick, Steal, Traps, Science, Repair), and social/utility skills (Speech, Barter, Gambling, Outdoorsman).
- At creation, the player **"tags" 3 skills**, which then improve at double the normal rate thereafter.
- Skill points earned per level-up = 5 + (2 × Intelligence); higher skill ranks cost progressively more points to raise further.
- A stat-derived starting value, plus invested skill points, determines the final skill percentage, which is checked against constantly in dialogue, combat, and world interactions.

### 3.5 Traits

- Optional character-defining quirks chosen at creation (up to 2), each pairing a benefit with a drawback — for example, **Gifted** (+1 to all stats, but −10% to all skills and fewer skill points per level), **Small Frame** (extra Agility, lower carry weight), **Fast Metabolism** (faster healing, but reduced radiation/poison resistance), **Bloody Mess** (grislier death animations, no mechanical effect), **Skilled** (extra skill points, but perks arrive every 4 levels instead of 3), plus One Hander, Bruiser, Kamikaze, and others.
- Unlike perks, traits are fixed at creation and generally can't be changed later.

### 3.6 Perks

- Gained every 3 character levels (every 4 with the Skilled trait); most require minimum stat or skill thresholds to select.
- Fallout 2 has **70 regular perks plus 12 special/hidden perks** (often granted through specific NPC or location events rather than leveling up) — roughly 82 in total.
- Standouts include Awareness (reveals enemy HP/equipment in combat), Bonus Rate of Fire / Bonus HtH Attacks (reduced AP cost per attack), Sniper / Slayer (dramatically improved effectiveness with ranged or melee attacks respectively at high skill), Action Boy/Girl (extra AP per turn), Better/More Criticals (improved critical-hit tables), Toughness (damage resistance), the seven "Gain [Stat]" perks (permanent +1 to a chosen stat), Living Anatomy, and Explorer.
- Temporary chem-induced stat boosts (Mentats, Buffout, Psycho) can be used to meet a perk's stat threshold at the moment of selection, permanently locking in a perk the character couldn't otherwise qualify for.

### 3.7 Combat System

- Exploration is real-time; combat becomes strictly turn-based once triggered, with every combatant (party members and enemies alike) acting in **Sequence** order — an initiative value derived mainly from Perception, with Agility and certain perks as secondary modifiers.
- **Action Points (AP):** each turn's total is 5 + floor(Agility ÷ 2) as a base, spent on movement (1 AP per hex), attacks (roughly 4–5 AP for a single melee or ranged shot, more for bursts), reloading, and item use; unspent AP does not carry over to the next turn.
- **Aimed shots** let an attacker target a specific body part — head, eyes, torso, arms, legs, or groin. Eyes and head sharply raise critical-hit odds at the cost of a much lower base hit chance; limb shots can cripple an arm or leg for lasting combat penalties.
- **Burst fire**, on supported weapons, spends more AP and ammunition to spray multiple rounds, either concentrating damage on one target or hitting several within a cone.
- **Critical hits** roll against a table of escalating effects (bonus damage, crippling, instant death); very low hit chances instead raise the odds of a **critical failure** (e.g., accidentally hitting an ally, or a weapon jamming or exploding).
- The hit-chance formula combines weapon skill, Perception, distance, lighting, the target's Armor Class, and any aimed-shot penalty, capped at 95%.

### 3.8 Karma, Reputation & Factions

- **Karma:** a single running good/evil score reflecting the sum of the Chosen One's actions, shaping NPC reactions, certain endings, and access to some companions — several refuse to join, or will leave, if karma turns too negative.
- **Town/faction reputation** is tracked separately per location, shifting with the quests completed there, and can range from reviled to idolized independently of the global karma score.
- **Major factions:** the **New California Republic (NCR)**, the dominant rising democratic power (headquartered in the former Shady Sands, led by returning Fallout 1 character President Tandi); **Vault City**, an insular, technocratic city-state descended from a successful Vault; the **New Reno crime families** (Bishop, Mordino, Salvatore, Wright), locked in a shadow war for control of the city and its Jet drug trade; the **Enclave**, the secretive, technologically superior remnant of the pre-War U.S. government and the game's main antagonist faction, based on an offshore oil rig; plus the Slaver's Guild (The Den), a background Brotherhood of Steel presence, the Shi (San Francisco), the Hubologists (a Scientology-esque cult), and assorted raider groups.

### 3.9 World Map & Key Locations

- Locations connect via a top-down world map; traveling between them risks random encounters (combat, discoveries, or scripted vignettes) and consumes in-game time.
- A typical main-quest path runs roughly: **Arroyo** (Temple of Trials, starting village) → **Klamath** → **The Den** → **Modoc** → **Vault City** → **Gecko** (a ghoul-run town) → **Redding** (mining town) → **Broken Hills** (mixed human/super-mutant/ghoul settlement) → **New Reno** (crime capital) → **NCR** → **Vault 15** → **Vault 13** (the Chosen One's ancestral vault, found overrun by intelligent Deathclaws) → **Navarro** (an Enclave mainland base) → **San Francisco** (Shi and Hubologist territory) → the **Enclave Oil Rig** (final location) — with the **Mariposa Military Base** as an optional high-value detour.
- Other notable locations include the Toxic Caves, the Sierra Army Depot (home to the Skynet companion), and Golgotha (a New Reno gang's graveyard/dumping ground).

### 3.10 Companions

- Recruitable party members include **Sulik** (Klamath; melee/SMG fighter), **Vic** (The Den; trader and long-range fighter with useful Repair skill), **John Cassidy** (Vault City; ranged sharpshooter), **Marcus** (Broken Hills; a super-mutant heavy-weapons fighter, requires positive karma), **Myron** (creator of the Jet drug; a weak fighter but useful for chem-related content), **Goris** (a literate, intelligent Deathclaw from Vault 13, requires positive karma), **Lenny** (Gecko; a ghoul with strong Doctor/Repair skills), and **Skynet** (a sentient computer housed in a robot body at the Sierra Army Depot, a late-game, high-investment recruit) — plus non-human companions such as K-9/Dogmeat-type dogs and Robodog. Miria and Davin (Modoc) can instead be recruited as marriage partners rather than combat companions.
- **Party size limit:** floor(Charisma ÷ 2) companions at once, extendable by one with the Magnetic Personality perk.
- Several "good" companions (Sulik, Cassidy, Goris, Lenny) refuse to join, or leave the party, if the Chosen One's karma turns too negative; Myron, conversely, suits an evil-leaning playthrough.
- Companions level up alongside the player (each with individual minimum-level and leveling-interval rules) and can be equipped directly with better gear from the player's inventory.

### 3.11 Quests & Main Storyline

- **Inciting incident:** a crippling drought threatens Arroyo; the tribe's Elder sends the Chosen One — after proving themselves in the Temple of Trials — to find the **Garden of Eden Creation Kit (GECK)**, believed to be held in the "ancestral" Vault 13.
- Vault 13 is found emptied of its original inhabitants (they were secretly abducted); the trail leads to uncovering the **Enclave**, a hidden, technologically advanced remnant of the pre-War U.S. government operating from an offshore oil rig under President Richardson.
- The Enclave has been abducting wasteland dwellers — including Arroyo's own villagers and the missing Vault 13 population — as test subjects to perfect a militarized, airborne strain of the **Forced Evolutionary Virus (FEV)**, engineered to kill anyone with "mutated" (wasteland-exposed) DNA while leaving the sealed, unexposed Enclave untouched — clearing the continent for their own recolonization.
- The endgame has the Chosen One infiltrate the Oil Rig, free the captured villagers, sabotage the base (typically by triggering a reactor meltdown and/or releasing the modified FEV back into the Enclave's own ventilation system), kill President Richardson, and defeat the genetically engineered super-soldier **Frank Horrigan** in the final confrontation before escaping as the rig is destroyed.
- Dozens of largely independent side quests exist per town, almost all resolvable multiple ways — combat, or Speech/Barter/Science/Sneak checks, or morally divergent choices — each feeding into that town's individual reputation track.

### 3.12 Items, Economy & Equipment Progression

- **Currency:** bottle caps in most of the wasteland, though several late-game/high-tech locations (Vault City, NCR, the Enclave) instead use standard pre-War-style money, requiring conversion.
- **Weapon progression** runs from a starting knife/spear and a 10mm-class pistol, through submachine guns and hunting rifles, up to endgame Small Guns like the Sniper Rifle and H&K G11, Big Guns like the Bozar and the Vindicator Minigun, and Energy Weapons like the Plasma Rifle, Turbo Plasma Rifle, and Gauss weapons.
- **Armor progression** runs Leather Jacket/Armor → Metal Armor → Combat Armor → Brotherhood/Enclave Power Armor variants, each raising Armor Class and damage resistance/threshold at the cost of Agility penalties for the heaviest sets.
- Crafting is limited compared to later Fallout titles — mostly small recipe-like item combinations or unique NPC-taught "trainer" perks, rather than a full crafting system.

### 3.13 Chems, Addiction & Radiation

- **Chems** (Buffout, Psycho, Jet, Mentats, and more) grant powerful temporary stat/skill boosts at the risk of **addiction**, which imposes stat penalties until cured (via a doctor, time, or specific items).
- **Radiation** accumulates from irradiated areas and items and is treated with Rad-X (preventive) and RadAway (curative); left unchecked it damages stats and, at extremes, kills.
- Alcohol behaves similarly to chems (temporary boosts and penalties, addiction risk) and is woven into several New Reno-area quests.

### 3.14 Random/Special Encounters

- Traveling the world map risks random encounters ranging from raider ambushes and wildlife to bizarre, non-canonical joke and pop-culture vignettes — a tonal departure from the grimmer first game and a hallmark of Fallout 2's more irreverent sense of humor.
- Some special encounters are tied to specific world-map coordinates and reward unique items or one-off scripted content unrelated to any quest.

### 3.15 Endings

- The game closes with a series of narrated slideshow vignettes (in the style of the first *Fallout*), each describing the eventual fate of a location or faction the Chosen One interacted with, determined independently by the player's cumulative choices there — so two players' endings can differ substantially town by town even with the same overall outcome at the Oil Rig.
- The "good" throughline sees the Arroyo villagers and rescued Vault 13 dwellers, aided by the recovered GECK, found a new, prosperous settlement; other slides range from flourishing towns to towns collapsing into ruin, raider takeover, or outright destruction, depending on the player's actions there.

### 3.16 Notable / Distinctive Systems

- Deep, tag/point-buy character build variety (SPECIAL + traits + tagged skills) with build-defining consequences that persist for the whole game — e.g., very low Intelligence locking out most dialogue.
- Turn-based, Action-Point-driven tactical combat with body-part targeting and a genuine risk/reward tradeoff between accuracy and crippling/critical potential.
- Non-linear, multi-solution quest design where combat, Speech, Science, Sneak, or Barter can each independently resolve the same quest.
- A per-location reputation system layered under a single global karma score, feeding into a mosaic, slideshow-style multiple-ending structure rather than one binary good/bad ending.
- A distinctly irreverent, pop-culture-referencing tone (especially via random encounters) layered over otherwise bleak post-apocalyptic subject matter — a notable shift from the more somber original *Fallout*.
- Companion recruitment gated by roleplay state (karma, reputation, specific skill checks) rather than simple invitation.

---

## Part 4 — Quick-Reference Feature Index

A category-by-category index of where each system lives across the three games, for fast cross-referencing back into Parts 1–3. This table is a navigation aid only — it does not evaluate, rank, or recommend combining anything.

| Category | Rust | Minecraft | Fallout 2 |
|---|---|---|---|
| Core loop | Gather → craft → build → raid/PvP → server wipe (§1.2) | Gather → craft → build → explore → optional dragon fight (§2.3) | Explore → quest → level up → main story → ending (§3.2) |
| Player structure | Multiplayer-only, persistent shared server | Single-player or multiplayer, persistent or fresh worlds | Single-player, one persistent save |
| Base/shelter building | 5-tier decay-based building, Tool Cupboard upkeep (§1.6) | Unlimited block placement, no decay (§2.7) | Not present — no player base-building |
| Crafting | Blueprint- and tech-tree-gated (§1.5) | Table-based fixed recipes (§2.7) | Minimal — item combinations and NPC "trainer" perks only |
| Character progression | None — player skill only, no character stats | None — no RPG stats; XP funds enchanting only | SPECIAL stats, 18 skills, traits, perks (§3.3–3.6) |
| Combat | Real-time first/third-person shooter (§1.8) | Real-time melee/ranged with an attack-cooldown system (§2.10) | Turn-based, Action-Point-driven (§3.7) |
| PvP model | Core design — no separate mode; population format (solo/duo/trio/no-limit) is the primary balance lever (§1.19) | Optional (`pvp` gamerule); competitive scene runs almost entirely on third-party servers/plugins — Hypixel, The Hive, etc. (§2.19) | None — fully single-player, no multiplayer of any kind |
| Automation/logic system | Electricity — wattage-based (§1.10) | Redstone — signal-based (§2.9) | Not present |
| Farming | Planter genetics/cross-breeding (§1.11) | Simple grow-and-harvest crops (§2.13) | Not present |
| Animal husbandry | Chickens, bees, horses; cows/sheep announced (§1.12) | Breeding across many species (§2.13) | Not present (Brahmin exist only as world-building) |
| Vehicles | Six families, fuel-based (§1.9) | Minecarts/boats only, no fuel system | A car exists narratively as a late-game travel aid |
| World structure | One persistent map per server, force-wiped monthly | Infinite/procedural, persists indefinitely | Fixed, hand-authored world map |
| NPCs | Hostile AI only — no dialogue (scientists, Bradley, Heli) (§1.15) | Villagers (trading only), hostile mobs, no dialogue trees (§2.14) | Full dialogue-tree NPCs, companions, factions (§3.8, §3.10) |
| Narrative/quests | None — fully emergent player-driven play | None — only soft milestones (Nether/End/bosses) | Full branching main quest plus hundreds of side quests (§3.11) |
| Risk/reward geography | Keycard-tiered monuments (§1.13) | Structure-based (strongholds, ancient cities) (§2.15) | Location-based — town danger varies by area (§3.9) |
| Economy | Scrap/component-based, no fixed currency | No formal currency; Emerald trading with villagers (§2.14) | Bottle caps/money plus a Barter skill (§3.12) |
| "Boss" encounters | Bradley APC, Patrol Helicopter (§1.14) | Ender Dragon, Wither, Warden (§2.12) | Frank Horrigan, final confrontation (§3.11) |

---

## Sources

Compiled from official sources, primary community wikis, and current guide/database sites, cross-checked against each other. Rust and Minecraft sections reflect their state as of July 2026, since both receive frequent updates; Fallout 2 (1998) is complete and unchanging.

**Rust —** Facepunch's official devblog (rust.facepunch.com, including the "Surviving 12 Years" 2025 recap and 2026 roadmap) and official wiki (wiki.facepunch.com/rust); Rust Wiki (rust.fandom.com); Rust Labs (rustlab.gg); and current player guides (falconrust.com, rustly.com, frozen-rust.com, rust-survival.com, xgamingserver.com, corrosionhour.com, cobaltlab.tech, rusthelp.com, wgn.si, space-node.net, rust.you) for version-specific mechanics, tiering, calculators, and team/server-format culture.

**Minecraft —** Mojang's official site (minecraft.net, including the Updates Timeline and Minecraft LIVE 2026 recap) and the primary community wiki (minecraft.wiki, including its Tutorial:PvP page, plus minecraft.fandom.com); current guide/database sites (switchbladegaming.com, questplaybook.com, 8bittoast.com, beebom.com, game8.co, stealthygaming.com, dedicatedminecraft.host, pcgamesn.com, exitlag.com, namehero.com, minecraft.how) for biome, mob, structure, and villager-trade detail; seed-tool sites (diamondfinder.io, seedlander.com, seeds.gg) for structure lists; and PvP-specific sources (grokipedia.com, cubecraft.net, spigotmc.org, minecraftforum.net, sportskeeda.com, ggservers.com) for combat-mechanics history and the competitive server ecosystem. Note: a "Minecraft Feedback" community-suggestion forum surfaced in search results during this research; its speculative fan-proposed content (unreleased mobs, items, etc.) was excluded from this document as unconfirmed.

**Fallout 2 —** The Fallout Wiki (fallout.wiki) and Fallout Wiki/Fandom (fallout.fandom.com, fallout-archive.fandom.com) for SPECIAL, skills, traits, perks, companions, and combat mechanics; StrategyWiki (strategywiki.org) and the Nearly Ultimate Fallout 2 Guide for companion and perk detail; No Mutants Allowed (nma-fallout.com), TV Tropes, and Steam Community guides for faction, plot, and ending detail; GameFAQs and Grokipedia for combat formulas and stat guides.

