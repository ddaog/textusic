import { createRhythm } from './rhythm.js';
import { ambientHarmony } from './ambient-harmony.js';
import { degreeSemitone } from './tonal-transition.js';
import { CHORD_PROGRESSIONS, MELODY_CONTOURS } from './music-materials.js';
import { phraseMelody } from './melody-rhythm.js';
import { wordOrderSyncopation } from './word-order-rhythm.js';
import { configurePlaybackSession } from './audio-session.js';
import { blendPatterns, transitionWindow } from './semantic-transition.js';
import { createModularPatch, compileModularVoices, patchDescriptions } from './modular-patch.js';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ramp = (value) => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };

// All voices share this four-bar harmony; adding words keeps the motif and key.
export function createArrangement(analysis, beat = {}) {
  const count = analysis.tokens.length;
  const richness = ramp((count - 1) / 10);
  const anchor = analysis.tokenMeanings[0]?.conceptIds ?? [];
  const fearCount = analysis.tokenMeanings.filter((word) => word.conceptIds.some((id) => ['fear', 'anger'].includes(id))).length;
  const sadnessCount = analysis.tokenMeanings.filter((word) => word.conceptIds.includes('sadness')).length;
  const tension = fearCount ? clamp(.45 + fearCount * .12 + analysis.axes.tension * .25, 0, 1) : 0;
  const minor = fearCount > 0 || sadnessCount > 0 || anchor.some((id) => ['moon', 'darkness', 'dream', 'sadness', 'fear'].includes(id));
  const scale = minor ? 'minor' : 'major';
  const seed = analysis.seed >>> 0;
  const chords = tension ? [0, 1, 5, 4] : CHORD_PROGRESSIONS[(seed >>> 8) % CHORD_PROGRESSIONS.length];
  const contour = MELODY_CONTOURS[(seed >>> 12) % MELODY_CONTOURS.length];
  const rotation = analysis.seed % 3;
  const modifiers = analysis.syntax?.edges?.filter((edge) => edge.type === 'modifier').length ?? 0;
  const relationships = analysis.syntax?.edges ?? [];
  const relationEnergy = clamp(relationships.length / Math.max(1, count * 2), 0, 1);
  const responseEdges = relationships.filter((edge) => ['repetition', 'semantic', 'shared-subject'].includes(edge.type)).slice(0, 4);
  const relationMelody = chords.map((root) => {
    const notes = Array(16).fill('~');
    responseEdges.forEach((edge, i) => {
      notes[i * 4] = String(root + contour[edge.from % contour.length]);
      notes[i * 4 + 2] = String(root + contour[edge.to % contour.length]);
    });
    return notes.join(' ');
  });
  const active = count < 3 ? [0, 4] : count < 6 ? [0, 2, 4, 6] : [0, 1, 2, 4, 5, 6];
  const melody = chords.map((root, bar) => contour.map((_, step) => {
    if (!active.includes(step)) return '~';
    if (analysis.punctuation > 1 && step === 6) return '~';
    const tone = bar === 3 && step === 6 ? 0 : contour[(step + rotation * 2 + (bar % 2 ? 2 : 0)) % contour.length];
    return String(root + tone);
  }).join(' '));
  const mode = beat.mode ?? 'auto';
  const intensity = clamp(beat.intensity ?? 0.55, 0, 1);
  const drums = mode === 'off' ? 0 : intensity * (mode === 'on' ? 1 : ramp((count - 2) / 8));
  return {
    scale, chords, melody, richness, drums, tension,
    relationMelody, relationGain: responseEdges.length ? .025 : 0,
    rhythm: createRhythm(analysis, clamp(richness + relationEnergy * .25, 0, 1), tension),
    bpm: Math.round(clamp(76 + analysis.axes.motion * 30, 76, 108) / 2) * 2,
    padGain: 0.012 + richness * 0.06,
    bassGain: 0.02 + richness * 0.15,
    melodyGain: 0.13 + richness * 0.05,
    sparkleGain: richness * (0.012 + Math.min(modifiers, 4) * 0.004),
  };
}

