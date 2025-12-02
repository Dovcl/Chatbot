// Supabase 및 전역 변수
let supabase = null;
let currentData = [];

// Supabase 초기화 대기
document.addEventListener('DOMContentLoaded', () => {
    // Supabase가 초기화될 때까지 대기
    const initSupabase = setInterval(() => {
        if (window.supabase) {
            clearInterval(initSupabase);
            supabase = window.supabase;
            console.log('✅ Supabase 연결 완료');
            setupEventListeners();
        }
    }, 100);
    
    // 5초 후에도 초기화되지 않으면 경고
    setTimeout(() => {
        if (!supabase) {
            clearInterval(initSupabase);
            // addMessage 함수가 정의된 후에만 호출
            if (typeof addMessage === 'function') {
                addMessage('시스템', '⚠️ Supabase 설정을 확인해주세요.\n\n1. supabase-config.js 파일 확인\n2. Supabase 프로젝트가 생성되었는지 확인\n3. 브라우저 콘솔(F12)에서 오류 확인', 'error');
            } else {
                console.error('⚠️ Supabase 초기화 실패. supabase-config.js 파일을 확인하세요.');
            }
        }
    }, 5000);
});

function setupEventListeners() {
    // 파일 업로드 (엑셀/CSV)
    const dataFileInput = document.getElementById('dataFile');
    const fileNameSpan = document.getElementById('fileName');
    
    dataFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = `📄 ${file.name}`;
            await processDataFile(file);
        }
    });

    // Supabase 데이터 삭제 버튼
    const deleteSupabaseBtn = document.getElementById('deleteSupabaseBtn');
    deleteSupabaseBtn.addEventListener('click', async () => {
        if (confirm('⚠️ Supabase의 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
            await deleteAllSupabaseData();
        }
    });

    // 전송 버튼
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}

async function processDataFile(file) {
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
        
        // Supabase에 저장
        try {
            addMessage('시스템', `📤 Supabase에 데이터 저장 중...`, 'bot');
            await saveDataToSupabase(data, file.name);
            addMessage('시스템', `✅ ${data.length}개의 데이터를 성공적으로 불러왔습니다!`, 'success');
            addMessage('시스템', `☁️ Supabase에 데이터가 저장되었습니다.`, 'success');
        } catch (supabaseError) {
            // Supabase 저장 실패 시에도 메모리에는 데이터가 있으므로 계속 사용 가능
            console.error('Supabase 저장 실패:', supabaseError);
            addMessage('시스템', `✅ ${data.length}개의 데이터를 메모리에 불러왔습니다!`, 'success');
            addMessage('시스템', `⚠️ Supabase 저장 실패: ${supabaseError.message}\n(메모리에는 저장되어 질문은 가능합니다)`, 'error');
            addMessage('시스템', `💡 Supabase 연결 문제 해결 방법:\n1. supabase-config.js 파일 확인\n2. Supabase 테이블 생성 확인\n3. 인터넷 연결 확인`, 'bot');
        }
    } catch (error) {
        console.error('파일 처리 오류:', error);
        addMessage('시스템', `❌ 오류: ${error.message}`, 'error');
    }
}

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
        
        // UTF-8로 읽기 (한글 지원)
        reader.readAsText(file, 'UTF-8');
    });
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
        return [];
    }
    
    // 첫 번째 줄을 헤더로 사용
    const headers = parseCSVLine(lines[0]);
    
    // 데이터 행 파싱
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // 헤더와 값의 개수가 맞지 않으면 스킵
        if (values.length !== headers.length) {
            continue;
        }
        
        const row = {};
        headers.forEach((header, index) => {
            // 헤더와 값의 앞뒤 공백 제거
            const cleanHeader = header.trim();
            const cleanValue = values[index].trim();
            row[cleanHeader] = cleanValue;
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
                // 이스케이프된 따옴표
                current += '"';
                i++; // 다음 따옴표 건너뛰기
            } else {
                // 따옴표 시작/끝
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // 쉼표로 값 구분
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // 마지막 값 추가
    values.push(current);
    
    return values;
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // 첫 번째 시트 읽기
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // JSON으로 변환 (날짜를 문자열로 변환)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false, // 날짜를 문자열로 변환
                    dateNF: 'yyyy-mm-dd' // 날짜 형식 지정
                });
                
                if (jsonData.length === 0) {
                    reject(new Error('엑셀 파일에 데이터가 없습니다.'));
                    return;
                }
                
                // Excel 날짜 시리얼 번호를 실제 날짜로 변환
                const processedData = jsonData.map(row => {
                    const processedRow = { ...row };
                    
                    // Date 관련 컬럼 찾아서 변환
                    Object.keys(processedRow).forEach(key => {
                        const value = processedRow[key];
                        // Excel 날짜 시리얼 번호인지 확인 (1900년 기준)
                        if (typeof value === 'number' && value > 1 && value < 1000000) {
                            // Excel 날짜 시리얼 번호를 실제 날짜로 변환
                            try {
                                const excelEpoch = new Date(1899, 11, 30); // Excel epoch
                                const date = new Date(excelEpoch.getTime() + value * 86400000);
                                if (!isNaN(date.getTime())) {
                                    // 여러 형식으로 저장 (검색 용이성)
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    processedRow[key] = `${year}-${month}-${day}`;
                                    // 원본 숫자도 보관 (필요시)
                                    processedRow[`${key}_original`] = value;
                                }
                            } catch (e) {
                                // 변환 실패 시 원본 유지
                            }
                        }
                    });
                    
                    return processedRow;
                });
                
                resolve(processedData);
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

async function deleteAllSupabaseData() {
    if (!supabase) {
        addMessage('시스템', '❌ Supabase가 초기화되지 않았습니다.', 'error');
        return;
    }
    
    try {
        addMessage('시스템', '🗑️ Supabase 데이터 삭제 중...', 'bot');
        
        // 모든 데이터 가져오기
        const { data: allData, error: fetchError } = await supabase
            .from('excel_data')
            .select('id');
        
        if (fetchError) throw fetchError;
        
        if (!allData || allData.length === 0) {
            addMessage('시스템', '✅ 삭제할 데이터가 없습니다.', 'success');
            return;
        }
        
        const totalDocs = allData.length;
        
        // 배치로 삭제
        const BATCH_SIZE = 1000;
        let deletedCount = 0;
        
        for (let i = 0; i < allData.length; i += BATCH_SIZE) {
            const batch = allData.slice(i, i + BATCH_SIZE);
            const ids = batch.map(row => row.id);
            
            const { error: deleteError } = await supabase
                .from('excel_data')
                .delete()
                .in('id', ids);
            
            if (deleteError) throw deleteError;
            
            deletedCount += batch.length;
            console.log(`삭제 진행: ${deletedCount}/${totalDocs}개`);
        }
        
        addMessage('시스템', `✅ Supabase에서 ${deletedCount}개의 데이터를 삭제했습니다!`, 'success');
        addMessage('시스템', '💡 이제 새로운 파일을 업로드할 수 있습니다.', 'bot');
        
    } catch (error) {
        console.error('Supabase 삭제 오류:', error);
        addMessage('시스템', `❌ 삭제 실패: ${error.message}`, 'error');
    }
}

