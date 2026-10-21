# Nimbus project instructions

## Working agreement

- Read this file before making architecture or game design decisions.
- Keep this file current as the game develops. Record important requirements, agreed decisions, their rationale, constraints, and information needed to continue work reliably.
- Update relevant sections when decisions change; do not leave conflicting guidance in place.
- Distinguish confirmed decisions from proposals and open questions. Do not treat assistant suggestions as approved requirements.
- Follow the user's latest explicit instructions. Reconcile this file with any subsequent changes in direction.

## Engineering quality standard

All new and modified code must meet the user's requested Principal Software Engineer quality standard. Apply this through concrete engineering practices:

- Prefer the simplest design that satisfies the requirements. Keep modules cohesive, responsibilities clear, dependencies explicit, and interfaces small. Avoid speculative frameworks and unnecessary abstractions.
- Write readable, consistently formatted code with descriptive names. Use comments to explain non-obvious intent, invariants, and tradeoffs.
- Define and enforce contracts at boundaries: configuration, imported saves, persistence, scene lifecycle, and state transitions. Maintain a clear source of truth and reject invalid transitions.
- Handle asynchronous failures, retries, cancellation, cleanup, and race conditions deliberately. Preserve player data and avoid silent failures or destructive fallback behavior.
- Keep gameplay simulation, rendering, UI, configuration, and persistence appropriately separated. Extend reusable behavior rather than copying logic or duplicating tuning values.
- Protect the 60 FPS target: avoid blocking I/O and unnecessary allocation in the game loop, bound expensive work, and measure performance before adding complexity.
- Test meaningful behavior and failure paths, especially save integrity, state transitions, timing, collisions, and recovery. Run relevant checks and verify user-visible changes in the browser when available. Report verification limits honestly.
- Review changes for regressions, accessibility, mobile input/layout, browser compatibility, and resource leaks before calling the work complete.
- Keep architecture decisions, operational commands, limitations, and important tradeoffs current in this file. Distinguish implemented behavior from proposals.

This standard guides ongoing work; recording it does not constitute an audit or certification of all existing code.

## Project directory

Use `/Users/achin/git/nimbus` as the project root. Create all future project files within this directory.

## Current status

The user authorized a local Phaser prototype. Movement, diagnostics, laser and Chain Lightning weapons, enemies, IndexedDB saves, run XP/levels, and level-up weapon upgrades are implemented. Do not publish until requested.

The planning outline is in `/Users/achin/Documents/Codex/2026-10-21/i/outputs/plan.md`. Use that file for developing the plan; keep confirmed architecture and design decisions summarized here.

## Confirmed requirements

- Build a game website usable on both mobile and desktop.
- Gameplay runs locally in the player's browser.
- Persist saved state locally between visits.
- Genre: bullet heaven / power fantasy progression.

## Architecture

The website uses static HTML, CSS, and browser-native JavaScript modules. Phaser is the user-selected game engine, pinned to 4.2.1 in package.json and pnpm-lock.yaml. IndexedDB is the selected local save storage. GitHub Pages is the selected static hosting target; deployment preparation is described below.

- `index.html`: responsive placeholder page.
- `src/ui/styles.css`: responsive layout and presentation.
- `src/main.js`: explicit catalog loading and application startup. `src/app/run-controller.js`: guarded run actions and scene/state coordination. `src/app/save-controller.js`: checkpoint scheduling support, recovery data, finalization, and save status. `src/ui/`: DOM references, state rendering, upgrade dialog, save controls, and CSS. `src/dev/dev-reload.js`: sequential local-development reload polling. `src/game/run/run-timer.js`: active run timing and duration formatting. `src/game/create-game.js`: Phaser configuration and startup. `src/game/scenes/play-scene.js`: scene lifecycle and gameplay coordination; input and HUD are delegated to `player/player-input.js` and `hud/game-hud.js`.
- `scripts/dev.py`: Python standard-library preview server, bound to `0.0.0.0:5173` for desktop and same-Wi-Fi mobile testing. Development use only; it serves the project directory.
- Start from the project root with `python3 scripts/dev.py`. If npm becomes available, `npm run dev` invokes the same server. Install dependencies with `pnpm install --frozen-lockfile` (or `npm install` if pnpm is unavailable). The current machine has no npm on PATH; bundled pnpm was used.
- Desktop preview: `http://localhost:5173`. Mobile preview: `http://<computer-LAN-IP>:5173` on the same Wi-Fi.
- Keep port 5173 fixed. Future browser saves will be scoped to the origin; localhost and a LAN address have separate storage.
- Changes to `index.html` and files in `src/` trigger a browser reload.
- Validate Python syntax with `python3 -c "import ast; ast.parse(open('scripts/dev.py').read())"` and check HTTP responses while the server is running.

When agreed, document the runtime structure, rendering and simulation approach, input handling, save format and migration strategy, dependencies, and development and validation commands here.

