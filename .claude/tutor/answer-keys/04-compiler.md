# 4단계 answer key: 컴파일러

> 스포일러: 학습자는 열람하지 않는 것을 권장합니다.

모든 경로는 `svelte/packages/svelte/` 기준이고, 줄 번호는 `svelte@5.0.0` 기준입니다. 핵심 포인트를 모두 말하지 못해도, 근거(`file:line` 또는 실험 출력)를 제시하면서 핵심의 절반 이상을 설명했다면 통과로 봅니다.

## 4-A. 파이프라인과 parse

### Q4.1 파이프라인과 각 단계의 자료구조
- `compile()`(`src/compiler/index.js:22-52`): `remove_bom` → `validate_component_options` → `state.reset` → `_parse(source)`(28행, 문자열 → `AST.Root`) → `<svelte:options>` 병합 → TS 노드 제거(39-46행) → `analyze_component(parsed, source, options)`(48행, → `ComponentAnalysis`) → `transform_component(analysis, source, options)`(49행) → `result.ast = to_public_ast(...)`(50행).
- `transform_component`(`src/compiler/phases/3-transform/index.js:17-58`): `client_component` 또는 `server_component`가 ESTree `Program`을 만들고(30-33행), esrap의 `print`(36행)가 `{ code, map }`을 만듭니다. CSS는 `render_stylesheet`(44-47행)가 따로 만듭니다.
- 문자열 대신 AST를 만드는 이유(두 가지 이상이면 통과):
  - 사용자 표현식은 parse 단계에서 이미 ESTree 노드이므로, 출력 AST에 그 노드를 그대로 끼워 넣을 수 있습니다. 문자열로 다루면 괄호와 연산자 우선순위를 직접 관리해야 합니다.
  - 원본 노드의 위치 정보가 남아 있으므로 esrap이 source map을 만들 수 있습니다(`sourceMapContent`, `sourceMapSource` 옵션).
  - 변환이 "노드 교체"로 표현되므로 visitor끼리 조합하기 쉽고, 들여쓰기와 세미콜론 같은 출력 형식은 printer 한 곳에서 책임집니다.

### Q4.2 자동으로 닫히는 태그
- `<div>`는 두 번째 `<p>`의 형제가 되고(`<p>`가 `<div>` 직전에 닫힘), `<li>` 두 개는 모두 `<ul>`의 자식이자 서로 형제입니다. 브라우저의 HTML 파서와 같은 결과입니다.
- 근거: `src/compiler/phases/1-parse/state/element.js:174-181`에서 `closing_tag_omitted(parent.name, name)`이 참이면 부모를 `parser.pop()`으로 닫고 `last_auto_closed_tag`를 기록합니다. 규칙 자체는 `src/html-tree-validation.js`에 있습니다.
- 필요한 이유: client 출력의 template 문자열은 런타임에 브라우저가 다시 파싱합니다(`$.template` → `create_fragment_from_html`). 컴파일러가 생각한 트리와 브라우저가 만든 트리가 다르면 `$.child`, `$.sibling(x, n)` 같은 탐색 경로가 엉뚱한 노드를 가리킵니다. hydration에서도 server가 만든 HTML 구조와 client의 탐색 경로가 일치해야 합니다.

### Q4.3 표현식의 끝 찾기
- 파서는 `}`를 세지 않습니다. `read_expression`(`src/compiler/phases/1-parse/read/expression.js:11-44`)은 **템플릿 전체 문자열**과 현재 위치를 `parse_expression_at(parser.template, parser.ts, parser.index)`(13행)에 넘기고, acorn의 `parseExpressionAt`(`src/compiler/phases/1-parse/acorn.js:37-52`)이 완결된 표현식 하나를 읽은 뒤 멈춘 위치(`node.end`)를 사용합니다.
- 장점: 문자열, 템플릿 리터럴, 정규식, 객체 리터럴 안의 중괄호를 JS 문법에 맞게 정확히 처리합니다. 별도의 토크나이저를 만들 필요가 없습니다.
- `num_parens`(15-36행): acorn은 기본적으로 괄호를 AST에 남기지 않으므로, `{(a)}`에서 `node.start`는 `a`의 위치이고 `node.end`는 `)` 앞입니다. `parser.index`부터 `node.start`까지 여는 괄호 개수를 세고, `node.end` 뒤에서 같은 개수의 닫는 괄호를 소비합니다. 그렇지 않으면 파서가 `)`에서 `}`를 기대하다가 실패합니다.
- 뒤따르는 주석(`trailingComments`)이 있으면 그 끝으로 위치를 옮기는 처리(21-24행)도 함께 언급하면 좋습니다.

