// 수질 등급 기준 RAG 모듈
// 수질 등급 기준 문서를 동적으로 검색하고 적용

/**
 * RAG를 사용하여 수질 등급 기준 문서 검색
 * @param {string} query - 검색 쿼리 (예: "pH 기준", "BOD 등급")
 * @param {Object} options - 검색 옵션
 * @returns {Promise<Object>} 검색된 기준 정보
 */
export async function searchWaterQualityStandards(query, options = {}) {
    const supabase = options.supabase || window.supabase;
    
    if (!supabase) {
        console.warn('Supabase가 없어 기본 기준을 사용합니다.');
        return getDefaultStandards();
    }
    
    try {
        // Supabase에서 수질 기준 문서 검색
        // 나중에 벡터 검색으로 개선 가능
        const { data, error } = await supabase
            .from('water_quality_standards')  // 나중에 생성할 테이블
            .select('*')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .limit(5);
        
        if (error) {
            console.warn('기준 문서 검색 실패, 기본 기준 사용:', error);
            return getDefaultStandards();
        }
        
        if (data && data.length > 0) {
            // 검색된 문서에서 기준 추출
            return parseStandardsFromDocuments(data);
        }
        
        // 검색 결과가 없으면 기본 기준 사용
        return getDefaultStandards();
        
    } catch (error) {
        console.error('기준 검색 오류:', error);
        return getDefaultStandards();
    }
}

/**
 * 기본 기준 반환 (config.js에서)
 */
function getDefaultStandards() {
    const CONFIG = window.CONFIG || {};
    return {
        waterQualityGrades: CONFIG.WATER_QUALITY_GRADES || {},
        algaeAlertLevels: CONFIG.ALGAE_ALERT_LEVELS || {},
        source: 'config'
    };
}

/**
 * 문서에서 기준 파싱 (나중에 구현)
 */
function parseStandardsFromDocuments(documents) {
    // 문서에서 JSON 형식의 기준을 추출하거나
    // LLM을 사용해서 구조화된 데이터로 변환
    // 현재는 기본 기준 반환
    return getDefaultStandards();
}

/**
 * 기준을 동적으로 업데이트
 * @param {Object} newStandards - 새로운 기준
 */
export function updateStandards(newStandards) {
    if (!window.CONFIG) {
        window.CONFIG = {};
    }
    
    if (newStandards.waterQualityGrades) {
        window.CONFIG.WATER_QUALITY_GRADES = {
            ...window.CONFIG.WATER_QUALITY_GRADES,
            ...newStandards.waterQualityGrades
        };
    }
    
    if (newStandards.algaeAlertLevels) {
        window.CONFIG.ALGAE_ALERT_LEVELS = {
            ...window.CONFIG.ALGAE_ALERT_LEVELS,
            ...newStandards.algaeAlertLevels
        };
    }
    
    console.log('✅ 기준이 업데이트되었습니다:', newStandards);
}

/**
 * LLM을 사용하여 기준 문서에서 기준 추출
 * @param {Array} documents - 검색된 문서들
 * @param {string} question - 사용자 질문
 * @returns {Promise<Object>} 추출된 기준
 */
export async function extractStandardsWithLLM(documents, question) {
    const llmConfig = window.CONFIG?.LLM;
    
    if (!llmConfig?.enabled) {
        return getDefaultStandards();
    }
    
    try {
        const { getLLMClient } = await import('./llm-client.js');
        const llmClient = getLLMClient();
        
        if (!llmClient) {
            return getDefaultStandards();
        }
        
        // 문서를 컨텍스트로 LLM에 전달하여 기준 추출
        const prompt = `다음 수질 등급 기준 문서들을 분석하여 구조화된 기준을 추출해주세요.

문서들:
${documents.map((doc, i) => `[문서 ${i + 1}]\n${doc.content || doc.text}`).join('\n\n')}

다음 JSON 형식으로 기준을 추출해주세요:
{
    "waterQualityGrades": {
        "I등급": { "pH": { "min": 6.5, "max": 8.5 }, "BOD": { "max": 1.0 }, ... },
        "II등급": { ... },
        ...
    },
    "algaeAlertLevels": {
        "정상": { "FAI": { "max": 40 } },
        "관심": { "FAI": { "min": 40, "max": 60 } },
        ...
    }
}`;

        const response = await llmClient.generateAnswer(
            prompt,
            [],
            { extractMode: true }
        );
        
        // JSON 파싱
        try {
            const standards = JSON.parse(response);
            return standards;
        } catch (parseError) {
            console.error('기준 파싱 오류:', parseError);
            return getDefaultStandards();
        }
        
    } catch (error) {
        console.error('LLM 기준 추출 오류:', error);
        return getDefaultStandards();
    }
}

