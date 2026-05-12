# claude-buddy

An ASCII buddy that lives in your Claude Code statusline. Rolled from a gacha table.

No hooks · no `/dev/tty` writes · no settings.json modification · **zero tokens consumed**

```
   /\_/\
  ( ✦   ✦ )
  (  ω   )
  (")_(")
Buddy Lv.3 [██████░░░░] ★★★ · Keep shipping!
```

한국어: [README.ko.md](README.ko.md)

---

## How it works

Adding one line to `~/.claude/statusline-command.sh` is all it takes.
Claude Code's statusline handles the rendering from there.

```
~/.claude/statusline-command.sh
   ├── (your existing lines)
   └── claude-buddy statusline
```

---

## Installation

```bash
npm i -g claude-buddy-statusline
claude-buddy setup
```

`setup` appends one line to `statusline-command.sh` (on) and rolls your first companion automatically.

Don't like it? Run `claude-buddy companion --reroll`.

Restart Claude Code — your buddy appears.

To remove (off):

```bash
claude-buddy setup --uninstall
```

> Building from source? See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Commands

| Command | Description |
|---------|-------------|
| `claude-buddy setup` | Install into statusline |
| `claude-buddy setup --uninstall` | Remove from statusline |
| `claude-buddy companion` | Show current companion info |
| `claude-buddy companion --reroll` | Roll a new companion |
| `claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown` | Set fields directly |
| `claude-buddy show` | Print buddy to terminal (preview) |

---

## Companion System

Rolled automatically on `setup` and saved to `~/.claude-buddy/companion.json`.

Use `--reroll` to get a new one anytime.

| Rarity | Chance | Stars | Color |
|--------|--------|-------|-------|
| Common | 60% | ★ | default |
| Uncommon | 25% | ★★ | green |
| Rare | 10% | ★★★ | blue |
| Epic | 4% | ★★★★ | purple |
| Legendary | 1% | ★★★★★ | gold |

18 species · 6 eye styles · 8 hats (Uncommon+) · 1% shiny chance · 5 stats (DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK)

Shiny buddies show a sparkle line `✦ ✨ ✦ ✨ ✦` below the info bar.

---

## Level

Levels up every 7 days from the day you ran `setup`. No cap.

```
Lv.1   day of install
Lv.2   after 7 days
Lv.3   after 14 days
Lv.4   after 21 days
...
```

The progress bar `[████░░░░░░]` shows how far through the current level you are.

The fuller it is, the closer to the next level.

---

## Local Files

| Path | Description |
|------|-------------|
| `~/.claude-buddy/config.json` | UUID seed, name, creation timestamp |
| `~/.claude-buddy/companion.json` | Rolled data (species, rarity, eye, hat, shiny, stats) |

Edit `name` in `config.json` to rename your buddy.

Override the directory with `CLAUDE_BUDDY_STATE_DIR`.

---

## Why no hooks?

Earlier versions used `PostToolUse` and `Stop` hooks to write sprites directly to `/dev/tty`.
The problem: every time the chat scrolls, Claude Code redraws part of the screen.
If a `/dev/tty` write lands at the same moment, the sprite gets corrupted.

The statusline is an area Claude Code controls exclusively, so there's no overlap.
Hooks, `/dev/tty`, mood transitions, and reaction systems were all removed in favour of a pure render-only approach.

---

## License

MIT
