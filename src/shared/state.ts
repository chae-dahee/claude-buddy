/**
 * Buddy state management — level, experience, hunger, and daily interactions.
 *
 * Persists to ~/.claude-buddy/buddy-state.json with automatic migration from v0.2.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BuddyConfig, loadConfig } from './config.js';

const STATE_DIR = process.env['CLAUDE_BUDDY_STATE_DIR'] ?? path.join(os.homedir(), '.claude-buddy');
const STATE_FILE = path.join(STATE_DIR, 'buddy-state.json');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyCounters {
  /** Date in "YYYY-MM-DD" format (local time) */
  date: string;
  /** Number of times /buddy-great was used today */
  giveGreatCount: number;
  /** Number of times /buddy-treat was used today */
  giveTreatCount: number;
}

export interface StateFile {
  /** Companion level (1 or higher) */
  level: number;
  /** Experience points towards next level */
  exp: number;
  /** Hunger state: 0 (happy) to 4 (very hungry) */
  hunger: number;
  /** Last tick timestamp (ms) */
  lastTickAt: number;
  /** Last time statusline was rendered (ms) */
  lastSeenAt: number;
  /** Last time a treat was given (ms) */
  lastTreatAt: number;
  /** Total tokens seen (cumulative) */
  tokensSeenTotal: number;
  /** Experience points accrued from tokens */
  tokenExpAccrued: number;
  /** Daily interaction counters */
  daily: DailyCounters;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Convert a millisecond timestamp to "YYYY-MM-DD" in local time.
 * Uses the local timezone, not UTC.
 */
export function todayLocal(now: number): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if the current date has changed since the state was last updated.
 */
export function isNewDay(state: StateFile, now: number): boolean {
  return todayLocal(now) !== state.daily.date;
}

/**
 * Reset daily counters to zero and update the date.
 */
export function resetDailyCounters(state: StateFile, now: number): void {
  state.daily.date = todayLocal(now);
  state.daily.giveGreatCount = 0;
  state.daily.giveTreatCount = 0;
}

// ─── File I/O ────────────────────────────────────────────────────────────────

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

/**
 * Initialize state from migration (v0.2 → v0.3).
 * Calculates level based on days since config creation, preserving progress.
 */
export function initStateFromMigration(config: BuddyConfig, now: number): StateFile {
  const elapsedMs = now - config.createdAt;
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
  const elapsedWeeks = elapsedDays / 7;
  const migratedLevel = Math.max(1, Math.floor(elapsedWeeks) + 1);

  return {
    level: migratedLevel,
    exp: 0,
    hunger: 0,
    lastTickAt: now,
    lastSeenAt: now,
    lastTreatAt: 0,
    tokensSeenTotal: 0,
    tokenExpAccrued: 0,
    daily: {
      date: todayLocal(now),
      giveGreatCount: 0,
      giveTreatCount: 0,
    },
  };
}

/**
 * Load state from disk, creating it via migration if necessary.
 * Falls back to migration on JSON parse errors.
 */
export function loadState(): StateFile {
  ensureStateDir();

  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StateFile>;

      // Validate essential fields
      if (
        typeof parsed.level === 'number' &&
        typeof parsed.exp === 'number' &&
        typeof parsed.hunger === 'number' &&
        typeof parsed.lastTickAt === 'number' &&
        typeof parsed.lastSeenAt === 'number' &&
        typeof parsed.lastTreatAt === 'number' &&
        typeof parsed.tokensSeenTotal === 'number' &&
        typeof parsed.tokenExpAccrued === 'number' &&
        parsed.daily &&
        typeof (parsed.daily as any).date === 'string'
      ) {
        return parsed as StateFile;
      }
    }
  } catch {
    // Fall through to migration
  }

  // Migrate from config
  const config = loadConfig();
  const state = initStateFromMigration(config, Date.now());
  saveState(state);
  return state;
}

/**
 * Persist state to disk with 2-space indentation.
 */
export function saveState(state: StateFile): void {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export { STATE_DIR, STATE_FILE };
