<script>
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import Code from './Code.svelte';
	import RecallCard from './RecallCard.svelte';
	import { fit } from './popover.js';
	import { get_chapter } from './state.svelte.js';

	/**
	 * The code side of the chapter: the files the focused beat is about, stacked, with only the
	 * lines being explained in full color. A file comes on stage the moment the explanation
	 * first needs it, so the reader builds up from `Counter.svelte` to the runtime source.
	 */

	const chapter = get_chapter();

	let files = $derived(
		chapter.view.flatMap((key) => {
			const file = chapter.file(key);
			return file ? [file] : [];
		})
	);

	// a file with nothing lit while another file is being explained steps back
	let any_lit = $derived(files.some((file) => chapter.lit(file.key).length > 0));

	/** @type {HTMLElement | undefined} */
	let card = $state();
	/** @type {{ left: number, top: number, room: number | undefined } | null} */
	let spot = $state(null);

	// place the reminder for a name on the code next to it, once it is laid out
	$effect(() => {
		const at = chapter.recalling;
		spot = null;
		if (!at || !card) return;
		const placed = fit(at.rect, card);
		spot = { left: placed.left, top: placed.top, room: placed.room };
	});

	const reduce =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="stage" aria-label="코드">
	{#each files as file, i (file.key)}
		{@const lit = chapter.lit(file.key)}
		{@const bubbles = chapter.bubbles(file.key)}
		{@const made = !!file.from && files[i - 1]?.key === file.from.key}
		<!--
			Files already on stage move to their new place (FLIP) when another file comes in, so
			nothing jumps: a layout change is always animated from where it was.
		-->
		<div
			class="item"
			class:grow={(file.range?.[1] ?? file.code.lines.length) - (file.range?.[0] ?? 1) > 12}
			animate:flip={{ duration: reduce ? 0 : 420, easing: quintOut }}
		>
			{#if made}
				<!-- this file is made from the one above it: a hand-drawn arrow says how -->
				<div class="made-from" aria-hidden="true">
					<svg viewBox="0 0 30 44"
						><path class="shaft" pathLength="1" d="M15 2 C 13 14, 17 26, 15 38" /><path
							class="head"
							pathLength="1"
							d="M8 31 L15 40 L22 31"
						/></svg
					>
					<span>{file.from?.label}</span>
				</div>
			{/if}
			<div
				class="file"
				class:made
				class:whole={chapter.whole === file.key}
				class:aside={chapter.whole
					? chapter.whole !== file.key
					: any_lit && lit.length === 0 && bubbles.length === 0}
			>
				<Code
					code={file.code}
					title={file.title}
					range={file.range}
					closed={file.closed}
					notes={(file.notes ?? []).filter((note) => lit.includes(note.line))}
					marks={chapter.marks ? file.marks : undefined}
					{lit}
					stress={chapter.stress(file.key)}
					spots={chapter.spots(file.key)}
					{bubbles}
					follow
					wrap
					linked={chapter.linked?.from === 'text' && chapter.linked.on === file.key
						? chapter.linked.line
						: null}
					linking={chapter.linked?.from === 'text'}
					onlink={(line) =>
						line === null ? chapter.unlink() : chapter.link(file.key, line, 'code')}
					recalls={chapter.recall_words(file.key)}
					onrecall={(at) => (chapter.recalling = at && { ...at, on: file.key })}
					pointed={chapter.pointing?.on === file.key ? chapter.pointing.part : null}
					pointed_from={chapter.pointing?.on === file.key ? chapter.pointing.from : null}
					onpoint={(at) => (chapter.pointing = at && { on: file.key, ...at })}
					braces={chapter.braces(file.key)}
				/>
			</div>
		</div>
	{/each}

	{#if chapter.recalling}
		{@const recall = chapter.lookup(chapter.recalling.on, chapter.recalling.word)}
		{#if recall}
			<div
				class="recall-card shiki"
				class:placed={spot !== null}
				role="tooltip"
				bind:this={card}
				style:left="{spot?.left ?? 0}px"
				style:top="{spot?.top ?? 0}px"
				style:max-height={spot?.room === undefined ? undefined : `${spot.room}px`}
			>
				<RecallCard {recall} word={chapter.recalling.word} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.stage {
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		/* a short listing sits in the middle of the stage, where the eye rests */
		justify-content: center;
		gap: 12px;
		height: 100vh;
		height: 100dvh;
		padding: 20px 0;
	}

	.item {
		display: flex;
		flex-direction: column;
		flex: 0 1 auto;
		min-height: 0;
	}

	.item.grow {
		flex: 1 1 0;
	}

	/*
	 * A file made from the one above comes in as a sequence: the arrow's shaft is drawn, then
	 * its head, the label is written, then the new file rises into place below (spatial
	 * consistency: it is the next thing in the build-up). Both strokes are normalised to a
	 * length of 1 so each one starts hidden and draws once. ~0.9s, explanation tier; plays
	 * only when the file first comes on stage.
	 */
	.made-from {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		flex: none;
		height: 44px;
		margin: -4px 0 8px;
		color: var(--accent);
	}

	.made-from svg {
		width: 30px;
		height: 44px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.made-from path {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}

	.made-from .shaft {
		animation: draw 340ms var(--ease-out) 120ms backwards;
	}

	.made-from .head {
		animation: draw 200ms var(--ease-out) 440ms backwards;
	}

	.made-from span {
		font-family: var(--font-hand);
		font-size: 22px;
		animation: appear 260ms var(--ease-out) 460ms backwards;
	}

	/* transparent until it starts, or the round cap of the empty dash shows as a dot */
	@keyframes draw {
		0% {
			stroke-dashoffset: 1;
			stroke-opacity: 0;
		}
		1% {
			stroke-opacity: 1;
		}
	}

	@keyframes appear {
		from {
			opacity: 0;
			transform: translateX(-4px);
		}
	}

	.file {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-height: 0;
		opacity: 1;

		@starting-style {
			opacity: 0;
		}
	}

	.file.made {
		animation: rise 480ms var(--ease-out) 560ms backwards;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(28px);
		}
	}

	.file.aside {
		opacity: 0.3;
	}

	/*
	 * The beat talks about this file as a whole ("이 코드"): a pen outline goes around all of
	 * it instead of lighting lines. Colour only, 240ms.
	 */
	.file {
		border-radius: 4px;
		outline: 2px solid transparent;
		outline-offset: 5px;
		transition:
			opacity 360ms var(--ease-out),
			outline-color 240ms ease;
	}

	.file.whole {
		outline-color: var(--accent);
	}

	/* the reminder for a name on the code (the same card as in the words) */
	.recall-card {
		position: fixed;
		z-index: 40;
		width: max-content;
		max-width: min(820px, calc(100vw - 24px));
		overflow: auto;
		padding: 10px 0;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface);
		box-shadow: 0 10px 28px rgb(0 0 0 / 0.16);
		visibility: hidden;
		pointer-events: none;
	}

	.recall-card.placed {
		visibility: visible;
		animation: recall-in 160ms var(--ease-out);
	}

	@keyframes recall-in {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.made-from .shaft,
		.made-from .head,
		.made-from span {
			animation: none;
		}

		.file.made {
			animation: appear-plain 200ms ease backwards;
		}

		@keyframes appear-plain {
			from {
				opacity: 0;
			}
		}
	}
</style>
