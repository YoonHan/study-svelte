<script>
	import { onMount } from 'svelte';
	import Beat from '#lib/inside/Beat.svelte';
	import Step from '#lib/inside/Step.svelte';
	import Stage from '#lib/inside/Stage.svelte';
	import Ask from '#lib/inside/Ask.svelte';
	import Hint from '#lib/inside/Hint.svelte';
	import Ref from '#lib/inside/Ref.svelte';
	import FlowRef from '#lib/inside/FlowRef.svelte';
	import Say from '#lib/inside/Say.svelte';
	import Predict from '#lib/inside/Predict.svelte';
	import Evidence from '#lib/inside/Evidence.svelte';
	import Point from '#lib/inside/Point.svelte';
	import Recall from '#lib/inside/Recall.svelte';
	import Brace from '#lib/inside/Brace.svelte';
	import Look from '#lib/inside/Look.svelte';
	import Highlight from '#lib/inside/Highlight.svelte';
	import Lab from '#lib/inside/Lab.svelte';
	import FlagCompiler from '#lib/inside/template/FlagCompiler.svelte';
	import FlagBits from '#lib/inside/template/FlagBits.svelte';
	import FragmentFlag from '#lib/inside/template/FragmentFlag.svelte';
	import CloneVsImport from '#lib/inside/template/CloneVsImport.svelte';
	import ParseCount from '#lib/inside/template/ParseCount.svelte';
	import FirstChild from '#lib/inside/template/FirstChild.svelte';
	import { trace_template } from '#lib/inside/template/trace.js';
	import Contents from '#lib/inside/Contents.svelte';
	import { ChapterState, set_chapter } from '#lib/inside/state.svelte.js';
	import { chapter_of, next_chapter } from '#lib/path.js';

	let { data } = $props();

	/**
	 * Parts of `template()` this chapter leaves closed, and the chapter that opens each. The box
	 * on the code shows "topic (chapter)"; the summary names the chapter by its full title.
	 */
	const CLOSED = [
		{ from: 34, to: 38, topic: '주석 노드(<!>)로 시작하는 템플릿', chapter: '1-3' },
		{ from: 41, to: 44, topic: '하이드레이션', chapter: '1-7' },
		{ from: 55, to: 62, topic: '복제본의 시작과 끝 노드 기록', chapter: '1-3' }
	].map((part) => ({ ...part, label: `${part.topic}: ${part.chapter}장에서 밝혀집니다` }));

	const NOTES = [
		{
			line: 47,
			text: '미지의 부분 "주석 노드(<!>)로 시작하는 템플릿"에서 정해짐',
			point: 'has_start',
			closed: 34
		}
	];

	/** a custom element with a `label` setter, given an object (question 4) */
	const WIDGET_SOURCE = [
		'<script>',
		'\tclass Widget extends HTMLElement {',
		'\t\tset label(value) {',
		'\t\t\t// 받은 객체로 화면을 그립니다',
		'\t\t}',
		'\t}',
		"\tcustomElements.define('my-widget', Widget);",
		'<\/script>',
		'',
		'<my-widget label={{ items: [1, 2, 3] }}></my-widget>'
	].join('\n');

	/** two ways to make the counter's nodes (the question that closes the chapter) */
	const BY_TEMPLATE = [
		'// 템플릿을 복제하는 방식 (이 장에서 본 컴파일 결과)',
		'var root = $.template(`<button> </button> <p> </p> <button>초기화</button>`, 1);',
		'var fragment = root();'
	].join('\n');

	const BY_CREATE = [
		'// createElement로 노드를 하나씩 만드는 방식',
		'var fragment = document.createDocumentFragment();',
		"var button = document.createElement('button');",
		"button.append(' ');",
		"var p = document.createElement('p');",
		"p.append(' ');",
		"var button_1 = document.createElement('button');",
		"button_1.append('초기화');",
		"fragment.append(button, ' ', p, ' ', button_1);"
	].join('\n');

	/** a component with an `{#if}` block, and part of its svelte@5.0.0 output (question 5) */
	const IF_SOURCE = [
		'<button onclick={() => (show = true)}>열기</button>',
		'{#if show}',
		'\t<p>안녕하세요</p>',
		'{/if}'
	].join('\n');

	const IF_COMPILED = [
		'var root_1 = $.template(`<p>안녕하세요</p>`);',
		'var root = $.template(`<button>열기</button> <!>`, 1);',
		'',
		'// 컴포넌트 함수 안',
		'// node는 템플릿 끝의 <!>(빈 주석 노드)로, {#if} 블록이 들어갈 자리입니다',
		'// (template() 안의 node와는 다른 변수)',
		'var node = $.sibling(button, 2);',
		'',
		'$.if(node, () => $.get(show), ($$anchor) => {',
		'\tvar p = root_1();',
		'\t$.append($$anchor, p);',
		'});'
	].join('\n');

	/** names the reader meets early and may need reminding of later (see Recall.svelte) */
	const RECALLS = {
		root: {
			text: '`root`는 모듈 최상위에서 `$.template(...)`이 만들어 둔 함수입니다. 컴포넌트를 마운트할 때마다 호출되어, 템플릿을 복제한 DOM 노드를 반환합니다.',
			on: 'compiled',
			lines: /** @type {[number, number]} */ ([6, 6]),
			since: 'root-made'
		},
		Counter: {
			text: '컴포넌트는 컴파일 결과에서 `Counter`라는 이름의 함수가 됩니다. 원본 파일 이름 `Counter.svelte`에서 따온 이름입니다.',
			on: 'compiled',
			lines: /** @type {[number, number]} */ ([8, 8]),
			since: 'root-made'
		},
		'q1-variable': {
			text: '질문 1의 해설: 카운터에서 `root()`의 결과를 받는 변수가 `fragment`인 것은 최상위 노드가 여러 개이기 때문입니다. 마크업이 `<h1>` 하나뿐인 컴포넌트에서는 이 변수의 이름이 `h1`이 됩니다.',
			on: 'compiled',
			lines: /** @type {[number, number]} */ ([10, 10])
		},
		upgrade: {
			text: '질문 4의 힌트: 업그레이드는 요소가 커스텀 엘리먼트 클래스(`Widget`)의 인스턴스가 되는 것을 뜻합니다.',
			on: 'template'
		},
		fragment: {
			text: '`fragment`는 컴포넌트 함수 안에서 `root()`가 반환한 값을 받는 변수입니다.',
			on: 'compiled',
			lines: /** @type {[number, number]} */ ([10, 10]),
			since: 'fragment-named'
		}
	};

	// svelte-ignore state_referenced_locally
	const marks = Object.fromEntries(
		data.doors.flatMap((door, i) =>
			door
				? [
						[
							i + 1,
							{
								text: door.chapter === '1-1' ? '이 장' : `${door.chapter}장`,
								current: door.chapter === '1-1'
							}
						]
					]
				: []
		)
	);

	// svelte-ignore state_referenced_locally
	const chapter = new ChapterState(
		'1-1',
		'svelte-inside:1-1:r4',
		[
			{ key: 'counter', title: 'Counter.svelte', code: data.counter },
			{
				key: 'compiled',
				title: 'Counter.js',
				code: data.compiled,
				marks,
				from: { key: 'counter', label: '컴파일' }
			},
			{
				key: 'template',
				title: 'src/internal/client/dom/template.js',
				code: data.template,
				range: [27, 66],
				closed: CLOSED,
				notes: NOTES
			}
		],
		RECALLS
	);
	set_chapter(chapter);

	onMount(() => {
		chapter.restore();
		// what template()'s variables hold when the counter mounts, found by running 5.0.0 with
		// the arguments in the compiled code (pointing at a variable on template.js shows it)
		const line = document.createElement('div');
		line.innerHTML = data.compiled.lines[5];
		const call = line.textContent?.match(/\$\.template\(`(.*)`(?:, (\d+))?\);/);
		if (call) chapter.set_values('template', trace_template(call[1], Number(call[2] ?? 0)));
	});
