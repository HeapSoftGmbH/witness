import { mount } from 'svelte';
import { describe, expect, test } from 'vitest';

import { records } from '$lib/stores/records.svelte.ts';

import { record, tool, usage } from '../../test/fixtures';
import UsageTable from './UsageTable.svelte';

describe('UsageTable', () => {
	test('renders one row per session with computed totals', () => {
		records.data.push(
			record({
				sid: 's1',
				sn: 'My session',
				h: 'pi',
				mod: 'anthropic/claude-sonnet-4',
				turns: [
					{ ti: 0, tools: [tool('read'), tool('edit')], totalUsage: usage(1000, 1) },
					{ ti: 1, tools: [tool('read')], totalUsage: usage(500, 0.5) }
				]
			}),
			record({
				sid: 's2',
				sn: '',
				h: 'opencode',
				mod: 'openai/gpt-5',
				turns: [{ ti: 0, tools: [tool('bash')], totalUsage: usage(250, 0.25) }]
			}),
			// same session, later turn without a name — session name still applies
			record({
				sid: 's1',
				sn: '',
				h: 'pi',
				mod: 'anthropic/claude-sonnet-4',
				turns: [{ ti: 0, tools: [tool('bash')], totalUsage: usage(100, 0.1) }]
			})
		);

		records.loaded = true;

		const target = document.createElement('div');
		mount(UsageTable, { target });
		const text = target.textContent ?? '';

		expect(text).toContain('My session');
		expect(text).not.toContain('s1');
		expect(text).not.toContain('—');
		expect(text).toContain('s2');
		expect(text).toContain('pi');
		expect(text).toContain('opencode');

		expect(text).toContain('1.6K');
		expect(text).toContain('$1.60');
		expect(text).toContain('$0.25');
	});
});
