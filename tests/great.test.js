/**
 * great.ts 테스트 — applyGreat 로직 검증
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGreat, GREAT_DAILY_LIMIT, GREAT_EXP } from '../dist/cli/great.js';
import { threshold } from '../dist/shared/tick.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function localDateStr(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 기본 상태 — lastTickAt=now, daily.date=today 로 tick 부수 효과 제거 */
function makeState(now) {
  return {
    level: 1,
    exp: 0,
    hunger: 0,
    lastTickAt: now,
    lastSeenAt: now,
    lastTreatAt: 0,
    tokensSeenTotal: 0,
    tokenExpAccrued: 0,
    daily: {
      date: localDateStr(now),
      giveGreatCount: 0,
      giveTreatCount: 0,
    },
  };
}

const deterministicRng = () => 0; // 항상 첫 번째 메시지 선택

// ─── 수락 케이스 ──────────────────────────────────────────────────────────────

test('applyGreat: 수락 시 giveGreatCount +1', () => {
  const now = Date.now();
  const state = makeState(now);
  const { accepted } = applyGreat(state, now, deterministicRng);
  assert.equal(accepted, true);
  assert.equal(state.daily.giveGreatCount, 1);
});

test('applyGreat: 수락 시 EXP +GREAT_EXP', () => {
  const now = Date.now();
  const state = makeState(now);
  applyGreat(state, now, deterministicRng);
  assert.equal(state.exp, GREAT_EXP);
});

test('applyGreat: 수락 메시지는 비어있지 않은 문자열', () => {
  const now = Date.now();
  const state = makeState(now);
  const { message } = applyGreat(state, now, deterministicRng);
  assert.equal(typeof message, 'string');
  assert.ok(message.length > 0);
});

test('applyGreat: 연속 수락으로 giveGreatCount 누적', () => {
  const now = Date.now();
  const state = makeState(now);
  applyGreat(state, now, deterministicRng);
  applyGreat(state, now, deterministicRng);
  assert.equal(state.daily.giveGreatCount, 2);
});

// ─── 거부 케이스 ──────────────────────────────────────────────────────────────

test('applyGreat: 한도 초과 시 거부', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveGreatCount = GREAT_DAILY_LIMIT;
  const { accepted } = applyGreat(state, now, deterministicRng);
  assert.equal(accepted, false);
});

test('applyGreat: 거부 시 giveGreatCount 변화 없음', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveGreatCount = GREAT_DAILY_LIMIT;
  applyGreat(state, now, deterministicRng);
  assert.equal(state.daily.giveGreatCount, GREAT_DAILY_LIMIT);
});

test('applyGreat: 거부 시 EXP 변화 없음', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveGreatCount = GREAT_DAILY_LIMIT;
  applyGreat(state, now, deterministicRng);
  assert.equal(state.exp, 0);
});

test('applyGreat: 거부 메시지는 비어있지 않은 문자열', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveGreatCount = GREAT_DAILY_LIMIT;
  const { message } = applyGreat(state, now, deterministicRng);
  assert.equal(typeof message, 'string');
  assert.ok(message.length > 0);
});

// ─── 일일 리셋 케이스 ──────────────────────────────────────────────────────────

test('applyGreat: 어제 한도 초과 → 오늘 리셋 후 수락', () => {
  const now = Date.now();
  const state = makeState(now);
  // 어제 날짜로 설정, 카운터 한도 도달
  state.daily.date = '2000-01-01';
  state.daily.giveGreatCount = GREAT_DAILY_LIMIT;
  const { accepted } = applyGreat(state, now, deterministicRng);
  assert.equal(accepted, true);
  assert.equal(state.daily.giveGreatCount, 1);
});

// ─── 레벨업 케이스 ────────────────────────────────────────────────────────────

test('applyGreat: EXP가 threshold 초과 시 레벨업', () => {
  const now = Date.now();
  const state = makeState(now);
  // threshold(1) = ceil(100 * 1^1.2) = 100
  state.exp = threshold(1) - GREAT_EXP; // 딱 1번 great 후 레벨업
  applyGreat(state, now, deterministicRng);
  assert.equal(state.level, 2);
  assert.equal(state.exp, 0);
});

test('applyGreat: GREAT_EXP는 양수', () => {
  assert.ok(GREAT_EXP > 0);
});

test('applyGreat: GREAT_DAILY_LIMIT은 양수', () => {
  assert.ok(GREAT_DAILY_LIMIT > 0);
});
