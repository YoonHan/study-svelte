<script>
	let count = $state(0);
	let double = $derived(count * 2);
	let label = $derived.by(() => {
		const parity = count % 2 === 0 ? 'even' : 'odd';
		return `${count} is ${parity}`;
	});

	$effect(() => {
		console.log('effect', count);
	});

	$effect.pre(() => {
		console.log('pre effect', double);
	});
</script>

<button onclick={() => count++}>{label}</button>
<p>{double}</p>
