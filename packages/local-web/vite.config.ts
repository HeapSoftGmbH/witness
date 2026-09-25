import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { Session } from 'witness';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

function usageApi(): import('vite').Plugin {
	return {
		name: 'witness-usage-api',
		configureServer(server) {
			server.middlewares.use('/api/records', (_req, res) => {
				try {
					res.setHeader('content-type', 'application/json');
					res.end(JSON.stringify(new Session({ sessionId: 'dev', harness: 'dev' }).readRecords()));
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
	plugins: [usageApi(), tailwindcss(), svelte()],
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
