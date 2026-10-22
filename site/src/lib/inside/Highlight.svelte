<script>
	import { escape_html, highlight } from './highlight.js';
	import { text_boxes } from './textrange.js';
	import { ring_box, ring_path } from './pen.js';

	/**
	 * A code block highlighted in the browser. Shows the plain text until Shiki is ready, in
	 * the same metrics, so nothing moves when the colors arrive.
	 * `name`: lets words in the text point at parts of this block (see Look.svelte).
	 * `circle`: text in the block to circle in pen, the part the reader should look at (its
	 * first occurrence); circled again, drawn anew, whenever it changes.
	 * @type {{ code: string, lang?: 'svelte' | 'javascript', name?: string, circle?: string }}
	 */
	let { code, lang = 'javascript', name, circle } = $props();

	let html = $state('');

	/** @type {HTMLElement | undefined} */
	let block = $state();

	/** @type {{ left: number, top: number, width: number, height: number } | undefined} */
	let ring = $state();

	let ring_d = $derived(ring ? ring_path(ring.width, ring.height) : '');

	// where the circled text is drawn, in the block's own coordinates (it scrolls with them)
	$effect(() => {
		const target = circle;
		void html;
		if (!block || !target) {
			ring = undefined;
			return;
		}
		const pre = block;
		const place = () => {
			const [box] = text_boxes(pre, target);
			if (!box) return (ring = undefined);
			const base = pre.getBoundingClientRect();
			const dx = pre.scrollLeft - base.left;
			const dy = pre.scrollTop - base.top;
			ring = ring_box(
				{
					left: box.left + dx,
					right: box.right + dx,
					top: box.top + dy,
					bottom: box.bottom + dy
				},
				[2, pre.scrollWidth - 2]
			);
		};
		place();
		document.fonts?.ready.then(place);
		const observer = new ResizeObserver(place);
		observer.observe(pre);
		return () => observer.disconnect();
	});

	$effect(() => {
		const input = code;
		let current = true;
		highlight(input, lang).then((result) => {
			if (current) html = result;
		});
		return () => {
			current = false;
		};
	});
</script>

<pre class="hl" data-code={name} bind:this={block}><code>{@html html || escape_html(code)}</code
	>{#if ring}{#key circle}<svg
				class="ring"
				style:left="{ring.left}px"
				style:top="{ring.top}px"
				style:width="{ring.width}px"
				style:height="{ring.height}px"
				viewBox="0 0 {ring.width} {ring.height}"
				aria-hidden="true"><path pathLength="1" d={ring_d} /></svg
			>{/key}{/if}</pre>

<style>
	.hl {
		position: relative;
		/* marks laid under the code by Look.svelte stay above this background */
		isolation: isolate;
		margin: 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: var(--surface-2);
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.7;
		tab-size: 2;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	/*
	 * The circle, the same loose pen ring as around a stage number in the contents: drawn
	 * around the text in 450ms (strong ease-out). Transparent until it starts, or the empty
	 * dash's round cap would show as a dot.
	 */
	.ring {
		position: absolute;
		overflow: visible;
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.6;
		stroke-linecap: round;
		pointer-events: none;
	}

	.ring path {
		stroke-dasharray: 1;
		animation: circle 450ms var(--ease-out) backwards;
	}

	@keyframes circle {
		0% {
			stroke-dashoffset: 1;
			stroke-opacity: 0;
		}
		1% {
			stroke-opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ring path {
			animation: circle-fade 200ms ease backwards;
		}

		@keyframes circle-fade {
			from {
				opacity: 0;
			}
		}
	}
</style>
