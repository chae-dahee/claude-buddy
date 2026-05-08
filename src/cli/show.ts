/**
 * `claude-buddy show` — print the buddy directly to the terminal.
 *
 * Same renderer as the statusline output, but with the random one-liner
 * suppressed for a stable preview. Useful as a quick visual check after
 * `claude-buddy companion --reroll`.
 */
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { renderCharacter } from '../shared/render.js';

export function runShow(): void {
  const config = loadConfig();
  const { bones } = loadCompanion();
  const lines = renderCharacter(bones, config, { withMessage: false });
  process.stdout.write(lines.join('\n') + '\n');
}
