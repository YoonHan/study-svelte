# 3단계 정답 기준: DOM 계층

> 스포일러: 학습자는 열람하지 않는 것을 권장합니다.

튜터용 채점 기준입니다. 경로는 모두 `svelte/packages/svelte/` 기준이고 줄 번호는 `svelte@5.0.0` 기준입니다. 실험 결과는 이 파일을 작성할 때 실제로 실행해서 확인한 값입니다. 학습자의 답이 핵심 포인트를 다른 말로 표현했다면 정답으로 인정하고, 빠진 포인트는 후속 질문으로 유도하세요.

---

## Q3.1 마운트 anchor `""`와 unmount 순서

- `_mount`가 `effect_root` 안에서 `anchor ?? target.appendChild(create_text())`로 빈 텍스트 노드를 만들어 target 끝에 붙입니다. (`src/internal/client/render.js:229`)
- 컴포넌트 함수는 이 노드를 `$$anchor`로 받습니다(`render.js:249`). `$.append`는 `anchor.before(dom)`이므로(`src/internal/client/dom/template.js:239-252`, 특히 251행) 컴포넌트 내용은 항상 이 anchor **앞**에 들어갑니다. 즉 "어디에 넣을지"를 표시하는 위치 표식입니다. 그 결과 target에 이미 있던 내용 뒤에 이어 붙일 수 있고, 사용자가 `options.anchor`를 주면 그 노드를 대신 씁니다.
- 제거 순서: `effect_root`에 넘긴 함수는 정리 함수(teardown)를 반환합니다(`render.js:261-280`). anchor 제거는 이 teardown 안에 있습니다(`render.js:277-279`). `destroy_effect`는 DOM 제거 → 자식 effect 파괴(`effects.js:452`) → teardown 실행(`effects.js:464`) 순서이므로, 자식 branch가 컴포넌트 노드를 먼저 지우고 마지막에 teardown이 anchor를 지웁니다. root effect 자체는 `nodes_start`가 없어서(422행 조건 불충족) DOM 제거를 자식에게 위임합니다.
- (보너스) teardown은 같은 자리에서 루트 이벤트 리스너도 해제합니다(`render.js:262-275`).

## Q3.2 템플릿 파싱 시점, `<template>`, importNode

- `template(content, flags)`는 모듈 평가 시점에 클로저만 만들고, HTML은 반환된 함수를 **처음 호출할 때** 파싱합니다(`template.js:46-49`). 결과는 클로저 변수 `node`에 캐시되고, 이후에는 `cloneNode(true)`만 합니다(51-53행). 100번 마운트해도 파싱은 1번입니다.
- 지연 파싱 이유: 모듈을 import할 때 DOM이 없는 환경(SSR, 테스트)에서도 안전하고, 한 번도 렌더링되지 않는 블록의 템플릿은 파싱 비용을 치르지 않습니다. `/*#__NO_SIDE_EFFECTS__*/` 주석(26행) 덕분에 쓰이지 않는 템플릿은 번들러가 tree-shaking할 수 있습니다.
- `create_fragment_from_html`은 `<template>`의 `innerHTML`을 쓰고 `content`(DocumentFragment)를 반환합니다(`src/internal/client/dom/reconciler.js:2-5`). `<template>`은 어떤 요소든 문맥 제약 없이 파싱할 수 있고(`<tr>`, `<td>`, `<option>` 등이 `<div>` 안에서는 버려지거나 재배치됨), 내용이 inert라서 파싱 시점에 이미지 요청이나 스크립트 실행 같은 부수 효과가 일어나지 않습니다.
- `TEMPLATE_USE_IMPORT_NODE`: 템플릿에 custom element가 있을 때 컴파일러가 붙입니다(`src/compiler/phases/3-transform/client/visitors/RegularElement.js:64-70`, 플래그 부착은 `visitors/Fragment.js:121-122`, `170-171`). 주석에 따르면 `cloneNode`는 연결되지 않은 상태에서 custom element 클래스를 인스턴스화(upgrade)하지 않아서 프로퍼티 설정이 문제를 일으키므로 `importNode`를 씁니다.

## Q3.3 템플릿 모양별 컴파일 결과

실측 결과:

| 컴포넌트 | `$.template` | 두 번째 인자 | `$.append` 대상 |
|---|---|---|---|
| `Single` (`<h1>hello {name}</h1>`) | 있음, `` `<h1> </h1>` `` | 없음 | 요소(`h1`) |
| `Fragment` (`<h1>` + `<p>`) | 있음, `` `<h1>hello</h1> <p> </p>` `` | `1` | fragment |
| `TextOnly` (`hello {name}`) | 없음, 대신 `$.text()` | 해당 없음 | 텍스트 노드 |
| `BlockFirst` (`{#if}` + `<p>`) | 있음, `` `<!> <p>after the block</p>` `` | `1` | fragment |

