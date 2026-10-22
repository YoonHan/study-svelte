<script>
	import { onMount } from 'svelte';
	import Flags from '../Flags.svelte';
	import Highlight from '../Highlight.svelte';
	import Say from '../Say.svelte';
	import { get_beat } from '../state.svelte.js';
	import { VANILLA_SOURCE } from '#lib/counter.js';

	/**
	 * The hand-written counter, run in a page of its own, with or without `render()` after
	 * `count++` in the increase button's handler. Beside it, what the page shows on the button
	 * and what the `count` variable holds, read a few times a second, so the reader sees the
	 * value change while the screen does not.
	 */

	const { index, chapter } = get_beat();

	const HANDLER = "increaseButton.addEventListener('click', () => {\n  count++;\n  render();\n});";
	const WITHOUT = "increaseButton.addEventListener('click', () => {\n  count++;\n});";

	// starts as the question asks: without render()
	let removed = $state(1);

	// `var` so the page outside can read it (a `let` at the top of a script is not on `window`)
	let page = $derived.by(() => {
		let code = VANILLA_SOURCE.replace('let count = 0;', 'var count = 0;');
		if (removed) code = code.replace('count++;\n  render();', 'count++;');
		return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${code}<\/script></body></html>`;
	});

	let screen = $state('');
	let value = $state(0);

	/** @type {HTMLIFrameElement | undefined} */
	let frame = $state();

	/** @param {number} i */
	function choose(i) {
		removed = i;
		chapter.light(index, [4, 5, 6, 7]);
	}

	onMount(() => {
		const timer = setInterval(() => {
			const win = /** @type {any} */ (frame?.contentWindow);
			const button = win?.document?.querySelector('button');
			if (!button) return;
			screen = button.innerText;
			value = win.count;
		}, 150);
		return () => clearInterval(timer);
	});
</script>

<!-- the line taken away, struck through on the stage while it is gone -->
{#if removed}<Say at={6} note="지운 줄" spot="render();" strike on="vanilla" stage />{/if}

<p class="intro">
	증가 버튼의 클릭 핸들러에서 <code>render()</code>를 지운 채 직접 짠 카운터를 실행해 봅니다. 증가
	버튼을 몇 번 눌러 보고, 증가 버튼의 텍스트와 <code>count</code> 변수의 값을 비교해 보세요. "원본" 플래그로
	바꾸면 지우기 전과 비교할 수 있습니다.
</p>

<Flags
	items={['원본', 'render() 지우기']}
	selected={removed}
	label="증가 버튼의 클릭 핸들러"
	onchoose={choose}
>
	<Highlight code={removed ? WITHOUT : HANDLER} />
</Flags>

<!-- the page and the two values side by side; on a phone, one above the other -->
<div class="row">
	<section class="pane">
		<h4 class="title">브라우저가 그린 화면</h4>
		{#key page}<iframe class="screen" bind:this={frame} title="직접 짠 카운터" srcdoc={page}
			></iframe>{/key}
	</section>
	<section class="pane values" aria-live="polite">
		<div class="stat">
			<h4 class="title">증가 버튼의 텍스트</h4>
			<p class="big">{screen}</p>
		</div>
		<div class="stat">
			<h4 class="title"><code>count</code> 변수</h4>
			<p class="big accent">{value}</p>
		</div>
	</section>
</div>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 12px;
		margin-top: 14px;
	}

	@media (max-width: 520px) {
		.row {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.pane {
		min-width: 0;
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--surface-2);
	}

	.title {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 700;
		color: var(--fg-2);
	}

	/* a real page, as the browser draws it by default */
	.screen {
		display: block;
		width: 100%;
		height: 116px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: #fff;
	}

	.values {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		align-content: start;
	}

	.stat .title {
		white-space: nowrap;
	}

	.big {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 40px;
		font-weight: 700;
		line-height: 1.1;
		color: var(--fg);
	}

	.big.accent {
		color: var(--accent);
	}
</style>
