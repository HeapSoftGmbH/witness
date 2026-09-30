import { describe, expect, test } from 'vitest';

import { getModelFromSourceString, getRepoName } from './utils';

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
