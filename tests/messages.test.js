import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickMessage } from '../dist/shared/messages.js';

test('pickMessage returns a non-empty string', () => {
  const msg = pickMessage();
  assert.equal(typeof msg, 'string');
  assert.ok(msg.length > 0);
});

// Use local-hour constructors so behaviour is timezone-independent.
const at = (hour) => new Date(2026, 0, 1, hour, 0, 0);

test('pickMessage with deterministic rng yields stable output', () => {
  const now = at(8);
  assert.equal(pickMessage(now, () => 0), pickMessage(now, () => 0));
});

test('pickMessage routes to time-of-day pool when rng >= 0.5', () => {
  // Force timed pool (rng=0.6). Morning (8h) vs night (3h) yield different pools.
  const morning = pickMessage(at(8), () => 0.6);
  const night   = pickMessage(at(3), () => 0.6);
  assert.notEqual(morning, night);
});

test('pickMessage routes to generic pool when rng < 0.5', () => {
  // rng=0.1 → generic pool, time-of-day irrelevant.
  const a = pickMessage(at(8),  () => 0.1);
  const b = pickMessage(at(22), () => 0.1);
  assert.equal(a, b);
});
