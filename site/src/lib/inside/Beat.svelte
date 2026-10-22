<script>
	import Code from './Code.svelte';
	import Noted from './Noted.svelte';
	import { get_chapter, get_step, set_beat } from './state.svelte.js';

	/**
	 * One piece of the chapter, revealed when the reader asks for the next one.
	 *
	 * - `code`: the file, or files top to bottom, to put on the code stage. Beats without it
	 *   keep the previous beat's stage.
	 * - `on`: the file the beat talks about (default: the last file on the stage).
	 * - `lines`: lines of that file to light; `also` lights lines of other files on the stage.
	 * - `stress`: in a long lit passage (more than a few lines), the lines to highlight.
	 * - `at` + `note`: writes the short `note` on the code under that line; the beat's own words
	 *   stay in the flow as the explanation. `point`: the text in that line the note's arrow
	 *   points at (every note says what it points at; see Code.svelte).
	 * - `whole`: the beat talks about a whole file ("이 코드"): the stage frames all of it and
	 *   lights no lines.
	 * - `marks`: shows which chapter opens each line of the compiled code.
	 * - `answer`: the beat starts its question's explanation.
	 * - `cue`: label of the button that reveals this beat.
	 * - `figure`: a picture or an experiment that goes with a note's words, kept apart from
	 *   them (not inside the words' block).
	 *
	 * @type {{
	 *   code?: string | string[],
	 *   on?: string,
	 *   lines?: number[],
	 *   also?: Record<string, number[]>,
	 *   stress?: number[],
	 *   at?: number,
	 *   note?: string,
	 *   point?: string,
	 *   whole?: string,
	 *   marks?: boolean,
	 *   answer?: boolean,
	 *   cue?: string,
	 *   id?: string,
	 *   figure?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let {
		code,
		on,
		lines,
		also = {},
		stress = [],
		at,
		note,
		point,
		whole,
		marks = false,
		answer = false,
		cue,
		id,
		figure,
		children
	} = $props();

	const chapter = get_chapter();
	const step = get_step();

	// svelte-ignore state_referenced_locally
	const view = code === undefined ? undefined : Array.isArray(code) ? code : [code];
	// svelte-ignore state_referenced_locally
	const index = chapter.beats.length;
	// svelte-ignore state_referenced_locally
	const target = on ?? /** @type {string} */ ((view ?? chapter.view_of(index - 1)).at(-1));

	// svelte-ignore state_referenced_locally
	chapter.register(
		{
			view,
			on: target,
			lit: { ...also, [target]: lines ?? (at === undefined ? [] : [at]) },
			stress,
			own:
				lines !== undefined ||
				at !== undefined ||
				whole !== undefined ||
				Object.keys(also).length > 0,
			bubble: at ?? null,
			note,
			point,
			whole,
			marks,
			cue: cue ?? (answer ? '해설 보기' : undefined),
			id
		},
		children
	);
	if (step) {
		step.first ??= index;
		step.last = index;
		// svelte-ignore state_referenced_locally
		if (answer) step.answer ??= index;
	}
	const hints = $state({ open: 0 });
	set_beat({ index, chapter, hints });

	let revealed = $derived(chapter.is_revealed(index));
	let focused = $derived(chapter.focus === index);
	let explaining = $derived(step?.answer != null && index >= step.answer);
	let next = $derived(index === chapter.progress - 1 ? chapter.beats[index + 1] : undefined);

	// narrow screens have no stage, so the beat carries the few lines it is about
	let excerpts = $derived(
		chapter.view_of(index).flatMap((key) => {
			const file = chapter.file(key);
			const own = chapter.beats[index].lit[key] ?? [];
			if (!file || own.length === 0) return [];
			const [from, to] = file.range ?? [1, file.code.lines.length];
			const range = /** @type {[number, number]} */ ([
				Math.max(from, Math.min(...own) - 2),
				Math.min(to, Math.max(...own) + 2)
			]);
			const bubbles =
				at !== undefined && key === target
					? [note ? { line: at, text: note, point } : { line: at, content: children }]
					: [];
			return [{ file, range, lit: own, bubbles }];
		})
	);

	/** @type {HTMLElement | undefined} */
	let slot = $state();

	// bring a newly revealed beat to the middle of the screen, where the reader's eyes are
	$effect(() => {
		if (!slot || chapter.scroll_to !== index) return;
		chapter.scroll_to = -1;
		const node = slot;
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		requestAnimationFrame(() =>
			node.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
		);
	});
</script>

