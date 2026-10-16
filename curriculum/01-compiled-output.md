# 1단계: 컴파일 결과 관찰

컴파일러와 런타임 내부를 읽기 전에, 컴파일러가 실제로 **무엇을 만들어 내는지**를 출력물로 먼저 이해하는 단계입니다. 이 단계에서 생긴 "왜 이렇게 생성하지?"라는 의문이 2단계(signal), 3단계(DOM), 4단계(컴파일러)를 읽는 동기가 됩니다.

이 단계에서는 런타임 함수를 깊게 읽지 않아도 됩니다. 함수 이름과 인자만 보고 역할을 추측하고, 짧은 함수 몇 개만 직접 열어 확인하면 충분합니다.

## 학습 목표

1. 컴포넌트 하나가 "HTML 문자열 템플릿 + 노드 탐색 코드 + effect" 세 부분으로 바뀐다는 것을 설명할 수 있습니다.
2. `$state`, `$derived`, `$effect`, `$props`가 각각 어떤 런타임 호출로 바뀌는지, 그리고 컴파일러가 언제 그 호출을 **생략**하는지 설명할 수 있습니다.
3. 템플릿의 동적인 부분이 `$.template_effect` 단위로 어떻게 묶이는지, 그리고 이벤트 핸들러가 언제 위임(delegation)되고 언제 직접 등록되는지 구분할 수 있습니다.
4. `{#if}`, `{#each}`, 하위 컴포넌트가 anchor 노드를 기준으로 DOM에 삽입된다는 것을 출력물과 DOM 변경 기록으로 확인할 수 있습니다.
5. client, server, dev, legacy(runes 없는 문법) 출력이 서로 어떻게 다른지 비교할 수 있습니다.

## 사전 자료

