// 예측 모델 모듈
// 현재는 모의 데이터, 나중에 실제 예측 모델 API로 교체

// 메인 함수: 예측 결과 가져오기
export async function getPrediction(locationCode, date = null) {
    // 현재는 모의 예측 데이터 반환
    // 나중에 실제 예측 모델 API 호출로 교체
    
    const targetDate = date || getNextWeekDate();
    
    // 모의 예측 데이터 생성
    const prediction = generateMockPrediction(locationCode, targetDate);
    
    return prediction;
}

// 모의 예측 데이터 생성 (프로토타입용)
function generateMockPrediction(locationCode, date) {
    // 실제 데이터를 기반으로 예측값 생성 (간단한 로직)
    // 나중에 실제 모델로 교체
    
    // 현재 데이터에서 평균값 계산
    const currentData = window.currentData || [];
    const locationData = currentData.filter(row => 
        (row['분류코드'] && row['분류코드'].includes(locationCode)) ||
        (row['조사구간명'] && row['조사구간명'].includes(locationCode))
    );
    
    // 기본값
    const baseValues = {
        pH: 7.0,
        BOD: 1.0,
        'T-N': 0.3,
        'T-P': 0.05,
        FAI: 30,
        BAI: 30,
        DAI: 30,
        IAI: 30
    };
    
    // 실제 데이터가 있으면 평균 계산
    if (locationData.length > 0) {
        const metrics = ['pH', 'BOD', 'T-N', 'T-P', 'FAI', 'BAI', 'DAI', 'IAI'];
        metrics.forEach(metric => {
            const values = locationData
                .map(row => parseFloat(row[metric] || 0))
                .filter(v => !isNaN(v) && v > 0);
            
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                baseValues[metric] = avg;
            }
        });
    }
    
    // 예측값 생성 (간단한 변동 추가)
    const prediction = {
        location_code: locationCode,
        date: date,
        water_quality: {
            grade: calculatePredictedGrade(baseValues),
            pH: (baseValues.pH + (Math.random() - 0.5) * 0.5).toFixed(2),
            BOD: (baseValues.BOD + (Math.random() - 0.5) * 0.2).toFixed(2),
            'T-N': (baseValues['T-N'] + (Math.random() - 0.5) * 0.1).toFixed(3),
            'T-P': (baseValues['T-P'] + (Math.random() - 0.5) * 0.01).toFixed(3)
        },
        algae_alert: {
            level: calculatePredictedAlgaeLevel(baseValues.FAI),
            FAI: (baseValues.FAI + (Math.random() - 0.5) * 10).toFixed(1),
            BAI: (baseValues.BAI + (Math.random() - 0.5) * 10).toFixed(1),
            DAI: (baseValues.DAI + (Math.random() - 0.5) * 10).toFixed(1),
            IAI: (baseValues.IAI + (Math.random() - 0.5) * 10).toFixed(1),
            description: getAlgaeDescription(baseValues.FAI)
        },
        warnings: []
    };
    
    // 경고 생성
    const pH = parseFloat(prediction.water_quality.pH);
    if (pH < 5.5 || pH > 9.5) {
        prediction.warnings.push({
            type: 'water_quality',
            message: `pH가 ${pH}로 예상되어 주의가 필요합니다.`,
            manual: { title: '수질 관리 가이드', type: 'water_quality_warning' }
        });
    }
    
    const fai = parseFloat(prediction.algae_alert.FAI);
    if (fai >= 60) {
        prediction.warnings.push({
            type: 'algae',
            message: `조류 지표(FAI: ${fai})가 높게 예상됩니다.`,
            manual: { title: '조류 발생 대응 가이드', type: 'algae_warning' }
        });
    }
    
    return prediction;
}

// 예측된 수질 등급 계산
function calculatePredictedGrade(values) {
    const pH = parseFloat(values.pH);
    const BOD = parseFloat(values.BOD);
    const TN = parseFloat(values['T-N']);
    const TP = parseFloat(values['T-P']);
    
    // 간단한 등급 판정
    if (pH >= 6.5 && pH <= 8.5 && BOD <= 1.0 && TN <= 0.2 && TP <= 0.02) {
        return 'I등급';
    } else if (pH >= 6.0 && pH <= 9.0 && BOD <= 2.0 && TN <= 0.3 && TP <= 0.04) {
        return 'II등급';
    } else if (pH >= 5.5 && pH <= 9.5 && BOD <= 3.0 && TN <= 0.5 && TP <= 0.1) {
        return 'III등급';
    } else if (pH >= 5.0 && pH <= 10.0 && BOD <= 5.0 && TN <= 1.0 && TP <= 0.2) {
        return 'IV등급';
    } else {
        return 'V등급';
    }
}

// 예측된 조류 경보 단계 계산
function calculatePredictedAlgaeLevel(fai) {
    if (fai >= 80) return '경보';
    if (fai >= 60) return '주의';
    if (fai >= 40) return '관심';
    return '정상';
}