## Runtime organization

- Game modules are grouped by feature under `src/game/`: player, weapons, enemies, run, world, scenes, and HUD. Browser controls live under `src/ui/`; application orchestration lives under `src/app/`.
- Startup loads and validates the three catalogs explicitly and concurrently. Validated weapon/enemy catalogs include definition maps and are injected into systems; importing a system does not fetch data. JSON files remain the single tuning source under `src/data/`.
- `createRunController(ui, catalogs, createGame)` coordinates the existing Phaser registry state and timer. The supplied game factory keeps orchestration testable without loading Phaser. The internal scene key remains `prototype`; runtime/save behavior is unchanged by the file rename.
- Weapon behavior modules own timed lightning chains and projectile pools; pure targeting functions remain in `lightning-targeting.js`. Both behaviors retain the shared enemy damage/death/XP path and reset their transient effects between runs.
- `src/storage/save-schema.js` owns validation, defaults, schema version, and migration entry points. `save-store.js` owns IndexedDB operations. Database name/version, save IDs, checkpoint payloads, and compatibility rules are unchanged.
- Tests mirror app/game/storage responsibilities under `tests/`. Run `npm test`, or `node --test tests/app/*.mjs tests/game/*.mjs tests/game/weapons/*.mjs tests/storage/*.mjs`. No build tooling or runtime dependencies were added.
- 2026-10-21: Implemented the user-approved feature folder refactor, explicit catalog loading, weapon behavior extraction, run/save controllers, input/HUD modules, and UI/storage separation. Existing gameplay tests and the new controller lifecycle integration test pass. Browser visual verification was unavailable in this session (browser providers unavailable; native Chrome automation timed out).

## Game design

Theme, permanent progression, final controls, production visuals, and audio remain to be defined; implemented combat and run progression are described below.

Automatic weapon fire, level-up choices, and save export/import are implemented. Permanent upgrades between runs remain proposals. Touch controls and keyboard movement are implemented provisionally.

## Decision record

- 2026-10-21: Establish this file as the ongoing reference for architecture and design decisions and maintain it throughout development, as requested by the user.

- 2026-10-21: Created a local-only, dependency-free site scaffold and Python development server at the user's request. npm is unavailable in the current shell; use the direct Python command.

- 2026-10-21: The large, eye-catching “Play Game” button is fixed to the bottom of the viewport on both mobile and desktop. Reserve bottom page space to avoid obscuring content and respect mobile safe-area insets. The scene starts automatically on page load; the button remains overlaid above the scene and transitions Ready to In-Game without restarting. Preserve keyboard focus visibility and reduced-motion support.

- 2026-10-21: Homepage informational copy is hidden initially in a native HTML popover opened by a fixed top-right “i” button. It toggles by button, closes via its close button, outside click, or Escape, and scrolls on small screens. The homepage retains branding, decorative artwork, and the bottom Play Game button. The information control exposes its expanded state accessibly.

- 2026-10-21: Selected Phaser at the user's request. Local prototype uses Phaser AUTO rendering (WebGL when available), RESIZE scaling, normalized WASD/arrow movement, touch-hold movement, a throttled FPS/renderer display, and automatic startup behind the homepage controls. These controls are provisional. Chasing enemies and laser damage are implemented. IndexedDB local saves are implemented. No external CDN is used. The Python server serves Phaser's installed ESM bundle from node_modules. Validate module syntax with Node --check and HTTP responses from the local server; real-device performance remains to be measured.

- 2026-10-21: Phaser runs immediately on navigation. Keep the Play Game button anchored at the bottom above the running canvas, with the information button and branding also overlaid. Play transitions the existing scene from Ready to In-Game; it does not recreate the scene. Removed the separate Home/exit action.

- 2026-10-21: Target and cap the game loop at 60 FPS using Phaser `fps: { target: 60, limit: 60 }`. Keep requestAnimationFrame scheduling. Actual FPS may fall below 60 under device load or browser throttling; the cap is not a performance guarantee.

## Game states

- `src/game/run/run-state.js` defines shared state names: `Ready`, `In-Game`, `Paused`, `Level Up`, and `Restart`. Phaser registry key `state` is the runtime source of truth.
- On navigation the scene starts running in Ready, with the Play Game overlay visible and movement and automatic weapon firing active before play starts.
- Play Game transitions Ready → In-Game, hides the start overlay, focuses the canvas, and starts run progression/enemy spawning. The state is displayed on screen.
- Refresh returns to Ready unless an interrupted run checkpoint is present; that run restores into Paused. Reaching 0 player HP ends the run into Restart.
- 2026-10-21: User requested Ready as the initial state and Play Game as the transition to In-Game.

- 2026-10-21: In-Game hides the information button and replaces it with a top-right Pause button. Pause transitions to Paused, clears held input, and pauses the Phaser scene (including scene updates, timers, and tweens). The same control becomes Resume to return to In-Game without resetting the scene. The information button remains exclusive to Ready. State UI synchronization lives in `renderGameState` in `src/ui/game-controls.js`.

