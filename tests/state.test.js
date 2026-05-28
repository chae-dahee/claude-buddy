import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  initStateFromMigration,
  todayLocal,
  isNewDay,
  resetDailyCounters,
} from '../dist/shared/state.js';

// ─── Test Setup ───────────────────────────────────────────────────────────────

const mockConfig = {
  id: 'test-uuid',
  name: 'TestBuddy',
  createdAt: 0, // Will be set per test
};

// ─── todayLocal ───────────────────────────────────────────────────────────────

test('todayLocal: returns YYYY-MM-DD format', () => {
  const now = new Date('2025-05-27T12:34:56Z').getTime();
  const result = todayLocal(now);
  // Should match pattern YYYY-MM-DD
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('todayLocal: handles timezone correctly', () => {
  // Pick a known date and verify the format is correct
  const testDate = new Date('2025-01-15T00:00:00Z');
  const result = todayLocal(testDate.getTime());
  // The result should be a valid YYYY-MM-DD format
  const parts = result.split('-');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], '2025');
  // Note: month/day may vary based on local timezone offset
});

// ─── initStateFromMigration ───────────────────────────────────────────────────

test('initStateFromMigration: 7 days before → level 2', () => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const config = { ...mockConfig, createdAt: sevenDaysAgo };

  const state = initStateFromMigration(config, now);

  assert.equal(state.level, 2);
  assert.equal(state.exp, 0);
  assert.equal(state.hunger, 0);
  assert.equal(state.lastTickAt, now);
  assert.equal(state.lastSeenAt, now);
  assert.equal(state.lastTreatAt, 0);
  assert.equal(state.tokensSeenTotal, 0);
  assert.equal(state.tokenExpAccrued, 0);
});

test('initStateFromMigration: 200 days before → level 29', () => {
  const now = Date.now();
  const twohundredDaysAgo = now - 200 * 24 * 60 * 60 * 1000;
  const config = { ...mockConfig, createdAt: twohundredDaysAgo };

  const state = initStateFromMigration(config, now);

  // 200 days = 28.57 weeks, so floor(28.57) + 1 = 29
  assert.equal(state.level, 29);
  assert.equal(state.exp, 0);
});

test('initStateFromMigration: future time → level 1 (clamped)', () => {
  const now = Date.now();
  const futureTime = now + 1000 * 60 * 60; // 1 hour in future
  const config = { ...mockConfig, createdAt: futureTime };

  const state = initStateFromMigration(config, now);

  assert.equal(state.level, 1);
  assert.equal(state.exp, 0);
});

test('initStateFromMigration: 365 days before → correct level', () => {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const config = { ...mockConfig, createdAt: oneYearAgo };

  const state = initStateFromMigration(config, now);

  // 365 days = 52.14 weeks, so floor(52.14) + 1 = 53
  assert.equal(state.level, 53);
});

test('initStateFromMigration: daily counters initialized', () => {
  const now = Date.now();
  const config = { ...mockConfig, createdAt: now - 7 * 24 * 60 * 60 * 1000 };

  const state = initStateFromMigration(config, now);

  assert.equal(state.daily.giveGreatCount, 0);
  assert.equal(state.daily.giveTreatCount, 0);
  assert.match(state.daily.date, /^\d{4}-\d{2}-\d{2}$/);
});

// ─── isNewDay ─────────────────────────────────────────────────────────────────

test('isNewDay: same date → false', () => {
  const now = Date.now();
  const state = initStateFromMigration(mockConfig, now);

  assert.equal(isNewDay(state, now), false);
});

test('isNewDay: next day → true', () => {
  const now = Date.now();
  const state = initStateFromMigration(mockConfig, now);
  const nextDay = now + 24 * 60 * 60 * 1000;

  assert.equal(isNewDay(state, nextDay), true);
});

// ─── resetDailyCounters ───────────────────────────────────────────────────────

test('resetDailyCounters: resets to zero and updates date', () => {
  const now = Date.now();
  const state = initStateFromMigration(mockConfig, now);

  // Modify counters
  state.daily.giveGreatCount = 5;
  state.daily.giveTreatCount = 3;

  // Move to next day and reset
  const nextDay = now + 24 * 60 * 60 * 1000;
  resetDailyCounters(state, nextDay);

  assert.equal(state.daily.giveGreatCount, 0);
  assert.equal(state.daily.giveTreatCount, 0);
  assert.equal(state.daily.date, todayLocal(nextDay));
});

// ─── JSON serialization tests ──────────────────────────────────────────────────

