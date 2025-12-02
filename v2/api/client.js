// API 클라이언트 - 나중에 FastAPI 백엔드로 쉽게 교체 가능
// 현재는 프론트엔드에서 직접 처리, 나중에 fetch로 백엔드 호출로 변경

class APIClient {
    constructor() {
        this.useBackend = window.CONFIG?.USE_BACKEND_API || false;
        this.baseURL = window.CONFIG?.BACKEND_API_URL || '';
    }
    
    // 데이터 조회
    async queryData(question, options = {}) {
        if (this.useBackend) {
            // 나중에: 백엔드 API 호출
            try {
                const response = await fetch(`${this.baseURL}/api/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question, ...options })
                });
                
                if (!response.ok) {
                    throw new Error(`API 오류: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('백엔드 API 호출 실패:', error);
                throw error;
            }
        } else {
            // 현재: 프론트엔드에서 직접 처리
            const { queryData: queryDataModule } = await import('../modules/data-query.js');
            return await queryDataModule(question, options);
        }
    }
    
    // 예측 모델 호출
    async getPrediction(locationCode, date = null) {
        if (this.useBackend) {
            // 나중에: 백엔드 API 호출
            try {
                const response = await fetch(`${this.baseURL}/api/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        location_code: locationCode, 
                        date: date || this.getNextWeekDate() 
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`예측 API 오류: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('예측 API 호출 실패:', error);
                throw error;
            }
        } else {
            // 현재: 프론트엔드에서 모의 예측
            const { getPrediction: predictionModule } = await import('../modules/prediction.js');
            return await predictionModule(locationCode, date);
        }
    }
    
    // 메뉴얼 검색
    async searchManual(situation, locationCode = null) {
        if (this.useBackend) {
            // 나중에: 백엔드 RAG API 호출
            try {
                const response = await fetch(`${this.baseURL}/api/manual/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ situation, location_code: locationCode })
                });
                
                if (!response.ok) {
                    throw new Error(`메뉴얼 API 오류: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('메뉴얼 API 호출 실패:', error);
                throw error;
            }
        } else {
            // 현재: 프론트엔드에서 키워드 검색
            const { searchManual: manualModule } = await import('../modules/manual.js');
            return await manualModule(situation, locationCode);
        }
    }
    
    // 다음주 날짜 계산
    getNextWeekDate() {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
    }
}

// 싱글톤 인스턴스
const apiClient = new APIClient();
window.apiClient = apiClient;

export default apiClient;
