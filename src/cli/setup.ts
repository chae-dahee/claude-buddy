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

function settingsJsonPath(): string {
  return path.join(claudeConfigDir(), 'settings.json');
}

function readSettings(): Record<string, unknown> {
  const p = settingsJsonPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  fs.writeFileSync(settingsJsonPath(), JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

function runInstall(scriptPath: string): void {
  if (!fs.existsSync(scriptPath)) {
    fs.writeFileSync(scriptPath, `${SHEBANG}\n${STATUSLINE_MARKER}\n`, 'utf-8');
    fs.chmodSync(scriptPath, 0o755);
    console.log(`✓ Created ${scriptPath}`);
  } else {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    if (content.includes('claude-buddy')) {
      console.log(`✓ Already installed in ${scriptPath}`);
      return;
    }
    const appended = content.endsWith('\n') ? content : content + '\n';
    fs.writeFileSync(scriptPath, appended + STATUSLINE_MARKER + '\n', 'utf-8');
    console.log(`✓ Appended to ${scriptPath}`);
  }
}

function injectSettings(scriptPath: string, layout: 'sequential' | 'side-by-side'): void {
  const settings = readSettings();
  const existing = settings['statusLine'] as Record<string, unknown> | undefined;
  const buddyCmd = `bash ${scriptPath}`;

  if (existing?.['command'] === buddyCmd) {
    console.log('✓ settings.json statusLine already configured.');
    return;
  }

  if (existing?.['command']) {
    // User has a different statusLine command — migrate it into statusline.sh
    const theirCmd = existing['command'] as string;
    const content = fs.readFileSync(scriptPath, 'utf-8');
    if (!content.includes(MIGRATION_PREFIX)) {
      const lines = content.split('\n');
      const insertAt = lines[0]?.startsWith('#!') ? 1 : 0;
      if (layout === 'side-by-side') {
        const withoutBuddy = lines.filter((l) => !l.includes('claude-buddy'));
        withoutBuddy.splice(insertAt, 0,
          `${MIGRATION_PREFIX}${theirCmd}`,
          `paste -d'   ' <(${STATUSLINE_MARKER}) <(${theirCmd})`,
        );
        fs.writeFileSync(scriptPath, withoutBuddy.join('\n'), 'utf-8');
      } else {
        lines.splice(insertAt, 0, `${MIGRATION_PREFIX}${theirCmd}`, theirCmd);
        fs.writeFileSync(scriptPath, lines.join('\n'), 'utf-8');
      }
    }
    settings['statusLine'] = { type: 'command', command: buddyCmd };
    writeSettings(settings);
    console.log('✓ Migrated existing statusLine command into statusline.sh.');
    console.log('✓ settings.json updated.');
    return;
  }

  settings['statusLine'] = { type: 'command', command: buddyCmd };
  writeSettings(settings);
  console.log('✓ settings.json statusLine configured.');
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

  const filtered = lines.filter(
    (l) => !l.includes('claude-buddy') && !(originalCmd && l === originalCmd),
  );
  fs.writeFileSync(scriptPath, filtered.join('\n'), 'utf-8');
  console.log(`✓ Removed from ${scriptPath}`);

  removeSettingsIfOurs(scriptPath, originalCmd);
}

function removeSettingsIfOurs(scriptPath: string, originalCmd: string | null): void {
  const settings = readSettings();
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

  runInstall(scriptPath);
  injectSettings(scriptPath, layout);

  console.log('\n  Restart Claude Code to see your buddy.');

  showFirstRun();
}
