import { runtime, probe, run, label_of } from '../runtime.js';
// the constants exactly as svelte@5.0.0 defines them (not part of its public exports)
import {
	TEMPLATE_FRAGMENT,
	TEMPLATE_USE_IMPORT_NODE
} from '../../../../node_modules/svelte-5.0.0/src/constants.js';

/**
 * @typedef {object} Value what a variable of `template()` holds while the counter is mounted
 * @property {string} word the variable's name in template.js
 * @property {string} value what it holds, as code
 * @property {string} text one sentence on where the value comes from; `backticks` for code
 * @property {string} when when it gets that value: when the module loads, or when it mounts
 * @property {[number, number]} [lines] lines of template.js to show with it, when they are
 *   not on the stage (inside a part not opened yet)
 * @property {string} since id of the beat that explains it: before that, the value would give
 *   a question away
 */

// `$.template(...)` runs once when the module loads; what it returns, `root`, at each mount
const LOAD = '카운터 모듈을 불러올 때';
const MOUNT = '카운터를 마운트할 때 (`root()` 호출)';

/** @param {Node} node */
function describe(node) {
	if (node.nodeType === 11) return `DocumentFragment (자식 노드 ${node.childNodes.length}개)`;
	return label_of(node);
}

/**
 * The values `template()` works with when the counter mounts, found by running svelte@5.0.0:
 * the arguments are the compiled code's, the flag tests are the same expressions evaluated
 * with 5.0.0's own constants, and `node` and `clone` are observed while `root()` really runs
 * (twice, as two mounts would), watching which DOM calls it makes.
 *
 * @param {string} content first argument of `$.template(...)` in the compiled counter
 * @param {number} flags its second argument
 * @returns {Value[]}
 */
export function trace_template(content, flags) {
	const is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0;
	const use_import_node = (flags & TEMPLATE_USE_IMPORT_NODE) !== 0;
	const has_start = !content.startsWith('<!>');

	const root = runtime.template(content, flags);
	/** @type {ReturnType<typeof probe<Node>>[]} */
	const calls = [];
	let returned = '';
	// root() records its nodes on the effect it runs in, so it has to run inside a mount; read
	// what it returned before unmounting, which takes those nodes away again
	const stop = run(document.createElement('div'), () => {
		calls.push(probe(() => /** @type {Node} */ (root())));
		calls.push(probe(() => /** @type {Node} */ (root())));
		returned = describe(calls[0].result);
	});
	stop();

	const [first, second] = calls;
	const parsed = first.parsed[0]?.content;
	const node = parsed && (is_fragment ? parsed : parsed.firstChild);
	const copy = first.copies[0] ?? 'cloneNode';

	const bin = (/** @type {number} */ n) => n.toString(2).padStart(2, '0');

	return [
		{
			word: 'content',
			value: JSON.stringify(content),
			text: '컴파일 결과가 `$.template`에 넘긴 첫 번째 인자입니다.',
			when: LOAD,
			since: 'template-open'
		},
		{
			word: 'flags',
			value: `${flags}`,
			text: `컴파일 결과가 넘긴 두 번째 인자입니다. 이진수로 \`${bin(flags)}\`입니다.`,
			when: LOAD,
			since: 'template-open'
		},
		{
			word: 'has_start',
			value: `${has_start}`,
			text: `${
				has_start
					? '`content`가 `<!>`로 시작하지 않으므로 `true`입니다.'
					: '`content`가 `<!>`로 시작하므로 `false`입니다.'
			} 이 값을 계산하는 줄은 미지의 부분 "주석 노드(<!>)로 시작하는 템플릿" 안에 있습니다.`,
			lines: [38, 38],
			when: LOAD,
			since: 'template-open'
		},
		{
			word: 'is_fragment',
			value: `${is_fragment}`,
			text: `\`flags & TEMPLATE_FRAGMENT\`는 \`${bin(flags)} & ${bin(TEMPLATE_FRAGMENT)} = ${bin(flags & TEMPLATE_FRAGMENT)}\`이고, ${is_fragment ? '0이 아니므로 `true`' : '0이므로 `false`'}입니다.`,
			when: LOAD,
			since: 'flags-read'
		},
		{
			word: 'use_import_node',
			value: `${use_import_node}`,
			text: `\`flags & TEMPLATE_USE_IMPORT_NODE\`는 \`${bin(flags)} & ${bin(TEMPLATE_USE_IMPORT_NODE)} = ${bin(flags & TEMPLATE_USE_IMPORT_NODE)}\`이고, ${use_import_node ? '0이 아니므로 `true`' : '0이므로 `false`'}입니다.`,
			when: LOAD,
			since: 'flags-read'
		},
		{
			word: 'node',
			value: node ? describe(node) : 'undefined',
			text: `처음에는 \`undefined\`입니다. 첫 번째 \`root()\`에서 HTML을 파싱해 저장하고(파싱 ${first.parsed.length}번), 두 번째 \`root()\`에서는 저장된 값을 그대로 씁니다(파싱 ${second.parsed.length}번).`,
			when: MOUNT,
			// it tells how many times the HTML is parsed: question 5's answer
			since: 'parse-once'
		},
		{
			word: 'clone',
			value: returned,
			text: `\`node\`를 \`${copy}\`로 복제한 결과입니다. \`root()\`를 호출할 때마다 새로 만들어지고, \`root()\`가 이 값을 반환합니다.`,
			when: MOUNT,
			since: 'clone-kind'
		}
	];
}
