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

const tail = .12;
const barPlans = new WeakMap();
function plansFor(cues) {
  if (barPlans.has(cues)) return barPlans.get(cues);
  const plans = Array.from({length:4}, (_,bar) => {
    const layers = {melody:new Map(),bass:new Map(),relation:new Map()};
    for (const cue of cues) {
      if (cue.start >= bar+1 || cue.start+cue.duration+tail <= bar || !layers[cue.layer]) continue;
      const layer = layers[cue.layer];
      for (const source of cue.sources) {
        let entry = layer.get(source.start);
        if (!entry) { entry={word:source,layer:cue.layer,cues:[]}; layer.set(source.start,entry); }
        if (entry.cues.at(-1)!==cue) entry.cues.push(cue);
      }
    }
    return Object.fromEntries(Object.entries(layers).map(([name,entries]) =>
      [name,[...entries.values()].sort((a,b)=>a.word.start-b.word.start)]));
  });
  barPlans.set(cues,plans);
  return plans;
}

// Hold a pair of contributors for the full bar, including the spaces between
// notes. Only their activity follows real gates; names never shuffle on a rest.
// These are contributors to voices, not isolated word-to-note audio stems.
export function soundingWords(sections, cycle) {
  if (!sections.length || !Number.isFinite(cycle) || cycle < 0) return [];
  const { index } = stanzaPosition(cycle, sections.length);
  const phase = cycle % 4;
  const bar = Math.floor(phase);
  const phrase = Math.floor(cycle / (sections.length * 4)) * 4 + bar;
  const cues = sections[index];
  if (!cues?.length) return [];
  const pools = plansFor(cues)[bar];
  const firstPool = pools.melody.length ? pools.melody : pools.bass.length ? pools.bass : pools.relation;
  if (!firstPool.length) return [];
  const first = firstPool[phrase % firstPool.length];
  const secondPool = [pools.bass,pools.relation,pools.melody]
    .map(pool=>pool.filter(entry=>entry.word.start!==first.word.start)).find(pool=>pool.length);
  const second = secondPool?.[phrase % secondPool.length];
  return [first,second].filter(Boolean).map(entry => {
    let activity = 0;
    for (const cue of entry.cues) {
      const elapsed = phase-cue.start;
      if (elapsed < 0 || elapsed >= cue.duration+tail) continue;
      activity = Math.max(activity,elapsed < cue.duration ? .65+.35*Math.exp(-elapsed*12)
        : .65*(1-(elapsed-cue.duration)/tail));
    }
    return {...entry.word,activity,layer:entry.layer};
  });
}
