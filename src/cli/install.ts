import { loadSettings, saveSettings, installBuddy, SETTINGS_PATH } from './settings.js';

export interface InstallOptions {
  silent?: boolean;
}

export function runInstall(opts: InstallOptions = {}): void {
  const settings = loadSettings();
  const updated = installBuddy(settings);
  saveSettings(updated);
  if (!opts.silent) {
    console.log(`✓ claude-buddy installed in ${SETTINGS_PATH}`);
    console.log('  Restart Claude Code to activate hooks and status line.');
  }
}
