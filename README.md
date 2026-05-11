# claude-buddy

A terminal companion for Claude Code — a random-gacha ASCII character that lives inside **your existing statusline**. No hooks, no `/dev/tty` writes, no settings.json modification. **Zero tokens consumed.**

```
   /\_/\
  ( ✦   ✦ )
  (  ω   )
  (")_(")
Buddy Lv.3 [██████░░░░] ★★★ · 오늘도 코딩 파이팅!
```

---

## How it works

claude-buddy is a single command-line tool. You append **one line** to your existing `~/.claude/statusline-command.sh`, and Claude Code's native statusline mechanism handles the rest.

```
~/.claude/statusline-command.sh
   ├── (your existing model/git/context lines)
   └── claude-buddy statusline   ← this is all you add
```

The script:
- Reads (and drops) the JSON Claude Code pipes to statusline scripts
- Loads companion bones from `~/.claude-buddy/companion.json`
- Computes a time-based level from `config.createdAt` (1 level per 7 days)
- Prints the multi-line sprite + info line to stdout

Claude Code's statusline area owns the rendering surface, so there is **no race condition** with TUI redraws — the corruption you see when writing multi-line ASCII via `/dev/tty` is fundamentally avoided.

---

## Installation

```bash
npm install -g claude-buddy
claude-buddy setup
```

`setup`이 `~/.claude/statusline-command.sh`에 자동으로 한 줄을 추가합니다. Claude Code를 재시작하면 버디가 나타납니다.

제거할 때는:

```bash
claude-buddy setup --uninstall
```

### From source

```bash
git clone https://github.com/chae-dahee/claude-buddy.git
cd claude-buddy
npm install
npm run build
```

빌드 후 수동으로 statusline 스크립트에 추가:

```bash
echo "claude-buddy statusline" >> ~/.claude/statusline-command.sh
```

---

## CLI commands

| Command | Description |
|---------|-------------|
| `claude-buddy setup` | `~/.claude/statusline-command.sh`에 자동 설치 |
| `claude-buddy setup --uninstall` | statusline에서 제거 |
| `claude-buddy statusline` | statusline 렌더러 실행 (statusline-command.sh에서 호출) |
| `claude-buddy companion` | 현재 컴패니언 정보 출력 (종족, 레어도, 스탯) |
| `claude-buddy companion --reroll` | 새 컴패니언 가챠 |
| `claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown` | 필드 직접 수정 |
| `claude-buddy show` | 터미널에 버디 직접 출력 (미리보기) |

---

## Companion system

On first run, a random companion is rolled from the gacha table and saved to `~/.claude-buddy/companion.json`. Use `--reroll` to get a new one.

| Rarity | Chance | Stars |
|--------|--------|-------|
| Common | 60% | ★ |
| Uncommon | 25% | ★★ |
| Rare | 10% | ★★★ |
| Epic | 4% | ★★★★ |
| Legendary | 1% | ★★★★★ |

18 species · 6 eye styles · 8 hats (uncommon+) · 1% shiny chance · 5 stats (DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK).

Shiny companions add a sparkle line `✦ ✨ ✦ ✨ ✦` below the info line.

---

## Progression

Level is **time-based** — no hooks needed:

- `level = floor((now - createdAt) / 7 days) + 1`
- Bar shows progress through the current week (0..1)

Older companions are higher level. No XP grinding, no event tracking, no state file.

---

## Local files

| Path | Description |
|------|-------------|
| `~/.claude-buddy/config.json` | UUID seed, name, creation timestamp |
| `~/.claude-buddy/companion.json` | Rolled bones (species, rarity, eye, hat, shiny, stats) |

Edit `name` in `config.json` to rename your buddy.
Override the directory with `CLAUDE_BUDDY_STATE_DIR` (used by tests).

---

## Development

```bash
npm install
npm run build       # tsc → dist/
npm test            # node --test tests/
```

### Project structure

```
src/
  shared/
    config.ts        # ~/.claude-buddy/config.json (UUID seed, name, createdAt)
    companion.ts     # Gacha engine + ~/.claude-buddy/companion.json storage
    messages.ts      # Random + time-of-day greetings
    render.ts        # Sprites, hat overlays, progress bar, character composer
    types.ts         # Shared TypeScript types
  cli/
    companion.ts     # Show / reroll / edit companion
    show.ts          # Print buddy directly to terminal
  statusline/
    status-line.ts   # Renderer entrypoint — appended as one line to statusline-command.sh
  index.ts           # Public API re-exports
bin/
  claude-buddy.cjs   # CJS dispatcher
tests/
  companion.test.js
  config.test.js
  messages.test.js
  render.test.js
```

---

## Why no hooks?

Earlier versions of claude-buddy used `PostToolUse` and `Stop` hooks to write a multi-line sprite to `/dev/tty`. That approach **inherently races with Claude Code's TUI redraws**: writing to the terminal at the cursor position fights with the live region's `\033[A`/`\033[J` redraws, corrupting the sprite as the chat scrolls.

The statusline is the only rendering surface Claude Code owns and updates atomically, so injecting buddy there eliminates corruption entirely. Hooks, `/dev/tty`, mood transitions, and reaction systems were all removed in favour of a pure render-only design.

---

## License

MIT
