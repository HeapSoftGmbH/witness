/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: [
		'prettier-plugin-svelte',
		'prettier-plugin-tailwindcss',
		'@trivago/prettier-plugin-sort-imports'
	],
	importOrder: ['^[^$@./]', '^@(?!/lib)', '^@/lib', '^\\$', '^[./]'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
	tailwindStylesheet: './src/app.css'
};

export default config;
