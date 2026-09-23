<script lang="ts">
	import { BarChart, Tooltip } from 'layerchart';

	import { buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { cn } from '$lib/utils.js';

	let {
		data,
		label,
		title,
		top = 5,
		description = 'Most frequent entries across recorded turns, with per-entry counts.'
	}: {
		data: { name: string; count: number }[];
		label: string;
		title: string;
		description: string;
		top?: number;
	} = $props();

	const chartConfig = $derived({
		count: {
			theme: {
				light: 'var(--color-chart-1)',
				dark: 'var(--color-chart-3)'
			}
		}
	} satisfies Chart.ChartConfig);
	const visible = $derived(data.slice(0, top));
</script>

{#snippet chart(d: { name: string; count: number }[], heightClass?: string)}
	<Chart.Container config={chartConfig} class={cn(heightClass, 'w-full')}>
		<BarChart
			data={d}
			orientation="horizontal"
			x="count"
			y="name"
			cRange={['var(--color-count)']}
			axis="y"
			padding={{ left: 0, right: 28 }}
			props={{
				bars: { stroke: 'none', radius: 2, rounded: 'right' },
				yAxis: {
					tickLabelProps: {
						textAnchor: 'start',
						dx: 7,
						class: 'fill-black! dark:fill-white! font-medium! text-sm!'
					},
					tickLength: 0
				},
				highlight: { area: { fill: 'none' } }
			}}
		>
			{#snippet tooltip({ context })}
				{@const d = context.tooltip.data}
				<Tooltip.Root variant="none">
					<div
						class="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
					>
						{#if d}
							<div class="font-medium">{d.name}</div>
							<div class="flex w-full items-center gap-2">
								<div
									class="h-2.5 w-2.5 shrink-0 rounded-xs"
									style="background: {context.tooltip.series[0]?.color}"
								></div>
								<span class="flex-1 text-muted-foreground">{label}</span>
								<span class="font-mono font-medium text-foreground tabular-nums">
									{d.count.toLocaleString()}
								</span>
							</div>
						{/if}
					</div>
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</Chart.Container>
{/snippet}

<Dialog.Root>
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex justify-between items-center">
				{title}
				{#if data.length > 5}
					<Dialog.Trigger type="button" class={buttonVariants({ size: 'xs' })}>
						View all
					</Dialog.Trigger>
				{/if}
			</Card.Title>
			<Card.Description>{description}</Card.Description>
		</Card.Header>
		<Card.Content>
			{@render chart(visible, 'max-h-75')}
		</Card.Content>
	</Card.Root>
	<Dialog.Content class="min-w-xl">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-[65vh]">
			{@render chart(data, 'h-full')}
		</ScrollArea>
		<Dialog.Footer>
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
				Close
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
