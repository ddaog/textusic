import { degreeSemitone } from './tonal-transition.js';

const ROOTS = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
export function typingAccent({ cycle, bpm = 84, playing = false } = {}) {
  if (!playing || !Number.isFinite(cycle)) return 0;
  const beat = cycle * 4;
  const distance = Math.abs(beat - Math.round(beat)) * 60 / Math.max(30, bpm);
  const proximity = Math.max(0, 1 - distance / .07);
  return proximity * proximity;
}
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
    // Every changed input sounds immediately; retire old tails, never drop new keys.
    if (this.voices.size >= 6) {
      if (this.retiring) this.dispose(this.retiring);
      const oldest = this.voices.values().next().value;
      this.voices.delete(oldest); this.retiring = oldest;
      const envelope = oldest.gain.gain;
      if (envelope.cancelAndHoldAtTime) envelope.cancelAndHoldAtTime(now);
      else { envelope.cancelScheduledValues(now); envelope.setValueAtTime(.001, now); }
      envelope.linearRampToValueAtTime(0, now + .008);
      oldest.tone.stop(now + .009); oldest.overtone.stop(now + .009);
    }
    const accent = typingAccent(harmony);
    const phraseStart = now - this.last > 1.2;
    const midi = typingNote(harmony, phraseStart ? undefined : this.previousNote, phraseStart ? 0 : this.step);
    this.last = now; this.previousNote = midi; this.step = phraseStart ? 1 : this.step + 1;
    const softness = Math.max(0, Math.min(1, harmony.softness ?? .6));
    const duration = .09 + softness * .045 + accent * .16;
    const gain = this.context.createGain();
    const tone = this.context.createOscillator(); tone.type = 'sine';
    const overtone = this.context.createOscillator(); overtone.type = 'sine';
    tone.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    overtone.frequency.value = tone.frequency.value * 2;
    const toneGain = this.context.createGain(); toneGain.gain.value = .06 + (1 - softness) * .08 + accent * .12;
    tone.connect(gain); overtone.connect(toneGain); toneGain.connect(gain); gain.connect(this.output);
    const level = (.012 + accent * .024) * (text.length < previousText.length ? .7 : 1) / Math.sqrt(1 + this.voices.size * .3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + .012 + softness * .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    const voice = { tone, overtone, gain, toneGain }; this.voices.add(voice);
    tone.onended = () => { for (const node of Object.values(voice)) node.disconnect(); this.voices.delete(voice); if (this.retiring === voice) this.retiring = null; };
    tone.start(now); overtone.start(now);
    tone.stop(now + duration + .01); overtone.stop(now + duration + .01);
  }
  stop() {
    for (const voice of this.voices) this.dispose(voice);
    if (this.retiring) this.dispose(this.retiring);
    this.retiring = null;
    this.voices.clear(); this.previousNote = undefined; this.step = 0;
  }
  dispose(voice) {
    voice.tone.onended = null;
    try { voice.tone.stop(); voice.overtone.stop(); } catch { /* Already ended. */ }
    for (const node of Object.values(voice)) node.disconnect();
  }
}
