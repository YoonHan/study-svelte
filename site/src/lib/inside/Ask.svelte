<script>
	import { get_beat, get_step } from './state.svelte.js';

	/**
	 * A question to stop and think about, printed in a box like a workbook problem with a
	 * sticky-note flag on its top edge: "질문 N" for the question a step opens with, "생각해
	 * 보기" for one asked along the way. The flag is the same material as the choices in the
	 * experiments, so across the site a flag marks a place to think or choose.
	 *
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();

	const { index } = get_beat();
	const step = get_step();
</script>

<!--
	The flag sticks out above the box. The beat's entrance masks each of its parts to its own
	box, so the part is a wrapper with room for the flag (tests/render.spec.js checks it).
-->
<div class="ask-wrap">
	<div class="ask">
		<span class="flag">{step && step.first === index ? `질문 ${step.number}` : '생각해 보기'}</span>
		{@render children()}
	</div>
</div>

<style>
	/* the question is printed, like a workbook problem, in a thin box */
	.ask-wrap {
		padding-top: 22px;
	}

	.ask {
		position: relative;
		margin: 0 0 4px;
		padding: 20px;
		border: 1px solid color-mix(in oklab, var(--fg) 55%, transparent);
		border-radius: 3px;
		background: var(--surface);
		font-family: var(--font-head);
		font-size: 22px;
		font-weight: 700;
		line-height: 1.5;
		letter-spacing: -0.015em;
		/* the box is a fixed width, so lines fill it rather than balance */
		text-wrap: pretty;
	}

	.ask :global(p) {
		margin: 0 0 12px;
	}

	/* the same room below the question as above it */
	.ask > :global(:last-child) {
		margin-bottom: 0;
	}

	.ask :global(code) {
		font-size: 0.82em;
		font-weight: 700;
	}

	/* the sticky-note flag stuck on the box's top edge */
	.flag {
		position: absolute;
		left: 16px;
		top: -16px;
		padding: 2px 10px 4px;
		border-radius: 2px 3px 0 0;
		background: #ffe46b;
		font-family: var(--font-hand);
		font-size: 18px;
		font-weight: 400;
		line-height: 1.1;
		letter-spacing: 0;
		color: #24272b;
		transform: rotate(-1.5deg);
		box-shadow: 0 -1px 4px rgb(0 0 0 / 0.12);
	}

	@media (prefers-color-scheme: dark) {
		.flag {
			background: #e8cf55;
			color: #1d1f22;
			box-shadow: 0 -1px 5px rgb(0 0 0 / 0.4);
		}
	}

	/* a code example inside the question reads as code, not as part of the printed problem */
	.ask :global(.hl) {
		margin: 4px 0 16px;
		font-weight: 500;
		letter-spacing: 0;
		text-wrap: wrap;
	}

	.ask :global(.hl code) {
		font-size: 1em;
		font-weight: 500;
		background: none;
		padding: 0;
	}
</style>
