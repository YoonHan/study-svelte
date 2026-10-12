<!-- Compare how different template shapes are compiled. Run:
     node tools/compile.mjs playground/03-dom/Shapes.svelte -->
<script>
	import Single from './shapes/Single.svelte';
	import Fragment from './shapes/Fragment.svelte';
	import TextOnly from './shapes/TextOnly.svelte';
	import BlockFirst from './shapes/BlockFirst.svelte';
</script>

<Single />
<Fragment />
<TextOnly />
<BlockFirst />