### Q4.4 상태 기계와 stack, fragments
- 메인 루프: `src/compiler/phases/1-parse/index.js:84-86`의 `state = state(this) || fragment`. 상태 함수가 아무것도 반환하지 않으면 `fragment`로 돌아갑니다.
- `<p>hello {name}</p>`의 흐름:
  1. `fragment` → `<`를 보고 `element` 반환(`state/fragment.js:7-17`).
  2. `element`: `<p>`를 읽고 `parser.append(element)`로 Root의 fragment에 추가한 뒤, `parser.stack.push(element)`, `parser.fragments.push(element.fragment)`(`element.js:358-361`).
  3. `fragment` → `text`: `"hello "`를 읽어 현재 fragment(`p.fragment`)에 append(`state/text.js:6-23`).
  4. `fragment` → `tag`: `{name}`을 읽고 `ExpressionTag`를 append(`state/tag.js:15-46`).
  5. `fragment` → `element`: `</p>`를 만나 `parser.pop()`이 `fragments`와 `stack`을 하나씩 pop(`index.js:259-262`, `element.js:92-98` 부근).
- 둘을 따로 두는 이유: 한 노드가 여러 Fragment를 가질 수 있습니다. `{#if}`의 `{:else}`에서 `tag.js`의 `next()`(330행 이후)는 `stack`은 그대로 둔 채 `fragments`만 pop하고 `block.alternate`를 push합니다. `{:else if}`는 새 IfBlock을 stack에 push하면서 fragment도 교체합니다. 즉 "현재 열린 노드"와 "자식을 추가할 Fragment"가 독립적으로 바뀝니다. `append`(269-290행)는 `fragments.at(-1)`에 추가하고 `parent`는 `stack`의 맨 위로 설정합니다.

### Q4.5 스크립트 앞부분을 공백으로 채우는 이유
- `src/compiler/phases/1-parse/read/script.js:29-30`: 스크립트 앞의 모든 문자를 공백으로 바꾸고 줄바꿈은 유지합니다. 그 결과 acorn이 매기는 `start`, `end`, 그리고 `locations: true`(`acorn.js:22`)로 생기는 `loc.line`, `loc.column`이 **원본 파일 기준 좌표**와 일치합니다.
- 제거하면 깨지는 것(두 가지 이상):
  - 스크립트 안의 문법 오류와 경고가 엉뚱한 줄과 열을 가리킵니다(`js_parse_error`는 `err.pos`를 그대로 사용, `index.js:147-149`).
  - analyze가 위치 비교에 의존하는 코드가 오동작합니다. 예: store 참조가 module 스크립트 안에 있는지 `node.start > module.ast.start`로 판단(`2-analyze/index.js:338-349`), legacy 모드에서 instance import를 판별(`client/visitors/Program.js:21-25`).
  - source map이 원본 위치와 어긋납니다. `svelte-ignore` 주석의 위치(`extract_svelte_ignore`에 넘기는 `comment.start`)도 틀어집니다.
- 줄바꿈을 남기는 이유: 줄 번호(`loc.line`)도 맞추기 위해서입니다.

### Q4.6 parse와 analyze의 책임 분리
- parse 단계 에러 예: `block_unclosed`, `element_unclosed`(`1-parse/index.js:88-98`), `expected_token`(`index.js:161-163`), `unexpected_eof`, `js_parse_error`, `render_tag_invalid_expression`(`state/tag.js`).
- analyze 단계 에러 예: `rune_missing_parentheses`(`2-analyze/visitors/Identifier.js:73`, `{$state}`에서 실제로 발생), `state_invalid_placement`(`CallExpression.js:83`, `EachBlock.js:21`), `props_invalid_identifier`, `props_invalid_pattern`(`VariableDeclarator.js:50-80`).
- rune 판정에는 스코프 정보가 필요합니다. `get_rune`(`scope.js:732-762`)은 그 이름이 지역 변수로 선언되었으면 rune이 아니라고 판단합니다(759-760행). 이 정보는 파싱이 모두 끝난 뒤에야 알 수 있습니다.
- 이점: `parse()`는 의미 검사 없이 구조만 돌려주므로 prettier 플러그인, language server, 마이그레이션 도구가 "의미상 틀렸지만 문법은 맞는" 코드도 다룰 수 있습니다. 각 단계의 책임이 작아져서 테스트(`tests/parser-modern` 등)와 유지보수가 쉬워집니다.

## 4-B. analyze

