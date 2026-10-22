<script>
	import Code from '../Code.svelte';
	import { inline_code } from '../text.js';
	import { JOBS } from '#lib/compare.js';
	import { chapter_of } from '#lib/path.js';

	/**
	 * The map that ends chapter 1-0: each of the seven differences between the hand-written
	 * counter and the compiled output, as a card with the lines of each that do the job, the
	 * "why" question the difference raises and the chapter that answers it. Cards stack in one
	 * column, so they read the same on a phone.
	 *
	 * @type {{
	 *   vanilla: import('#lib/types.js').CodeFile,
	 *   compiled: import('#lib/types.js').CodeFile
	 * }}
	 */
	let { vanilla, compiled } = $props();
</script>

<ol class="map">
	{#each JOBS as job (job.no)}
		{@const chapter = chapter_of(job.chapter)}
		<li class="card">
			<p class="name"><span class="no">{job.no}</span>{job.job}</p>
			<!-- each label close to its code; the two pairs (and what follows) well apart -->
			<div class="part">
				<p class="which">직접 짠 카운터</p>
				{#if job.vanilla.length}
					<div class="excerpt"><Code code={vanilla} title="" only={job.vanilla} wrap /></div>
				{:else}
					<p class="none">없음 (만들 때 이미 변수에 담겨 있음)</p>
				{/if}
			</div>
			<div class="part">
				<p class="which">컴파일 결과</p>
				<div class="excerpt"><Code code={compiled} title="" only={job.compiled} wrap /></div>
			</div>
			<p class="why"><span class="why-label">왜?</span> {@html inline_code(job.why)}</p>
			{#if chapter?.ready}
				<a class="go pen-go" href="/learn/{job.chapter}">{job.chapter}장 {chapter.title}</a>
			{:else if chapter}
				<p class="go soon">{job.chapter}장 {chapter.title} (준비 중)</p>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.map {
		display: grid;
		gap: 14px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: grid;
		gap: 16px;
		padding: 14px 16px 16px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface);
	}

	/* the beat's paragraph margin (Beat.svelte) stops here: the gaps alone space the card */
	.map .card p {
		margin: 0;
	}

	.name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-head);
		font-size: 17px;
		font-weight: 700;
	}

	/* the job's number circled in pen, as beside its lines on the code */
	.no {
		display: grid;
		place-items: center;
		flex: none;
		width: 24px;
		height: 24px;
		border: 1.5px solid var(--accent);
		border-radius: 50% 46% 52% 48%;
		font-family: var(--font-label);
		font-size: 13px;
		font-weight: 500;
		color: var(--accent);
	}

	.part {
		display: grid;
		gap: 9px;
	}

	.which {
		font-family: var(--font-hand);
		font-size: 18px;
		line-height: 1.2;
		color: var(--fg-2);
	}

	.excerpt {
		overflow: hidden;
		border-radius: 6px;
		background: var(--surface-2);
	}

	.none {
		font-size: 14px;
		color: var(--fg-3);
	}

	.why {
		font-size: 15px;
		line-height: 1.65;
	}

	.why-label {
		font-family: var(--font-hand);
		font-size: 20px;
		color: var(--accent);
	}

	.go {
		justify-self: start;
		font-size: 15.5px;
	}

	.go.soon {
		font-family: var(--font-head);
		font-weight: 700;
		color: var(--fg-3);
	}
</style>
