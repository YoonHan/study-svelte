<script>
	import { fit } from './popover.js';

	/**
	 * Inline words that open a small card while the reader points at them (or focuses them):
	 * the source of a name, or a reminder of something read earlier.
	 *
	 * The card opens in the browser's top layer (the `popover` attribute), so nothing on the
	 * page can cover or clip it, and it is placed where it fits (see popover.js). A card that
	 * only ever opened upwards inside the text was cut off by the top of the window and covered
	 * by the beats after it; tests/render.spec.js checks every card on the page.
	 *
	 * @type {{
	 *   label: string,
	 *   trigger: import('svelte').Snippet,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { label, trigger, children } = $props();

	/** @type {HTMLElement | undefined} */
	let anchor = $state();
	/** @type {HTMLElement | undefined} */
	let card = $state();
	let side = $state('above');

	function show() {
		if (!anchor || !card) return;
		if (!card.matches(':popover-open')) card.showPopover();
		// laid out now (and not painted yet): measure, then move it into place
		card.style.maxHeight = '';
		const spot = fit(anchor.getBoundingClientRect(), card);
		side = spot.side;
		card.style.left = `${spot.left}px`;
		card.style.top = `${spot.top}px`;
		if (spot.room !== undefined) card.style.maxHeight = `${spot.room}px`;
	}

	function hide() {
		if (card?.matches(':popover-open')) card.hidePopover();
	}
</script>

<span
	class="popover"
	bind:this={anchor}
	tabindex="0"
	role="button"
	aria-label={label}
	onpointerenter={show}
	onpointerleave={hide}
	onfocusin={show}
	onfocusout={hide}
>
	{@render trigger()}
</span>
<span class="card shiki" popover="manual" role="tooltip" data-side={side} bind:this={card}>
	{@render children()}
</span>

<style>
	.popover {
		cursor: help;
		outline: none;
	}

	.popover:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 2px;
	}

	/*
	 * Opens next to the words: opacity + a small move away from them, 160ms ease-out; closing
	 * is immediate so moving across text never leaves cards hanging.
	 */
	.card {
		position: fixed;
		inset: auto;
		margin: 0;
		/*
		 * As wide as its longest line of code, so code does not wrap on a desktop screen;
		 * on a narrow one it keeps inside the window and the code wraps instead.
		 */
		width: max-content;
		max-width: min(820px, calc(100vw - 24px));
		overflow: auto;
		padding: 8px 0 10px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface);
		box-shadow: 0 10px 28px rgb(0 0 0 / 0.16);
		font-family: var(--font-sans);
		font-size: 14px;
		font-weight: 400;
		line-height: 1.6;
		white-space: normal;
		text-align: left;
		color: var(--fg);
		pointer-events: none;
	}

	.card:popover-open {
		animation: card-in 160ms var(--ease-out);
	}

	.card[data-side='below']:popover-open {
		animation-name: card-in-below;
	}

	.card[data-side='left']:popover-open {
		animation-name: card-in-left;
	}

	@keyframes card-in-left {
		from {
			opacity: 0;
			transform: translateX(4px);
		}
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}

	@keyframes card-in-below {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card:popover-open,
		.card[data-side='below']:popover-open,
		.card[data-side='left']:popover-open {
			animation-name: card-fade;
		}

		@keyframes card-fade {
			from {
				opacity: 0;
			}
		}
	}
</style>
