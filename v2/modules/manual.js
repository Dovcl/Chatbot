// 메뉴얼 시스템 모듈
// 현재는 키워드 기반 검색, 나중에 RAG 벡터 검색으로 교체

// 메뉴얼 데이터베이스 (프로토타입용)
// 나중에 Supabase 테이블이나 벡터 DB로 교체
const MANUALS_DB = [
    {
        id: 1,
        title: '수질 사고 긴급 대응 메뉴얼',
        type: 'water_quality_emergency',
        keywords: ['수질', '사고', '긴급', 'pH', 'BOD', '오염', 'IV등급', 'V등급'],
        content: `수질 사고 긴급 대응 절차:

1. 즉시 조치
   - 해당 지역의 급수 중단 또는 경고 발령
   - 주민 및 관련 기관에 즉시 통보
   - 수질 오염원 차단 시도

2. 현장 조사
   - 오염원 확인 및 차단
   - 수질 측정 및 모니터링 강화
   - 영향 범위 파악

3. 복구 조치
   - 오염원 제거
   - 정화 작업 실시
   - 수질 회복 모니터링

4. 보고 및 후속 조치
   - 사고 보고서 작성
   - 재발 방지 대책 수립
   - 주민 안내 및 공지`
    },
    {
        id: 2,
        title: '조류 대량 발생 긴급 대응 메뉴얼',
        type: 'algae_emergency',
        keywords: ['조류', '녹조', '대량', '발생', '경보', 'FAI', '긴급'],
        content: `조류 대량 발생 긴급 대응 절차:

1. 즉시 조치
   - 조류 경보 발령
   - 해당 지역 접촉 금지 안내
   - 급수원 모니터링 강화

2. 조류 제거 작업
   - 물리적 제거 (스크리닝, 수거)
   - 화학적 처리 (알지사이드 등)
   - 생물학적 처리 (미생물 활용)

3. 예방 조치
   - 영양염류 유입 차단
   - 수질 개선 작업
   - 지속적 모니터링

4. 주민 안내
   - 건강 주의사항 안내
   - 급수 사용 제한 안내
   - 회복 상황 공지`
    },
    {
        id: 3,
        title: '홍수 긴급 대응 메뉴얼',
        type: 'flood_emergency',
        keywords: ['홍수', '침수', '수위', '강수량', '긴급', '위험'],
        content: `홍수 긴급 대응 절차:

1. 즉시 조치
   - 홍수 경보 발령
   - 주민 대피 안내
   - 위험 지역 차단

2. 방재 작업
   - 제방 점검 및 보강
   - 배수 시설 가동
   - 긴급 복구 작업

3. 모니터링
   - 수위 지속 관측
   - 강수량 모니터링
   - 피해 상황 파악

4. 복구 및 후속 조치
   - 침수 지역 복구
   - 피해 조사
   - 재발 방지 대책`
    },
    {
        id: 4,
        title: '수질 관리 가이드',
        type: 'water_quality_warning',
        keywords: ['수질', '관리', 'pH', 'BOD', '경고', '주의'],
        content: `수질 관리 가이드:

1. 정기 모니터링
   - 주 1회 이상 수질 측정
   - 주요 지표(pH, BOD, T-N, T-P) 확인
   - 이상 징후 즉시 보고

2. 예방 조치
   - 오염원 사전 차단
   - 정기적 정화 작업
   - 수질 개선 시설 운영

3. 개선 조치
   - 오염원 제거
   - 생태계 복원
   - 수질 개선 시설 확충`
    },
    {
        id: 5,
        title: '조류 발생 대응 가이드',
        type: 'algae_warning',
        keywords: ['조류', '발생', '대응', 'FAI', 'BAI', '주의'],
        content: `조류 발생 대응 가이드:

1. 조기 발견
   - 정기적 조류 모니터링
   - FAI, BAI, DAI, IAI 지표 확인
   - 이상 징후 조기 감지

2. 예방 조치
   - 영양염류 유입 차단
   - 수질 개선 작업
   - 생태계 복원

3. 발생 시 조치
   - 조류 제거 작업
   - 수질 모니터링 강화
   - 주민 안내`
    },
    {
        id: 6,
        title: '영양염류 관리 가이드',
        type: 'nutrient_warning',
        keywords: ['영양염류', 'T-N', 'T-P', '질소', '인', '관리'],
        content: `영양염류 관리 가이드:

1. 원인 파악
   - 오염원 조사
   - 유입 경로 확인
   - 배출량 측정

2. 관리 조치
   - 오염원 차단
   - 정화 시설 운영
   - 생태계 복원

3. 모니터링
   - 정기적 측정
   - 변화 추이 관찰
   - 효과 평가`
    },
    {
        id: 7,
        title: '조류 예방 가이드',
        type: 'algae_info',
        keywords: ['조류', '예방', '관심', 'FAI', '예방'],
        content: `조류 예방 가이드:

1. 정기 모니터링
   - 조류 지표 정기 측정
   - 이상 징후 조기 발견
   - 변화 추이 관찰

2. 예방 조치
   - 영양염류 유입 차단
   - 수질 개선
   - 생태계 관리

3. 주의사항
   - 조류 발생 가능성 주의
   - 모니터링 강화
   - 필요시 조기 조치`
    }
];

