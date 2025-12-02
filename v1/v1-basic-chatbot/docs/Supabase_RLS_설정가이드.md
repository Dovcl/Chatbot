# Supabase RLS (Row Level Security) 설정 가이드

## 🔴 현재 오류
```
new row violates row-level security policy for table "excel_data"
401 (Unauthorized)
```

이 오류는 Supabase의 Row Level Security (RLS) 정책 때문에 발생합니다.

## ✅ 해결 방법

### 방법 1: RLS 비활성화 (개발 중 - 간단함)

1. [Supabase Console](https://supabase.com/) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Table Editor** 클릭
4. `excel_data` 테이블 클릭
5. 테이블 이름 옆 **"..."** (점 3개) 메뉴 클릭
6. **"Edit Table"** 선택
7. **"Enable Row Level Security"** 체크박스 **해제**
8. **"Save"** 클릭

### 방법 2: RLS 정책 설정 (프로덕션 - 권장)

RLS를 유지하면서 접근을 허용하려면:

1. Supabase Console > **Authentication** > **Policies** 클릭
2. 또는 **Table Editor** > `excel_data` 테이블 > **"Policies"** 탭 클릭
3. **"New Policy"** 클릭
4. 정책 설정:
   - **Policy name**: `Allow all operations`
   - **Allowed operation**: `ALL` (또는 `INSERT, SELECT, UPDATE, DELETE`)
   - **Policy definition**: 
     ```sql
     true
     ```
   - 또는 더 안전하게:
     ```sql
     auth.role() = 'anon'
     ```
5. **"Review"** 클릭
6. **"Save policy"** 클릭

### 방법 3: SQL로 직접 설정 (가장 빠름)

1. Supabase Console > **SQL Editor** 클릭
2. 다음 SQL 실행:

```sql
-- RLS 비활성화 (개발 중)
ALTER TABLE excel_data DISABLE ROW LEVEL SECURITY;

-- 또는 RLS 정책 추가 (RLS 유지하면서 접근 허용)
CREATE POLICY "Allow all operations on excel_data"
ON excel_data
FOR ALL
USING (true)
WITH CHECK (true);
```

3. **"Run"** 클릭

## 🎯 추천 방법

**개발 중**: 방법 1 (RLS 비활성화) - 가장 간단
**프로덕션**: 방법 2 또는 3 (RLS 정책 설정) - 더 안전

## 확인

설정 후 브라우저에서:
1. 페이지 새로고침
2. 파일 다시 업로드
3. "✅ Supabase에 데이터가 저장되었습니다" 메시지 확인

