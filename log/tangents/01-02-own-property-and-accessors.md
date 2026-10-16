---
id: T1.2
title: "own property와 프로토타입의 getter/setter"
from: Q1.1
date: 2026-10-13
tags: [javascript, prototype, custom-element]
status: answered
---

## 질문

own property 개념에 getter, setter는 포함되지 않는 것인가? `importNode`로 복제한 커스텀 엘리먼트에서는 `widget.label = 'hi'` 뒤에 `Object.hasOwn(widget, 'label')`이 `false`로 나왔다.

## 짧은 답

getter/setter도 own property가 될 수 있습니다. 차이를 만드는 것은 접근자를 **어디에 정의했는가**입니다. 클래스 문법으로 정의한 접근자는 인스턴스가 아니라 `클래스.prototype`에 놓이므로, 인스턴스에서 `hasOwn`으로 확인하면 `false`가 나옵니다.

## 자세히

클래스로 정의한 getter/setter와 객체 리터럴로 정의한 getter를 비교하면 차이가 드러납니다.

```js
class A { set label(v) {} get label() {} }
const a = new A();
Object.hasOwn(a, 'label');              // false ← 인스턴스에는 없음
Object.hasOwn(A.prototype, 'label');    // true  ← 프로토타입에 있음
Object.hasOwn({ get label() {} }, 'label'); // true ← 객체 리터럴에 직접 정의하면 own property
```

업그레이드된 커스텀 엘리먼트에 `widget.label = 'hi'`를 실행하면, 엔진은 인스턴스에서 `label`을 찾지 못하고 프로토타입 체인을 따라 올라가 `MyWidget.prototype`의 setter를 호출합니다. 인스턴스 자체에는 아무것도 생기지 않으므로 `hasOwn`은 `false`입니다.

반대로 업그레이드되지 않은 요소는 평범한 `HTMLElement`이므로 프로토타입 체인에 `MyWidget.prototype`이 없습니다. 그래서 setter를 찾지 못하고, 대입문이 인스턴스에 평범한 데이터 속성 `label`을 새로 만듭니다. `hasOwn`이 `true`로 나오는 것은 이 때문입니다.

Svelte도 이 프로토타입 체인을 이용합니다. `set_custom_element_data`는 `get_setters`로 요소의 프로토타입 체인을 따라 올라가며 setter 목록을 모으고, 목록에 이름이 있으면 속성으로 값을 넘깁니다.

> 근거: `src/internal/client/dom/elements/attributes.js:138-144` (`set_custom_element_data`), `:315-336` (`get_setters`)

따라서 `cloneNode`로 복제해서 업그레이드되지 않은 요소라면, `get_setters`가 `label` setter를 찾지 못합니다. 그다음에 일어나는 일은 T1.3에 정리했습니다.

## 실험

- 위의 `class A` 비교는 Node.js에서 일회성으로 실행했습니다.
- `scratch/01-clone-vs-import.html`의 마지막 줄(`hasOwnProperty("label")`)이 같은 현상을 커스텀 엘리먼트에서 보여 줍니다. 결과는 T1.1의 표에 있습니다.

## 더 볼 것

- `get_setters`는 `element.nodeName`을 키로 결과를 캐싱합니다(`attributes.js:316-318`). 업그레이드되기 전에 처음 조회되면 빈 목록이 캐싱될 수 있는지는 아직 확인하지 않았습니다.
