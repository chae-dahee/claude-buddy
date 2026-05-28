import type { Species, Eye, Hat, Rarity, CompanionBones } from './types.js';
import type { BuddyConfig } from './config.js';
import { pickMessage } from './messages.js';

// ─── Sprite art (4 lines per species, {E} = eye placeholder) ─────────────────

/** 4-line ASCII sprite per species. `{E}` placeholders are replaced with the eye glyph at render time. */
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

/** Single-line hat art prepended above the sprite. `'none'` is an empty string so callers can skip the row. */
export const HAT_LINES: Record<Hat, string> = {
  none:       '',
  crown:      '   \\^^^/    ',
  tophat:     '   [___]    ',
  propeller:  '    -+-     ',
  halo:       '   (   )    ',
  wizard:     '    /^\\    ',
  beanie:     '   (___)    ',
  tinyduck:   '     ,>     ',
};

// ─── Compact inline face (for status line) ───────────────────────────────────

/** Single-line face used by the gacha CLI summary — same `{E}` substitution as SPRITES. */
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

/** Star count per rarity — 1 for common up to 5 for legendary. */
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
  epic:      '\x1b[38;5;135m', // purple
  legendary: '\x1b[93m',   // bright yellow (gold)
};

const RESET = '\x1b[0m';

// ─── Expression frames ────────────────────────────────────────────────────────

/** Frame-1 (alt) eye characters keyed by base Eye. */
export const EYE_ALT: Record<Eye, string> = {
  '·': '_',
  '✦': '·',
  '×': '+',
  '◉': '-',
  '@': '×',
  '°': "'",
};

// ─── Render helpers ───────────────────────────────────────────────────────────

function applyEye(template: string, eye: string): string {
  return template.replaceAll('{E}', eye);
}

/** Render species sprite lines, with hat prepended if equipped */
export function renderSprite(bones: CompanionBones, frame: 0 | 1 = 0): string[] {
  const eyeChar = frame === 0 ? bones.eye : EYE_ALT[bones.eye];
  const lines = SPRITES[bones.species].map((l) => applyEye(l, eyeChar));
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
  /** 0 = base eye, 1 = EYE_ALT. Defaults to 0. */
  frame?: 0 | 1;
  /**
   * State-based level override. When provided, used instead of progressionFromAge.
   * Pass state.level + state.exp/threshold(state.level) for Phase 1+ EXP system.
   */
  stateLevel?: number;
  /** Progress fraction 0..1 derived from state.exp / threshold(state.level). */
  stateProgress?: number;
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
  const progression = (opts.stateLevel !== undefined && opts.stateProgress !== undefined)
    ? { level: opts.stateLevel, progress: opts.stateProgress }
    : progressionFromAge(config.createdAt, now.getTime());
  const { level, progress } = progression;

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
  const frame = opts.frame ?? 0;
  const spriteLines = renderSprite(bones, frame).map((l) => color ? `${color}${l}${reset}` : l);

  const lines = [...spriteLines, info];
  if (bones.shiny) lines.push(`${color}  ✦ ✨ ✦ ✨ ✦${reset}`);
  return lines;
}
