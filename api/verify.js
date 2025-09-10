// api/verify.js

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// 從 Vercel 環境變數讀取設定
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;
console.log('SUPABASE_URL', SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY', !!SUPABASE_SERVICE_KEY);
console.log('JWT_SECRET', !!JWT_SECRET);
console.log('LIFF_CLIENT_ID', process.env.LIFF_CLIENT_ID);

// 建立 Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper: 產生 sessionToken
function createSessionToken(userId, permissions = {}) {
  return jwt.sign({ userId, permissions, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: '24h' });
}

// Helper: 驗證 LINE idToken
async function verifyIdToken(idToken) {
  try {
    const res = await fetch(`https://api.line.me/oauth2/v2.1/verify?id_token=${idToken}&client_id=${LIFF_CLIENT_ID}`);
    if (!res.ok) throw new Error(`LINE verify failed status=${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('verifyIdToken error:', err);
    return null;
  }
}

// API 主函式
export default async function handler(req, res) {
  console.log('=== verify.js called ===');
  console.log('SUPABASE_URL:', SUPABASE_URL);
  console.log('SUPABASE_SERVICE_KEY exists:', !!SUPABASE_SERVICE_KEY);
  console.log('JWT_SECRET exists:', !!JWT_SECRET);
  console.log('LIFF_CLIENT_ID:', LIFF_CLIENT_ID);

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const { idToken, sessionToken } = req.body || {};
    console.log('Received idToken length:', idToken?.length);
    console.log('Received sessionToken exists:', !!sessionToken);

    // 1️⃣ 驗證 sessionToken
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        console.log('sessionToken valid for userId:', decoded.userId);
        return res.status(200).json({ status: 'ok', userId: decoded.userId, permissions: decoded.permissions, sessionToken });
      } catch (e) {
        console.log('sessionToken invalid or expired, fallback to idToken');
      }
    }

    // 2️⃣ 驗證 idToken
    if (!idToken) {
      return res.status(400).json({ status: 'error', message: '缺少 idToken 或 sessionToken' });
    }

    const profile = await verifyIdToken(idToken);
    if (!profile || !profile.sub) {
      return res.status(401).json({ status: 'error', message: 'idToken 驗證失敗' });
    }
    const userId = profile.sub;
    console.log('LINE userId:', userId);

    // 3️⃣ 查 Supabase
    const { data, error } = await supabase.from('users').select('*').eq('user_id', userId).single();
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ status: 'error', message: 'Supabase 查詢錯誤' });
    }
    if (!data) {
      console.log('User not found in users table');
      return res.status(200).json({ status: 'needsignup', userId });
    }

    // 4️⃣ 產生 sessionToken
    const permissions = { role: data.role };
    const newSessionToken = createSessionToken(userId, permissions);
    console.log('New sessionToken created for userId:', userId);

    return res.status(200).json({
      status: 'ok',
      userId,
      displayName: data.display_name,
      permissions,
      sessionToken: newSessionToken
    });

  } catch (err) {
    console.error('Unhandled error in verify.js:', err);
    return res.status(500).json({ status: 'error', message: '伺服器錯誤' });
  }
}
