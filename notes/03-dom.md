# 3단계 노트: DOM 계층

질문 본문과 힌트는 `curriculum/03-dom.md`에 있습니다. [예측] 질문은 도구를 실행하기 전에 "예측" 칸을 먼저 채우세요.
답을 채운 뒤에는 `/check Q3.N`으로 점검을 받을 수 있습니다.

답과 근거는 한 칸에 함께 적습니다. 근거(`file:line`, 실험 파일과 그 출력)는 그 근거가 뒷받침하는 문장 바로 아래에 `> 근거:` 형식으로 적으세요.

## 3-A. 마운트와 템플릿 복제

### Q3.1 [관찰] 마운트 anchor `""`의 역할과 unmount 순서

**내 답:**


---

### Q3.2 [추적] 템플릿 파싱 시점, `<template>` 요소, importNode

**내 답:**


---

### Q3.3 [예측] 템플릿 모양별 컴파일 결과 (shapes/)

**예측 (실행 전):**


**내 답:**


---

### Q3.4 [추적] 공백 placeholder와 `$.reset`/`$.next`

**내 답:**


---

### Q3.5 [설명] getter 캐싱, 프로토타입 기본값, `__t` 캐시

**내 답:**


---

## 3-B. 블록의 경계와 갱신 순서

### Q3.6 [관찰] `BlockFirst`의 주석 두 개와 `has_start`

**내 답:**


---

### Q3.7 [추적] `nodes_start`/`nodes_end`와 `destroy_effect`

**내 답:**


---

### Q3.8 [관찰] Counter `click #3`에서 `{#if}` 삽입이 먼저인 이유

**내 답:**


---

### Q3.9 [예측] `Order.svelte`와 순서를 뒤집는 마크업

**예측 (실행 전):**


**내 답:**


---

### Q3.10 [예측] `{#if}`/`{:else if}`/`{:else}` 단계별 동작 (if.steps.mjs)

**예측 (실행 전):**


**내 답:**


---

### Q3.11 [실험] transition과 pause/resume (transition.steps.mjs)

**내 답:**


---

## 3-C. `{#each}`와 reconcile

### Q3.12 [관찰] keyed와 unkeyed 비교, `$.each` flags 해석

**내 답:**


---

### Q3.13 [예측] 순열별 이동 횟수

**예측 (실행 전):**


**내 답:**


---

### Q3.14 [추적] `[A,B,C,D,E] → [E,B,C,D,A]` reconcile 추적표

**내 답:**


---

### Q3.15 [실험] 120개 순열 실험과 LIS 방식과의 트레이드오프

**내 답:**


---

### Q3.16 [설명] item source, controlled 빠른 경로, 항목 effect 연결

**내 답:**


---

## 3-D. 이벤트 위임과 `{#await}`

### Q3.17 [관찰] hoist 기준, 배열 형태 `__click`, `$.event`

**내 답:**


---

### Q3.18 [추적] 위임 리스너 위치와 `handle_event_propagation` 경로

**내 답:**


---

### Q3.19 [실험] `addEventListener`와 `on`의 실행 순서 비교

**내 답:**


---

### Q3.20 [예측] `{#await}`의 pending 표시 타이밍

**예측 (실행 전):**


**내 답:**


---
