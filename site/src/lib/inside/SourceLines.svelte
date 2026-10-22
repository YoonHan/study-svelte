<script>
	/**
	 * A few lines of a source file, with their path and line numbers, for the inside of a card.
	 *
	 * @type {{
	 *   code: import('#lib/types.js').CodeFile,
	 *   lines: [number, number],
	 *   focus?: number[],
	 *   path?: boolean
	 * }}
	 */
	let { code, lines, focus = [], path = true } = $props();

	let numbers = $derived(Array.from({ length: lines[1] - lines[0] + 1 }, (_, i) => lines[0] + i));
</script>

{#if path}<span class="where">{code.file}</span>{/if}
<span class="lines">
	{#each numbers as n (n)}
		<span class="line" class:focus={focus.includes(n)}
			><span class="ln">{n}</span><span class="src">{@html code.lines[n - 1] || ' '}</span></span
		>
	{/each}
</span>

<style>
	.where {
		display: block;
		padding: 0 12px 4px;
		font-family: var(--font-hand);
		font-size: 17px;
		font-weight: 400;
		color: var(--fg-2);
	}

	.lines {
		display: block;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 500;
		line-height: 1.7;
	}

	.line {
		display: flex;
		padding-right: 12px;
	}

	.ln {
		flex: none;
		width: 3em;
		padding-right: 0.8em;
		text-align: right;
		color: var(--fg-3);
	}

	/* the line the words are about, among the lines around it for context */
	.line.focus {
		background: var(--hi-wash);
	}

	.line.focus .ln {
		color: var(--accent);
		font-weight: 600;
	}

	.src {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		tab-size: 2;
		color: var(--fg);
	}
</style>
