<script>
	import { get_beat } from '../state.svelte.js';

	/**
	 * Lines 28–29 of `template()` worked out by hand: the reader flips the two bits of `flags`
	 * and watches each mask pull its own bit out, as column arithmetic in binary.
	 */

	const MASKS = [
		{ name: 'TEMPLATE_FRAGMENT', bit: 1, variable: 'is_fragment', line: 28, used: [48] },
		{ name: 'TEMPLATE_USE_IMPORT_NODE', bit: 2, variable: 'use_import_node', line: 29, used: [52] }
	];

	const { index, chapter } = get_beat();

	let flags = $state(3);

	/** @param {number} bit */
	function flip(bit) {
		flags ^= bit;
		chapter.light(index, [28, 29]);
	}
</script>

<p class="intro">
	<code>flags</code>의 두 자리를 켜고 끄면서, <code>is_fragment</code>와
	<code>use_import_node</code>가 각각 어떤 <code>&amp;</code> 연산으로 구해지고 언제
	<code>true</code>가 되는지 보세요. 질문의
	<code>flags</code>인 <code>3</code>(이진수 <code>11</code>)부터 확인해 보세요.
</p>

<div class="flags">
	<code class="name">flags</code>
	<span class="eq">=</span>
	<span class="digits" role="group" aria-label="flags의 비트">
		{#each [2, 1] as bit (bit)}
			<button
				class="digit"
				class:on={(flags & bit) !== 0}
				aria-pressed={(flags & bit) !== 0}
				aria-label="{bit === 2 ? '왼쪽' : '오른쪽'} 자리 비트"
				onclick={() => flip(bit)}>{(flags & bit) !== 0 ? 1 : 0}</button
			>
		{/each}<sub>(2)</sub>
	</span>
	<span class="eq">=</span>
	<span class="decimal">{flags}</span>
</div>

<div class="masks">
	{#each MASKS as m (m.name)}
		{@const result = flags & m.bit}
		<section class="mask" aria-label={m.variable}>
			<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
			<p class="what">
				<code>{m.variable}</code>는 <code>flags</code>와 <code>{m.name}</code>의 <code>&amp;</code> 연산을
				통해서 구합니다.
			</p>
			<div class="sum" aria-hidden="true">
				<span class="label"><code>flags</code></span>
				<span class="bits"
					>{#each [2, 1] as bit (bit)}<b class:on={(flags & bit) !== 0}
							>{(flags & bit) !== 0 ? 1 : 0}</b
						>{/each}</span
				>
				<span class="label">&amp; <code>{m.name}</code></span>
				<span class="bits"
					>{#each [2, 1] as bit (bit)}<b class:on={m.bit === bit}>{m.bit === bit ? 1 : 0}</b
						>{/each}</span
				>
				<span class="label rule">결과</span>
				<span class="bits rule"
					>{#each [2, 1] as bit (bit)}<b class:on={(result & bit) !== 0}
							>{(result & bit) !== 0 ? 1 : 0}</b
						>{/each}</span
				>
			</div>
			<p class="value">
				결과가 0이 {result !== 0 ? '아니므로' : '이므로'}
				<code>{m.variable}</code> = <strong class:yes={result !== 0}>{result !== 0}</strong>
			</p>
			<p class="links">
				<button class="pen-link" onclick={() => chapter.light(index, [m.line])}
					>계산하는 줄 보기</button
				>
				<button class="pen-link" onclick={() => chapter.light(index, m.used)}>쓰이는 줄 보기</button
				>
			</p>
		</section>
	{/each}
</div>

<style>
	.intro {
		margin: 0 0 12px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--fg-2);
	}

	.flags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		font-family: var(--font-mono);
		font-size: 17px;
	}

	.name {
		font-size: 17px;
	}

	.eq,
	.decimal {
		color: var(--fg-2);
	}

	.decimal {
		font-weight: 600;
		color: var(--fg);
	}

	.digits {
		display: flex;
		align-items: flex-end;
		gap: 4px;
	}

	.digits sub {
		margin-left: 2px;
		font-size: 12px;
		color: var(--fg-3);
	}

	/* each bit is a key to press: a hand-drawn box that fills with pen colour when on */
	.digit {
		width: 42px;
		height: 46px;
		border: 1.5px solid var(--fg-2);
		border-radius: 6px 10px 7px 11px;
		background: var(--surface);
		font-family: var(--font-mono);
		font-size: 22px;
		font-weight: 700;
		color: var(--fg-3);
		cursor: var(--cursor-point);
		transition:
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease,
			transform 160ms var(--ease-out);
	}

	.digit:active {
		transform: scale(0.95);
	}

	/* a key lifts a little under the pointer, on or off */
	@media (hover: hover) and (pointer: fine) {
		.digit:hover {
			border-color: var(--fg);
			transform: translateY(-2px);
		}

		.digit.on:hover {
			border-color: var(--accent);
		}
	}

	.digit.on {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent);
	}

	/* one calculation per row: the constant names are long and should stay on one line */
	.masks {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 14px;
		margin-top: 18px;
	}

	.mask {
		display: grid;
		gap: 10px;
		padding: 14px 16px;
		border-radius: 4px;
		background: var(--surface-2);
	}

	.what,
	.value,
	.links {
		margin: 0;
		font-size: 15px;
		line-height: 1.7;
	}

	.what code,
	.value code {
		font-size: 0.85em;
	}

	/* column arithmetic in binary, the bits that are on in pen colour */
	.sum {
		display: grid;
		grid-template-columns: auto auto;
		justify-content: start;
		align-items: baseline;
		column-gap: 18px;
		row-gap: 2px;
		font-size: 14px;
	}

	.label {
		text-align: right;
		color: var(--fg-2);
	}

	.label code {
		font-size: 0.9em;
		white-space: nowrap;
	}

	.bits {
		font-family: var(--font-mono);
		font-size: 19px;
		font-weight: 600;
		letter-spacing: 0.3em;
	}

	.bits b {
		color: var(--fg-3);
		font-weight: 600;
		transition: color 160ms ease;
	}

	.bits b.on {
		color: var(--accent);
	}

	.rule {
		padding-top: 4px;
		border-top: 1.5px solid var(--fg-2);
	}

	.value strong {
		font-family: var(--font-mono);
		font-size: 17px;
		color: var(--fg-3);
	}

	.value strong.yes {
		color: var(--accent);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
	}

	.links button {
		font-size: 19px;
	}
</style>
