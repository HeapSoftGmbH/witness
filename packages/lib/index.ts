/**
 * Formatter for Numbers, compact format. E.g. 400, 4K, 4M etc.
 */
export const compactNumberFormatter = new Intl.NumberFormat("en", {
	notation: "compact",
});

/**
 * Formatter for Numbers as Dollar with two fraction digits. E.g. $400, $4 etc.
 */
export const dollarNumberFormatter = new Intl.NumberFormat("en", {
	style: "currency",
	currency: "USD",
});

/**
 * Formatter for Numbers as Dollar with four fraction digits. E.g. $400, $4 etc.
 */
export const dollarNumberFormatterWith4Fracts = new Intl.NumberFormat("en", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 4,
});
