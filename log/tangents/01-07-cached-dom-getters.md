---
id: T1.7
title: "firstChild getter를 캐싱해서 .call()로 호출하는 이유"
from: Q1.2
date: 2026-10-14
tags: [runtime, dom, performance, javascript]
status: partial
---

## 질문

`$.child`가 쓰는 `get_first_child`는 `node.firstChild`를 직접 읽지 않고, `Node.prototype`에서 descriptor로 getter를 꺼내 캐싱해 둔 뒤 `.call(node)`로 실행한다. 굳이 이렇게 하는 의도는 무엇인가? 그리고 왜 `getter()`처럼 일반 함수 호출이 아니라 `.call()`을 쓰는가?

## 짧은 답

`.call()`을 쓰는 이유는 확실합니다. getter에는 매개변수가 없고 어떤 노드를 읽을지를 `this`로만 알 수 있으므로, 꺼낸 getter를 호출하려면 `.call(node)`로 `this`를 지정해야 합니다. 캐싱하는 의도는 코드에 설명이 없어서 가설만 있습니다. 프로토타입 체인 탐색을 줄이려는 것이거나, 여러 종류의 노드에 호출되는 자리에서 엔진의 인라인 캐시가 비효율적인 상태가 되는 것을 피하려는 것일 수 있습니다.

## 자세히

런타임은 초기화할 때 `Node.prototype`의 `firstChild`와 `nextSibling` getter를 한 번 꺼내 변수에 저장합니다.

> 근거: `src/internal/client/dom/operations.js:15-17` (변수 선언), `:35-37` (getter 꺼내기)

그리고 노드를 탐색할 때마다 이 getter를 `.call(node)`로 호출합니다.

> 근거: `src/internal/client/dom/operations.js:74-76` (`get_first_child`)

### `.call()`이 필요한 이유

`p.firstChild`라고 쓰면 엔진이 getter를 호출하면서 `this`를 `p`로 정해 줍니다. getter를 꺼내서 따로 호출하면 이 연결이 끊어집니다. 인자로 넘겨도 getter가 매개변수를 받지 않으므로 무시되고, `this`가 노드가 아니라서 에러가 납니다.

### 캐싱하는 이유 (가설)

`p.firstChild`를 읽으면 엔진은 `p` 인스턴스에서 시작해 `HTMLParagraphElement.prototype` → `HTMLElement.prototype` → `Element.prototype` → `Node.prototype` 순서로 올라가서 `firstChild`를 찾습니다. 그리고 `$.child`는 `<p>`, `<div>`, `<button>`, fragment 등 온갖 종류의 노드에 호출됩니다. 캐싱한 getter를 `.call()`로 호출하면 이 탐색을 거치지 않습니다.

다만 현대 JavaScript 엔진은 인라인 캐시 덕분에 같은 형태의 객체에서 반복되는 속성 탐색을 이미 빠르게 처리합니다. 그래서 진짜 이유는 탐색 비용 자체보다, 여러 종류의 노드가 같은 자리를 지나가면서 인라인 캐시가 비효율적인(megamorphic) 상태가 되는 것을 피하려는 데 있을 수도 있습니다. 이 부분은 확인하지 않았습니다.

같은 초기화 함수 안에서 `Element.prototype`에 `__click`, `__attributes` 같은 필드를 미리 선언하는 코드에는 "DOM 노드의 조회 성능을 높인다"는 주석이 있습니다. 성능을 의식한 초기화라는 점은 분명합니다.

> 근거: `src/internal/client/dom/operations.js:39-50`

## 실험

jsdom에서 일회성으로 실행했습니다.

```
getter.call(p):  "hi"
getter():        TypeError: 'get firstChild' called on an object that is not a valid instance of Node.
getter(p):       TypeError: 'get firstChild' called on an object that is not a valid instance of Node.
```

브라우저에서는 같은 상황에서 `TypeError: Illegal invocation`이 나옵니다.

## 더 볼 것

- **열린 질문**: 캐싱의 실제 의도. 이 코드를 도입한 PR을 5단계에서 추적합니다(`PROGRESS.md` 백로그).
