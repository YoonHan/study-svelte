<svelte:options runes={true} />

<script>
	let count = 0;
	let unused_but_reassigned = 0;

	function reset() {
		unused_but_reassigned = 1;
	}
</script>

<button onclick={() => count++}>{count}</button>
