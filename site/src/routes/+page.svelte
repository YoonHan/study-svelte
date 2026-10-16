<script>
	import { onMount } from 'svelte';
	import Book from '#lib/book/Book.svelte';
	import Contents from '#lib/book/Contents.svelte';

	let open = $state(false);
	let instant = $state(false);

	// coming back from a chapter (`/?toc`) opens the book straight to the contents, without the swing
	onMount(() => {
		if (!new URLSearchParams(location.search).has('toc')) return;
		instant = true;
		open = true;
		requestAnimationFrame(() => requestAnimationFrame(() => (instant = false)));
	});
</script>

<svelte:head>
	<title>Svelte 대백과</title>
	<meta
		name="description"
		content="Svelte를 써 본 개발자를 위한 Svelte 5 내부 구조 학습서. 질문을 먼저 보고, 스스로 생각한 뒤, svelte@5.0.0의 소스 코드와 실험으로 확인한 해설을 펼쳐 봅니다."
	/>
</svelte:head>

<main class="study">
	<Book bind:open {instant}>
		<Contents />
	</Book>
</main>

<style>
	.study {
		min-height: 100vh;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-content: center;
		padding: 80px 0 40px;
		overflow: hidden;
	}
</style>
