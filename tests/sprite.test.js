/**
 * Tests for `claude-buddy sprite on|off` CLI and the conditional /dev/tty
 * write in the Stop hook.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const DIST = new URL('../dist', import.meta.url).pathname;

function runScript(stateDir, script) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      encoding: 'utf-8',
      env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: stateDir },
      timeout: 5000,
    }
  );
}

function runStopHook(stateDir, transcriptPath) {
  return spawnSync(
    process.execPath,
    [join(DIST, 'hooks/stop.js')],
    {
      input: JSON.stringify({ transcript_path: transcriptPath }),
      encoding: 'utf-8',
      env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: stateDir },
      timeout: 5000,
    }
  );
}

// ─── CLI toggle ──────────────────────────────────────────────────────────────

test('runSprite("on") sets sprite to true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-sprite-'));
  try {
    const result = runScript(dir, `
      import { runSprite } from 'file://${join(DIST, 'cli/sprite.js')}';
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      runSprite(['on']);
      process.stderr.write(String(loadConfig().sprite));
    `);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr.trim(), 'true', 'sprite should be true after "on"');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('runSprite("off") sets sprite to false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-sprite-'));
  try {
    const result = runScript(dir, `
      import { runSprite } from 'file://${join(DIST, 'cli/sprite.js')}';
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      runSprite(['on']);
      runSprite(['off']);
      process.stderr.write(String(loadConfig().sprite));
    `);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr.trim(), 'false', 'sprite should be false after "off"');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('runSprite with invalid arg exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-sprite-'));
  try {
    const result = runScript(dir, `
      import { runSprite } from 'file://${join(DIST, 'cli/sprite.js')}';
      runSprite(['perhaps']);
    `);
    assert.equal(result.status, 1);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('default config has sprite=false (compact-only behavior preserved)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-sprite-'));
  try {
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      process.stderr.write(String(loadConfig().sprite));
    `);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr.trim(), 'false', 'sprite default must be false');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

// ─── Stop hook conditional behavior ──────────────────────────────────────────
//
// We can't easily intercept /dev/tty from a child process in tests, but we CAN
// verify the hook exits cleanly under both flag states and that state.json
// updates happen regardless. The /dev/tty write itself is fire-and-forget; the
// behavior we care about (state persistence and exit code) is testable.

test('Stop hook: sprite=false → exits 0, state still updated', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-sprite-'));
  try {
    runScript(dir, `
      import { runSprite } from 'file://${join(DIST, 'cli/sprite.js')}';
      runSprite(['off']);
    `);
    const transcript = join(dir, 'transcript.jsonl');
    writeFileSync(transcript, JSON.stringify({
      role: 'assistant',
      content: [{ type: 'text', text: 'I wrote the function.' }],
    }) + '\n');

    const result = runStopHook(dir, transcript);
    assert.equal(result.status, 0);

    const state = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf-8'));
    assert.equal(state.mood, 'happy', 'state.mood should still update');
    assert.ok(state.lastReaction, 'state.lastReaction should be set');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('Stop hook: sprite=true → exits 0, state still updated (write-to-tty is best-effort)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-sprite-'));
  try {
    runScript(dir, `
      import { runSprite } from 'file://${join(DIST, 'cli/sprite.js')}';
      runSprite(['on']);
    `);
    const transcript = join(dir, 'transcript.jsonl');
    writeFileSync(transcript, JSON.stringify({
      role: 'assistant',
      content: [{ type: 'text', text: 'I wrote the function.' }],
    }) + '\n');

    const result = runStopHook(dir, transcript);
    assert.equal(result.status, 0);

    const state = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf-8'));
    assert.equal(state.mood, 'happy');
    assert.ok(state.lastReaction);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
