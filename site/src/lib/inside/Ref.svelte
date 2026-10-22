<script>
	import Popover from './Popover.svelte';
	import SourceLines from './SourceLines.svelte';

	/**
	 * Words that show the source they come from: pointing at them (or focusing them) opens a
	 * small card with those lines of svelte@5.0.0. Replaces bare "file:line" citations where the
	 * reader would want to see the code itself. Shown as inline code unless `plain`. `focus`:
	 * the lines the words are about, highlighted among the lines shown around them.
	 *
	 * @type {{
	 *   code: import('#lib/types.js').CodeFile,
	 *   lines: [number, number],
	 *   focus?: number[],
	 *   plain?: boolean,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { code, lines, focus, plain = false, children } = $props();

	let file = $derived(code.file.split('/').pop());
</script>

<Popover label="{file} {lines[0]}~{lines[1]}행 보기">
	{#snippet trigger()}
		{#if plain}<span class="words">{@render children()}</span>{:else}<code class="words"
				>{@render children()}</code
			>{/if}
	{/snippet}
	<SourceLines {code} {lines} {focus} />
</Popover>

<style>
	.words {
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, var(--accent) 60%, transparent);
		text-underline-offset: 3px;
	}
</style>
