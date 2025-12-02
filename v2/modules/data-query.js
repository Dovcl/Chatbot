// 데이터 조회 모듈
// 질문을 파싱하고 Supabase에서 데이터를 조회

// 컬럼 별칭 정의
const COLUMN_ALIASES = {
    longitude: ['경도', 'longitude', 'lon', 'long', 'x'],
    latitude: ['위도', 'latitude', 'lat', 'y'],
    ph: ['ph', 'pH', 'PH']
};

// 질문 파싱 및 데이터 조회 (메인 함수)
export async function queryData(question, options = {}) {
    const { supabase } = options;
    
    if (!supabase) {
        // Supabase가 없으면 메모리 데이터 사용
        if (window.currentData && window.currentData.length > 0) {
            return parseQuestionAndAnswer(question, window.currentData);
        }
        throw new Error('Supabase가 초기화되지 않았습니다.');
    }
    
    try {
        // 1. 질문 파싱
        const queryConditions = parseQuestionToQuery(question);
        console.log('🔍 파싱된 쿼리 조건:', queryConditions);
        
        // 2. 컬럼명 정보 가져오기
        let columns = [];
        const { data: sampleData, error: sampleError } = await supabase
            .from('excel_data')
            .select('row_data')
            .limit(1)
            .single();
        
        if (!sampleError && sampleData && sampleData.row_data) {
            columns = Object.keys(sampleData.row_data);
        } else if (window.currentData && window.currentData.length > 0) {
            columns = Object.keys(window.currentData[0]);
        } else {
            throw new Error('데이터가 없습니다. 파일을 업로드해주세요.');
        }
        
        // 3. Supabase에서 데이터 가져오기
        let supabaseQuery = supabase
            .from('excel_data')
            .select('row_data, id')
            .limit(10000);
        
        const { data, error } = await supabaseQuery;
        
        if (error) throw error;
        
        // 4. 데이터 추출 및 중복 제거
        let extractedData = (data || []).map(row => row.row_data);
        
        const seen = new Set();
        extractedData = extractedData.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        console.log(`📊 중복 제거 후: ${extractedData.length}개`);
        
        // 5. 필터링
        let filteredData = applyFilters(extractedData, queryConditions, columns);
        
        console.log(`📊 최종 필터링 후: ${filteredData.length}개`);
        
        // 6. 타겟 컬럼 매칭
        let matchedTargetColumns = [];
        if (queryConditions.targetColumns && queryConditions.targetColumns.length > 0) {
            queryConditions.targetColumns.forEach(targetCol => {
                if (columns.includes(targetCol)) {
                    matchedTargetColumns.push(targetCol);
                } else {
                    const found = columns.find(col => 
                        col.toLowerCase() === targetCol.toLowerCase()
                    );
                    if (found) {
                        matchedTargetColumns.push(found);
                    } else {
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
        
        return {
            data: filteredData,
            targetColumns: matchedTargetColumns,
            queryConditions: queryConditions,
            columns: columns
        };
        
    } catch (error) {
        console.error('데이터 조회 오류:', error);
        // Fallback: 메모리 데이터 사용
        if (window.currentData && window.currentData.length > 0) {
            console.log('💾 메모리 데이터로 fallback');
            return parseQuestionAndAnswer(question, window.currentData);
        }
        throw error;
    }
}

// 질문을 쿼리 조건으로 파싱
function parseQuestionToQuery(question) {
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
            result.numericFilters.push({
                column: type,
                value: value,
                tolerance: 1e-6
            });
            console.log(`🔢 숫자 조건 추가: ${type} = ${value}`);
        }
    }
    
    // 텍스트 필터 추출
    const textFilterRegex = /([가-힣a-zA-Z_]+)[은는]?\s+([가-힣a-zA-Z0-9\-_\.]+)/g;
    
    let match;
    textFilterRegex.lastIndex = 0;
    while ((match = textFilterRegex.exec(question)) !== null) {
        const columnName = match[1].trim();
        let filterValue = match[2].trim();
        
        // 값에서 조사 제거
        filterValue = filterValue.replace(/(에서의|에서|의|에|알려줘|알려|줘|값|값을|값이).*$/, '').trim();
        
        // 숫자 필터로 이미 처리된 컬럼은 스킵
        const isNumericColumn = COLUMN_ALIASES.longitude.includes(columnName) ||
                               COLUMN_ALIASES.latitude.includes(columnName) ||
                               COLUMN_ALIASES.ph.includes(columnName);
        
        if (isNumericColumn) continue;
        
        if (filterValue) {
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
    
    // 타겟 컬럼 추출
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

// 필터 적용
function applyFilters(data, queryConditions, columns) {
    let filtered = [...data];
    
    // 텍스트 필터
    if (queryConditions.textFilters && queryConditions.textFilters.length > 0) {
        for (const filter of queryConditions.textFilters) {
            const beforeCount = filtered.length;
            
            if (columns.includes(filter.column)) {
                filtered = filtered.filter(row => {
                    const value = String(row[filter.column] || '').trim().toLowerCase();
                    const match = value.includes(filter.value.toLowerCase());
                    if (match) {
                        console.log(`✅ 텍스트 매칭: ${filter.column} = "${row[filter.column]}" (검색: "${filter.value}")`);
                    }
                    return match;
                });
            } else {
                const matchedColumn = columns.find(col => 
                    col.toLowerCase().includes(filter.column.toLowerCase()) ||
                    filter.column.toLowerCase().includes(col.toLowerCase())
                );
                if (matchedColumn) {
                    console.log(`🔍 컬럼명 매칭: "${filter.column}" → "${matchedColumn}"`);
                    filtered = filtered.filter(row => {
                        const value = String(row[matchedColumn] || '').trim().toLowerCase();
                        return value.includes(filter.value.toLowerCase());
                    });
                }
            }
            
            console.log(`필터링: ${filter.column} = ${filter.value}: ${beforeCount}개 → ${filtered.length}개`);
        }
    }
    
    // 날짜 필터
    if (queryConditions.date) {
        const dateKeys = ['Date', 'date', 'DATE', '날짜', '조사일자', '일자'];
        for (const dateKey of dateKeys) {
            if (columns.includes(dateKey)) {
                const beforeCount = filtered.length;
                filtered = filtered.filter(row => {
                    const rowDate = String(row[dateKey] || '');
                    return rowDate.includes(queryConditions.date) ||
                           rowDate.includes(queryConditions.date.replace(/-/g, '/')) ||
                           rowDate.includes(queryConditions.date.replace(/-/g, '.'));
                });
                console.log(`날짜 필터링: ${dateKey} = ${queryConditions.date}: ${beforeCount}개 → ${filtered.length}개`);
                break;
            }
        }
    }
    
    // 숫자 필터
    if (queryConditions.numericFilters && queryConditions.numericFilters.length > 0) {
        for (const filter of queryConditions.numericFilters) {
            const colName = findColumnName(columns, filter.column);
            if (colName) {
                const beforeCount = filtered.length;
                filtered = filtered.filter(row => {
                    const value = parseFloat(row[colName]);
                    if (isNaN(value)) return false;
                    const diff = Math.abs(value - filter.value);
                    const matched = diff <= filter.tolerance;
                    if (matched) {
                        console.log(`✅ 숫자 매칭: ${colName} = ${value} (목표: ${filter.value}, 차이: ${diff.toFixed(8)})`);
                    }
                    return matched;
                });
                console.log(`필터링: ${colName} = ${filter.value}: ${beforeCount}개 → ${filtered.length}개`);
            }
        }
    }
    
    return filtered;
}

// 컬럼명 찾기
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

// 별칭으로 컬럼 찾기
function findColumnByAliases(columns, aliasList) {
    const lowerCols = columns.map(c => normalizeName(c));
    
    for (const alias of aliasList) {
        const a = normalizeName(alias);
        let idx = lowerCols.indexOf(a);
        if (idx !== -1) {
            return columns[idx];
        }
        
        idx = lowerCols.findIndex(colName => colName.includes(a) || a.includes(colName));
        if (idx !== -1) {
            return columns[idx];
        }
    }
    
    return null;
}

// 이름 정규화
function normalizeName(name) {
    return String(name).trim().toLowerCase();
}

// Fallback: 메모리 데이터로 파싱 (기존 로직 유지)
function parseQuestionAndAnswer(question, data) {
    // 간단한 구현 (필요시 기존 로직 사용)
    return {
        data: data,
        targetColumns: [],
        queryConditions: {},
        columns: data.length > 0 ? Object.keys(data[0]) : []
    };
}