- 2026-10-21: Paused displays a centered End Run button, alongside top-right Resume. End Run transitions Paused → Restart and hides both controls; the ended scene remains frozen. Restart displays active run duration and Play Again. Keyboard focus moves to End Run on pause and Play Again when the run ends.

- 2026-10-21: Restart shows time spent in In-Game, accumulated with monotonic `performance.now()` across active segments and excluding Ready, Paused, and Restart. Results use minutes:seconds.tenths. Play Again transitions Restart → Ready, resets the run timer, clears input, recenters the player, resumes the scene, and restores Ready controls without reloading. Completed results are persisted before Play Again becomes available.

## Weapons

- Player can equip at most six distinct weapon IDs. `src/data/weapons.json` owns the catalog, stats, behavior descriptions, capacity, and starting loadout. `src/game/weapons/weapon-catalog.js` explicitly loads and validates it. `weapon-system.js` manages equipment, upgrades, cooldowns, and behavior dispatch. `behaviors/straight-projectile.js` and `behaviors/chain-lightning.js` own their runtime effects and pools.
- For current prototyping, each new run starts with Chain Lightning only. The laser automatically fires a small cyan laser every 500 ms while In-Game. Firing and projectile advancement occur in Ready and In-Game, and stop in Paused, Level Up, and Restart.
- Facing follows the last nonzero movement direction and persists when stationary; initial facing is up. A cyan marker shows direction. This is the provisional interpretation of facing.
- Laser speed is provisionally 650 pixels/second and lifetime 1.5 seconds; projectiles also recycle offscreen. Lasers deal 1 damage and are consumed by their first enemy hit, using swept collision detection.
- Cooldowns preserve progress across pause/resume. Play Again clears projectiles, cooldowns, and equipment to the configured starting loadout, and resets facing up. The HUD shows six weapon slots.
- 2026-10-21: Implemented the user-requested six-weapon capacity and basic laser firing every 0.5 seconds.

## Enemies

- `src/data/enemies.json` defines enemy descriptions, behavior IDs, stats, appearance, and spawn tuning. `src/game/enemies/enemy-catalog.js` explicitly loads and validates the catalog; `enemy-spawner.js` implements the pooled EnemySpawner, shared damage/death handling, and status updates. Add future enemy definitions to JSON.
- Initial type is a Chaser with 3 HP, shown as an orange circle with its current HP. It pursues the player at 90 pixels/second and deals 1 base contact damage, both configured in enemy JSON.
- Spawn centers must be at least half the current viewport width away from the player (Euclidean distance), with the full enemy body outside the player-centered viewport in world coordinates. Sample an expanded camera perimeter with a 32 px gap; wait if the viewport has zero size. Distance applies at spawn time.
- Spawn waves every 3 active simulation seconds: 1–5 enemies before 30 seconds, 6–12 from 30 seconds to 2 minutes, then 13–24 from 2 minutes onward. Spawning pauses outside In-Game.
- Lasers provisionally deal 1 damage each and disappear after hitting the nearest enemy along their frame trajectory. Enemies disappear at 0 HP and are recycled.
- Play Again clears all enemies and resets the spawner. XP rewards are configured in JSON; no difficulty scaling yet.

- Weapon catalog schema version 1: each weapon has a stable ID, name, description, declarative behavior, stats with explicit units, and projectile visuals/collision size. Equip weapons by ID. Editing JSON changes actual gameplay; do not duplicate tuning values in code.
- Supported behavior is currently `straight-projectile` with automatic firing, player-facing aim, and consume-on-hit. More weapons using that behavior need only catalog entries; genuinely new behaviors require a reusable JavaScript implementation and validator support. JSON contains no executable code. Invalid catalogs stop startup with the existing load-error UI.
- 2026-10-21: Moved the current basic laser definition and all weapon tuning into src/data/weapons.json.

- Enemy catalog schema version 1 supports `stationary` and `chase-player` behaviors with circular appearance. JSON owns max HP, radius, colors, HP label settings, spawn type, interval, immediate spawn, and minimum-distance screen-width ratio. Existing behavior can be reused by new entries; new behavior types require JavaScript implementation and validator support. Invalid data stops startup through the existing error UI.
- 2026-10-21: Extracted enemy definitions and spawn tuning into src/data/enemies.json without changing current gameplay.

## Local persistence

