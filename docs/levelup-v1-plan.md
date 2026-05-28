# 레벨업 시스템 v1 — 작업 계획

claude-buddy의 시간 단일 레벨업 시스템을 **Claude 사용량(토큰) + 일일 인터랙션 + 다마고치
상태**로 확장하기 위한 요구사항·산식·작업 단계 정의 문서입니다. 이 문서 하나만 읽고도
후속 에이전트가 구현에 착수할 수 있도록 핵심 결정과 큰 구성 위주로 정리합니다.
구체적인 코드는 의도적으로 생략하며, 이는 후속 에이전트의 책임입니다.

---

## 1. 배경

### 현재 상태 (v0.2.5)

- 레벨업은 **`createdAt`부터의 경과시간 단일 축**으로만 결정됨.
  - 공식: `level = Math.floor((now - createdAt) / WEEK_MS) + 1` (`src/shared/render.ts:233-238`)
  - 1주일 = 1레벨, progress는 주중 진행률 (0..1).
- 동적 상태 저장 없음. `~/.claude-buddy/config.json`은 `id`/`name`/`createdAt`만 보유 (`src/shared/config.ts:16-23`).
- statusline은 stdin JSON을 받지만 **그대로 버림** (`src/statusline/statusline.ts:13-15`).

### 확장 동기

- 사용자의 **Claude 사용량(토큰)** 도 기여도로 인정 — 많이 쓰는 사용자가 더 빠르게 자라는 자연스러운 보상.
- 사용자가 버디에게 **칭찬·간식** 같은 일일 인터랙션 가능 — 한국형 다마고치 톤.
- 버디의 **mood / hunger / neglect** 상태로 "키우는 친구" 감성 강화.

### 절대 제약 — 슬로건 유지

- **"Zero tokens"**: 이 도구는 Claude API를 호출하지 않는다. 토큰 사용량을 **읽기만**
  하는 것은 LLM 호출이 아니므로 슬로건과 충돌하지 않는다.
- **"no hooks"**: Claude Code 훅(`PostToolUse`, `Stop` 등)을 설치하지 않는다.
  토큰 데이터는 **statusline stdin JSON 파싱**만으로 수집한다.

### 비목표 (v1 제외)

- 진화(evolution), 죽음/리셋.
- 토큰 사용량의 과거 데이터 복원 (마이그레이션 시 토큰 EXP는 0부터).
- 멀티 버디.
- 시간대(시·분) 기반 인터랙션 제약 — 일일 한도는 자정 단위로만 동작.

---

## 2. 핵심 결정 사항

이 세션에서 합의된 결정들. 변경하려면 별도 논의 필요.

| 결정 항목               | 내용                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **토큰 소스**           | statusline stdin JSON 파싱 (훅 사용 안 함)                                            |
| **산식 골격**           | EXP 누적 + 임계치                                                                     |
| **임계치 곡선**         | `ceil(100 · L^1.2)` — 완만 누승                                                       |
| **시간 EXP**            | +20 / 활동일(월~금), 토·일은 0                                                        |
| **토큰 EXP**            | `floor(log10(누적/1000) · 5)` 누적 환산값의 **차분**만 가산                           |
| **great EXP**           | +10 / 회, 일 3회 한도                                                                 |
| **treat EXP**           | +25 / 회, 일 1회 한도                                                                 |
| **다마고치 요소**       | mood / hunger / neglect (evolution 제외)                                              |
| **Hunger**              | 활동일마다 +1 (상한 4), `treat` 시 0으로 리셋                                         |
| **Neglect**             | 3+ 연속 활동일 `lastSeenAt` 미갱신 → mood=sad + 시간 EXP ×0.5                         |
| **인터랙션 UX**         | Claude Code 슬래시 커맨드 `/buddy-great`, `/buddy-treat`                              |
| **명령어 명명**         | 영어, `buddy-` prefix 유지 (`/buddy-great`, `/buddy-treat`)                           |
| **주말 룰**             | 토·일은 시간 EXP·hunger 증가 모두 정지                                                |
| **statusline 레이아웃** | `Buddy [mood][hunger] Lv.N [bar] rarity` — name 다음, Lv 앞 위치                      |
| **상태 파일 분리**      | `config.json` 불변 + 신규 `state.json` 동적                                           |
| **마이그레이션**        | `createdAt` 보존, level은 기존 공식으로 산출, exp는 0부터, hunger/mood/daily는 초기값 |
| **시간대 제약**         | 없음 — 일일 한도는 로컬 자정 기준 리셋                                                |

