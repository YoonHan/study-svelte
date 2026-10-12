# 4단계: 컴파일러

1단계에서는 컴파일러가 만든 출력을 관찰했고, 2~3단계에서는 그 출력이 호출하는 런타임(`$.state`, `$.get`, `$.template_effect`, `$.template`, `$.if` 등)을 읽었습니다. 이 단계에서는 마지막 퍼즐로, `.svelte` 문자열이 어떤 과정을 거쳐 그 출력으로 바뀌는지 컴파일러 코드를 따라갑니다.

Svelte 5 컴파일러는 세 단계로 나뉘어 있습니다. **parse**는 문자열을 AST로 바꾸고, **analyze**는 AST를 순회하면서 "어떤 이름이 무엇을 가리키고, 어떤 표현식이 상태에 의존하는가"를 기록하며, **transform**은 그 기록을 근거로 출력 코드를 만들어 냅니다. 이 단계에서 가장 중요하게 볼 것은 "출력에서 본 각각의 최적화가 analyze 단계의 어떤 정보에 근거해서 결정되는가"입니다.

## 학습 목표

1. `compile()`이 parse → analyze → transform → print를 호출하는 흐름을 설명하고, 각 단계의 입력과 출력이 어떤 자료구조인지 말할 수 있습니다.
2. 템플릿 파서가 상태 함수(`fragment`, `element`, `tag`, `text`)를 전환하는 방식과, 템플릿 안의 JS를 acorn에 넘기는 방식을 설명할 수 있습니다.
3. `Scope`와 `Binding`이 무엇을 기록하는지 설명하고, binding의 `kind`, `reassigned`, `mutated`가 출력 코드를 어떻게 바꾸는지 예를 들어 설명할 수 있습니다.
4. client transform이 template 문자열, DOM 탐색 코드, 갱신 코드(`template_effect`)를 나누어 생성하는 기준을 설명할 수 있습니다.
5. 같은 analysis 결과에서 server 출력과 scoped CSS가 어떻게 만들어지는지 개략적으로 설명할 수 있습니다.

## 사전 자료

- ESTree 명세: <https://github.com/estree/estree>. 컴파일러가 다루는 JS AST의 노드 형식입니다. `Identifier`, `MemberExpression`, `CallExpression` 정도만 알면 충분합니다.
- AST Explorer: <https://astexplorer.net/>. 파서를 `acorn`으로 선택하고 짧은 JS 코드를 넣으면 ESTree 노드를 바로 볼 수 있습니다.
- zimmerframe의 README(npm 패키지 `zimmerframe`). Svelte 컴파일러의 모든 AST 순회는 이 라이브러리의 `walk(node, state, visitors)`로 이루어집니다. 로컬에서는 `svelte/packages/svelte/node_modules/zimmerframe/README.md`로 읽을 수 있습니다.
- (선택) Tan Li Hau의 "The Svelte Compiler Handbook". Svelte 3 기준이라 세부 구현은 다르지만, parse → analyze → generate로 나누는 발상은 같습니다. 제목으로 검색하세요.

## 읽을 코드

모든 경로는 `svelte/packages/svelte/` 기준이며, 줄 수는 `svelte@5.0.0` 기준입니다.

| 파일 | 역할 | 줄 수 |
|---|---|---|
| `src/compiler/index.js` | `compile`, `compileModule`, `parse`의 진입점입니다. 세 단계가 호출되는 순서를 여기서 확인합니다. | 약 170 |
| `src/compiler/phases/1-parse/index.js` | `Parser` 클래스와 상태 함수를 돌리는 메인 루프를 정의합니다. | 약 310 |
| `src/compiler/phases/1-parse/state/` | `fragment.js`, `element.js`, `tag.js`, `text.js`: 파서의 상태 함수입니다. `element.js`와 `tag.js`가 대부분을 차지합니다. | 약 1,400 |
| `src/compiler/phases/1-parse/read/` | `expression.js`, `script.js`, `style.js`, `context.js`, `options.js`: 특정 구문을 읽는 보조 함수입니다. | 약 1,170 |
| `src/compiler/phases/1-parse/acorn.js` | acorn(및 TypeScript 플러그인)을 감싸는 래퍼입니다. | 약 190 |
| `src/compiler/phases/scope.js` | `Scope`, `ScopeRoot`, `create_scopes`, `get_rune`을 정의합니다. analyze 단계의 기반입니다. | 약 760 |
| `src/compiler/phases/2-analyze/index.js` | `analyze_component`, `analyze_module`을 정의합니다. runes 모드 판별, 경고, CSS 분석이 여기서 시작됩니다. | 약 830 |
| `src/compiler/phases/2-analyze/visitors/` | 노드 종류별 analyze visitor입니다. 처음에는 `Identifier.js`, `CallExpression.js`, `VariableDeclarator.js`, `Attribute.js`만 읽으세요. | 파일당 20~200 |
| `src/compiler/phases/3-transform/index.js` | `transform_component`: client 또는 server 변환을 고르고, esrap으로 코드를 출력합니다. | 약 110 |
| `src/compiler/phases/3-transform/client/transform-client.js` | `client_component`: module, instance, template을 차례로 변환하고 최종 모듈을 조립합니다. | 약 660 |
| `src/compiler/phases/3-transform/client/utils.js` | `is_state_source`, `build_getter`, `should_proxy` 등 판단 함수가 모여 있습니다. | 약 300 |
| `src/compiler/phases/3-transform/client/visitors/` | 노드 종류별 client visitor입니다. `Program.js`, `VariableDeclaration.js`, `Identifier.js`, `Fragment.js`, `shared/fragment.js`, `shared/utils.js`, `shared/declarations.js`, `shared/events.js`부터 읽으세요. | 파일당 20~700 |
| `src/compiler/phases/3-transform/server/transform-server.js` | `server_component`: 같은 analysis로 문자열 연결 코드를 만듭니다. | 약 400 |
| `src/compiler/phases/2-analyze/css/`, `src/compiler/phases/3-transform/css/index.js` | selector가 어떤 요소에 쓰이는지 표시(prune)하고, 해시 클래스를 붙인 CSS를 출력합니다. | 약 1,800 |

