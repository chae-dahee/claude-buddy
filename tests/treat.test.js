/**
 * treat.ts 테스트 — applyTreat 로직 검증
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTreat, TREAT_DAILY_LIMIT, TREAT_EXP } from '../dist/cli/treat.js';
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

const deterministicRng = () => 0;

// ─── 수락 케이스 ──────────────────────────────────────────────────────────────

test('applyTreat: 수락 시 giveTreatCount +1', () => {
  const now = Date.now();
  const state = makeState(now);
  const { accepted } = applyTreat(state, now, deterministicRng);
  assert.equal(accepted, true);
  assert.equal(state.daily.giveTreatCount, 1);
});

test('applyTreat: 수락 시 EXP +TREAT_EXP', () => {
  const now = Date.now();
  const state = makeState(now);
  applyTreat(state, now, deterministicRng);
  assert.equal(state.exp, TREAT_EXP);
});

test('applyTreat: 수락 시 lastTreatAt 갱신', () => {
  const now = Date.now();
  const state = makeState(now);
  assert.equal(state.lastTreatAt, 0);
  applyTreat(state, now, deterministicRng);
  assert.equal(state.lastTreatAt, now);
});

test('applyTreat: 수락 메시지는 비어있지 않은 문자열', () => {
  const now = Date.now();
  const state = makeState(now);
  const { message } = applyTreat(state, now, deterministicRng);
  assert.equal(typeof message, 'string');
  assert.ok(message.length > 0);
});

test('applyTreat: 연속 수락으로 giveTreatCount 누적', () => {
  const now = Date.now();
  const state = makeState(now);
  applyTreat(state, now, deterministicRng);
  applyTreat(state, now, deterministicRng);
  assert.equal(state.daily.giveTreatCount, 2);
});

// ─── 거부 케이스 ──────────────────────────────────────────────────────────────

test('applyTreat: 한도 초과 시 거부', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveTreatCount = TREAT_DAILY_LIMIT;
  const { accepted } = applyTreat(state, now, deterministicRng);
  assert.equal(accepted, false);
});

test('applyTreat: 거부 시 giveTreatCount 변화 없음', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveTreatCount = TREAT_DAILY_LIMIT;
  applyTreat(state, now, deterministicRng);
  assert.equal(state.daily.giveTreatCount, TREAT_DAILY_LIMIT);
});

test('applyTreat: 거부 시 EXP 변화 없음', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveTreatCount = TREAT_DAILY_LIMIT;
  applyTreat(state, now, deterministicRng);
  assert.equal(state.exp, 0);
});

test('applyTreat: 거부 시 lastTreatAt 변화 없음', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveTreatCount = TREAT_DAILY_LIMIT;
  applyTreat(state, now, deterministicRng);
  assert.equal(state.lastTreatAt, 0);
});

test('applyTreat: 거부 메시지는 비어있지 않은 문자열', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.giveTreatCount = TREAT_DAILY_LIMIT;
  const { message } = applyTreat(state, now, deterministicRng);
  assert.equal(typeof message, 'string');
  assert.ok(message.length > 0);
});

// ─── 일일 리셋 케이스 ──────────────────────────────────────────────────────────

test('applyTreat: 어제 한도 초과 → 오늘 리셋 후 수락', () => {
  const now = Date.now();
  const state = makeState(now);
  state.daily.date = '2000-01-01';
  state.daily.giveTreatCount = TREAT_DAILY_LIMIT;
  const { accepted } = applyTreat(state, now, deterministicRng);
  assert.equal(accepted, true);
  assert.equal(state.daily.giveTreatCount, 1);
});

// ─── 레벨업 케이스 ────────────────────────────────────────────────────────────

test('applyTreat: EXP가 threshold 초과 시 레벨업', () => {
  const now = Date.now();
  const state = makeState(now);
  // threshold(1) = 100, TREAT_EXP = 15
  state.exp = threshold(1) - TREAT_EXP;
  applyTreat(state, now, deterministicRng);
  assert.equal(state.level, 2);
  assert.equal(state.exp, 0);
});

test('applyTreat: TREAT_EXP는 양수', () => {
  assert.ok(TREAT_EXP > 0);
});

test('applyTreat: TREAT_DAILY_LIMIT은 양수', () => {
  assert.ok(TREAT_DAILY_LIMIT > 0);
});
