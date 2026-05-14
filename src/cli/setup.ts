import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { RARITY_STARS, renderFaceInline } from '../shared/render.js';

const STATUSLINE_MARKER = 'command -v claude-buddy &>/dev/null && claude-buddy statusline';
const MIGRATION_PREFIX = '# claude-buddy:migrated=';
const SHEBANG = '#!/usr/bin/env bash';

function claudeConfigDir(): string {
  return process.env['CLAUDE_CONFIG_DIR'] ?? path.join(os.homedir(), '.claude');
}

function statuslineScriptPath(): string {
  return path.join(claudeConfigDir(), 'statusline.sh');
}

function userStatuslineScriptPath(): string {
  return path.join(claudeConfigDir(), 'statusline-user.sh');
}

function settingsJsonPath(): string {
  return path.join(claudeConfigDir(), 'settings.json');
}

function readSettings(): Record<string, unknown> | null {
  const p = settingsJsonPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
  } catch {
    console.warn('  ⚠ Could not parse settings.json — skipping statusLine injection.');
    return null;
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  fs.writeFileSync(settingsJsonPath(), JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

function ensureScript(scriptPath: string): void {
  if (!fs.existsSync(scriptPath)) {
    fs.writeFileSync(scriptPath, `${SHEBANG}\n`, 'utf-8');
    fs.chmodSync(scriptPath, 0o755);
  }
}

function buildBuddyLines(
  theirCmd: string,
  layout: 'sequential' | 'side-by-side',
): string[] {
  if (layout === 'side-by-side') {
    return [
      `${MIGRATION_PREFIX}${theirCmd}`,
      `_cb_in=$(cat)`,
      `_cb_b=$(command -v claude-buddy &>/dev/null && claude-buddy statusline </dev/null)`,
      `_cb_t=$(printf '%s\\n' "$_cb_in" | ${theirCmd})`,
      `paste -d ' ' <(printf '%s\\n' "$_cb_b") <(printf '%s\\n' "$_cb_t")`,
    ];
  }
  return [
    `${MIGRATION_PREFIX}${theirCmd}`,
    `_cb_in=$(cat)`,
    `printf '%s\\n' "$_cb_in" | ${theirCmd}`,
    `${STATUSLINE_MARKER} </dev/null`,
  ];
}

function isBuddyLine(l: string, theirCmd: string | null): boolean {
  if (l.startsWith(MIGRATION_PREFIX)) return true;
  if (l.includes(STATUSLINE_MARKER)) return true;
  if (l.includes('_cb_')) return true;
  if (theirCmd !== null && l === theirCmd) return true;
  return false;
}

function injectSettings(scriptPath: string, layout: 'sequential' | 'side-by-side'): void {
  const settings = readSettings();
  if (settings === null) return;
  const existing = settings['statusLine'] as Record<string, unknown> | undefined;
  const buddyCmd = `bash ${scriptPath}`;
  const userScriptPath = userStatuslineScriptPath();
  const fileContent = fs.readFileSync(scriptPath, 'utf-8');
  const lines = fileContent.split('\n');

  // theirCmd priority: MIGRATION_PREFIX line > settings.json (non-buddy) > user's custom script at buddy path
  const migrationLine = lines.find((l) => l.startsWith(MIGRATION_PREFIX));
  const hasNonBuddyContent = lines.some(
    (l) => l.trim() && !l.startsWith('#!') && !isBuddyLine(l, null),
  );

  let theirCmd: string | null = null;
  let isCustomScriptMigration = false;

  if (migrationLine) {
    theirCmd = migrationLine.slice(MIGRATION_PREFIX.length);
  } else if (typeof existing?.['command'] === 'string' && existing['command'] !== buddyCmd) {
    theirCmd = existing['command'];
  } else if (existing?.['command'] === buddyCmd && hasNonBuddyContent) {
    // User wrote their own script at the buddy path. Save it (minus any buddy lines)
    // so the wrapper can call it back.
    const userContent = lines.filter((l) => !isBuddyLine(l, null)).join('\n');
    fs.writeFileSync(userScriptPath, userContent, 'utf-8');
    fs.chmodSync(userScriptPath, 0o755);
    theirCmd = `bash ${userScriptPath}`;
    isCustomScriptMigration = true;
  }

  let finalContent: string;
  if (theirCmd) {
    const buddyLines = buildBuddyLines(theirCmd, layout);
    if (isCustomScriptMigration) {
      // Replace file entirely — original content is saved in statusline-user.sh.
      const shebang = lines[0]?.startsWith('#!') ? lines[0] : SHEBANG;
      finalContent = [shebang, ...buddyLines].join('\n') + '\n';
    } else {
      const cleaned = lines.filter((l) => !isBuddyLine(l, theirCmd));
      const insertAt = cleaned[0]?.startsWith('#!') ? 1 : 0;
      cleaned.splice(insertAt, 0, ...buddyLines);
      finalContent = cleaned.join('\n');
    }
  } else {
    const cleaned = lines.filter((l) => !isBuddyLine(l, null));
    const insertAt = cleaned[0]?.startsWith('#!') ? 1 : 0;
    cleaned.splice(insertAt, 0, STATUSLINE_MARKER);
    finalContent = cleaned.join('\n');
  }

  fs.writeFileSync(scriptPath, finalContent, 'utf-8');
  const alreadySet = existing?.['command'] === buddyCmd;
  settings['statusLine'] = { type: 'command', command: buddyCmd };
  writeSettings(settings);

  if (isCustomScriptMigration) {
    console.log('✓ Saved your statusline.sh to statusline-user.sh.');
    console.log('✓ statusline.sh rewritten.');
  } else if (theirCmd) {
    console.log('✓ Migrated existing statusLine command into statusline.sh.');
    console.log('✓ settings.json updated.');
  } else if (!alreadySet) {
    console.log('✓ settings.json statusLine configured.');
  } else {
    console.log('✓ statusline.sh updated.');
  }
}

function runUninstall(scriptPath: string): void {
  if (!fs.existsSync(scriptPath)) {
    console.log('Nothing to uninstall — statusline.sh not found.');
    removeSettingsIfOurs(scriptPath, null);
    return;
  }

  const lines = fs.readFileSync(scriptPath, 'utf-8').split('\n');
  const migrationLine = lines.find((l) => l.startsWith(MIGRATION_PREFIX));
  const originalCmd = migrationLine ? migrationLine.slice(MIGRATION_PREFIX.length) : null;
  const userScriptPath = userStatuslineScriptPath();

  // Custom script migration reverse: restore statusline-user.sh → statusline.sh
  if (originalCmd === `bash ${userScriptPath}` && fs.existsSync(userScriptPath)) {
    fs.copyFileSync(userScriptPath, scriptPath);
    fs.unlinkSync(userScriptPath);
    console.log('✓ Restored original statusline.sh from statusline-user.sh.');
    // settings.json still points to bash statusline.sh — no change needed
    return;
  }

  const filtered = lines.filter(
    (l) => !isBuddyLine(l, originalCmd),
  );
  fs.writeFileSync(scriptPath, filtered.join('\n'), 'utf-8');
  console.log(`✓ Removed from ${scriptPath}`);

  removeSettingsIfOurs(scriptPath, originalCmd);
}

function removeSettingsIfOurs(scriptPath: string, originalCmd: string | null): void {
  const settings = readSettings();
  if (settings === null) return;
  const existing = settings['statusLine'] as Record<string, unknown> | undefined;
  if (existing?.['command'] !== `bash ${scriptPath}`) return;

  if (originalCmd) {
    settings['statusLine'] = { ...existing, command: originalCmd };
    writeSettings(settings);
    console.log('✓ settings.json statusLine restored to original command.');
    return;
  }

  const content = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf-8') : '';
  const hasContent = content.split('\n').some((l) => l.trim() && !l.startsWith('#'));
  if (!hasContent) {
    delete settings['statusLine'];
    writeSettings(settings);
    console.log('✓ settings.json statusLine removed.');
  }
}

function showFirstRun(): void {
  const config = loadConfig();
  const { bones } = loadCompanion();
  const face = renderFaceInline(bones);
  const stars = RARITY_STARS[bones.rarity];
  const shiny = bones.shiny ? ' ✨' : '';
  console.log(`\n  ${face}  ${config.name}  ${stars}${shiny}`);
  console.log(`  ${bones.species} · ${bones.rarity}  eye:${bones.eye}  hat:${bones.hat}`);
}

export function runSetup(args: string[]): void {
  const scriptPath = statuslineScriptPath();

  if (args.includes('--uninstall')) {
    runUninstall(scriptPath);
    return;
  }

  const layoutIdx = args.indexOf('--layout');
  const layout = layoutIdx !== -1 && args[layoutIdx + 1] === 'side-by-side'
    ? 'side-by-side' as const
    : 'sequential' as const;

  ensureScript(scriptPath);
  injectSettings(scriptPath, layout);

  console.log('\n  Restart Claude Code to see your buddy.');

  showFirstRun();
}
