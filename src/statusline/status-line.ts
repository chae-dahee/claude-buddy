/**
 * statusLineCommand entry point.
 * When active=true → outputs full sprite + speech bubble (always-on display).
 * When active=false → outputs empty string (hidden).
 */
import { loadState } from '../shared/state.js';
import { renderSpeechBubble } from '../shared/render.js';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';

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

function main(): void {
  try {
    const config = loadConfig();
    if (!config.active) {
      process.stdout.write('');
      return;
    }
    const state = loadState();
    const { bones, name } = loadCompanion();
    const message = state.lastReaction || randomGreeting();
    process.stdout.write(renderSpeechBubble(state, message, bones, name) + '\n');
  } catch {
    process.stdout.write('');
  }
}

main();
