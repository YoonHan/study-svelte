# 1단계 노트: 컴파일 결과 관찰

질문 원문과 힌트는 `curriculum/01-compiled-output.md`에 있습니다. 답을 적은 뒤 `/check Q1.N`으로 채점을 받을 수 있습니다.

답과 근거는 한 칸에 함께 적습니다. 근거(`file:line`, 실험 파일과 그 출력)는 그 근거가 뒷받침하는 문장 바로 아래에 `> 근거:` 형식으로 적으세요.

[예측] 질문은 실행하기 **전에** 예측을 먼저 적고, 실행한 뒤 결과와 차이를 함께 적으세요.

## 1-A. 템플릿과 노드 탐색

### Q1.1 [관찰] `$.template`의 두 번째 인자(없음, 1, 3)는 무엇을 뜻하는가

**내 답:**

`$.template()`의 두번째 인자는 `flags` 매개변수임.
이 `flags` 값에 따라 `$.template()` 의 동작이 달라지며, `flags`에 인자로 전달되는 값에 포함되는 비트의 종류는 총 `TEMPLATE_FRAGMENT`와 `TEMPLATE_USE_IMPORT_NODE` 2가지임.

> 근거: `template.js:28-29`

`TEMPLATE_FRAGMENT` 비트는 값이 1이고 해당 .svelte 파일의 <template> 코드에 최상위 노드가 1개인지 여러개인지를 나타냄.
`TEMPLATE_USE_IMPORT_NODE` 비트는 값이 2이고 커스텀 요소가 포함되어 있어서 `document.importNode()` 메서드를 호출하여 복제된 fragment를 현재 페이지의 `document` 객체 소속으로 바꿔주어야 하는지 여부를 나타냄.

> 근거: `template.js:52`, `reconciler.js`

`flags`에 인자로 '없음', 1, 3이 주어지면 각각 다음의 상황을 의미함.
- '없음': `TEMPLATE_FRAGMENT`와 `TEMPLATE_USE_IMPORT_NODE` 비트가 전부 off. 이 경우에는 최상위에 노드가 하나밖에 없는 상황. 이 상황에서는 파싱된 HTML 노드 데이터를 포함한 document fragment의 첫 번째 자식을 node 변수에 할당한다.
  > 근거: `scratch/compiled/02-single-element.compiled.js`: 단수의 최상위 HTML element 노드 -> 모든 비트 off (없음)
- 1: `TEMPLATE_FRAGMENT` 비트가 on. 따라서 최상위 노드가 여러 개일 때의 처리를 해야하는 상황.
  > 근거: `scratch/compiled/01-static.compiled.js`: 복수의 최상위 HTML element 노드 -> `TEMPLATE_FRAGMENT` on (1)
- 3: `TEMPLATE_FRAGMENT`와 `TEMPLATE_USE_IMPORT_NODE` 비트가 전부 on. 따라서 커스텀 엘리먼트를 업그레이드 하기 위한 `document.importNode()` 메서드 호출과 복수의 최상위 노드 처리가 둘 다 필요한 상황.
  > 근거: `scratch/compiled/11-custom-element.compiled.js`: 복수의 (최상위 HTML element + custom element 노드) -> `TEMPLATE_FRAGMENT`, `TEMPLATE_USE_IMPORT_NODE` 비트 on (3)
  >
  > 근거: `scratch/compiled/11b-single-custom-element.compiled.js`: 단수의 최상위 custom element -> `TEMPLATE_USE_IMPORT_NODE` 비트 on (2)

---

### Q1.2 [관찰] `<p></p>`와 `<p> </p>`는 왜 다른가

**내 답:**

