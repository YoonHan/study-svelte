<script>
	let div;

	// attach a plain DOM listener to the parent, bypassing Svelte's delegation
	$effect(() => {
		div.addEventListener('click', () => console.log('    native listener on <div> ran'));
	});
</script>

<div bind:this={div}>
	<button
		onclick={(e) => {
			console.log('    delegated onclick on <button> ran, calling stopPropagation()');
			e.stopPropagation();
		}}>click me</button
	>
</div>
