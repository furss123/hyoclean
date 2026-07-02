# HyoClean (효클린)

CCleaner보다 강력하지만 더 안전한 Windows 정리 & 실시간 최적화 도구.
Tauri + React + TypeScript, Rust 백엔드로 구성된 HyoT 제품군의 일부입니다.

## 핵심 기능 (MVP)

- **딥 스캔**: 임시파일, 캐시, 중복파일, 고아 레지스트리 탐지
- **스마트 정리**: 신뢰등급(안전/주의/위험) 기반 추천 정리
- **실시간 메모리 정리**: 가용 메모리 임계치 감지 → 자동/수동 정리, 화이트리스트 보호
- **롤백 안전장치**: 정리 전 복원지점 + 1클릭 되돌리기
- **KO/EN 동시 지원**: 언어별 완전 로컬라이징 (설정에서 즉시 전환)
- **자동 업데이트 체크**: 새 버전 알림 → 릴리즈 노트 → 지금/나중에/건너뛰기

## 개발

```bash
npm install
npm run tauri dev    # 개발 서버 (Tauri 데스크톱 창)
npm run build         # 프론트엔드 빌드 (tsc + vite)
cargo build --manifest-path src-tauri/Cargo.toml   # Rust 백엔드만 빌드
```

## 프로젝트 구조

```
src/
  theme/          # HyoT 브랜드 CSS 토큰 (색상/라운드/폰트/모션)
  i18n/           # ko-KR / en-US 리소스
  context/        # ThemeContext (라이트/다크/자동, 글래스 투명도)
  components/
    layout/       # Sidebar, Footer, SettingsModal
    dashboard/    # Dashboard, MemoryCard (실시간 메모리 정리 UI)
src-tauri/
  src/lib.rs      # Tauri commands: get_memory_status, clean_memory_now
data/software/hyoclean/  # hyot.dev 게시용 meta.json / releases.json
```

## 브랜드 가이드

이 프로젝트는 `HyoT` 브랜드 가이드(색상, 타이포그래피, 레이아웃 DNA, 로컬라이징 규칙)를
따릅니다. 새 기능 추가 시 브랜드킷의 "Visual language" / "In-app boilerplate checklist"를
먼저 확인하세요.

---

`HyoClean (효클린) v0.1.0 | © 2026 HyoT. All rights reserved.`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

