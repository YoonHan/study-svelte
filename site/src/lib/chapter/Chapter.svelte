<script>
	import { onMount } from 'svelte';
	import { ChapterState, set_chapter } from './state.svelte.js';

	/**
	 * One chapter, laid out as an open book: the verso (left page) carries the text and
	 * the recto (right page) carries the plate for whichever question is being read.
	 *
	 * @type {{
	 *   id: string,
	 *   part: string,
	 *   title: string,
	 *   children: import('svelte').Snippet,
	 *   panel: import('svelte').Snippet<[scene: string, revealed: boolean]>
	 * }}
	 */
	let { id, part, title, children, panel } = $props();

	// svelte-ignore state_referenced_locally
	const chapter = set_chapter(new ChapterState(`chapter:${id}`));

	onMount(() => chapter.restore());

	let scene = $derived(chapter.scenes[chapter.active] ?? chapter.scenes[0] ?? '');
	let total = $derived(chapter.scenes.length);
	let done = $derived(total > 0 && chapter.progress >= total);
</script>

<div class="desk">
	<div class="spread">
		<article class="page verso">
			<header class="running-head">
				<a href="/?toc">← 목차</a>
				<span>{part}</span>
			</header>

			<div class="scroll">
				<header class="opening">
					<p class="chapter-no">{id}</p>
					<h1>{title}</h1>
					<p class="progress">
						문항 <b>{chapter.progress}</b> / {total}
						{#if chapter.progress > 0}
							<button class="reset" onclick={() => chapter.reset()}>처음부터 다시 읽기</button>
						{/if}
					</p>
				</header>

				{@render children()}

				{#if done}
					<p class="finis">❦ 이 장을 모두 읽었습니다 ❦</p>
				{/if}
			</div>
		</article>

		<aside class="page recto" aria-label="도판">
			<header class="running-head">
				<span>도판</span>
				<span>{id}</span>
			</header>
			<div class="plate-area">
				{#key scene}
					<div class="plate-scene">
						{@render panel(scene, chapter.is_revealed(chapter.active))}
					</div>
				{/key}
			</div>
		</aside>

		<span class="ribbon" aria-hidden="true"></span>
	</div>
</div>

<style>
	.desk {
		min-height: 100vh;
		padding: 64px 28px 28px;
		display: grid;
		place-items: center;
	}

	.spread {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: min(1480px, 100%);
		height: calc(100vh - 92px);
		min-height: 560px;
		filter: drop-shadow(0 30px 40px rgb(0 0 0 / 0.55));
	}

	.page {
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		color: var(--ink);
		background: var(--grain), var(--paper);
	}

	/* gutter shading and page-edge stacks; the paper curves down into the binding */
	.verso {
		border-radius: 6px 2px 2px 6px;
		background:
			linear-gradient(270deg, rgb(60 40 20 / 0.22), rgb(60 40 20 / 0.06) 4%, transparent 12%),
			var(--grain), var(--paper);
		box-shadow:
			-1px 1px 0 var(--paper-shade),
			-2px 2px 0 var(--paper-edge),
			-3px 3px 0 var(--paper-shade),
			-4px 4px 0 var(--paper-edge),
			-5px 5px 0 #8e7a58;
	}

	.recto {
		border-radius: 2px 6px 6px 2px;
		background:
			linear-gradient(90deg, rgb(60 40 20 / 0.24), rgb(60 40 20 / 0.06) 4%, transparent 12%),
			var(--grain), var(--paper);
		box-shadow:
			1px 1px 0 var(--paper-shade),
			2px 2px 0 var(--paper-edge),
			3px 3px 0 var(--paper-shade),
			4px 4px 0 var(--paper-edge),
			5px 5px 0 #8e7a58;
	}

	.running-head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 0 28px;
		padding: 18px 16px 10px;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 15px;
		color: var(--ink-faint);
		border-bottom: 1px solid var(--rule);
	}

	.running-head a {
		text-decoration: none;
		font-style: normal;
		font-family: var(--font-serif);
		font-size: 13px;
		color: var(--ink-soft);
	}

	@media (hover: hover) and (pointer: fine) {
		.running-head a:hover {
			color: var(--rubric);
		}
	}

	.scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 34px 56px 40vh 52px;
		scrollbar-width: thin;
		scrollbar-color: var(--paper-edge) transparent;
		mask-image: linear-gradient(transparent, #000 28px, #000 calc(100% - 40px), transparent);
	}

	.opening {
		margin-bottom: 36px;
		text-align: center;
	}

	.chapter-no {
		margin: 0;
		font-family: var(--font-display);
		font-size: 40px;
		font-weight: 600;
		line-height: 1;
		color: var(--rubric);
	}

	h1 {
		margin: 12px 0 14px;
		font-size: 25px;
		font-weight: 900;
		line-height: 1.45;
		letter-spacing: -0.01em;
	}

	.progress {
		margin: 0;
		font-size: 13px;
		color: var(--ink-faint);
	}

	.progress b {
		color: var(--rubric);
	}

	.reset {
		margin-left: 8px;
		padding: 0;
		border: 0;
		background: none;
		font-size: 12px;
		color: var(--ink-faint);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}

	.finis {
		margin: 40px 0 0;
		text-align: center;
		font-size: 14px;
		letter-spacing: 0.1em;
		color: var(--rubric);
	}

	.plate-area {
		flex: 1;
		min-height: 0;
		position: relative;
	}

	.plate-scene {
		position: absolute;
		inset: 0;
		overflow: auto;
		padding: 28px 44px 32px 52px;
		scrollbar-width: thin;
		/* entering plate: opacity + small rise, strong ease-out (emil-design-eng) */
		animation: plate-in 260ms var(--ease-out);
	}

	@keyframes plate-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	/* the bookmark ribbon hanging from the head of the book into the gutter */
	.ribbon {
		position: absolute;
		top: -6px;
		left: calc(50% + 14px);
		width: 16px;
		height: 96px;
		background: linear-gradient(90deg, #7e2414, var(--rubric) 50%, #7e2414);
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%);
	}

	@media (prefers-reduced-motion: reduce) {
		.plate-scene {
			animation: plate-fade 200ms ease;
		}

		@keyframes plate-fade {
			from {
				opacity: 0;
			}
		}
	}

	/* narrow screens: a single page; the plate sits above the text and stays in view */
	@media (max-width: 960px) {
		.desk {
			padding: 56px 0 0;
			display: block;
		}

		.spread {
			display: flex;
			flex-direction: column;
			height: auto;
			min-height: 0;
			filter: none;
		}

		.recto {
			order: -1;
			position: sticky;
			top: 0;
			z-index: 5;
			height: 44vh;
			border-radius: 0;
			box-shadow: 0 6px 16px rgb(0 0 0 / 0.35);
		}

		.verso {
			border-radius: 0;
			box-shadow: none;
		}

		.scroll {
			overflow: visible;
			mask-image: none;
			padding: 28px 22px 50vh;
		}

		.running-head {
			margin: 0 16px;
			padding: 10px 4px 8px;
		}

		.plate-scene {
			padding: 16px 16px 20px;
		}

		.ribbon {
			display: none;
		}
	}
</style>
