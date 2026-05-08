# Layoutstudio API Config

이 폴더는 결제, 후원, 외부 API 연결 정보를 앱 본문 코드와 분리해 관리하기 위한 공간입니다.

## Files

- `payment.example.json`
  - 공유 가능한 예시 파일
  - 실제 키 값 입력 금지

- `payment.local.json`
  - 로컬 개발용 실제 값 입력 파일
  - Git 커밋 금지

## Rule

- Client Secret, Secret Key, Dev Secret Key는 `index.html`, `studio.html`, `src/app.js`에 직접 넣지 않습니다.
- GitHub Pages 정적 배포에서는 민감 키를 프론트 코드에 포함하지 않습니다.
- 알파 버전에서는 버튼 자리만 유지하고, 실제 결제 API 연결은 베타 단계에서 서버/Edge Function을 통해 처리합니다.
