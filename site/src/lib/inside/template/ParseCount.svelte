<script>
	import { onMount } from 'svelte';
	import { get_beat } from '../state.svelte.js';
	import { runtime, label_of, probe, run } from '../runtime.js';
	import { COUNTER_TEMPLATE } from '#lib/counter.js';

	/**
	 * Loads the counter's module-level line and mounts the counter again and again, counting
	 * HTML parses (`<template>` elements created) as 5.0.0's `template()` really runs.
	 */

	const MAX_MOUNTS = 4;

	const { index, chapter } = get_beat();

	/** @type {(() => Node) | undefined} */
	let root;

	let loaded = $state(false);
	let parses = $state(0);

	/** what the closure's `node` variable holds: the parsed `<template>`'s content */
	let stored = $state(/** @type {string | undefined} */ (undefined));

	/** @type {{ id: number, text: string }[]} */
	let log = $state([]);

	let mounts = $state(0);

	/** the page the counters are mounted into, drawn by the browser alone */
	/** @type {HTMLIFrameElement | undefined} */
	let frame = $state();

	const PAGE = "<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>";

	// the copies side by side, each under which mount made it, so the page keeps its height as
	// they are added; the counters themselves are not styled
	const LABELS =
		'body{display:flex;margin:8px}.instance{flex:1 1 0;min-width:0;padding:0 10px;border-left:1px dashed #ccc}.instance:first-child{border-left:0;padding-left:0}.instance::before{content:attr(data-label);display:block;font:700 13px sans-serif;color:#d83a00;margin-bottom:6px}';

	/** @param {Document} page */
	function label_style(page) {
		if (page.getElementById('labels')) return;
		const style = page.createElement('style');
		style.id = 'labels';
		style.textContent = LABELS;
		page.head.append(style);
	}

	/** @type {(() => void)[]} */
	let stops = [];

	/** @param {string} text */
	function write(text) {
		log.push({ id: log.length, text });
	}

	/** @param {number} parsed */
	const load_text = (parsed) =>
		`모듈 최상위의 $.template(…)이 실행되었습니다. 클로저 변수를 준비하고 화살표 함수를 반환했고, 그 함수가 root입니다. 이번에 일어난 HTML 파싱: ${parsed}번`;

	/** @param {number} n @param {boolean} parsed */
	const mount_text = (n, parsed) =>
		parsed
			? `${ordinal(n)} root(): node가 undefined라서 HTML을 파싱해 node에 저장한 뒤, 복제했습니다.`
			: `${ordinal(n)} root(): node가 이미 있어서 파싱을 건너뛰고 복제만 했습니다.`;

	// every step the log will show, laid out (unseen) from the start so nothing below it moves
	// as the steps come in
	const PLANNED = [
		load_text(0),
		...Array.from({ length: MAX_MOUNTS }, (_, i) => mount_text(i + 1, i === 0))
	];

	// what node will hold once filled, laid out (unseen) under 'undefined' for the same reason
	let filled = $state('');

	/**
	 * `#fragment (a, b, c)` in pieces that each stay on one line ("#fragment (", "a,", "b,",
	 * "c)"): a line breaks between them and only there. The spaces after the commas are left
	 * out of the pieces (put back between them); after "(" there is no space, only a place to
	 * break.
	 * @param {string} text
	 */
	const parts = (text) => text.split(/(?<=\()|(?<=,) /);

	let part_list = $derived(parts(stored ?? filled));

	function load() {
		const seen = probe(() => runtime.template(COUNTER_TEMPLATE, 1));
		root = /** @type {() => Node} */ (seen.result);
		parses += seen.parsed.length;
		loaded = true;
		write(load_text(seen.parsed.length));
		chapter.light(index, [28, 29, 32, 40]);
	}

	function mount_once() {
		const page = frame?.contentDocument;
		if (!root || !page) return;
		label_style(page);
		const template_fn = root;
		const box = page.createElement('div');
		box.className = 'instance';
		box.dataset.label = `마운트 ${mounts + 1}`;
		page.body.append(box);

		/** @type {import('../runtime.js').Probe | undefined} */
		let seen;
		stops.push(
			run(box, (anchor) => {
				const probed = probe(() => template_fn());
				seen = probed;
				runtime.append(anchor, probed.result);
			})
		);
		if (!seen) return;

		mounts += 1;
		parses += seen.parsed.length;
		if (seen.parsed.length > 0) {
			const content = seen.parsed[0].content;
			stored = `#fragment (${[...content.childNodes].map(label_of).join(', ')})`;
			write(mount_text(mounts, true));
			chapter.light(index, [46, 47, 48, 52]);
		} else {
			write(mount_text(mounts, false));
			chapter.light(index, [46, 52]);
		}
	}

	function restart() {
		for (const stop of stops) stop();
		stops = [];
		frame?.contentDocument?.body.replaceChildren();
		root = undefined;
		loaded = false;
		parses = 0;
		mounts = 0;
		stored = undefined;
		log = [];
		chapter.light(index, []);
	}

	onMount(() => {
		const parsed = document.createElement('template');
		parsed.innerHTML = COUNTER_TEMPLATE;
		filled = `#fragment (${[...parsed.content.childNodes].map(label_of).join(', ')})`;
		return () => {
			for (const stop of stops) stop();
		};
	});

	/** @param {number} n 1 → "첫 번째", 2 → "두 번째", … */
	function ordinal(n) {
		const words = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
		return `${words[n - 1] ?? n} 번째`;
	}
</script>

<p class="intro">
	모듈을 한 번 불러온 뒤 카운터를 여러 번 마운트하면서, 마운트 횟수와 HTML 파싱 횟수가 어떻게
	달라지는지, <code>root</code>가 기억하는 <code>node</code>가 언제 바뀌는지 질문에서 고른 예측과
	비교해 보세요.
</p>

<div class="actions">
	<button class="pen-button" onclick={load} disabled={loaded}>① 모듈 불러오기</button>
	<button class="pen-button" onclick={mount_once} disabled={!loaded || mounts >= MAX_MOUNTS}
		>② 카운터 마운트</button
	>
	<button class="quiet pen-button" onclick={restart} disabled={!loaded}>처음부터</button>
</div>

<div class="panes">
	<!-- the two counts the question compares, side by side and equally large -->
	<div class="pane count" aria-live="polite">
		<div class="stat">
			<p class="title">마운트 횟수</p>
			<p class="big mounts">{mounts}</p>
		</div>
		<div class="stat">
			<p class="title">HTML 파싱 횟수</p>
			<p class="big">{parses}</p>
		</div>
	</div>
	<div class="pane closure">
		<p class="title"><code>root</code>가 기억하는 클로저 변수</p>
		<!-- the variables and the note before loading share one cell: the pane keeps its height -->
		<div class="swap">
			<dl class:unseen={!loaded} aria-hidden={!loaded}>
				<dt>is_fragment</dt>
				<dd>true</dd>
				<dt>use_import_node</dt>
				<dd>false</dd>
				<dt>node</dt>
				<!-- both texts in one cell, the unseen one keeping the room the other needs -->
				<dd class="swap" class:filled={stored}>
					<span class:unseen={stored}>undefined</span><span
						class:unseen={!stored}
						aria-hidden={!stored}
						>{#each part_list as part, n (n)}{#if n > 0}{#if part_list[n - 1].endsWith('(')}<wbr
									/>{:else}{' '}{/if}{/if}<span class="part">{part}</span>{/each}</span
					>
				</dd>
			</dl>
			{#if !loaded}<p class="muted">아직 모듈을 불러오지 않아서 root가 없습니다.</p>{/if}
		</div>
	</div>
</div>

<p class="screen-title">브라우저가 그린 화면</p>
<!-- a fixed height: the copies are laid side by side inside, so the page never moves -->
<div class="screen-wrap">
	<iframe class="screen" bind:this={frame} title="마운트한 카운터" srcdoc={PAGE}></iframe>
	{#if mounts === 0}<p class="empty">아직 마운트하지 않았습니다.</p>{/if}
</div>

<!--
	what happened, step by step; the latest step is what the stage shows now. Every step has its
	room from the start (unseen until it happens), so nothing below moves as they come in.
-->
<ol class="log">
	{#each PLANNED as planned, i (i)}
		<li class:shown={i < log.length} class:now={i === log.length - 1} aria-hidden={i >= log.length}>
			{log[i]?.text ?? planned}
		</li>
	{/each}
</ol>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.actions button {
		padding: 3px 14px 1px;
		font-size: 18px;
	}

	/* "처음부터" is the quiet one: a lighter pen */
	.actions .quiet {
		border-color: var(--fg-3);
		color: var(--fg-2);
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(250px, 1fr) minmax(0, 1.8fr);
		gap: 12px;
		margin-top: 14px;
	}

	@media (max-width: 520px) {
		.panes {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.pane {
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--surface-2);
		min-width: 0;
	}

	.title {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 700;
		color: var(--fg-2);
	}

	.count {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.big {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 40px;
		font-weight: 700;
		line-height: 1.1;
		color: var(--accent);
	}

	.big.mounts {
		color: var(--fg);
	}

	/* the number right under its title; titles on one line, so the numbers line up */
	.stat .title {
		white-space: nowrap;
	}

	dl {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 2px 14px;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.7;
	}

	dt {
		color: var(--fg-2);
	}

	dd {
		margin: 0;
		color: var(--fg-3);
		overflow-wrap: anywhere;
		transition: color 200ms ease;
	}

	dd.filled {
		color: var(--fg);
	}

	/* the two values stacked in one cell: the cell is as tall as the longer one, always */
	.swap {
		display: grid;
	}

	.swap > * {
		grid-area: 1 / 1;
	}

	.unseen {
		visibility: hidden;
	}

	.part {
		white-space: nowrap;
	}

	.muted {
		margin: 0;
		font-size: 13px;
		color: var(--fg-3);
	}

	.screen-wrap {
		position: relative;
	}

	/* over the empty page, not under it, so it takes no room of its own */
	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		font-size: 13px;
		color: #8d9198;
		pointer-events: none;
	}

	.screen-title {
		margin: 14px 0 6px;
		font-family: var(--font-head);
		font-size: 14.5px;
		font-weight: 700;
	}

	/* a real page, as the browser draws it by default */
	.screen {
		display: block;
		width: 100%;
		/* one row of copies: the label and a counter (two buttons and a paragraph) */
		height: 106px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: #fff;
	}

	.log {
		margin: 12px 0 0;
		padding-left: 20px;
		font-size: 13.5px;
		color: var(--fg-2);
	}

	/*
	 * Each step rises in from below as it happens (360ms ease-out); the latest one, what the
	 * code and the counts show now, is in pen colour and bold.
	 */
	.log li {
		margin-bottom: 4px;
		visibility: hidden;
		transition: color 200ms ease;
	}

	.log li.shown {
		visibility: visible;
		animation: log-in 360ms var(--ease-out) backwards;
	}

	.log li.now {
		color: var(--accent);
		font-weight: 700;
	}

	@keyframes log-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		@keyframes log-fade {
			from {
				opacity: 0;
			}
		}

		.log li.shown {
			animation-name: log-fade;
		}
	}
</style>
