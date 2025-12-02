// 능동적 답변 생성 모듈
// 질문에 대한 답변을 생성하고 추가 정보를 제안

// 메인 함수: 능동적 답변 생성
export async function generateProactiveAnswer(question, data, targetColumns, queryConditions) {
    if (data.length === 0) {
        return {
            answer: '죄송합니다. 조건에 맞는 데이터를 찾을 수 없습니다.\n\n💡 다음을 확인해보세요:\n- 컬럼명이 정확한지 확인 ("컬럼명 보여줘"로 확인 가능)\n- 필터 조건을 다시 확인해주세요',
            suggestions: []
        };
    }
    
    let answer = '';
    const suggestions = [];
    
    // 결과가 1개인 경우 - 자연스러운 설명
    if (data.length === 1) {
        const row = data[0];
        
        if (targetColumns && targetColumns.length > 0) {
            // 타겟 컬럼이 있는 경우
            answer += `네, 찾았습니다! `;
            
            targetColumns.forEach((col, idx) => {
                const colName = findColumnInRow(row, col);
                if (colName && row[colName] !== undefined) {
                    if (idx > 0) answer += ' 그리고 ';
                    answer += `**${colName}**는 **${row[colName]}**입니다.`;
                }
            });
            
            // 추가 컨텍스트 정보 제공
            if (row['조사구간명']) {
                answer += `\n\n📍 이 데이터는 **${row['조사구간명']}** 구간의 정보입니다.`;
            }
            if (row['Date']) {
                answer += ` 조사일자는 **${row['Date']}**입니다.`;
            }
            
            // 수질 등급 계산 및 제안
            if (targetColumns.some(col => ['pH', 'BOD', 'T-N', 'T-P'].includes(col))) {
                const waterQuality = calculateWaterQualityGrade(row);
                answer += `\n\n📊 **수질 등급**: ${waterQuality.grade} (${waterQuality.description})`;
                
                suggestions.push({
                    type: 'water_quality',
                    text: '이 지역의 전체 수질 등급을 자세히 보시겠어요?',
                    action: () => showWaterQualityDetails(row)
                });
            }
            
            // 조류 경보 단계 계산 및 제안
            if (targetColumns.some(col => ['FAI', 'BAI', 'DAI', 'IAI'].includes(col))) {
                const algaeAlert = calculateAlgaeAlertLevel(row);
                answer += `\n\n🌊 **조류 경보 단계**: ${algaeAlert.level} (${algaeAlert.description})`;
                
                if (algaeAlert.level !== '정상') {
                    suggestions.push({
                        type: 'algae_alert',
                        text: '조류 경보 대응 메뉴얼을 확인하시겠어요?',
                        action: () => showAlgaeManual(algaeAlert.level)
                    });
                }
            }
            
            // 예측 모델 제안
            const locationCode = row['분류코드'] || row['조사구간명'];
            if (locationCode) {
                suggestions.push({
                    type: 'prediction',
                    text: '다음주 이 지역의 수질 예측 결과를 확인하시겠어요?',
                    action: () => showPrediction(locationCode)
                });
            }
            
            // 시계열 변화 제안
            if (targetColumns && targetColumns.length > 0) {
                suggestions.push({
                    type: 'timeseries',
                    text: `이 지역의 ${targetColumns[0]} 변화 추이를 그래프로 보시겠어요?`,
                    action: () => showTimeSeriesChart(locationCode, targetColumns[0])
                });
            }
            
            // 관련 지표 제안
            if (targetColumns && targetColumns.length > 0) {
                const currentMetric = targetColumns[0];
                const relatedMetrics = getRelatedMetrics(row, currentMetric);
                
                if (relatedMetrics.length > 0) {
                    suggestions.push({
                        type: 'related',
                        text: `관련 지표(${relatedMetrics.slice(0, 3).join(', ')})도 함께 확인하시겠어요?`,
                        action: () => showRelatedMetrics(row, relatedMetrics)
                    });
                }
            }
            
            // 추가 질문 제안
            answer += `\n\n💬 추가로 궁금하신 점이 있으시면:\n`;
            answer += `- 다른 분류코드나 조사구간명으로 검색\n`;
            answer += `- 날짜나 위치 정보로 필터링\n`;
            answer += `- 여러 지표를 함께 비교`;
            
        } else {
            // 타겟 컬럼이 없는 경우 - 전체 정보 제공
            answer += `찾은 데이터입니다:\n\n`;
            Object.keys(row).forEach(key => {
                answer += `**${key}**: ${row[key]}\n`;
            });
        }
        
    } else {
        // 결과가 여러 개인 경우
        answer += `${data.length}개의 결과를 찾았습니다.\n\n`;
        
        if (targetColumns && targetColumns.length > 0) {
            data.forEach((row, index) => {
                answer += `**[결과 ${index + 1}]**`;
                if (row['조사구간명']) answer += ` - ${row['조사구간명']}`;
                if (row['Date']) answer += ` (${row['Date']})`;
                answer += `\n`;
                
                targetColumns.forEach(col => {
                    const colName = findColumnInRow(row, col);
                    if (colName && row[colName] !== undefined) {
                        answer += `  ${colName}: ${row[colName]}\n`;
                    }
                });
                answer += `\n`;
            });
            
            answer += `💡 더 구체적인 조건을 추가하면 원하는 결과를 찾을 수 있습니다.\n`;
            answer += `예: "분류코드 2001G027에서의 FAI값"`;
        } else {
            data.slice(0, 5).forEach((row, index) => {
                answer += `**[결과 ${index + 1}]**\n`;
                Object.keys(row).forEach(key => {
                    answer += `${key}: ${row[key]}\n`;
                });
                answer += `\n`;
            });
            if (data.length > 5) {
                answer += `... 외 ${data.length - 5}개 더 있습니다.\n`;
            }
        }
    }
    
    return {
        answer: answer.trim(),
        suggestions: suggestions
    };
}

