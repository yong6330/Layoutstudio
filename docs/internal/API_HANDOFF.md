# API Handoff

## KakaoPay

현재 알파 버전에서는 후원 버튼 UI와 안전한 공개 설정 로딩만 유지합니다.

정적 프론트엔드에서 Secret Key를 직접 사용할 수 없으므로, 실제 결제 준비 API 호출은 추후 서버 또는 Edge Function을 통해 진행합니다.

이번 마감 패치에서 `index.html`은 `payment.example.json`의 공개 가능한 `sendMoneyLink` 또는 `readyEndpoint`만 읽도록 시도합니다. `payment.local.json`은 브라우저 코드에서 직접 읽지 않습니다.

## Local Config Path

- `config/api/payment.local.json`

## Public Example Path

- `config/api/payment.example.json`

## Frontend Rule

- 프론트엔드 파일에 secret 계열 값 직접 입력 금지
- local config 파일은 커밋 금지
- 공개 링크 또는 서버 프록시 endpoint만 랜딩 페이지에서 사용할 것