### Q4.7 binding kind가 두 번에 걸쳐 정해짐
- 기대하는 표(`bindings.mjs` 출력): `label`, `initial`은 `prop`, `count`는 `state`(reassigned), `todo`는 `state`(mutated), `user`는 `state`(reassigned), `point`는 `raw_state`(reassigned), `double`은 `derived`, `plain`은 `normal`(reassigned).
- 1차: `create_scopes`(`scope.js:233` 이후)는 변수 선언을 대부분 `'normal'`로 declare합니다. `Binding` 객체 생성은 `Scope.declare`(`scope.js:79-118`).
- 2차: analyze 순회 중 `VariableDeclarator` visitor(`2-analyze/visitors/VariableDeclarator.js:17-48`)가 `get_rune`으로 rune을 판별하고 `binding.kind`를 `state`, `raw_state`, `derived`, `prop`, `rest_prop`으로 바꿉니다.
- TODO 주석의 의미: kind는 선언의 성질이므로 scope를 만들 때 정하는 것이 자연스럽지만, `get_rune`은 "그 이름이 지역 선언이 아닌가"를 확인해야 해서 모든 선언을 다 본 뒤에야 정확하게 판단할 수 있습니다. 또한 runes 모드 여부(`analysis.runes`)도 scope 생성 이후에 결정됩니다(`2-analyze/index.js:361`).

### Q4.8 runes 모드 판별
- 결과: 1번 `false`, 2번 `true`, 3번 `true`, 4번은 `rune_missing_parentheses` 에러로 컴파일 실패(runes 판별 자체는 `true`가 된 뒤 analyze visitor에서 에러).
- 근거: `2-analyze/index.js:361`의 `options.runes ?? Array.from(module.scope.references.keys()).some(is_rune)`.
- module 스코프를 보는 이유: `analyze_component`(266-272행)는 module 스코프 → instance 스코프 → template 스코프 순서로 부모-자식 관계를 만듭니다. `Scope.reference`(`scope.js:184` 이후)는 선언을 찾지 못하면 부모에게 참조를 넘기므로, `$state`처럼 어디에도 선언되지 않은 이름의 참조는 결국 최상위인 module 스코프의 `references`에 모입니다. 따라서 module 스코프 하나만 보면 컴포넌트 전체(스크립트 두 개와 템플릿)에서 rune 이름이 쓰였는지 알 수 있습니다.
- 2번이 `true`인 이유: 판별은 정적인 "참조 존재 여부"로 하며, 실행 여부와 무관합니다.
- 명시적으로 `<svelte:options runes={...} />`나 컴파일 옵션 `runes`가 있으면 자동 판별보다 우선합니다(`??`).

### Q4.9 legacy 모드와 runes 모드
- Legacy: `let count = $.mutable_state(0)`, 읽기는 `$.get(count)`, 핸들러는 끌어올려져 `$.update(count)`, 갱신은 `template_effect`로 처리됩니다. 화면이 갱신됩니다.
- Runes: `let count = 0`이 그대로 남고, `button.textContent = count`로 한 번만 대입됩니다. 핸들러는 `() => (count += 1) - 1`이고 화면은 갱신되지 않습니다. 경고 `non_reactive_update`가 나옵니다.
- 근거: legacy는 `2-analyze/index.js:469-486`에서 "재할당/변경되었고 템플릿(`Fragment`)이나 `$:`에서 참조되는 normal binding"을 `kind = 'state'`로 승격합니다. runes는 같은 조건을 `2-analyze/index.js:573-612`에서 검사하되 승격하지 않고 `w.non_reactive_update`(601, 609행)만 냅니다. legacy에서 `state` binding은 client `VariableDeclaration.js`의 legacy 분기(약 297, 312행)에서 `$.mutable_state`가 됩니다.
- `unused_but_reassigned`에 경고가 없는 이유: 템플릿에서 참조되지 않습니다. 경고 조건은 "참조 경로가 `Fragment`로 시작하고, 함수 안이 아닌 곳"입니다(577-610행). legacy에서도 템플릿 참조가 없으므로 승격되지 않습니다.
- 설계 의도: runes는 반응성을 명시적으로 선언하게 하여, 컴파일러의 추론에 기대는 암묵적인 규칙(Svelte 4의 "최상위 `let`은 반응적")을 없앴습니다. 대신 실수를 잡기 위해 같은 정보로 경고를 냅니다.

