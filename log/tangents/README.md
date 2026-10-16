# 곁가지 질문 기록

질문지(`curriculum/`)를 풀다가 떠오른 질문과, 튜터와 나눈 답을 남기는 곳입니다. 나중에 `site/`의 콘텐츠로 다듬을 원재료입니다.

- `notes/`는 질문지의 답을 학습자가 직접 쓰는 공간이고, 이 폴더는 곁가지 질문과 답을 기록하는 공간입니다.
- 아직 답을 찾지 못한 질문은 `PROGRESS.md`의 궁금증 백로그에 둡니다. 답을 찾으면 이 폴더로 옮깁니다.
- 모든 코드 근거는 `svelte@5.0.0`(`svelte/`의 `study/5.0.0` 브랜치) 기준입니다. 경로는 `svelte/packages/svelte/` 아래를 기준으로 줄여 씁니다.

## 파일 형식

파일 하나에 질문 하나를 담습니다. 파일 이름은 `<단계>-<번호>-<짧은-이름>.md`입니다.

```markdown
---
id: T1.1
title: 짧은 제목
from: Q1.1            # 이 질문이 나온 질문지 항목
date: 2026-10-13
tags: [dom, template]
status: answered      # answered | partial(일부만 확인) | open(가설만 있음)
---

## 질문
학습자가 실제로 던진 질문

## 짧은 답
두세 문장 요약

## 자세히
설명 본문. 근거는 해당 문장 바로 아래에 `> 근거:`로 적습니다.

## 실험
사용한 실험 파일과 실행 결과

## 더 볼 것
남은 의문, 관련된 다른 기록
```

## 목록

| ID | 제목 | 나온 곳 | 상태 |
|---|---|---|---|
| [T1.1](01-01-template-content-inert-document.md) | `<template>`의 `.content`와 비활성 document | Q1.1 | answered |
| [T1.2](01-02-own-property-and-accessors.md) | own property와 프로토타입의 getter/setter | Q1.1 | answered |
| [T1.3](01-03-setattribute-with-objects.md) | `setAttribute`에 객체를 넘기면 생기는 일 | Q1.1 | answered |
| [T1.4](01-04-bit-flags-vs-options-object.md) | 플래그를 비트로 관리하는 이유 | Q1.1 | answered |
| [T1.5](01-05-textcontent-vs-nodevalue.md) | `textContent`와 `nodeValue`의 차이 | Q1.2 | answered |
| [T1.6](01-06-conservative-call-analysis.md) | 컴파일러가 함수 호출을 보수적으로 판단하는 이유 | Q1.2 | partial |
| [T1.7](01-07-cached-dom-getters.md) | `firstChild` getter를 캐싱해서 `.call()`로 호출하는 이유 | Q1.2 | partial |
| [T1.8](01-08-whitespace-between-elements.md) | 요소 사이의 공백 한 칸 | Q1.3 | answered |
| [T1.9](01-09-append-and-end-anchor.md) | `append`라는 이름과 끝 표시 anchor | Q1.4 | answered |
