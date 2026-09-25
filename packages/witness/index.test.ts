import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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

const witnessFile = () => join(cwd, ".witness", "usage.jsonl");

let cwd: string;
let prevCwd: string;

beforeEach(() => {
	cwd = mkdtempSync(join(tmpdir(), "witness-cwd-"));
	prevCwd = process.cwd();
	process.chdir(cwd);
	cwd = process.cwd();
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(cwd, { recursive: true, force: true });
});

describe("loadHistory", () => {
	test("sums repo totals, skips malformed lines", () => {
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
		mkdirSync(join(cwd, ".witness"), { recursive: true });
		writeFileSync(
			witnessFile(),
			`${JSON.stringify(valid)}\nnot json at all\n${JSON.stringify(foreign)}\n\n`,
		);

		const session = new Session({ sessionId: "s1", harness: "pi" });
		expect(session.totalTokens).toBe(300);
		expect(session.totalCost).toBe(1.5);
	});

	test("retry turn after flush is not dropped", () => {
		const session = new Session({ sessionId: "s1", harness: "pi" });
		session.startAgent({
			dateTimeISOString: "2026-01-01T00:00:00Z",
			model: "m1",
		});
		session.addTurn({ index: 0, tools: [], totalUsage: usage(10, 0.1) });
		session.flush();

		// retry attempt lands after agent_settled flushed the burst
		session.addTurn({ index: 0, tools: [], totalUsage: usage(20, 0.2) });
		session.flush();

		const lines = readFileSync(witnessFile(), "utf8").trim().split("\n");
		expect(lines).toHaveLength(2);
		const rec = JSON.parse(lines[1]) as AgentTurnRecord;
		expect(rec.turns).toHaveLength(1);
		expect(rec.mod).toBe("m1"); // model remembered from last startAgent
		expect(session.totalCost).toBeCloseTo(0.3);
	});
});

describe("addTurn + flush", () => {
	test("flush appends one record and clears the current turn", () => {
		const session = new Session({ sessionId: "s1", harness: "pi" });
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

		const lines = readFileSync(witnessFile(), "utf8").trim().split("\n");
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

	test("addTurn before startAgent: totals count, auto-starts a record so flush persists", () => {
		const session = new Session({ sessionId: "s1", harness: "pi" });
		session.startAgent({
			dateTimeISOString: "2026-01-01T00:00:00Z",
			model: "m1",
		});
		session.flush();
		session.addTurn({ tools: [], totalUsage: usage(7, 0.07) });
		expect(session.totalTokens).toBe(7);
		session.flush();
		const lines = readFileSync(witnessFile(), "utf8").trim().split("\n");
		expect(lines).toHaveLength(2);
		expect(JSON.parse(lines[1] ?? "") as AgentTurnRecord).toMatchObject({
			mod: "m1",
			turns: [{ ti: 0, totalUsage: { tok: 7, cst: 0.07 } }],
		});
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
		mkdirSync(join(cwd, ".witness"), { recursive: true });
		writeFileSync(witnessFile(), `${JSON.stringify(old)}\n`);

		const session = new Session({ sessionId: "s2", harness: "pi" });
		session.startAgent({
			dateTimeISOString: "2026-01-02T00:00:00Z",
			model: "m",
		});
		session.addTurn({ tools: [], totalUsage: usage(1, 0.01) });
		session.flush();

		expect(session.totalTokens).toBe(101);
		expect(readFileSync(witnessFile(), "utf8").trim().split("\n")).toHaveLength(
			2,
		);
	});
});

describe("storage path", () => {
	test("writes into .witness under the git root", () => {
		const session = new Session({ sessionId: "s1", harness: "pi" });
		session.startAgent({ dateTimeISOString: "t", model: "m" });
		session.addTurn({ tools: [], totalUsage: usage(1, 0) });
		session.flush();
		expect(readFileSync(witnessFile(), "utf8")).toContain('"sid":"s1"');
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
});
