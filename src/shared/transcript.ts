import * as fs from 'fs';
import type { TranscriptLine } from './types.js';

/**
 * Parse a JSONL transcript file and return the last assistant message text.
 * Handles both the old (role/content array) and new (message wrapper) formats defensively.
 */
export function extractLastAssistantText(transcriptPath: string): string {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';

  let raw: string;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf-8');
  } catch {
    return '';
  }

  const lines = raw.split('\n').filter((l) => l.trim());
  let lastText = '';

  for (const line of lines) {
    let entry: TranscriptLine;
    try {
      entry = JSON.parse(line) as TranscriptLine;
    } catch {
      continue;
    }

    const text = extractAssistantText(entry);
    if (text !== null) {
      lastText = text;
    }
  }

  return lastText;
}

function extractAssistantText(entry: TranscriptLine): string | null {
  // Format A: { role: "assistant", message: { content: [...] } }
  if (entry.message?.role === 'assistant') {
    return contentToText(entry.message.content);
  }

  // Format B: { role: "assistant", content: [...] }  (direct, no wrapper)
  if (entry.role === 'assistant') {
    return contentToText((entry as unknown as { content?: TranscriptLine['message'] }).content);
  }

  return null;
}

function contentToText(
  content: TranscriptLine['message'] extends { content?: infer C } ? C : unknown
): string {
  if (!content) return '';

  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .filter((c): c is { type: string; text: string } => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text)
      .join('\n');
  }

  return '';
}
