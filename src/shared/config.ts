/**
 * Buddy config — independent of ~/.claude.json.
 *
 * Stores a stable UUID (used as the companion roll seed), display name,
 * and creation timestamp in ~/.claude-buddy/config.json.
 * On first run, the file is created automatically.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const CONFIG_DIR = process.env['CLAUDE_BUDDY_STATE_DIR'] ?? path.join(os.homedir(), '.claude-buddy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface BuddyConfig {
  /** Stable UUID — seed for the deterministic companion roll */
  id: string;
  /** Companion display name (user-editable) */
  name: string;
  /** Unix timestamp of first initialisation */
  createdAt: number;
  /** Whether the always-on full sprite is shown in the status line (default: true) */
  active: boolean;
}

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Read config from disk; auto-initialises on first run */
export function loadConfig(): BuddyConfig {
  ensureDir();
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BuddyConfig>;
    if (typeof parsed.id === 'string' && parsed.id && parsed.name && parsed.createdAt) {
      return {
        id: parsed.id,
        name: parsed.name,
        createdAt: parsed.createdAt,
        active: parsed.active !== false, // default true for existing configs
      };
    }
  } catch {
    // Fall through to init
  }
  return initConfig();
}

/** Create a fresh config with a new random UUID and save it */
export function initConfig(): BuddyConfig {
  const config: BuddyConfig = {
    id: crypto.randomUUID(),
    name: 'Buddy',
    createdAt: Date.now(),
    active: true,
  };
  saveConfig(config);
  return config;
}

/** Persist config changes to disk */
export function saveConfig(config: BuddyConfig): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export { CONFIG_DIR, CONFIG_FILE };
