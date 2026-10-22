<script>
	import { get_beat } from '../state.svelte.js';
	import { runtime, probe, run } from '../runtime.js';
	import { define_widget } from './widget.js';
	import Highlight from '../Highlight.svelte';
	import Flags from '../Flags.svelte';
	import { inline_code } from '../text.js';
	import { slide } from 'svelte/transition';

	/**
	 * Clones a custom element both ways with 5.0.0's `template()`, then passes it a value with
	 * `$.set_custom_element_data` before it is inserted, exactly where the compiled code does.
	 *
	 * The two columns use different tag names on purpose: 5.0.0 caches each tag's setters by
	 * `nodeName` the first time it looks (`attributes.js:315-319`), so one name shared by both
	 * columns would keep whichever result ran first.
	 */

	const COLUMNS = [
		{ flags: 0, tag: 'clone-widget' },
		{ flags: 2, tag: 'import-widget' }
	];

	const VALUES = [
		{ label: '문자열 "hello"', source: '"hello"', value: 'hello' },
		{
			label: '객체 { items: [1, 2, 3] }',
			source: '{ items: [1, 2, 3] }',
			value: { items: [1, 2, 3] }
		}
	];

	/**
	 * @typedef {object} Result
	 * @property {string} copy
	 * @property {boolean} same_document
	 * @property {boolean} upgraded
	 * @property {string} received
	 * @property {string} attribute
	 */

	const { index, chapter } = get_beat();

	const reduce =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	let picked = $state(1);

	/** @type {(Result | undefined)[]} */
	let results = $state([undefined, undefined]);

	/** @type {HTMLElement | undefined} */
	let stage = $state();

	/** @param {unknown} value */
	function show(value) {
		if (typeof value === 'string') return JSON.stringify(value);
		// written the way it appears in source: { items: [1, 2, 3] }
		return JSON.stringify(value)
			.replace(/"(\w+)":/g, '$1: ')
			.replace(/,/g, ', ')
			.replace(/^\{(.*)\}$/, '{ $1 }');
	}

	// the first results wait for the run button to fold away; later ones come in at once
	let cascade_at = $state('200ms');

	function run_both() {
		if (!stage) return;
		if (results[0]) cascade_at = '0ms';
		const value = VALUES[picked].value;
		results = COLUMNS.map(({ flags, tag }) => {
			const Widget = define_widget(tag);
			const root = runtime.template(`<${tag}></${tag}>`, flags);
			/** @type {Result | undefined} */
			let result;
			const stop = run(/** @type {HTMLElement} */ (stage), (anchor) => {
				const seen = probe(() => root());
				const widget = /** @type {any} */ (seen.result);
				runtime.set_custom_element_data(widget, 'label', value);
				result = {
					copy: seen.copies.join(', '),
					same_document: widget.ownerDocument === document,
					upgraded: widget instanceof Widget,
					received: widget.has_received ? show(widget.received) : '호출되지 않음',
					attribute: widget.hasAttribute('label') ? show(widget.getAttribute('label')) : '없음'
				};
				runtime.append(anchor, widget);
			});
			stop();
			return result;
		});
		chapter.light(index, [52]);
	}

	/** @param {number} i */
	function pick(i) {
		picked = i;
		if (results[0]) run_both();
	}

	/** @type {[string, keyof Result][]} */
	const ROWS = [
		['복제에 쓰인 함수', 'copy'],
		['복제본이 현재 페이지의 document에 속함 (`ownerDocument === document`)', 'same_document'],
		['`Widget` 클래스의 인스턴스임 (`instanceof Widget`)', 'upgraded'],
		['label setter가 받은 값', 'received'],
		['label attribute', 'attribute']
	];
</script>

<p class="intro">
	커스텀 엘리먼트 <code>&lt;my-widget&gt;</code>을 <code>cloneNode</code>로 복제한 경우(질문 4에서
	가정한 경우)와 <code>importNode</code>로 복제한 경우(실제 컴파일 결과)에 <code>label</code>에 값을
	넘겨 봅니다. 순서는 컴파일 결과가 마운트할 때 실행하는 그대로, 문서에 넣기 전에 넘깁니다. 표에서
	<code>label</code> setter가 값을 받았는지와 attribute에 무엇이 남았는지를 질문 4의 예측과 비교해 보세요.
</p>

<Flags items={VALUES.map((v) => v.label)} selected={picked} label="넘길 값" onchoose={pick}>
	<Highlight
		code={[
			'// 1. <my-widget>의 템플릿을 복제해서 커스텀 엘리먼트를 얻고',
			'var my_widget = root();',
			// 학습자 문장(2번, 3번 주석): 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다.
			'// 2. label에 값을 넘긴 뒤',
			`$.set_custom_element_data(my_widget, "label", ${VALUES[picked].source});`,
			'// 3. 문서에 넣습니다',
			'$.append($$anchor, my_widget);'
		].join('\n')}
		circle={VALUES[picked].source}
	/>
</Flags>

<!-- run once: after that the table follows the chosen value, so the button goes (200ms) -->
{#if !results[0]}
	<div class="controls" out:slide={{ duration: reduce ? 0 : 200 }}>
		<button class="run pen-button" onclick={run_both}>두 방식으로 실행</button>
	</div>
{/if}

<div class="table-wrap" style:--cascade-at={cascade_at}>
	<!-- fixed column widths: the table keeps its shape while the results fill the "?" cells -->
	<table>
		<colgroup><col /><col class="result-col" /><col class="result-col" /></colgroup>
		<thead>
			<tr>
				<th></th>
				{#each COLUMNS as c (c.tag)}
					<th>
						<code>{c.flags ? 'importNode' : 'cloneNode'}</code>
						<span class="sub">{c.flags ? '실제 컴파일 결과' : '질문 4에서 가정한 경우'}</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each ROWS as [label, key], row (key)}
				<tr>
					<th scope="row">{@html inline_code(label)}</th>
					{#each results as r, i (i)}
						{@const value = r?.[key]}
						<td class:yes={value === true} class:no={value === false} class:empty={!r}>
							<!-- another value: measured again, so the results come in again -->
							{#if !r}?{:else}{#key picked}<span class="value cascade" style:--i={row}
										>{#if typeof value === 'boolean'}{value}{:else}<code>{value}</code>{/if}</span
									>{/key}{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="stage" bind:this={stage} hidden></div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		padding-top: 12px;
	}

	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.run {
		padding: 3px 16px 1px;
		font-size: 19px;
	}

	.table-wrap {
		margin-top: 12px;
		overflow-x: auto;
	}

	.value {
		display: block;
	}

	table {
		width: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		font-size: 13px;
	}

	.result-col {
		width: 27%;
	}

	th,
	td {
		padding: 7px 10px;
		border-bottom: 1px solid var(--line);
		text-align: left;
		vertical-align: top;
	}

	thead th {
		font-weight: 700;
	}

	.sub {
		display: block;
		font-size: 11px;
		font-weight: 400;
		color: var(--fg-3);
	}

	tbody th {
		font-weight: 500;
		color: var(--fg-2);
	}

	td {
		font-family: var(--font-mono);
		/* results filling in after a run: color only (emil-design-eng: ease) */
		transition:
			color 200ms ease,
			background-color 200ms ease;
	}

	td.empty {
		color: var(--fg-3);
	}

	td.yes {
		color: var(--ok);
		font-weight: 700;
	}

	td.no {
		color: var(--accent);
		font-weight: 700;
	}

	td code {
		font-size: 12px;
		overflow-wrap: anywhere;
	}
</style>
