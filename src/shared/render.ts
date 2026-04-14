import type { Mood, BuddyState } from './types.js';

// 6-mood ASCII faces (3 lines each for compact display)
export const FACES: Record<Mood, string[]> = {
  neutral: [
    ' ╭───╮ ',
    ' │ ◉ │ ',
    ' ╰───╯ ',
  ],
  happy: [
    ' ╭───╮ ',
    ' │ ◠ │ ',
    ' ╰─▽─╯ ',
  ],
  excited: [
    ' ╭───╮ ',
    ' │ ★ │ ',
    ' ╰─▽─╯ ',
  ],
  worried: [
    ' ╭───╮ ',
    ' │ ◉ │ ',
    ' ╰─∧─╯ ',
  ],
  sad: [
    ' ╭───╮ ',
    ' │ ◞ │ ',
    ' ╰─∨─╯ ',
  ],
  tired: [
    ' ╭───╮ ',
    ' │ ─ │ ',
    ' ╰───╯ ',
  ],
};

/** Build XP progress bar (10 chars, 100 XP per level) */
export function xpBar(xp: number): string {
  const progress = xp % 100;
  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/** Wrap text into a speech bubble box */
function speechBubble(text: string): string[] {
  const maxWidth = 40;
  // Word-wrap
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);

  const width = Math.max(...lines.map((l) => l.length), 10);
  const top = `╭${'─'.repeat(width + 2)}╮`;
  const bottom = `╰${'─'.repeat(width + 2)}╯`;
  const body = lines.map((l) => `│ ${l.padEnd(width)} │`);
  return [top, ...body, bottom];
}

/** Full speech bubble rendered to terminal string (multi-line) */
export function renderSpeechBubble(state: BuddyState, message: string): string {
  const bubble = speechBubble(message);
  const face = FACES[state.mood];
  const bar = xpBar(state.xp);
  const levelLabel = `Lv.${state.level}`;
  const info = `${state.name} ${levelLabel} [${bar}] ${state.xp % 100}/100 XP`;

  const lines: string[] = [
    ...bubble,
    `    \\`,
    ...face,
    info,
  ];
  return lines.join('\n');
}

/** One-line status line for statusLineCommand */
export function renderStatusLine(state: BuddyState): string {
  const face = FACES[state.mood][1].trim(); // middle row of face
  const bar = xpBar(state.xp);
  return `${face} ${state.name} Lv.${state.level} [${bar}]`;
}

/** Level-up celebration message */
export function renderLevelUp(state: BuddyState): string {
  const lines = [
    '╔══════════════════════════╗',
    `║  ✨ LEVEL UP! Now Lv.${state.level} ✨  ║`,
    '╚══════════════════════════╝',
  ];
  return lines.join('\n');
}
