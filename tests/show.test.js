/**
 * Tests for `claude-buddy show` — standalone terminal buddy display.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const DIST = new URL('../dist', import.meta.url).pathname;

function runShow(stateDir) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', `
      import { runShow } from 'file://${join(DIST, 'cli/show.js')}';
      runShow();
    `],
    {
      encoding: 'utf-8',
      env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: stateDir },
      timeout: 5000,
    }
  );
}

test('show outputs a speech bubble with sprite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-show-'));
  try {
    const result = runShow(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('╭'), 'Should have speech bubble top border');
    assert.ok(result.stdout.includes('╰'), 'Should have speech bubble bottom border');
    assert.ok(result.stdout.includes('\\'), 'Should have bubble-to-sprite connector');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('show output contains level and XP bar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-show-'));
  try {
    const result = runShow(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('Lv.'), 'Should include level');
    assert.ok(result.stdout.match(/\[[\█░]+\]/), 'Should include XP bar');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('show output contains companion name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-show-'));
  try {
    const result = runShow(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('Buddy'), 'Should include default name Buddy');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('show output contains rarity stars', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-show-'));
  try {
    const result = runShow(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('★'), 'Should include rarity stars');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('show uses lastReaction message when available', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-show-'));
  try {
    // Write a state with a lastReaction
    writeFileSync(join(dir, 'state.json'), JSON.stringify({
      name: 'Buddy', mood: 'excited', xp: 50, level: 1,
      lastReaction: '테스트 통과! 야호!', lastUpdated: Date.now(),
    }));
    const result = runShow(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('테스트 통과! 야호!'), 'Should show lastReaction message');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
