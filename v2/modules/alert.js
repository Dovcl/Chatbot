// 경고 시스템 모듈
// 수질, 녹조, 홍수 등 위험 상황 감지 및 알림

// 메인 함수: 경고 확인
export async function checkAlerts(row) {
    const alerts = [];
    
    // 1. 수질 경고
    const waterQualityAlerts = checkWaterQualityAlerts(row);
    alerts.push(...waterQualityAlerts);
    
    // 2. 조류 경고
    const algaeAlerts = checkAlgaeAlerts(row);
    alerts.push(...algaeAlerts);
    
    // 3. 홍수 경고 (수문 데이터가 있는 경우)
    const floodAlerts = checkFloodAlerts(row);
    alerts.push(...floodAlerts);
    
    return alerts;
}

// 수질 경고 확인
function checkWaterQualityAlerts(row) {
    const alerts = [];
    const CONFIG = window.CONFIG || {};
    const grades = CONFIG.WATER_QUALITY_GRADES || {};
    
    const pH = parseFloat(row['pH'] || row['ph'] || 0);
    const BOD = parseFloat(row['BOD'] || 0);
    const TN = parseFloat(row['T-N'] || 0);
    const TP = parseFloat(row['T-P'] || 0);
    
    // pH 경고
    if (pH < 5.0 || pH > 10.0) {
        alerts.push({
            type: 'water_quality',
            level: 'critical',
            message: `⚠️ pH가 ${pH}로 매우 위험한 수준입니다. (정상 범위: 6.5~8.5)`,
            manual: { title: '수질 사고 대응 메뉴얼', type: 'water_quality_critical' }
        });
    } else if (pH < 5.5 || pH > 9.5) {
        alerts.push({
            type: 'water_quality',
            level: 'warning',
            message: `⚠️ pH가 ${pH}로 주의가 필요합니다. (정상 범위: 6.5~8.5)`,
            manual: { title: '수질 관리 가이드', type: 'water_quality_warning' }
        });
    }
    
    // BOD 경고
    if (BOD > 5.0) {
        alerts.push({
            type: 'water_quality',
            level: 'critical',
            message: `⚠️ BOD가 ${BOD}로 매우 높습니다. (정상: 1.0 이하)`,
            manual: { title: '수질 오염 대응 메뉴얼', type: 'water_quality_critical' }
        });
    } else if (BOD > 3.0) {
        alerts.push({
            type: 'water_quality',
            level: 'warning',
            message: `⚠️ BOD가 ${BOD}로 높습니다. (정상: 1.0 이하)`,
            manual: { title: '수질 관리 가이드', type: 'water_quality_warning' }
        });
    }
    
    // T-N 경고
    if (TN > 1.0) {
        alerts.push({
            type: 'water_quality',
            level: 'warning',
            message: `⚠️ 총질소(T-N)가 ${TN}로 높습니다. (정상: 0.2 이하)`,
            manual: { title: '영양염류 관리 가이드', type: 'nutrient_warning' }
        });
    }
    
    // T-P 경고
    if (TP > 0.2) {
        alerts.push({
            type: 'water_quality',
            level: 'warning',
            message: `⚠️ 총인(T-P)이 ${TP}로 높습니다. (정상: 0.02 이하)`,
            manual: { title: '영양염류 관리 가이드', type: 'nutrient_warning' }
        });
    }
    
    // 종합 등급 확인
    const grade = calculateWaterQualityGrade(row);
    if (grade.grade === 'IV등급' || grade.grade === 'V등급') {
        alerts.push({
            type: 'water_quality',
            level: 'critical',
            message: `🚨 수질 등급이 ${grade.grade}입니다. 즉시 조치가 필요합니다.`,
            manual: { title: '수질 사고 긴급 대응 메뉴얼', type: 'water_quality_emergency' }
        });
    }
    
    return alerts;
}

