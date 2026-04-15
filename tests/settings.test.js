import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installBuddy, uninstallBuddy } from '../dist/cli/settings.js';

test('installBuddy: adds statusLineCommand and hooks to empty settings', () => {
  const result = installBuddy({});
  assert.ok(result.statusLineCommand, 'Should set statusLineCommand');
  assert.ok(result.hooks?.PostToolUse?.length, 'Should add PostToolUse hook');
  assert.ok(result.hooks?.Stop?.length, 'Should add Stop hook');
});

test('installBuddy: PostToolUse hook has Bash matcher', () => {
  const result = installBuddy({});
  const buddyHook = result.hooks?.PostToolUse?.find(h => h.__claude_buddy__);
  assert.equal(buddyHook?.matcher, 'Bash');
});

test('installBuddy: preserves existing keys', () => {
  const existing = { theme: 'dark', autoUpdates: false };
  const result = installBuddy(existing);
  assert.equal(result.theme, 'dark');
  assert.equal(result.autoUpdates, false);
});

test('installBuddy: does not duplicate buddy hooks on re-install', () => {
  const once = installBuddy({});
  const twice = installBuddy(once);
  const buddyCount = (twice.hooks?.PostToolUse ?? [])
    .filter(h => h.__claude_buddy__).length;
  assert.equal(buddyCount, 1, 'Should not duplicate PostToolUse buddy hook');
});

test('uninstallBuddy: removes buddy keys, preserves others', () => {
  const installed = installBuddy({ theme: 'dark' });
  const uninstalled = uninstallBuddy(installed);
  assert.equal(uninstalled.statusLineCommand, undefined);
  assert.equal(uninstalled.theme, 'dark');
  const remaining = (uninstalled.hooks?.PostToolUse ?? [])
    .filter(h => h.__claude_buddy__).length;
  assert.equal(remaining, 0);
});

test('uninstallBuddy: cleans up hooks entirely when empty', () => {
  const installed = installBuddy({});
  const uninstalled = uninstallBuddy(installed);
  assert.equal(uninstalled.hooks, undefined);
});

test('uninstallBuddy: preserves pre-existing non-buddy hooks', () => {
  const existing = {
    hooks: {
      PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'echo hi' }] }],
    },
  };
  const installed = installBuddy(existing);
  const uninstalled = uninstallBuddy(installed);
  assert.equal(uninstalled.hooks?.PostToolUse?.length, 1, 'Pre-existing hook should survive');
  assert.equal(uninstalled.hooks?.PostToolUse?.[0].matcher, 'Write');
});
