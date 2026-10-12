<script>
	import Child from './Child.svelte';

	let show = $state(true);
	let items = $state([
		{ id: 1, text: 'a' },
		{ id: 2, text: 'b' }
	]);
</script>

{#if show}
	<p>visible</p>
{:else}
	<p>hidden</p>
{/if}

<ul>
	{#each items as item}
		<li>{item.text}</li>
	{/each}
</ul>

<ul>
	{#each items as item (item.id)}
		<li>{item.text}</li>
	{/each}
</ul>

<Child label="hello">
	<p>slotted content</p>
</Child>

<button onclick={() => (show = !show)}>toggle</button>