- 공식 문서의 runes 항목: [`$state`](https://svelte.dev/docs/svelte/$state), [`$derived`](https://svelte.dev/docs/svelte/$derived), [`$effect`](https://svelte.dev/docs/svelte/$effect), [`$props`](https://svelte.dev/docs/svelte/$props)
- 공식 문서의 [Basic markup](https://svelte.dev/docs/svelte/basic-markup) 항목: 이벤트 속성과 이벤트 위임(event delegation)을 설명합니다.
- Rich Harris, ["Introducing runes"](https://svelte.dev/blog/runes) (2023): runes를 도입한 이유를 설명합니다.
- 공식 [Playground](https://svelte.dev/playground): 우측의 "JS output" 탭으로 같은 실험을 브라우저에서도 할 수 있습니다. 다만 Playground는 최신 버전을 사용하므로 출력 형태가 5.0.0과 다를 수 있습니다(예를 들어 최신 버전에서는 `$.template`이 `$.from_html`로 바뀌었습니다). 이 단계에서는 로컬 도구의 출력을 기준으로 삼으세요.

## 읽을 코드

모든 경로는 `svelte/packages/svelte/` 기준이며, 브랜치는 `study/5.0.0`입니다. 이 단계에서는 전부 읽을 필요가 없고, 질문에서 가리키는 함수만 찾아 읽으면 됩니다.

| 파일 | 역할 | 줄 수 |
|---|---|---|
| `src/constants.js` | 컴파일러와 런타임이 공유하는 비트 플래그(`TEMPLATE_*`, `EACH_*`, `PROPS_*`)와 hydration 마커 | 약 56 |
| `src/internal/client/dom/template.js` | `$.template`, `$.text`, `$.comment`, `$.append` | 약 250 |
| `src/internal/client/dom/operations.js` | `$.child`, `$.first_child`, `$.sibling` | 약 180 |
| `src/internal/client/dom/hydration.js` | `$.reset`, `$.next` | 약 105 |
| `src/internal/client/render.js` | `mount`, `set_text` | 약 305 |
| `src/internal/client/dom/elements/events.js` | `$.delegate`, `$.event`, 위임된 이벤트 처리 | 약 300 |
| `src/utils.js` | 위임 대상 이벤트 목록(`DELEGATED_EVENTS`) | 약 400 |
| `src/compiler/phases/3-transform/client/visitors/Fragment.js` | 템플릿 문자열과 `$.template` 호출을 만드는 곳 | 약 270 |
| `src/compiler/phases/3-transform/client/visitors/shared/fragment.js` | 텍스트와 `{expression}`을 묶어 노드 탐색 코드를 만드는 곳 | 약 160 |
| `src/compiler/phases/3-transform/client/visitors/VariableDeclaration.js` | `$state`, `$derived`, `$props` 선언 변환 | 약 320 |
| `src/compiler/phases/3-transform/client/utils.js` | `should_proxy`, `is_state_source`, `get_prop_source` | 약 330 |
| `src/compiler/phases/3-transform/client/transform-client.js` | 컴포넌트 함수 전체를 조립하는 곳 | 약 660 |

## 도구 사용법

```bash
# 컴파일 결과 보기 (production client 출력)
node tools/compile.mjs playground/01-compiled-output/03-text-kinds.svelte

# 다른 출력 모드
node tools/compile.mjs <file> --server     # SSR 출력
node tools/compile.mjs <file> --dev        # dev 모드 출력
node tools/compile.mjs <file> --legacy     # runes: false 강제
node tools/compile.mjs <file> --watch      # 저장할 때마다 다시 출력

# 두 출력 비교 (zsh, bash 모두 동작)
diff <(node tools/compile.mjs <file>) <(node tools/compile.mjs <file> --dev)

# jsdom에 마운트하고, 각 단계에서 일어난 DOM 변경만 출력
node tools/mount.mjs playground/01-compiled-output/08-blocks.svelte \
  --script labs/01-compiled-output/blocks.steps.mjs
```

`mount.mjs`의 출력에서 `insert`/`remove`/`text`는 MutationObserver가 기록한 실제 DOM 변경입니다. `insert` 줄에 표시되는 노드 내용은 **보고 시점**의 내용이므로, 삽입된 순간의 내용과 다를 수 있다는 점에 유의하세요.

예제 컴포넌트는 `playground/01-compiled-output/`에, 단계별 조작 스크립트는 `labs/01-compiled-output/`에 있습니다. 예제를 자유롭게 수정하고 새로 만들어도 됩니다.

Svelte 저장소의 snapshot 테스트도 좋은 자료입니다. `svelte/packages/svelte/tests/snapshot/samples/<이름>/index.svelte`가 입력이고, `_expected/client/index.svelte.js`와 `_expected/server/index.svelte.js`가 기대 출력입니다. `svelte/` 디렉터리에서 `npx -y pnpm@9.4.0 test snapshot`을 실행하면 이 기대 출력과 실제 출력을 비교합니다.

## 학습 경로

아래 질문들은 처음 작성한 순서(1-A~1-D)대로 실려 있지만, 공부는 이 표의 순서로 진행합니다. 직접 짠 바닐라 카운터와 Svelte의 컴파일 결과를 비교하면 같은 일을 하는 코드가 여섯 군데에서 다르게 생겼는데, 그 차이 하나가 한 장이 됩니다. 질문 ID는 바꾸지 않고 순서만 바꿉니다. 이 표는 대략적인 초안이므로, 공부하면서 장을 나누거나 질문을 옮길 수 있습니다.

| 장 | 주제 | 질문 |
|---|---|---|
| 1-0 | 바닐라 카운터와 컴파일 결과 비교 | Q1.0 |
| 1-1 | 노드를 만드는 방법: 템플릿 파싱과 복제 | Q1.1, Q1.4(파싱 시점), Q1.6 |
| 1-2 | 노드를 찾아가는 방법: 탐색과 공백 자리 | Q1.3, Q1.2 |
| 1-3 | 문서에 넣는 방법: anchor와 블록 | Q1.4(`<!>`와 빈 텍스트 노드), Q1.18 |
| 1-4 | 값을 쓰고 갱신하는 방법: `template_effect` | Q1.12, Q1.13, Q1.14 |
| 1-5 | 상태 선언이 바뀌는 방법: runes | Q1.7, Q1.8, Q1.9, Q1.10, Q1.11 |
| 1-6 | 이벤트를 연결하는 방법: 위임과 hoisting | Q1.15, Q1.16, Q1.17 |
| 1-7 | 같은 코드, 다른 출력: hydration, server, legacy, dev | Q1.5, Q1.19, Q1.20 |

## 질문

### 1-0. 출발점

**Q1.0** `[관찰]` 다음 카운터 컴포넌트를 프레임워크 없이 순수 JavaScript로 직접 구현하세요(`scratch/01-vanilla-counter.html`). 그런 다음 같은 컴포넌트의 컴파일 결과(`scratch/compiled/01-counter.compiled.js`)와 나란히 놓고, 같은 일을 하는 코드가 어떻게 다르게 생겼는지 찾아 목록으로 만드세요. 각 차이에 대해 "Svelte는 왜 이렇게 했을까?"라는 질문을 하나씩 적어 두면, 그 질문들이 1단계의 나머지 장으로 이어집니다.

```svelte
<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>{count}</button>
<p>두 배: {count * 2}</p>
<button onclick={() => count = 0}>초기화</button>
```

<details><summary>힌트 1</summary>컴포넌트가 화면에 나타나기까지 해야 하는 일을 순서대로 떠올려 보세요. 노드를 만들고, 나중에 값을 쓸 노드를 기억해 두고, 값을 쓰고, 이벤트를 연결하고, 문서에 넣어야 합니다. 상태가 바뀌었을 때 화면을 갱신하는 일도 있습니다.</details>
<details><summary>힌트 2</summary>바닐라 구현에서 <code>createElement</code>, <code>render()</code>, <code>addEventListener</code>, <code>appendChild</code>가 각각 컴파일 결과의 어느 줄에 대응하는지 짝지어 보세요. 짝이 없는 줄도 눈여겨보세요.</details>

### 1-A. 템플릿과 노드 탐색

**Q1.1** `[관찰]` `01-static.svelte`, `02-single-element.svelte`, `11-custom-element.svelte`를 각각 컴파일하세요. `$.template(...)`의 두 번째 인자는 없거나, `1`이거나, `3`입니다. 각 값은 어떤 비트 플래그의 조합이며, 그 플래그가 켜지는 조건은 무엇인가요?

<details><summary>힌트 1</summary><code>src/constants.js</code>에서 <code>TEMPLATE_</code>로 시작하는 상수를 찾고, 컴파일러의 <code>Fragment.js</code>에서 그 상수를 사용하는 곳을 찾으세요.</details>
<details><summary>힌트 2</summary>템플릿의 최상위 노드가 하나인지 여러 개인지, 그리고 템플릿 안에 하이픈이 들어간 태그 이름이 있는지에 주목하세요. 두 번째 플래그를 켜는 곳은 <code>RegularElement.js</code>에 있습니다.</details>

**Q1.2** `[관찰]` `03-text-kinds.svelte`를 컴파일하면 템플릿 문자열에 `<p></p>`(비어 있음)와 `<p> </p>`(공백 한 칸)가 섞여 있습니다. 어떤 `<p>`가 빈 태그가 되고 어떤 `<p>`가 공백을 갖게 되나요? 공백 한 칸은 무엇을 위한 자리인가요?

<details><summary>힌트 1</summary>컴파일 결과에서 각 <code>&lt;p&gt;</code>에 대해 <code>textContent =</code>를 쓰는지, <code>$.child(p)</code>로 노드를 얻어 <code>$.set_text</code>를 호출하는지 비교하세요.</details>
<details><summary>힌트 2</summary><code>RegularElement.js</code>에서 <code>textContent</code>를 검색하고, <code>shared/fragment.js</code>의 <code>flush_sequence</code>에서 <code>state.template.push(' ')</code>를 찾으세요. "이 텍스트가 나중에 바뀔 수 있는가?"가 기준입니다.</details>

**Q1.3** `[예측]` `09-anchors.svelte`를 **컴파일하기 전에** 다음 두 가지를 종이에 적어 보세요. (1) 템플릿 문자열이 어떤 모양일지, (2) `<em>` 노드에 도달하기 위해 `$.sibling(..., n)`의 `n`이 얼마가 될지. 그런 다음 컴파일해서 확인하고, 예측이 틀렸다면 어디서 틀렸는지 적으세요. `<b>static</b>`과 `<i>static</i>`을 가리키는 변수가 생기지 않는 이유도 설명하세요.

<details><summary>힌트 1</summary>공백 텍스트 노드도 형제 노드 하나로 계산됩니다. <code>{#if}</code> 블록은 템플릿 안에서 <code>&lt;!&gt;</code> 하나로 표시됩니다.</details>
<details><summary>힌트 2</summary><code>shared/fragment.js</code>의 <code>process_children</code>에서 <code>skipped</code> 변수가 언제 증가하는지, 그리고 <code>is_static_element</code>가 어떤 요소를 정적이라고 판단하는지 보세요. snapshot 샘플 <code>skip-static-subtree</code>도 같은 주제를 다룹니다.</details>

**Q1.4** `[추적]` `template.js`의 `template()` 함수를 읽고 다음에 답하세요.
- HTML 문자열을 DOM으로 파싱하는 작업은 컴포넌트 인스턴스마다 일어나나요, 한 번만 일어나나요?
- `has_start`가 `false`일 때 앞에 `<!>`를 하나 더 붙이는 이유는 무엇인가요? 이 주석 노드가 `$.first_child`에서는 어떻게 처리되나요?
- `node tools/mount.mjs playground/01-compiled-output/08-blocks.svelte`를 실행하면 `#app` 안에 가장 먼저 `""`(빈 텍스트 노드)가 삽입되고, HTML 맨 앞에 `<!---->`가 보입니다. 두 노드는 각각 어느 코드에서 만들어지나요?

<details><summary>힌트 1</summary><code>template.js</code>에서 <code>node === undefined</code> 조건과 <code>cloneNode</code>를 찾으세요. <code>operations.js</code>의 <code>first_child</code>도 함께 읽으세요. 빈 텍스트 노드는 <code>render.js</code>의 <code>_mount</code>에서 찾을 수 있습니다.</details>
<details><summary>힌트 2</summary><code>assign_nodes(start, end)</code>가 무엇을 기록하는지 주목하세요. 블록이 나중에 자신의 DOM을 지우려면 "내 노드는 어디서 시작해서 어디서 끝나는가"를 알아야 합니다.</details>

**Q1.5** `[추적]` 거의 모든 출력에 `$.reset(p)`나 `$.next(2)` 같은 호출이 들어 있습니다. `hydration.js`에서 두 함수를 읽어 보면, 일반 `mount`에서는 아무 일도 하지 않습니다. 그렇다면 컴파일러는 왜 이 호출을 매번 생성하나요? 같은 컴파일 결과가 `mount`와 `hydrate` 두 경우에 모두 쓰인다는 점과 연결해서 설명하세요.

<details><summary>힌트 1</summary><code>hydration.js</code>의 <code>hydrating</code>, <code>hydrate_node</code> 변수 주석을 읽으세요. <code>operations.js</code>의 <code>child</code>, <code>sibling</code>도 <code>hydrating</code>일 때 다르게 동작합니다.</details>
<details><summary>힌트 2</summary>hydration 중에는 "새 노드를 복제하는 것"이 아니라 "서버가 만든 기존 노드를 순서대로 걷는 것"이 필요합니다. 걷는 위치를 나타내는 커서가 요소 안으로 들어갔다면, 요소가 끝날 때 커서를 어디로 돌려놓아야 할까요?</details>

**Q1.6** `[설명]` Svelte 5는 HTML 문자열을 한 번 파싱해 두고 `cloneNode`로 복제한 뒤, `$.child`/`$.sibling`으로 필요한 노드만 찾아갑니다. 노드마다 `document.createElement`를 호출하는 방식(Svelte 3/4의 방식)과 비교했을 때 이 방식의 장점과 비용은 무엇인가요? 커스텀 엘리먼트가 있을 때만 `importNode`를 쓰는 이유도 함께 설명하세요.

<details><summary>힌트 1</summary>생성되는 코드의 크기, 브라우저 내장 함수의 속도, 그리고 정적인 하위 트리를 아예 건너뛸 수 있다는 점을 비교 기준으로 삼으세요.</details>
<details><summary>힌트 2</summary><code>RegularElement.js</code>에서 <code>template_needs_import_node</code>를 설정하는 곳의 주석을 읽으세요.</details>

### 1-B. runes가 어떤 코드로 바뀌는가

**Q1.7** `[관찰]` `04-state-proxy.svelte`를 컴파일하고, 변수 `a`부터 `g`까지를 다음 네 가지 형태로 분류하는 표를 만드세요: 일반 값, `$.proxy(...)`, `$.state(...)`, `$.state($.proxy(...))`. 그런 다음 `labs/01-compiled-output/state-proxy.steps.mjs`의 각 단계에서 화면의 숫자 7개가 어떻게 바뀔지 **먼저 예측하고** 실행해서 확인하세요.

<details><summary>힌트 1</summary>각 변수가 재할당되는지(<code>d = 1</code>), 내부만 변경되는지(<code>b.n += 1</code>), 아무것도 하지 않는지를 먼저 표에 적으세요.</details>
<details><summary>힌트 2</summary>재할당이 없는 변수를 화면에 반영하려면 무엇이 필요하고, 재할당이 있는 변수는 무엇이 더 필요한지 생각하세요.</details>

**Q1.8** `[추적]` Q1.7에서 만든 표의 규칙을 컴파일러 코드에서 찾아 확인하세요. `VariableDeclaration.js`에서 `$state`를 처리하는 부분을 시작점으로 삼으면 됩니다. 특히 다음을 설명하세요.
- `let a = $state(0)`이 그냥 `let a = 0`이 되는 조건은 무엇인가요? runes 모드에서 이 최적화가 안전한 이유는 무엇인가요?
- `let g = $state(seed)`처럼 다른 변수로 초기화하면 `$.proxy`가 붙는 이유는 무엇인가요? 반대로 `$state(0)`, `` $state(`x`) ``에는 붙지 않는 이유는 무엇인가요?
- `$state.raw`(`f`)는 `$state`(`e`)와 어디서 갈라지나요?

<details><summary>힌트 1</summary><code>3-transform/client/utils.js</code>의 <code>should_proxy</code>와 <code>is_state_source</code>를 읽고, <code>2-analyze/index.js</code>에서 <code>analysis.immutable</code>이 어떻게 정해지는지 확인하세요.</details>
<details><summary>힌트 2</summary><code>let</code>으로 선언된 지역 변수에 값을 다시 대입할 수 있는 코드는 모두 어디에 있을까요? 컴파일러는 그 범위를 전부 볼 수 있습니다.</details>

**Q1.9** `[예측]` `04b-plain-vs-state.svelte`에는 일반 객체 `plainObj`와 `$state` 객체 `stateObj`가 있고, 버튼 하나가 두 객체를 함께 1씩 증가시킵니다. 버튼을 누르면 `plain:` 텍스트가 바뀔까요? 먼저 예측한 뒤 `labs/01-compiled-output/plain-vs-state.steps.mjs`로 확인하세요. 이어서 `07-events.svelte`를 `events.steps.mjs`로 실행하고, "mutates a plain let"을 눌렀을 때는 아무 변화가 없다가 "inline arrow"를 누른 뒤에야 마지막 숫자가 `1`로 바뀌는 이유를 설명하세요.

<details><summary>힌트 1</summary>두 경우 모두 컴파일 결과에서 해당 텍스트를 갱신하는 <code>$.set_text</code>가 어느 <code>$.template_effect</code> 안에 있는지 확인하세요.</details>
<details><summary>힌트 2</summary>effect는 "자신이 읽은 signal"이 바뀔 때만 다시 실행됩니다. 다시 실행될 때는 effect 안의 모든 코드가 실행됩니다. <code>07-events.svelte</code>를 컴파일할 때 출력되는 경고 메시지도 읽어 보세요.</details>

**Q1.10** `[관찰]` `06-props.svelte`를 컴파일하세요.
- `$.prop($$props, "withDefault", 3, 1)`, `$.prop(..., "lazyDefault", 19, compute)`, `$.prop(..., "reassigned", 7)`의 숫자 `3`, `19`, `7`을 `src/constants.js`의 `PROPS_*` 플래그로 분해하세요.
- `plain`, `value`, `rest.extra`는 `$.prop`을 거치지 않고 `$$props.plain`, `$$props.value`, `$$props.extra`로 바뀝니다. 어떤 prop이 `$.prop`을 거치고, 어떤 prop은 직접 접근하나요?
- `lazyDefault = compute()`인데 출력에는 `compute()`가 아니라 `compute`가 전달됩니다. 왜 호출하지 않고 함수 자체를 넘기나요?

<details><summary>힌트 1</summary><code>3-transform/client/utils.js</code>의 <code>get_prop_source</code>와 <code>is_prop_source</code>를 읽으세요.</details>
<details><summary>힌트 2</summary>부모가 이 prop에 값을 넘겼다면 기본값을 계산할 필요가 있을까요? 그리고 prop을 getter로 감싸지 않고 <code>$$props.x</code>로 매번 읽으면, 부모의 값이 바뀌었을 때 무엇을 읽게 될까요?</details>

**Q1.11** `[설명]` `05-derived-effect.svelte`와 `06-props.svelte`의 출력에는 `$.push($$props, true)`와 `$.pop()`이 있지만, `03-text-kinds.svelte`와 `04-state-proxy.svelte`에는 없습니다. 예제를 조금씩 지우거나 바꾸면서 어떤 문법이 `$.push`/`$.pop`을 만들어 내는지 실험으로 찾고, 컴파일러 코드에서 그 조건을 확인하세요. 컴포넌트 context가 필요 없는 컴포넌트에서 `$.push`/`$.pop`을 생략하면 무엇을 아낄 수 있나요?

<details><summary>힌트 1</summary><code>transform-client.js</code>에서 <code>should_inject_context</code>를 찾고, <code>2-analyze/visitors/</code> 아래에서 <code>needs_context = true</code>를 검색하세요.</details>
<details><summary>힌트 2</summary><code>getContext</code>, <code>setContext</code>, <code>onMount</code> 같은 함수는 "지금 어떤 컴포넌트를 초기화하는 중인가"를 알아야 동작합니다. import한 함수를 호출하거나 prop의 속성을 읽는 코드가 그런 함수를 간접적으로 호출할 가능성이 있을까요?</details>

### 1-C. 업데이트 단위: `template_effect`와 이벤트

**Q1.12** `[관찰]` `03-text-kinds.svelte`의 `<p>` 6개를 다음 네 가지로 분류하세요: (a) 처음에 한 번 `textContent`로 설정하고 끝나는 것, (b) 하나의 공용 `$.template_effect`로 묶이는 것, (c) 자신만의 `$.template_effect`를 갖는 것, (d) `$.derived`를 거친 뒤 `$.template_effect`에서 읽히는 것. 각 분류를 결정하는 기준은 무엇인가요?

<details><summary>힌트 1</summary>각 <code>{expression}</code>이 상태(state)를 읽는지, 함수를 호출하는지, 함수를 몇 번 호출하는지 세어 보세요.</details>
<details><summary>힌트 2</summary><code>shared/fragment.js</code>의 <code>flush_sequence</code>에서 <code>has_call</code>과 <code>has_state</code>에 따라 갈라지는 세 갈래를 찾고, <code>shared/utils.js</code>의 <code>build_template_literal</code>에서 <code>contains_multiple_call_expression</code>을 찾으세요.</details>

**Q1.13** `[예측]` `12-grouped-effect.svelte`에서 `a: {a}`와 `b: {b}`는 하나의 `template_effect`로 묶이고, `{expensive(b)}`는 별도의 `template_effect`를 갖습니다. `a++` 버튼을 눌렀을 때 (1) 실행되는 `$.set_text` 호출은 몇 개인지, (2) 실제로 DOM에 기록되는 텍스트 노드는 몇 개인지, (3) `expensive()`가 다시 실행되는지 예측하세요. 그런 다음 `labs/01-compiled-output/grouped-effect.steps.mjs`로 확인하세요.

<details><summary>힌트 1</summary><code>$.set_text</code>가 호출되는 것과 DOM이 실제로 바뀌는 것은 다른 문제입니다.</details>
<details><summary>힌트 2</summary><code>render.js</code>의 <code>set_text</code>를 읽고, 텍스트 노드에 붙어 있는 <code>__t</code> 속성이 무슨 역할을 하는지 확인하세요.</details>

**Q1.14** `[설명]` Q1.12와 Q1.13의 결과를 바탕으로, 컴파일러가 상태를 읽는 텍스트를 하나의 `template_effect`로 **묶는** 이유와 함수 호출이 있는 텍스트는 **따로 떼어 내는** 이유를 설명하세요. 반대로 모든 텍스트에 effect를 하나씩 만들었다면 무엇이 더 비싸질까요?

<details><summary>힌트 1</summary>effect 하나가 생기면 런타임이 관리해야 하는 객체와 의존성 연결이 늘어납니다. 반면 묶인 effect가 다시 실행될 때는 관련 없는 표현식도 함께 다시 계산됩니다.</details>
<details><summary>힌트 2</summary>상태를 읽는 단순한 표현식과 임의의 함수 호출은 다시 계산하는 비용이 어떻게 다를까요? <code>set_text</code>의 비교 로직이 어떤 비용을 없애 주는지도 생각하세요.</details>

**Q1.15** `[관찰]` `07-events.svelte`를 컴파일하고 `labs/01-compiled-output/events.steps.mjs`로 실행하세요. 어떤 핸들러가 `element.__click = ...`으로 저장되고, 어떤 핸들러가 `$.event(...)`로 등록되나요? `__click`에 저장되는 값이 배열 `[fn, count]`인 경우와 함수 하나인 경우는 무엇이 다른가요? 핸들러 함수가 컴포넌트 함수 **바깥**(모듈 최상위)으로 옮겨진 경우는 어떤 경우인가요?

<details><summary>힌트 1</summary>위임 대상 이벤트 목록은 <code>src/utils.js</code>의 <code>DELEGATED_EVENTS</code>에 있습니다. 핸들러를 바깥으로 옮기는 판단은 <code>2-analyze/visitors/Attribute.js</code>의 <code>get_delegated_event</code>에 있습니다.</details>
<details><summary>힌트 2</summary>모듈 최상위로 옮겨진 함수는 컴포넌트 함수 안의 지역 변수(<code>count</code>)에 직접 접근할 수 없습니다. 그 값은 어떤 경로로 전달될까요? 그리고 <code>let plain = 0</code>처럼 signal이 아닌 지역 변수를 대입하는 함수는 왜 옮길 수 없을까요?</details>

**Q1.16** `[추적]` 클릭 이벤트가 발생했을 때 `button.__click`에 저장된 핸들러가 실행되기까지의 경로를 추적하세요. 시작점은 모듈 맨 아래의 `$.delegate(["click"])`입니다. `events.js`의 `delegate`, `render.js`의 `_mount` 안에 있는 `event_handle`, 그리고 `events.js`의 `handle_event_propagation`을 거치는 순서로 설명하세요. 리스너는 어느 요소에 몇 개 등록되나요?

<details><summary>힌트 1</summary><code>all_registered_events</code>와 <code>root_event_handles</code>가 각각 무엇을 모으는지 보세요. <code>$.delegate</code>는 컴포넌트가 마운트되기 전, 모듈이 로드될 때 실행됩니다.</details>
<details><summary>힌트 2</summary><code>handle_event_propagation</code>의 <code>while (current_target !== null)</code> 반복문에서 <code>'__' + event_name</code> 속성을 읽는 부분과, 그 값이 배열일 때의 처리에 주목하세요.</details>

**Q1.17** `[설명]` 이벤트 위임과 핸들러 hoisting으로 얻는 이점은 무엇이고, 그 대가는 무엇인가요? 다음 사실들이 각각 어떤 설계 판단에서 나왔는지 설명하세요.
- `scroll`과 `focus`는 위임되지 않고 `$.event`로 등록됩니다.
- `10-legacy.svelte`의 `on:click`은 위임 대상인 `click`인데도 `$.event`로 등록됩니다.
- `13-delegation-order.svelte`에서 `<button>`의 `onclick`은 `stopPropagation()`을 호출하는데도, 부모 `<div>`에 `addEventListener`로 직접 등록한 리스너가 **먼저** 실행됩니다. 실행 전에 두 로그의 순서를 예측한 뒤 `labs/01-compiled-output/delegation-order.steps.mjs`로 확인하세요. (각 단계에서 출력된 로그는 그 단계의 보고 제목보다 위에 표시됩니다.)

<details><summary>힌트 1</summary>위임은 이벤트가 상위 요소로 버블링된다는 전제에 의존합니다. <code>DELEGATED_EVENTS</code> 목록에 <code>focus</code>는 없고 <code>focusin</code>은 있습니다.</details>
<details><summary>힌트 2</summary><code>3-transform/client/visitors/OnDirective.js</code>는 어떤 경우에도 <code>build_event</code>를 호출합니다. <code>on:</code> 디렉티브는 수식어(<code>|stopPropagation</code>, <code>|once</code> 등)와 Svelte 4의 동작을 그대로 지원해야 합니다.</details>

### 1-D. 블록, 컴포넌트, 그리고 다른 출력 모드

**Q1.18** `[관찰]` `08-blocks.svelte`를 컴파일하고 `labs/01-compiled-output/blocks.steps.mjs`로 실행하세요.
- `$.each`의 두 번째 인자 `21`을 `src/constants.js`의 `EACH_*` 플래그로 분해하세요.
- 최상위 `{#if}`와 `<Child>` 자리에는 템플릿에 `<!>`가 있지만, `<ul>` 안의 `{#each}` 자리에는 `<!>`가 없습니다. 각 블록은 어느 노드를 기준(anchor)으로 자신의 DOM을 삽입하나요?
- 하위 컴포넌트 `<Child>`는 출력에서 어떤 형태로 호출되나요? `new`나 클래스가 등장하나요? `{#snippet}`이나 children 내용은 어떤 형태로 전달되나요?
- toggle을 눌렀을 때 `<p>hidden</p>`은 어느 노드의 앞에 삽입되나요?

<details><summary>힌트 1</summary><code>3-transform/client/visitors/EachBlock.js</code>에서 템플릿에 <code>&lt;!&gt;</code>를 넣는 조건을 찾고, 런타임 <code>dom/blocks/each.js</code>에서 <code>EACH_IS_CONTROLLED</code>를 검색하세요.</details>
<details><summary>힌트 2</summary><code>template.js</code>의 <code>append(anchor, dom)</code>가 실제로 하는 DOM 조작이 무엇인지 보세요. 모든 블록과 컴포넌트는 "anchor 앞에 내 노드를 넣는다"는 같은 규칙을 따릅니다.</details>

**Q1.19** `[관찰]` 같은 `08-blocks.svelte`를 `--server`로 컴파일하세요. 서버 출력에는 effect도 signal도 없고, 문자열을 이어 붙이는 코드만 있습니다. 출력에 들어 있는 `<!--[-->`, `<!--[!-->`, `<!--]-->`, `<!---->` 주석은 각각 언제 출력되나요? 이 주석들이 client 출력의 `<!>`와 어떻게 대응하며, `dom/blocks/if.js`가 hydration 중에 `<!--[!-->`를 어떻게 활용하는지 설명하세요.

<details><summary>힌트 1</summary>마커 문자열은 <code>src/internal/server/hydration.js</code>와 <code>src/constants.js</code>의 <code>HYDRATION_*</code> 상수에 정의되어 있습니다.</details>
<details><summary>힌트 2</summary><code>if.js</code>의 <code>if_block</code>에서 <code>is_else</code> 변수와 <code>condition === is_else</code> 비교를 찾으세요. 서버와 브라우저의 조건 결과가 다르면 어떻게 될까요?</details>

**Q1.20** `[관찰]` 다음 두 비교를 하고, 차이점을 목록으로 정리하세요.
- `10-legacy.svelte`(Svelte 4 문법)와 `10-runes.svelte`(같은 동작을 runes로 작성)의 client 출력을 비교하세요. 상태 선언, `$:` 반응형 선언, 이벤트 등록, `$.push`의 두 번째 인자가 어떻게 다른가요?
- `10-runes.svelte`의 기본 출력과 `--dev` 출력을 `diff`로 비교하세요. dev 모드에서 추가되는 호출(`$.add_locations`, `$.check_target`, `$.FILENAME` 등)은 각각 어떤 개발 경험을 위한 것으로 보이나요?

<details><summary>힌트 1</summary>legacy 출력의 <code>$.mutable_state</code>, <code>$.legacy_pre_effect</code>를 runtime의 <code>reactivity/sources.js</code>, <code>reactivity/effects.js</code>에서 찾아 함수 이름과 주석만 읽어 보세요.</details>
<details><summary>힌트 2</summary>dev 모드에서는 production 모드에서 생략했던 <code>$.push</code>도 항상 생성됩니다. 에러 메시지에 "어느 파일의 몇 번째 줄"을 표시하려면 런타임이 무엇을 알아야 할까요?</details>

## 체크포인트

코드를 보지 않고 다음을 설명할 수 있으면 2단계로 넘어가도 좋습니다.

1. 컴포넌트 함수가 호출될 때 일어나는 일을 "템플릿 복제 → 노드 탐색 → effect 생성 → anchor 앞에 삽입" 순서로 설명할 수 있습니다.
2. `let x = $state(...)`가 일반 값, `$.proxy`, `$.state`, `$.state($.proxy(...))` 중 무엇이 될지 선언과 사용 방식만 보고 예측할 수 있습니다.
3. 템플릿의 텍스트가 `textContent` 한 번 설정, 공용 `template_effect`, 개별 `template_effect` 중 어디로 갈지 예측할 수 있고, 그렇게 나누는 이유를 비용 관점에서 설명할 수 있습니다.
4. 이벤트 위임이 어떻게 동작하는지, 그리고 어떤 이벤트와 어떤 문법이 위임에서 제외되는지 설명할 수 있습니다.
5. 서버 출력의 hydration 마커가 client 출력의 anchor와 어떻게 대응하는지 설명할 수 있습니다.

## 더 나아가기

1. `svelte/packages/svelte/tests/snapshot/samples/`에서 샘플 3개를 고르세요. `index.svelte`만 보고 client 출력을 손으로 써 본 뒤 `_expected/client/index.svelte.js`와 비교하세요. `skip-static-subtree`, `text-nodes-deriveds`, `purity`를 추천합니다.
2. 같은 샘플의 기대 출력이 5.0.0 이후 어떻게 바뀌었는지 확인하세요. 예를 들어 `git -C svelte log --oneline svelte@5.0.0..origin/main -- packages/svelte/tests/snapshot/samples/hello-world` 명령으로 변경 이력을 보고, `$.template`이 `$.from_html`로 바뀐 커밋을 찾아 PR 설명을 읽어 보세요. 이 작업은 5단계의 예행연습이 됩니다.
3. `{#each}` 블록 하나에 `(item.id)` key를 붙인 경우와 붙이지 않은 경우, 그리고 `{#each items as item, i}`처럼 index를 쓰는 경우의 `EACH_*` 플래그를 비교하는 예제를 직접 만들어 보세요. 플래그가 달라지는 조건을 `EachBlock.js`에서 확인하면 3단계의 `each.js` 읽기가 쉬워집니다.
