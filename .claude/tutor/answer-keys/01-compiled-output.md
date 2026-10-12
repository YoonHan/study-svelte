# 1단계 정답 기준: 컴파일 결과 관찰

> 스포일러: 학습자는 열람하지 않는 것을 권장합니다.

튜터가 `/check`로 채점할 때 참고하는 기준입니다. 경로는 `svelte/packages/svelte/` 기준이며 줄 번호는 `svelte@5.0.0` 태그 기준입니다. 학습자의 답이 핵심 포인트를 다른 말로 설명했다면 맞은 것으로 인정합니다. 근거 위치가 다르더라도 같은 사실을 가리키면 인정합니다.

모든 예제의 실제 출력은 `node tools/compile.mjs <file>`로 언제든 다시 확인할 수 있습니다. 채점하기 전에 직접 실행해서 이 문서의 서술과 일치하는지 확인하세요.

---

## 1-A. 템플릿과 노드 탐색

### Q1.1 `$.template`의 두 번째 인자

핵심 포인트
- `TEMPLATE_FRAGMENT = 1`, `TEMPLATE_USE_IMPORT_NODE = 2`입니다. 인자 없음은 0, `1`은 FRAGMENT, `3`은 FRAGMENT | USE_IMPORT_NODE입니다.
- FRAGMENT는 템플릿의 최상위 노드가 여러 개일 때 켜집니다. 최상위가 요소 하나뿐이면(`02-single-element`) 플래그 없이 `$.template`을 호출하고, 런타임은 fragment의 첫 자식 요소 하나만 복제합니다.
- USE_IMPORT_NODE는 템플릿 안에 커스텀 엘리먼트(태그 이름에 하이픈)가 있을 때 켜집니다(`11-custom-element`, snapshot `skip-static-subtree`).
- 런타임에서 FRAGMENT이면 `start`/`end`를 fragment의 첫 노드와 마지막 노드로 기록하고, 아니면 복제한 요소 자체를 `start`와 `end`로 기록합니다.

근거
- `src/constants.js:18-19`
- `src/compiler/phases/3-transform/client/visitors/Fragment.js:108-128` (단일 요소), `:159-181` (fragment, `flags = TEMPLATE_FRAGMENT`는 `:168`)
- `src/compiler/phases/3-transform/client/visitors/RegularElement.js:62-69`
- `src/internal/client/dom/template.js:27-66` (`is_fragment` `:28`, `use_import_node` `:29`, 복제 `:51-53`, `assign_nodes` `:55-62`)

### Q1.2 `<p></p>`와 `<p> </p>`

핵심 포인트
- 자식이 텍스트와 `{expression}`뿐이고, 그 표현식이 상태를 읽지 않으면(`{name}`이 상수) 요소 안으로 들어가지 않고 `p.textContent = ...`로 한 번 설정합니다. 이때 템플릿의 `<p>`는 비어 있습니다.
- 상태를 읽는 텍스트는 나중에 `$.set_text`로 갱신해야 하므로, 템플릿 안에 **텍스트 노드를 미리 만들어 둘 자리**로 공백 한 칸 `' '`을 넣습니다. 복제된 DOM에서 `$.child(p)`가 이 텍스트 노드를 얻습니다.
- 빈 문자열로는 텍스트 노드가 생기지 않으므로 공백 한 칸이 필요합니다.

근거
- `src/compiler/phases/3-transform/client/visitors/RegularElement.js:358-375` (textContent 특수 처리)
- `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:62-87` (`state.template.push(' ')`는 `:69`)

### Q1.3 `09-anchors.svelte`의 템플릿과 `$.sibling(text, 5)`

핵심 포인트
- 템플릿은 `` `<!> <b>static</b> <i>static</i> <em> </em>` ``입니다. `{#if}`는 `<!>`가 되고, `{name} is the second node`는 공백 한 칸 텍스트 노드 자리가 되어 `<!>` 뒤의 공백과 합쳐집니다.
- `text = $.sibling(node)`이고, `em = $.sibling(text, 5)`입니다. text → `<b>` → `" "` → `<i>` → `" "` → `<em>`으로 다섯 번 이동합니다.
- `<b>`, `<i>`는 속성도 동적 내용도 없는 정적 요소이므로 변수를 만들지 않고 `skipped` 카운트만 늘립니다. 그래서 중간 노드들은 탐색 횟수로만 표현됩니다.
- 참고: 이 예제의 `show`, `name`은 재할당이 없으므로 `$.state`가 아니라 일반 값이 됩니다(1-B 주제와 연결됩니다).

