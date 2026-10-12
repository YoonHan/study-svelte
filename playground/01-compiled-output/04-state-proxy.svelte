<script>
	// never reassigned
	let a = $state(0);
	let b = $state({ n: 0 });
	let c = $state([1, 2, 3]);

	// reassigned somewhere
	let d = $state(0);
	let e = $state({ n: 0 });

	// raw state
	let f = $state.raw({ n: 0 });

	// initial value comes from another binding
	const seed = { n: 0 };
	let g = $state(seed);

	function reassign() {
		d = 1;
		e = { n: 1 };
		f = { n: 1 };
	}

	function mutate() {
		b.n += 1;
		c.push(4);
		e.n += 1;
	}
</script>

<p>{a} {b.n} {c.length} {d} {e.n} {f.n} {g.n}</p>
<button onclick={reassign}>reassign</button>
<button onclick={mutate}>mutate</button>
