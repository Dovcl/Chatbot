# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com/) 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인 (또는 이메일로 가입)
4. "New Project" 클릭
5. 프로젝트 정보 입력:
   - **Name**: `excel-chatbot` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (⚠️ 반드시 저장해두세요!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (가장 가까운 지역)
   - **Pricing Plan**: Free 선택
6. "Create new project" 클릭
   - 약 2분 정도 소요됩니다

## 2. API 키 확인

1. 프로젝트가 생성되면 대시보드로 이동
2. 왼쪽 메뉴에서 **Settings** (⚙️) 클릭
3. **API** 메뉴 클릭
4. 다음 정보를 복사 (나중에 필요합니다):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. 테이블 생성

1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. **Create a new table** 클릭
3. 테이블 설정:
   - **Name**: `excel_data`
   - **Description**: (선택사항) "엑셀 데이터 저장"
4. **Columns** 섹션에서 컬럼 추가:
   - `id` (bigint, Primary Key, Is Identity: true)
   - `row_data` (jsonb) - 엑셀 행 데이터를 JSON으로 저장
   - `uploaded_at` (timestamp, Default: now())
   - `row_index` (integer)
   - `filename` (text) - 업로드한 파일명
5. **Save** 클릭

## 4. Row Level Security (RLS) 설정

1. 테이블 생성 후, 테이블 이름 옆 **...** 메뉴 클릭
2. **Edit Table** 선택
3. **Enable Row Level Security** 체크 해제 (개발 중)
   - 또는 보안 규칙 설정 (프로덕션에서는 필수)

## 5. 코드 설정

`supabase-config.js` 파일에 API 키 입력 (다음 단계에서 생성됩니다)

## 완료!

이제 Supabase가 준비되었습니다. 코드를 업데이트하면 바로 사용할 수 있습니다.