// 조류 경고 확인
function checkAlgaeAlerts(row) {
    const alerts = [];
    const CONFIG = window.CONFIG || {};
    const levels = CONFIG.ALGAE_ALERT_LEVELS || {};
    
    const fai = parseFloat(row['FAI'] || 0);
    const bai = parseFloat(row['BAI'] || 0);
    const dai = parseFloat(row['DAI'] || 0);
    const iai = parseFloat(row['IAI'] || 0);
    
    // FAI 경고
    if (fai >= 80) {
        alerts.push({
            type: 'algae',
            level: 'critical',
            message: `🚨 조류 경보 단계입니다! FAI: ${fai} (정상: 40 이하)`,
            manual: { title: '조류 대량 발생 긴급 대응 메뉴얼', type: 'algae_emergency' }
        });
    } else if (fai >= 60) {
        alerts.push({
            type: 'algae',
            level: 'warning',
            message: `⚠️ 조류 주의 단계입니다. FAI: ${fai} (정상: 40 이하)`,
            manual: { title: '조류 발생 대응 가이드', type: 'algae_warning' }
        });
    } else if (fai >= 40) {
        alerts.push({
            type: 'algae',
            level: 'info',
            message: `💡 조류 관심 단계입니다. FAI: ${fai} (정상: 40 이하)`,
            manual: { title: '조류 예방 가이드', type: 'algae_info' }
        });
    }
    
    // BAI, DAI, IAI도 확인
    if (bai > 80 || dai > 80 || iai > 80) {
        alerts.push({
            type: 'algae',
            level: 'warning',
            message: `⚠️ 일부 조류 지표가 높습니다. (BAI: ${bai}, DAI: ${dai}, IAI: ${iai})`,
            manual: { title: '조류 발생 대응 가이드', type: 'algae_warning' }
        });
    }
    
    return alerts;
}

// 홍수 경고 확인 (수문 데이터가 있는 경우)
function checkFloodAlerts(row) {
    const alerts = [];
    
    // 수위 데이터 확인
    const waterDepth = parseFloat(row['Wdepth'] || row['수위'] || 0);
    const velocity = parseFloat(row['Velocity'] || row['유속'] || 0);
    const precipitation = parseFloat(row['Prec'] || row['강수량'] || 0);
    
    // 수위 경고 (임계값은 실제 기준에 맞게 조정 필요)
    if (waterDepth > 50) {
        alerts.push({
            type: 'flood',
            level: 'critical',
            message: `🚨 수위가 ${waterDepth}m로 매우 높습니다. 홍수 위험!`,
            manual: { title: '홍수 긴급 대응 메뉴얼', type: 'flood_emergency' }
        });
    } else if (waterDepth > 30) {
        alerts.push({
            type: 'flood',
            level: 'warning',
            message: `⚠️ 수위가 ${waterDepth}m로 높습니다. 주의 필요.`,
            manual: { title: '홍수 대응 가이드', type: 'flood_warning' }
        });
    }
    
    // 강수량 경고
    if (precipitation > 100) {
        alerts.push({
            type: 'flood',
            level: 'critical',
            message: `🚨 강수량이 ${precipitation}mm로 매우 많습니다. 홍수 위험!`,
            manual: { title: '홍수 긴급 대응 메뉴얼', type: 'flood_emergency' }
        });
    } else if (precipitation > 50) {
        alerts.push({
            type: 'flood',
            level: 'warning',
            message: `⚠️ 강수량이 ${precipitation}mm로 많습니다. 주의 필요.`,
            manual: { title: '홍수 대응 가이드', type: 'flood_warning' }
        });
    }
    
    return alerts;
}

// 수질 등급 계산 (proactive.js와 동일한 로직)
function calculateWaterQualityGrade(row) {
    const CONFIG = window.CONFIG || {};
    const grades = CONFIG.WATER_QUALITY_GRADES || {};
    
    const pH = parseFloat(row['pH'] || row['ph'] || 0);
    const BOD = parseFloat(row['BOD'] || 0);
    const TN = parseFloat(row['T-N'] || 0);
    const TP = parseFloat(row['T-P'] || 0);
    
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
    
    return { grade, description };
}

// 경고 포맷팅
export function formatAlerts(alerts) {
    if (alerts.length === 0) return '';
    
    let text = '\n\n⚠️ **경고 알림**\n';
    
    // 심각도별로 정렬
    const sortedAlerts = alerts.sort((a, b) => {
        const levels = { 'critical': 3, 'warning': 2, 'info': 1 };
        return (levels[b.level] || 0) - (levels[a.level] || 0);
    });
    
    sortedAlerts.forEach(alert => {
        const icon = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : '💡';
        text += `${icon} ${alert.message}\n`;
        
        if (alert.manual) {
            text += `   📋 대응 메뉴얼: ${alert.manual.title}\n`;
        }
    });
    
    return text;
}

// 경고 레벨별 색상
export function getAlertColor(level) {
    const colors = {
        'critical': '#dc3545',  // 빨간색
        'warning': '#ffc107',   // 노란색
        'info': '#17a2b8'       // 파란색
    };
    return colors[level] || '#6c757d';
}
