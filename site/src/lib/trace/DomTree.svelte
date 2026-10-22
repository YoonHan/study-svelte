<script>
	import DomTree from './DomTree.svelte';

	/**
	 * @type {{
	 *   node: import('./engine.js').TreeNode,
	 *   highlight: Set<number>
	 * }}
	 */
	let { node, highlight } = $props();
</script>

<li class="node {node.type}" class:hit={highlight.has(node.id)}>
	<span class="label">{node.label}</span>
	{#if node.children.length}
		<ul>
			{#each node.children as child (child.id)}
				<DomTree node={child} {highlight} />
			{/each}
		</ul>
	{/if}
</li>

<style>
	.node {
		list-style: none;
	}

	ul {
		margin: 0;
		padding-left: 16px;
		border-left: 1px dashed var(--line);
	}

	.label {
		display: inline-block;
		padding: 0 6px;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.75;
		white-space: pre;
		/* the touched node lights up as the reader steps; color only (emil-design-eng: ease) */
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}

	.text > .label {
		color: #b45309;
	}

	.comment > .label {
		color: var(--fg-3);
	}

	.hit > .label {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 600;
	}
</style>