- `TEMPLATE_FRAGMENT = 1`(`src/constants.js:18`). 플래그가 없으면 파싱한 fragment의 첫 자식 요소 하나만 템플릿으로 보관합니다(`template.js:48`).
- `assign_nodes`: fragment면 `(첫 자식, 마지막 자식)`(`template.js:55-59`), 단일 요소면 `(clone, clone)`(60-62행)입니다. 텍스트만 있으면 `text()`가 `create_text`로 노드를 만들고 `(t, t)`를 지정합니다(`template.js:197-202`).
- 핵심 이해: 현재 effect가 "자기 DOM 범위"를 기록하는 방식이 템플릿 모양에 따라 달라질 뿐, 목적은 같습니다.

## Q3.4 공백 placeholder와 `$.reset`/`$.next`

- `<button> </button>`의 공백은 동적 텍스트를 담을 Text 노드를 템플릿에 미리 넣어 두는 자리입니다. 복제하면 Text 노드가 이미 있으므로 `$.child(button)`으로 얻은 노드의 `nodeValue`만 바꾸면 됩니다(`set_text`, `render.js:50-59`). 공백이 없다면 매 인스턴스마다 `createTextNode`와 삽입이 추가로 필요합니다.
- `$.reset`은 `if (!hydrating) return;`(`src/internal/client/dom/hydration.js:47-48`), `$.next`는 `if (hydrating) {...}`(69-80행)이므로 일반 마운트에서는 아무 일도 하지 않습니다. `child`/`sibling`도 hydrating이 아닐 때는 단순 탐색만 합니다(`dom/operations.js:94-97`, `147-155`).
- 이유: 같은 컴파일 결과가 `mount`(새로 만들기)와 `hydrate`(서버 HTML 재사용)에 모두 쓰입니다. hydration 중에는 `hydrate_node` 커서를 요소 안으로 들어갔다가(`child`) 다시 부모로 되돌려야(`reset`) 하므로 컴파일러가 이 호출을 항상 생성합니다. `hydrating` 변수는 `hydrate`를 쓰지 않으면 tree-shaking되도록 설계되어 있습니다(`hydration.js:12-16` 주석).

## Q3.5 DOM 접근 최적화

- getter 캐싱: `Node.prototype`의 `firstChild`/`nextSibling` getter를 꺼내 `.call(node)`로 호출합니다(`operations.js:35-37`, `74-86`). `node.firstChild`처럼 접근하면 엔진이 매번 다양한 노드 타입(HTMLDivElement, Text, Comment...)의 프로토타입 체인을 따라 getter를 찾아야 해서 inline cache가 다형적(megamorphic)이 됩니다. getter 함수를 직접 호출하면 이 탐색이 사라집니다. 도입 PR은 #12863(`72c51e3df`, 2024-08-15)입니다.
- 프로토타입 기본값: `Element.prototype.__click = undefined` 등(`operations.js:41-50`). `handle_event_propagation`은 이벤트 경로의 모든 조상에서 `current_target['__' + event_name]`을 읽습니다(`events.js:219`). 대부분의 요소에는 이 프로퍼티가 없으므로, 기본값이 없으면 매번 "없는 프로퍼티" 조회가 긴 DOM 프로토타입 체인(HTMLButtonElement → HTMLElement → Element → Node → EventTarget → Object) 끝까지 올라갑니다. 기본값을 두면 조회가 일찍 끝나고 객체 모양(shape)이 안정됩니다.
- `__t` 캐시: `set_text`는 마지막으로 쓴 문자열을 JS 프로퍼티 `__t`에 보관하고 그것과 비교합니다(`render.js:54-58`, 기본값은 `operations.js:50`). `nodeValue`를 읽는 것은 DOM 바인딩을 거치는 비싼 연산이므로, 값이 같을 때 DOM을 전혀 건드리지 않게 합니다.
- 학습자가 "DOM 접근이 JS 접근보다 비싸다"와 "없는 프로퍼티 조회가 체인 끝까지 간다" 두 가지를 말하면 충분합니다.

## Q3.6 `BlockFirst`의 주석 두 개

- 컴파일 결과 템플릿은 `<!> <p>after the block</p>`로 `<!>`(주석)로 시작합니다. `has_start = !content.startsWith('<!>')`가 `false`이므로 `template()`이 앞에 `<!>`를 하나 더 붙여 파싱합니다(`template.js:38`, `47`).
- 첫 번째 `<!---->`: 덧붙인 시작 표식입니다. fragment의 첫 자식이므로 effect의 `nodes_start`가 됩니다(`template.js:56-59`).
- 두 번째 `<!---->`: `{#if}`의 anchor입니다. `{#if}` 내용(`<span>`)은 이 anchor **앞**에 들어갑니다.
- 시작 표식이 없다면 anchor가 `nodes_start`가 되고, `{#if}` 내용은 그보다 앞, 즉 컴포넌트 범위 **밖**에 놓입니다. 그러면 컴포넌트를 파괴할 때 `<span>`이 제거되지 않고 남습니다.
- `first_child`는 첫 노드가 빈 주석이면 건너뛰고 다음 노드를 반환합니다(`operations.js:122`). 그래서 컴파일된 코드는 덧붙은 표식의 존재를 모른 채 `$.first_child(fragment)`로 원래의 첫 노드(anchor)를 얻습니다.