</script>

<svelte:head>
	<title>1-1장 Svelte에서 DOM 노드를 만드는 방법 | Svelte 5 내부 탐구</title>
</svelte:head>

<div class="page">
	<div class="layout">
		<Stage />

		<div class="flow">
			<div class="top" class:quiet={chapter.focus > 0}>
				<nav class="crumbs">
					<Contents current="1-1" />
				</nav>
				<header class="intro">
					<p class="eyebrow">1-1장</p>
					<h1><span class="marker">Svelte에서 DOM 노드를</span> 만드는 방법</h1>
				</header>
			</div>

			<Beat code="counter">
				<p>이 장에서는 간단한 카운터 컴포넌트를 살펴봅니다.</p>
			</Beat>
			<Beat lines={[1, 2, 3]}>
				<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
				<p>
					<code>$state</code> rune으로 상태 변수 <code>count</code>를 선언했으므로, 상태가 바뀌면
					화면도 따라서 바뀌겠죠. 다만 이 장에서는 이 부분을 잠시 넘어가겠습니다.
					<code>$state</code>가 어떻게 동작하는지는 1-5장 "$state 선언이 일반 JavaScript로
					컴파일되는 방법" 장에서 살펴봅니다.
				</p>
			</Beat>
			<Beat lines={[5, 6, 7]}>
				<Brace from={5} to={7} note="화면에 그릴 마크업" />
				<p>화면에 그릴 마크업은 세 줄입니다. 버튼 두 개와 문단 하나를 그립니다.</p>
			</Beat>
			<Beat whole="counter">
				<p>
					그런데 브라우저는 <code>.svelte</code> 파일을 그대로 실행하지 못합니다. Svelte 컴파일러가
					<code>Counter.svelte</code>를 평범한 JavaScript 모듈로 바꿔 줘야 합니다.
				</p>
			</Beat>
			<Beat code={['counter', 'compiled']} whole="compiled" cue="컴파일하기">
				<p>
					컴파일하면 <code>Counter.js</code>가 나옵니다. 브라우저가 실제로 실행하는 것은 이
					코드입니다.
				</p>
			</Beat>
			<Beat also={{ counter: [5, 6, 7] }}>
				<Brace on="counter" from={5} to={7} note="마크업 세 줄이" />
				<Say
					at={6}
					note="HTML 문자열 한 줄로"
					spot={'`<button> </button> <p> </p> <button>초기화</button>`'}
				>
					<p>원본의 마크업 세 줄은 컴파일 결과에서 HTML 문자열 한 줄이 되었습니다.</p>
				</Say>
			</Beat>
			<Beat>
				<Say at={6} note="`$.template`에 넘김" spot="$.template(">
					<p>컴파일 결과는 그 문자열을 런타임 함수 <code>$.template</code>에 넘깁니다.</p>
				</Say>
			</Beat>
			<Beat>
				<Say at={8} note="컴포넌트 함수의 시작" point="Counter">
					<p>컴포넌트는 컴파일 결과에서 하나의 함수가 됩니다.</p>
				</Say>
				<Say at={6} note="함수 바깥, 모듈 최상위" point="var root">
					<p>
						그런데 <code>$.template</code>을 호출하는 줄은 그 함수 바깥, 모듈의 최상위에 있습니다.
						이 점을 기억해 두세요.
					</p>
				</Say>
			</Beat>
			<Beat id="root-made">
				<Say at={10} note="마운트할 때마다 실행" point="root()">
					<p>
						마운트할 때마다 <Recall word="Counter">Counter</Recall> 함수가 실행되고, 그 안에서
						<code>root()</code>를 호출해 실제 DOM 노드를 얻습니다.
					</p>
				</Say>
				<Say at={6} note="root를 만드는 줄" point="root">
					<p><code>root</code>는 모듈 최상위에서 <code>$.template</code>이 만들어 둔 함수입니다.</p>
				</Say>
			</Beat>
			<Beat code="compiled" marks>
				<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
				<p>
					나머지 줄도 대부분 <code>$.</code>으로 시작하는 런타임 함수를 호출합니다. <Point
						on="compiled"
						part="marks">줄 옆의 표시</Point
					>는 그 줄에 대해 살펴보는 장을 가리킵니다. 이런 식으로 컴파일 결과를 한 줄씩 따라가
					보겠습니다.
				</p>
			</Beat>
			<Beat code="template" lines={[27]} id="template-open" cue="template() 안으로">
				<p>
					<code>$.template</code>은 런타임의 <code>template()</code> 함수입니다. 이 장에서는 그 안쪽을
					살펴봅니다.
				</p>
			</Beat>
			<Beat at={41} note="미지의 부분">
				<p>
					미지의 부분은 이 장에서 아직 밝히지 않아 물음표로 표시해 둔 코드를 뜻합니다. 이후의 장에서
					하나씩 밝혀 나가며 살펴보게 됩니다.
				</p>
			</Beat>

			<Step>
				<Beat code={['counter', 'compiled']} lines={[6]} also={{ counter: [5, 6, 7] }} cue="질문 1">
					<Ask>
						<p>
							컴파일 결과에서 <code>$.template(...)</code>의 두 번째 인자는 <code>1</code>입니다.
							카운터 템플릿의 어떤 특징 때문에 <code>1</code>이 붙었을까요?
						</p>
					</Ask>
					<Say on="compiled" at={6} note="두 번째 인자" spot=", 1" />
					<Hint n={1}>
						<p>
							마크업이 <code>&lt;h1&gt;</code> 하나뿐인 컴포넌트를 컴파일하면 두 번째 인자가 붙지 않습니다.
							카운터의 마크업과 무엇이 다를까요?
						</p>
					</Hint>
					<Hint n={2} on="counter" lines={[5, 6, 7]}>
						<p>
							마크업의 최상위 노드가 몇 개인지 세어 보세요. 두 번째 인자 <code>1</code>은 이진수로
							바꿔서 생각해 보세요.
						</p>
					</Hint>
				</Beat>
				<Beat cue="실험해 보기" lines={[6]} also={{ counter: [5, 6, 7] }}>
					<Lab title="컴포넌트를 바꿔 가며 컴파일하기">
						<FlagCompiler />
					</Lab>
				</Beat>
				<Beat answer lines={[6]} also={{ counter: [5, 6, 7] }}>
					<Brace on="counter" from={5} to={7} note="형제" />
					<p>
						카운터 템플릿은 <code>&lt;button&gt;</code>, <code>&lt;p&gt;</code>,
						<code>&lt;button&gt;</code> 세 요소가 감싸는 요소 없이 <strong>형제로 나란히</strong> 놓여
						있습니다. 최상위 노드가 여러 개이면 이진수의 맨 오른쪽 자리 비트가 켜집니다.
					</p>
				</Beat>
				<Beat id="fragment-named">
					<Say at={10} note="root()의 결과를 받는 변수" point="fragment">
						<p>
							<Recall word="root">root()</Recall>가 반환한 값을 <code>fragment</code>라는 변수로
							받는 것도 같은 이유입니다. 예를 들어 마크업이 <code>&lt;h1&gt;</code> 하나뿐인
							컴포넌트에서는 이 변수의 이름도 <code>h1</code>이 됩니다.
						</p>
					</Say>
				</Beat>
				<Beat lines={[6]}>
					<p>
						오른쪽에서 두 번째 자리 비트는 템플릿에 커스텀 엘리먼트가 있으면 켜집니다. 두 비트는
						서로 독립적이어서, 두 조건에 모두 해당하면 합쳐져서 <code>3</code>(이진수
						<code>11</code>)이 됩니다.
					</p>
					<table>
						<thead>
							<tr
								><th>최상위 노드 구성</th><th><code>$.template()</code> 두 번째 인자</th><th
									>이진수</th
								></tr
							>
						</thead>
						<tbody>
							<tr><td><code>&lt;h1&gt;</code> 하나</td><td>없음</td><td><code>00</code></td></tr>
							<tr
								><td><code>&lt;h1&gt;</code>, <code>&lt;p&gt;</code></td><td>1</td><td
									><code>01</code></td
								></tr
							>
							<tr
								><td><code>&lt;my-widget&gt;</code>(커스텀 엘리먼트) 하나</td><td>2</td><td
									><code>10</code></td
								></tr
							>
							<tr
								><td><code>&lt;my-widget&gt;</code>(커스텀 엘리먼트), <code>&lt;p&gt;</code></td><td
									>3</td
								><td><code>11</code></td></tr
							>
						</tbody>
					</table>
				</Beat>
				<Beat id="flag-names" lines={[6]}>
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						위에서 실험한 두 비트는 사실 상수로 관리되고 있습니다. 이름은
						<Ref code={data.refs.constants} lines={[18, 19]} focus={[18]}>TEMPLATE_FRAGMENT</Ref
						>(1)와
						<Ref code={data.refs.constants} lines={[18, 19]} focus={[19]}
							>TEMPLATE_USE_IMPORT_NODE</Ref
						>(2)입니다.
					</p>
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						컴파일러는 템플릿에서 커스텀 엘리먼트를 만나면
						<Ref code={data.refs.regular_element} lines={[62, 70]} focus={[69]}
							>template_needs_import_node</Ref
						> 속성을 설정하고, <code>$.template()</code>의 두 번째 인자를 만들 때 이 값을 보고 <Ref
							code={data.refs.fragment}
							lines={[168, 172]}
							focus={[171]}>TEMPLATE_USE_IMPORT_NODE</Ref
						> 비트를 켭니다.
					</p>
				</Beat>
				<Beat cue="생각해 보기">
					<Ask>
						<p>
							그런데 <code>TEMPLATE_USE_IMPORT_NODE</code>라는 이름은 조금 이상하지 않나요? 이
							플래그가 켜지는 조건은 "커스텀 엘리먼트가 있다"인데, 이름은 왜
							<code>HAS_CUSTOM_ELEMENT</code>가 아니라 "<code>importNode</code>를 쓴다"일까요?
						</p>
					</Ask>
				</Beat>
				<Beat answer>
					<p>
						소스에 이유가 적혀 있지는 않지만, 코드 구조로 보면 이렇게 이해할 수 있습니다. 플래그를
						읽는 쪽은 런타임이고, 런타임에게 필요한 정보는 "템플릿을 어떻게 복제할지"뿐입니다.
						커스텀 엘리먼트가 있는지 판단하는 일은 컴파일러가 이미 끝냈고, 런타임은 그 결과로 "<code
							>importNode</code
						>로 복제하라"는 지시만 받으면 됩니다.
					</p>
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						그래서 이름도 런타임이 할 일을 그대로 말합니다. 나중에 커스텀 엘리먼트가 아닌 다른
						이유로 <code>importNode</code>가 필요해져도, 런타임 상수 이름(<code
							>TEMPLATE_USE_IMPORT_NODE</code
						>)은 바꿀 필요가 없습니다. 그렇다면 커스텀 엘리먼트가 있을 때 왜 하필
						<code>importNode</code>가 필요할까요? 질문 4에서 직접 실험해 봅니다.
					</p>
				</Beat>
			</Step>

			<Step>
				<Beat code="template" lines={[28, 29]} cue="질문 2">
					<Ask>
						<p>
							런타임은 두 번째 인자로 받은 숫자 <code>flags</code>를 어떻게 읽을까요?
							<code>flags</code>가 <code>3</code>이면
							<code>is_fragment</code>와 <code>use_import_node</code>는 각각 무엇이 될까요?
						</p>
					</Ask>
					<Predict
						options={[
							'둘 다 `true`',
							'`is_fragment`만 `true`',
							'`use_import_node`만 `true`',
							'둘 다 `false`'
						]}
						answer={0}
					/>
					<Hint n={1} at={28} note="flags로 두 값을 구함" point="flags" lines={[28, 29]}>
						<p>
							두 줄이 <code>flags</code> 하나로 <code>is_fragment</code>와
							<code>use_import_node</code>를 각각 구합니다. 두 줄을 읽어 보세요.
						</p>
					</Hint>
					<Hint n={2}>
						<p>
							<code>&amp;</code>는 두 수에서 같은 자리가 모두 1인 비트만 남깁니다. <code>3</code>을
							이진수로 써 보세요.
						</p>
					</Hint>
				</Beat>
				<Beat lines={[28, 29]} cue="실험해 보기">
					<Lab title="비트마다 & 연산해 보기">
						<FlagBits />
					</Lab>
				</Beat>
				<Beat answer lines={[28, 29]} id="flags-read">
					<p>
						둘 다 <code>true</code>입니다. <code>&amp;</code>(비트 AND)는 두 수에서 같은 자리가 모두
						1인 비트만 남깁니다. 플래그 상수는 한 자리만 1이므로 <code>&amp;</code> 연산하면 다른 자리는
						모두 0이 됩니다. 그래서 결과가 0이 아닌지만 확인하면 그 자리의 비트가 켜져 있는지 알 수 있습니다.
					</p>
					<Say at={28} note="0이 아닌지 확인" spot="!== 0" />
				</Beat>
				<Beat>
					<p>
						숫자 하나에 서로 독립적인 예/아니요를 여러 개 담는 방식입니다. Svelte는
						<Ref code={data.refs.constants} lines={[1, 6]} focus={[1, 2, 4, 5, 6]}>EACH_*</Ref>,
						<Ref code={data.refs.constants} lines={[8, 12]} focus={[8, 9, 10, 11, 12]}>PROPS_*</Ref> 같은
						다른 플래그도 같은 방식으로 컴파일러에서 런타임으로 넘깁니다.
					</p>
					<Evidence
						><Ref
							code={data.refs.constants}
							lines={[1, 12]}
							focus={[1, 2, 4, 5, 6, 8, 9, 10, 11, 12]}>src/constants.js:1-12</Ref
						></Evidence
					>
				</Beat>
				<Beat at={48} lines={[32, 48]} note="is_fragment가 쓰이는 곳" point="is_fragment">
					<p>
						<code>is_fragment</code>는 템플릿 문자열을 파싱해서 만든 노드 중 무엇을 변수
						<code>node</code>에 남길지 정합니다. 어떻게 쓰이는지는 질문 3에서 살펴봅니다.
					</p>
				</Beat>
				<Beat at={52} note="use_import_node가 쓰이는 곳" point="use_import_node">
					<p>
						<code>use_import_node</code>는 변수 <code>node</code>에 남긴 노드를 어떤 방법으로
						복제할지 정합니다. 어떻게 쓰이는지는 질문 4에서 살펴봅니다.
					</p>
				</Beat>
			</Step>

			<Step>
				<Beat
					code={['counter', 'compiled', 'template']}
					on="template"
					lines={[48]}
					also={{ counter: [5, 6, 7], compiled: [6] }}
					cue="질문 3"
				>
					<Say on="compiled" at={6} note="이 `1`을 지우면" spot=", 1" strike />
					<Brace on="counter" from={5} to={7} note="세 요소" />
					<Ask>
						<p>
							컴파일 결과에서 <code>$.template(...)</code>의 두 번째 인자 <code>1</code>을 지우면,
							마운트했을 때 화면에 무엇이 나올까요?
						</p>
					</Ask>
					<Predict
						options={[
							'`<button>`, `<p>`, `<button>` 세 요소가 모두 나온다',
							'첫 번째 `<button>`만 나온다',
							'에러가 나서 아무것도 나오지 않는다'
						]}
						answer={1}
					/>
					<Hint n={1} at={48} note="is_fragment가 false일 때" point="!is_fragment" on="template">
						<p>
							<code>is_fragment</code>가 <code>false</code>이면 <code>get_first_child(node)</code>를
							호출하는 줄이 실행됩니다.
						</p>
					</Hint>
					<Hint n={2} at={48} note="자식 중 무엇을?" point="get_first_child" on="template">
						<p>
							<code>get_first_child(node)</code>는 바로 윗줄에서 만든
							<code>DocumentFragment</code>의 자식 중 무엇을 반환할까요? 그 결과가
							<code>node</code>를 덮어씁니다.
						</p>
					</Hint>
				</Beat>
				<Beat code="template" lines={[46, 47, 48]} cue="실험해 보기">
					<Lab title="TEMPLATE_FRAGMENT를 끄고 마운트하기">
						<FragmentFlag />
					</Lab>
				</Beat>
				<Beat answer lines={[48]} id="first-child">
					<p>첫 번째 <code>&lt;button&gt;</code>만 나옵니다.</p>
				</Beat>
				<Beat at={47} note="문자열 전체를 파싱" point="create_fragment_from_html">
					<p>
						<code>create_fragment_from_html</code>을 호출하는 줄은 템플릿 문자열 전체를 파싱해서
						<code>DocumentFragment</code>를 만듭니다.
					</p>
				</Beat>
				<Beat at={48} note="첫 번째 자식만 남김" point="get_first_child">
					<p>
						<code>is_fragment</code>가 <code>false</code>이면 그중
						<strong>첫 번째 자식 노드만</strong> 꺼내서 <code>node</code>에 저장합니다. 그 뒤의 공백
						텍스트 노드 두 개와 <code>&lt;p&gt;</code>, 두 번째 <code>&lt;button&gt;</code>은
						버려집니다.
					</p>
					{#snippet figure()}<FirstChild />{/snippet}
				</Beat>
				<Beat
					code={['compiled', 'template']}
					on="template"
					lines={[46, 47, 48]}
					also={{ compiled: [6] }}
				>
					<Say on="compiled" at={6} note="컴파일러가 붙이는 비트" spot=", 1" />
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						런타임 상에서 파싱해 둔 노드가 에러 없이 일부 제외되므로, 컴파일러가
						<code>TEMPLATE_FRAGMENT</code>를 정확하게 붙여야 합니다.
					</p>
				</Beat>
				<Beat code={['compiled', 'template']} on="compiled" lines={[10]}>
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						반대로 최상위 노드가 하나뿐인 컴포넌트는 <code>TEMPLATE_FRAGMENT</code>가 꺼져 있고,
						<Recall word="root">root()</Recall>가 <code>DocumentFragment</code>가 아니라 그 요소
						하나를 반환합니다. <Recall word="q1-variable" plain>질문 1의 해설</Recall>에서, 카운터
						원본 예제에서는 <code>fragment</code>라고 명명된 이 변수의 이름이, 최상위 노드가
						<code>&lt;h1&gt;</code> 하나뿐인 컴포넌트에서는 <code>h1</code>이 된다고 했던 이유가
						바로 이것입니다.
					</p>
				</Beat>
				<Beat at={55} lines={[48, 55]} note="여기도 is_fragment로 분기됨">
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						<Point on="template" part="closed" from={55}>마지막 미지의 부분</Point>도
						<Ref code={data.template} lines={[55, 55]} focus={[55]}>is_fragment</Ref>에 따라
						분기됩니다. 템플릿 복제본의 시작 노드와 끝 노드를 기록하는 부분이고, 이 기록이 왜
						필요한지는 1-3장 "만든 DOM을 문서에 넣는 방법"에서 살펴봅니다.
					</p>
				</Beat>
			</Step>

			<Step>
				<Beat code="template" lines={[52]} cue="질문 4">
					<Ask>
						<p>
							<code>label</code> setter를 정의한 커스텀 엘리먼트 <code>&lt;my-widget&gt;</code>에
							아래처럼 객체를 넘긴다고 해 봅시다.
						</p>
						<Highlight lang="svelte" code={WIDGET_SOURCE} />
						<p>
							커스텀 엘리먼트가 있으면 런타임은 <code>cloneNode</code> 대신
							<code>importNode</code>로 템플릿을 복제합니다. 만약 <code>cloneNode</code>로
							복제했다면, <code>label</code> setter는 이 객체를 받을 수 있을까요?
						</p>
					</Ask>
					<Predict
						options={[
							'`label` setter가 객체를 그대로 받는다',
							'setter가 호출되지 않고, 객체가 문자열로 바뀌어 `label` attribute에 저장된다',
							'에러가 난다'
						]}
						answer={1}
					/>
					<Hint n={1} at={47} note="복제할 원본을 만드는 곳" point="create_fragment_from_html">
						<p>
							복제할 원본 <code>node</code>는 템플릿을 파싱하는 줄에서 만들어집니다.
							<Ref code={data.refs.reconciler} lines={[1, 6]} focus={[5]}
								>create_fragment_from_html</Ref
							>은
							<code>&lt;template&gt;</code> 요소의 <code>.content</code>를 반환합니다.
						</p>
					</Hint>
					<Hint n={2}>
						<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
						<p>
							<code>&lt;template&gt;</code>의 <code>.content</code>는 어느 document에 속할까요? 그
							document에서도 커스텀 엘리먼트가 업그레이드될까요? 업그레이드는 요소가 커스텀 엘리먼트
							클래스(위의 <code>Widget</code>)의 인스턴스가 되는 것을 뜻합니다.
						</p>
					</Hint>
				</Beat>
				<Beat lines={[52]} cue="실험해 보기">
					<Lab title="cloneNode와 importNode로 커스텀 엘리먼트 복제하기">
						<CloneVsImport />
					</Lab>
				</Beat>
				<Beat answer lines={[52]} id="clone-kind">
					<p>setter는 호출되지 않고, attribute에 <code>"[object Object]"</code>가 저장됩니다.</p>
				</Beat>
				<Beat at={47} note="원본은 비활성 document 소속" point="create_fragment_from_html">
					<p>
						복제할 원본 <code>node</code>는 <code>&lt;template&gt;</code> 요소의
						<code>.content</code>이거나, 그 첫 번째 자식입니다. 어느 쪽이든 이 노드는 현재 페이지가
						아니라 브라우저가 따로 만들어 둔 <strong>비활성 document</strong>에 속합니다.
					</p>
					<Evidence>
						<Ref code={data.refs.reconciler} lines={[1, 6]} focus={[5]}
							>src/internal/client/dom/reconciler.js:1-6</Ref
						>
					</Evidence>
				</Beat>
				<Beat at={52} note="소속을 물려받는가, 바꾸는가" point="cloneNode">
					<p>
						모든 노드는 자신이 속한 document를 하나 갖고 있습니다(<code>ownerDocument</code>).
						<code>cloneNode</code>로 만든 복제본은 원본과 같은 document에 속합니다. 원본이 비활성
						document에 있으므로 복제본도 비활성 document에 속하게 됩니다. 실험 표의 "복제본이 현재
						페이지의 document에 속함" 행이 이것을 보여 줍니다.
					</p>
					<p>
						그런데 커스텀 엘리먼트 정의(<code>customElements.define</code>)는 지금 페이지의
						<code>window</code>에 등록되고(<code>customElements</code>는
						<code>window.customElements</code>입니다), HTML 명세는 이 <code>window</code>에 연결된
						document에서만 정의를 찾습니다. 비활성 document는 어떤 <code>window</code>에도 연결되어
						있지 않으므로 그 안의 요소는 정의를 찾지 못하고, <Recall word="upgrade" plain
							>업그레이드</Recall
						>되지 않습니다. 반면 <code>importNode</code>는 복제본을 현재 페이지의
						<code>document</code>에 속하게 만들므로, 복제하는 그 자리에서 업그레이드가 일어납니다.
					</p>
					<Evidence>
						<a
							href="https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition"
							>HTML 명세 "look up a custom element definition"</a
						>: 정의를 찾을 레지스트리가 없으면 찾지 않습니다. 레지스트리(<code
							>window.customElements</code
						>)를 갖고 만들어지는 것은 <code>window</code>의 document뿐이고,
						<code>&lt;template&gt;</code>의 내용이 속한 비활성 document는 브라우징 컨텍스트(탭이나
						iframe처럼 페이지를 띄우는 곳) 없이 따로 만들어집니다(<a
							href="https://html.spec.whatwg.org/multipage/scripting.html#appropriate-template-contents-owner-document"
							>"appropriate template contents owner document"</a
						>). 실험 표의 "<code>Widget</code>
						클래스의 인스턴스임" 행이 같은 사실을 보여 줍니다.
					</Evidence>
				</Beat>
				<Beat lines={[52]}>
					<p>
						커스텀 엘리먼트가 있는 컴포넌트의 컴파일 결과는 <Recall word="root">root()</Recall>로
						템플릿을 복제한 직후, 문서에 넣기도 전에
						<FlowRef
							steps={[
								{
									label: '컴파일 결과: `root()`로 복제한 직후',
									snippet: [
										'var my_widget = root();',
										'$.set_custom_element_data(my_widget, "label", { items: [1, 2, 3] });',
										'$.append($$anchor, my_widget);'
									],
									focus: [1]
								},
								{
									label: '`set_custom_element_data`: `label`이 요소의 setter 목록에 있는지 확인',
									code: data.refs.attributes,
									lines: [138, 144],
									focus: [139, 142]
								},
								{
									label:
										'`set_attribute`: 여기서도 setter 목록에 없으므로 `setAttribute`로 문자열 저장',
									code: data.refs.attributes,
									lines: [114, 121],
									focus: [116, 120]
								}
							]}
							arrows={['호출', 'setter 목록에 `label`이 없으면']}>$.set_custom_element_data</FlowRef
						>를 호출합니다. 이 함수는 요소의 프로토타입 체인을 따라 올라가며 setter를 찾는데(<FlowRef
							steps={[
								{
									label: '`set_custom_element_data`가 이 요소의 setter 목록을 묻습니다',
									code: data.refs.attributes,
									lines: [139, 139],
									focus: [139]
								},
								{
									label: '`get_setters`: 프로토타입 체인을 따라 올라가며 setter 이름을 모읍니다',
									code: data.refs.attributes,
									lines: [320, 335],
									focus: [320, 323, 327, 328, 332, 335]
								},
								{
									label:
										'`set_attribute`: 여기서도 setter 목록에 없으므로 `setAttribute`로 문자열 저장',
									code: data.refs.attributes,
									lines: [114, 121],
									focus: [116, 120]
								}
							]}
							arrows={[
								'`get_setters(node)` 호출',
								'반환한 목록에 `label`이 없으면(업그레이드되지 않은 요소) `set_attribute` 호출'
							]}>get_setters</FlowRef
						>), 업그레이드되지 않은 요소의 체인에는 커스텀 엘리먼트 클래스의 프로토타입이 없습니다.
						그래서
						<code>setAttribute</code>로 넘어가고, attribute 값은 항상 문자열이므로 객체는
						<code>"[object Object]"</code>가 됩니다.
					</p>
					<Evidence>
						<Ref code={data.refs.attributes} lines={[138, 144]} focus={[139, 142]}
							>src/internal/client/dom/elements/attributes.js:138-144</Ref
						>,
						<Ref code={data.refs.attributes} lines={[315, 336]} focus={[323, 332]}>:315-336</Ref> (<code
							>get_setters</code
						>),
						<Ref code={data.refs.attributes} lines={[114, 121]} focus={[116, 120]}>:114-121</Ref> (<code
							>set_attribute</code
						>)
					</Evidence>
				</Beat>
				<Beat>
					<p>
						실험 결과로 보면, 문제는 <code>cloneNode</code> 자체보다 원본이 비활성 document에 있다는 데
						있다고 이해할 수 있습니다. 컴파일러의 주석은 같은 현상을 이렇게 적어 두었습니다. "cloneNode가
						더 빠르지만, 템플릿이 DOM에 연결되기 전까지는 커스텀 엘리먼트의 클래스를 인스턴스화하지 않아서
						속성을 설정할 때 문제가 생긴다."
					</p>
					<Evidence>
						<Ref code={data.refs.regular_element} lines={[64, 70]} focus={[65, 66, 67, 68]}
							>src/compiler/phases/3-transform/client/visitors/RegularElement.js:64-70</Ref
						>
					</Evidence>
				</Beat>
			</Step>

			<Step>
				<Beat code={['compiled', 'template']} on="compiled" lines={[6, 10]} cue="질문 5">
					<Ask>
						<p>
							<code>var root = $.template(...)</code>은 컴포넌트 함수 바깥(모듈 최상위)에 있고,
							<code>var fragment = root()</code>는 컴포넌트 함수 안에 있습니다. 같은 카운터를 세 번
							마운트하면 HTML 파싱은 몇 번 일어날까요?
						</p>
					</Ask>
					<Predict options={['0번', '1번', '3번']} answer={1} />
					<Hint n={1} at={40} note="template()이 반환하는 함수" point="() =>" on="template">
						<p>
							<code>template()</code>이 반환하는 것은 화살표 함수입니다. 마운트할 때마다 호출되는
							것은 바로 이 화살표 함수입니다.
						</p>
					</Hint>
					<Hint
						n={2}
						at={46}
						note="파싱은 이 조건 안"
						point="node === undefined"
						on="template"
						lines={[32, 46, 47]}
					>
						<p>
							HTML을 파싱하는 줄은 <code>node === undefined</code> 조건 안에 있습니다.
							<code>node</code>가 어디에 선언되어 있는지도 함께 보세요.
						</p>
					</Hint>
				</Beat>
				<Beat lines={[32, 40, 46, 47, 48, 52]} stress={[46, 47]} cue="실험해 보기">
					<Lab title="모듈을 불러오고 여러 번 마운트하기">
						<ParseCount />
					</Lab>
				</Beat>
				<Beat answer lines={[46, 47]} id="parse-once">
					<p><strong>한 번</strong>만 일어납니다.</p>
				</Beat>
				<Beat code="compiled" at={6} note="모듈을 불러올 때 한 번" point="$.template">
					<p>
						모듈을 처음 불러올 때 <code>$.template(...)</code>을 호출하는 줄이 한 번 실행됩니다.
						<code>$.template(...)</code>은 클로저 변수(<code>node</code> 등)를 준비하고 화살표
						함수를 반환하며, 그 함수가
						<code>root</code>입니다.
					</p>
				</Beat>
				<Beat at={10} note="마운트할 때마다" point="root()">
					<p>컴포넌트를 마운트할 때마다 <Recall word="root">root()</Recall>가 호출됩니다.</p>
				</Beat>
				<Beat code="template" at={46} note="처음 한 번만 참" point="node === undefined">
					<p>
						첫 번째 <code>root()</code>에서는 <code>node</code>가 아직 <code>undefined</code>라서
						HTML을 파싱해 <code>node</code>에 저장합니다. 두 번째부터는 파싱을 건너뛰고 저장된
						<code>node</code>를 복제만 합니다.
					</p>
				</Beat>
				<Beat lines={[46, 47, 48]}>
					<p>
						실험에서 본 것처럼 모듈을 불러오기만 하고 마운트하지 않으면 파싱은 한 번도 일어나지
						않습니다. 파싱은 처음 필요해지는 순간까지 미뤄집니다.
					</p>
				</Beat>
				<Beat>
					<p>
						<code>{'{#if}'}</code> 블록이 있는 컴포넌트에서는 블록의 내용이 별도의 템플릿으로 분리됩니다.
						버튼을 누르면 문단이 나타나는 아래 컴포넌트를 예로 들어 보겠습니다.
					</p>
					<Highlight lang="svelte" code={IF_SOURCE} name="if-source" />
					<p>컴파일하면 문단이 <code>root_1</code>이라는 별도의 템플릿이 됩니다.</p>
					<Highlight code={IF_COMPILED} name="if-compiled" />
					<p>
						각 <Look
							at={[
								{
									code: 'if-compiled',
									text: [
										'var root_1 = $.template(`<p>안녕하세요</p>`);',
										'var root = $.template(`<button>열기</button> <!>`, 1);'
									]
								}
							]}>템플릿</Look
						>은 자기 화살표 함수가 처음 호출될 때 한 번씩 파싱됩니다. <Look
							at={[
								{ code: 'if-source', text: '{#if show}' },
								{ code: 'if-compiled', text: '() => $.get(show)' }
							]}>조건</Look
						>이 한 번도 참이 되지 않으면 <Look
							at={[{ code: 'if-compiled', text: 'var p = root_1();' }]}><code>root_1()</code></Look
						>은 호출되지 않으므로, <Look
							at={[
								{ code: 'if-source', text: '<p>안녕하세요</p>' },
								{
									code: 'if-compiled',
									text: ['($$anchor) => {', 'var p = root_1();', '$.append($$anchor, p);']
								}
							]}>그 분기</Look
						>는 파싱 비용도 들지 않습니다.
					</p>
				</Beat>
			</Step>

			<section class="outro">
				<Beat code="template" cue="이 장 정리하기">
					<h2>정리</h2>
					<p>
						<code>template()</code>은 함수 하나를 반환합니다. 그 함수(<code>root</code>)는 처음
						호출될 때 HTML 문자열을 파싱해 클로저 변수 <code>node</code>에 저장하고, 그 뒤로는
						<code>node</code>를 복제만 합니다.
					</p>
					<p>
						<code>$.template(...)</code>에 넘기는 두 번째 인자의 비트는 두 가지를 정합니다. 하나는
						파싱한 <code>DocumentFragment</code>를 통째로 <code>node</code>에 남길지, 그 첫 번째
						자식 노드만 남길지입니다(<code>TEMPLATE_FRAGMENT</code>). 다른 하나는
						<code>node</code>를
						<code>cloneNode</code>와 <code>importNode</code> 중 어느 것으로 복제할지입니다(<code
							>TEMPLATE_USE_IMPORT_NODE</code
						>).
					</p>
					<Say at={48} note="통째로 남길지, 첫 자식만 남길지" point="!is_fragment" />
					<Say at={52} note="cloneNode인지 importNode인지" point="use_import_node" />
				</Beat>
				<Beat lines={[]}>
					<p>
						함수 안에는 아직 <Point on="template" part="closed">미지의 부분이 세 개</Point> 남아 있습니다.
					</p>
					<ul>
						{#each CLOSED as box (box.from)}
							<li>
								<Point on="template" part="closed" from={box.from}
									>{box.topic}은 {box.chapter}장 "{chapter_of(box.chapter)?.title}"에서 밝혀집니다.</Point
								>
							</li>
						{/each}
					</ul>
				</Beat>
				<Beat>
					<Ask>
						<p>
							끝으로 생각해 볼 질문을 하나 남깁니다. 카운터의 노드를 만드는 두 방식을 나란히 놓으면
							아래와 같습니다. <Look
								at={[
									{
										code: 'by-template',
										text: ['var root = $.template(', 'var fragment = root();']
									}
								]}>템플릿을 복제하는 방식</Look
							>과 <Look
								at={[
									{
										code: 'by-create',
										text: [
											'var fragment = document.createDocumentFragment();',
											"var button = document.createElement('button');",
											"button.append(' ');",
											"var p = document.createElement('p');",
											"p.append(' ');",
											"var button_1 = document.createElement('button');",
											"button_1.append('초기화');",
											"fragment.append(button, ' ', p, ' ', button_1);"
										]
									}
								]}><code>createElement</code>로 노드를 하나씩 만드는 방식</Look
							>은 무엇이 다를까요?
						</p>
						<Highlight code={BY_TEMPLATE} name="by-template" />
						<Highlight code={BY_CREATE} name="by-create" />
					</Ask>
					<p>
						이 장에서는 이 질문의 답을 따로 적지 않았습니다. 같은 카운터를 여러 번 마운트한다고
						생각하고, 두 방식이 각각 HTML을 몇 번 파싱하는지와 노드를 만드는 함수를 몇 번 부르는지
						세어 보면 실마리를 찾을 수 있습니다.
					</p>
				</Beat>
				<Beat code="compiled" at={11} note="다음 장은 여기부터" point="$.first_child">
					<p>
						다음 장에서는 <code>$.first_child</code>를 시작으로, 복제한 fragment 안에서 노드를
						찾아가는 방법을 살펴봅니다.
					</p>
				</Beat>
			</section>

			{#if chapter.progress >= chapter.beats.length}
				{@const next = next_chapter('1-1')}
				<nav class="after">
					{#if next?.ready}
						<a class="go pen-go" href="/learn/{next.id}">다음 장 {next.id} {next.title}</a>
					{:else if next}
						<p class="go soon">다음 장 {next.id} {next.title} (준비 중)</p>
					{/if}
					<p class="more">
						<a class="home pen-button" href="/"
							><svg class="toc-icon" viewBox="0 0 24 24" aria-hidden="true"
								><path
									d="M6.5 3.2c3.9-.3 7.8-.2 11.6.1.4 5.8.5 11.6.2 17.4-3.9.3-7.8.3-11.7.1-.4-5.9-.4-11.8-.1-17.6z"
								/><path d="M9.2 8.1h6.3M9.3 12h6.1M9.2 15.9h4.4" /><path
									d="M7.3 8.1h.1M7.3 12h.1M7.3 15.9h.1"
								/></svg
							>목차로 돌아가기</a
						>
						<button
							class="reset pen-button"
							title="이 장을 처음부터 다시 읽습니다. 지금까지의 예측과 진행 상황이 지워집니다"
							onclick={() => chapter.reset()}>처음으로 돌아가기</button
						>
					</p>
				</nav>
			{/if}
		</div>
	</div>
</div>

<style>
	.page {
		max-width: 1440px;
		margin: 0 auto;
		padding: 0 24px;
	}

	/* code on the left, the words on the right */
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 48px;
		align-items: start;
	}

	.flow {
		min-width: 0;
		max-width: 560px;
		padding: 28px 0 60vh;
		font-size: 17px;
		line-height: 1.8;
	}

	/* once the reader is inside the story, the page's own furniture steps back */
	.top {
		transition: opacity 400ms ease;
	}

	.top.quiet {
		opacity: 0.15;
	}

	/* pointing at it brings it back, like a beat already read */
	.top.quiet:hover,
	.top.quiet:focus-within {
		opacity: 1;
	}

	.crumbs {
		font-size: 13px;
		color: var(--fg-3);
	}

	.intro {
		margin: 28px 0 40px;
	}

	.eyebrow {
		margin: 0 0 6px;
		font-family: var(--font-head);
		font-size: 16px;
		font-weight: 700;
		color: var(--fg-2);
	}

	/* the chapter title is printed, the highlighter stroke over its key word is the learner's */
	h1 {
		margin: 0;
		font-family: var(--font-head);
		font-size: clamp(28px, 3.2vw, 38px);
		font-weight: 800;
		line-height: 1.28;
		letter-spacing: -0.025em;
		text-wrap: balance;
	}

	.flow :global(table) {
		margin: 12px 0 0;
		border-collapse: collapse;
		font-size: 14px;
	}

	.flow :global(th),
	.flow :global(td) {
		padding: 6px 14px 6px 0;
		border-bottom: 1px solid var(--line);
		text-align: left;
	}

	.flow :global(th) {
		color: var(--fg-2);
		font-weight: 600;
	}

	.flow :global(ul) {
		margin: 0;
		padding-left: 22px;
	}

	.outro :global(h2) {
		margin: 32px 0 12px;
		padding-top: 32px;
		border-top: 2px solid var(--fg);
		font-family: var(--font-head);
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.after {
		display: grid;
		gap: 10px;
		margin-top: 28px;
		padding-top: 20px;
		border-top: 1px solid var(--line);
	}

	.go {
		margin: 0;
		font-family: var(--font-head);
		font-size: 19px;
		font-weight: 700;
		color: var(--fg);
	}

	a.go {
		justify-self: start;
	}

	.go.soon {
		color: var(--fg-3);
	}

	.more {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		/* one leaves the chapter, the other stays in it: kept apart */
		gap: 12px 24px;
		margin: 0;
		font-size: 14px;
	}

	/* back to the contents: a hand-drawn button with a page of the contents drawn in pen */
	.home {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 16px 1px 12px;
		font-size: 20px;
		text-decoration: none;
	}

	.toc-icon {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* a hand-drawn button like the "다음" buttons (`.pen-button`, app.css) */
	.reset {
		padding: 4px 16px 2px;
		font-size: 20px;
	}

	@media (max-width: 1023px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.layout > :global(.stage) {
			display: none;
		}

		.flow {
			max-width: none;
		}
	}
</style>
