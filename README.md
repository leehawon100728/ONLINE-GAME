# 미니게임 방

친구와 방 코드를 공유해서 같은 방에 입장하고, 방장이 미니게임을 선택해 함께 즐기는 사이트입니다. 게임은 1vs1 / 1vs다수로 분류되며, 지금은 1vs1 카테고리에 오목(五目) 하나만 구현되어 있습니다. 방장이 한 수 제한시간과 몇판 몇승제를 설정한 뒤 게임을 시작할 수 있습니다.

백엔드는 자체 서버 없이 **Firebase**(Realtime Database + 익명 인증)로 동작합니다. 로그인/회원가입은 없고, 방 코드로 입장하는 임시 세션 방식입니다.

## 구조
- `client/` — React + Vite 프론트엔드, Firebase Realtime Database로 실시간 동기화
- `database.rules.json` — Realtime Database 보안 규칙
- `firebase.json`, `.firebaserc` — Firebase 프로젝트/에뮬레이터 설정

## 게임 로직 신뢰 모델
승리 판정과 시간초과 처리는 **클라이언트가 계산해서 Realtime Database에 기록**하고, 보안 규칙은 "누가 쓸 수 있는지"(방장만/현재 방 참가자만 등)까지만 최대한 검증합니다. Cloud Functions 같은 서버 권위 로직은 쓰지 않습니다(무료 Spark 플랜으로 충분하게 하기 위한 선택). 친구끼리 캐주얼하게 즐기는 용도로는 충분하지만, 참가자 본인이 마음먹고 결과를 조작하는 것까지는 막지 못한다는 점은 감안해주세요.

## 로컬 개발 (Firebase 에뮬레이터)
실제 Firebase 프로젝트 없이도 로컬 에뮬레이터로 전체 기능을 테스트할 수 있습니다.

```bash
# 터미널 1: Firebase 에뮬레이터 (Auth + Realtime Database, 저장소 루트에서 실행)
npx firebase-tools emulators:start
```

```bash
# 터미널 2: 클라이언트
cd client
npm install
npm run dev
```

`client/.env`는 이미 에뮬레이터용 값(`VITE_USE_EMULATOR=true`)으로 채워져 있습니다. 브라우저에서 클라이언트 주소(예: http://localhost:5173)를 열어 사용하세요. 에뮬레이터 UI는 http://localhost:4000 에서 Realtime Database 데이터를 직접 확인할 수 있습니다.

## 실제 Firebase 프로젝트에 연결하기
1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트를 만듭니다.
2. 빌드 메뉴에서 **Realtime Database**를 생성합니다(위치는 아무 곳이나 선택 가능, 테스트 모드로 시작해도 되고 바로 규칙을 배포해도 됩니다).
3. **Authentication > Sign-in method**에서 **익명(Anonymous)** 로그인을 사용 설정합니다.
4. 프로젝트 설정 > 일반 > "내 앱"에서 웹 앱을 추가하고 나오는 config 값을 복사합니다.
5. `client/.env`에 그 값을 채우고 `VITE_USE_EMULATOR=false`로 바꿉니다.
6. 저장소 루트에서 `npx firebase-tools deploy --only database --project <프로젝트ID>`로 보안 규칙을 배포합니다.

## 게임 규칙 (오목)
- 15x15 판, 자유오목 규칙(금수 없음). 가로/세로/대각선으로 5개 이상 이으면 승리.
- 방장이 한 수 제한시간(10/15/30/60초 또는 무제한)과 경기 방식(단판/3판2선승/5판3선승/7판4선승)을 설정합니다.
- 제한시간 안에 착수하지 않으면 해당 판을 시간초과로 패배합니다.
- 매 라운드마다 선공(흑)이 교대되며, 목표 승수에 먼저 도달한 플레이어가 매치에서 승리합니다.
- 세 번째 참가자부터는 관전자로 입장합니다.

## 테스트
오목 승리 판정 + 라운드/매치 진행 로직은 Firebase 없이도 순수 함수로 테스트할 수 있습니다:
```bash
cd client
node --test src/games/gomoku/engine.test.js src/games/gomoku/session.test.js
```

## 참고 / 알려진 한계
- 로그인 없이 Firebase 익명 인증으로 신원을 식별합니다. 같은 브라우저에서 새로고침하면 자동으로 같은 자리로 복귀합니다.
- 대전 중 활성 참가자가 방을 완전히 나가면 해당 대국은 종료되고 로비로 돌아갑니다.
- 한 수 제한시간을 "무제한"으로 설정한 상태에서 상대가 접속을 끊으면 자동으로 불계패 처리되지 않습니다(서버 없이 클라이언트가 판정하는 구조의 한계).
- 방장이 나가거나 연결이 끊기면 남은 참가자 중 한 명이 자동으로 새 방장이 됩니다.
