<script>
	let count = $state(0);

	function format(count) {
		return `#${count}`;
	}

	function bump() {
		count += 1;
	}
</script>

<button onclick={bump}>{format(count)}</button>
