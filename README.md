# Layoutstudio SPACE

**Layoutstudio SPACE**는 ONE STUDIO의 공간 배치 시뮬레이터입니다.  
도면 이미지를 실측 기준으로 보정하고, 실제 가구 크기를 반영해 공간 배치를 검토할 수 있도록 제작되었습니다.

현재 공개 버전은 **v0.1.0-alpha**입니다.

---

## 1. Project Overview

Layoutstudio는 집, 방, 사무실처럼 실제 크기가 중요한 공간을 디지털 워크스페이스로 옮기기 위한 웹 애플리케이션입니다.

사용자는 도면 이미지를 업로드하고, 기준 영역과 실제 크기를 맞춘 뒤, 가구 보관함에 등록한 가구를 도면 위에 배치해 볼 수 있습니다. 단순히 이미지를 배경으로 두는 것이 아니라, 실제 치수와 연결된 작업 공간을 만들어 가구 배치와 동선을 실험하는 것을 목표로 합니다.

현재 버전은 최초 공개 알파 버전입니다. 서버 없이 브라우저에서 실행되는 정적 웹앱이며, LocalStorage와 JSON 파일을 중심으로 동작합니다.

---

## 2. Why Layoutstudio?

가구 배치는 단순히 “어디에 놓을까”의 문제가 아닙니다.

실제 공간에서는 다음 요소를 함께 고려해야 합니다.

- 방의 실제 크기
- 가구의 가로, 세로, 높이
- 문과 벽, 창문, 동선
- 수납장과 책상, 침대 등 주요 가구 간 간격
- 배치 후 생활 동선
- 추후 이사, 재배치, 구매 전 검토

Layoutstudio는 이러한 고민을 줄이기 위해 시작한 프로젝트입니다.  
도면을 보고 머릿속으로만 상상하는 대신, 실제 크기에 가까운 워크스페이스에서 가구를 직접 배치해 보며 공간 구성을 검토할 수 있도록 합니다.

---

## 3. Live Demo

GitHub Pages 배포 후 아래 주소에서 확인할 수 있습니다.

https://yong6330.github.io/Layoutstudio/

---

## 4. Current Version

**v0.1.0-alpha**

이 버전은 기능 검증용 공개 알파입니다.  
실제 서비스 운영보다는 핵심 사용 흐름, UI/UX, 데이터 구조, 배치 경험을 검증하는 데 초점을 둡니다.

---

## 5. Implemented Features

### 5.1 Landing Page

- Layoutstudio 소개 랜딩 페이지
- SPACE Engine 브랜딩
- 기능 소개 섹션
- 워크스페이스 구조 설명
- 이용 방법 애니메이션
- 다음 단계 안내
- ONE STUDIO 개발자 정보
- Contact, Support, Join Us 섹션
- 개인정보처리방침, 이용 안내, 오픈소스 라이선스, 제작자 정보 모달

### 5.2 Studio App

- Studio 진입 화면
- 워크스페이스 목록
- 새 워크스페이스 생성
- 기존 JSON 파일 가져오기
- 최근 작업 복구
- 로컬 기반 작업 상태 관리

### 5.3 Workspace Wizard

- 도면 이미지 업로드
- 워크스페이스명 입력
- 도면명 입력
- 실제 공간 크기 입력
- 도면 기준 영역 설정
- 가구 보관함 초기 구성
- 기본 가구 프리셋 선택
- 직접 가구 추가

### 5.4 Floorplan / Workspace

- 도면 이미지를 참조 레이어로 표시
- 도면 기준 영역과 실제 크기 매핑
- mm 기반 실측 좌표계
- 실측 그리드 표시
- 줌/팬 보기 상태와 실제 좌표값 분리
- 참조 도면 표시/숨김
- 참조 도면 투명도 조정
- 향후 다중 도면 확장을 위한 `workspace.floorplans` 구조

### 5.5 Furniture

- 가구 보관함 관리
- 가구 직접 추가
- 가구 수정
- 가구 복제
- 가구 삭제
- 도면 위 가구 배치
- 배치된 가구 개별 수정
- 위치, 크기, 회전, 색상, 메모 관리
- 보관함 원본과 배치 가구의 연결 상태 관리

### 5.6 Storage

- LocalStorage 기반 자동 저장
- JSON 내보내기
- JSON 가져오기
- 브라우저 새로고침 후 작업 복구
- 워크스페이스 삭제

---

## 6. How It Works

Layoutstudio의 기본 흐름은 다음과 같습니다.

1. 도면 이미지를 업로드합니다.
2. 워크스페이스명과 도면명을 입력합니다.
3. 실제 공간 크기와 도면 기준 영역을 맞춥니다.
4. 가구 보관함에 사용할 가구를 추가합니다.
5. 도면 위에 가구를 배치하고 위치, 크기, 회전을 조정합니다.
6. 작업 결과를 브라우저에 저장하거나 JSON 파일로 내보냅니다.

