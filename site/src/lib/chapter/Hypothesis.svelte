<script>
	/**
	 * The first guess, written in pencil in the margin. Wrong guesses are part of the content.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();
</script>

<aside class="pencil">
	<p class="title">처음 세운 가설</p>
	{@render children()}
</aside>

<style>
	.pencil {
		position: relative;
		margin: 18px 4px 20px;
		padding: 6px 4px 6px 18px;
		font-family: var(--font-hand);
		font-size: 21px;
		line-height: 1.45;
		color: var(--pencil);
		transform: rotate(-0.4deg);
	}

	/* a pencil stroke down the margin */
	.pencil::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 8px;
		bottom: 8px;
		width: 2px;
		border-radius: 2px;
		background: linear-gradient(var(--pencil), color-mix(in oklab, var(--pencil) 40%, transparent));
		opacity: 0.6;
	}

	.title {
		margin: 0 0 2px !important;
		font-size: 19px;
		text-decoration: underline wavy color-mix(in oklab, var(--pencil) 55%, transparent);
		text-underline-offset: 5px;
	}

	.pencil :global(p) {
		margin: 0 0 4px;
	}

	.pencil :global(code) {
		font-family: var(--font-mono);
		font-size: 13px;
		background: none;
		padding: 0;
		color: var(--pencil);
	}
</style>
