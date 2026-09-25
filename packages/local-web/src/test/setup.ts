import { afterEach, vi } from 'vitest';

import { records } from '$lib/stores/records.svelte.ts';

// jsdom has no ResizeObserver; layerchart charts measure via svelte's
// bind:clientWidth, which needs an observer that actually reports a size.
class ResizeObserverStub {
	observed = new Set<Element>();
	constructor(private callback: ResizeObserverCallback) {}
	observe(el: Element) {
		if (this.observed.has(el)) return;
		this.observed.add(el);
		queueMicrotask(() =>
			this.callback(
				[{ target: el, contentRect: { width: 640, height: 400 } } as ResizeObserverEntry],
				this as unknown as ResizeObserver
			)
		);
	}
	unobserve() {}
	disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// jsdom has no matchMedia; svelte's reactive MediaQuery and mode-watcher need it.
vi.stubGlobal('matchMedia', (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: () => {},
	removeListener: () => {},
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false
}));

// records is a module-level $state singleton shared by every test suite.
afterEach(() => {
	records.length = 0;
});
