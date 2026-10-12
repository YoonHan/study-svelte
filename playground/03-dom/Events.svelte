<!-- Event delegation playground. Handlers only console.log, so the DOM never changes:
     node tools/mount.mjs playground/03-dom/Events.svelte --script labs/03-dom/events.steps.mjs -q -->
<script>
	import { on } from 'svelte/events';

	let { mode = 'addEventListener' } = $props();
	let count = $state(0);
	let wrapper;

	function outer_handler() {
		console.log('    outer <section> onclick (declarative)');
	}

	$effect(() => {
		const handler = () => console.log(`    wrapper <div> listener added with ${mode}`);
		if (mode === 'on') return on(wrapper, 'click', handler);
		wrapper.addEventListener('click', handler);
		return () => wrapper.removeEventListener('click', handler);
	});
</script>

<section onclick={outer_handler}>
	<div class="wrapper" bind:this={wrapper}>
		<button class="hoisted" onclick={() => count++}>hoisted handler</button>
		<button class="stop" onclick={(e) => { e.stopPropagation(); console.log('    stop button (declarative, calls stopPropagation)'); }}>stop</button>
		<button class="plain" onclick={() => console.log('    plain button (declarative)')}>plain</button>
	</div>
	<input class="field" onfocus={() => console.log('    input onfocus (declarative)')} />
</section>

{#each ['x', 'y'] as item, i}
	<button class="item" onclick={() => console.log(`    item ${item} at index ${i}`)}>{item}</button>
{/each}
