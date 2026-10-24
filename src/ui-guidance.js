// Presentation-only selection: every relationship still reaches the music engine.
export function quietConnections(edges, count, compact = false) {
  const priority = edge => edge.provisional ? 5 : edge.type === 'patch' ? 0
    : ['repetition', 'shared-subject'].includes(edge.type) ? 1 : edge.type === 'semantic' ? 2 : 3;
  const sorted = edges.map((edge, index) => ({ edge, index })).sort((a, b) =>
    priority(a.edge) - priority(b.edge)
    || Math.abs(a.edge.to - a.edge.from) - Math.abs(b.edge.to - b.edge.from)
    || a.index - b.index);
  const pairs = new Set(), degree = new Map(), selected = [];
  const limit = Math.min(compact ? 6 : 10, Math.max(1, Math.ceil(count / 2)));
  for (const { edge } of sorted) {
    const { from, to } = edge;
    if (from === to || from < 0 || to < 0 || from >= count || to >= count) continue;
    const key = [Math.min(from, to), Math.max(from, to)].join(':');
    if (pairs.has(key) || (degree.get(from) ?? 0) >= 3 || (degree.get(to) ?? 0) >= 3) continue;
    pairs.add(key);
    for (const word of [from, to]) degree.set(word, (degree.get(word) ?? 0) + 1);
    selected.push(edge);
    if (selected.length >= limit) break;
  }
  return selected;
}

export const MUSIC_TIPS = [
  { topic:'리듬', text:'‘비트 · 가이드’에서 드럼을 켜고 강도를 조절해보세요. 강도는 템포가 아니라 드럼의 세기를 바꿔요.' },
  { topic:'속도', text:'움직임이 느껴지는 단어가 템포에 영향을 줘요. 여러 연에서는 첫 연의 템포를 함께 사용해요.' },
  { topic:'엇박', text:'일반적인 어순은 정박 위주로, 도치로 추정되는 어순은 당김음을 더 사용해요. 어순 해석은 완벽하지 않을 수 있어요.' },
  { topic:'음정', text:'첫 단어와 변주 번호가 중심음을 정해요. 단어의 정서가 장조·단조에 영향을 주고, 그 음계 안에서 선율이 만들어져요.' },
  { topic:'연결', text:'선은 추정된 문법 관계, 반복·유사어, 문장 사이의 음악 연결을 나타내요. 화면에는 일부만 보여도 음악에는 원래 관계가 반영돼요.' },
  { topic:'모듈러', text:'한 연 안의 문장들을 작은 신스처럼 다뤄요. 문장 간 연결은 필터의 움직임, 음높이, 소리 나는 타이밍을 전달해요. 실제 전압을 흉내 내는 시뮬레이터는 아니에요.' },
  { topic:'선의 색', text:'문장 사이의 초록 선은 필터 움직임, 주황 선은 발음 타이밍, 보라 선은 음높이 패턴의 공유를 뜻해요.' },
  { topic:'조합', text:'기본 재료는 화음 진행 4종·선율 윤곽 6종·드럼 계열 8종이에요. 정서·어순·단어 수가 함께 작용하므로 192개의 서로 다른 곡을 보장하는 뜻은 아니에요.' },
  { topic:'변주', text:'같은 글에서 ‘변주’를 눌러 다른 패턴을 찾아보세요. 조합은 무한하지 않고, 다른 변주에서도 비슷한 소리가 나올 수 있어요.' },
  { topic:'연', text:'빈 줄로 연을 나누면 4마디씩 차례로 연주돼요. 중심음과 템포는 공유하고, 연 끝의 짧은 연결 선율이 다음 연을 예고해요.' },
  { topic:'쌓기', text:'한 단어에서 시작해보세요. 단어가 쌓일수록 화음·베이스·리듬이 더해져요. 쉼표와 마침표는 선율의 여백에도 영향을 줘요.' },
];

export function nextTipIndex(current = -1, random = Math.random) {
  const count = MUSIC_TIPS.length;
  if (current < 0 || current >= count) return Math.floor(random() * count);
  return (current + 1 + Math.floor(random() * (count - 1))) % count;
}