---

## 3. 데이터 모델

### `~/.claude-buddy/config.json` — 불변 (변경 없음)

```jsonc
{
  "id": "uuid",
  "name": "Buddy",
  "createdAt": 1700000000000,
}
```

### `~/.claude-buddy/state.json` — 신규, 동적

```jsonc
{
  "level": 3,
  "exp": 245, // 현재 레벨 내 누적 EXP
  "hunger": 2, // 0..4 정수

  "lastTickAt": 1748290000000, // 마지막 tick(EXP 가산) 시각
  "lastSeenAt": 1748290000000, // 마지막 statusline 호출 시각 (neglect 판정)
  "lastTreatAt": 1748200000000, // 마지막 treat 시각 (hunger 리셋 시점 감사용)

  "tokensSeenTotal": 128400, // 누적 토큰 워터마크 (다음 호출 시 차분 계산)
  "tokenExpAccrued": 10, // 이미 EXP로 환산된 누적치 (감사용)

  "daily": {
    "date": "2026-05-27", // YYYY-MM-DD 로컬
    "greatCount": 1,
    "treatCount": 0,
  },
}
```

### 필드 책임 매트릭스

| 필드                                 | 누가 쓰나                   | 언제                               |
| ------------------------------------ | --------------------------- | ---------------------------------- |
| `level`, `exp`                       | tick 로직                   | 시간/토큰/great/treat EXP 가산 시  |
| `hunger`                             | tick 로직 + treat CLI       | 활동일 변화 감지 / treat 사용 시   |
| `lastTickAt`                         | tick 로직                   | 모든 tick 끝나면 갱신              |
| `lastSeenAt`                         | statusline.ts               | statusline 호출마다                |
| `lastTreatAt`                        | treat CLI                   | treat 명령 성공 시                 |
| `tokensSeenTotal`, `tokenExpAccrued` | tick 로직 (토큰 단계)       | 토큰 차분 가산 후                  |
| `daily.*`                            | tick 로직 + great/treat CLI | 자정 넘어가면 리셋, 카운트 증가 시 |

---

## 4. EXP 산식

### EXP 소스

| 소스      | 공식                                  | 트리거                                | 비고                              |
| --------- | ------------------------------------- | ------------------------------------- | --------------------------------- |
| 시간 EXP  | `+20` / 활동일                        | tick (활동일 경계 감지)               | 토·일 0, mood=sad일 때 ×0.5       |
| 토큰 EXP  | `tokenExpAt(현재) − tokenExpAt(직전)` | statusline 호출 시 stdin JSON 있을 때 | 차분이 양수일 때만, 상한 없음     |
| great EXP | `+10` / 회                            | `/buddy-great` 호출                   | 일 3회 한도                       |
| treat EXP | `+25` / 회                            | `/buddy-treat` 호출                   | 일 1회 한도, hunger 리셋 부수효과 |

### 토큰 EXP 환산 함수

```
tokenExpAt(N) =
  if N < 1000 then 0
  else floor( log10(N / 1000) * 5 )
```

| 누적 토큰 N | tokenExpAt(N) | 다음 +5까지 |
| ----------- | ------------- | ----------- |
| 1K          | 0             | 10K 사용 시 |
| 10K         | 5             | 100K        |
| 100K        | 10            | 1M          |
| 1M          | 15            | 10M         |
| 10M         | 20            | 100M        |

log10 곡선이 자연스럽게 완만하므로 **호출당 상한 불필요**. statusline 호출 빈도와 무관하게
누적량의 성장에만 비례한다.

### 임계치 곡선

```
threshold(L) = ceil(100 · L^1.2)
```

| Lv 전환 | 필요 EXP | 시간-only 활동일 | 달력 기준 |
| ------- | -------- | ---------------- | --------- |
| 1→2     | 100      | 5                | ~7일      |
| 2→3     | 229      | 12               | ~16일     |
| 3→4     | 388      | 20               | ~28일     |
| 5→6     | 690      | 35               | ~7주      |
| 10→11   | 1,585    | 80               | ~16주     |
| 20→21   | 3,641    | 183              | ~9개월    |

### 일일 부스트 상한 (이론치)

- 시간 EXP: 20 (활동일 1일 기준)
- 인터랙션: great +10×3 + treat +25×1 = **+55** (시간 EXP × 2.75)
- 토큰: log10 곡선이라 단일 일 상한 정의 불가. 누적이 10배 늘 때마다 +5.

---

## 5. 상태 시스템