## Q3.7 `nodes_start`/`nodes_end`와 파괴

- `assign_nodes`는 `effect.nodes_start === null`일 때만 기록합니다(`template.js:13-19`). 한 effect 안에서 처음 만든 템플릿이 그 effect의 루트 DOM이고, 이후에 만드는 템플릿(예: 같은 branch 안의 자식 컴포넌트가 만드는 템플릿, 혹은 그 effect에서 이어서 만든 다른 조각)은 이미 그 범위 안에 삽입되므로 덮어쓰면 안 됩니다. 덮어쓰면 범위가 안쪽 조각으로 줄어들어 파괴 시 바깥 노드가 남습니다.
- `destroy_effect`는 `nodes_start`부터 `nodes_end`까지 형제를 따라가며 `node.remove()`합니다(`effects.js:436-442`). 그다음 `removed = true`(448행)로 표시하고 `destroy_effect_children(effect, remove_dom && !removed)`(452행)를 호출하므로, 자식 effect는 `remove_dom = false`로 파괴되어 DOM을 다시 건드리지 않습니다. 자식 블록의 노드는 이미 부모가 지운 범위 안에 있기 때문입니다.
- 범위 포함이 보장되는 이유: 모든 삽입이 "anchor 앞에 넣기"이고 anchor는 부모 템플릿의 일부이므로, 자식 블록의 노드는 항상 부모의 `[nodes_start, nodes_end]` 안쪽에 위치합니다.
- 실측: Counter unmount 로그에서 `<p class="warn">`은 `#app`에서 한 번만 제거됩니다.

## Q3.8 `click #3`에서 `{#if}` 삽입이 먼저인 이유

- 컴파일러: 블록 호출(`$.if`)은 `state.init`에, 텍스트 갱신은 `state.update`에 모이고, `Fragment.js`가 `init`을 먼저, 그다음 `update`를 하나의 `$.template_effect`로 묶어 배치합니다(`src/compiler/phases/3-transform/client/visitors/Fragment.js:185-196`). 따라서 마크업 위치와 상관없이 같은 fragment 안에서는 `$.if` effect가 `template_effect`보다 먼저 생성됩니다.
- 런타임: `push_effect`는 자식 effect를 부모의 `last` 뒤에 붙이므로 자식 리스트는 생성 순서입니다(`effects.js:68-77`). `process_effects`는 `first`부터 `next`를 따라 순회하면서 render effect(블록과 template effect 포함)를 그 자리에서 `update_effect`로 실행합니다(`runtime.js:605-625`). 그래서 `{#if}` block effect가 먼저 실행되어 branch를 만들고 `<p>`를 삽입한 뒤, `template_effect`가 텍스트를 갱신합니다.
- (보너스) 비위임 이벤트(`$.event`)는 `after_update`로 맨 뒤에 붙습니다(`Fragment.js:196`, `visitors/shared/events.js:72-77`).

## Q3.9 `Order.svelte` 예측과 순서 뒤집기

- 실측: `Order.svelte`에서도 `insert <p class="warn">` → `text clicks` → `text double` 순서로, Counter와 같습니다. 마크업 순서는 영향을 주지 않습니다(Q3.8의 컴파일러 요인 때문).
- 텍스트 갱신을 먼저 일어나게 하는 방법(직접 확인함): 텍스트를 자기 effect를 가진 단위로 감싸서 `$.if`보다 먼저 생성되게 합니다.
  - `{#if true}<button ...>clicks: {count}</button>{/if}`처럼 앞쪽 블록 안에 넣기: 앞 블록의 branch 안에 `template_effect`가 생기고, 그 블록이 두 번째 `$.if`보다 먼저 생성됩니다.
  - 텍스트를 자식 컴포넌트(`<Label {count} />`)로 분리해서 `{#if}`보다 앞에 두기: 자식 컴포넌트 함수가 호출되는 시점에 그 안의 `template_effect`가 부모 branch의 자식으로 먼저 연결됩니다.
- 둘 다 실측 결과 `text` → `insert` 순서가 되었습니다. 학습자가 다른 방법을 제시하면 실제로 실행해 보게 하세요.

## Q3.10 `{#if}` 단계별 동작

