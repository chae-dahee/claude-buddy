# claude-buddy

A terminal companion — reacts to tool results and session stops with ASCII speech bubbles. **Zero tokens consumed.**

```
╭────────────────────────────────────╮
│ All tests passing! Woohoo!         │
╰────────────────────────────────────╯
    \
   .----.
 ( ✦  ✦ )
  (      )
   `----´
Buddy Lv.3 [████████░░] 82/100 XP ★★
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
| `claude-buddy show` | Display buddy with full sprite in terminal (no Claude session needed) |
| `claude-buddy reset` | Reset state to defaults |
| `claude-buddy companion` | Show companion species / rarity / eye / hat / stats |
| `claude-buddy companion --reroll` | Roll a brand-new random companion |
| `claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown` | Edit companion fields directly |

Install is **idempotent** — running it multiple times never creates duplicate hooks.

---

## Companion system

On first run, a random companion is rolled from the gacha table and saved to `~/.claude-buddy/companion.json`.  
Use `--reroll` to get a new one at any time.

**Rarity distribution:**

| Rarity | Chance | Stars |
|--------|--------|-------|
| Common | 60% | ★ |
| Uncommon | 25% | ★★ |
| Rare | 10% | ★★★ |
| Epic | 4% | ★★★★ |
| Legendary | 1% | ★★★★★ |

18 species · 6 eye styles · 8 hats (uncommon+) · 1% shiny chance · 5 stats (DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK)

---

## Reaction system

8 reaction types, each with its own message pool and XP reward:

| Reaction | Trigger | XP | Mood |
|----------|---------|-----|------|
| `test_pass` | Test pass patterns in Bash output | +10 | excited |
| `code_written` | Code written keywords in transcript | +5 | happy |
| `refactor` | Refactor keywords in transcript | +5 | happy |
| `explanation` | General explanation in transcript | +3 | neutral |
| `idle` | No strong signal | +2 | tired |
| `bash_error` | Non-zero exit code | +1 | worried |
| `test_fail` | Test failure patterns in Bash output | +1 | sad |
| `error_mentioned` | Error/bug keywords in transcript | +1 | worried |

Every 100 XP → level up with a special celebration bubble.

**PostToolUse detection priority:** `test_fail` (if fail pattern matches) → `bash_error` (non-zero exit or error field) → `test_pass` → `idle`  
**Stop detection priority:** `error_mentioned` → `refactor` → `code_written` → `explanation` → `idle`

---

## Local files

| Path | Description |
|------|-------------|
| `~/.claude-buddy/config.json` | Stable UUID seed, companion name, creation timestamp |
| `~/.claude-buddy/companion.json` | Rolled companion bones (species, rarity, eye, hat, stats) |
| `~/.claude-buddy/state.json` | Session state (mood, XP, level, last reaction message) |

Edit `name` in `config.json` to rename your buddy.  
Override the directory with `CLAUDE_BUDDY_STATE_DIR` (useful for testing).

---

## Platform support

| Platform | Terminal output | Status bar |
|----------|----------------|------------|
| macOS | `/dev/tty` | ✓ |
| Linux | `/dev/tty` | ✓ |
| Windows | `\\.\CON` (stderr fallback) | ✓ |

**Node.js ≥ 18 required.**

---

## Development

```bash
git clone https://github.com/chae-dahee/claude-buddy
cd claude-buddy
npm install --ignore-scripts   # skip postinstall during dev
npm run build                  # tsc → dist/
npm test                       # 100 unit + integration tests

# Manual PostToolUse hook test
echo '{"tool_name":"Bash","tool_response":{"output":"5 tests passed","exit_code":0}}' \
  | CLAUDE_BUDDY_STATE_DIR=/tmp/buddy-test node dist/hooks/post-tool-use.js

# Show buddy directly in terminal
node bin/claude-buddy.cjs show

# Roll a new random companion
node bin/claude-buddy.cjs companion --reroll
```

### Project structure

```
src/
  shared/
    config.ts       # BuddyConfig (UUID seed, name) — ~/.claude-buddy/config.json
    companion.ts    # Gacha engine (rollFrom, rollRandom, loadCompanion, storage)
    types.ts        # Shared TypeScript types
    state.ts        # XP / level persistence — ~/.claude-buddy/state.json
    mood.ts         # Reaction detection & REACTION_MAP
    render.ts       # ASCII sprite rendering
    tty.ts          # Terminal output (cross-platform /dev/tty)
    transcript.ts   # JSONL transcript parser
  hooks/
    post-tool-use.ts  # PostToolUse hook (Bash reactions)
    stop.ts           # Stop hook (session-end reactions)
  statusline/
    status-line.ts    # One-line status bar for statusLineCommand
  cli/
    install.ts        # Add hooks to ~/.claude/settings.json
    uninstall.ts      # Remove hooks
    status.ts         # Show buddy state
    show.ts           # Display full sprite in terminal
    reset.ts          # Reset state to defaults
    companion.ts      # Show / reroll / edit companion
    settings.ts       # Settings read/write utilities
  index.ts            # Public API re-exports
bin/
  claude-buddy.cjs    # CJS wrapper — dynamic import() into ESM dist
scripts/
  postinstall.cjs     # npm install -g lifecycle hook
  preuninstall.cjs    # npm uninstall -g lifecycle hook
tests/
  companion.test.js   # Gacha engine unit tests (hash, PRNG, roll, storage)
  config.test.js      # Config lifecycle unit tests
  mood.test.js        # Reaction detection unit tests
  render.test.js      # ASCII rendering unit tests
  show.test.js        # CLI show command integration tests
  state.test.js       # State persistence unit tests
  transcript.test.js  # JSONL parser unit tests
  settings.test.js    # Settings manager unit tests
  integration.test.js # Full hook binary integration tests
dist/                 # Compiled output (not in git; included in npm tarball)
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
