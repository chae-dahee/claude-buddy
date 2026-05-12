#!/usr/bin/env node
'use strict';
// CommonJS wrapper (.cjs) — works regardless of package "type": "module".
// Uses dynamic import() to load the ESM dist modules.

const path = require('path');
const distDir = path.resolve(__dirname, '..', 'dist');

const [, , command, ...args] = process.argv;

async function main() {
  function distUrl(mod) {
    return 'file://' + path.join(distDir, mod).replace(/\\/g, '/');
  }

  async function load(mod) {
    try {
      return await import(distUrl(mod));
    } catch (err) {
      console.error(`claude-buddy: dist not built. Run \`npm run build\` first.\n${err.message}`);
      process.exit(1);
    }
  }

  switch (command) {
    case 'companion': {
      const { runCompanion } = await load('cli/companion.js');
      runCompanion(args);
      break;
    }
    case 'show': {
      const { runShow } = await load('cli/show.js');
      runShow();
      break;
    }
    case 'statusline': {
      await load('statusline/status-line.js');
      break;
    }
    case 'setup': {
      const { runSetup } = await load('cli/setup.js');
      runSetup(args);
      break;
    }
    default: {
      console.log(`claude-buddy — terminal companion (statusline-only)

Usage:
  claude-buddy companion                            Show current companion
  claude-buddy companion --reroll                   Roll a new random companion
  claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown
                                                    Edit companion fields directly
  claude-buddy show                                 Print buddy directly to terminal
  claude-buddy setup                                Install into statusline.sh
  claude-buddy setup --uninstall                    Remove from statusline.sh

Integration (auto):
  claude-buddy setup

Integration (manual):
  Append this single line to your ~/.claude/statusline.sh:

      command -v claude-buddy &>/dev/null && claude-buddy statusline
`);
      if (command) process.exit(1);
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
