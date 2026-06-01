/**
 * `claude-buddy show` — print the buddy directly to the terminal.
 *
 * Runs one tick (updateLastSeen:false per spec §9) to sync state, then renders
 * with state-based level/progress.
 */
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { loadState, saveState } from '../shared/state.js';
import { tick, threshold, deriveMood } from '../shared/tick.js';
import { renderCharacter } from '../shared/render.js';

export function runShow(): void {
  const config = loadConfig();
  const { bones } = loadCompanion();
  const now = Date.now();

  const state = loadState();
  const mood = deriveMood(state, now);
  tick(state, { now, updateLastSeen: false });
  saveState(state);

  const stateProgress = state.exp / threshold(state.level);
  const lines = renderCharacter(bones, config, {
    withMessage: false,
    stateLevel: state.level,
    stateProgress,
    mood,
    hunger: state.hunger,
  });
  process.stdout.write(lines.join('\n') + '\n');
}
