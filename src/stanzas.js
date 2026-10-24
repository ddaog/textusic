import { analyzeText } from './text-analyzer.js';
import { analyzeSyntax } from './syntax.js';
import { addMeaningLinks } from './meaning-links.js';
import { createArrangement, createStrudelCode } from './music-engine.js';

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
  const destination = Number(nextArrangement.melody[0].split(' ').find(n => n !== '~') ?? 0);
  // Only the last beat of bar four: a two-note pickup into the next motif.
  const voices = [`n("<~ ~ ~ [~ ~ ~ [${destination - 2} ${destination - 1}]]>").scale("${next.analysis.root}4:${next.analysis.scale}").s("sine").attack(.008).decay(.08).sustain(0).release(.1).room(.12).gain(.032) /* BRIDGE */`];
  const drums = createArrangement(current.foundation, beat).drums;
  if (drums > 0) voices.push(`s("<~ ~ ~ [~ ~ ~ [white ~ white white]]>").hpf(1800).lpf(5000).attack(.002).decay(.045).sustain(0).release(.02).gain(${(drums * .055).toFixed(3)}) /* FILL */`);
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
    const voices = transitionVoices(section, sections[(index + 1) % sections.length], beat);
    section.code = section.code.slice(0,-2) + ',\n  ' + voices.join(',\n  ') + '\n)';
  });
  const code = `setcpm(${(bpm / 4).toFixed(2)})\narrange(\n` + sections.map((section, index) => {
    const pattern = section.code.slice(section.code.indexOf('\n') + 1);
    return `// STANZA ${index + 1} · 4 BARS\n[4,\n${pattern}\n]`;
  }).join(',\n') + '\n)';
  return { text, sections, bpm, code };
}