실측 결과:

- `0 → 1`: `<p class="pos">` 삽입 후 `{:else}` branch의 `<!---->`, `<p class="zero">`, `""` 제거.
- `1 → 2`, `2 → 1`: 텍스트만 바뀜.
- `1 → 0`: `<!---->`, `<p class="zero">`, `""` 삽입 후 `<p class="pos">` 제거. 처음의 `<p class="zero">`와 **다른** 요소입니다(`false` 출력). transition이 없으면 pause 즉시 파괴되므로 다음에는 새 branch를 만듭니다.
- `0 → -1`: 안쪽 `$.if`만 바뀌어 `<p class="neg">` 삽입, `<p class="zero">` 제거. 바깥 조건(`n > 0`)은 그대로 `false`이므로 바깥 블록은 아무것도 하지 않습니다.
- `-1 → -2`: DOM 변경 없음.

핵심 포인트:

- `if (condition === (condition = !!get_condition())) return;`(`dom/blocks/if.js:41`): 조건의 **불리언 값**이 같으면 block effect는 다시 실행되어도 즉시 반환합니다. branch 안의 내용 갱신은 branch 안의 effect가 따로 처리합니다. 즉 block effect는 "조건"에만 의존하고 내용에는 의존하지 않습니다.
- `{:else if}`는 alternate 함수 안에 중첩된 `$.if(..., true)`로 컴파일됩니다. 다섯 번째 인자 `elseif = true`이면 `EFFECT_TRANSPARENT` 플래그가 붙습니다(`if.js:38`). 이 플래그는 transition의 "local" 판단에서 이 블록을 투명하게 취급하게 합니다. `pause_children`/`resume_children`이 transparent 자식을 지날 때 `local`을 유지하고(`effects.js:567`, `603`), `transition()`의 intro 판단에서 transparent 블록을 건너뜁니다(`dom/elements/transitions.js:253-266`). 그래서 `{#if a}...{:else if b}<div transition:fade>` 같은 구조에서 바깥 조건 변화도 "자기 블록의 변화"로 취급되어 local transition이 실행됩니다. (`if.js:19` 주석: "affects which transitions are considered 'local'")
- `$.comment()`는 빈 주석(시작 표식)과 빈 텍스트 노드(anchor)를 담은 fragment를 만듭니다(`template.js:216-231`). 마운트 로그의 `<!---->`, `<p class="zero">`, `""` 중 바깥 두 개입니다. 안쪽 `$.if`의 내용은 이 `""` anchor 앞에 들어갑니다.

## Q3.11 transition과 pause/resume

실측 결과: outro 시작 후 `<p>`는 연결된 상태(`isConnected: true`)이고 `inert: true`입니다. outro 중 `count++`는 DOM 변경이 없고, 다시 보여 주면 같은 요소가 재사용되면서 `"count: 0" → "count: 1"`로 바뀝니다. 마지막에 outro를 끝내면 `<p>`가 제거됩니다.

- `pause_effect`는 `pause_children`으로 하위 트리 전체에 `INERT`를 켜고 transition manager를 모은 뒤, `run_out_transitions`로 모든 outro가 끝나면(`check` 카운터가 0이 되면) `destroy_effect`를 호출합니다(`effects.js:518-544`, `551-574`). outro 중에는 `element.inert = true`(`transitions.js:231`).
- transition이 없으면 `transitions.length === 0`이라 `run_out_transitions`가 콜백을 즉시 실행합니다(`effects.js:541-543`). 그래서 IfElse에서는 즉시 제거되었습니다.
- 갱신이 멈춘 이유: `INERT` effect는 `process_effects`(`runtime.js:614`)와 `flush_queued_effects`(`runtime.js:530`)에서 건너뜁니다. 의존성은 그대로라서 `DIRTY`/`MAYBE_DIRTY` 표시는 받습니다.
- 나중에 반영된 이유: `resume_children`이 `INERT`를 끈 직후 `check_dirtiness`가 참이면 `update_effect`를 실행합니다(`effects.js:590-597`). 이어서 transition의 `in()`이 outro를 abort하고 `inert`를 원래 값으로 되돌립니다(`transitions.js:198-207`).
- 새 branch를 먼저 만드는 이유(`if.js:60-83`): 기존 branch가 outro하는 동안 새 branch의 intro가 동시에 진행되어야 합니다. 기존 branch의 outro가 끝나기를 기다린 뒤에 새 branch를 만들면 그동안 새 내용이 보이지 않습니다. "생성 후 pause" 순서로 두면 transition이 있든 없든 같은 코드로 처리됩니다. 학습자가 "intro와 outro가 겹쳐야 한다"를 말하면 정답으로 인정합니다.

## Q3.12 keyed와 unkeyed 비교, flags

실측 결과(기본 연산 순서로 실행했을 때):