근거
- `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:27-38` (`get_node`, `$.sibling` 인자), `:100-101` (`is_static_element`이면 `skipped += 1`), `:128-159` (`is_static_element`)
- snapshot 샘플 `tests/snapshot/samples/skip-static-subtree/`

### Q1.4 `template()` 내부, 앞에 붙는 `<!>`, 빈 텍스트 노드

핵심 포인트
- HTML 파싱(`create_fragment_from_html`)은 `node === undefined`일 때 **한 번만** 일어나고, 이후 호출부터는 캐시된 노드를 `cloneNode(true)`로 복제합니다. `template()`은 모듈 최상위에서 호출되어 클로저를 반환하므로 캐시는 컴포넌트 정의마다 하나입니다.
- 템플릿이 `<!>`로 시작하면(첫 노드가 블록 anchor라서 나중에 앞쪽에 다른 노드가 삽입될 수 있으면) `has_start = false`가 되고, 앞에 `<!>`를 하나 더 붙여서 **이 블록의 시작 노드(`nodes_start`)로 쓸 고정된 주석**을 확보합니다. 그렇지 않으면 블록 anchor 앞에 삽입된 노드가 시작 노드보다 앞에 놓여서, 블록을 제거하거나 이동할 때 범위가 어긋납니다.
- `$.first_child`는 첫 노드가 빈 주석(`data === ''`)이면 그 다음 형제를 반환하여 이 추가 주석을 건너뜁니다.
- `assign_nodes(start, end)`는 현재 effect(`active_effect`)의 `nodes_start`/`nodes_end`를 기록합니다. 블록이 파괴될 때 이 범위를 지웁니다.
- mount 출력에서 가장 먼저 삽입되는 `""`는 `_mount`가 `target.appendChild(create_text())`로 만든 루트 anchor입니다(`anchor` 옵션이 없을 때). 맨 앞 `<!---->`는 위에서 설명한 추가 시작 주석입니다.

근거
- `src/internal/client/dom/template.js:34-38` (`has_start`), `:46-49` (한 번만 파싱), `:51-53` (복제), `:13-19` (`assign_nodes`)
- `src/internal/client/dom/operations.js:116-125` (빈 주석 건너뛰기는 `:122`)
- `src/internal/client/render.js:229` (`anchor_node`)

### Q1.5 `$.reset`과 `$.next`가 생성되는 이유

핵심 포인트
- 두 함수는 `hydrating`이 아니면 즉시 반환합니다.
- 같은 client 출력이 `mount`(새로 만들기)와 `hydrate`(서버 HTML 재사용) 모두에 쓰입니다. hydration 중에는 `hydrate_node`가 "지금 걷고 있는 서버 DOM 노드"를 가리키는 커서이며, `$.child`/`$.sibling`이 이 커서를 움직입니다.
- `$.reset(el)`은 요소 내부 탐색이 끝났을 때 커서를 요소 자신으로 되돌립니다(그래야 다음 `$.sibling(el, ...)`이 올바르게 동작합니다). 또한 남은 형제가 있으면 hydration 불일치로 판단합니다.
- `$.next(n)`은 마지막에 정적인 노드가 남아 있어서 변수를 만들지 않은 경우, hydration 커서를 끝까지 이동시킵니다.
- 이렇게 설계하면 hydration 코드를 별도로 생성하지 않아도 되고, `hydrate`를 쓰지 않는 앱에서는 `hydrating`이 항상 `false`라서 비용이 거의 없습니다.

근거
- `src/internal/client/dom/hydration.js:12-16` (`hydrating`), `:23-30` (`hydrate_node` 주석), `:47-57` (`reset`), `:69-80` (`next`)
- `src/internal/client/dom/operations.js:94-108` (`child`), `:147-171` (`sibling`)
- `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:117-122` (꼬리 `$.next`)
- `src/compiler/phases/3-transform/client/visitors/RegularElement.js:381-398` (`needs_reset`)