컴파일러 관점에서 생각해야 함.
어떤 태그의 텍스트 노드를 미리 만들어둘지 말지는 컴파일러가 보수적으로 판단할 수 밖에 없음.
왜냐하면 false positive가 존재하더라도 data <-> UI간 reactivity를 잃는게 더 큰 문제이기 때문.
일반적으로, HTML 요소의 텍스트 노드를 미리 만들어둘지 말지 판단하는 간단한 기준은
`const`로 선언된 상수값인 경우에는 텍스트 노드를 미리 만들어두지 않고 `.textContent = ` 로직으로 일회성 처리를 함.

> 근거: `03-text-kinds.compiled.js:18` 을 보면 `const` 로 선언된 상수를 그대로 템플릿 코드에 포함할 경우에는 `.textContent = ` 코드가 생성됨.
> `03-text-kinds.compiled.js:21,54` 를 보면 `$.state()` 로 선언된 변수를 템플릿 코드에 포함한 경우에는 `$.template_effect()` 코드가 생성되는걸 볼 수 있음.

함수 표현식(Call Expression)인 경우에는 조건이 조금 복잡함. 
1. `is_pure()` 유틸 함수를 통해 그 함수 표현식의 pure 여부
2. 그 함수 표현식의 의존성 존재 여부
두 가지 조건에 따라 `has_call`, `has_state` 속성을 `true`로 설정함.
`is_pure()` 유틸 함수에서는 해당 함수 표현식이 컴포넌트 스코프에서 선언된 적이 없다면 `true` 를 반환하고, 그 외의 경우에는 `false`를 반환함. 

> 근거: `03b-static-call.compiled.js:16` / 컴파일된 결과를 보면 `$.template_effect()`의 콜백 함수에 `$.set_text()` 코드가 생성된 것을 볼 수 있음. 만약, 컴파일러가 함수가 포함된 텍스트 노드가 한 번 세팅된 이후 변하지 않았을 것이라고 판단했다면 이 부분의 코드는 텍스트 노드를 생성하고, 해당 노드의 textContent에 값을 할당하는 로직으로 바뀌었을 것임.
>
> 근거: `packages/svelte/src/compiler/phases/2-analyze/visitors/CallExpression.js:173-180` 을 보면, 스벨트 팀의 trade-off 결정의 근거가 주석으로 달려있고 런타임 의존성이 없고 is_pure() 유틸 함수의 실행결과가 true인 경우에는
> 안전하게 `.textContent` property를 통해 텍스트 노드 정적 세팅이 가능함.


그런데 왜 하필 ` `(공백문자)를 텍스트 노드 생성에 사용하는 것일까? 
그 답은 아마, 그냥 가장 간단한 문자열이라서임.

```js
var text = $.child(p_1); // p_1 변수가 <p></p>를 담고있다고 가정
$.template_effect(() => $.set_text(text, ...))
``` 

라는 코드가 있다고 가정하면, 여기에서의 `text` 값은 `null` 이 됨. 
왜냐하면 `$.child(p_1)` 이라는 코드가 하는 일은, 인자로 받은 요소의 첫번째 자식을 표준 DOM API인 `first_child_getter` 를 통해서 받아오는 일임. 브라우저는 빈 문자열에 대한 텍스트 노드를 생성하지 않으므로 이 getter의 값은 `null`이 됨.
그런데 `$.set_text(text, value)`의 로직을 보면 `if (str !== (text.__t ??= text.nodeValue))` 이런 조건문이 있음. `text` 매개변수에 전달되는 값이 `null` 이므로 이 조건문에서 `null` 참조가 일어나서 TypeError 예외가 발생하게 되고, 따라서 추가적인 요소 렌더링 처리도 일어나지 않음.

---

### Q1.3 [예측] `09-anchors`의 템플릿 문자열과 `$.sibling` 이동 횟수

**내 답:**

(`$.template()` 에 들어갈 문자열 예측)
`<span data-if="show"></span> <b></b> <i></i> <em> </em>`

(실제)
`<!> <b>static</b> <i>static</i> <em> </em>`

