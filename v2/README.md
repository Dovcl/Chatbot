# 환경 데이터 RAG 챗봇 v2

환경 데이터(수질, 녹조, 수문, 기상)를 분석하고 예측하는 능동적 RAG 챗봇 시스템

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [아키텍처 구조](#아키텍처-구조)
- [파일 구조](#파일-구조)
- [각 파일 상세 설명](#각-파일-상세-설명)
- [모듈 간 연결 관계](#모듈-간-연결-관계)
- [데이터 흐름](#데이터-흐름)
- [사용 방법](#사용-방법)
- [향후 개발 계획](#향후-개발-계획)

---

## 🎯 프로젝트 개요

### 주요 기능
- ✅ 환경 데이터 조회 (수질, 녹조, 수문, 기상)
- ✅ 능동적 답변 생성 (추가 정보 제안)
- ✅ 수질 등급 및 조류 경보 단계 자동 계산
- ✅ 시계열 차트 시각화
- ✅ 공간적 변화 지도 표시
- ✅ 예측 모델 통합 (다음주 예측)
- ✅ 사고 대응 메뉴얼 시스템
- ✅ 경고 시스템 (수질/녹조/홍수)

### 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: Supabase (PostgreSQL)
- **Visualization**: Chart.js, Leaflet
- **File Processing**: SheetJS (XLSX)

---

## 🏗️ 아키텍처 구조

```
┌─────────────────────────────────────────────────┐
│              Frontend (Browser)                 │
│  ┌──────────────────────────────────────────┐  │
│  │  index.html (UI)                          │  │
│  │  ├─ script.js (메인 로직)                 │  │
│  │  ├─ style.css (스타일)                    │  │
│  │  └─ config.js (설정)                      │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  API Layer                                │  │
│  │  └─ api/client.js (API 추상화)            │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Modules (기능 모듈)                      │  │
│  │  ├─ data-query.js (데이터 조회)          │  │
│  │  ├─ proactive.js (능동적 답변)           │  │
│  │  ├─ visualization.js (시각화)            │  │
│  │  ├─ alert.js (경고 시스템)                │  │
│  │  ├─ prediction.js (예측 모델)            │  │
│  │  └─ manual.js (메뉴얼 시스템)            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Supabase (PostgreSQL)                 │
│  └─ excel_data 테이블 (JSONB)                  │
└─────────────────────────────────────────────────┘
```

---

## 📁 파일 구조

```
v2/
├── index.html              # 메인 UI
├── style.css               # 스타일시트
├── config.js               # 설정 파일
├── script.js               # 메인 로직
├── supabase-config.js      # Supabase 설정
├── supabase-init.js        # Supabase 초기화
│
├── api/
│   └── client.js           # API 클라이언트 (백엔드 추상화)
│
└── modules/
    ├── data-query.js       # 데이터 조회 모듈
    ├── proactive.js        # 능동적 답변 생성
    ├── visualization.js    # 시각화 (차트, 지도)
    ├── alert.js            # 경고 시스템
    ├── prediction.js       # 예측 모델 통합
    └── manual.js           # 메뉴얼 시스템
```

---

## 📄 각 파일 상세 설명

### 1. `index.html` - 메인 UI

**역할**: 사용자 인터페이스 정의

**주요 구성 요소**:
- **헤더**: 제목, 파일 업로드 버튼, 데이터 삭제 버튼
- **챗봇 영역**: 메시지 표시, 입력창, 제안 버튼
- **시각화 영역**: 시계열 차트, 지도, 예측 결과 탭

**로드하는 스크립트 순서**:
1. 라이브러리 (XLSX, Chart.js, Leaflet)
2. 설정 파일 (config.js)
3. Supabase 설정 및 초기화
4. API 클라이언트
5. 각 모듈들
6. 메인 스크립트 (script.js)

**연결 관계**:
- `script.js`에서 DOM 요소 접근
- `modules/visualization.js`에서 차트/지도 컨테이너 사용
- `modules/proactive.js`에서 제안 버튼 렌더링

---

### 2. `style.css` - 스타일시트

**역할**: 전체 UI 스타일 정의

**주요 스타일**:
- 그라데이션 배경 및 컨테이너 레이아웃
- 챗봇 메시지 스타일 (사용자/봇 구분)
- 시각화 영역 탭 및 패널 스타일
- 제안 버튼 스타일
- 반응형 디자인

**연결 관계**:
- `index.html`의 클래스명과 연결
- JavaScript에서 동적으로 클래스 추가/제거

---

### 3. `config.js` - 설정 파일

**역할**: 전역 설정 및 기준값 정의

**주요 설정**:
- `USE_BACKEND_API`: 백엔드 API 사용 여부 (현재: false)
- `BACKEND_API_URL`: 백엔드 API URL (나중에 사용)
- `WATER_QUALITY_GRADES`: 수질 등급 기준 (I~V등급)
- `ALGAE_ALERT_LEVELS`: 조류 경보 단계 (정상/관심/주의/경보)
- `RELATED_METRICS`: 관련 지표 매핑

**연결 관계**:
- `modules/proactive.js`: 수질 등급 계산 시 사용
- `modules/alert.js`: 경고 판정 시 사용
- `modules/visualization.js`: 색상 결정 시 사용
- `api/client.js`: API URL 설정 시 사용

---

### 4. `script.js` - 메인 로직

**역할**: 전체 애플리케이션의 중앙 제어

**주요 기능**:
1. **초기화**
   - Supabase 연결 대기
   - 이벤트 리스너 설정
   - 시각화 초기화

2. **메시지 처리** (`handleSendMessage`)
   - 사용자 질문 수신
   - API 클라이언트를 통한 데이터 조회
   - 능동적 답변 생성
   - 경고 확인
   - 답변 표시 및 제안 버튼 렌더링
   - 시각화 업데이트

3. **파일 업로드** (`handleFileUpload`)
   - CSV/Excel 파일 파싱
   - Supabase에 데이터 저장

4. **유틸리티 함수**
   - 메시지 추가/제거
   - 경고 포맷팅

**연결 관계**:
- `api/client.js`: 데이터 조회, 예측, 메뉴얼 검색
- `modules/proactive.js`: 능동적 답변 생성
- `modules/alert.js`: 경고 확인
- `modules/visualization.js`: 시각화 업데이트
- `modules/data-query.js`: (간접) API 클라이언트를 통해 호출

---

### 5. `api/client.js` - API 클라이언트

**역할**: 백엔드 API 추상화 레이어

**주요 기능**:
- `queryData()`: 데이터 조회 (현재는 프론트엔드 직접 처리)
- `getPrediction()`: 예측 모델 호출
- `searchManual()`: 메뉴얼 검색

**설계 의도**:
- 현재는 프론트엔드에서 직접 처리 (`USE_BACKEND_API: false`)
- 나중에 FastAPI 백엔드로 전환 시 `USE_BACKEND_API: true`로 변경하면
  자동으로 백엔드 API 호출로 전환됨

**연결 관계**:
- `script.js`: 메인 로직에서 호출
- `modules/data-query.js`: 데이터 조회 시
- `modules/prediction.js`: 예측 모델 호출 시
- `modules/manual.js`: 메뉴얼 검색 시

---

### 6. `modules/data-query.js` - 데이터 조회 모듈

**역할**: 질문 파싱 및 Supabase 데이터 조회

**주요 기능**:

1. **질문 파싱** (`parseQuestionToQuery`)
   - 날짜 추출
   - 숫자 조건 추출 (경도, 위도, pH)
   - 텍스트 필터 추출 (분류코드, 조사구간명 등)
   - 타겟 컬럼 추출 (FAI, BAI, pH 등)

2. **데이터 조회** (`queryData`)
   - Supabase에서 데이터 가져오기
   - 중복 제거
   - 필터링 적용

3. **필터링** (`applyFilters`)
   - 텍스트 필터 (부분 매칭)
   - 날짜 필터
   - 숫자 필터 (tolerance 기반)

**연결 관계**:
- `api/client.js`: 호출됨
- `script.js`: 결과를 받아서 처리
- `modules/proactive.js`: 필터링된 데이터 전달
- `modules/visualization.js`: 시각화용 데이터 전달

---

### 7. `modules/proactive.js` - 능동적 답변 생성

**역할**: 자연스러운 답변 생성 및 추가 정보 제안

**주요 기능**:

1. **답변 생성** (`generateProactiveAnswer`)
   - 기본 답변 생성
   - 수질 등급 계산 및 표시
   - 조류 경보 단계 계산 및 표시
   - 컨텍스트 정보 추가 (위치, 날짜)

2. **제안 생성**
   - 수질 등급 상세 정보 제안
   - 예측 결과 제안
   - 시계열 차트 제안
   - 관련 지표 제안

3. **계산 함수**
   - `calculateWaterQualityGrade()`: 수질 등급 계산
   - `calculateAlgaeAlertLevel()`: 조류 경보 단계 계산
   - `getRelatedMetrics()`: 관련 지표 찾기

**연결 관계**:
- `script.js`: 호출됨, 제안 버튼 렌더링
- `config.js`: 등급 기준 참조
- `modules/prediction.js`: 예측 결과 표시 시
- `modules/visualization.js`: 시각화 호출 시
- `modules/manual.js`: 메뉴얼 검색 시

---

### 8. `modules/visualization.js` - 시각화 모듈

**역할**: 차트 및 지도 시각화

**주요 기능**:

1. **시계열 차트** (`updateTimeSeriesChart`, `showTimeSeriesChart`)
   - Chart.js를 사용한 라인 차트
   - 날짜별 데이터 표시
   - 특정 위치코드와 지표로 필터링

2. **지도** (`updateMap`)
   - Leaflet을 사용한 지도
   - 위치별 마커 표시
   - 값에 따른 색상 구분
   - 팝업으로 상세 정보 표시

3. **예측 미리보기** (`showPredictionPreview`)
   - 예측 결과 간단 표시

**연결 관계**:
- `script.js`: 시각화 업데이트 호출
- `modules/proactive.js`: 시계열 차트 표시 요청
- `config.js`: 색상 기준 참조
- `index.html`: 차트/지도 컨테이너 사용

---

### 9. `modules/alert.js` - 경고 시스템

**역할**: 위험 상황 감지 및 알림

**주요 기능**:

1. **경고 확인** (`checkAlerts`)
   - 수질 경고 확인
   - 조류 경고 확인
   - 홍수 경고 확인

2. **경고 판정 함수**
   - `checkWaterQualityAlerts()`: pH, BOD, T-N, T-P 기준
   - `checkAlgaeAlerts()`: FAI, BAI, DAI, IAI 기준
   - `checkFloodAlerts()`: 수위, 강수량 기준

3. **경고 포맷팅** (`formatAlerts`)
   - 경고 메시지를 텍스트로 변환
   - 심각도별 정렬

**연결 관계**:
- `script.js`: 경고 확인 호출
- `config.js`: 경고 기준 참조
- `modules/manual.js`: 대응 메뉴얼 연결
- `modules/proactive.js`: 경고 정보 표시

---

### 10. `modules/prediction.js` - 예측 모델 통합

**역할**: 다음주 수질/녹조 예측

**주요 기능**:

1. **예측 데이터 생성** (`getPrediction`)
   - 현재는 모의 예측 데이터
   - 실제 데이터 기반 평균값 계산
   - 간단한 변동 추가

2. **예측 결과 포맷팅**
   - `formatPredictionResult()`: 텍스트 형식
   - `formatPredictionHTML()`: HTML 형식

3. **등급/경보 계산**
   - 예측된 수질 등급 계산
   - 예측된 조류 경보 단계 계산

**연결 관계**:
- `api/client.js`: 호출됨
- `modules/proactive.js`: 예측 결과 표시 요청
- `config.js`: 등급 기준 참조
- `modules/alert.js`: 예측 기반 경고 생성

**향후 개선**:
- 실제 예측 모델 API 연동
- 시계열 예측 모델 통합

---

### 11. `modules/manual.js` - 메뉴얼 시스템

**역할**: 사고 대응 메뉴얼 검색 및 제공

**주요 기능**:

1. **메뉴얼 검색** (`searchManual`)
   - 키워드 기반 검색 (현재)
   - 나중에 RAG 벡터 검색으로 교체 예정

2. **메뉴얼 포맷팅**
   - `formatManual()`: 단일 메뉴얼
   - `formatManuals()`: 여러 메뉴얼
   - `formatManualHTML()`: HTML 형식

3. **메뉴얼 데이터베이스**
   - 수질 사고 대응
   - 조류 대량 발생 대응
   - 홍수 대응
   - 관리 가이드 등

**연결 관계**:
- `api/client.js`: 호출됨
- `modules/alert.js`: 경고 시 메뉴얼 연결
- `modules/proactive.js`: 제안 시 메뉴얼 표시

**향후 개선**:
- Supabase 테이블로 메뉴얼 저장
- 벡터 임베딩 기반 RAG 검색
- LLM을 통한 자연어 검색

---

### 12. `supabase-config.js` & `supabase-init.js`

**역할**: Supabase 연결 설정

**주요 기능**:
- Supabase 프로젝트 URL 및 API 키 설정
- Supabase 클라이언트 초기화
- 전역 변수로 `window.supabase` 설정

**연결 관계**:
- 모든 모듈에서 `window.supabase` 사용
- `script.js`: 데이터 저장/조회 시
- `modules/data-query.js`: 데이터 조회 시
- `modules/visualization.js`: 시계열 데이터 조회 시

---

## 🔗 모듈 간 연결 관계

### 데이터 흐름도

```
사용자 질문 입력
    │
    ▼
script.js (handleSendMessage)
    │
    ▼
api/client.js (queryData)
    │
    ▼
modules/data-query.js
    ├─ 질문 파싱
    ├─ Supabase 조회
    └─ 필터링
    │
    ▼
modules/proactive.js
    ├─ 답변 생성
    ├─ 수질 등급 계산
    ├─ 조류 경보 계산
    └─ 제안 생성
    │
    ├─▶ modules/alert.js (경고 확인)
    ├─▶ modules/prediction.js (예측 제안)
    ├─▶ modules/visualization.js (시각화 제안)
    └─▶ modules/manual.js (메뉴얼 제안)
    │
    ▼
script.js
    ├─ 답변 표시
    ├─ 제안 버튼 렌더링
    └─ 시각화 업데이트
```

### 모듈 의존성 그래프

```
script.js (메인)
    │
    ├─▶ api/client.js
    │       │
    │       ├─▶ modules/data-query.js
    │       ├─▶ modules/prediction.js
    │       └─▶ modules/manual.js
    │
    ├─▶ modules/proactive.js
    │       │
    │       ├─▶ config.js (등급 기준)
    │       ├─▶ modules/prediction.js
    │       ├─▶ modules/visualization.js
    │       └─▶ modules/manual.js
    │
    ├─▶ modules/alert.js
    │       │
    │       ├─▶ config.js (경고 기준)
    │       └─▶ modules/manual.js
    │
    └─▶ modules/visualization.js
            │
            └─▶ config.js (색상 기준)
```

---

## 📊 데이터 흐름

### 1. 파일 업로드 흐름

```
사용자 파일 선택
    │
    ▼
script.js (handleFileUpload)
    ├─ CSV/Excel 파싱
    └─ Supabase 저장
    │
    ▼
excel_data 테이블
    └─ row_data (JSONB)
```

### 2. 질문 처리 흐름

```
"분류코드 2001G027에서의 pH값 알려줘"
    │
    ▼
data-query.js (parseQuestionToQuery)
    ├─ 텍스트 필터: { column: "분류코드", value: "2001G027" }
    └─ 타겟 컬럼: ["pH"]
    │
    ▼
Supabase 조회
    └─ 필터링된 데이터 반환
    │
    ▼
proactive.js (generateProactiveAnswer)
    ├─ 기본 답변: "pH는 7.3입니다"
    ├─ 수질 등급 계산: "II등급"
    └─ 제안 생성
    │
    ▼
사용자에게 표시
    ├─ 답변 메시지
    ├─ 제안 버튼들
    └─ 시각화 업데이트
```

### 3. 경고 생성 흐름

```
데이터 조회
    │
    ▼
alert.js (checkAlerts)
    ├─ 수질 경고 확인
    │   └─ pH < 5.5 → 경고 생성
    ├─ 조류 경고 확인
    │   └─ FAI >= 80 → 경고 생성
    └─ 홍수 경고 확인
    │
    ▼
경고 메시지 + 메뉴얼 연결
    │
    ▼
사용자에게 표시
```

---

## 🚀 사용 방법

### 1. 초기 설정

1. **Supabase 프로젝트 생성**
   - [Supabase](https://supabase.com) 접속
   - 새 프로젝트 생성

2. **테이블 생성**
   ```sql
   CREATE TABLE excel_data (
       id BIGSERIAL PRIMARY KEY,
       row_data JSONB NOT NULL,
       row_index INTEGER,
       filename TEXT,
       uploaded_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **설정 파일 수정**
   - `supabase-config.js`에 프로젝트 URL과 API 키 입력

### 2. 실행

1. 로컬 서버 실행 (예: `python -m http.server 8000`)
2. 브라우저에서 `http://localhost:8000/v2/index.html` 접속
3. 엑셀/CSV 파일 업로드
4. 질문 입력

### 3. 예시 질문

- "분류코드 2001G027에서의 pH값 알려줘"
- "FAI가 80 이상인 지역 알려줘"
- "2024년 5월 데이터 보여줘"
- "pH가 7.0인 지역의 수질 등급은?"

---

## 🔮 향후 개발 계획

### Phase 1: 백엔드 분리 (FastAPI)
- [ ] FastAPI 서버 구축
- [ ] 예측 모델 API 통합
- [ ] RAG 벡터 검색 구현
- [ ] `api/client.js`에서 백엔드 호출로 전환

### Phase 2: 고급 기능
- [ ] LLM 통합 (GPT/Claude) - 자연스러운 대화
- [ ] 벡터 DB 통합 (Pinecone/Weaviate) - 메뉴얼 RAG
- [ ] 실시간 데이터 스트리밍
- [ ] 사용자 인증 및 권한 관리

### Phase 3: 최적화
- [ ] 캐싱 시스템
- [ ] 성능 최적화
- [ ] 모바일 반응형 개선
- [ ] 접근성 개선

---

## 📝 참고사항

### 현재 제한사항
- 예측 모델은 모의 데이터 사용 (실제 모델 연동 필요)
- 메뉴얼 검색은 키워드 기반 (RAG 벡터 검색으로 개선 필요)
- 모든 로직이 프론트엔드에서 처리 (백엔드 분리 필요)

### 백엔드 전환 방법
1. `config.js`에서 `USE_BACKEND_API: true`로 변경
2. FastAPI 서버 실행
3. `api/client.js`가 자동으로 백엔드 API 호출

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

**버전**: v2.0  
**최종 업데이트**: 2024년 12월
```

README 파일을 생성했습니다. 각 파일의 역할과 모듈 간 연결 관계를 정리했습니다. 추가 설명이 필요하면 알려주세요.
