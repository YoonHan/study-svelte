<script>
	let count = $state(0);
	let log = [];

	function increment() {
		count += 1;
	}

	function record(event) {
		log.push(event.type);
		log = log;
	}
</script>

<!-- (a) named function, delegated event -->
<button onclick={increment}>a</button>

<!-- (b) inline arrow, delegated event -->
<button onclick={() => (count -= 1)}>b</button>

<!-- (c) references a plain (non-state) variable that is reassigned -->
<button onclick={record}>c</button>

<!-- (d) non-delegated event -->
<input onfocus={() => (count = 0)} />

{#each [1, 2, 3] as item, i}
	<!-- (e) uses the each index -->
	<button onclick={() => (count = i)}>{item}</button>
{/each}
