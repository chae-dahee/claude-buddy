import type { ReactionType, ReactionMap, PostToolUsePayload } from './types.js';

export const REACTION_MAP: ReactionMap = {
  test_pass: {
    mood: 'excited',
    xpReward: 10,
    messages: [
      'All tests passing! Woohoo!',
      'Green across the board!',
      'Tests are green, feeling great!',
      'That\'s what I\'m talking about!',
    ],
  },
  code_written: {
    mood: 'happy',
    xpReward: 5,
    messages: [
      'Nice, new code landed!',
      'Another piece of the puzzle!',
      'Code shipped, love it!',
      'Looking good out there!',
    ],
  },
  refactor: {
    mood: 'happy',
    xpReward: 5,
    messages: [
      'Cleaner code, cleaner mind!',
      'Refactor complete, very tidy!',
      'Ahhh, that\'s better.',
      'Code quality +1!',
    ],
  },
  explanation: {
    mood: 'neutral',
    xpReward: 3,
    messages: [
      'Making things clearer!',
      'Knowledge is power.',
      'Explanation delivered!',
      'Hope that helps!',
    ],
  },
  idle: {
    mood: 'tired',
    xpReward: 2,
    messages: [
      'Just chilling here...',
      'Ready when you are!',
      'Patiently waiting...',
      '*yawns*',
    ],
  },
  bash_error: {
    mood: 'worried',
    xpReward: 1,
    messages: [
      'Uh oh, command failed!',
      'That didn\'t go as planned...',
      'Error detected! You got this.',
      'Oops! Let\'s figure this out.',
    ],
  },
  test_fail: {
    mood: 'sad',
    xpReward: 1,
    messages: [
      'Tests are failing... :(',
      'Aw, something broke.',
      'Don\'t give up! Fix incoming?',
      'Red tests... we\'ll get there.',
    ],
  },
  error_mentioned: {
    mood: 'worried',
    xpReward: 1,
    messages: [
      'Sounds like there\'s an issue...',
      'Error vibes detected.',
      'Hang in there!',
      'Tracking the problem...',
    ],
  },
};

// --- PostToolUse detection (Bash output analysis) ---

const TEST_PASS_PATTERNS = [
  /\d+ (test|tests|spec|specs) passed/i,
  /\d+ passing/i,
  /Tests:\s+\d+ passed/i,
  /All tests passed/i,
  /OK \(\d+ test/i,
  /✓|✔|passed/i,
];

const TEST_FAIL_PATTERNS = [
  /\d+ (test|tests|spec|specs) failed/i,
  /\d+ failing/i,
  /Tests:\s+\d+ failed/i,
  /FAIL /i,
  /AssertionError/i,
  /✗|✘|FAILED/,
];

export function detectPostToolReaction(payload: PostToolUsePayload): ReactionType {
  const response = payload.tool_response;
  const output = response?.output ?? '';
  const hasErrorField = !!response?.error;
  // Non-zero exit code is a reliable signal that the command failed
  const exitCode = response?.exit_code ?? 0;
  const hasNonZeroExit = exitCode !== 0;

  // Priority 1: bash_error (explicit error field, non-zero exit, or Error: prefix in output)
  // — but test failures also produce non-zero exits, so check test patterns first
  const looksLikeError = hasErrorField || hasNonZeroExit || /^(Error|error):/m.test(output);
  if (looksLikeError) {
    if (TEST_FAIL_PATTERNS.some((p) => p.test(output))) return 'test_fail';
    return 'bash_error';
  }

  // Priority 2: test failure detected in output (zero exit, but output says fail)
  if (TEST_FAIL_PATTERNS.some((p) => p.test(output))) return 'test_fail';

  // Priority 3: test pass
  if (TEST_PASS_PATTERNS.some((p) => p.test(output))) return 'test_pass';

  // Default
  return 'idle';
}

// --- Stop hook detection (transcript last assistant message) ---

const REFACTOR_PATTERNS = [
  /refactor/i,
  /rewrite/i,
  /clean.?up/i,
  /restructur/i,
  /reorganiz/i,
];

const CODE_WRITTEN_PATTERNS = [
  /```[\w]*/,                 // fenced code block
  /\bimplemented\b/i,
  /\badded\b.*\bfunction\b/i,
  /\bcreated\b.*\bfile\b/i,
  /\bwrote\b/i,
];

const ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bexception\b/i,
  /\bfix\b/i,
  /\bbug\b/i,
  /\bcrash\b/i,
];

export function detectStopReaction(lastAssistantText: string): ReactionType {
  if (!lastAssistantText.trim()) return 'idle';

  // Priority 1: error/fix mentions
  if (ERROR_PATTERNS.some((p) => p.test(lastAssistantText))) return 'error_mentioned';

  // Priority 2: refactor
  if (REFACTOR_PATTERNS.some((p) => p.test(lastAssistantText))) return 'refactor';

  // Priority 3: code block or implementation statement
  if (CODE_WRITTEN_PATTERNS.some((p) => p.test(lastAssistantText))) return 'code_written';

  // Priority 4: general text (explanation)
  if (lastAssistantText.trim().length > 20) return 'explanation';

  return 'idle';
}

/** Pick a random message from the reaction config */
export function pickMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}
