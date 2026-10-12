<script>
	let a = $state(0);
	let b = $state(0);

	function expensive(n) {
		console.log(`    expensive(${n}) evaluated`);
		return n * 100;
	}
</script>

<p>a: {a}</p>
<p>b: {b}</p>
<p>b via call: {expensive(b)}</p>
<button class="a" onclick={() => a++}>a++</button>
<button class="b" onclick={() => b++}>b++</button>
