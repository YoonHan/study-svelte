<script>
	let count = 0;
	$: double = count * 2;
</script>

<button on:click={() => count++}>clicks: {count}</button>
<p>double: {double}</p>
