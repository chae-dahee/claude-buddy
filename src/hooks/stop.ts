/**
 * Stop hook
 *
 * Reads JSON from stdin (transcript_path), parses the JSONL transcript,
 * extracts the last assistant message, detects reaction, updates state,
 * and writes speech bubble to /dev/tty.
 * Always exits 0 (no Claude feedback).
 */
import { readFileSync } from 'fs';
import { loadState, saveState, applyXp } from '../shared/state.js';
import { REACTION_MAP, detectStopReaction, pickMessage } from '../shared/mood.js';
import { renderSpeechBubble, renderLevelUp } from '../shared/render.js';
import { loadCompanion } from '../shared/companion.js';
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
    const config = REACTION_MAP[reactionType];

    const state = loadState();
    const { bones, name } = loadCompanion();
    const message = pickMessage(config.messages);
    const { state: updatedState, leveledUp } = applyXp(
      { ...state, mood: config.mood, lastReaction: message, lastUpdated: Date.now() },
      config.xpReward,
    );

    saveState(updatedState);

    writeTty(renderSpeechBubble(updatedState, message, bones, name));
    if (leveledUp) writeTty(renderLevelUp(updatedState));
  } catch {
    // Never crash Claude session
  }

  process.exit(0);
}

main();
