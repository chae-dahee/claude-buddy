/**
 * Companion system — gacha roll engine.
 *
 * Bones (species, eye, hat, rarity, shiny, stats) are recomputed from the
 * stable UUID stored in ~/.claude-buddy/config.json so they are consistent
 * across sessions without depending on ~/.claude.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type { Species, Eye, Hat, Rarity, StatName, CompanionBones } from './types.js';
import { loadConfig } from './config.js';

const COMPANION_PATH = path.join(
  process.env['CLAUDE_BUDDY_STATE_DIR'] ?? path.join(os.homedir(), '.claude-buddy'),
  'companion.json',
);

const SALT = 'friend-2026-401';

// ─── Hash & PRNG ─────────────────────────────────────────────────────────────

/** FNV-1a hash → 32-bit unsigned integer */
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

/** Roll bones deterministically from a string seed */
export function roll(seed: string): CompanionBones {
  return rollFrom(mulberry32(hashString(seed + SALT)));
}

/** Roll bones with true randomness (crypto.getRandomValues) */
export function rollRandom(): CompanionBones {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return rollFrom(mulberry32(buf[0]!));
}

// ─── Companion storage ────────────────────────────────────────────────────────

const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'] as const;

function isValidBones(v: unknown): v is CompanionBones {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  if (typeof b['rarity'] !== 'string') return false;
  if (typeof b['species'] !== 'string') return false;
  if (typeof b['eye'] !== 'string') return false;
  if (typeof b['hat'] !== 'string') return false;
  if (typeof b['shiny'] !== 'boolean') return false;
  if (!b['stats'] || typeof b['stats'] !== 'object') return false;
  const stats = b['stats'] as Record<string, unknown>;
  return STAT_NAMES.every((s) => typeof stats[s] === 'number');
}

/** Read stored bones from ~/.claude-buddy/companion.json (returns undefined if missing or invalid) */
export function readStoredBones(): CompanionBones | undefined {
  try {
    const raw = fs.readFileSync(COMPANION_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return isValidBones(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Write bones to ~/.claude-buddy/companion.json */
export function saveStoredBones(bones: CompanionBones): void {
  const dir = path.dirname(COMPANION_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(COMPANION_PATH, JSON.stringify(bones, null, 2), 'utf-8');
}

/**
 * Load companion: reads stored bones from companion.json.
 * On first run (no file), rolls a random pet and saves it automatically.
 * Returns bones + companion name from config.
 */
export function loadCompanion(): { bones: CompanionBones; name: string } {
  const config = loadConfig();
  const stored = readStoredBones();
  const bones = stored ?? (() => {
    const fresh = rollRandom();
    saveStoredBones(fresh);
    return fresh;
  })();
  return { bones, name: config.name };
}
