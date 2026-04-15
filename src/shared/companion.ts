/**
 * Companion system — deterministic gacha roll + ~/.claude.json reader.
 *
 * Bones (species, eye, hat, rarity, shiny, stats) are recomputed every time
 * from the userId hash so they can never be faked by editing the config file.
 * Only the soul (name, personality, hatchedAt) is read from ~/.claude.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Species, Eye, Hat, Rarity, StatName, CompanionBones, StoredCompanion } from './types.js';

const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');
const SALT = 'friend-2026-401';

// ─── Hash & PRNG ─────────────────────────────────────────────────────────────

/** FNV-1a hash → 32-bit unsigned integer (Node.js path; Bun uses Bun.hash) */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — tiny, fast, fully deterministic */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Roll algorithm ──────────────────────────────────────────────────────────

const SPECIES: Species[] = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus',
  'owl', 'penguin', 'turtle', 'snail', 'ghost', 'axolotl',
  'capybara', 'cactus', 'robot', 'rabbit', 'mushroom', 'chonk',
];

const EYES: Eye[] = ['·', '✦', '×', '◉', '@', '°'];

const HATS: Hat[] = [
  'none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck',
];

const RARITY_TABLE: [Rarity, number][] = [
  ['common', 60], ['uncommon', 25], ['rare', 10], ['epic', 4], ['legendary', 1],
];

const RARITY_FLOORS: Record<Rarity, number> = {
  common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50,
};

function weightedPick<T>(rng: () => number, table: [T, number][]): T {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, weight] of table) {
    r -= weight;
    if (r <= 0) return item;
  }
  return table[table.length - 1]![0];
}

/**
 * Roll companion bones from a seeded PRNG.
 * Call order matches the spec exactly (rarity → species → eye → hat → shiny → stats).
 */
export function rollFrom(rng: () => number): CompanionBones {
  // 1. Rarity
  const rarity = weightedPick(rng, RARITY_TABLE);

  // 2. Species
  const species = SPECIES[Math.floor(rng() * SPECIES.length)]!;

  // 3. Eye
  const eye = EYES[Math.floor(rng() * EYES.length)]!;

  // 4. Hat — common is forced to 'none' (no rng call consumed)
  const hat: Hat = rarity === 'common'
    ? 'none'
    : HATS[Math.floor(rng() * HATS.length)]!;

  // 5. Shiny (1% independent of rarity)
  const shiny = rng() < 0.01;

  // 6. Stats
  const statNames: StatName[] = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];
  const peakIdx = Math.floor(rng() * statNames.length);
  let dumpIdx = peakIdx;
  while (dumpIdx === peakIdx) dumpIdx = Math.floor(rng() * statNames.length);

  const floor = RARITY_FLOORS[rarity];
  const stats = {} as Record<StatName, number>;
  for (let i = 0; i < statNames.length; i++) {
    const name = statNames[i]!;
    if (i === peakIdx) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (i === dumpIdx) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }

  return { rarity, species, eye, hat, shiny, stats };
}

/** Roll bones deterministically from a userId string */
export function roll(userId: string): CompanionBones {
  return rollFrom(mulberry32(hashString(userId + SALT)));
}

// ─── ~/.claude.json readers ───────────────────────────────────────────────────

/** Read stored soul from ~/.claude.json → config.companion */
export function readStoredCompanion(): StoredCompanion | undefined {
  try {
    const raw = fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    const companion = config['companion'] as StoredCompanion | undefined;
    if (!companion?.name) return undefined;
    return companion;
  } catch {
    return undefined;
  }
}

/** Resolve userId from ~/.claude.json (OAuth → local → 'anon') */
export function companionUserId(): string {
  try {
    const raw = fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    const oauth = config['oauthAccount'] as Record<string, string> | undefined;
    if (oauth?.accountUuid) return oauth.accountUuid;
    const userID = config['userID'] as string | undefined;
    if (userID) return userID;
  } catch {
    // fallback to 'anon'
  }
  return 'anon';
}

/** Load companion: stored soul + deterministically computed bones */
export function loadCompanion(): { bones: CompanionBones; stored: StoredCompanion } {
  const stored = readStoredCompanion() ?? { name: 'Buddy', personality: '', hatchedAt: 0 };
  const bones = roll(companionUserId());
  return { bones, stored };
}
