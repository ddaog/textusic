// Each bracket is one beat. Relative weights create long/short notes and
// off-beat answers without moving the four-beat bar or changing its pitches.
export function phraseMelody(bars, seed) {
  const family = (seed >>> 5) % 4;
  return bars.map((bar, index) => {
    const notes = bar.split(' ');
    return Array.from({ length:4 }, (_, beat) => {
      const a = notes[beat * 2], b = notes[beat * 2 + 1];
      const type = (family + beat + (index % 2)) % 4;
      if (index === 3 && beat === 3) return `[${a}@3 ~]`;
      if (type === 0) return `[${a}@3 ${b}]`;
      if (type === 1) return `[~ ${a} ${b}@2]`;
      if (type === 2) return `[${a} ${b}@3]`;
      return `[${a} ${b} ${a} ~]`;
    }).join(' ');
  });
}
