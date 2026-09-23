# witness-pi

Pi adapter for witness. Writes usage data to `~/.pi/witness/<repo>/usage.jsonl`
(one subdirectory per repo, matching the pi extension data convention —
context-mode uses `~/.pi/context-mode`). Override the data root with
`WITNESS_DIR`.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run extensions/index.ts
```

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
