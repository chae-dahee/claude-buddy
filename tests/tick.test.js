/**
 * tick.ts 테스트 — EXP/레벨 시스템 검증 (25+ 케이스)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  threshold,
  tokenExpAt,
  countActiveDays,
  deriveMood,
  tick,
} from '../dist/shared/tick.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * 깊은 복사 - tick은 상태 변경하므로 테스트마다 새 객체 필요
 */
function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * 로컬 시간 기준 타임스탬프 생성 — UTC 문자열('Z') 사용 금지
 * UTC+9 같은 비-UTC 환경에서도 동일한 로컬 날짜를 보장
 */
function localMs(year, month, day, hour = 0) {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

/**
 * 기본 상태 (level 1, 0 EXP)
 */
function newState() {
  return {
    level: 1,
    exp: 0,
    hunger: 0,
    lastTickAt: 0,
    lastSeenAt: 0,
    lastTreatAt: 0,
    tokensSeenTotal: 0,
    tokenExpAccrued: 0,
    daily: {
      date: '1970-01-01',
      giveGreatCount: 0,
      giveTreatCount: 0,
    },
  };
}

// ─── threshold Tests (6 cases) ────────────────────────────────────────────────

test('threshold(1) = 100', () => {
  assert.equal(threshold(1), 100);
});

test('threshold(2) = 230', () => {
  assert.equal(threshold(2), 230);
});

test('threshold(3) = 374', () => {
  assert.equal(threshold(3), 374);
});

test('threshold(5) = 690', () => {
  assert.equal(threshold(5), 690);
});

test('threshold(10) = 1585', () => {
  assert.equal(threshold(10), 1585);
});

test('threshold(20) = 3642', () => {
  assert.equal(threshold(20), 3642);
});

// ─── tokenExpAt Tests (5 cases) ───────────────────────────────────────────────

test('tokenExpAt(999) = 0 (N < 1000)', () => {
  assert.equal(tokenExpAt(999), 0);
});

test('tokenExpAt(1000) = 0', () => {
  assert.equal(tokenExpAt(1000), 0);
});

test('tokenExpAt(10000) = 5', () => {
  assert.equal(tokenExpAt(10000), 5);
});

test('tokenExpAt(100000) = 10', () => {
  assert.equal(tokenExpAt(100000), 10);
});

test('tokenExpAt(1000000) = 15', () => {
  assert.equal(tokenExpAt(1000000), 15);
});

// ─── countActiveDays Tests (5 cases) ──────────────────────────────────────────

/**
 * 로컬 시간 기준 요일 (1970-01-01 = 목요일)
 * 월요일: 1970-01-05, 화: 1970-01-06, 수: 1970-01-07
 * 목: 1970-01-08, 금: 1970-01-09, 토: 1970-01-10, 일: 1970-01-11
 */

test('countActiveDays: same day = 0', () => {
  const mon10 = localMs(1970, 1, 5, 10);   // 월 10:00
  const mon18 = localMs(1970, 1, 5, 18);   // 월 18:00
  assert.equal(countActiveDays(mon10, mon18), 0);
});

test('countActiveDays: Monday to Tuesday = 1', () => {
  const mon10 = localMs(1970, 1, 5, 10);   // 월
  const tue10 = localMs(1970, 1, 6, 10);   // 화
  assert.equal(countActiveDays(mon10, tue10), 1);
});

test('countActiveDays: Monday to Friday = 4', () => {
  // 월 10:00 → 금 18:00: 화,수,목,금 자정 통과 = 4
  const mon10 = localMs(1970, 1, 5, 10);
  const fri18 = localMs(1970, 1, 9, 18);
  assert.equal(countActiveDays(mon10, fri18), 4);
});

test('countActiveDays: Friday to Monday = 1 (weekend skipped, Monday counts)', () => {
  // 금 18:00 → 월 10:00: 토,일 자정 건너뜀, 월 자정 통과 → 1
  const fri18 = localMs(1970, 1, 9, 18);
  const mon10 = localMs(1970, 1, 12, 10);
  assert.equal(countActiveDays(fri18, mon10), 1);
});

test('countActiveDays: full week = 5', () => {
  // 월 10:00 → 다음주 월 10:00: 화~금(4) + 다음주 월(1) = 5
  const mon10 = localMs(1970, 1, 5, 10);
  const nextMon10 = localMs(1970, 1, 12, 10);
  assert.equal(countActiveDays(mon10, nextMon10), 5);
});

// ─── deriveMood Tests (3 cases) ───────────────────────────────────────────────

test('deriveMood: sad when activeDays >= 3', () => {
  const state = newState();
  state.lastSeenAt = localMs(1970, 1, 1, 0);   // 목 00:00
  const nowMs = localMs(1970, 1, 7, 10);        // 수 10:00 (금,월,화,수 = 4 활동일)
  const mood = deriveMood(state, nowMs);
  assert.equal(mood, 'sad');
});

test('deriveMood: happy when interaction on same day', () => {
  const state = newState();
  const now = localMs(1970, 1, 5, 10);   // 월요일 로컬
  const d = new Date(now);
  // todayLocal과 동일한 YYYY-MM-DD 포맷 (로컬 날짜)
  state.daily.date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  state.daily.giveGreatCount = 1;
  state.lastSeenAt = now;

  const mood = deriveMood(state, now);
  assert.equal(mood, 'happy');
});

test('deriveMood: neutral by default', () => {
  const state = newState();
  const now = localMs(1970, 1, 5, 10);
  state.lastSeenAt = now;

  const mood = deriveMood(state, now);
  assert.equal(mood, 'neutral');
});

// ─── tick Tests (15+ cases) ──────────────────────────────────────────────────

test('tick: now == lastTickAt = no-op', () => {
  const state = newState();
  state.lastTickAt = 1000;
  const before = cloneState(state);

  tick(state, { now: 1000 });

  assert.equal(state.exp, before.exp);
  assert.equal(state.level, before.level);
  assert.equal(state.hunger, before.hunger);
});

test('tick: 1 weekday elapsed = +20 EXP', () => {
  const state = newState();
  const lastSeen = localMs(1970, 1, 5, 10);   // 월 10:00
  state.lastTickAt = lastSeen;
  state.lastSeenAt = lastSeen;
  const now = localMs(1970, 1, 6, 10);         // 화 10:00

  tick(state, { now });

  assert.equal(state.exp, 20);
});

test('tick: 5 weekdays elapsed = level up (100 EXP = threshold(1))', () => {
  const state = newState();
  // 월(Jan5) 10:00 → 다음주 월(Jan12) 10:00: 화~금(4) + 다음주월(1) = 5일
  const lastTick = localMs(1970, 1, 5, 10);    // 월 10:00
  const lastSeen = localMs(1970, 1, 11, 18);   // 일 18:00 → 페널티 없음
  state.lastTickAt = lastTick;
  state.lastSeenAt = lastSeen;
  const now = localMs(1970, 1, 12, 10);         // 다음주 월 10:00

  tick(state, { now });

  // 5 * 20 = 100 = threshold(1) → level up
  assert.equal(state.level, 2);
  assert.equal(state.exp, 0);
});

test('tick: level up when EXP >= threshold', () => {
  const state = newState();
  state.exp = 99;
  const lastSeen = localMs(1970, 1, 5, 10);   // 월 10:00
  state.lastTickAt = lastSeen;
  state.lastSeenAt = lastSeen;
  const now = localMs(1970, 1, 6, 10);         // 화 10:00 → +20 EXP

  tick(state, { now });

  assert.equal(state.level, 2);
  assert.equal(state.exp, 19);  // 99 + 20 - 100 = 19
});

test('tick: hunger increases with time, capped at 4', () => {
  const state = newState();
  state.hunger = 0;
  state.lastTickAt = localMs(1970, 1, 5, 10);   // 월
  // 화~금(4) + 다음주월(1) = 5 활동일 → hunger +5 → capped at 4
  const now = localMs(1970, 1, 12, 10);

  tick(state, { now });

  assert.equal(state.hunger, 4);
});

test('tick: sessionTokens adds token EXP delta', () => {
  const state = newState();
  state.tokensSeenTotal = 1000;
  state.lastTickAt = 0;
  const now = 1;

  // tokenExpAt(1000) = 0, tokenExpAt(100000) = 10, delta = 10
  tick(state, { now, sessionTokens: 100000 });

  assert.ok(state.exp >= 10);
  assert.equal(state.tokensSeenTotal, 100000);
});

test('tick: sessionTokens watermark never decreases', () => {
  const state = newState();
  state.tokensSeenTotal = 100000;
  state.lastTickAt = 0;
  const now = 1;

  // 10000 < 100000: delta = 0
  tick(state, { now, sessionTokens: 10000 });

  assert.equal(state.tokensSeenTotal, 100000);
});

test('tick: daily reset on date change', () => {
  const state = newState();
  state.daily.date = '1970-01-05';
  state.daily.giveGreatCount = 5;
  state.daily.giveTreatCount = 3;
  state.lastTickAt = localMs(1970, 1, 5, 10);   // 월
  const now = localMs(1970, 1, 6, 10);            // 화 → 날짜 변경

  tick(state, { now });

  // todayLocal(now) = '1970-01-06' (로컬 기준)
  const d = new Date(now);
  const expectedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  assert.equal(state.daily.date, expectedDate);
  assert.equal(state.daily.giveGreatCount, 0);
  assert.equal(state.daily.giveTreatCount, 0);
});

test('tick: ignore penalty (activeDays >= 3) halves EXP', () => {
  const state = newState();
  // Jan1(목) 00:00 → Jan8(목) 10:00: 금,월,화,수,목 = 5 활동일
  state.lastSeenAt = localMs(1970, 1, 1, 0);
  state.lastTickAt = localMs(1970, 1, 1, 0);
  const now = localMs(1970, 1, 8, 10);

  tick(state, { now });

  // activeDays(Jan1~Jan8) = 5 >= 3 → moodMul=0.5
  // timeDays = 5, 5 * 20 * 0.5 = 50
  assert.equal(state.exp, 50);
});

test('tick: updateLastSeen=true updates lastSeenAt', () => {
  const state = newState();
  state.lastSeenAt = 0;
  state.lastTickAt = 0;
  const now = 1000;

  tick(state, { now, updateLastSeen: true });

  assert.equal(state.lastSeenAt, 1000);
});

test('tick: updateLastSeen=false preserves lastSeenAt', () => {
  const state = newState();
  state.lastSeenAt = 500;
  state.lastTickAt = 0;
  const now = 1000;

  tick(state, { now, updateLastSeen: false });

  assert.equal(state.lastSeenAt, 500);
});

test('tick: multiple level ups in single tick', () => {
  const state = newState();
  state.exp = 0;
  state.lastTickAt = localMs(1970, 1, 5, 10);
  // ~31일 = ~22 활동일 = ~440 EXP → 복수 레벨업
  const now = localMs(1970, 2, 5, 10);

  tick(state, { now });

  assert.ok(state.level >= 2);
});

test('tick: sessionTokens without time advance', () => {
  const state = newState();
  const now = localMs(1970, 1, 5, 10);
  state.lastTickAt = now;
  state.lastSeenAt = now;
  state.tokensSeenTotal = 0;

  tick(state, { now, sessionTokens: 100000 });

  // tokenExpAt(0) = 0, tokenExpAt(100000) = 10, delta = 10
  assert.equal(state.exp, 10);
});

// ─── Integration Tests ────────────────────────────────────────────────────────

test('tick: full workflow from level 1 to level 2', () => {
  const state = newState();
  state.exp = 0;
  state.level = 1;
  // 일(Jan4) 18:00 → 월(Jan5) 자정 이후부터 카운팅: 월~금 = 5 활동일
  const lastTick = localMs(1970, 1, 4, 18);    // 일요일 18:00
  const lastSeen = localMs(1970, 1, 11, 18);   // 일요일 → 1활동일, 페널티 없음
  state.lastTickAt = lastTick;
  state.lastSeenAt = lastSeen;
  const now = localMs(1970, 1, 12, 0);          // 다음주 월 자정

  tick(state, { now });

  // 5 * 20 = 100 = threshold(1) → level up
  assert.equal(state.level, 2);
  assert.equal(state.exp, 0);
});

test('tick: mood changes reflect in state indirectly', () => {
  const state = newState();
  // Dec31(수) 18:00 → Jan10(토) 00:00: 목(Jan1),금(Jan2),월~금(Jan5~9) = 7 활동일
  state.lastSeenAt = localMs(1969, 12, 31, 18);
  state.lastTickAt = localMs(1969, 12, 31, 18);
  const now = localMs(1970, 1, 10, 0);   // 토요일

  tick(state, { now });

  // activeDays = 7 >= 3 → moodMul = 0.5, timeDays = 7
  // 7 * 20 * 0.5 = 70
  assert.equal(state.exp, 70);
});

test('tick: deriveMood integration - happy mood with interaction', () => {
  const state = newState();
  const now = localMs(1970, 1, 5, 10);
  const d = new Date(now);
  state.daily.date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  state.daily.giveGreatCount = 2;
  state.lastSeenAt = now;
  state.lastTickAt = localMs(1970, 1, 5, 9);

  tick(state, { now });

  const mood = deriveMood(state, now);
  assert.equal(mood, 'happy');
});

test('tick: state mutation returns same object', () => {
  const state = newState();
  state.lastTickAt = 0;
  const result = tick(state, { now: 1000 });

  assert.strictEqual(result, state);
});

test('tick: tokenExpAccrued accumulates delta', () => {
  const state = newState();
  state.tokensSeenTotal = 0;
  state.tokenExpAccrued = 0;
  const now = 1;

  // delta = tokenExpAt(100000) - tokenExpAt(0) = 10 - 0 = 10
  tick(state, { now, sessionTokens: 100000 });

  assert.equal(state.tokenExpAccrued, 10);
});

test('tick: tokenExpAccrued does not increase when watermark unchanged', () => {
  const state = newState();
  state.tokensSeenTotal = 100000;
  state.tokenExpAccrued = 10;
  const now = 1;

  tick(state, { now, sessionTokens: 50000 });

  assert.equal(state.tokenExpAccrued, 10);
});
