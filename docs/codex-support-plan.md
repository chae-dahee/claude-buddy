# Codex CLI 지원 추가 — 작업 계획

claude-buddy를 Claude Code 외에 **OpenAI Codex CLI**에도 표시 가능하게 확장하기 위한
요구사항·아키텍처·작업 단계 정의 문서입니다. 이 문서 하나만 읽고도 후속 에이전트가
구현에 착수할 수 있도록 핵심 결정과 큰 구성 위주로 정리합니다. 구체적인 코드는
의도적으로 생략하며, 이는 후속 에이전트의 책임입니다.

---

## 1. 배경

### 현재 상태

- claude-buddy는 **Claude Code 전용**으로 동작.
  - `~/.claude/statusline.sh` + `~/.claude/settings.json`의 `statusLine.command`에 후킹.
  - 출력 형식: 4줄 ASCII 스프라이트 + ANSI color + 텍스트 한 줄.
- 자산: 순수 텍스트(ASCII art + ANSI escape). 바이너리 이미지 자산 0개.

### Codex CLI의 확장 모델

- **statusline 영역에는 외부 명령 후킹 불가.**
  공식 statusline은 Claude Code 고유 기능. Codex의 `/statusline`은 내장 항목 토글 전용.
- Codex에는 **pet 시스템**이 별도로 존재.
  - `/pets`(별칭 `/pet`) 슬래시 커맨드로 picker UI.
  - 사용자가 선택한 1개 pet이 TUI 한 켠에 표시됨.
- pet 매니페스트 위치: `$CODEX_HOME/pets/<id>/pet.json` (+ `spritesheet.webp`).
- 렌더링: **Kitty graphics 또는 Sixel 프로토콜로 비트맵 이미지 송출**.
  → 텍스트가 아니라 픽셀 이미지. tmux/Zellij/구버전 iTerm2 등에서는 표시 불가.

### Claude Code statusline의 한계 (확인됨)

