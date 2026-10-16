<script>
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Svelte 대백과</title>
</svelte:head>

{#if !page.url.pathname.startsWith('/learn')}
	<a class="imprint" href="/">
		<span class="name">Svelte 대백과</span>
		<span class="edition">제5판 · svelte@5.0.0</span>
	</a>
{/if}

{@render children()}

<style>
	.imprint {
		position: fixed;
		top: 18px;
		left: 24px;
		z-index: 20;
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		text-decoration: none;
		color: color-mix(in oklab, var(--paper) 88%, transparent);
	}

	.name {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 15px;
		letter-spacing: 0.02em;
	}

	.edition {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 14px;
		color: color-mix(in oklab, var(--paper) 55%, transparent);
	}

	@media (max-width: 960px) {
		.imprint {
			position: absolute;
			top: 12px;
			left: 16px;
		}
	}
</style>
