<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>{count}</button>
<p>두 배: {count * 2}</p>
<button onclick={() => count = 0}>초기화</button>

<p>도움말 1</p>
<p>도움말 2</p>
<p>도움말 3</p>
<p>도움말 4</p>
<p>도움말 5</p>