### Q4.10 지연 처리와 reassigned, mutated
- 근거: `scope.js:688-717`. 순회 중에는 `references.push([scope, {node, path}])`, `updates.push([scope, node])`만 하고, 순회가 끝난 뒤 `scope.reference()`를 호출하고 updates를 처리합니다. 주석: "we do this after the fact, so that we don't need to worry about encountering references before their declarations".
- 지연 처리가 없으면 깨지는 예: 함수 본문이 나중에 선언되는 변수를 참조하는 경우.
  ```js
  function inc() { count += 1; }
  let count = $state(0);
  ```
  `inc` 본문을 순회하는 시점에는 `count`가 아직 declare되지 않았으므로 참조가 부모 스코프로 넘어가 전역처럼 취급됩니다. 그러면 binding의 `references`와 `reassigned`가 누락되어 `$.state`로 감싸지지 않는 등 출력이 틀어집니다. 함수 선언 hoisting, 템플릿보다 아래에 있는 선언 등 비슷한 예도 정답입니다.
- reassigned와 mutated의 구분(697-708행): `object(expression)`(`src/compiler/utils/ast.js:11-21`)으로 MemberExpression의 가장 바깥 객체 식별자를 찾습니다. 그 식별자가 갱신 대상 표현식 자체이면(`count = ...`) `reassigned`, 멤버를 통한 변경이면(`todo.done = ...`) `mutated`입니다. 둘 중 하나면 `updated`도 `true`가 됩니다.
- `todo`의 mutated는 템플릿의 `bind:checked={todo.done}`에서 옵니다. `scope.js:655-661`의 `BindDirective` visitor가 바인딩 표현식을 `updates`에 넣습니다.

### Q4.11 has_state와 has_call
- 설정 위치:
  - `2-analyze/visitors/Identifier.js:91-94`: binding이 있으면 `dependencies`에 추가하고 `has_state ||= binding.kind !== 'normal'`.
  - `2-analyze/visitors/CallExpression.js:173-181`: 순수하지 않은 호출이거나 의존성이 하나라도 있으면 `has_call = true`, `has_state = true`.
  - `2-analyze/visitors/MemberExpression.js:20-22`: 순수하지 않은 멤버 접근이면 `has_state = true`.
  - 그 밖에 `TaggedTemplateExpression.js:11-12`, 속성 값 여러 조각을 합치는 `Attribute.js:38-39`, `StyleDirective.js`.
  - `ExpressionTag.js:22`가 `context.next({ ...state, expression: node.metadata.expression })`로 "현재 기록할 메타데이터 객체"를 하위 순회에 내려 줍니다.
- 1번: 판단 기준은 재할당 여부가 아니라 `kind`입니다. `greeting`은 `const`로 선언된 normal binding이고, `name`은 `$state`로 선언되었으므로 `kind: 'state'`입니다. 재할당 여부는 transform 단계에서 `is_state_source`가 따로 판단합니다(Q4.15). analyze는 "이 표현식이 상태에 의존할 수 있는가"를 보수적으로 기록합니다.
- 2번: 컴파일러는 함수 본문 안에서 어떤 상태를 읽을지 알 수 없으므로 호출이 있으면 상태에 의존한다고 가정합니다. TODO 주석(`CallExpression.js:174-177`)은 "의존성이 상태가 아닐 수도 있고(issue #13266), 호출 바깥의 의존성(`{blah && pure()}`)까지 포함되어 false positive가 생기지만 그 트레이드오프를 받아들인다"고 말합니다.

## 4-C. client transform

### Q4.12 StateKinds 출력 표
| 이름 | 선언 | 읽기 | 쓰기 |
|---|---|---|---|
| `count` | `$.state($.proxy(initial()))` | `$.get(count)` | `$.update(count)` |
| `todo` | `$.proxy({...})` | `todo.text` 그대로 | `todo.done = $$value` 그대로(`bind_checked`) |
| `user` | `$.state($.proxy({...}))` | `$.get(user).name` | `$.set(user, $.proxy({...}))` |
| `point` | `$.state({...})` (proxy 없음) | `$.get(point).x` | `$.set(point, {...})` (proxy 없음) |
| `double` | `$.derived(() => $.get(count) * 2)` | `$.get(double)` | 없음 |
| `plain` | `0` 그대로 | `plain` 그대로 | `plain += 1` 그대로 |
- `todo`와 `user`의 차이는 Q4.7 표의 `reassigned` 열입니다. 재할당되지 않는 `todo`는 변수 자체가 바뀌지 않으므로 signal로 감쌀 필요가 없고, 반응성은 proxy 내부의 프로퍼티별 source가 담당합니다.
- 추가 관찰: 첫 번째 버튼 핸들러는 normal이면서 updated인 `plain`을 참조하므로 끌어올려지지 않습니다. `user`, `point`의 핸들러는 끌어올려져 `[on_click, user]` 형태가 됩니다.