## 도구 사용법

```bash
# 컴파일 결과 보기 (client / server / dev / CSS / modern AST)
node tools/compile.mjs playground/04-compiler/StateKinds.svelte
node tools/compile.mjs playground/04-compiler/StateKinds.svelte --server
node tools/compile.mjs playground/04-compiler/Styled.svelte --css
node tools/compile.mjs playground/04-compiler/Parse.svelte --ast

# 파일을 수정할 때마다 다시 컴파일해서 출력 (질문을 풀 때 가장 많이 씁니다)
node tools/compile.mjs playground/04-compiler/TextGrouping.svelte --watch

# phase 1 결과(템플릿 AST)를 들여쓰기 트리로 보기
node labs/04-compiler/outline.mjs playground/04-compiler/Parse.svelte

# phase 2 결과: 선언된 이름마다 binding의 kind, reassigned, mutated, 참조 수
node labs/04-compiler/bindings.mjs playground/04-compiler/StateKinds.svelte
node labs/04-compiler/bindings.mjs playground/04-compiler/Events.svelte --all   # {#each} 등 템플릿 스코프 포함

# phase 2 결과: 템플릿 표현식마다 has_state, has_call, 의존하는 binding
node labs/04-compiler/expressions.mjs playground/04-compiler/TextGrouping.svelte

# acorn + zimmerframe + esrap으로 만든 장난감 컴파일러 (Q4.18에서 확장합니다)
node labs/04-compiler/mini-compiler.mjs
```

`labs/04-compiler/_internals.mjs`는 `compile()`이 내부에서 호출하는 함수(`parse`, `analyze_component`, `transform_component` 등)를 직접 import해서 단계별로 실행합니다. lab을 새로 만들 때 이 파일의 `run_phases(file)`를 쓰면 `{ ast, analysis }`를 바로 얻을 수 있습니다. 컴파일러 소스에 `console.log`를 넣으면 이 도구들의 출력에 그대로 나타납니다. 실험이 끝나면 `git -C svelte checkout -- <file>`로 되돌리세요.

## 질문

### 4-A. 파이프라인과 parse

**Q4.1** `[관찰]` `src/compiler/index.js`의 `compile()`을 읽고, `.svelte` 문자열이 최종 JS 문자열이 될 때까지 거치는 함수를 순서대로 적으세요. 각 함수의 입력과 출력이 어떤 자료구조인지(문자열, Svelte AST, analysis 객체, ESTree `Program`, `{ code, map }`)도 함께 적으세요. 마지막으로, 컴파일러가 출력 코드를 문자열 연결로 만들지 않고 ESTree AST를 만든 뒤 esrap으로 출력하는 이유를 두 가지 이상 추론해 보세요.

<details><summary>힌트 1</summary>

`compile()` 본문의 `_parse`, `analyze_component`, `transform_component` 호출을 따라가고, `src/compiler/phases/3-transform/index.js`에서 `print`가 호출되는 줄을 찾으세요.

</details>
<details><summary>힌트 2</summary>

사용자가 작성한 `count * 2` 같은 표현식은 parse 단계에서 이미 ESTree 노드가 되어 있습니다. 이 노드를 출력 코드 안에 끼워 넣는 상황과, `print`에 넘기는 `sourceMapContent` 옵션을 함께 생각해 보세요.

</details>

**Q4.2** `[관찰]` `node labs/04-compiler/outline.mjs playground/04-compiler/Parse.svelte`를 실행하세요. 소스에서는 `<div>`가 닫히지 않은 두 번째 `<p>` 안에 있는 것처럼 보이고, `<li>`도 닫는 태그가 없습니다. AST에서 `<div>`와 두 `<li>`는 각각 어느 노드의 자식이 되었나요? 브라우저의 HTML 파서와 같은 결과인지, 그리고 컴파일러가 이렇게 처리하지 않으면 3단계에서 본 DOM 탐색 코드(`$.sibling`, `$.child`)에 어떤 문제가 생기는지 설명하세요.

<details><summary>힌트 1</summary>

`src/compiler/phases/1-parse/state/element.js`에서 `closing_tag_omitted`를 호출하는 부분을 찾으세요.

</details>
<details><summary>힌트 2</summary>

컴파일러가 만든 template 문자열은 런타임에 브라우저가 `innerHTML`로 다시 파싱합니다. 컴파일러가 생각하는 트리 모양과 브라우저가 만드는 트리 모양이 다르면, "두 번째 형제 노드" 같은 탐색 경로가 무엇을 가리키게 될지 생각해 보세요.

