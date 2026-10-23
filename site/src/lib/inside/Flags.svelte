<script>
	/**
	 * Sticky-note flags stuck on the top edge of a sheet, for choosing between a few examples
	 * or settings. Only their upper part sticks out from behind the sheet. The chosen one is
	 * pulled up out of the row as a whole, in its full colour, with a shadow; the others sit
	 * lower, deeper behind the sheet, their colour washed toward the paper.
	 *
	 * `selected` is the index of the chosen flag (-1 for none, e.g. after the sheet was edited).
	 *
	 * @type {{
	 *   items: string[],
	 *   selected: number,
	 *   label: string,
	 *   onchoose: (index: number) => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { items, selected, label, onchoose, children } = $props();

	const NOTES = ['#ffe46b', '#ffb8c9', '#a9e4c4', '#a9d2ff', '#ffc58f'];
	const TILTS = [-1.2, 0.8, -0.6, 1, -0.9];
</script>

<div class="folder">
	<div class="flags" role="radiogroup" aria-label={label}>
		{#each items as item, i (item)}
			<button
				role="radio"
				aria-checked={selected === i}
				class="flag"
				class:on={selected === i}
				style:--note={NOTES[i % NOTES.length]}
				style:--tilt="{TILTS[i % TILTS.length]}deg"
				onclick={() => onchoose(i)}>{item}</button
			>
		{/each}
	</div>
	<div class="sheet">
		{@render children()}
	</div>
</div>

<style>
	.folder {
		position: relative;
		margin-top: 2px;
	}

	/*
	 * Room above the flags so a chosen flag can rise (and show its focus ring) without being
	 * cut off: the row scrolls sideways on narrow screens, and a scrolling box clips at its
	 * edges in both directions.
	 */
	.flags {
		position: relative;
		z-index: 0;
		display: flex;
		padding: 12px 10px 0;
		margin-bottom: -14px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	/*
	 * The visible part of a flag (above the sheet's edge) has the same room above and below
	 * its words. Choosing one moves the whole flag up by 7px, so it reads as pulled out of the
	 * row, not as its words moving.
	 */
	.flag {
		--mute: #ece9df;
		position: relative;
		flex: none;
		padding: 5px 9px 19px;
		border: 0;
		border-radius: 2px 3px 0 0;
		background: color-mix(in oklab, var(--note) 32%, var(--mute));
		font-family: var(--font-hand);
		font-size: 17px;
		line-height: 1.1;
		color: #5b6068;
		transform: translateY(0) rotate(var(--tilt));
		cursor: var(--cursor-point);
		transition:
			transform 220ms var(--ease-out),
			background-color 220ms ease,
			color 220ms ease,
			box-shadow 220ms ease;
	}

	/* stuck on one after another, each slightly over the previous one */
	.flag + .flag {
		margin-left: -3px;
	}

	@media (hover: hover) and (pointer: fine) {
		.flag:not(.on):hover {
			transform: translateY(-2px) rotate(var(--tilt));
			color: #24272b;
		}
	}

	.flag.on {
		z-index: 1;
		background: var(--note);
		color: #24272b;
		transform: translateY(-7px) rotate(0deg);
		box-shadow: 0 -2px 7px rgb(0 0 0 / 0.18);
	}

	.flag:active {
		transform: translateY(-5px) scale(0.98);
	}

	.flag:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	/* each flag darkens a little toward the sheet's edge, as paper does where it slides under */
	.flag::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: 26px;
		background: linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.1));
		border-radius: inherit;
		pointer-events: none;
	}

	/* the sheet is in front of the flags and casts a faint shadow up onto them */
	.sheet {
		position: relative;
		z-index: 1;
		box-shadow: 0 -3px 6px -3px rgb(0 0 0 / 0.18);
	}

	@media (prefers-color-scheme: dark) {
		.flag {
			--mute: #5c5f64;
			color: #1d1f22;
		}

		.flag.on {
			box-shadow: 0 -2px 9px rgb(0 0 0 / 0.5);
		}

		.flag::after {
			background: linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.22));
		}

		.sheet {
			box-shadow: 0 -3px 7px -3px rgb(0 0 0 / 0.55);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flag,
		.flag.on {
			transition:
				background-color 200ms ease,
				color 200ms ease;
		}
	}
</style>
