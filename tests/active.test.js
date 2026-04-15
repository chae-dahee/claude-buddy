/**
 * Tests for `claude-buddy active on|off` CLI command.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
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

test('runActive("off") sets active to false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-active-'));
  try {
    const result = runScript(dir, `
      import { runActive } from 'file://${join(DIST, 'cli/active.js')}';
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      runActive(['off']);
      const cfg = loadConfig();
      // Write last so we can extract it from stdout alongside console.log output
      process.stderr.write(String(cfg.active));
    `);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr.trim(), 'false', 'active should be false after "off"');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('runActive("on") sets active to true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-active-'));
  try {
    const result = runScript(dir, `
      import { runActive } from 'file://${join(DIST, 'cli/active.js')}';
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      runActive(['off']);
      runActive(['on']);
      const cfg = loadConfig();
      process.stderr.write(String(cfg.active));
    `);
    assert.equal(result.status, 0, result.stdout);
    assert.equal(result.stderr.trim(), 'true', 'active should be true after "on"');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('runActive with invalid arg exits with code 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-active-'));
  try {
    const result = runScript(dir, `
      import { runActive } from 'file://${join(DIST, 'cli/active.js')}';
      runActive(['maybe']);
    `);
    assert.equal(result.status, 1, 'Should exit 1 on invalid argument');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('runActive with no args exits with code 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-active-'));
  try {
    const result = runScript(dir, `
      import { runActive } from 'file://${join(DIST, 'cli/active.js')}';
      runActive([]);
    `);
    assert.equal(result.status, 1, 'Should exit 1 with no argument');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('status-line outputs full sprite when active=true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-active-'));
  try {
    const result = runScript(dir, `
      import { runActive } from 'file://${join(DIST, 'cli/active.js')}';
      runActive(['on']);
    `);
    assert.equal(result.status, 0, result.stderr);

    // Run status-line directly
    const slResult = spawnSync(
      process.execPath,
      [join(DIST, 'statusline/status-line.js')],
      {
        encoding: 'utf-8',
        env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: dir },
        timeout: 5000,
      }
    );
    assert.equal(slResult.status, 0, slResult.stderr);
    assert.ok(slResult.stdout.includes('╭'), 'Should output speech bubble top border');
    assert.ok(slResult.stdout.includes('Lv.'), 'Should output level info');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('status-line outputs empty string when active=false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-active-'));
  try {
    const result = runScript(dir, `
      import { runActive } from 'file://${join(DIST, 'cli/active.js')}';
      runActive(['off']);
    `);
    assert.equal(result.status, 0, result.stderr);

    // Run status-line directly
    const slResult = spawnSync(
      process.execPath,
      [join(DIST, 'statusline/status-line.js')],
      {
        encoding: 'utf-8',
        env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: dir },
        timeout: 5000,
      }
    );
    assert.equal(slResult.status, 0, slResult.stderr);
    assert.equal(slResult.stdout, '', 'Should output empty string when inactive');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