async function saveDataToSupabase(data, filename) {
    if (!supabase) {
        const errorMsg = 'Supabase가 초기화되지 않았습니다. supabase-config.js 파일을 확인하세요.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
    }
    
    try {
        const totalRows = data.length;
        console.log(`📤 Supabase에 ${totalRows}개 데이터 저장 중...`);
        
        // 배치로 저장 (Supabase는 한 번에 최대 1000개까지)
        const BATCH_SIZE = 1000;
        const timestamp = Date.now();
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batchData = data.slice(i, i + BATCH_SIZE);
            
            // 각 행을 JSONB로 저장
            const rowsToInsert = batchData.map((row, index) => ({
                row_data: row,  // JSONB 컬럼에 모든 데이터 저장
                row_index: i + index,
                filename: filename,
                uploaded_at: new Date().toISOString()
            }));
            
            const { error } = await supabase
                .from('excel_data')
                .insert(rowsToInsert);
            
            if (error) throw error;
            
            console.log(`  진행: ${Math.min(i + BATCH_SIZE, totalRows)}/${totalRows}개 저장됨`);
        }
        
        console.log(`✅ ${totalRows}개의 데이터가 Supabase에 저장되었습니다. (테이블: excel_data)`);
        return true;
    } catch (error) {
        console.error('❌ Supabase 저장 오류:', error.message);
        throw error;
    }
}

async function handleSendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    addMessage('사용자', message, 'user');
    userInput.value = '';
    
    const loadingId = addMessage('봇', '답변을 생성하는 중...', 'bot');
    
    try {
        // 1. 데이터 검색
        const { data, queryConditions, targetColumns } = await querySupabaseAndAnswer(message);
        
        // 2. 능동적 답변 생성
        const { answer, suggestions } = await generateProactiveAnswer(
            message, data, targetColumns, queryConditions
        );
        
        // 3. 경고 확인
        if (data.length > 0) {
            const alerts = checkAlerts(data[0]);
            if (alerts.length > 0) {
                answer += `\n\n⚠️ **경고 알림**\n`;
                alerts.forEach(alert => {
                    answer += `${alert.message}\n`;
                });
            }
        }
        
        // 4. 답변 표시
        removeMessage(loadingId);
        addMessage('봇', answer, 'bot');
        
        // 5. 제안 버튼 표시
        if (suggestions.length > 0) {
            renderSuggestions(suggestions);
        }
        
    } catch (error) {
        console.error('메시지 처리 오류:', error);
        removeMessage(loadingId);
        addMessage('봇', `❌ 오류가 발생했습니다: ${error.message}`, 'error');
    }
}

// Supabase 쿼리 기반으로 질문 처리 (DB 중심 - PostgreSQL JSONB 쿼리)
async function querySupabaseAndAnswer(question) {
    if (!supabase) {
        // Supabase가 없으면 메모리 데이터로 fallback
        if (currentData && currentData.length > 0) {
            return parseQuestionAndAnswer(question, currentData);
        }
        throw new Error('Supabase가 초기화되지 않았습니다. supabase-config.js 파일을 확인하세요.');
    }
    
    try {
        // 질문 파싱하여 쿼리 조건 생성
        const queryConditions = parseQuestionToSupabaseQuery(question);
        
        console.log('🔍 파싱된 쿼리 조건:', JSON.stringify(queryConditions, null, 2));
        
        // 컬럼명 정보 가져오기 (첫 번째 행에서)
        let columns = [];
        const { data: sampleData, error: sampleError } = await supabase
            .from('excel_data')
            .select('row_data')
            .limit(1)
            .single();
        
        if (!sampleError && sampleData && sampleData.row_data) {
            columns = Object.keys(sampleData.row_data);
        } else if (currentData && currentData.length > 0) {
            columns = Object.keys(currentData[0]);
        } else {
            throw new Error('데이터가 없습니다. 파일을 업로드해주세요.');
        }
        
        // Supabase에서 모든 데이터 가져오기 (JSONB 필터링은 Supabase 클라이언트에서 제한적)
        // 대신 클라이언트에서 필터링 (데이터가 많지 않다면 충분히 빠름)
        let supabaseQuery = supabase
            .from('excel_data')
            .select('row_data, id')
            .limit(10000);
        
        // 쿼리 실행
        const { data, error } = await supabaseQuery;
        
        if (error) throw error;
        
        // row_data에서 실제 데이터 추출
        let extractedData = (data || []).map(row => row.row_data);
        
        // 중복 제거
        const seen = new Set();
        extractedData = extractedData.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        
        console.log(`📊 중복 제거 후: ${extractedData.length}개`);
        
        // 클라이언트에서 필터링
        let filteredData = extractedData;
        
        // 텍스트 필터 (예: 분류코드 = '2001G027')
        if (queryConditions.textFilters && queryConditions.textFilters.length > 0) {
            console.log(`🔍 텍스트 필터 ${queryConditions.textFilters.length}개 적용 시작`);
            for (const filter of queryConditions.textFilters) {
                const beforeCount = filteredData.length;
                console.log(`  필터 적용: ${filter.column} = ${filter.value}`);
                // 컬럼명이 정확히 일치하는지 확인
                if (columns.includes(filter.column)) {
                    filteredData = filteredData.filter(row => {
                        const value = String(row[filter.column] || '').trim();
                        // 정확한 매칭 또는 포함 매칭
                        const match = value === filter.value || value.includes(filter.value);
                        if (match) {
                            console.log(`    ✅ 매칭: ${filter.column} = "${value}" (검색: "${filter.value}")`);
                        }
                        return match;
                    });
                } else {
                    // 컬럼명을 찾지 못한 경우, 부분 매칭 시도
                    const matchedColumn = columns.find(col => 
                        col.toLowerCase().includes(filter.column.toLowerCase()) ||
                        filter.column.toLowerCase().includes(col.toLowerCase())
                    );
                    if (matchedColumn) {
                        console.log(`    🔍 컬럼명 매칭: "${filter.column}" → "${matchedColumn}"`);
                        filteredData = filteredData.filter(row => {
                            const value = String(row[matchedColumn] || '').trim();
                            const match = value === filter.value || value.includes(filter.value);
                            if (match) {
                                console.log(`    ✅ 매칭: ${matchedColumn} = "${value}" (검색: "${filter.value}")`);
                            }
                            return match;
                        });
                    } else {
                        console.log(`    ⚠️ 컬럼을 찾지 못함: ${filter.column} (사용 가능한 컬럼: ${columns.join(', ')})`);
                    }
                }
                console.log(`  필터링 결과: ${beforeCount}개 → ${filteredData.length}개`);
            }
        } else {
            console.log('⚠️ 텍스트 필터가 없습니다!');
        }
        
        // 날짜 필터
        if (queryConditions.date) {
            const dateKeys = ['Date', 'date', 'DATE', '날짜', '조사일자', '일자'];
            for (const dateKey of dateKeys) {
                if (columns.includes(dateKey)) {
                    const beforeCount = filteredData.length;
                    filteredData = filteredData.filter(row => {
                        const rowDate = String(row[dateKey] || '').trim();
                        return rowDate.includes(queryConditions.date) ||
                               rowDate.includes(queryConditions.date.replace(/-/g, '/')) ||
                               rowDate.includes(queryConditions.date.replace(/-/g, '.'));
                    });
                    console.log(`날짜 필터링: ${dateKey} = ${queryConditions.date}: ${beforeCount}개 → ${filteredData.length}개`);
                    break;
                }
            }
        }
        
        // 숫자 필터 (경도, 위도, pH 등)
        if (queryConditions.numericFilters && queryConditions.numericFilters.length > 0) {
            for (const filter of queryConditions.numericFilters) {
                const colName = findColumnName(columns, filter.column);
                if (colName) {
                    const beforeCount = filteredData.length;
                    filteredData = filteredData.filter(row => {
                        const value = parseFloat(row[colName]);
                        if (isNaN(value)) {
                            return false;
                        }
                        const diff = Math.abs(value - filter.value);
                        const matched = diff <= filter.tolerance;
                        if (matched) {
                            console.log(`✅ 숫자 매칭: ${colName} = ${value} (목표: ${filter.value}, 차이: ${diff.toFixed(8)})`);
                        }
                        return matched;
                    });
                    console.log(`필터링: ${colName} = ${filter.value} (tolerance: ${filter.tolerance}): ${beforeCount}개 → ${filteredData.length}개`);
                } else {
                    console.log(`⚠️ 컬럼을 찾지 못함: ${filter.column}`);
                }
            }
        }
        
        console.log(`📊 최종 필터링 후: ${filteredData.length}개`);
        
        // 타겟 컬럼을 실제 컬럼명과 매칭
        let matchedTargetColumns = [];
        if (queryConditions.targetColumns && queryConditions.targetColumns.length > 0) {
            queryConditions.targetColumns.forEach(targetCol => {
                // 정확한 매칭 먼저 시도
                if (columns.includes(targetCol)) {
                    matchedTargetColumns.push(targetCol);
                } else {
                    // 대소문자 무시 매칭
                    const found = columns.find(col => 
                        col.toLowerCase() === targetCol.toLowerCase()
                    );
                    if (found) {
                        matchedTargetColumns.push(found);
                    } else {
                        // 부분 매칭
                        const foundPartial = columns.find(col => 
                            col.toLowerCase().includes(targetCol.toLowerCase()) ||
                            targetCol.toLowerCase().includes(col.toLowerCase())
                        );
                        if (foundPartial) {
                            matchedTargetColumns.push(foundPartial);
                        }
                    }
                }
            });
        }
        
        // 답변 생성
        return { data: filteredData, queryConditions, targetColumns: matchedTargetColumns };
        
    } catch (error) {
        console.error('Supabase 쿼리 오류:', error);
        // Fallback: 메모리 데이터 사용
        if (currentData && currentData.length > 0) {
            console.log('💾 메모리 데이터로 fallback');
            return parseQuestionAndAnswer(question, currentData);
        }
        throw error;
    }
}

