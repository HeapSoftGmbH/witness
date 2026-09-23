import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentTurnRecord, Usage } from "../types";
import { repoDirName, Session } from "./index";

const usage = (tok: number, cst: number): Usage => ({
	in: 0,
	out: 0,
	cw: 0,
	cr: 0,
	tok,
	reason: 0,
	cst,
});

let dir: string;
let cwd: string;
let prevCwd: string;
let prevEnv: string | undefined;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "witness-data-"));
	cwd = mkdtempSync(join(tmpdir(), "witness-cwd-"));
	prevCwd = process.cwd();
	prevEnv = process.env.WITNESS_DIR;
	delete process.env.WITNESS_DIR;
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

describe("loadHistory", () => {
	test("sums repo totals, skips malformed lines and other repos", () => {
		const valid: AgentTurnRecord = {
			t: new Date().toISOString(),
			sid: "old-session",
			sn: "",
			h: "pi",
			mod: "m",
			rep: cwd,
			turns: [
				{ ti: 0, tools: [], totalUsage: usage(100, 0.5) },
				{ ti: 1, tools: [], totalUsage: usage(50, 0.25) },
			],
		};
		const foreign = { ...valid, rep: "https://github.com/other/repo" };
		writeFileSync(
			join(dir, "usage.jsonl"),
			`${JSON.stringify(valid)}\nnot json at all\n${JSON.stringify(foreign)}\n\n`,
		);

		const session = new Session({ sessionId: "s1", harness: "pi", path: dir });
		expect(session.totalTokens).toBe(150);
		expect(session.totalCost).toBe(0.75);
	});

	test("missing history file is fine", () => {
		const session = new Session({ sessionId: "s1", harness: "pi", path: dir });
		expect(session.totalTokens).toBe(0);
		expect(session.totalCost).toBe(0);
	});
});

describe("addTurn + flush", () => {
	test("flush appends one record and clears the current turn", () => {
		const session = new Session({ sessionId: "s1", harness: "pi", path: dir });
		session.sessionName = "my session";
		session.startAgent({
			dateTimeISOString: "2026-01-01T00:00:00Z",
			model: "m1",
		});
		session.addMetadata({ foo: "bar" });
		session.addSkill("shadcn-svelte");
		session.addSkill("ponytail");
		session.addTurn({
			index: 3,
			tools: [{ name: "read", isError: false }],
			totalUsage: usage(10, 0.1),
		});
		session.addTurn({ tools: [], totalUsage: usage(5, 0.05) });

		expect(session.totalTokens).toBe(15);
		expect(session.totalCost).toBeCloseTo(0.15);

		session.flush();
		session.flush(); // second flush is a no-op

		const lines = readFileSync(join(dir, "usage.jsonl"), "utf8")
			.trim()
			.split("\n");
		expect(lines).toHaveLength(1);
		const rec = JSON.parse(lines[0] as string) as AgentTurnRecord;
		expect(rec.sid).toBe("s1");
		expect(rec.sn).toBe("my session");
		expect(rec.h).toBe("pi");
		expect(rec.mod).toBe("m1");
		expect(rec.rep).toBe(cwd);
		expect(rec.metadata).toEqual({ foo: "bar" });
		expect(rec.skills).toEqual(["shadcn-svelte", "ponytail"]);
		expect(rec.turns).toHaveLength(2);
		expect(rec.turns?.[0]?.ti).toBe(3);
		expect(rec.turns?.[1]?.ti).toBe(0); // missing index defaults to 0
		expect(rec.turns?.[0]?.tools[0]?.name).toBe("read");
	});

	test("addTurn before startAgent: totals count, flush writes nothing", () => {
		const session = new Session({ sessionId: "s1", harness: "pi", path: dir });
		session.addTurn({ tools: [], totalUsage: usage(7, 0.07) });
		expect(session.totalTokens).toBe(7);
		session.flush();
		expect(() => readFileSync(join(dir, "usage.jsonl"), "utf8")).toThrow();
	});

	test("totals combine history and new turns, history file preserved", () => {
		const old: AgentTurnRecord = {
			t: "2026-01-01T00:00:00Z",
			sid: "old",
			sn: "",
			h: "pi",
			mod: "m",
			rep: cwd,
			turns: [{ ti: 0, tools: [], totalUsage: usage(100, 1) }],
		};
		writeFileSync(join(dir, "usage.jsonl"), `${JSON.stringify(old)}\n`);

		const session = new Session({ sessionId: "s2", harness: "pi", path: dir });
		session.startAgent({
			dateTimeISOString: "2026-01-02T00:00:00Z",
			model: "m",
		});
		session.addTurn({ tools: [], totalUsage: usage(1, 0.01) });
		session.flush();

		expect(session.totalTokens).toBe(101);
		expect(
			readFileSync(join(dir, "usage.jsonl"), "utf8").trim().split("\n"),
		).toHaveLength(2);
	});
});

describe("storage path", () => {
	test("WITNESS_DIR overrides default location", () => {
		process.env.WITNESS_DIR = dir;
		const session = new Session({
			sessionId: "s1",
			harness: "pi",
			path: undefined,
		});
		session.startAgent({ dateTimeISOString: "t", model: "m" });
		session.addTurn({ tools: [], totalUsage: usage(1, 0) });
		session.flush();
		expect(readFileSync(join(dir, "usage.jsonl"), "utf8")).toContain(
			'"sid":"s1"',
		);
	});

	test("repoDirName sanitizes repo identity", () => {
		expect(repoDirName("git@github.com:owner/witness.git")).toBe(
			"github.com_owner_witness",
		);
		expect(repoDirName("https://github.com/owner/witness")).toBe(
			"github.com_owner_witness",
		);
		expect(repoDirName("/Users/fredi/projects/witness")).toBe(
			"_Users_fredi_projects_witness",
		);
		expect(repoDirName("")).toBe("repo");
	});

	test("perRepo writes into repo subdirectory", () => {
		process.env.WITNESS_DIR = dir;
		const session = new Session({
			sessionId: "s1",
			harness: "pi",
			path: undefined,
			perRepo: true,
		});
		session.startAgent({ dateTimeISOString: "t", model: "m" });
		session.addTurn({ tools: [], totalUsage: usage(1, 0) });
		session.flush();
		expect(
			readFileSync(join(dir, repoDirName(cwd), "usage.jsonl"), "utf8"),
		).toContain('"sid":"s1"');
	});
});