### Hunger (0~4 정수, state.json에 저장)

- 활동일 경계마다 **+1 자동 증가**, 상한 4.
- `treat` 사용 시 **0으로 리셋**.
- v1에서는 hunger 값 자체에 EXP 페널티 없음 — **시각적 표시 전용**.
- 토·일은 증가 정지.

### Mood (파생 상태, 저장하지 않음)

매 렌더 시점에 다음 규칙으로 계산:

| 우선순위 | 조건                                                 | 결과      |
| -------- | ---------------------------------------------------- | --------- | -------------------- | ------- |
| 1        | neglect 발동 중 (3+ 연속 활동일 `lastSeenAt` 미갱신) | `sad`     |
| 2        | 오늘 great 또는 treat 1회 이상 (`daily.greatCount>0  |           | daily.treatCount>0`) | `happy` |
| 3        | 그 외                                                | `neutral` |

### Neglect 페널티

- 발동 조건: `lastSeenAt` 이후 **3 이상의 활동일 경과**.
  - 활동일 카운트는 토·일 제외.
- 효과:
  - mood 강제 `sad`.
  - 시간 EXP 가산이 **×0.5**로 줄어듦 (재접속한 그날의 tick부터 적용).
- 해제: 다시 statusline 호출되어 `lastSeenAt`이 갱신되면 다음 활동일 tick부터 페널티 해제.
- **EXP 자체 감소 없음** (사용자 결정).

---

## 6. 인터랙션 — 슬래시 커맨드 + CLI

### 슬래시 커맨드 (사용자 노출)

Claude Code의 `.claude/commands/` 메커니즘으로 설치.

| 커맨드         | 동작                      | 호출 |
| -------------- | ------------------------- | ---- |
| `/buddy-great` | `claude-buddy great` 실행 | 칭찬 |
| `/buddy-treat` | `claude-buddy treat` 실행 | 간식 |

`setup` 명령이 두 마크다운 파일을 `.claude/commands/`에 배치한다.

### CLI 서브커맨드 (구현 본체)

- `claude-buddy great`: EXP +10, `daily.greatCount += 1`. 한도 초과 시 미가산.
- `claude-buddy treat`: EXP +25, `hunger = 0`, `daily.treatCount += 1`. 한도 초과 시 미가산.
- 두 명령 모두 **호출 직전 tick 1회 수행** (시간 EXP / hunger / daily 리셋 등 동기화).

### 응답 메시지 톤

- 정상 가산: 다마고치적 짧은 응답 (`"버디가 좋아해요 (+10 EXP)"` 등).
- 한도 초과: 안내성 거부 (`"오늘은 칭찬을 충분히 받았어요"`).
- 메시지 카피는 구현 단계에서 `src/shared/messages.ts` 양식에 맞춰 결정.

---

## 7. statusline 렌더링

### 레이아웃

```
Buddy [♡ ◔] Lv.3 [▓▓▓░░░] ✦ rare
      └┬┘ └┬┘
       │   └─ hunger 아이콘
       └───── mood 아이콘
```

- `name` 다음, `Lv.N` 앞 위치 (사용자 결정).
- 아이콘 디자인은 sprite 톤에 맞춰 구현 단계 확정. 후보:
  - mood: `♡`(happy) / `@`(neutral) / `TT`(sad)
  - hunger: `●`(0 만복) `◕`(1) `◑`(2) `◔`(3) `○`(4 굶주림)

### Progress bar 계산

```
progress = exp / threshold(level)        // 0..1로 정규화
bar = progressBar(progress)              // 기존 함수 그대로 활용
```

---

## 8. 마이그레이션

### v0.3 첫 실행 시

기존 사용자(`config.json`만 존재, `state.json` 없음) 감지 → 자동 마이그레이션:

```
level    = Math.floor((now - createdAt) / WEEK_MS) + 1   // 기존 공식 (보존)
exp      = 0                                              // 새 임계치를 0부터 채우기 시작
hunger   = 0
lastTickAt   = now
lastSeenAt   = now
lastTreatAt  = 0
tokensSeenTotal  = 0
tokenExpAccrued  = 0
daily = { date: today(local), greatCount: 0, treatCount: 0 }
```

**의도된 사용자 체험:** 기존 진척도(현재 레벨의 progress bar)는 0으로 초기화되지만 level
숫자 자체는 보존된다. 사용자는 "지금 레벨은 그대로, 다음 레벨업까지 새 규칙으로 진행"
이라고 인식.

### 구버전 → 신버전 안전성

