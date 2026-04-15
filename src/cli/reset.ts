import { resetState, STATE_FILE } from '../shared/state.js';

export function runReset(): void {
  resetState();
  console.log(`✓ claude-buddy state reset (${STATE_FILE})`);
}