</details>

**Q4.3** `[예측]` `Parse.svelte`의 첫 번째 `<p>` 안에는 `{ obj.a === '}' ? '{brace}' : `}` }`라는 표현식이 있습니다. 문자열과 템플릿 리터럴 안에 `}`와 `{`가 섞여 있습니다. 파서가 표현식이 끝나는 위치를 어떻게 찾을지 **코드를 읽기 전에** 예측해서 노트에 적으세요. 그다음 `read/expression.js`와 `acorn.js`의 `parse_expression_at`을 읽고 예측과 비교하세요. `read_expression` 안의 `num_parens` 반복문은 어떤 입력을 위해 존재하나요?

<details><summary>힌트 1</summary>

`read_expression`이 `parse_expression_at`에 넘기는 인자 세 개를 보세요. 특히 첫 번째 인자가 표현식 부분만 잘라 낸 문자열인지, 템플릿 전체인지 확인하세요.

</details>
<details><summary>힌트 2</summary>

acorn의 `parseExpressionAt`은 "주어진 위치에서 시작하는, 문법적으로 완결된 가장 긴 표현식"을 읽고 멈춥니다. 그러면 `}`를 직접 세는 방식과 비교해서 무엇이 쉬워질까요? `num_parens`에 대해서는 `{(a)}`처럼 괄호로 감싼 표현식을 넣었을 때 `node.start`와 `parser.index`가 어떻게 다른지 생각해 보세요.

</details>

**Q4.4** `[추적]` `1-parse/index.js`의 `Parser` 생성자에 있는 `while` 반복문(`state = state(this) || fragment`)은 작은 상태 기계입니다. `<p>hello {name}</p>`를 파싱할 때 어떤 상태 함수가 어떤 순서로 호출되는지, 그리고 `parser.stack`과 `parser.fragments`에 무엇이 push되고 pop되는지 순서대로 적으세요. `stack`과 `fragments`를 하나로 합치지 않고 따로 유지하는 이유는 무엇일까요?

<details><summary>힌트 1</summary>

`state/fragment.js`는 다음 상태를 고르기만 합니다. `state/element.js`의 끝부분(`parser.stack.push(element)`), `parser.pop()`, `parser.append()`를 보세요.

</details>
<details><summary>힌트 2</summary>

`{#if}` 블록은 `consequent`와 `alternate`라는 두 개의 Fragment를 가집니다. `{:else}`를 만났을 때 `tag.js`의 `next()`가 무엇을 바꾸는지 보면, "현재 열린 노드"와 "현재 자식을 추가할 Fragment"가 항상 일대일로 대응하지 않는다는 점을 알 수 있습니다.

</details>

**Q4.5** `[추적]` `read/script.js`의 `read_script`는 `<script>` 내용을 acorn에 넘기기 전에 `parser.template.slice(0, script_start).replace(regex_not_newline_characters, ' ') + data`라는 문자열을 만듭니다. 즉, 스크립트 앞부분을 줄바꿈만 남기고 모두 공백으로 바꿉니다. 왜 `data`만 넘기지 않을까요? 이 처리를 제거하면 무엇이 깨지는지 두 가지 이상 찾으세요. (가능하면 실제로 제거해 보고, 일부러 문법 오류를 넣은 컴포넌트를 컴파일해서 에러 위치를 비교하세요.)

<details><summary>힌트 1</summary>

`acorn.js`의 `parse`가 acorn에 넘기는 옵션 중 `locations: true`를 보세요. 그리고 analyze 단계에서 `node.start`, `node.end`를 사용하는 곳을 찾아보세요. 예를 들어 `2-analyze/index.js`에서 store 참조가 module 스크립트 안에 있는지 판별하는 부분이 있습니다.

</details>
<details><summary>힌트 2</summary>

템플릿의 `{expression}`은 템플릿 전체 문자열을 기준으로 위치가 매겨집니다. 스크립트 안의 노드도 같은 좌표계를 써야 하는 이유를 에러 메시지, `svelte-ignore` 주석, source map 관점에서 생각해 보세요.

</details>

**Q4.6** `[설명]` parse 단계는 `$state`가 무엇인지 전혀 모릅니다. parse가 끝난 AST에서 `let count = $state(0)`의 `$state(0)`은 그냥 평범한 `CallExpression`입니다. 다음 두 종류의 에러를 각각 2개 이상 찾고, 어느 단계에서 발생하는지 확인하세요.

- 문법 자체가 잘못된 경우: 예를 들어 닫히지 않은 블록, 잘못된 토큰
- 문법은 맞지만 의미가 잘못된 경우: 예를 들어 `{$state}`처럼 rune을 괄호 없이 사용한 경우

그리고 "구문 검사는 parse에서, 의미 검사는 analyze에서" 하도록 나눈 설계가 어떤 이점을 주는지 설명하세요. `parse()` API가 별도로 공개되어 있고, prettier 플러그인이나 language server 같은 도구가 이 API를 쓴다는 점을 함께 고려하세요.

<details><summary>힌트 1</summary>

