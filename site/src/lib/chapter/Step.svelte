<script>
	import { get_chapter, set_step } from './state.svelte.js';

	/** @type {{ scene: string, children: import('svelte').Snippet }} */
	let { scene, children } = $props();

	const chapter = get_chapter();
	// svelte-ignore state_referenced_locally
	const index = chapter.register(scene);
	set_step({ index, chapter });

	let unlocked = $derived(chapter.is_unlocked(index));
	let active = $derived(chapter.active === index);

	/**
	 * Marks this question as the one being read while it crosses the middle band of the
	 * viewport. IntersectionObserver also accounts for the page's own scroll container.
	 * @type {import('svelte/attachments').Attachment<HTMLElement>}
	 */
	function track(node) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) chapter.active = index;
			},
			{ rootMargin: '-35% 0px -55% 0px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

{#if unlocked}
	<section class="question" class:active {@attach track}>
		<span class="number" aria-hidden="true">{index + 1}</span>
		<div class="body">
			{@render children()}
		</div>
	</section>
{/if}

<style>
	.question {
		position: relative;
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr);
		gap: 12px;
		padding: 26px 0 30px;
		/* a newly unlocked question settles onto the page: opacity + small rise (emil-design-eng) */
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 240ms var(--ease-out),
			transform 240ms var(--ease-out);

		@starting-style {
			opacity: 0;
			transform: translateY(8px);
		}
	}

	.question + :global(.question)::before {
		content: '⁂';
		position: absolute;
		top: -12px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 16px;
		color: var(--ink-faint);
	}

	.number {
		font-family: var(--font-display);
		font-size: 34px;
		font-weight: 600;
		line-height: 1;
		text-align: right;
		color: var(--ink-faint);
		transition: color 200ms ease;
	}

	.active .number {
		color: var(--rubric);
	}

	.body {
		min-width: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.question {
			transition: opacity 200ms ease;

			@starting-style {
				opacity: 0;
				transform: none;
			}
		}
	}
</style>
