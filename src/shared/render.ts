import type { Species, Eye, Hat, Rarity, CompanionBones } from './types.js';
import type { BuddyConfig } from './config.js';
import { pickMessage } from './messages.js';

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

// ─── Rarity stars & colors ───────────────────────────────────────────────────

export const RARITY_STARS: Record<Rarity, string> = {
  common:    '★',
  uncommon:  '★★',
  rare:      '★★★',
  epic:      '★★★★',
  legendary: '★★★★★',
};

/** ANSI color per rarity. Empty string = no color (common uses terminal default). */
export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '',
  uncommon:  '\x1b[32m',   // green
  rare:      '\x1b[94m',   // bright blue
  epic:      '\x1b[95m',   // bright magenta (purple)
  legendary: '\x1b[93m',   // bright yellow (gold)
};

const RESET = '\x1b[0m';

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

/** Compact inline face (eye substituted) — used by gacha CLI summary */
export function renderFaceInline(bones: CompanionBones): string {
  return applyEye(FACE_INLINE[bones.species], bones.eye);
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

/** 10-cell bar from a 0..1 progress value (clamped) */
export function progressBar(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  const filled = Math.floor(p * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// ─── Time-based progression ───────────────────────────────────────────────────

/** One level per 7 days since the buddy was created. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface Progression {
  /** 1-indexed level (1 at creation, +1 each WEEK_MS) */
  level: number;
  /** Progress through the current level, 0..1 */
  progress: number;
}

export function progressionFromAge(createdAt: number, now: number = Date.now()): Progression {
  const elapsed = Math.max(0, now - createdAt);
  return {
    level: Math.floor(elapsed / WEEK_MS) + 1,
    progress: (elapsed % WEEK_MS) / WEEK_MS,
  };
}

// ─── Composed character render ────────────────────────────────────────────────

export interface CharacterRenderOptions {
  /** Override "now" for deterministic tests */
  now?: Date;
  /** Override Math.random — pickMessage uses this */
  rng?: () => number;
  /** When false, suppress the random one-liner (used by `claude-buddy show`) */
  withMessage?: boolean;
}

/**
 * Compose the full character display: sprite (+ hat), info line, optional
 * shiny sparkle line. Returns lines so callers can join with '\n' or pipe to
 * stdout as needed. Shared by the statusline renderer and the `show` CLI.
 */
export function renderCharacter(
  bones: CompanionBones,
  config: BuddyConfig,
  opts: CharacterRenderOptions = {},
): string[] {
  const now = opts.now ?? new Date();
  const { level, progress } = progressionFromAge(config.createdAt, now.getTime());

  const color = RARITY_COLORS[bones.rarity];
  const reset = color ? RESET : '';

  const stars      = RARITY_STARS[bones.rarity];
  const bar        = progressBar(progress);
  const rarityTag  = `${color}${stars} ${bones.rarity}${reset}`;

  const head = `${config.name} Lv.${level} [${bar}] ${rarityTag}`;
  const info = opts.withMessage === false
    ? head
    : `${head} · ${pickMessage(now, opts.rng)}`;

  // Apply rarity color to each sprite line for a cohesive look
  const spriteLines = renderSprite(bones).map((l) => color ? `${color}${l}${reset}` : l);

  const lines = [...spriteLines, info];
  if (bones.shiny) lines.push(`${color}  ✦ ✨ ✦ ✨ ✦${reset}`);
  return lines;
}
