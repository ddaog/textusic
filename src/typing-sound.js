// A tiny, bounded local texture: no microphone, samples, reverb or extra context.
export class TypingSound {
  constructor() { this.voices = new Set(); this.last = -Infinity; this.text = ''; }
  connect(context, output) {
    if (this.context !== context) {
      this.stop(); this.context = context; this.last = -Infinity;
      this.buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .065), context.sampleRate);
      const data = this.buffer.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) { smooth = smooth * .72 + (Math.random() * 2 - 1) * .28; data[i] = smooth; }
    }
    this.output = output;
  }
  input(text, root = 'C', enabled = false) {
    if (text === this.text) return;
    const previous = this.text; this.text = text;
    if (!enabled || !this.context || this.context.state !== 'running' || !this.output) return;
    const now = this.context.currentTime;
    if (now - this.last < .055 || this.voices.size >= 4) return;
    // Paste/replace creates one sound, not one voice per inserted character.
    this.last = now;
    const pitches = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
    const midi = 60 + (pitches[root] ?? 0) + (text.length % 3 === 0 ? 7 : 0);
    const gain = this.context.createGain();
    const noise = this.context.createBufferSource(); noise.buffer = this.buffer;
    const tone = this.context.createOscillator(); tone.type = 'sine';
    tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    const toneGain = this.context.createGain(); toneGain.gain.value = .12;
    noise.connect(gain); tone.connect(toneGain); toneGain.connect(gain); gain.connect(this.output);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(text.length < previous.length ? .035 : .055, now + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .075);
    const voice = { noise, tone, gain, toneGain }; this.voices.add(voice);
    tone.onended = () => { for (const node of Object.values(voice)) node.disconnect(); this.voices.delete(voice); };
    noise.start(now); tone.start(now); tone.stop(now + .08);
  }
  stop() {
    for (const voice of this.voices) {
      try { voice.noise.stop(); voice.tone.stop(); } catch { /* Already ended. */ }
      for (const node of Object.values(voice)) node.disconnect();
    }
    this.voices.clear();
  }
}
