<script>
	let plainObj = { n: 0 };
	let stateObj = $state({ n: 0 });
</script>

<p>plain: {plainObj.n}</p>
<p>state: {stateObj.n}</p>
<button
	onclick={() => {
		plainObj.n += 1;
		stateObj.n += 1;
	}}>both +1</button
>
