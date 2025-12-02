// 시각화 모듈
// 시계열 차트, 지도, 예측 결과 표시

let timeSeriesChart = null;
let map = null;

// 시각화 업데이트 (메인 함수)
export function updateVisualizations(data, targetColumns, queryConditions) {
    if (!data || data.length === 0) return;
    
    // 시계열 차트 업데이트
    if (targetColumns && targetColumns.length > 0) {
        updateTimeSeriesChart(data, targetColumns[0]);
    }
    
    // 지도 업데이트
    updateMap(data, targetColumns);
    
    // 예측 결과 표시 (데이터가 1개일 때)
    if (data.length === 1) {
        showPredictionPreview(data[0]);
    }
}

// 시계열 차트 업데이트
export function updateTimeSeriesChart(data, metric) {
    if (!window.Chart) {
        console.warn('Chart.js가 로드되지 않았습니다.');
        return;
    }
    
    const ctx = document.getElementById('timeSeriesChart');
    if (!ctx) return;
    
    // Chart.js의 getChart로 기존 차트 확인 및 제거
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        console.log('🗑️ 기존 차트 제거 중...');
        existingChart.destroy();
    }
    
    // 모듈 변수도 확인
    if (timeSeriesChart) {
        try {
            timeSeriesChart.destroy();
        } catch (e) {
            console.warn('차트 destroy 중 오류 (무시):', e);
        }
        timeSeriesChart = null;
    }
    
    // 전역 변수도 확인 (script.js에서 선언한 것)
    if (window.timeSeriesChart) {
        try {
            window.timeSeriesChart.destroy();
        } catch (e) {
            console.warn('전역 차트 destroy 중 오류 (무시):', e);
        }
        window.timeSeriesChart = null;
    }
    
    // 데이터 준비
    const labels = [];
    const values = [];
    
    // 날짜 순으로 정렬
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a['Date'] || a['date'] || 0);
        const dateB = new Date(b['Date'] || b['date'] || 0);
        return dateA - dateB;
    });
    
    sortedData.forEach(row => {
        const date = row['Date'] || row['date'] || '';
        const value = parseFloat(row[metric] || 0);
        
        if (date && !isNaN(value)) {
            labels.push(date);
            values.push(value);
        }
    });
    
    // 데이터가 없으면 차트 생성하지 않음
    if (labels.length === 0 || values.length === 0) {
        console.warn('시계열 데이터가 없습니다.');
        return;
    }
    
    // 데이터가 1개만 있으면 안내 메시지 표시
    if (labels.length === 1) {
        console.log('ℹ️ 시계열 데이터가 1개만 있습니다. 여러 날짜의 데이터를 조회하면 시계열 그래프를 볼 수 있습니다.');
    }
    
    // 차트 생성
    try {
        timeSeriesChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: metric,
                    data: values,
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: labels.length === 1 ? 8 : 4, // 데이터가 1개면 점을 크게
                    pointHoverRadius: labels.length === 1 ? 10 : 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${metric} 시계열 변화${labels.length === 1 ? ' (단일 데이터)' : ''}`
                    },
                    legend: {
                        display: true
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: metric
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '날짜'
                        }
                    }
                }
            }
        });
        
        // 전역 변수에도 저장 (script.js와 공유)
        window.timeSeriesChart = timeSeriesChart;
        
        console.log(`✅ 시계열 차트 생성 완료 (${labels.length}개 데이터)`);
    } catch (error) {
        console.error('❌ 차트 생성 오류:', error);
    }
}

// 시계열 차트 표시 (특정 위치코드와 지표로)
export async function showTimeSeriesChart(locationCode, metric) {
    if (!window.supabase) {
        console.warn('Supabase가 초기화되지 않았습니다.');
        return;
    }
    
    try {
        // Supabase에서 해당 위치의 시계열 데이터 가져오기
        const { data, error } = await window.supabase
            .from('excel_data')
            .select('row_data, Date')
            .or(`row_data->>분류코드.ilike.%${locationCode}%,row_data->>조사구간명.ilike.%${locationCode}%`)
            .order('Date', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const extractedData = data.map(row => row.row_data);
            updateTimeSeriesChart(extractedData, metric);
            
            // 시계열 탭으로 전환
            switchToTab('chart');
        } else {
            console.warn('시계열 데이터를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('시계열 차트 오류:', error);
    }
}

// 지도 업데이트
export function updateMap(data, targetColumns) {
    if (!window.L) {
        console.warn('Leaflet이 로드되지 않았습니다.');
        return;
    }
    
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    
    // 기존 지도 확인
    let existingMap = map || window.map;
    
    // 지도가 없거나 컨테이너가 이미 초기화되었는지 확인
    if (!existingMap) {
        // Leaflet이 컨테이너에서 직접 가져올 수 없으므로
        // 전역 변수나 다른 방법으로 찾아야 함
        // 일단 새로 만들지 말고 기존 것을 찾아보기
        if (window.map) {
            existingMap = window.map;
        }
        
        // 여전히 없으면 새로 초기화
        if (!existingMap) {
            try {
                map = window.L.map('map-container').setView([37.5, 127.5], 10);
                window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                
                window.map = map;
                console.log('✅ 지도 초기화 완료');
            } catch (error) {
                console.error('❌ 지도 초기화 실패:', error);
                return;
            }
        } else {
            map = existingMap;
        }
    }
    
    // 기존 마커만 제거 (타일 레이어는 유지)
    map.eachLayer(layer => {
        if (layer instanceof window.L.Marker || layer instanceof window.L.CircleMarker) {
            map.removeLayer(layer);
        }
    });
    
    // 데이터가 없으면 리턴
    if (!data || data.length === 0) return;
    
    // 마커 추가
    data.forEach(row => {
        const lat = parseFloat(row['위도'] || row['latitude'] || row['lat'] || 0);
        const lon = parseFloat(row['경도'] || row['longitude'] || row['lon'] || 0);
        
        if (lat && lon && lat !== 0 && lon !== 0) {
            // 값에 따라 색상 결정
            let color = 'blue';
            let value = '';
            
            if (targetColumns && targetColumns.length > 0) {
                const metric = targetColumns[0];
                value = row[metric] || row[findColumnInRow(row, metric)] || '';
                
                if (metric === 'pH') {
                    color = getColorByPH(parseFloat(value));
                } else if (['FAI', 'BAI', 'DAI', 'IAI'].includes(metric)) {
                    color = getColorByAlgae(parseFloat(value));
                } else {
                    color = getColorByValue(parseFloat(value));
                }
            }
            
            const locationName = row['조사구간명'] || row['분류코드'] || '위치 정보 없음';
            
            // 팝업 내용 생성
            let popupContent = `<strong>${locationName}</strong><br>`;
            if (value) {
                popupContent += `${targetColumns[0]}: ${value}<br>`;
            }
            if (row['Date']) {
                popupContent += `날짜: ${row['Date']}<br>`;
            }
            
            // 마커 생성
            const marker = window.L.circleMarker([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 8,
                weight: 2
            }).addTo(map);
            
            marker.bindPopup(popupContent);
        }
    });
    
    // 마커가 있으면 해당 위치로 지도 이동
    if (data.length > 0) {
        const firstRow = data[0];
        const lat = parseFloat(firstRow['위도'] || firstRow['latitude'] || firstRow['lat'] || 0);
        const lon = parseFloat(firstRow['경도'] || firstRow['longitude'] || firstRow['lon'] || 0);
        
        if (lat && lon && lat !== 0 && lon !== 0) {
            map.setView([lat, lon], 12);
        }
    }
}

// 예측 결과 미리보기
async function showPredictionPreview(row) {
    const container = document.getElementById('prediction-content');
    if (!container) return;
    
    const locationCode = row['분류코드'] || row['조사구간명'] || '';
    
    if (locationCode) {
        // 기존 내용 제거
        container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.style.padding = '20px';
        wrapper.innerHTML = `
            <h3>🔮 예측 결과</h3>
            <p>위치: <strong>${locationCode}</strong></p>
            <p>예측 기능을 사용하려면 "다음주 예측" 버튼을 클릭하세요.</p>
            <button id="prediction-btn" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                다음주 예측 보기
            </button>
            <div id="prediction-result" style="margin-top: 20px;"></div>
        `;
        
        container.appendChild(wrapper);
        
        // 버튼 이벤트 리스너 추가
        const btn = document.getElementById('prediction-btn');
        if (btn) {
            btn.onclick = async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = '예측 중...';
                    
                    // 예측 결과 가져오기
                    const { getPrediction } = await import('./prediction.js');
                    const prediction = await getPrediction(locationCode);
                    
                    // 결과 표시
                    const { formatPredictionHTML } = await import('./prediction.js');
                    const resultDiv = document.getElementById('prediction-result');
                    if (resultDiv) {
                        resultDiv.innerHTML = formatPredictionHTML(prediction);
                    }
                    
                    btn.style.display = 'none'; // 버튼 숨기기
                } catch (error) {
                    console.error('예측 오류:', error);
                    const resultDiv = document.getElementById('prediction-result');
                    if (resultDiv) {
                        resultDiv.innerHTML = `<p style="color: red;">❌ 예측 중 오류가 발생했습니다: ${error.message}</p>`;
                    }
                    btn.disabled = false;
                    btn.textContent = '다음주 예측 보기';
                }
            };
        }
    } else {
        container.innerHTML = '<p>예측할 위치 정보가 없습니다.</p>';
    }
}

// pH 값에 따른 색상
function getColorByPH(pH) {
    if (pH >= 6.5 && pH <= 8.5) return 'green';
    if ((pH >= 6.0 && pH < 6.5) || (pH > 8.5 && pH <= 9.0)) return 'lightgreen';
    if ((pH >= 5.5 && pH < 6.0) || (pH > 9.0 && pH <= 9.5)) return 'yellow';
    if ((pH >= 5.0 && pH < 5.5) || (pH > 9.5 && pH <= 10.0)) return 'orange';
    return 'red';
}

// 조류 지표에 따른 색상
function getColorByAlgae(value) {
    if (value < 40) return 'green';
    if (value < 60) return 'yellow';
    if (value < 80) return 'orange';
    return 'red';
}

// 일반 값에 따른 색상
function getColorByValue(value) {
    if (value < 0) return 'blue';
    if (value < 1) return 'green';
    if (value < 5) return 'yellow';
    if (value < 10) return 'orange';
    return 'red';
}

// 행에서 컬럼 찾기
function findColumnInRow(row, columnName) {
    const keys = Object.keys(row);
    
    if (keys.includes(columnName)) return columnName;
    
    const found = keys.find(key => key.toLowerCase() === columnName.toLowerCase());
    if (found) return found;
    
    const foundPartial = keys.find(key => 
        key.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(key.toLowerCase())
    );
    
    return foundPartial || null;
}

// 탭 전환
function switchToTab(tabName) {
    // 탭 버튼 업데이트
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // 패널 표시/숨김
    document.querySelectorAll('.viz-panel').forEach(panel => {
        const isActive = panel.id.includes(tabName);
        panel.classList.toggle('active', isActive);
        
        // 확실하게 숨기기
        if (!isActive) {
            panel.style.display = 'none';
            panel.style.opacity = '0';
            panel.style.visibility = 'hidden';
            panel.style.zIndex = '1';
        } else {
            panel.style.display = 'block';
            panel.style.opacity = '1';
            panel.style.visibility = 'visible';
            panel.style.zIndex = '2';
        }
    });
    
    // 차트가 있는 경우, 예측 탭일 때 차트를 완전히 숨기기
    if (tabName === 'prediction') {
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.style.display = 'none';
        }
        const chartCanvas = document.getElementById('timeSeriesChart');
        if (chartCanvas) {
            chartCanvas.style.display = 'none';
        }
    } else if (tabName === 'chart') {
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.style.display = 'block';
        }
        const chartCanvas = document.getElementById('timeSeriesChart');
        if (chartCanvas) {
            chartCanvas.style.display = 'block';
        }
    }
}

// 전역으로 내보내기
window.updateVisualizations = updateVisualizations;
window.showTimeSeriesChart = showTimeSeriesChart;
