# 3단계: DOM 계층

2단계에서는 DOM 없이 signal 그래프만 다뤘습니다. 이 단계에서는 그 그래프가 실제 DOM과 어떻게 연결되는지 살펴봅니다. 핵심은 세 가지입니다. 첫째, 컴포넌트는 HTML 문자열을 한 번 파싱해 두고 복제(clone)해서 DOM을 만듭니다. 둘째, `{#if}`나 `{#each}` 같은 블록은 "block effect"와 "branch effect"로 표현되며, 각 effect는 자신이 소유한 DOM 노드의 범위(`nodes_start`~`nodes_end`)를 기억합니다. 셋째, 갱신은 effect 트리를 순회하면서 바뀐 부분만 직접 고치는 방식으로 이루어집니다.

이 단계의 핵심 관찰 도구는 `tools/mount.mjs`입니다. 컴포넌트를 jsdom에 마운트하고, 클릭 같은 조작을 할 때마다 **실제로 어떤 DOM 노드가 삽입·삭제·수정되었는지** 출력합니다. 질문의 상당수는 이 로그를 먼저 보고, 그 로그를 만들어 낸 코드를 거꾸로 찾아가는 방식으로 진행됩니다.

## 학습 목표

1. 컴파일된 컴포넌트가 `$.template`으로 DOM을 만들고 `$.append`로 문서에 넣기까지의 경로를 설명하고, 템플릿을 언제 파싱하고 몇 번 복제하는지 말할 수 있습니다.
2. anchor 노드(빈 텍스트 노드와 `<!---->` 주석)가 왜 필요한지, effect의 `nodes_start`와 `nodes_end`가 DOM 정리에 어떻게 쓰이는지 설명할 수 있습니다.
3. 한 번의 상태 변경이 어떤 순서로 DOM에 반영되는지 effect 트리 순회 순서로 설명하고, `{#if}`가 pause와 resume을 사용하는 이유를 transition과 연결해서 설명할 수 있습니다.
4. keyed `{#each}`와 unkeyed `{#each}`가 같은 배열 변경을 어떻게 다르게 처리하는지 실험 결과로 보여 주고, 5.0.0의 `reconcile` 알고리즘을 추적할 수 있습니다.
5. 이벤트 위임이 동작하는 방식과, 위임 때문에 생기는 핸들러 실행 순서 문제를 설명할 수 있습니다.

## 사전 자료

- Svelte 공식 문서의 템플릿 문법 페이지: <https://svelte.dev/docs/svelte/basic-markup>(이벤트 위임 설명이 있습니다), <https://svelte.dev/docs/svelte/if>, <https://svelte.dev/docs/svelte/each>, <https://svelte.dev/docs/svelte/await>, <https://svelte.dev/docs/svelte/transition>. 사용자 관점의 규칙을 먼저 확인하면 런타임 코드가 그 규칙을 어떻게 지키는지 비교하기 쉽습니다.
- MDN `<template>` 요소: <https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template>. `content` 프로퍼티가 돌려주는 DocumentFragment의 성질을 확인해 두세요.
- MDN `MutationObserver`: <https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver>. `tools/mount.mjs`가 DOM 변경을 기록하는 방법입니다.
- (선택) PR #12863 "chore: improve performance of DOM traversal operations": <https://github.com/sveltejs/svelte/pull/12863>. Q3.5를 푼 뒤에 읽으세요.

## 읽을 코드

모든 경로는 `svelte/packages/svelte/` 기준이며, 줄 수는 `svelte@5.0.0` 기준입니다.

| 파일 | 역할 | 줄 수 |
|---|---|---|
| `src/internal/client/render.js` | `mount`, `hydrate`, `_mount`, `unmount`, `set_text`를 정의합니다. 루트 이벤트 리스너도 여기서 붙입니다. | 약 300 |
| `src/internal/client/dom/template.js` | `template`, `text`, `comment`, `append`, `assign_nodes`를 정의합니다. 컴파일된 코드가 DOM을 만드는 입구입니다. | 약 250 |
| `src/internal/client/dom/reconciler.js` | `<template>` 요소로 HTML 문자열을 파싱합니다. | 5 |
| `src/internal/client/dom/operations.js` | `child`, `first_child`, `sibling` 등 DOM 탐색 함수와 `init_operations`를 정의합니다. | 약 180 |
| `src/internal/client/dom/hydration.js` | hydration 커서(`hydrate_node`)와 `reset`, `next`를 정의합니다. 이 단계에서는 "마운트할 때는 아무 일도 하지 않는다"는 사실만 확인합니다. | 약 100 |
| `src/internal/client/reactivity/effects.js` | 335행 이후의 `block`, `branch`, `destroy_effect`, `pause_effect`, `resume_effect`를 읽습니다. 2단계에서 읽은 앞부분과 이어집니다. | 약 620 |
| `src/internal/client/runtime.js` | `process_effects`(605행 부근)만 다시 읽습니다. 갱신 순서를 결정합니다. | 약 60 |
| `src/internal/client/dom/blocks/if.js` | `{#if}` 블록입니다. 가장 짧은 블록이므로 블록 구조를 익히기에 좋습니다. | 약 95 |
| `src/internal/client/dom/blocks/each.js` | `{#each}` 블록과 `reconcile` 알고리즘입니다. 이 단계에서 가장 어려운 파일입니다. | 약 570 |
| `src/internal/client/dom/blocks/await.js` | `{#await}` 블록입니다. 개요 수준으로 읽습니다. | 약 160 |
| `src/internal/client/dom/elements/events.js` | `delegate`, `handle_event_propagation`, `event`, `on`을 정의합니다. | 약 300 |
| `src/internal/client/dom/elements/transitions.js` | `transition`과 `animate`입니다. 167~270행만 개요 수준으로 읽습니다. | 약 420 |
| `src/compiler/phases/3-transform/client/visitors/EachBlock.js` | (참고) `{#each}`에 넘기는 flags를 계산하는 컴파일러 코드입니다. | 약 40행 분량 |

