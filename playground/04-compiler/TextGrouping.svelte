<script>
	let name = $state('world');
	let n = $state(1);
	const greeting = 'hello';

	function shout(s) {
		return s.toUpperCase();
	}
</script>

<p>static: {greeting} {1 + 1}</p>
<p>state A: {name}</p>
<p>state B: {n}</p>
<p>call: {shout(name)}</p>
<p>two calls: {shout(name)} and {n.toFixed(2)}</p>