`src/compiler/errors.js`에서 에러 함수 이름을 보고, 그 함수를 호출하는 파일이 `phases/1-parse/` 아래에 있는지 `phases/2-analyze/` 아래에 있는지 `grep`으로 확인하세요. 예를 들어 `block_unclosed`, `expected_token`, `rune_missing_parentheses`, `state_invalid_placement`를 찾아보세요.

</details>
<details><summary>힌트 2</summary>

어떤 이름이 rune인지 판단하려면 그 이름이 지역 변수로 선언되었는지 알아야 합니다(`scope.js`의 `get_rune` 마지막 부분). 이 정보는 파싱이 끝나기 전에는 알 수 없습니다.

</details>

### 4-B. analyze: 이름과 의존성 기록하기

**Q4.7** `[관찰]` `node labs/04-compiler/bindings.mjs playground/04-compiler/StateKinds.svelte`를 실행하고, 선언된 이름마다 `kind`, `reassigned`, `mutated`를 표로 옮겨 적으세요. 그다음 binding의 `kind`가 **두 번에 걸쳐** 정해진다는 사실을 코드에서 확인하세요. 처음 선언될 때는 어떤 `kind`로 만들어지고, 언제 어디서 `state`, `raw_state`, `derived`, `prop`으로 바뀌나요? 코드 주석에 남은 "TODO feels like this should happen during scope creation?"이 무엇을 아쉬워하는지도 설명하세요.

<details><summary>힌트 1</summary>

`scope.js`에서 `declare(` 호출을 찾아 두 번째 인자(`kind`)로 무엇을 넘기는지 보세요. 그다음 `2-analyze/visitors/VariableDeclarator.js`를 읽으세요.

</details>
<details><summary>힌트 2</summary>

`create_scopes`는 `get_rune`을 쓸 수 있을까요? `get_rune`은 "그 이름이 지역 변수가 아닌지"를 확인해야 하는데, scope를 만드는 도중에는 아직 모든 선언을 다 보지 못했을 수 있습니다.

</details>

**Q4.8** `[예측]` 컴포넌트가 runes 모드인지 아닌지는 컴파일러가 자동으로 판별합니다. 다음 네 가지 컴포넌트에서 `analysis.runes`가 `true`일지 `false`일지 **먼저 예측하고**, 각각 작은 파일을 만들어 `bindings.mjs`로 확인하세요.

1. rune을 하나도 쓰지 않는 컴포넌트
2. `<script>` 안의 함수 본문에서만 `$effect(() => {})`를 쓰고, 그 함수는 호출하지 않는 컴포넌트
3. `<script module>`에서만 `export const shared = $state({ n: 0 })`를 쓰는 컴포넌트
4. 템플릿에서 `<p>{$state}</p>`라고만 쓴 컴포넌트

그다음 `2-analyze/index.js`의 `const runes = ...` 줄을 찾으세요. 왜 instance 스코프가 아니라 **module 스코프의** `references`를 검사할까요? 4번은 어떤 결과가 나왔고, 그 이유는 무엇인가요?

<details><summary>힌트 1</summary>

`scope.js`의 `Scope.reference` 메서드를 읽으세요. 선언을 찾지 못한 참조는 어디로 전달되나요? 그리고 `analyze_component` 맨 앞에서 module, instance, template 스코프가 어떤 부모-자식 관계로 만들어지는지 보세요.

</details>
<details><summary>힌트 2</summary>

`$state`라는 이름은 어디에서도 선언되지 않으므로 전역 참조처럼 취급됩니다. 전역 참조는 스코프 체인을 따라 맨 위까지 올라갑니다. 맨 위 스코프가 무엇인지 확인하세요.

</details>

**Q4.9** `[예측]` `playground/04-compiler/LegacyCounter.svelte`와 `RunesCounter.svelte`는 `<svelte:options runes={true} />` 한 줄만 다르고 스크립트와 템플릿이 똑같습니다. 두 파일의 컴파일 결과가 어떻게 다를지, 그리고 버튼을 눌렀을 때 화면이 갱신될지 **먼저 예측하세요.** 그다음 `tools/compile.mjs`와 `bindings.mjs`로 확인하고, 차이를 만드는 코드를 `2-analyze/index.js`에서 찾으세요. 두 파일 모두 `unused_but_reassigned`도 재할당하는데, 왜 이 변수에 대해서는 경고가 나오지 않나요?

<details><summary>힌트 1</summary>

legacy 모드 쪽은 `if (!runes) { ... }` 블록 안에 "reassigned/mutated bindings are referenced in `$:` blocks or the template, turn them into state"라는 주석이 있습니다. runes 모드 쪽은 `non_reactive_update` 경고를 내는 부분을 찾으세요.

</details>
<details><summary>힌트 2</summary>

두 모드 모두 "재할당된다"와 "템플릿에서 참조된다"라는 같은 정보를 사용합니다. 차이는 그 정보로 **자동으로 상태를 만들어 주는지**, 아니면 **경고만 하는지**입니다. runes가 "명시적인 반응성"을 표방한다는 점과 연결해서 생각해 보세요.

</details>

**Q4.10** `[추적]` `create_scopes`(`scope.js`)는 순회하는 도중에 만난 참조(`references`)와 갱신(`updates`)을 배열에 모아 두기만 하고, 순회가 **끝난 뒤에** 한꺼번에 처리합니다. 

