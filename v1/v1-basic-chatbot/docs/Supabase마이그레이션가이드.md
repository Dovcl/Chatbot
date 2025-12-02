# Supabase로 마이그레이션 가이드

Supabase는 PostgreSQL 기반이지만 Firebase처럼 사용할 수 있는 서비스입니다.

## Supabase 장점

✅ **PostgreSQL의 강력함** + **Firebase의 편리함**
- 무료 티어: 500MB 저장, 무제한 API 요청
- 실시간 기능
- 클라이언트에서 직접 접근 가능
- 할당량 제한이 훨씬 넉넉함

## 마이그레이션 단계

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com/) 접속
2. "Start your project" 클릭
3. GitHub로 로그인
4. "New Project" 클릭
5. 프로젝트 정보 입력:
   - Name: excel-chatbot
   - Database Password: 강력한 비밀번호 설정 (저장해두세요!)
   - Region: Northeast Asia (Seoul) 선택
6. "Create new project" 클릭 (약 2분 소요)

### 2. API 키 확인

1. 프로젝트 대시보드에서 왼쪽 메뉴 "Settings" > "API" 클릭
2. 다음 정보 복사:
   - Project URL
   - anon public key

### 3. 테이블 생성

1. 왼쪽 메뉴 "Table Editor" 클릭
2. "Create a new table" 클릭
3. 테이블 이름: `excel_data`
4. 컬럼 추가:
   - `id` (bigint, Primary Key, Auto-increment)
   - `row_data` (jsonb) - 엑셀 행 데이터 저장
   - `uploaded_at` (timestamp, default: now())
   - `row_index` (integer)
5. "Save" 클릭

### 4. 코드 수정

Firebase 코드를 Supabase로 변경하면 됩니다. (제가 도와드릴 수 있습니다!)

## 비용 비교

### Firebase (Spark 플랜)
- 저장: 1GB
- 읽기: 50,000/일
- 쓰기: 20,000/일
- **할당량 초과 시 사용 불가**

### Supabase (Free 플랜)
- 저장: 500MB
- 읽기: **무제한**
- 쓰기: **무제한**
- 대역폭: 5GB/월
- **할당량 초과 시 속도 제한만 (사용 가능)**

## 추천

**Supabase를 강력히 추천합니다!**
- 할당량 문제 해결
- PostgreSQL의 강력함
- Firebase와 유사한 사용법
- 무료 티어가 더 넉넉함

