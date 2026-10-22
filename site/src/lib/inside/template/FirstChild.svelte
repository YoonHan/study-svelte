<script>
	import { onMount } from 'svelte';
	import { runtime, outline, run } from '../runtime.js';
	import { COUNTER_TEMPLATE } from '#lib/counter.js';
	import { pen_line } from '../pen.js';

	/**
	 * What `if (!is_fragment) node = get_first_child(node)` keeps and drops, shown on the
	 * counter's real fragment (parsed by svelte@5.0.0): above, the fragment as parsing made it,
	 * all its children in place; then the statement; then below, what running it leaves in
	 * `node`: all but the first child are crossed out and fall away.
	 */

	/** @type {import('../runtime.js').Outline[]} */
	let children = $state([]);
	let played = $state(false);

	const reduce =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	function play() {
		clearTimeout(timer);
		played = false;
		// the reader sees the whole fragment first, then the statement and what it leaves
		timer = setTimeout(() => (played = true), reduce ? 0 : 600);
	}

	onMount(() => {
		const root = runtime.template(COUNTER_TEMPLATE, 1);
		const stop = run(document.createElement('div'), () => {
			children = outline(/** @type {Node} */ (root())).children;
		});
		stop();
		play();
		return () => clearTimeout(timer);
	});

	// a small X written in pen over the middle of each dropped node: two strokes, top left to
	// bottom right, then top right to bottom left, in a 14px box, a little different each time
	const CROSS = 14;

	/** @param {number} i */
	const cross = (i) => [
		pen_line([2, 2.5], [12, 11.5], { seed: i * 11 + 1 }),
		pen_line([11.5, 2], [2.5, 12], { seed: i * 11 + 5 })
	];

	const uid = $props.id();

	/** @param {import('../runtime.js').Outline} node */
	const show = (node) => (node.type === 'text' ? node.label.replace('#text ', '') : node.label);
</script>

