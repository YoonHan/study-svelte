<script>
	import { siJavascript, siSvelte } from 'simple-icons';

	/**
	 * The file type's logo next to a file name (Simple Icons, CC0).
	 * @type {{ name: string }}
	 */
	let { name } = $props();

	let icon = $derived(
		name.endsWith('.svelte') ? siSvelte : name.endsWith('.js') ? siJavascript : null
	);
</script>

{#if icon}
	<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="#{icon.hex}"
		><path d={icon.path} /></svg
	>
{/if}

<style>
	.icon {
		flex: none;
		width: 1em;
		height: 1em;
		vertical-align: -0.12em;
	}
</style>
