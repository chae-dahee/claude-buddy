# claude-buddy 프로젝트 기술서

Claude Code statusline에 사는 ASCII 동반 캐릭터 프로젝트의 배경, 기능, 그리고 설계가 어떻게 바뀌어왔는지를 정리한 문서입니다.

## 1. 개발 배경 및 목적

만우절 사이드 프로젝트로 시작했습니다. Claude Code 화면에 캐릭터 하나를 띄워두면 작업이 덜 외롭지 않을까 하는 가벼운 동기에서 출발했습니다.

다만 다음 제약 안에서 만들고 싶었습니다.

- **MCP 서버를 띄우지 않을 것** — 별도 프로세스·설정 없이 사용자가 손쉽게 켤 수 있어야 합니다.
- **토큰을 한 톨도 쓰지 않을 것** — 캐릭터 표시는 부가 기능이지 본업이 아닙니다. LLM 호출이 끼면 안 됩니다.
- **그럼에도 캐릭터를 계속 보여줄 것** — 잠깐 뜨고 사라지는 알림이 아니라, 작업 내내 자리를 지키는 동반자여야 합니다.

핵심 질문은 **"훅도 안 쓰고 토큰도 안 쓰면서 캐릭터 표시를 계속 유지할 수 있는가?"** 였습니다. 결론은 가능했고, Claude Code의 statusline 영역을 그 자리로 골랐습니다.

## 2. Buddy 기능 소개

### 가챠 시스템

`claude-buddy setup`을 처음 실행하면 사용자 UUID를 시드로 캐릭터가 결정됩니다. 종족 18종 · 눈 6종 · 모자 8종 · shiny 1%의 조합이며 레어도는 Common 60% / Uncommon 25% / Rare 10% / Epic 4% / Legendary 1%입니다.

- **랜덤 재롤** — `claude-buddy companion --reroll`
- **지정 뽑기** — `--rarity epic --species blob --eye ✦ --hat crown` 처럼 필드별로 직접 고정 가능
- **결정론적 생성** — 같은 UUID·시드라면 항상 같은 캐릭터가 나오므로 서버나 저장이 따로 필요 없습니다.

### Claude Code statusline 표시

`~/.claude/statusline.sh`에 한 줄(`claude-buddy statusline`)을 추가하면, Claude Code가 statusline을 그릴 때마다 캐릭터가 함께 렌더링됩니다. 호출은 순수 stdout 출력만 하고 끝나므로 토큰·네트워크 비용이 없습니다.

### 여러 줄 스프라이트 출력

스프라이트는 4–5줄짜리 ASCII 그림입니다. 인사말·레벨·진행도 바를 포함한 전체 문장이 한 번의 호출에서 함께 출력됩니다.

### 표정 애니메이션 (시간 단위 최적화)

눈 모양만 두 프레임을 두고 60초마다 토글합니다(`src/statusline/status-line.ts:23`). 별도 타이머·이벤트 루프 없이 `Math.floor(Date.now() / 60000) % 2`로 현재 프레임을 계산하기 때문에, 호출당 비용이 사실상 0입니다. 깜빡임은 느리지만 그래서 시각적으로 거슬리지 않습니다.

### 레벨

`~/.claude-buddy/config.json`의 `createdAt`으로부터 경과 시간만 보고 7일에 1레벨씩 자동 상승합니다. 훅·이벤트 없이 시간만으로 진행도 바가 차오릅니다.

## 3. 사용 방법

### npm 글로벌 설치 (일반 사용자)

```bash
npm i -g claude-buddy-statusline
claude-buddy setup
```

`setup`이 `~/.claude/statusline.sh`에 한 줄을 추가하고 `~/.claude/settings.json`의 `statusLine`도 자동으로 채워줍니다. Claude Code를 재시작하면 buddy가 나타납니다.

### git clone + 전역 빌드 설치 (개발자)

```bash
git clone https://github.com/chae-dahee/claude-buddy.git
cd claude-buddy
npm install
npm run build
npm link
claude-buddy setup
```

`npm link`로 글로벌 PATH에 전역 빌드를 심어 두면 `claude-buddy` 커맨드를 어디서나 쓸 수 있습니다.

## 4. 초기 개발 설계와 한계

처음 설계는 statusline이 아니라 **TUI 하단 직접 그리기**였습니다.

### 초기 접근: 훅 + `/dev/tty`

- `PostToolUse` 훅 — Bash 실행을 감지해서 캐릭터를 갱신
- `Stop` 훅 — 세션 종료 시점에 캐릭터를 다시 그림
- 출력은 `/dev/tty`로 직접 ANSI 시퀀스를 써서 Claude Code 컨텍스트를 우회

이 구조로 캐릭터를 화면 하단에 띄우는 데까지는 성공했습니다.

### 문제점: TUI 렌더링 타이밍 충돌

문제는 채팅이 스크롤될 때 드러났습니다. Claude Code는 화면이 갱신될 때마다 ANSI 커서 시퀀스(`\033[A`, `\033[J`)로 영역을 다시 그립니다. 이 재렌더 타이밍에 `/dev/tty`로 쓴 캐릭터가 겹치면 스프라이트가 일부만 남거나 깨졌습니다.

특히 `PostToolUse`는 세션 중 여러 번 발화되기 때문에, 화면이 한창 갱신되는 도중 출력이 끼어드는 경우가 잦았습니다. `Stop` 훅도 터미널 정리 시점이 보장되지 않아 불안정했습니다.