1. 왜 순회 도중에 바로 `scope.reference()`를 호출하지 않을까요? 이 지연 처리가 없으면 잘못 처리되는 코드 예시를 하나 만들어 보세요.
2. `updates`를 처리하는 반복문에서 `reassigned`와 `mutated`는 어떤 기준으로 구분되나요? `StateKinds.svelte`의 `todo`는 스크립트에서 한 번도 수정되지 않는데 `mutated: true`로 나옵니다. 어떤 템플릿 구문이 갱신으로 기록되었나요?

<details><summary>힌트 1</summary>

`scope.js`에서 "we do this after the fact" 주석이 달린 부분을 보세요. 그리고 `updates.push`를 호출하는 visitor(`AssignmentExpression`, `UpdateExpression`, 그리고 템플릿 쪽 하나)를 모두 찾으세요.

</details>
<details><summary>힌트 2</summary>

JS에서는 함수 선언이 끌어올려지고(hoisting), 함수 본문은 선언보다 앞에 있는 위치에서 나중에 선언된 변수를 참조할 수 있습니다. `src/compiler/utils/ast.js`의 `object()` 함수가 `todo.done`에 대해 무엇을 돌려주는지, 그 결과가 `expression` 자체와 같은지 비교해 보세요.

</details>

**Q4.11** `[추적]` `node labs/04-compiler/expressions.mjs playground/04-compiler/TextGrouping.svelte`를 실행하면, 템플릿 표현식마다 `has_state`와 `has_call`이 표시됩니다. 이 두 값이 정해지는 코드를 analyze visitor에서 모두 찾으세요(최소 3개 파일). 그리고 다음 질문에 답하세요.

1. `{greeting}`은 `has_state: false`인데, 한 번도 재할당되지 않는 `{name}`은 왜 `has_state: true`인가요?
2. `{shout(name)}`처럼 함수를 호출하는 표현식은 왜 `has_state`까지 `true`가 되나요? `CallExpression.js`에 남은 TODO 주석은 이 판단이 어떤 경우에 과하다고 말하나요?

<details><summary>힌트 1</summary>

`2-analyze/visitors/Identifier.js`, `CallExpression.js`, `MemberExpression.js`에서 `context.state.expression`을 수정하는 줄을 찾으세요. `ExpressionTag.js`가 `context.next()`에 `expression`을 넘기는 방식도 보세요.

</details>
<details><summary>힌트 2</summary>

`Identifier.js`의 판단 기준은 "재할당 여부"가 아니라 binding의 `kind`입니다. 함수 호출의 경우, 컴파일러는 함수 본문 안에서 어떤 상태를 읽을지 알 수 없습니다.

</details>

### 4-C. client transform: 출력 코드 만들기

**Q4.12** `[관찰]` `node tools/compile.mjs playground/04-compiler/StateKinds.svelte`의 출력을 보고, `count`, `todo`, `user`, `point`, `double`, `plain` 각각에 대해 다음 표를 채우세요.

| 이름 | 선언이 어떻게 바뀌었나 | 읽기가 어떻게 바뀌었나 | 쓰기가 어떻게 바뀌었나 |
|---|---|---|---|

특히 `todo`와 `user`는 둘 다 `$state({...})`로 선언했는데 출력이 다릅니다. 무엇이 다르고, Q4.7에서 적은 표의 어떤 열과 관련이 있나요?

<details><summary>힌트 1</summary>

선언은 컴포넌트 함수 앞부분에서, 읽기는 `$.template_effect` 안에서, 쓰기는 모듈 최상단으로 끌어올려진 `on_click` 함수들과 `button.__click`에 대입된 함수에서 찾을 수 있습니다.

</details>
<details><summary>힌트 2</summary>

`todo`의 읽기는 `todo.text`처럼 아무것도 감싸지 않은 형태로 남아 있습니다. 그런데도 체크박스를 누르면 화면이 갱신됩니다. 반응성이 변수가 아니라 어디에 들어 있는지 2단계의 `proxy.js`를 떠올려 보세요.

</details>

**Q4.13** `[예측]` `playground/04-compiler/Shadowing.svelte`에는 상태 `count`와, 같은 이름의 매개변수를 받는 함수 `format(count)`가 있습니다. 출력에서 `format` 본문의 `count`가 `$.get(count)`로 바뀔지 **먼저 예측하세요.** 확인한 뒤, 이 처리를 담당하는 코드를 `transform-client.js`의 `visitors._`에서 찾으세요. 이 코드가 없다면 출력은 어떻게 되고, 런타임에 어떤 일이 벌어질까요? 예측을 적은 다음, 실제로 해당 `delete` 문을 주석 처리하고 `node tools/mount.mjs playground/04-compiler/Shadowing.svelte`로 마운트해서 확인하세요(확인한 뒤에는 반드시 `git -C svelte checkout -- packages/svelte/src/compiler`로 되돌립니다).

<details><summary>힌트 1</summary>

client visitor의 `state.transform`은 "이름 → { read, assign, mutate, update }" 형태의 맵입니다. `Program.js`와 `shared/declarations.js`의 `add_state_transformers`가 이 맵을 채우고, `utils.js`의 `build_getter`가 이 맵을 사용합니다.

</details>
<details><summary>힌트 2</summary>

