<script lang="ts">
	import { RiGitBranchLine, RiGithubLine, RiUser3Line } from 'remixicon-svelte';

	import { records } from '$lib/stores/records.svelte.ts';
	import { getRepoName } from '$lib/utils';

	const last = $derived(records.at(-1));
	const repoName = $derived(getRepoName(last?.rep));
	const branch = $derived(last?.branch ?? '');
	const userName = $derived(last?.user?.name ?? '');
	const userEmail = $derived(last?.user?.email ?? '');
</script>

<div class="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
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
</div>