- 마이그레이션은 **state.json 파일 존재 여부만으로 판단**. 다른 신호 불필요.
- 마이그레이션 실패 시 silent fallback (현재 `loadConfig`처럼 초기화 후 진행).

---

## 9. Tick 로직 (모든 EXP 가산의 단일 진입점)

### Tick이란?

state.json을 최신 상태로 갱신하는 동기화 함수. statusline 호출, CLI 명령(show/great/treat)
실행 시 **반드시 1회 수행**된다.

### Tick 순서

1. **state.json 로드** (없으면 마이그레이션).
2. **daily 리셋 체크**: `daily.date != today(local)`이면 카운터 0으로 리셋, date 갱신.
3. **활동일 경계 감지**: `lastTickAt` ~ `now` 사이의 **활동일 수**(토·일 제외) 계산.
   - 활동일 0: 시간 EXP 미가산, hunger 미증가.
   - 활동일 N > 0: `exp += 20 * N * moodMultiplier`, `hunger = min(4, hunger + N)`.
4. **Neglect 판정**: `lastSeenAt`부터 경과 활동일 ≥ 3이면 다음 tick부터 mood=sad 효과 (moodMultiplier=0.5).
5. **토큰 EXP 가산** (statusline tick에서만, stdin JSON에 토큰 지표 있을 때):
   - `delta = tokenExpAt(현재누적) - tokenExpAt(tokensSeenTotal)`
   - `exp += max(0, delta)`, `tokensSeenTotal` 갱신, `tokenExpAccrued += max(0, delta)`.
6. **레벨업 체크**: `while exp >= threshold(level): exp -= threshold(level); level += 1`.
7. **lastTickAt 갱신**.
8. **state.json 저장**.

### Tick의 부수효과

- `lastSeenAt`은 **statusline tick에서만** 갱신 (`now`로). CLI 호출은 갱신하지 않음.
  → "사용자가 Claude Code를 켜고 있는지"를 statusline 호출로 판정.
- great/treat CLI는 tick 후 자체 EXP·hunger 변경을 추가 적용.

### 활동일 정의

- 로컬 타임존 기준 자정 경계.
- 월·화·수·목·금 = 활동일.
- 토·일 = 비활동일 (시간 EXP·hunger 증가 정지).
- 활동일 수 계산은 두 시각 사이의 자정 경계 중 토·일이 아닌 것의 수.

---

## 10. 작업 단계 (Phase)

각 Phase는 **별도 브랜치 + PR**로 분리한다. Phase 사이 의존성을 명시.

### Phase 1 — v0.3: 인프라 + EXP 시스템 + 토큰 EXP

**목적**: state.json 도입과 EXP 누적 시스템의 토대 완성. 사용자 가치 한 줄:

> "버디가 Claude 사용량에 반응한다."

**작업**:

- `~/.claude-buddy/state.json` 스키마와 load/save 로직 (`src/shared/state.ts` 신규).
- 마이그레이션 로직 (기존 사용자 첫 실행 시 자동).
- Tick 함수 구현 (`src/shared/tick.ts` 또는 `state.ts` 내부).
- 시간 EXP, 토큰 EXP 가산 로직.
- 임계치 함수 `threshold(L) = ceil(100·L^1.2)`.
- `progressionFromAge` 제거, statusline은 state.json의 `level`/`exp`/`threshold(level)` 사용.
- statusline.ts에서 stdin JSON 파싱 → 토큰 누적 지표 추출.
- 활동일 판정 유틸 (토·일 제외).

**완료 조건**:

- 기존 사용자가 v0.3로 업그레이드 후 첫 statusline 호출 시 동일 level 표시.
- 토큰 누적이 증가하면 progress bar가 자연스럽게 빨라짐.
- 토·일에는 progress가 멈춤.
- 신규 사용자가 `setup` 후 정상 동작.

**의존성**: 없음.

---

### Phase 2 — v0.4: 일일 인터랙션

**목적**: 사용자가 버디에게 직접 칭찬·간식 줄 수 있게 함. 사용자 가치:

> "버디한테 직접 칭찬·간식을 줄 수 있다."

**작업**:

- `claude-buddy great`, `claude-buddy treat` CLI 서브커맨드 추가.
- 일일 한도 체크 + 카운터 증가 + EXP 가산.
- `setup`이 `.claude/commands/buddy-great.md`, `.claude/commands/buddy-treat.md` 설치.
- 응답 메시지 양식 (`src/shared/messages.ts` 확장).
- `state.json.lastTreatAt` 갱신 로직 (treat은 Phase 3 hunger 리셋 위해 미리 도입).

