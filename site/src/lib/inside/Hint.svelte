<script>
	import { get_beat } from './state.svelte.js';
	import Noted from './Noted.svelte';

	/**
	 * An optional nudge under a question, opened one at a time on request: the first says where
	 * to look, the next what to notice. With `at`, the hint is also said on the code as a speech
	 * bubble under that line; its words stay here too, marked as a note.
	 *
	 * @type {{
	 *   n: number,
	 *   at?: number,
	 *   note?: string,
	 *   point?: string,
	 *   on?: string,
	 *   lines?: number[],
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { n, at, note, point, on, lines, children } = $props();

	const { index, chapter, hints } = get_beat();

	let opened = $derived(hints.open >= n);

	function open() {
		hints.open = n;
		chapter.focus = index;
		chapter.hint = {
			beat: index,
			on: on ?? chapter.on_of(index),
			line: at ?? null,
			lines: lines ?? (at === undefined ? [] : [at]),
			text: note,
			point,
			content: children
		};
	}
</script>

{#if hints.open === n - 1}
	<button class="ask" onclick={open}>
		<svg class="bulb" viewBox="0 0 24 24" aria-hidden="true">
			<path class="rays" d="M12 0.8v1.6M3.6 3.9l1.1 1M20.4 3.9l-1.1 1M1.4 9.8h1.5M21.1 9.6h1.5" />
			<path
				class="glass"
				d="M12 3.3c-3.5-.1-6.3 2.6-6.2 6 .1 2.2 1.2 3.6 2.3 4.8.7.8 1 1.7 1.1 2.7h5.7c0-1.1.4-1.9 1.1-2.7 1.1-1.1 2.3-2.6 2.2-4.9-.1-3.3-2.7-5.8-6.2-5.9z"
			/>
			<path class="base" d="M9.3 18.7c1.8.2 3.6.1 5.4-.1M9.8 20.8c1.5.2 3 .1 4.4-.1" />
		</svg>
		{n === 1 ? '힌트 보기' : '힌트 하나 더 보기'}
	</button>
{:else if opened}
	<div class="hint" class:annot={at !== undefined}>
		<span class="tag">힌트 {n}</span>
		{#if at !== undefined}
			<Noted on={on ?? chapter.on_of(index)} line={at} {note} narrow late={false}>
				{@render children()}
			</Noted>
		{:else}
			{@render children()}
		{/if}
	</div>
{/if}

<style>
	.ask {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 22px 8px 0 0;
		padding: 3px 14px 1px 10px;
		border: 1.25px dashed var(--fg-3);
		border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
		background: none;
		font-family: var(--font-hand);
		font-size: 20px;
		color: var(--fg);
		cursor: var(--cursor-point);
		transition:
			border-color 160ms ease,
			transform 160ms var(--ease-out);
	}

	.ask:active {
		transform: scale(0.97);
	}

	@media (hover: hover) and (pointer: fine) {
		.ask:hover {
			border-color: var(--fg-2);
		}
	}

	.bulb {
		width: 22px;
		height: 22px;
		overflow: visible;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.glass {
		stroke: currentColor;
		stroke-width: 1.4;
	}

	.base {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.4;
	}

	.rays {
		fill: none;
		stroke: #e8a200;
		stroke-width: 1.5;
		opacity: 0.85;
	}

	/*
	 * A visual cue that a hint is available, until the button is pressed: the bulb quietly
	 * lights up and dims, like a lamp breathing. Only brightness changes (the glass warms up,
	 * a soft glow follows, the rays spread a little and fade), no shaking or bouncing.
	 * A 2.8s cycle, ease-in-out; pressing the button removes it, which ends the loop.
	 */
	.glass {
		fill: #ffd84a;
		fill-opacity: 0.45;
		animation: warm 2.8s ease-in-out infinite;
	}

	.ask .bulb {
		animation: glow 2.8s ease-in-out infinite;
	}

	.ask .rays {
		transform-origin: 12px 9.5px;
		animation: spread 2.8s ease-in-out infinite;
	}

	@keyframes warm {
		45% {
			fill-opacity: 1;
		}
	}

	@keyframes glow {
		45% {
			filter: drop-shadow(0 0 3px rgb(255 200 40 / 0.7));
		}
	}

	@keyframes spread {
		0%,
		20% {
			opacity: 0;
			transform: scale(0.82);
		}
		45% {
			opacity: 1;
			transform: scale(1);
		}
		75%,
		100% {
			opacity: 0;
			transform: scale(1.06);
		}
	}

	.hint {
		margin: 12px 0 0;
		padding: 8px 14px 10px;
		border-left: 2px dashed var(--fg-3);
		font-size: 15.5px;
		line-height: 1.7;
		/* an opened hint unfolds under the question: opacity + small rise, 240ms (emil-design-eng) */
		animation: unfold 240ms var(--ease-out) backwards;
	}

	/* a hint about a line of code comes in just after its note has started on the left */
	.hint.annot {
		animation-delay: 380ms;
	}

	@keyframes unfold {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	.tag {
		display: block;
		margin-bottom: 2px;
		font-family: var(--font-hand);
		font-size: 19px;
		color: var(--fg-2);
	}

	.hint :global(p) {
		margin: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		/* reduced motion: the glass still warms and dims; the rays don't move */
		.ask .rays {
			animation: none;
			opacity: 0;
		}

		.hint {
			animation: none;
		}
	}
</style>
