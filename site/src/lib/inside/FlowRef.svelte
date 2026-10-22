<script>
	import Popover from './Popover.svelte';
	import SourceLines from './SourceLines.svelte';
	import { inline_code } from './text.js';

	/**
	 * Words that show how a function is reached, not only its definition: pointing at them opens
	 * a card with the steps of the call, top to bottom, each a few lines of code with the line
	 * that matters lit, joined by pen arrows that say what passes from one to the next. Used
	 * where a bare definition (Ref.svelte) leaves the reader asking "who calls this, and then
	 * what?".
	 *
	 * `steps`: `label` (short, `backticks` for code) and either lines of a source file (`code`,
	 * `lines`, `focus`) or a few lines written out (`snippet`, `focus` counting from 0).
	 * `arrows`: what each arrow between two steps says (one fewer than the steps).
	 */

	/**
	 * @typedef {{
	 *   label: string,
	 *   code?: import('#lib/types.js').CodeFile,
	 *   lines?: [number, number],
	 *   snippet?: string[],
	 *   focus?: number[]
	 * }} FlowStep
	 */

	/**
	 * @type {{
	 *   steps: FlowStep[],
	 *   arrows: string[],
	 *   plain?: boolean,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { steps, arrows, plain = false, children } = $props();
</script>

<Popover label="호출 흐름 보기">
	{#snippet trigger()}
		{#if plain}<span class="words">{@render children()}</span>{:else}<code class="words"
				>{@render children()}</code
			>{/if}
	{/snippet}
	<span class="calls">
		{#each steps as step, i (i)}
			{#if i > 0}
				<span class="arrow">
					<svg viewBox="0 0 16 30" aria-hidden="true"
						><path d="M8 2c-.6 8 .5 16 0 24M3 20l5 7 5-7" /></svg
					>
					<span class="arrow-label">{@html inline_code(arrows[i - 1] ?? '')}</span>
				</span>
			{/if}
			<span class="step">
				<span class="label">{@html inline_code(step.label)}</span>
				{#if step.code && step.lines}
					<!-- the file's path once, where the steps move into it -->
					<SourceLines
						code={step.code}
						lines={step.lines}
						focus={step.focus}
						path={step.code.file !== steps[i - 1]?.code?.file}
					/>
				{:else if step.snippet}
					<span class="snippet">
						{#each step.snippet as line, n (n)}
							<span class="line" class:focus={step.focus?.includes(n)}>{line}</span>
						{/each}
					</span>
				{/if}
			</span>
		{/each}
	</span>
</Popover>

<style>
	.words {
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, var(--accent) 60%, transparent);
		text-underline-offset: 3px;
	}

	.calls {
		display: grid;
		gap: 2px;
	}

	/*
	 * Each step is its own band, a shade darker than the card, so the chunks of code read as
	 * separate places; the arrows sit in the gaps between them, joining one to the next.
	 */
	.step {
		display: grid;
		gap: 2px;
		margin: 0 8px;
		padding: 8px 0 6px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface-2);
	}

	/* what this step is, in the reader's words */
	.label {
		padding: 0 12px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--fg);
	}

	.label :global(code),
	.arrow-label :global(code) {
		font-size: 0.92em;
	}

	/* from one step to the next: a pen arrow and what passes along it */
	.arrow {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 12px 2px 26px;
	}

	.arrow svg {
		flex: none;
		width: 12px;
		height: 24px;
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.arrow-label {
		font-family: var(--font-hand);
		font-size: 17px;
		line-height: 1.2;
		color: var(--accent);
	}

	/* a few lines written out (not from a file): no path, no line numbers */
	.snippet {
		display: block;
		padding: 2px 0;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 500;
		line-height: 1.7;
	}

	.snippet .line {
		display: block;
		padding: 0 12px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: var(--fg);
	}

	.snippet .line.focus {
		background: var(--hi-wash);
	}
</style>
