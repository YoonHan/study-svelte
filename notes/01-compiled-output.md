# 1단계 노트: 컴파일 결과 관찰

질문 원문과 힌트는 `curriculum/01-compiled-output.md`에 있고, 공부 순서는 그 파일의 "학습 경로" 표를 따릅니다.

이 노트는 튜터가 작성합니다. 질문지의 질문마다 튜터가 던진 유도 질문과, 학습자의 답을 코드와 실험으로 확인해서 다듬은 해설을 쌍으로 기록합니다. 해설은 접혀 있으니, 질문을 보고 먼저 고민한 뒤에 펼쳐 보세요. 작성 방식은 `CLAUDE.md`의 "노트 작성 방식" 절에 있습니다.

코드 근거의 경로는 `svelte/packages/svelte/` 아래를 기준으로 줄여 씁니다(`svelte@5.0.0`). 곁가지 질문은 `log/tangents/`에 있고, 해설에서 `T1.N`으로 연결합니다.

## 1-0. 바닐라 카운터와 컴파일 결과 비교

### Q1.0 [관찰] 직접 짠 카운터와 Svelte의 컴파일 결과는 어떻게 다른가

비교하는 파일은 다음과 같습니다.

- 원본: `scratch/01-counter.svelte`
- 직접 짠 카운터: `scratch/01-vanilla-counter.html` (2026-10-12에 작성. 뒤에 붙은 "문서에 먼저 넣고 2초 뒤에 값 쓰기"는 별도의 실험이므로 비교에서 뺍니다.)
- 컴파일 결과: `scratch/compiled/01-counter.compiled.js`

#### 1. 직접 짠 카운터가 카운터를 화면에 띄우고 동작하게 만들기까지 하는 일을 종류별로 나누면 몇 가지일까요?

<details>
<summary>해설</summary>

코드에 나오는 DOM API를 기준으로 나누면 네 가지입니다.

| 하는 일 | 직접 짠 코드 |
|---|---|
| 요소 만들기 | `createElement('button')`, `createElement('p')` |
| 텍스트 쓰기 | `.innerText = …` |
| 이벤트 핸들러 붙이기 | `.addEventListener('click', …)` |
| 요소를 문서에 넣기 | `document.body.appendChild(…)` |

> 근거: `scratch/01-vanilla-counter.html:19-52`(요소 만들기 19, 26, 29행 / 텍스트 쓰기 30, 41-42행 / 이벤트 21, 31행 / 문서에 넣기 47-52행)

텍스트 쓰기와 이벤트 핸들러 붙이기는 둘 다 만든 요소를 손보는 일이지만, 하나는 "무엇을 보여 줄지"를, 다른 하나는 "클릭에 어떻게 반응할지"를 정합니다. 컴파일 결과에서도 서로 다른 장치가 맡으므로 따로 둡니다.

> 처음 세운 가설: 네 가지로 나눈 뒤, 텍스트 쓰기와 이벤트 핸들러 붙이기를 한 종류로 보면 세 가지일 수도 있다고 생각했습니다. 위의 이유로 네 가지로 두었습니다.

</details>

#### 2. `let count = 0;`과, 클릭 핸들러에서 `count`를 바꾸는 부분은 네 가지 중 어디에도 속하지 않습니다. 이 부분들은 무슨 일을 할까요?

<details>
<summary>해설</summary>

화면에 보여 줄 상태 값을 선언하고 바꾸는 일입니다. `let count = 0;`이 상태를 선언하면서 처음 값을 정하고, 클릭 핸들러의 `count++`와 `count = 0`이 그 값을 바꿉니다. 목록에 다섯 번째로 더합니다.

| 하는 일 | 직접 짠 코드 |
|---|---|
| 상태 선언과 변경 | `let count = 0`, `count++`, `count = 0` |

> 근거: `scratch/01-vanilla-counter.html:17, 22, 32`

</details>

#### 3. 증가 버튼의 클릭 핸들러에서 `render();` 줄을 지우면 화면의 카운터는 어떻게 될까요?

<details>
<summary>해설</summary>

화면은 바뀌지 않습니다. 다만 상태 값 자체(`count` 변수)는 클릭할 때마다 올라갑니다. 값이 바뀌는 것과 화면에 다시 쓰는 것은 별개의 일이고, 직접 짠 코드에서는 개발자가 상태를 바꿀 때마다 `render()`를 불러서 둘을 손으로 이어 줍니다. 목록에 여섯 번째로 더합니다.

| 하는 일 | 직접 짠 코드 |
|---|---|
| 상태가 바뀌면 화면을 다시 그리기 | 클릭 핸들러 안의 `render()` 호출 |

> 근거: 실험 `scratch/01-vanilla-counter-no-render.html`(증가 버튼의 핸들러에서 `render()`를 뺀 사본)을 브라우저에서 세 번 클릭한 결과
>
> | | 화면의 버튼 글자 | `count` 변수 |
> |---|---|---|
> | 처음 | 0 | 0 |
> | 클릭 1번 뒤 | 0 | 1 |
> | 클릭 2번 뒤 | 0 | 2 |
> | 클릭 3번 뒤 | 0 | 3 |

> 처음 세운 가설: "화면에서 상태값이 업데이트되지 않는다"고 예측했고, 그대로였습니다. 실험으로 상태 값 자체는 바뀐다는 점을 덧붙였습니다.

</details>

#### 4. 여섯 가지 일을 컴파일 결과에서는 각각 어느 줄이 할까요?

<details>
<summary>해설</summary>

함수 이름과 위치로 짐작해서 짝을 지으면 다음과 같습니다. 아래 5~7번 유도 질문에서 채운 줄까지 합친 표입니다.

| 하는 일 | 직접 짠 코드 | 컴파일 결과 |
|---|---|---|
| 1. 요소 만들기 | `createElement(…)` | `$.template(…)`(6행)에 세 요소의 HTML을 문자열로 담아 두고, `root()`(10행)를 불러 그 요소들을 한꺼번에 얻음 |
| 2. 텍스트 쓰기 | `.innerText = …` | `$.template_effect` 콜백 안의 `$.set_text(…)`(29-30행) |
| 3. 이벤트 핸들러 붙이기 | `.addEventListener(…)` | `on_click`, `on_click_1`(4-5행)을 `button.__click`, `button_1.__click`(13, 26행)에 저장 |
| 4. 요소를 문서에 넣기 | `appendChild(…)` | `$.append($$anchor, fragment)`(33행) |
| 5. 상태 선언과 변경 | `let count = 0`, `count++`, `count = 0` | `$.state(0)`(9행), 핸들러 안의 `$.update(count)`, `$.set(count, 0)`(4-5행) |
| 6. 상태가 바뀌면 화면을 다시 그리기 | 핸들러 안의 `render()` 호출 | 없음. `$.template_effect`(28-31행)의 콜백이 다시 실행됨 |

> 근거: `scratch/compiled/01-counter.compiled.js:4-36`

텍스트 쓰기(2)와 다시 그리기(6)가 컴파일 결과에서는 한 곳에 모여 있습니다. 직접 짠 코드는 텍스트를 쓰는 `render()`를 만들어 두고 상태를 바꿀 때마다 직접 불렀지만, 컴파일 결과는 텍스트를 쓰는 코드를 `$.template_effect`에 한 번 등록해 둡니다.

</details>

#### 5. 표에서 아직 짝을 못 찾은 줄(`on_click`, `root()`, `$.first_child`, `$.child`, `$.reset`, `$.sibling`, `$.delegate`)은 각각 어느 행에 속할까요?

