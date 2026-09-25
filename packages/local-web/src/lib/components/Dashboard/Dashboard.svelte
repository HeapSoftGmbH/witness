<script lang="ts">
	import {
		compactNumberFormatter,
		dollarNumberFormatter,
		dollarNumberFormatterWith4Fracts
	} from 'lib';

	import * as Card from '$lib/components/ui/card/index.js';
	import { records } from '$lib/stores/records.svelte.ts';
	import { totalCost, totalTokens } from '$lib/usage';
	import { getModelFromSourceString } from '$lib/utils';

	import { ModelUsageChart, NameCountChart } from './components';

	const countNames = (counts: Record<string, number>) =>
		Object.entries(counts)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);

	const allTools = $derived(
		countNames(
			records.reduce<Record<string, number>>((acc, r) => {
				for (const t of r.turns)
					for (const tool of t.tools) acc[tool.name] = (acc[tool.name] ?? 0) + 1;
				return acc;
			}, {})
		)
	);

	const allModels = $derived(
		Object.entries(
			records.reduce<Record<string, number>>((acc, r) => {
				acc[r.mod] = (acc[r.mod] ?? 0) + r.turns.length;
				return acc;
			}, {})
		)
			.map(([name, count]) => ({ name: getModelFromSourceString(name), count }))
			.sort((a, b) => b.count - a.count)
	);

	const allSkills = $derived(
		countNames(
			records.reduce<Record<string, number>>((acc, r) => {
				for (const s of r.skills ?? []) acc[s] = (acc[s] ?? 0) + 1;
				return acc;
			}, {})
		)
	);

	const stats = $derived([
		{
			label: 'Cost',
			description: 'Total dollars spent in this repository.',
			value: dollarNumberFormatter.format(records.reduce((n, r) => n + totalCost(r), 0))
		},
		{
			label: 'Tokens Used',
			description: 'Total tokens used in this repository.',
			value: compactNumberFormatter.format(records.reduce((n, r) => n + totalTokens(r), 0))
		},
		{
			label: 'Tools Used',
			description: 'Number of distinct tools used.',
			value: compactNumberFormatter.format(
				new Set(records.flatMap((r) => r.turns.flatMap((t) => t.tools.map((tool) => tool.name))))
					.size
			)
		},
		{
			label: 'Skills Used',
			description: 'Number of distinct skills used.',
			value: compactNumberFormatter.format(new Set(records.flatMap((r) => r.skills ?? [])).size)
		}
	]);
</script>

<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
	{#each stats as s (s.label)}
		<Card.Root>
			<Card.Header>
				<Card.Title>{s.label}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-3xl tabular-nums -mt-4">{s.value}</div>
				<div class="text-xs text-muted-foreground">{s.description}</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Model Costs</Card.Title>
		<Card.Description>Amount spent per model per day in dollars.</Card.Description>
	</Card.Header>
	<Card.Content>
		<ModelUsageChart value={totalCost} format={dollarNumberFormatterWith4Fracts.format} />
	</Card.Content>
</Card.Root>
<Card.Root class="mt-4">
	<Card.Header>
		<Card.Title>Tokens Used</Card.Title>
		<Card.Description>Total tokens used per model per day.</Card.Description>
	</Card.Header>
	<Card.Content>
		<ModelUsageChart value={totalTokens} format={compactNumberFormatter.format} />
	</Card.Content>
</Card.Root>
<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
	<NameCountChart
		title="Models"
		data={allModels}
		label="Invocations"
		description="Invocations per model across recorded turns."
	/>
	<NameCountChart
		title="Tools"
		data={allTools}
		label="Invocations"
		description="Runs per tool across recorded turns."
	/>
	<NameCountChart
		title="Skills"
		data={allSkills}
		label="Uses"
		description="Uses per skill across recorded turns."
	/>
</div>
