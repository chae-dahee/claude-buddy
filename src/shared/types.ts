// ─── Companion / Gacha types ──────────────────────────────────────────────────

/** Sprite identity — one of 18 ASCII art designs. */
export type Species =
  | 'duck' | 'goose' | 'blob' | 'cat' | 'dragon' | 'octopus'
  | 'owl' | 'penguin' | 'turtle' | 'snail' | 'ghost' | 'axolotl'
  | 'capybara' | 'cactus' | 'robot' | 'rabbit' | 'mushroom' | 'chonk';

/** Base eye glyph — substituted into the sprite's `{E}` placeholders. */
export type Eye = '·' | '✦' | '×' | '◉' | '@' | '°';

/** Optional hat overlay rendered as line 0 above the sprite. */
export type Hat =
  | 'none' | 'crown' | 'tophat' | 'propeller'
  | 'halo' | 'wizard' | 'beanie' | 'tinyduck';

/** Drop tier — drives weighted roll, color, stars, and stat floor. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Companion stat axes — one peak, one dump, three middle per roll. */
export type StatName = 'DEBUGGING' | 'PATIENCE' | 'CHAOS' | 'WISDOM' | 'SNARK';

/** Persisted gacha roll for a buddy — everything except the display name. */
export interface CompanionBones {
  /** Drop tier */
  rarity: Rarity;
  /** Sprite identity */
  species: Species;
  /** Base eye glyph */
  eye: Eye;
  /** Equipped hat ('none' for common, random otherwise) */
  hat: Hat;
  /** 1% independent chance — adds a sparkle line on render */
  shiny: boolean;
  /** 1..100 score per stat axis */
  stats: Record<StatName, number>;
}