| 연산 | Keyed | Unkeyed |
|---|---|---|
| `prepend` | records 1, 삽입 1, 기존 노드 모두 유지(위치는 밀림) | records 7, 삽입 1(맨 끝), 텍스트 6개 변경 |
| `remove_first` | records 1, 제거 1 | records 8, 제거 1(맨 끝), 텍스트 7개 변경 |
| `reverse` | records 10(5개 이동 = remove+insert 5쌍), 텍스트 0 | records 6, 이동 0, 텍스트 6개 변경 |
| `relabel` | records 6, 텍스트 6개 변경, 노드 유지 | records 6, 텍스트 6개 변경, 노드 유지 |

(이 시점의 항목은 6개입니다. `OPS=reverse,relabel`로 처음 5개 항목에서 실행하면 unkeyed `reverse`는 가운데 항목이 그대로라 텍스트 4개, `relabel`은 5개입니다.)

- unkeyed의 key 함수는 `$.index`(`dom/blocks/each.js:56-58`)라서 "같은 항목 = 같은 위치"입니다. 따라서 노드는 절대 이동하지 않고, 위치별로 값만 바꿉니다(`update_item`, `each.js:464-474`). 앞쪽 삽입·삭제에 약하고, 노드 자체가 상태(포커스, input 값, 컴포넌트 내부 상태)를 가질 때 상태가 엉뚱한 항목에 붙습니다. 대신 이동 연산이 없고 단순합니다.
- keyed는 "같은 항목 = 같은 key"라서 노드와 그 내부 상태가 항목을 따라 이동합니다.
- flags(`src/constants.js:1-5`): `EACH_ITEM_REACTIVE = 1`, `EACH_INDEX_REACTIVE = 2`, `EACH_IS_CONTROLLED = 4`, `EACH_IS_ANIMATED = 8`, `EACH_ITEM_IMMUTABLE = 16`. `KeyedList`와 `UnkeyedList`의 리스트 블록은 둘 다 `21 = 16 + 4 + 1`(runes 모드라 IMMUTABLE, `<ul>`의 유일한 자식이라 CONTROLLED, 외부 state에 의존하고 key가 item 자체가 아니라 ITEM_REACTIVE)입니다. 차이는 네 번째 인자(key 함수)뿐입니다. 버튼 블록은 `17 = 16 + 1`입니다. 근거: `src/compiler/phases/3-transform/client/visitors/EachBlock.js:44-98`.

## Q3.13 이동 횟수 예측

실측(최소값은 5 − LIS 길이):

| 목표 | Svelte | 최소 |
|---|---|---|
| `E,B,C,D,A` | 2 | 2 |
| `B,C,D,E,A` | 1 | 1 |
| `E,A,B,C,D` | 1 | 1 |
| `E,D,C,B,A` | 4 | 4 |

예측 근거로 "움직이지 않아도 되는 최대 집합(LIS)"을 언급하면 좋습니다.

## Q3.14 `[A,B,C,D,E] → [E,B,C,D,A]` 추적

- `i=0`, key `E`: `item(E) !== current(A)`, `seen`이 비어 있으므로 389행 이후로 갑니다. `matched=[]`, `stashed=[]`로 초기화하고 392-400행 루프에서 A, B, C, D를 `seen`과 `stashed`에 넣습니다. `current = E`, `item = E`, `matched=[E]`, `prev=E`, `current=E.next=null`.
- `i=1`, key `B`: `item(B) !== current(null)`, `seen`에 B가 있음. `matched.length(1) < stashed.length(4)`이므로 "later items를 앞으로" 분기(346-373행): `start = stashed[0] = A`, matched 묶음 [E]를 A 앞으로 `move`(**이동 1**). stashed 항목을 `seen`에서 모두 제거하고, 연결 리스트를 E, A, B, C, D로 고친 뒤 `current = A`, `prev = E`, `i -= 1`로 같은 인덱스를 다시 처리합니다.
- `i=1` 재처리, key `B`: `item(B) !== current(A)`, A는 `seen`에서 지워졌으므로 392행 루프로 A를 다시 `seen`/`stashed`에 넣고 `current = B`. `matched=[B]`, `current = C`.
- `i=2` C, `i=3` D: `item === current`이므로 `matched=[B,C,D]`, D 다음은 `null`(링크 수정으로 D.next가 null이 됨).
- `i=4`, key `A`: `item(A) !== current(null)`, `seen`에 A가 있음. `matched.length(3) < stashed.length(1)`이 거짓이므로 "earlier item을 뒤로" 분기(374-384행): A를 `current(null)` 위치, 즉 블록 anchor 앞(맨 끝)으로 `move`(**이동 2**).
- 남은 `current`가 없고 `seen`은 비었으므로 파괴할 항목이 없습니다(414-442행).
- 두 분기의 의미: "later items를 앞으로"는 지금까지 연속으로 맞은 묶음(matched)이 건너뛴 묶음(stashed)보다 짧을 때, 짧은 쪽(matched)을 건너뛴 묶음 앞으로 옮기는 전략입니다. "earlier item을 뒤로"는 건너뛴 항목 하나를 현재 위치로 끌어와 뒤에 붙이는 전략입니다. 어느 쪽이 DOM 이동이 적은지 지역적으로 판단합니다.

