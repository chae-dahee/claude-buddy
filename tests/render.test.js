import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSpeechBubble, renderStatusLine, renderLevelUp, xpBar, FACES } from '../dist/shared/render.js';

const baseState = {
  name: 'Buddy', mood: 'neutral', xp: 45, level: 1,
  lastReaction: 'Hello!', lastUpdated: Date.now(),
};

test('xpBar: 0 XP = all empty', () => {
  assert.equal(xpBar(0), '░░░░░░░░░░');
});

test('xpBar: 50 XP = half filled', () => {
  assert.equal(xpBar(50), '█████░░░░░');
});

test('xpBar: 100 XP wraps to 0 progress (level reset)', () => {
  assert.equal(xpBar(100), '░░░░░░░░░░');
});

test('xpBar: 95 XP = 9 filled', () => {
  assert.equal(xpBar(95), '█████████░');
});

test('xpBar: always returns exactly 10 characters', () => {
  for (const xp of [0, 1, 50, 99, 100, 150, 999]) {
    const bar = xpBar(xp);
    assert.equal([...bar].length, 10, `xpBar(${xp}) length should be 10`);
  }
});

test('FACES has all 6 mood entries with 3 lines each', () => {
  const moods = ['neutral', 'happy', 'excited', 'worried', 'sad', 'tired'];
  for (const mood of moods) {
    assert.ok(FACES[mood], `Missing face for mood: ${mood}`);
    assert.equal(FACES[mood].length, 3, `Face for ${mood} should have 3 lines`);
  }
});

test('renderSpeechBubble contains message, name, level, XP', () => {
  const out = renderSpeechBubble(baseState, 'Hello!');
  assert.ok(out.includes('Hello!'), 'Should contain message');
  assert.ok(out.includes('Buddy'), 'Should contain name');
  assert.ok(out.includes('Lv.1'), 'Should contain level');
  assert.ok(out.includes('XP'), 'Should contain XP label');
});

test('renderSpeechBubble is multi-line', () => {
  const out = renderSpeechBubble(baseState, 'Hi');
  assert.ok(out.includes('\n'), 'Should be multi-line');
});

test('renderStatusLine is a single line', () => {
  const out = renderStatusLine(baseState);
  assert.ok(!out.includes('\n'), 'Should be single line');
  assert.ok(out.includes('Buddy'));
  assert.ok(out.includes('Lv.1'));
});

test('renderStatusLine changes with mood', () => {
  const happy = renderStatusLine({ ...baseState, mood: 'happy' });
  const sad = renderStatusLine({ ...baseState, mood: 'sad' });
  assert.notEqual(happy, sad, 'Different moods should produce different status lines');
});

test('renderLevelUp contains new level', () => {
  const state = { ...baseState, level: 3 };
  const out = renderLevelUp(state);
  assert.ok(out.includes('Lv.3'), 'Should mention new level');
  assert.ok(out.includes('LEVEL UP'), 'Should say LEVEL UP');
});