- `src/storage/save-store.js` uses native IndexedDB database `nimbus`, DB version 1, with `profile`, `runs`, and `checkpoint` stores. Save payload schema version is 1. Unknown versions and invalid data fail without replacing existing data. Future migrations belong before validation.
- Profile stores lifetime completed-run stats, currency/unlocks/upgrades, and settings. Currency/upgrades/settings are schema foundations; no new progression economy or audio/graphics controls are implemented.
- Runtime stats stay in memory. Checkpoint every 5 seconds, on pause, and when the page becomes hidden. Hidden tabs transition to Paused so background time is excluded. Browser termination can lose changes since the last successful checkpoint; do not rely on unload completion.
- Checkpoints capture run ID, active duration, kills, player position/facing, equipped weapon IDs/cooldowns, active enemies/HP, and spawner cooldown. Restore into Paused. In-flight projectiles are intentionally discarded on recovery.
- End Run atomically stores a unique run result, updates lifetime totals, and removes its checkpoint in one transaction. Duplicate finalization does not double-count. On write failure show an error and Retry; preserve the ended run until it is saved.
- Info panel shows lifetime stats and JSON export/import controls. Import validates size, schema and values and requires confirmation before atomically replacing local data. Export includes profile, run history, and checkpoint.
- Persistent storage is requested only through the explicit Keep saves on this device button. Grant is browser-dependent. Saves remain browser/device/origin-specific and can be lost if site data is cleared. Export backups for portability. Use one active playing tab per browser; cross-tab checkpoint ownership is not yet implemented.
- 2026-10-21: Implemented the approved IndexedDB persistence architecture, local run recovery, lifetime stats, backups, and storage failure reporting.

- 2026-10-21: Refactored main.js into named guarded run actions and a separate state renderer used at startup and transitions. Timer helper supports checkpoint duration restoration; Phaser registry remains the state source of truth. Development polling runs sequentially on loopback hosts or private IPv4 hosts on port 5173.

- `SaveStore.updateProfile` provides transactional, validated updates for future progression/settings features. `tests/storage/saves.test.mjs` uses dev-only fake-indexeddb to verify persistence, idempotency, backup validation/round-trip, and rollback; run `npm test` or `node tests/storage/saves.test.mjs`. Runtime has no added storage dependencies.
- Verified in browser: checkpoint survives reload into Paused; End Run commits results; Play Again restores Ready. Backup schema rejects unsupported checkpoint weapon/enemy IDs before replacement.

## Player health and contact damage

- Player starts each run with 10 HP. `src/game/player/player-health.js` owns health, validation, and a provisional 1000 ms shared contact-invulnerability window. The HUD displays current/max HP.
- Enemy JSON `stats.baseDamage` sets damage; the initial base enemy deals 1. Active circular overlaps apply the highest overlapping enemy damage, once per cooldown, so damage is independent of frame rate and iteration order. Continued overlap can hit again after 1 active second. A faded player indicates invulnerability.
- Damage/cooldown progression only runs In-Game. 0 HP immediately freezes the scene and uses the existing run-finalization/Restart flow; no new game state. Play Again restores 10 HP.
- Checkpoints include HP and remaining invulnerability. Existing schema-v1 checkpoints without health default to 10 HP for backward compatibility; invalid health is rejected. Dead runs are finalized, never restored as live checkpoints.

## Endless world and camera

- The world has no gameplay boundaries. Player and enemies use signed world coordinates; new runs start at (0, 0). No viewport clamping is applied on movement, resize, or checkpoint restoration.
- Camera centers exactly on the player every frame and on resize/reset/restore. A repeating grid texture scrolls with world position without generating a growing map. HUD uses zero scroll factor.
- Touch movement is relative to viewport center; collisions, lasers, and saved positions use world coordinates. `src/game/world/world-geometry.js` provides pure viewport/spawn geometry.
- Enemy spawn distance remains at least half the viewport width from the player. Projectiles recycle outside the current world viewport or on expiry. Enemies abandoned more than two viewport maximum dimensions beyond view are recycled without awarding kills, to avoid accumulating entities during endless travel.
- Save schema v1 now accepts finite signed positions; existing nonnegative positions remain compatible.

## Player catalog

- `src/data/player.json` owns all current player base stats: maximum HP, movement speed, contact invulnerability duration, and collision radius, plus initial position/facing, touch deadzone, and appearance. Edit this JSON for tuning rather than hardcoding player values.
- `src/game/player/player-config.js` loads and validates the catalog before scene startup. `PlayerHealth` receives configured stats explicitly, keeping health logic independent of fetching and testable.
- Remaining HP, cooldown, position, and lifetime stats are mutable save data in IndexedDB, not written back to the source JSON. Starting weapons/capacity remain defined once in weapons.json.
- Save validation checks structural health validity; restoration checks against the current configured player limits. Checkpoints that exceed newly reduced limits fail safely instead of silently changing saved progress.

- Base enemy now uses `chase-player`, continuously steering toward the current player position only during In-Game. Its provisional speed is 90 pixels/second, configured in enemies.json. HP labels move with the enemy; pause/resume and restored enemies use the same behavior. `src/game/enemies/enemy-behaviors.js` holds reusable movement implementations. The original `stationary` enemy ID is retained for save compatibility; behavior and display name are independent of the stable ID.

