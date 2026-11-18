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
      const displayedWord = sameToken.find(word => word.start - displayed.start === source.start)
        ?? (sameToken.length === 1 ? sameToken[0] : null);
      const word = displayedWord ? {...displayedWord,sourceLayer:source.sourceLayer,traits:source.traits ?? {}} : null;
      mapped.set(source.start, word);
      return word;
    };
    return (section.cues ?? []).map(cue => ({ ...cue, sources:cue.sources.map(match).filter(Boolean) }));
  });
}

const tail = .12;
const rolePlans = new WeakMap();
const voiceBands = {bass:'low',harmony:'mid',melody:'high',sparkle:'high',relation:'high'};
const trait = (word,key) => Math.max(-1,Math.min(1,Number(word.traits?.[key]) || 0));
function roleAffinity(word,band) {
  if (band === 'low') return (word.sourceLayer === 'far' ? .9 : 0) + trait(word,'space')*.3 - trait(word,'motion')*.2;
  if (band === 'mid') return trait(word,'softness')*.5 + trait(word,'space')*.3 + trait(word,'warmth')*.15;
  return (word.sourceLayer === 'near' ? .9 : 0) + trait(word,'light')*.3 + trait(word,'motion')*.25;
}
function plansFor(cues) {
  if (rolePlans.has(cues)) return rolePlans.get(cues);
  const pools = {low:new Map(),mid:new Map(),high:new Map()};
  for (const cue of cues) {
    const band = voiceBands[cue.layer];
    if (!band) continue;
    for (const source of cue.sources) {
      let entry = pools[band].get(source.start);
      if (!entry) { entry={word:source,band,layer:cue.layer,cues:[]}; pools[band].set(source.start,entry); }
      if (entry.cues.at(-1)!==cue) entry.cues.push(cue);
    }
  }
  const plan = [];
  for (const band of ['low','mid','high']) {
    const ranked = [...pools[band].values()].map(entry=>({...entry,affinity:roleAffinity(entry.word,band)}))
      .sort((a,b)=>b.affinity-a.affinity || a.word.start-b.word.start);
    if (!ranked.length) continue;
    // Prefer another genuine contributor/color when equally appropriate. A lone
    // source may legitimately color several roles; do not invent replacement hues.
    const comparable = ranked.filter(entry=>entry.affinity >= ranked[0].affinity-.4);
    const distinctWord = entry=>!plan.some(chosen=>chosen.word.start===entry.word.start);
    const distinctColor = entry=>!plan.some(chosen=>chosen.word.color===entry.word.color);
    plan.push(comparable.find(entry=>distinctWord(entry) && distinctColor(entry))
      ?? comparable.find(distinctWord) ?? ranked[0]);
  }
  rolePlans.set(cues,plan);
  return plan;
}

// Fixed instrument/register roles for the entire stanza, including later loops.
// Only real gates change activity. These are voice contributors, not audio stems.
export function soundingWords(sections, cycle) {
  if (!sections.length || !Number.isFinite(cycle) || cycle < 0) return [];
  const { index } = stanzaPosition(cycle, sections.length);
  const phase = cycle % 4;
  const cues = sections[index];
  if (!cues?.length) return [];
  return plansFor(cues).map(entry => {
    let activity = 0;
    for (const cue of entry.cues) {
      const elapsed = phase-cue.start;
      if (elapsed < 0 || elapsed >= cue.duration+tail) continue;
      activity = Math.max(activity,elapsed < cue.duration ? .65+.35*Math.exp(-elapsed*12)
        : .65*(1-(elapsed-cue.duration)/tail));
    }
    return {...entry.word,activity,layer:entry.layer,band:entry.band};
  });
}
