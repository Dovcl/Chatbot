// Supabase 초기화 모듈
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase 초기화
let supabase = null;

console.log('🔍 Supabase 초기화 시작...');
console.log('🔍 supabaseConfig 확인:', window.supabaseConfig);

if (window.supabaseConfig && window.supabaseConfig.url && window.supabaseConfig.anonKey) {
    try {
        supabase = createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
        
        // window 객체에 명시적으로 설정 (여러 번 시도)
        window.supabase = supabase;
        window.supabaseInstance = supabase;
        
        // 전역 변수로도 설정
        if (typeof globalThis !== 'undefined') {
            globalThis.supabase = supabase;
        }
        
        console.log('✅ Supabase 초기화 완료');
        console.log('✅ window.supabase 설정됨:', window.supabase);
        console.log('✅ Supabase URL:', window.supabaseConfig.url);
        console.log('✅ window.supabaseInstance도 설정됨');
        
        // 초기화 완료 이벤트 발생
        window.dispatchEvent(new CustomEvent('supabaseReady', { detail: supabase }));
        console.log('✅ supabaseReady 이벤트 발생');
        
    } catch (error) {
        console.error('❌ Supabase 초기화 오류:', error);
        window.supabase = null;
        window.dispatchEvent(new CustomEvent('supabaseError', { detail: error }));
    }
} else {
    console.warn('⚠️ Supabase 설정이 없습니다. supabase-config.js를 확인하세요.');
    console.warn('⚠️ supabaseConfig:', window.supabaseConfig);
    window.supabase = null;
}

