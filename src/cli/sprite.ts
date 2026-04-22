/**
 * `claude-buddy sprite on|off` — toggle full character sprite output to the
 * terminal scrollback on each Stop event. Independent of `active` (status line).
 */
import { loadConfig, saveConfig } from '../shared/config.js';

export function runSprite(args: string[]): void {
  const value = args[0];
  if (value !== 'on' && value !== 'off') {
    console.error('Usage: claude-buddy sprite on|off');
    process.exit(1);
  }

  const config = loadConfig();
  config.sprite = value === 'on';
  saveConfig(config);

  console.log(`Buddy full character sprite (scrollback): ${config.sprite ? 'ON' : 'OFF'}`);
}
