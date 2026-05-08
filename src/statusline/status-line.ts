/**
 * Statusline character renderer.
 *
 * Designed to be appended as ONE line in the user's existing
 * ~/.claude/statusline-command.sh:
 *
 *   node /path/to/dist/statusline/status-line.js
 *
 * Reads (drains) stdin if Claude Code pipes its session JSON, but does not
 * depend on any field. Reads companion bones + config from disk and prints a
 * multi-line ASCII character to stdout. Never modifies settings.json.
 *
 * Failures are silent — the statusline must never break the user's prompt.
 */
import { readFileSync } from 'fs';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { renderCharacter } from '../shared/render.js';

function drainStdin(): void {
  // If stdin is a pipe (Claude Code statusline), draining prevents EPIPE on
  // upstream. If stdin is a TTY (manual run), readFileSync rejects — ignore.
  try { readFileSync(0, 'utf-8'); } catch { /* no-op */ }
}

function main(): void {
  drainStdin();
  try {
    const config = loadConfig();
    const { bones } = loadCompanion();
    const lines = renderCharacter(bones, config);
    process.stdout.write(lines.join('\n') + '\n');
  } catch {
    // Silent: never break the host statusline
  }
}

main();