### Q1.6 템플릿 복제 방식의 장단점

핵심 포인트
- 장점: 정적인 구조 전체가 문자열 하나로 표현되므로 생성 코드가 작습니다. `cloneNode`는 브라우저 내장 구현이라 노드를 하나씩 만드는 JS 호출보다 빠릅니다. 정적인 하위 트리는 아예 탐색하지 않아도 됩니다.
- 비용: 동적인 노드에 도달하려면 `firstChild`/`nextSibling`으로 탐색해야 하고(그래서 `operations.js`는 getter를 미리 꺼내 둡니다), 첫 사용 시 HTML 파싱 비용이 한 번 듭니다. 템플릿 문자열 구조와 탐색 코드가 정확히 일치해야 합니다.
- `importNode`: `cloneNode`로 만든 커스텀 엘리먼트는 DOM에 연결되기 전까지 클래스가 인스턴스화되지 않아서, 연결 전에 속성(property)을 설정하면 문제가 생깁니다. `importNode`는 그런 제약이 없지만 더 느리므로, 커스텀 엘리먼트가 있을 때만 사용합니다.

근거
- `src/compiler/phases/3-transform/client/visitors/RegularElement.js:64-69` (주석)
- `src/internal/client/dom/operations.js:7-58` (`init_operations`의 getter 캐싱)
- `src/internal/client/dom/template.js:51-53`

---

## 1-B. runes가 어떤 코드로 바뀌는가

### Q1.7 `04-state-proxy.svelte` 분류표와 예측

핵심 포인트

| 변수 | 출력 | 이유 |
|---|---|---|
| `a = $state(0)` | `0` | 재할당 없음, 원시값 |
| `b = $state({n:0})` | `$.proxy({...})` | 재할당 없음, 객체 |
| `c = $state([1,2,3])` | `$.proxy([...])` | 재할당 없음, 배열 |
| `d = $state(0)` | `$.state(0)` | 재할당 있음, 원시값 |
| `e = $state({n:0})` | `$.state($.proxy({...}))` | 재할당 있음, 객체 |
| `f = $state.raw({n:0})` | `$.state({...})` | 재할당 있음, raw이므로 proxy 없음 |
| `g = $state(seed)` | `$.proxy(seed)` | 재할당 없음, 초기값이 객체로 초기화된 변수 |

- 실행 결과(마운트 → mutate → reassign → mutate)는 `0 0 3 0 0 0 0` → `0 1 4 0 1 0 0` → `0 1 4 1 1 1 0` → `0 2 5 1 2 1 0`입니다.
- 재할당 시 `$.set(e, $.proxy({ n: 1 }))`처럼 새 값에도 proxy를 씌우지만, `f`는 `$.set(f, { n: 1 })`로 그대로 넣습니다.

근거
- 컴파일 출력 자체가 근거입니다.

### Q1.8 분류 규칙의 컴파일러 근거

핵심 포인트
- `$state`이고 `should_proxy(value)`이면 `$.proxy(value)`로 감쌉니다. `$state.raw`는 이 단계를 건너뜁니다.
- `is_state_source(binding, analysis)`가 참이면 `$.state(...)`로 감쌉니다. 조건은 `(state 또는 raw_state) && (!analysis.immutable || binding.reassigned || analysis.accessors)`입니다.
- runes 모드에서는 `analysis.immutable = runes || options.immutable`이므로 항상 `true`입니다. 따라서 재할당(`reassigned`)이 있을 때만 source가 생깁니다.
- 안전한 이유: `let`으로 선언한 컴포넌트 지역 변수에 재할당할 수 있는 코드는 모두 같은 파일 안에 있으므로 컴파일러가 전부 볼 수 있습니다. 재할당이 없다면 "변수가 가리키는 값"은 바뀌지 않고, 객체 내부 변경은 proxy가 추적합니다.
- `should_proxy`는 리터럴, 템플릿 리터럴, 함수, 단항/이항 연산, `undefined`면 `false`를 반환합니다(원시값이거나 함수라서 proxy가 의미 없음). 식별자이면 그 바인딩이 재할당되지 않고 초기값이 있을 때 초기값을 따라가서 판단합니다(`seed` → 객체 리터럴 → `true`). 그 외 정체를 모르는 값(함수 호출 결과, prop 등)은 `true`입니다. 런타임 `proxy()`는 proxy할 수 없는 값을 그대로 반환하므로 안전하게 감쌀 수 있습니다.

