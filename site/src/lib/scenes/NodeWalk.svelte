<script>
	/**
	 * @typedef {object} WalkNode
	 * @property {string} label how the node is drawn
	 * @property {'comment' | 'text' | 'element'} kind
	 * @property {string} [caption] the variable name that points at this node, if any
	 */

	/**
	 * A row of sibling nodes and a marker that walks across them, one `nextSibling` per click,
	 * the way `$.sibling(start, hops)` does.
	 * @type {{
	 *   nodes: WalkNode[],
	 *   start: number,
	 *   hops: number,
	 *   from: string,
	 *   to: string,
	 *   locked?: boolean
	 * }}
	 */
	let { nodes, start, hops, from, to, locked = false } = $props();

	let step = $state(0);
	let current = $derived(start + step);

	/** @type {HTMLElement[]} */
	const boxes = [];
	/** @type {HTMLElement | undefined} */
	let track = $state();
	let marker_x = $state(0);

	// the marker is a fixed-size pointer: only its transform moves (no width/left animation)
	$effect(() => {
		const box = boxes[current];
		if (!box || !track) return;
		marker_x = box.offsetLeft + box.offsetWidth / 2;
		const left = box.offsetLeft - (track.clientWidth - box.offsetWidth) / 2;
		track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
	});

	/** @param {number} delta */
	function move(delta) {
		step = Math.min(hops, Math.max(0, step + delta));
	}
</script>

<div class="walk">
	<p class="call">
		<span class="kw">var</span>
		{to} = $.sibling({from}, <b class="hops">{locked ? '?' : hops}</b>);
	</p>

	<div class="track" bind:this={track}>
		{#if !locked}
			<span class="marker" class:arrived={step === hops} style:transform="translateX({marker_x}px)"
				>▼</span
			>
		{/if}
		{#each nodes as node, i (i)}
			<div
				class="node {node.kind}"
				class:visited={!locked && i > start && i <= current}
				class:here={!locked && i === current}
				bind:this={boxes[i]}
			>
				<span class="label">{node.label}</span>
				<span class="caption">{node.caption ?? ''}</span>
			</div>
			{#if i < nodes.length - 1}
				<span class="link" class:lit={!locked && i >= start && i < current}>→</span>
			{/if}
		{/each}
	</div>

	{#if locked}
		<p class="hint">해설 쪽지를 펼치면 표식을 한 칸씩 옮겨 볼 수 있습니다.</p>
	{:else}
		<div class="controls">
			<button onclick={() => move(-1)} disabled={step === 0}>이전</button>
			<button class="primary" onclick={() => move(1)} disabled={step === hops}>
				nextSibling →
			</button>
			<span class="counter">이동 <b>{step}</b> / {hops}</span>
			<button class="ghost" onclick={() => (step = 0)} disabled={step === 0}>처음으로</button>
		</div>
	{/if}
</div>

<style>
	.walk {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.call {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--ink);
	}

	.kw {
		color: var(--rubric);
	}

	.hops {
		color: var(--rubric);
	}

	.track {
		position: relative;
		display: flex;
		align-items: stretch;
		gap: 4px;
		padding: 30px 14px 14px;
		overflow-x: auto;
		border-top: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		scrollbar-width: thin;
	}

	/*
	 * The marker retargets on every click, so it's a CSS transition (interruptible, unlike
	 * keyframes). Moving on screen → strong ease-in-out; clicked repeatedly → kept short.
	 */
	.marker {
		position: absolute;
		top: 6px;
		left: 0;
		width: 16px;
		margin-left: -8px;
		text-align: center;
		font-size: 13px;
		line-height: 1;
		color: var(--rubric);
		transition:
			transform 200ms var(--ease-in-out),
			color 200ms ease;
	}

	.marker.arrived {
		color: #1f6a43;
	}

	.node {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		min-width: 54px;
		padding: 8px 10px 6px;
		border: 1px solid transparent;
		font-family: var(--font-mono);
		font-size: 13px;
		white-space: nowrap;
		transition:
			border-color 200ms ease,
			background-color 200ms ease;
	}

	.node.here {
		border-color: var(--rubric);
		background: var(--rubric-soft);
	}

	.node.comment .label {
		color: var(--ink-faint);
	}

	.node.text .label {
		color: #8a5a1c;
	}

	.node.element .label {
		font-weight: 600;
		color: var(--ink);
	}

	.caption {
		min-height: 1.4em;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-soft);
	}

	.link {
		align-self: center;
		margin-top: -18px;
		color: var(--ink-faint);
		transition: color 200ms ease;
	}

	.link.lit {
		color: var(--rubric);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.controls button {
		padding: 5px 14px;
		border: 1px solid var(--rule);
		border-radius: 99px;
		background: none;
		font-size: 13px;
		color: var(--ink);
		cursor: pointer;
		/* press feedback: scale 0.97, 160ms ease-out (animate skill, Button press) */
		transition:
			transform 160ms var(--ease-out),
			background-color 200ms ease;
	}

	.controls button:not(:disabled):active {
		transform: scale(0.97);
	}

	.controls button:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.controls .primary {
		border-color: var(--rubric);
		background: var(--rubric);
		color: var(--paper);
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.controls .ghost {
		border-color: transparent;
		color: var(--ink-soft);
	}

	.counter {
		font-size: 13px;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}

	.counter b {
		color: var(--rubric);
	}

	.hint {
		margin: 0;
		font-size: 13px;
		color: var(--ink-faint);
	}

	@media (prefers-reduced-motion: reduce) {
		.marker {
			transition: color 200ms ease;
		}
	}
</style>
