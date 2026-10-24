export function transitionWindow(scheduler, bars = 4) {
  // Stay ahead of events the audio scheduler has already queued.
  const start = Math.ceil(Math.max(scheduler.now(), scheduler.lastEnd ?? 0) + .15);
  return { start, end: start + bars };
}

export function transitionProgress(time, start, end) {
  const x = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return x * x * (3 - 2 * x);
}

export function blendPatterns(Pattern, previous, next, { start, end }) {
  let old = previous;
  return new Pattern((state) => {
    if (Number(state.span.begin) >= end) { old = null; return next.query(state); }
    if (Number(state.span.end) <= start && old) return old.query(state);
    const weight = (pattern, incoming) => pattern.query(state).flatMap((hap) => {
      const time = Number((hap.whole ?? hap.part).begin);
      const progress = transitionProgress(time, start, end);
      const amount = incoming ? progress : 1 - progress;
      if (amount <= 0) return [];
      return [hap.withValue(value => ({ ...value, gain: (value.gain ?? 1) * amount }))];
    });
    return [...(old ? weight(old, false) : []), ...weight(next, true)];
  });
}
