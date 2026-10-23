<script>
	import Code from './Code.svelte';
	import Popover from './Popover.svelte';
	import { get_beat } from './state.svelte.js';

	/**
	 * Words in a list or a summary that stand for lines on the stage ("요소 만들기"): pointing at
	 * them (or focusing them) lights those lines, with the job's number circled beside them, so
	 * the reader can look back at each item's code without going back to its beat. Underlined by
	 * hand, like other words that point at code. Where there is no stage (a phone), tapping them
	 * opens those lines in a bottom sheet instead.
	 *
	 * @type {{
	 *   lines: Record<string, number[]>,
	 *   badge?: number,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { lines, badge, children } = $props();

	const { chapter } = get_beat();

	let narrow = $state(false);

	$effect(() => {
		const query = matchMedia('(max-width: 1023px), (hover: none)');
		const update = () => (narrow = query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});

	/** @param {PointerEvent | FocusEvent} event */
	function show(event) {
		if (narrow || (event instanceof PointerEvent && event.pointerType === 'touch')) return;
		chapter.peek = { lines, badge };
	}

	function hide() {
		chapter.peek = null;
	}

	let files = $derived(
		Object.entries(lines).flatMap(([key, only]) => {
			const file = chapter.file(key);
			return file && only.length ? [{ file, only }] : [];
		})
	);
</script>

{#if narrow}
	<Popover label="코드 보기">
		{#snippet trigger()}<span class="peek pen-underline">{@render children()}</span>{/snippet}
		{#each files as { file, only } (file.key)}
			<Code
				code={file.code}
				title={file.title}
				{only}
				badges={badge ? Object.fromEntries(only.map((n) => [n, badge])) : {}}
				badged={file.badges}
				lit={only}
				wrap
			/>
		{/each}
	</Popover>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<span
		class="peek pen-underline"
		tabindex="0"
		role="note"
		onpointerenter={show}
		onpointerleave={hide}
		onfocusin={show}
		onfocusout={hide}>{@render children()}</span
	>
{/if}

<style>
	.peek {
		cursor: var(--cursor);
		outline: none;
	}
</style>
