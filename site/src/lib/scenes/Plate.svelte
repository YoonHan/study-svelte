<script>
	/**
	 * A numbered plate on the recto: one or more figures and a caption under them.
	 * @type {{ number: number | string, caption: string, children: import('svelte').Snippet }}
	 */
	let { number, caption, children } = $props();
</script>

<figure class="plate">
	<div class="figures">
		{@render children()}
	</div>
	<figcaption>
		<span class="no">도판 {number}.</span>
		{caption}
	</figcaption>
</figure>

<style>
	.plate {
		margin: 0;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.figures {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	figcaption {
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid var(--rule);
		font-size: 13.5px;
		line-height: 1.65;
		color: var(--ink-soft);
		text-align: center;
	}

	.no {
		font-family: var(--font-display);
		font-weight: 700;
		font-style: italic;
		font-size: 15px;
		color: var(--rubric);
		margin-right: 4px;
	}
</style>