- Claude Code는 inline image protocol을 **지원하지 않음** (`openai/codex` Issue #2266 closed).
- statusline 공식 허용 출력 = `multi-line + ANSI color + OSC 8 hyperlink`만.
- 따라서 **단일 픽셀 자산으로 양쪽을 만족시킬 수 없음**.
  → ASCII 자산(Claude Code)과 픽셀 자산(Codex)을 **이원화**해야 한다.

---

## 2. 핵심 결정 사항

이 세션에서 합의된 결정들. 변경하려면 별도 논의 필요.

| 결정 항목 | 내용 |
|---|---|
| **양쪽 호환 전략** | 자산 이원화 (ASCII + 픽셀). 단일 자산 통일은 statusline 제약으로 불가. |
| **species 매핑** | 1:1. ASCII 18종과 Codex pet 18종이 같은 캐릭터를 표현. |
| **Codex pet id 명명** | `codex-buddy-<species>` (예: `codex-buddy-cat`). 충돌 방지 prefix. |
| **스타일 톤** | 기존 ASCII buddy 톤 유지. 8–16색 제한 팔레트, 외곽선 명확, chibi 비율. Codex 빌트인의 AA 일러스트 스타일은 따라가지 않음(의도적 차별화). |
| **캔버스 점유율** | Codex 빌트인과 동일 25–35%. 192×208 cell 안에서 캐릭터가 차지하는 비율. |
| **자산 구조** | Base + Overlay + Anchor 합성 (옵션 Y, 아래 5장 참조). |
| **eye 표현** | 픽셀 시트에 베이크하지 않음. ASCII 전용. 픽셀 측은 idle 2-frame blink로 대체. |
| **hat 표현** | hat 종류는 1종 고정(사용자 buddy가 보유한 것), frame anchor를 따라 캐릭터 움직임에 hat이 자연스럽게 따라가는 방식. |
| **rarity** | 시트에 베이크 금지. 텍스트 라벨(별 + 색)로만 표현 — `displayName`에 ` Lv.N ★★★` 형식 등. |
| **shiny** | sparkle frame을 idle에 끼워 반짝거리게. |
| **배포 방식** | 단일 npm 패키지에 자산 동봉(P1). 옵션 Y로 자산 ~5MB로 추정 — 분리 비용보다 단순함 우선. |
| **합성 시점** | `claude-buddy setup --target codex` 실행 시 사용자 컴퓨터에서 1회 합성. |
| **합성 도구** | `sharp` (Node.js 이미지 라이브러리). |

---

## 3. Codex pet 시스템 사양 (구현 시 참조)

### 디렉토리 구조

```
$CODEX_HOME/pets/<pet_id>/
  pet.json
  spritesheet.webp
```

기본 `$CODEX_HOME` = `~/.codex/`.

### `pet.json` 스키마 (PetFile)

소스: `codex-rs/tui/src/pets/model.rs:108-141` (github.com/openai/codex).

```
id              string?  optional
displayName     string?  optional
description     string?  optional
spritesheetPath string?  optional (기본 "spritesheet.webp", 절대경로/상위 디렉토리 참조 금지)
frame           object?  optional ({ width, height, columns, rows }, 기본 192×208/8×9)
animations      map<string, AnimationSpec>  optional, 기본 빈 맵 (비우면 default_animations 사용)
```

### `AnimationSpec`

```
frames    number[]   사용할 cell 인덱스 (row-major, 0..71)
fps       number?    optional
loop      bool?      optional
fallback  string     optional (다른 애니메이션 이름)
```

### Codex가 호출하는 애니메이션 이름 (`default_animations()`)

```
idle, running-right, running-left, waving, jumping, failed, waiting,
running, review, move_right, move_left, wave, bounce, sad
```

claude-buddy는 이 중 **idle, running-right, running-left, waving, jumping** 5종을
지원 대상으로 한다(나머지는 추후 확장).

### spritesheet 제약

- 정확히 1536×1872 px (192×8 cols × 208×9 rows). 다른 크기는 거부됨.
- 알파 채널 사용 가능 (RGBA).
- 빈 cell은 완전 투명으로 두면 됨.

---

## 4. 아키텍처 — 디렉토리 구조

현 `src/shared/`가 이미 호스트 무관 코드와 Claude Code 전용 코드를 어느 정도 분리하고 있다.
다음 구조로 재편한다.

```
src/
  core/                        # 호스트 무관 코어
    types.ts                   # 현 shared/types.ts 이동
    companion.ts               # 현 shared/companion.ts 이동
    config.ts                  # 현 shared/config.ts 이동
    messages.ts                # 현 shared/messages.ts 이동
  renderers/
    ascii.ts                   # 현 shared/render.ts 이동 (Claude Code용 텍스트 출력)
    sprite/                    # 신규 (Codex용 시트 합성)
      anchors/                 # species별 frame anchor JSON
      compose.ts               # sharp 기반 합성 로직
  hosts/
    claude-code/
      statusline.ts            # 현 statusline/statusline.ts 이동
      setup.ts                 # 현 cli/setup.ts 이동
    codex/                     # 신규
      setup.ts                 # ~/.codex/pets/<id>/ 배치
      pet-json.ts              # pet.json 생성 (animations 포함)
  cli/                         # 공용 라우팅
    setup.ts                   # --target claude-code|codex|both 라우팅
    show.ts                    # 현재 유지
    companion.ts               # 현재 유지
  assets/                      # 자산 (패키지 동봉)
    species/<species>.webp     # 18종 base 시트 (hat 없음)
    hats/<hat>.png             # 8종 hat overlay 스프라이트
    anchors/<species>.json     # 18종 frame anchor 메타데이터
```

### 모듈 경계 원칙

- **`core/`**: 호스트와 자산 형식에 무관. Node.js 표준 라이브러리 외 의존 최소.
- **`renderers/`**: 자산 형식별로 1개. 입력은 `CompanionBones` + `BuddyConfig`,
  출력은 형식별 산출물(텍스트 라인 vs webp 파일).
- **`hosts/`**: 호스트별 통합 로직. `~/.claude/`, `~/.codex/` 같은 OS 경로 IO는 여기서만.
- **자산은 `core/`, `renderers/`가 직접 읽지 않음.** 호스트가 자산 경로를 결정하고
  renderer를 호출.

---

## 5. 자산 구조 — Base + Overlay + Anchor (옵션 Y)

### 자산 3종

**1. Base species 시트** (`assets/species/<species>.webp`, 18장)

- 1536×1872 RGBA WebP, 8×9 cell.
- 각 cell에는 hat 없는 맨몸 캐릭터. **머리 위 공간은 비워둔다** (hat overlay 영역).
- 채우는 cell: 최소 `idle`(2 frame), `running-right`(2 frame), `running-left`(2 frame),
  `waving`(2 frame), `jumping`(2 frame) = 10 frame 이상.
  나머지 cell은 투명(빈 cell).
- 색상 팔레트 8–16색 제한, 외곽선 1px, chibi 비율.

**2. Hat overlay 스프라이트** (`assets/hats/<hat>.png`, 8장)

- 한 hat 1장. 작은 PNG (예: 32×24 ~ 40×32).
- `none` 제외 7종: crown, tophat, propeller, halo, wizard, beanie, tinyduck.
- 알파 채널 필수.

**3. Frame anchor 메타데이터** (`assets/anchors/<species>.json`, 18장)

```
{
  "frames": [
    { "x": 84, "y": 36 },   // frame 0 좌표 (cell 내부 좌표, hat 좌상단 기준)
    { "x": 84, "y": 32 },   // frame 1
    ...
  ]
}
```

- frame 인덱스는 row-major 0..71.
- 사용하지 않는 frame은 anchor 누락 허용(합성 시 skip).
- 좌표는 cell 내부의 hat 좌상단 위치. 좌표 차이가 hat의 "위아래좌우 움직임"을 만든다.

### 합성 단계 (setup 시점)

```
입력: companion.json { species, hat, ... }
출력: $CODEX_HOME/pets/codex-buddy-<species>/spritesheet.webp + pet.json

1. species의 base 시트와 anchor JSON 로드.
2. hat이 'none'이면 base 시트 그대로 복사.
3. hat이 다른 값이면, 각 frame마다 anchor 좌표에 hat overlay를 composite.
   → sharp의 composite() 한 번에 처리 가능.
4. WebP로 저장.
5. pet.json 생성 (animations 필드는 species 시트가 실제 사용한 frame index로).
```

### shiny 처리

- sparkle frame을 base 시트의 한 row에 미리 그려 둠 (예: row 8).
- shiny=true인 사용자의 pet.json은 `animations.idle.frames`에 sparkle frame을
  중간중간 끼워 넣음. 예: `[0, 1, 64, 0, 1, 65]`.
- shiny=false면 일반 idle frame만 사용.

---

## 6. 작업 단계 (Phase)

각 Phase는 **별도 브랜치 + PR**로 분리한다. Phase 사이 의존성을 명시.

### Phase A — 사전 리팩토링 (코어/호스트 분리)

**목적**: Codex 코드를 추가하기 전, 현 코드를 호스트 무관/Claude Code 전용으로 깔끔히 분리한다.

**작업**:
- `src/shared/` → `src/core/` 이름 정리 (또는 유지 결정).
- `src/shared/render.ts` → `src/renderers/ascii.ts` 이동.
- `src/statusline/`, `src/cli/setup.ts` → `src/hosts/claude-code/` 이동.
- import 경로 일괄 수정.
- 기존 `claude-buddy setup` 동작이 그대로 유지되어야 함(회귀 금지).

**완료 조건**: 기존 테스트 전수 통과, statusline 출력이 리팩토링 전후 동일.

**의존성**: 없음.

---

### Phase B — 자산 디자인

**목적**: 18종 base 시트 + 8종 hat overlay + 18종 anchor JSON 생산.

**작업**:
- 디자인 가이드라인 문서 별도 작성 (팔레트, 점유율, frame 사용 규약).
- 18종 species 시트 디자인 (현 ASCII 18종 1:1 매핑).
- 7종 hat 디자인 (none 제외).
- species별 anchor JSON 작성 (frame마다 hat 좌상단 좌표).

**완료 조건**: 모든 자산이 `src/assets/` 하위에 배치되고, 합성 도구 없이도 시트
단독으로 1536×1872 사양을 만족함.

**의존성**: 없음 (Phase A와 병행 가능).

**비고**: 디자인 작업은 비-코드 작업이라 별도 디자이너/툴이 필요할 수 있다.
디자이너 핸드오프용 가이드 문서는 이 Phase의 첫 작업으로 작성.

---

### Phase C — Codex 호스트 기반 (자산 없이 stub 동작)

**목적**: 합성 자산이 아직 없어도 Codex pet 등록 흐름을 검증한다.

**작업**:
- `src/hosts/codex/` 디렉토리 생성.
- `pet.json` 생성 로직 (animations 매니페스트 포함, 빈 시트라도 동작).
- `~/.codex/pets/<id>/` 디렉토리 배치 로직.
- 단일 색상으로 채운 임시 1536×1872 webp를 stub 자산으로 출력.
- `claude-buddy setup --target codex` CLI 옵션 추가 (Phase E에서 본격 통합 전 임시).

**완료 조건**: Codex 실행 후 `/pet`에서 `codex-buddy-<species>`가 목록에 나타나고
선택 시 stub 이미지가 표시됨.

**의존성**: Phase A 완료 (호스트 디렉토리 구조).

---

### Phase D — sharp 합성 파이프라인

**목적**: Base + Overlay + Anchor를 사용자별 시트로 합성한다.

**작업**:
- `sharp` 의존성 추가 (`dependencies`, `optionalDependencies` 중 결정 필요).
- `src/renderers/sprite/compose.ts`: companion + 자산을 입력 받아 WebP buffer 출력.
- `src/hosts/codex/setup.ts`가 compose 결과를 `spritesheet.webp`로 저장하도록 연결.
- 캐릭터별 anchor 누락/잘못된 좌표에 대한 에러 처리.

**완료 조건**: 임의 species + hat 조합으로 합성한 시트가 Codex에서 자연스럽게
표시됨(hat이 frame을 따라 움직임).

**의존성**: Phase B (자산 존재), Phase C (Codex 호스트 stub).

---

### Phase E — CLI 통합 + 마이그레이션

**목적**: 사용자 경험 일원화.

**작업**:
- `claude-buddy setup --target claude-code|codex|both` 옵션 정리.
- `both`가 기본값인지 명시적 선택을 요구할지 결정.
- 기존 사용자의 `setup` 명령이 자연스럽게 양쪽 모두 안내하도록 마이그레이션 로직.
- `claude-buddy uninstall --target codex` 추가 (대칭 보장).
- README에 Codex 사용법 섹션 추가.

**완료 조건**: 신규 사용자가 `claude-buddy setup`만 실행해도 자기 환경(Claude Code,
Codex, 또는 양쪽)에 맞게 적절히 안내받음.

**의존성**: Phase D 완료.

---

### Phase F — 호환성 검증 + 사용자 문서

**목적**: Codex pet의 그래픽 프로토콜 의존성(Kitty/Sixel)으로 인한 환경별 차이를 문서화.

**작업**:
- 호환성 매트릭스 작성 (터미널 × OS × Codex 표시 가능 여부).
- 대표 환경(macOS Terminal.app, iTerm2, Kitty, Alacritty, WezTerm, tmux 안/밖)에서 수동 검증.
- 표시 안 되는 환경에 대한 fallback 안내(예: "Claude Code statusline에서는 정상 표시됩니다").

**완료 조건**: 사용자가 자기 환경에서 Codex pet이 표시될지 사전에 알 수 있음.

**의존성**: Phase E 완료.

---

## 7. 위험 요소 / 미해결 사항

후속 에이전트가 인지해야 할 불확실성.

- **Codex pet은 비공식/실험 기능**: 공식 문서(README, docs/) 언급 0건. 시트 파일명에
  이미 `-v4` 접미사가 박혀있어 향후 스키마 변경으로 깨질 가능성이 있다.
  → 합성 코드는 PetFile 스키마 변경에 비교적 쉽게 적응할 수 있는 구조로 유지.
- **`sharp` 의존성**: native binary를 포함하므로 `npm install` 부담이 늘어남.
  optional dep으로 두고 Codex 사용자만 설치하는 옵션 검토 필요.
- **터미널 호환성**: Kitty graphics / Sixel 모두 미지원 환경(macOS Terminal.app 기본 등)에서는
  Codex가 pet을 렌더하지 못함. 이는 claude-buddy 책임 밖이지만 사용자 안내 필요.
- **자산 패키지 크기**: 옵션 Y로 ~5MB 추정이지만 실제 자산 디자인 후 재측정 필요. 만약
  ≥20MB가 되면 별도 패키지(`@claude-buddy/sprites`) 분리 재검토.
- **하나의 사용자, 여러 species**: 현재 claude-buddy는 사용자당 1 buddy. Codex pet도 1슬롯.
  사용자가 새 buddy를 굴리면 기존 Codex pet 자산을 덮어쓰거나 정리하는 정책 필요.

---

## 8. 참조

### 외부 코드

- Codex pet 모델: `github.com/openai/codex/blob/main/codex-rs/tui/src/pets/model.rs`
  (특히 L108-141, L385-431)
- 빌트인 catalog: `codex-rs/tui/src/pets/catalog.rs`
- 슬래시 커맨드 정의: `codex-rs/tui/src/slash_command.rs:51-52`
- 빌트인 자산 CDN: `https://persistent.oaistatic.com/codex/pets/v1/<id>-spritesheet-v4.webp`
- 로컬 캐시(개발 참고): `~/.codex/cache/tui-pets/v1/assets/`

### claude-buddy 내부

- ASCII 자산 정의: `src/shared/render.ts:8-117`
- 타입 정의(Species/Eye/Hat/Rarity): `src/shared/types.ts`
- 현 setup 로직: `src/cli/setup.ts`
- 현 statusline 렌더러: `src/statusline/statusline.ts`

### 관련 GitHub 이슈 (참고용)

- Claude Code inline image protocol 요청 — Issue #2266 (closed, 미구현).
- Codex pet 관련 이슈: openai/codex #20730, #20828, #20863, #22534, #23272.