// 질문을 Supabase 쿼리 조건으로 파싱
function parseQuestionToSupabaseQuery(question) {
    const lowerQuestion = question.toLowerCase();
    const result = {
        date: null,
        numericFilters: [],
        textFilters: [],
        targetColumns: []
    };
    
    // 날짜 추출
    const datePatterns = [
        /\d{4}-\d{2}-\d{2}/,
        /\d{4}\/\d{2}\/\d{2}/,
        /\d{4}\.\d{2}\.\d{2}/
    ];
    for (const pattern of datePatterns) {
        const match = question.match(pattern);
        if (match) {
            result.date = match[0];
            break;
        }
    }
    
    // 숫자 조건 추출 (경도, 위도, pH)
    const numRegex = /(경도|위도|longitude|latitude|lon|lat|pH|PH|ph|경도\(도\)|위도\(도\))[\s:：=는은에서의]*([-+]?\d+\.?\d*)/gi;
    let m;
    while ((m = numRegex.exec(question)) !== null) {
        const label = normalizeName(m[1]);
        const value = parseFloat(m[2]);
        if (isNaN(value)) continue;
        
        let type = null;
        if (COLUMN_ALIASES.longitude.map(a => normalizeName(a)).some(a => label.includes(a) || a.includes(label))) {
            type = 'longitude';
        } else if (COLUMN_ALIASES.latitude.map(a => normalizeName(a)).some(a => label.includes(a) || a.includes(label))) {
            type = 'latitude';
        } else if (COLUMN_ALIASES.ph.map(a => normalizeName(a)).some(a => label.includes(a) || a.includes(label))) {
            type = 'ph';
        }
        
        if (type) {
            const tolerance = type === 'ph' ? 1e-6 : 1e-6;
            result.numericFilters.push({
                column: type,
                value: value,
                tolerance: tolerance
            });
            console.log(`🔢 숫자 조건 추가: ${type} = ${value} (tolerance: ${tolerance})`);
        }
    }
    
    // 텍스트 필터 추출 (예: "분류코드 2001G027", "조사구간명 서울")
    // "분류코드 2001G027에서의 FAI값" → "분류코드"와 "2001G027" 추출
    // 더 간단하고 확실한 패턴 사용
    const textFilterRegex = /([가-힣a-zA-Z_]+)[은는]?\s+([가-힣a-zA-Z0-9\-_\.]+)/g;
    
    let match;
    textFilterRegex.lastIndex = 0;
    while ((match = textFilterRegex.exec(question)) !== null) {
        const columnName = match[1].trim();
        let filterValue = match[2].trim();
        
        // 값에서 조사 제거 ("에서의", "에서", "의" 등)
        filterValue = filterValue.replace(/(에서의|에서|의|에|알려줘|알려|줘|값|값을|값이).*$/, '').trim();
        
        // 숫자 필터로 이미 처리된 컬럼은 스킵
        const isNumericColumn = COLUMN_ALIASES.longitude.includes(columnName) ||
                               COLUMN_ALIASES.latitude.includes(columnName) ||
                               COLUMN_ALIASES.ph.includes(columnName);
        
        if (isNumericColumn) continue;
        
        // 값이 있는 경우 텍스트 필터로 추가
        if (filterValue) {
            // 이미 같은 필터가 있는지 확인
            const exists = result.textFilters.some(f => 
                f.column === columnName && f.value === filterValue
            );
            
            if (!exists) {
                result.textFilters.push({
                    column: columnName,
                    value: filterValue
                });
                console.log(`📝 텍스트 필터 추가: ${columnName} = ${filterValue}`);
            }
        }
    }
    
    // 타겟 컬럼 추출 (FAI, BAI, DAI, IAI, pH 등)
    const targetColumnPatterns = [
        { pattern: /(fai|FAI|Fai)[값]?/i, column: 'FAI' },
        { pattern: /(bai|BAI|Bai)[값]?/i, column: 'BAI' },
        { pattern: /(dai|DAI|Dai)[값]?/i, column: 'DAI' },
        { pattern: /(iai|IAI|Iai)[값]?/i, column: 'IAI' },
        { pattern: /(ph|pH|PH)[값]?/i, column: 'pH' },
        { pattern: /(bod|BOD|Bod)[값]?/i, column: 'BOD' },
        { pattern: /(t-n|T-N|TN)[값]?/i, column: 'T-N' },
        { pattern: /(t-p|T-P|TP)[값]?/i, column: 'T-P' }
    ];
    
    for (const { pattern, column } of targetColumnPatterns) {
        if (pattern.test(question)) {
            if (!result.targetColumns.includes(column)) {
                result.targetColumns.push(column);
                console.log(`🎯 타겟 컬럼 추가: ${column}`);
            }
        }
    }
    
    return result;
}

