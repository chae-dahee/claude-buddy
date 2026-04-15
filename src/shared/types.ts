export type Mood = 'neutral' | 'happy' | 'excited' | 'worried' | 'sad' | 'tired';

// ─── Companion / Gacha types ──────────────────────────────────────────────────

export type Species =
  | 'duck' | 'goose' | 'blob' | 'cat' | 'dragon' | 'octopus'
  | 'owl' | 'penguin' | 'turtle' | 'snail' | 'ghost' | 'axolotl'
  | 'capybara' | 'cactus' | 'robot' | 'rabbit' | 'mushroom' | 'chonk';

export type Eye = '·' | '✦' | '×' | '◉' | '@' | '°';

export type Hat =
  | 'none' | 'crown' | 'tophat' | 'propeller'
  | 'halo' | 'wizard' | 'beanie' | 'tinyduck';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type StatName = 'DEBUGGING' | 'PATIENCE' | 'CHAOS' | 'WISDOM' | 'SNARK';

export interface CompanionBones {
  rarity: Rarity;
  species: Species;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Record<StatName, number>;
}

// ─── Reaction system ─────────────────────────────────────────────────────────

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