// 메인 함수: 메뉴얼 검색
export async function searchManual(situation, locationCode = null) {
    // 현재는 키워드 기반 검색
    // 나중에 RAG 벡터 검색으로 교체
    
    const query = situation.toLowerCase();
    
    // 키워드 매칭으로 메뉴얼 검색
    const matchedManuals = MANUALS_DB.filter(manual => {
        // 제목 매칭
        if (manual.title.toLowerCase().includes(query)) {
            return true;
        }
        
        // 키워드 매칭
        const keywordMatch = manual.keywords.some(keyword => 
            query.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(query)
        );
        
        if (keywordMatch) {
            return true;
        }
        
        // 타입 매칭
        if (manual.type && query.includes(manual.type)) {
            return true;
        }
        
        return false;
    });
    
    // 관련도 순으로 정렬 (키워드 매칭 개수 기준)
    const scoredManuals = matchedManuals.map(manual => {
        let score = 0;
        
        // 제목 매칭 점수
        if (manual.title.toLowerCase().includes(query)) {
            score += 10;
        }
        
        // 키워드 매칭 점수
        manual.keywords.forEach(keyword => {
            if (query.includes(keyword.toLowerCase())) {
                score += 5;
            }
            if (keyword.toLowerCase().includes(query)) {
                score += 3;
            }
        });
        
        // 타입 매칭 점수
        if (manual.type && query.includes(manual.type)) {
            score += 8;
        }
        
        return { ...manual, score };
    });
    
    // 점수 순으로 정렬
    scoredManuals.sort((a, b) => b.score - a.score);
    
    // 상위 5개 반환
    return scoredManuals.slice(0, 5).map(({ score, ...manual }) => manual);
}

// 타입별 메뉴얼 검색
export function searchManualByType(type) {
    return MANUALS_DB.filter(manual => manual.type === type);
}

// 메뉴얼 포맷팅
export function formatManual(manual) {
    if (!manual) return '';
    
    let text = `📋 **${manual.title}**\n\n`;
    text += manual.content;
    
    return text;
}

// 여러 메뉴얼 포맷팅
export function formatManuals(manuals) {
    if (!manuals || manuals.length === 0) {
        return '관련 메뉴얼을 찾을 수 없습니다.';
    }
    
    let text = `📋 **관련 메뉴얼** (${manuals.length}개)\n\n`;
    
    manuals.forEach((manual, index) => {
        text += `**[${index + 1}] ${manual.title}**\n`;
        text += `${manual.content}\n\n`;
    });
    
    return text;
}

// 메뉴얼 HTML 포맷팅
export function formatManualHTML(manual) {
    if (!manual) return '<p>메뉴얼을 찾을 수 없습니다.</p>';
    
    let html = `<div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">`;
    html += `<h3>📋 ${manual.title}</h3>`;
    html += `<pre style="white-space: pre-wrap; font-family: inherit;">${manual.content}</pre>`;
    html += `</div>`;
    
    return html;
}

// 모든 메뉴얼 목록 가져오기
export function getAllManuals() {
    return MANUALS_DB;
}

// 메뉴얼 카테고리별 분류
export function getManualsByCategory() {
    const categories = {
        '긴급 대응': MANUALS_DB.filter(m => m.type.includes('emergency')),
        '경고 대응': MANUALS_DB.filter(m => m.type.includes('warning')),
        '예방 가이드': MANUALS_DB.filter(m => m.type.includes('info') || m.type.includes('guide'))
    };
    
    return categories;
}
