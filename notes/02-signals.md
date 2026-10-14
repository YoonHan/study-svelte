# 2단계 노트: signal 시스템

질문 본문과 힌트는 `curriculum/02-signals.md`에 있습니다. [예측] 질문은 lab을 실행하기 전에 "예측" 칸을 먼저 채우세요.
답을 채운 뒤에는 `/check Q2.N`으로 점검을 받을 수 있습니다.

답과 근거는 한 칸에 함께 적습니다. 근거(`file:line`, 실험 파일과 그 출력)는 그 근거가 뒷받침하는 문장 바로 아래에 `> 근거:` 형식으로 적으세요.

## 2-A. 그래프의 재료: source, derived, effect와 상태 플래그

### Q2.1 [관찰] effect와 effect_root의 실행 시점을 가르는 인자

**내 답:**


---

### Q2.2 [관찰] set 한 번에 version이 0에서 2가 되는 이유

**내 답:**


---

### Q2.3 [추적] Value, Reaction, Derived, Effect의 관계와 양방향 edge

**내 답:**


---

### Q2.4 [예측] 값이 바뀌지 않는 derived와 MAYBE_DIRTY (01-maybe-dirty)

**예측 (실행 전):**


**내 답:**


---

### Q2.5 [예측] 다이아몬드 의존성과 glitch-free (02-diamond)

**예측 (실행 전):**


**내 답:**


---

### Q2.6 [설명] push-pull 대신 다른 방식을 택했다면

**내 답:**


---

## 2-B. 의존성 수집: `get`과 `update_reaction`

### Q2.7 [예측] 조건부 의존성 (03-conditional-deps Part 1)

**예측 (실행 전):**


**내 답:**


---

### Q2.8 [추적] skipped_deps, new_deps와 reactions 중복 (03-conditional-deps Part 2)

**내 답:**


---

### Q2.9 [추적] active_reaction, root/branch, untrack

**내 답:**


---

### Q2.10 [설명] skipped_deps 최적화가 불리해지는 경우

**내 답:**


---

## 2-C. 스케줄링과 effect 트리

### Q2.11 [추적] schedule_effect가 root를 큐에 넣는 이유와 CLEAN의 두 가지 의미

**내 답:**


---

### Q2.12 [예측] 여러 번의 set과 한 번의 flush (04-batching)

**예측 (실행 전):**


**내 답:**


---

### Q2.13 [예측] state에 쓰는 effect와 untracked_writes (05-self-write Case 1, 3)

**예측 (실행 전):**


**내 답:**


---

### Q2.14 [추적] 무한 루프 감지가 500회에서 멈추는 이유 (05-self-write Case 2)

**내 답:**


---

### Q2.15 [예측] render_effect와 effect의 실행 순서 (06-effect-order)

**예측 (실행 전):**


**내 답:**


---

### Q2.16 [예측] 재실행 전 자식 파괴와 teardown 순서 (07-effect-tree)

**예측 (실행 전):**


**내 답:**


---

### Q2.17 [관찰] 트리에서 사라진 once와 이름 없는 child (07-effect-tree)

**내 답:**


---

## 2-D. derived의 소유권과 메모리

### Q2.18 [관찰] unowned derived가 등록되지 않고 CLEAN이 되지 않는 이유 (08 Part 1)

**내 답:**


---

### Q2.19 [추적] unowned derived의 연결과 분리 (08 Part 1)

**내 답:**


---

### Q2.20 [설명] owned derived의 DISCONNECTED와 재연결 (08 Part 2)

**내 답:**


---

### Q2.21 [예측] derived 안에서 state에 쓰기 (09-unsafe-mutation)

**예측 (실행 전):**


**내 답:**


---

## 2-E. 깊은 반응성: `proxy`

### Q2.22 [예측] proxy는 원본을 수정하지 않는다 (10-proxy-object)

**예측 (실행 전):**


**내 답:**


---

### Q2.23 [예측] 새 키 추가와 객체 교체가 Object.keys에 미치는 영향 (10-proxy-object)

**예측 (실행 전):**


**내 답:**


---

### Q2.24 [예측] 배열과 length (11-proxy-array)

**예측 (실행 전):**


**내 답:**


---

## 체크포인트 자기 점검

각 항목을 코드를 보지 않고 설명해 본 뒤, 막힌 부분을 적으세요.

1. 

2. 

3. 

4. 

5. 