### Q4.13 shadowing
- `format` 본문의 `count`는 변환되지 않습니다(`` return `#${count}` ``).
- 근거: `src/compiler/phases/3-transform/client/transform-client.js:62-80`의 `visitors._`는 새 스코프에 들어가면 `state.transform`을 복사하고, 그 스코프에서 선언된 이름 중 `kind === 'normal'`(그리고 signal이 아닌 `state`)인 것을 `delete transform[name]`(75행)으로 지웁니다. 매개변수는 `add_params`(`scope.js:263-266`)에서 `'normal'`로 declare됩니다. `build_getter`(`client/utils.js:35-46`)는 `transform`에 이름이 있을 때만 `read`를 적용합니다.
- 이 처리가 없으면: 출력이 `` return `#${$.get(count)}` ``가 됩니다. 매개변수로 받은 값은 숫자이므로 `get(0)`이 호출됩니다. 실제로 확인한 결과, `template_effect` 안에서 숫자가 의존성으로 등록되고 `update_reaction`이 `(deps[i].reactions ??= []).push(...)`(`runtime.js:334`)에서 `TypeError: Cannot create property 'reactions' on number`를 일으키며, 이어지는 정리 과정(`remove_reaction`, `runtime.js:359` 이후)에서도 TypeError가 발생해 **마운트 시점에 컴포넌트가 실패**합니다. reaction 바깥에서 호출되면 `get(5)`는 `undefined`를 돌려줍니다.
- 학습자가 "`#undefined`가 출력된다" 정도까지만 예측했다면, 실험으로 실제로는 크래시가 난다는 점을 확인하도록 유도하세요.

### Q4.14 이벤트 위임과 끌어올리기
| 핸들러 | 위임 | 끌어올림 | 이유 |
|---|---|---|---|
| (a) `onclick={increment}` | 예 | 예: `function increment(_, count)`가 모듈 최상단으로 이동, `[increment, count]` | 함수 선언이 재할당되지 않고 참조가 안전합니다. |
| (b) 인라인 화살표 | 예 | 예: `var on_click = (_, count) => ...`, `[on_click, count]` | 매개변수 1개 이하이고 참조가 모두 안전합니다. |
| (c) `onclick={record}` | 예 | 아니요: `button_2.__click = record` | `record`가 참조하는 `log`가 normal이면서 updated입니다(`Attribute.js:192-203`). |
| (d) `onfocus` | 아니요: `$.event("focus", input, ...)` | 해당 없음 | `focus`는 `DELEGATED_EVENTS`(`src/utils.js:110-134`)에 없습니다. |
| (e) each 안의 `onclick` | 예 | 아니요: `button_3.__click = () => ...` | each의 index를 참조합니다(`binding.initial?.type === 'EachBlock'`, `Attribute.js:190`). |
- 판단 코드: `2-analyze/visitors/Attribute.js:72-208`의 `get_delegated_event`. 위임 여부는 `is_delegated(event_name)`(74행), 끌어올림 실패는 `return unhoisted`(63행 정의). 그 밖의 조건: spread 속성이 있는 요소, 매개변수가 2개 이상, `arguments`나 `$host` 사용, store 구독 참조, module 스코프와 이름 충돌, export된 함수.
- 배열 형태: client `visitors/shared/events.js:28-57`이 끌어올린 함수와 `hoisted_params`(함수가 참조하는 지역 signal)를 배열로 만듭니다. 런타임 `src/internal/client/dom/elements/events.js:219-224`는 `current_target['__' + event_name]`이 배열이면 `fn.apply(current_target, [event, ...data])`로 호출합니다. 끌어올린 함수는 인스턴스의 지역 변수를 클로저로 잡을 수 없으므로, signal을 인자로 받아야 합니다. 그래서 출력의 매개변수가 `(_, count)`입니다.
- 이점: 핸들러 함수 객체가 모듈당 하나만 만들어집니다. `{#each}`로 1,000개를 만들어도 클로저 1,000개를 만들지 않고 작은 배열만 만듭니다. 위임 덕분에 요소마다 `addEventListener`를 호출하지 않고, `$.delegate(["click"])`(`transform-client.js:556-559`)가 루트에 리스너를 한 번 등록합니다.

### Q4.15 선언 형태의 결정
- `client/visitors/VariableDeclaration.js:116-132`의 `create_state_declarator`: `rune === '$state' && should_proxy(value)`이면 `$.proxy(value)`, `is_state_source(binding, analysis)`이면 `$.state(value)`. 두 조건은 독립적으로 적용됩니다.
  - `count`: proxy 조건 참(CallExpression), source 조건 참(reassigned) → 둘 다.
  - `todo`: proxy 참, source 거짓 → `$.proxy`만.
  - `user`: 둘 다 참 → 둘 다.
  - `point`: `$state.raw`이므로 proxy 조건 거짓, source 참 → `$.state`만.
