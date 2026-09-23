<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import { type WithElementRef, cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-content"
	class={cn('flex flex-col gap-3 px-(--card-spacing)', className)}
	{...restProps}
>
	{@render children?.()}
</div>
