/**
 * The one example the whole site studies, a little deeper in every chapter.
 */

export const COUNTER_SOURCE = `<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>{count}</button>
<p>두 배: {count * 2}</p>
<button onclick={() => count = 0}>초기화</button>
`;

/** The template string svelte@5.0.0 compiles the counter's markup into. */
export const COUNTER_TEMPLATE = '<button> </button> <p> </p> <button>초기화</button>';

/**
 * @typedef {object} Door
 * @property {string} chapter learning-path chapter that opens this line, e.g. `1-2`
 */

/** @type {[RegExp, Door][]} */
const DOORS = [
	[/\$\.template\(|= root\(\)/, { chapter: '1-1' }],
	[/\$\.(first_child|child|sibling|reset)\(/, { chapter: '1-2' }],
	[/\$\.append\(/, { chapter: '1-3' }],
	[/\$\.(template_effect|set_text)\(/, { chapter: '1-4' }],
	[/__click|\$\.delegate\(|on_click/, { chapter: '1-6' }],
	[/\$\.state\(/, { chapter: '1-5' }]
];

/**
 * Which chapter opens a line of the counter's compiled output, if any.
 * @param {string} line plain source text of one compiled line
 * @returns {Door | undefined}
 */
export function door_of(line) {
	return DOORS.find(([pattern]) => pattern.test(line))?.[1];
}

/**
 * The same counter written by hand with the DOM API, no framework (chapter 1-0 compares it
 * with the compiled output). From the learner's own version (scratch/01-vanilla-counter.html),
 * without its later experiment and with `document.createElement` called directly.
 */
export const VANILLA_SOURCE = `let count = 0;

const increaseButton = document.createElement('button');
increaseButton.addEventListener('click', () => {
  count++;
  render();
});

const doubleCount = document.createElement('p');

const resetButton = document.createElement('button');
resetButton.innerText = '초기화';
resetButton.addEventListener('click', () => {
  count = 0;
  render();
});

function render() {
  increaseButton.innerText = count;
  doubleCount.innerText = \`두 배: \${count * 2}\`;
}

document.body.appendChild(increaseButton);
document.body.appendChild(doubleCount);
document.body.appendChild(resetButton);
render();
`;
