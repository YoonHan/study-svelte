<!-- Same as KeyedList.svelte, except the {#each} block is NOT the only child of <ul>. -->
<script>
	import { initial, ops } from './list-ops.js';
	let items = $state(initial());
</script>

{#each Object.keys(ops) as op}
	<button class={op} onclick={() => (items = ops[op](items))}>{op}</button>
{/each}

<ul>
	<li class="header">items:</li>
	{#each items as item (item.id)}
		<li>{item.label}</li>
	{/each}
</ul>
