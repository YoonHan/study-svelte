<script>
	import ContentsBody from '#lib/inside/ContentsBody.svelte';
	import MetalLogo from '#lib/home/MetalLogo.svelte';
	import { STAGES } from '#lib/path.js';

	// the way in: the first chapter on the path that is ready
	const FIRST = STAGES.flatMap((stage) => stage.chapters).find((chapter) => chapter.ready);
	import { FONTS } from '#lib/fonts/fonts.js';

	/** the title comes in a word at a time */
	const TITLE = 'Svelte 5 내부 탐구'.split(' ');
</script>

<svelte:head>
	<title>Svelte 5 내부 탐구</title>
	<!-- svelte@5.0.0, under the title, is in code type -->
	<link
		rel="preload"
		href={FONTS['inside-mono-600']}
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

<main class="home">
	<header>
		<!-- the logo in metal beside the title (above it on a phone) -->
		<div class="mark rise" style:--delay="120ms"><MetalLogo /></div>
		<h1>
			{#each TITLE as word, i (i)}<span class="word rise" style:--delay="{i * 80}ms">{word}</span
				>{i < TITLE.length - 1 ? ' ' : ''}{/each}
		</h1>
		<p class="lead rise" style:--delay="340ms">
			카운터 컴포넌트 하나를 컴파일한 결과를 한 줄씩 따라가면서, 그 줄이 호출하는 런타임 함수의
			안쪽을 실험으로 직접 확인하는 공부 노트입니다. Svelte를 써 본 적이 있다면 바로 시작할 수
			있습니다.
		</p>
		<p class="version rise" style:--delay="440ms">
			모든 코드와 실험은 <code class="marker">svelte@5.0.0</code>을 기준으로 합니다.
		</p>
		<a class="start pen-go rise" style:--delay="540ms" href="/learn/{FIRST?.id}">처음부터 읽기</a>
	</header>

	<h2 class="toc rise" style:--delay="720ms">목차</h2>
	<ContentsBody entrance={760} />
</main>

<style>
	/* each word rises on its own (a transform needs a box) */
	.word {
		display: inline-block;
	}

	/* the link stays an inline box with its highlighter while it rises */
	.start.rise {
		display: inline-block;
	}

	.home {
		max-width: 760px;
		margin: 0 auto;
		padding: 64px 24px 120px;
	}

	/* the words on the left, the metal logo on the right; on a phone the logo comes first */
	header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 200px;
		grid-template-areas:
			'title mark'
			'lead mark'
			'version mark'
			'start mark';
		column-gap: 28px;
		align-items: start;
		margin-bottom: 48px;
	}

	header h1 {
		grid-area: title;
	}

	header .lead {
		grid-area: lead;
	}

	header .version {
		grid-area: version;
	}

	header .start {
		grid-area: start;
		justify-self: start;
	}

	.mark {
		grid-area: mark;
		align-self: center;
		margin: -24px -16px -24px 0;
	}

	@media (max-width: 639px) {
		header {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'mark' 'title' 'lead' 'version' 'start';
		}

		.mark {
			justify-self: start;
			width: 132px;
			margin: -16px 0 0 -20px;
		}
	}

	h1 {
		margin: 0 0 16px;
		font-family: var(--font-head);
		font-size: clamp(32px, 5vw, 44px);
		font-weight: 800;
		letter-spacing: -0.025em;
	}

	.lead {
		margin: 0 0 20px;
		font-size: 17px;
		color: var(--fg-2);
	}

	.version {
		margin: -8px 0 20px;
		font-size: 14px;
		color: var(--fg-2);
	}

	/* the one version everything is checked against, marked with the highlighter */
	.version code {
		font-size: 15px;
		font-weight: 600;
		color: var(--fg);
	}

	/* the way in: a link with a pen arrow (.pen-go, app.css) */
	.start {
		font-size: 18px;
	}

	.toc {
		margin: 0 0 18px;
		font-family: var(--font-hand);
		font-size: 34px;
		font-weight: 400;
		color: var(--accent);
	}
</style>
