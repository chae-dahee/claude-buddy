/**
 * Tests for the independent buddy config system (~/.claude-buddy/config.json).
 * Uses CLAUDE_BUDDY_STATE_DIR to isolate from real user state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const DIST = new URL('../dist', import.meta.url).pathname;

/** Run a small inline Node script with an isolated state dir */
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

// ─── loadConfig ───────────────────────────────────────────────────────────────

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
    assert.ok(typeof cfg.id === 'string' && cfg.id.length > 0, 'id should be a non-empty string');
    assert.equal(cfg.name, 'Buddy', 'default name should be Buddy');
    assert.ok(typeof cfg.createdAt === 'number' && cfg.createdAt > 0, 'createdAt should be a timestamp');
    assert.ok(existsSync(join(dir, 'config.json')), 'config.json should be created on disk');
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
    assert.equal(a.id, b.id, 'id should be stable across calls');
    assert.equal(a.name, b.name);
    assert.equal(a.createdAt, b.createdAt);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadConfig id looks like a UUID', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const cfg = loadConfig();
      process.stdout.write(cfg.id);
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
  const dir1 = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  const dir2 = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const r1 = runScript(dir1, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      process.stdout.write(loadConfig().id);
    `);
    const r2 = runScript(dir2, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      process.stdout.write(loadConfig().id);
    `);
    assert.equal(r1.status, 0);
    assert.equal(r2.status, 0);
    assert.notEqual(r1.stdout.trim(), r2.stdout.trim(), 'Different installs should get different IDs');
  } finally {
    rmSync(dir1, { recursive: true });
    rmSync(dir2, { recursive: true });
  }
});

test('saveConfig persists changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig, saveConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const cfg = loadConfig();
      saveConfig({ ...cfg, name: 'Sparky' });
      const reloaded = loadConfig();
      process.stdout.write(reloaded.name);
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'Sparky');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadConfig defaults active to true on fresh install', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const cfg = loadConfig();
      process.stdout.write(String(cfg.active));
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'true', 'active should default to true');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadConfig treats missing active field in existing config as true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-cfg-'));
  try {
    // Write a config without the active field (simulates old config format)
    writeFileSync(join(dir, 'config.json'), JSON.stringify({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: 'OldBuddy',
      createdAt: 1700000000000,
    }));
    const result = runScript(dir, `
      import { loadConfig } from 'file://${join(DIST, 'shared/config.js')}';
      const cfg = loadConfig();
      process.stdout.write(JSON.stringify({ active: cfg.active, name: cfg.name }));
    `);
    assert.equal(result.status, 0, result.stderr);
    const { active, name } = JSON.parse(result.stdout);
    assert.equal(active, true, 'missing active field should default to true');
    assert.equal(name, 'OldBuddy', 'existing name should be preserved');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