**완료 조건**:

- Claude Code 안에서 `/buddy-great` 입력 시 칭찬 메시지 + EXP 가산.
- 일 3회 초과 시 거부 응답.
- 자정 넘어가면 카운터 리셋.

**의존성**: Phase 1 완료.

---

### Phase 3 — v0.5: 다마고치 상태 + statusline 시각화

**목적**: mood/hunger/neglect 시각화로 다마고치 톤 완성. 사용자 가치:

> "버디가 표정·배고픔·방치 반응을 한다."

**작업**:

- hunger 자동 증가 (tick에 통합) + treat 사용 시 0 리셋.
- Mood 파생 함수 (neglect / 인터랙션 / 기본).
- Neglect 판정 (3+ 연속 활동일 미접속) + 시간 EXP ×0.5 페널티.
- statusline 레이아웃 변경: `Buddy [mood][hunger] Lv.N [bar] rarity`.
- 아이콘 디자인 sprite 톤 맞춰 확정.
- 한도 초과 응답에 mood/hunger 반영된 메시지 추가 (선택).

**완료 조건**:

- 3+ 활동일 동안 statusline 미호출 시 다음 접속 시 sad 표시.
- treat 사용 직후 hunger 아이콘이 만복으로 변화.
- 시각적 변화가 sprite 톤과 충돌하지 않음.

**의존성**: Phase 2 완료.

---

## 11. 위험 요소 / 미해결 사항

후속 에이전트가 인지해야 할 불확실성.

- **statusline stdin JSON 스키마 변화 가능성**: Claude Code의 statusline 입력 포맷은
  공식 문서에 안정성 보장이 명시되지 않았음. 누적 토큰 또는 cost 필드의 정확한 이름·단위는
  Phase 1 구현 시점에 다시 확인 필요. 토큰 데이터 부재 시 silent fallback (시간 EXP만 가산).
- **토큰 누적 범위**: 세션 단위 vs 계정 평생 단위 — stdin JSON이 무엇을 제공하는지에 따라
  결정. 세션 단위면 새 세션 시작 시 워터마크 리셋 로직 필요. Phase 1에서 확정.
- **활동일 타임존**: 로컬 자정 기준으로 정의했지만 사용자가 시간대를 자주 이동하는 경우
  daily 카운터·tick 경계가 미묘하게 흔들릴 수 있음. v1에서는 단순 로컬로 처리, 후속 버전에서
  필요시 명시적 타임존 옵션 도입.
- **statusline 호출 빈도**: Claude Code가 너무 자주 호출하면 state.json 디스크 IO가 많아짐.
  필요 시 tick 결과를 메모리 캐시하고 일정 간격으로만 flush. 일단 v1은 매 호출 flush로 단순화.
- **마이그레이션 회귀**: 기존 사용자의 level이 v0.2 공식과 동일하게 산출되는지 단위 테스트
  필수. 200일 사용자 → Lv.29 등 표본 케이스.
- **아이콘 시각 일관성**: hunger/mood 아이콘이 sprite의 ANSI 컬러 톤과 충돌하지 않아야 함.
  Phase 3에서 sprite 검수와 함께 결정.
- **레벨업 알림 부재**: v1에서는 레벨업이 발생해도 별도 알림 없이 statusline에 즉시 반영만 됨.
  사용자가 변화를 놓칠 수 있지만, 다마고치적으로 "어느새 자라 있는" 느낌도 의도된 측면.
  v2에서 레벨업 메시지 도입 검토.

---

## 12. 참조

### claude-buddy 내부

- 현 레벨 산정 로직: `src/shared/render.ts:223-238`
- 현 설정 파일: `src/shared/config.ts:16-23`
- 현 statusline 진입점: `src/statusline/statusline.ts`
- 현 CLI 진입점: `bin/claude-buddy.cjs`, `src/index.ts`
- 메시지 양식: `src/shared/messages.ts`
- ASCII 렌더러: `src/shared/render.ts`

### 관련 외부 메커니즘

- Claude Code statusline 입력: `~/.claude/statusline.sh`에서 stdin으로 세션 JSON 전달.
  스키마는 `session_id`, `workspace`, `model`, `cost` 등을 포함 (정확한 필드명은 Claude Code 버전마다 다를 수 있음).
- Claude Code 슬래시 커맨드: `.claude/commands/<name>.md` 파일 배치로 사용자 환경에 명령 등록.
