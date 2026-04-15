/**
 * statusLineCommand entry point.
 * Reads state.json and prints a single-line status to stdout.
 */
import { loadState } from '../shared/state.js';
import { renderStatusLine } from '../shared/render.js';

function main(): void {
  try {
    const state = loadState();
    process.stdout.write(renderStatusLine(state) + '\n');
  } catch {
    process.stdout.write('◉ Buddy\n');
  }
}

main();
