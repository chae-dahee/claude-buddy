/**
 * `claude-buddy companion` — pin / show / clear companion bones.
 *
 * Why this exists:
 *   Claude Code runs in Bun and uses Bun.hash() (wyhash, native C).
 *   claude-buddy runs in Node.js and uses FNV-1a as fallback.
 *   These produce different seeds → different rolls for the same userId.
 *   Pinning lets you lock in the correct species/rarity/eye/hat so that
 *   the rendered sprite matches what you see in Claude Code.
 *
 * Usage:
 *   claude-buddy companion                          # show current bones
 *   claude-buddy companion --rarity epic            # pin rarity only
 *   claude-buddy companion --species blob --eye ✦   # pin multiple fields
 *   claude-buddy companion --clear                  # revert to computed bones
 */
import {
  loadCompanion, readPinnedBones, savePinnedBones, clearPinnedBones, roll, companionUserId,
} from '../shared/companion.js';
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

  // --clear: remove pin file and revert to computed bones
  if ('clear' in opts) {
    clearPinnedBones();
    const { bones, stored } = loadCompanion();
    const face = renderFaceInline(bones);
    console.log(`✓ Pin cleared. Reverted to computed bones:`);
    console.log(`  ${face} ${stored.name} · ${bones.rarity} ${bones.species} eye:${bones.eye} hat:${bones.hat}`);
    return;
  }

  // Build override object from flags
  const override: Record<string, unknown> = {};
  let changed = false;

  if (opts['rarity']) {
    if (!VALID_RARITIES.has(opts['rarity']!)) {
      console.error(`Invalid rarity "${opts['rarity']}". Valid: ${[...VALID_RARITIES].join(', ')}`);
      process.exit(1);
    }
    override['rarity'] = opts['rarity'] as Rarity;
    changed = true;
  }
  if (opts['species']) {
    if (!VALID_SPECIES.has(opts['species']!)) {
      console.error(`Invalid species "${opts['species']}". Valid: ${[...VALID_SPECIES].join(', ')}`);
      process.exit(1);
    }
    override['species'] = opts['species'] as Species;
    changed = true;
  }
  if (opts['eye']) {
    if (!VALID_EYES.has(opts['eye']!)) {
      console.error(`Invalid eye "${opts['eye']}". Valid: ${[...VALID_EYES].join(', ')}`);
      process.exit(1);
    }
    override['eye'] = opts['eye'] as Eye;
    changed = true;
  }
  if (opts['hat']) {
    if (!VALID_HATS.has(opts['hat']!)) {
      console.error(`Invalid hat "${opts['hat']}". Valid: ${[...VALID_HATS].join(', ')}`);
      process.exit(1);
    }
    override['hat'] = opts['hat'] as Hat;
    changed = true;
  }
  if (opts['shiny']) {
    override['shiny'] = opts['shiny'] === 'true';
    changed = true;
  }

  if (changed) {
    // Merge with existing pin so you can patch individual fields incrementally
    const existing = readPinnedBones() ?? {};
    savePinnedBones({ ...existing, ...override });
    console.log(`✓ Companion pinned.`);
  }

  // Always show current state
  const { bones, stored } = loadCompanion();
  const computed = roll(companionUserId());
  const pinned   = readPinnedBones();
  const face     = renderFaceInline(bones);
  const stars    = RARITY_STARS[bones.rarity];
  const shinyMark = bones.shiny ? ' ✨' : '';

  console.log(`\n  ${face} ${stored.name}  ${stars}${shinyMark}`);
  console.log(`  species: ${bones.species}   eye: ${bones.eye}   hat: ${bones.hat}`);
  console.log(`  rarity:  ${bones.rarity}`);

  if (pinned && Object.keys(pinned).length > 0) {
    const overriddenFields = Object.keys(pinned).join(', ');
    console.log(`\n  [pinned: ${overriddenFields}]`);
    console.log(`  computed rarity was: ${computed.rarity} (FNV-1a hash — may differ from Bun.hash)`);
    console.log(`  run \`claude-buddy companion --clear\` to revert`);
  } else {
    console.log(`\n  [no pin — using computed bones (FNV-1a hash)]`);
    console.log(`  If rarity/eye differs from Claude Code, run:`);
    console.log(`  claude-buddy companion --rarity <r> --species <s> --eye <e> --hat <h>`);
  }
}
