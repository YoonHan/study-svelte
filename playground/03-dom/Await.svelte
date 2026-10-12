<script>
	import { deferred } from './deferred.js';

	let input = $state(deferred());
</script>

<button class="deferred" onclick={() => (input = deferred())}>new deferred promise</button>
<button class="resolved" onclick={() => (input = Promise.resolve('instant'))}>already-resolved promise</button>
<button class="plain" onclick={() => (input = 'plain value')}>non-promise value</button>

{#await input}
	<p class="pending">pending…</p>
{:then value}
	<p class="then">then: {value}</p>
{:catch error}
	<p class="catch">catch: {error}</p>
{/await}
