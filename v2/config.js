// 환경 데이터 RAG 챗봇 v2 - 설정 파일
// 나중에 FastAPI 백엔드로 분리할 때 이 설정만 변경하면 됨

const CONFIG = {
    // API 설정 (현재는 프론트엔드에서 직접 처리, 나중에 백엔드 URL로 변경)
    USE_BACKEND_API: false, // false = 프론트엔드 직접 처리, true = 백엔드 API 호출
    BACKEND_API_URL: 'http://localhost:8000', // FastAPI 서버 URL (나중에 사용)
    
    // 수질 등급 기준
    WATER_QUALITY_GRADES: {
        'I등급': { 
            pH: { min: 6.5, max: 8.5 }, 
            BOD: { max: 1.0 }, 
            'T-N': { max: 0.2 },
            'T-P': { max: 0.02 },
            description: '매우 좋음',
            color: 'green'
        },
        'II등급': { 
            pH: { min: 6.0, max: 9.0 }, 
            BOD: { max: 2.0 },
            'T-N': { max: 0.3 },
            'T-P': { max: 0.04 },
            description: '좋음',
            color: 'lightgreen'
        },
        'III등급': { 
            pH: { min: 5.5, max: 9.5 }, 
            BOD: { max: 3.0 },
            'T-N': { max: 0.5 },
            'T-P': { max: 0.1 },
            description: '보통',
            color: 'yellow'
        },
        'IV등급': { 
            pH: { min: 5.0, max: 10.0 }, 
            BOD: { max: 5.0 },
            'T-N': { max: 1.0 },
            'T-P': { max: 0.2 },
            description: '나쁨',
            color: 'orange'
        },
        'V등급': { 
            pH: { min: 0, max: 14 }, 
            BOD: { max: Infinity },
            description: '매우 나쁨',
            color: 'red'
        }
    },
    
    // 조류 경보 단계
    ALGAE_ALERT_LEVELS: {
        '정상': { FAI: { max: 40 }, color: 'green', description: '조류 발생 없음' },
        '관심': { FAI: { min: 40, max: 60 }, color: 'yellow', description: '조류 발생 관심' },
        '주의': { FAI: { min: 60, max: 80 }, color: 'orange', description: '조류 발생 주의' },
        '경보': { FAI: { min: 80 }, color: 'red', description: '조류 대량 발생 위험' }
    },
    
    // 관련 지표 매핑
    RELATED_METRICS: {
        'pH': ['BOD', 'T-N', 'T-P', 'FAI'],
        'FAI': ['BAI', 'DAI', 'IAI', 'pH', 'BOD'],
        'BOD': ['T-N', 'T-P', 'pH', 'FAI'],
        'T-N': ['T-P', 'BOD', 'pH'],
        'T-P': ['T-N', 'BOD', 'pH'],
        'BAI': ['FAI', 'DAI', 'IAI'],
        'DAI': ['FAI', 'BAI', 'IAI'],
        'IAI': ['FAI', 'BAI', 'DAI']
    }
};

// 전역으로 내보내기
window.CONFIG = CONFIG;