// 수질 등급 계산
function calculateWaterQualityGrade(row) {
    const CONFIG = window.CONFIG || {};
    const grades = CONFIG.WATER_QUALITY_GRADES || {};
    
    const pH = parseFloat(row['pH'] || row['ph'] || 0);
    const BOD = parseFloat(row['BOD'] || 0);
    const TN = parseFloat(row['T-N'] || 0);
    const TP = parseFloat(row['T-P'] || 0);
    
    // 등급 판정 (간단한 로직)
    let grade = 'V등급';
    let description = '매우 나쁨';
    
    for (const [gradeName, criteria] of Object.entries(grades)) {
        const pHMatch = !criteria.pH || (pH >= criteria.pH.min && pH <= criteria.pH.max);
        const BODMatch = !criteria.BOD || (BOD <= criteria.BOD.max);
        const TNMatch = !criteria['T-N'] || (TN <= criteria['T-N'].max);
        const TPMatch = !criteria['T-P'] || (TP <= criteria['T-P'].max);
        
        if (pHMatch && BODMatch && TNMatch && TPMatch) {
            grade = gradeName;
            description = criteria.description;
            break;
        }
    }
    
    return {
        grade,
        description,
        details: { pH, BOD, 'T-N': TN, 'T-P': TP }
    };
}

// 조류 경보 단계 계산
function calculateAlgaeAlertLevel(row) {
    const CONFIG = window.CONFIG || {};
    const levels = CONFIG.ALGAE_ALERT_LEVELS || {};
    
    const fai = parseFloat(row['FAI'] || 0);
    const bai = parseFloat(row['BAI'] || 0);
    const dai = parseFloat(row['DAI'] || 0);
    const iai = parseFloat(row['IAI'] || 0);
    
    // 경보 단계 판정
    let level = '정상';
    let description = '조류 발생 없음';
    let color = 'green';
    
    for (const [levelName, criteria] of Object.entries(levels)) {
        const faiCriteria = criteria.FAI;
        let match = false;
        
        if (faiCriteria.min !== undefined && faiCriteria.max !== undefined) {
            match = fai >= faiCriteria.min && fai < faiCriteria.max;
        } else if (faiCriteria.min !== undefined) {
            match = fai >= faiCriteria.min;
        } else if (faiCriteria.max !== undefined) {
            match = fai <= faiCriteria.max;
        }
        
        if (match) {
            level = levelName;
            description = criteria.description;
            color = criteria.color;
            break;
        }
    }
    
    return {
        level,
        description,
        color,
        values: { FAI: fai, BAI: bai, DAI: dai, IAI: iai }
    };
}

