import { mount } from 'svelte';
import { describe, expect, test } from 'vitest';

import { records } from '$lib/stores/records.svelte.ts';

import NameCountChart from './NameCountChart.svelte';

const data = Array.from({ length: 6 }, (_, i) => ({ name: `tool-${i}`, count: 6 - i }));

const awaitTick = () => new Promise((r) => setTimeout(r, 0));

describe('NameCountChart', () => {
	test('renders the title and top-n slices', async () => {
		records.loaded = true;

		const target = document.createElement('div');
		mount(NameCountChart, {
			target,
			props: { data, label: 'Invocations', title: 'Tools', description: 'x', top: 3 }
		});

		// chart label positions draw after the ResizeObserver reports a size (stubbed in setup)
		await awaitTick();
		const text = target.textContent ?? '';
		expect(text).toContain('Tools');
		expect(text).toContain('tool-0');

		// only the top 3 of 6 entries are charted
		expect(text).toContain('tool-2');
		expect(text).not.toContain('tool-3');
	});

	test('shows the View all trigger once data exceeds 5 entries', () => {
		records.loaded = true;

		const few = data.slice(0, 5);
		const withFew = document.createElement('div');
		mount(NameCountChart, {
			target: withFew,
			props: { data: few, label: 'Invocations', title: 'Tools', description: 'x' }
		});
		expect(withFew.textContent ?? '').not.toContain('View all');

		const withMany = document.createElement('div');
		mount(NameCountChart, {
			target: withMany,
			props: { data, label: 'Invocations', title: 'Tools', description: 'x' }
		});
		expect(withMany.textContent ?? '').toContain('View all');
	});
});
