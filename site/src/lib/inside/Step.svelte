<script>
	import { get_chapter, set_step } from './state.svelte.js';

	/**
	 * One question about the function being opened: a group of beats, from the question to the
	 * end of its explanation.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();

	const chapter = get_chapter();
	const step = $state({
		number: ++chapter.steps,
		first: /** @type {number | null} */ (null),
		last: /** @type {number | null} */ (null),
		answer: /** @type {number | null} */ (null)
	});
	set_step(step);

	let started = $derived(step.first !== null && chapter.is_revealed(step.first));
	let current = $derived(
		step.first !== null &&
			step.last !== null &&
			chapter.focus >= step.first &&
			chapter.focus <= step.last
	);
</script>

<section class="step" class:started class:current>
	{@render children()}
</section>

<style>
	.step.started {
		margin-top: 28px;
		padding-top: 32px;
		border-top: 1px solid var(--line);
	}

	.step.started {
		transition: border-color 300ms ease;
	}

	.step.started:not(.current) {
		border-top-color: color-mix(in oklab, var(--line) 40%, transparent);
	}
</style>
