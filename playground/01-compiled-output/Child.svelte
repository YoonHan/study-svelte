<script>
	let { label, children } = $props();
</script>

<section>
	<h2>{label}</h2>
	{@render children?.()}
</section>