## Q3.15 120개 순열 실험

실측: 120개 중 118개가 최소값과 같았고, 예외는 `CEABD`(3 대 2)와 `DECBA`(4 대 3)입니다.

`CEABD` 추적(최소 2: A, B, D를 고정하고 C와 E만 이동):

- `i=0` C: A, B를 stash(`seen={A,B}`), `matched=[C]`, `current=D`.
- `i=1` E: E는 `seen`에 없으므로 `matched`/`stashed`를 초기화하고 D를 stash(`seen={A,B,D}`, `stashed=[D]`), `matched=[E]`, `current=null`.
- `i=2` A: `seen`에 있고 `matched.length(1) < stashed.length(1)`이 거짓이라 A를 끝으로 이동(1).
- `i=3` B: 같은 이유로 B를 끝으로 이동(2). `i=4` D: D를 끝으로 이동(3).
- 손해 지점: `i=1`에서 `matched`와 `stashed`를 초기화하면서 앞에서 건너뛴 A, B의 "묶음 크기" 정보가 사라집니다. 이후 판단은 마지막 stash(`[D]`, 길이 1)만 보고 하나씩 뒤로 보내는 쪽을 택합니다. 전역적으로 보면 C, E 두 개를 옮기는 것이 더 적습니다.

트레이드오프:

- LIS 방식(Vue 3, ivi, Inferno 등이 사용하는 방식)은 이동 횟수가 항상 최소이지만, 매번 위치 배열을 만들고 O(n log n) 계산을 해야 하며 코드가 더 깁니다.
- 5.0.0의 휴리스틱은 한 번의 순회와 작은 배열(`matched`, `stashed`)만 사용합니다. 추가, 삭제, 한 항목 이동, 양 끝 교환 같은 흔한 변경에서는 최소값을 달성하고, 최적이 아닌 경우도 차이가 작습니다(5개 기준 2/120, 각각 1회 초과).
- 학습자가 "흔한 경우에 최적이고 비용이 낮은 대신 드문 경우에 약간 손해"라는 구조를 말하면 정답입니다. `START` 확장 결과는 학습자가 직접 실행한 값을 기준으로 토론하세요(이 키 작성 시 6~7개는 실행하지 않았습니다).

## Q3.16 item source, controlled, effect 연결

- `relabel`: 같은 key의 항목이 있으면 `should_update`일 때 `update_item`이 `internal_set(item.v, value)`로 항목 source에 새 객체를 넣습니다(`each.js:332-334`, `464-467`). `<li>`의 `template_effect`는 `$.get(item).label`을 읽으므로 그 source에 의존하고, 그래서 텍스트만 갱신됩니다. 항목 source는 `create_item`에서 만듭니다(`each.js:496`, runes 모드에서는 `EACH_ITEM_IMMUTABLE`이라 `source`, 아니면 `mutable_source`).
- `EACH_ITEM_REACTIVE`를 붙이지 않는 경우(`EachBlock.js:48-77`): 컬렉션 표현식이 바깥 상태에 전혀 의존하지 않거나, runes 모드에서 key가 항목 자체(`{#each items as item (item)}`)이고 store를 쓰지 않을 때입니다. key가 항목 자체라면 같은 key는 곧 같은 값이므로, 값이 바뀌는 상황은 key가 바뀌는 상황이고 새 항목을 만들면 됩니다. 의존이 없으면 값이 바뀔 일이 없습니다.
- controlled: 부모가 요소이고 `{#each}`가 그 요소의 유일한 자식일 때 컴파일러가 표시합니다(`src/compiler/phases/3-transform/client/visitors/shared/fragment.js:102-103`, 설명 주석은 `src/compiler/types/template.d.ts`의 `is_controlled`). 이 경우 anchor 주석을 템플릿에 넣지 않고 부모에 빈 텍스트를 anchor로 붙입니다(`each.js:118-126`). 모든 항목을 지울 때 transition이 없으면 `clear_text_content(parent_node)`(`textContent = ''`) 한 번으로 비우고 anchor를 다시 붙입니다(`each.js:77-88`, 조건은 `reconcile`의 428행 `length === 0`). 그래서 records가 2입니다. uncontrolled는 항목마다 `destroy_effect`가 노드를 제거합니다(records 5).
- effect 연결: 항목 effect는 `branch(..., hydrating)`이라 마운트 시 `push_effect`로 부모에 자동 연결되지 않습니다(`each.js:512`, `effects.js:147`). 대신 `create_item`이 `item.e.prev/next`를 직접 연결하고(`each.js:514-527`), `link`가 항목을 옮길 때마다 effect 리스트도 함께 고치며(`each.js:558-570`), `reconcile` 마지막 두 줄이 블록 effect의 `first`/`last`를 첫 항목과 마지막 항목 effect로 설정합니다(`each.js:453-454`). 항목 순서와 effect 리스트 순서가 항상 일치해야 갱신 순서와 파괴 범위 계산이 DOM 순서와 맞기 때문입니다. `push_effect`는 끝에만 붙일 수 있어서 중간 삽입과 이동을 표현할 수 없습니다.

