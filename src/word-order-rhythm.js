import { analyzeSyntax } from './syntax.js';

// A conservative rhythm hint, not a judgement of whether writing is poetic.
// Korean predicate-final / English subject-before-verb clauses stay grounded.
export function wordOrderSyncopation(analysis) {
  const words = (analysis.syntax ?? analyzeSyntax(analysis.text ?? '')).words;
  if (!words.length) return .1;
  const scores = [...new Set(words.map(w => w.clause))].map(clause => {
    const group = words.filter(w => w.clause === clause);
    const predicates = group.filter(w => w.role === 'predicate');
    if (!predicates.length) return group.some(w => w.role === 'auxiliary') ? .1 : .28;
    if (group.some(w => /[가-힣]/u.test(w.token))) {
      const head = predicates.at(-1);
      return group.some(w => w.index > head.index && ['subject','object','word','place','adverb'].includes(w.role)) ? .65 : .1;
    }
    // Ordinary questions should not be treated as inversions.
    if (group[0].role === 'auxiliary' || /^(who|what|where|when|why|how)$/u.test(group[0].token)) return .1;
    const head = predicates[0];
    const subjectBefore = group.some(w => w.index < head.index && ['subject','word'].includes(w.role));
    return !subjectBefore && group.some(w => w.index > head.index && w.role === 'word') ? .5 : .1;
  });
  return scores.reduce((sum,n)=>sum+n,0) / scores.length;
}
