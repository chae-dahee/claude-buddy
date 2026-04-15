/**
 * `claude-buddy companion` — show / reroll / edit companion bones.
 *
 * Usage:
 *   claude-buddy companion                    # show current companion
 *   claude-buddy companion --reroll           # roll a brand-new random pet
 *   claude-buddy companion --rarity epic      # directly set rarity and save
 *   claude-buddy companion --species blob     # directly set species and save
 */
import {
  loadCompanion, rollRandom, readStoredBones, saveStoredBones,
} from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { RARITY_STARS, renderFaceInline } from '../shared/render.js';
import type { Rarity, Species, Eye, Hat, CompanionBones } from '../shared/types.js';

const VALID_RARITIES  = new Set<string>(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const VALID_SPECIES   = new Set<string>([
  'duck','goose','blob','cat','dragon','octopus',
  'owl','penguin','turtle','snail','ghost','axolotl',
  'capybara','cactus','robot','rabbit','mushroom','chonk',
]);
const VALID_EYES      = new Set<string>(['·', '✦', '×', '◉', '@', '°']);
const VALID_HATS      = new Set<string>([
  'none','crown','tophat','propeller','halo','wizard','beanie','tinyduck',
]);

function parseArgs(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1] && !args[i + 1]!.startsWith('--') ? args[++i]! : 'true';
      out[key] = val;
    }
  }
  return out;
}

function showCompanion(bones: CompanionBones, name: string): void {
  const face  = renderFaceInline(bones);
  const stars = RARITY_STARS[bones.rarity];
  const shinyMark = bones.shiny ? ' ✨' : '';

  console.log(`\n  ${face} ${name}  ${stars}${shinyMark}`);
  console.log(`  species: ${bones.species}   eye: ${bones.eye}   hat: ${bones.hat}`);
  console.log(`  rarity:  ${bones.rarity}`);
  console.log(`  stats:   DEBUG:${bones.stats['DEBUGGING']} PAT:${bones.stats['PATIENCE']} CHAOS:${bones.stats['CHAOS']} WIS:${bones.stats['WISDOM']} SNARK:${bones.stats['SNARK']}`);
}

export function runCompanion(args: string[]): void {
  const opts = parseArgs(args);

  // --reroll: generate a brand-new random pet
  if ('reroll' in opts) {
    const config = loadConfig();
    const newBones = rollRandom();
    saveStoredBones(newBones);
    console.log('✓ New companion rolled!');
    showCompanion(newBones, config.name);
    return;
  }

  // Validate field overrides
  if (opts['rarity'] && !VALID_RARITIES.has(opts['rarity']!)) {
    console.error(`Invalid rarity "${opts['rarity']}". Valid: ${[...VALID_RARITIES].join(', ')}`);
    process.exit(1);
  }
  if (opts['species'] && !VALID_SPECIES.has(opts['species']!)) {
    console.error(`Invalid species "${opts['species']}". Valid: ${[...VALID_SPECIES].join(', ')}`);
    process.exit(1);
  }
  if (opts['eye'] && !VALID_EYES.has(opts['eye']!)) {
    console.error(`Invalid eye "${opts['eye']}". Valid: ${[...VALID_EYES].join(', ')}`);
    process.exit(1);
  }
  if (opts['hat'] && !VALID_HATS.has(opts['hat']!)) {
    console.error(`Invalid hat "${opts['hat']}". Valid: ${[...VALID_HATS].join(', ')}`);
    process.exit(1);
  }

  // Apply field overrides directly to stored bones
  const hasOverride = opts['rarity'] || opts['species'] || opts['eye'] || opts['hat'] || opts['shiny'];
  if (hasOverride) {
    const { bones: current } = loadCompanion();
    const updated: CompanionBones = {
      ...current,
      ...(opts['rarity']  ? { rarity:  opts['rarity']  as Rarity  } : {}),
      ...(opts['species'] ? { species: opts['species'] as Species } : {}),
      ...(opts['eye']     ? { eye:     opts['eye']     as Eye     } : {}),
      ...(opts['hat']     ? { hat:     opts['hat']     as Hat     } : {}),
      ...(opts['shiny']   ? { shiny:   opts['shiny'] === 'true'   } : {}),
    };
    saveStoredBones(updated);
    console.log('✓ Companion updated.');
    const config = loadConfig();
    showCompanion(updated, config.name);
    return;
  }

  // Default: show current companion
  const { bones, name } = loadCompanion();
  showCompanion(bones, name);
}
