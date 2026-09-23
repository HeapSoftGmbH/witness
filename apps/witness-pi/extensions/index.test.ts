import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type AgentTurnRecord, repoDirName } from "witness";
import main from "./index";

type FakeCtx = {
	sessionManager: { getSessionId: () => string };
	model?: { provider: string; name: string };
	ui: {
		setStatus: (id: string, text: string) => void;
		theme: { fg: (style: string, text: string) => string };
	};
};

type PiEvent = Record<string, unknown>;
type Handler = (event: PiEvent | undefined, ctx: FakeCtx) => unknown;

function setup(model?: { provider: string; name: string }) {
	const handlers = new Map<string, Handler>();
	const status: string[] = [];
	const ctx: FakeCtx = {
		sessionManager: { getSessionId: () => "sess-1" },
		model,
		ui: {
			setStatus: (id, text) => status.push(`${id}:${text}`),
			theme: { fg: (_style, text) => text },
		},
	};
	const pi = {
		on: (name: string, h: Handler) => void handlers.set(name, h),
		registerCommand: () => {},
	};
	main(pi as unknown as ExtensionAPI);
	const emit = (
		name: string,
		event?: PiEvent,
		ctxOverride?: FakeCtx,
	): Promise<unknown> =>
		Promise.resolve(handlers.get(name)?.(event, ctxOverride ?? ctx));
	return { status, emit, ctx };
}

const record = (): AgentTurnRecord[] =>
	readFileSync(join(dir, repoDirName(cwd), "usage.jsonl"), "utf8")
		.trim()
		.split("\n")
		.map((l) => JSON.parse(l) as AgentTurnRecord);

let dir: string;
let cwd: string;
let prevCwd: string;
let prevEnv: string | undefined;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "witness-pi-"));
	cwd = mkdtempSync(join(tmpdir(), "witness-pi-cwd-"));
	prevCwd = process.cwd();
	prevEnv = process.env.WITNESS_DIR;
	process.env.WITNESS_DIR = dir;
	process.chdir(cwd);
	cwd = process.cwd();
});

afterEach(() => {
	process.chdir(prevCwd);
	if (prevEnv === undefined) delete process.env.WITNESS_DIR;
	else process.env.WITNESS_DIR = prevEnv;
	rmSync(dir, { recursive: true, force: true });
	rmSync(cwd, { recursive: true, force: true });
});

