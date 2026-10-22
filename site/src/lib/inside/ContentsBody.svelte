<script>
	import { onMount } from 'svelte';
	import { STAGES } from '#lib/path.js';
	import { read_status } from './progress.js';

	/**
	 * The notebook's contents: the learning path, stages and their chapters, written in by hand.
	 * Used on the home page and in the drawer a chapter opens.
	 *
	 * `entrance`: on the home page, the contents come in one stage at a time after this many
	 * milliseconds; each stage's number is circled in pen and its chapters follow, quickly, one
	 * after another. Not in the drawer, which opens often.
	 *
	 * @type {{ current?: string, entrance?: number }}
	 */
	let { current, entrance } = $props();

	// when each stage, and each of its chapters, comes in (ms), counted down the page
	const delays = (() => {
		let at = entrance ?? 0;
		return STAGES.map((stage) => {
			const title = at;
			const chapters = Math.max(stage.chapters.length, 1);
			const rows = Array.from({ length: chapters }, (_, i) => title + 100 + i * 30);
			at = rows[rows.length - 1] + 60;
			return { title, rows };
		});
	})();

	/** @type {Record<string, import('./progress.js').Status | null>} */
	let status = $state({});

	onMount(() => {
		status = Object.fromEntries(
			STAGES.flatMap((stage) => stage.chapters).map((chapter) => [
				chapter.id,
				read_status(chapter.id)
			])
		);
	});
</script>

<ol class="stages">
	{#each STAGES as stage, s (stage.no)}
		<li class="stage" class:empty={stage.chapters.length === 0}>
			<h3
				class="stage-title"
				class:rise={entrance !== undefined}
				class:drawn={entrance !== undefined}
				style:--delay="{delays[s].title}ms"
			>
				<!-- the stage number, circled in pen like a heading marked in a notebook -->
				<span class="stage-no"
					>{stage.no}단계<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"
						><path
							pathLength="1"
							d="M58 5 C 30 2, 5 8, 4 20 C 3 32, 28 38, 54 37 C 80 36, 97 30, 96 19 C 95 9, 74 3, 40 6"
						/></svg
					></span
				>
				<span class="stage-name">{stage.title}</span>
			</h3>
			<ol class="chapters">
				{#each stage.chapters as chapter, c (chapter.id)}
					<li
						class="chapter"
						class:here={chapter.id === current}
						class:soon={!chapter.ready}
						class:rise={entrance !== undefined}
						style:--delay="{delays[s].rows[c]}ms"
					>
						<span class="branch" aria-hidden="true">ㄴ</span>
						<span class="no">{chapter.id}</span>
						{#if chapter.ready}
							<a href="/learn/{chapter.id}">{chapter.title}</a>
						{:else}
							<span>{chapter.title}</span>
						{/if}
						<span class="state">
							{#if chapter.id === current}지금 읽는 장{:else if status[chapter.id] === 'done'}✓{:else if status[chapter.id] === 'started'}읽는
								중{:else if !chapter.ready}준비 중{/if}
						</span>
					</li>
				{:else}
					<li
						class="chapter later"
						class:rise={entrance !== undefined}
						style:--delay="{delays[s].rows[0]}ms"
					>
						<span class="branch" aria-hidden="true">ㄴ</span>
						<span>준비 중</span>
					</li>
				{/each}
			</ol>
		</li>
	{/each}
</ol>

<style>
	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.stages {
		display: grid;
		gap: 22px;
	}

	.stage-title {
		display: flex;
		align-items: baseline;
		gap: 14px;
		margin: 0 0 4px;
	}

	/* the stage number in pen colour, a loose hand-drawn ring around it */
	.stage-no {
		position: relative;
		flex: none;
		padding: 3px 13px 0;
		font-family: var(--font-hand);
		font-size: 28px;
		font-weight: 400;
		line-height: 1;
		color: var(--accent);
	}

	.stage-no svg {
		position: absolute;
		top: -5px;
		left: -1px;
		width: calc(100% + 2px);
		height: calc(100% + 9px);
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		pointer-events: none;
	}

	/*
	 * Coming in on the home page, the ring is drawn around the stage number once it is there
	 * (500ms). Transparent until it starts: the empty dash's round cap would show as a dot.
	 */
	.drawn .stage-no path {
		stroke-dasharray: 1;
		animation: ring 500ms var(--ease-out) calc(var(--delay, 0ms) + 260ms) backwards;
	}

	@keyframes ring {
		0% {
			stroke-dashoffset: 1;
			stroke-opacity: 0;
		}
		1% {
			stroke-opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drawn .stage-no path {
			animation: none;
		}
	}

	.stage-no path {
		vector-effect: non-scaling-stroke;
	}

	.stage-name {
		font-family: var(--font-head);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.stage.empty .stage-no,
	.stage.empty .stage-name {
		color: var(--fg-3);
	}

	/* chapters sit on ruled lines under their stage, each hung from it by a hand-written ㄴ */
	.chapters {
		padding-left: 14px;
	}

	.chapter {
		display: flex;
		align-items: baseline;
		gap: 10px;
		min-height: var(--rule-gap);
		border-bottom: 1px solid var(--rule);
		font-size: 15px;
		line-height: var(--rule-gap);
	}

	.branch {
		flex: none;
		width: 1.1em;
		font-family: var(--font-hand);
		font-size: 27px;
		line-height: 1;
		color: var(--fg-2);
		transform: translateY(-1px);
	}

	.no {
		flex: none;
		width: 2.2em;
		color: var(--fg-3);
		font-variant-numeric: tabular-nums;
	}

	.chapter a {
		color: var(--fg);
		text-decoration: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.chapter a:hover {
			text-decoration: underline;
		}
	}

	.chapter.soon,
	.chapter.later {
		color: var(--fg-3);
	}

	.chapter.later {
		font-family: var(--font-hand);
		font-size: 18px;
	}

	.chapter.here a {
		font-weight: 700;
	}

	.state {
		margin-left: auto;
		flex: none;
		padding-left: 8px;
		font-family: var(--font-hand);
		font-size: 19px;
		color: var(--accent);
	}

	.soon .state {
		color: var(--fg-3);
	}

	.here .state {
		color: var(--accent);
	}
</style>
