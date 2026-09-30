import { describe, expect, test } from 'vitest';

import { getModelFromSourceString, getRepoName, getRepoUrl } from './utils';

describe('getModelFromSourceString', () => {
	test('extracts model from provider/model', () => {
		expect(getModelFromSourceString('anthropic/claude-sonnet-4')).toBe('claude-sonnet-4');
	});

	test('returns input unchanged when there is no slash', () => {
		expect(getModelFromSourceString('claude-haiku')).toBe('claude-haiku');
	});

	test('takes the segment after the last slash', () => {
		expect(getModelFromSourceString('deepseek/deepseek-chat/v3')).toBe('v3');
	});

	test('returns empty string for empty input', () => {
		expect(getModelFromSourceString('')).toBe('');
	});
});

describe('getRepoName', () => {
	test('extracts owner/repo from https remote', () => {
		expect(getRepoName('https://github.com/HeapSoftGmbH/witness.git')).toBe('HeapSoftGmbH/witness');
	});

	test('extracts owner/repo from ssh remote', () => {
		expect(getRepoName('git@github.com:HeapSoftGmbH/witness.git')).toBe('HeapSoftGmbH/witness');
	});

	test('returns placeholder when there is no remote', () => {
		expect(getRepoName('')).toBe('local repository');
		expect(getRepoName(undefined)).toBe('local repository');
	});
});

describe('getRepoUrl', () => {
	test('normalizes an https remote to a web URL', () => {
		expect(getRepoUrl('https://github.com/HeapSoftGmbH/witness.git')).toBe(
			'https://github.com/HeapSoftGmbH/witness'
		);
	});

	test('normalizes an ssh remote to a web URL', () => {
		expect(getRepoUrl('git@github.com:HeapSoftGmbH/witness.git')).toBe(
			'https://github.com/HeapSoftGmbH/witness'
		);
	});

	test('returns null when there is no remote', () => {
		expect(getRepoUrl('')).toBeNull();
		expect(getRepoUrl(undefined)).toBeNull();
		expect(getRepoUrl('/Users/me/projects/thing')).toBeNull();
	});
});
