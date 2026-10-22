<script>
	/**
	 * An experiment that runs the real svelte@5.0.0 runtime.
	 * @type {{ title: string, children: import('svelte').Snippet }}
	 */
	let { title, children } = $props();

	// ids inside the icon must not collide when a page has several experiments
	const uid = $props.id();
</script>

<section class="lab">
	<header>
		<span class="badge">
			<svg class="flask" viewBox="0 0 24 24" aria-hidden="true">
				<defs>
					<!-- the inside of the flask: the liquid and its bubbles stay in it -->
					<clipPath id="{uid}-inside">
						<path d="M10.3 9.4L4.3 19.6c-.6 1.1.2 2.4 1.4 2.4h12.6c1.2 0 2-1.3 1.4-2.4L13.8 9.4z" />
					</clipPath>
				</defs>
				<g clip-path="url(#{uid}-inside)">
					<g class="liquid">
						<!-- a wavy surface, wider than the flask, sliding by one wave in a loop -->
						<path class="wave" d="M0 15.2q1.5-1 3 0t3 0 3 0 3 0 3 0 3 0 3 0 3 0 3 0V24H0z" />
					</g>
					<circle class="bubble b1" cx="9.4" cy="21" r="0.75" />
					<circle class="bubble b2" cx="12.6" cy="21.2" r="0.6" />
					<circle class="bubble b3" cx="14.6" cy="20.8" r="0.7" />
					<circle class="bubble b4" cx="11.2" cy="21.3" r="0.5" />
					<circle class="bubble b5" cx="7.6" cy="20.9" r="0.55" />
				</g>
				<path
					class="glass"
					d="M9.6 2.6h4.8M10.2 2.8c.1 2.4 0 4.6.1 6.6L4.3 19.6c-.6 1.1.2 2.4 1.4 2.4h12.6c1.2 0 2-1.3 1.4-2.4l-5.9-10.2c.1-2 0-4.2.1-6.6"
				/>
				<!-- vapour rising out of the neck -->
				<circle class="vapour v1" cx="12" cy="2" r="1" />
				<circle class="vapour v2" cx="12" cy="2" r="0.8" />
				<circle class="vapour v3" cx="12" cy="2" r="0.9" />
			</svg>
			실험
		</span>
		<span class="title">{title}</span>
	</header>
	<div class="body">
		{@render children()}
	</div>
</section>

<style>
	/* an experiment is a card clipped into the notebook */
	.lab {
		margin: 4px 0 0;
		border: 1px solid var(--line);
		border-radius: 3px;
		background: var(--surface);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
		overflow: hidden;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--line);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-hand);
		font-size: 20px;
		line-height: 1;
		color: var(--accent);
	}

	.flask {
		width: 22px;
		height: 22px;
		overflow: visible;
	}

	.flask .glass {
		fill: none;
		stroke: var(--fg);
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/*
	 * The experiment is running, a lab bench left on: the liquid boils (its surface rolls by
	 * and it bobs), bubbles keep rising through it and burst at the surface, and vapour leaves
	 * the neck, growing and fading as it rises. Small, but enough to be seen beside the title.
	 * transform + opacity only; reduced motion keeps the flask still.
	 */
	.flask .liquid {
		fill: var(--accent);
		opacity: 0.55;
		animation: boil 0.9s ease-in-out infinite alternate;
	}

	.flask .wave {
		animation: roll 1.1s linear infinite;
	}

	@keyframes boil {
		to {
			transform: translateY(-0.5px);
		}
	}

	@keyframes roll {
		to {
			transform: translateX(-6px);
		}
	}

	.flask .bubble {
		fill: none;
		stroke: var(--accent);
		stroke-width: 0.5;
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
	}

	.flask .b1 {
		animation: bubble 1.3s ease-in 0s infinite;
	}

	.flask .b2 {
		animation: bubble 1.3s ease-in 0.26s infinite;
	}

	.flask .b3 {
		animation: bubble 1.3s ease-in 0.52s infinite;
	}

	.flask .b4 {
		animation: bubble 1.3s ease-in 0.78s infinite;
	}

	.flask .b5 {
		animation: bubble 1.3s ease-in 1.04s infinite;
	}

	/* from the bottom up to the surface, where it swells and bursts */
	@keyframes bubble {
		0% {
			opacity: 0;
			transform: translate(0, 0) scale(0.6);
		}
		15% {
			opacity: 1;
		}
		50% {
			transform: translate(0.6px, -3px) scale(0.9);
		}
		82% {
			opacity: 1;
			transform: translate(-0.4px, -5.8px) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(0, -6.2px) scale(1.8);
		}
	}

	.flask .vapour {
		fill: none;
		stroke: var(--fg-2);
		stroke-width: 0.7;
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
	}

	.flask .v1 {
		animation: vapour 2.4s ease-out 0s infinite;
	}

	.flask .v2 {
		animation: vapour-left 2.4s ease-out 0.8s infinite;
	}

	.flask .v3 {
		animation: vapour 2.4s ease-out 1.6s infinite;
	}

	/* out of the neck and up, drifting, growing and thinning out */
	@keyframes vapour {
		0% {
			opacity: 0;
			transform: translate(0, 1px) scale(0.5);
		}
		20% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: translate(2.5px, -9px) scale(1.8);
		}
	}

	@keyframes vapour-left {
		0% {
			opacity: 0;
			transform: translate(0, 1px) scale(0.5);
		}
		20% {
			opacity: 0.9;
		}
		100% {
			opacity: 0;
			transform: translate(-2.5px, -8px) scale(1.6);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flask .liquid,
		.flask .wave,
		.flask .bubble,
		.flask .vapour {
			animation: none;
		}
	}

	.title {
		font-family: var(--font-head);
		font-size: 15px;
		font-weight: 700;
	}

	.body {
		padding: 16px;
	}
</style>
