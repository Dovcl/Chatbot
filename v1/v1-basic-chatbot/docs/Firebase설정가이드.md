# Firebase 설정 가이드

Firebase를 사용하기 위한 상세한 설정 가이드입니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: "excel-chatbot")
4. Google Analytics 설정 (선택 사항)
5. 프로젝트 생성 완료

## 2. 웹 앱 등록

1. Firebase Console에서 생성한 프로젝트 선택
2. 왼쪽 메뉴에서 ⚙️ (설정) > "프로젝트 설정" 클릭
3. 아래로 스크롤하여 "내 앱" 섹션에서 `</>` (웹) 아이콘 클릭
4. 앱 닉네임 입력 (예: "Excel Chatbot Web")
5. "Firebase Hosting 설정"은 체크하지 않아도 됩니다
6. "앱 등록" 클릭

## 3. Firebase 설정값 복사

앱 등록 후 나타나는 설정값을 복사합니다:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## 4. firebase-config.js 파일 수정

프로젝트의 `firebase-config.js` 파일을 열고 위에서 복사한 값들을 입력:

```javascript
window.firebaseConfig = {
    apiKey: "여기에_API_KEY_입력",
    authDomain: "여기에_AUTH_DOMAIN_입력",
    projectId: "여기에_PROJECT_ID_입력",
    storageBucket: "여기에_STORAGE_BUCKET_입력",
    messagingSenderId: "여기에_MESSAGING_SENDER_ID_입력",
    appId: "여기에_APP_ID_입력"
};
```

## 5. Firestore Database 활성화

1. Firebase Console 왼쪽 메뉴에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. **중요**: "프로덕션 모드" 또는 "테스트 모드" 선택
   - 테스트 모드: 개발 중에는 테스트 모드로 시작 (30일 후 만료)
   - 프로덕션 모드: 보안 규칙을 직접 설정해야 함
4. 위치 선택 (가장 가까운 리전 선택, 예: "asia-northeast3 (Seoul)")
5. "사용 설정" 클릭

## 6. 보안 규칙 설정 (테스트 모드인 경우)

테스트 모드로 시작했다면 30일 후 만료되므로, 프로덕션 모드로 전환하거나 보안 규칙을 설정해야 합니다.

### 개발용 보안 규칙 (주의: 프로덕션에서는 사용하지 마세요)

1. Firestore Database > "규칙" 탭 클릭
2. 다음 규칙 입력:

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

3. "게시" 클릭

### 프로덕션용 보안 규칙 (권장)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /excelData/{document} {
      allow read, write: if request.auth != null;  // 인증된 사용자만
      // 또는 특정 조건 추가
    }
  }
}
```

## 7. 연결 확인

1. 브라우저에서 `localhost:8000` 접속
2. 브라우저 콘솔 (F12) 열기
3. "Firebase 초기화 완료" 메시지 확인
4. 파일 업로드 후 "Firebase에 데이터가 저장되었습니다" 메시지 확인

## 문제 해결

### "Firebase가 초기화되지 않았습니다" 오류

- `firebase-config.js` 파일의 설정값이 올바른지 확인
- 브라우저 콘솔에서 오류 메시지 확인
- 파일이 제대로 로드되었는지 확인 (Network 탭에서 확인)

### "Firebase 연결 타임아웃" 오류

- 인터넷 연결 확인
- Firestore Database가 활성화되어 있는지 확인
- 방화벽이나 프록시 설정 확인
- Firebase Console에서 프로젝트 상태 확인

### "권한 거부됨" 오류

- Firestore 보안 규칙 확인
- 테스트 모드가 만료되었는지 확인
- 프로덕션 모드인 경우 적절한 인증 설정 필요

### 데이터가 저장되지 않음

- Firestore Database가 활성화되어 있는지 확인
- 브라우저 콘솔에서 오류 메시지 확인
- Firebase Console > Firestore Database에서 데이터 확인

## 추가 리소스

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 시작하기](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)