- `is_state_source`(`client/utils.js:23-28`): `kind`가 `state` 또는 `raw_state`이고, `!analysis.immutable || binding.reassigned || analysis.accessors`. runes 모드에서는 `immutable: runes || options.immutable`(`2-analyze/index.js:380`)이므로 `true`이고, 결국 `reassigned`가 결정합니다.
- `should_proxy`(`client/utils.js:238-269`)는 `Literal`, `TemplateLiteral`, 함수, `UnaryExpression`, `BinaryExpression`, `undefined`만 확실히 proxy가 필요 없다고 판단하고, 식별자는 초기값을 따라가 봅니다. `initial()`은 `CallExpression`이므로 반환값을 정적으로 알 수 없어 `true`입니다.
- 정확성 문제는 아닙니다. 런타임 `proxy()`(`src/internal/client/proxy.js:24-34`)는 객체가 아니거나 `null`이거나 이미 proxy이거나 일반 객체/배열이 아니면 값을 그대로 돌려줍니다. 비용은 함수 호출 한 번과 `typeof` 검사 정도입니다.
- 3번: 원시값 `$state(0)`이 재할당되지 않으면 값이 영원히 같으므로 상수와 동일합니다. 객체 `$state({...})`가 재할당되지 않으면 변수가 가리키는 proxy 객체는 바뀌지 않고, 변경은 `todo.done = ...`처럼 proxy를 통해서만 일어나며 proxy 내부의 프로퍼티별 source가 추적합니다. 따라서 변수 자체를 signal로 감쌀 필요가 없고, `$.get` 호출과 source 객체 생성을 아낄 수 있습니다.

### Q4.16 template 문자열과 탐색 코드
- 공백 한 칸: `client/visitors/shared/fragment.js:62-87`의 `flush_sequence`가 표현식이 들어간 텍스트 시퀀스마다 `state.template.push(' ')`(69행)를 합니다. HTML 파서는 빈 요소에 텍스트 노드를 만들지 않으므로, `$.child(button)`이 잡을 텍스트 노드를 미리 만들어 두는 것입니다. 이후 `$.set_text`가 그 노드의 `nodeValue`를 바꿉니다.
- `<!>`: `client/visitors/IfBlock.js:11`이 `context.state.template.push('<!>')`를 합니다(each, await, key, html, render, component도 마찬가지). 빈 주석 노드는 블록의 앵커가 되어, 블록 내용이 그 앞에 삽입됩니다(3단계).
- 공백 정리: `3-transform/utils.js:144` 이후의 `clean_nodes`. 앞뒤 공백을 제거하고, 텍스트와 비텍스트 사이의 공백을 한 칸으로 줄이며, `select`, `table` 같은 일부 부모 안에서는 공백만 있는 텍스트를 아예 제거합니다.
- 끌어올림: `client/visitors/Fragment.js:94-106`의 `add_template`이 `context.state.hoisted.push(b.var(template_name, call))`(105행)를 하고, `transform-client.js:474-486`이 hoisted 문장을 모듈 본문에 합칩니다. 런타임 `$.template`(`src/internal/client/dom/template.js:27-60`)은 처음 호출될 때 HTML을 한 번만 파싱해 두고 이후에는 `cloneNode(true)`만 합니다. 인스턴스를 여러 개 만들어도 HTML 파싱은 모듈당 한 번입니다.
- `2`: `process_children`의 `skipped` 변수(`shared/fragment.js:19`)입니다. `flush_node`가 노드를 변수로 잡으면 `skipped = 1`(54행)로 초기화하고, 정적 텍스트 시퀀스(64행)나 정적 요소(100-101행)를 지나칠 때마다 1씩 늘립니다. `<button>` 다음의 공백 텍스트 하나를 건너뛰었으므로 `$.sibling(button, 2)`가 됩니다.

