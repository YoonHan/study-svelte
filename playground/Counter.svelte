<script>
	let { initial = 0 } = $props();
	let count = $state(initial);
	let double = $derived(count * 2);
</script>

<button onclick={() => count++}>clicks: {count}</button>
<p>double: {double}</p>
{#if count > 2}
	<p class="warn">too many!</p>
{/if}
