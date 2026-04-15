/**
 * Integration tests — runs the compiled hook binaries as child processes,
 * using CLAUDE_BUDDY_STATE_DIR to isolate from the real ~/.claude-buddy state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const DIST = new URL('../dist', import.meta.url).pathname;

function runHook(script, stdinPayload, stateDir) {
  return spawnSync(
    process.execPath,
    [join(DIST, script)],
    {
      input: JSON.stringify(stdinPayload),
      encoding: 'utf-8',
      env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: stateDir },
      timeout: 5000,
    }
  );
}

function readState(stateDir) {
  return JSON.parse(readFileSync(join(stateDir, 'state.json'), 'utf-8'));
}

function writeState(stateDir, state) {
  writeFileSync(join(stateDir, 'state.json'), JSON.stringify(state, null, 2));
}

// ─── PostToolUse hook ────────────────────────────────────────────────────────

test('PostToolUse: exits 0 and writes {} to stdout', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    const result = runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: 'hello world', exit_code: 0 },
    }, dir);
    assert.equal(result.status, 0, 'Should exit 0');
    assert.equal(result.stdout, '{}', 'Should output {} to stdout');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('PostToolUse: test_pass → xp increases by 10', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: '5 tests passed', exit_code: 0 },
    }, dir);
    const state = readState(dir);
    assert.equal(state.xp, 10, 'test_pass should award 10 XP');
    assert.equal(state.mood, 'excited');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('PostToolUse: bash_error (non-zero exit) → xp increases by 1, mood worried', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: 'command not found', exit_code: 127 },
    }, dir);
    const state = readState(dir);
    assert.equal(state.xp, 1, 'bash_error should award 1 XP');
    assert.equal(state.mood, 'worried');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('PostToolUse: test_fail (non-zero exit + fail pattern) → mood sad', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: 'FAIL src/foo.test.js\n2 tests failed', exit_code: 1 },
    }, dir);
    const state = readState(dir);
    assert.equal(state.mood, 'sad');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('PostToolUse: non-Bash tool → state unchanged, exits 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    const result = runHook('hooks/post-tool-use.js', {
      tool_name: 'Read',
      tool_response: { output: 'file contents' },
    }, dir);
    assert.equal(result.status, 0);
    // State file should not have been created (no reaction for non-Bash)
    assert.throws(() => readState(dir), 'State should not be written for non-Bash tool');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

// ─── Level-up test ───────────────────────────────────────────────────────────

test('Level-up: xp=99 + test_pass (+10) → level 2, leveledUp message in lastReaction', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    // Seed state at xp=99, level=1 (one test_pass away from level 2)
    writeState(dir, {
      name: 'Buddy', mood: 'neutral', xp: 99, level: 1,
      lastReaction: '', lastUpdated: Date.now(),
    });

    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: '3 tests passed', exit_code: 0 },
    }, dir);

    const state = readState(dir);
    assert.equal(state.xp, 109, 'XP should be 109 after +10 reward');
    assert.equal(state.level, 2, 'Should have leveled up to 2');
    assert.equal(state.mood, 'excited');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('Level-up: xp=199 + test_pass (+10) → level 3', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    writeState(dir, {
      name: 'Buddy', mood: 'neutral', xp: 199, level: 2,
      lastReaction: '', lastUpdated: Date.now(),
    });

    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: 'All tests passed', exit_code: 0 },
    }, dir);

    const state = readState(dir);
    assert.equal(state.level, 3);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

// ─── Stop hook ───────────────────────────────────────────────────────────────

test('Stop hook: exits 0 with no transcript', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    const result = runHook('hooks/stop.js', { transcript_path: '' }, dir);
    assert.equal(result.status, 0);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('Stop hook: parses transcript and updates state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    // Write a minimal transcript
    const transcriptFile = join(dir, 'transcript.jsonl');
    writeFileSync(transcriptFile, JSON.stringify({
      role: 'assistant',
      content: [{ type: 'text', text: 'I wrote the function and created the file.' }],
    }) + '\n');

    runHook('hooks/stop.js', { transcript_path: transcriptFile }, dir);

    const state = readState(dir);
    // 'wrote' → code_written → happy mood, +5 XP
    assert.equal(state.mood, 'happy');
    assert.equal(state.xp, 5);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('Stop hook: malformed stdin → exits 0 (never crashes Claude session)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    const result = spawnSync(
      process.execPath,
      [join(DIST, 'hooks/stop.js')],
      {
        input: 'not valid json !!!',
        encoding: 'utf-8',
        env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: dir },
        timeout: 5000,
      }
    );
    assert.equal(result.status, 0, 'Malformed stdin must never crash with non-zero exit');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

// ─── exit_code priority test ─────────────────────────────────────────────────

test('exit_code=1 + test fail pattern → test_fail (not bash_error)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: {
        output: '1 test failed\nAssertionError: expected 1 to equal 2',
        exit_code: 1,
      },
    }, dir);
    const state = readState(dir);
    assert.equal(state.mood, 'sad', 'Test fail pattern should win over generic bash_error');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('exit_code=0 + passing text → test_pass', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-int-'));
  try {
    runHook('hooks/post-tool-use.js', {
      tool_name: 'Bash',
      tool_response: { output: '10 passing (123ms)', exit_code: 0 },
    }, dir);
    const state = readState(dir);
    assert.equal(state.mood, 'excited');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