근거
- `src/compiler/phases/3-transform/client/visitors/VariableDeclaration.js:116-157` (`should_proxy` `:125`, `is_state_source` `:128`)
- `src/compiler/phases/3-transform/client/utils.js:23-28` (`is_state_source`), `:238-269` (`should_proxy`)
- `src/compiler/phases/2-analyze/index.js:380` (`immutable: runes || options.immutable`)
- `src/internal/client/proxy.js:24` (`proxy`)

### Q1.9 `plainObj`가 같이 갱신되는 이유, `plain`이 늦게 반영되는 이유

핵심 포인트
- `04b`: 두 `$.set_text`가 **하나의 `template_effect`** 안에 있습니다. `stateObj.n`이 바뀌면 이 effect가 다시 실행되고, 그 안에서 `plainObj.n`도 다시 읽어서 함께 갱신됩니다. 즉 `plain:`이 바뀌는 것은 반응성 때문이 아니라 같은 effect에 묶였기 때문인 우연입니다.
- `07-events`: "mutates a plain let" 핸들러는 `plain`(signal 아님)만 바꾸므로 어떤 signal도 변경되지 않고, effect가 다시 실행되지 않아 DOM 변화가 없습니다. 이후 "inline arrow"가 `count`를 바꾸면 같은 effect가 다시 실행되면서 그동안 바뀐 `plain` 값(1)도 함께 반영됩니다. 결과는 `1 0 0` → `1 0 0` → `2 0 1`입니다.
- 컴파일러는 이 상황에 대해 `non_reactive_update` 경고를 냅니다.
- 학습자가 "effect는 읽은 signal이 바뀔 때만 다시 실행되고, 다시 실행되면 effect 전체가 실행된다"는 원리로 설명하면 충분합니다.

근거
- 컴파일 출력의 `$.template_effect(() => { ... })` 블록
- `src/compiler/phases/2-analyze/index.js:595-609` (`non_reactive_update` 경고)

### Q1.10 `$.prop` 플래그와 직접 접근

핵심 포인트
- `PROPS_IS_IMMUTABLE = 1`, `PROPS_IS_RUNES = 2`, `PROPS_IS_UPDATED = 4`, `PROPS_IS_BINDABLE = 8`, `PROPS_IS_LAZY_INITIAL = 16`
  - `3` = IMMUTABLE | RUNES
  - `19` = IMMUTABLE | RUNES | LAZY_INITIAL
  - `7` = IMMUTABLE | RUNES | UPDATED (컴포넌트 안에서 재할당됨)
- runes 모드에서 `is_prop_source`는 `accessors || reassigned || initial(기본값 있음) || updated`일 때만 참입니다. 기본값도 없고 재할당도 없는 prop(`plain`, 기본값 없는 `$bindable()`인 `value`)은 `$$props.plain`처럼 **매번 직접 읽습니다**. `$$props`는 부모가 getter로 넘기므로 직접 읽어도 최신 값을 얻습니다.
- rest prop의 속성 접근(`rest.extra`)도 `$$props.extra`로 바뀝니다. rest 객체를 만들어도 결국 같은 `$$props`에서 읽기 때문입니다.
- 기본값이 단순한 식이 아니면 thunk로 감싸고 LAZY_INITIAL을 켭니다. 인자 없는 함수 호출(`compute()`)은 thunk 대신 함수 자체(`compute`)를 넘기는 최적화입니다. 부모가 값을 넘기면 기본값을 계산할 필요가 없으므로 지연 평가합니다.

근거
- `src/constants.js:8-12`
- `src/compiler/phases/3-transform/client/utils.js:158-216` (`get_prop_source`, LAZY_INITIAL 처리 `:188-205`), `:221-232` (`is_prop_source`)
- `src/compiler/phases/3-transform/client/visitors/VariableDeclaration.js:44-110`
- `src/internal/client/reactivity/props.js:258` (`prop`)

### Q1.11 `$.push`/`$.pop`이 생기는 조건

