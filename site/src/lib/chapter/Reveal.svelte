<script>
	import { get_step } from './state.svelte.js';

	/**
	 * The explanation, tucked into the page as a folded paper slip. Unfolding it reveals
	 * the explanation and unlocks the next question.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();

	const { index, chapter } = get_step();
	let revealed = $derived(chapter.is_revealed(index));
</script>

<div class="slip" class:revealed>
	{#if revealed}
		<p class="label">해설</p>
	{:else}
		<button class="fold" onclick={() => chapter.reveal(index)}>
			<span class="fold-text">먼저 스스로 답을 떠올려 본 뒤에 펼쳐 보세요</span>
			<span class="fold-action">쪽지 펼치기</span>
		</button>
	{/if}

	<!-- accordion: grid rows 0fr → 1fr, 200ms strong ease-out (animate skill, Accordion recipe) -->
	<div class="sheet">
		<div class="sheet-inner">
			{#if revealed}
				<div class="content">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.slip {
		position: relative;
		margin-top: 10px;
		border-radius: 2px;
		background:
			var(--grain), linear-gradient(180deg, rgb(255 255 255 / 0.35), transparent 40%), #f8f1e1;
		box-shadow:
			0 1px 0 rgb(0 0 0 / 0.04),
			0 2px 6px rgb(60 40 20 / 0.14),
			0 10px 24px -12px rgb(60 40 20 / 0.3);
		transform: rotate(-0.6deg);
		transition: transform 200ms var(--ease-out);
	}

	/* the crease across a folded slip */
	.slip:not(.revealed)::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 10px;
		transform: translateY(-50%);
		background: linear-gradient(
			180deg,
			transparent,
			rgb(60 40 20 / 0.09) 45%,
			rgb(255 255 255 / 0.5) 55%,
			transparent
		);
		pointer-events: none;
	}

	.slip.revealed {
		transform: rotate(0deg);
	}

	.fold {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		width: 100%;
		padding: 16px 20px;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
		/* press feedback: scale 0.98, 160ms ease-out (animate skill, Button press) */
		transition: transform 160ms var(--ease-out);
	}

	.fold:active {
		transform: scale(0.98);
	}

	.fold-text {
		font-size: 14px;
		color: var(--ink-soft);
	}

	.fold-action {
		flex: none;
		padding: 5px 14px;
		border: 1px solid var(--rubric);
		border-radius: 99px;
		font-size: 13px;
		font-weight: 700;
		color: var(--rubric);
		transition:
			background-color 200ms ease,
			color 200ms ease;
	}

	@media (hover: hover) and (pointer: fine) {
		.fold:hover .fold-action {
			background: var(--rubric);
			color: var(--paper);
		}
	}

	.label {
		margin: 0;
		padding: 14px 22px 0;
		font-size: 12px;
		font-weight: 900;
		letter-spacing: 0.3em;
		color: var(--rubric);
	}

	.sheet {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 200ms var(--ease-out);
	}

	.revealed .sheet {
		grid-template-rows: 1fr;
	}

	.sheet-inner {
		min-height: 0;
		overflow: hidden;
	}

	.content {
		padding: 6px 22px 18px;
		font-size: 15.5px;
		line-height: 1.85;
		color: var(--ink);
		opacity: 1;
		transition: opacity 200ms var(--ease-out);

		@starting-style {
			opacity: 0;
		}
	}

	.content :global(p) {
		margin: 0 0 14px;
	}

	.content :global(ol),
	.content :global(ul) {
		margin: 0 0 14px;
		padding-left: 22px;
	}

	.content :global(li) {
		margin-bottom: 6px;
	}

	.content :global(strong) {
		color: var(--rubric);
	}

	@media (prefers-reduced-motion: reduce) {
		.slip,
		.sheet {
			transition: none;
		}
	}
</style>
