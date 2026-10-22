<script>
	import NodeTree from './NodeTree.svelte';

	/**
	 * `mark`: draw this node's label in pen colour, for when the words beside the tree name it
	 * (only this node, not its children).
	 *
	 * @type {{ node: import('./runtime.js').Outline, mark?: boolean }}
	 */
	let { node, mark = false } = $props();
</script>

<li class="node {node.type}">
	<span class="label" class:mark>{node.label}</span>
	{#if node.children.length}
		<ul>
			{#each node.children as child, i (i)}
				<NodeTree node={child} />
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
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.8;
		white-space: pre;
	}

	.text > .label {
		color: #b45309;
	}

	.comment > .label,
	.fragment > .label {
		color: var(--fg-3);
	}

	.node > .label.mark {
		color: var(--accent);
		font-weight: 600;
	}

	@media (prefers-color-scheme: dark) {
		.text > .label {
			color: #fbbf24;
		}
	}
</style>
