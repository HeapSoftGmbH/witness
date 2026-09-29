# witness-pi

**See what your AI coding agent costs you.**

witness-pi is an extension that records the tokens and dollars spent in every pi session and keeps a running total for each repository. You can check your spend at any time, see which models, tools and skills use the most, and find the sessions that cost the most.

## Why use it

- **Cost overview.** The running cost for the repo is always visible in pi's status bar.
- **Totals per project.** Spend is added up per repository, across every session and restart, so you can see what a project has cost so far.
- **See where tokens go.** Find the models, tools and skills that use the most tokens and cost the most.
- **Nothing to set up.** Install it once and keep working. The extension records usage on its own.

## Features

### Live cost in the status bar

```text
💰 Witnessed: $1.23 · 45.6K TOK
```

Shows the total dollars and tokens for the current repository across all sessions. It updates after every agent turn.

### Usage dashboard

Run this inside pi:

```text
/witness-pi:show
```

This opens a local dashboard at `http://localhost:4444`. On macOS it opens in your browser automatically; on other systems pi shows the link. The dashboard shows:

- **Totals:** cost, tokens, and the number of distinct tools and skills used in this repo
- **Model costs:** dollars spent per model per day
- **Tokens used:** tokens per model per day
- **Top models, tools and skills:** how often each one was used
- **Sessions table:** every session with its time, model, turns, tools, skills, tokens and cost. You can sort by any column.

### Detailed tracking

For every agent turn, witness-pi records:

- input, output, cache-read, cache-write and reasoning tokens
- cost in dollars
- each tool call, whether it failed, and the tokens and cost of the tool itself
- the model used (`provider/model`)
- skills used, whether run with `/skill:<name>` or loaded by the agent reading a `SKILL.md`

## Install

```bash
pi install npm:witness-pi
```

To try it for one session without installing:

```bash
pi -e npm:witness-pi
```

## Usage

1. Work in pi as usual. Usage is recorded automatically.
2. Check the status bar for the running total.
3. Run `/witness-pi:show` to open the dashboard.
4. Add `/.witness` to your `.gitignore`, unless you want to commit the usage log so your team can share it.

---

## Technical details

### Where data is stored

Usage is written to `<git-root>/.witness/usage.jsonl`. Each line is one JSON record per agent run (one prompt and all of its turns). The repository is identified by its git remote URL. If there is no remote, the git root is used, and if there is no git repo, the current directory.

The file is append-only and uses a shared format, so adapters for other agents (Claude, Copilot, OpenCode; planned) write to the same file. Old lines keep parsing when the format changes, and malformed lines are skipped.

### When data is written

Turns are kept in memory and written in a single append when pi goes idle (`agent_settled`) and when pi shuts down. This keeps writes safe when several pi sessions run on the same repo at once. The trade-off: if pi is killed hard (e.g. `kill -9`), the current unsaved run is lost.

### Dashboard server

`/witness-pi:show` starts a small HTTP server on `127.0.0.1:4444`. It is reachable only from your own machine. The server serves the bundled viewer and a `/api/records` endpoint that returns the records for the current repo. It stops when the pi session ends.

### Development

This package lives in the [witness](https://github.com/HeapSoftGmbH/witness) monorepo.

```bash
bun install
bun test        # unit tests for the adapter
bun run build   # bundles extension + local-web viewer into dist/
```

- `extensions/index.ts`: the pi extension (maps pi events to witness)
- `packages/witness`: core `Session` class, storage and shared types
- `packages/local-web`: the dashboard UI