`visitors._`는 새 스코프에 들어갈 때마다 `transform`을 복사하고, 그 스코프에서 새로 선언된 이름 중 일부를 지웁니다. `format`의 매개변수 `count`의 binding `kind`는 무엇일까요? 2단계에서 본 `get(signal)`에 숫자를 넘기면 무슨 일이 벌어질지도 생각해 보세요.

</details>

**Q4.14** `[예측]` `playground/04-compiler/Events.svelte`에는 이벤트 핸들러 다섯 개(a~e)가 있습니다. 각 핸들러에 대해 (1) 이벤트 위임(`$.delegate`, `element.__click`)을 사용하는지, (2) 핸들러 함수가 컴포넌트 함수 밖, 즉 모듈 최상단으로 끌어올려지는지(hoist) **먼저 예측하세요.** 그다음 컴파일해서 확인하고, 판단 근거를 `2-analyze/visitors/Attribute.js`의 `get_delegated_event`에서 찾으세요.

마지막으로 다음을 설명하세요.

- 끌어올려진 핸들러가 `button.__click = [increment, count]`처럼 배열로 저장되는 이유와, 런타임이 이 배열을 어떻게 호출하는지(`src/internal/client/dom/elements/events.js`)
- 핸들러를 끌어올리면 `{#each}` 안에서 버튼이 1,000개 만들어지는 상황에서 무엇을 아낄 수 있는지

<details><summary>힌트 1</summary>

위임 대상 이벤트 목록은 `src/utils.js`의 `DELEGATED_EVENTS`에 있습니다. 끌어올리기 판단은 `get_delegated_event`에서 `return unhoisted`가 나오는 조건들을 하나씩 확인하면 됩니다.

</details>
<details><summary>힌트 2</summary>

(c)의 `record`는 `log`를 참조합니다. `bindings.mjs`로 `log`의 `kind`와 `reassigned`를 확인하세요. (e)는 `{#each}`의 index를 참조합니다. 끌어올린 함수는 컴포넌트 인스턴스의 지역 변수에 직접 접근할 수 없다는 점에서 출발하세요.

</details>

**Q4.15** `[추적]` Q4.12에서 관찰한 선언 형태를 결정하는 코드를 추적하세요. `client/visitors/VariableDeclaration.js`의 `create_state_declarator`, `client/utils.js`의 `is_state_source`와 `should_proxy`를 읽고 다음에 답하세요.

1. `$.state(...)`로 감싸는 조건과 `$.proxy(...)`로 감싸는 조건은 각각 무엇인가요? 두 조건이 서로 독립적이라는 점을 출력의 네 가지 조합(`count`, `todo`, `user`, `point`)으로 설명하세요.
2. `count`의 초기값 `initial()`은 숫자인데도 `$.proxy(initial())`로 감싸집니다. `should_proxy`는 왜 이것을 걸러 내지 못하나요? 이것이 정확성 문제인지, 단순히 약간의 비용 문제인지 판단하고 근거를 대세요.
3. runes 모드에서 재할당되지 않는 `$state`를 signal로 만들지 않아도 안전한 이유를 2단계의 지식으로 설명하세요. 원시값(`$state(0)`)과 객체(`$state({...})`)로 나누어 설명해야 합니다.

<details><summary>힌트 1</summary>

`is_state_source`는 `kind`, `analysis.immutable`, `reassigned`를 봅니다(`analysis.accessors`는 runes 모드에서 보통 `false`이므로 이번에는 무시해도 됩니다). `analyze_component`에서 runes 모드일 때 `immutable`이 어떤 값이 되는지 확인하세요.

</details>
<details><summary>힌트 2</summary>

`should_proxy`가 `false`를 돌려주는 노드 종류를 나열해 보세요. `CallExpression`은 목록에 없습니다. 런타임의 `proxy()`가 원시값을 받으면 어떻게 동작하는지 `src/internal/client/proxy.js`의 앞부분에서 확인하세요.

</details>

**Q4.16** `[추적]` `Counter.svelte`(작업 루트의 `playground/Counter.svelte`)의 출력에는 `$.template(\`<button> </button> <p> </p> <!>\`, 1)`이 있습니다. 다음을 코드에서 확인하세요.

1. `<button>` 안의 공백 한 칸과 맨 끝의 `<!>`는 각각 어떤 코드가 넣었고, 왜 필요한가요? (3단계에서 본 `$.child`, `$.sibling`이 무엇을 찾는지 떠올리세요.)
2. 소스에는 줄바꿈과 탭이 있었는데 template 문자열에는 공백 한 칸만 남았습니다. 어떤 함수가 공백을 정리하나요?
3. `var root = $.template(...)`은 컴포넌트 함수 **밖**에 선언됩니다. 이 선언을 모듈 최상단으로 올리는 코드는 어디에 있고, 이렇게 하면 컴포넌트 인스턴스를 여러 개 만들 때 무엇이 달라지나요?
4. `$.sibling(button, 2)`의 `2`는 어떤 변수가 세고 있나요?

<details><summary>힌트 1</summary>

`client/visitors/Fragment.js`의 `add_template`, `client/visitors/shared/fragment.js`의 `process_children`과 `flush_sequence`, `3-transform/utils.js`의 `clean_nodes`를 읽으세요.

</details>
<details><summary>힌트 2</summary>

