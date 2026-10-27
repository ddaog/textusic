import { degreeSemitone } from './tonal-transition.js';

const ROOTS = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
export function typingNote({ root = 'C', scale = 'major', chord = 0 } = {}, previous, step = 0) {
  const mode = scale === 'minor' ? 'minor' : 'major';
  const tones = [0, 2, 4].map(n => ((ROOTS[root] ?? 0) + degreeSemitone(chord + n, mode)) % 12);
  const candidates = Array.from({ length: 25 }, (_, i) => 60 + i).filter(n => tones.includes(n % 12));
  const target = previous == null ? 72 : previous + [0, 2, 2, -2, -2, 0][step % 6];
  return candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
}

// A quiet chord-tone response: two sine partials, no noise or extra effects bus.
export class TypingSound {
  constructor() { this.voices = new Set(); this.last = -Infinity; this.text = ''; this.step = 0; }
  connect(context, output) {
    if (this.context !== context) {
      this.stop(); this.context = context; this.last = -Infinity;
    }
    this.output = output;
  }
  input(text, harmony = {}, enabled = false) {
    if (text === this.text) return;
    const previousText = this.text; this.text = text;
    if (!enabled || !this.context || this.context.state !== 'running' || !this.output) return;
    if (typeof harmony === 'string') harmony = { root: harmony };
    const now = this.context.currentTime;
    const spacing = Math.max(.095, 15 / (harmony.bpm || 84));
    if (now - this.last < spacing || this.voices.size >= 4) return;
    const phraseStart = now - this.last > 1.2;
    const midi = typingNote(harmony, phraseStart ? undefined : this.previousNote, phraseStart ? 0 : this.step);
    this.last = now; this.previousNote = midi; this.step = phraseStart ? 1 : this.step + 1;
    const softness = Math.max(0, Math.min(1, harmony.softness ?? .6));
    const duration = .24 + softness * .22;
    const gain = this.context.createGain();
    const tone = this.context.createOscillator(); tone.type = 'sine';
    const overtone = this.context.createOscillator(); overtone.type = 'sine';
    tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    overtone.frequency.value = tone.frequency.value * 2;
    const toneGain = this.context.createGain(); toneGain.gain.value = .08 + (1 - softness) * .12;
    tone.connect(gain); overtone.connect(toneGain); toneGain.connect(gain); gain.connect(this.output);
    const level = (text.length < previousText.length ? .022 : .035) / Math.sqrt(1 + this.voices.size);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + .012 + softness * .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    const voice = { tone, overtone, gain, toneGain }; this.voices.add(voice);
    tone.onended = () => { for (const node of Object.values(voice)) node.disconnect(); this.voices.delete(voice); };
    tone.start(now); overtone.start(now);
    tone.stop(now + duration + .01); overtone.stop(now + duration + .01);
  }
  stop() {
    for (const voice of this.voices) {
      try { voice.tone.stop(); voice.overtone.stop(); } catch { /* Already ended. */ }
      for (const node of Object.values(voice)) node.disconnect();
    }
    this.voices.clear(); this.previousNote = undefined; this.step = 0;
  }
}
