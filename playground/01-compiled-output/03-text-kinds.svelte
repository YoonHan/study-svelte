<script>
	const name = 'world';
	let count = $state(0);

	function format(n) {
		return `#${n}`;
	}
</script>

<p>constant: {name}</p>
<p>state: {count}</p>
<p>mixed: {name} has {count} clicks</p>
<p>call: {format(count)}</p>
<p>two calls: {format(count)} / {format(count + 1)}</p>
<p>{count}</p>

<button onclick={() => count++}>+1</button>