### Q4.17 텍스트 갱신 전략
- 분류:
  - `static: {greeting} {1 + 1}`: 상태도 호출도 없으므로 `p.textContent = ...`로 한 번만 대입합니다. 요소의 자식이 텍스트와 표현식뿐이고 상태가 없을 때 적용되는 최적화로, `client/visitors/RegularElement.js:357-372`가 자식 텍스트 노드를 탐색하지 않고 `textContent`에 바로 대입합니다. 그래서 template 문자열에서도 이 `<p>`는 `<p></p>`로 비어 있습니다. 다른 노드와 섞인 일반적인 경우는 `flush_sequence`의 `else` 분기(`shared/fragment.js:85`, `nodeValue` 대입)입니다.
  - `state A`, `state B`: `has_state`만 참이므로 `state.update`에 쌓였다가 `Fragment.js:192-194`의 `build_render_statement`가 하나의 `$.template_effect(() => { ... })`로 묶습니다.
  - `call: {shout(name)}`: `has_call`이 참이므로 `build_update`(`shared/utils.js:107-114`)로 **자신만의** `template_effect`를 만듭니다(`shared/fragment.js:80-81`).
  - `two calls`: 호출이 2개 이상이므로 `build_template_literal`(`shared/utils.js:41-102`, 특히 62-79행)이 표현식마다 `$.derived(() => expr ?? "")`를 만들고, 그 derived를 읽는 독립 effect를 만듭니다.
- 트레이드오프: effect는 의존성 하나만 바뀌어도 본문 전체를 다시 실행합니다. 비용을 알 수 없는 호출을 공유 effect에 넣으면 무관한 상태가 바뀔 때도 다시 호출됩니다. 그래서 호출은 따로 분리합니다. 호출이 여러 개면 derived로 감싸서 각 호출이 자기 의존성이 바뀔 때만 다시 계산되게 하고, 값이 같으면(`equals`) 전파를 멈춥니다. 반대로 단순한 `$.get` 읽기는 매우 싸므로 effect 하나로 묶어서 effect 개수(메모리, 생성 비용, 그래프 크기)를 줄입니다.
- 3번: 이 예제에서 `name`, `n`은 signal이 아니므로 공유 effect는 처음 실행될 때 의존성이 없습니다. 2단계의 `create_effect`(`src/internal/client/reactivity/effects.js:137-145`)는 동기 effect가 의존성, 자식, DOM 노드, teardown이 모두 없으면 `inert`로 보고 effect 트리에 붙이지 않습니다. 따라서 비용은 effect 객체 생성과 1회 실행 정도이며, 이후 갱신 비용은 없습니다. 컴파일러가 이 경우를 직접 걸러 내지 않는 이유는 analyze의 `has_state`가 `kind` 기준이라 transform 시점의 `is_state_source` 판단과 일치하지 않기 때문입니다. 이 불일치를 지적하면 우수한 답입니다.

### Q4.18 mini-compiler 실험
- 기대 구현:
  - `AssignmentExpression`: `left`가 state 이름인 `Identifier`이면 `$.set(left, visit(right))`를 반환합니다. 복합 대입(`+=`)은 `$.set(x, $.get(x) + v)`로 풀어야 합니다(Svelte는 `client/visitors/AssignmentExpression.js`에서 처리).
  - `UpdateExpression`: `$.update(x)`, 감소면 `$.update(x, -1)`, 전위면 `$.update_pre`(Svelte의 `add_state_transformers`, `shared/declarations.js:43-49`).
  - shadowing: 순회 state에 가려진 이름 집합을 두고, `FunctionDeclaration`/`FunctionExpression`/`ArrowFunctionExpression`에서 매개변수 이름을 추가한 새 state로 `next(new_state)`를 호출합니다. 이름 추가를 함수 선언 visitor에서 처리하면 매개변수 노드 자체가 `$.get`으로 바뀌는 문제도 함께 해결해야 합니다.
- 비교 포인트: Svelte는 analyze 단계에서 모든 스코프와 binding을 미리 만들어 두었기 때문에(`scope.js`), transform 단계는 "스코프에 들어갈 때 transform 맵에서 지울 이름"만 계산하면 됩니다(`transform-client.js:62-80`). 장난감 컴파일러에서는 이 정보를 직접 만들어야 하므로 코드가 금방 복잡해집니다. 학습자가 이 차이를 체감하고 기록했다면 통과입니다.

## 4-D. server와 CSS

