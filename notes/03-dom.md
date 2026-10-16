# 3단계 노트: DOM 계층

질문 원문과 힌트는 `curriculum/03-dom.md`에 있고, 공부 순서는 그 파일의 "학습 경로" 표를 따릅니다.

이 노트는 튜터가 작성합니다. 질문지의 질문마다 튜터가 던진 유도 질문과, 학습자의 답을 코드와 실험으로 확인해서 다듬은 해설을 쌍으로 기록합니다. 해설은 접혀 있으니, 질문을 보고 먼저 고민한 뒤에 펼쳐 보세요. 작성 방식은 `CLAUDE.md`의 "노트 작성 방식" 절에 있습니다.

## 3-A. 마운트와 템플릿 복제

### Q3.1 [관찰] 마운트 anchor `""`의 역할과 unmount 순서

---

### Q3.2 [추적] 템플릿 파싱 시점, `<template>` 요소, importNode

---

### Q3.3 [예측] 템플릿 모양별 컴파일 결과 (shapes/)

---

### Q3.4 [추적] 공백 placeholder와 `$.reset`/`$.next`

---

### Q3.5 [설명] getter 캐싱, 프로토타입 기본값, `__t` 캐시

---

## 3-B. 블록의 경계와 갱신 순서

### Q3.6 [관찰] `BlockFirst`의 주석 두 개와 `has_start`

---

### Q3.7 [추적] `nodes_start`/`nodes_end`와 `destroy_effect`

---

### Q3.8 [관찰] Counter `click #3`에서 `{#if}` 삽입이 먼저인 이유

---

### Q3.9 [예측] `Order.svelte`와 순서를 뒤집는 마크업

---

### Q3.10 [예측] `{#if}`/`{:else if}`/`{:else}` 단계별 동작 (if.steps.mjs)

---

### Q3.11 [실험] transition과 pause/resume (transition.steps.mjs)

---

## 3-C. `{#each}`와 reconcile

### Q3.12 [관찰] keyed와 unkeyed 비교, `$.each` flags 해석

---

### Q3.13 [예측] 순열별 이동 횟수

---

### Q3.14 [추적] `[A,B,C,D,E] → [E,B,C,D,A]` reconcile 추적표

---

### Q3.15 [실험] 120개 순열 실험과 LIS 방식과의 트레이드오프

---

### Q3.16 [설명] item source, controlled 빠른 경로, 항목 effect 연결

---

## 3-D. 이벤트 위임과 `{#await}`

### Q3.17 [관찰] hoist 기준, 배열 형태 `__click`, `$.event`

---

### Q3.18 [추적] 위임 리스너 위치와 `handle_event_propagation` 경로

---

### Q3.19 [실험] `addEventListener`와 `on`의 실행 순서 비교

---

### Q3.20 [예측] `{#await}`의 pending 표시 타이밍

---