HTML 파서는 `<button></button>`처럼 내용이 비어 있으면 텍스트 노드를 만들지 않고, `<!>`는 HTML에서 빈 주석 노드가 됩니다. `process_children`의 `skipped` 변수가 언제 증가하고 언제 1로 초기화되는지 보세요.

</details>

**Q4.17** `[설명]` `playground/04-compiler/TextGrouping.svelte`를 컴파일하면, 다섯 개의 `<p>`가 세 가지 서로 다른 방식으로 갱신됩니다. 

1. 각 `<p>`가 어떤 방식(초기화 때 한 번만 대입, 공유 `template_effect`에 묶임, 자신만의 `template_effect`, 표현식마다 `$.derived`)으로 처리되었는지 정리하고, `flush_sequence`와 `build_template_literal`(`client/visitors/shared/utils.js`)에서 그 분기 조건을 찾으세요.
2. 왜 함수 호출이 있는 표현식은 공유 `template_effect`에 넣지 않고 따로 effect를 만들까요? 하나의 텍스트에 호출이 두 개 있을 때는 왜 호출마다 `$.derived`를 만들까요? 2단계에서 배운 "effect는 의존성 중 하나만 바뀌어도 본문 전체를 다시 실행한다"는 사실과 연결해서, effect 개수(메모리, 생성 비용)와 재실행 범위 사이의 트레이드오프를 설명하세요.
3. `name`과 `n`은 재할당되지 않으므로 Q4.15에 따라 signal이 아닙니다. 그런데도 공유 `template_effect` 안에 들어갑니다. 이것은 낭비인가요? 낭비라면 비용은 얼마나 클까요?

<details><summary>힌트 1</summary>

`flush_sequence`에는 `has_call`, `has_state`, 둘 다 아닌 경우로 나뉘는 `if` 문이 있습니다. 공유 `template_effect`가 실제로 만들어지는 곳은 `Fragment.js`의 `build_render_statement(state.update)`입니다.

</details>
<details><summary>힌트 2</summary>

공유 effect 하나에 `shout(name)`처럼 비용을 알 수 없는 호출이 들어 있으면, 그 effect가 읽는 **다른** 상태가 바뀔 때마다 `shout`도 다시 실행됩니다. derived는 값이 같으면 하위 effect로 변경을 전파하지 않는다는 점(2단계의 `equals`)도 떠올려 보세요. 3번은 2단계에서 effect가 의존성이 하나도 없을 때 어떻게 처리되는지 확인해 보면 답할 수 있습니다.

</details>

**Q4.18** `[실험]` `labs/04-compiler/mini-compiler.mjs`는 acorn, zimmerframe, esrap으로 만든 장난감 컴파일러입니다. 지금은 `$state` 선언과 읽기만 변환하기 때문에, 실행하면 `$.get(count) = ...`이나 `function log($.get(count))` 같은 잘못된 출력이 나옵니다. 파일 안의 TODO 세 개를 구현하세요.

1. `count = v`를 `$.set(count, v)`로 바꿉니다. 대입의 왼쪽은 `$.get`으로 바뀌면 안 됩니다.
2. `count++`를 `$.update(count)`로 바꿉니다.
3. `function log(count)`의 매개변수 `count`와 그 본문의 `count`는 변환하지 않습니다.

구현한 뒤, 자신의 구현과 Svelte의 구현(`client/visitors/AssignmentExpression.js`, `UpdateExpression.js`, `transform-client.js`의 `visitors._`, `scope.js`)을 비교하세요. 특히 3번을 위해 무엇이 필요했고, Svelte는 그것을 analyze 단계에서 미리 만들어 두었다는 점이 transform 단계를 얼마나 단순하게 만드는지 노트에 적으세요.

<details><summary>힌트 1</summary>

zimmerframe의 visitor가 값을 반환하면 그 노드가 반환값으로 교체되고, 반환하지 않으면 원래 노드를 유지하면서 자식을 계속 순회합니다. visitor 두 번째 인자의 `visit(node)`로 자식을 직접 변환할 수도 있습니다. 1번은 `AssignmentExpression` visitor에서 `left`는 그대로 두고 `right`만 `visit`하면 됩니다.

</details>
<details><summary>힌트 2</summary>

3번은 순회 state에 "현재 스코프에서 가려진(shadowed) 이름 집합"을 넣고, `FunctionDeclaration` visitor에서 매개변수 이름을 그 집합에 추가한 새 state로 `next(new_state)`를 호출하는 방식으로 풀 수 있습니다. 이것이 Svelte의 `visitors._`가 `transform` 맵을 복사하고 일부를 지우는 방식과 어떻게 대응하는지 비교하세요.

</details>

### 4-D. server 출력과 CSS

**Q4.19** `[관찰]` `node tools/compile.mjs playground/Counter.svelte --server`를 실행하고 client 출력과 비교하세요.

1. `$state`, `$derived`, `$props`는 server 출력에서 각각 무엇으로 바뀌었나요? 해당 코드를 `server/visitors/VariableDeclaration.js`에서 찾으세요.
2. server 출력에는 signal도 effect도 없습니다. server에서는 왜 반응성을 통째로 버려도 되나요? 반대로 `$effect`는 server에서 어떻게 처리될까요? 직접 컴포넌트에 `$effect`를 넣어 확인하세요.
3. `{#if}` 주변에 `<!--[-->`, `<!--[!-->`, `<!--]-->` 주석이 출력됩니다. 이 주석은 누가 읽기 위한 것인가요? 3단계의 hydration 코드에서 이 문자열을 찾아 연결하세요.