## In-game progression

- `src/game/run/run-progression.js` owns run-local current XP, total XP, and level. All start at 0 on Ready → In-Game. Pause/resume and checkpoint recovery preserve these values; Play Again clears them.
- `player.json` progression.xpPerLevel is 100. Each 100 cumulative XP adds one level; current XP rolls over to 0 at exact thresholds, with overflow carried forward. Example: 250 XP gives level 2, current XP 50, total XP 250. Awards must be nonnegative safe integers.
- The scene exposes `awardXp(amount)` for future reward sources, gated to In-Game. Base enemy kills award a random integer from 1 through 5 XP, inclusive. HUD shows level, current XP, and session total.
- Checkpoints save all counters plus the threshold and validate consistency. Older checkpoints without progression start at zero. Mismatched saved thresholds fail restoration safely instead of silently altering progress. These counters are separate from permanent player progression.

- Enemy JSON `rewards.xp.min` / `max` defines the inclusive integer XP range. The base enemy awards 1–5 XP immediately on death. EnemySpawner calls the scene reward handler only after deactivating the killed enemy, preventing repeat awards; offscreen recycling, resets, and checkpoint restoration grant no XP. The range is validated at catalog load.

- Progression HUD updates synchronously through the RunProgression change callback on XP awards, level-ups, resets, and checkpoint restore. Display updates are event-driven, independent of the FPS readout refresh and game loop polling. Zero-XP awards do not redraw.

## Weapon upgrades and Level Up state (implemented)

Confirmed requirements:

- Each weapon supports three upgrade categories: laser uses size/fire-rate/effect; Chain Lightning uses projectile-count/fire-rate/effect.
- Laser size upgrades multiply projectile dimensions and matching collision size by 1.15 per tier (compounding +15%).
- Laser fire-rate upgrades reduce the firing interval by 100 ms per tier, with a minimum interval of 50 ms (maximum 20 shots per second).
- Effect upgrades are weapon-specific. The basic laser's effect upgrade adds one additional laser per tier, with 15 degrees between adjacent shots in a cone centered on player facing, capped at five upgrades; per-projectile damage is unchanged.

Implementation:

- Keep upgrade definitions and tier values per weapon in weapons.json. Shared size/fire-rate calculations and weapon-specific effect implementations remain in reusable JavaScript.
- Track acquired upgrade tiers on each equipped weapon instance, separately from its immutable base definition. Derive effective stats from base stats and tiers rather than repeatedly modifying the base catalog.
- Scale both projectile visuals and collision size for size upgrades. Preserve speed and lifetime unless explicitly upgraded.
- Derive laser firing interval as max(50, baseIntervalMs - 100 * tier). With the current 250 ms base interval, effective tiers yield 250 → 150 → 50 ms; further fire-rate upgrades cannot improve the interval.
- Apply effective stats to newly fired projectiles; already-fired projectiles keep their firing-time properties. Preserve fractional cooldown progress when changing fire rate.
- Treat upgrades as run-local initially: checkpoint and restore tiers with the loadout; reset them for a new run. Permanent upgrades remain a separate future feature.
- Validate upgrade categories, tier bounds, and supported effects. Legacy checkpoints without upgrade tiers default to zero.

Open decisions:

- Additional weapon upgrade behaviors as new weapons are added.

The current laser effect is capped at five upgrades, producing six lasers at -37.5, -22.5, -7.5, 7.5, 22.5, and 37.5 degrees, and fire rate is capped at 50 ms. Size compounds each selection up to 10 tiers; over-cap tiers and nonfinite sizes are rejected.

- Each level gained queues one upgrade selection. In-Game → Level Up freezes the scene and active run timer, randomly selects one equipped weapon, and opens a modal with Size, Fire Rate, and Effect choices for that weapon. Capped choices remain visible and disabled. Choosing a valid upgrade consumes one pending selection; process any queued levels before returning to In-Game.
- Definitions live in weapons.json; pure stat calculation/validation lives in src/game/weapons/weapon-upgrades.js. Weapon instances cache effective stats and store independent tiers. Existing projectiles keep their original stats. Cooldown percentage survives fire-rate upgrades.
- Checkpoints persist upgrade tiers, pending level count, and selected weapon ID. Recover pending upgrades back into Level Up with the same selected weapon. Legacy checkpoints default tiers and pending selections to zero. Reset clears upgrades and pending choices.
- The modal uses a native dialog for focus containment; Escape cannot skip a required choice. Mouse, touch, and keyboard selections use the same guarded action.

- Laser effect definition now uses `additional-projectile` and `angleOffsetDegrees: 15` in weapons.json. Each firing emits effect tier + 1 shots symmetrically around player facing with the same effective size, speed, lifetime, and damage. Existing saved effect tier 1 uses this new behavior automatically; the former damage boost is removed.

