/**
 * Stop hook
 *
 * Reads JSON from stdin (transcript_path), parses the JSONL transcript,
 * extracts the last assistant message, detects reaction, and updates state.
 * The reaction message is persisted to state.lastReaction so the status line
 * renders it next time Claude Code's ❯ input is idle.
 *
 * If config.sprite === true, the full character sprite is also written to the
 * terminal scrollback via /dev/tty. The status-line area never receives
 * multi-line output, so the input cursor cannot overlap the sprite.
 *
 * Always exits 0 (no Claude feedback).
 */
import { readFileSync } from 'fs';
import { loadState, saveState, applyXp } from '../shared/state.js';
import { REACTION_MAP, detectStopReaction, pickMessage } from '../shared/mood.js';
import { renderFullSprite, renderLevelUp } from '../shared/render.js';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { writeTty } from '../shared/tty.js';
import { extractLastAssistantText } from '../shared/transcript.js';
import type { StopPayload } from '../shared/types.js';

function main(): void {
  let raw = '';
  try {
    raw = readFileSync('/dev/stdin', 'utf-8');
  } catch {
    process.exit(0);
  }

  let payload: StopPayload;
  try {
    payload = JSON.parse(raw) as StopPayload;
  } catch {
    process.exit(0);
  }

  try {
    const transcriptPath = payload.transcript_path ?? '';
    const lastText = extractLastAssistantText(transcriptPath);
    const reactionType = detectStopReaction(lastText);
    const reaction = REACTION_MAP[reactionType];

    const state = loadState();
    const message = pickMessage(reaction.messages);
    const { state: updatedState, leveledUp } = applyXp(
      { ...state, mood: reaction.mood, lastReaction: message, lastUpdated: Date.now() },
      reaction.xpReward,
    );

    const finalState = leveledUp
      ? { ...updatedState, lastReaction: `Lv UP! Now Lv.${updatedState.level}` }
      : updatedState;
    saveState(finalState);

    const config = loadConfig();
    if (config.sprite) {
      const { bones, name } = loadCompanion();
      writeTty(renderFullSprite(finalState, finalState.lastReaction, bones, name));
      if (leveledUp) writeTty(renderLevelUp(finalState));
    }
  } catch {
    // Never crash Claude session
  }

  process.exit(0);
}

main();