<details><summary>힌트 1</summary>

`server/visitors/IfBlock.js`와 `server/visitors/shared/utils.js`의 `block_open`, `block_close`, `build_template`을 보세요. 마커 문자열 자체는 `src/constants.js`의 `HYDRATION_START` 등에 정의되어 있습니다.

</details>
<details><summary>힌트 2</summary>

server 렌더링은 요청 한 번에 HTML 문자열을 한 번 만들고 끝납니다. 값이 "나중에 바뀌는" 상황이 존재하는지 생각해 보세요. hydration 쪽은 `src/internal/client/dom/hydration.js`와 `src/internal/client/dom/blocks/if.js`에서 `HYDRATION_START_ELSE`를 찾으세요.

</details>

**Q4.20** `[추적]` `playground/04-compiler/Styled.svelte`를 `--css` 옵션과 함께, 그리고 옵션 없이 컴파일하세요.

1. `<h2>`에는 `svelte-...` 해시 클래스가 붙었는데 `<p>`에는 붙지 않았습니다. 왜 그런가요? 이 결정을 내리는 코드(`2-analyze/css/css-prune.js`의 `prune`)는 어떤 단위로 반복하나요?
2. `.unused` selector는 어떻게 출력되었고, 그 처리는 어디에서 하나요?
3. 해시 클래스는 analyze 단계에서 템플릿 AST의 `class` 속성 값에 **직접 덧붙여집니다.** 해당 코드를 `2-analyze/index.js`에서 찾고, 그 옆의 TODO 주석이 이 설계의 어떤 점을 문제로 지적하는지 설명하세요.
4. 해시 값은 무엇을 입력으로 계산되나요? 같은 CSS를 가진 두 컴포넌트는 같은 해시를 갖게 될까요?

<details><summary>힌트 1</summary>

`analyze_component`의 `if (analysis.css.ast) { ... }` 블록을 처음부터 끝까지 읽으세요. `analysis.elements`에 무엇이 들어가는지는 `2-analyze/visitors/RegularElement.js`에서 확인할 수 있습니다.

</details>
<details><summary>힌트 2</summary>

해시 함수는 `src/compiler/validate-options.js`의 `cssHash` 기본값과 `analyze_component`에서 그것을 호출하는 부분을 보세요. 어떤 인자가 실제로 해시 계산에 쓰이는지 확인하세요. 주석 처리는 `3-transform/css/index.js`에서 `(unused)`를 검색하세요.

</details>

## 체크포인트

코드를 보지 않고 다음을 설명할 수 있으면 이 단계를 마친 것입니다.

1. `.svelte` 파일 하나가 컴파일될 때 parse, analyze, transform, print 단계가 각각 무엇을 만들고, 왜 이 순서로 나뉘어 있는지 설명할 수 있습니다.
2. `let x = $state(...)`가 출력에서 `$.state(...)`, `$.proxy(...)`, 둘 다, 또는 둘 다 아닌 형태가 되는 조건을 설명하고, 각 조건에 필요한 정보가 analyze 단계의 어디에서 오는지 말할 수 있습니다.
3. 템플릿의 `{expression}`이 "한 번만 대입", "공유 `template_effect`", "독립 effect", "`$.derived` + effect" 중 무엇이 되는지 판단할 수 있고, 각 선택의 트레이드오프를 설명할 수 있습니다.
4. 이벤트 핸들러가 위임되는 조건과 모듈 최상단으로 끌어올려지는 조건을 구분해서 설명할 수 있습니다.
5. 같은 analysis 결과에서 client 출력과 server 출력이 다르게 만들어지는 이유를, "값이 나중에 바뀌는가"라는 관점으로 설명할 수 있습니다.

## 더 나아가기

1. `src/compiler/phases/2-analyze/visitors/`에 있는 visitor 하나를 골라(예: `BindDirective.js`), 그 visitor가 내는 에러와 경고를 모두 나열하고, 각 에러를 일으키는 최소한의 컴포넌트를 만들어 보세요. 에러 메시지 원문은 `svelte/packages/svelte/messages/compile-errors/`의 Markdown 파일에서 생성됩니다. 이 파일들이 어떻게 `errors.js`가 되는지도 확인해 보세요.
2. `{#each}` 블록 하나를 처음부터 끝까지 추적하세요. parse(`tag.js`의 `open`), analyze(`visitors/EachBlock.js`, `scope.js`의 `EachBlock`), client transform(`client/visitors/EachBlock.js`)을 거쳐 3단계에서 읽은 `$.each`의 인자(flags, `$.index` 등)가 어떻게 결정되는지 정리하세요.
3. `labs/04-compiler/mini-compiler.mjs`를 확장해서 `$derived(expr)`를 `$.derived(() => expr)`로 바꾸는 기능을 추가하고, 한 단계 더 나아가 "재할당되지 않는 `$state`는 `$.state`로 감싸지 않는" 최적화를 구현해 보세요. 이 최적화를 위해 transform 전에 어떤 정보를 미리 모아야 했는지가 analyze 단계가 존재하는 이유입니다.
