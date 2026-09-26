# witness-pi

Pi extension to tracks tokens & cost for your pi sessions and writes them to `<git-root>/.witness/usage.jsonl`.

## What it does

- **Per-session usage**: records every agent turn's tool calls (`name`,
  `isError`, per-tool `usage`) plus summed assistant + tool usage
  (input/output/cache/reasoning tokens, cost).
- **Status bar**: shows `💰 Witnessed: $1.23 · 45.6K TOK`, live-updated, accumulated across all sessions in the repo.
- **Skill tracking**: records skills invoked via `/skill:<name>` input or by reading a `SKILL.md` file.
- **Local viewer**: `/witness-pi:show` starts a local server (`http://localhost:4444`, opens automatically on macOS) and renders the repo's usage records in a web UI.

## Install

```bash
pi install git:github.com/OWNER/witness
```

Or for a single run without installing:

```bash
pi -e git:github.com/OWNER/witness
```

## Use

- Work in pi as usual — usage is buffered and flushed once on `agent_settled` and on shutdown (a hard kill loses the unflushed burst).
- Run `/witness-pi:show` to open the viewer for the current repo.
- Add `/.witness` to gitignore

## Develop

```bash
bun install
bun test        # unit tests for the adapter
bun run build   # bundles extension + local-web viewer into dist/
```

Layout:

- `extensions/index.ts` — the pi extension (all event mapping lives here)
- `packages/witness` — `Session` class, storage, shared types
