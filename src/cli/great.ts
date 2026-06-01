/**
 * `claude-buddy great` — give the buddy a compliment.
 *
 * Up to GREAT_DAILY_LIMIT times per day. Resets at local midnight via tick.
 */
import { loadState, saveState } from '../shared/state.js';
import { tick, threshold } from '../shared/tick.js';
import { pickGreatMessage, pickGreatRefusedMessage } from '../shared/messages.js';
import type { StateFile } from '../shared/state.js';

export const GREAT_DAILY_LIMIT = 3;
export const GREAT_EXP = 10;

/**
 * Pure logic for /buddy-great. Mutates state in-place; caller saves.
 * Returns whether the interaction was accepted and the message to show.
 */
export function applyGreat(
  state: StateFile,
  now: number,
  rng: () => number = Math.random,
): { accepted: boolean; message: string } {
  tick(state, { now, updateLastSeen: false });

  if (state.daily.giveGreatCount >= GREAT_DAILY_LIMIT) {
    return { accepted: false, message: pickGreatRefusedMessage(rng) };
  }

  state.daily.giveGreatCount++;
  state.exp += GREAT_EXP;

  while (state.exp >= threshold(state.level)) {
    state.exp -= threshold(state.level);
    state.level++;
  }

  return { accepted: true, message: pickGreatMessage(rng) };
}

export function runGreat(): void {
  const now = Date.now();
  const state = loadState();
  const { message } = applyGreat(state, now);
  saveState(state);
  process.stdout.write(message + '\n');
}
