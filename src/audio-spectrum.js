// One passive output tap. It never connects back to speakers or recording.
export class AudioSpectrum {
  constructor() {
    this.levels = new Float32Array(12);
    this.lastRead = -Infinity;
  }
  connect(output) {
    if (output === this.output) return;
    this.detach();
    this.output = output;
    if (this.context !== output.context) {
      this.context = output.context;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -15;
      this.analyser.smoothingTimeConstant = 0;
      this.bins = new Uint8Array(this.analyser.frequencyBinCount);
      const limit = Math.min(16000, this.context.sampleRate / 2);
      this.edges = Array.from({length:13}, (_, i) => Math.min(this.bins.length,
        Math.max(i + 1, Math.round((45 * (limit / 45) ** (i / 12)) * 1024 / this.context.sampleRate))));
    }
    this.sync();
  }
  detach() {
    if (this.connected) {
      try { this.output.disconnect(this.analyser); } catch { /* Output may have been replaced. */ }
    }
    this.connected = false;
  }
  setActive(active) {
    this.active = active;
    this.sync();
    if (!active) { this.levels.fill(0); this.lastRead = -Infinity; }
  }
  sync() {
    if (this.active && this.output && !this.connected) {
      this.output.connect(this.analyser);
      this.connected = true;
    } else if (!this.active) this.detach();
  }
  read(now) {
    if (!this.connected || this.context.state !== 'running') { this.levels.fill(0); return this.levels; }
    if (now - this.lastRead < 1000 / 15) return this.levels;
    this.lastRead = now;
    this.analyser.getByteFrequencyData(this.bins);
    for (let i = 0; i < 12; i++) {
      let peak = 0;
      for (let bin = this.edges[i]; bin < this.edges[i + 1]; bin++) peak = Math.max(peak, this.bins[bin]);
      const target = peak / 255;
      this.levels[i] += (target - this.levels[i]) * (target > this.levels[i] ? .8 : .22);
    }
    return this.levels;
  }
}
