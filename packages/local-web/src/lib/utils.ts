export { cn } from 'cn';

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

/**
 * Extract model from the <provider>/<model> string
 * @param providerModel String provided by the witness tracking, format is <provider>/<model>
 * @returns returns the model from the string
 */
export function getModelFromSourceString(providerModel: string): string {
	return providerModel.split('/').pop() ?? providerModel;
}

/**
 * Extract provider from the <provider>/<model> string
 * @param providerModel String provided by the witness tracking, format is <provider>/<model>
 * @returns returns the provdier from the string
 */
export function getProviderFromSourceString(providerModel: string): string {
	return providerModel.split('/')[0] ?? '';
}

/**
 * Repo name from a git remote URL (https or git@ssh form).
 * Falls back to the raw string, or a placeholder when there is no remote.
 */
export function getRepoName(remote: string | undefined | null): string {
	const clean = (remote ?? '')
		.replace(/^[^/]+@[^:]+:/, '') // git@github.com:owner/repo
		.replace(/^https?:\/\/[^/]+\//, '') // https://github.com/owner/repo
		.replace(/\.git$/, '');
	return clean || 'local repository';
}