- Laser effect `maxTiers: 5` is catalog-driven and enforced on upgrade application and checkpoint equipment restoration. Tier N fires N+1 lasers at offsets (index - N/2)×15 degrees. The modal describes centered spacing and current tier count, disabling Effect at tier 5.

- The cone remains centered for all projectile counts: two shots at ±7.5°, three at -15°/0°/+15°, and six at ±7.5°/±22.5°/±37.5°. Even counts straddle the facing direction rather than biasing the spread to one side.

- Size upgrade `maxTiers: 10` is catalog-driven. The modal shows tier progress and disables Size at tier 10. Loadout restoration rejects tiers above the cap. Once all upgrades on a weapon are capped, random selection uses other upgradable owned weapons; if none remain, pending selections are cleared and gameplay continues without an unresolvable modal.

## Chain Lightning

- Added `chain-lightning` to weapons.json; it is now the sole starting weapon. Existing checkpoints retain their saved loadout; new runs receive Chain Lightning only.
- Provisional base stats: 1 damage per target, 1500 ms interval, 300 px initial targeting range, 180 px jump range, 1 jump after the initial target. Automatically targets the nearest active enemy; each hop selects the nearest distinct enemy within jump range. No target is hit twice in one strike.
- Projectile Count adds one independently targeted chain per tier (max 10); jump range remains fixed. Fire-rate reduces interval by 100 ms per tier to a 300 ms floor. Effect adds one jump per tier (max 5). Initial targeting range stays unchanged. All values live in JSON.
- `src/game/weapons/behaviors/lightning-targeting.js` contains pure target selection. EnemySpawner.damageEnemy is the shared damage/kill/XP path. Electric-blue lightning uses one reusable Graphics object retained throughout a timed chain. Pause freezes visuals; reset clears them. Level Up freezes pending hops until gameplay resumes.
- New behaviors have type-specific catalog validation and upgrade derivation. Existing weapon instance tiers/checkpoint format also supports lightning.

- Ready allows keyboard/touch movement and weapon firing in the endless world. Automatic enemy spawning, XP, player damage, and run timing remain In-Game only. Ready contains one Block target that weapons can damage. Play Game preserves preview position/facing but clears preview enemies and resets weapons/cooldowns and run progression.

## Block enemy

- Added catalog ID `block`: stationary, 100000 HP, grey 160×100 px rectangle with HP label. Dimensions are provisional and configurable in enemies.json. Contact damage and XP rewards default to zero pending design. Existing automatic Chaser spawn schedule is unchanged; Block can be spawned through EnemySpawner.spawn('block').
- Enemy catalog/rendering/pools support circles, rectangles, and triangles. Rectangle contact uses closest-point circle/rectangle collision; projectile hits use swept expanded-box collision. Lightning uses the same shared enemy damage path for either shape. Shape-specific pooling prevents reusing a circle sprite as a rectangle. Restored enemies use the exact newly spawned instance.

- Ready spawns exactly one Block at the configured relative position (`enemies.json` readySpawn, initially 180 px above the player). Weapons can hit it for practice without granting XP or recording a run. No automatic respawn if destroyed. Starting a run clears the Block and preview shots; returning to Ready creates a fresh Block. Checkpoint restoration clears the temporary Ready target before restoring actual run enemies.

- Chain Lightning starts at electric blue #0088ff and brightens toward white by 15 percentage points per jump, configured via appearance.whitenessPerJump. Each struck enemy takes the exact color of its incoming lightning segment. Strike color lasts through the stun; surviving enemies revert to their configured base color when the stun expires. Cosmetics are not included in checkpoints. Initial target uses the base color; each subsequent jump wave increases the white blend. All targets in one wave share its color.

- Starting loadout is now only `chain-lightning`, configured in weapons.json. Laser stays available in the catalog. Existing saved runs preserve equipped weapons; Ready resets and new runs use the updated starting loadout.

- Chain Lightning now processes one branching wave per 500 ms step (`stats.jumpDelayMs`). Each hit stuns for 500 ms (`stats.stunDurationMs`): no movement, and lethal damage leaves the enemy active at 0 HP until the stun expires. Damage from any source respects deferred death. Death/XP resolves once at expiry.
- Accumulated lightning segments remain visible while the chain progresses. After the last target's step, clear the chain if no jumps remain or no unvisited target is in range. Brightness increases with each hop. One active volley runs at once; its independent chains finish before the next volley can replace them.
- Pause/Level Up freezes chain and stun simulation time. Reset clears both. Checkpoints preserve enemy stun time (including 0-HP pending deaths), but active lightning visuals/chains are transient and are discarded on recovery like other in-flight projectiles.

- Chain Lightning fan-out is 1 initial target, then up to 2 targets on the next jump, then up to 3 per subsequent jump (including effect tiers 4 and 5). The cap is per entire wave, not per branching enemy. Each target connects to the nearest valid origin in the previous frontier, must be in jump range, and cannot have been hit earlier in the chain. The JSON stat maxTargetsPerJump is 3. Effect upgrades still add jump depth, not extra fan-out beyond 3.

