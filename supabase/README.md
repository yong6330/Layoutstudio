# DB Setup Draft

`schema.sql`은 Layoutstudio SPACE `v0.1.0-alpha`의 향후 DB 저장을 위한 초안입니다.

적용 전 확인:

- 이메일/비밀번호 인증을 우선 고려합니다.
- 프론트엔드에는 공개 가능한 클라이언트 키만 사용합니다.
- 서버 전용 비밀 키는 서버 환경에만 보관하고 정적 앱에는 넣지 않습니다.
- 도면 이미지를 원격 저장소에 저장한다면 private bucket과 owner 기준 접근 정책을 별도로 설정합니다.

현재 정적 앱은 LocalStorage 자동 저장과 JSON 가져오기/내보내기를 사용합니다.