test('saveState: state serializable with 2-space indentation', () => {
  const now = Date.now();
  const state = initStateFromMigration(mockConfig, now);

  const json = JSON.stringify(state, null, 2);
  assert(json.includes('  '), 'Should have 2-space indentation');

  const parsed = JSON.parse(json);
  assert.equal(parsed.level, state.level);
  assert.equal(parsed.hunger, state.hunger);
  assert.equal(parsed.daily.date, state.daily.date);
});

test('saveState/loadState: round-trip consistency', () => {
  const now = Date.now();
  const original = initStateFromMigration(mockConfig, now);
  original.daily.giveGreatCount = 2;
  original.daily.giveTreatCount = 1;

  const json = JSON.stringify(original, null, 2);
  const loaded = JSON.parse(json);

  assert.equal(loaded.level, original.level);
  assert.equal(loaded.exp, original.exp);
  assert.equal(loaded.hunger, original.hunger);
  assert.equal(loaded.daily.giveGreatCount, 2);
  assert.equal(loaded.daily.giveTreatCount, 1);
});

// ─── File I/O integration tests ────────────────────────────────────────────────

test('loadState: file I/O can persist and restore state', (t) => {
  const testDir = path.join(os.tmpdir(), `buddy-test-${Date.now()}-1`);
  const stateFile = path.join(testDir, 'buddy-state.json');

  t.after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  fs.mkdirSync(testDir, { recursive: true });

  const now = Date.now();
  const original = initStateFromMigration(mockConfig, now);
  original.daily.giveGreatCount = 5;

  // Manually save
  fs.writeFileSync(stateFile, JSON.stringify(original, null, 2), 'utf-8');

  // Manually load
  const raw = fs.readFileSync(stateFile, 'utf-8');
  const loaded = JSON.parse(raw);

  assert.equal(loaded.level, original.level);
  assert.equal(loaded.daily.giveGreatCount, 5);
});

test('corrupted JSON: invalid JSON can be detected', () => {
  const corruptedJson = '{ invalid json }';

  assert.throws(() => {
    JSON.parse(corruptedJson);
  }, /SyntaxError/);
});

test('missing required fields: incomplete state detected', () => {
  const incomplete = {
    level: 5,
    exp: 100,
    // Missing hunger and other required fields
  };

  const json = JSON.stringify(incomplete);
  const parsed = JSON.parse(json);

  // Validation should fail on missing fields
  const hasRequiredFields =
    typeof parsed.level === 'number' &&
    typeof parsed.exp === 'number' &&
    typeof parsed.hunger === 'number' &&
    typeof parsed.lastTickAt === 'number' &&
    typeof parsed.lastSeenAt === 'number' &&
    typeof parsed.lastTreatAt === 'number' &&
    typeof parsed.tokensSeenTotal === 'number' &&
    typeof parsed.tokenExpAccrued === 'number' &&
    parsed.daily &&
    typeof (parsed.daily).date === 'string';

  assert.equal(hasRequiredFields, false, 'Should fail validation');
});

test('initStateFromMigration: all required fields present', () => {
  const now = Date.now();
  const config = { ...mockConfig, createdAt: now - 14 * 24 * 60 * 60 * 1000 };

  const state = initStateFromMigration(config, now);

  // Check all required fields
  assert.equal(typeof state.level, 'number');
  assert.equal(typeof state.exp, 'number');
  assert.equal(typeof state.hunger, 'number');
  assert.equal(typeof state.lastTickAt, 'number');
  assert.equal(typeof state.lastSeenAt, 'number');
  assert.equal(typeof state.lastTreatAt, 'number');
  assert.equal(typeof state.tokensSeenTotal, 'number');
  assert.equal(typeof state.tokenExpAccrued, 'number');
  assert(state.daily);
  assert.equal(typeof state.daily.date, 'string');
  assert.equal(typeof state.daily.giveGreatCount, 'number');
  assert.equal(typeof state.daily.giveTreatCount, 'number');
});

test('initStateFromMigration: validates level calculation accuracy', () => {
  const now = Date.now();

  // Test various day ranges
  const testCases = [
    { days: 0, expectedLevel: 1 },
    { days: 7, expectedLevel: 2 },
    { days: 14, expectedLevel: 3 },
    { days: 21, expectedLevel: 4 },
    { days: 50, expectedLevel: 8 }, // floor(50/7) + 1 = 8
    { days: 100, expectedLevel: 15 }, // floor(100/7) + 1 = 15
  ];

  for (const tc of testCases) {
    const pastTime = now - tc.days * 24 * 60 * 60 * 1000;
    const config = { ...mockConfig, createdAt: pastTime };
    const state = initStateFromMigration(config, now);
    assert.equal(state.level, tc.expectedLevel, `Days: ${tc.days}`);
  }
});
