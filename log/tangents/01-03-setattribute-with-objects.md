---
id: T1.3
title: "setAttribute에 객체를 넘기면 생기는 일"
from: Q1.1
date: 2026-10-13
tags: [dom, attribute, custom-element]
status: answered
---

## 질문

`get_setters`가 setter를 찾지 못하면 `set_custom_element_data`는 `else` 분기로 넘어가는데, 그러면 값은 커스텀 엘리먼트에 어떤 형태로 전달되는가? 문자열이 아니라 객체를 넘기면 어떻게 되는가?

## 짧은 답

`set_attribute`를 거쳐 `element.setAttribute()`로 HTML attribute에 기록됩니다. HTML attribute의 값은 항상 문자열이므로, 객체를 넘기면 `"[object Object]"`가, 함수를 넘기면 함수의 소스 코드 문자열이 저장됩니다. 커스텀 엘리먼트는 원래의 객체나 함수를 받지 못합니다.

## 자세히

Svelte에서는 커스텀 엘리먼트에 문자열뿐 아니라 임의의 JavaScript 값을 넘길 수 있습니다.

```svelte
<my-widget label="hello"></my-widget>                    <!-- 문자열 -->
<my-widget data={{ items: [1, 2, 3] }}></my-widget>      <!-- 객체 -->
<my-widget onselect={(e) => console.log(e)}></my-widget> <!-- 함수 -->
```

커스텀 엘리먼트 쪽에서는 `set data(value) { ... }` 같은 setter로 값을 객체 그대로 받기를 기대합니다. `set_custom_element_data`는 setter가 있으면 속성으로 대입하고, 없으면 `set_attribute`를 호출합니다.

> 근거: `src/internal/client/dom/elements/attributes.js:138-144`

`set_attribute`는 몇 가지 검사를 거친 뒤 마지막에 `element.setAttribute(attribute, value)`를 호출합니다.

> 근거: `src/internal/client/dom/elements/attributes.js:83-121` (`setAttribute` 호출은 `:119`)

`setAttribute`에 문자열이 아닌 값을 넘기면 브라우저가 문자열로 변환해서 저장합니다. 이때 객체의 `toString()`이 호출되므로, 따로 재정의하지 않았다면 `Object.prototype.toString`이 돌려주는 `"[object Object]"`가 됩니다.

정리하면 다음과 같은 인과 관계가 이어집니다.

1. 템플릿 원본은 비활성 document에 있습니다. (T1.1)
2. `cloneNode`로 복제하면 커스텀 엘리먼트가 업그레이드되지 않습니다. (T1.1)
3. 업그레이드되지 않은 요소에서는 `get_setters`가 setter를 찾지 못합니다. (T1.2)
4. 그래서 값이 `setAttribute`로 넘어가서 문자열로 바뀝니다.
5. 이를 막기 위해 컴파일러는 커스텀 엘리먼트가 있으면 `TEMPLATE_USE_IMPORT_NODE`를 켜고, 런타임은 `importNode`로 복제합니다.

## 실험

jsdom에서 일회성으로 실행했습니다.

```js
el.setAttribute('data', { items: [1, 2, 3] });
el.getAttribute('data');      // "[object Object]"
el.setAttribute('onselect', (e) => console.log(e));
el.getAttribute('onselect');  // "(e)=>console.log(e)"
```

## 더 볼 것

- `set_attribute`에도 문자열이 아니고 setter가 있으면 속성으로 대입하는 분기가 있습니다(`attributes.js:115-117`). 이 분기와 `set_custom_element_data`의 관계는 아직 비교하지 않았습니다.
