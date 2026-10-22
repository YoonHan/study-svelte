<script>
	import { get_beat } from './state.svelte.js';

	/**
	 * A handwritten bracket the beat draws on the code, to the right of a few lines, with a
	 * short note beside it ("형제"): it says something about those lines together, which a
	 * note under one line cannot. Renders nothing in the flow.
	 *
	 * @type {{ on?: string, from: number, to: number, note: string }}
	 */
	let { on, from, to, note } = $props();

	const { index, chapter } = get_beat();

	$effect(() => {
		const id = chapter.add_brace(index, {
			on: on ?? chapter.on_of(index),
			from,
			to,
			text: note
		});
		return () => chapter.remove_brace(index, id);
	});
</script>
