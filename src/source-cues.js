// Provenance for generated voices, not isolated word audio. The compiler passes
// the same bars it emits to Strudel so rests and weighted note lengths agree.
export function barEvents(pattern) {
  const tokens = pattern.match(/\[|\]|[^\s\[\]]+/g) ?? [];
  let cursor = 0;
  const sequence = () => {
    const items = [];
    while (cursor < tokens.length && tokens[cursor] !== ']') {
      const token = tokens[cursor++];
      if (token === '[') {
        const children = sequence();
        cursor += 1;
        items.push({ children, weight:1 });
      } else {
        const [value, weight = '1'] = token.split('@');
        items.push({ value, weight:Math.max(1,Number(weight) || 1) });
      }
    }
    return items;
  };
  const events = [];
  const walk = (items, start, duration) => {
    const total = items.reduce((sum,item) => sum + item.weight,0);
    let offset = start;
    for (const item of items) {
      const length = duration * item.weight / total;
      if (item.children) walk(item.children,offset,length);
      else if (item.value !== '~') events.push({start:offset,duration:length});
      offset += length;
    }
  };
  walk(sequence(),0,1);
  return events;
}

export function wordSources(analysis, indices) {
  const meanings = new Map((analysis.tokenMeanings ?? []).map(word => [word.token,word]));
  const spans = [...analysis.text.matchAll(/[가-힣a-z0-9]+/giu)].map(match => ({
    start:match.index, end:match.index + match[0].length, token:match[0].toLowerCase(),
    sourceLayer:meanings.get(match[0].toLowerCase())?.layer,
    traits:meanings.get(match[0].toLowerCase())?.traits ?? {},
  }));
  return indices ? [...new Set(indices)].map(index => spans[index]).filter(Boolean)
    : spans.filter(word => analysis.tokens.includes(word.token));
}

export function createSourceCues(analysis, voices) {
  const cues = [];
  for (const voice of voices) {
    const sources = wordSources(analysis,voice.sources);
    const stepSources = voice.sourceSteps?.map(indices => wordSources(analysis,indices));
    voice.bars.slice(0,4).forEach((bar,index) => {
      for (const event of barEvents(bar)) {
        const contributors = stepSources ? stepSources[Math.round(event.start * stepSources.length)] : sources;
        if (!contributors?.length || cues.length >= 640) continue;
        cues.push({start:index + event.start,duration:event.duration,sources:contributors,layer:voice.layer});
      }
    });
  }
  return cues.sort((a,b) => a.start-b.start);
}
