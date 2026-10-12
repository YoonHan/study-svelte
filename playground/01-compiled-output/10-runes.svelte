<script>
	let count = $state(0);
	let double = $derived(count * 2);
</script>

<button onclick={() => count++}>clicks: {count}</button>
<p>double: {double}</p>
