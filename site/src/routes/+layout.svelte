<script>
	import '../app.css';
	import '#lib/fonts/fonts.css';
	import { FONTS } from '#lib/fonts/fonts.js';
	import favicon from '#lib/assets/favicon.svg';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	/**
	 * Every link to another site opens in a new tab, so the reader keeps their place here. Set
	 * on the link as it is followed (by mouse, keyboard or touch), so no link has to remember it.
	 * @param {MouseEvent} event
	 */
	function external(event) {
		const link = /** @type {Element} */ (event.target).closest?.('a[href]');
		if (!(link instanceof HTMLAnchorElement) || link.origin === location.origin) return;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
	}

	// the faces every page shows on its first screen, fetched with the page instead of after its
	// stylesheet; a page preloads its own on top of these (see scripts/fonts.mjs)
	const FIRST = ['hahmlet-700-800', 'gowun-dodum-400', 'inside-hand-400'];
</script>

<svelte:document onclickcapture={external} onauxclickcapture={external} />

<svelte:head>
	<link rel="icon" href={favicon} />
	{#each FIRST as name (name)}
		<link rel="preload" href={FONTS[name]} as="font" type="font/woff2" crossorigin="anonymous" />
	{/each}
	<title>Svelte 5 내부 탐구</title>
</svelte:head>

{@render children()}
