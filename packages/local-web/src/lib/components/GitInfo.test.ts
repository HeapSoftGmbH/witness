import { mount } from 'svelte';
import { describe, expect, test } from 'vitest';

import { records } from '$lib/stores/records.svelte.ts';

import { record, tool, usage } from '../../test/fixtures';
import GitInfo from './GitInfo.svelte';

const base = {
	turns: [{ ti: 0, tools: [tool('read')], totalUsage: usage(1) }]
};

describe('GitInfo', () => {
	test('shows skeletons until records are loaded', () => {
		const target = document.createElement('div');
		mount(GitInfo, { target });

		expect(target.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
		expect(target.querySelector('a')).toBeNull();
	});

	test('links the repo and github user profile from an ssh remote', () => {
		records.data.push(
			record({
				...base,
				rep: 'git@github.com:me/app.git',
				branch: 'main',
				user: { name: 'fredi', email: 'fredi@example.com' }
			})
		);
		records.loaded = true;

		const target = document.createElement('div');
		mount(GitInfo, { target });

		const repoLink = target.querySelector('a[href="https://github.com/me/app"]');
		expect(repoLink?.textContent).toContain('me/app');

		const profileLink = target.querySelector('a[href="https://github.com/fredi"]');
		expect(profileLink?.textContent).toContain('fredi');
		expect(profileLink?.textContent).toContain('(fredi@example.com)');

		expect(target.textContent).toContain('main');
	});

	test('normalizes an https remote to a web repo link', () => {
		records.data.push(record({ ...base, rep: 'https://github.com/me/app.git' }));
		records.loaded = true;

		const target = document.createElement('div');
		mount(GitInfo, { target });

		const link = target.querySelector('a[href="https://github.com/me/app"]');
		expect(link?.textContent).toContain('me/app');
	});

	test('omits the branch when the record has none', () => {
		records.data.push(record({ ...base, rep: 'git@github.com:me/app.git' }));
		records.loaded = true;

		const target = document.createElement('div');
		mount(GitInfo, { target });

		expect(target.textContent).not.toContain('main');
	});

	test('falls back to Unknown when the record has no user', () => {
		records.data.push(record({ ...base, rep: 'git@github.com:me/app.git' }));
		records.loaded = true;

		const target = document.createElement('div');
		mount(GitInfo, { target });

		expect(target.textContent).toContain('Unknown');
		expect(target.querySelector('a[href="https://github.com/fredi"]')).toBeNull();
	});

	test('keeps the user plain (unlinked) for non-github repos', () => {
		records.data.push(
			record({
				...base,
				rep: 'git@gitlab.com:me/app.git',
				user: { name: 'fredi', email: 'fredi@example.com' }
			})
		);
		records.loaded = true;

		const target = document.createElement('div');
		mount(GitInfo, { target });

		expect(target.querySelector('a[href="https://gitlab.com/me/app"]')).not.toBeNull();
		expect(target.querySelector('a[href*="github.com/fredi"]')).toBeNull();
		expect(target.textContent).toContain('fredi');
	});

	test('shows the local repository placeholder without links when there is no remote', () => {
		records.data.push(record({ ...base, rep: '' }));
		records.loaded = true;

		const target = document.createElement('div');
		mount(GitInfo, { target });

		expect(target.textContent).toContain('local repository');
		expect(target.querySelector('a')).toBeNull();
	});
});
