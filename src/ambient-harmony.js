// Scale degrees, not semitones: preserve the stanza's existing major/minor mode.
const COLORS = [[0,2,4,6], [0,2,4,8], [0,1,4,8], [0,2,6,8]];
const motion = (a,b) => a.reduce((sum,n,i)=>sum+Math.abs(n-b[i]),0);

export function ambientHarmony(chords, seed, tension = 0) {
  const color = tension > 0 ? 0 : (seed >>> 5) % COLORS.length;
  const shape = COLORS[color];
  const first = shape.map(n => n + chords[0]);
  const voicings = [first];
  for (let bar=1;bar<chords.length;bar++) {
    const candidates=[];
    for (let inversion=0;inversion<4;inversion++) {
      const notes=shape.map((n,i)=>n+chords[bar]+(i<inversion?7:0)).sort((a,b)=>a-b);
      for (const shift of [-14,-7,0,7]) {
        const candidate=notes.map(n=>n+shift);
        if (candidate[0]>=-3 && candidate[3]<=16) candidates.push(candidate);
      }
    }
    const previous=voicings.at(-1);
    const cost=notes=>motion(previous,notes)+(bar===chords.length-1?motion(notes,first)*.5:0);
    candidates.sort((a,b)=>cost(a)-cost(b));
    voicings.push(candidates[0]);
  }
  return { color, voicings, breath: [8,12,16][(seed >>> 10)%3] };
}
