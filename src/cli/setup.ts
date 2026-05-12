import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { RARITY_STARS, renderFaceInline } from '../shared/render.js';

const STATUSLINE_MARKER = 'command -v claude-buddy &>/dev/null && claude-buddy statusline';
const SHEBANG = '#!/usr/bin/env bash';

function statuslineScriptPath(): string {
  const claudeDir = process.env['CLAUDE_CONFIG_DIR'] ?? path.join(os.homedir(), '.claude');
  return path.join(claudeDir, 'statusline.sh');
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

function runUninstall(scriptPath: string): void {
  if (!fs.existsSync(scriptPath)) {
    console.log('Nothing to uninstall — statusline.sh not found.');
    return;
  }
  const lines = fs.readFileSync(scriptPath, 'utf-8').split('\n');
  const filtered = lines.filter((l) => !l.includes('claude-buddy'));
  fs.writeFileSync(scriptPath, filtered.join('\n'), 'utf-8');
  console.log(`✓ Removed from ${scriptPath}`);
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

  runInstall(scriptPath);

  console.log(`
  Restart Claude Code (or wait for the next statusline tick) to see your buddy.

  Note: make sure ~/.claude/settings.json has:
    "statusLine": { "command": "${scriptPath}" }
`);

  showFirstRun();
}
