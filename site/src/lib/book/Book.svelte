<script>
	import { onMount } from 'svelte';
	import { Spring } from 'svelte/motion';

	/**
	 * A leather-bound book drawn with CSS 3D transforms. Clicking it swings the front
	 * cover open around the spine and reveals `children` (the table of contents) on the
	 * first page.
	 *
	 * @type {{ children: import('svelte').Snippet, open?: boolean, instant?: boolean }}
	 */
	let { children, open = $bindable(false), instant = false } = $props();

	// book size in px; the faces are laid out from these
	const W = 380;
	const H = 520;
	const D = 92;

	/** pointer-follow tilt: decorative, so a spring (emil-design-eng: spring-based mouse interactions) */
	const tilt = new Spring({ x: 0, y: 0 }, { stiffness: 0.06, damping: 0.55 });

	let fine_pointer = $state(false);
	let reduced = $state(false);
	let fit = $state(1);

	/** @type {HTMLElement | undefined} */
	let stage = $state();

	onMount(() => {
		const pointer = matchMedia('(hover: hover) and (pointer: fine)');
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			fine_pointer = pointer.matches;
			reduced = motion.matches;
		};
		sync();
		pointer.addEventListener('change', sync);
		motion.addEventListener('change', sync);

		const resize = () => {
			// the open book is two covers wide; scale the whole scene down on narrow screens
			const needed = (open ? W * 2 : W * 1.25) + 48;
			fit = Math.min(1, innerWidth / needed, (innerHeight - 140) / (H * 1.15));
		};
		resize();
		addEventListener('resize', resize);
		const stop = $effect.root(() => {
			$effect(() => {
				open;
				resize();
			});
		});

		return () => {
			pointer.removeEventListener('change', sync);
			motion.removeEventListener('change', sync);
			removeEventListener('resize', resize);
			stop();
		};
	});

	/** @param {PointerEvent} event */
	function follow(event) {
		if (!fine_pointer || reduced || open || !stage) return;
		const rect = stage.getBoundingClientRect();
		const nx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
		const ny = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
		tilt.target = { x: -ny * 7, y: nx * 9 };
	}

	function rest() {
		tilt.target = { x: 0, y: 0 };
	}

	function toggle() {
		rest();
		open = !open;
	}
</script>

<!-- pointer tracking only drives a decorative tilt -->
<div
	class="stage"
	role="presentation"
	class:open
	class:reduced
	class:instant
	bind:this={stage}
	onpointermove={follow}
	onpointerleave={rest}
	style:--w="{W}px"
	style:--h="{H}px"
	style:--d="{D}px"
	style:--fit={fit}
>
	<div class="floor-shadow"></div>

	<div class="pose">
		<div class="tilt" style:transform="rotateX({tilt.current.x}deg) rotateY({tilt.current.y}deg)">
			<div class="book">
				<!-- page block: the stacked paper you see on the three open edges -->
				<div class="edge edge-fore"></div>
				<div class="edge edge-top"></div>
				<div class="edge edge-bottom"></div>
				<div class="face back"></div>
				<div class="face spine">
					<span class="band"></span>
					<span class="spine-title">SVELTE</span>
					<span class="band"></span>
					<span class="spine-sub">大百科</span>
					<span class="band"></span>
					<span class="spine-ed">V</span>
					<span class="band"></span>
				</div>

				<!-- first page, under the cover -->
				<div class="face first-page" inert={!open}>
					{@render children()}
				</div>

				<!-- front cover, hinged on the spine -->
				<button
					class="cover"
					onclick={toggle}
					aria-expanded={open}
					aria-label={open ? '책 덮기' : '책 펼치기'}
				>
					<span class="cover-out">
						<span class="frame">
							<span class="corner tl">❦</span>
							<span class="corner tr">❦</span>
							<span class="corner bl">❦</span>
							<span class="corner br">❦</span>
							<svg class="mark" viewBox="0 0 107 128" aria-hidden="true">
								<path
									d="M94.157 22.819c-10.4-14.885-30.94-19.297-45.792-9.835L22.282 29.608A29.92 29.92 0 0 0 8.764 49.65a31.5 31.5 0 0 0 3.108 20.231 30 30 0 0 0-4.477 11.183 31.9 31.9 0 0 0 5.448 24.116c10.402 14.887 30.942 19.297 45.791 9.835l26.083-16.624A29.92 29.92 0 0 0 98.235 78.35a31.53 31.53 0 0 0-3.105-20.232 30 30 0 0 0 4.474-11.182 31.88 31.88 0 0 0-5.447-24.116"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
								/>
							</svg>
							<span class="title">SVELTE</span>
							<span class="rule"></span>
							<span class="subtitle">내부 구조 대백과</span>
							<span class="edition">제5판 · svelte@5.0.0</span>
						</span>
					</span>
					<span class="cover-in">
						<span class="ex-libris">
							<span>EX LIBRIS</span>
							<span class="ex-hint">책을 덮으려면 이 면을 누르세요</span>
						</span>
					</span>
				</button>
			</div>
		</div>
	</div>
