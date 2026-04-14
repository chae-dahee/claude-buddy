import * as fs from 'fs';

/**
 * Write text directly to the terminal, bypassing Claude Code's stdout pipeline.
 *
 * - macOS / Linux : opens /dev/tty (the controlling terminal device)
 * - Windows       : opens \\.\CON  (the Windows console device equivalent)
 * - CI / no-tty   : falls back to stderr so output is never silently dropped
 *
 * Because we write to the terminal device rather than stdout, the text appears
 * in the user's terminal but is NOT captured by Claude Code as hook output.
 */
export function writeTty(text: string): void {
  const output = `\n${text}\n`;

  if (process.platform === 'win32') {
    writeWindows(output);
  } else {
    writeUnix(output);
  }
}

function writeUnix(output: string): void {
  try {
    const fd = fs.openSync('/dev/tty', 'w');
    fs.writeSync(fd, output);
    fs.closeSync(fd);
  } catch {
    process.stderr.write(output);
  }
}

function writeWindows(output: string): void {
  try {
    // \\.\CON is the Windows device path for the active console
    const fd = fs.openSync('\\\\.\\CON', 'w');
    fs.writeSync(fd, output);
    fs.closeSync(fd);
  } catch {
    // Fallback: stderr always reaches the terminal on Windows too
    process.stderr.write(output);
  }
}
