# Adding content to Nimbus

All paths below are relative to `/Users/achin/git/nimbus`. Current tuning and behavior are preserved by the content refactor. The power-up manifest starts empty: this adds the extension system, not new drops, currencies, or an upgrade economy.

## Where things belong

```text
src/content/
  enemies/index.json          Explicit list of enemy definition files
  enemies/chaser.json         Chaser keeps the stable save ID "stationary"
  enemies/block.json
  enemies/splitter.json
  weapons/index.json          Definitions, starting loadout, six-weapon capacity
  weapons/basic-laser.json
  weapons/chain-lightning.json
  power-ups/index.json        Explicit list of power-up files (currently empty)
  encounters/default.json     Wave tables, active cap, Ready target positions
  player.json                 Player base values, appearance, input settings
  stats.json                  Stat limits, integer rules, optional defaults
src/game/
  enemies/enemy-system.js     Lifecycle, pools, statuses, combat coordination
  enemies/enemy-spawner.js    Spawn placement and active-time wave schedule
  enemies/enemy-renderer.js   Phaser shapes and HP labels
  enemies/enemy-behaviors.js  Movement behavior registration
  enemies/behaviors/          Movement algorithms
  enemies/death-effects/      Death effect implementations and registry
  weapons/weapon-behaviors.js Weapon behavior registration
  weapons/behaviors/          Runtime and definition modules
  stats/stat-block.js         Cached effective stat values and modifiers
  effects/                   Power-up validation, effect registry, active scopes
```

JSON is declarative. Do not put executable JavaScript into content files. `src/content/load-content.js` loads and validates content once before gameplay. Manifests use explicit `./file.json` references, which work at both localhost root and GitHub Pages subpaths.

## Add an enemy using an existing behavior

1. Copy an enemy file under `src/content/enemies/`, choose a new stable `id` and name, and adjust stats, appearance, rewards, and behavior.
2. Add its filename to `src/content/enemies/index.json`.
3. Add a spawn table or reference it from an existing table in `src/content/encounters/default.json`. Ready target positions are configured separately in that file.
4. Run content validation and relevant enemy tests.

Existing movement behavior IDs are `stationary` and `chase-player`. Existing shapes are `circle`, `triangle`, and `rectangle`. Reusing those requires no runtime changes. The shared enemy system enforces the 500-active-enemy cap, pooling, enemy-body nonoverlap, player contact, weapon hits, XP, and checkpoint recovery.

For new movement, add a pure `(position, player, speedPixelsPerSecond, deltaMs)` function under `enemies/behaviors/` and register it in `enemy-behaviors.js`. Movement proposes a position; EnemySystem handles blocking and axis sliding afterward. A zero configured speed or stationary behavior remains immobile; stunned enemies do not advance movement.

For a new death effect, implement `validate(effect, definitions, parentId)` and `apply(effect, { spawn, x, y })`, then register it in `death-effects/registry.js`. Use the supplied `spawn` callback so caps and nonoverlap always apply. The parent is recycled before the effect runs; XP is emitted after child spawns. Effects must complete synchronously to keep level-up checkpoints consistent.

For a new visual shape, update rendering, geometry/body collision, player/projectile collision, spatial query extents, and catalog validation together. A new shape is an engine feature, not just a JSON tuning change.

## Add a weapon using an existing behavior

1. Copy a definition under `src/content/weapons/`, choose a stable ID, and add its path to `weapons/index.json`.
2. Reuse `straight-projectile` or `chain-lightning` and its supported upgrade fields.
3. Provide an optional page-relative icon path such as `./assets/icons/weapons/example.svg`.
4. Equip it with `scene.weapons.equip(id)` or explicitly add it to `startingWeapons` while prototyping.

Each equipped weapon has its own cooldown and runtime (`weapon.runtime`). Two weapons using the same algorithm do not share chains, visited targets, or projectile pools. Equipment reset clears transient effects; scene shutdown destroys owned rendering resources.

For a new algorithm, add a runtime module and a definition descriptor, then register the descriptor once in `weapon-behaviors.js`. The runtime contract is:

- `fire(effectiveDefinition, facing, enemies)`
- `update(deltaMs, enemies)`
- `reset()` to clear transient state while retaining reusable pools
- `destroy()` to release rendering objects and listeners

The descriptor owns `createRuntime`, `validate`, `validateUpgrades`, `categories`, `migrateTiers`, `maximumTier`, `effective`, and `describeUpgrade`. See `chain-lightning-definition.js` for an example. `describeUpgrade` returns `[label, description]`; the dialog uses it directly. `effective` must derive values without modifying the base definition. Keep upgrades bounded and avoid recalculating effective values every frame.

