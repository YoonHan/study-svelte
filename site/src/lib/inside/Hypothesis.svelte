<script>
	/**
	 * The guess made while studying this, wrong parts included: the explanation is how that
	 * guess was corrected.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();
</script>

<aside class="hypothesis">
	<p class="title">처음 세운 가설</p>
	{@render children()}
</aside>

<style>
	/* the first guess, boxed in red pen: getting it wrong is part of the record */
	.hypothesis {
		margin: 0 0 16px;
		padding: 10px 16px 12px;
		border: 1.5px solid var(--red);
		border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
		font-size: 15px;
	}

	.title {
		margin: 0 0 2px !important;
		font-family: var(--font-hand);
		font-size: 21px;
		color: var(--red);
	}

	.hypothesis :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
