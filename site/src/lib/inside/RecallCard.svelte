<script>
	import SourceLines from './SourceLines.svelte';
	import { get_chapter } from './state.svelte.js';
	import { inline_code } from './text.js';

	/**
	 * What a reminder card says. For a variable with a value (see template/trace.js): the value
	 * it holds while the example runs, then where it comes from. For a name met earlier: one
	 * sentence about it, then the line it comes from.
	 * @type {{ recall: import('./state.svelte.js').Recall, word?: string }}
	 */
	let { recall, word } = $props();

	const chapter = get_chapter();
	let file = $derived(chapter.file(recall.on));
</script>

{#if recall.value !== undefined}
	{#if recall.when}<span class="when">{@html inline_code(recall.when)}</span>{/if}
	<span class="value"><span class="name">{word}</span> = <b>{recall.value}</b></span>
{/if}
<span class="said">{@html inline_code(recall.text)}</span>
{#if file && recall.lines}
	<span class="from">
		<span class="where">{file.title}</span>
		<!-- the line it comes from is the one to look at -->
		<SourceLines
			code={file.code}
			lines={recall.lines}
			focus={Array.from(
				{ length: recall.lines[1] - recall.lines[0] + 1 },
				(_, i) => /** @type {[number, number]} */ (recall.lines)[0] + i
			)}
			path={false}
		/>
	</span>
{/if}

<style>
	.when :global(code) {
		padding: 0;
		background: none;
		font-family: var(--font-mono);
		font-size: 0.72em;
		color: inherit;
	}

	.when {
		display: block;
		padding: 0 14px 2px;
		font-family: var(--font-hand);
		font-size: 17px;
		color: var(--fg-2);
	}

	/* the value, set like a line of code */
	.value {
		display: block;
		max-width: 46ch;
		padding: 0 14px 6px;
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
		overflow-wrap: anywhere;
		color: var(--fg);
	}

	.value b {
		font-weight: 600;
		color: var(--accent);
	}

	.said {
		display: block;
		max-width: 46ch;
		padding: 0 14px 8px;
		font-family: var(--font-sans);
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg);
	}

	.said :global(code) {
		font-size: 0.9em;
	}

	.from {
		display: block;
		padding-top: 6px;
		border-top: 1px solid var(--line);
	}

	.where {
		display: block;
		padding: 0 12px 2px;
		font-family: var(--font-hand);
		font-size: 17px;
		color: var(--fg-2);
	}
</style>