## Q3.17 hoist 기준과 `$.event`

실측: `button.hoisted.__click`과 `button.plain.__click`은 배열, `button.item.__click`은 함수, `input.field`에는 `__` 프로퍼티가 없습니다.

- 위임 대상 여부: 이벤트 이름이 `DELEGATED_EVENTS`(`src/utils.js:110-134`)에 있고, 요소가 일반 요소이며 spread가 없어야 합니다(`src/compiler/phases/2-analyze/visitors/Attribute.js:72-90`).
- hoist 조건(같은 함수 72-207행): 핸들러가 인라인 함수이거나 재할당되지 않는 함수 선언/표현식을 가리키고, 매개변수가 1개 이하이며(160행), `arguments`/`$host`를 쓰지 않고, each 블록의 index 같은 블록 지역 바인딩을 참조하지 않고(189-190행), 변경되는 일반 지역 변수를 참조하지 않아야 합니다. `button.item`의 핸들러는 each 블록의 `item`, `i`를 참조하므로 hoist되지 않습니다.
- 배열 형태: hoist된 함수는 인스턴스 지역 변수를 클로저로 잡을 수 없으므로, 필요한 값(`count` source)을 배열 뒤에 붙여 전달합니다(`src/compiler/phases/3-transform/client/visitors/shared/events.js:35-50`). 런타임은 `[fn, ...data]`를 꺼내 `fn.apply(current_target, [event, ...data])`로 호출합니다(`src/internal/client/dom/elements/events.js:222-224`). 그래서 hoist된 함수의 시그니처가 `(_, count) => ...`입니다. 장점은 인스턴스마다 클로저를 만들지 않는 것입니다.
- `focus`는 `DELEGATED_EVENTS`에 없습니다. bubbling하지 않는 이벤트라서 루트에서 받을 수 없습니다(위임하려면 `focusin`을 써야 하며, `focusin`은 목록에 있습니다). 그래서 `$.event`로 요소에 직접 붙습니다(`events.js:107-117`).

## Q3.18 위임 경로 추적

- 리스너 위치: `_mount`가 target(마운트 컨테이너)과 `document` 두 곳에 `handle_event_propagation`을 붙입니다(`render.js:194-219`, 특히 206행과 213행). 주석: 컨테이너 리스너는 바깥 코드가 전파를 막아도 내부 이벤트를 잡기 위해, document 리스너는 컨테이너 밖으로 수동으로 옮긴 요소(포털)의 이벤트를 잡기 위해 존재합니다(203-205행, 211-212행). document 리스너는 이벤트 이름별 참조 카운트(`document_listeners`)로 관리합니다.
- 늦게 import된 컴포넌트: `$.delegate`는 이벤트 이름을 `all_registered_events`에 추가하고, 이미 마운트된 앱마다 등록된 `event_handle` 함수(`root_event_handles`)를 호출해서 그 앱의 루트에도 리스너를 붙입니다(`events.js:123-131`, `render.js:221-222`). 그래서 붙습니다.
- 경로 순회: `event.composedPath()`의 첫 요소(또는 `event.target`)부터 `parentNode`(또는 `assignedSlot`, shadow `host`)를 따라 올라가며 `'__' + event_name` 프로퍼티를 찾아 호출합니다(`events.js:209-240`). `currentTarget`은 `define_property`로 getter를 덮어써서 현재 요소를 돌려주게 하고, 끝나면 삭제합니다(192-197행, 255행). `disabled` 요소의 핸들러는 호출하지 않습니다(221행).
- 멈추는 조건(236행): `event.cancelBubble`(즉 `stopPropagation()` 호출), 다음 부모가 리스너가 붙은 요소(`handler_element`)에 도달, 부모가 없음.
- `event.__root`(152-183행, 253행)는 컨테이너에서 이미 처리한 이벤트를 document 리스너가 다시 처리하지 않게 합니다.

## Q3.19 `addEventListener`와 `on`

