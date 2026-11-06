<script>
	import { slide } from 'svelte/transition';
	import { runtime, run } from '../runtime.js';
	import { COUNTER_TEMPLATE } from '#lib/counter.js';
	import Flags from '../Flags.svelte';
	import Highlight from '../Highlight.svelte';

	/**
	 * Times the counter's nodes made both ways, 10,000 mounts each, in the reader's browser,
	 * with 0, 5 or 50 unchanging paragraphs added at its end. The template way includes what
	 * the compiled counter does after cloning: walking to the nodes it keeps with
	 * `$.first_child`, `$.child` and `$.sibling` (5.0.0's own functions).
	 */

	const MOUNTS = 10000;
	const ROUNDS = 5;
	const EXTRAS = [0, 5, 50];

	let picked = $state(0);
	/** @type {{ create: number, clone: number } | undefined} */
	let result = $state();
	let measuring = $state(false);
	/** @type {HTMLElement | undefined} */
	let stage = $state();

	const reduce =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** @param {number} extra */
	const help_markup = (extra) =>
		Array.from({ length: extra }, (_, i) => ` <p>도움말 ${i + 1}</p>`).join('');

	/**
	 * the counter's markup (one comment line, to fit a phone) and the paragraphs added to it;
	 * the block keeps six lines' height for every choice (see the style), so nothing below moves
	 */
	let source = $derived(
		[
			'<!-- 카운터의 마크업 -->',
			...(EXTRAS[picked] === 0
				? ['<!-- 더한 문단 없음 -->']
				: EXTRAS[picked] === 5
					? Array.from({ length: 5 }, (_, i) => `<p>도움말 ${i + 1}</p>`)
					: [
							'<p>도움말 1</p>',
							'<p>도움말 2</p>',
							'<p>도움말 3</p>',
							'<p>도움말 4</p>',
							`<!-- … 도움말 ${EXTRAS[picked]}까지 -->`
						])
		].join('\n')
	);

	/** @param {number} extra */
	function make_by_create(extra) {
		return () => {
			var fragment = document.createDocumentFragment();
			var button = document.createElement('button');
			button.append(' ');
			var p = document.createElement('p');
			p.append(' ');
			var button_1 = document.createElement('button');
			button_1.append('초기화');
			// the added paragraphs go in with the rest, in the one append (as in the text's code)
			/** @type {(Node | string)[]} */
			var helps = [];
			for (let i = 0; i < extra; i++) {
				var help = document.createElement('p');
				help.append(`도움말 ${i + 1}`);
				helps.push(' ', help);
			}
			fragment.append(button, ' ', p, ' ', button_1, ...helps);
			return fragment;
		};
	}

	/**
	 * @param {() => void} fn
	 * @returns {number} milliseconds for MOUNTS calls
	 */
	function time(fn) {
		for (let i = 0; i < 2000; i++) fn(); // warm up
		const start = performance.now();
		for (let i = 0; i < MOUNTS; i++) fn();
		return performance.now() - start;
	}

	/** @param {number[]} values */
	const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

	async function measure() {
		if (!stage || measuring) return;
		measuring = true;
		const extra = EXTRAS[picked];
		// let the "재는 중" line paint before the page is busy
		await new Promise((resolve) => setTimeout(resolve, 30));

		const by_create = make_by_create(extra);
		/** @type {number[]} */
		const create = [];
		/** @type {number[]} */
		const clone = [];
		for (let round = 0; round < ROUNDS; round++) {
			create.push(time(by_create));
			// root() records its nodes on the running component, so it runs inside one
			const stop = run(/** @type {HTMLElement} */ (stage), () => {
				const root = runtime.template(COUNTER_TEMPLATE + help_markup(extra), 1);
				clone.push(
					time(() => {
						var fragment = root();
						var button = runtime.first_child(fragment);
						var text = runtime.child(button);
						var p = runtime.sibling(button, 2);
						var text_1 = runtime.child(p);
						var button_1 = runtime.sibling(p, 2);
					})
				);
			});
			stop();
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		result = { create: median(create), clone: median(clone) };
		measuring = false;
	}

	/** @param {number} i */
	function choose(i) {
		picked = i;
		// after the first run, another choice is measured at once
		if (result) measure();
	}

	/** @param {number} ms */
	const ms = (ms) => `${ms.toFixed(1)}ms`;
</script>

<p class="intro">
	카운터 끝에 내용이 바뀌지 않는 문단을 더하고, 두 방식으로 1만 번씩 마운트하는 데 걸린 시간을 이
	브라우저에서 잽니다. 템플릿을 복제하는 방식은 복제한 뒤에 다룰 노드를
	<code>$.first_child</code>, <code>$.child</code>, <code>$.sibling</code>으로 찾아가는 일까지 함께
	잽니다. 더한 문단 수를 바꿔 가며 두 시간이 어떻게 달라지는지 비교해 보세요.
</p>

<Flags
	items={EXTRAS.map((n) => (n === 0 ? '더하지 않음' : `문단 ${n}개`))}
	selected={picked}
	label="카운터 끝에 더할 문단"
	onchoose={choose}
>
	<div class="source"><Highlight lang="svelte" code={source} /></div>
</Flags>

<!-- run once: after that a new choice is measured at once, so the button goes (200ms) -->
{#if !result}
	<div class="controls" out:slide={{ duration: reduce ? 0 : 200 }}>
		<button class="run pen-button" onclick={measure} disabled={measuring}
			>1만 번씩 마운트해서 재기</button
		>
	</div>
{/if}

<div class="table-wrap" style:--cascade-at="200ms" aria-live="polite">
	<table>
		<colgroup><col /><col class="result-col" /></colgroup>
		<tbody>
			{#each [['createElement로 하나씩 만드는 방식', 'create'], ['템플릿을 복제하고 찾아가는 방식', 'clone']] as [label, key], row (key)}
				<tr>
					<th scope="row">{label}</th>
					<td class:empty={!result || measuring}>
						{#if measuring}재는 중…{:else if !result}?{:else}{#key result}<span
									class="value cascade"
									style:--i={row}>{ms(result[/** @type {'create' | 'clone'} */ (key)])}</span
								>{/key}{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="note">
		1만 번 마운트에 걸린 시간을 {ROUNDS}번 재서 가운데 값을 보여 줍니다. 값은 기기와 브라우저마다
		다릅니다.
	</p>
</div>

<div class="stage" bind:this={stage} hidden></div>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	/* six lines tall for every choice: the "?" table and what follows stay put */
	.source :global(.hl) {
		min-height: calc(6lh + 20px);
	}

	.controls {
		display: flex;
		padding-top: 12px;
	}

	.run {
		padding: 3px 16px 1px;
		font-size: 19px;
	}

	.table-wrap {
		margin-top: 12px;
	}

	table {
		width: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		font-size: 13px;
	}

	.result-col {
		width: 32%;
	}

	th,
	td {
		padding: 7px 10px;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
	}

	th {
		font-weight: 500;
		color: var(--fg-2);
	}

	td {
		font-family: var(--font-mono);
		transition: color 200ms ease;
	}

	td.empty {
		color: var(--fg-3);
	}

	.value {
		display: block;
	}

	.note {
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--fg-3);
	}
</style>
