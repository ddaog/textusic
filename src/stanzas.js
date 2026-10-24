import { analyzeText } from './text-analyzer.js';
import { analyzeSyntax } from './syntax.js';
import { addMeaningLinks } from './meaning-links.js';
import { createArrangement, createStrudelCode } from './music-engine.js';
import { createModularPatch } from './modular-patch.js';
import { bridgeDegrees } from './tonal-transition.js';

export function splitStanzas(text) {
  const sections = [];
  let cursor = 0;
  for (const match of text.matchAll(/\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/g)) {
    if (text.slice(cursor, match.index).trim()) sections.push({ text:text.slice(cursor, match.index), start:cursor, end:match.index });
    cursor = match.index + match[0].length;
  }
  if (text.slice(cursor).trim()) sections.push({ text:text.slice(cursor), start:cursor, end:text.length });
  return sections;
}

export function stanzaPosition(cycle, count) {
  const bar = Math.floor(Math.max(0, cycle));
  return { index:count ? Math.floor(bar / 4) % count : 0, bar:bar % 4 + 1 };
}

export function transitionVoices(current, next, beat) {
  const nextArrangement = createArrangement(next.foundation, beat);
  const currentArrangement = createArrangement(current.foundation, beat);
  const modules = createModularPatch(next.foundation).modules;
  const destination = modules.length > 1 ? modules[0].pitch[0] : Number(nextArrangement.melody[0].split(' ').find(n => n !== '~') ?? 0);
  const [shared, landing] = bridgeDegrees(currentArrangement.chords.at(-1), currentArrangement.scale, nextArrangement.scale, destination);
  // Only the last beat of bar four: a two-note pickup into the next motif.
  const voices = [`n("<~ ~ ~ [~ ~ ~ [${shared} ${landing}]]>").scale("${next.analysis.root}4:${next.analysis.scale}").s("sine").attack(.025).decay(.12).sustain(0).release(.22).room(.12).gain(.028) /* BRIDGE */`];
  const drums = currentArrangement.drums;
  const calmArrival = next.foundation.axes.motion < .5 && nextArrangement.tension === 0;
  if (drums > 0) voices.push(`s("<~ ~ ~ [~ ~ ~ [white ~ ${calmArrival ? '~' : 'white'} white]]>").hpf(1800).lpf(5000).attack(.002).decay(.045).sustain(0).release(.02).gain(${(drums * (calmArrival ? .03 : .05)).toFixed(3)}) /* FILL */`);
  return voices;
}

export function createStanzaScore(text, variation, beat, semantics = {}, foundation) {
  let songAnchor;
  const sections = splitStanzas(text).map((section, index) => {
    const analysis = analyzeText(section.text, variation, semantics.meanings ?? {});
    analysis.syntax = addMeaningLinks(analyzeSyntax(section.text), semantics.similarities ?? []);
    const base = foundation?.sections[index];
    const anchor = base?.text === section.text ? base.foundation : structuredClone(analysis);
    if (!songAnchor) songAnchor = { root:anchor.root, seed:anchor.seed };
    // The first stanza owns the tonal center and motif/groove family.
    // Later stanzas retain their own emotional axes and major/minor character.
    Object.assign(anchor, songAnchor);
    Object.assign(analysis, songAnchor);
    const arrangement = createArrangement({ ...anchor, syntax:analysis.syntax }, beat);
    analysis.root = anchor.root; analysis.scale = arrangement.scale; analysis.bpm = arrangement.bpm;
    return { ...section, analysis, foundation:anchor, code:createStrudelCode(analysis, beat, { foundation:anchor }) };
  });
  const bpm = sections[0]?.analysis.bpm ?? 84;
  if (sections.length < 2) return { text, sections, bpm, code:sections[0]?.code ?? '' };
  sections.forEach((section,index) => {
    const next = sections[(index + 1) % sections.length];
    section.code = createStrudelCode(section.analysis, beat, {foundation:section.foundation, nextFoundation:next.foundation});
    const voices = transitionVoices(section, next, beat);
    section.code = section.code.slice(0,-2) + ',\n  ' + voices.join(',\n  ') + '\n)';
  });
  const code = `setcpm(${(bpm / 4).toFixed(2)})\narrange(\n` + sections.map((section, index) => {
    const pattern = section.code.slice(section.code.indexOf('\n') + 1);
    return `// STANZA ${index + 1} · 4 BARS\n[4,\n${pattern}\n]`;
  }).join(',\n') + '\n)';
  return { text, sections, bpm, code };
}