핵심 포인트
- `should_inject_context = dev || analysis.needs_context || reactive_statements.size > 0 || component_returned_object.length > 0`입니다.
- `needs_context`가 켜지는 경우
  - `$effect`/`$effect.pre` 사용(05). 주석에 따르면 effect가 자기 자신을 무효화할 때 다시 실행할지 runes 모드 여부로 판단하기 때문입니다.
  - "안전하지 않은" 식별자를 호출하거나 그 멤버에 접근할 때. `is_safe_identifier`는 import와 prop/bindable_prop/rest_prop 바인딩을 안전하지 않다고 판단합니다. 06에서는 `rest.extra`(rest_prop 멤버 접근)가 원인입니다. 지역 함수 `format()` 호출(03)은 안전합니다.
- 이유: import한 함수나 prop의 getter가 `getContext`, `setContext`, `onMount` 같은 context 의존 함수를 간접적으로 호출할 수 있으므로, 가능성이 있으면 context를 만듭니다. 가능성이 없으면 `push`/`pop`(context 객체 생성, 스택 조작)을 생략해서 단순한 컴포넌트의 비용을 줄입니다.
- 실험 결과(학습자가 확인할 수 있는 것): `let { a = 1 } = $props(); {a}` → push 없음, `let { ...rest } = $props(); {rest.x}` → push 있음.

근거
- `src/compiler/phases/3-transform/client/transform-client.js:406-419`
- `src/compiler/phases/2-analyze/visitors/CallExpression.js:19-22`, `:104-106`
- `src/compiler/phases/2-analyze/visitors/MemberExpression.js:24-25`
- `src/compiler/phases/2-analyze/visitors/shared/utils.js:157-176` (`is_safe_identifier`)
- `src/internal/client/runtime.js:1008` (`push`), `:1040` (`pop`)

---

## 1-C. 업데이트 단위

### Q1.12 `03-text-kinds.svelte`의 텍스트 분류

핵심 포인트
- (a) `constant: {name}`: 상태를 읽지 않으므로 `p.textContent = ...`로 한 번 설정합니다.
- (b) `state: {count}`, `mixed: ...`, `{count}`: 상태만 읽고 함수 호출이 없으므로 `state.update`에 쌓였다가 Fragment 끝에서 하나의 `template_effect`로 묶입니다.
- (c) `call: {format(count)}`: 함수 호출이 있으므로(`has_call`) 즉시 자신만의 `template_effect`를 만듭니다(`build_update`).
- (d) `two calls: ...`: 한 텍스트 안에 호출이 2개 이상이면 각 호출을 `$.derived`(`stringified_text`)로 감싸서, 한쪽만 바뀌었을 때 다른 호출을 다시 계산하지 않게 합니다.
- 단독 `{count}`는 템플릿 리터럴로 감싸지 않고 값을 바로 `set_text`에 넘깁니다.

근거
- `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:80-86`
- `src/compiler/phases/3-transform/client/visitors/shared/utils.js:41-102` (단독 표현식 `:82-85`, 다중 호출 derived `:64-81`), `:107-121`
- `src/compiler/phases/3-transform/client/visitors/Fragment.js:192-194` (`state.update` → `build_render_statement`)

### Q1.13 `12-grouped-effect.svelte` 예측

핵심 포인트
- `a++`: 공용 effect가 다시 실행되어 `set_text`는 2번 호출되지만, DOM에 기록되는 텍스트는 `a:` 하나뿐입니다. `b:` 텍스트는 `__t` 캐시와 같은 값이라 기록하지 않습니다. `expensive()`는 별도 effect에 있고 `b`만 읽으므로 실행되지 않습니다.
- `b++`: 두 effect가 모두 다시 실행되어 `b:`와 `b via call:`이 바뀌고 `expensive(1)`이 한 번 실행됩니다.
- 실행 결과에서 `expensive(1) evaluated` 로그는 `b++` 단계 보고 제목 위에 출력됩니다(로그는 단계 실행 중에, 보고는 단계 후에 출력되기 때문입니다). 학습자가 이 로그를 `a++` 단계의 것으로 오해했다면 바로잡아 주세요.

근거
- `src/internal/client/render.js:50-59` (`set_text`의 `__t` 비교)
- `src/internal/client/dom/operations.js:49-50` (`Text.prototype.__t` 초기화)

### Q1.14 묶는 이유와 떼어 내는 이유

