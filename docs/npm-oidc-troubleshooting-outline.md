# 블로그 개요: npm OIDC Trusted Publishing 트러블슈팅

> GitHub Actions + Release UI 기반 자동 배포 구성 과정에서 만난 3가지 문제와 해결

---

## 1. 배경 및 목표

- **목표**: `NPM_TOKEN` 없이 GitHub Release UI 클릭만으로 npm 자동 배포
- **방식**: npm OIDC Trusted Publishing (OpenID Connect)
- **기존 방식과 차이**

  | 항목 | 기존 (NPM_TOKEN) | OIDC Trusted Publishing |
  |---|---|---|
  | 인증 수단 | 장기 토큰 (수동 발급/관리) | 단기 OIDC 토큰 (자동 발급) |
  | 토큰 노출 위험 | 있음 | 없음 |
  | npmjs.com 설정 | 불필요 | Trusted Publisher 등록 필요 |
  | 필요 npm 버전 | 제한 없음 | **11.5.1 이상** |

---

## 2. 사전 설정 (npmjs.com)

- 패키지 Settings → Trusted Publishers → GitHub Actions 등록
- 필수 입력: Organization/User, Repository, **Workflow 파일명** (`.yml` 포함)
- 이벤트 필터 없으면 `push`, `release` 이벤트 모두 허용
- 등록 후 저장 시 유효성 검증 없음 → 오류는 배포 시점에만 발견됨

---

## 3. 문제 1 — 트리거 중복으로 이중 배포 시도

**현상**
- `push: tags`와 `release: published`를 둘 다 설정
- GitHub UI에서 Release 생성 시 workflow가 2회 실행됨
- 두 번째 실행에서 `"version already exists"` 오류

**원인**
- GitHub UI에서 새 태그와 함께 Release를 Publish하면 `push` 이벤트와 `release` 이벤트가 **동시에** 발생

**해결**
- `release: published` 단일 트리거로 변경
- CLI 배포도 `gh release create` 명령으로 동일하게 지원 가능

```yaml
on:
  release:
    types: [published]
```

---

## 4. 문제 2 — ENEEDAUTH (인증 자체 불가)

**현상**
```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in
```

**원인**
- OIDC Trusted Publishing은 **npm 11.5.1 이상** 필요
- Node 22는 npm 10.x를 기본 탑재 → OIDC 토큰 교환 기능 자체 없음
- 기존 workflow에 npm 업그레이드 스텝이 있었으나 publish.yml에는 누락

**해결**
- Node 24로 버전 업그레이드 (npm 11.x 기본 탑재)
- 별도 npm 업그레이드 스텝 불필요

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: "24"   # npm 11 내장
```

---

## 5. 문제 3 — E404 Not Found (registry-url 충돌)

**현상**
```
npm notice Signed provenance statement ...  ← OIDC 서명 성공 (sigstore)
npm error 404 Not Found - PUT https://registry.npmjs.org/...  ← 실제 publish 실패
```

**원인 분석**
- `setup-node`에 `registry-url` 설정 시 `.npmrc` 자동 생성
  ```
  //registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}
  ```
- `NODE_AUTH_TOKEN`이 설정되지 않으면 **빈 토큰**으로 인증 시도
- `.npmrc`에 auth 설정이 존재하면 npm이 OIDC 자동 감지를 **건너뜀**
- provenance 서명은 별도 sigstore OIDC 토큰을 사용해 성공, 실제 registry PUT은 빈 토큰으로 실패

**오해 포인트**
- 공식 문서 예시에 `registry-url`이 포함된 경우가 있음
- 해당 예시는 `NODE_AUTH_TOKEN`과 함께 쓰는 **토큰 방식** 예시
- OIDC 방식에서 `registry-url` 단독 사용은 오히려 방해

**해결**
- `registry-url` 제거 → npm이 GitHub Actions 환경변수(`ACTIONS_ID_TOKEN_REQUEST_URL`)를 자동 감지해 OIDC 인증 수행

---

## 6. 최종 publish.yml

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest

    permissions:
      id-token: write   # OIDC 토큰 발급 필수
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "24"          # npm 11 내장
          package-manager-cache: false

      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
      # --provenance 불필요: trusted publishing 시 자동 적용
```

---

## 7. OIDC 인증 흐름 (핵심 개념)

```
GitHub Actions 실행
  │
  ├─ id-token: write 권한 → ACTIONS_ID_TOKEN_REQUEST_URL 환경변수 주입
  │
  └─ npm publish 실행
       │
       ├─ npm 11이 환경변수 감지 → GitHub OIDC 엔드포인트에 토큰 요청
       │
       ├─ GitHub → npm registry로 OIDC 토큰 전달
       │
       ├─ npm registry → Trusted Publisher 설정과 대조 검증
       │    (repository, workflow 파일명 일치 확인)
       │
       └─ 검증 성공 → 단기 publish 토큰 발급 → 배포 진행
```

**registry-url이 있을 때의 문제**
```
npm publish 실행
  │
  ├─ .npmrc 확인 → _authToken 항목 발견
  │
  ├─ OIDC 감지 건너뜀 (이미 auth 설정 있다고 판단)
  │
  └─ 빈 토큰으로 PUT 요청 → 404
```

---

## 8. 배포 프로세스 (최종)

```
1. package.json 버전 bump (npm version patch)
2. git push origin main
3. GitHub Releases → Draft a new release
4. 신규 태그 입력 (v0.x.x), Target: main
5. Generate release notes → Publish release
6. GitHub Actions publish.yml 자동 실행 → npm 배포 완료
```

---

## 9. 기타 수정 사항

- `package.json` `repository.url`: `https://...` → `git+https://....git`
  - npm이 OIDC 검증 시 내부적으로 정규화된 형식과 비교
  - 불일치 시 경고 발생 (`npm warn publish "repository.url" was normalized`)
- `engines.node`: `>=18.0.0` → `>=22.14.0` (trusted publishing 최소 요구사항 반영)

---

## 10. 핵심 교훈 요약

| 상황 | 원인 | 해결 |
|---|---|---|
| workflow 2회 실행 | push + release 이벤트 중복 | `release: published` 단일 트리거 |
| ENEEDAUTH | npm 버전 부족 (10.x) | Node 24로 업그레이드 (npm 11 내장) |
| E404 (provenance는 성공) | `registry-url`이 `.npmrc` 생성해 OIDC 차단 | `registry-url` 제거 |