<figure class="cut" style:--n={children.length}>
	<!-- the pen's edge: the ink catches on the paper a little (fine noise, displaced <1px) -->
	<svg class="defs" aria-hidden="true">
		<filter id="{uid}-rough" x="-20%" y="-20%" width="140%" height="140%">
			<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
			<feDisplacementMap in="SourceGraphic" scale="0.9" />
		</filter>
	</svg>
	<!-- before: the fragment as parsing made it; replay sits here, at the start of the story -->
	<section class="panel" aria-label="파싱 직후">
		<header class="head">
			<p class="cap">
				<code>node</code>: 파싱한 <code>DocumentFragment</code> (자식 노드 {children.length}개)
			</p>
			<button class="again pen-link" onclick={play}>
				<svg class="replay" viewBox="0 0 24 24" aria-hidden="true"
					><path d="M5.5 12.5a6.6 6.6 0 1 0 2.1-5.2M5.2 3.6l.5 4.1 4-.7" /></svg
				>다시 보기
			</button>
		</header>
		<!-- all the children, in place: nothing is dropped here -->
		<ol class="row">
			{#each children as child, i (i)}
				<li class="chip {child.type}">{show(child)}</li>
			{/each}
		</ol>
	</section>

	<!-- the statement that makes the cut, as code, between the two pictures -->
	<div class="step" class:on={played}>
		<svg class="down" viewBox="0 0 24 40" aria-hidden="true"
			><path class="shaft" d="M12 2c-1 11 1 22 0 33" pathLength="1" /><path
				class="head"
				d="M6 28l6 8 6-8"
				pathLength="1"
			/></svg
		>
		<pre class="code"><code>if (!is_fragment) node = get_first_child(node);</code></pre>
	</div>

	<!-- after: running the statement on the same children; all but the first are dropped -->
	<section class="panel result" class:on={played} aria-label="실행한 뒤">
		<header class="head">
			<p class="cap"><code>node</code>: 실행한 뒤</p>
		</header>
		<div class="row">
			<ol class="row cutting" aria-live="polite">
				{#each children as child, i (i)}
					<li
						class="chip {child.type}"
						class:kept={played && i === 0}
						class:gone={played && i > 0}
						style:--i={i}
					>
						<span class="name">{show(child)}</span>
						{#if i > 0}
							<!-- crossed out by hand, over the middle of the node -->
							<svg class="cross" viewBox="0 0 {CROSS} {CROSS}" aria-hidden="true">
								{#each cross(i) as d, n (n)}
									<path {d} pathLength="1" filter="url(#{uid}-rough)" />
								{/each}
							</svg>
						{/if}
					</li>
				{/each}
			</ol>
			<span class="tag">나머지 {Math.max(children.length - 1, 0)}개는 버려집니다</span>
		</div>
	</section>
</figure>

<style>
	/*
	 * Three parts, each looking like what it is: two pictures of `node` (panels on paper), and
	 * between them the statement that turns one into the other (a code block, with an arrow).
	 */
	.cut {
		display: grid;
		gap: 6px;
		margin: 14px 0 0;
		/*
		 * It plays in order, each part once the one before is over: the arrow and the statement
		 * (done by 380ms), the panel below (300ms), the cut inside it (the last X is written
		 * (n - 1) * 60ms + 580ms after it starts), and last the words saying what was dropped.
		 */
		--step-at: 0ms;
		--result-at: calc(var(--step-at) + 440ms);
		--cut-at: calc(var(--result-at) + 440ms);
		--tag-at: calc(var(--cut-at) + (var(--n, 5) - 1) * 60ms + 660ms);
	}

	.panel {
		display: grid;
		gap: 10px;
		padding: 12px 14px 14px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 4px 12px;
	}

	.cap {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--fg-2);
	}

	.step {
		display: flex;
		align-items: center;
		gap: 10px;
		padding-left: 10px;
	}

	.down {
		flex: none;
		width: 18px;
		height: 34px;
		overflow: visible;
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/*
	 * Act two: the arrow is drawn down from the nodes (shaft 220ms, then its head 120ms), and
	 * the statement comes in beside it (260ms), all strong ease-out. Undrawn strokes are
	 * transparent (a round cap would leave a dot). On replay, all of it is simply gone.
	 */
	.down path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		stroke-opacity: 0;
	}

	.step .code {
		opacity: 0;
		transform: translateY(-4px);
	}

	.step.on .down path {
		stroke-dashoffset: 0;
		stroke-opacity: 1;
		transition:
			stroke-dashoffset 220ms var(--ease-out),
			stroke-opacity 0ms linear;
		transition-delay: var(--step-at);
	}

	.step.on .down .head {
		transition-duration: 120ms, 0ms;
		transition-delay: calc(var(--step-at) + 200ms);
	}

	.step.on .code {
		opacity: 1;
		transform: none;
		transition:
			opacity 260ms var(--ease-out),
			transform 260ms var(--ease-out);
		transition-delay: calc(var(--step-at) + 120ms);
	}

	.code {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 8px 12px;
		border-radius: 4px;
		background: var(--surface-2);
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.6;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.code code {
		padding: 0;
		background: none;
		color: var(--fg);
		font-size: 1em;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chip {
		display: inline-block;
		padding: 2px 9px;
		border: 1.25px solid var(--fg-3);
		border-radius: 4px;
		background: var(--surface);
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.6;
		white-space: pre;
		color: var(--fg);
	}

	.chip.text {
		color: var(--fg-2);
		border-style: dashed;
	}

	/* the one child left: pen colour, as the cut begins */
	.chip.kept {
		border-color: var(--accent);
		color: var(--accent);
		transition:
			border-color 300ms ease var(--cut-at),
			color 300ms ease var(--cut-at);
	}

	/*
	 * The cut, in the panel below: every node after the first steps down and fades, then is
	 * crossed out with a small X in pen, one after another (60ms apart), so the eye follows what
	 * is left behind. The node fades, not the X: the X stays in full pen colour on top of it.
	 * On replay it is all simply undone.
	 */
	.result {
		/* room below for the nodes that fall away */
		padding-bottom: 20px;
	}

	.cutting .chip {
		position: relative;
	}

	.cutting .chip.gone {
		border-color: color-mix(in oklab, var(--fg-3) 45%, transparent);
		transform: translateY(8px);
		transition:
			border-color 360ms var(--ease-out),
			transform 360ms var(--ease-out);
		transition-delay: calc(var(--cut-at) + var(--i, 0) * 60ms);
	}

	.cutting .chip.gone .name {
		opacity: 0.3;
		transition: opacity 360ms var(--ease-out);
		transition-delay: calc(var(--cut-at) + var(--i, 0) * 60ms);
	}

	/*
	 * The X is written stroke by stroke once the node has stepped down: each stroke traced in
	 * 160ms (strong ease-out), the second 40ms after the first ends, as a hand lifts and comes
	 * back. An undrawn stroke is transparent, or its round cap would leave a dot. On replay
	 * the X is simply gone.
	 */
	.cross {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 14px;
		height: 14px;
		translate: -50% -50%;
		overflow: visible;
		pointer-events: none;
	}

	.cross path {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		stroke-opacity: 0;
	}

	.chip.gone .cross path {
		stroke-dashoffset: 0;
		stroke-opacity: 1;
		transition:
			stroke-dashoffset 160ms var(--ease-out),
			stroke-opacity 0ms linear;
		transition-delay: calc(var(--cut-at) + var(--i, 0) * 60ms + 220ms);
	}

	.chip.gone .cross path + path {
		transition-delay: calc(var(--cut-at) + var(--i, 0) * 60ms + 420ms);
	}

	.defs {
		position: absolute;
		width: 0;
		height: 0;
	}

	/* the panel below comes in once the statement is there (300ms strong ease-out) */
	.result {
		opacity: 0;
		transform: translateY(-6px);
	}

	.result.on {
		opacity: 1;
		transform: none;
		transition:
			opacity 300ms var(--ease-out),
			transform 300ms var(--ease-out);
		transition-delay: var(--result-at);
	}

	/* last, once every dropped node is crossed out */
	.tag {
		margin-left: 4px;
		font-family: var(--font-hand);
		font-size: 19px;
		color: var(--fg-2);
		opacity: 0;
	}

	.result.on .tag {
		opacity: 1;
		transition: opacity 300ms ease var(--tag-at);
	}

	.again {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 18px;
	}

	.replay {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@media (prefers-reduced-motion: reduce) {
		.cutting .chip.gone {
			transform: none;
		}

		/* the X appears whole instead of being written */
		.cross path {
			stroke-dasharray: none;
		}

		.chip.gone .cross path,
		.chip.gone .cross path + path {
			transition: stroke-opacity 200ms ease;
		}

		/* the same order, each part faded in where it stands */
		.down path {
			stroke-dasharray: none;
		}

		.step.on .down path,
		.step.on .down .head {
			transition: stroke-opacity 200ms ease var(--step-at);
		}

		.step .code,
		.result {
			transform: none;
		}
	}
</style>
