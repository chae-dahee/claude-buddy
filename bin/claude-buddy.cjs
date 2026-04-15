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
    case 'status': {
      const { runStatus } = await load('cli/status.js');
      runStatus();
      break;
    }
    case 'reset': {
      const { runReset } = await load('cli/reset.js');
      runReset();
      break;
    }
    default: {
      console.log(`claude-buddy — terminal companion for Claude Code

Usage:
  claude-buddy install     Add hooks & status line to ~/.claude/settings.json
  claude-buddy uninstall   Remove buddy configuration
  claude-buddy status      Show current buddy state
  claude-buddy reset       Reset buddy state to defaults
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
