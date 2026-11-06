<script>
	import { onMount } from 'svelte';
	import mark from '#lib/assets/favicon.svg';
	import Contents from './Contents.svelte';
	import { theme, start_theme, toggle_theme } from '#lib/theme.svelte.js';

	/**
	 * The ways out of a chapter, always at hand: two index tabs stuck to the left edge of the
	 * page, like tabs on a book's edge. "홈" (under the site's mark) goes home; "목차" opens the
	 * contents drawer, which comes in from this same edge. Both are written the same way, top
	 * to bottom. A third tab switches between light and dark: a moon and "어둡게" while light, a
	 * sun and "밝게" while dark (shown by the theme itself, so the prerendered page is right before
	 * any script runs). They sit in the page's left margin (widened for them, see the chapter pages),
	 * clear of the code even when pointing at a tab pulls it out a little. On a touch screen
	 * each tab can be pressed a little beyond what it shows, up to the end of the margin. Another chapter is reached only through
	 * the drawer or the link at a chapter's end.
	 *
	 * @type {{ current: string }}
	 */
	let { current } = $props();

	/** @type {Contents | undefined} */
	let contents = $state();

	onMount(start_theme);
</script>

<nav class="tabs" aria-label="홈과 목차">
	<a class="tab home" href="/" aria-label="홈으로 돌아가기"
		><img src={mark} alt="" width="18" height="18" /><span class="word" aria-hidden="true">홈</span
		></a
	>
	<button class="tab toc" onclick={() => contents?.show()}>목차</button>
	<button
		class="tab theme"
		onclick={toggle_theme}
		aria-label={theme.dark ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기'}
	>
		<svg class="icon moon" viewBox="0 0 24 24" aria-hidden="true"
			><path
				d="M15.2 3.6c-4.9.5-8.4 4.6-8 9.4.4 4.7 4.6 8.2 9.4 7.7 1.9-.2 3.5-.9 4.8-2.1-4.2.4-7.9-2.7-8.3-6.9-.2-3.1 1-5.9 3.1-7.7-.3-.2-.6-.3-1-.4z"
			/></svg
		>
		<svg class="icon sun" viewBox="0 0 24 24" aria-hidden="true"
			><circle cx="12" cy="12" r="4.2" /><path
				d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8"
			/></svg
		>
		<span class="word to-dark" aria-hidden="true">어둡게</span>
		<span class="word to-light" aria-hidden="true">밝게</span>
	</button>
</nav>
<Contents {current} bind:this={contents} />

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
		width: 34px;
		padding: 10px 7px 10px 9px;
		border: 1px solid var(--line);
		border-left: 0;
		border-radius: 0 9px 9px 0;
		background: var(--surface);
		box-shadow: 2px 1px 5px rgb(0 0 0 / 0.08);
		/* ink, the printed book's: the pen colour is for notes on the code beside them */
		color: var(--fg);
		text-decoration: none;
		transform: translateX(-5px);
		transition:
			transform 200ms var(--ease-out),
			background-color 160ms ease,
			border-color 160ms ease;
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

	/* the theme tab: a moon and "어둡게" while light, a sun and "밝게" while dark */
	.icon {
		display: block;
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/*
	 * both icons in one place and both words in another, the one not in use hidden: the tab
	 * keeps the height of the longer word ("어둡게") in either theme, so it does not change size
	 */
	.theme {
		grid-template-areas: 'icon' 'word';
	}

	.theme .icon {
		grid-area: icon;
	}

	.theme .word {
		grid-area: word;
	}

	.sun,
	.to-light,
	:global(:root[data-theme='dark']) .moon,
	:global(:root[data-theme='dark']) .to-dark {
		visibility: hidden;
	}

	:global(:root[data-theme='dark']) .sun,
	:global(:root[data-theme='dark']) .to-light {
		visibility: visible;
	}

	@media (hover: hover) and (pointer: fine) {
		/* pointed at: pulled out, and its edge drawn in the pen colour; the words stay ink */
		.tab:hover {
			transform: none;
			background: var(--bg);
			border-color: var(--accent);
		}
	}

	.tab:focus-visible {
		transform: none;
		border-color: var(--accent);
	}

	/* narrow screens: slimmer and not tucked, so they fit the page's margin whole */
	@media (max-width: 1023px) {
		.tabs {
			top: 72px;
		}

		.tab {
			width: 26px;
			padding: 9px 5px;
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

		.icon {
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
			inset: -5px -6px -5px 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tab,
		.tab:hover {
			transform: none;
		}
	}
</style>
