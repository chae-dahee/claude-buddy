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
