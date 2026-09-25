import { mount } from 'svelte';
import { describe, expect, test } from 'vitest';
import type { AgentTurnRecord } from 'witness';

import { records } from '$lib/stores/records.svelte.ts';

import { record, tool, usage } from '../../../../test/fixtures';
import ModelUsageChart from './ModelUsageChart.svelte';

const awaitTick = () => new Promise((r) => setTimeout(r, 0));

describe('ModelUsageChart', () => {
	test('mounts and renders an svg for a single record', async () => {
		records.push(
			record({
				mod: 'anthropic/claude-sonnet-4',
				turns: [{ ti: 0, tools: [tool('read')], totalUsage: usage(1000, 1) }]
			})
		);

		const target = document.createElement('div');
		mount(ModelUsageChart, {
			target,
			props: {
				value: (r: AgentTurnRecord) => r.turns[0].totalUsage.tok,
				format: (n: number) => String(n)
			}
		});

		// chart draws after the ResizeObserver reports a size (stubbed in setup)
		await awaitTick();
		expect(target.querySelector('svg')).toBeTruthy();
	});
});