// 컬럼명 찾기 (별칭 지원)
function findColumnName(columns, alias) {
    const aliasMap = {
        'longitude': COLUMN_ALIASES.longitude,
        'latitude': COLUMN_ALIASES.latitude,
        'ph': COLUMN_ALIASES.ph
    };
    
    if (aliasMap[alias]) {
        return findColumnByAliases(columns, aliasMap[alias]);
    }
    return null;
}

// 클라이언트 사이드 추가 필터링 (Firestore 제한 보완)
function applyClientSideFilters(data, queryConditions, columns) {
    let filtered = [...data];
    
    // 숫자 필터 정확도 향상
    if (queryConditions.numericFilters && queryConditions.numericFilters.length > 0) {
        for (const filter of queryConditions.numericFilters) {
            const colName = findColumnName(columns, filter.column);
            if (colName) {
                filtered = filtered.filter(row => {
                    const value = parseFloat(row[colName]);
                    if (isNaN(value)) return false;
                    return Math.abs(value - filter.value) <= filter.tolerance;
                });
            }
        }
    }
    
    // 텍스트 필터
    if (queryConditions.textFilters && queryConditions.textFilters.length > 0) {
        for (const filter of queryConditions.textFilters) {
            if (columns.includes(filter.column)) {
                filtered = filtered.filter(row => {
                    const value = String(row[filter.column] || '').toLowerCase();
                    return value.includes(filter.value.toLowerCase());
                });
            }
        }
    }
    
    return filtered;
}

// 답변 생성
function generateAnswer(data, targetColumns) {
    if (data.length === 0) {
        return '조건에 맞는 데이터를 찾을 수 없습니다.';
    }
    
    let answer = '';
    
    if (targetColumns && targetColumns.length > 0) {
        // 결과가 1개면 간단하게, 여러 개면 상세 정보 포함
        if (data.length === 1) {
            // 결과 1개: 간단하게 표시
            answer += `\n답변: `;
            targetColumns.forEach(col => {
                const colName = findColumnByAliases(Object.keys(data[0]), [col]);
                if (colName && data[0][colName] !== undefined) {
                    answer += `${colName} = ${data[0][colName]}`;
                }
            });
        } else {
            // 결과 여러 개: 각 결과에 추가 정보 표시 (날짜, 위도 등으로 구분)
            answer += `${data.length}개의 결과를 찾았습니다:\n`;
            data.forEach((row, index) => {
                answer += `\n[결과 ${index + 1}]`;
                // 날짜나 다른 구분 정보가 있으면 표시
                const dateKeys = ['Date', 'date', 'DATE', '날짜', '조사일자', '일자'];
                const latKeys = ['위도', 'latitude', 'lat'];
                let hasExtraInfo = false;
                
                dateKeys.forEach(key => {
                    if (row[key] && !hasExtraInfo) {
                        answer += ` (날짜: ${row[key]})`;
                        hasExtraInfo = true;
                    }
                });
                if (!hasExtraInfo) {
                    latKeys.forEach(key => {
                        if (row[key] && !hasExtraInfo) {
                            answer += ` (위도: ${row[key]})`;
                            hasExtraInfo = true;
                        }
                    });
                }
                answer += `\n`;
                
                targetColumns.forEach(col => {
                    const colName = findColumnByAliases(Object.keys(row), [col]);
                    if (colName && row[colName] !== undefined) {
                        answer += `  ${colName}: ${row[colName]}\n`;
                    }
                });
            });
        }
    } else {
        if (data.length === 1) {
            answer = '찾은 데이터:\n';
            Object.keys(data[0]).forEach(key => {
                answer += `${key}: ${data[0][key]}\n`;
            });
        } else {
            answer = `${data.length}개의 결과를 찾았습니다:\n\n`;
            data.slice(0, 10).forEach((row, index) => {
                answer += `[결과 ${index + 1}]\n`;
                Object.keys(row).forEach(key => {
                    answer += `${key}: ${row[key]}\n`;
                });
                answer += '\n';
            });
            if (data.length > 10) {
                answer += `... 외 ${data.length - 10}개 더 있습니다.`;
            }
        }
    }
    
    return answer.trim() || '데이터를 찾았지만 표시할 내용이 없습니다.';
}

