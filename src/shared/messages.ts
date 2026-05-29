/**
 * Random greeting picker. Pure function of (now, randomSource) so the renderer
 * stays deterministic in tests when needed.
 *
 * 50% chance: pick from time-of-day pool (morning/afternoon/evening/night).
 * 50% chance: pick from generic pool.
 */

const GENERIC = [
  '오늘도 코딩 파이팅!',
  '같이 버그 잡으러 가요!',
  '오늘 뭐 만들어요?',
  '커피 한 잔 어때요?',
  '코드 한 줄씩 차근차근!',
  '오늘도 잘 부탁해요~',
  '한 줄의 코드, 한 걸음 전진!',
];

const MORNING   = ['좋은 아침이에요!', '오늘도 시작!', '아침 햇살이 좋네요'];
const AFTERNOON = ['오후도 화이팅!', '점심 드셨어요?', '집중 잘 되시나요?'];
const EVENING   = ['수고 많으셨어요', '저녁 시간이네요', '하루 잘 마무리해요'];
const NIGHT     = ['야근 중이세요?', '늦었네요, 무리하지 마세요', '오늘도 늦게까지 고생이에요'];

function timedPool(hour: number): string[] {
  if (hour < 6)  return NIGHT;
  if (hour < 12) return MORNING;
  if (hour < 18) return AFTERNOON;
  if (hour < 22) return EVENING;
  return NIGHT;
}

/** Pick a greeting. `rng` defaults to Math.random for production use. */
export function pickMessage(now: Date = new Date(), rng: () => number = Math.random): string {
  const pool = rng() < 0.5 ? GENERIC : timedPool(now.getHours());
  return pool[Math.floor(rng() * pool.length)]!;
}

// ─── Great / Treat messages ───────────────────────────────────────────────────

const GREAT_ACCEPTED = [
  '으아- 고마워요! 더 열심히 할게요!',
  '칭찬 받으니까 기분이 좋아요~',
  '헤헤, 오늘 더 잘할 수 있을 것 같아요!',
  '감사해요! 힘이 솟아요!',
  '와, 정말요? 최고예요!',
];

const TREAT_ACCEPTED = [
  '맛있다! 간식 고마워요!',
  '냠냠- 최고예요!',
  '간식 받으니까 행복해요~',
  '이거 진짜 맛있어요! 또 줘도 돼요!',
  '감사해요, 에너지 충전!',
];

const GREAT_REFUSED = [
  '오늘은 이미 충분히 칭찬받았어요! 내일 또 해줘요~',
  '에헤, 오늘 칭찬은 다 썼어요! 내일 기대할게요!',
  '고마운데… 오늘은 여기까지예요! 내일 또요!',
];

const TREAT_REFUSED = [
  '오늘은 간식을 너무 많이 먹었어요! 내일 또 줘요~',
  '배불러요! 내일 받을게요!',
  '고마운데, 오늘 간식은 끝이에요! 내일 또요!',
];

function pick(pool: string[], rng: () => number = Math.random): string {
  return pool[Math.floor(rng() * pool.length)]!;
}

export function pickGreatMessage(rng: () => number = Math.random): string {
  return pick(GREAT_ACCEPTED, rng);
}

export function pickTreatMessage(rng: () => number = Math.random): string {
  return pick(TREAT_ACCEPTED, rng);
}

export function pickGreatRefusedMessage(rng: () => number = Math.random): string {
  return pick(GREAT_REFUSED, rng);
}

export function pickTreatRefusedMessage(rng: () => number = Math.random): string {
  return pick(TREAT_REFUSED, rng);
}