<details>
<summary>해설</summary>

- `var fragment = root();`(10행)는 템플릿 문자열에 담긴 요소들을 실제 노드로 얻어 오는 줄로 보이므로 1번(요소 만들기)입니다. 문자열에서 노드를 어떻게 만드는지는 1-1장에서 다룹니다.
- `on_click`, `on_click_1`(4-5행)은 이벤트 핸들러 함수이므로 3번입니다. 다만 그 몸통은 5번 일을 합니다(6번 유도 질문).
- `$.first_child`, `$.child`, `$.reset`, `$.sibling`(11-24행)은 여섯 가지 어디에도 속하지 않습니다. 직접 짠 코드에는 짝이 없는, 컴파일 결과에만 있는 일입니다(8번 유도 질문에서 다룹니다).
- `$.delegate(["click"])`(36행)도 짝을 찾지 못한 채로 남겨 두었습니다.

> 근거: `scratch/compiled/01-counter.compiled.js:4-5, 10-24, 36`

</details>

#### 6. `on_click`의 몸통 `$.update(count)`는 직접 짠 코드의 어느 줄과 같은 일을 할까요?

<details>
<summary>해설</summary>

`count++`와 같은 일입니다. `$.update`는 상태의 현재 값을 읽어서 1 큰 값을 `set`으로 넣습니다. `on_click_1`의 `$.set(count, 0)`은 `count = 0`에 해당합니다. 둘 다 5번(상태 선언과 변경) 행에 들어갑니다.

> 근거: `svelte/packages/svelte/src/internal/client/runtime.js:969-972`(`update`가 `set(signal, value + d)`를 호출)

> 처음 세운 가설: 증가 버튼의 클릭 핸들러 전체(`count++`와 `render()`)에 해당한다고 보았습니다. `count++`에 해당하는 것은 맞지만, `on_click`에는 `render()`에 해당하는 줄이 없습니다. 그 일은 7번 유도 질문에서 찾았습니다.

</details>

#### 7. 컴파일 결과는 `render()`를 직접 부르지 않습니다. 그럼 `count`가 바뀌었을 때 새 값을 화면에 쓰는 것은 무엇일까요?

<details>
<summary>해설</summary>

`$.template_effect`에 넘긴 콜백이 다시 실행되면서 `$.set_text`로 새 값을 씁니다. 직접 짠 코드는 상태를 바꾼 사람이 `render()`를 불러야 하지만, 컴파일 결과에서는 "다시 실행할 코드"를 `$.template_effect`에 미리 등록해 두고 상태가 바뀌면 그 코드가 다시 실행됩니다. `template_effect`는 받은 함수로 effect(`block`)를 만듭니다.

> 근거: `scratch/compiled/01-counter.compiled.js:28-31`, `svelte/packages/svelte/src/internal/client/reactivity/effects.js:322-328`

effect가 `count`가 바뀐 것을 어떻게 아는지는 1-4장과 2단계(signal 시스템)에서 다룹니다.

</details>

#### 8. `$.first_child`, `$.child`, `$.sibling`은 무엇을 하려는 것이고, 직접 짠 코드에는 왜 이런 줄이 필요 없을까요?

<details>
<summary>해설</summary>

`root()`가 한꺼번에 반환한 요소 묶음에서, 다룰 노드를 하나씩 찾아 변수에 담는 일입니다.

- `$.first_child(fragment)`: 묶음의 첫 요소(증가 버튼)
- `$.sibling(button, 2)`: 그 요소에서 옆으로 두 칸 간 노드(문단)
- `$.child(button)`: 버튼 안의 텍스트 노드(나중에 값을 쓸 자리)

직접 짠 코드는 `createElement`가 만든 요소를 그 자리에서 바로 변수에 담기 때문에 찾을 필요가 없습니다. 컴파일 결과는 템플릿 문자열 하나에 세 요소를 담아 두고 `root()`로 한꺼번에 얻기 때문에, 그중에서 필요한 노드를 찾아가야 합니다. 이 일은 직접 짠 코드에는 없는 일곱 번째 일입니다.

| 하는 일 | 직접 짠 코드 | 컴파일 결과 |
|---|---|---|
| 7. 다룰 노드를 찾아가기 | 없음 (만들 때 이미 변수에 있음) | `$.first_child`, `$.child`, `$.sibling`(11-24행) |

> 근거: `scratch/compiled/01-counter.compiled.js:10-24`

함께 나오는 `$.reset`은 아직 무엇을 하는지 모르는 줄로 남겨 두고, 노드를 찾아가는 방법은 1-2장에서 다룹니다.

</details>

#### 9. 컴파일 결과에는 `addEventListener`가 없고 `__click` 속성에 핸들러를 저장하기만 합니다. 마지막 줄 `$.delegate(["click"])`은 무슨 일을 할까요?

<details>
<summary>해설</summary>

클릭 처리를 버튼마다 하지 않고 한 곳에 맡기는(위임하는) 일입니다.

- `$.delegate(["click"])`은 `"click"`이라는 이벤트 이름을 전역 목록에 등록합니다. 컴포넌트의 리스너가 아니라 이벤트 종류를 등록합니다.
- 앱을 마운트할 때, 등록된 이벤트 이름마다 마운트한 자리(`target`)와 `document`에 리스너를 하나씩 붙입니다. 버튼에는 붙이지 않습니다.
- 클릭하면 그 리스너가 클릭된 요소부터 부모 쪽으로 올라가며 `__click` 속성을 찾고, 찾으면 저장된 핸들러를 `count`와 함께 호출합니다.

그래서 표의 3번(이벤트 핸들러 붙이기)은 컴파일 결과에서 `__click`(핸들러를 저장할 자리)과 `$.delegate`(공용 리스너)의 짝입니다.

| 하는 일 | 직접 짠 코드 | 컴파일 결과 |
|---|---|---|
| 3. 이벤트 핸들러 붙이기 | 버튼마다 `.addEventListener('click', …)` | 버튼마다 `__click`에 핸들러 저장(13, 26행) + `$.delegate(["click"])`(36행)로 공용 리스너 등록 |

> 근거: `svelte/packages/svelte/src/internal/client/dom/elements/events.js:123-131`(`delegate`), `svelte/packages/svelte/src/internal/client/render.js:194-219`(마운트할 때 `target`과 `document`에 리스너), `svelte/packages/svelte/src/internal/client/dom/elements/events.js:210-228`(부모 쪽으로 올라가며 `__click`을 찾아 호출)

> 처음 세운 가설: "이 컴포넌트에서 등록한 모든 이벤트 리스너의 처리를 전역으로 위임한다"고 보았습니다. 위임한다는 것은 맞습니다. 다만 등록하는 것은 이벤트 종류(`"click"`)이고, 리스너는 마운트한 자리와 `document`에 붙습니다. 왜 이렇게 하는지는 1-6장에서 다룹니다.

</details>

#### 10. 직접 짠 코드와 컴파일 결과가 다른 일곱 군데에 대해, "Svelte는 왜 이렇게 했을까?"라는 질문을 하나씩 적는다면?

<details>
<summary>해설</summary>

일곱 가지 차이와 질문, 그 질문을 다루는 장은 다음과 같습니다. 1단계의 나머지 장은 이 질문들에 하나씩 답합니다.

