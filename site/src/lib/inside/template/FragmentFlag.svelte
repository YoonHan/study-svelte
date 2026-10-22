<script>
	import { onMount } from 'svelte';
	import NodeTree from '../NodeTree.svelte';
	import Flags from '../Flags.svelte';
	import { get_beat } from '../state.svelte.js';
	import { runtime, outline, run } from '../runtime.js';
	import { mark_text } from '../text.js';
	import { COUNTER_TEMPLATE } from '#lib/counter.js';

	/**
	 * Mounts the counter's template with and without `TEMPLATE_FRAGMENT`, using 5.0.0's own
	 * `template()`, and shows what `root()` returned and what the browser drew from it. The
	 * page is drawn in an iframe, by the browser alone, with none of this site's styles.
	 */

	const { index, chapter } = get_beat();

	let flags = $state(1);

	/** @type {import('../runtime.js').Outline | undefined} */
	let returned = $state();

	/** @type {HTMLIFrameElement | undefined} */
	let frame = $state();

	/** @type {(() => void) | undefined} */
	let stop;

	// the compiled line, with the second argument struck through once it is taken away
	let line = $derived.by(() => {
		const html = chapter.file('compiled')?.code.lines[5] ?? '';
		return flags ? html : mark_text(html, ', 1', 'gone');
	});

	let summary = $derived(
		!returned
			? ''
			: returned.type === 'fragment'
				? `DocumentFragment(트리 맨 위의 #fragment) 하나, 그 아래 자식 노드 ${returned.children.length}개`
				: `DocumentFragment(#fragment) 없이 맨 위에 첫 번째 ${returned.label} 요소 하나`
	);

	// why that many: the elements, and the whitespace text between them
	let why = $derived.by(() => {
		if (!returned || returned.type !== 'fragment') return '';
		const elements = returned.children.filter((c) => c.type === 'element').length;
		const texts = returned.children.filter((c) => c.type === 'text').length;
		return `자식 노드 ${returned.children.length}개는 요소 ${elements}개와, 요소 사이의 공백(" ")으로 만들어진 텍스트 노드 ${texts}개입니다.`;
	});

	function mount_once() {
		const body = frame?.contentDocument?.body;
		if (!body) return;
		stop?.();
		const root = runtime.template(COUNTER_TEMPLATE, flags);
		stop = run(body, (anchor) => {
			var fragment = root();
			// appending empties a fragment, so look at it first
			returned = outline(fragment);
			runtime.append(anchor, fragment);
		});
	}

	/** @param {number} value */
	function set_flags(value) {
		flags = value;
		mount_once();
		chapter.light(index, value === 1 ? [46, 47] : [46, 47, 48]);
	}

	onMount(() => {
		// mount into the srcdoc page once it is there (not the blank page an iframe starts with)
		const doc = frame?.contentDocument;
		if (doc?.URL === 'about:srcdoc' && doc.readyState === 'complete') mount_once();
		else frame?.addEventListener('load', mount_once, { once: true });
		return () => stop?.();
	});
</script>

<p class="intro">
	컴파일 결과에서 두 번째 인자 <code>1</code>을 지운 채 카운터를 마운트해 봅니다. 원본과 비교해서
	<code>root()</code>가 반환한 값과 브라우저가 그린 화면이 어떻게 달라지는지 보세요.
</p>

<Flags
	items={['원본', '두 번째 인자 지우기']}
	selected={flags === 1 ? 0 : 1}
	label="두 번째 인자"
	onchoose={(i) => set_flags(i === 0 ? 1 : 0)}
>
	<div class="line shiki"><code class="src">{@html line}</code></div>
</Flags>

<div class="panes">
	<section class="pane">
		<h4 class="title"><code>root()</code>가 반환한 값</h4>
		<p class="what">
			컴포넌트 함수 안에서 <code>var fragment = root()</code>의 <code>fragment</code>에 들어가는
			값입니다. 문서에 넣기 전의 노드 구조를 그대로 그렸습니다.
		</p>
		{#if returned}
			<p class="summary">{summary}</p>
			{#if why}<p class="why">{why}</p>{/if}
			<ul class="tree"><NodeTree node={returned} mark /></ul>
		{/if}
	</section>
	<section class="pane">
		<h4 class="title">브라우저가 그린 화면</h4>
		<p class="what">
			<code>root()</code>가 반환한 값(<code>fragment</code>)을 문서에 넣었을 때 브라우저가 실제로
			그린 화면입니다.
		</p>
		<iframe
			class="screen"
			bind:this={frame}
			title="마운트한 화면"
			srcdoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
		></iframe>
		<p class="note">
			{flags ? '첫 번째 버튼과 문단이' : '첫 번째 버튼이'} 비어 있는 것은 아직 값을 쓰기 전이기 때문입니다.
			값을 쓰는 방법은 1-4장 "화면에 값을 쓰고 상태에 따라 갱신하는 방법"에서 살펴봅니다.
		</p>
	</section>
</div>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.line {
		padding: 10px 14px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface);
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.7;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.line code {
		padding: 0;
		background: none;
		font-size: 1em;
		color: var(--fg);
	}

	/* the argument taken away stays in place, struck through in pen */
	.line :global(.gone) {
		text-decoration: line-through;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 2px;
		opacity: 0.6;
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 18px;
		margin-top: 18px;
	}

	.pane {
		min-width: 0;
	}

	.title {
		margin: 0 0 2px;
		font-family: var(--font-head);
		font-size: 15.5px;
		font-weight: 700;
	}

	.what {
		margin: 0 0 8px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.summary {
		margin: 0 0 4px;
		font-family: var(--font-hand);
		font-size: 20px;
		line-height: 1.3;
		color: var(--accent);
	}

	.tree {
		margin: 0;
		padding: 8px 12px;
		font-size: 12.5px;
		line-height: 1.7;
		border-radius: 4px;
		background: var(--surface-2);
	}

	/* a real page, as the browser draws it by default */
	.screen {
		display: block;
		width: 100%;
		height: 72px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: #fff;
	}

	.note {
		margin: 12px 0 0;
		font-size: 13.5px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.why {
		margin: 0 0 8px;
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--fg-2);
	}
</style>