// 능동적 답변 생성 시스템
async function generateProactiveAnswer(question, data, targetColumns, queryConditions) {
    let answer = '';
    const suggestions = []; // 추가 제안 목록
    
    // 1. 기본 답변 생성
    if (data.length > 0) {
        const row = data[0];
        
        // pH 질문에 대한 답변
        if (targetColumns && targetColumns.includes('pH')) {
            const pH = parseFloat(row['pH'] || row['pH']);
            const location = row['조사구간명'] || row['분류코드'];
            
            answer += `네, **${location}** 지역의 pH는 **${pH}**입니다.\n\n`;
            
            // 능동적 제안 1: 수질 등급 계산 및 제안
            const waterQuality = calculateWaterQualityGrade(pH, row);
            answer += `📊 **수질 등급**: ${waterQuality.grade} (${waterQuality.description})\n`;
            
            suggestions.push({
                type: 'water_quality',
                text: '이 지역의 전체 수질 등급을 자세히 보시겠어요?',
                action: () => showWaterQualityDetails(row)
            });
            
            // 능동적 제안 2: 예측 모델 결과
            suggestions.push({
                type: 'prediction',
                text: '다음주 이 지역의 수질 예측 결과를 확인하시겠어요?',
                action: () => showPrediction(row['분류코드'] || location)
            });
            
            // 능동적 제안 3: 시계열 변화
            suggestions.push({
                type: 'timeseries',
                text: '이 지역의 pH 변화 추이를 그래프로 보시겠어요?',
                action: () => showTimeSeriesChart(row['분류코드'] || location, 'pH')
            });
            
            // 능동적 제안 4: 관련 지표
            const relatedMetrics = getRelatedMetrics(row, 'pH');
            if (relatedMetrics.length > 0) {
                suggestions.push({
                    type: 'related',
                    text: `관련 지표(${relatedMetrics.join(', ')})도 함께 확인하시겠어요?`,
                    action: () => showRelatedMetrics(row, relatedMetrics)
                });
            }
        }
    }
    
    // 2. 제안 버튼 생성
    if (suggestions.length > 0) {
        answer += `\n\n💡 **추가로 확인할 수 있는 정보:**\n`;
        suggestions.forEach((suggestion, idx) => {
            answer += `${idx + 1}. ${suggestion.text}\n`;
        });
    }
    
    return { answer, suggestions };
}

// 수질 등급 계산
function calculateWaterQualityGrade(pH, row) {
    // pH 기준 수질 등급 (실제 기준에 맞게 수정 필요)
    let grade, description;
    
    if (pH >= 6.5 && pH <= 8.5) {
        grade = 'I등급';
        description = '매우 좋음';
    } else if ((pH >= 6.0 && pH < 6.5) || (pH > 8.5 && pH <= 9.0)) {
        grade = 'II등급';
        description = '좋음';
    } else if ((pH >= 5.5 && pH < 6.0) || (pH > 9.0 && pH <= 9.5)) {
        grade = 'III등급';
        description = '보통';
    } else {
        grade = 'IV등급 이하';
        description = '나쁨';
    }
    
    // BOD, T-N, T-P 등을 종합한 등급 계산도 가능
    const bod = parseFloat(row['BOD'] || 0);
    const tn = parseFloat(row['T-N'] || 0);
    const tp = parseFloat(row['T-P'] || 0);
    
    // 종합 등급 계산 로직 추가 가능
    
    return { grade, description, details: { pH, BOD: bod, 'T-N': tn, 'T-P': tp } };
}

// 조류 경보 단계 계산
function calculateAlgaeAlertLevel(row) {
    const fai = parseFloat(row['FAI'] || 0);
    const bai = parseFloat(row['BAI'] || 0);
    const dai = parseFloat(row['DAI'] || 0);
    const iai = parseFloat(row['IAI'] || 0);
    
    // 실제 기준에 맞게 수정 필요
    let level, description, color;
    
    if (fai >= 80) {
        level = '경보';
        description = '조류 대량 발생 위험';
        color = 'red';
    } else if (fai >= 60) {
        level = '주의';
        description = '조류 발생 주의';
        color = 'orange';
    } else if (fai >= 40) {
        level = '관심';
        description = '조류 발생 관심';
        color = 'yellow';
    } else {
        level = '정상';
        description = '조류 발생 없음';
        color = 'green';
    }
    
    return { level, description, color, values: { FAI: fai, BAI: bai, DAI: dai, IAI: iai } };
}

// 관련 지표 찾기
function getRelatedMetrics(row, currentMetric) {
    const relatedMap = {
        'pH': ['BOD', 'T-N', 'T-P', 'FAI'],
        'FAI': ['BAI', 'DAI', 'IAI', 'pH', 'BOD'],
        'BOD': ['T-N', 'T-P', 'pH', 'FAI']
    };
    
    return relatedMap[currentMetric] || [];
}

// ===== 컬럼 별칭(경도/위도/pH)을 실제 엑셀 컬럼과 매핑하는 도우미 =====
const COLUMN_ALIASES = {
    longitude: ['경도', 'longitude', 'lon', 'long', 'x'],
    latitude: ['위도', 'latitude', 'lat', 'y'],
    ph: ['ph', 'pH', 'PH']
};

// 컬럼 이름 정규화
function normalizeName(name) {
    return String(name).trim().toLowerCase();
}

function findColumnByAliases(columns, aliasList) {
    const lowerCols = columns.map(c => normalizeName(c));

    for (const alias of aliasList) {
        const a = normalizeName(alias);

        // 1) 완전 일치
        let idx = lowerCols.indexOf(a);
        if (idx !== -1) {
            console.log(`✅ 컬럼 매칭: "${alias}" → "${columns[idx]}" (완전 일치)`);
            return columns[idx];
        }

        // 2) 부분 포함 (예: "경도(Decimal)" 안에 "경도")
        idx = lowerCols.findIndex(colName => colName.includes(a) || a.includes(colName));
        if (idx !== -1) {
            console.log(`✅ 컬럼 매칭: "${alias}" → "${columns[idx]}" (부분 일치)`);
            return columns[idx];
        }
    }
    
    // 3) 양방향 매칭 시도 (컬럼명에 alias가 포함되거나 그 반대)
    for (const alias of aliasList) {
        const a = normalizeName(alias);
        for (let i = 0; i < columns.length; i++) {
            const colLower = lowerCols[i];
            // 양방향 부분 일치
            if (colLower.includes(a) || a.includes(colLower)) {
                console.log(`✅ 컬럼 매칭: "${alias}" → "${columns[i]}" (양방향 매칭)`);
                return columns[i];
            }
        }
    }
    
    console.log(`❌ 컬럼 매칭 실패: aliasList=${JSON.stringify(aliasList)}, columns=${JSON.stringify(columns)}`);
    return null;
}


// 질문에 alias 단어가 들어있는지
function questionHasAlias(questionLower, aliasList) {
    return aliasList.some(a => questionLower.includes(a.toLowerCase()));
}

// 숫자 근접 비교
function almostEqual(a, b, eps = 1e-4) {
    return Math.abs(a - b) <= eps;
}


