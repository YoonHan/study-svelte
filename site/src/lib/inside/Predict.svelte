<script>
	import { get_beat, get_step } from './state.svelte.js';
	import { inline_code } from './text.js';

	/**
	 * The reader commits to a guess before the explanation. Once the explanation is revealed,
	 * the guess is shown against the answer.
	 * @type {{ options: string[], answer: number }}
	 */
	let { options, answer } = $props();

	const { index, chapter } = get_beat();
	const step = get_step();
	let choice = $derived(chapter.predictions[index]);
	// the guess is checked once its question's explanation starts
	let revealed = $derived(step?.answer != null && chapter.is_revealed(step.answer));
</script>

<fieldset class="predict" disabled={revealed}>
	<legend>먼저 예측해 보세요</legend>
	{#each options as option, i (option)}
		<label
			class="option"
			class:chosen={choice === i}
			class:right={revealed && i === answer}
			class:wrong={revealed && choice === i && i !== answer}
		>
			<input
				type="radio"
				name="predict-{index}"
				checked={choice === i}
				onchange={() => chapter.predict(index, i)}
			/>
			<span>{@html inline_code(option)}</span>
			{#if revealed && i === answer}<span class="tag">정답</span>{/if}
			{#if revealed && choice === i && i !== answer}<span class="tag">내 예측</span>{/if}
		</label>
	{/each}
</fieldset>

<style>
	.predict {
		display: grid;
		gap: 6px;
		margin: 18px 0 8px;
		padding: 0;
		border: 0;
	}

	/* floated so the legend lays out like an ordinary line (no clipping at the fieldset edge) */
	legend {
		float: left;
		width: 100%;
		margin: 0 0 6px;
		padding: 0;
		font-family: var(--font-hand);
		font-size: 21px;
		line-height: 1.4;
		color: var(--accent);
	}

	legend + :global(*) {
		clear: both;
	}

	/* choices written as a list; the chosen one gets circled in pen */
	.option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 14px;
		border: 1.25px solid transparent;
		border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
		cursor: pointer;
		transition:
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.option :global(code) {
		font-size: 0.88em;
	}

	/* pointing at a choice pencils its outline; the chosen one keeps its pen colour */
	@media (hover: hover) and (pointer: fine) {
		.predict:not(:disabled) .option:not(.chosen):hover {
			border-color: var(--line);
		}

		.predict:not(:disabled) .option.chosen:hover {
			background: var(--accent-soft);
		}
	}

	.option.chosen {
		border-color: var(--accent);
	}

	.option.right {
		border-color: var(--ok);
		background: color-mix(in oklab, var(--ok) 8%, transparent);
	}

	.option.wrong {
		border-color: var(--red);
		background: var(--red-soft);
	}

	:disabled .option {
		cursor: default;
	}

	input {
		margin: 0;
		accent-color: var(--focus);
	}

	.tag {
		flex: none;
		margin-left: auto;
		white-space: nowrap;
		font-family: var(--font-hand);
		font-size: 19px;
	}

	.right .tag {
		color: var(--ok);
	}

	.wrong .tag {
		color: var(--red);
	}
</style>