> 차이: if block 은 '<!>' 라는 HTML 주석 shorthand 로 표현이 되어있고, 'static' 이라는 정적 텍스트는 템플릿 문자열에서부터 포함이 되어있다. 정적 텍스트는 템플릿 문자열 단계에서부터 그냥 포함이 되는구나를 알게됨.
> '<!>' 와 '<b>' 사이의 공백을 통해 텍스트 노드를 표현하는데, 이 텍스트 노드에 `{name} is the second node` 텍스트 값을 할당하게 됨.

`09-anchors.compiled.js` 에서
- '<b>static</b>', '<i>static</i>' 노드를 가리키는 변수는 안만들어지고, `<em>{name}</em>` 을 가리키는 변수만 만들어졌음. 
그 이유를 추론해보자면, 전자의 두 노드는 정적 노드라서 그런것일듯. 즉, <em>은 지역 의존성을 가지고 있고, <b> 나 <i>에는 이런 의존성이 없어서임. 정적 노드 판단은 `svelte/packages/svelte/src/compiler/phases/3-transform/client/visitors/shared/fragment.js` > `is_static_element()`로 함. 이런 지역 의존성을 판단할 때에는 자식 뿐만 아니라 attribute까지 검사함.
- `var em = $.sibling(text, 5);` '<em>' 노드를 고르기 위해 `5`라는 숫자를 인자로 넣은 이유는, `text` 변수가 가리키는 노드에서 5번째 형제가 '<em>' 노드이기 때문임. 중간에 껴있는 공백 문자도 텍스트 노드로써 형제 노드로 생성이 됨.

---

### Q1.4 [추적] `template()`의 파싱 시점, 앞에 붙는 `<!>`, mount 시 빈 텍스트 노드

**내 답:**

[`template()`의 파싱 시점]
`var root = $.template()` 라고 가정하면, `root()`이 실행되는 시점에 파싱이 시작됨.
`$.template()`가 반환하는 arrow function에 `create_fragment_from_html()` 호출이 포함되어있기 때문.
> 근거: svelte/packages/svelte/src/internal/client/dom/template.js:46-53

`$.template()`는 모듈 최상위 코드라서 모듈이 import되는 순간에 딱 한 번만 실행되고, 
`root()`은 첫 번째 호출에서 `node` 클로져 변수에 파싱된 document fragment를 저장해둠.
그 이후 호출부터는 `node` 변수에 있는 저장된 값을 파싱 없이 clone만 해서 반환함.

[`09-anchors.svelte` 컴포넌트 마운트 시 파싱이 2번 일어난 이유]
`{#if show}<span>first</span>{/if}` 이 부분이 별도의 template root 변수로 빠지기 때문.
이 부분은 아래 코드로 컴파일 됨.

```js
$.if(node, () => show, ($$anchor) => {
  var span = root_1();

  $.append($$anchor, span);
});
```

즉, if 조건이 참일 때에만 해당 template root가 실행됨. 초기 `show = true`이므로 `root_1`에 더해 `root`까지 호출되므로 총 **2번**의 HTML 파싱이 필요함.

[`has_start`가 `false`일 때 앞에 `<!>`를 하나 더 붙이는 이유?]
결론부터 말하자면, <!>를 맨 앞에 하나 더 붙이지 않으면 `destroy_effect()` 실행 시
해당 컴포넌트의 DOM이 일부 지워지지 않고 남아있을 수 있기 때문임.
예를 들어,

```js
$.template('<!> <b>static</b> <i>static</i> <em> </em>')
```

라는 코드에서 `<!>`를 안붙이게 된다면,
저 template 함수 실행의 결과는 다음과 같을 것임.

`<!> <b> <i> <em>`

여기에서 `nodes_start`는 `<!>`이 되고, `nodes_end`는 <em>이 됨.
그런데 이 상태에서 DOM에 mount가 이루어지면 <span> 노드가 `<!>` 앞에 위치하게 됨.

`<span> <!> <b> <i> <em>`

