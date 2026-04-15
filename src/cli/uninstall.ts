import { loadSettings, saveSettings, uninstallBuddy, SETTINGS_PATH } from './settings.js';

export interface UninstallOptions {
  silent?: boolean;
}

export function runUninstall(opts: UninstallOptions = {}): void {
  const settings = loadSettings();
  const updated = uninstallBuddy(settings);
  saveSettings(updated);
  if (!opts.silent) {
    console.log(`✓ claude-buddy removed from ${SETTINGS_PATH}`);
  }
}
