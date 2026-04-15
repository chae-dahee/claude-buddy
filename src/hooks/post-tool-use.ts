/**
 * PostToolUse hook — matcher: "Bash"
 *
 * Reads JSON from stdin, detects reaction type from Bash output,
 * updates state.json, and writes a speech bubble to /dev/tty.
 * Always exits 0 and prints {} to stdout (no Claude feedback).
 */
import { readFileSync } from 'fs';
import { loadState, saveState, applyXp } from '../shared/state.js';
import { REACTION_MAP, detectPostToolReaction, pickMessage } from '../shared/mood.js';
import { renderSpeechBubble, renderLevelUp } from '../shared/render.js';
import { loadCompanion } from '../shared/companion.js';
import { writeTty } from '../shared/tty.js';
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
    const { bones, stored } = loadCompanion();
    const message = pickMessage(config.messages);
    const { state: updatedState, leveledUp } = applyXp(
      { ...state, mood: config.mood, lastReaction: message, lastUpdated: Date.now() },
      config.xpReward,
    );

    saveState(updatedState);

    writeTty(renderSpeechBubble(updatedState, message, bones, stored.name));
    if (leveledUp) writeTty(renderLevelUp(updatedState));
  } catch {
    // Never crash Claude session
  }

  process.stdout.write('{}');
  process.exit(0);
}

main();
