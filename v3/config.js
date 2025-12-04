// 환경 데이터 RAG 챗봇 v2 - 설정 파일
// 나중에 FastAPI 백엔드로 분리할 때 이 설정만 변경하면 됨

const CONFIG = {
    // API 설정 (현재는 프론트엔드에서 직접 처리, 나중에 백엔드 URL로 변경)
    USE_BACKEND_API: false, // false = 프론트엔드 직접 처리, true = 백엔드 API 호출
    BACKEND_API_URL: 'http://localhost:8000', // FastAPI 서버 URL (나중에 사용)
    
    // LLM 설정
    LLM: {
        enabled: true, // true로 설정하면 LLM 사용, false면 규칙 기반 답변
        
        // 제공자 선택 (가격 정보 참고)
        // 무료 옵션: 'gemini' | 'groq' | 'huggingface' | 'openrouter' | 'ollama'
        // 유료 옵션: 'openai' | 'anthropic'
        provider: 'groq', // 기본값: Groq (무료, 빠름)
        
        apiKey: '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', // LLM API 키 (환경 변수나 별도 파일에서 로드 권장)
        model: 'llama-3.1-8b-instant', // 사용할 모델명 (provider별 기본값 참고)
        baseURL: null, // 커스텀 엔드포인트 (provider가 'ollama' 또는 'custom'일 때 사용)
        maxTokens: 2000, // 최대 토큰 수
        temperature: 0.7, // 창의성 (0.0 ~ 1.0)
        
        // 제공자별 추천 모델 및 가격 정보
        // 자세한 내용은 LLM_SETUP.md 참고
        PROVIDER_INFO: {
            // 🆓 무료 옵션
            'groq': {
                name: 'Groq',
                free: true,
                description: '무료, 매우 빠름 (초당 수백 토큰)',
                defaultModel: 'llama-3.1-8b-instant',
                apiKeyUrl: 'https://console.groq.com/keys',
                models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768']
            },
            'gemini': {
                name: 'Google Gemini',
                free: true,
                description: '무료 티어 제공 (분당 15회 요청)',
                defaultModel: 'gemini-pro',
                apiKeyUrl: 'https://makersuite.google.com/app/apikey',
                models: ['gemini-pro', 'gemini-pro-vision']
            },
            'huggingface': {
                name: 'Hugging Face',
                free: true,
                description: '일부 모델 무료 (API 키 없이도 사용 가능)',
                defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2',
                apiKeyUrl: 'https://huggingface.co/settings/tokens',
                models: ['mistralai/Mistral-7B-Instruct-v0.2', 'meta-llama/Llama-2-7b-chat-hf']
            },
            'openrouter': {
                name: 'OpenRouter',
                free: true,
                description: '다양한 모델, 일부 무료 모델 제공',
                defaultModel: 'openai/gpt-3.5-turbo',
                apiKeyUrl: 'https://openrouter.ai/keys',
                models: ['openai/gpt-3.5-turbo', 'meta-llama/llama-3-8b-instruct', 'google/gemini-pro']
            },
            'ollama': {
                name: 'Ollama',
                free: true,
                description: '로컬 실행, 완전 무료 (설치 필요)',
                defaultModel: 'llama2',
                apiKeyUrl: null,
                models: ['llama2', 'mistral', 'codellama', 'llama2:13b'],
                setupRequired: true
            },
            
            // 💰 유료 옵션
            'openai': {
                name: 'OpenAI',
                free: false,
                description: '유료 (gpt-4o-mini는 저렴)',
                defaultModel: 'gpt-4o-mini',
                apiKeyUrl: 'https://platform.openai.com/api-keys',
                models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo']
            },
            'anthropic': {
                name: 'Anthropic Claude',
                free: false,
                description: '유료 (고품질)',
                defaultModel: 'claude-3-5-sonnet-20241022',
                apiKeyUrl: 'https://console.anthropic.com/',
                models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
            }
        }
    },
    
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
