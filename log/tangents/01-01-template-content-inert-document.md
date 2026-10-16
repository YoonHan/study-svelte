---
id: T1.1
title: "<template>의 .content와 비활성 document"
from: Q1.1
date: 2026-10-13
tags: [dom, template, custom-element]
status: answered
---

## 질문

`TEMPLATE_USE_IMPORT_NODE` 플래그가 켜지면 `cloneNode` 대신 `document.importNode`를 쓰는데, 두 메서드는 동작이 무엇이 다른가? 그리고 `<template>` 요소의 `.content` 속성 값은 무엇을 의미하는가?

## 짧은 답

`<template>`의 `.content`는 파싱된 HTML을 담은 `DocumentFragment`이고, 이 fragment는 현재 페이지가 아닌 **비활성 document**에 속합니다. `cloneNode`는 복제본의 소속을 원본에서 그대로 물려받으므로 복제본도 비활성 document에 남고, 그래서 커스텀 엘리먼트가 업그레이드되지 않습니다. `importNode`는 복제하면서 소속을 현재 `document`로 바꾸므로 그 자리에서 업그레이드가 일어납니다.

## 자세히

Svelte는 HTML 문자열을 `<template>` 요소의 `innerHTML`에 넣고 `.content`를 꺼내서 템플릿의 원본으로 보관합니다.

> 근거: `src/internal/client/dom/reconciler.js:2-6`

일반 요소라면 `innerHTML`로 넣은 노드가 그 요소의 자식이 되지만, `<template>`은 파싱 결과를 자식으로 두지 않고 `.content`라는 별도의 `DocumentFragment`에 넣습니다. 이 fragment는 브라우저가 템플릿 전용으로 만들어 둔 비활성 document에 속하며, 화면과 연결되어 있지 않습니다. 그래서 노드 구조만 만들어 두고 다음과 같은 부수 효과는 일으키지 않습니다.

- `<img>`가 이미지를 내려받지 않습니다.
- `<script>`가 실행되지 않습니다.
- 커스텀 엘리먼트가 업그레이드되지 않습니다.

Svelte 입장에서는 HTML을 한 번만 파싱해서 부수 효과 없이 보관해 두기에 적합한 그릇입니다. 그런데 바로 그 특성 때문에, 커스텀 엘리먼트가 있는 템플릿은 복제할 때 소속을 현재 `document`로 바꿔 줘야 합니다. 그래서 런타임은 플래그에 따라 두 메서드 중 하나를 고릅니다.

> 근거: `src/internal/client/dom/template.js:51-53`

컴파일러는 템플릿에 커스텀 엘리먼트가 있으면 이 플래그를 켭니다. 그 자리의 주석에 `cloneNode`는 템플릿이 DOM에 연결되기 전까지 커스텀 엘리먼트의 클래스를 인스턴스화하지 않아서, 속성을 설정할 때 문제가 생긴다고 적혀 있습니다.

> 근거: `src/compiler/phases/3-transform/client/visitors/RegularElement.js:62-69` (주석은 `:65-68`)

중요한 점은 **근본 원인이 `cloneNode` 자체가 아니라 원본이 비활성 document에 있다는 사실**이라는 것입니다. 원본이 현재 `document`에 속해 있으면 `cloneNode`로 복제해도 업그레이드가 정상적으로 일어납니다. 두 메서드의 차이는 "복제본이 어느 document에 속하게 되는가"에 있습니다.

업그레이드되지 않은 커스텀 엘리먼트에 값을 넘기면 어떤 문제가 생기는지는 T1.2와 T1.3에 이어서 정리했습니다.

## 실험

`scratch/01-clone-vs-import.html`: Svelte와 같은 방식으로 `<template>`에서 `<my-widget>`을 복제하고, 두 메서드의 결과를 비교합니다. jsdom으로 실행한 결과는 다음과 같습니다.

| | `cloneNode` | `importNode` |
|---|---|---|
| `ownerDocument === document` | `false` | `true` |
| `instanceof MyWidget` (업그레이드됨) | `false` | `true` |
| `widget.label = 'hi'`에서 setter 호출 | 호출되지 않음 | 호출됨 |
| `hasOwnProperty("label")` | `true` | `false` |

원본을 현재 `document`에서 만든 경우(`document.createDocumentFragment()`에 `document.createElement('my-widget')`을 넣고 `cloneNode`)에는 `ownerDocument === document`와 `instanceof MyWidget`이 모두 `true`였습니다. 이 실험은 jsdom에서 일회성으로 실행했고 파일로 남기지 않았습니다.

## 더 볼 것

- T1.2 own property와 프로토타입의 getter/setter
- T1.3 `setAttribute`에 객체를 넘기면 생기는 일
- Q1.6에서 템플릿 복제 방식 전체의 장단점과 `importNode`를 다시 다룹니다.
