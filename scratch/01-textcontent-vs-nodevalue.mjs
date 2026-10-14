// 실험: 요소에 textContent를 대입하는 방식과 텍스트 노드의 nodeValue를 바꾸는 방식은
// DOM에서 어떤 변경을 일으키는가? MutationObserver로 기록한다.
//
// 실행: node scratch/01-textcontent-vs-nodevalue.mjs
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('svelte/package.json'));
const { JSDOM } = require('jsdom');
const { document, MutationObserver } = new JSDOM('<p id="a"> </p><p id="b"> </p>').window;

async function observe(label, target, update) {
	const records = [];
	const observer = new MutationObserver((list) => records.push(...list));
	observer.observe(target, { subtree: true, childList: true, characterData: true, characterDataOldValue: true });

	const before = target.firstChild;
	for (let count = 1; count <= 3; count++) update(count);
	await new Promise((r) => setTimeout(r));
	observer.disconnect();

	console.log(`\n[${label}] 값을 3번 바꿈`);
	for (const r of records) {
		if (r.type === 'childList') {
			console.log(`  childList     추가 ${r.addedNodes.length}개, 제거 ${r.removedNodes.length}개`);
		} else {
			console.log(`  characterData 텍스트 노드 내용 변경 (이전 값: ${JSON.stringify(r.oldValue)})`);
		}
	}
	console.log(`  처음의 텍스트 노드가 그대로 남아 있는가: ${target.firstChild === before}`);
}

const a = document.getElementById('a');
await observe('textContent', a, (count) => {
	a.textContent = `state: ${count}`;
});

const b = document.getElementById('b');
const text = b.firstChild; // $.child(p)가 하는 일
await observe('nodeValue', b, (count) => {
	text.nodeValue = `state: ${count}`; // $.set_text가 하는 일
});