// 관련 지표 찾기
function getRelatedMetrics(row, currentMetric) {
    const CONFIG = window.CONFIG || {};
    const relatedMap = CONFIG.RELATED_METRICS || {};
    
    const related = relatedMap[currentMetric] || [];
    
    // 실제 데이터에 있는 지표만 반환
    return related.filter(metric => {
        const colName = findColumnInRow(row, metric);
        return colName && row[colName] !== undefined;
    });
}

// 행에서 컬럼 찾기
function findColumnInRow(row, columnName) {
    const keys = Object.keys(row);
    
    // 정확한 매칭
    if (keys.includes(columnName)) {
        return columnName;
    }
    
    // 대소문자 무시 매칭
    const found = keys.find(key => key.toLowerCase() === columnName.toLowerCase());
    if (found) return found;
    
    // 부분 매칭
    const foundPartial = keys.find(key => 
        key.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(key.toLowerCase())
    );
    
    return foundPartial || null;
}

// 제안 액션 함수들
function showWaterQualityDetails(row) {
    const quality = calculateWaterQualityGrade(row);
    const details = `📊 **수질 등급 상세 정보**\n\n` +
                   `등급: ${quality.grade} (${quality.description})\n` +
                   `pH: ${quality.details.pH}\n` +
                   `BOD: ${quality.details.BOD}\n` +
                   `T-N: ${quality.details['T-N']}\n` +
                   `T-P: ${quality.details['T-P']}`;
    
    // 메시지로 표시 (나중에 모달이나 별도 영역으로 변경 가능)
    if (typeof addMessage === 'function') {
        addMessage('봇', details, 'bot');
    }
}

function showAlgaeManual(level) {
    // 메뉴얼 모듈 호출
    window.apiClient.searchManual(`조류 ${level}`).then(manuals => {
        if (manuals && manuals.length > 0) {
            let text = `📋 **조류 ${level} 대응 메뉴얼**\n\n`;
            manuals.forEach(manual => {
                text += `**${manual.title}**\n${manual.content}\n\n`;
            });
            if (typeof addMessage === 'function') {
                addMessage('봇', text, 'bot');
            }
        }
    });
}

function showPrediction(locationCode) {
    // 예측 모듈 호출
    window.apiClient.getPrediction(locationCode).then(prediction => {
        if (prediction) {
            const { formatPredictionResult } = require('./prediction.js');
            const text = formatPredictionResult(prediction);
            if (typeof addMessage === 'function') {
                addMessage('봇', text, 'bot');
            }
        }
    });
}

function showTimeSeriesChart(locationCode, metric) {
    // 시각화 모듈 호출
    const { showTimeSeriesChart } = require('./visualization.js');
    showTimeSeriesChart(locationCode, metric);
    
    // 시계열 탭으로 전환
    if (typeof switchVisualizationTab === 'function') {
        switchVisualizationTab('chart');
    }
}

function showRelatedMetrics(row, metrics) {
    let text = `📊 **관련 지표 정보**\n\n`;
    metrics.forEach(metric => {
        const colName = findColumnInRow(row, metric);
        if (colName && row[colName] !== undefined) {
            text += `**${colName}**: ${row[colName]}\n`;
        }
    });
    
    if (typeof addMessage === 'function') {
        addMessage('봇', text, 'bot');
    }
}

// 제안 버튼 렌더링 (script.js에서 사용)
export function renderSuggestions(suggestions) {
    const container = document.getElementById('suggestions-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.textContent = suggestion.text;
        btn.onclick = () => {
            if (suggestion.action) {
                suggestion.action();
            }
        };
        container.appendChild(btn);
    });
}
