/**
 * Statusline character renderer.
 *
 * Designed to be appended as ONE line in the user's existing
 * ~/.claude/statusline-command.sh:
 *
 *   node /path/to/dist/statusline/status-line.js
 *
 * Reads stdin (Claude Code pipes its session JSON) to extract transcript_path,
 * then uses transcript line count to determine which frame (0 or 1) to render.
 * Frame 1 uses EYE_ALT for a blinking/alternating expression effect.
 * Never modifies settings.json. Failures are silent.
 */
import { readFileSync } from 'fs';
import { loadCompanion } from '../shared/companion.js';
import { loadConfig } from '../shared/config.js';
import { renderCharacter } from '../shared/render.js';

interface StatusLineInput {
  transcript_path?: string;
}

function readStdinJson(): StatusLineInput {
  try {
    const raw = readFileSync(0, 'utf-8');
    return JSON.parse(raw) as StatusLineInput;
  } catch {
    return {};
  }
}

function frameFromTranscript(p: string | undefined): 0 | 1 {
  if (!p) return 0;
  try {
    const raw = readFileSync(p, 'utf-8');
    const lineCount = raw.split('\n').filter((l) => l.length > 0).length;
    return (lineCount % 2) as 0 | 1;
  } catch {
    return 0;
  }
}

function main(): void {
  const input = readStdinJson();
  try {
    const config = loadConfig();
    const { bones } = loadCompanion();
    const frame = frameFromTranscript(input.transcript_path);
    const lines = renderCharacter(bones, config, { frame });
    process.stdout.write(lines.join('\n') + '\n');
  } catch {
    // Silent: never break the host statusline
  }
}

main();
