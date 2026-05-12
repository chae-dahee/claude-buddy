# claude-buddy

Claude Code를 위한 터미널 동반자 — 당신의 statusline 안에 사는 랜덤 가챠 ASCII 캐릭터. 훅 없음, `/dev/tty` 쓰기 없음, settings.json 수정 없음. **토큰 소모 제로.**

```
   /\_/\
  ( ✦   ✦ )
  (  ω   )
  (")_(")
Buddy Lv.3 [██████░░░░] ★★★ · 오늘도 코딩 파이팅!
```

English documentation: [README.md](README.md)

---

## 동작 원리

claude-buddy는 기존 `~/.claude/statusline-command.sh`에 **한 줄만** 추가합니다. 나머지는 Claude Code의 네이티브 statusline 메커니즘이 처리합니다 — 백그라운드 프로세스도, 훅도 없습니다.

```
~/.claude/statusline-command.sh
   ├── (기존 model/git/context 라인들)
   └── claude-buddy statusline   ← 이게 전부입니다
```

Claude Code의 statusline 영역은 렌더링 표면을 독점적으로 소유하므로 TUI 리드로와의 **경쟁 조건이 없습니다**. `/dev/tty`로 멀티라인 ASCII를 쓸 때 발생하는 깨짐 현상이 근본적으로 해결됩니다.

---

## 설치

```bash
npm i -g claude-buddy-statusline
claude-buddy setup
```

`setup`이 `~/.claude/statusline-command.sh`에 자동으로 한 줄을 추가합니다. Claude Code를 재시작하면 버디가 나타납니다.

제거할 때는:

```bash
claude-buddy setup --uninstall
```

> 소스에서 직접 빌드하려면 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

---

## CLI 커맨드

| 커맨드 | 설명 |
|--------|------|
| `claude-buddy setup` | `~/.claude/statusline-command.sh`에 자동 설치 |
| `claude-buddy setup --uninstall` | statusline에서 제거 |
| `claude-buddy companion` | 현재 컴패니언 정보 출력 (종족, 레어도, 스탯) |
| `claude-buddy companion --reroll` | 새 컴패니언 가챠 |
| `claude-buddy companion --rarity epic --species blob --eye ✦ --hat crown` | 컴패니언 필드 직접 수정 |
| `claude-buddy show` | 터미널에 버디 직접 출력 (미리보기) |

---

## 컴패니언 시스템

첫 실행 시 가챠 테이블에서 랜덤 컴패니언이 뽑혀 `~/.claude-buddy/companion.json`에 저장됩니다. `--reroll`로 새로 뽑을 수 있습니다.

| 레어도 | 확률 | 별 |
|--------|------|-----|
| Common | 60% | ★ |
| Uncommon | 25% | ★★ |
| Rare | 10% | ★★★ |
| Epic | 4% | ★★★★ |
| Legendary | 1% | ★★★★★ |

18종족 · 눈 스타일 6종 · 모자 8종 (Uncommon 이상) · 1% shiny 확률 · 스탯 5종 (DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK)

Shiny 컴패니언은 정보 바 아래에 반짝임 라인 `✦ ✨ ✦ ✨ ✦`이 추가됩니다.

---

## 성장 시스템

레벨은 **시간 기반**입니다 — 훅이나 이벤트 추적이 필요 없습니다:

- `level = floor((현재 시각 - 생성 시각) / 7일) + 1`
- 진행 바는 현재 주 내 진행도를 표시합니다

오래된 컴패니언일수록 레벨이 높습니다. XP 파밍도, 별도 상태 파일도 없습니다.

---

## 로컬 파일

| 경로 | 설명 |
|------|------|
| `~/.claude-buddy/config.json` | UUID 시드, 표시 이름, 생성 타임스탬프 |
| `~/.claude-buddy/companion.json` | 뽑힌 데이터 (종족, 레어도, 눈, 모자, shiny, 스탯) |

`config.json`의 `name` 값을 수정하면 버디 이름을 바꿀 수 있습니다.  
`CLAUDE_BUDDY_STATE_DIR` 환경변수로 디렉토리를 변경할 수 있습니다.

---

## 왜 훅을 사용하지 않나요?

이전 버전은 `PostToolUse`와 `Stop` 훅을 사용해 `/dev/tty`에 멀티라인 스프라이트를 출력했습니다. 그 방식은 **Claude Code의 TUI 리드로와 필연적으로 경쟁 조건이 발생합니다**: 터미널 커서 위치에 직접 쓰면 라이브 영역의 `\033[A`/`\033[J` 리드로와 충돌해 채팅이 스크롤될 때마다 스프라이트가 깨집니다.

Statusline은 Claude Code가 원자적으로 소유하고 갱신하는 유일한 렌더링 표면이므로, 버디를 여기에 주입하면 깨짐 현상이 완전히 해결됩니다. 훅, `/dev/tty`, 감정 전환, 반응 시스템 모두 순수 렌더 전용 설계를 위해 제거되었습니다.

---

## 라이선스

MIT
