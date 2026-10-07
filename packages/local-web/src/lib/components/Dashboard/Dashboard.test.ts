import { mount } from 'svelte';
import { describe, expect, test } from 'vitest';

import { records } from '$lib/stores/records.svelte.ts';

import { record, tool, usage } from '../../../test/fixtures';
import Dashboard from './Dashboard.svelte';

const awaitTick = () => new Promise((r) => setTimeout(r, 0));

describe('Dashboard', () => {
	test('renders aggregated stats and chart cards from records', () => {
		records.data.push(
			record({
				sid: 's1',
				mod: 'anthropic/claude-sonnet-4',
				turns: [{ ti: 0, tools: [tool('read'), tool('edit')], totalUsage: usage(1000, 1) }],
				skills: ['paraglide', 'shadcn-svelte']
			}),
			record({
				sid: 's2',
				mod: 'openai/gpt-5',
				turns: [{ ti: 0, tools: [tool('read'), tool('bash')], totalUsage: usage(500, 0.5) }],
				skills: ['paraglide']
			})
		);

		records.loaded = true;

		const target = document.createElement('div');
		mount(Dashboard, { target });
		const text = target.textContent ?? '';

		// stat cards: cost + tokens summed, tools + skills deduped
		expect(text).toContain('Cost');
		expect(text).toContain('$1.50');
		expect(text).toContain('Tokens Used');
		expect(text).toContain('1.5K');
		expect(text).toContain('3');
		expect(text).toContain('2');

		// chart cards
		expect(text).toContain('Model Costs');
		expect(text).toContain('Models');
		expect(text).toContain('Tools');
		expect(text).toContain('Skills');
	});

	test('shows skeletons until records are loaded', () => {
		const target = document.createElement('div');
		mount(Dashboard, { target });

		expect(target.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
	});

	test('aggregates tools, models and skills with per-turn weighting, sorted by count', async () => {
		records.data.push(
			record({
				sid: 's1',
				mod: 'anthropic/claude-sonnet-4',
				turns: [
					{ ti: 0, tools: [tool('read'), tool('edit'), tool('bash')], totalUsage: usage(1) },
					{ ti: 1, tools: [tool('read'), tool('edit')], totalUsage: usage(1) },
					{ ti: 2, tools: [tool('read')], totalUsage: usage(1) }
				],
				skills: ['paraglide', 'shadcn-svelte']
			}),
			record({
				sid: 's2',
				mod: 'openai/gpt-5',
				turns: [{ ti: 0, tools: [tool('read')], totalUsage: usage(1) }],
				skills: ['paraglide']
			})
		);
		records.loaded = true;

		const target = document.createElement('div');
		mount(Dashboard, { target });
		await awaitTick();

		for (const style of target.querySelectorAll('style')) style.remove();
		const text = target.textContent ?? '';

		expect(text).toContain('claude-sonnet-4');
		expect(text).toContain('gpt-5');
		expect(text).not.toContain('anthropic/');
		expect(text).not.toContain('openai/');

		expect(text.indexOf('read')).toBeLessThan(text.indexOf('edit'));
		expect(text.indexOf('edit')).toBeLessThan(text.indexOf('bash'));

		expect(text).toContain('paraglide');
		expect(text).toContain('shadcn-svelte');
	});
});
