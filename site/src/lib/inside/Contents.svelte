<script>
	import ContentsBody from './ContentsBody.svelte';

	/**
	 * The one piece of navigation inside a chapter: a "목차" link that opens the contents in a
	 * drawer over the page. A native <dialog> gives focus handling and Esc for free.
	 *
	 * @type {{ current: string }}
	 */
	let { current } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();

	/** times opened: each opening re-reads progress, and the contents stay while it closes */
	let opens = $state(0);

	function show() {
		opens += 1;
		dialog?.showModal();
	}

	function hide() {
		dialog?.close();
	}
</script>

<button class="link pen-link" onclick={show}>목차</button>

<dialog
	bind:this={dialog}
	onclick={(event) => {
		// a click on the backdrop (the dialog element itself, outside its panel) closes it
		if (event.target === dialog) hide();
	}}
	aria-labelledby="contents-title"
>
	<div class="panel">
		<header>
			<!-- focus lands on the title when the drawer opens, so no button shows a focus ring -->
			<!-- svelte-ignore a11y_autofocus -->
			<h2 id="contents-title" tabindex="-1" autofocus>목차</h2>
			<button class="close" onclick={hide}>닫기</button>
		</header>
		{#key opens}
			{#if opens > 0}
				<ContentsBody {current} />
			{/if}
		{/key}
	</div>
</dialog>

<style>
	/* a link written in pen (`.pen-link`, app.css) */
	.link {
		font-size: 21px;
		line-height: 1.2;
	}

	/*
	 * The drawer slides in from the left edge, where the code lives (spatial consistency).
	 * 340ms with the iOS-like drawer curve; it exits the way it came in.
	 */
	dialog {
		--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
		position: fixed;
		inset: 0 auto 0 0;
		width: min(560px, 100vw);
		max-width: 100vw;
		height: 100%;
		max-height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: var(--bg);
		color: var(--fg);
		box-shadow: 8px 0 32px rgb(0 0 0 / 0.18);
		transform: translateX(-100%);
		transition:
			transform 340ms var(--ease-drawer),
			overlay 340ms allow-discrete,
			display 340ms allow-discrete;
	}

	dialog[open] {
		transform: translateX(0);

		@starting-style {
			transform: translateX(-100%);
		}
	}

	dialog::backdrop {
		background: rgb(20 22 26 / 0);
		transition:
			background-color 340ms ease,
			overlay 340ms allow-discrete,
			display 340ms allow-discrete;
	}

	dialog[open]::backdrop {
		background: rgb(20 22 26 / 0.32);

		@starting-style {
			background: rgb(20 22 26 / 0);
		}
	}

	.panel {
		height: 100%;
		overflow-y: auto;
		padding: 22px 28px 48px;
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 18px;
	}

	h2 {
		outline: none;
		margin: 0;
		font-family: var(--font-hand);
		font-size: 30px;
		font-weight: 400;
		color: var(--accent);
	}

	.close {
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--font-hand);
		font-size: 20px;
		color: var(--fg-2);
		cursor: var(--cursor-point);
	}

	@media (prefers-reduced-motion: reduce) {
		dialog {
			opacity: 0;
			transform: none;
			transition:
				opacity 200ms ease,
				overlay 200ms allow-discrete,
				display 200ms allow-discrete;
		}

		dialog[open] {
			opacity: 1;
			transform: none;

			@starting-style {
				opacity: 0;
				transform: none;
			}
		}
	}
</style>