임시로 출력 뒤에 newline 8개(TRAILING_PAD)를 붙여 스프라이트를 scrollback 영역으로 밀어내는 회피책을 넣어봤지만, 문제를 줄였을 뿐 본질적인 race condition은 그대로였습니다.

### 검토한 대안

- TUI 그리기 유지 + 락 도입 → Claude Code 내부 렌더 시점을 알 수 없어 락의 기준점이 없음
- 별도 TUI 영역(예: tmux 분할) → 사용자 환경 요구가 너무 큼
- **statusline 영역만 사용** ← 채택

statusline은 Claude Code가 직접 관리하는 영역이라 외부 출력과 겹칠 일이 없습니다. 훅·`/dev/tty`·감정 전환 시스템을 전부 걷어내고, statusline 한 곳만 쓰는 구조로 바꿨습니다.

## 5. 해결책 — statusline 멀티라인 렌더링

### statusline.sh 한 줄 세팅

`setup` 명령이 `~/.claude/statusline.sh`에 다음 한 줄을 추가합니다(`src/cli/setup.ts:8`).

```bash
command -v claude-buddy &>/dev/null && claude-buddy statusline
```

`command -v` 가드 덕분에 패키지가 제거된 뒤에도 이 라인이 남아 있어도 statusline 전체가 깨지지 않습니다.

### 전체 문장 한 번에 출력

statusline은 `\n`을 포함한 멀티라인 stdout을 허용합니다. `src/statusline/status-line.ts:33`에서 스프라이트·인사말·진행도 바를 모두 한 줄 문자열로 합쳐서 한 번에 씁니다.

```ts
process.stdout.write(lines.join('\n') + '\n');
```

스프라이트 4–5줄 + 정보 라인 + (shiny 효과 줄)이 한 호출에서 함께 출력되므로, 별도 동기화 코드가 필요 없습니다. 실패는 silent하게 무시(`status-line.ts:34`)해서 buddy가 사용자 프롬프트를 절대 깨지 않도록 했습니다.

### 좌우 분할 레이아웃

기존에 다른 statusline 명령을 쓰던 사용자를 위해 좌우 분할 모드를 제공합니다.

```bash
claude-buddy setup --layout side-by-side
```

이때 `setup`은 기존 사용자의 statusline command를 `statusline.sh`로 마이그레이션하고, bash process substitution + `paste`로 두 출력을 좌·우로 붙입니다(`src/cli/setup.ts:78`).

```bash
paste -d'   ' <(claude-buddy statusline) <(기존 statusline 명령)
```

원래 명령은 `# claude-buddy:migrated=<원본>` 주석으로 기록되므로, uninstall 시 원상복구할 수 있습니다.

## 6. 운영 이슈와 방어 코드

### Uninstall 잔재 문제

npm 글로벌 제거 후에도 `statusline.sh`의 buddy 라인이 남아 있으면 `command not found`가 발생하면서 statusline 전체 출력이 실패합니다. 다른 statusline 설정까지 동반으로 깨지는 사고가 있었습니다.

해결책 두 가지를 함께 적용했습니다.

1. **package.json의 `preuninstall` 스크립트** — `claude-buddy setup --uninstall || true`로 글로벌 제거 전에 자기 라인을 먼저 떼어냅니다.
2. **호출부에 `command -v` 가드** — 그래도 라인이 남아 있을 때 전체가 깨지지 않도록 방어합니다.

### Migration 마커로 원본 명령 추적

좌우 분할 설치 시 기존 사용자 statusline command를 마이그레이션하므로, uninstall 시 무엇을 복원해야 하는지를 `# claude-buddy:migrated=` 주석으로 기록해 둡니다. `setup --uninstall`이 이 마커를 읽어서 settings.json의 `statusLine`을 원래 명령으로 되돌립니다(`src/cli/setup.ts:107`).

### Silent failure 원칙

statusline 렌더러는 어떤 예외도 밖으로 던지지 않습니다. 캐릭터를 못 그릴지언정 사용자 프롬프트를 깨지 않는 것이 최우선입니다.

---

## 부록: 디렉토리 구조

```
src/
├── shared/
│   ├── types.ts         종족·눈·모자·레어도·스탯 타입
│   ├── config.ts        ~/.claude-buddy/config.json 관리
│   ├── companion.ts     가챠 엔진 (Mulberry32 PRNG + FNV-1a 해시)
│   ├── render.ts        스프라이트·모자·진행도 바 렌더링
│   └── messages.ts      시간대별 인사말
├── cli/
│   ├── companion.ts     companion 표시·재롤·지정
│   ├── setup.ts         statusline.sh + settings.json 설치/제거
│   └── show.ts          터미널 미리보기
├── statusline/
│   └── status-line.ts   statusline 진입점 (60초 프레임 토글)
└── index.ts             공개 API 재내보내기

bin/
└── claude-buddy.cjs     CommonJS 래퍼 (ESM dist 동적 로드)
```

## 부록: 결정론적 가챠

1. 사용자 UUID + 고정 salt를 이어붙임
2. FNV-1a 해시로 32비트 시드 생성
3. Mulberry32 PRNG 초기화
4. 순서대로 레어도 → 종족 → 눈 → 모자 → shiny → 스탯 롤
5. 같은 사용자에게는 항상 같은 결과 → 별도 저장·서버·네트워크 호출 모두 불필요
