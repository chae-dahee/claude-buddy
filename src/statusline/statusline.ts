/**
 * Statusline character renderer — invoked by ~/.claude/statusline.sh.
 *
 * Frame toggles every 60 seconds (2-minute cycle) for a subtle blink effect.
 * Reads stdin JSON for session token count; falls back to time-only EXP on parse failure.
 * Failures are silent — the statusline must never break the user's prompt.
 */
import { readFileSync } from 'fs';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { loadState, saveState } from '../shared/state.js';
import { tick, threshold } from '../shared/tick.js';
import { renderCharacter } from '../shared/render.js';

/** Read stdin and attempt to extract a session token count. Returns undefined on failure. */
function readSessionTokens(): number | undefined {
  try {
    const raw = readFileSync(0, 'utf-8').trim();
    if (!raw) return undefined;
    const data = JSON.parse(raw) as Record<string, unknown>;
    // Try known field candidates in order of specificity
    const candidates = [
      data['total_tokens'],
      data['session_total_tokens'],
      (data['usage'] as Record<string, unknown> | undefined)?.['total_tokens'],
    ];
    for (const v of candidates) {
      if (typeof v === 'number' && v >= 0) return v;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Toggle frame every 60s for a 2-minute blink cycle. */
function currentFrame(): 0 | 1 {
  return (Math.floor(Date.now() / 60000) % 2) as 0 | 1;
}

function main(): void {
  const sessionTokens = readSessionTokens();
  try {
    const config = loadConfig();
    const { bones } = loadCompanion();
    const now = Date.now();

    const state = loadState();
    tick(state, { now, sessionTokens, updateLastSeen: true });
    saveState(state);

    const stateProgress = state.exp / threshold(state.level);
    const lines = renderCharacter(bones, config, {
      frame: currentFrame(),
      stateLevel: state.level,
      stateProgress,
    });
    process.stdout.write(lines.join('\n') + '\n');
  } catch {
    // Silent: never break the host statusline
  }
}

main();
