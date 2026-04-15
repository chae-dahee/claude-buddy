import type { BuddyState, Species, Eye, Hat, Rarity, CompanionBones } from './types.js';

// ─── Sprite art (4 lines per species, {E} = eye placeholder) ─────────────────

export const SPRITES: Record<Species, string[]> = {
  duck: [
    '     __      ',
    '  <( {E} )___',
    '   (  ._>    ',
    "    `--´     ",
  ],
  goose: [
    '    ( {E}>    ',
    '     ||      ',
    '   _(__)_    ',
    '    ^^^^     ',
  ],
  blob: [
    '   .----.    ',
    ' ( {E}  {E} ) ',
    '  (      )   ',
    "   `----´    ",
  ],
  cat: [
    '   /\\_/\\    ',
    '  ( {E}  {E} )',
    '  (  ω   )   ',
    '  (")_(")    ',
  ],
  dragon: [
    '  /^\\  /^\\ ',
    ' < {E}   {E} >',
    ' (   ~~~   ) ',
    "  `-vvvv-´   ",
  ],
  octopus: [
    '   .----.    ',
    ' ( {E}  {E} ) ',
    '  (______) ',
    '  /\\/\\/\\/\\   ',
  ],
  owl: [
    '   /\\  /\\   ',
    ' (({E})({E})) ',
    '  (  ><  )   ',
    "   `----´    ",
  ],
  penguin: [
    '   .---.     ',
    '  ({E}>{E})   ',
    '  /(   )\\    ',
    "   `---´     ",
  ],
  turtle: [
    '   _,--._    ',
    '  ( {E}  {E} )',
    ' /[______]\\  ',
    '  ``    ``   ',
  ],
  snail: [
    '  {E}   .--.  ',
    '   \\  ( @ )  ',
    "    \\_`--´   ",
    '  ~~~~~~~    ',
  ],
  ghost: [
    '   .----.    ',
    '  / {E}  {E} \\',
    '  |      |   ',
    '  ~`~``~`~   ',
  ],
  axolotl: [
    ' }~(______)~{ ',
    '}~( {E} .. {E} )~{',
    '   ( .--. )  ',
    '   (_/  \\_)  ',
  ],
  capybara: [
    '   n______n  ',
    '  ( {E}   {E} )',
    '  (   oo   ) ',
    "   `------´  ",
  ],
  cactus: [
    '  n  ____  n ',
    '  | |{E}  {E}| |',
    '  |_|    |_| ',
    '     |    |  ',
  ],
  robot: [
    '   .[||].    ',
    '  [ {E}  {E} ] ',
    '  [ ==== ]   ',
    "   `------´  ",
  ],
  rabbit: [
    '    (\\__/)   ',
    '   ( {E}  {E} )',
    '  =(  ..  )= ',
    '   (")__(")  ',
  ],
  mushroom: [
    '  .-o-OO-o-. ',
    '  (________) ',
    '    |{E}  {E}|  ',
    '    |____|   ',
  ],
  chonk: [
    '   /\\    /\\  ',
    '  ( {E}    {E} )',
    '  (   ..   ) ',
    "   `------´  ",
  ],
};

// ─── Hat overlays (prepended as line 0 when hat ≠ 'none') ────────────────────

export const HAT_LINES: Record<Hat, string> = {
  none:       '',
  crown:      '     \\^^^/    ',
  tophat:     '     [___]    ',
  propeller:  '      -+-     ',
  halo:       '     (   )    ',
  wizard:     '      /^\\    ',
  beanie:     '     (___)    ',
  tinyduck:   '       ,>     ',
};

// ─── Compact inline face (for status line) ───────────────────────────────────

export const FACE_INLINE: Record<Species, string> = {
  duck:     '({E}>',
  goose:    '({E}>',
  blob:     '({E}{E})',
  cat:      '={E}ω{E}=',
  dragon:   '<{E}~{E}>',
  octopus:  '~({E}{E})~',
  owl:      '({E})({E})',
  penguin:  '({E}>)',
  turtle:   '[{E}_{E}]',
  snail:    '{E}(@)',
  ghost:    '/{E}{E}\\',
  axolotl:  '}({E}{E}){',
  capybara: '({E}oo{E})',
  cactus:   '|{E}{E}|',
  robot:    '[{E}{E}]',
  rabbit:   '({E}.{E})',
  mushroom: '|{E}{E}|',
  chonk:    '({E}..{E})',
};

// ─── Rarity stars ─────────────────────────────────────────────────────────────

export const RARITY_STARS: Record<Rarity, string> = {
  common:    '★',
  uncommon:  '★★',
  rare:      '★★★',
  epic:      '★★★★',
  legendary: '★★★★★',
};

// ─── Render helpers ───────────────────────────────────────────────────────────

function applyEye(template: string, eye: Eye): string {
  return template.replaceAll('{E}', eye);
}

/** Render species sprite lines, with hat prepended if equipped */
export function renderSprite(bones: CompanionBones): string[] {
  const lines = SPRITES[bones.species].map((l) => applyEye(l, bones.eye));
  if (bones.hat !== 'none') {
    return [HAT_LINES[bones.hat], ...lines];
  }
  return lines;
}

/** Compact inline face (eye substituted) for status line use */
export function renderFaceInline(bones: CompanionBones): string {
  return applyEye(FACE_INLINE[bones.species], bones.eye);
}

// ─── XP bar ──────────────────────────────────────────────────────────────────

/** Build XP progress bar (10 chars, 100 XP per level) */
export function xpBar(xp: number): string {
  const progress = xp % 100;
  const filled = Math.floor(progress / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// ─── Speech bubble ────────────────────────────────────────────────────────────

function speechBubble(text: string): string[] {
  const maxWidth = 40;
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
  return [
    `╭${'─'.repeat(width + 2)}╮`,
    ...lines.map((l) => `│ ${l.padEnd(width)} │`),
    `╰${'─'.repeat(width + 2)}╯`,
  ];
}

/** Full speech bubble + sprite rendered to terminal string */
export function renderSpeechBubble(
  state: BuddyState,
  message: string,
  bones: CompanionBones,
  companionName?: string,
): string {
  const name  = companionName ?? state.name;
  const bar   = xpBar(state.xp);
  const stars = RARITY_STARS[bones.rarity];
  const shiny = bones.shiny ? ' ✨' : '';
  const info  = `${name} Lv.${state.level} [${bar}] ${state.xp % 100}/100 XP ${stars}${shiny}`;

  return [
    ...speechBubble(message),
    '    \\',
    ...renderSprite(bones),
    info,
  ].join('\n');
}

/** One-line status for statusLineCommand */
export function renderStatusLine(
  state: BuddyState,
  bones: CompanionBones,
  companionName?: string,
): string {
  const name = companionName ?? state.name;
  const face = renderFaceInline(bones);
  const bar  = xpBar(state.xp);
  return `${face} ${name} Lv.${state.level} [${bar}]`;
}

/** Level-up celebration box */
export function renderLevelUp(state: BuddyState): string {
  return [
    '╔══════════════════════════╗',
    `║  ✨ LEVEL UP! Now Lv.${state.level} ✨  ║`,
    '╚══════════════════════════╝',
  ].join('\n');
}
