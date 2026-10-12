<script>
	let {
		plain,
		withDefault = 1,
		lazyDefault = compute(),
		reassigned,
		value = $bindable(),
		...rest
	} = $props();

	function compute() {
		return 42;
	}
</script>

<p>{plain} {withDefault} {lazyDefault} {reassigned} {value} {rest.extra}</p>
<button onclick={() => (reassigned = 'changed')}>reassign</button>