| 차이 | 직접 짠 코드 | 컴파일 결과 | 왜 질문 | 다루는 장 |
|---|---|---|---|---|
| 1. 요소 만들기 | `createElement`로 하나씩 | 템플릿 문자열 하나에서 세 요소를 한꺼번에(`$.template`, `root()`) | 왜 `createElement`라는 DOM 생성 API를 쓰지 않고 템플릿 문자열로 요소를 만들까? | 1-1 |
| 7. 노드 찾아가기 | 없음 | `$.first_child`, `$.child`, `$.sibling` | 왜 노드를 찾아가는 코드가 따로 있을까? | 1-2 |
| 4. 문서에 넣기 | 요소마다 `appendChild` | `$.append($$anchor, fragment)` 한 번 | 왜 요소마다 `appendChild`로 넣지 않을까? | 1-3 |
| 2. 텍스트 쓰기 | `.innerText = …` | `$.set_text(…)` | 왜 `.innerText`를 쓰지 않을까? (`$.set_text` 안에서 쓸 수도 있겠지만) | 1-4 |
| 6. 다시 그리기 | `render()`를 직접 호출 | `$.template_effect`의 콜백이 알아서 다시 실행됨 | 왜 다시 그리기를 직접 부르지 않고, 그리는 코드가 알아서 다시 실행되게 했을까? | 1-4 |
| 5. 상태 선언과 변경 | `let count = 0`, `count++` | 원본의 `$state(0)` → `$.state(0)`, `$.update(count)` | 왜 상태를 그냥 `let` 변수로 두지 않고, `$state`로 선언하게 한 뒤 `$.state()`와 `$.update()`로 바꿀까? | 1-5 (원리는 2단계) |
| 3. 이벤트 붙이기 | 버튼마다 `addEventListener` | 버튼마다 `__click`에 저장 + `$.delegate`로 공용 리스너 | 왜 버튼마다 `__click`이라는 속성에 핸들러를 저장하고, 공용 리스너로 처리할까? | 1-6 |

> 근거: 1~9번 유도 질문의 해설, 장 번호는 `curriculum/01-compiled-output.md`의 "학습 경로" 표

> 처음 세운 가설: 6번(다시 그리기)은 5번(상태 선언과 변경)과 이어지는 질문이라고 보고 따로 적지 않았습니다. 5번은 "상태를 어떻게 선언하고 바꾸나", 6번은 "다시 그리기를 누가 부르나"라서 다루는 장이 달라, 질문을 따로 두었습니다. 5번의 `$.state()`를 rune이라고 불렀는데, rune은 원본의 `$state`이고 `$.state()`는 그 rune이 바뀌어 들어간 런타임 함수입니다.

</details>

---

## 1-1. 노드를 만드는 방법: 템플릿 파싱과 복제

### Q1.1 [관찰] `$.template`의 두 번째 인자(없음, 1, 3)는 무엇을 뜻하는가

#### 1. 카운터의 컴파일 결과에서 `$.template(...)`의 두 번째 인자는 `1`입니다. 이 템플릿의 어떤 특징 때문에 `1`이 붙었을까요?

<details>
<summary>해설</summary>

카운터 템플릿은 `<button>`, `<p>`, `<button>` 세 요소가 감싸는 요소 없이 **형제로 나란히** 놓여 있습니다. 최상위 노드가 여러 개라는 점이 `1`을 붙이는 조건입니다.

`01-static`(최상위에 `<h1>`과 `<p>`), `02-single-element`(최상위에 `<h1>` 하나), `11-custom-element`(최상위에 `<my-widget>`과 `<p>`)를 컴파일해서 비교하면 이 가설을 확인할 수 있습니다.

| 파일 | 최상위 구성 | 두 번째 인자 | `root()`의 반환값을 받는 변수 |
|---|---|---|---|
| `02-single-element` | `<h1>` 하나 | 없음 | `h1` |
| `01-static` | `<h1>`, `<p>` | `1` | `fragment` |
| `11-custom-element` | `<my-widget>`, `<p>` | `3` | `fragment` |

> 근거: `scratch/compiled/01-static.compiled.js:4`, `scratch/compiled/02-single-element.compiled.js:4`, `scratch/compiled/11-custom-element.compiled.js:4`

변수 이름도 같은 방향을 가리킵니다. 인자가 `1`이면 컴파일러는 반환값을 `fragment`라고 부르고, 인자가 없으면 그 요소의 이름(`h1`)으로 부릅니다.

</details>

#### 2. `11-custom-element`도 형제가 두 개인데 `3`이 붙었습니다. `3`을 이진수로 쓰면 어떤 비트가 켜져 있고, `1`이 아닌 나머지 비트는 무엇을 뜻할까요?

<details>
<summary>해설</summary>

`3`은 이진수로 `11`이므로 **두 비트가 모두 켜져** 있습니다. 낮은 자리 비트(값 1)는 1번 질문에서 본 "최상위 노드가 여러 개"입니다. `01-static`과 `11-custom-element`의 차이는 첫 요소가 커스텀 엘리먼트라는 점뿐이므로, 높은 자리 비트(값 2)는 커스텀 엘리먼트와 관련이 있습니다.

> 처음 세운 가설: 처음에는 "`3`에서 1이 아닌 나머지 비트는 0이고, 그 기능이 꺼져 있다는 뜻"이라고 생각했습니다. `11`에는 꺼진 비트가 없다는 점을 바로잡은 뒤, "낮은 비트는 최상위 노드가 여러 개인지, 높은 비트는 커스텀 엘리먼트가 있는지"라는 모델에 도달했습니다.

</details>

#### 3. 이 모델이 맞다면, 최상위에 `<my-widget></my-widget>` 하나만 있는 컴포넌트의 두 번째 인자는 무엇이 될까요?

<details>
<summary>해설</summary>

`2`(이진수 `10`)가 됩니다. 커스텀 엘리먼트는 있고 최상위 노드는 하나뿐이기 때문입니다. 컴파일해 보면 예측대로 `2`가 나오고, 반환값을 받는 변수도 `fragment`가 아니라 `my_widget`입니다.

> 근거: `scratch/11b-single-custom-element.svelte`, `scratch/compiled/11b-single-custom-element.compiled.js:4`

이로써 네 가지 조합(`없음`, `1`, `2`, `3`)을 모두 관찰했고, 두 비트가 서로 독립적인 플래그이며 OR로 합쳐진다는 해석이 실험으로 뒷받침됩니다. 두 플래그의 실제 이름은 `TEMPLATE_FRAGMENT`(1)와 `TEMPLATE_USE_IMPORT_NODE`(2)입니다.

> 근거: `src/constants.js:18-19`

컴파일러는 템플릿에 커스텀 엘리먼트가 있으면 두 번째 플래그를 켭니다.

> 근거: `src/compiler/phases/3-transform/client/visitors/RegularElement.js:62-69`

</details>

#### 4. 두 번째 플래그의 이름은 "커스텀 엘리먼트가 있다"는 조건이 아니라 `USE_IMPORT_NODE`라는 동작을 가리킵니다. 이 동작은 커스텀 엘리먼트가 없을 때 쓰는 방식과 무엇이 다를까요?

<details>
<summary>해설</summary>

런타임은 이 플래그에 따라 `document.importNode(node, true)`와 `node.cloneNode(true)` 중 하나로 템플릿을 복제합니다.

> 근거: `src/internal/client/dom/template.js:29`, `:51-53`

