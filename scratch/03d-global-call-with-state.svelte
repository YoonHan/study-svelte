<script>
	let count = $state(0);
</script>

<p>{Math.max(count, 1)}</p>
<button onclick={() => count++}>+1</button>
