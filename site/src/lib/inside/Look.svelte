<script>
	import { text_boxes } from './textrange.js';
	import { ring_box, ring_path } from './pen.js';

	/**
	 * Words that refer to part of a code block in the text ("조건", "그 분기"): while the reader
	 * points at them, that part of the block is circled in pen (as parts of the code stage are),
	 * so the reader never has to match the words to the code alone. The marks are laid over the code, nothing in it
	 * changes. tests/render.spec.js checks that every target is found.
	 *
	 * `at`: which block (the `name` of a `<Highlight>` in the same beat) and which text in it;
	 * several texts mark several places (a part that spans lines, or the same idea in two blocks).
	 *
	 * @type {{ at: { code: string, text: string | string[] }[], children: import('svelte').Snippet }}
	 */
	let { at, children } = $props();

	/** @type {HTMLElement | undefined} */
	let words = $state();

	/** @type {Element[]} */
	let marks = [];

	const SVG = 'http://www.w3.org/2000/svg';

	/** @param {PointerEvent | FocusEvent} event */
	function show(event) {
		if (event instanceof PointerEvent && event.pointerType === 'touch') return;
		hide();
		const scope = words?.closest('.beat') ?? document;
		for (const target of at) {
			const block = scope.querySelector(`[data-code="${target.code}"]`);
			if (!(block instanceof HTMLElement)) continue;
			const base = block.getBoundingClientRect();
			for (const text of Array.isArray(target.text) ? target.text : [target.text]) {
				for (const box of text_boxes(block, text)) {
					// in the block's own coordinates, so the circle scrolls with the code
					const dx = block.scrollLeft - base.left;
					const dy = block.scrollTop - base.top;
					const ring = ring_box(
						{
							left: box.left + dx,
							right: box.right + dx,
							top: box.top + dy,
							bottom: box.bottom + dy
						},
						[2, block.scrollWidth - 2]
					);
					const mark = document.createElementNS(SVG, 'svg');
					mark.classList.add('look-mark');
					mark.dataset.for = target.code;
					mark.setAttribute('viewBox', `0 0 ${ring.width} ${ring.height}`);
					mark.setAttribute('aria-hidden', 'true');
					Object.assign(mark.style, {
						left: `${ring.left}px`,
						top: `${ring.top}px`,
						width: `${ring.width}px`,
						height: `${ring.height}px`
					});
					const path = document.createElementNS(SVG, 'path');
					path.setAttribute('d', ring_path(ring.width, ring.height));
					path.setAttribute('pathLength', '1');
					mark.append(path);
					block.append(mark);
					marks.push(mark);
				}
			}
		}
	}

	function hide() {
		for (const mark of marks) mark.remove();
		marks = [];
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class="look pen-underline"
	bind:this={words}
	onpointerenter={show}
	onpointerleave={hide}
	onfocusin={show}
	onfocusout={hide}>{@render children()}</span
>

<style>
	/* underlined by hand (`.pen-underline`, app.css) */
	.look {
		cursor: var(--cursor);
	}

	/*
	 * The pen circle drawn around the code the words refer to, the same as on the code stage
	 * and around a value in an experiment: drawn in 300ms (strong ease-out). Transparent until
	 * it starts, or the empty dash's round cap would show as a dot.
	 */
	:global(.look-mark) {
		position: absolute;
		overflow: visible;
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.6;
		stroke-linecap: round;
		pointer-events: none;
	}

	:global(.look-mark path) {
		stroke-dasharray: 1;
		animation: look-in 300ms var(--ease-out) backwards;
	}

	@keyframes look-in {
		0% {
			stroke-dashoffset: 1;
			stroke-opacity: 0;
		}
		1% {
			stroke-opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.look-mark path) {
			animation: look-fade 150ms ease backwards;
		}

		@keyframes look-fade {
			from {
				opacity: 0;
			}
		}
	}
</style>