복제할 원본은 `<template>` 요소의 `.content`입니다. 이 `DocumentFragment`는 현재 페이지가 아니라 브라우저가 따로 만들어 둔 **비활성 document**에 속합니다. `cloneNode`는 복제본의 소속을 원본에서 그대로 물려받으므로 복제본도 비활성 document에 남고, 그래서 커스텀 엘리먼트가 업그레이드되지 않습니다. `importNode`는 복제하면서 소속을 현재 `document`로 바꾸므로 그 자리에서 업그레이드가 일어납니다.

> 근거: `src/internal/client/dom/reconciler.js` (`create_fragment_from_html`), `scratch/01-clone-vs-import.html`

| | `cloneNode` | `importNode` |
|---|---|---|
| `ownerDocument === document` | `false` | `true` |
| `instanceof MyWidget` (업그레이드됨) | `false` | `true` |
| `widget.label = 'hi'`에서 setter 호출 | 호출되지 않음 | 호출됨 |

근본 원인은 `cloneNode` 자체가 아니라 원본이 비활성 document에 있다는 사실입니다. 원본이 현재 `document`에 있으면 `cloneNode`로 복제해도 업그레이드됩니다.

> 처음 세운 가설: 실험 표의 빈칸을 예측했지만 모두 틀렸습니다. `<template>`의 `.content`가 비활성 document에 속한다는 배경지식이 없으면 예측하기 어려운 결과입니다.

`.content`와 비활성 document는 T1.1에, 업그레이드된 요소의 setter가 인스턴스가 아니라 프로토타입에 있는 이유는 T1.2에 자세히 정리했습니다.

</details>

#### 5. `cloneNode`로 복제해서 업그레이드되지 않은 `<my-widget>`에 Svelte가 `label` 값을 넘기면 어떻게 될까요?

<details>
<summary>해설</summary>

컴파일 결과는 템플릿을 복제한 직후, 문서에 넣기도 전에 `$.set_custom_element_data(my_widget, "label", "hello")`를 호출합니다. 이 함수는 `get_setters`로 요소의 프로토타입 체인을 따라 올라가며 setter를 찾고, `label` setter가 있으면 속성으로 대입합니다.

> 근거: `scratch/compiled/11b-single-custom-element.compiled.js:9`, `src/internal/client/dom/elements/attributes.js:138-144`, `:315-336`

업그레이드되지 않은 요소의 프로토타입 체인에는 `MyWidget.prototype`이 없으므로 setter를 찾지 못합니다. 그러면 `else` 분기의 `set_attribute`가 `element.setAttribute()`로 값을 HTML attribute에 기록합니다.

> 근거: `src/internal/client/dom/elements/attributes.js:119`

attribute 값은 항상 문자열이므로, `data={{ items: [1, 2, 3] }}`처럼 객체를 넘기면 `"[object Object]"`가 저장되어 커스텀 엘리먼트가 원래 객체를 받지 못합니다(T1.3). 이것이 커스텀 엘리먼트가 있을 때 `importNode`를 써야 하는 이유입니다.

</details>

#### 6. 반대로 `TEMPLATE_FRAGMENT`가 꺼져 있으면, 런타임은 파싱한 결과에서 무엇을 꺼내고 `root()`는 무엇을 돌려줄까요?

<details>
<summary>해설</summary>

`is_fragment`가 `false`이면 파싱한 fragment에서 **첫 번째 자식 노드만** 꺼내서 원본으로 저장합니다. 그래서 `root()`는 `DocumentFragment`가 아니라 그 노드 하나를 돌려줍니다. `02-single-element`에서 변수 이름이 `h1`이었던 이유가 이것입니다.

> 근거: `src/internal/client/dom/template.js:48`

런타임은 이후 이 컴포넌트의 시작 노드와 끝 노드도 다르게 기록합니다. fragment이면 첫 노드와 마지막 노드를, 아니면 복제한 노드 자체를 시작과 끝으로 기록합니다.

> 근거: `src/internal/client/dom/template.js:55-62`

</details>

#### 7. `01-static`의 컴파일 결과에서 두 번째 인자 `1`만 지우면, 마운트했을 때 화면에 무엇이 나올까요?

<details>
<summary>해설</summary>

`<h1>Hello</h1>`만 나옵니다. 48번째 줄이 fragment에서 첫 번째 자식인 `<h1>`만 꺼내기 때문에, 그 뒤의 공백 텍스트 노드와 `<p>`는 사라집니다. 에러 없이 조용히 일부 내용이 빠지므로, 컴파일러가 이 플래그를 정확하게 붙여야 한다는 것을 알 수 있습니다.

> 근거: `scratch/compiled/01-static.no-fragment-flag.js`
>
> ```
> 원본:          html: <h1>Hello</h1> <p>This component has no state at all.</p>
> 플래그 제거:   html: <h1>Hello</h1>
> ```

</details>

---

### Q1.4 (1) [추적] 템플릿의 HTML 파싱은 언제, 몇 번 일어나는가

Q1.4는 세 가지를 묻습니다. 이 중 파싱 시점은 이 장에서, `<!>`와 빈 텍스트 노드는 1-3장에서 다룹니다.

#### 1. `var root = $.template(...)`은 컴포넌트 함수 바깥(모듈 최상위)에 있고, `var fragment = root()`는 컴포넌트 함수 안에 있습니다. 같은 컴포넌트를 세 번 마운트하면 `create_fragment_from_html`은 몇 번 호출될까요?

<details>
<summary>해설</summary>

**한 번**만 호출됩니다.

1. 모듈을 처음 불러올 때 모듈 최상위의 `$.template(...)`이 한 번 실행됩니다. 이 호출은 클로저 변수(`node` 등)를 준비하고 화살표 함수를 돌려줍니다. `root`가 바로 그 화살표 함수입니다.
2. 컴포넌트를 마운트할 때마다 `root()`가 호출됩니다.
3. 첫 번째 `root()` 호출에서 `node`가 아직 `undefined`이므로 HTML을 파싱해서 `node`에 저장합니다. 두 번째 호출부터는 저장된 `node`를 복제만 해서 돌려줍니다.

> 근거: `src/internal/client/dom/template.js:27-32` (클로저 변수), `:46-49` (`node === undefined`일 때만 파싱), `:51-53` (복제)

</details>

#### 2. 컴포넌트 모듈을 `import`만 하고 아직 한 번도 마운트하지 않았다면, HTML 파싱은 이미 일어났을까요?

<details>
<summary>해설</summary>

일어나지 않았습니다. `$.template()`은 클로저 변수를 준비할 뿐이고, 파싱(`create_fragment_from_html`)은 돌려준 화살표 함수 안에 있습니다. 파싱은 처음 필요해지는 순간, 즉 첫 번째 `root()` 호출까지 미뤄집니다.

> 근거: `scratch/01-template-parse-count.mjs` (파싱할 때마다 호출되는 `document.createElement('template')`의 횟수를 셉니다)
>
> ```
> import 직후        파싱 횟수: 0
> 1번째 마운트 후    파싱 횟수: 2
> 2번째 마운트 후    파싱 횟수: 2
> 3번째 마운트 후    파싱 횟수: 2
> ```

</details>

#### 3. 위 실험에서 `09-anchors`를 한 번 마운트했을 때 파싱이 1번이 아니라 2번 일어난 이유는 무엇일까요?

<details>
<summary>해설</summary>