현재 버전에서는 모든 작업이 브라우저 중심으로 이루어집니다.  
서버 DB에 저장되지 않으므로 중요한 작업은 JSON 파일로 별도 백업하는 것을 권장합니다.

---

## 7. Storage Notice

현재 **v0.1.0-alpha**는 운영 DB에 연결되어 있지 않습니다.

작업 데이터는 사용자의 브라우저 LocalStorage에 저장될 수 있습니다. 브라우저 캐시 또는 사이트 데이터를 삭제하면 LocalStorage에 저장된 워크스페이스도 함께 삭제될 수 있습니다.

중요한 작업은 반드시 JSON 파일로 별도 백업해 주세요.

---

## 8. Current Limitations

현재 알파 버전에는 다음 한계가 있습니다.

- 실제 회원가입/로그인 기능 없음
- 운영 DB 저장 기능 없음
- 실시간 공동 작업 기능 없음
- 도면 구조 자동 인식 미완성
- 벽, 문, 창문 자동 벡터화 미지원
- 주소 기반 도면 자동 수집 미지원
- 실제 판매 가구 카탈로그 연동 미지원
- 3D 공간 프리뷰 미지원
- 모바일 최적화는 기본 반응형 수준
- LocalStorage 기반 저장으로 인한 데이터 유실 가능성
- GitHub Pages 정적 배포 구조이므로 서버 기반 기능은 별도 백엔드가 필요함

---

## 9. Planned Development

### v0.2.0-beta

- React + Vite + TypeScript 기반 구조 전환 검토
- Supabase Auth 기반 회원가입/로그인
- 사용자별 워크스페이스 저장
- Supabase DB 저장/불러오기
- RLS 기반 데이터 보안 정책
- 작업 내역과 복구 지점
- 기본 사용자 초대 구조 설계

### v0.3.0-beta

- 워크스페이스 사용자 초대
- 역할 기반 권한 관리
- 공동 작업 UX
- 활동 로그
- Snapshot 기반 복구
- 여러 사용자 간 작업 이력 확인

### Future

- 도면 구조 인식
- 도면 벡터화 보조
- 주소 기반 도면 참조 기능 검토
- 실제 판매 가구 카탈로그 연동
- 3D 공간 프리뷰
- 모바일 공간 스캔 기반 배치 보조

---

## 10. Project Structure

    Layoutstudio/
      .gitignore
      .nojekyll
      README.md

      index.html
      studio.html

      assets/
        IMG_8847.png

      docs/
        CREATOR_INFO.md
        OPEN_SOURCE_NOTICES.md
        PRIVACY_POLICY.md
        USER_GUIDE.md
        THIRD_PARTY_NOTICES.md

      config/
        api/
          README.md

      src/
        app.js

      styles/
        landing.css
        app.css

      supabase/
        README.md
        schema.sql

---

## 11. Tech Stack

현재 알파 버전은 정적 웹앱 구조로 제작되었습니다.

- HTML
- CSS
- JavaScript
- Fabric.js
- Tesseract.js
- Lucide
- LocalStorage
- JSON export/import
- GitHub Pages

향후 베타 버전에서는 React, TypeScript, Supabase 기반 구조 전환을 검토합니다.

---

## 12. Documents

프로젝트 문서는 `docs/` 폴더에서 확인할 수 있습니다.

- `docs/USER_GUIDE.md`
- `docs/PRIVACY_POLICY.md`
- `docs/OPEN_SOURCE_NOTICES.md`
- `docs/CREATOR_INFO.md`
- `docs/THIRD_PARTY_NOTICES.md`

---

## 13. Creator

- Project: ONE STUDIO
- Planning & Production: 용석희 / YONG Seokhee
- Affiliation: YONSEI University MIRAE CAMPUS SW '24
- Contact: yong6330@onestudio.kr

Layoutstudio는 ONE STUDIO 패밀리 서비스로 기획된 개인 프로젝트입니다.  
개발 과정에는 OpenAI ChatGPT와 Codex를 보조 도구로 활용했습니다.

---

## 14. Open Source Notice

Layoutstudio는 여러 오픈소스 라이브러리와 프로젝트의 구조, 구현 패턴, 라이선스 정책을 참고해 제작되었습니다.

자세한 내용은 아래 문서를 확인해 주세요.

- `docs/OPEN_SOURCE_NOTICES.md`
- `docs/THIRD_PARTY_NOTICES.md`

---

## 15. Copyright

Copyright 2026 ONESTUDIO. All rights reserved.
