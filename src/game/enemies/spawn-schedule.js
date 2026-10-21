export function validateSpawnPhases(phases) {
  if (!Array.isArray(phases) || !phases.length || phases[0]?.startMs !== 0) throw new Error('Spawn phases must start at zero');
  let previous=-1;
  for (const phase of phases) {
    if (!Number.isSafeInteger(phase.startMs) || phase.startMs<=previous
      || !Number.isSafeInteger(phase.minCount) || phase.minCount<1
      || !Number.isSafeInteger(phase.maxCount) || phase.maxCount<phase.minCount || phase.maxCount>1000) throw new Error('Invalid enemy spawn phase');
    previous=phase.startMs;
  }
}

export function spawnWaveSize(phases, runElapsedMs, random = Math.random) {
  let phase=phases[0];
  for (const candidate of phases) {
    if(candidate.startMs>runElapsedMs)break;
    phase=candidate;
  }
  return phase.minCount+Math.floor(random()*(phase.maxCount-phase.minCount+1));
}
