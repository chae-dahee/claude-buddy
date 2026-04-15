/**
 * `claude-buddy active on|off` — toggle always-on full sprite in the status line.
 */
import { loadConfig, saveConfig } from '../shared/config.js';

export function runActive(args: string[]): void {
  const value = args[0];
  if (value !== 'on' && value !== 'off') {
    console.error('Usage: claude-buddy active on|off');
    process.exit(1);
  }

  const config = loadConfig();
  config.active = value === 'on';
  saveConfig(config);

  console.log(`Buddy always-on display: ${config.active ? 'ON' : 'OFF'}`);
}
