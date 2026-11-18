import { splitStanzas, stanzaPosition } from './stanzas.js';

// Cache provenance-to-editor mapping when a score or the text changes, not per frame.
// While edits await compilation, never attribute an old note to a newly typed word.
export function mapWordCues(score, text, words) {
  const visible = splitStanzas(text);
  return (score?.sections ?? []).map((section, index) => {
    const matches = visible.filter(item => item.text === section.text);
    const displayed = matches.length === 1 ? matches[0] : visible[index];
    if (!displayed) return [];
    const candidates = words.filter(word => word.start >= displayed.start && word.end <= displayed.end);
    const mapped = new Map();
    const match = source => {
      if (mapped.has(source.start)) return mapped.get(source.start);
      const sameToken = candidates.filter(word => word.text.toLowerCase() === source.token);
      const word = sameToken.find(word => word.start - displayed.start === source.start)
        ?? (sameToken.length === 1 ? sameToken[0] : null);
      mapped.set(source.start, word);
      return word;
    };
    return (section.cues ?? []).map(cue => ({ ...cue, sources:cue.sources.map(match).filter(Boolean) }));
  });
}

// A voice's contributors share its real gate timing. Spotlight a few contributors
// per half-bar, rather than claiming that each word owns an isolated audio stem.
export function soundingWords(sections, cycle) {
  if (!sections.length || !Number.isFinite(cycle) || cycle < 0) return [];
  const { index } = stanzaPosition(cycle, sections.length);
  const phase = cycle % 4;
  const phrase = Math.floor(cycle / (sections.length * 4)) * 8 + Math.floor(phase * 2);
  const selected = new Map();
  for (const cue of sections[index] ?? []) {
    const elapsed = phase - cue.start;
    const tail = .12;
    if (elapsed < 0 || elapsed >= cue.duration + tail || !cue.sources.length) continue;
    const activity = elapsed < cue.duration ? .65 + .35 * Math.exp(-elapsed * 12)
      : .65 * (1 - (elapsed - cue.duration) / tail);
    const offset = cue.layer === 'bass' ? 1 : cue.layer === 'relation' ? 2 : 0;
    const word = cue.sources[(phrase + offset) % cue.sources.length];
    const prior = selected.get(word.start);
    if (!prior || prior.activity < activity) selected.set(word.start, { ...word, activity, layer:cue.layer });
  }
  return [...selected.values()].sort((a,b) => b.activity - a.activity || a.start - b.start).slice(0,3).sort((a,b)=>a.start-b.start);
}