이 컴포넌트에는 템플릿이 `root`와 `root_1` 두 개 있기 때문입니다. `{#if show}<span>first</span>{/if}`의 내용은 메인 템플릿에 들어가지 않고 별도의 템플릿 `root_1`로 분리되며, 각 화살표 함수가 처음 호출될 때 한 번씩 파싱합니다.

> 근거: `scratch/compiled/09-anchors.compiled.js:4-5`

`root_1()`은 `$.if`의 콜백 안에서만 호출되므로, 조건이 참이라서 실제로 그려야 할 때만 파싱됩니다. `show`를 `false`로 바꾼 사본으로 실험하면 첫 마운트 후의 파싱 횟수는 1입니다. 화면에 한 번도 나타나지 않는 분기는 파싱 비용도 들지 않습니다.

> 근거: `scratch/compiled/09-anchors.compiled.js:13-17`, `scratch/09c-anchors-show-false.svelte`
>
> ```
> $ node scratch/01-template-parse-count.mjs scratch/09c-anchors-show-false.svelte
> import 직후        파싱 횟수: 0
> 1번째 마운트 후    파싱 횟수: 1
> ```

</details>

---

### Q1.6 [설명] 템플릿 복제 방식과 `createElement` 방식의 장단점, `importNode`

아직 진행하지 않았습니다.

---

## 1-2. 노드를 찾아가는 방법: 탐색과 공백 자리

### Q1.3 [예측] `09-anchors`의 템플릿 문자열과 `$.sibling` 이동 횟수

#### 1. 컴파일하기 전에 예측해 보세요. `09-anchors.svelte`의 템플릿 문자열은 어떤 모양이 될까요?

```svelte
{#if show}<span>first</span>{/if}
{name} is the second node
<b>static</b>
<i>static</i>
<em>{name}</em>
```

<details>
<summary>해설</summary>

실제 템플릿 문자열은 `` `<!> <b>static</b> <i>static</i> <em> </em>` ``입니다.

> 근거: `scratch/compiled/09-anchors.compiled.js:5`

> 처음 세운 가설: `<span data-if="show"></span> <b></b> <i></i> <em> </em>`라고 예측했습니다. 동적인 텍스트 자리에 공백 한 칸을 넣는 것(`<em> </em>`)과 요소 사이의 공백은 맞았지만, 세 군데가 달랐습니다.

1. `{#if}` 블록은 `<!>` 하나(빈 HTML 주석)로 표시되고, 블록의 내용 `<span>first</span>`은 별도의 템플릿 `root_1`로 분리됩니다.
2. 바뀌지 않는 텍스트 `static`은 템플릿에 그대로 들어갑니다. 공백 한 칸으로 비워 두는 것은 동적인 텍스트뿐입니다.
3. 원본 7번째 줄 `{name} is the second node`는 템플릿 문자열에서 글자로 보이지 않습니다. 이 텍스트가 어디로 갔는지는 다음 질문에서 봅니다.

</details>

#### 2. 원본 7번째 줄 `{name} is the second node`는 템플릿 문자열의 어느 부분에 들어가 있을까요? `set_text`가 쓰는 문자열의 앞뒤를 살펴보세요.

<details>
<summary>해설</summary>

`<!>`와 `<b>` 사이의 공백 한 칸이 이 텍스트의 자리입니다. 원본에서 `{/if}` 뒤의 줄바꿈, `{name} is the second node`, `<b>` 앞의 줄바꿈이 텍스트 노드 하나로 합쳐졌습니다. 그래서 `set_text`가 쓰는 문자열의 앞뒤에도 공백이 붙어 있습니다.

> 근거: `scratch/compiled/09-anchors.compiled.js:19` (`text = $.sibling(node)`), `:26` (`` ` ${name ?? ""} is the second node ` ``)

요소 사이의 공백 한 칸이 왜 남는지는 T1.8에 정리했습니다.

</details>

#### 3. `text`(`<!>` 다음의 텍스트 노드)에서 출발해서 `$.sibling(text, 5)`로 `<em>`에 도착합니다. 그 사이의 형제 노드를 순서대로 나열하면 왜 `5`가 될까요?

<details>
<summary>해설</summary>

`text` → `<b>` → 공백 → `<i>` → 공백 → `<em>` 순서로 다섯 번 이동합니다. 요소 사이의 공백도 텍스트 노드이므로 형제 노드 하나로 셉니다. `sibling`은 `count`만큼 `nextSibling`을 따라가는 단순한 반복문입니다.

> 근거: `scratch/compiled/09-anchors.compiled.js:20`, `src/internal/client/dom/operations.js:147-152`

</details>

#### 4. `<em>`은 `var em`으로 변수에 담겼지만, 그 사이의 `<b>`와 `<i>`를 담는 변수는 없습니다. 컴파일러는 어떤 기준으로 건너뛰었을까요?

<details>
<summary>해설</summary>

`<b>static</b>`과 `<i>static</i>`은 **정적인 요소**이기 때문입니다. 컴파일러는 노드를 순회하면서 정적인 요소를 만나면 변수를 만들지 않고 `skipped` 개수만 늘리며, 이 개수가 `$.sibling`의 숫자가 됩니다.

> 근거: `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:100-101`

정적인지는 `is_static_element`가 판단합니다. 자식에 동적인 내용이 있거나, 이벤트 속성이나 값이 표현식인 속성이 있으면 정적이 아닙니다. `<em>{name}</em>`은 지역 이름 `name`에 의존하는 동적인 내용이 있으므로 정적이 아니고, 그래서 런타임에 그 안의 텍스트 노드를 갱신하려고 변수에 담습니다.

> 근거: `src/compiler/phases/3-transform/client/visitors/shared/fragment.js:128-158`, `scratch/compiled/09-anchors.compiled.js:21-27`

컴파일러가 노드를 변수에 담는다는 것은 런타임에 그 노드로 무언가를 해야 한다는 뜻이고, 아무것도 할 일이 없는 노드는 탐색 횟수로만 표현됩니다.

</details>

#### 5. `<b>`에 `onclick={() => console.log('hi')}`를 붙이면, `<b>`는 여전히 건너뛰어질까요? `<em>`에 도달하는 `$.sibling`의 숫자는 그대로 `5`일까요?

<details>
<summary>해설</summary>

`<b>`를 담는 변수 `b`가 생깁니다. 클릭 핸들러를 `b.__click`에 저장해야 하므로 런타임에 `<b>`로 할 일이 생겼기 때문입니다. 템플릿 문자열은 `<b>static</b>` 그대로이고, `onclick` 속성은 템플릿에 들어가지 않습니다.

숫자는 `5`가 아니라 `4`가 됩니다. 형제 노드가 새로 생긴 것은 아니므로 `text`에서 `<em>`까지의 거리는 여전히 `1 + 4 = 5`입니다. 달라진 것은 **출발점**입니다. 컴파일러는 마지막으로 변수에 담은 노드에서 다음 탐색을 시작하므로, 이제 `b`에서 출발해서 네 번 이동합니다.

> 근거: `scratch/09b-anchors-with-event.svelte`, `scratch/compiled/09b-anchors-with-event.compiled.js:20-25`
>
> ```js
> var text = $.sibling(node);
> var b = $.sibling(text);
> b.__click = [on_click];
> var em = $.sibling(b, 4);
> ```

> 처음 세운 가설: 변수가 생긴다는 것은 맞혔지만, "새로운 형제 노드가 생긴 것은 아니니까" 숫자는 그대로 `5`일 것이라고 예측했습니다.

</details>

---

