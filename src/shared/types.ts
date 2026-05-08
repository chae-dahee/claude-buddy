// ─── Companion / Gacha types ──────────────────────────────────────────────────

export type Species =
  | 'duck' | 'goose' | 'blob' | 'cat' | 'dragon' | 'octopus'
  | 'owl' | 'penguin' | 'turtle' | 'snail' | 'ghost' | 'axolotl'
  | 'capybara' | 'cactus' | 'robot' | 'rabbit' | 'mushroom' | 'chonk';

export type Eye = '·' | '✦' | '×' | '◉' | '@' | '°';

export type Hat =
  | 'none' | 'crown' | 'tophat' | 'propeller'
  | 'halo' | 'wizard' | 'beanie' | 'tinyduck';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type StatName = 'DEBUGGING' | 'PATIENCE' | 'CHAOS' | 'WISDOM' | 'SNARK';

export interface CompanionBones {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
}
