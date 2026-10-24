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
  { topic:'드러머를 불러볼까요', text:'‘비트 · 가이드’에서 드럼을 켜보세요. 강도를 올리면 더 힘차게 쳐요. 빨리 치라는 뜻은 아니고요.' },
  { topic:'문장에도 걸음걸이가 있어요', text:'느긋한 말과 활기찬 말은 곡의 빠르기에 영향을 줘요. 여러 연을 쓰면 첫 연이 모두의 보폭을 정해요.' },
  { topic:'말의 순서를 살짝 비틀면', text:'보통 어순은 반듯하게, 도치로 읽히는 문장은 엇박을 조금 더 써요. 시를 알아보는 눈은 아직 연습 중이에요.' },
  { topic:'첫 단어가 지휘자', text:'첫 단어와 ‘변주’가 곡의 기준 음을 정해요. 나머지 단어는 분위기를 보태고, 멜로디는 그 안에서 길을 찾아요.' },
  { topic:'단어끼리 아는 사이', text:'선은 문장 속 관계나 닮은 말, 음악적 연결을 보여줘요. 화면에 다 그리진 않지만, 안 보이는 관계도 음악에는 참여해요.' },
  { topic:'문장으로 케이블 꽂기', text:'모듈러 신스는 작은 악기들을 선으로 잇죠. 여기서는 문장끼리 음색·음높이·타이밍을 나눠요. 케이블 정리는 저희가 할게요.' },
  { topic:'선마다 맡은 일이 있어요', text:'문장 사이의 초록 선은 음색의 밝기를, 주황 선은 소리 낼 타이밍을, 보라 선은 음높이 패턴을 나눠요. 조용한 팀플이죠.' },
  { topic:'몇 곡이나 나올까요', text:'화음 흐름 4종, 멜로디 모양 6종, 드럼 계열 8종이 기본 재료예요. 단어와 어순도 섞여서, 곱셈만으로 곡 수를 딱 세기는 어려워요.' },
  { topic:'같은 글, 다른 산책', text:'‘변주’를 누르면 같은 문장으로 다른 길을 걸어요. 가끔 익숙한 풍경도 나와요. 무한 랜덤보다는 이유 있는 반복에 가까워요.' },
  { topic:'엔터 두 번, 다음 장면', text:'빈 줄로 나누면 각 연이 4마디씩 돌아가요. 빠르기는 함께 맞추고, 분위기는 각자 맡아요. 마지막엔 첫 연으로 돌아옵니다.' },
  { topic:'일단 한 단어만', text:'단어를 더하면 화음과 베이스, 리듬이 하나씩 합류해요. 쉼표와 마침표는 숨 쉴 틈을 보태고요. 문장도 가끔 쉬어야죠.' },
];

export function nextTipIndex(current = -1, random = Math.random) {
  const count = MUSIC_TIPS.length;
  if (current < 0 || current >= count) return Math.floor(random() * count);
  return (current + 1 + Math.floor(random() * (count - 1))) % count;
}