describe("witness-pi adapter", () => {
	test("full lifecycle: start, rename, turn, settle", async () => {
		const { status, emit } = setup({ provider: "anthropic", name: "claude" });

		await emit("session_start", { reason: "user" });
		expect(status[0]).toBe("witness:💰 $0.00 · 0 tok (repo)");

		await emit("session_info_changed", { name: "renamed" });
		await emit("agent_start", {});
		await emit("turn_end", {
			turnIndex: 2,
			toolResults: [
				{
					toolName: "read",
					isError: false,
					usage: {
						input: 10,
						output: 5,
						totalTokens: 15,
						cost: { total: 0.02 },
					},
				},
				{ toolName: "bash", isError: true, usage: undefined },
			],
			message: {
				role: "assistant",
				usage: {
					input: 100,
					output: 50,
					totalTokens: 150,
					reasoning: 7,
					cost: { total: 0.1 },
				},
			},
		});
		await emit("agent_settled");

		expect(status.at(-1)).toBe("witness:💰 $0.12 · 165 tok (repo)");
		const recs = record();
		expect(recs).toHaveLength(1);
		const rec = recs[0];
		if (!rec) throw new Error("no record");
		expect(rec.sid).toBe("sess-1");
		expect(rec.sn).toBe("renamed");
		expect(rec.h).toBe("pi");
		expect(rec.mod).toBe("anthropic/claude");
		expect(rec.metadata).toEqual({ start_reason: "user" });
		const turn = rec.turns?.[0];
		if (!turn) throw new Error("no turn");
		expect(turn.ti).toBe(2);
		expect(turn.tools).toHaveLength(2);
		expect(turn.tools?.[0]?.name).toBe("read");
		expect(turn.tools?.[0]?.isError).toBe(false);
		expect(turn.tools?.[0]?.usage).toEqual({
			in: 10,
			out: 5,
			cw: 0,
			cr: 0,
			tok: 15,
			reason: 0,
			cst: 0.02,
		});
		expect(turn.tools?.[1]?.usage).toEqual({
			in: 0,
			out: 0,
			cw: 0,
			cr: 0,
			tok: 0,
			reason: 0,
			cst: 0,
		});
		// assistant + both tools summed
		expect(turn.totalUsage).toEqual({
			in: 110,
			out: 55,
			cw: 0,
			cr: 0,
			tok: 165,
			reason: 7,
			cst: 0.12000000000000001,
		});
	});

	test("agent_start model: ctx override wins, empty fallback", async () => {
		const { emit } = setup();

		await emit("session_start", { reason: "user" });
		await emit(
			"agent_start",
			{},
			{
				sessionManager: { getSessionId: () => "sess-1" },
				model: { provider: "openai", name: "gpt" },
				ui: {
					setStatus: () => {},
					theme: { fg: (_s: string, t: string) => t },
				},
			},
		);
		await emit("agent_settled");

		await emit("session_start", { reason: "user" });
		await emit("agent_start", {}); // no model anywhere → ""
		await emit("agent_settled");

		const recs = record();
		expect(recs[0]?.mod).toBe("openai/gpt");
		expect(recs[1]?.mod).toBe("");
	});

	test("session_shutdown flushes; empty turn_end is zero-usage", async () => {
		const { emit } = setup();

		await emit("session_start", { reason: "user" });
		await emit("agent_start", {});
		await emit("turn_end", {}); // no tools, no message
		await emit("session_shutdown");

		const turn = record()[0]?.turns?.[0];
		expect(turn?.ti).toBe(0); // missing turnIndex → 0
		expect(turn?.totalUsage).toEqual({
			in: 0,
			out: 0,
			cw: 0,
			cr: 0,
			tok: 0,
			reason: 0,
			cst: 0,
		});
	});

	test("status formats k and M tokens", async () => {
		const { status, emit } = setup();

		await emit("session_start", { reason: "user" });
		await emit("agent_start", {});
		await emit("turn_end", {
			message: { role: "assistant", usage: { totalTokens: 1500 } },
		});
		expect(status.at(-1)).toBe("witness:💰 $0.00 · 1.5K tok (repo)");

		await emit("turn_end", {
			message: { role: "assistant", usage: { totalTokens: 1500000 } },
		});
		expect(status.at(-1)).toBe("witness:💰 $0.00 · 1.5M tok (repo)");
	});

	describe("skill tracking", () => {
		test("user-typed /skill:<name> input", async () => {
			const { emit } = setup();

			await emit("session_start", { reason: "user" });
			await emit("input", { text: "/skill:ponytail" });
			await emit("input", { text: "/skill:shadcn-svelte add card please" }); // name + args
			await emit("input", { text: "just a normal prompt" });
			await emit("agent_start", {});
			await emit("agent_settled");

			expect(record()[0]?.skills).toEqual(["ponytail", "shadcn-svelte"]);
		});

		test("agent reads SKILL.md via read tool", async () => {
			const { emit } = setup();

			await emit("session_start", { reason: "user" });
			await emit("tool_call", {
				type: "tool_call",
				toolCallId: "c1",
				toolName: "read",
				input: { path: "/Users/x/.agents/skills/tauri/SKILL.md" },
			});
			await emit("tool_call", {
				type: "tool_call",
				toolCallId: "c2",
				toolName: "read",
				input: { path: "SKILL.md" },
			});
			await emit("tool_call", {
				type: "tool_call",
				toolCallId: "c3",
				toolName: "read",
				input: { path: "/Users/x/notes/SKILL.md.bak" },
			});
			await emit("tool_call", {
				type: "tool_call",
				toolCallId: "c4",
				toolName: "bash",
				input: { command: "cat SKILL.md" },
			});
			await emit("agent_start", {});
			await emit("agent_settled");

			expect(record()[0]?.skills).toEqual(["tauri", "skill:unknown"]);
		});

		test("both paths accumulate into one record", async () => {
			const { emit } = setup();

			await emit("session_start", { reason: "user" });
			await emit("input", { text: "/skill:ponytail" });
			await emit("tool_call", {
				type: "tool_call",
				toolCallId: "c1",
				toolName: "read",
				input: { path: "/skills/svelte-code-writer/SKILL.md" },
			});
			await emit("agent_start", {});
			await emit("agent_settled");

			expect(record()[0]?.skills).toEqual(["ponytail", "svelte-code-writer"]);
		});
	});
});
