<script>
	let { show = true } = $props();
</script>

{#if show}<span>shown</span>{/if}
<p>after the block</p>
