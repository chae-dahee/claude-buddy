export type Mood = 'neutral' | 'happy' | 'excited' | 'worried' | 'sad' | 'tired';

export type ReactionType =
  | 'test_pass'
  | 'code_written'
  | 'refactor'
  | 'explanation'
  | 'idle'
  | 'bash_error'
  | 'test_fail'
  | 'error_mentioned';

export interface BuddyState {
  name: string;
  mood: Mood;
  xp: number;
  level: number;
  lastReaction: string;
  lastUpdated: number;
}

export interface ReactionConfig {
  mood: Mood;
  xpReward: number;
  messages: string[];
}

export type ReactionMap = Record<ReactionType, ReactionConfig>;

// Hook stdin payloads (Claude Code hook protocol)
export interface PostToolUsePayload {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  tool_response?: {
    output?: string;
    error?: string;
    /** Non-zero when the shell command exited with an error code */
    exit_code?: number;
    interrupted?: boolean;
  };
}

export interface StopPayload {
  transcript_path?: string;
  stop_hook_active?: boolean;
}

// JSONL transcript line (assistant message)
export interface TranscriptLine {
  role?: string;
  type?: string;
  message?: {
    role?: string;
    content?: Array<{ type: string; text?: string }> | string;
  };
}