## 도구 사용법

```bash
# 컴파일 결과 보기 (작업 루트에서)
node tools/compile.mjs playground/Counter.svelte

# 마운트하고 DOM 변경 기록 보기
node tools/mount.mjs playground/Counter.svelte --script labs/03-dom/counter.steps.mjs

# -q: 마운트 단계의 삽입 로그를 생략합니다 (html 한 줄은 계속 출력됩니다)
node tools/mount.mjs playground/03-dom/KeyedList.svelte --script labs/03-dom/list.steps.mjs -q

# 로그가 길면 html 줄을 빼고 보세요
node tools/mount.mjs playground/03-dom/IfElse.svelte --script labs/03-dom/if.steps.mjs | grep -v 'html:'
```

이 단계에서 쓰는 파일은 다음과 같습니다.

| 파일 | 내용 |
|---|---|
| `playground/Counter.svelte` + `labs/03-dom/counter.steps.mjs` | 버튼을 네 번 클릭합니다. 세 번째 클릭에서 `{#if}`가 열립니다. |
| `playground/03-dom/Order.svelte` | Counter와 같지만 `{#if}`가 마크업 맨 앞에 있습니다. |
| `playground/03-dom/Shapes.svelte`, `shapes/*.svelte` | 템플릿 모양(단일 요소, 여러 요소, 텍스트만, 블록으로 시작)에 따른 컴파일 결과를 비교합니다. |
| `playground/03-dom/IfElse.svelte` + `labs/03-dom/if.steps.mjs` | `{#if}`/`{:else if}`/`{:else}`를 오갑니다. |
| `playground/03-dom/Transition.svelte` + `labs/03-dom/transition.steps.mjs` | 가짜 `element.animate`로 시간을 멈춘 채 outro 도중의 상태를 관찰합니다. |
| `playground/03-dom/KeyedList.svelte`, `UnkeyedList.svelte`, `UncontrolledList.svelte` + `labs/03-dom/list.steps.mjs` | 같은 배열 연산을 세 가지 `{#each}`에 적용하고 DOM 작업량을 비교합니다. `OPS=reverse,relabel`처럼 연산을 고를 수 있습니다. |
| `playground/03-dom/Perm.svelte` + `labs/03-dom/each-moves.steps.mjs` | 5개 항목의 모든 순열(120개)에 대해 실제 이동 횟수와 이론상 최소값을 비교합니다. `TO=E,B,C,D,A`로 하나만 볼 수 있습니다. |
| `playground/03-dom/Events.svelte` + `labs/03-dom/events.steps.mjs` | 위임된 이벤트와 직접 붙인 리스너의 실행 순서를 비교합니다. `--props '{"mode":"on"}'`로 두 번째 모드를 실행합니다. |
| `playground/03-dom/Await.svelte` + `labs/03-dom/await.steps.mjs` | 외부에서 promise를 resolve/reject하면서 `{#await}`의 상태 전환을 관찰합니다. |
| `labs/03-dom/_stats.mjs` | steps 스크립트에서 쓰는 헬퍼입니다. 단계마다 MutationRecord 수와 노드 재사용 여부를 요약합니다. |

로그를 읽을 때 알아 둘 점이 있습니다.

- `insert`/`remove` 줄은 노드 하나당 한 줄입니다. 여러 노드가 한 번의 DOM 연산(하나의 MutationRecord)으로 들어갔더라도 줄은 여러 개로 나옵니다. 연산 횟수가 궁금하면 `[stats]` 줄의 `records` 값을 보세요.
- 노드를 "이동"하면 `remove`와 `insert`가 한 쌍으로 기록됩니다.
- steps 스크립트 안에서 `console.log`로 출력한 줄은 해당 단계의 `──` 제목보다 **위에** 나타납니다. 도구가 단계를 실행한 뒤에 제목과 변경 로그를 출력하기 때문입니다.
- `tools/mount.mjs`는 단계가 끝날 때마다 `flushSync()`를 호출합니다. 브라우저에서는 effect가 microtask에서 실행되므로, 타이밍이 중요한 질문(Q3.20)에서는 이 차이를 의식해야 합니다.

