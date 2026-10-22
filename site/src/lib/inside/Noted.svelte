<script>
	import { get_beat } from './state.svelte.js';
	import { inline_code } from './text.js';

	/**
	 * Words in the flow that go with a note written on the code. The note's own words head
	 * them, in the same handwriting, so the pair is plain to see. Pointing at either one marks
	 * the other with a pen stroke under it: pointing here underlines the note on the code (and
	 * the other notes step back), pointing at the note underlines the heading here. The side
	 * being pointed at stays as it is.
	 *
	 * `on` + `line`: where the note is on the code. `order`: which of the beat's notes this is,
	 * for the entrance after its note. `narrow`: keep the heading on narrow screens, where an
	 * excerpt of the code usually carries the note right above (a hint has no excerpt).
	 * `late`: come in just after the note when the beat arrives (a hint has its own entrance).
	 *
	 * @type {{
	 *   on: string,
	 *   line: number,
	 *   note?: string,
	 *   order?: number,
	 *   narrow?: boolean,
	 *   late?: boolean,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { on, line, note, order = 0, narrow = false, late = true, children } = $props();

	const { index, chapter } = get_beat();

	let linked = $derived(
		chapter.linked?.from === 'code' &&
			chapter.linked.on === on &&
			chapter.linked.line === line &&
			chapter.focus === index
	);

	/** @param {PointerEvent} event */
	function enter(event) {
		// touch has no hover: a tap would leave the pair lit
		if (event.pointerType === 'touch' || chapter.focus !== index) return;
		chapter.link(on, line, 'text');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="noted"
	class:active={chapter.focus === index}
	data-note-text={late ? `${index}:${order}` : undefined}
	style:--order={Math.max(order, 0)}
	onpointerenter={enter}
	onpointerleave={() => chapter.unlink()}
>
	{#if note}
		<p class="memo" class:narrow class:linked>
			<span
				>{@html inline_code(note)}<svg
					class="pen"
					viewBox="0 0 100 8"
					preserveAspectRatio="none"
					aria-hidden="true"
					><path pathLength="1" d="M1 5 C 22 3, 48 6.5, 70 4.5 S 92 3.5, 99 5" /></svg
				></span
			>
		</p>
	{/if}
	{@render children()}
</div>

<style>
	.memo {
		margin: 0 0 2px !important;
		font-family: var(--font-hand);
		font-size: 22px;
		line-height: 1.25;
		color: var(--accent);
	}

	/* the pen underlines the heading while the reader points at its note on the code */
	.memo span {
		position: relative;
	}

	.pen {
		position: absolute;
		left: -2px;
		bottom: -1px;
		width: calc(100% + 4px);
		height: 7px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		pointer-events: none;
	}

	/*
	 * Hidden by moving the dash out of the line. A round line cap would still paint a dot at
	 * the end of the empty dash, so the stroke is also transparent until it starts drawing,
	 * and turns transparent again only once it has drawn back.
	 */
	.pen path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		stroke-opacity: 0;
		transition:
			stroke-dashoffset 260ms var(--ease-out),
			stroke-opacity 0s 260ms;
	}

	.memo.linked .pen path {
		stroke-dashoffset: 0;
		stroke-opacity: 1;
		transition:
			stroke-dashoffset 260ms var(--ease-out),
			stroke-opacity 0s;
	}

	.memo :global(code) {
		padding: 0;
		background: none;
		font-family: var(--font-mono);
		font-size: 0.68em;
		color: inherit;
	}

	/*
	 * Pointing at the words (of the beat being read) tints them like a sheet laid over the
	 * paper, so the reader sees what lights the note on the code. The tint reaches a little
	 * past the words without moving them; inside an explanation it reaches left all the way to
	 * the explanation's pen line (`--reach`, set by Beat.svelte). Colour only, 160ms; pointer
	 * devices only.
	 */
	.noted {
		position: relative;
		isolation: isolate;
	}

	.noted::before {
		content: '';
		position: absolute;
		inset: -6px -8px -6px calc(-1 * var(--reach, 8px));
		z-index: -1;
		border-radius: var(--reach-radius, 4px) 4px 4px var(--reach-radius, 4px);
		background-color: transparent;
		transition: background-color 160ms ease;
		pointer-events: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.noted.active:hover::before {
			background-color: var(--accent-soft);
		}
	}

	@media (max-width: 1023px) {
		.memo:not(.narrow) {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pen path,
		.memo.linked .pen path {
			transition: none;
		}
	}
</style>
