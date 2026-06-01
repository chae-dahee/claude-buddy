/**
 * `claude-buddy treat` — give the buddy a snack.
 *
 * Up to TREAT_DAILY_LIMIT times per day. Resets at local midnight via tick.
 * Also updates lastTreatAt (used by Phase 3 hunger reset).
 */
import { loadState, saveState } from '../shared/state.js';
import { tick, threshold } from '../shared/tick.js';
import { pickTreatMessage, pickTreatRefusedMessage } from '../shared/messages.js';
import type { StateFile } from '../shared/state.js';

export const TREAT_DAILY_LIMIT = 3;
export const TREAT_EXP = 15;

/**
 * Pure logic for /buddy-treat. Mutates state in-place; caller saves.
 * Returns whether the interaction was accepted and the message to show.
 */
export function applyTreat(
  state: StateFile,
  now: number,
  rng: () => number = Math.random,
): { accepted: boolean; message: string } {
  tick(state, { now, updateLastSeen: false });

  if (state.daily.giveTreatCount >= TREAT_DAILY_LIMIT) {
    return { accepted: false, message: pickTreatRefusedMessage(rng) };
  }

  state.daily.giveTreatCount++;
  state.exp += TREAT_EXP;
  state.lastTreatAt = now;
  state.hunger = 0;

  while (state.exp >= threshold(state.level)) {
    state.exp -= threshold(state.level);
    state.level++;
  }

  return { accepted: true, message: pickTreatMessage(rng) };
}

export function runTreat(): void {
  const now = Date.now();
  const state = loadState();
  const { message } = applyTreat(state, now);
  saveState(state);
  process.stdout.write(message + '\n');
}