function parseQuestionAndAnswer(question, data) {
    if (!data || data.length === 0) {
        return '먼저 엑셀 파일을 업로드해주세요.';
    }

    // 컬럼명 확인 요청 처리
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('컬럼') && (lowerQuestion.includes('보여') || lowerQuestion.includes('알려') || lowerQuestion.includes('확인'))) {
        const columns = Object.keys(data[0]);
        let answer = `📋 사용 가능한 컬럼명 (${columns.length}개):\n\n`;
        columns.forEach((col, idx) => {
            answer += `${idx + 1}. ${col}\n`;
        });
        answer += `\n💡 위 컬럼명을 사용하여 질문하세요.`;
        return answer;
    }

    const columns = Object.keys(data[0]).map(c => c.trim());
    console.log('엑셀 컬럼들:', columns);   // 디버깅용

    // ─────────────────────────────
    // 1. 날짜 추출 (기존 유지)
    // ─────────────────────────────
    const datePatterns = [
        /\d{4}-\d{2}-\d{2}/,
        /\d{4}\/\d{2}\/\d{2}/,
        /\d{4}\.\d{2}\.\d{2}/
    ];
    let targetDate = null;
    for (const pattern of datePatterns) {
        const m = question.match(pattern);
        if (m) {
            targetDate = m[0];
            break;
        }
    }

    // ─────────────────────────────
    // 2. 경도/위도/pH 컬럼 찾기 (별칭 + 부분일치)
    // ─────────────────────────────
    const lonCol = findColumnByAliases(columns, COLUMN_ALIASES.longitude);
    const latCol = findColumnByAliases(columns, COLUMN_ALIASES.latitude);
    let phCol  = findColumnByAliases(columns, COLUMN_ALIASES.ph);

    // phCol 못 찾았으면 "ph"가 들어간 컬럼 아무거나 하나 더 시도
    if (!phCol) {
        phCol = columns.find(c => normalizeName(c).includes('ph')) || null;
    }
    
    // 디버깅 정보
    console.log('🔍 컬럼 매핑 결과:');
    console.log(`  경도 컬럼: ${lonCol || '❌ 찾지 못함'}`);
    console.log(`  위도 컬럼: ${latCol || '❌ 찾지 못함'}`);
    console.log(`  pH 컬럼: ${phCol || '❌ 찾지 못함'}`);

    // ─────────────────────────────
    // 3. 보고 싶은 컬럼(targetColumns) 결정
    // ─────────────────────────────
    const targetColumns = [];

    // pH 요청이면 pH 컬럼 추가
    if (phCol && questionHasAlias(lowerQuestion, COLUMN_ALIASES.ph)) {
        targetColumns.push(phCol);
    }

    // 경도/위도 컬럼도 질문에 언급되면 추가 (선택 사항)
    if (lonCol && questionHasAlias(lowerQuestion, COLUMN_ALIASES.longitude)) {
        if (!targetColumns.includes(lonCol)) targetColumns.push(lonCol);
    }
    if (latCol && questionHasAlias(lowerQuestion, COLUMN_ALIASES.latitude)) {
        if (!targetColumns.includes(latCol)) targetColumns.push(latCol);
    }

    // 일반 컬럼명 텍스트 매칭 (기존 로직)
    columns.forEach(col => {
        const colLower = normalizeName(col);
        if (
            lowerQuestion.includes(colLower) ||
            lowerQuestion.includes(col) ||
            question.includes(col)
        ) {
            if (!targetColumns.includes(col)) {
                targetColumns.push(col);
            }
        }
    });

    // ─────────────────────────────
    // 4. 텍스트 기반 필터 (조사구간명 서울 등)
    // ─────────────────────────────
    const filterConditions = {};
    columns.forEach(col => {
        const regex = new RegExp(`${col}[은는]?\\s*([^\\s,]+)`, 'i');
        const match = question.match(regex);
        if (match && match[1]) {
            filterConditions[col] = match[1].trim();
        }
    });

    // ─────────────────────────────
    // 5. 숫자 조건 추출 (경도/위도/pH 같은 것)
    //    "경도 128.954044", "경도 128.954044에서의", "longitude=128.95" 등
    // ─────────────────────────────
    const numericConditions = [];
    
    // 개선된 정규식: 한글과 숫자 사이 공백, 다양한 구분자, "에서의" 같은 조사 지원
    // "경도 128.954044에서의" 같은 패턴도 잡을 수 있도록 개선
    const numRegex = /(경도|위도|longitude|latitude|lon|lat|pH|PH|ph|경도\(도\)|위도\(도\))[\s:：=는은에서의]*([-+]?\d+\.?\d*)/gi;
    let m;
    while ((m = numRegex.exec(question)) !== null) {
        const label = normalizeName(m[1]);
        const value = parseFloat(m[2]);
        if (isNaN(value)) continue;

        let type = null;
        const lonAliases = COLUMN_ALIASES.longitude.map(a => normalizeName(a));
        const latAliases = COLUMN_ALIASES.latitude.map(a => normalizeName(a));
        const phAliases = COLUMN_ALIASES.ph.map(a => normalizeName(a));
        
        if (lonAliases.some(a => label.includes(a) || a.includes(label))) {
            type = 'longitude';
        } else if (latAliases.some(a => label.includes(a) || a.includes(label))) {
            type = 'latitude';
        } else if (phAliases.some(a => label.includes(a) || a.includes(label))) {
            type = 'ph';
        }

        if (type) {
            console.log(`🔢 숫자 조건 추출: ${type} = ${value} (정규식 매칭)`);
            numericConditions.push({ type, value });
        }
    }
    
    // 추가: "경도 128.954044에서의" 같은 패턴을 더 유연하게 찾기
    if (numericConditions.length === 0) {
        // "경도" 또는 "위도" 뒤에 숫자가 오는 패턴 (더 넓은 범위)
        const flexibleRegex = /(경도|위도|longitude|latitude)[\s:：=는은에서의]*(\d+\.?\d*)/gi;
        let m2;
        while ((m2 = flexibleRegex.exec(question)) !== null) {
            const label = normalizeName(m2[1]);
            const value = parseFloat(m2[2]);
            if (isNaN(value)) continue;
            
            if (COLUMN_ALIASES.longitude.some(a => {
                const aNorm = normalizeName(a);
                return aNorm === label || label.includes(aNorm) || aNorm.includes(label);
            })) {
                console.log(`🔢 숫자 조건 추출: longitude = ${value} (유연한 패턴)`);
                numericConditions.push({ type: 'longitude', value });
            } else if (COLUMN_ALIASES.latitude.some(a => {
                const aNorm = normalizeName(a);
                return aNorm === label || label.includes(aNorm) || aNorm.includes(label);
            })) {
                console.log(`🔢 숫자 조건 추출: latitude = ${value} (유연한 패턴)`);
                numericConditions.push({ type: 'latitude', value });
            }
        }
    }
    
    // 최종 fallback: 질문에서 숫자만 추출하고 컨텍스트로 판단
    if (numericConditions.length === 0) {
        // "경도" 또는 "위도" 키워드가 있고 그 근처에 숫자가 있는지 확인
        const hasLongitude = questionHasAlias(lowerQuestion, COLUMN_ALIASES.longitude);
        const hasLatitude = questionHasAlias(lowerQuestion, COLUMN_ALIASES.latitude);
        
        if (hasLongitude || hasLatitude) {
            // 질문에서 모든 숫자 추출
            const allNumbers = question.match(/\d+\.?\d*/g);
            if (allNumbers && allNumbers.length > 0) {
                // 경도/위도 범위에 맞는 숫자 찾기 (일반적으로 100-150 정도)
                const candidate = allNumbers.map(n => parseFloat(n)).find(n => 
                    !isNaN(n) && n > 100 && n < 150
                );
                if (candidate) {
                    if (hasLongitude) {
                        console.log(`🔢 숫자 조건 추출: longitude = ${candidate} (fallback)`);
                        numericConditions.push({ type: 'longitude', value: candidate });
                    } else if (hasLatitude) {
                        console.log(`🔢 숫자 조건 추출: latitude = ${candidate} (fallback)`);
                        numericConditions.push({ type: 'latitude', value: candidate });
                    }
                }
            }
        }
    }

    // ─────────────────────────────
    // 6. 데이터 필터링
    // ─────────────────────────────
    let filteredData = [...data];

    // 6-1) 날짜 필터
    if (targetDate) {
        filteredData = filteredData.filter(row => {
            const rowDate = String(row['Date'] || row['date'] || row['DATE'] || '').trim();
            return (
                rowDate.includes(targetDate) ||
                rowDate.includes(targetDate.replace(/-/g, '/')) ||
                rowDate.includes(targetDate.replace(/-/g, '.'))
            );
        });
    }

    // 6-2) 텍스트 조건 필터
    Object.keys(filterConditions).forEach(key => {
        filteredData = filteredData.filter(row => {
            const value = String(row[key] || '').toLowerCase();
            return value.includes(filterConditions[key].toLowerCase());
        });
    });

    // 6-3) 숫자 조건 필터 (경도/위도/pH)
    numericConditions.forEach(cond => {
        let colName = null;
        let tolerance = 1e-4;

        if (cond.type === 'longitude') {
            colName = lonCol;
        } else if (cond.type === 'latitude') {
            colName = latCol;
        } else if (cond.type === 'ph') {
            colName = phCol;
            tolerance = 1e-6;
        }

        const beforeCount = filteredData.length;
        
        if (colName && filteredData.length > 0) {
            // 1차: 지정 컬럼으로 필터
            filteredData = filteredData.filter(row => {
                const raw = row[colName];
                if (raw === undefined || raw === null) {
                    console.log(`❌ ${colName} 컬럼이 없거나 null: ${JSON.stringify(Object.keys(row))}`);
                    return false;
                }
                const num = parseFloat(String(raw).replace(/,/g, ''));
                if (isNaN(num)) {
                    console.log(`❌ 숫자 변환 실패: ${colName} = ${raw} (타입: ${typeof raw})`);
                    return false;
                }
                const matched = almostEqual(num, cond.value, tolerance);
                if (matched) {
                    console.log(`✅ 매칭: ${colName} = ${raw} (목표: ${cond.value}, 차이: ${Math.abs(num - cond.value)})`);
                } else {
                    console.log(`❌ 매칭 실패: ${colName} = ${raw} (목표: ${cond.value}, 차이: ${Math.abs(num - cond.value)})`);
                }
                return matched;
            });
            console.log(`필터링: ${cond.type} (${colName}) = ${cond.value}: ${beforeCount}개 → ${filteredData.length}개`);
        } else if (!colName) {
            console.log(`⚠️ ${cond.type} 컬럼을 찾지 못했습니다. Fallback 모드로 전환합니다.`);
        }

        // Fallback: 컬럼을 찾지 못했거나 필터링 결과가 없을 때
        // 모든 숫자 컬럼을 스캔하여 값이 일치하는 행 찾기
        if ((!colName || filteredData.length === 0) && data.length > 0) {
            console.log(`⚠️ Fallback 모드: ${cond.type} 컬럼을 찾지 못했거나 결과가 없음. 모든 숫자 컬럼 스캔 중...`);
            const originalData = colName ? data : filteredData.length === 0 ? data : filteredData;
            filteredData = originalData.filter(row => {
                return Object.entries(row).some(([key, value]) => {
                    // 숫자로 변환 가능한 값인지 확인
                    const num = parseFloat(String(value).replace(/,/g, ''));
                    if (isNaN(num)) return false;
                    // 값이 일치하는지 확인
                    const matched = almostEqual(num, cond.value, tolerance);
                    if (matched) {
                        console.log(`✅ Fallback 매칭: ${key} = ${value} (목표: ${cond.value})`);
                    }
                    return matched;
                });
            });
            console.log(`Fallback 결과: ${originalData.length}개 → ${filteredData.length}개`);
        }
    });

    if (filteredData.length === 0) {
        // 상세한 디버깅 정보 제공
        let debugInfo = '조건에 맞는 데이터를 찾을 수 없습니다.\n\n';
        debugInfo += `📋 검색 조건:\n`;
        if (targetDate) debugInfo += `- 날짜: ${targetDate}\n`;
        if (numericConditions.length > 0) {
            debugInfo += `- 숫자 조건:\n`;
            numericConditions.forEach(cond => {
                const colName = cond.type === 'longitude' ? lonCol : 
                               cond.type === 'latitude' ? latCol : phCol;
                debugInfo += `  ${cond.type} = ${cond.value} (컬럼: ${colName || '❌ 찾지 못함'})\n`;
            });
        }
        if (Object.keys(filterConditions).length > 0) {
            debugInfo += `- 텍스트 조건:\n`;
            Object.keys(filterConditions).forEach(key => {
                debugInfo += `  ${key}: ${filterConditions[key]}\n`;
            });
        }
        
        debugInfo += `\n📊 데이터 정보:\n`;
        debugInfo += `- 총 데이터 개수: ${data.length}개\n`;
        debugInfo += `- 사용 가능한 컬럼: ${columns.join(', ')}\n`;
        
        debugInfo += `\n🔍 컬럼 매핑 상태:\n`;
        debugInfo += `- 경도: ${lonCol || '❌ 찾지 못함'}\n`;
        debugInfo += `- 위도: ${latCol || '❌ 찾지 못함'}\n`;
        debugInfo += `- pH: ${phCol || '❌ 찾지 못함'}\n`;
        
        // 샘플 데이터 표시 (처음 3개)
        if (data.length > 0) {
            debugInfo += `\n📝 샘플 데이터 (처음 3개):\n`;
            data.slice(0, 3).forEach((row, idx) => {
                debugInfo += `\n[샘플 ${idx + 1}]\n`;
                Object.keys(row).forEach(key => {
                    debugInfo += `  ${key}: ${row[key]}\n`;
                });
            });
        }
        
        debugInfo += `\n💡 팁:\n`;
        debugInfo += `- "컬럼명 보여줘"로 실제 컬럼명을 확인하세요\n`;
        debugInfo += `- 컬럼명이 다르면 실제 컬럼명을 사용하여 질문하세요\n`;
        debugInfo += `- 브라우저 콘솔(F12)에서 더 자세한 로그를 확인할 수 있습니다`;
        
        return debugInfo;
    }

    // ─────────────────────────────
    // 7. 답변 생성
    // ─────────────────────────────
    let answer = '';

    if (targetColumns.length > 0) {
        filteredData.forEach((row, index) => {
            answer += `\n[결과 ${index + 1}]\n`;
            targetColumns.forEach(col => {
                if (row[col] !== undefined) {
                    answer += `${col}: ${row[col]}\n`;
                }
            });
        });
    } else {
        if (filteredData.length === 1) {
            answer = '찾은 데이터:\n';
            Object.keys(filteredData[0]).forEach(key => {
                answer += `${key}: ${filteredData[0][key]}\n`;
            });
        } else {
            answer = `${filteredData.length}개의 결과를 찾았습니다:\n\n`;
            filteredData.slice(0, 10).forEach((row, index) => {
                answer += `[결과 ${index + 1}]\n`;
                Object.keys(row).forEach(key => {
                    answer += `${key}: ${row[key]}\n`;
                });
                answer += '\n';
            });
            if (filteredData.length > 10) {
                answer += `... 외 ${filteredData.length - 10}개 더 있습니다.`;
            }
        }
    }

    return answer.trim() || '데이터를 찾았지만 표시할 내용이 없습니다.';
}



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
    
    // 스크롤을 맨 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