핵심 포인트
- 묶는 이유: effect 하나마다 effect 객체, 부모와의 연결, 의존성 배열 같은 관리 비용이 생깁니다. 상태를 읽는 단순한 표현식은 다시 계산해도 싸고, `set_text`가 같은 값이면 DOM 기록을 생략하므로 묶어도 손해가 작습니다.
- 떼어 내는 이유: 함수 호출은 비용이 얼마나 클지 알 수 없고 부수 효과가 있을 수 있으므로, 관련 없는 상태 변경 때문에 다시 호출되지 않도록 독립된 effect로 분리합니다. 같은 텍스트에 호출이 여러 개면 derived로 각각 메모이즈합니다.
- 모든 텍스트에 effect를 하나씩 만들면 effect 수와 의존성 연결이 늘어나서 메모리와 생성 비용이 커집니다.

근거
- Q1.12, Q1.13 근거와 동일
- (선택) `src/internal/client/reactivity/effects.js:86` (`create_effect`)를 언급하면 가산점

### Q1.15 `__click`과 `$.event`, hoisting

핵심 포인트
- `click`은 `DELEGATED_EVENTS`에 있으므로 `element.__click = ...`으로 저장합니다. `scroll`, `focus`는 목록에 없으므로 `$.event("scroll", div, ...)`로 직접 등록합니다.
- hoisting이 가능하면 핸들러를 모듈 최상위로 옮기고, 핸들러가 참조하는 컴포넌트 지역 값(예: signal `count`)을 배열의 나머지 원소로 넘깁니다(`[fn, count]`). 런타임은 `fn.apply(el, [event, ...data])`로 호출하므로 핸들러 시그니처가 `(_, count)`가 됩니다.
- hoisting이 불가능하면 함수를 그대로 저장합니다(`button_3.__click = () => plain += 1`). 이 예제에서는 `plain`이 signal이 아닌 일반 지역 변수(`kind === 'normal'`)인데 변경되므로, 값을 인자로 복사해 넘기면 대입이 원래 변수에 반영되지 않습니다. 그래서 클로저를 유지해야 합니다.
- 이름 있는 함수(`increment`)도 조건을 만족하면 함수 선언 자체가 모듈 최상위로 옮겨집니다.
- 학습자가 hoisting 불가 조건으로 "파라미터가 2개 이상", "`arguments` 사용", "each 블록 인덱스 참조", "export된 함수" 중 몇 가지를 찾아냈다면 가산점입니다.

근거
- `src/utils.js:110-142` (`DELEGATED_EVENTS`, `is_delegated`)
- `src/compiler/phases/2-analyze/visitors/Attribute.js:72-210` (`get_delegated_event`, normal 바인딩 변경 시 bail-out `:196-203`)
- `src/compiler/phases/3-transform/client/visitors/shared/events.js:28-60` (hoisting과 배열 할당), `:61-79` (`$.event`, `after_update`에 추가)
- `src/internal/client/dom/elements/events.js:219-226` (배열이면 `apply`)

### Q1.16 위임 경로 추적

핵심 포인트
1. 모듈이 로드될 때 `$.delegate(["click"])`가 `all_registered_events`에 이벤트 이름을 추가하고, 이미 마운트된 루트가 있으면 `root_event_handles`의 함수들을 호출해 리스너를 추가합니다.
2. `mount` → `_mount`가 `event_handle(all_registered_events)`를 호출해서, 이벤트 이름마다 **마운트 대상(target)에 하나**, **document에 하나**(여러 루트가 공유, 참조 카운트로 관리) `handle_event_propagation` 리스너를 등록합니다. 이후 로드되는 컴포넌트를 위해 `event_handle`을 `root_event_handles`에 넣어 둡니다.
3. 클릭이 일어나면 `handle_event_propagation`이 `composedPath`와 `__root` 표시로 중복 처리를 막으면서, 이벤트 대상에서 시작해 부모 방향(`assignedSlot`, `parentNode`, `host`)으로 올라가며 각 노드의 `__click`을 읽습니다. 배열이면 `fn.apply(current_target, [event, ...data])`, 함수면 `call`합니다. `disabled` 요소는 건너뜁니다.
- 따라서 요소 개수와 관계없이 이벤트 종류마다 리스너는 target에 1개, document에 1개입니다.

