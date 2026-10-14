// 실험: $.template의 두 번째 인자를 비트 플래그로 줄 때와 옵션 객체로 줄 때,
// minify한 결과물의 크기는 어떻게 다른가?
//
// 실행: node scratch/01-bitflag-vs-options-minify.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const pnpm = path.resolve('svelte/node_modules/.pnpm');
const terser_dir = fs.readdirSync(pnpm).find((d) => d.startsWith('terser@'));
const require = createRequire(path.join(pnpm, terser_dir, 'node_modules/terser/package.json'));
const { minify } = require('terser');

// 템플릿 50개짜리 모듈을 흉내 낸다 (앱 전체에 템플릿이 50개 있다고 가정)
const make = (arg) =>
	`import * as $ from "svelte/internal/client";\n` +
	Array.from({ length: 50 }, (_, i) => `export var root_${i} = $.template(\`<p></p> <p></p>\`, ${arg});`).join('\n');

const sources = {
	'비트 플래그': make('3'),
	'옵션 객체': make('{ fragment: true, use_import_node: true }')
};

for (const [label, code] of Object.entries(sources)) {
	const { code: min } = await minify(code, { module: true, compress: true, mangle: true });
	console.log(`\n[${label}] minify 후 ${min.length} bytes`);
	console.log('  예시:', min.match(/[\w$]+\.template\([^;]*?\)(?=,|;)/)[0]);
}

// 실제 전송 시에는 gzip 압축이 걸린다. 반복되는 문자열은 압축이 잘 되므로 차이가 줄어든다.
const { gzipSync } = await import('node:zlib');
for (const [label, code] of Object.entries(sources)) {
	const { code: min } = await minify(code, { module: true, compress: true, mangle: true });
	console.log(`[${label}] minify + gzip 후 ${gzipSync(min).length} bytes`);
}
