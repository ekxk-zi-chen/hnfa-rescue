// api/verify.js 

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// --------------------
// 從 Vercel 環境變數讀取設定
// --------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// --------------------
// 建立 Supabase client（用 Service Role Key, 可做完整 CRUD）
// --------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --------------------
// Helper: 產生 sessionToken（JWT）
// --------------------
function createSessionToken(userId, permissions = {}) {
  // payload 可自訂
  const payload = {
    userId,
    permissions,
    iat: Math.floor(Date.now() / 1000)
  };
  // 簽發 JWT
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// --------------------
// Helper: 驗證 LIFF idToken
// --------------------
async function verifyIdToken(idToken) {
  // 這裡使用 line 的官方 endpoint 來驗證 idToken
  // 也可以用 jwt.verify 但官方建議用 endpoint
  const res = await fetch(`https://api.line.me/oauth2/v2.1/verify?id_token=${idToken}&client_id=${process.env.LIFF_CLIENT_ID}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data; // 回傳 userId、name、email 等
}

// --------------------
// API 主函式
// --------------------
export default async function handler(req, res) {
  try {
    // 只接受 POST
    if (req.method !== 'POST') {
      return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    // 解析 body
    const bodyText = req.body;
    let body;
    try { body = JSON.parse(bodyText); } catch(e){ body = {}; }

    const { idToken, sessionToken } = body;

    // --------------------
    // 1️⃣ 如果有 sessionToken，就先驗證
    // --------------------
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        return res.status(200).json({ status: 'ok', userId: decoded.userId, permissions: decoded.permissions, sessionToken });
      } catch(e) {
        // session 過期或無效，繼續走 idToken 流程
      }
    }

    // --------------------
    // 2️⃣ 如果有 idToken，就驗證 LINE 身份
    // --------------------
    if (!idToken) {
      return res.status(400).json({ status: 'error', message: '缺少 idToken 或 sessionToken' });
    }

    const profile = await verifyIdToken(idToken);
    if (!profile || !profile.sub) {
      return res.status(401).json({ status: 'error', message: 'idToken 驗證失敗' });
    }

    const userId = profile.sub;

    // --------------------
    // 3️⃣ 查 Supabase Table 確認使用者權限
    // --------------------
    // 假設你有一個 table 叫 users，有欄位 user_id、role
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // 需要報名或尚未註冊
      return res.status(200).json({ status: 'needsignup', userId });
    }

    // --------------------
    // 4️⃣ 產生 sessionToken 回傳給前端
    // --------------------
    const permissions = { role: data.role }; // 可自訂更多權限
    const newSessionToken = createSessionToken(userId, permissions);

    return res.status(200).json({
      status: 'ok',
      userId,
      displayName: data.display_name,
      permissions,
      sessionToken: newSessionToken
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: '伺服器錯誤' });
  }
}