근거
- `src/internal/client/dom/elements/events.js:10-13`, `:123-135` (`delegate`), `:138` (`handle_event_propagation`), `:209-226`
- `src/internal/client/render.js:188-222` (`_mount`, `event_handle`), `:206`, `:213`

### Q1.17 위임과 hoisting의 이점과 대가

핵심 포인트
- 이점: 요소마다 `addEventListener`를 호출하지 않으므로 생성과 정리 비용이 줄어듭니다. hoisting하면 컴포넌트 인스턴스마다 새 클로저를 만들지 않아도 됩니다.
- `scroll`, `focus`는 버블링하지 않는 이벤트라서 상위에서 받을 수 없으므로 위임할 수 없습니다(`focusin`/`focusout`은 버블링하므로 목록에 있습니다).
- `on:` 디렉티브는 `OnDirective.js`에서 항상 `build_event`를 호출하므로 위임되지 않습니다. 수식어와 Svelte 4의 리스너 등록 의미(요소에 직접 등록되는 리스너)를 유지하기 위한 것으로 볼 수 있습니다. 이 부분은 코드에 이유가 명시되어 있지 않으므로, 학습자가 합리적인 추론을 제시하면 인정합니다.
- `13-delegation-order`: 위임된 핸들러는 이벤트가 루트(마운트 대상 또는 document)까지 버블링된 **뒤에** 실행됩니다. 그래서 중간 요소(`<div>`)에 직접 등록한 리스너가 먼저 실행되고, 버튼 핸들러의 `stopPropagation()`은 이미 실행된 그 리스너를 막을 수 없습니다. 실행 결과 로그 순서는 "native listener on `<div>`" → "delegated onclick on `<button>`"입니다.
- 대가: 이벤트 순서가 일반 DOM과 다를 수 있고, 위임 대상이 아닌 이벤트와 섞어 쓸 때 주의해야 합니다. 공식 문서의 event delegation 절이 이 주의 사항을 다룹니다.

근거
- `src/utils.js:110-134`
- `src/compiler/phases/3-transform/client/visitors/OnDirective.js` (항상 `build_event`)
- `src/internal/client/render.js:206`, `:213` (리스너는 루트에만 있음)
- `playground/01-compiled-output/13-delegation-order.svelte` 실행 결과

---

## 1-D. 블록, 컴포넌트, 다른 출력 모드

### Q1.18 `08-blocks.svelte`

핵심 포인트
- `21` = `EACH_ITEM_REACTIVE(1) | EACH_IS_CONTROLLED(4) | EACH_ITEM_IMMUTABLE(16)`입니다. `items`가 컴포넌트 상태라서 ITEM_REACTIVE, `<ul>`의 유일한 자식이라서 IS_CONTROLLED, runes 모드라서 ITEM_IMMUTABLE입니다.
- `{#each}`가 요소의 유일한 자식이면 "controlled"로 표시되어 템플릿에 `<!>`를 넣지 않고, 런타임이 부모 요소(`ul`)에 빈 텍스트 노드를 `appendChild`해서 anchor로 씁니다. 최상위 `{#if}`와 `<Child>`는 템플릿의 `<!>` 주석을 anchor로 씁니다.
- 하위 컴포넌트는 `Child(node_1, { label: "hello", children: ($$anchor, $$slotProps) => {...}, $$slots: { default: true } })`처럼 **일반 함수 호출**입니다. `new`나 클래스가 없습니다. children 내용은 anchor를 받아 DOM을 만드는 함수(snippet)로 전달되고, `Child`는 `$.snippet(node, () => $$props.children ?? $.noop)`으로 렌더링합니다.
- `<p>hidden</p>`은 if 블록의 anchor 주석 **앞**에 삽입됩니다(`anchor.before(dom)`). mount 출력의 HTML에서 `<!----><p>hidden</p><!---->` 중 두 번째 주석이 anchor이고, 첫 번째는 Q1.4의 시작 주석입니다.

근거
- `src/constants.js:1-6`
- `src/compiler/phases/3-transform/client/visitors/EachBlock.js:34-36` (`<!>` 조건), `:42-98` (플래그)
- `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:102-103` (`is_controlled`)
- `src/internal/client/dom/blocks/each.js:118-126`
- `src/internal/client/dom/template.js:239-252` (`append`, `anchor.before` `:251`)
- `src/internal/client/dom/blocks/snippet.js:26`