</div>

<p class="hint" class:hidden={open}>책을 눌러 펼쳐 보세요</p>

<style>
	.stage {
		position: relative;
		width: calc(var(--w) * 2);
		height: calc(var(--h) * 1.12);
		left: 50%;
		display: grid;
		place-items: center;
		perspective: 2200px;
		/* centered on the page and scaled down to fit narrow screens */
		transform: translateX(-50%) scale(var(--fit));
		transform-origin: center top;
		margin-bottom: calc(var(--h) * 1.12 * (var(--fit) - 1));
	}

	.floor-shadow {
		position: absolute;
		left: 50%;
		bottom: 2%;
		width: calc(var(--w) * 1.05);
		height: 60px;
		border-radius: 50%;
		background: radial-gradient(closest-side, rgb(0 0 0 / 0.7), transparent);
		filter: blur(14px);
		transform: translateX(-50%);
		transition: transform 1100ms var(--ease-in-out);
	}

	.open .floor-shadow {
		transform: translateX(-50%) scaleX(1.9);
	}

	/* closed: resting at an angle. open: turned to face the reader, shifted so the spread is centered */
	.pose {
		transform-style: preserve-3d;
		transform: rotateX(14deg) rotateY(34deg) rotateZ(-2deg);
		transition: transform 1100ms var(--ease-in-out);
	}

	.open .pose {
		transform: translateX(calc(var(--w) / 2)) rotateX(10deg) rotateY(0deg);
	}

	.tilt {
		transform-style: preserve-3d;
	}

	.book {
		position: relative;
		width: var(--w);
		height: var(--h);
		transform-style: preserve-3d;
	}

	.face,
	.edge,
	.cover {
		position: absolute;
		inset: 0;
	}

	/* ---------- page block ---------- */

	.edge {
		background:
			repeating-linear-gradient(
				90deg,
				var(--paper) 0 1px,
				var(--paper-shade) 1px 2px,
				var(--paper-edge) 2px 3px
			),
			var(--paper);
	}

	/*
	 * Each side face is centered on the book, rotated to face outward, then pushed out by
	 * half the book's width/height. The page block is inset 4px so the boards overhang it.
	 */
	.edge-fore {
		width: calc(var(--d) - 8px);
		height: calc(var(--h) - 10px);
		top: 5px;
		left: calc((var(--w) - (var(--d) - 8px)) / 2);
		transform: rotateY(90deg) translateZ(calc(var(--w) / 2 - 4px));
	}

	.edge-top,
	.edge-bottom {
		width: calc(var(--w) - 6px);
		height: calc(var(--d) - 8px);
		left: 1px;
		top: calc((var(--h) - (var(--d) - 8px)) / 2);
		background:
			repeating-linear-gradient(
				0deg,
				var(--paper) 0 1px,
				var(--paper-shade) 1px 2px,
				var(--paper-edge) 2px 3px
			),
			var(--paper);
	}

	.edge-top {
		transform: rotateX(90deg) translateZ(calc(var(--h) / 2 - 4px));
	}

	.edge-bottom {
		transform: rotateX(-90deg) translateZ(calc(var(--h) / 2 - 4px));
	}

	.back {
		transform: translateZ(calc(var(--d) / -2)) rotateY(180deg);
		border-radius: 3px 8px 8px 3px;
		background:
			var(--grain),
			linear-gradient(90deg, var(--leather-dark), var(--leather) 30%, var(--leather-dark));
	}

	.spine {
		width: var(--d);
		left: calc((var(--w) - var(--d)) / 2);
		transform: rotateY(-90deg) translateZ(calc(var(--w) / 2));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-evenly;
		border-radius: 10px;
		background:
			var(--grain),
			linear-gradient(
				90deg,
				var(--leather-dark) 0%,
				var(--leather) 35%,
				#6e2c19 50%,
				var(--leather) 65%,
				var(--leather-dark) 100%
			);
		color: var(--gold);
		font-family: var(--font-display);
	}

	.band {
		width: 100%;
		height: 14px;
		background:
			linear-gradient(
				var(--gold) 0 1px,
				transparent 1px calc(100% - 1px),
				var(--gold) calc(100% - 1px)
			),
			linear-gradient(90deg, rgb(0 0 0 / 0.35), rgb(255 255 255 / 0.08) 50%, rgb(0 0 0 / 0.35));
	}

	.spine-title {
		writing-mode: vertical-rl;
		font-size: 30px;
		font-weight: 700;
		letter-spacing: 0.24em;
		background: var(--gold-foil);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.spine-sub {
		font-family: var(--font-serif);
		font-weight: 900;
		font-size: 22px;
		writing-mode: vertical-rl;
		letter-spacing: 0.2em;
	}

	.spine-ed {
		font-size: 22px;
		font-weight: 600;
	}

	/* ---------- first page ---------- */

	.first-page {
		inset: 5px 5px 5px 0;
		transform: translateZ(calc(var(--d) / 2 - 2px));
		border-radius: 2px 4px 4px 2px;
		background:
			var(--grain), linear-gradient(90deg, rgb(0 0 0 / 0.12), transparent 12%), var(--paper);
		color: var(--ink);
		overflow: hidden;
	}

	/* ---------- cover ---------- */

	.cover {
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		transform-style: preserve-3d;
		transform-origin: left center;
		transform: translateZ(calc(var(--d) / 2 + 2px)) rotateY(0deg);
		transition: transform 1100ms var(--ease-in-out);
	}

	.open .cover {
		transform: translateZ(calc(var(--d) / 2 + 2px)) rotateY(-172deg);
	}

	.cover-out,
	.cover-in {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		border-radius: 3px 8px 8px 3px;
	}

	.cover-out {
		display: grid;
		padding: 26px;
		background:
			var(--grain),
			radial-gradient(ellipse 80% 60% at 40% 30%, rgb(255 210 170 / 0.12), transparent 70%),
			linear-gradient(90deg, rgb(0 0 0 / 0.45), transparent 9%, transparent 92%, rgb(0 0 0 / 0.3)),
			var(--leather);
		box-shadow:
			inset 0 0 0 1px rgb(0 0 0 / 0.4),
			inset 0 0 40px rgb(0 0 0 / 0.45);
	}

	.frame {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: 1px solid var(--gold);
		outline: 1px solid color-mix(in oklab, var(--gold) 60%, transparent);
		outline-offset: 6px;
		color: var(--gold);
	}

	.corner {
		position: absolute;
		font-size: 18px;
		line-height: 1;
		color: var(--gold);
	}

	.tl {
		top: 8px;
		left: 10px;
		transform: rotate(180deg) scaleX(-1);
	}

	.tr {
		top: 8px;
		right: 10px;
		transform: rotate(180deg);
	}

	.bl {
		bottom: 8px;
		left: 10px;
	}

	.br {
		bottom: 8px;
		right: 10px;
		transform: scaleX(-1);
	}

	.mark {
		width: 46px;
		height: 55px;
		color: var(--gold);
		margin-bottom: 8px;
		filter: drop-shadow(0 1px 0 rgb(0 0 0 / 0.5));
	}

	.title {
		font-family: var(--font-display);
		font-size: 56px;
		font-weight: 700;
		letter-spacing: 0.18em;
		line-height: 1;
		margin-right: -0.18em;
		background: var(--gold-foil);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 1px 0 rgb(0 0 0 / 0.6));
	}

	.rule {
		width: 120px;
		height: 1px;
		background: var(--gold);
		position: relative;
	}

	.rule::after {
		content: '◆';
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -52%);
		font-size: 8px;
		color: var(--gold);
		background: var(--leather);
		padding: 0 6px;
	}

	.subtitle {
		font-family: var(--font-serif);
		font-weight: 900;
		font-size: 24px;
		letter-spacing: 0.32em;
		margin-right: -0.32em;
	}

	.edition {
		margin-top: 22px;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 17px;
		color: color-mix(in oklab, var(--gold) 80%, transparent);
	}

	/* the inside of the cover: a marbled endpaper (stripes of color pushed around by turbulence) */
	.cover-in {
		transform: rotateY(180deg);
		display: grid;
		place-items: center;
		background:
			var(--grain),
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='560'%3E%3Cfilter id='m' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.006 0.022' numOctaves='5' seed='7' result='t'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='t' scale='140' xChannelSelector='R' yChannelSelector='G' result='d'/%3E%3C/filter%3E%3Cg filter='url%28%23m%29'%3E%3Crect width='400' height='560' fill='%231d3a40'/%3E%3Crect y='30' width='400' height='26' fill='%232f5c63'/%3E%3Crect y='70' width='400' height='10' fill='%23c4914a'/%3E%3Crect y='96' width='400' height='34' fill='%2316302f'/%3E%3Crect y='150' width='400' height='14' fill='%235d8a85'/%3E%3Crect y='178' width='400' height='8' fill='%23e2c48a'/%3E%3Crect y='204' width='400' height='40' fill='%2324474c'/%3E%3Crect y='262' width='400' height='12' fill='%23a2683a'/%3E%3Crect y='290' width='400' height='30' fill='%231a3437'/%3E%3Crect y='336' width='400' height='18' fill='%236f9a90'/%3E%3Crect y='370' width='400' height='8' fill='%23d8b26d'/%3E%3Crect y='392' width='400' height='44' fill='%2320403f'/%3E%3Crect y='452' width='400' height='16' fill='%233e6d6a'/%3E%3Crect y='484' width='400' height='10' fill='%23b8803f'/%3E%3Crect y='510' width='400' height='36' fill='%23152b2c'/%3E%3C/g%3E%3C/svg%3E")
				center / cover,
			#1d3a40;
		box-shadow:
			inset 0 0 0 10px var(--leather),
			inset 0 0 0 11px var(--gold-lo),
			inset 0 0 50px rgb(0 0 0 / 0.55);
	}

	.ex-libris {
		display: grid;
		gap: 6px;
		place-items: center;
		padding: 22px 30px;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-display);
		font-size: 20px;
		letter-spacing: 0.3em;
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.35);
	}

	.ex-hint {
		font-family: var(--font-serif);
		font-size: 11px;
		letter-spacing: 0;
		color: var(--ink-soft);
	}

	.hint {
		margin: 8px 0 0;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 18px;
		color: color-mix(in oklab, var(--paper) 55%, transparent);
		transition: opacity 240ms var(--ease-out);
	}

	.hint.hidden {
		opacity: 0;
	}

	.instant .pose,
	.instant .cover,
	.instant .floor-shadow {
		transition: none;
	}

	/* reduced motion: no swing or turn; the cover simply fades away */
	.reduced .pose,
	.reduced .cover,
	.reduced .floor-shadow {
		transition: none;
	}

	.reduced .cover-out {
		transition: opacity 200ms ease;
	}

	.reduced.open .cover {
		transform: translateZ(calc(var(--d) / 2 + 2px));
		pointer-events: none;
	}

	.reduced.open .cover-out {
		opacity: 0;
	}
</style>