// Supabase 상태 확인
async function checkSupabaseStatus(memoryData) {
    let answer = '📊 데이터 저장 상태:\n\n';
    
    // 메모리 데이터
    answer += `💾 메모리: ${memoryData.length}개 데이터 저장됨\n`;
    
    // Supabase 상태 확인
    if (!supabase) {
        answer += `☁️ Supabase: 초기화되지 않음\n`;
        answer += `\n💡 supabase-config.js 파일을 확인하세요.`;
        return answer;
    }
    
    try {
        const { count, error } = await supabase
            .from('excel_data')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        answer += `☁️ Supabase: ${count || 0}개 데이터 저장됨 (테이블: excel_data)\n`;
        
        if (count > 0) {
            // 최근 업로드된 데이터 확인
            const { data: recentData, error: recentError } = await supabase
                .from('excel_data')
                .select('uploaded_at, filename')
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();
            
            if (!recentError && recentData) {
                const uploadDate = new Date(recentData.uploaded_at);
                answer += `\n📅 최근 업로드: ${uploadDate.toLocaleString('ko-KR')}\n`;
                if (recentData.filename) {
                    answer += `📄 파일명: ${recentData.filename}\n`;
                }
            }
        }
        
        if (memoryData.length !== count) {
            answer += `\n⚠️ 메모리와 Supabase의 데이터 개수가 다릅니다.\n`;
            answer += `   파일을 다시 업로드하면 Supabase에 저장됩니다.`;
        }
        
    } catch (error) {
        answer += `\n❌ Supabase 확인 오류: ${error.message}`;
    }
    
    return answer;
}

