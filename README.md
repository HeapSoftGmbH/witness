# witness

Token & cost tracking for AI coding agents — one append-only usage log per repo,
written by a small extension for each agent harness.

```
$ cat .witness/usage.jsonl
{"t":"…","sid":"…","sn":"…","h":"pi","mod":"anthropic/claude-…","rep":"git@github.com:me/app.git","turns":[{"ti":0,"tools":[…],"totalUsage":{"in":…,"out":…,"cw":…,"cr":…,"tok":…,"reason":…,"cst":…}}],"metadata":{}}
```

- **Per-repo**: data lives in `<git-root>/.witness/usage.jsonl` (override with `WITNESS_DIR`). Keyed by git remote URL, so totals accumulate across sessions — restarts included.
- **Per-turn breakdown**: input/output/cache/reasoning tokens, cost, and per-tool usage + errors, per turn.
- **Harness-agnostic**: the storage layer (`packages/witness`) knows nothing about pi/Claude/Copilot/OpenCode; each `apps/*` package is a thin adapter that maps its harness's events onto the same `Session` API.
- **Append-only schema**: short keys, never renamed — new fields may be added, old lines always parse.

## Install (pi)

From git (once this repo has a public remote):

```bash
pi install git:github.com/OWNER/witness
```

Or without installing, for one run:

```bash
pi -e git:github.com/OWNER/witness
```

Teams can share it via project settings (`-l`): pi installs missing packages automatically once the project is trusted.

> Security: pi extensions run with full system access. Review the source before installing (it's short — `packages/witness/index.ts` + `apps/witness-pi/extensions/index.ts`).

## Other agents

`apps/witness-claude`, `apps/witness-copilot`, `apps/witness-opencode` are placeholders for adapters using the same core. To add one: new `apps/witness-<harness>` package, depend on `witness: workspace:*`, call `Session` on the harness's turn-end events, flush on idle/shutdown. See [AGENTS.md](AGENTS.md).

## Development

```bash
bun install
bun test
bun run lint
```

Bun workspaces monorepo:

- `packages/witness` — core `Session` class (record schema, storage, repo totals)
- `packages/types` — shared `Usage` / `Tool` / `AgentTurnRecord` interfaces
- `apps/witness-pi` — pi extension
- `apps/local-web` — local viewer (placeholder)
