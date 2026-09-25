import { describe, expect, test } from "bun:test";
import {
	compactNumberFormatter,
	dollarNumberFormatter,
	dollarNumberFormatterWith4Fracts,
	getModelFromSourceString,
} from "./utils";

describe("getModelFromSourceString", () => {
	test("extracts model from provider/model", () => {
		expect(getModelFromSourceString("anthropic/claude-sonnet-4")).toBe("claude-sonnet-4");
	});

	test("returns input unchanged when there is no slash", () => {
		expect(getModelFromSourceString("claude-haiku")).toBe("claude-haiku");
	});

	test("takes the segment after the last slash", () => {
		expect(getModelFromSourceString("deepseek/deepseek-chat/v3")).toBe("v3");
	});

	test("returns empty string for empty input", () => {
		expect(getModelFromSourceString("")).toBe("");
	});
});

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