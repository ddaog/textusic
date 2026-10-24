// Each bracket is one beat. Relative weights create long/short notes and
// off-beat answers without moving the four-beat bar or changing its pitches.
export function phraseMelody(bars, seed, syncopation = .1) {
  const family = (seed >>> 5) % 4;
  return bars.map((bar, index) => {
    const notes = bar.split(' ');
    return Array.from({ length:4 }, (_, beat) => {
      const a = notes[beat * 2], b = notes[beat * 2 + 1];
      const type = (family + beat + (index % 2)) % 4;
      const displaced = ((seed + index * 7 + beat * 3) >>> 0) % 10 < syncopation * 10;
      if (!displaced) {
        if (index === 3 && beat === 3) return `[${a}@2 ~@2]`;
        // Alternate sustained calls, short answers and breathing spaces without
        // adding subdivisions or moving the downbeat.
        if (b === '~') return type === 2 && index % 2 ? `[${a}@2 ~@2]` : `[${a}@4]`;
        if (type === 0 && beat === 0 && index % 2 === 0) return `[${a}@4]`;
        if (type === 2 && index % 2) return `[${a}@2 ~ ${b}]`;
        return `[${a}@2 ${b}@2]`;
      }
      if (index === 3 && beat === 3) return `[${a}@3 ~]`;
      if (type === 0) return `[${a}@3 ${b}]`;
      if (type === 1) return `[~ ${a} ${b}@2]`;
      if (type === 2) return `[${a} ${b}@3]`;
      return `[${a} ${b} ${a} ~]`;
    }).join(' ');
  });
}
