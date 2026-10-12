<script>
	let n = $state(0);
</script>

<button class="inc" onclick={() => n++}>+1</button>
<button class="dec" onclick={() => n--}>-1</button>

{#if n > 0}
	<p class="pos">positive: {n}</p>
{:else if n < 0}
	<p class="neg">negative</p>
{:else}
	<p class="zero">zero</p>
{/if}
