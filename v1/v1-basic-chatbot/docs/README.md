# 엑셀/CSV 데이터 챗봇

엑셀(.xlsx, .xls) 또는 CSV(.csv) 파일을 업로드하고 자연어로 데이터를 질문할 수 있는 웹 기반 챗봇입니다.

## 기능

- 📊 엑셀 파일(.xlsx, .xls) 및 CSV 파일(.csv) 업로드 및 파싱
- 💬 자연어 질문으로 데이터 조회
- 🔍 날짜, 컬럼명 기반 필터링
- ☁️ Firebase Firestore를 통한 데이터 저장 및 관리
- 🎨 현대적인 UI/UX

## 사용 예시

질문 예시:
- "Date 2024-01-01, 조사구간명 서울에서 PH를 말해줘"
- "2024-01-01 날짜의 데이터를 보여줘"
- "조사구간명 부산에서 모든 정보를 알려줘"

## 지원 파일 형식

- **엑셀**: `.xlsx`, `.xls`
- **CSV**: `.csv` (UTF-8 인코딩 권장, 한글 지원)

## 설정 방법

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 설정 > 일반 > 웹 앱 추가
4. `firebase-config.js` 파일을 열고 Firebase 설정값 입력:

```javascript
window.firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Firestore Database 설정

1. Firebase Console > Firestore Database
2. "데이터베이스 만들기" 클릭
3. 테스트 모드로 시작 (개발 중) 또는 프로덕션 모드 선택
4. 위치 선택 (가장 가까운 리전 선택)

### 3. 보안 규칙 (개발용)

개발 중에는 다음 규칙을 사용할 수 있습니다:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **주의**: 프로덕션 환경에서는 적절한 인증 및 권한 규칙을 설정하세요.

### 4. 로컬 서버 실행

파일을 직접 열거나 로컬 서버를 사용하세요:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# 또는 VS Code의 Live Server 확장 사용
```

브라우저에서 `http://localhost:8000` 접속

## 파일 구조

```
Chatbot/
├── index.html          # 메인 HTML 파일
├── style.css           # 스타일시트
├── script.js           # 메인 JavaScript 로직
├── firebase-config.js  # Firebase 설정 파일 (여기에 설정값 입력)
├── firebase-init.js    # Firebase 초기화 모듈
└── README.md           # 이 파일
```

## 주요 기능 설명

### 파일 파싱
- **엑셀 파일**: SheetJS (xlsx) 라이브러리를 사용하여 엑셀 파일을 읽습니다. 첫 번째 시트의 모든 데이터를 JSON으로 변환합니다.
- **CSV 파일**: 커스텀 CSV 파서를 사용하여 파일을 읽습니다. 따옴표로 감싸진 값, 쉼표가 포함된 값 등을 올바르게 처리합니다.

### 자연어 처리
- 날짜 패턴 인식 (2024-01-01, 2024/01/01 등)
- 컬럼명 자동 인식
- 필터링 조건 추출

### 데이터 저장
- 업로드된 데이터는 Firebase Firestore에 저장됩니다
- 각 행은 개별 문서로 저장됩니다

## CSV 파일 형식 요구사항

CSV 파일은 다음 형식을 따라야 합니다:
- 첫 번째 줄은 헤더(컬럼명)로 사용됩니다
- 쉼표(`,`)로 값이 구분됩니다
- 따옴표(`"`)로 감싸진 값은 쉼표를 포함할 수 있습니다
- UTF-8 인코딩을 권장합니다 (한글 지원)

예시:
```csv
Date,조사구간명,PH,온도
2024-01-01,서울,7.2,25.5
2024-01-02,부산,7.5,26.0
```

## 브라우저 호환성

- Chrome (권장)
- Firefox
- Safari
- Edge

## 문제 해결

### Firebase 연결 오류
- `firebase-config.js`의 설정값이 올바른지 확인
- Firestore Database가 활성화되어 있는지 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 파일 읽기 오류
- 파일 형식이 .xlsx, .xls, 또는 .csv인지 확인
- CSV 파일의 인코딩이 UTF-8인지 확인
- 파일이 손상되지 않았는지 확인
- 브라우저 콘솔에서 오류 메시지 확인

## 라이선스

이 프로젝트는 자유롭게 사용할 수 있습니다.
