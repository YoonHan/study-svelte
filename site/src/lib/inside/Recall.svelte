<script>
	import Popover from './Popover.svelte';
	import RecallCard from './RecallCard.svelte';
	import { get_chapter } from './state.svelte.js';

	/**
	 * A name the reader met earlier in the chapter and may have forgotten by now: pointing at
	 * it brings back what it is, with the line it comes from. The same reminder opens from the
	 * name on the code (see Stage.svelte).
	 *
	 * Also for earlier passages ("질문 1의 해설"), with `plain` words instead of code: whenever the
	 * words refer back to something, the reader can bring it back without scrolling.
	 *
	 * @type {{ word: string, plain?: boolean, children: import('svelte').Snippet }}
	 */
	let { word, plain = false, children } = $props();

	const chapter = get_chapter();
	// svelte-ignore state_referenced_locally
	const recall = chapter.recalls[word];
</script>

{#if recall}
	<Popover label="{word} 다시 보기">
		{#snippet trigger()}{#if plain}<span class="words">{@render children()}</span>{:else}<code
					class="words">{@render children()}</code
				>{/if}{/snippet}
		<RecallCard {recall} />
	</Popover>
{:else}
	<code>{@render children()}</code>
{/if}

<style>
	.words {
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, var(--accent) 60%, transparent);
		text-underline-offset: 3px;
	}
</style>