// 조류 설명
function getAlgaeDescription(fai) {
    if (fai >= 80) return '조류 대량 발생 위험';
    if (fai >= 60) return '조류 발생 주의';
    if (fai >= 40) return '조류 발생 관심';
    return '조류 발생 없음';
}

// 다음주 날짜 계산
function getNextWeekDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
}

// 예측 결과를 텍스트로 포맷팅
export function formatPredictionResult(prediction) {
    if (!prediction) {
        return '예측 데이터를 가져올 수 없습니다.';
    }
    
    let text = `📅 **다음주 예측 결과** (${prediction.date})\n\n`;
    
    // 위치 정보
    if (prediction.location_code) {
        text += `📍 위치: ${prediction.location_code}\n\n`;
    }
    
    // 수질 등급 예측
    if (prediction.water_quality) {
        text += `💧 **수질 등급**: ${prediction.water_quality.grade}\n`;
        text += `   - pH: ${prediction.water_quality.pH}\n`;
        text += `   - BOD: ${prediction.water_quality.BOD}\n`;
        text += `   - T-N: ${prediction.water_quality['T-N']}\n`;
        text += `   - T-P: ${prediction.water_quality['T-P']}\n\n`;
    }
    
    // 조류 경보 예측
    if (prediction.algae_alert) {
        text += `🌊 **조류 경보 단계**: ${prediction.algae_alert.level}\n`;
        text += `   - FAI: ${prediction.algae_alert.FAI}\n`;
        text += `   - BAI: ${prediction.algae_alert.BAI}\n`;
        text += `   - DAI: ${prediction.algae_alert.DAI}\n`;
        text += `   - IAI: ${prediction.algae_alert.IAI}\n`;
        text += `   - ${prediction.algae_alert.description}\n\n`;
    }
    
    // 경고 메시지
    if (prediction.warnings && prediction.warnings.length > 0) {
        text += `⚠️ **경고**:\n`;
        prediction.warnings.forEach(warning => {
            text += `   - ${warning.message}\n`;
            if (warning.manual) {
                text += `     💡 대응 메뉴얼: ${warning.manual.title}\n`;
            }
        });
    }
    
    text += `\n💡 참고: 현재는 모의 예측 데이터입니다. 실제 예측 모델 연동 시 더 정확한 결과를 제공합니다.`;
    
    return text;
}

// 예측 결과를 HTML로 포맷팅 (시각화용)
export function formatPredictionHTML(prediction) {
    if (!prediction) {
        return '<p>예측 데이터를 가져올 수 없습니다.</p>';
    }
    
    let html = `<div style="padding: 20px;">`;
    html += `<h3>📅 다음주 예측 결과 (${prediction.date})</h3>`;
    
    if (prediction.location_code) {
        html += `<p><strong>📍 위치:</strong> ${prediction.location_code}</p>`;
    }
    
    if (prediction.water_quality) {
        html += `<div style="margin: 15px 0; padding: 15px; background: #f0f0f0; border-radius: 8px;">`;
        html += `<h4>💧 수질 등급: ${prediction.water_quality.grade}</h4>`;
        html += `<ul>`;
        html += `<li>pH: ${prediction.water_quality.pH}</li>`;
        html += `<li>BOD: ${prediction.water_quality.BOD}</li>`;
        html += `<li>T-N: ${prediction.water_quality['T-N']}</li>`;
        html += `<li>T-P: ${prediction.water_quality['T-P']}</li>`;
        html += `</ul></div>`;
    }
    
    if (prediction.algae_alert) {
        const color = prediction.algae_alert.level === '경보' ? 'red' : 
                     prediction.algae_alert.level === '주의' ? 'orange' : 
                     prediction.algae_alert.level === '관심' ? 'yellow' : 'green';
        
        html += `<div style="margin: 15px 0; padding: 15px; background: #f0f0f0; border-radius: 8px; border-left: 4px solid ${color};">`;
        html += `<h4>🌊 조류 경보 단계: ${prediction.algae_alert.level}</h4>`;
        html += `<ul>`;
        html += `<li>FAI: ${prediction.algae_alert.FAI}</li>`;
        html += `<li>BAI: ${prediction.algae_alert.BAI}</li>`;
        html += `<li>DAI: ${prediction.algae_alert.DAI}</li>`;
        html += `<li>IAI: ${prediction.algae_alert.IAI}</li>`;
        html += `</ul>`;
        html += `<p>${prediction.algae_alert.description}</p>`;
        html += `</div>`;
    }
    
    if (prediction.warnings && prediction.warnings.length > 0) {
        html += `<div style="margin: 15px 0; padding: 15px; background: #fff3cd; border-radius: 8px;">`;
        html += `<h4>⚠️ 경고</h4>`;
        html += `<ul>`;
        prediction.warnings.forEach(warning => {
            html += `<li>${warning.message}`;
            if (warning.manual) {
                html += ` <small>(대응 메뉴얼: ${warning.manual.title})</small>`;
            }
            html += `</li>`;
        });
        html += `</ul></div>`;
    }
    
    html += `</div>`;
    
    return html;
}
