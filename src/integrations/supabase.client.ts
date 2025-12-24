// src/integrations/supabase.client.ts

import { createClient } from '@supabase/supabase-js';

// ==================== Supabase Client ====================

/**
 * Supabase 客戶端
 * 使用 Service Role Key（擁有完整權限）
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('❌ SUPABASE_URL 或 SUPABASE_SERVICE_KEY 未設定');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase Client 初始化完成');