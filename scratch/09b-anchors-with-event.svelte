<script>
	let show = $state(true);
	let name = $state('svelte');
</script>

{#if show}<span>first</span>{/if}
{name} is the second node
<b onclick={() => console.log('hi')}>static</b>
<i>static</i>
<em>{name}</em>
