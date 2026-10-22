<script>
	import { onMount } from 'svelte';
	import { get_beat } from '../state.svelte.js';
	import { COUNTER_SOURCE } from '#lib/counter.js';
	import Editor from '../Editor.svelte';
	import Highlight from '../Highlight.svelte';
	import FileIcon from '../FileIcon.svelte';
	import Flags from '../Flags.svelte';

	/**
	 * Compiles components with svelte@5.0.0 in the browser and shows the second argument of
	 * each `$.template(...)` call in binary. The reader edits the markup and looks for the rule.
	 */

	const PRESETS = [
		{ name: '예제 원본', source: COUNTER_SOURCE },
		{ name: '<h1>이 하나', source: '<h1>Hello</h1>\n' },
		{ name: '<h1>과 <p>', source: '<h1>Hello</h1>\n<p>This component has no state at all.</p>\n' },
		{
			name: '<my-widget>(커스텀 엘리먼트)과 <p>',
			source: '<my-widget label="hello"></my-widget>\n<p>caption</p>\n'
		},
		{
			name: '<my-widget>(커스텀 엘리먼트)이 하나',
			source: '<my-widget label="hello"></my-widget>\n'
		}
	];

	/**
	 * @typedef {object} Template
	 * @property {string} name variable holding the template function, e.g. `root`
	 * @property {string} html
	 * @property {number} flags
	 */

	const { chapter } = get_beat();
	// the bits get their real names once the explanation has named them
	let revealed = $derived(chapter.is_revealed_id('flag-names'));

	let selected = $state(0);
	let source = $state(PRESETS[0].source);

	/** @type {((source: string, options: object) => { js: { code: string } }) | undefined} */
	let compile = $state();

	/** @type {{ templates: Template[] } | { error: string } | undefined} */
	let result = $state();

	onMount(async () => {
		compile = (await import('svelte-5.0.0/compiler')).compile;
	});

	// recompile shortly after the reader stops typing
	$effect(() => {
		const input = source;
		if (!compile) return;
		const fn = compile;
		const timer = setTimeout(() => (result = analyze(fn, input)), 120);
		return () => clearTimeout(timer);
	});

	/**
	 * @param {NonNullable<typeof compile>} fn
	 * @param {string} input
	 */
	function analyze(fn, input) {
		try {
			const code = fn(input, { filename: 'Component.svelte', generate: 'client', dev: false }).js
				.code;
			/** @type {Template[]} */
			const templates = [];
			for (const m of code.matchAll(
				/var (\w+) = \$\.template\(`((?:[^`\\]|\\.)*)`(?:, (\d+))?\);/g
			)) {
				templates.push({ name: m[1], html: m[2], flags: Number(m[3] ?? 0) });
			}
			return { templates };
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
	}

	/** @param {number} i */
	function choose(i) {
		selected = i;
		source = PRESETS[i].source;
	}
</script>

<p class="intro">
	예제를 골라 보거나 편집기에서 마크업을 직접 바꿔 보세요. 마크업이 바뀔 때마다 그 자리에서
	컴파일해서
	<code>$.template(...)</code>의 두 번째 인자를 이진수로 보여 줍니다. 어떤 마크업에서 두 번째 인자가
	붙고 어떤 마크업에서 붙지 않는지, 이진수의 어느 자리 비트가 켜지는지 비교해 보세요.
</p>

<p class="file"><FileIcon name="Component.svelte" /> Component.svelte</p>
<!-- the examples are sticky-note flags stuck on the top edge of the source -->
<Flags
	items={PRESETS.map((preset) => preset.name)}
	{selected}
	label="예제 컴포넌트"
	onchoose={choose}
>
	<Editor bind:value={source} label="Component.svelte" oninput={() => (selected = -1)} />
</Flags>

<div class="made-from" aria-hidden="true">
	<svg viewBox="0 0 30 40"
		><path d="M15 2 C 13 12, 17 22, 15 33" /><path d="M8 26 L15 35 L22 26" /></svg
	>
	<span>컴파일</span>
</div>

<p class="file"><FileIcon name="Component.js" /> Component.js</p>
<div class="output" aria-live="polite">
	{#if !result}
		<p class="muted">컴파일러를 불러오는 중입니다…</p>
	{:else if 'error' in result}
		<p class="error">컴파일 에러: {result.error}</p>
	{:else if result.templates.length === 0}
		<p class="muted">이 컴포넌트에는 <code>$.template</code> 호출이 없습니다.</p>
	{:else}
		{#each result.templates as t (t.name)}
			<div class="template">
				<div class="code-box">
					<Highlight
						code={`var ${t.name} = $.template(\`${t.html}\`${t.flags ? `, ${t.flags}` : ''});`}
					/>
				</div>
				<p class="arg">
					두 번째 인자 <strong>{t.flags || '없음'}</strong>, 이진수로
					<span class="bin">
						{#each [2, 1] as bit (bit)}
							<b class:on={(t.flags & bit) !== 0}>{(t.flags & bit) !== 0 ? 1 : 0}</b>
						{/each}<sub>(2)</sub>
					</span>
				</p>
				{#if revealed}
					<p class="names">
						왼쪽 자리 <code>TEMPLATE_USE_IMPORT_NODE</code>, 오른쪽 자리
						<code>TEMPLATE_FRAGMENT</code>
					</p>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.file {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 4px;
		font-family: var(--font-hand);
		font-size: 19px;
		color: var(--fg);
	}

	/* the editor's text, compiled into the box below: the same arrow as on the code stage */
	.made-from {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 40px;
		margin: 4px 0 2px;
		color: var(--accent);
	}

	.made-from svg {
		width: 30px;
		height: 40px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.made-from span {
		font-family: var(--font-hand);
		font-size: 21px;
	}

	.output {
		display: grid;
		gap: 12px;
	}

	.template {
		display: grid;
		gap: 10px;
	}

	/* the compiled code in its own box, the reading of it below, outside the box */
	.code-box {
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface-2);
	}

	.code-box :global(.hl) {
		background: none;
	}

	/* the template line can be long; wrap it rather than hide its end */
	.template :global(.hl) {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.arg,
	.names {
		margin: 0;
		padding-left: 12px;
		border-left: 2px solid var(--accent);
		font-size: 15px;
		color: var(--fg-2);
	}

	.names {
		margin-top: -6px;
	}

	/* one face for the words and the value; only the binary is in the code face */
	.arg strong {
		color: var(--fg);
		font-weight: 700;
	}

	/* binary, with the bits that are on in pen colour */
	/* the binary is set larger in another face; its digits share the line's baseline */
	.bin {
		display: inline-flex;
		align-items: baseline;
		margin-left: 4px;
		font-family: var(--font-mono);
		font-size: 18px;
		font-weight: 600;
		line-height: 1;
		letter-spacing: 0.08em;
	}

	.bin b {
		color: var(--fg-3);
		font-weight: 600;
		transition: color 160ms ease;
	}

	.bin b.on {
		color: var(--accent);
	}

	.bin sub {
		margin-left: 1px;
		font-size: 11px;
		font-weight: 400;
		letter-spacing: 0;
		color: var(--fg-3);
	}

	.names {
		font-size: 13.5px;
	}

	.muted {
		margin: 0;
		color: var(--fg-3);
	}

	.error {
		margin: 0;
		color: var(--red);
		font-size: 13px;
	}
</style>
