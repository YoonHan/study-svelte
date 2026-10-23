<script>
	import { onMount } from 'svelte';
	import { run } from '#lib/trace/engine.js';
	import { LEVELS, fold, representative } from '#lib/trace/depth.js';
	import DomTree from '#lib/trace/DomTree.svelte';

	const SOURCE = `<script>
	let count = $state(0);
<\/script>

<button onclick={() => count++}>{count}</button>
<p>두 배: {count * 2}</p>
<button onclick={() => count = 0}>초기화</button>`;

	/** @type {HTMLElement | undefined} */
	let target = $state();
	/** @type {ReturnType<typeof run> | undefined} */
	let session;

	let code = $state('');
	let events = $state.raw(/** @type {import('#lib/trace/engine.js').TraceEvent[]} */ ([]));
	let error = $state('');

	let level = $state(LEVELS[0]);
	let rows = $derived(fold(events, level));
	let steps = $derived(rows.filter((row) => row.type !== 'phase'));
	let index = $state(0);
	let current = $derived(steps[Math.min(index, steps.length - 1)]);
	let event = $derived(current ? representative(current) : undefined);
	let highlight = $derived(new Set(event?.nodes ?? []));

	/** boxes the reader has opened in place */
	let expanded = $state(/** @type {Set<string>} */ (new Set()));

	let lines = $derived(code.split('\n'));
	let marked_lines = $derived.by(() => {
		if (!current) return new Set();
		const calls =
			current.type === 'box' ? current.events : current.type === 'event' ? [current.event] : [];
		return new Set(calls.map((c) => c.line).filter((l) => l !== null));
	});

	onMount(() => {
		if (!target) return;
		try {
			session = run(SOURCE, target);
			code = session.code;
			events = [...session.events];
		} catch (e) {
			error = e instanceof Error ? (e.stack ?? e.message) : String(e);
		}
		return () => session?.destroy();
	});

	/** @param {number} button */
	function press(button) {
		if (!session) return;
		const before = session.events.length;
		session.click(button);
		events = [...session.events];
		// step onto the first thing the click caused
		const first = session.events[before]?.id ?? 0;
		const at = steps.findIndex((row) => (representative(row)?.id ?? -1) >= first);
		index = at === -1 ? steps.length - 1 : at;
	}

	/** @param {number} delta */
	function step(delta) {
		index = Math.max(0, Math.min(steps.length - 1, index + delta));
	}

	/** @param {KeyboardEvent} e */
	function keys(e) {
		if (e.target instanceof HTMLInputElement) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			step(1);
		}
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			step(-1);
		}
	}

	/** @param {string} key */
	function toggle(key) {
		const next = new Set(expanded);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expanded = next;
	}

	/** @param {import('#lib/trace/engine.js').TraceEvent} e */
	function call_text(e) {
		// calls that don't go through `$`: cloning a template, and the runtime running an effect
		if (e.name === 'root()') return 'root()';
		if (e.name === 'effect 실행') return '↻ effect의 함수가 실행됨';
		return `$.${e.name}(${e.args.join(', ')})`;
	}
</script>

<svelte:window onkeydown={keys} />