이 상태에서 `destroy_effect()`가 실행되면, <span> 태그틑 DOM에서 지워지지 않은채로 남아있게됨.
왜냐하면 `destroy_effect()`는 while문을 돌면서 `nodes_start`부터 시작해 `nodes_end`까지의 거쳐가즌 모든 노드를 삭제하는 로직을 실행하기 때문.
> 근거: svelte/packages/svelte/src/internal/client/reactivity/effects.js:436-442

`$.first_child()`와 `$.template()`은 공통의 합의를 전제로 동작함.
`$.template()`에서는 HTML 문자열이 빈 주석으로 시작하면 반드시 맨 앞에 `<!>`로 빈 주석 문자열을 하나 더 붙임. 이 덕에 `$.first_child()` 는 첫 번쨰 자식을 꺼냈는데 빈 주석 노드라면, 이는 분명히 `$.template()`이 붙인 빈 주석 노드라고 확신할 수 있으므로 안전하게 그 다음 노드를 꺼내서 반환할 수 있게 됨.
> 근거: svelte/packages/svelte/src/internal/client/dom/template.js:47
> svelte/packages/svelte/src/internal/client/dom/operations.js:122

[mount 시 빈 텍스트 노드]
컴포넌트 마운트 시 빈 텍스트 노드를 하나 생성해서 이를 해당 컴포넌트 구역의 마지막임을 알리는 노드로 활용함.
> 근거: svelte/packages/svelte/src/internal/client/render.js:229

HTML 맨 앞에 보이는 <!----> 주석은 `$.template()` 이 반환하는 함수가 호출될 때 생성이 됨.
> 근거: svelte/packages/svelte/src/internal/client/dom/template.js:47

---

### Q1.5 [추적] mount에서는 아무 일도 하지 않는 `$.reset`/`$.next`를 왜 생성하는가

**내 답:**


---

### Q1.6 [설명] 템플릿 복제 방식과 `createElement` 방식의 장단점, `importNode`

**내 답:**


---

## 1-B. runes가 어떤 코드로 바뀌는가

### Q1.7 [관찰] `04-state-proxy`의 `a`~`g` 분류표와 화면 변화 예측

**내 답:**


---

### Q1.8 [추적] 분류 규칙(`should_proxy`, `is_state_source`)의 컴파일러 근거

**내 답:**


---

### Q1.9 [예측] signal이 아닌 값이 화면에 반영되거나 반영되지 않는 이유

**내 답:**


---

### Q1.10 [관찰] `$.prop` 플래그 분해, 직접 접근하는 prop, 지연 기본값

**내 답:**


---

### Q1.11 [설명] `$.push`/`$.pop`이 생성되는 조건과 생략하는 이유

**내 답:**


---

## 1-C. 업데이트 단위: `template_effect`와 이벤트

### Q1.12 [관찰] `03-text-kinds`의 텍스트 6개를 업데이트 방식별로 분류

**내 답:**


---

### Q1.13 [예측] `12-grouped-effect`에서 `a++`가 일으키는 계산과 DOM 기록

**내 답:**


---

### Q1.14 [설명] 텍스트를 하나의 effect로 묶는 이유와 따로 떼어 내는 이유

**내 답:**


---

### Q1.15 [관찰] `__click`과 `$.event`, 핸들러 hoisting

**내 답:**


---

### Q1.16 [추적] `$.delegate`부터 핸들러 실행까지의 이벤트 위임 경로

**내 답:**


---

### Q1.17 [설명] 이벤트 위임과 hoisting의 이점과 대가

**내 답:**


---

## 1-D. 블록, 컴포넌트, 그리고 다른 출력 모드

### Q1.18 [관찰] `08-blocks`의 each 플래그, anchor, 하위 컴포넌트 호출 형태

**내 답:**


---

### Q1.19 [관찰] server 출력의 hydration 마커와 client anchor의 대응

**내 답:**


---

### Q1.20 [관찰] legacy와 runes 출력, dev와 production 출력 비교

**내 답:**


---