Upgrade categories can have new stable names. The save validator accepts nonnegative integer tier maps; the descriptor validates which categories and limits its weapon supports. Legacy zero-valued fields are retained for old saves. Lightning's older size tiers migrate to projectile-count tiers in its descriptor.

## Add player stats

1. Add a rule to `src/content/stats.json`: finite `minimum` and `maximum`, optional `integer: true`, and an optional `default`.
2. Add the base value in `src/content/player.json`, or supply a rule default when the stat is optional.
3. Implement the gameplay consumer that reads `scene.stats.values.yourStat`. Defining armor, for example, does not by itself implement damage reduction.
4. Add tests for its limits and affected gameplay.

`StatBlock` computes `(base + sum of additive modifiers) * product of multipliers`, then rounds integer stats and clamps limits. Results are frozen and cached. Source changes trigger recalculation; movement does not rebuild stats each frame. Batch related changes with `stats.batch(...)` for one atomic recalculation and notification.

Player movement reads effective stats. Changes to maximum HP, contact invulnerability, or collision radius synchronize health and the player body automatically. Increasing max HP preserves current HP; reducing it clamps current HP. A new run resets HP to the current effective maximum. Weapon-specific upgrades remain owned by weapon descriptors; consuming a new global weapon-related player stat requires an explicit WeaponSystem/behavior integration.

## Add a power-up

Create a file under `src/content/power-ups/` and list it in `power-ups/index.json`. Example (not shipped as active content):

```json
{
  "id": "haste",
  "name": "Haste",
  "scope": "timed",
  "durationMs": 10000,
  "maxStacks": 3,
  "effects": [
    {
      "type": "stat-modifier",
      "modifiers": [
        { "stat": "movementSpeedPixelsPerSecond", "operation": "multiply", "value": 1.2 }
      ]
    }
  ]
}
```

Grant it through `scene.grantPowerUp('haste')` during In-Game. A future pickup or reward system can call that API. The current level-up dialog still offers weapon upgrades; power-up drops and selection UI are separate gameplay additions.

Scopes:

| Scope | Lifetime | Save location |
| --- | --- | --- |
| `run` | Until the next run reset | Active checkpoint |
| `timed` | Active gameplay milliseconds; pauses freeze the timer | Checkpoint with remaining duration |
| `permanent` | Survives run resets | Profile progression and active checkpoint |

Additive modifiers stack by addition. Multipliers stack by exponentiation (`1.2` with three stacks becomes `1.2^3`). Grants at the stack cap return false; successful timed grants refresh the duration. Expiry/removal reverses the source rather than trying to undo floating-point arithmetic. Restoration validates all IDs, durations, and stack counts before replacing active effects.

For another effect type, register a handler in `effects/effect-registry.js` with `validate`, `apply`, and `remove`. It receives `{ stats, sourceId, stacks }`. The current context supports reversible stat changes. Effects needing damage, summons, or other services should extend that context explicitly and add lifecycle/save tests instead of reaching into global scene state.

## Content and save compatibility

- IDs are persistent keys. Rename display names and files freely, but keep existing IDs stable. In particular, the Chaser save ID remains `stationary`.
- New optional effect fields keep save schema version 1 compatible with existing profiles/checkpoints. Missing effects default to none; legacy weapon upgrade migration is preserved. Runtime objects and computed stats are not stored.
- Permanent effects persist through validated profile transactions. Checkpoints store effect IDs, stack counts, and remaining timers; effective stats are reconstructed before restoring health. The current profile is authoritative for permanent effects, so an older checkpoint cannot roll permanent progression back.
- Import checks content references before replacement. Invalid/unsupported saves are not silently overwritten. Removing an ID used by saved progress requires an explicit migration or a deliberate recovery policy.
- For a breaking save shape change, increment the save payload version and implement migrations in `src/storage/save-schema.js` before validation. Keep an old-format fixture and prove migration, idempotency, and rollback. Do not change IndexedDB's database version just for a payload change unless stores/indexes also change.

## Checks

```sh
npm run check:content
npm test
npm run build
python3 scripts/check-build.py
```

The offline content checker uses the same validators as startup and verifies icon files. The deployment checker follows manifests, imports, and icons at `/` and `/nimbus/`. CI runs these checks before deploying. Add tests alongside the feature (`tests/game/enemies`, `weapons`, `stats`, `effects`, or `content` as appropriate). Existing flat tests remain supported.

For CPU-only combat checks: `node tests/performance/combat-benchmark.mjs`. Those measurements exclude Phaser rendering and GPU costs; use a real browser/device for FPS verification. This refactor adds no runtime dependencies or bundler.
