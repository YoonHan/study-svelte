<script>
	import { fade } from 'svelte/transition';

	let show = $state(false);
	let count = $state(0);
</script>

<button class="toggle" onclick={() => (show = !show)}>toggle</button>
<button class="inc" onclick={() => count++}>count++</button>

{#if show}
	<p transition:fade={{ duration: 100 }}>count: {count}</p>
{/if}