## Chain Lightning projectile count

- Replaced lightning Size with Projectile Count. Each tier adds one initial chain, up to 10 tiers, configured under weapons.json upgrades.projectile-count. Initial chain count is 1. Laser Size upgrades are unchanged.
- First chain targets the nearest enemy; additional initial targets favor bearings furthest from selected bolts. All initial targets must be distinct and in targeting range, with a provisional minimum 15° bearing separation (stats.initialDirectionSeparationDegrees). If suitable targets are missing, fire fewer chains.
- Chains progress independently with their own visited targets, frontier, brightness, and pooled Graphics. Jump depth and 1→2→3 wave caps apply separately to each chain. New volleys wait until all current chains finish.
- Legacy lightning size tiers migrate one-for-one to projectile-count tiers on load; jump range reverts to its configured base value. New checkpoints include projectile-count tiers. The Level Up modal offers Projectile Count, Fire Rate, and Effect for lightning.

- Lightning jump color now blends the base electric blue toward white: blend = min(1, hop × 0.15). Later jumps stay blue but become progressively paler/brighter; they no longer rotate into purple. Hit enemies use the same brightened segment color.

## Weapon icons

- Hand-authored SVG icons live in assets/icons/weapons/: chain-lightning.svg (electric-blue bolt) and laser-gun.svg (cyan laser pistol). Their paths are declared by each weapons.json entry's icon property. These are scalable code-native assets, with no image-generation dependency.
- PlayScene preloads weapon icons for Phaser. GameHud displays equipped icons in six framed weapon slots, updating only when the loadout changes. The upgrade dialog shows the selected weapon's icon beside its text name; the image is decorative for screen readers.

## Spawn schedule

- enemies.json spawner.tables owns separate per-type inclusive random wave-count ranges. Waves occur every 3000 ms; the first wave is at 3 seconds. At exactly 30 seconds the 6–12 phase applies, and at exactly 120 seconds the 13–24 phase applies. Each wave samples one uniform integer count. Existing enemy types, HP, speed, spawn distance, and Ready Block remain unchanged.
- Requested final phase is 2–4 minutes; until further specified, 13–24 enemies every 3 seconds continues beyond 4 minutes.
- EnemySpawner tracks active simulation time and wave remainder; Ready, Paused, Level Up, and Restart do not advance the schedule. Checkpoints persist spawnRunElapsedMs and spawnElapsedMs; legacy checkpoints derive phase time from recorded run duration. New runs reset both clocks.

## Splitter

- Added enemies.json ID `splitter` with 4 HP. Its onDeath spawn-enemies effect creates exactly four existing Chasers (stable ID stationary), spaced around a 40 px radius from its death position in world coordinates. Children bypass normal distance constraints so they appear close to the death.
- Provisional appearance/behavior: green triangle, 44×44 px, player-chasing at 40 px/s, 1 contact damage, 1–5 XP. These unspecified tuning values reuse Chaser defaults where possible and are configurable. Splitter now has its own timed spawn table alongside the Chaser table.
- Death splitting occurs only at actual death, after any stun expires, and never on reset/despawn. Capture parent data before pooled reuse; spawn children before emitting the kill XP callback, so a level-up checkpoint includes the children. Children use current Chaser stats and their own normal rewards. Catalog validation checks child type/count/radius.

- Spawn tables are now separate: Chasers keep 1–5 / 6–12 / 13–24, and Splitters use 1–2 / 2–4 / 4–6 for 0–30 s / 30–120 s / 120–240 s. Both tables spawn every 3000 ms starting at 3 s, with separate random counts. Final ranges continue after 4 minutes. Counts are additive; Splitter death-spawned Chasers are additional to these waves.
- Each table has its own interval and phases. Due waves are derived from active run time so checkpoint recovery preserves both schedules without duplicating waves; reset returns both to zero. Ready's single Block remains independent.

- Timed Chaser and Splitter waves now spawn fully offscreen, including body radius/rectangle bounds and stroke, with enemies.json spawner.offscreenMarginPixels = 32. Perimeter sampling also preserves the minimum half-screen-width distance on wide views. No rejection loop or growing world bounds is needed.
- Explicit-position spawns remain intentional exceptions: the Ready Block stays visible, Splitter children appear near the death point, and checkpoint restoration keeps saved positions. Normal wave counts and timings are unchanged.

- Splitters now render as green 44×44 px upward-pointing triangles, configured in enemies.json. Contact collision uses triangle edges/interior; projectile sweep clips against radius-expanded triangle edges. HP labels, chase behavior, health, and death-spawn behavior are unchanged. Shape-specific pooling supports triangle reuse.

- Lightning hit colors now revert on stun expiry: Chasers return to orange, Splitters to green, and Blocks to grey. Re-stunning extends the current color until the extended stun ends; lethal enemies follow the existing deferred-death path instead.

