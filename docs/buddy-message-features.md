# Buddy 한마디 콘텐츠 확장 검토

`pickMessage()`가 채우고 있는 "버디의 한마디" 자리(현재 `src/shared/messages.ts`)에
넣을 동적 콘텐츠 후보의 구현 가능성을 정리합니다.

## 전제 제약

- README 문구 그대로 **"Zero tokens, no hooks"** — statusline은 매 입력마다 호출됩니다.
- statusline 렌더는 **블로킹 없이 즉시 반환**되어야 합니다. 네트워크/외부 명령 직접 호출 금지.
- 외부 데이터가 필요한 콘텐츠는 **캐시 파일 + 백그라운드 갱신** 패턴으로 우회해야 합니다.
- 현재 렌더 경로: `renderCharacter()` → `pickMessage()` → 단일 라인 텍스트.
  대체/혼합 풀을 추가하려면 `pickMessage()` 시그니처와 풀 선택 로직을 확장합니다.

## 후보 평가

| 후보 | 난이도 | 외부 의존 | 패키지 철학 적합도 |
|---|---|---|---|
| 뽀모도로 | 낮음 | 없음 (로컬 상태 파일) | ★★★ |
| 오늘의 명언 | 매우 낮음 | 없음 (번들 배열) | ★★★ |
| CPU/시스템 상태 | 낮음 | Node 내장 `os` | ★★★ |
| 날씨 | 중간 | HTTP API + 캐시 | ★★ |
| 캘린더 | 중간 | ICS/AppleScript + 캐시 | ★★ |
| 오늘의 이슈/뉴스 | 중간 | RSS/News API + 캐시 | ★ |

-> 사용자 아이디어로 추가합니다
- 버디한테 칭찬, 간식주기 하면 하루에 추가 경험치 오르기
- 레벨(경험치) 토큰사용량로 경험치 오르기, 다만 기여도는 적당히(소량?)

### 1. 오늘의 명언 — 즉시 가능

- `src/shared/messages.ts`에 `QUOTES` 배열 추가, `pickMessage()` 풀 후보로 편입.
- 결정론적 회전을 원하면 `Math.floor(Date.now() / DAY_MS) % QUOTES.length`로 일일 1회 변경.
- 네트워크/파일 I/O 없음. 가장 먼저 착수하기 적합.

### 2. 뽀모도로 — 아키텍처에 가장 잘 맞음

- CLI 서브커맨드 추가: `claude-buddy pomodoro start [25m]`, `claude-buddy pomodoro stop`.
- 상태 파일: `~/.claude-buddy/pomodoro.json`
  ```json
  { "startedAt": 1234567890, "durationMs": 1500000, "phase": "work" }
  ```
- statusline은 파일 동기 read 1회 → 남은 시간 계산 → `🍅 12:34` 표출.
- 파일 부재 시 기존 한마디로 폴백.

### 3. CPU / 시스템 상태 — Node 내장으로 가능

- `os.loadavg()`, `os.cpus()`로 즉시 조회. 외부 프로세스 호출 없음.
- "프로그램 변경사항"은 모호 — 실행 프로세스 diff를 의미한다면 `ps` 샘플링이 필요하며 statusline 즉시성에 부적합. 별도 데몬으로 캐시 후 읽는 형태로만 권장.

### 4. 날씨 — 캐시 레이어 필수

- 직접 fetch는 금지. 갱신 주체와 트리거를 먼저 결정.
- 후보 API:
  - **Open-Meteo** — API 키 불필요, 가장 가볍게 시작 가능.
  - 기상청 단기예보 — 키 필요, 한국 한정 정확도 우수.
- 위치는 config로 받거나 IP 기반 추정. config 우선.
- 파이썬 스크립트는 불필요 — Node 20+ 내장 `fetch`로 충분.

### 5. 캘린더 — 통합 비용 주의

- 옵션 A: macOS Calendar.app AppleScript — 권한 프롬프트 필요, 느림 → 반드시 캐시.
- 옵션 B: ICS URL 구독 (구글 캘린더 비공개 ICS 등) — fetch + 파서.
- 옵션 C: 로컬 ICS 파일 경로 지정 — 의존성 가장 가벼움.
- 표출은 "다음 일정 1건"만 (`📅 14:00 미팅`).

### 6. 오늘의 이슈 / 뉴스 — 외부 의존 가장 큼

- RSS(네이버/다음/Google News) 또는 NewsAPI → 캐시 파일 갱신.
- 한 줄 길이 제약 때문에 헤드라인 1개만.
- 갱신 트리거 설계 필요 (cron / 로그인 시 / lazy detached spawn).
- API 키 관리 부담 가장 큼.

## 공통 인프라 — 캐시 파일 헬퍼

날씨·뉴스·캘린더가 모두 공유할 동기 read 패턴.

- 디렉토리: `~/.claude-buddy/cache/`
- 헬퍼 시그니처(예시):
  ```ts
  function readCacheOrStale<T>(
    file: string,
    maxAgeMs: number,
  ): { value: T | null; stale: boolean };
  ```
- 갱신 트리거: stale 감지 시 `child_process.spawn(..., { detached: true, stdio: 'ignore' }).unref()`
  로 백그라운드 갱신 → 다음 렌더 호출에서 새 값 노출.
- statusline 렌더 경로는 **항상 동기 파일 읽기 + 즉시 반환**을 유지.

## 권장 시작 순서

1. **뽀모도로** — CLI 서브커맨드 패턴과 상태 파일 처음 도입.
2. **오늘의 명언** — `pickMessage()` 풀 확장 패턴 정립.
3. **날씨 (Open-Meteo / ICS 캘린더)** — 공통 캐시 헬퍼를 처음으로 깔고 검증.
4. **나머지 (뉴스, OS 캘린더 연동)** — 캐시 인프라가 자리잡은 뒤 추가.

## 내일 이어서 결정할 항목

- `pickMessage()` 확장 방식: 풀 종류를 늘릴지, 별도 `getStatusContent()`로 분리할지.
- 뽀모도로 상태 파일 스키마 확정 및 표시 포맷.
- 캐시 디렉토리 위치 (`~/.claude-buddy/` vs `$XDG_CACHE_HOME/claude-buddy/`).
- config에 노출할 기능 토글 (`features: { pomodoro: true, weather: false, ... }`).
