<script>
	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();
</script>

<div class="ask">
	{@render children()}
</div>

<style>
	.ask {
		font-size: 17.5px;
		font-weight: 700;
		line-height: 1.75;
		color: var(--ink);
	}

	.ask :global(p) {
		margin: 0 0 14px;
	}

	.ask :global(strong) {
		color: var(--rubric);
	}

	.ask :global(code),
	:global(.verso) :global(code) {
		font-family: var(--font-mono);
		font-size: 0.84em;
		font-weight: 400;
		padding: 0.08em 0.32em;
		border-radius: 3px;
		background: color-mix(in oklab, var(--ink) 7%, transparent);
		color: var(--ink);
		word-break: normal;
	}
</style>