export function createStrudelCode(analysis, beat = {}, { foundation, nextFoundation } = {}) {
  const arrangement = createArrangement(foundation ? { ...foundation, syntax: analysis.syntax } : analysis, beat);
  const { chords, melody, richness, drums } = arrangement;
  const phrasedMelody = phraseMelody(melody, (foundation ?? analysis).seed, wordOrderSyncopation(foundation ?? analysis));
  const { tension, rhythm } = arrangement;
  const root = foundation?.root ?? analysis.root;
  const scale = root + '4:' + arrangement.scale;
  const bassScale = root + '2:' + arrangement.scale;
  const padScale = root + '3:' + arrangement.scale;
  const alternate = (bars) => '<' + bars.map((bar) => '[' + bar + ']').join(' ') + '>';
  const cutoff = Math.round(850 + analysis.axes.light * 1500);
  const room = ((0.24 + analysis.axes.space * 0.28) * (1 - tension * .55)).toFixed(2);
  const attack = ((0.025 + analysis.axes.softness * 0.09) * (1 - tension * .8)).toFixed(3);
  const gain = (value) => value.toFixed(3);
  let boundary;
  if (nextFoundation) {
    const next = createArrangement(nextFoundation, beat);
    const opening = ambientHarmony(next.chords, nextFoundation.seed, next.tension).voicings[0];
    boundary = {mode:arrangement.scale, target:opening.map(n=>degreeSemitone(n,next.scale))};
  }
  const ambient = ambientHarmony(chords, (foundation ?? analysis).seed, tension, boundary);
  const chordPattern = '<' + ambient.voicings.map(notes => '[' + notes.join(',') + ']').join(' ') + '>';
  const padCutoff = `sine.slow(${ambient.breath}).range(${Math.round(550 + analysis.axes.light * 350)},${Math.round(1000 + analysis.axes.light * 850)})`;
  const bass = alternate(chords.map((root) => root + ' ~ ~ ~ ' + root + ' ~ ' + (richness > 0.65 ? root + 4 : '~') + ' ~'));
  const parts = [
    'n("' + alternate(phrasedMelody) + '").scale("' + scale + '").s("' + (tension ? 'sawtooth' : 'triangle') + '").lpf(' + Math.round(cutoff + tension * 900) + ').attack(' + attack + ').decay(.22).sustain(.12).release(' + (tension ? '.14' : '.35') + ').room(' + room + ').delay(.12).delaytime(.375).delayfeedback(.22).gain(' + gain(arrangement.melodyGain * (1 - tension * .3)) + ')',
    'n("' + chordPattern + '").scale("' + padScale + '").s("triangle").hpf(180).lpf(' + padCutoff + ').attack(.65).decay(.5).sustain(.45).release(.8).room(' + room + ').pan(sine.slow(' + (ambient.breath * 2) + ').range(.38,.62)).gain(' + gain(arrangement.padGain * .8) + ')',
    'n("' + bass + '").scale("' + bassScale + '").s("sine").lpf(430).attack(.015).decay(.24).sustain(.1).release(.12).gain(' + gain(arrangement.bassGain) + ')',
    'n("' + alternate(chords.map((root) => '~ ~ ' + (root + 11) + ' ~ ~ ~ ' + (root + 9) + ' ~')) + '").scale("' + scale + '").s("sine").attack(.01).decay(.1).sustain(0).release(.18).room(.4).gain(' + gain(arrangement.sparkleGain) + ')',
  ];
  // The visible layers correspond to voices that are actually present.
  if (analysis.tokens.length < 6) parts.splice(3, 1);
  if (analysis.tokens.length < 3) parts.splice(2, 1);
  if (analysis.tokens.length < 2) parts.splice(1, 1);
  const patch = createModularPatch(analysis);
  if (foundation) {
    const original = createModularPatch(foundation);
    patch.modules.forEach((module, index) => {
      const base = original.modules[index];
      if (base) { module.gate = base.gate; module.pitch = base.pitch; module.oscillator = base.oscillator; }
    });
    // AI can enrich filter links, but must not rewrite the playing pitch/gate sequence.
    patch.cables = [...patch.cables.filter(c => c.kind === 'cutoff'), ...original.cables.filter(c => c.kind !== 'cutoff')];
  }
  if (patch.modules.length > 1) {
    parts.splice(0, 1, ...compileModularVoices(patch, { chords, root, scale:arrangement.scale }));
  }
  if (arrangement.relationGain) {
    parts.push('n("' + alternate(arrangement.relationMelody) + '").scale("' + scale + '").s("sine").pan(.65).attack(.015).decay(.12).sustain(0).release(.2).gain(' + gain(arrangement.relationGain) + ')');
  }
  if (drums > 0) {
    parts.push(
      'note("' + alternate(rhythm.kick) + '").s("sine").penv(28).pdecay(.045).attack(.002).decay(.14).sustain(0).release(.035).gain(' + gain(drums * .34) + ')',
      's("' + alternate(rhythm.snare) + '").hpf(1300).lpf(6500).attack(.002).decay(.095).sustain(0).release(.025).room(.08).gain(' + gain(drums * .095) + ')',
      's("' + alternate(rhythm.hat) + '").hpf(7200).attack(.001).decay(.025).sustain(0).release(.015).gain("' + alternate(rhythm.accents.map((bar) => bar.split(' ').map((value) => gain(Number(value) * drums * .045)).join(' '))) + '")',
    );
  }
  return 'setcpm(' + (arrangement.bpm / 4).toFixed(2) + ')\n' + patchDescriptions(patch).map((line) => '// PATCH ' + line).join('\n') + '\nstack(\n  ' + parts.join(',\n  ') + '\n)';
}

