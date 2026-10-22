<script>
	/**
	 * Where a claim comes from: a line in svelte@5.0.0 or an experiment in the study repo.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();
</script>

<p class="evidence"><span class="tag">근거</span> {@render children()}</p>

<style>
	.evidence {
		margin: -6px 0 16px !important;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--fg-3);
	}

	.tag {
		font-weight: 700;
		color: var(--fg-2);
	}

	.evidence :global(code) {
		font-size: 0.95em;
	}
</style>
