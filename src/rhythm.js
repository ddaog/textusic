// Eight-bar deterministic grooves. The opening word anchors the family; extra
// words add subdivisions without replacing the foundational hits.
import { wordOrderSyncopation } from './word-order-rhythm.js';
import { GROOVES } from './music-materials.js';
export function createRhythm(analysis, richness, tension = 0) {
  const seed = analysis.seed >>> 0;
  const family = seed % GROOVES.length;
  const syncopation = wordOrderSyncopation(analysis);
  const groove = GROOVES[family];
  const kicks = groove.kick;
  const snares = groove.snare;
  const hash = (bar, step, voice) => {
    let value = (seed ^ Math.imul(bar + 1, 374761393) ^ Math.imul(step + 1, 668265263) ^ voice) >>> 0;
    value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
    return (value >>> 0) / 4294967296;
  };
  const result = { family, kick: [], snare: [], hat: [], accents: [] };
  for (let bar = 0; bar < 8; bar++) {
    const fill = bar === 3 || bar === 7;
    const kick = [], snare = [], hat = [], accents = [];
    for (let step = 0; step < 16; step++) {
      const pickup = syncopation >= .35 && step === [6,10,14][family % 3] && bar % 2 === 1;
      kick.push(kicks.includes(step) || pickup || (step % 2 === 0 && hash(bar, step, 1) < richness * .15) ? 'c1' : '~');
      snare.push(snares.includes(step) || (fill && step > 12 && hash(bar, step, 2) < richness * .65 + tension * .15) ? 'white' : '~');
      const hit = groove.hat.includes(step) || (step % 2 === 0 && hash(bar, step, 3) < richness * .55)
        || (step % 2 === 1 && hash(bar, step, 4) < richness * syncopation * (.12 + tension * .18));
      hat.push(hit ? 'white' : '~');
      accents.push((step % 4 === 2 ? .85 : .35 + hash(bar, step, 5) * .3).toFixed(2));
    }
    result.kick.push(kick.join(' ')); result.snare.push(snare.join(' '));
    result.hat.push(hat.join(' ')); result.accents.push(accents.join(' '));
  }
  return result;
}
