<script>
	import { onMount } from 'svelte';
	import Beat from '#lib/inside/Beat.svelte';
	import Step from '#lib/inside/Step.svelte';
	import Stage from '#lib/inside/Stage.svelte';
	import Ask from '#lib/inside/Ask.svelte';
	import Hint from '#lib/inside/Hint.svelte';
	import Ref from '#lib/inside/Ref.svelte';
	import Say from '#lib/inside/Say.svelte';
	import Recall from '#lib/inside/Recall.svelte';
	import Peek from '#lib/inside/Peek.svelte';
	import Predict from '#lib/inside/Predict.svelte';
	import Evidence from '#lib/inside/Evidence.svelte';
	import Brace from '#lib/inside/Brace.svelte';
	import Lab from '#lib/inside/Lab.svelte';
	import RenderLab from '#lib/inside/compare/RenderLab.svelte';
	import JobMap from '#lib/inside/compare/JobMap.svelte';
	import Contents from '#lib/inside/Contents.svelte';
	import { ChapterState, set_chapter } from '#lib/inside/state.svelte.js';
	import { next_chapter } from '#lib/path.js';
	import { job_of } from '#lib/compare.js';

	let { data } = $props();

	/** names and passages the reader can see again by pointing at them */
	const RECALLS = {
		'state-source': {
			text: '`Counter.svelte`는 상태 `count`를 `$state(0)`으로 선언합니다.',
			on: 'counter',
			lines: /** @type {[number, number]} */ ([2, 2])
		}
	};

	// svelte-ignore state_referenced_locally
	const chapter = new ChapterState(
		'1-0',
		'svelte-inside:1-0:r1',
		[
			{ key: 'counter', title: 'Counter.svelte', code: data.counter },
			{
				key: 'vanilla',
				title: 'vanilla-counter.js (직접 짠 카운터)',
				code: data.vanilla,
				from: { key: 'counter', label: '직접 옮기기' },
				excerpt: 'only',
				badges: true
			},
			{
				key: 'compiled',
				title: 'Counter.js (컴파일 결과)',
				code: data.compiled,
				from: { key: 'counter', label: '컴파일' },
				excerpt: 'only',
				badges: true
			}
		],
		RECALLS
	);
	set_chapter(chapter);

	onMount(() => chapter.restore());

	// the lines that do each job, in either program (see compare.js)
	const job = job_of;
</script>

<svelte:head>
	<title>1-0장 직접 짠 카운터와 Svelte 컴파일 결과 비교 | Svelte 5 내부 탐구</title>
</svelte:head>