### Q1.2 [관찰] `<p></p>`와 `<p> </p>`는 왜 다른가

#### 1. `03-text-kinds`의 템플릿 문자열에서 첫 번째 `<p>`만 `<p></p>`로 비어 있고, 나머지 다섯 개는 `<p> </p>`처럼 공백을 갖습니다. 첫 번째 `<p>`(`constant: {name}`)는 나머지와 무엇이 다를까요?

<details>
<summary>해설</summary>

첫 번째 `<p>`가 읽는 `name`은 `const`로 선언된 바뀌지 않는 값이고, 나머지 `<p>`는 `$state`로 선언된 `count`를 읽습니다. 바뀌지 않는 텍스트는 `p.textContent = ...`로 한 번 쓰고 끝내므로 템플릿의 `<p>`는 비어 있습니다.

> 근거: `scratch/compiled/03-text-kinds.compiled.js:5` (템플릿 문자열), `:18` (`p.textContent = ...`)

바뀔 수 있는 텍스트는 나중에 `set_text`로 갱신해야 합니다. 공백 한 칸은 **나중에 값이 들어갈 텍스트 노드를 템플릿 단계에서 미리 만들어 두는 자리**입니다. 템플릿을 복제하면 이 텍스트 노드도 함께 복제되므로, 런타임은 노드를 따로 만들지 않고 `$.child`로 찾아가기만 하면 됩니다.

> 근거: `scratch/compiled/03-text-kinds.compiled.js:21` (`$.child(p_1)`), `:54` (`$.set_text(text, ...)`)

</details>

#### 2. 상태를 읽는 `<p>`도 `template_effect` 안에서 매번 `textContent`를 대입하면 공백 자리가 필요 없습니다. 그런데 Svelte는 왜 텍스트 노드의 `nodeValue`를 바꾸는 `set_text`를 쓸까요?

<details>
<summary>해설</summary>

`textContent`를 대입하면 값을 바꿀 때마다 기존 텍스트 노드를 제거하고 새 노드를 만들어 붙입니다. `nodeValue`를 바꾸면 처음 복제된 텍스트 노드를 그대로 두고 내용만 바꿉니다.

> 근거: `src/internal/client/render.js:50-59` (`set_text`), `scratch/01-textcontent-vs-nodevalue.mjs`

다만 `nodeValue` 방식도 DOM 변경이며, 브라우저는 바뀐 텍스트를 다시 그려야 합니다. 아끼는 것은 노드의 생성, 제거, 삽입입니다. 실험 결과는 T1.5에 정리했습니다.

</details>

#### 3. `<p>call: {format(name)}</p>`처럼 상태를 전혀 읽지 않는 함수 호출만 있다면, 이 `<p>`는 `<p></p>`가 될까요, `<p> </p>`가 될까요? `name`은 `const`이고, `format`도 상태를 읽지 않는 평범한 함수입니다.

<details>
<summary>해설</summary>

`<p> </p>`가 되고, `template_effect` 안에서 `set_text`로 갱신하는 코드가 생성됩니다. 컴파일러는 이 함수 호출을 "결과가 바뀔 수 있다"고 판단했습니다.

> 근거: `scratch/03b-static-call.svelte`, `scratch/compiled/03b-static-call.compiled.js:4`, `:16`

> 처음 세운 가설: `name`과 `format()` 둘 다 상태와 관련 없는 정적인 로직이므로 `<p></p>`가 될 것이라고 예측했습니다.

</details>

#### 4. 컴파일러가 "이 함수 호출은 결과가 절대 바뀌지 않는다"고 확신하려면 무엇을 알아야 할까요? 함수 본문이 매개변수와 자체 선언한 변수만 쓰는지 확인하면 충분할까요?

<details>
<summary>해설</summary>

충분하지 않습니다. 함수 본문이 매개변수만 써도, 인자로 `$state` 객체가 들어오면 결과가 바뀝니다.

```svelte
<script>
	let counter = $state({ count: 0 });
	function format(n) { return `#${n.count}`; }
</script>

