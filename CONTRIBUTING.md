# Contributing to claude-buddy

## Development Setup

```bash
git clone https://github.com/chae-dahee/claude-buddy.git
cd claude-buddy
npm install
npm run build   # tsc → dist/
npm test        # node --test tests/
```

## Project Structure

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
    setup.ts         # statusline-command.sh auto install/uninstall
    show.ts          # Print buddy directly to terminal
  statusline/
    status-line.ts   # Renderer entrypoint — called by statusline-command.sh
  index.ts           # Public API re-exports
bin/
  claude-buddy.cjs   # CJS dispatcher (bin entrypoint)
tests/
  companion.test.js
  config.test.js
  messages.test.js
  render.test.js
```

## Release

Releases are managed by the project owner.

```bash
npm version patch   # or minor / major — bumps package.json and commits
git push origin main
```

Then create a GitHub Release on the repository's Releases page. Publishing the release triggers GitHub Actions to build, test, and publish to npm automatically.

## Contributing

- Open an issue before starting work on a new feature
- PRs should be scoped to a single change
- Run `npm test` before submitting
