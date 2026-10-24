import { MUSIC_MATERIAL_COUNTS as MATERIALS } from './music-materials.js';
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
  { topic:'말의 순서를 살짝 비틀면', text:'‘나는 바다를 본다’를 ‘바다를 본다, 나는’으로 바꿔보세요. 어순에 따라 엇박이 조금 더 생길 수 있어요. 같은 말도 다르게 걷는 셈이죠.' },
  { topic:'첫 단어가 지휘자', text:'첫 단어와 ‘변주’가 곡의 기준 음을 정해요. 나머지 단어는 분위기를 보태고, 멜로디는 그 안에서 길을 찾아요.' },
  { topic:'단어끼리 아는 사이', text:'선은 문장 속 관계나 닮은 말, 음악적 연결을 보여줘요. 화면에 다 그리진 않지만, 안 보이는 관계도 음악에는 참여해요.' },
  { topic:'문장으로 케이블 꽂기', text:'모듈러 신스는 작은 악기들을 선으로 잇죠. 여기서는 문장끼리 음색·음높이·타이밍을 나눠요. 케이블 정리는 저희가 할게요.' },
  { topic:'선마다 맡은 일이 있어요', text:'문장 사이의 초록 선은 음색의 밝기를, 주황 선은 소리 낼 타이밍을, 보라 선은 음높이 패턴을 나눠요. 조용한 팀플이죠.' },
  { topic:'몇 곡이나 나올까요', text:`화음 흐름 ${MATERIALS.harmony}종, 멜로디 모양 ${MATERIALS.melody}종, 드럼 계열 ${MATERIALS.rhythm}종, 배경 화음 색깔 ${MATERIALS.pad}종. 재료만 곱하면 ${(MATERIALS.harmony*MATERIALS.melody*MATERIALS.rhythm*MATERIALS.pad).toLocaleString('ko-KR')}조합! 단어와 규칙이 함께 고르니, 모두 다른 곡이라는 뜻은 아니에요.` },
  { topic:'같은 글, 다른 산책', text:'‘변주’를 누르면 같은 문장으로 다른 길을 걸어요. 가끔 익숙한 풍경도 나와요. 무한 랜덤보다는 이유 있는 반복에 가까워요.' },
  { topic:'엔터 두 번, 다음 장면', text:'빈 줄로 나누면 각 연이 4마디씩 돌아가요. 빠르기는 함께 맞추고, 분위기는 각자 맡아요. 마지막엔 첫 연으로 돌아옵니다.' },
  { topic:'일단 한 단어만', text:'단어를 더하면 화음과 베이스, 리듬이 하나씩 합류해요. 쉼표와 마침표는 숨 쉴 틈을 보태고요. 문장도 가끔 쉬어야죠.' },
  { topic:'시작은 작아도 괜찮아요', text:'‘밤’ 한 글자부터 시작해보세요. 완성된 시만 입장할 수 있는 곳은 아니에요. 초고도 환영합니다.' },
  { topic:'형용사 한 스푼', text:'‘바다’ 앞에 ‘고요한’을 붙여보세요. 같은 풍경에 다른 기분을 입히는 실험이에요. 수식어는 소금처럼 조금씩.' },
  { topic:'오늘의 날씨를 적어보세요', text:'비, 햇살, 바람 중 오늘 가까운 말을 골라보세요. 일기예보는 못 하지만, 오늘의 소리는 만들어볼 수 있어요.' },
  { topic:'멀리 있는 것, 가까이 있는 것', text:'풍경과 공간은 배경 쪽으로, 몸과 감정은 선율 쪽으로 읽어요. ‘숲속에서 나는 웃는다’처럼 거리를 만들어보세요.' },
  { topic:'기쁜 연 다음에 슬픈 연', text:'밝은 장면 뒤에 빈 줄을 두고 어두운 장면을 써보세요. 같은 곡 안에서 분위기가 바뀌어요. 전학 말고 장면 전환이죠.' },
  { topic:'첫 연은 집 같은 곳', text:'뒤의 연도 첫 연의 중심음과 음악 골격을 함께 써요. 멀리 산책해도 돌아올 집은 남겨두는 셈이에요.' },
  { topic:'마지막 연은 끝이 아니에요', text:'음악은 마지막 연에서 첫 연으로 돌아와요. 끝 문장과 첫 문장을 이어 읽어보세요. 뜻밖의 수미상관을 만날지도요.' },
  { topic:'한 줄과 한 연은 달라요', text:'엔터 한 번은 줄바꿈, 두 번은 새 연이에요. 음악의 방을 나누고 싶다면 빈 줄 하나를 남겨주세요.' },
  { topic:'단어 하나만 바꿔보기', text:'여러 말을 한꺼번에 고치기보다 한 단어씩 바꿔 들어보세요. 무엇이 달라졌는지 찾는 재미도 작곡의 일부예요.' },
  { topic:'반복도 시의 기술', text:'같은 말을 다시 써보세요. 반복된 단어는 연결의 단서가 돼요. 오타가 아니라 후렴이라고 우겨도 괜찮아요.' },
  { topic:'드럼 없는 산책', text:'‘비트 · 가이드’에서 비트를 꺼보세요. 박자가 사라지는 건 아니지만, 화음과 선율의 여백이 더 잘 들릴 거예요.' },
  { topic:'강도와 속도는 다른 손잡이', text:'비트 강도를 낮추면 드럼이 뒤로 물러나요. 곡을 느리게 하는 버튼은 아니에요. 작은 목소리로도 빨리 말할 수 있잖아요.' },
  { topic:'멜로디도 숨을 쉬어요', text:'모든 칸에 소리를 채우지는 않아요. 길게 머무는 음과 짧은 대답, 쉼표가 번갈아 나와요. 침묵도 출연진입니다.' },
  { topic:'코드는 악보의 다른 얼굴', text:'아래 코드는 지금 만들어지는 음악의 뼈대예요. 읽을 줄 몰라도 괜찮아요. 주방이 보인다고 요리사가 될 필요는 없으니까요.' },
  { topic:'물결표는 쉬는 자리', text:'코드 속 ~는 소리를 내지 않는 자리예요. 고장 난 음표가 아니라 잠깐 비워둔 의자랍니다.' },
  { topic:'두 언어, 하나의 작업실', text:'한국어와 영어 모두 쓸 수 있어요. 같은 풍경을 다른 언어로 적어 들어보세요. 번역이 꼭 같은 음악이 되지는 않아요.' },
  { topic:'AI는 조금 늦게 합주해요', text:'기본 음악이 먼저 시작하고 AI 해석은 준비된 뒤 천천히 합류해요. 늦게 온 연주자도 문을 쾅 열지는 않아요.' },
  { topic:'마음에 드는 순간을 담기', text:'‘음악 녹음’으로 지금의 소리를 남겨보세요. 마이크가 아니라 음악 출력을 담아요. 옆자리 기침은 출연하지 않습니다.' },
  { topic:'소리도 키가 있어요', text:'아래 막대는 실제 나오는 음악의 저음부터 고음까지 보여줘요. 악기별 성적표는 아니고, 모두 함께 찍는 소리의 단체 사진이에요.' },
];

export function nextTipIndex(current = -1, random = Math.random) {
  const count = MUSIC_TIPS.length;
  if (current < 0 || current >= count) return Math.floor(random() * count);
  return (current + 1 + Math.floor(random() * (count - 1))) % count;
}
