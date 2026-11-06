// Q1.6: the counter's nodes made two ways, counted.
//   node labs/01-compiled-output/create-vs-clone.mjs
//
// For each way, mounts the counter's markup N times in jsdom and counts
//   - how many times the HTML string is parsed,
//   - how many DOM functions JavaScript calls (createElement, append, cloneNode, ...),
//   - how many nodes one mount ends up with,
//   - how many steps (firstChild, nextSibling) it takes to reach the nodes the code needs
//     afterwards: the compiled counter walks the clone with $.first_child/$.child/$.sibling.
// The template way runs svelte@5.0.0's own `template()` (the study branch in svelte/).
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SVELTE_REPO } from '../../tools/paths.mjs';

const N = 100;

// a jsdom window as the global environment, before the runtime loads
const { JSDOM } = createRequire(path.join(SVELTE_REPO, 'package.json'))('jsdom');
const dom = new JSDOM('<!doctype html><body></body>');
for (const key of ['window', 'document', 'Node', 'Element', 'Text', 'Comment', 'DocumentFragment', 'HTMLElement', 'HTMLTemplateElement']) {
	globalThis[key] = key === 'window' ? dom.window : dom.window[key];
}

const src = (file) => pathToFileURL(path.join(SVELTE_REPO, 'packages/svelte/src/internal/client', file)).href;
const { template } = await import(src('dom/template.js'));
const { init_operations } = await import(src('dom/operations.js'));
const { set_active_effect } = await import(src('runtime.js'));
// the runtime walks the clone with the firstChild / nextSibling getters, which init_operations
// keeps a reference to; count them before it does
const walks = { n: 0 };
for (const name of ['firstChild', 'nextSibling']) {
	const desc = Object.getOwnPropertyDescriptor(dom.window.Node.prototype, name);
	Object.defineProperty(dom.window.Node.prototype, name, {
		...desc,
		get() {
			walks.n++;
			return desc.get.call(this);
		}
	});
}
init_operations();
const { first_child, child, sibling } = await import(src('dom/operations.js'));
// root() records the nodes it made on the effect that is running (assign_nodes);
// outside a component there is none, so give it a stand-in
const stand_in = () => set_active_effect(/** @type {any} */ ({ nodes_start: null, nodes_end: null }));

// count every call JavaScript makes into these DOM functions, and every HTML parse
const calls = new Map();
const spy = (proto, name, label = name) => {
	const original = proto[name];
	proto[name] = function (...args) {
		calls.set(label, (calls.get(label) ?? 0) + 1);
		return original.apply(this, args);
	};
};
spy(dom.window.Document.prototype, 'createElement');
spy(dom.window.Document.prototype, 'createDocumentFragment');
spy(dom.window.Document.prototype, 'importNode');
spy(dom.window.Node.prototype, 'cloneNode');
spy(dom.window.DocumentFragment.prototype, 'append', 'append');
spy(dom.window.Element.prototype, 'append', 'append');
// create_fragment_from_html parses by setting a <template>'s innerHTML
const inner = Object.getOwnPropertyDescriptor(dom.window.Element.prototype, 'innerHTML');
Object.defineProperty(dom.window.Element.prototype, 'innerHTML', {
	...inner,
	set(value) {
		calls.set('HTML 파싱(innerHTML)', (calls.get('HTML 파싱(innerHTML)') ?? 0) + 1);
		inner.set.call(this, value);
	}
});

/** nodes in a tree, the root included */
const count = (node) => 1 + [...node.childNodes].reduce((sum, child) => sum + count(child), 0);
const kinds = (node) => {
	const out = { element: 0, text: 0, comment: 0, fragment: 0 };
	const walk = (n) => {
		if (n.nodeType === 1) out.element++;
		else if (n.nodeType === 3) out.text++;
		else if (n.nodeType === 8) out.comment++;
		else if (n.nodeType === 11) out.fragment++;
		n.childNodes.forEach(walk);
	};
	walk(node);
	return out;
};

const ways = {
	'createElement로 하나씩 만드는 방식': () => {
		var fragment = document.createDocumentFragment();
		var button = document.createElement('button');
		button.append(' ');
		var p = document.createElement('p');
		p.append(' ');
		var button_1 = document.createElement('button');
		button_1.append('초기화');
		fragment.append(button, ' ', p, ' ', button_1);
		return fragment;
	},
	'템플릿을 복제하는 방식 (svelte@5.0.0 template())': (() => {
		var root = template(`<button> </button> <p> </p> <button>초기화</button>`, 1);
		return () => {
			stand_in();
			var fragment = root();
			// then, as the compiled counter does, walk to the nodes it needs
			var button = first_child(fragment);
			var text = child(button);
			var p = sibling(button, 2);
			var text_1 = child(p);
			var button_1 = sibling(p, 2);
			return fragment;
		};
	})()
};

for (const [name, mount] of Object.entries(ways)) {
	calls.clear();
	walks.n = 0;
	let last;
	for (let i = 0; i < N; i++) last = mount();
	const total = [...calls.values()].reduce((a, b) => a + b, 0);
	console.log(`\n## ${name}, ${N}번 마운트`);
	for (const [label, n] of calls) console.log(`  ${label}: ${n}번`);
	console.log(`  DOM 함수 호출 합계: ${total - (calls.get('HTML 파싱(innerHTML)') ?? 0)}번 (마운트 한 번에 약 ${((total - (calls.get('HTML 파싱(innerHTML)') ?? 0)) / N).toFixed(2)}번)`);
	console.log(`  노드를 찾아가는 접근(firstChild, nextSibling): ${walks.n}번 (마운트 한 번에 약 ${(walks.n / N).toFixed(2)}번)`);
	const k = kinds(last);
	console.log(`  마운트 한 번에 생기는 노드: ${count(last)}개 (fragment ${k.fragment}, 요소 ${k.element}, 텍스트 ${k.text}, 주석 ${k.comment})`);
}
