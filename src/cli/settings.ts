/**
 * ~/.claude/settings.json read/write utilities.
 * Merges buddy config while preserving all existing keys.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const BUDDY_MARKER = '__claude_buddy__';

export interface ClaudeSettings {
  [key: string]: unknown;
  hooks?: {
    PostToolUse?: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    Stop?: Array<{ type: string; command: string }>;
    [key: string]: unknown;
  };
  statusLineCommand?: string;
}

export function loadSettings(): ClaudeSettings {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) as ClaudeSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: ClaudeSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

/** Returns the dist/ directory regardless of CJS or ESM context */
export function getDistDir(): string {
  // import.meta.url → file:///…/dist/cli/settings.js → resolve to dist/
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), '..');
}

export function buildHookCommand(scriptName: string): string {
  const distDir = getDistDir();
  return `node "${path.join(distDir, scriptName)}"`;
}

export function installBuddy(settings: ClaudeSettings): ClaudeSettings {
  const distDir = getDistDir();
  const postToolCmd = buildHookCommand('hooks/post-tool-use.js');
  const stopCmd = buildHookCommand('hooks/stop.js');
  const statusLineCmd = `node "${path.join(distDir, 'statusline/status-line.js')}"`;

  // Merge hooks.PostToolUse — remove any pre-existing buddy entry first
  const existingPostToolUse = (settings.hooks?.PostToolUse ?? []).filter(
    (h) => !(h as unknown as Record<string, unknown>)[BUDDY_MARKER]
  );
  const buddyPostToolUse = {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: postToolCmd }],
    [BUDDY_MARKER]: true,
  };

  // Merge hooks.Stop
  const existingStop = (settings.hooks?.Stop ?? []).filter(
    (h) => !(h as unknown as Record<string, unknown>)[BUDDY_MARKER]
  );
  const buddyStop = {
    type: 'command',
    command: stopCmd,
    [BUDDY_MARKER]: true,
  };

  return {
    ...settings,
    statusLineCommand: statusLineCmd,
    hooks: {
      ...(settings.hooks ?? {}),
      PostToolUse: [...existingPostToolUse, buddyPostToolUse],
      Stop: [...existingStop, buddyStop],
    },
  };
}

export function uninstallBuddy(settings: ClaudeSettings): ClaudeSettings {
  const hooks = settings.hooks ?? {};

  const PostToolUse = (hooks.PostToolUse ?? []).filter(
    (h) => !(h as unknown as Record<string, unknown>)[BUDDY_MARKER]
  );
  const Stop = (hooks.Stop ?? []).filter(
    (h) => !(h as unknown as Record<string, unknown>)[BUDDY_MARKER]
  );

  const newSettings = { ...settings };
  delete newSettings.statusLineCommand;
  newSettings.hooks = { ...hooks, PostToolUse, Stop };

  // Clean up empty arrays
  if (PostToolUse.length === 0) delete newSettings.hooks!.PostToolUse;
  if (Stop.length === 0) delete newSettings.hooks!.Stop;
  if (Object.keys(newSettings.hooks!).length === 0) delete newSettings.hooks;

  return newSettings;
}

export { SETTINGS_PATH };
