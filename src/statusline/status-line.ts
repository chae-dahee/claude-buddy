/**
 * statusLineCommand entry point.
 * Reads state.json + ~/.claude.json and prints a single-line status to stdout.
 */
import { loadState } from '../shared/state.js';
import { renderStatusLine } from '../shared/render.js';
import { loadCompanion } from '../shared/companion.js';

function main(): void {
  try {
    const state = loadState();
    const { bones, name } = loadCompanion();
    process.stdout.write(renderStatusLine(state, bones, name) + '\n');
  } catch {
    process.stdout.write('◉ Buddy\n');
  }
}

main();