### Q4.19 server 출력
- `$state(v)` → `v`, `$derived(e)` → `e`, `$derived.by(fn)` → `fn()`, `$props()` → `$$props`의 구조 분해(`let { initial = 0 } = $$props`). 근거: `src/compiler/phases/3-transform/server/visitors/VariableDeclaration.js:18-95`.
- server 렌더링은 요청 하나에 대해 HTML 문자열을 한 번 만들고 끝나므로, 값이 나중에 바뀌어 다시 그려야 하는 상황이 없습니다. 따라서 signal, effect, 의존성 추적이 모두 필요 없고, 출력은 `$$payload.out += \`...\`` 형태의 문자열 연결입니다(`server/visitors/shared/utils.js:100` 이후의 `build_template`이 인접한 정적 문자열과 표현식을 템플릿 리터럴 하나로 합칩니다).
- `$effect`, `$effect.pre`, `$effect.root` 문장은 server에서 통째로 제거됩니다(`server/visitors/ExpressionStatement.js:10-17`). `$effect.tracking()`은 `false`로 바뀝니다. 실험 결과로 확인했다면 정답입니다.
- `<!--[-->`, `<!--[!-->`, `<!--]-->`: hydration 마커입니다. `src/constants.js`의 `HYDRATION_START`(`[`), `HYDRATION_START_ELSE`(`[!`), `HYDRATION_END`(`]`)이고, server 쪽은 `server/visitors/IfBlock.js:21-27`이 출력합니다. client의 `src/internal/client/dom/blocks/if.js:47`은 hydration 중에 앵커 주석이 `[!`인지 보고 server가 else 분기를 렌더링했는지 판단합니다. `src/internal/client/dom/hydration.js:96` 부근은 블록 경계를 건너뛸 때 이 마커를 사용합니다.

### Q4.20 scoped CSS
- `<p>`에 클래스가 없는 이유: 어떤 selector도 `<p>`와 매칭되지 않았기 때문입니다. `2-analyze/index.js:674-680`은 `analysis.elements`(RegularElement 등이 analyze 중에 쌓임, `visitors/RegularElement.js:27`)의 **요소마다** `prune(stylesheet, element)`(`2-analyze/css/css-prune.js:59`)를 호출해 스타일시트 전체를 순회하며, 매칭된 selector에 `metadata.used = true`, 요소에 `metadata.scoped = true`를 표시합니다. `scoped`인 요소에만 해시 클래스가 붙습니다(693행 이후).
- `.unused`: `css_unused_selector` 경고(`2-analyze/css/css-warn.js`, 호출은 `2-analyze/index.js:690`)가 나오고, 출력 CSS에서는 `/* (unused) .unused { color: red; }*/`처럼 주석 처리됩니다(`3-transform/css/index.js:131-132`). `:global(body)`는 해시 없이 `body`로 출력됩니다.
- 해시 클래스 주입: `2-analyze/index.js:693-730` 부근이 템플릿 AST의 `class` 속성 텍스트에 `` ` ${analysis.css.hash}` ``를 직접 덧붙입니다(718행). TODO 주석(698행)은 "analyze 단계가 client와 server의 차이를 알면 안 되는데, 여기서 `options.generate === 'client'`를 검사하고 있다"는 점, 즉 단계 사이의 책임 경계가 흐려졌다는 점을 지적합니다. analyze가 AST를 수정하므로 같은 AST로 analyze를 두 번 실행하면 클래스가 두 번 붙을 수 있다는 점까지 지적하면 우수한 답입니다.
- 해시 입력: `cssHash` 기본값(`src/compiler/validate-options.js:70-72`)은 `` `svelte-${hash(css)}` ``이고, `css`는 `root.css.content.styles`(`2-analyze/index.js:405` 부근)입니다. 파일 이름은 기본 해시에 쓰이지 않으므로, `<style>` 내용이 완전히 같은 두 컴포넌트는 같은 해시를 갖습니다. 같은 내용의 스타일이므로 서로의 요소에 적용되어도 결과는 같습니다.

## 체크포인트 채점 기준
1. 네 단계와 각 산출물(AST.Root, ComponentAnalysis, ESTree Program, code+map)을 말하고, "의미 판단에는 모든 선언 정보가 필요하다"는 이유로 parse와 analyze가 분리된 점을 설명하면 통과입니다.
2. `$.state` 조건(kind와 reassigned), `$.proxy` 조건(`$state`이면서 `should_proxy`), 그리고 그 정보가 `create_scopes`의 updates 처리와 `VariableDeclarator` visitor에서 온다는 점을 말하면 통과입니다.
3. `has_state`와 `has_call`의 조합과 네 가지 결과를 말하고, 재실행 범위와 effect 개수의 트레이드오프를 언급하면 통과입니다.
4. 위임 조건(`DELEGATED_EVENTS`, 일반 요소, spread 없음)과 끌어올림 조건(인스턴스 지역 상태에 클로저로 의존하지 않음, signal은 인자로 전달)을 구분하면 통과입니다.
5. server는 한 번 렌더링하고 끝나므로 반응성이 필요 없고, 대신 hydration 마커를 남긴다는 점을 말하면 통과입니다.
