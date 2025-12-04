// 환경 데이터 RAG 챗봇 v2 - 메인 로직
// 나중에 백엔드로 분리할 때 이 파일은 API 호출만 하도록 변경

// 전역 변수
let supabase = null;
let currentData = [];
// timeSeriesChart 변수 제거 - visualization.js에서 관리
let map = null;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initVisualization();
    
    // Supabase 상태 확인 (조용하게, 경고 없이)
    setTimeout(() => {
        if (window.supabase) {
            console.log('✅ Supabase 준비 완료');
        } else {
            // 경고 없이 조용히 대기 (질문할 때 다시 확인)
            console.log('ℹ️ Supabase는 질문 시 자동으로 확인됩니다.');
        }
    }, 2000);
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 파일 업로드
    const dataFileInput = document.getElementById('dataFile');
    const fileNameSpan = document.getElementById('fileName');
    
    dataFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = `📄 ${file.name}`;
            await handleFileUpload(file);
        }
    });
    
    // 데이터 삭제
    document.getElementById('deleteSupabaseBtn').addEventListener('click', handleDeleteData);
    
    // 메시지 전송
    document.getElementById('sendBtn').addEventListener('click', handleSendMessage);
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    
    // 시각화 탭 전환
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchVisualizationTab(e.target.dataset.tab);
        });
    });
}

// 메시지 처리 (핵심 로직)
async function handleSendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // 사용자 메시지 표시
    addMessage('사용자', message, 'user');
    userInput.value = '';
    
    // 로딩 표시
    const loadingId = addMessage('봇', '답변을 생성하는 중...', 'bot');
    
    try {
        // Supabase 준비 대기
        const currentSupabase = await waitForSupabase(5000);
        
        if (!currentSupabase) {
            throw new Error('Supabase가 초기화되지 않았습니다. 페이지를 새로고침하거나 supabase-config.js를 확인해주세요.');
        }
        
        console.log('✅ Supabase 사용 가능:', currentSupabase);
        
        // 1. 데이터 검색 (API 클라이언트 사용)
        const queryResult = await window.apiClient.queryData(message, { supabase: currentSupabase });
        
        // 2. 경고 확인 (LLM이 경고 정보를 자연스럽게 포함하도록 먼저 확인)
        let alerts = [];
        if (queryResult.data.length > 0) {
            const { checkAlerts } = await import('./modules/alert.js');
            alerts = await checkAlerts(queryResult.data[0]);
        }
        
        // 3. 능동적 답변 생성 (경고 정보 포함)
        const { generateProactiveAnswer } = await import('./modules/proactive.js');
        const response = await generateProactiveAnswer(
            message,
            queryResult.data,
            queryResult.targetColumns,
            queryResult.queryConditions,
            alerts  // 경고 정보 전달
        );
        
        // 4. 답변 표시
        removeMessage(loadingId);
        addMessage('봇', response.answer, 'bot');
        
        // 5. 제안 버튼 표시
        if (response.suggestions && response.suggestions.length > 0) {
            const { renderSuggestions } = await import('./modules/proactive.js');
            renderSuggestions(response.suggestions);
        }
        
        // 6. 시각화 업데이트
        if (queryResult.data.length > 0) {
            const { updateVisualizations } = await import('./modules/visualization.js');
            updateVisualizations(queryResult.data, queryResult.targetColumns, queryResult.queryConditions);
        }
        
    } catch (error) {
        console.error('❌ 메시지 처리 오류:', error);
        console.error('❌ 오류 스택:', error.stack);
        removeMessage(loadingId);
        addMessage('봇', `❌ 오류가 발생했습니다: ${error.message}`, 'error');
    }
}