<p>call: {format(counter)}</p>
```

`n.count`를 읽는 동작이 곧 상태를 읽는 동작이므로, `counter.count`를 바꾸면 텍스트도 바뀌어야 합니다. 무엇이 인자로 들어오는지는 함수 정의가 아니라 호출하는 쪽에서 정해지므로, 함수 본문만 분석해서는 판단할 수 없습니다. 모든 경우를 정확하게 가려내려면 프로그램 전체의 데이터 흐름을 추적해야 합니다.

> 처음 세운 가설: "함수가 import한 것이 아니고 본문이 자체 선언한 변수와 매개변수로만 이루어져 있으면 컴파일 타임에 판단할 수 있다"고 생각했습니다. 위의 반례를 보고, 인자로 반응형 객체가 들어올 수 있다는 점이 빠져 있었음을 확인했습니다.

</details>

#### 5. 그렇다면 컴파일러가 보수적으로 만든 `format(name)`의 `template_effect`는, 처음 마운트할 때 한 번 실행된 뒤에 다시 실행될 일이 있을까요?

<details>
<summary>해설</summary>

없습니다. 다만 그 이유는 "`name`이 상수이고 `format`이 순수 함수라서"가 아닙니다. 그것은 코드를 읽은 사람이 아는 사실이고, 런타임은 모릅니다. 런타임이 아는 것은 effect를 처음 실행하는 동안 실제로 어떤 상태를 읽었는가뿐이며, 이 effect는 아무 상태도 읽지 않았으므로 다시 실행될 계기가 없습니다.

런타임은 한 걸음 더 나아가서, 처음 실행한 뒤 의존성도 DOM도 정리 함수도 없는 effect는 effect 트리에 아예 추가하지 않습니다.

> 근거: `src/internal/client/reactivity/effects.js:137-145`, `template_effect`는 `block()`을 거쳐 `sync = true`로 만들어짐(`effects.js:322-337`)

정리하면 컴파일러는 확신할 수 없으면 "바뀔 수 있다"고 보수적으로 판단하고, 런타임은 실행해 보고 실제로 읽은 상태를 기준으로 정확하게 추적합니다. 보수적으로 판단해서 생기는 비용은 effect를 한 번 만들고 실행하는 정도로 줄어듭니다.

</details>

#### 6. 함수 호출인데도 `textContent`로 정적 처리되는 경우가 있습니다. `{Math.max(1, 2)}`는 정적, `{String(name)}`과 `{format(name)}`은 동적으로 처리됩니다. 컴파일러가 실제로 확인하는 것은 무엇일까요?

<details>
<summary>해설</summary>

컴파일러는 함수 호출을 만나면 두 가지를 확인하고, 둘 중 하나라도 걸리면 동적으로 처리합니다.

1. **호출하는 함수가 `is_pure`인가**: 함수 이름이 컴포넌트 스코프에 선언되어 있지 않으면, 즉 `Math` 같은 전역이면 `true`입니다. 함수의 본문은 분석하지 않습니다.
2. **식 안에 지역 의존성이 있는가**: 식이 컴포넌트 스코프에 선언된 이름을 하나라도 참조하면 의존성이 생깁니다. `$state`인지 `const`인지는 따지지 않습니다.

> 근거: `src/compiler/phases/2-analyze/visitors/CallExpression.js:173-181` (조건은 `:178`의 `!is_pure(...) || dependencies.size > 0`), `src/compiler/phases/2-analyze/visitors/shared/utils.js:183-198` (`binding === null`이면 `true`, `:193`), `src/compiler/phases/2-analyze/visitors/Identifier.js:90-93`

| 식 | `is_pure` | 지역 의존성 | 결과 |
|---|---|---|---|
| `{Math.max(1, 2)}` | `true` (전역) | 없음 | 정적: `textContent` |
| `{String(name)}` (`name`은 `const`) | `true` (전역) | 있음 | 동적 |
| `{format(name)}` (`format`은 지역 함수) | `false` | 있음 | 동적 |
| `{Math.max(count, 1)}` (`count`는 `$state`) | `true` (전역) | 있음 | 동적 |

> 근거: `scratch/compiled/03c-global-call.compiled.js:11`, `:16`, `scratch/compiled/03d-global-call-with-state.compiled.js:13`

`CallExpression.js`의 TODO 주석도 "의존성이 있으면 모두 상태로 가정하는데 실제로는 그렇지 않을 수 있다"고 인정하며, 거짓 양성을 감수하는 트레이드오프라고 적고 있습니다. 거짓 양성이 있더라도 데이터와 화면 사이의 반응성을 잃는 것이 더 큰 문제이기 때문입니다.

> 처음 세운 가설: `is_pure`를 처음에는 "함수 이름이 스코프 안에서 유일하면 `true`", 그다음에는 "선언된 적이 있으면 `true`"로 읽었습니다. `utils.js:193`의 `binding === null`과 주석 "globals are assumed to be safe"를 다시 읽고 "선언되지 않은 전역이면 `true`"로 바로잡았습니다.

이 트레이드오프를 Svelte 팀이 어떻게 결정했는지는 T1.6에 열린 질문으로 남겨 두었습니다.

</details>

#### 7. 컴파일러가 공백 없이 `<p></p>`라고 적어 두었다면, 복제한 `<p>` 안에는 자식 노드가 있을까요? 그러면 `$.child(p)`는 무엇을 돌려주고, 이어지는 `set_text`에서는 어떤 일이 일어날까요?

<details>
<summary>해설</summary>

자식 노드가 없습니다. HTML 파서는 빈 문자열짜리 텍스트 노드를 만들지 않습니다. 그래서 `$.child(p)`는 `null`을 돌려줍니다. `$.child`는 DOM 표준의 `firstChild` getter를 그대로 호출하고, DOM API는 "노드가 없음"을 `undefined`가 아니라 `null`로 나타냅니다.

> 근거: `src/internal/client/dom/operations.js:74-76`, `:94-97`
>
> ```
> "<p></p>"    childNodes: 0  firstChild: null
> "<p> </p>"   childNodes: 1  firstChild: " "
> ```

`text`가 `null`인 채로 `set_text(text, ...)`가 호출되면, `text.__t ??= text.nodeValue`에서 `??=`가 왼쪽 값을 확인하기도 전에 `null`에 속성 접근을 시도해서 `TypeError`가 납니다. 이 예외는 따로 처리되지 않으므로 마운트 전체가 중단되고, 컴포넌트가 문서에 들어가지 않습니다.

> 근거: `src/internal/client/render.js:54`, `scratch/compiled/03-text-kinds.no-space.js` (두 번째 `<p>`의 공백만 지운 컴파일 결과)
>
> ```
> TypeError: Cannot read properties of null (reading '__t')
> ```

그래서 컴파일러는 텍스트 노드가 반드시 생기도록, 파서가 텍스트 노드를 만드는 최소한의 내용인 공백 한 칸을 넣습니다. 이 공백은 화면에 보이지 않습니다. 복제한 뒤 문서에 넣기 전에 `template_effect`가 실제 값으로 덮어쓰기 때문입니다.

> 처음 세운 가설: `$.child`가 `undefined`를 돌려줄 것이라고 생각했고, `set_text`에서는 `if` 조건이 참이 되어 `nodeValue`에 값이 써질 것이라고 예측했습니다. 실제로는 `null`이 반환되고, 속성 접근에서 바로 에러가 납니다.

</details>

---

## 1-3. 문서에 넣는 방법: anchor와 블록

### Q1.4 (2) [추적] 앞에 붙는 `<!>`와 마운트할 때 생기는 빈 텍스트 노드

#### 1. `09-anchors`의 메인 템플릿 `` `<!> <b>static</b> <i>static</i> <em> </em>` ``에서 `has_start`는 `true`일까요, `false`일까요? 그리고 실제로 파싱되는 문자열은 어떤 모양일까요?

<details>
<summary>해설</summary>

템플릿 문자열이 `<!>`로 시작하므로 `has_start`는 `false`입니다. 이때 런타임은 문자열 앞에 `<!>`를 하나 더 붙여서 파싱합니다. 문자열을 그대로 이어 붙이므로 사이에 공백은 없습니다.

```
파싱되는 문자열: <!><!> <b>static</b> <i>static</i> <em> </em>
```

> 근거: `src/internal/client/dom/template.js:34-38` (`has_start`), `:47` (`has_start ? content : '<!>' + content`)

두 주석을 구분하기 위해, 런타임이 덧붙인 것을 `<!>A`, 컴파일러가 `{#if}`의 자리로 넣은 원래 것을 `<!>B`라고 부르겠습니다.

> 처음 세운 가설: 처음에는 삼항 연산자를 거꾸로 읽어서 문자열이 그대로 파싱된다고 답했고, 그다음에는 두 주석 사이에 공백이 있다고 답했습니다.

</details>

#### 2. `{#if}`는 `$.append($$anchor, span)`으로 `<span>first</span>`을 삽입하고, `append`의 구현은 `anchor.before(dom)`입니다. 이때 `$$anchor`에는 어떤 노드가 들어오고, 마운트가 끝나면 `<span>`과 `<!>B` 중 어느 쪽이 먼저 오게 될까요?

<details>
<summary>해설</summary>

`$$anchor`에는 `<!>B`가 들어옵니다. 컴파일된 코드를 따라가면 다음과 같습니다.

1. `var node = $.first_child(fragment)`: `first_child`는 첫 자식이 빈 주석이면 건너뛰고 그다음 형제를 돌려줍니다. 그래서 `node`는 `<!>A`가 아니라 `<!>B`입니다.
2. `$.if(node, ...)`: `$.if`는 받은 노드를 anchor로 저장하고, 조건이 참이면 콜백을 `consequent_fn(anchor)`로 호출합니다.
3. `$.append($$anchor, span)`: `<!>B.before(span)`이 실행됩니다.

> 근거: `scratch/compiled/09-anchors.compiled.js:11-17`, `src/internal/client/dom/operations.js:122`, `src/internal/client/dom/blocks/if.js:27`, `:64`, `src/internal/client/dom/template.js:251`

`.before()`는 anchor의 앞에 넣으므로, 마운트가 끝나면 `<span>`이 `<!>B`보다 먼저 옵니다.

```
<!>A  <span>  <!>B  " "  <b>  " "  <i>  " "  <em>
 ↑                                              ↑
 nodes_start                                    nodes_end
```

anchor 앞에 넣는 함수의 이름이 왜 `append`인지는 T1.9에 정리했습니다.

</details>

#### 3. 만약 `template()`이 `<!>A`를 붙이지 않고 `first_child()`도 빈 주석을 건너뛰지 않는다면, 이 컴포넌트를 제거할 때 `<span>`은 어떻게 될까요?

<details>
<summary>해설</summary>

`<span>`이 지워지지 않고 남습니다. 이 경우 복제한 fragment의 첫 노드인 `<!>B`가 `nodes_start`로 기록되고, `<span>`은 그 **왼쪽**에 삽입됩니다.

```
<span>  <!>B  " "  <b>  " "  <i>  " "  <em>
         ↑                              ↑
         nodes_start                    nodes_end
```

컴포넌트나 블록이 사라질 때 호출되는 `destroy_effect`는 `nodes_start`에서 출발해서 `nextSibling` 방향으로만 이동하며 `nodes_end`까지 노드를 하나씩 지웁니다. 그래서 `nodes_start`의 왼쪽에 있는 `<span>`은 지워지지 않습니다.

> 근거: `src/internal/client/reactivity/effects.js:419-442` (삭제 루프는 `:436-442`), `src/internal/client/dom/template.js:55-62` (`assign_nodes`)

`<!>A`를 붙이면 블록이 무엇을 삽입하든 항상 그보다 왼쪽에 있는 주석이 시작 노드가 되므로, 블록의 내용이 삭제 범위 안에 들어옵니다. `template.js:35-36`의 주석이 말하는 "`effect.nodes.start` 역할을 할 추가 주석 노드"가 이것입니다.

또 하나 중요한 점은 **`template()`의 `<!>` 덧붙이기와 `first_child()`의 빈 주석 건너뛰기가 한 쌍으로 설계되어 있다**는 것입니다. `template()`은 템플릿이 `<!>`로 시작하면 반드시 빈 주석을 하나 더 붙이고, 그래서 `first_child()`는 첫 자식이 빈 주석이면 "`template()`이 붙인 것"이라고 믿고 확인 없이 건너뛸 수 있습니다. 둘 중 하나만 없애면 다른 하나가 잘못 동작합니다.

> 처음 세운 가설: 처음에는 "`<!>`든 `<!><!>`든 첫 자식이 주석 노드인 것은 같은데 무엇이 문제인가"라고 생각했습니다. 그리고 "`<!>A`만 없는 경우"를 따라가다가, `first_child()`가 `<!>B`까지 건너뛰어 버린다는 모순을 직접 찾아냈습니다. 이 발견에서 두 함수가 한 쌍이라는 결론이 나왔습니다.

</details>

#### 4. `08-blocks`를 마운트하면 HTML은 `<!----><p>visible</p><!----> <ul>...`로 시작합니다. 맨 앞의 `<!---->`와 `<p>visible</p>` 뒤의 `<!---->`는 각각 `<!>A`와 `<!>B` 중 어느 것일까요?

<details>
<summary>해설</summary>

맨 앞의 것이 `<!>A`, `<p>visible</p>` 뒤의 것이 `<!>B`입니다. `{#if}`가 `<p>visible</p>`을 `<!>B`의 앞에 삽입했기 때문에 두 주석 사이에 `<p>`가 끼어 있습니다.

> 근거: `scratch/compiled/08-blocks.mount.txt`

컴파일 결과의 템플릿 문자열 `` `<!> <ul></ul> ...` ``에 들어 있는 `<!>`는 `<!>B`입니다. 이 `<!>` 바로 뒤에는 공백과 `<ul>`이 오는데, 마운트 결과에서 공백과 `<ul>`이 뒤따르는 주석은 `<p>visible</p>` 뒤의 것입니다. 맨 앞의 `<!>A`는 컴파일된 코드에는 없고, 런타임에 `template.js:47`이 붙이며, `operations.js:122`가 `first_child()`에서 건너뜁니다.

> 근거: `scratch/compiled/08-blocks.compiled.js:11`, `src/internal/client/dom/template.js:47`, `src/internal/client/dom/operations.js:122`

</details>

#### 5. 마운트 기록에서 가장 먼저 삽입되는 빈 텍스트 노드 `""`는 어디서 만들어지고, 컴포넌트 함수 맨 끝의 `$.append($$anchor, fragment)`가 실행된 뒤에는 컴포넌트의 DOM보다 앞에 있을까요, 뒤에 있을까요?

<details>
<summary>해설</summary>

마운트 함수 `_mount`가 대상 요소에 빈 텍스트 노드를 붙이고, 이 노드를 컴포넌트 함수의 첫 번째 인자 `$$anchor`로 넘깁니다.

> 근거: `src/internal/client/render.js:229` (`target.appendChild(create_text())`), `:249` (`Component(anchor_node, props)`)

`$.append($$anchor, fragment)`는 `anchor.before(fragment)`이므로 컴포넌트의 DOM 전체가 이 노드의 **앞**에 들어갑니다. 그래서 빈 텍스트 노드는 마운트 기록에서는 가장 먼저 삽입되지만, 마운트가 끝난 뒤에는 대상 요소의 맨 마지막 자식이 됩니다. 이 노드는 컴포넌트 구역의 끝을 표시합니다.

> 근거: `src/internal/client/dom/template.js:251`, `scratch/compiled/08-blocks.mount.txt`
>
> ```
> 마운트 후 #app: 첫 노드 <!---->  / 마지막 노드 ""  / 전체 13개
> ```

컴포넌트 전체, `{#if}` 블록 모두 끝 표시 노드를 먼저 두고 내용은 그 앞에 넣는 같은 구조입니다.

> 처음 세운 가설: "anchor가 구역의 끝을 표시한다는 가정이 맞다면 뒤에 있을 것"이라고 조건부로 답했습니다. 이 순서는 가정이 아니라 `append`의 구현과 마운트 결과로 확정할 수 있습니다.

</details>

---

### Q1.18 [관찰] `08-blocks`의 each 플래그, anchor, 하위 컴포넌트 호출 형태

아직 진행하지 않았습니다.

---

## 1-4. 값을 쓰고 갱신하는 방법: `template_effect`

### Q1.12 [관찰] `03-text-kinds`의 텍스트 6개를 업데이트 방식별로 분류

---

### Q1.13 [예측] `12-grouped-effect`에서 `a++`가 일으키는 계산과 DOM 기록

---

### Q1.14 [설명] 텍스트를 하나의 effect로 묶는 이유와 따로 떼어 내는 이유

---

## 1-5. 상태 선언이 바뀌는 방법: runes

### Q1.7 [관찰] `04-state-proxy`의 `a`~`g` 분류표와 화면 변화 예측

---

### Q1.8 [추적] 분류 규칙(`should_proxy`, `is_state_source`)의 컴파일러 근거

---

### Q1.9 [예측] signal이 아닌 값이 화면에 반영되거나 반영되지 않는 이유

---

### Q1.10 [관찰] `$.prop` 플래그 분해, 직접 접근하는 prop, 지연 기본값

---

### Q1.11 [설명] `$.push`/`$.pop`이 생성되는 조건과 생략하는 이유

---

## 1-6. 이벤트를 연결하는 방법: 위임과 hoisting

### Q1.15 [관찰] `__click`과 `$.event`, 핸들러 hoisting

---

### Q1.16 [추적] `$.delegate`부터 핸들러 실행까지의 이벤트 위임 경로

---

### Q1.17 [설명] 이벤트 위임과 hoisting의 이점과 대가

---

## 1-7. 같은 코드, 다른 출력: hydration, server, legacy, dev

### Q1.5 [추적] mount에서는 아무 일도 하지 않는 `$.reset`/`$.next`를 왜 생성하는가

---

### Q1.19 [관찰] server 출력의 hydration 마커와 client anchor의 대응

---

### Q1.20 [관찰] legacy와 runes 출력, dev와 production 출력 비교