### Q1.19 server 출력과 hydration 마커

핵심 포인트
- 서버 출력은 `$$payload.out += ...` 문자열 연결만 하며 signal, effect, 템플릿 복제가 없습니다. `$state`는 일반 변수, `$derived`는 일반 계산식이 됩니다.
- `<!--[-->`(`HYDRATION_START`): 블록 시작, if 블록에서는 consequent가 렌더링되었다는 뜻입니다. `<!--[!-->`(`HYDRATION_START_ELSE`): if 블록의 else 분기가 렌더링되었다는 뜻입니다. `<!--]-->`(`HYDRATION_END`): 블록 끝이며 client의 블록 anchor `<!>` 자리에 대응합니다. `<!---->`(`EMPTY_COMMENT`): 컴포넌트처럼 시작/끝 표시 없이 anchor만 필요한 자리에 대응합니다.
- hydration 중 `if_block`은 시작 주석의 `data`가 `[!`인지 확인해 서버가 어느 분기를 렌더링했는지 알아냅니다. client에서 계산한 조건과 다르면(`condition === is_else`) 해당 범위의 노드를 지우고 hydration을 끈 뒤 새로 렌더링합니다.

근거
- `src/constants.js:21-24`
- `src/internal/server/hydration.js:3-6`
- `src/compiler/phases/3-transform/server/visitors/IfBlock.js:21-24`
- `src/internal/client/dom/blocks/if.js:22-58` (`is_else` `:47`, 불일치 처리 `:49-57`)

### Q1.20 legacy와 dev 출력

핵심 포인트
- legacy vs runes
  - legacy는 `let count = 0`을 `$.mutable_state(0)`으로 만듭니다. 재할당 여부를 따지지 않고, 최상위 `let`을 모두 상태로 취급합니다. runes는 `$.state(0)`입니다.
  - `$: double = count * 2`는 `$.mutable_state()` 선언과 `$.legacy_pre_effect(() => $.get(count), () => $.set(double, ...))`, `$.legacy_pre_effect_reset()`이 됩니다. runes의 `$derived`는 `$.derived(() => ...)`입니다.
  - legacy의 `on:click`은 `$.event("click", button, ...)`로 직접 등록되고, runes의 `onclick`은 `__click` + `$.delegate`로 위임됩니다.
  - legacy는 `$.push($$props, false)`(runes 아님)를 항상 호출합니다. runes 예제는 context가 필요 없으므로 push가 없습니다.
- dev vs production
  - `$.mark_module_start`/`$.mark_module_end`, `Component[$.FILENAME] = "..."`: 컴포넌트가 정의된 파일을 기록해서 경고와 에러 메시지에 파일 이름을 보여 줍니다.
  - `$.add_locations(template, filename, [[줄, 열], ...])`: 템플릿 요소마다 원본 소스 위치를 붙입니다(개발 도구, 에러 위치 표시).
  - `$.check_target(new.target)`: Svelte 4처럼 `new Component()`로 호출하는 실수를 검사합니다.
  - `$.push($$props, true, Component)`가 항상 생성되고, `$.validate_prop_bindings`, `return $.pop({ ...$.legacy_api() })`가 추가됩니다(legacy API를 쓰면 안내 메시지를 내기 위한 것).
  - 재할당 시 `$.proxy(value, null, previous)`처럼 이전 값을 넘깁니다(dev 전용 소유권 추적 정보).

근거
- `src/internal/client/reactivity/sources.js:96` (`mutable_state`)
- `src/internal/client/reactivity/effects.js:263` (`legacy_pre_effect`), `:283`
- `src/compiler/phases/3-transform/client/transform-client.js:406-419` (`dev`가 조건에 포함)
- `src/compiler/phases/3-transform/client/visitors/Fragment.js:94-106` (dev에서 `$.add_locations`)
- `src/compiler/phases/3-transform/client/utils.js:52-54` (`build_proxy_reassignment`)
- `src/internal/client/dev/legacy.js:7` (`check_target`), `src/internal/client/dev/elements.js:11` (`add_locations`)