런타임 코드에 `console.log`를 넣으면 실험 출력에 바로 나타납니다. 실험이 끝나면 `git -C svelte checkout -- packages/svelte/src`로 되돌리세요.

**[예측] 질문은 반드시 도구를 실행하기 전에 노트에 예측을 먼저 적으세요.**

## 질문

### 3-A. 마운트와 템플릿 복제

**Q3.1** [관찰] `node tools/mount.mjs playground/Counter.svelte --script labs/03-dom/counter.steps.mjs`를 실행하세요. mount 로그의 첫 줄은 빈 텍스트 노드 `""`의 삽입이고, unmount 로그의 마지막 줄은 같은 노드의 제거입니다. 이 노드는 어디에서 만들어지며 어떤 역할을 합니까? 또한 컴포넌트의 다른 노드가 모두 제거된 **뒤에** 이 노드가 제거되는 이유를 코드 순서로 설명하세요.

<details><summary>힌트 1</summary><code>render.js</code>의 <code>_mount</code>에서 <code>effect_root</code>에 넘기는 함수를 읽고, <code>template.js</code>의 <code>append</code>가 노드를 어디에 넣는지 확인하세요.</details>
<details><summary>힌트 2</summary><code>effect_root</code>에 넘긴 함수가 무엇을 반환하는지 보세요. 그다음 <code>effects.js</code>의 <code>destroy_effect</code>에서 자식 effect 파괴와 teardown 실행 중 무엇이 먼저 일어나는지 보세요.</details>

**Q3.2** [추적] `node tools/compile.mjs playground/Counter.svelte`의 출력에서 `var root = $.template(...)`은 컴포넌트 함수 **바깥**(모듈 최상단)에 있습니다. `template.js`의 `template` 함수를 읽고 다음에 답하세요.
- HTML 문자열은 정확히 언제 파싱됩니까? 같은 컴포넌트를 100번 마운트하면 몇 번 파싱됩니까?
- 파싱에 `<div>`의 `innerHTML`이 아니라 `<template>` 요소를 쓰는 이유는 무엇입니까? (`<tr>`만 들어 있는 템플릿이나 `<img src>`가 들어 있는 템플릿을 생각해 보세요.)
- 복제할 때 기본적으로 `cloneNode`를 쓰지만 `TEMPLATE_USE_IMPORT_NODE` 플래그가 있으면 `document.importNode`를 씁니다. 컴파일러는 어떤 경우에 이 플래그를 붙입니까?

<details><summary>힌트 1</summary><code>template.js</code>의 27~65행과 <code>reconciler.js</code> 전체를 보세요. 세 번째 질문은 컴파일러의 <code>RegularElement.js</code>에서 <code>template_needs_import_node</code>를 검색하세요.</details>
<details><summary>힌트 2</summary><code>node</code> 변수가 어느 스코프에 선언되어 있고 언제 채워지는지 보세요. 모듈을 import하는 시점에 DOM이 없을 수도 있는 환경(SSR, 테스트)을 생각해 보세요.</details>

**Q3.3** [예측] `playground/03-dom/shapes/` 아래의 네 컴포넌트(`Single`, `Fragment`, `TextOnly`, `BlockFirst`)를 컴파일하기 **전에**, 각각에 대해 다음을 예측하세요. (1) `$.template` 호출이 있는가, (2) 있다면 두 번째 인자 `1`이 붙는가, (3) `$.append`의 두 번째 인자는 요소 하나인가 fragment인가. 그다음 `node tools/compile.mjs playground/03-dom/shapes/<이름>.svelte`로 확인하고, `TEMPLATE_FRAGMENT` 플래그에 따라 `template()` 안에서 달라지는 동작(특히 `assign_nodes`에 넘기는 인자)을 설명하세요.

<details><summary>힌트 1</summary><code>constants.js</code>(<code>src/constants.js</code>)의 <code>TEMPLATE_FRAGMENT</code>와 <code>template.js</code>의 <code>is_fragment</code> 분기, 그리고 <code>text()</code> 함수를 보세요.</details>
<details><summary>힌트 2</summary>루트가 요소 하나일 때와 여러 개일 때, effect가 기억해야 하는 "시작 노드"와 "끝 노드"는 각각 무엇입니까?</details>

**Q3.4** [추적] 컴파일 결과의 템플릿 문자열에는 `<button> </button>`처럼 공백 하나가 들어간 부분이 있고, 코드에는 `$.reset(button)`과 `$.next()` 같은 호출이 있습니다.
- 공백 하나는 무엇을 위한 자리입니까? 공백이 없다면 런타임은 동적 텍스트를 넣기 위해 무엇을 추가로 해야 합니까?
- `$.reset`과 `$.next`는 일반 마운트에서 무슨 일을 합니까? 그런데도 컴파일러가 이 호출을 생성하는 이유는 무엇입니까?

