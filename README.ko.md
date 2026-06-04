# claude-buddy

Claude Code statusline에 사는 ASCII buddy입니다. 가챠로 뽑힙니다.

훅 없음 · `/dev/tty` 직접 쓰기 없음 · **토큰 소모 없음**

```
   /\_/\
  ( ✦   ✦ )
  (  ω   )
  (")_(")
Buddy (^_^) ●●●● Lv.3 [██████░░░░] ★★★ · 오늘도 코딩 파이팅!
```

English: [README.md](README.md)

## 어떻게 동작하나요

`~/.claude/statusline.sh`에 한 줄을 추가하는 게 끝입니다.

나머지는 Claude Code의 statusline이 알아서 렌더링해줍니다.

```
~/.claude/statusline.sh
   ├── (기존 라인들)
   └── claude-buddy statusline
```

## 설치

```bash
npm i -g claude-buddy-statusline
claude-buddy setup
```

`setup`이 `statusline.sh`에 buddy 라인을 추가하고, `settings.json`의 `statusLine`도 자동으로 설정합니다.
Claude Code를 재시작하면 buddy가 나타납니다.

Claude Code StatusLine 에서 표시되는 buddy를 제거하려면 (off):

```bash
claude-buddy setup --uninstall
```

> 소스 빌드는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 커맨드

| 커맨드                                                                    | 설명                           |
| ------------------------------------------------------------------------- | ------------------------------ |
| `claude-buddy setup`                                                      | statusline에 설치              |
| `claude-buddy setup --uninstall`                                          | statusline에서 제거            |
| `claude-buddy companion`                                                  | 현재 companion 정보 출력       |
| `claude-buddy companion --reroll`                                         | 새로 뽑기                      |
| `claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown` | 직접 지정                      |
| `claude-buddy show`                                                       | 터미널에 buddy 출력 (미리보기) |
| `claude-buddy great`                                                      | 버디 칭찬하기 (하루 3회)       |
| `claude-buddy treat`                                                      | 버디한테 간식 주기 — hunger 리셋 (하루 3회) |

`setup`은 `/buddy-great` · `/buddy-treat` 슬래시 커맨드도 함께 설치하므로, Claude Code 세션 안에서 바로 버디에게 밥을 주고 칭찬할 수 있습니다.

## Companion 시스템

처음 실행할 때 가챠로 뽑혀서 `~/.claude-buddy/companion.json`에 저장됩니다.

`--reroll`로 다시 뽑을 수 있습니다.

| 레어도    | 확률 | 별    | 색상 |
| --------- | ---- | ----- | ---- |
| Common    | 60%  | ★     | 기본 |
| Uncommon  | 25%  | ★★    | 초록 |
| Rare      | 10%  | ★★★   | 파랑 |
| Epic      | 4%   | ★★★★  | 보라 |
| Legendary | 1%   | ★★★★★ | 금색 |

종족 18종 · 눈 모양 6종 · 모자 8종 (Uncommon 이상) · shiny 1% · 스탯 5종 (DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK)

Shiny buddy는 정보 바 아래에 `✦ ✨ ✦ ✨ ✦`이 붙습니다.

## 레벨

훅이나 이벤트 없이 시간만으로 계산합니다.
`claude-buddy setup`을 처음 실행한 날부터 7일마다 레벨이 1씩 오릅니다.
최대 레벨 제한은 없습니다.

```
Lv.1   설치 당일
Lv.2   7일 후
Lv.3   14일 후
Lv.4   21일 후
...
```

statusline의 진행 바 `[████░░░░░░]`는 현재 레벨 내 남은 날을 보여줍니다.
꽉 찰수록 다음 레벨에 가깝습니다.

## 기분 & 배고픔

info 라인에 buddy의 현재 기분과 배고픔 게이지가 표시됩니다.

```
Buddy (^_^) ●●●● Lv.3 [██████░░░░] ★★★
       │      │
       │      └── 배고픔: ●●●● 만복 → ○○○○ 배고픔
       └────────── 기분 카오모지
```

| 기분 | 카오모지 | 조건 |
|------|----------|------|
| 행복 | `(^_^)` | 오늘 `/buddy-great` 또는 `/buddy-treat` 사용 |
| 보통 | `(-_-)` | 기본값 |
| 슬픔 | `(;_;)` | 활동일(평일 기준) 3일 이상 Claude Code를 열지 않음 |

배고픔은 시간이 지나면 점점 증가합니다. `/buddy-treat`로 다시 만복 상태로 리셋됩니다.

## 로컬 파일

| 경로                             | 내용                                              |
| -------------------------------- | ------------------------------------------------- |
| `~/.claude-buddy/config.json`    | UUID 시드, 이름, 생성 시각                        |
| `~/.claude-buddy/companion.json` | 뽑힌 데이터 (종족, 레어도, 눈, 모자, shiny, 스탯) |
| `~/.claude-buddy/buddy-state.json` | 런타임 상태 (hunger, exp, lastSeen, 일일 인터랙션 횟수) |

`config.json`의 `name`을 바꾸면 buddy 이름을 변경할 수 있습니다.
`CLAUDE_BUDDY_STATE_DIR` 환경변수로 저장 위치를 바꿀 수 있습니다.

## 왜 훅을 안 쓰나요

이전 버전은 `PostToolUse` · `Stop` 훅으로 `/dev/tty`에 직접 스프라이트를 출력했습니다.
그런데 채팅이 스크롤될 때마다 Claude Code가 화면 일부를 다시 그립니다.
이 타이밍에 `/dev/tty` 출력이 겹치면 스프라이트가 깨집니다.

Statusline은 Claude Code가 직접 관리하는 영역이라 이 문제가 없습니다.
훅, `/dev/tty`, 감정 전환 시스템을 전부 걷어내고 statusline만 쓰는 구조로 바꿨습니다.

---

## 라이선스

MIT