// 파일 업로드 처리
async function handleFileUpload(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    addMessage('시스템', `${fileExtension.toUpperCase()} 파일을 읽는 중...`, 'bot');
    
    try {
        let data;
        
        if (fileExtension === 'csv') {
            data = await readCSVFile(file);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            data = await readExcelFile(file);
        } else {
            throw new Error('지원하지 않는 파일 형식입니다. (.xlsx, .xls, .csv만 지원)');
        }
        
        currentData = data;
        window.currentData = data; // 전역으로도 설정
        
        // Supabase에 저장 (window.supabase 직접 사용)
        const currentSupabase = window.supabase;
        if (currentSupabase) {
            try {
                addMessage('시스템', `📤 Supabase에 데이터 저장 중...`, 'bot');
                await saveDataToSupabase(data, file.name, currentSupabase);
                addMessage('시스템', `✅ ${data.length}개의 데이터를 성공적으로 불러왔습니다!`, 'success');
                addMessage('시스템', `☁️ Supabase에 데이터가 저장되었습니다.`, 'success');
            } catch (supabaseError) {
                console.error('Supabase 저장 실패:', supabaseError);
                addMessage('시스템', `✅ ${data.length}개의 데이터를 메모리에 불러왔습니다!`, 'success');
                addMessage('시스템', `⚠️ Supabase 저장 실패: ${supabaseError.message}`, 'error');
            }
        } else {
            addMessage('시스템', `✅ ${data.length}개의 데이터를 메모리에 불러왔습니다!`, 'success');
            // 경고 메시지 제거 (너무 많이 표시됨)
            console.warn('⚠️ Supabase가 초기화되지 않아 메모리에만 저장됩니다.');
        }
    } catch (error) {
        console.error('파일 처리 오류:', error);
        addMessage('시스템', `❌ 오류: ${error.message}`, 'error');
    }
}

// CSV 파일 읽기
function readCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const data = parseCSV(text);
                if (data.length === 0) {
                    reject(new Error('CSV 파일에 데이터가 없습니다.'));
                    return;
                }
                resolve(data);
            } catch (error) {
                reject(new Error('CSV 파일을 읽을 수 없습니다: ' + error.message));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

// CSV 파싱
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index].trim();
        });
        data.push(row);
    }
    
    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current);
    return values;
}

// Excel 파일 읽기
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
                
                if (jsonData.length === 0) {
                    reject(new Error('엑셀 파일에 데이터가 없습니다.'));
                    return;
                }
                
                resolve(jsonData);
            } catch (error) {
                reject(new Error('엑셀 파일을 읽을 수 없습니다: ' + error.message));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Supabase에 데이터 저장
async function saveDataToSupabase(data, filename, supabaseInstance) {
    const currentSupabase = supabaseInstance || window.supabase || supabase;
    
    if (!currentSupabase) {
        throw new Error('Supabase가 초기화되지 않았습니다.');
    }
    
    try {
        const BATCH_SIZE = 1000;
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batchData = data.slice(i, i + BATCH_SIZE);
            const rowsToInsert = batchData.map((row, index) => ({
                row_data: row,
                row_index: i + index,
                filename: filename,
                uploaded_at: new Date().toISOString()
            }));
            
            const { error } = await currentSupabase
                .from('excel_data')
                .insert(rowsToInsert);
            
            if (error) throw error;
        }
        
        return true;
    } catch (error) {
        console.error('Supabase 저장 오류:', error);
        throw error;
    }
}

// Supabase 직접 초기화 함수 (fallback)
function initializeSupabaseDirectly() {
    if (window.supabase) {
        return window.supabase;
    }
    
    if (!window.supabaseConfig || !window.supabaseConfig.url || !window.supabaseConfig.anonKey) {
        console.error('❌ Supabase 설정이 없습니다.');
        return null;
    }
    
    try {
        // 동적 import로 Supabase 클라이언트 생성
        import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({ createClient }) => {
            const supabase = createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
            window.supabase = supabase;
            console.log('✅ Supabase 직접 초기화 완료');
            return supabase;
        });
    } catch (error) {
        console.error('❌ Supabase 직접 초기화 실패:', error);
        return null;
    }
}

