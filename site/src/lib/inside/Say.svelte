<script>
	import Code from './Code.svelte';
	import Noted from './Noted.svelte';
	import { get_beat } from './state.svelte.js';

	/**
	 * One thing a beat says about one line of code, as a speech bubble right under that line.
	 * A beat can hold several, each on its own line, so the words sit where they apply and no
	 * line number has to be spelled out. Once the reader moves on, the words stay in the flow,
	 * faded with the rest of the beat.
	 * `note`: the short note written on the code. The children are the explanation, which stays
	 * in the flow (a Say without children only writes on the code).
	 * `spot`: the exact text in that line the note is about; only that part gets highlighted.
	 * `strike`: the spot is struck through, for code the words take away ("이 `1`을 지우면").
	 * `point`: the text in that line the arrow points at, when nothing is highlighted.
	 * @type {{ at: number, note?: string, on?: string, spot?: string, strike?: boolean, point?: string, children?: import('svelte').Snippet }}
	 */
	let { at, note, on, spot, strike = false, point, children } = $props();

	const { index, chapter } = get_beat();

	// svelte-ignore state_referenced_locally
	const key = on ?? chapter.on_of(index);
	const file = chapter.file(key);

	let id = $state(0);

	$effect(() => {
		const said = chapter.add_say(index, {
			on: key,
			line: at,
			spot,
			strike,
			point,
			text: note,
			content: children
		});
		id = said;
		return () => chapter.remove_say(index, said);
	});

	// which of the beat's notes this is, in the order they are said
	let order = $derived((chapter.says[index] ?? []).findIndex((say) => say.id === id));

	let range = $derived.by(() => {
		const [from, to] = file?.range ?? [1, file?.code.lines.length ?? 1];
		return /** @type {[number, number]} */ ([Math.max(from, at - 2), Math.min(to, at + 1)]);
	});
</script>

<!-- the words are also on the code as a note; here they stay, marked as a note -->
{#if file}
	<div class="narrow">
		<Code
			code={file.code}
			title=""
			{range}
			lit={[at]}
			closed={file.closed}
			spots={spot ? [{ line: at, text: spot, strike }] : []}
			bubbles={[note ? { line: at, text: note, point } : { line: at, content: children }]}
			wrap
		/>
	</div>
{/if}
{#if children}
	<div class="said">
		<Noted on={key} line={at} {note} {order}>
			{@render children()}
		</Noted>
	</div>
{/if}

<style>
	.said {
		margin: 0 0 14px;
	}

	.said :global(p) {
		margin: 0;
	}

	.narrow {
		display: none;
		margin: 0 0 12px;
	}

	@media (max-width: 1023px) {
		.narrow {
			display: block;
		}
	}
</style>
