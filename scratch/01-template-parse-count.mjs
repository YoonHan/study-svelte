// 실험: 템플릿 HTML 파싱(create_fragment_from_html)은 언제, 몇 번 일어나는가?
//
// create_fragment_from_html()은 파싱할 때마다 document.createElement('template')를 호출한다
// (svelte/packages/svelte/src/internal/client/dom/reconciler.js). 그래서 이 호출 횟수를 세면
// 파싱 횟수를 알 수 있다.
//
// 실행: node scratch/01-template-parse-count.mjs [컴포넌트 경로]
//   예) node scratch/01-template-parse-count.mjs scratch/09c-anchors-show-false.svelte
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// 1. tools/mount.mjs와 같은 방식으로 jsdom을 전역 환경으로 설치한다
const { JSDOM } = createRequire(path.resolve('svelte/package.json'))('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
for (const key of Object.getOwnPropertyNames(dom.window)) {
	if (key in globalThis && !['window', 'document', 'navigator', 'Event', 'EventTarget'].includes(key)) continue;
	try {
		Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
	} catch {}
}

// 2. document.createElement('template') 호출 횟수를 센다
let parse_count = 0;
const original = document.createElement.bind(document);
document.createElement = (name, ...rest) => {
	if (name === 'template') parse_count++;
	return original(name, ...rest);
};

// 3. 컴포넌트 모듈을 import만 하고, 그다음 세 번 마운트한다
await import('../tools/loader.mjs');
const { mount } = await import('svelte');
const component_path = path.resolve(process.argv[2] ?? 'playground/01-compiled-output/09-anchors.svelte');
const { default: Component } = await import(pathToFileURL(component_path).href);

console.log(`import 직후        파싱 횟수: ${parse_count}`);

for (let i = 1; i <= 3; i++) {
	const target = document.createElement('div');
	document.body.append(target);
	mount(Component, { target });
	console.log(`${i}번째 마운트 후    파싱 횟수: ${parse_count}`);
}
