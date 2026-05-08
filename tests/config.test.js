/**
 * Tests for the buddy config system (~/.claude-buddy/config.json).
 * Uses CLAUDE_BUDDY_STATE_DIR to isolate from real user state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
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

test('loadConfig creates config.json on first run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const cfg = loadConfig();
      process.stdout.write(JSON.stringify(cfg));
    `);
    assert.equal(result.status, 0, result.stderr);
    const cfg = JSON.parse(result.stdout);
    assert.ok(typeof cfg.id === 'string' && cfg.id.length > 0);
    assert.equal(cfg.name, 'Buddy');
    assert.ok(typeof cfg.createdAt === 'number' && cfg.createdAt > 0);
    assert.ok(existsSync(join(dir, 'config.json')));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadConfig returns same id on repeated calls', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const a = loadConfig();
      const b = loadConfig();
      process.stdout.write(JSON.stringify({ a, b }));
    `);
    assert.equal(result.status, 0, result.stderr);
    const { a, b } = JSON.parse(result.stdout);
    assert.equal(a.id, b.id);
    assert.equal(a.createdAt, b.createdAt);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadConfig id matches UUID format', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      process.stdout.write(loadConfig().id);
    `);
    assert.equal(result.status, 0, result.stderr);
    const id = result.stdout.trim();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.ok(uuidRe.test(id), `id "${id}" should match UUID format`);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('different installs produce different ids', () => {
  const d1 = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  const d2 = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const r1 = runScript(d1, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      process.stdout.write(loadConfig().id);
    `);
    const r2 = runScript(d2, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      process.stdout.write(loadConfig().id);
    `);
    assert.notEqual(r1.stdout.trim(), r2.stdout.trim());
  } finally {
    rmSync(d1, { recursive: true });
    rmSync(d2, { recursive: true });
  }
});

test('saveConfig persists name change', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig, saveConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const cfg = loadConfig();
      saveConfig({ ...cfg, name: 'Sparky' });
      process.stdout.write(loadConfig().name);
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'Sparky');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
