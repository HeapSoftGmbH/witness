<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';

	import Dashboard from '$lib/components/Dashboard/Dashboard.svelte';
	import UsageTable from '$lib/components/UsageTable.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { records } from '$lib/stores/records.svelte.ts';

	import './app.css';

	onMount(async () => {
		records.splice(0, records.length, ...(await (await fetch('/api/records')).json()));
	});
</script>

<ModeWatcher />

<main class="container mx-auto p-8">
	<Tabs.Root value="dashboard">
		<div class="flex gap-8">
			<div class="flex items-center gap-3">
				<img src="logo_charcoal.svg" alt="" class="mb-6 h-6 w-auto dark:hidden" />
				<img src="logo_offwhite.svg" alt="" class="mb-6 hidden h-6 w-auto dark:block" />
				<h1 class="mb-6 text-2xl font-semibold">Witness</h1>
			</div>
			<Tabs.List>
				<Tabs.Trigger value="dashboard">Dashboard</Tabs.Trigger>
				<Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
			</Tabs.List>
		</div>
		<Tabs.Content value="dashboard">
			<Dashboard />
		</Tabs.Content>
		<Tabs.Content value="sessions">
			<UsageTable />
		</Tabs.Content>
	</Tabs.Root>
</main>
