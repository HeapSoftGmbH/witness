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
 * Formatter for Numbers, compact format. E.g. 400, 4K, 4M etc.
 */
export const compactNumberFormatter = new Intl.NumberFormat('en', { notation: 'compact' });

/**
 * Formatter for Numbers as Dollar with two fraction digits. E.g. $400, $4 etc.
 */
export const dollarNumberFormatter = new Intl.NumberFormat('en', {
	style: 'currency',
	currency: 'USD'
});

/**
 * Formatter for Numbers as Dollar with four fraction digits. E.g. $400, $4 etc.
 */
export const dollarNumberFormatterWith4Fracts = new Intl.NumberFormat('en', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 4
});
