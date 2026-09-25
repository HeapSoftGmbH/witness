import { describe, expect, test } from "bun:test";

import {
	compactNumberFormatter,
	dollarNumberFormatter,
	dollarNumberFormatterWith4Fracts,
} from "./index";

describe("number formatters", () => {
	test("compact format shortens large numbers", () => {
		expect(compactNumberFormatter.format(400)).toBe("400");
		expect(compactNumberFormatter.format(4000)).toBe("4K");
		expect(compactNumberFormatter.format(4_000_000)).toBe("4M");
	});

	test("dollar format renders two fraction digits", () => {
		expect(dollarNumberFormatter.format(4.5)).toBe("$4.50");
		expect(dollarNumberFormatter.format(4000)).toBe("$4,000.00");
	});

	test("dollar format with four fraction digits keeps small amounts", () => {
		expect(dollarNumberFormatterWith4Fracts.format(0.1234)).toBe("$0.1234");
	});
});
