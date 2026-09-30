<script lang="ts">
	import { RiGitBranchLine, RiGithubLine, RiUser3Line } from 'remixicon-svelte';

	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { records } from '$lib/stores/records.svelte.ts';
	import { getRepoName } from '$lib/utils';

	const last = $derived(records.data.at(-1));
	const repoName = $derived(getRepoName(last?.rep));
	const branch = $derived(last?.branch ?? '');
	const userName = $derived(last?.user?.name ?? '');
	const userEmail = $derived(last?.user?.email ?? '');
</script>

<div class="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
	{#if !records.loaded}
		<Skeleton class="h-4 w-36" />
		<Skeleton class="h-4 w-20" />
		<Skeleton class="h-4 w-36" />
	{:else}
		<span class="flex items-center gap-1.5">
			<RiGithubLine class="size-4" />
			{repoName}
		</span>
		{#if branch}
			<span class="flex items-center gap-1.5">
				<RiGitBranchLine class="size-4 rotate-90" />
				{branch}
			</span>
		{/if}
		<span class="flex items-center gap-1.5">
			<RiUser3Line class="size-4" />
			{userName || 'Unknown'}
			{#if userEmail}({userEmail}){/if}
		</span>
	{/if}
</div>
