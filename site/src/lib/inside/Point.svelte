<script>
	import { get_chapter } from './state.svelte.js';

	/**
	 * Words that point at a part of the code on the stage ("줄 옆의 표시"): while the reader
	 * points at them, that part is marked there, so the words never leave the reader looking
	 * for what they mean.
	 *
	 * `from`: for an unknown part, which one (its first line); without it, all of them.
	 *
	 * @type {{ on: string, part: 'marks' | 'closed', from?: number, children: import('svelte').Snippet }}
	 */
	let { on, part, from, children } = $props();

	const chapter = get_chapter();

	/** @param {PointerEvent} event */
	function enter(event) {
		// touch has no hover: a tap would leave the part marked
		if (event.pointerType !== 'touch') chapter.pointing = { on, part, from };
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class="point pen-underline"
	onpointerenter={enter}
	onpointerleave={() => (chapter.pointing = null)}
	onfocusin={() => (chapter.pointing = { on, part, from })}
	onfocusout={() => (chapter.pointing = null)}>{@render children()}</span
>

<style>
	/* underlined by hand (`.pen-underline`, app.css) */
	.point {
		cursor: var(--cursor);
	}
</style>
