// 능동적 답변 생성 모듈
// 질문에 대한 답변을 생성하고 추가 정보를 제안
// LLM이 활성화되어 있으면 LLM 사용, 아니면 규칙 기반 답변

// 메인 함수: 능동적 답변 생성
export async function generateProactiveAnswer(question, data, targetColumns, queryConditions, alerts = []) {
    // LLM이 활성화되어 있는지 확인
    const llmConfig = window.CONFIG?.LLM;
    const useLLM = llmConfig?.enabled === true;
    
    if (useLLM) {
        // LLM 기반 답변 생성 (경고 정보 포함)
        return await generateLLMAnswer(question, data, targetColumns, queryConditions, alerts);
    } else {
        // 기존 규칙 기반 답변 생성
        const response = await generateRuleBasedAnswer(question, data, targetColumns, queryConditions);
        // 규칙 기반일 때는 경고를 별도로 추가
        if (alerts.length > 0) {
            const { formatAlerts: formatAlertsModule } = await import('./alert.js');
            response.answer += formatAlertsModule(alerts);
        }
        return response;
    }
}

// LLM 기반 답변 생성
async function generateLLMAnswer(question, data, targetColumns, queryConditions, alerts = []) {
    try {
        // LLM 클라이언트 가져오기
        const { getLLMClient } = await import('./llm-client.js');
        const llmClient = getLLMClient();
        
        if (!llmClient) {
            console.warn('LLM 클라이언트를 가져올 수 없습니다. 규칙 기반 답변으로 대체합니다.');
            const response = await generateRuleBasedAnswer(question, data, targetColumns, queryConditions);
            if (alerts.length > 0) {
                const { formatAlerts: formatAlertsModule } = await import('./alert.js');
                response.answer += formatAlertsModule(alerts);
            }
            return response;
        }
        
        // 경고가 있으면 관련 메뉴얼 검색
        let manuals = [];
        if (alerts.length > 0) {
            const { searchManual } = await import('./manual.js');
            const manualPromises = alerts
                .filter(alert => alert.manual)
                .map(alert => searchManual(alert.manual.title || alert.manual.type));
            
            const manualResults = await Promise.all(manualPromises);
            manuals = manualResults.flat().filter((manual, index, self) => 
                index === self.findIndex(m => m.id === manual.id) // 중복 제거
            );
        }
        
        // LLM으로 답변 생성 (경고 정보 + 메뉴얼 내용 포함)
        const llmAnswer = await llmClient.generateAnswer(question, data, {
            targetColumns,
            queryConditions,
            alerts: alerts,  // 경고 정보 전달
            manuals: manuals  // 메뉴얼 내용 전달
        });
        
        // 제안 생성 (규칙 기반 로직 재사용)
        const suggestions = generateSuggestions(data, targetColumns, queryConditions);
        
        return {
            answer: llmAnswer,
            suggestions: suggestions
        };
        
    } catch (error) {
        console.error('LLM 답변 생성 오류:', error);
        // 오류 발생 시 규칙 기반 답변으로 대체
        console.log('규칙 기반 답변으로 대체합니다.');
        const response = await generateRuleBasedAnswer(question, data, targetColumns, queryConditions);
        if (alerts.length > 0) {
            const { formatAlerts: formatAlertsModule } = await import('./alert.js');
            response.answer += formatAlertsModule(alerts);
        }
        return response;
    }
}

// 규칙 기반 답변 생성 (기존 로직)
async function generateRuleBasedAnswer(question, data, targetColumns, queryConditions) {
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

// 제안 생성 함수 (LLM과 규칙 기반 모두에서 사용)
function generateSuggestions(data, targetColumns, queryConditions) {
    const suggestions = [];
    
    if (data.length === 0) {
        return suggestions;
    }
    
    const row = data[0]; // 첫 번째 데이터 사용
    
    // 수질 등급 제안
    if (targetColumns && targetColumns.some(col => ['pH', 'BOD', 'T-N', 'T-P'].includes(col))) {
        suggestions.push({
            type: 'water_quality',
            text: '이 지역의 전체 수질 등급을 자세히 보시겠어요?',
            action: () => showWaterQualityDetails(row)
        });
    }
    
    // 조류 경보 제안
    if (targetColumns && targetColumns.some(col => ['FAI', 'BAI', 'DAI', 'IAI'].includes(col))) {
        const algaeAlert = calculateAlgaeAlertLevel(row);
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
        
        // 시계열 변화 제안
        if (targetColumns && targetColumns.length > 0) {
            suggestions.push({
                type: 'timeseries',
                text: `이 지역의 ${targetColumns[0]} 변화 추이를 그래프로 보시겠어요?`,
                action: () => showTimeSeriesChart(locationCode, targetColumns[0])
            });
        }
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
    
    return suggestions;
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
async function showWaterQualityDetails(row) {
    const quality = calculateWaterQualityGrade(row);
    const details = `📊 **수질 등급 상세 정보**\n\n` +
                   `등급: ${quality.grade} (${quality.description})\n` +
                   `pH: ${quality.details.pH}\n` +
                   `BOD: ${quality.details.BOD}\n` +
                   `T-N: ${quality.details['T-N']}\n` +
                   `T-P: ${quality.details['T-P']}`;
    
    // 메시지로 표시
    if (window.addMessage) {
        window.addMessage('봇', details, 'bot');
    } else {
        console.error('addMessage 함수를 찾을 수 없습니다.');
    }
}

async function showAlgaeManual(level) {
    // 메뉴얼 모듈 호출
    try {
        const manuals = await window.apiClient.searchManual(`조류 ${level}`);
        if (manuals && manuals.length > 0) {
            let text = `📋 **조류 ${level} 대응 메뉴얼**\n\n`;
            manuals.forEach(manual => {
                text += `**${manual.title}**\n${manual.content}\n\n`;
            });
            if (window.addMessage) {
                window.addMessage('봇', text, 'bot');
            }
        }
    } catch (error) {
        console.error('메뉴얼 검색 오류:', error);
    }
}

async function showPrediction(locationCode) {
    // 예측 모듈 호출
    try {
        const prediction = await window.apiClient.getPrediction(locationCode);
        if (prediction) {
            const { formatPredictionResult } = await import('./prediction.js');
            const text = formatPredictionResult(prediction);
            if (window.addMessage) {
                window.addMessage('봇', text, 'bot');
            }
        }
    } catch (error) {
        console.error('예측 결과 가져오기 오류:', error);
        if (window.addMessage) {
            window.addMessage('봇', '예측 결과를 가져오는 중 오류가 발생했습니다.', 'error');
        }
    }
}

async function showTimeSeriesChart(locationCode, metric) {
    // 시각화 모듈 호출
    try {
        const { showTimeSeriesChart: showChart } = await import('./visualization.js');
        await showChart(locationCode, metric);
        
        // 시계열 탭으로 전환
        if (window.switchVisualizationTab) {
            window.switchVisualizationTab('chart');
        }
    } catch (error) {
        console.error('시계열 차트 표시 오류:', error);
        if (window.addMessage) {
            window.addMessage('봇', '시계열 차트를 표시하는 중 오류가 발생했습니다.', 'error');
        }
    }
}

async function showRelatedMetrics(row, metrics) {
    let text = `📊 **관련 지표 정보**\n\n`;
    metrics.forEach(metric => {
        const colName = findColumnInRow(row, metric);
        if (colName && row[colName] !== undefined) {
            text += `**${colName}**: ${row[colName]}\n`;
        }
    });
    
    if (window.addMessage) {
        window.addMessage('봇', text, 'bot');
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
