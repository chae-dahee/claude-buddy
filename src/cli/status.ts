import { loadState } from '../shared/state.js';
import { renderSpeechBubble } from '../shared/render.js';
import { loadCompanion } from '../shared/companion.js';

export function runStatus(): void {
  const state = loadState();
  const { bones, stored } = loadCompanion();
  const name = stored.name;
  const info = [
    `Name:    ${name}`,
    `Species: ${bones.species}  ${bones.shiny ? '✨' : ''}`,
    `Rarity:  ${bones.rarity}`,
    `Eye:     ${bones.eye}   Hat: ${bones.hat}`,
    `Mood:    ${state.mood}`,
    `Level:   ${state.level}`,
    `XP:      ${state.xp} (${state.xp % 100}/100 to next level)`,
    `Last:    ${state.lastReaction || '(none)'}`,
  ].join('\n');
  console.log(renderSpeechBubble(state, `Hi, I'm ${name}!`, bones, name));
  console.log(info);
}
