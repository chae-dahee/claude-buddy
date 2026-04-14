import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { BuddyState } from './types.js';

// Allow test isolation via env var (e.g. CLAUDE_BUDDY_STATE_DIR=/tmp/test-buddy)
const STATE_DIR = process.env['CLAUDE_BUDDY_STATE_DIR'] ?? path.join(os.homedir(), '.claude-buddy');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

const DEFAULT_STATE: BuddyState = {
  name: 'Buddy',
  mood: 'neutral',
  xp: 0,
  level: 1,
  lastReaction: '',
  lastUpdated: Date.now(),
};

export function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

export function loadState(): BuddyState {
  ensureStateDir();
  if (!fs.existsSync(STATE_FILE)) {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BuddyState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: BuddyState): void {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function resetState(): BuddyState {
  const fresh: BuddyState = { ...DEFAULT_STATE, lastUpdated: Date.now() };
  saveState(fresh);
  return fresh;
}

export function computeLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/** Apply XP reward, detect level-up. Returns { state, leveledUp } */
export function applyXp(
  state: BuddyState,
  xpReward: number
): { state: BuddyState; leveledUp: boolean } {
  const prevLevel = state.level;
  const newXp = state.xp + xpReward;
  const newLevel = computeLevel(newXp);
  return {
    state: { ...state, xp: newXp, level: newLevel },
    leveledUp: newLevel > prevLevel,
  };
}

export { STATE_DIR, STATE_FILE, DEFAULT_STATE };