실측(기본 모드): `plain` 클릭 시 `wrapper <div>` → `plain button` → `outer <section>` 순서. `stop` 클릭 시 `wrapper <div>` → `stop button`(section은 실행되지 않음).
실측(`on` 모드): `plain` 클릭 시 `plain button` → `wrapper <div>` → `outer <section>`. `stop` 클릭 시 `stop button`만 실행.

- 기본 모드 설명: 위임된 핸들러(`__click`)는 이벤트가 루트(컨테이너)까지 bubbling했을 때 한꺼번에 실행됩니다. 그 전에 이벤트는 실제 DOM 경로를 따라 `<div>`를 지나므로, `<div>`에 직접 붙은 리스너가 먼저 실행됩니다. `stop` 버튼의 `stopPropagation()`도 루트에 도달한 **뒤에** 호출되므로, 이미 실행된 `<div>` 리스너를 막을 수 없습니다(루트에서의 순회는 막아서 `section` 핸들러는 실행되지 않음).
- `on`의 해결 방식: `create_event`의 `target_handler`는 자기 핸들러를 실행하기 **전에** `handle_event_propagation.call(dom, event)`로 target부터 자기 요소 직전까지의 위임 핸들러를 먼저 실행합니다(`events.js:52-60`, capture가 아닐 때만). 그다음 `event.cancelBubble`이 설정되었으면 자기 핸들러를 건너뜁니다. 이후 루트 리스너는 `event.__root`를 보고 이미 처리한 구간을 건너뜁니다(`events.js:154-183`). 결과적으로 선언적 핸들러와 직접 붙인 핸들러가 DOM 순서대로 실행됩니다.
- 사용자가 알아야 할 것: 선언적 이벤트 속성(`onclick`)과 수동 `addEventListener`를 섞으면 순서와 `stopPropagation`이 직관과 다르게 동작하므로 수동 리스너는 `on`을 써야 합니다(문서에도 같은 안내가 있음).
- 위임을 택한 이유(추측 질문이므로 합리적이면 인정): 요소마다 `addEventListener`를 호출하지 않아 마운트 비용과 메모리가 줄고, 핸들러를 hoist해서 인스턴스별 클로저를 줄일 수 있으며, 리스너 해제 작업이 필요 없습니다. 큰 리스트에서 효과가 큽니다.

## Q3.20 `{#await}` 타이밍

실측:

- natural timing에서 already-resolved promise: `insert then`, `remove catch`만 기록되고 `pending`은 나타나지 않습니다.
- flushSync timing(기다리지 않음): `insert pending` → `remove then` → `insert then` → `remove pending`으로 pending이 잠깐 들어갔다 빠집니다.
- `non-promise value`: `then: instant` → `then: plain value` 텍스트만 바뀝니다.

설명:

- block effect가 새 promise를 받으면 먼저 `promise.then(...)`을 등록하고(`dom/blocks/await.js:120-135`), 그다음 `queue_micro_task`로 "아직 resolve되지 않았으면 pending을 보여 준다"는 작업을 예약합니다(141-147행). 이미 resolve된 promise의 then 콜백은 등록 즉시 microtask 큐에 들어가므로, 자연스러운 순서에서는 then 콜백이 먼저 실행되어 `resolved = true`가 되고 pending 작업은 아무것도 하지 않습니다. 목적은 "곧바로 끝나는 promise에 대해 pending 화면이 깜빡이지 않게 하기"입니다.
- `flush_sync`는 effect를 비운 뒤 `flush_tasks()`를 호출합니다(`runtime.js:687`). `flush_tasks`는 `queue_micro_task`로 쌓인 작업을 microtask를 기다리지 않고 동기적으로 실행합니다(`dom/task.js:56-63`). 그래서 then 콜백보다 pending 작업이 먼저 실행되어 pending이 잠깐 나타납니다. 즉 `flushSync()`는 "Svelte가 예약한 작업"은 당겨 실행하지만 "Promise의 microtask"는 당길 수 없습니다.
- 그 뒤 then 콜백의 `update(THEN, true)`는 끝에서 `flush_sync()`를 호출해서 DOM을 즉시 반영합니다(`await.js:106-108`).
- `non-promise value`: promise가 아니면 `internal_set(input_source, input)`과 `update(THEN, false)`를 바로 호출합니다(148-151행). `then_effect`가 이미 있으므로 `resume_effect`(INERT가 아니므로 사실상 아무 일 없음)만 하고 새 branch를 만들지 않습니다(78-81행). then 블록 안의 텍스트는 `input_source`를 읽고 있어서 그 source 변경으로 텍스트만 갱신됩니다.
- 참고: 한 단계에서 pending이 사라질 때 `{:then}` branch는 매번 새로 만들어집니다. transition이 없으면 pause 즉시 파괴되어 `then_effect = null`이 되기 때문입니다(88-98행).