{#if revealed}
	<div class="slot" bind:this={slot}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="beat"
			class:past={!focused}
			class:explaining
			class:arrive={chapter.arrived === index}
			onpointerdown={() => chapter.show(index)}
			onfocusin={() => chapter.show(index)}
		>
			{#if answer}<p class="label">해설</p>{/if}
			{#if at !== undefined}
				<Noted on={target} line={at} {note}>
					{@render children()}
				</Noted>
				<!-- a picture of what the words say stands apart from them -->
				{#if figure}{@render figure()}{/if}
			{:else}
				{@render children()}
			{/if}
			{#each excerpts as excerpt (excerpt.file.key)}
				<div class="narrow excerpt">
					<Code
						code={excerpt.file.code}
						title=""
						range={excerpt.range}
						lit={excerpt.lit}
						stress={excerpt.file.key === target ? stress : []}
						closed={excerpt.file.closed}
						bubbles={excerpt.bubbles}
						wrap
					/>
				</div>
			{/each}
		</div>

		{#if next}
			<button
				class="next pen-button"
				class:arrive={chapter.arrived === index}
				onclick={() => chapter.next()}
			>
				{next.cue ?? '다음'}
			</button>
			<span class="count">{index + 1} / {chapter.beats.length}</span>
		{/if}
	</div>
{/if}

<style>
	/*
	 * Motion (animate + emil-design-eng skills). Purpose: explanation, at the reader's pace.
	 * A beat is revealed on an explicit click, tens of times per chapter, so each entrance is
	 * short (≤ 460ms), never blocks reading or clicking, and plays only for the beat just
	 * revealed (restored progress appears at once).
	 *
	 * - Text is written onto the page: each block wipes in top to bottom (a mask driven by
	 *   the registered `--reveal`), with a small rise and a blur that masks the in-between.
	 * - Blocks of one beat follow each other 70ms apart (stagger 30–80ms).
	 * - The explanation's accent rule is drawn downward when the explanation starts.
	 * - The next button arrives after the text, so the eye reads before it moves on.
	 */
	@property --reveal {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 130%;
	}

	@keyframes write {
		from {
			--reveal: 0%;
			opacity: 0;
			transform: translateY(8px);
			filter: blur(3px);
		}
		to {
			--reveal: 130%;
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}

	@keyframes rule {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.slot {
		scroll-margin: 96px 0;
	}

	@media (max-width: 1023px) {
		/* on narrow screens the code comes first, then the words */
		.beat {
			display: flex;
			flex-direction: column;
		}

		.excerpt {
			order: -1;
			margin: 0 0 12px !important;
		}
	}

	.beat {
		position: relative;
		margin: 0 0 18px;
		transition: opacity 300ms ease;
	}

	.beat.arrive > :global(*) {
		mask-image: linear-gradient(180deg, #000 calc(var(--reveal) - 30%), transparent var(--reveal));
		animation: write 460ms var(--ease-out) backwards;
	}

	.beat.arrive > :global(:nth-child(2)) {
		animation-delay: 70ms;
	}

	.beat.arrive > :global(:nth-child(3)) {
		animation-delay: 140ms;
	}

	.beat.arrive > :global(:nth-child(n + 4)) {
		animation-delay: 210ms;
	}

	/*
	 * A sentence that is also a note on the code comes in after its note has started on the
	 * left (the note is written first, ~380ms ahead), so the eye goes to the code first.
	 */
	.beat.arrive :global([data-note-text]) {
		mask-image: none;
		animation: late-in 320ms var(--ease-out) calc(var(--order, 0) * 650ms + 380ms) backwards;
	}

	@keyframes late-in {
		from {
			opacity: 0;
		}
	}

	/*
	 * Beats already read stay in place but almost disappear, so nothing competes with the
	 * current one; pointing at one brings it back enough to read and click.
	 */
	.beat.past {
		opacity: 0.1;
		cursor: pointer;
	}

	@media (hover: hover) and (pointer: fine) {
		.beat.past:hover {
			opacity: 0.55;
		}
	}

	.beat :global(p) {
		margin: 0 0 12px;
	}

	.beat :global(p:last-child) {
		margin-bottom: 0;
	}

	.explaining {
		padding-left: 16px;
	}

	/* a question asked inside an explanation is not part of it: no pen line beside it */
	.explaining:has(:global(div.ask)) {
		padding-left: 0;
	}

	.explaining:has(:global(div.ask))::before {
		display: none;
	}

	/* a hovered note's tint touches the pen line: the padding minus the line's 2px */
	.explaining :global(.noted) {
		--reach: 14px;
		--reach-radius: 0;
	}

	.explaining::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 2px;
		border-radius: 2px;
		background: var(--accent);
		transform-origin: top;
	}

	.explaining.arrive::before {
		animation: rule 420ms var(--ease-out) backwards;
	}

	.label {
		margin: 0 0 2px !important;
		font-family: var(--font-hand);
		font-size: 21px;
		line-height: 1.3;
		color: var(--accent);
	}

	/* a code example between paragraphs */
	.beat > :global(.hl) {
		margin: 4px 0 16px;
	}

	.narrow {
		display: none;
	}

	.excerpt {
		margin-top: 14px;
	}

	@media (max-width: 1023px) {
		.narrow {
			display: block;
		}
	}

	/* the hand-drawn button and its hover sweep are the shared `.pen-button` (app.css) */
	.next {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 6px 0 28px;
		padding: 5px 18px 3px;
		font-size: 22px;
	}

	.next.arrive {
		animation: arrive 200ms var(--ease-out) 300ms backwards;
	}

	.count {
		margin-left: 12px;
		font-size: 13px;
		color: var(--fg-3);
		font-variant-numeric: tabular-nums;
	}

	/* reduced motion: fewer and gentler, so text simply fades in, nothing moves or blurs */
	@media (prefers-reduced-motion: reduce) {
		.beat.arrive > :global(*) {
			mask-image: none;
			animation: fade 200ms ease backwards;
		}

		.explaining.arrive::before {
			animation: none;
		}

		.next.arrive {
			animation-name: none;
		}
	}
</style>
