# Layoutstudio SPACE

ONESTUDIO 가구 배치 시뮬레이터입니다. 현재 버전은 `v0.1.0-alpha`로 고정되어 있으며, 별도 지시 전까지 새 버전명을 선언하지 않습니다.

## 서비스 소개

Layoutstudio는 도면 이미지를 단순 배경으로 깔지 않고, 사용자가 확인한 도면 기준 영역과 실제 mm 크기를 바탕으로 워크스페이스를 생성하는 정적 웹 앱입니다. 도면은 잠긴 reference floorplan layer로 표시되고, 가구와 실내 영역 데이터는 `xMm`, `yMm`, `widthMm`, `depthMm` 중심의 실측 좌표로 저장됩니다. 기존 JSON 호환을 위해 cm 필드도 함께 유지합니다.

## 실행 방법

로컬에서는 `index.html`을 브라우저로 열면 됩니다.

CDN으로 Fabric.js, Tesseract.js, Lucide 아이콘을 불러오므로 인터넷 연결이 필요합니다.

## GitHub Pages 배포

저장소 루트 또는 Pages 대상 브랜치에 아래 파일과 폴더를 포함합니다.

- `index.html`
- `styles/app.css`
- `src/app.js`
- `README.md`
- `docs/`
- `supabase/schema.sql`

## 현재 구현 기능

- 워크스페이스 생성 마법사
- 도면 이미지 업로드, 워크스페이스명, 도면명 입력
- OCR 치수 후보 표시와 수동 실측 크기 입력
- 도면 기준 영역 마우스 드래그/핸들 조정과 여백 수치 보정
- mm 기반 실측 좌표 저장과 500mm/1000mm 실측 그리드
- 참조 도면 레이어 표시/숨김과 opacity 조절
- 단일 도면 UI를 유지하되 향후 다중 Floorplan 확장을 위한 `workspace.floorplans` 구조
- 방/영역 사각형을 저장하는 `structureLayer.rooms` 최소 구현
- 줌/스크롤 팬 보기 상태와 실제 가구 mm 데이터 분리
- 기본 예시 가구 프리셋 선택/수정과 직접 가구 추가
- 보관함 가구 추가, 수정, 복제, 삭제와 기존 배치 항목 독립 유지
- 배치된 가구 개별 이름, 종류, 크기, 좌표, 회전, 색상, 메모, 잠금 수정
- 보관함 원본과 배치 가구의 연결 상태 표시 및 원본 연결 해제
- 우측 패널 중심 회전 조작과 키보드 단축키
- LocalStorage 자동 저장과 저장 상태 표시
- 최근 작업 LocalStorage 복구
- 워크스페이스 파일 가져오기와 JSON 내보내기
- 워크스페이스 목록/설정에서 삭제
- 로컬 이메일 계정 프로토타입과 사용자별 저장 영역 분리
- ONESTUDIO 시스템 푸터, `v0.1.0-alpha`, Copyright 2026 표시
- 앱 안에서 읽을 수 있는 이용 안내, 개인정보처리방침, 오픈소스 라이선스 안내
- 시간 기준 자동 테마 전환과 수동 테마 우선 적용

## 환경변수


## DB 설정 후보

DB를 도입할 경우 `supabase/schema.sql` 초안을 참고할 수 있습니다.

핵심 원칙:

- 모든 저장 테이블에 `owner_id`를 둡니다.
- 행 단위 보안 정책을 활성화합니다.
- 인증된 사용자는 본인 데이터만 관리할 수 있어야 합니다.
- 도면 이미지를 원격 저장소에 저장할 경우 비공개 버킷과 소유자 기준 접근 제한을 사용합니다.

## 알려진 한계

- 로컬 이메일 계정은 운영 인증이 아니라 사용자별 LocalStorage 분리 검증용입니다.
- OCR은 보조 추천값이며 도면 크기를 자동 확정하지 않습니다.
- 벽, 문, 창문 자동 벡터화와 실시간 협업은 포함하지 않습니다.
- 현재 UI는 하나의 기본 도면 중심이며, 다중 도면 관리는 데이터 구조만 준비되어 있습니다.
- 모바일 최적화는 기본 반응형 수준입니다.

## 향후 작업 후보

- 컴포넌트 구조 분리와 타입 안정성 강화
- 운영 인증, 데이터베이스, 도면 이미지 저장소 연결
- 기준선 기반 보정 UI 고도화
- 방/영역 구조 레이어 고도화
- 충돌 감지와 정렬 가이드 강화
- 도면 레이어 export preview

## Landing / Studio split

- `index.html`: public landing page for GitHub Pages entry.
- `studio.html`: Layoutstudio SPACE app workspace.
- `styles/landing.css`: landing page only styles.
- Existing app logic remains in `src/app.js` and `styles/app.css`.

For alpha deployment, set GitHub Pages to serve this project root. Users enter the landing page first, then move to Studio via `studio.html`.