<details><summary>힌트 1</summary><code>operations.js</code>의 <code>child</code>, <code>render.js</code>의 <code>set_text</code>, <code>hydration.js</code>의 <code>reset</code>과 <code>next</code>를 보세요.</details>
<details><summary>힌트 2</summary>각 함수의 첫 줄에 있는 조건문을 보세요. 같은 컴파일 결과가 "새로 만들기"와 "서버가 만든 DOM 재사용하기" 두 경우에 모두 쓰인다는 점을 생각해 보세요.</details>

**Q3.5** [설명] `operations.js`의 `init_operations`는 두 가지 일을 합니다. `Node.prototype`에서 `firstChild`와 `nextSibling`의 getter를 꺼내 보관해 두고, `Element.prototype`에 `__click`, `__className` 등을, `Text.prototype`에 `__t`를 미리 정의합니다. 그리고 `set_text`는 `nodeValue`를 읽는 대신 `__t`와 비교합니다. 이 세 가지 최적화가 각각 어떤 비용을 줄이려는 것인지 설명하세요. 특히 `__click`을 프로토타입에 `undefined`로 미리 정의하는 것이 `handle_event_propagation`의 어떤 줄과 관련이 있는지 연결하세요.

<details><summary>힌트 1</summary><code>operations.js</code> 23~86행, <code>render.js</code> 50~59행, <code>events.js</code>의 <code>handle_event_propagation</code>에서 <code>'__' + event_name</code>을 읽는 줄을 보세요.</details>
<details><summary>힌트 2</summary>DOM 프로퍼티 접근은 JS 객체 프로퍼티 접근보다 비쌉니다. 또한 객체에 없는 프로퍼티를 읽으면 JS 엔진은 프로토타입 체인 끝까지 찾아 올라갑니다. <code>HTMLButtonElement</code>의 프로토타입 체인이 몇 단계인지 세어 보세요.</details>

### 3-B. 블록의 경계와 갱신 순서

**Q3.6** [관찰] `node tools/mount.mjs playground/03-dom/Shapes.svelte`의 html 줄을 보면 `BlockFirst`에 해당하는 부분이 `<!----><span>shown</span><!----> <p>after the block</p>`입니다. `{#if}`는 하나뿐인데 주석은 두 개입니다. 각 주석의 역할을 구분하고, `template.js`의 `has_start` 변수와 `operations.js`의 `first_child`가 빈 주석을 건너뛰는 코드(122행)가 이 현상과 어떻게 맞물리는지 설명하세요.

