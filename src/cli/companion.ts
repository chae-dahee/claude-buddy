/**
 * `claude-buddy companion` — show companion bones.
 *
 * Usage:
 *   claude-buddy companion                    # show current companion
 *   claude-buddy companion --rarity epic      # override rarity display only
 *   claude-buddy companion --species blob     # override species display only
 */
import { loadCompanion, roll } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { RARITY_STARS, renderFaceInline } from '../shared/render.js';
import type { Rarity, Species, Eye, Hat } from '../shared/types.js';

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

export function runCompanion(args: string[]): void {
  const opts = parseArgs(args);

  // Validate any field overrides provided as flags
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

  const config = loadConfig();
  const { bones: base, name } = loadCompanion();

  // Apply any flag overrides for display only (not saved — will be replaced in Phase 2)
  const bones = {
    ...base,
    ...(opts['rarity']  ? { rarity:  opts['rarity']  as Rarity  } : {}),
    ...(opts['species'] ? { species: opts['species'] as Species } : {}),
    ...(opts['eye']     ? { eye:     opts['eye']     as Eye     } : {}),
    ...(opts['hat']     ? { hat:     opts['hat']     as Hat     } : {}),
    ...(opts['shiny']   ? { shiny:   opts['shiny'] === 'true'   } : {}),
  };

  const face  = renderFaceInline(bones);
  const stars = RARITY_STARS[bones.rarity];
  const shinyMark = bones.shiny ? ' ✨' : '';

  console.log(`\n  ${face} ${name}  ${stars}${shinyMark}`);
  console.log(`  species: ${bones.species}   eye: ${bones.eye}   hat: ${bones.hat}`);
  console.log(`  rarity:  ${bones.rarity}`);
  console.log(`\n  [seed: ${config.id.slice(0, 8)}...]`);

  if (Object.keys(opts).length > 0) {
    const overridden = Object.keys(opts).join(', ');
    console.log(`  [display override: ${overridden} — run without flags to see real bones]`);
  }
}
