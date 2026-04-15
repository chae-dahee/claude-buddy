import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPostToolReaction, detectStopReaction, REACTION_MAP } from '../dist/shared/mood.js';

// --- PostToolUse ---

test('detectPostToolReaction: bash error → bash_error', () => {
  const payload = {
    tool_name: 'Bash',
    tool_response: { error: 'command not found', output: '' },
  };
  assert.equal(detectPostToolReaction(payload), 'bash_error');
});

test('detectPostToolReaction: test pass output → test_pass', () => {
  const payload = {
    tool_name: 'Bash',
    tool_response: { output: '3 tests passed\n✓ all green' },
  };
  assert.equal(detectPostToolReaction(payload), 'test_pass');
});

test('detectPostToolReaction: jest fail output → test_fail', () => {
  const payload = {
    tool_name: 'Bash',
    tool_response: { output: 'FAIL src/foo.test.js\n2 tests failed' },
  };
  assert.equal(detectPostToolReaction(payload), 'test_fail');
});

test('detectPostToolReaction: plain output → idle', () => {
  const payload = {
    tool_name: 'Bash',
    tool_response: { output: 'hello world' },
  };
  assert.equal(detectPostToolReaction(payload), 'idle');
});

test('detectPostToolReaction: no tool_response → idle', () => {
  const payload = { tool_name: 'Bash' };
  assert.equal(detectPostToolReaction(payload), 'idle');
});

// --- Stop hook ---

test('detectStopReaction: error mention → error_mentioned', () => {
  assert.equal(detectStopReaction('There was an error in the build'), 'error_mentioned');
});

test('detectStopReaction: refactor mention → refactor', () => {
  assert.equal(detectStopReaction('I refactored the module structure'), 'refactor');
});

test('detectStopReaction: code block → code_written', () => {
  assert.equal(
    detectStopReaction('Here is the implementation:\n```js\nconsole.log("hi")\n```'),
    'code_written'
  );
});

test('detectStopReaction: plain explanation → explanation', () => {
  assert.equal(detectStopReaction('This is how the system works in detail.'), 'explanation');
});

test('detectStopReaction: empty string → idle', () => {
  assert.equal(detectStopReaction(''), 'idle');
});

test('detectStopReaction: whitespace only → idle', () => {
  assert.equal(detectStopReaction('   \n  '), 'idle');
});

// --- REACTION_MAP completeness ---

test('REACTION_MAP has entries for all 8 reaction types', () => {
  const expected = [
    'test_pass', 'code_written', 'refactor', 'explanation',
    'idle', 'bash_error', 'test_fail', 'error_mentioned',
  ];
  for (const key of expected) {
    assert.ok(REACTION_MAP[key], `Missing reaction: ${key}`);
    assert.ok(REACTION_MAP[key].messages.length > 0, `Empty messages for: ${key}`);
  }
});

test('REACTION_MAP XP rewards are positive numbers', () => {
  for (const [key, config] of Object.entries(REACTION_MAP)) {
    assert.ok(config.xpReward > 0, `${key} should have positive XP reward`);
  }
});
