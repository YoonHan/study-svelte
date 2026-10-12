<!-- Keyed each block whose order is driven from outside (see perm.svelte.js).
     Used by labs/03-dom/each-moves.steps.mjs -->
<script>
	import { list } from './perm.svelte.js';
</script>

<ul>
	{#each list.order as key (key)}
		<li>{key}</li>
	{/each}
</ul>
