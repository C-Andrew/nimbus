import { PlayerInput } from '../player/player-input.js';
import { GameHud } from '../hud/game-hud.js';
import Phaser from '/node_modules/phaser/dist/phaser.esm.js';
import { GameState } from '../run/run-state.js';
import { WeaponSystem } from '../weapons/weapon-system.js';
import { EnemySpawner } from '../enemies/enemy-spawner.js';
import { RunProgression } from '../run/run-progression.js';
import { PlayerHealth } from '../player/player-health.js';

const colorValue = hex => Number.parseInt(hex.slice(1), 16);

export function createPlayScene({ playerConfig, weaponCatalog, enemyCatalog }, onReady) {
  const playerStats = playerConfig.stats;
  const playerAppearance = playerConfig.appearance;
  const readySpawnConfig = enemyCatalog.readySpawn;
  class PlayScene extends Phaser.Scene {
    constructor() { super('prototype'); }
    preload() {
      for (const weapon of weaponCatalog.weapons) {
        if (weapon.icon) this.load.svg(`weapon-icon-${weapon.id}`, weapon.icon, { width: 32, height: 32 });
      }
    }
    create() {
      this.registry.set('state', GameState.READY);
      const gridTexture = this.make.graphics({ x: 0, y: 0, add: false });
      gridTexture.lineStyle(1, 0x24313a, 0.6);
      gridTexture.lineBetween(0, 0, 48, 0);
      gridTexture.lineBetween(0, 0, 0, 48);
      gridTexture.generateTexture('world-grid', 48, 48);
      gridTexture.destroy();
      this.grid = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'world-grid')
      .setOrigin(0).setScrollFactor(0).setDepth(-2);
      this.player = this.add.circle(playerConfig.initialPosition.x, playerConfig.initialPosition.y, playerStats.collisionRadiusPixels, colorValue(playerAppearance.color));
      this.player.setStrokeStyle(playerAppearance.strokeWidthPixels, colorValue(playerAppearance.strokeColor));
      this.pendingLevelUps = 0;
      this.upgradeWeaponId = null;
      this.health = new PlayerHealth(playerStats);
      this.facing = { ...playerConfig.initialFacing };
      this.facingMarker = this.add.triangle(0, 0, 0, 10, 16, 0, 16, 20, colorValue(playerAppearance.facingMarkerColor)).setDepth(2);
      this.enemies = new EnemySpawner(this, this.player, enemyCatalog, xp => this.awardXp(xp));
      this.weapons = new WeaponSystem(this, this.player, weaponCatalog);
      this.playerInput = new PlayerInput(this, playerConfig);
      this.hud = new GameHud(this, playerConfig);
      this.progression = new RunProgression(playerConfig.progression.xpPerLevel, value => this.renderProgression(value));
      this.renderHealth();
      this.drawGrid();
      this.spawnReadyTarget();
      this.scale.on('resize', this.drawGrid, this);
      this.game.events.on('blur', this.clearInput, this);
      onReady?.();
      this.events.once('shutdown', () => {
        this.game.events.off('blur', this.clearInput, this);
        this.scale.off('resize', this.drawGrid, this);
      });
    }
    snapshot() {
      return { pendingLevelUps:this.pendingLevelUps, upgradeWeaponId:this.upgradeWeaponId, progression: this.progression.snapshot(), player: {x:this.player.x,y:this.player.y,health:this.health.snapshot()}, facing:{...this.facing},
        weapons:this.weapons.weapons.map(w=>({id:w.definition.id,elapsedMs:w.elapsedMs,upgrades:{...w.tiers}})),
        enemies:this.enemies.snapshot(),spawnElapsedMs:this.enemies.elapsedMs,spawnRunElapsedMs:this.enemies.runElapsedMs };
    }
    restoreRun(checkpoint) {
      this.resetRun();
      const s = checkpoint.scene;
      this.player.setPosition(s.player.x, s.player.y);
      this.progression.restore(s.progression);
      this.health.restore(s.player.health);
      this.renderHealth();
      this.facing = {...s.facing};
      this.weapons.weapons = [];
      for (const saved of s.weapons) {
        if(!this.weapons.equip(saved.id, saved.upgrades)) throw new Error(`Unknown saved weapon: ${saved.id}`);
        this.weapons.weapons.at(-1).elapsedMs = saved.elapsedMs;
      }
      this.pendingLevelUps = s.pendingLevelUps ?? 0;
      this.upgradeWeaponId = s.upgradeWeaponId ?? null;
      if (this.upgradeWeaponId && !this.weapons.weapons.some(w=>w.definition.id===this.upgradeWeaponId)) throw new Error('Saved upgrade weapon is not equipped');
      this.enemies.restore(s.enemies);
      this.enemies.kills = checkpoint.kills;
      this.enemies.elapsedMs = s.spawnElapsedMs % enemyCatalog.spawner.intervalMs;
      this.enemies.runElapsedMs = s.spawnRunElapsedMs ?? checkpoint.durationMs;
      this.drawGrid();
    }
    resetRun() {
      this.clearInput();
      this.player.setPosition(playerConfig.initialPosition.x, playerConfig.initialPosition.y);
      this.hud.reset();
      this.facing = { ...playerConfig.initialFacing };
      this.pendingLevelUps = 0;
      this.upgradeWeaponId = null;
      this.progression.reset();
      this.health.reset();
      this.renderHealth();
      this.player.setAlpha(1);
      this.weapons.reset();
      this.enemies.reset();
      this.spawnReadyTarget();
      this.syncCamera();
    }
    spawnReadyTarget() {
      this.enemies.reset();
      this.enemies.spawn(readySpawnConfig.enemyTypeId, {
        x: this.player.x + readySpawnConfig.offsetXPixels,
        y: this.player.y + readySpawnConfig.offsetYPixels,
      });
    }
    startProgression() {
      this.enemies.reset();
      this.weapons.reset();
      this.pendingLevelUps = 0;
      this.upgradeWeaponId = null;
      this.progression.reset();
    }
    awardXp(amount) {
      if (this.registry.get('state') !== GameState.IN_GAME) return 0;
      const levelsGained = this.progression.addXp(amount);
      if (levelsGained > 0) {
        this.pendingLevelUps += levelsGained;
        this.game.events.emit('level-up');
      }
      return levelsGained;
    }
    renderProgression(value) { this.hud.renderProgression(value); }
    syncCamera() {
      this.cameras.main.centerOn(this.player.x, this.player.y);
      this.grid.tilePositionX = this.player.x - this.scale.width / 2;
      this.grid.tilePositionY = this.player.y - this.scale.height / 2;
    }
    renderHealth() { this.hud.renderHealth(); }
    clearInput() { this.playerInput.clear(); }
    drawGrid() {
      const { width, height } = this.scale;
      this.grid.setSize(width, height);
      this.syncCamera();
      this.hud.resize();
    }
    update(time, delta) {
      const state = this.registry.get('state');
      const inGame = state === GameState.IN_GAME;
      const controllable = inGame || state === GameState.READY;
      this.playerInput.update(delta, controllable);
      this.syncCamera();
      this.facingMarker.setPosition(this.player.x + this.facing.x * playerAppearance.facingMarkerOffsetPixels, this.player.y + this.facing.y * playerAppearance.facingMarkerOffsetPixels);
      this.facingMarker.setRotation(Math.atan2(this.facing.y, this.facing.x) + Math.PI);
      if (state === GameState.READY) {
        this.enemies.updateStatuses(Math.min(delta, 50));
        this.weapons.update(Math.min(delta, 50), this.facing, this.enemies);
      }
      if (inGame) {
        const stepMs = Math.min(delta, 50);
        this.health.advance(stepMs);
        this.enemies.update(stepMs);
        if (this.registry.get('state') !== GameState.IN_GAME) return;
        this.weapons.update(stepMs, this.facing, this.enemies);
        if (this.registry.get('state') !== GameState.IN_GAME) return;
        if (this.health.takeDamage(this.enemies.contactDamage(this.player.radius))) {
          this.renderHealth();
          if (this.health.hp === 0) {
            this.clearInput();
            this.game.events.emit('player-defeated');
            return;
          }
        }
        this.player.setAlpha(this.health.invulnerabilityMs > 0 ? playerAppearance.invulnerableAlpha : 1);
      }
      this.hud.update(time, controllable);
    }
  }
  return PlayScene;
}
