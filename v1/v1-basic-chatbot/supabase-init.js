// Supabase 초기화 모듈
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase 초기화
let supabase = null;

if (window.supabaseConfig && window.supabaseConfig.url && window.supabaseConfig.anonKey) {
    try {
        supabase = createClient(window.supabaseConfig.url, window.supabaseConfig.anonKey);
        window.supabase = supabase;
        console.log('✅ Supabase 초기화 완료');
    } catch (error) {
        console.error('❌ Supabase 초기화 오류:', error);
    }
} else {
    console.warn('⚠️ Supabase 설정이 없습니다. supabase-config.js를 확인하세요.');
}

