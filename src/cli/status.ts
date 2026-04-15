import { loadState } from '../shared/state.js';
import { renderSpeechBubble } from '../shared/render.js';

export function runStatus(): void {
  const state = loadState();
  const info = [
    `Name:  ${state.name}`,
    `Mood:  ${state.mood}`,
    `Level: ${state.level}`,
    `XP:    ${state.xp} (${state.xp % 100}/100 to next level)`,
    `Last:  ${state.lastReaction || '(none)'}`,
  ].join('\n');
  console.log(renderSpeechBubble(state, info.split('\n')[0]));
  console.log(info);
}
