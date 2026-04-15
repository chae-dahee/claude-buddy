/**
 * `claude-buddy show` — display buddy directly in the terminal.
 *
 * Shows full ASCII sprite + speech bubble + XP bar without needing
 * a Claude Code session. Reads state and companion from local files.
 */
import { loadState } from '../shared/state.js';
import { loadCompanion } from '../shared/companion.js';
import { renderSpeechBubble } from '../shared/render.js';

const GREETINGS = [
  '안녕! 오늘도 코딩 파이팅!',
  '같이 버그 잡으러 가자!',
  '오늘 뭐 만들어?',
  '커피 마셨어? 나는 항상 준비됨!',
  '코드 한 줄 한 줄이 다 의미 있어!',
  'Hello, world!',
  '오늘도 잘 부탁해~',
];

function randomGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!;
}

export function runShow(): void {
  const state = loadState();
  const { bones, name } = loadCompanion();
  const message = state.lastReaction || randomGreeting();
  const output = renderSpeechBubble(state, message, bones, name);
  process.stdout.write(output + '\n');
}
