<script>
	let active = $state(false);
</script>

<div class="card" class:active>
	<h2>title</h2>
	<p>body</p>
</div>

<style>
	.card { padding: 1rem; }
	.card.active { border: 1px solid; }
	h2 { margin: 0; }
	.unused { color: red; }
	:global(body) { margin: 0; }
</style>
