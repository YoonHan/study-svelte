<script>
	/**
	 * @typedef {object} Note
	 * @property {number} line 1-based line number the note is attached to
	 * @property {string} text
	 */

	/**
	 * @type {{
	 *   code: import('#lib/types.js').CodeFile,
	 *   title?: string,
	 *   highlight?: number[],
	 *   range?: [number, number],
	 *   notes?: Note[],
	 *   veiled?: string
	 * }}
	 */
	let { code, title, highlight = [], range, notes = [], veiled } = $props();

	let first = $derived(range?.[0] ?? 1);
	let last = $derived(range?.[1] ?? code.lines.length);
	let numbers = $derived(Array.from({ length: last - first + 1 }, (_, i) => first + i));
	let marked = $derived(new Set(highlight));

	/** @type {HTMLElement | undefined} */
	let scroller = $state();

	// keep the first highlighted line in view when the highlight changes
	$effect(() => {
		const target = highlight[0];
		if (!scroller || target === undefined) return;
		const row = scroller.querySelector(`[data-line="${target}"]`);
		if (!(row instanceof HTMLElement)) return;
		const top = row.offsetTop - scroller.clientHeight / 3;
		scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
	});
</script>

<figure class="code">
	<figcaption>
		<span class="dot"></span>
		<span class="file">{title ?? code.file.split('/').pop()}</span>
	</figcaption>

	<div class="scroller shiki" bind:this={scroller} class:veiled={!!veiled}>
		<pre><code
				>{#each numbers as n (n)}<span
						class="row"
						class:marked={marked.has(n)}
						class:dim={marked.size > 0 && !marked.has(n)}
						data-line={n}
						><span class="ln">{n}</span><span class="src">{@html code.lines[n - 1] || ' '}</span
						></span
					>{#each notes.filter((note) => note.line === n) as note (note.text)}<span class="note"
							>{note.text}</span
						>{/each}{/each}</code
			></pre>
		{#if veiled}
			<div class="veil">
				<span>{veiled}</span>
			</div>
		{/if}
	</div>
</figure>

<style>
	/* code printed on the plate: an inset sheet with a thin double rule, like a typeset listing */
	.code {
		margin: 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: color-mix(in oklab, #fffdf7 60%, transparent);
		border: 1px solid var(--rule);
		outline: 1px solid color-mix(in oklab, var(--ink) 8%, transparent);
		outline-offset: 3px;
	}

	figcaption {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-bottom: 1px solid var(--rule);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 14px;
		color: var(--ink-soft);
	}

	.dot {
		width: 6px;
		height: 6px;
		transform: rotate(45deg);
		background: var(--rubric);
	}

	.scroller {
		position: relative;
		overflow: auto;
		min-height: 0;
		scrollbar-width: thin;
	}

	pre {
		margin: 0;
		padding: 10px 0;
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.75;
		tab-size: 2;
	}

	.row {
		display: flex;
		padding: 0 14px 0 0;
		border-left: 2px solid transparent;
		/* highlight changes when the reader moves between questions: color only, ease (emil-design-eng) */
		transition:
			background-color 200ms ease,
			opacity 200ms ease,
			border-color 200ms ease;
	}

	.row.marked {
		background: var(--rubric-soft);
		border-left-color: var(--rubric);
	}

	.row.dim {
		opacity: 0.42;
	}

	.ln {
		flex: none;
		width: 3.2em;
		padding-right: 1em;
		text-align: right;
		color: var(--ink-faint);
		user-select: none;
	}

	.src {
		white-space: pre;
	}

	/* a printed annotation under the line it explains */
	.note {
		display: block;
		margin: 0 14px 6px 3.4em;
		padding-left: 14px;
		position: relative;
		font-family: var(--font-serif);
		font-size: 12.5px;
		font-weight: 600;
		line-height: 1.55;
		white-space: normal;
		color: var(--rubric);
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 240ms var(--ease-out),
			transform 240ms var(--ease-out);

		@starting-style {
			opacity: 0;
			transform: translateY(-3px);
		}
	}

	.note::before {
		content: '↳';
		position: absolute;
		left: 0;
	}

	.veiled pre {
		filter: blur(4px);
		opacity: 0.45;
		user-select: none;
	}

	.veil {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 16px;
		text-align: center;
	}

	/* a paper band sealing the answer until the reader has guessed */
	.veil span {
		padding: 6px 18px;
		background: var(--grain), #f8f1e1;
		border-top: 1px solid var(--rubric);
		border-bottom: 1px solid var(--rubric);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--rubric);
		box-shadow: 0 2px 8px rgb(60 40 20 / 0.18);
	}

	@media (prefers-reduced-motion: reduce) {
		.note {
			@starting-style {
				transform: none;
			}
		}
	}
</style>
