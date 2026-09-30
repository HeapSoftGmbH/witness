import { describe, expect, test } from 'vitest';

import { record, tool, usage } from '../test/fixtures';
import { totalCost, totalSkillCount, totalTokens, totalToolCount } from './usage';

describe('totalToolCount', () => {
	test('counts unique tool names across turns', () => {
		const r = record({
			turns: [
				{ ti: 0, tools: [tool('read'), tool('edit')], totalUsage: usage(1) },
				{ ti: 1, tools: [tool('read'), tool('bash')], totalUsage: usage(1) }
			]
		});
		expect(totalToolCount(r)).toBe(3);
	});

	test('returns 0 for a record without turns or tools', () => {
		expect(totalToolCount(record({ turns: [] }))).toBe(0);
		expect(totalToolCount(record({ turns: [{ ti: 0, tools: [], totalUsage: usage(1) }] }))).toBe(0);
	});
});

describe('totalTokens', () => {
	test('sums tokens across turns', () => {
		const r = record({
			turns: [
				{ ti: 0, tools: [], totalUsage: usage(100) },
				{ ti: 1, tools: [], totalUsage: usage(50) }
			]
		});
		expect(totalTokens(r)).toBe(150);
	});

	test('returns 0 for a record without turns', () => {
		expect(totalTokens(record({ turns: [] }))).toBe(0);
	});
});

describe('totalCost', () => {
	test('sums cost across turns', () => {
		const r = record({
			turns: [
				{ ti: 0, tools: [], totalUsage: usage(0, 0.25) },
				{ ti: 1, tools: [], totalUsage: usage(0, 0.75) }
			]
		});
		expect(totalCost(r)).toBe(1);
	});

	test('returns 0 for a record without turns', () => {
		expect(totalCost(record({ turns: [] }))).toBe(0);
	});
});

describe('totalSkillCount', () => {
	test('counts unique skills', () => {
		expect(totalSkillCount(record({ turns: [], skills: ['read', 'edit', 'read'] }))).toBe(2);
	});

	test('returns 0 when skills are absent or empty', () => {
		expect(totalSkillCount(record({ turns: [] }))).toBe(0);
		expect(totalSkillCount(record({ turns: [], skills: [] }))).toBe(0);
	});
});
