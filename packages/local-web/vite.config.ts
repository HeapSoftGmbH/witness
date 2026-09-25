import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

function witnessDir(root: string) {
	if (process.env.WITNESS_DIR) return process.env.WITNESS_DIR;
	try {
		return path.join(
			execSync('git rev-parse --show-toplevel', { cwd: root }).toString().trim(),
			'.witness'
		);
	} catch {
		return path.join(root, '.witness');
	}
}

// ponytail: dev-only middleware; add a static build step if the built app needs data
function usageApi(root: string): import('vite').Plugin {
	const file = path.join(witnessDir(root), 'usage.jsonl');
	return {
		name: 'witness-usage-api',
		configureServer(server) {
			server.middlewares.use('/api/records', (_req, res) => {
				try {
					// skip malformed lines, precompute derived sort fields
					const records = fs
						.readFileSync(file, 'utf8')
						.split('\n')
						.filter(Boolean)
						.flatMap((line) => {
							try {
								const r = JSON.parse(line) as {
									t: string;
									turns: {
										tools: unknown[];
										totalUsage: { tok: number; cst: number };
									}[];
								};
								return [
									{
										...r,
										ts: Date.parse(r.t),
										nTurns: r.turns.length,
										nTools: r.turns.reduce((a, t) => a + t.tools.length, 0),
										tok: r.turns.reduce((a, t) => a + t.totalUsage.tok, 0),
										cst: r.turns.reduce((a, t) => a + t.totalUsage.cst, 0)
									}
								];
							} catch {
								return [];
							}
						});
					res.setHeader('content-type', 'application/json');
					res.end(JSON.stringify(records));
				} catch {
					res.statusCode = 404;
					res.end('');
				}
			});
		}
	};
}

export default defineConfig({
	base: './',
	plugins: [usageApi(__dirname), tailwindcss(), svelte()],
	resolve: {
		conditions: process.env.VITEST ? ['browser'] : undefined,
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		exclude: ['**/node_modules/**', 'src/lib/components/ui/**'],
		setupFiles: ['./src/test/setup.ts']
	}
});
