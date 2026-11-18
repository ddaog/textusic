// Display sensitivity only: this never changes the audio signal or analyser.
// Fixed gain preserves relative loudness; soft compression contains large peaks.
export const WAVEFORM_DISPLAY_GAIN = 3;

export class WaveformDisplay {
  constructor() {
    this.values = new Float32Array(512);
    this.lastTime = null;
  }

  reset() {
    this.values.fill(0);
    this.lastTime = null;
    return this.values;
  }

  sample(wave, now, reducedMotion = false) {
    if (!wave?.length) return this.reset();
    let silent = true;
    for (let i = 0; i < wave.length; i++) {
      if (wave[i] !== 128) { silent = false; break; }
    }
    // A stopped/silent analyser produces a flat line immediately, never a ghost
    // oscillation or normalized microphone noise.
    if (silent) return this.reset();

    const time = Number.isFinite(now) ? now : (this.lastTime ?? 0) + 16;
    const elapsed = this.lastTime === null ? Infinity : Math.max(0,Math.min(100,time-this.lastTime));
    const blend = reducedMotion || this.lastTime === null || time < this.lastTime
      ? 1 : 1-Math.exp(-elapsed/24);
    this.lastTime = time;
    const stride = (wave.length-1)/(this.values.length-1);
    for (let i = 0; i < this.values.length; i++) {
      const position = i*stride, left = Math.floor(position), fraction = position-left;
      const value = wave[left] + ((wave[Math.min(left+1,wave.length-1)] ?? 128)-wave[left])*fraction;
      const target = Math.tanh((value-128)/128*WAVEFORM_DISPLAY_GAIN);
      this.values[i] += (target-this.values[i])*blend;
    }
    return this.values;
  }
}
