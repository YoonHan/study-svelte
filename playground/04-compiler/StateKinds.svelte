<script>
	let { label = 'items', initial = 0 } = $props();

	// reassigned primitive state
	let count = $state(initial);

	// object state that is only mutated, never reassigned
	let todo = $state({ done: false, text: 'learn' });

	// object state that IS reassigned
	let user = $state({ name: 'potter' });

	// raw state: no deep proxy
	let point = $state.raw({ x: 0, y: 0 });

	let double = $derived(count * 2);

	// plain variable, reassigned in an event handler
	let plain = 0;
</script>

<button onclick={() => { count++; plain++; }}>{label}: {count} / {double} / {plain}</button>
<input type="checkbox" bind:checked={todo.done} /> {todo.text}
<button onclick={() => (user = { name: 'harry' })}>{user.name}</button>
<button onclick={() => (point = { x: point.x + 1, y: 0 })}>{point.x}</button>
