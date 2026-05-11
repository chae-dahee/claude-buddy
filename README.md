# claude-buddy

A terminal companion for Claude Code — a random-gacha ASCII character that lives inside **your existing statusline**. No hooks, no `/dev/tty` writes, no settings.json modification. **Zero tokens consumed.**

```
   /\_/\
  ( ✦   ✦ )
  (  ω   )
  (")_(")
Buddy Lv.3 [██████░░░░] ★★★ · Keep shipping!
```

한국어 문서: [README.ko.md](README.ko.md)

---

## How it works

claude-buddy appends **one line** to your existing `~/.claude/statusline-command.sh`. Claude Code's native statusline mechanism handles the rest — no background process, no hooks.

```
~/.claude/statusline-command.sh
   ├── (your existing model/git/context lines)
   └── claude-buddy statusline   ← this is all you add
```

Claude Code's statusline area owns the rendering surface, so there is **no race condition** with TUI redraws. The corruption you see when writing multi-line ASCII via `/dev/tty` is fundamentally avoided.

---

## Installation

```bash
npm install -g claude-buddy-statusline
claude-buddy setup
```

`setup` automatically appends one line to `~/.claude/statusline-command.sh`. Restart Claude Code — your buddy appears.

To remove:

```bash
claude-buddy setup --uninstall
```

> Building from source? See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `claude-buddy setup` | Install into `~/.claude/statusline-command.sh` |
| `claude-buddy setup --uninstall` | Remove from statusline |
| `claude-buddy companion` | Show current companion (species, rarity, stats) |
| `claude-buddy companion --reroll` | Roll a brand-new random companion |
| `claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown` | Edit companion fields directly |
| `claude-buddy show` | Print buddy to terminal (preview) |

---

## Companion System

On first run, a random companion is rolled from the gacha table and saved to `~/.claude-buddy/companion.json`. Use `--reroll` to get a new one.

| Rarity | Chance | Stars |
|--------|--------|-------|
| Common | 60% | ★ |
| Uncommon | 25% | ★★ |
| Rare | 10% | ★★★ |
| Epic | 4% | ★★★★ |
| Legendary | 1% | ★★★★★ |

18 species · 6 eye styles · 8 hats (Uncommon+) · 1% shiny chance · 5 stats (DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK)

Shiny companions show a sparkle line `✦ ✨ ✦ ✨ ✦` below the info bar.

---

## Progression

Level is **time-based** — no hooks or event tracking needed:

- `level = floor((now - createdAt) / 7 days) + 1`
- The progress bar shows how far through the current week your buddy is

Older companions are higher level. No XP grinding, no state files beyond creation date.

---

## Local Files

| Path | Description |
|------|-------------|
| `~/.claude-buddy/config.json` | UUID seed, display name, creation timestamp |
| `~/.claude-buddy/companion.json` | Rolled bones (species, rarity, eye, hat, shiny, stats) |

Edit `name` in `config.json` to rename your buddy.  
Override the directory with the `CLAUDE_BUDDY_STATE_DIR` environment variable.

---

## Why no hooks?

Earlier versions used `PostToolUse` and `Stop` hooks to write a multi-line sprite to `/dev/tty`. That approach **inherently races with Claude Code's TUI redraws**: writing to the terminal at the cursor position fights with the live region's `\033[A`/`\033[J` redraws, corrupting the sprite as the chat scrolls.

The statusline is the only rendering surface Claude Code owns and updates atomically, so injecting buddy there eliminates corruption entirely. Hooks, `/dev/tty`, mood transitions, and reaction systems were all removed in favour of a pure render-only design.

---

## License

MIT
