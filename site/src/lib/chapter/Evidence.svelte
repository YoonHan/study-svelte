<script>
	/**
	 * A footnote citing where a claim comes from: a source location in svelte@5.0.0 or an
	 * experiment in the study repo.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();
</script>

<div class="footnote">
	<span class="mark" aria-hidden="true">※</span>
	<div class="text"><span class="tag">근거</span> {@render children()}</div>
</div>

<style>
	.footnote {
		display: flex;
		gap: 8px;
		margin: -2px 0 16px;
		padding-top: 6px;
		border-top: 1px solid var(--rule);
		width: fit-content;
		max-width: 100%;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--ink-soft);
	}

	.mark {
		color: var(--rubric);
	}

	.tag {
		font-weight: 700;
		color: var(--ink-soft);
	}

	.text :global(p) {
		display: inline;
		margin: 0;
	}

	.text :global(code) {
		font-size: 0.95em;
		background: none;
		padding: 0;
		color: var(--ink-soft);
	}
</style>