// 예측 모델 API 호출
async function getPrediction(locationCode, date = null) {
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location_code: locationCode,
                date: date || getNextWeekDate(),
                metrics: ['pH', 'FAI', 'BOD', 'T-N', 'T-P']
            })
        });
        
        const prediction = await response.json();
        return prediction;
    } catch (error) {
        console.error('예측 모델 오류:', error);
        return null;
    }
}

// 예측 결과를 자연스러운 텍스트로 변환
function formatPredictionResult(prediction) {
    let text = `📅 **다음주 예측 결과** (${prediction.date})\n\n`;
    
    // 수질 등급 예측
    if (prediction.water_quality) {
        text += `💧 **수질 등급**: ${prediction.water_quality.grade}\n`;
        text += `   - pH: ${prediction.water_quality.pH}\n`;
        text += `   - BOD: ${prediction.water_quality.BOD}\n`;
    }
    
    // 조류 경보 예측
    if (prediction.algae_alert) {
        text += `\n🌊 **조류 경보 단계**: ${prediction.algae_alert.level}\n`;
        text += `   - FAI: ${prediction.algae_alert.FAI}\n`;
        text += `   - ${prediction.algae_alert.description}\n`;
    }
    
    // 경고 메시지
    if (prediction.warnings && prediction.warnings.length > 0) {
        text += `\n⚠️ **경고**:\n`;
        prediction.warnings.forEach(warning => {
            text += `   - ${warning.message}\n`;
            if (warning.manual) {
                text += `     💡 대응 메뉴얼: ${warning.manual.title}\n`;
            }
        });
    }
    
    return text;
}

// 시계열 차트 생성
function showTimeSeriesChart(locationCode, metric) {
    // Supabase에서 시계열 데이터 가져오기
    supabase
        .from('excel_data')
        .select('row_data, Date')
        .ilike('row_data->>분류코드', `%${locationCode}%`)
        .order('Date', { ascending: true })
        .then(({ data }) => {
            const chartData = data.map(row => ({
                date: row.Date,
                value: parseFloat(row.row_data[metric])
            }));
            
            // Chart.js로 차트 생성
            renderTimeSeriesChart(chartData, metric);
        });
}

// 지도에 공간적 변화 표시
function showSpatialMap(locationCode, metric) {
    // Leaflet으로 지도 생성
    const map = L.map('map-container').setView([37.5, 127.5], 10);
    
    // 위치별 데이터 표시
    supabase
        .from('excel_data')
        .select('row_data, 경도, 위도')
        .then(({ data }) => {
            data.forEach(row => {
                const value = row.row_data[metric];
                const color = getColorByValue(value, metric);
                
                L.circleMarker([row.위도, row.경도], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    radius: 10
                }).addTo(map)
                .bindPopup(`${row.조사구간명}: ${metric} = ${value}`);
            });
        });
}

// 메뉴얼 검색 (벡터 검색 또는 키워드 검색)
async function searchManual(situation, locationCode = null) {
    // Supabase에 메뉴얼 테이블이 있다고 가정
    const { data } = await supabase
        .from('manuals')
        .select('*')
        .ilike('situation', `%${situation}%`)
        .limit(5);
    
    return data;
}

// 경고 시스템
async function checkAlerts(row) {
    const alerts = [];
    
    // 수질 경고
    const waterQuality = calculateWaterQualityGrade(row.pH, row);
    if (waterQuality.grade === 'IV등급 이하') {
        alerts.push({
            type: 'water_quality',
            level: 'critical',
            message: '수질이 IV등급 이하입니다. 즉시 조치가 필요합니다.',
            manual: await searchManual('수질 사고')
        });
    }
    
    // 조류 경고
    const algaeAlert = calculateAlgaeAlertLevel(row);
    if (algaeAlert.level === '경보') {
        alerts.push({
            type: 'algae',
            level: 'warning',
            message: '조류 경보 단계입니다. 녹조 대응 메뉴얼을 확인하세요.',
            manual: await searchManual('녹조')
        });
    }
    
    return alerts;
}
