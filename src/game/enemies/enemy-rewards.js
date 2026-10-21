export function validateXpReward(reward) {
  if (!reward || !Number.isSafeInteger(reward.min) || !Number.isSafeInteger(reward.max)
    || reward.min < 0 || reward.max < reward.min || reward.max >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Invalid enemy XP reward range');
  }
}

/** Inclusive, uniformly distributed integer reward; range validated at load. */
export function rollXpReward(reward, random = Math.random) {
  return reward.min + Math.floor(random() * (reward.max - reward.min + 1));
}
