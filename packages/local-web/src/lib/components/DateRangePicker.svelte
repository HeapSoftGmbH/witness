<script lang="ts">
	import type { DateRange } from 'bits-ui';

	import { parseDate } from '@internationalized/date';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import { isoDateNDaysAgo } from '$lib/utils';

	let { value = $bindable() }: { value: { start: string; end: string } } = $props();

	let customOpen = $state(false);
	let selected = $state<DateRange | undefined>();

	const formatDay = (iso: string) =>
		new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

	const label = $derived.by(() => {
		const today = isoDateNDaysAgo(0);
		return formatDay(value.start) === formatDay(value.end)
			? formatDay(value.start)
			: `${formatDay(value.start)} – ${formatDay(value.end) === formatDay(today) ? 'Today' : formatDay(value.end)}`;
	});

	const applyPreset = (days: number) => {
		value = { start: isoDateNDaysAgo(days - 1), end: isoDateNDaysAgo(0) };
	};

	const openCustom = () => {
		selected = { start: parseDate(value.start), end: parseDate(value.end) };
		customOpen = true;
	};

	const applyCustom = () => {
		if (!selected?.start || !selected?.end) return;
		value = { start: selected.start.toString(), end: selected.end.toString() };
		customOpen = false;
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="sm" class="font-normal">{label}</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-45">
		<DropdownMenu.Item onSelect={() => applyPreset(7)}>Last 7 days</DropdownMenu.Item>
		<DropdownMenu.Item onSelect={() => applyPreset(30)}>Last 30 days</DropdownMenu.Item>
		<DropdownMenu.Item onSelect={openCustom}>Custom range…</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root bind:open={customOpen}>
	<Dialog.Content class="w-fit sm:max-w-none">
		<Dialog.Header>
			<Dialog.Title>Custom date range</Dialog.Title>
		</Dialog.Header>
		<RangeCalendar
			bind:value={selected}
			numberOfMonths={2}
			class="rounded-md border p-2 [--cell-size:2.25rem]"
		/>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Cancel</Button>
			</Dialog.Close>
			<Button disabled={!selected?.start || !selected?.end} onclick={applyCustom}>Apply</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