// Supabase 준비 대기 함수 (개선 버전)
async function waitForSupabase(timeout = 10000) {
    // 이미 준비되어 있으면 바로 반환
    if (window.supabase) {
        console.log('✅ Supabase 이미 준비됨');
        return window.supabase;
    }
    
    console.log('⏳ Supabase 대기 시작...');
    
    // supabase-init.js가 실행되지 않았을 수 있으므로 직접 초기화 시도
    if (window.supabaseConfig && window.supabaseConfig.url && window.supabaseConfig.anonKey) {
        try {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            const supabase = createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
            window.supabase = supabase;
            console.log('✅ Supabase 직접 초기화 완료 (fallback)');
            return supabase;
        } catch (error) {
            console.error('❌ Supabase 직접 초기화 실패:', error);
        }
    }
    
    // 폴링으로 대기
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (window.supabase) {
            console.log('✅ Supabase 준비 완료 (폴링)');
            return window.supabase;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 타임아웃
    console.error('❌ Supabase 초기화 타임아웃:', {
        'window.supabase': window.supabase,
        'window.supabaseConfig': window.supabaseConfig,
        'elapsed': Date.now() - startTime
    });
    throw new Error('Supabase 초기화 타임아웃');
}

// 데이터 삭제 처리
async function handleDeleteData() {
    if (!confirm('⚠️ 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) return;
    
    console.log('🔍 삭제 시작 - Supabase 확인:', {
        'window.supabase': window.supabase,
        'typeof window.supabase': typeof window.supabase,
        'window.supabaseConfig': window.supabaseConfig
    });
    
    try {
        let finalSupabase = window.supabase;
        
        // window.supabase가 없으면 직접 초기화
        if (!finalSupabase && window.supabaseConfig && window.supabaseConfig.url && window.supabaseConfig.anonKey) {
            console.log('🔄 Supabase 직접 초기화 시도...');
            try {
                const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
                finalSupabase = createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
                window.supabase = finalSupabase;
                console.log('✅ Supabase 직접 초기화 완료');
            } catch (initError) {
                console.error('❌ Supabase 직접 초기화 실패:', initError);
            }
        }
        
        // 여전히 없으면 대기
        if (!finalSupabase) {
            finalSupabase = await waitForSupabase(5000);
        }
        
        if (!finalSupabase) {
            console.error('❌ finalSupabase가 null');
            addMessage('시스템', '❌ Supabase가 초기화되지 않았습니다. 페이지를 새로고침해주세요.', 'error');
            return;
        }
        
        console.log('✅ Supabase 사용 가능:', finalSupabase);
        
        addMessage('시스템', '🗑️ Supabase 데이터 삭제 중...', 'bot');
        
        const { data: allData, error: fetchError } = await finalSupabase
            .from('excel_data')
            .select('id');
        
        if (fetchError) {
            console.error('❌ 데이터 조회 오류:', fetchError);
            throw fetchError;
        }
        
        if (!allData || allData.length === 0) {
            addMessage('시스템', '✅ 삭제할 데이터가 없습니다.', 'success');
            return;
        }
        
        console.log(`🗑️ ${allData.length}개 데이터 삭제 시작`);
        
        const BATCH_SIZE = 1000;
        let deletedCount = 0;
        
        for (let i = 0; i < allData.length; i += BATCH_SIZE) {
            const batch = allData.slice(i, i + BATCH_SIZE);
            const ids = batch.map(row => row.id);
            
            const { error: deleteError } = await finalSupabase
                .from('excel_data')
                .delete()
                .in('id', ids);
            
            if (deleteError) {
                console.error('❌ 삭제 오류:', deleteError);
                throw deleteError;
            }
            
            deletedCount += batch.length;
            console.log(`삭제 진행: ${deletedCount}/${allData.length}개`);
        }
        
        addMessage('시스템', `✅ Supabase에서 ${deletedCount}개의 데이터를 삭제했습니다!`, 'success');
        addMessage('시스템', '💡 이제 새로운 파일을 업로드할 수 있습니다.', 'bot');
        
    } catch (error) {
        console.error('❌ Supabase 삭제 오류:', error);
        console.error('❌ 오류 스택:', error.stack);
        addMessage('시스템', `❌ 삭제 실패: ${error.message}`, 'error');
    }
}

// 시각화 초기화
function initVisualization() {
    // 지도는 visualization.js의 updateMap에서 필요할 때 초기화
    // 여기서는 초기화하지 않음
    console.log('✅ 시각화 모듈 준비 완료');
}

// 시각화 탭 전환
function switchVisualizationTab(tabName) {
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.viz-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id.includes(tabName));
    });
}

// 제안 버튼 렌더링은 proactive.js의 renderSuggestions를 사용

// 메시지 추가 함수
function addMessage(sender, content, type = 'bot') {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    const messageId = 'msg_' + Date.now();
    messageDiv.id = messageId;
    messageDiv.className = `message ${sender === '사용자' ? 'user-message' : 'bot-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (type === 'error') {
        contentDiv.classList.add('error-message');
    } else if (type === 'success') {
        contentDiv.classList.add('success-message');
    }
    
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) message.remove();
}

// 경고 포맷팅
function formatAlerts(alerts) {
    let text = '\n\n⚠️ **경고 알림**\n';
    alerts.forEach(alert => {
        text += `• ${alert.message}\n`;
        if (alert.manual) {
            text += `  💡 대응 메뉴얼: ${alert.manual.title}\n`;
        }
    });
    return text;
}

// 전역으로 내보내기
window.supabase = supabase;
window.currentData = currentData;
window.addMessage = addMessage;
window.switchVisualizationTab = switchVisualizationTab;
