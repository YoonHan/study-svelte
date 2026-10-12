<script>
	let count = $state(0);
	let y = $state(0);
	let plain = 0;

	function increment() {
		count += 1;
	}
</script>

<button onclick={increment}>referenced handler</button>
<button onclick={() => count++}>inline arrow</button>
<button onclick={() => console.log('no state used')}>inline, no state</button>
<button onclick={() => (plain += 1)}>mutates a plain let</button>
<div onscroll={(e) => (y = e.currentTarget.scrollTop)}>scroll me</div>
<input onfocus={() => console.log('focus')} />
<p>{count} {y} {plain}</p>
