<script>
	import { slide } from 'svelte/transition';
	import { runtime, run } from '../runtime.js';
	import { COUNTER_TEMPLATE } from '#lib/counter.js';

	/**
	 * Makes the counter's nodes both ways, 100 times each, in this page: one by
	 * `document.createElement` and `append`, one by 5.0.0's `template()` (parse once, then
	 * `cloneNode`). Counts the HTML parses, the DOM calls that make nodes, and the nodes one
	 * mount ends up with.
	 */

	const MOUNTS = 100;

	/**
	 * @typedef {object} Result
	 * @property {number} parses
	 * @property {number} calls DOM calls that make or attach nodes, the parse's own left out
	 * @property {number} nodes nodes one mount ends up with, the fragment included
	 * @property {{ element: number, text: number, fragment: number }} kinds
	 */

	/** @type {[Result | undefined, Result | undefined]} */
	let results = $state([undefined, undefined]);

	/** @type {HTMLElement | undefined} */
	let stage = $state();

	const reduce =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/**
	 * Runs `fn` while counting the DOM calls that make or attach nodes. Creating a `<template>`
	 * is how the runtime parses HTML, so it is counted as a parse instead.
	 * @template T
	 * @param {() => T} fn
	 */
	function count_calls(fn) {
		const seen = { parses: 0, calls: 0 };
		// the document's own methods are wrapped on `document` itself: other experiments on
		// this page wrap them there too (runtime.js `probe`), which would hide a prototype's
		/** @type {[any, string][]} */
		const spots = [
			[document, 'createElement'],
			[document, 'createDocumentFragment'],
			[document, 'importNode'],
			[Node.prototype, 'cloneNode'],
			[Element.prototype, 'append'],
			[DocumentFragment.prototype, 'append']
		];
		const originals = spots.map(([target, name]) => target[name]);
		const owned = spots.map(([target, name]) => Object.hasOwn(target, name));
		spots.forEach(([target, name], i) => {
			target[name] = function (/** @type {any[]} */ ...args) {
				if (name === 'createElement' && args[0] === 'template') seen.parses++;
				else seen.calls++;
				return originals[i].apply(this, args);
			};
		});
		try {
			return { result: fn(), ...seen };
		} finally {
			// put each back as it was: an own property again, or none
			spots.forEach(([target, name], i) => {
				if (owned[i]) target[name] = originals[i];
				else delete target[name];
			});
		}
	}

	/** @param {Node} node */
	function kinds_of(node) {
		const kinds = { element: 0, text: 0, fragment: 0 };
		/** @param {Node} n */
		const walk = (n) => {
			if (n.nodeType === 1) kinds.element++;
			else if (n.nodeType === 3) kinds.text++;
			else if (n.nodeType === 11) kinds.fragment++;
			n.childNodes.forEach(walk);
		};
		walk(node);
		return kinds;
	}

	/** the counter's nodes, made one by one (the code shown above) */
	function by_create() {
		var fragment = document.createDocumentFragment();
		var button = document.createElement('button');
		button.append(' ');
		var p = document.createElement('p');
		p.append(' ');
		var button_1 = document.createElement('button');
		button_1.append('초기화');
		fragment.append(button, ' ', p, ' ', button_1);
		return fragment;
	}

	/**
	 * @param {Result} total
	 * @param {Node} last
	 */
	function finish(total, last) {
		const kinds = kinds_of(last);
		return { ...total, nodes: kinds.element + kinds.text + kinds.fragment, kinds };
	}

	function run_both() {
		if (!stage) return;

		// createElement, 100 times
		let created = { parses: 0, calls: 0, nodes: 0, kinds: { element: 0, text: 0, fragment: 0 } };
		/** @type {Node | undefined} */
		let last;
		for (let i = 0; i < MOUNTS; i++) {
			const seen = count_calls(by_create);
			created.parses += seen.parses;
			created.calls += seen.calls;
			last = seen.result;
		}
		const first = finish(created, /** @type {Node} */ (last));

		// template(): the module-level line once, then root() for each mount, as the compiled
		// counter does (root() records its nodes on the running component, so it runs inside one)
		let cloned = { parses: 0, calls: 0, nodes: 0, kinds: { element: 0, text: 0, fragment: 0 } };
		const stop = run(stage, () => {
			const root = runtime.template(COUNTER_TEMPLATE, 1);
			for (let i = 0; i < MOUNTS; i++) {
				const seen = count_calls(() => root());
				cloned.parses += seen.parses;
				cloned.calls += seen.calls;
				last = seen.result;
			}
		});
		const second = finish(cloned, /** @type {Node} */ (last));
		stop();

		results = [first, second];
	}

	/** @type {[string, (r: Result) => string][]} */
	const ROWS = [
		['HTML 파싱', (r) => `${r.parses}번`],
		['노드를 만들거나 붙이는 DOM 함수 호출', (r) => `${r.calls}번`],
		['마운트 한 번에 생기는 노드', (r) => `${r.nodes}개`],
		[
			'fragment + 요소 + 텍스트',
			(r) => `${r.kinds.fragment} + ${r.kinds.element} + ${r.kinds.text}`
		]
	];
</script>

<p class="intro">
	두 방식으로 카운터의 노드를 {MOUNTS}번씩 만들어 봅니다. 템플릿을 복제하는 방식은 이 장에서 살펴본
	<code>template()</code>을 그대로 실행합니다. 두 방식이 HTML을 몇 번 파싱하는지, 노드를 만들거나
	붙이는 DOM 함수를 몇 번 부르는지, 마운트 한 번에 노드가 몇 개 생기는지 비교해 보세요.
</p>

<!-- run once: the counts never change after that, so the button goes (200ms) -->
{#if !results[0]}
	<div class="controls" out:slide={{ duration: reduce ? 0 : 200 }}>
		<button class="run pen-button" onclick={run_both}>두 방식으로 {MOUNTS}번씩 마운트</button>
	</div>
{/if}

<div class="table-wrap" style:--cascade-at="200ms">
	<!-- fixed column widths: the table keeps its shape while the counts fill the "?" cells -->
	<table>
		<colgroup><col /><col class="result-col" /><col class="result-col" /></colgroup>
		<thead>
			<tr>
				<th></th>
				<th>하나씩 만드는 방식<span class="sub"><code>create<wbr />Element</code></span></th>
				<th>템플릿을 복제하는 방식<span class="sub"><code>template()</code></span></th>
			</tr>
		</thead>
		<tbody>
			{#each ROWS as [label, show], row (label)}
				<tr>
					<th scope="row">{label}</th>
					{#each results as r, i (i)}
						<td class:empty={!r}>
							{#if !r}?{:else}<span class="value cascade" style:--i={row}>{show(r)}</span>{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="stage" bind:this={stage} hidden></div>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.controls {
		display: flex;
		padding-top: 4px;
	}

	.run {
		padding: 3px 16px 1px;
		font-size: 19px;
	}

	.table-wrap {
		margin-top: 12px;
		overflow-x: auto;
	}

	table {
		width: 100%;
		table-layout: fixed;
		border-collapse: collapse;
		font-size: 13px;
	}

	.result-col {
		width: 30%;
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
		transition: color 200ms ease;
	}

	td.empty {
		color: var(--fg-3);
	}

	.value {
		display: block;
	}
</style>
