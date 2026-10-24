const SCALES = {major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10]};
export function degreeSemitone(degree, mode) {
  return Math.floor(degree / 7) * 12 + SCALES[mode][((degree % 7) + 7) % 7];
}
// Both stanzas retain the same tonic. Find an outgoing chord tone that is
// also in the next mode, close to its opening motif, then preview that motif.
export function bridgeDegrees(chord, currentMode, nextMode, destination) {
  const pitchClasses = [0,2,4].map(n => ((degreeSemitone(chord+n,currentMode)%12)+12)%12);
  const candidates = Array.from({length:22},(_,i)=>i-7).filter(n=>pitchClasses.includes(((degreeSemitone(n,nextMode)%12)+12)%12));
  candidates.sort((a,b)=>Math.abs(degreeSemitone(a,nextMode)-degreeSemitone(destination,nextMode))-Math.abs(degreeSemitone(b,nextMode)-degreeSemitone(destination,nextMode)));
  return [candidates[0] ?? destination, destination];
}