<details><summary>힌트 1</summary>컴파일된 <code>BlockFirst</code>의 템플릿 문자열은 <code>&lt;!&gt;</code>로 시작합니다. <code>template()</code>이 이런 문자열을 받으면 무엇을 덧붙입니까?</details>
<details><summary>힌트 2</summary><code>{#if}</code>의 내용은 anchor 주석의 앞과 뒤 중 어디에 삽입됩니까? 만약 anchor 주석 자체가 컴포넌트의 <code>nodes_start</code>였다면, <code>{#if}</code> 내용은 범위 안과 밖 중 어디에 놓이게 됩니까?</details>

**Q3.7** [추적] effect는 자신이 만든 DOM 범위를 `nodes_start`와 `nodes_end`로 기억합니다. `template.js`의 `assign_nodes`와 `effects.js`의 `destroy_effect`(419~488행)를 읽고 답하세요.
- `assign_nodes`는 왜 `nodes_start`가 `null`일 때만 값을 씁니까? 하나의 branch 안에서 `root()`와 `root_1()`처럼 템플릿을 여러 번 호출하는 상황을 생각해 보세요.
- Counter를 unmount할 때 `<p class="warn">`은 `{#if}`의 branch effect가 소유한 노드인데도, 로그에서는 컴포넌트의 다른 노드와 같은 방식으로 한 번만 제거됩니다. 자식 effect가 자기 노드를 다시 제거하려고 하지 않는 이유를 `destroy_effect`의 `removed` 변수로 설명하세요.

<details><summary>힌트 1</summary><code>destroy_effect</code>가 <code>destroy_effect_children</code>를 호출할 때 넘기는 두 번째 인자를 보세요.</details>
<details><summary>힌트 2</summary>부모의 <code>nodes_start</code>~<code>nodes_end</code> 범위는 자식 블록의 노드를 모두 포함합니까? 모든 삽입이 "anchor 앞에 넣기"로 이루어진다는 점이 이 성질을 어떻게 보장합니까?</details>

**Q3.8** [관찰] Q3.1에서 실행한 로그의 `click #3`을 보세요. 마크업에서 `{#if}`는 버튼과 `<p>double</p>`보다 **뒤에** 있는데, `<p class="warn">` 삽입이 두 텍스트 갱신보다 **먼저** 기록되었습니다. 이 순서를 만드는 두 가지 요인을 찾으세요. 하나는 컴파일러가 코드를 배치하는 순서이고, 다른 하나는 런타임이 effect를 실행하는 순서입니다.

<details><summary>힌트 1</summary>컴파일 결과에서 <code>$.if(...)</code>와 <code>$.template_effect(...)</code>의 위치를 비교하세요. 컴파일러 쪽 근거는 <code>Fragment.js</code>의 185~196행에 있습니다.</details>
<details><summary>힌트 2</summary><code>effects.js</code>의 <code>push_effect</code>는 자식 effect를 어떤 순서로 연결합니까? <code>runtime.js</code>의 <code>process_effects</code>는 그 연결 리스트를 어떤 순서로 순회하고, render effect를 언제 실행합니까?</details>

**Q3.9** [예측] `playground/03-dom/Order.svelte`는 Counter와 같지만 `{#if}`가 마크업 맨 앞에 있습니다. `click #3`에서 기록될 DOM 변경의 순서를 예측한 뒤 `node tools/mount.mjs playground/03-dom/Order.svelte --script labs/03-dom/counter.steps.mjs`로 확인하세요. 그다음, 텍스트 갱신이 `{#if}` 삽입보다 먼저 일어나게 하려면 마크업을 어떻게 바꿔야 하는지 하나 이상 제안하고 직접 확인하세요.

<details><summary>힌트 1</summary>Q3.8에서 찾은 두 요인 중 마크업 순서에 영향을 받는 것은 무엇입니까?</details>
<details><summary>힌트 2</summary>텍스트 갱신을 별도의 effect로 만들되, 그 effect가 <code>$.if</code>보다 먼저 생성되게 하려면 텍스트가 어디에 있어야 할까요? 컴포넌트나 블록으로 감싸는 방법을 생각해 보세요.</details>

**Q3.10** [예측] `labs/03-dom/if.steps.mjs`의 단계를 읽고, 실행하기 전에 각 단계에서 일어날 DOM 변경을 예측하세요. 특히 `n: 1 → 2`, `n: -1 → -2`, 그리고 `n: 1 → 0` 이후 `<p class="zero">`가 처음 마운트할 때와 같은 요소인지 예측하세요. 실행한 뒤에는 다음을 설명하세요.
- `n: -1 → -2`에서 DOM 변경이 하나도 없는 이유를 `if.js`의 한 줄로 설명하세요.
- `{:else if}`는 컴파일 결과에서 어떻게 표현됩니까? `$.if`의 다섯 번째 인자 `true`는 effect에 어떤 플래그를 붙이고, 그 플래그는 무엇을 위해 존재합니까?
- `{:else}` 쪽 branch를 위해 `$.comment()`가 만드는 노드 두 개는 무엇입니까? 마운트 로그에서 찾아보세요.

<details><summary>힌트 1</summary><code>if.js</code> 41행, <code>if.js</code>의 <code>elseif</code> 매개변수 주석(19행), <code>template.js</code>의 <code>comment()</code>를 보세요.</details>
<details><summary>힌트 2</summary><code>EFFECT_TRANSPARENT</code>를 검사하는 곳을 <code>effects.js</code>와 <code>transitions.js</code>에서 찾아보세요. transition이 "local"이라는 것은 어떤 블록의 변경에만 반응한다는 뜻입니까?</details>

**Q3.11** [실험] `node tools/mount.mjs playground/03-dom/Transition.svelte --script labs/03-dom/transition.steps.mjs -q`를 실행하세요. 이 스크립트는 가짜 `element.animate`를 설치해서 animation이 `finish_all()`을 호출할 때만 끝나게 만듭니다. 로그를 보고 답하세요.
- outro가 시작된 뒤에도 `<p>`가 DOM에 남아 있고 `inert`가 `true`입니다. `pause_effect`가 effect를 바로 파괴하지 않고 무엇을 기다립니까? transition이 없을 때(Q3.10의 IfElse)는 왜 즉시 제거되었습니까?
- outro 도중에 `count++`를 했는데 텍스트가 바뀌지 않았습니다. 그런데 다시 보여 주자 같은 `<p>`가 재사용되면서 텍스트가 `count: 1`로 바뀌었습니다. 갱신이 멈춘 이유와 나중에 반영된 이유를 각각 코드 위치로 설명하세요.
- `if.js`는 새 branch를 만든 **다음에** 기존 branch를 pause합니다(Q3.10의 로그에서도 `insert`가 `remove`보다 먼저 나옵니다). 순서가 반대였다면 transition에서 어떤 문제가 생깁니까?

<details><summary>힌트 1</summary><code>effects.js</code>의 <code>pause_effect</code>, <code>run_out_transitions</code>, <code>pause_children</code>, <code>resume_children</code>(518~618행)와 <code>runtime.js</code>에서 <code>INERT</code>를 검사하는 두 곳을 보세요.</details>
<details><summary>힌트 2</summary><code>resume_children</code>가 <code>INERT</code>를 끈 직후에 무엇을 확인합니까? 그리고 intro와 outro가 동시에 진행되는 화면을 상상해 보세요.</details>

### 3-C. `{#each}`와 reconcile

**Q3.12** [관찰] `KeyedList`와 `UnkeyedList`를 각각 `list.steps.mjs`로 실행하고(`-q` 권장), `prepend`, `remove_first`, `reverse`, `relabel` 네 단계의 `[stats]`와 `[nodes]` 줄을 표로 정리하세요. 어느 쪽이 어떤 연산에서 유리합니까? 그리고 두 컴포넌트의 컴파일 결과에서 `$.each`의 두 번째 인자(flags)와 네 번째 인자(key 함수)를 비교하고, `src/constants.js`의 `EACH_*` 상수로 flags 값을 해석하세요.

<details><summary>힌트 1</summary>unkeyed 블록의 key 함수 <code>$.index</code>는 <code>each.js</code> 56행에 있습니다. key가 index라면 <code>reconcile</code> 입장에서 "같은 항목"은 무엇을 뜻합니까?</details>
<details><summary>힌트 2</summary>flags 계산은 컴파일러의 <code>EachBlock.js</code> 44~98행에 있습니다. <code>21 = 16 + 4 + 1</code>처럼 비트로 분해해 보세요.</details>

**Q3.13** [예측] keyed 블록에서 `[A, B, C, D, E]`를 아래 순서로 바꿀 때 Svelte가 몇 개의 노드를 이동할지 예측하세요. 그다음 `TO=E,B,C,D,A node tools/mount.mjs playground/03-dom/Perm.svelte --script labs/03-dom/each-moves.steps.mjs -q`처럼 하나씩 확인하세요.
- `E,B,C,D,A` (양 끝 교환)
- `B,C,D,E,A` (맨 앞을 맨 뒤로)
- `E,A,B,C,D` (맨 뒤를 맨 앞으로)
- `E,D,C,B,A` (뒤집기)

<details><summary>힌트 1</summary>각 경우에서 "움직이지 않아도 되는" 항목이 최대 몇 개인지 먼저 세어 보세요. 그 수를 뺀 값이 이론상 최소 이동 횟수입니다.</details>
<details><summary>힌트 2</summary>예측이 틀렸다면 Q3.14에서 그 순열을 직접 추적하세요.</details>

**Q3.14** [추적] `each.js`의 `reconcile`(254~455행)을 `[A, B, C, D, E] → [E, B, C, D, A]`에 대해 손으로 추적하세요. 반복마다 `i`, `current`, `prev`, `matched`, `stashed`, `seen`의 값을 표로 적고, `move`가 호출되는 시점을 표시하세요. 그다음 두 분기("later items를 앞으로", "earlier item을 뒤로")가 각각 어떤 상황을 위한 것인지 한 문장씩 설명하세요.

<details><summary>힌트 1</summary><code>item !== current</code>인데 <code>seen</code>에 들어 있지 않은 경우와 들어 있는 경우가 다르게 처리됩니다. 처음 E를 만났을 때 A~D는 어디로 갑니까?</details>
<details><summary>힌트 2</summary>346행의 <code>matched.length &lt; stashed.length</code> 비교는 "어느 쪽 묶음을 옮기는 것이 더 적은 이동인가"를 판단합니다. <code>i -= 1</code>로 같은 인덱스를 다시 처리한다는 점도 놓치지 마세요.</details>

**Q3.15** [실험] `node tools/mount.mjs playground/03-dom/Perm.svelte --script labs/03-dom/each-moves.steps.mjs -q`를 실행하면 120개 순열 전체에 대해 Svelte의 이동 횟수와 이론상 최소값(전체 개수에서 최장 증가 부분 수열(LIS) 길이를 뺀 값)을 비교합니다.
- 최소값보다 많이 이동한 순열을 하나 골라 Q3.14처럼 추적하고, 어느 판단에서 손해를 봤는지 설명하세요.
- 5.0.0의 `reconcile`에는 LIS 계산이 없습니다. LIS를 계산하는 방식과 비교했을 때, 이 휴리스틱이 얻는 것과 잃는 것은 무엇입니까? 실제 애플리케이션에서 흔한 리스트 변경(끝에 추가, 하나 삭제, 하나 이동)을 기준으로 생각해 보세요.
- (선택) `START`를 6~7개로 늘려서 다시 실행해 보세요. 최적이 아닌 비율은 어떻게 변합니까?

<details><summary>힌트 1</summary>LIS를 구하려면 매 reconcile마다 무엇을 추가로 만들고 계산해야 하는지 생각해 보세요. 반대로 이 휴리스틱은 몇 번의 순회로 끝납니까?</details>
<details><summary>힌트 2</summary>"이동 횟수"와 "알고리즘 자체의 비용"은 다른 축입니다. DOM 이동 한 번의 비용과 JS 연산의 비용을 함께 놓고 판단하세요.</details>

**Q3.16** [설명] 다음 세 가지 관찰을 코드로 설명하세요.
- `relabel`(같은 id, 새 객체)에서 keyed 블록은 노드를 하나도 새로 만들지 않고 텍스트만 바꿨습니다. 항목 값이 바뀌었다는 사실은 어떤 경로로 해당 `<li>`의 `template_effect`까지 전달됩니까? 컴파일러가 `EACH_ITEM_REACTIVE`를 **붙이지 않는** 경우는 언제이며, 그때는 왜 괜찮습니까?
- `clear`에서 `KeyedList`는 `records 2`였고 `UncontrolledList`는 `records 5`였습니다(`OPS=clear`로 확인하세요). "controlled" 블록이란 무엇이고, 어떤 빠른 경로를 사용합니까?
- `create_item`은 `branch(..., hydrating)`으로 effect를 만들기 때문에, 마운트할 때는 항목 effect가 부모의 자식 리스트에 자동으로 연결되지 않습니다. 대신 `reconcile`의 마지막 두 줄과 `link` 함수가 무엇을 직접 관리합니까? 왜 그렇게 해야 합니까?

<details><summary>힌트 1</summary><code>each.js</code>의 <code>update_item</code>, <code>create_item</code>, <code>pause_effects</code>, <code>reconcile</code>의 428행과 453~454행을 보세요. 컴파일러 쪽은 <code>EachBlock.js</code>의 <code>key_is_item</code>입니다.</details>
<details><summary>힌트 2</summary>effect 트리의 자식 순서는 Q3.8에서 본 것처럼 갱신 순서와 파괴 순서를 결정합니다. 항목이 이동하면 effect 리스트의 순서는 어떻게 되어야 합니까?</details>

### 3-D. 이벤트 위임과 `{#await}`

**Q3.17** [관찰] `node tools/compile.mjs playground/03-dom/Events.svelte`와 `node tools/mount.mjs playground/03-dom/Events.svelte --script labs/03-dom/events.steps.mjs -q`를 실행하세요. 첫 단계는 각 요소가 가진 `__` 프로퍼티를 출력합니다.
- `button.hoisted`의 `__click`은 `[on_click, count]` 배열이고, `button.item`의 `__click`은 함수 그 자체입니다. 컴파일러는 어떤 기준으로 핸들러를 모듈 최상단으로 끌어올립니까(hoist)? 배열 형태는 런타임에서 어떻게 호출됩니까?
- `input.field`의 `onfocus`는 `__focus` 프로퍼티가 아니라 `$.event(...)`로 컴파일되었습니다. 왜 위임하지 않습니까?

<details><summary>힌트 1</summary>컴파일러의 <code>2-analyze/visitors/Attribute.js</code>에 있는 <code>get_delegated_event</code>(72행 이후)와 <code>src/utils.js</code>의 <code>DELEGATED_EVENTS</code>를 보세요.</details>
<details><summary>힌트 2</summary>hoist된 함수는 컴포넌트 인스턴스의 지역 변수를 클로저로 잡을 수 없습니다. 그렇다면 <code>count</code>는 어떻게 전달됩니까? 그리고 <code>focus</code> 이벤트는 bubbling합니까?</details>

**Q3.18** [추적] `button.plain`을 클릭했을 때 `plain button` 핸들러와 `outer <section>` 핸들러가 호출되기까지의 경로를 추적하세요.
- 실제 `addEventListener`는 어느 요소에 붙어 있습니까? `_mount`가 리스너를 **두 곳**에 붙이는 이유를 주석에서 찾으세요.
- `$.delegate(["click"])`는 모듈 최상단에서 한 번 실행됩니다. 이 컴포넌트 모듈이 import되기 **전에** 이미 마운트된 다른 앱이 있다면, 그 앱의 루트에도 `click` 리스너가 붙습니까? 어떤 자료구조가 이것을 가능하게 합니까?
- `handle_event_propagation`은 `event.target`부터 위로 올라가며 `__click`을 찾습니다. 이 과정에서 `event.currentTarget`을 어떻게 흉내 내고, 언제 멈춥니까?

<details><summary>힌트 1</summary><code>render.js</code> 188~222행과 <code>events.js</code>의 <code>delegate</code>, <code>all_registered_events</code>, <code>root_event_handles</code>, <code>handle_event_propagation</code>을 보세요.</details>
<details><summary>힌트 2</summary>멈추는 조건은 236행에 세 가지가 있습니다. 그중 하나는 <code>stopPropagation()</code>과 관련이 있습니다.</details>

**Q3.19** [실험] 같은 steps 스크립트를 `--props '{"mode":"on"}'`로 다시 실행하고, 두 모드에서 `button.plain`과 `button.stop`을 클릭했을 때의 출력 순서를 비교하세요.
- 기본 모드(`addEventListener`)에서는 `wrapper <div>` 리스너가 안쪽 버튼의 핸들러보다 **먼저** 실행되고, `stop` 버튼이 `stopPropagation()`을 호출했는데도 실행됩니다. 위임 구조로 이 현상을 설명하세요.
- `svelte/events`의 `on`을 쓰면 두 문제가 모두 사라집니다. `events.js`의 `create_event`가 어떤 일을 먼저 해서 순서를 바로잡습니까?
- 이 문제를 피하려면 라이브러리 사용자는 무엇을 알아야 합니까? 이 비용을 감수하고도 위임을 기본값으로 택한 이유를 추측해 보세요.

<details><summary>힌트 1</summary>위임된 핸들러는 이벤트가 어디까지 올라갔을 때 실행됩니까? 그 전에 이벤트가 지나가는 요소에 직접 붙은 리스너는 언제 실행됩니까?</details>
<details><summary>힌트 2</summary><code>create_event</code>의 <code>target_handler</code>에서 <code>handle_event_propagation.call(dom, event)</code>를 호출한 뒤 <code>event.cancelBubble</code>을 확인하는 부분을 보세요. Q3.18에서 본 <code>event.__root</code>가 같은 이벤트를 두 번 처리하지 않게 하는 방식도 함께 보세요.</details>

**Q3.20** [예측] `labs/03-dom/await.steps.mjs`를 읽고, 실행하기 전에 두 단계를 예측하세요. (1) `already-resolved promise (natural timing)`: 이미 resolve된 promise를 넣을 때 `pending…`이 잠깐이라도 DOM에 들어갔다가 빠지는가? (2) `already-resolved promise again (flushSync timing: no settle)`: 같은 일을 하되 microtask를 기다리지 않고 바로 `flushSync()`가 호출될 때는 어떤가? 실행한 뒤에는 `await.js`의 142~146행과 `runtime.js`의 `flush_sync`가 `flush_tasks`를 호출한다는 사실로 두 결과의 차이를 설명하세요. 마지막으로 `non-promise value` 단계에서 `then` branch가 새로 만들어지지 않고 텍스트만 바뀐 이유도 설명하세요.

<details><summary>힌트 1</summary><code>promise.then(...)</code>을 등록하는 시점과 <code>queue_micro_task</code>를 호출하는 시점 중 무엇이 먼저입니까? 이미 resolve된 promise의 then 콜백은 언제 microtask 큐에 들어갑니까?</details>
<details><summary>힌트 2</summary><code>dom/task.js</code>의 <code>flush_tasks</code>는 queue에 쌓인 작업을 microtask를 기다리지 않고 바로 실행합니다. 마지막 질문은 <code>update(THEN, false)</code>에서 <code>then_effect</code>가 이미 있을 때 무엇을 하는지 보세요.</details>

## 체크포인트

코드를 보지 않고 다음을 설명할 수 있으면 이 단계를 마친 것입니다.

1. `$.template`으로 만든 함수를 처음 호출할 때와 두 번째 호출할 때 각각 일어나는 일, 그리고 그 결과가 `$.append`로 문서에 들어가기까지의 과정을 설명할 수 있습니다.
2. 블록의 내용이 항상 자기 anchor **앞**에 삽입된다는 규칙과 `nodes_start`/`nodes_end`가 합쳐져서, effect 하나를 파괴하면 그 블록의 DOM이 정확히 제거되는 이유를 설명할 수 있습니다.
3. 상태 하나가 바뀌었을 때 effect 트리 순회 순서에 따라 DOM이 갱신되는 순서를 예측할 수 있고, paused(`INERT`) effect가 그 순회에서 어떻게 취급되는지 말할 수 있습니다.
4. keyed와 unkeyed `{#each}`의 차이를 "무엇을 같은 항목으로 보는가"라는 관점에서 설명하고, `reconcile`이 노드를 옮기는 두 가지 전략을 말할 수 있습니다.
5. 이벤트 위임의 장점과, 직접 붙인 리스너와 섞어 쓸 때 생기는 순서 문제를 예시와 함께 설명할 수 있습니다.

## 더 나아가기

1. **hydration 맛보기**: `node tools/compile.mjs playground/Counter.svelte --server`로 서버 출력을 보고, `<!--[-->`, `<!--]-->` 같은 주석이 어디에 들어가는지 확인하세요. 그다음 `render.js`의 `hydrate`(112~170행)와 `hydration.js`를 읽고, Q3.4에서 본 `$.reset`과 `$.next`가 hydration 모드에서 커서(`hydrate_node`)를 어떻게 옮기는지 정리하세요. `if.js`의 `mismatch` 처리도 함께 읽어 보세요.
2. **unkeyed 블록의 함정**: `UnkeyedList.svelte`의 `<li>`를 `<li><input value={item.label} /></li>`로 바꾸고, steps 스크립트에서 첫 번째 input의 `value`를 직접 바꾼 뒤 `remove_first`를 실행하는 실험을 만들어 보세요. 사용자가 입력한 값은 어느 항목을 따라갑니까? keyed 블록에서는 어떻게 됩니까?
3. **최신 버전과 비교**: `git -C svelte show main:packages/svelte/src/internal/client/dom/blocks/each.js`로 최신 `each.js`를 열고 5.0.0과 비교하세요. `reconcile`의 전략이나 effect 연결 방식이 바뀌었다면, `git -C svelte log --oneline svelte@5.0.0..main -- packages/svelte/src/internal/client/dom/blocks/each.js`로 관련 PR을 찾아 변경 이유를 정리하세요.
