/**
 * EXP 및 레벨업 시스템 — tick 오케스트레이션
 * - threshold: 누승 곡선 EXP 필요량
 * - tokenExpAt: 토큰 로그 스케일 EXP
 * - countActiveDays: 평일(월~금) 활동일 카운팅
 * - deriveMood: 상호작용/무시 상태 파생
 * - tick: 6단계 상태 갱신 (일일 리셋→무시→시간→토큰→레벨업→갱신)
 */

import type { StateFile } from './state.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Mood = 'happy' | 'neutral' | 'sad';

export interface TickOptions {
  now: number;
  sessionTokens?: number;
  updateLastSeen?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function todayLocal(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

// ─── EXP Functions ────────────────────────────────────────────────────────────

/**
 * 레벨별 EXP 필요량: ceil(100 * level^1.2)
 */
export function threshold(level: number): number {
  return Math.ceil(100 * Math.pow(level, 1.2));
}

/**
 * 누적 토큰으로부터의 EXP 절대값: N<1000 → 0, else floor(log10(N/1000)*5)
 * 1K→0, 10K→5, 100K→10, 1M→15, 10M→20
 * tick에서는 delta(현재 - watermark)만 가산.
 */
export function tokenExpAt(totalTokens: number): number {
  if (totalTokens < 1000) return 0;
  return Math.floor(Math.log10(totalTokens / 1000) * 5);
}

// ─── Activity Functions ───────────────────────────────────────────────────────

/**
 * 구간 내 활동일 카운팅 (평일만: 월~금)
 * - fromMs과 toMs 사이의 로컬 자정을 기준으로 카운팅
 * - 같은 날: 0, 인접한 평일: 1, 월→다음주월: 5
 */
export function countActiveDays(fromMs: number, toMs: number): number {
  if (fromMs >= toMs) return 0;

  const fromDate = new Date(fromMs);
  const toDate = new Date(toMs);

  const fromDayStart = new Date(
    fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0
  );
  const toDayStart = new Date(
    toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 0, 0, 0, 0
  );

  // startDay: fromMs 이후의 첫 로컬 자정
  let startDay = new Date(fromDayStart);
  if (fromDayStart.getTime() <= fromMs) {
    startDay = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + 1, 0, 0, 0, 0);
  }

  // endDay: toMs이 로컬 자정을 지난 경우 다음 날 포함
  let endDay = new Date(toDayStart);
  if (toDayStart.getTime() < toMs) {
    endDay = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1, 0, 0, 0, 0);
  }

  let count = 0;
  const current = new Date(startDay);
  while (current < endDay) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ─── Mood Functions ──────────────────────────────────────────────────────────

/**
 * 무드 파생 (우선순위)
 * 1. sad: activeDays(lastSeenAt, now) >= 3
 * 2. happy: 오늘 great/treat 1회 이상
 * 3. neutral: 기본값
 */
export function deriveMood(state: StateFile, nowMs: number): Mood {
  if (countActiveDays(state.lastSeenAt, nowMs) >= 3) return 'sad';

  const today = todayLocal(nowMs);
  const lastSeenDate = todayLocal(state.lastSeenAt);
  if (today === lastSeenDate &&
      (state.daily.giveGreatCount > 0 || state.daily.giveTreatCount > 0)) {
    return 'happy';
  }

  return 'neutral';
}

// ─── Tick Orchestration ───────────────────────────────────────────────────────

/**
 * 6단계 EXP/레벨 갱신
 * 1. 일일 리셋  2. 무시 페널티  3. 시간 EXP
 * 4. 토큰 EXP  5. 레벨업 루프  6. 타임스탬프 갱신
 */
export function tick(state: StateFile, opts: TickOptions): StateFile {
  const now = opts.now;

  // 1. 일일 리셋
  const todayStr = todayLocal(now);
  if (todayStr !== state.daily.date) {
    state.daily.date = todayStr;
    state.daily.giveGreatCount = 0;
    state.daily.giveTreatCount = 0;
  }

  // 2. 무시 체크
  const activeDaysSinceLastSeen = countActiveDays(state.lastSeenAt, now);
  const moodMul = activeDaysSinceLastSeen >= 3 ? 0.5 : 1.0;

  // 3. 시간 기반 EXP
  const timeDays = countActiveDays(state.lastTickAt, now);
  state.exp += Math.floor(timeDays * 20 * moodMul);
  state.hunger = Math.min(state.hunger + timeDays, 4);

  // 4. 토큰 기반 EXP
  if (opts.sessionTokens !== undefined) {
    const oldExp = tokenExpAt(state.tokensSeenTotal);
    const newExp = tokenExpAt(opts.sessionTokens);
    const delta = Math.max(0, newExp - oldExp);
    state.exp += delta;
    state.tokenExpAccrued += delta;
    state.tokensSeenTotal = Math.max(state.tokensSeenTotal, opts.sessionTokens);
  }

  // 5. 레벨업 루프
  while (state.exp >= threshold(state.level)) {
    state.exp -= threshold(state.level);
    state.level += 1;
  }

  // 6. 타임스탬프 갱신
  state.lastTickAt = now;
  if (opts.updateLastSeen) state.lastSeenAt = now;

  return state;
}
