<script>
	import mark from '#lib/assets/favicon.svg';
	import Contents from './Contents.svelte';

	/**
	 * The ways out of a chapter, always at hand: two index tabs stuck to the left edge of the
	 * page, like tabs on a book's edge. "홈" (under the site's mark) goes home; "목차" opens the
	 * contents drawer, which comes in from this same edge. Both are written the same way, top
	 * to bottom. They sit in the page's left margin (widened for them, see the chapter pages),
	 * clear of the code even when pointing at a tab pulls it out a little. On a touch screen
	 * each tab can be pressed a little beyond what it shows, up to the end of the margin. Another chapter is reached only through
	 * the drawer or the link at a chapter's end.
	 *
	 * @type {{ current: string }}
	 */
	let { current } = $props();

	/** @type {Contents | undefined} */
	let contents = $state();
</script>

<nav class="tabs" aria-label="홈과 목차">
	<a class="tab home" href="/" aria-label="홈으로 돌아가기"
		><img src={mark} alt="" width="18" height="18" /><span class="word" aria-hidden="true">홈</span
		></a
	>
	<button class="tab toc" onclick={() => contents?.show()}>목차</button>
</nav>
<Contents {current} button={false} bind:this={contents} />

<style>
	.tabs {
		position: fixed;
		top: 84px;
		left: 0;
		z-index: 40;
		display: grid;
		gap: 6px;
	}

	.tab {
		position: relative;
		display: grid;
		place-items: center;
		gap: 4px;
		width: 28px;
		padding: 10px 4px 10px 6px;
		border: 1px solid var(--line);
		border-left: 0;
		border-radius: 0 9px 9px 0;
		background: var(--surface);
		box-shadow: 2px 1px 5px rgb(0 0 0 / 0.08);
		color: var(--accent);
		text-decoration: none;
		transform: translateX(-5px);
		transition:
			transform 200ms var(--ease-out),
			background-color 160ms ease;
	}

	.toc,
	.word {
		writing-mode: vertical-rl;
		font-family: var(--font-hand);
		font-size: 18px;
		line-height: 1;
	}

	.home img {
		display: block;
	}

	@media (hover: hover) and (pointer: fine) {
		.tab:hover {
			transform: none;
			background: var(--bg);
		}
	}

	.tab:focus-visible {
		transform: none;
	}

	/* narrow screens: slimmer and not tucked, so they fit the page's margin whole */
	@media (max-width: 1023px) {
		.tabs {
			top: 72px;
		}

		.tab {
			width: 22px;
			padding: 9px 3px 9px 4px;
			transform: none;
		}

		.toc,
		.word {
			font-size: 15px;
		}

		.home img {
			width: 15px;
			height: 15px;
		}
	}

	/* a finger needs more than the tab shows: the pressable area is a little wider, up to the margin's end */
	@media (hover: none), (pointer: coarse) {
		.tabs {
			gap: 10px;
		}

		.tab::after {
			content: '';
			position: absolute;
			/* not past the margin: a press on the words' first letters stays theirs */
			inset: -5px -8px -5px 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tab,
		.tab:hover {
			transform: none;
		}
	}
</style>
