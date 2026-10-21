export function createRunTimer(now = () => performance.now()) {
  let accumulatedMs = 0;
  let activeSince = null;
  return {
    start() {
      if (activeSince === null) activeSince = now();
    },
    pause() {
      if (activeSince === null) return;
      accumulatedMs += now() - activeSince;
      activeSince = null;
    },
    reset(durationMs = 0) {
      accumulatedMs = durationMs;
      activeSince = null;
    },
    elapsed() {
      return accumulatedMs + (activeSince === null ? 0 : now() - activeSince);
    },
  };
}

export function formatDuration(durationMs) {
  const tenths = Math.floor(durationMs / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}
