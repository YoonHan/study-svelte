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

	/**
	 * On a narrow screen or one without hover, the card is a bottom sheet instead: opened by
	 * tapping the words, it slides up from the bottom of the screen and goes back down when the
	 * reader taps outside it, presses Esc, or taps the words again.
	 */
	let sheet = $state(false);
	let closing = $state(false);

	$effect(() => {
		const query = matchMedia('(max-width: 1023px), (hover: none)');
		const update = () => (sheet = query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});

	function show() {
		if (!anchor || !card) return;
		if (sheet) return;
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
		if (sheet) return;
		if (card?.matches(':popover-open')) card.hidePopover();
	}

	function open_sheet() {
		if (!card) return;
		closing = false;
		card.style.left = '';
		card.style.top = '';
		card.style.maxHeight = '';
		if (!card.matches(':popover-open')) card.showPopover();
	}

	/** slides back down, then leaves the top layer */
	function close_sheet() {
		if (!card?.matches(':popover-open') || closing) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return void card.hidePopover();
		closing = true;
		card.addEventListener(
			'animationend',
			() => {
				closing = false;
				card?.hidePopover();
			},
			{ once: true }
		);
	}

	function toggle() {
		if (!sheet) return;
		if (card?.matches(':popover-open') && !closing) close_sheet();
		else open_sheet();
	}

	// while a sheet is open: a tap outside it, or Esc, closes it
	$effect(() => {
		if (!sheet) return;
		/** @param {PointerEvent} event */
		const outside = (event) => {
			if (!card?.matches(':popover-open') || anchor?.contains(/** @type {Node} */ (event.target)))
				return;
			const r = card.getBoundingClientRect();
			const inside =
				event.clientX >= r.left &&
				event.clientX <= r.right &&
				event.clientY >= r.top &&
				event.clientY <= r.bottom;
			if (!inside) close_sheet();
		};
		/** @param {KeyboardEvent} event */
		const escape = (event) => {
			if (event.key === 'Escape') close_sheet();
		};
		document.addEventListener('pointerdown', outside, true);
		document.addEventListener('keydown', escape);
		return () => {
			document.removeEventListener('pointerdown', outside, true);
			document.removeEventListener('keydown', escape);
		};
	});
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
	onclick={toggle}
	onkeydown={(event) => {
		if (sheet && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			toggle();
		}
	}}
>
	{@render trigger()}
</span>
<span
	class="card shiki"
	popover="manual"
	role="tooltip"
	data-side={side}
	data-sheet={sheet ? '' : undefined}
	class:closing
	bind:this={card}
>
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

	/*
	 * The bottom sheet (narrow screens, no hover): the full width of the screen, at most three
	 * quarters of its height, scrolling inside; a handle on top says it can be dismissed. Slides
	 * up in 280ms on the iOS drawer curve, down in 200ms the same way it came; a light backdrop
	 * behind it.
	 */
	.card[data-sheet] {
		inset: auto 0 0 0;
		width: 100%;
		max-width: none;
		max-height: 75dvh;
		padding: 22px 0 calc(16px + env(safe-area-inset-bottom));
		border: 0;
		border-top: 1px solid var(--line);
		border-radius: 14px 14px 0 0;
		box-shadow: 0 -8px 28px rgb(0 0 0 / 0.18);
		pointer-events: auto;
	}

	.card[data-sheet]::before {
		content: '';
		position: absolute;
		top: 8px;
		left: 50%;
		width: 36px;
		height: 4px;
		margin-left: -18px;
		border-radius: 2px;
		background: var(--line);
	}

	.card[data-sheet]::backdrop {
		background: rgb(0 0 0 / 0.22);
	}

	.card[data-sheet]:popover-open {
		animation: sheet-in 280ms var(--ease-drawer, cubic-bezier(0.32, 0.72, 0, 1));
	}

	.card[data-sheet].closing:popover-open {
		animation: sheet-out 200ms var(--ease-drawer, cubic-bezier(0.32, 0.72, 0, 1)) forwards;
	}

	@keyframes sheet-in {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes sheet-out {
		to {
			transform: translateY(100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card[data-sheet]:popover-open {
			animation-name: card-fade;
		}

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
