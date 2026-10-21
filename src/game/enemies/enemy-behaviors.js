import { chasePlayer } from './behaviors/chase-player.js';
export { chasePlayer };
export const ENEMY_BEHAVIORS = Object.freeze({
  stationary() {},
  'chase-player': chasePlayer,
});