## HUD stat bars

- HP and current-level XP now use responsive screen-fixed fill bars above weapon slots. HP fills green and changes to red at the configured low-health threshold; XP fills blue and resets with each level rollover. Text inside bars retains exact values and level. Session total XP remains above the bars.
- src/game/hud/stat-bar.js renders reusable Phaser bars. Updates happen on health/progression changes and resize, without per-frame redraws or animation delays. Fill ratios clamp to 0–1; zero values render an empty track.

- In-Game top-left UI shows only FPS at (18,24): hide branding, control hints, state label, and save status. Other states restore their informational UI. Health/XP bars, total XP, weapon slots, and Pause remain available. GameHud.renderState runs on transitions for immediate visibility updates.

- Ready → In-Game UI exits animate over 280 ms toward each element's nearest viewport edge: header uses its visible brand bounds, Play slides down, left status text slides left, and the information button uses its nearest edge. Controls become inert immediately; animations are canceled/cleaned up on further state changes.
- Phaser control hints slide left and FPS moves to its in-game position in the same duration. Respect prefers-reduced-motion with immediate changes. Run timing/gameplay begin immediately rather than waiting for presentation animations.

- Entering Paused slides the pause interface (branding, status text, Resume, End Run, and control hints) down from above the viewport in 280 ms. Resuming slides it upward out of view. Health/XP bars and weapon slots stay fixed. Reduced-motion mode changes visibility immediately.
- Canvas HUD motion uses game-level step events rather than scene tweens so the animation continues while gameplay is paused. Animation handlers clean up on completion, state interruption, and scene shutdown. DOM pause animations share transition cleanup with Ready exits.

- Paused → Restart slides the existing End Run button/container upward and slides Run Complete in from below. Restart → Ready sends Run Complete upward and brings Ready UI in from each item's nearest final screen edge, including the canvas stat/weapon HUD. Both use 280 ms motion, shared cancellation/cleanup, and reduced-motion bypass. The button label remains End Run (the existing control referred to as End Game).

## Collision broad phase

- 2026-10-21: Added `src/game/enemies/enemy-spatial-index.js`, a sparse 128 px world-space grid, to replace full enemy-pool scans in laser swept-hit and player-contact queries. Each enemy center occupies one cell; queries expand by catalog body extents, projectile radius, and the triangle sweep’s mitered-corner padding. Existing exact collision functions still decide hits, nearest swept-hit selection retains pool-order ties, and contact damage remains the strongest overlapping enemy damage.
- EnemySpawner synchronizes the index on spawn/reuse, movement across cells, death (including deferred stun deaths and Splitter children), distant despawn, reset, and checkpoint restore. Empty cells are deleted; query buffers are reused. Future position changes or removal paths must keep this index synchronized. The index is derived runtime state and is not saved.
- Regression coverage in `tests/game/enemy-spatial-index.test.mjs` compares indexed queries with full scans for circles, rectangles, triangles, signed coordinates, swept paths, upgraded radii, boundary cases, and lifecycle changes. A deterministic 2,000-enemy spacing test reduces a local laser query to one candidate; this verifies candidate reduction, not actual device FPS. Movement/status loops, lightning targeting, HP text, and checkpoint costs remain separate performance work.

## GitHub Pages hosting

- 2026-10-21: User created the Git repository and uploaded it to `git@github.com:C-Andrew/nimbus.git` (`main` branch), and requested GitHub-based hosting. Prepared GitHub Pages deployment; preparation does not confirm a live deployment.
- `.github/workflows/pages.yml` tests, builds, checks deployment paths, and deploys the `dist/` artifact on pushes to `main` or manual dispatch. Select Settings → Pages → Build and deployment → Source → GitHub Actions once in the repository. Expected default URL: `https://c-andrew.github.io/nimbus/` (subject to repository Pages configuration).
- `npm run build` / `python3 scripts/build.py` recreates ignored `dist/` from an allowlist: index.html, src/ (excluding dev polling), assets/, and minified Phaser with its license under vendor/. Only the generated copies of Phaser imports are rewritten. No new runtime dependencies or bundler; pnpm lockfile remains authoritative for CI installation.
- HTML and weapon icon paths are relative to the page, so both localhost root and the repository URL subpath work. Catalog URLs remain relative to their modules. `python3 scripts/check-build.py` checks deployed HTML/module/catalog/icon references for root and /nimbus/ hosting and ensures development polling is excluded.
- Continue local development with `python3 scripts/dev.py` on port 5173. To preview production output, run `python3 -m http.server 5174 --directory dist`. Changes must be committed and pushed before the workflow can deploy them; do not commit dist/ or node_modules/.
- IndexedDB saves stay local to each browser and origin. The GitHub Pages origin has separate saves from localhost; export/import a backup to transfer existing progress.
