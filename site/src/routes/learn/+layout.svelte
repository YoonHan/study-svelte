<script>
	import { onMount } from 'svelte';
	import { FONTS } from '#lib/fonts/fonts.js';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	// a chapter's first screen also shows code: preloaded with the page, on top of what every
	// page preloads (routes/+layout.svelte)
	const FIRST = ['inside-mono-500', 'inside-code-kr-400'];

	// the faces only later beats use: fetched once the first screen is drawn, so they are there
	// before a beat needs them
	const LATER = [
		'400 1em "Inside Mono"',
		'600 1em "Inside Mono"',
		'700 1em "Inside Mono"',
		'500 1em "Noto Sans KR"'
	];

	onMount(() => {
		for (const font of LATER) document.fonts.load(font, '가a');
	});
</script>

<svelte:head>
	{#each FIRST as name (name)}
		<link rel="preload" href={FONTS[name]} as="font" type="font/woff2" crossorigin="anonymous" />
	{/each}
</svelte:head>

{@render children()}
