#!/usr/bin/env node
'use strict';
// CommonJS wrapper (.cjs) — works regardless of package "type": "module".
// Uses dynamic import() to load the ESM dist modules.

const path = require('path');
const distDir = path.resolve(__dirname, '..', 'dist');

const [, , command, ...args] = process.argv;

async function main() {
  function distUrl(mod) {
    // Convert to file:// URL so ESM import() resolves correctly cross-platform
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
    case 'install': {
      const { runInstall } = await load('cli/install.js');
      runInstall({ silent: args.includes('--silent') });
      break;
    }
    case 'uninstall': {
      const { runUninstall } = await load('cli/uninstall.js');
      runUninstall({ silent: args.includes('--silent') });
      break;
    }
    case 'reset': {
      const { runReset } = await load('cli/reset.js');
      runReset();
      break;
    }
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
    case 'active': {
      const { runActive } = await load('cli/active.js');
      runActive(args);
      break;
    }
    case 'sprite': {
      const { runSprite } = await load('cli/sprite.js');
      runSprite(args);
      break;
    }
    default: {
      console.log(`claude-buddy — terminal companion

Usage:
  claude-buddy install          Add hooks & status line to ~/.claude/settings.json
  claude-buddy uninstall        Remove buddy configuration
  claude-buddy show             Show buddy with full sprite in terminal
  claude-buddy reset            Reset buddy state to defaults
  claude-buddy companion        Show companion species/rarity/eye/hat/stats
  claude-buddy companion --reroll
                                Roll a brand-new random companion
  claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown
                                Directly edit companion fields
  claude-buddy active on|off    Toggle compact one-line status (status bar)
  claude-buddy sprite on|off    Toggle full character sprite in scrollback on Stop
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
