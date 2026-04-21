/**
 * PostToolUse hook — matcher: "Bash"
 *
 * Reads JSON from stdin, detects reaction type from Bash output,
 * and updates state.json (XP/mood accumulation).
 *
 * Does NOT write to /dev/tty: mid-session writes race with Claude Code's
 * live TUI rendering and produce visually corrupted output. The Stop hook
 * is the sole surface for the speech bubble at session boundaries.
 *
 * Always exits 0 and prints {} to stdout (no Claude feedback).
 */
import { readFileSync } from 'fs';
import { loadState, saveState, applyXp } from '../shared/state.js';
import { REACTION_MAP, detectPostToolReaction, pickMessage } from '../shared/mood.js';
import type { PostToolUsePayload } from '../shared/types.js';

function main(): void {
  let raw = '';
  try {
    raw = readFileSync('/dev/stdin', 'utf-8');
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }

  let payload: PostToolUsePayload;
  try {
    payload = JSON.parse(raw) as PostToolUsePayload;
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }

  try {
    if (payload.tool_name !== 'Bash') {
      process.stdout.write('{}');
      process.exit(0);
    }

    const reactionType = detectPostToolReaction(payload);
    const config = REACTION_MAP[reactionType];

    const state = loadState();
    const message = pickMessage(config.messages);
    const { state: updatedState } = applyXp(
      { ...state, mood: config.mood, lastReaction: message, lastUpdated: Date.now() },
      config.xpReward,
    );

    saveState(updatedState);
  } catch {
    // Never crash Claude session
  }

  process.stdout.write('{}');
  process.exit(0);
}

main();