export class MusicEngine {
  constructor(loadModule = () => import('@strudel/web')) {
    this.ready = false;
    this.initializing = null;
    this.playing = false;
    this.revision = 0;
    this.loadModule = loadModule;
    this.module = null;
    this.repl = null;
  }

  async init() {
    if (this.ready) return;
    if (!this.initializing) {
      // Load only inside the handled playback request, and allow a failed
      // network/initialization attempt to be retried without reloading the page.
      this.module = Promise.resolve().then(() => this.loadModule());
      this.initializing = this.module
        .then((module) => {
          this.audioModule = module;
          return module.initStrudel({ editPattern: (pattern) => {
            if (!this.semanticUpdate || !this.playing || !this.repl.scheduler.started) return pattern;
            const window = transitionWindow(this.repl.scheduler);
            this.transitionEnd = window.end;
            return blendPatterns(module.Pattern, this.repl.scheduler.pattern, pattern, window);
          } });
        })
        .then((repl) => {
          this.repl = repl;
          this.ready = true;
        }).catch((error) => {
          this.initializing = null;
          this.module = null;
          throw error;
        });
    }
    await this.initializing;
  }

  async play(code, { semantic = false, score, beforeStart } = {}) {
    configurePlaybackSession();
    const revision = ++this.revision;
    await this.init();
    if (revision !== this.revision) return;
    const context = this.audioModule.getAudioContext?.();
    if (context && context.state !== 'running') await context.resume();
    if (revision !== this.revision) return;
    if (this.playing && code === this.lastCode) { this.score = score; return; }
    // Global hush is replaced by Strudel's evaluation scope with a pattern
    // reset helper. Keep the actual REPL transport instead of using globals.
    this.semanticUpdate = semantic;
    // An AI update never changes the transport tempo or resets the clock.
    const source = semantic && this.playing ? code.replace(/^setcpm\([^\n]+\)\n/, '') : code;
    await this.repl.evaluate(source, false);
    if (this.onOutput) this.onOutput(this.audioModule.getSuperdoughAudioController().output.destinationGain);
    if (revision !== this.revision) return;
    if (this.repl.state?.evalError) throw this.repl.state.evalError;
    this.score = score;
    if (!this.repl.scheduler.started) {
      await beforeStart?.();
      if (revision !== this.revision) return;
      await this.repl.start();
    }
    if (revision !== this.revision) { this.repl.stop(); return; }
    this.playing = true;
    this.lastCode = code;
    this.score = score;
  }

  stop() {
    this.revision += 1;
    this.repl?.stop();
    this.playing = false;
  }
}
