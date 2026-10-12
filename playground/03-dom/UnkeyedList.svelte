<script>
	import { initial, ops } from './list-ops.js';
	let items = $state(initial());
</script>

{#each Object.keys(ops) as op}
	<button class={op} onclick={() => (items = ops[op](items))}>{op}</button>
{/each}

<ul>
	{#each items as item}
		<li>{item.label}</li>
	{/each}
</ul>
