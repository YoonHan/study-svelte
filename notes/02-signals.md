# 2단계 노트: signal 시스템

질문 원문과 힌트는 `curriculum/02-signals.md`에 있고, 공부 순서는 그 파일의 "학습 경로" 표를 따릅니다.

이 노트는 튜터가 작성합니다. 질문지의 질문마다 튜터가 던진 유도 질문과, 학습자의 답을 코드와 실험으로 확인해서 다듬은 해설을 쌍으로 기록합니다. 해설은 접혀 있으니, 질문을 보고 먼저 고민한 뒤에 펼쳐 보세요. 작성 방식은 `CLAUDE.md`의 "노트 작성 방식" 절에 있습니다.

## 2-A. 그래프의 재료: source, derived, effect와 상태 플래그

### Q2.1 [관찰] effect와 effect_root의 실행 시점을 가르는 인자

---

### Q2.2 [관찰] set 한 번에 version이 0에서 2가 되는 이유

---

### Q2.3 [추적] Value, Reaction, Derived, Effect의 관계와 양방향 edge

---

### Q2.4 [예측] 값이 바뀌지 않는 derived와 MAYBE_DIRTY (01-maybe-dirty)

---

### Q2.5 [예측] 다이아몬드 의존성과 glitch-free (02-diamond)

---

### Q2.6 [설명] push-pull 대신 다른 방식을 택했다면

---

## 2-B. 의존성 수집: `get`과 `update_reaction`

### Q2.7 [예측] 조건부 의존성 (03-conditional-deps Part 1)

---

### Q2.8 [추적] skipped_deps, new_deps와 reactions 중복 (03-conditional-deps Part 2)

---

### Q2.9 [추적] active_reaction, root/branch, untrack

---

### Q2.10 [설명] skipped_deps 최적화가 불리해지는 경우

---

## 2-C. 스케줄링과 effect 트리

### Q2.11 [추적] schedule_effect가 root를 큐에 넣는 이유와 CLEAN의 두 가지 의미

---

### Q2.12 [예측] 여러 번의 set과 한 번의 flush (04-batching)

---

### Q2.13 [예측] state에 쓰는 effect와 untracked_writes (05-self-write Case 1, 3)

---

### Q2.14 [추적] 무한 루프 감지가 500회에서 멈추는 이유 (05-self-write Case 2)

---

### Q2.15 [예측] render_effect와 effect의 실행 순서 (06-effect-order)

---

### Q2.16 [예측] 재실행 전 자식 파괴와 teardown 순서 (07-effect-tree)

---

### Q2.17 [관찰] 트리에서 사라진 once와 이름 없는 child (07-effect-tree)

---

## 2-D. derived의 소유권과 메모리

### Q2.18 [관찰] unowned derived가 등록되지 않고 CLEAN이 되지 않는 이유 (08 Part 1)

---

### Q2.19 [추적] unowned derived의 연결과 분리 (08 Part 1)

---

### Q2.20 [설명] owned derived의 DISCONNECTED와 재연결 (08 Part 2)

---

### Q2.21 [예측] derived 안에서 state에 쓰기 (09-unsafe-mutation)

---

## 2-E. 깊은 반응성: `proxy`

### Q2.22 [예측] proxy는 원본을 수정하지 않는다 (10-proxy-object)

---

### Q2.23 [예측] 새 키 추가와 객체 교체가 Object.keys에 미치는 영향 (10-proxy-object)

---

### Q2.24 [예측] 배열과 length (11-proxy-array)

---

## 체크포인트 자기 점검

각 항목을 코드를 보지 않고 설명해 본 뒤, 막힌 부분을 적으세요.

1. 

2. 

3. 

4. 

5. 
