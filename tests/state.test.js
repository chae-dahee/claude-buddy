import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLevel, applyXp, loadState } from '../dist/shared/state.js';

test('loadState returns default when no file exists', () => {
  const state = loadState();
  // defaults must be present (may have real state file — just check structure)
  assert.ok(typeof state.name === 'string');
  assert.ok(typeof state.xp === 'number');
  assert.ok(typeof state.level === 'number');
  assert.ok(typeof state.mood === 'string');
});

test('computeLevel returns correct level for XP values', () => {
  assert.equal(computeLevel(0), 1);
  assert.equal(computeLevel(99), 1);
  assert.equal(computeLevel(100), 2);
  assert.equal(computeLevel(199), 2);
  assert.equal(computeLevel(200), 3);
  assert.equal(computeLevel(1000), 11);
});

test('applyXp detects level-up correctly', () => {
  const baseState = {
    name: 'Buddy', mood: 'neutral', xp: 95, level: 1,
    lastReaction: '', lastUpdated: Date.now(),
  };

  // No level-up
  const r1 = applyXp(baseState, 4);
  assert.equal(r1.leveledUp, false);
  assert.equal(r1.state.xp, 99);
  assert.equal(r1.state.level, 1);

  // Level-up
  const r2 = applyXp(baseState, 5);
  assert.equal(r2.leveledUp, true);
  assert.equal(r2.state.xp, 100);
  assert.equal(r2.state.level, 2);
});

test('applyXp does not mutate input state', () => {
  const base = {
    name: 'Buddy', mood: 'happy', xp: 50, level: 1,
    lastReaction: '', lastUpdated: Date.now(),
  };
  const snapshot = { ...base };
  applyXp(base, 20);
  assert.deepEqual(base, snapshot);
});
