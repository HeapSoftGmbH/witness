import { describe, expect, test } from "bun:test";
import type { AgentTurnRecord, Tool, Usage } from "witness";
import { totalCost, totalSkillCount, totalTokens, totalToolCount } from "./usage";

const usage = (tok = 0, cst = 0): Usage => ({
	in: 0,
	out: 0,
	cw: 0,
	cr: 0,
	tok,
	reason: 0,
	cst,
});

const tool = (name: string): Tool => ({ name, isError: false });

const record = (turns: AgentTurnRecord["turns"], skills?: string[]): AgentTurnRecord => ({
	t: "2026-01-01T00:00:00Z",
	sid: "s1",
	sn: "Session 1",
	h: "pi",
	mod: "anthropic/claude-sonnet-4",
	rep: "git@github.com:me/app.git",
	turns,
	skills,
});

describe("totalToolCount", () => {
	test("counts unique tool names across turns", () => {
		const r = record([
			{ ti: 0, tools: [tool("read"), tool("edit")], totalUsage: usage(1) },
			{ ti: 1, tools: [tool("read"), tool("bash")], totalUsage: usage(1) },
		]);
		expect(totalToolCount(r)).toBe(3);
	});

	test("returns 0 for a record without turns or tools", () => {
		expect(totalToolCount(record([]))).toBe(0);
		expect(totalToolCount(record([{ ti: 0, tools: [], totalUsage: usage(1) }]))).toBe(0);
	});
});

describe("totalTokens", () => {
	test("sums tokens across turns", () => {
		const r = record([
			{ ti: 0, tools: [], totalUsage: usage(100) },
			{ ti: 1, tools: [], totalUsage: usage(50) },
		]);
		expect(totalTokens(r)).toBe(150);
	});

	test("returns 0 for a record without turns", () => {
		expect(totalTokens(record([]))).toBe(0);
	});
});

describe("totalCost", () => {
	test("sums cost across turns", () => {
		const r = record([
			{ ti: 0, tools: [], totalUsage: usage(0, 0.25) },
			{ ti: 1, tools: [], totalUsage: usage(0, 0.75) },
		]);
		expect(totalCost(r)).toBe(1);
	});

	test("returns 0 for a record without turns", () => {
		expect(totalCost(record([]))).toBe(0);
	});
});

describe("totalSkillCount", () => {
	test("counts unique skills", () => {
		expect(totalSkillCount(record([], ["read", "edit", "read"]))).toBe(2);
	});

	test("returns 0 when skills are absent or empty", () => {
		expect(totalSkillCount(record([]))).toBe(0);
		expect(totalSkillCount(record([], []))).toBe(0);
	});
});