<script>
	import { stages } from '#lib/path.js';

	const numerals = ['I', 'II', 'III', 'IV', 'V'];
</script>

<div class="contents">
	<p class="kicker">CONTENTS</p>
	<h2>목차</h2>

	<ol class="parts">
		{#each stages as stage, i (stage.number)}
			<li class="part">
				<p class="part-title">
					<span class="numeral">{numerals[i]}</span>
					<span>{stage.title}</span>
				</p>
				{#if stage.chapters.length}
					<ol class="chapters">
						{#each stage.chapters as chapter (chapter.id)}
							<li class:open={!!chapter.href}>
								{#if chapter.href}
									<a href={chapter.href}>
										<span class="name">{chapter.title}</span>
										<span class="leader"></span>
										<span class="id">{chapter.id}</span>
									</a>
								{:else}
									<span class="row">
										<span class="name">{chapter.title}</span>
										<span class="leader"></span>
										<span class="id">{chapter.id}</span>
									</span>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</li>
		{/each}
	</ol>

	<p class="colophon">붉은 글씨의 장만 지금 읽을 수 있습니다</p>
</div>

<style>
	.contents {
		height: 100%;
		padding: 30px 30px 22px 34px;
		display: flex;
		flex-direction: column;
		font-size: 12.5px;
		line-height: 1.5;
	}

	.kicker {
		margin: 0;
		font-family: var(--font-display);
		letter-spacing: 0.4em;
		font-size: 11px;
		color: var(--ink-faint);
		text-align: center;
	}

	h2 {
		margin: 2px 0 14px;
		text-align: center;
		font-size: 22px;
		font-weight: 900;
		letter-spacing: 0.5em;
		margin-right: -0.5em;
		color: var(--rubric);
	}

	.parts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 9px;
	}

	.part-title {
		margin: 0 0 3px;
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-weight: 700;
		color: var(--ink);
		border-bottom: 1px solid var(--rule);
		padding-bottom: 2px;
	}

	.numeral {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 15px;
		color: var(--rubric);
		width: 1.6em;
	}

	.chapters {
		list-style: none;
		margin: 0;
		padding: 0 0 0 calc(1.6em + 8px);
	}

	.chapters a,
	.row {
		display: flex;
		align-items: baseline;
		gap: 6px;
		text-decoration: none;
		color: var(--ink-faint);
	}

	.open a {
		color: var(--rubric);
		font-weight: 700;
	}

	.leader {
		flex: 1;
		min-width: 12px;
		border-bottom: 1px dotted currentColor;
		opacity: 0.6;
		transform: translateY(-3px);
	}

	.id {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 13px;
	}

	.name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (hover: hover) and (pointer: fine) {
		.open a .name {
			background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
			transition: background-size 200ms var(--ease-out);
		}

		.open a:hover .name {
			background-size: 100% 1px;
		}
	}

	.colophon {
		margin: auto 0 0;
		text-align: center;
		font-size: 10.5px;
		color: var(--ink-faint);
	}
</style>
