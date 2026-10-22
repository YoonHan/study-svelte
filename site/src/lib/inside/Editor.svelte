<script>
	import { escape_html, highlight } from './highlight.js';

	/**
	 * An editable, highlighted code box: a transparent textarea over a highlighted copy of the
	 * same text, both in identical metrics, so the caret sits on the colored code.
	 * @type {{ value: string, lang?: 'svelte' | 'javascript', label: string, oninput?: () => void }}
	 */
	let { value = $bindable(), lang = 'svelte', label, oninput } = $props();

	let html = $state('');

	$effect(() => {
		const input = value;
		let current = true;
		highlight(input, lang).then((result) => {
			if (current) html = result;
		});
		return () => {
			current = false;
		};
	});
</script>

<div class="editor">
	<pre class="hl" aria-hidden="true"><code>{@html html || escape_html(value)}{'\n'}</code></pre>
	<textarea bind:value {oninput} aria-label={label} spellcheck="false" autocapitalize="off"
	></textarea>
</div>

<style>
	.editor {
		position: relative;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		transition: border-color 160ms ease;
	}

	.editor:focus-within {
		border-color: var(--focus);
	}

	pre,
	textarea {
		margin: 0;
		padding: 10px 12px;
		border: 0;
		font-family: var(--font-mono);
		font-size: 12.5px;
		font-weight: 500;
		line-height: 1.7;
		letter-spacing: 0;
		tab-size: 2;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-variant-ligatures: none;
	}

	/*
	 * Both layers must lay out every character identically, or the caret drifts away from the
	 * text: the global `code { font-size: 0.9em }` must not shrink the highlighted copy.
	 */
	pre code {
		font: inherit;
		letter-spacing: inherit;
	}

	/* the highlighted copy sizes the box; the textarea is laid exactly over it */
	pre {
		pointer-events: none;
	}

	textarea {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		resize: none;
		overflow: hidden;
		background: transparent;
		color: transparent;
		caret-color: var(--fg);
		outline: none;
	}

	textarea::selection {
		background: var(--focus-soft);
		color: transparent;
	}
</style>