<div class="page">
	<div class="layout">
		<Stage />

		<div class="flow">
			<div class="top" class:quiet={chapter.focus > 0}>
				<nav class="crumbs">
					<Contents current="1-0" />
				</nav>
				<header class="intro">
					<p class="eyebrow">1-0장</p>
					<h1><span class="marker">직접 짠 카운터</span>와 Svelte 컴파일 결과 비교</h1>
				</header>
			</div>

			<Beat code="counter">
				<p>이 장에서는 간단한 카운터 컴포넌트 하나를 두 가지 방법으로 만들어 보고 비교합니다.</p>
			</Beat>
			<Beat lines={[5, 6, 7]}>
				<Brace from={5} to={7} note="화면에 그릴 마크업" />
				<p>
					첫 번째 버튼은 누를 때마다 숫자가 하나씩 오르고, 문단은 그 숫자의 두 배를 보여 주고, 두
					번째 버튼은 숫자를 0으로 되돌립니다.
				</p>
			</Beat>
			<Beat whole="counter">
				<p>Svelte 없이 이 카운터를 만들려면 어떤 코드를 써야 할까요?</p>
			</Beat>
			<Beat code={['counter', 'vanilla']} whole="vanilla" cue="직접 짜 보기">
				<p>
					프레임워크 없이 브라우저의 DOM API만으로 옮기면 <code>vanilla-counter.js</code>처럼
					됩니다.
				</p>
			</Beat>

			<Step>
				<Beat code="vanilla" whole="vanilla" cue="질문 1">
					<Ask>
						<p>
							<code>vanilla-counter.js</code>가 카운터를 화면에 띄우고 동작하게 만들기까지 하는 일을
							종류별로 나누면 몇 가지일까요?
						</p>
					</Ask>
					<Hint n={1}>
						<p>
							코드에 나오는 DOM API(<code>createElement</code>, <code>innerText</code>,
							<code>addEventListener</code>, <code>appendChild</code>)를 기준으로 묶어 보세요.
						</p>
					</Hint>
				</Beat>
				<Beat answer lines={job(1).vanilla} badge={1}>
					<p>
						코드에 나오는 DOM API를 기준으로 나누면 네 가지입니다. <strong>① 요소 만들기.</strong>
						<code>document.createElement</code>로 버튼과 문단을 하나씩 만들어 변수에 담습니다.
					</p>
				</Beat>
				<Beat lines={[12, 18, 19, 20, 21]} badges={{ vanilla: { 2: job(2).vanilla } }}>
					<Say at={18} note="render() 함수" point="render" above stage />
					<p>
						<strong>② 텍스트 쓰기.</strong> <code>innerText</code>에 글자를 넣습니다. 초기화 버튼의
						글자는 한 번만 넣고, 숫자와 두 배 값은 <code>render()</code> 안에서 넣습니다.
					</p>
				</Beat>
				<Beat lines={job(3).vanilla} badge={3}>
					<p>
						<strong>③ 이벤트 핸들러 붙이기.</strong> 두 버튼에 <code>addEventListener</code>로 클릭
						핸들러를 붙입니다.
					</p>
				</Beat>
				<Beat lines={job(4).vanilla} badge={4}>
					<p>
						<strong>④ 문서에 넣기.</strong> 만든 요소를 <code>appendChild</code>로 문서의
						<code>body</code>에 하나씩 넣습니다.
					</p>
				</Beat>
				<Beat
					lines={[...job(2).vanilla, ...job(3).vanilla]}
					badges={{ vanilla: { 2: job(2).vanilla, 3: job(3).vanilla } }}
				>
					<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. -->
					<p>
						텍스트 쓰기와 이벤트 핸들러 붙이기는 둘 다 만든 요소를 다루는 일입니다. 하지만 하나는
						무엇을 보여 줄지를, 다른 하나는 클릭에 어떻게 반응할지를 정하므로 따로 생각합니다.
					</p>
				</Beat>
				<Beat lines={job(5).vanilla}>
					<Ask>
						<p>
							네 가지 중 어디에도 속하지 않는 줄이 더 있습니다. 먼저 <code>let count = 0;</code>과,
							클릭 핸들러 안에서 <code>count</code>를 바꾸는 줄은 무슨 일을 할까요?
						</p>
					</Ask>
				</Beat>
				<Beat lines={job(5).vanilla} badge={5}>
					<p>
						<strong>⑤ 상태 선언과 변경.</strong> <code>let count = 0</code>으로 화면에 보여 줄
						상태를 선언하고, 클릭 핸들러의 <code>count++</code>와 <code>count = 0</code>으로 그 값을
						바꿉니다. 이것까지 더하면 다섯 가지입니다.
					</p>
				</Beat>
			</Step>

			<Step>
				<Beat cue="질문 2">
					<Say at={6} note="이 줄을 지우면" spot="render();" strike />
					<Ask>
						<p>
							증가 버튼의 클릭 핸들러에서 <code>render();</code> 줄을 지우면, 증가 버튼을 눌렀을 때 화면의
							숫자는 어떻게 될까요?
						</p>
					</Ask>
					<Predict
						options={[
							'지우기 전처럼 하나씩 오른다',
							'0에서 바뀌지 않는다',
							'에러가 나서 버튼이 동작하지 않는다'
						]}
						answer={1}
					/>
					<Hint n={1} at={18} note="render()가 하는 일" point="render" on="vanilla">
						<p>
							<code>render()</code> 함수는 무엇을 하나요? 그리고 <code>count++</code>는 화면에
							무엇을 쓰나요?
						</p>
					</Hint>
				</Beat>
				<Beat cue="실험해 보기">
					<Lab title="render()를 지우고 증가 버튼 눌러 보기">
						<RenderLab />
					</Lab>
				</Beat>
				<Beat answer lines={[4, 5, 6, 7]}>
					<p>
						화면의 숫자는 0에서 바뀌지 않습니다. 그런데 <code>count</code> 변수는 누를 때마다 올라갑니다.
					</p>
				</Beat>
				<Beat lines={job(6).vanilla} badge={6}>
					<p>
						<strong>⑥ 상태가 바뀌면 다시 그리기.</strong> 상태 값이 바뀌는 것과 그 값을 화면에 다시
						쓰는 것은 별개의 일입니다. <code>vanilla-counter.js</code>에서는 상태를 바꿀 때마다
						<code>render()</code>를 직접 불러서 둘을 이어 줍니다.
					</p>
				</Beat>
				<Beat on="vanilla" at={26} note="처음 한 번 그리기" point="render">
					<p>
						마지막 줄의 <code>render()</code>는 상태가 바뀐 뒤가 아니라, 처음에 한 번 그리는
						호출입니다.
					</p>
				</Beat>
				<Beat whole="vanilla">
					<p>정리하면 <code>vanilla-counter.js</code>는 여섯 가지 일을 합니다.</p>
					<!-- each item lights its lines on the stage while pointed at -->
					<ol class="jobs">
						{#each [1, 2, 3, 4, 5, 6] as no (no)}
							<li>
								<Peek lines={{ vanilla: job(no).vanilla }} badge={no}>{job(no).job}</Peek>
							</li>
						{/each}
					</ol>
				</Beat>
			</Step>

			<Beat code={['counter', 'compiled']} whole={['counter', 'compiled']} cue="컴파일하기">
				<p>
					이제 Svelte가 같은 카운터를 어떻게 바꾸는지 보겠습니다. 브라우저는 <code>.svelte</code>
					파일을 그대로 실행하지 못하므로, Svelte 컴파일러가 <code>Counter.svelte</code>를 평범한
					JavaScript 모듈 <code>Counter.js</code>로 바꿔 줍니다.
				</p>
			</Beat>
			<Beat
				code={['vanilla', 'compiled']}
				whole={['vanilla', 'compiled']}
				enter="stagger"
				cue="함께 놓기"
			>
				<p><code>vanilla-counter.js</code>와 <code>Counter.js</code>를 함께 놓아 보겠습니다.</p>
			</Beat>

			<Step>
				<Beat code={['vanilla', 'compiled']} cue="질문 3">
					<Ask>
						<p>
							<code>vanilla-counter.js</code>가 하던 여섯 가지 일을 <code>Counter.js</code>에서는
							각각 어느 줄이 할까요? 함수가 정확히 무엇을 하는지 몰라도 괜찮습니다. 이름과 위치로
							짐작해 보세요.
						</p>
					</Ask>
					<Hint n={1}>
						<p>
							<code>$.</code>으로 시작하는 함수의 이름을 <code>vanilla-counter.js</code>의 DOM API와
							맞대어 보세요.
						</p>
					</Hint>
				</Beat>
				<Beat
					answer
					on="compiled"
					lines={job(1).compiled}
					also={{ vanilla: job(1).vanilla }}
					badge={1}
					at={6}
					note="세 요소를 문자열 하나에"
					point={'`<button> </button> <p> </p> <button>초기화</button>`'}
				>
					<p>
						<strong>① 요소 만들기.</strong> <code>Counter.js</code>는 세 요소의 HTML을 문자열 하나에
						담아 <code>$.template</code>에 넘기고, <code>$.template</code>이 반환한 함수
						<code>root</code>를 불러 세 요소를 한꺼번에 얻습니다. <!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. (다음 한 문장) -->
						문자열로부터 요소를 어떻게 만드는지는 1-1장에서 살펴봅니다.
					</p>
				</Beat>
				<Beat on="compiled" lines={job(2).compiled} also={{ vanilla: job(2).vanilla }} badge={2}>
					<p>
						<strong>② 텍스트 쓰기.</strong> <code>innerText</code> 대신 <code>$.set_text</code>로
						<!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. (다음 한 문장. 불러 준 "값을 텍스트를"의 겹친 조사는 오타로 보고 하나를 뺌, 학습자 확인 필요) -->
						숫자와 두 배 값 텍스트를 씁니다.
					</p>
				</Beat>
				<Beat on="compiled" at={6} note="이미 들어 있음" point="초기화">
					<p>초기화 버튼의 글자는 HTML 문자열에 이미 들어 있어서, 따로 쓰지 않습니다.</p>
				</Beat>
				<Beat
					on="compiled"
					lines={[4, 5, 13, 26]}
					also={{ vanilla: job(3).vanilla }}
					badge={3}
					at={13}
					note="프로퍼티에 저장만"
					point="__click"
				>
					<p>
						<strong>③ 이벤트 핸들러 붙이기.</strong> <code>addEventListener</code>가 없습니다.
						핸들러 함수 <code>on_click</code>, <code>on_click_1</code>을 만들어 두고, 버튼 객체의
						<code>__click</code>
						프로퍼티에 <code>[on_click, count]</code>처럼 핸들러와
						<code>count</code>를 함께 저장할 뿐입니다.
					</p>
				</Beat>
				<Beat on="compiled" lines={job(4).compiled} also={{ vanilla: job(4).vanilla }} badge={4}>
					<p>
						<strong>④ 문서에 넣기.</strong> 요소마다 넣지 않고 <code>$.append</code>를 한 번
						부릅니다.
					</p>
				</Beat>
				<Beat on="compiled" lines={job(5).compiled} also={{ vanilla: job(5).vanilla }} badge={5}>
					<p>
						<strong>⑤ 상태 선언과 변경.</strong>
						<Recall word="state-source" plain
							><code>Counter.svelte</code>의 <code>$state(0)</code></Recall
						>은
						<code>$.state(0)</code>이 되었습니다. <code>count++</code>와 <code>count = 0</code>은
						핸들러 안의 <code>$.update(count)</code>와 <code>$.set(count, 0)</code>이 되었습니다.
					</p>
				</Beat>
				<Beat on="compiled" lines={[4]} also={{ vanilla: [5, 6] }}>
					<Ask>
						<p>
							그런데 <code>on_click</code>에는 <code>render()</code>에 해당하는 줄이 없습니다.
							그러면 <code>count</code>가 바뀌었을 때 새 값을 화면에 쓰는 것은 무엇일까요?
						</p>
					</Ask>
					<Hint n={1} at={28} note="$.set_text를 감싼 함수" point="$.template_effect" on="compiled">
						<p>②에서 찾은 <code>$.set_text</code> 두 줄을 감싸고 있는 함수를 보세요.</p>
					</Hint>
				</Beat>
				<Beat
					on="compiled"
					lines={job(6).compiled}
					also={{ vanilla: job(6).vanilla }}
					badge={6}
					at={28}
					note="count가 바뀌면 다시 실행"
					point="$.template_effect"
				>
					<p>
						<strong>⑥ 상태가 바뀌면 다시 그리기.</strong> <code>$.set_text</code>를 부르는 코드를
						<code>$.template_effect</code>에 함수로 넘겨 등록해 두면, <code>count</code>가 바뀔 때
						그 함수가 다시 실행됩니다. <code>vanilla-counter.js</code>에서는 상태를 바꾸는 쪽이
						<code>render()</code>를 불러야 하지만, <!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. (다음 한 문장) -->
						<code>Counter.js</code>에서는 화면을 그리는 코드가 알아서 다시 실행됩니다.
					</p>
				</Beat>
				<Beat
					on="compiled"
					lines={job(6).compiled}
					also={{ vanilla: [19, 20, ...job(6).vanilla] }}
					badges={{
						vanilla: { 2: [19, 20], 6: job(6).vanilla },
						compiled: { 6: [28, 31], 2: [29, 30] }
					}}
				>
					<p>
						<code>vanilla-counter.js</code>에서 따로 있던 ②(<code>render()</code> 안에서 글자
						쓰기)와 ⑥(상태를 바꾼 뒤
						<code>render()</code> 부르기)이 <code>Counter.js</code>에서는 한 곳에 모여 있습니다.
						그리는 코드가 어떻게 다시 실행되는지는 1-4장에서 살펴봅니다.
					</p>
				</Beat>
			</Step>

			<Step>
				<Beat on="compiled" lines={job(7).compiled} cue="질문 4">
					<Ask>
						<p>
							<code>Counter.js</code>에는 아직 짝을 찾지 못한 줄이 있습니다.
							<code>$.first_child</code>, <code>$.child</code>, <code>$.sibling</code>은 무엇을
							하려는 걸까요? <code>vanilla-counter.js</code>에는 왜 이런 줄이 필요 없을까요?
						</p>
					</Ask>
					<Hint n={1} at={10} note="세 요소를 한꺼번에" point="root()" on="compiled">
						<p>
							이름(first child, sibling)과, <code>root()</code>가 세 요소를 한꺼번에 반환한다는 점을
							함께 생각해 보세요.
						</p>
					</Hint>
				</Beat>
				<Beat
					answer
					on="compiled"
					lines={[10, ...job(7).compiled]}
					also={{ vanilla: job(1).vanilla }}
					badges={{ compiled: { 7: job(7).compiled } }}
					at={11}
					note="묶음에서 하나씩 찾기"
					point="$.first_child"
				>
					<p>
						<strong>⑦ 다룰 노드 찾아가기.</strong> <code>root()</code>가 한꺼번에 반환한 요소
						묶음에서, 다룰 노드를 하나씩 찾아 변수에 담습니다. <code>vanilla-counter.js</code>는
						<code>createElement</code>가 만든 요소를 그 자리에서 변수에 담으므로 찾을 필요가
						없습니다. <!-- 학습자 문장: 학습자가 직접 불러 준 문장입니다. 바꾸지 않습니다. (다음 한 문장) -->
						<code>Counter.js</code>에서만 필요한 일입니다.
					</p>
				</Beat>
				<Beat
					on="compiled"
					lines={[15, 20, 29, 30]}
					badges={{ compiled: { 7: [15, 20], 2: [29, 30] } }}
					at={15}
					note="값을 쓸 텍스트 노드"
					point="$.child"
				>
					<p>
						버튼과 문단 같은 요소뿐 아니라, ②에서 <code>$.set_text</code>로 값을 쓸 버튼 안과 문단
						안의 텍스트 노드(<code>text</code>, <code>text_1</code>)도 이렇게 찾습니다.
					</p>
				</Beat>
				<Beat on="compiled" lines={[17, 22]}>
					<p>
						함께 나오는 <code>$.reset</code>은 이 장에서는 넘어갑니다. 노드를 찾아가는 방법과 함께
						1-2장에서 살펴봅니다.
					</p>
				</Beat>
				<Beat on="compiled" lines={[13, 26, 36]}>
					<Say at={36} note="맨 아래 줄" point="$.delegate" />
					<Ask>
						<p>
							<code>Counter.js</code>는 <code>__click</code>에 핸들러를 저장하기만 합니다. 그러면
							버튼을 눌렀을 때 그 핸들러는 누가 부를까요? 맨 아래 줄
							<code>$.delegate</code>를 보세요.
						</p>
					</Ask>
				</Beat>
				<Beat
					on="compiled"
					lines={[13, 26, 36]}
					also={{ vanilla: job(3).vanilla }}
					badge={3}
					at={36}
					note="공용 리스너 등록"
					point="$.delegate"
				>
					<p>
						클릭 리스너를 버튼마다 붙이지 않고, 버튼들을 감싼 바깥에 붙인 리스너가 대신 처리합니다.
						이벤트 위임은 이렇게 자식 요소의 이벤트를 조상 쪽의 리스너가 대신 처리하는 것을
						뜻합니다.
						<code>$.delegate</code>는 <code>'click'</code>이라는 이벤트 이름을 등록해 둡니다. 앱을
						마운트하면, 등록된 이벤트 이름마다 마운트한 대상 요소와 <code>document</code>에 리스너가
						하나씩 붙습니다. 버튼에는 붙지 않습니다. 버튼을 누르면 그 리스너가 누른 요소부터 부모
						쪽으로 올라가며 <code>__click</code>을 찾고, 저장된 핸들러를 <code>count</code>와 함께
						부릅니다. 그래서 ③의 짝은 <code>__click</code>과 <code>$.delegate</code>입니다.
					</p>
					<Evidence>
						<Ref code={data.refs.events} lines={[123, 131]} focus={[123, 125]}>delegate</Ref>,
						<Ref plain code={data.refs.render} lines={[194, 219]} focus={[206, 213]}
							>마운트할 때 리스너를 붙이는 곳</Ref
						>,
						<Ref plain code={data.refs.events} lines={[217, 228]} focus={[219, 224]}
							>__click을 찾아 부르는 곳</Ref
						>
					</Evidence>
				</Beat>
			</Step>

			<section class="outro">
				<Beat code={['vanilla', 'compiled']} cue="정리">
					<h2>일곱 가지 차이와 남은 질문</h2>
					<p>
						<code>vanilla-counter.js</code>와 <code>Counter.js</code>는 같은 카운터인데, 일곱 가지
						일을 하는 방식이 다릅니다(⑦은 <code>Counter.js</code>에만 있습니다). 차이마다 "Svelte는
						왜 이렇게 했을까?"라는 질문이 남습니다. 1단계의 나머지 장에서 이 질문들에 답합니다.
					</p>
					<JobMap vanilla={data.vanilla} compiled={data.compiled} />
				</Beat>
			</section>

			{#if chapter.progress >= chapter.beats.length}
				{@const next = next_chapter('1-0')}
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
		/* no colour of its own: .pen-go (app.css) colours it and turns it the accent on hover */
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
