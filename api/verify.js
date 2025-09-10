// api/verify.js
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;
// 設定允許的 origin，例如 https://hnfa-rescue-1dm6jp64t-ekxk-zi-chens-projects.vercel.app
// 在 Vercel Dashboard 用環境變數 CORS_ORIGIN 設定，或先用 '*' 作測試（不建議正式放 *）
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// helper: set CORS headers on the response object
function setCorsHeaders(res, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // 若要允許憑證(cookie/authorization)，設定以下（但要配合前端 fetch 的 credentials）
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
}

async function verifyIdToken(idToken) {
  try {
    const r = await fetch(`https://api.line.me/oauth2/v2.1/verify?id_token=${encodeURIComponent(idToken)}&client_id=${LIFF_CLIENT_ID}`);
    if (!r.ok) {
      console.error('LINE verify status', r.status);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error('LINE verify error', e);
    return null;
  }
}

function createSessionToken(userId, permissions = {}) {
  return jwt.sign({ userId, permissions, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: '24h' });
}

export default async function handler(req, res) {
  // 處理 preflight
  setCorsHeaders(res, CORS_ORIGIN);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const { idToken, sessionToken } = req.body || {};

    // quick env check
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !LIFF_CLIENT_ID) {
      console.error('Missing env vars', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY, JWT_SECRET: !!JWT_SECRET, LIFF_CLIENT_ID: !!LIFF_CLIENT_ID });
      return res.status(500).json({ status: 'error', message: 'Server env not configured' });
    }

    // sessionToken 驗證
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        return res.status(200).json({ status: 'ok', userId: decoded.userId, permissions: decoded.permissions, sessionToken });
      } catch (e) {
        // invalid token -> fallback to idToken flow
        console.log('session invalid, fallback to idToken');
      }
    }

    if (!idToken) {
      return res.status(400).json({ status: 'error', message: '缺少 idToken 或 sessionToken' });
    }

    const profile = await verifyIdToken(idToken);
    if (!profile || !profile.sub) {
      return res.status(401).json({ status: 'error', message: 'idToken 驗證失敗' });
    }
    const userId = profile.sub;

    // supabase 查詢
    const { data, error } = await supabase.from('users').select('*').eq('user_id', userId).single();
    if (error) {
      console.error('Supabase query error', error);
      return res.status(500).json({ status: 'error', message: 'Supabase 查詢錯誤' });
    }
    if (!data) {
      return res.status(200).json({ status: 'needsignup', userId });
    }

    const permissions = { role: data.role };
    const newSessionToken = createSessionToken(userId, permissions);

    return res.status(200).json({
      status: 'ok',
      userId,
      displayName: data.display_name,
      permissions,
      sessionToken: newSessionToken
    });

  } catch (err) {
    console.error('verify handler error', err);
    return res.status(500).json({ status: 'error', message: '伺服器錯誤', detail: String(err) });
  }
}