<main class="lab">
	<header class="bar">
		<div>
			<h1>실행 관찰실 <span>기술 시제품</span></h1>
			<p>
				svelte@5.0.0으로 카운터를 브라우저에서 컴파일하고, 기록 장치를 붙인 런타임으로 실행했습니다.
			</p>
		</div>
		<div class="levels" role="radiogroup" aria-label="관찰 깊이">
			{#each LEVELS as l (l.id)}
				<button
					role="radio"
					aria-checked={level.id === l.id}
					class:on={level.id === l.id}
					onclick={() => {
						level = l;
						index = 0;
					}}>{l.label}</button
				>
			{/each}
		</div>
	</header>

	{#if error}
		<pre class="error">{error}</pre>
	{/if}

	<section class="panes">
		<!-- compiled code -->
		<div class="pane">
			<h2>컴파일 결과</h2>
			<pre class="code"><code
					>{#each lines as text, i (i)}<span class="ln" class:marked={marked_lines.has(i + 1)}
							><span class="no">{i + 1}</span>{text || ' '}</span
						>{/each}</code
				></pre>
		</div>

		<!-- timeline -->
		<div class="pane">
			<h2>
				타임라인 <span class="count">{steps.length ? index + 1 : 0} / {steps.length}</span>
			</h2>
			<div class="controls">
				<button onclick={() => step(-1)} disabled={index === 0}>← 이전</button>
				<button onclick={() => step(1)} disabled={index >= steps.length - 1}>다음 →</button>
				<span class="sep"></span>
				<button class="act" onclick={() => press(0)}>＋1 버튼 누르기</button>
				<button class="act" onclick={() => press(1)}>초기화 누르기</button>
			</div>
			<ol class="timeline">
				{#each rows as row (row.key)}
					{#if row.type === 'phase'}
						<li class="phase">{row.label}</li>
					{:else if row.type === 'event'}
						<li
							class="row {row.event.kind}"
							class:current={current === row}
							style:--depth={row.depth}
						>
							<button onclick={() => (index = steps.indexOf(row))}>
								<span class="call">{call_text(row.event)}</span>
								{#if row.event.result}<span class="result">→ {row.event.result}</span>{/if}
							</button>
						</li>
					{:else}
						<li class="row box" class:current={current === row} style:--depth={row.depth}>
							<button onclick={() => (index = steps.indexOf(row))}>
								<span class="box-label">▣ {row.label}</span>
								<span class="result">{row.events.length}개의 호출 · 아직 열지 않은 상자</span>
							</button>
							<button class="peek" onclick={() => toggle(row.key)}
								>{expanded.has(row.key) ? '닫기' : '들여다보기'}</button
							>
							{#if expanded.has(row.key)}
								<ol class="inside">
									{#each row.events as inner, i (inner.id)}
										<li style:--depth={inner.depth - row.depth} style:--i={i}>
											<span class="call">{call_text(inner)}</span>
											{#if inner.result}<span class="result">→ {inner.result}</span>{/if}
										</li>
									{/each}
								</ol>
							{/if}
						</li>
					{/if}
				{/each}
			</ol>
		</div>

		<!-- DOM -->
		<div class="pane">
			<h2>이 시점의 DOM</h2>
			{#if event}
				{#each event.snapshot as root, i (root.id)}
					<p class="root-label">{i === 0 ? '마운트 대상' : '복제된 fragment · 아직 문서에 없음'}</p>
					<ul class="tree"><DomTree node={root} {highlight} /></ul>
				{/each}
			{/if}
			<h2 class="live-title">실제 화면 (마지막 상태)</h2>
			<div class="live" bind:this={target}></div>
		</div>
	</section>
</main>

<style>
	.lab {
		padding: 20px 24px 32px;
		max-width: 1500px;
		margin: 0 auto;
	}

	.bar {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}

	h1 {
		margin: 0;
		font-size: 22px;
	}

	h1 span {
		font-size: 13px;
		font-weight: 500;
		color: var(--fg-3);
		margin-left: 6px;
	}

	.bar p {
		margin: 2px 0 0;
		font-size: 14px;
		color: var(--fg-2);
	}

	.levels {
		display: flex;
		gap: 4px;
		padding: 3px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface-2);
	}

	.levels button {
		border: 0;
		background: none;
		padding: 6px 12px;
		border-radius: 7px;
		font-size: 13px;
		color: var(--fg-2);
		cursor: var(--cursor-point);
	}

	.levels button.on {
		background: var(--surface);
		color: var(--fg);
		font-weight: 600;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
	}

	.error {
		color: var(--accent);
		white-space: pre-wrap;
		font-size: 12px;
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.9fr);
		gap: 14px;
		height: calc(100vh - 120px);
	}

	.pane {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: auto;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
	}

	h2 {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 700;
		color: var(--fg-2);
		display: flex;
		justify-content: space-between;
	}

	.count {
		font-family: var(--font-mono);
		font-weight: 400;
		color: var(--fg-3);
	}

	.code {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.7;
		tab-size: 2;
	}

	.ln {
		display: block;
		white-space: pre;
		border-left: 2px solid transparent;
		transition: background-color 160ms ease;
	}

	.ln.marked {
		background: var(--focus-soft);
		border-left-color: var(--focus);
	}

	.no {
		display: inline-block;
		width: 2.6em;
		padding-right: 0.8em;
		text-align: right;
		color: var(--fg-3);
		user-select: none;
	}

	.controls {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}

	.controls button {
		padding: 4px 10px;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--surface);
		font-size: 13px;
		cursor: var(--cursor-point);
		transition: transform 160ms var(--ease-out);
	}

	.controls button:active:not(:disabled) {
		transform: scale(0.97);
	}

	.controls button:disabled {
		opacity: 0.4;
		cursor: var(--cursor);
	}

	.controls .act {
		border-color: var(--accent);
		color: var(--accent);
	}

	.sep {
		flex: 1;
	}

	.timeline {
		list-style: none;
		margin: 0;
		padding: 0;
		font-family: var(--font-mono);
		font-size: 12.5px;
	}

	.phase {
		margin: 10px 0 4px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		color: var(--fg-3);
	}

	.row {
		padding-left: calc(var(--depth) * 16px);
	}

	.row > button {
		display: flex;
		gap: 8px;
		width: 100%;
		padding: 2px 8px;
		border: 0;
		border-left: 3px solid transparent;
		border-radius: 4px;
		background: none;
		text-align: left;
		cursor: var(--cursor-point);
		font: inherit;
	}

	.row.current > button {
		background: var(--focus-soft);
		border-left-color: var(--focus);
	}

	.call {
		white-space: pre-wrap;
	}

	.result {
		color: var(--fg-3);
		white-space: nowrap;
	}

	.row.create .call {
		color: #7c3aed;
	}

	.row.walk .call {
		color: #0e7490;
	}

	.row.insert .call {
		color: var(--ok);
	}

	.row.effect .call,
	.row.text .call {
		color: #b45309;
	}

	.box {
		margin: 2px 0;
	}

	.box > button {
		border: 1px dashed var(--line);
		background: var(--surface-2);
	}

	.box-label {
		font-family: var(--font-sans);
		font-weight: 600;
	}

	.peek {
		margin: 2px 0 0 12px;
		padding: 0;
		border: 0;
		background: none;
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--focus);
		cursor: var(--cursor-point);
	}

	.inside {
		list-style: none;
		margin: 4px 0 4px 12px;
		padding: 4px 0 4px 10px;
		border-left: 2px solid var(--line);
	}

	/*
	 * Opening a box: the calls it hid unfold one after another, top to bottom, so the reader
	 * sees that one step was really many (explanation; stagger 30ms, ease-out).
	 */
	.inside li {
		padding-left: calc(var(--depth) * 14px);
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 220ms var(--ease-out) calc(var(--i) * 30ms),
			transform 220ms var(--ease-out) calc(var(--i) * 30ms);

		@starting-style {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	.root-label {
		margin: 8px 0 2px;
		font-size: 12px;
		color: var(--fg-3);
	}

	.tree {
		margin: 0;
		padding: 0;
	}

	.live-title {
		margin-top: auto;
		padding-top: 16px;
	}

	.live {
		padding: 12px;
		border: 1px dashed var(--line);
		border-radius: 8px;
	}

	@media (prefers-reduced-motion: reduce) {
		.inside li {
			transition: opacity 200ms ease;

			@starting-style {
				transform: none;
			}
		}
	}

	@media (max-width: 1100px) {
		.panes {
			grid-template-columns: minmax(0, 1fr);
			height: auto;
		}

		.pane {
			max-height: 70vh;
		}
	}
</style>
