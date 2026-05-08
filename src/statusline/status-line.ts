/**
 * Statusline character renderer.
 *
 * Designed to be appended as ONE line in the user's existing
 * ~/.claude/statusline-command.sh:
 *
 *   node /path/to/dist/statusline/status-line.js
 *
 * Frame toggles every 60 seconds (2-minute cycle) for a subtle blink effect.
 * Reads (drains) stdin to avoid EPIPE; payload is not used.
 * Failures are silent — the statusline must never break the user's prompt.
 */
import { readFileSync } from 'fs';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { renderCharacter } from '../shared/render.js';

function drainStdin(): void {
  try { readFileSync(0, 'utf-8'); } catch { /* no-op */ }
}

/** Toggle frame every 60s for a 2-minute blink cycle. */
function currentFrame(): 0 | 1 {
  return (Math.floor(Date.now() / 60000) % 2) as 0 | 1;
}

function main(): void {
  const input = readStdinJson();
  try {
    const config = loadConfig();
    const { bones } = loadCompanion();
    const lines = renderCharacter(bones, config, { frame: currentFrame() });
    process.stdout.write(lines.join('\n') + '\n');
  } catch {
    // Silent: never break the host statusline
  }
}

main();
