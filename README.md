# claude-buddy

A terminal companion for [Claude Code](https://claude.ai/code).  
Reacts to tool results and session stops with ASCII speech bubbles — **zero tokens consumed**.

```
╭────────────────────────────────────╮
│ All tests passing! Woohoo!         │
╰────────────────────────────────────╯
    \
 ╭───╮
 │ ★ │
 ╰─▽─╯
Buddy Lv.3 [████████░░] 82/100 XP
```

---

## How it works

Claude Code fires hooks after every tool use and at session stop.  
claude-buddy intercepts those hooks, analyzes the output, and renders a character reaction directly to your terminal — outside Claude's context window.

```
PostToolUse hook (Bash only)        Stop hook
        │                                │
  Bash output analysis           transcript.jsonl parse
  (exit_code + text patterns)    (last assistant message)
        │                                │
        └──────────┬─────────────────────┘
                   ▼
         ~/.claude-buddy/state.json  (mood, XP, level)
                   │
         Terminal → speech bubble via /dev/tty (Unix) or \\.\CON (Windows)
                   │
         Status bar → one-line ASCII face via statusLineCommand
```

---

## Installation

```bash
npm install -g claude-buddy
```

The `postinstall` script automatically runs `claude-buddy install`, which adds the hooks and status line to `~/.claude/settings.json`.

Restart Claude Code after installation to activate.

---

## CLI commands

| Command | Description |
|---------|-------------|
| `claude-buddy install` | Add hooks + status line to `~/.claude/settings.json` |
| `claude-buddy uninstall` | Remove claude-buddy from settings |
| `claude-buddy status` | Show current buddy state (name, level, XP, mood) |
| `claude-buddy reset` | Reset state to defaults |

Install is **idempotent** — running it multiple times never creates duplicate hooks.

---

## Reaction system

8 reaction types, each with its own ASCII face, message pool, and XP reward:

| Reaction | Trigger | XP | Mood |
|----------|---------|-----|------|
| `test_pass` | Test pass patterns in Bash output | +8 | excited |
| `refactor` | Refactor keywords in transcript | +6 | happy |
| `code_written` | Code written in response | +5 | happy |
| `bash_success` | Bash exits 0 (no other strong signal) | +3 | happy |
| `explanation` | Explanation keywords in transcript | +3 | neutral |
| `test_fail` | Test failure patterns in Bash output | +2 | sad |
| `bash_error` | Non-zero exit code | +1 | worried |
| `idle` | No strong signal | +1 | tired |

Every 100 XP → level up with a special celebration bubble.

Detection priority for **PostToolUse**: `bash_error` (exit_code ≠ 0) → `test_fail` (override if fail patterns found) → `test_pass` → `bash_success`.  
Detection priority for **Stop**: `bash_error` → `refactor` → `code_written` → `explanation` → `idle`.

---

## State file

Stored at `~/.claude-buddy/state.json`:

```json
{
  "name": "Buddy",
  "mood": "excited",
  "xp": 42,
  "level": 1,
  "lastReaction": "test_pass",
  "lastUpdated": 1713081600000
}
```

Edit `name` directly to rename your buddy.  
Override the directory with `CLAUDE_BUDDY_STATE_DIR` (useful for testing).

---

## Platform support

| Platform | Terminal output | Status bar |
|----------|----------------|------------|
| macOS | `/dev/tty` | ✓ |
| Linux | `/dev/tty` | ✓ |
| Windows | `\\.\CON` (stderr fallback) | ✓ |

On Windows, if `\\.\CON` is unavailable (e.g. certain CI environments), output falls back to stderr, which still reaches the terminal.

**Node.js ≥ 18 required.**

---

## Development

```bash
git clone https://github.com/chae-dahee/claude-buddy
cd claude-buddy
npm install --ignore-scripts   # skip postinstall during dev
npm run build                  # tsc → dist/
npm test                       # 55 unit + integration tests

# Manual PostToolUse hook test
echo '{"tool_name":"Bash","tool_response":{"output":"5 tests passed","exit_code":0}}' \
  | CLAUDE_BUDDY_STATE_DIR=/tmp/buddy-test node dist/hooks/post-tool-use.js

# Level-up test (seed xp=99, trigger test_pass → should reach level 2)
mkdir -p /tmp/buddy-test
echo '{"name":"Buddy","mood":"neutral","xp":99,"level":1,"lastReaction":"","lastUpdated":0}' \
  > /tmp/buddy-test/state.json
echo '{"tool_name":"Bash","tool_response":{"output":"3 tests passed","exit_code":0}}' \
  | CLAUDE_BUDDY_STATE_DIR=/tmp/buddy-test node dist/hooks/post-tool-use.js
cat /tmp/buddy-test/state.json   # level should be 2

# CLI test
node bin/claude-buddy.cjs status
node bin/claude-buddy.cjs reset
```

### Project structure

```
src/
  shared/       # types, state, mood, render, tty, transcript
  hooks/        # post-tool-use.ts, stop.ts
  statusline/   # status-line.ts
  cli/          # install, uninstall, status, reset, settings
  index.ts      # public API re-exports
bin/
  claude-buddy.cjs   # CJS wrapper — dynamic import() into ESM dist
scripts/
  postinstall.cjs    # npm install -g lifecycle hook
  preuninstall.cjs   # npm uninstall -g lifecycle hook
tests/
  state.test.js        # state persistence unit tests
  mood.test.js         # reaction detection unit tests
  render.test.js       # ASCII rendering unit tests
  transcript.test.js   # JSONL parser unit tests
  settings.test.js     # settings manager unit tests
  integration.test.js  # full hook binary integration tests
dist/                  # compiled output (not in git; included in npm tarball)
```

---

## Uninstall

```bash
npm uninstall -g claude-buddy
```

The `preuninstall` script automatically removes hooks from `~/.claude/settings.json`.

---

## License

MIT
