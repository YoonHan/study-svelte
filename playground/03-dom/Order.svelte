<!-- Same as playground/Counter.svelte, but the {#if} block comes FIRST in the markup.
     Predict the order of DOM mutations on the 3rd click before running:
     node tools/mount.mjs playground/03-dom/Order.svelte --script labs/03-dom/counter.steps.mjs -->
<script>
	let count = $state(0);
	let double = $derived(count * 2);
</script>

{#if count > 2}
	<p class="warn">too many!</p>
{/if}
<button onclick={() => count++}>clicks: {count}</button>
<p>double: {double}</p>
