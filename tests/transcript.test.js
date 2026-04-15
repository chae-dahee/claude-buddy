import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { extractLastAssistantText } from '../dist/shared/transcript.js';

function writeTmpJsonl(lines) {
  const file = join(tmpdir(), `buddy-transcript-${Date.now()}-${Math.random()}.jsonl`);
  writeFileSync(file, lines.map(l => JSON.stringify(l)).join('\n'), 'utf-8');
  return file;
}

test('returns empty string when file missing', () => {
  assert.equal(extractLastAssistantText('/nonexistent/path.jsonl'), '');
});

test('returns empty string for empty path', () => {
  assert.equal(extractLastAssistantText(''), '');
});

test('parses Format A (message wrapper with role inside)', () => {
  const file = writeTmpJsonl([
    { type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
    { type: 'message', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] } },
  ]);
  assert.equal(extractLastAssistantText(file), 'Hi there!');
  unlinkSync(file);
});

test('parses Format B (direct role at top level)', () => {
  const file = writeTmpJsonl([
    { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'Yo!' }] },
  ]);
  assert.equal(extractLastAssistantText(file), 'Yo!');
  unlinkSync(file);
});

test('returns last assistant message when multiple exist', () => {
  const file = writeTmpJsonl([
    { role: 'assistant', content: [{ type: 'text', text: 'First' }] },
    { role: 'user', content: [{ type: 'text', text: 'ok' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'Second' }] },
  ]);
  assert.equal(extractLastAssistantText(file), 'Second');
  unlinkSync(file);
});

test('returns empty string when no assistant messages', () => {
  const file = writeTmpJsonl([
    { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
  ]);
  assert.equal(extractLastAssistantText(file), '');
  unlinkSync(file);
});

test('skips malformed JSON lines gracefully', () => {
  const file = join(tmpdir(), `buddy-bad-${Date.now()}.jsonl`);
  writeFileSync(file,
    'not json\n' +
    JSON.stringify({ role: 'assistant', content: [{ type: 'text', text: 'Good line' }] }) + '\n'
  );
  assert.equal(extractLastAssistantText(file), 'Good line');
  unlinkSync(file);
});

test('handles string content (non-array)', () => {
  const file = writeTmpJsonl([
    { role: 'assistant', content: 'Plain string content' },
  ]);
  assert.equal(extractLastAssistantText(file), 'Plain string content');
  unlinkSync(file);
});
