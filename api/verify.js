import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

// ------------------- 驗證 LINE idToken -------------------
async function verifyIdToken(idToken, clientId) {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `id_token=${encodeURIComponent(idToken)}&client_id=${clientId}`
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error("idToken 驗證失敗: " + errorText);
  }

  const data = await res.json();
  if (!data.sub) throw new Error("idToken 驗證失敗: sub 不存在");
  return { sub: data.sub, name: data.name || null };
}

// ------------------- 建立自己的 sessionToken（JWT） -------------------
function createSessionToken(userId, payload = {}) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign({ userId, ...payload }, secret, { expiresIn: "1h" });
}

// ------------------- 驗證 sessionToken -------------------
function verifySessionToken(sessionToken, secret) {
  try {
    return jwt.verify(sessionToken, secret);
  } catch (e) {
    return null;
  }
}

// ------------------- 主 handler -------------------
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ status: "error", message: "Method not allowed" });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;
    const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !LIFF_CLIENT_ID) {
      return res.status(500).json({ status: "error", message: "Server misconfiguration" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 解析請求
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { idToken, sessionToken, signup } = body;

    console.log(`[${new Date().toISOString()}] 收到請求:`, {
      hasIdToken: !!idToken,
      hasSessionToken: !!sessionToken,
      isSignup: signup,
      bodyKeys: Object.keys(body)
    });

    // ---------- 情況1：純 sessionToken 驗證（快速登入檢查） ----------
    if (!idToken && sessionToken && !signup) {
      console.log('[sessionToken驗證] 開始驗證純 sessionToken');
      const decoded = verifySessionToken(sessionToken, JWT_SECRET);
      if (!decoded || !decoded.userId) {
        console.log('[sessionToken驗證] sessionToken 無效');
        return res.status(401).json({ status: "error", message: "Invalid sessionToken" });
      }

      // 檢查用戶是否還存在
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", decoded.userId)
        .single();

      console.log('[sessionToken驗證] 資料庫查詢結果:', { userData, error });

      if (error && error.code !== "PGRST116") {
        console.error("[sessionToken驗證] Supabase 查詢錯誤", error);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }

      if (!userData) {
        console.log('[sessionToken驗證] 用戶不存在');
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      // 使用您的資料表欄位
      const displayName = userData.display_name || userData.姓名 || decoded.displayName || "用戶";
      
      return res.status(200).json({
        status: "ok",
        displayName: displayName,
        userId: decoded.userId
      });
    }

    // ---------- 情況2：註冊流程 (signup === true) ----------
    if (signup === true) {
      console.log('[註冊] 開始處理註冊流程');
      const { name, email, phone, job, unit, script, displayName } = body;

      // 註冊必須要有 idToken 來綁定 LINE 用戶
      if (!idToken) {
        return res.status(400).json({ 
          status: "error", 
          message: "註冊需要 idToken" 
        });
      }

      // 驗證 idToken 並取得 LINE 用戶資訊
      const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
      const userId = profile.sub;
      const resolvedDisplayName = displayName || name || profile.name || "用戶";

      console.log('[註冊] LINE 用戶資訊:', { userId, resolvedDisplayName });

      // 檢查是否已存在
      const { data: existing, error: selErr } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (selErr && selErr.code !== "PGRST116") {
        console.error("[註冊] Supabase 查詢錯誤", selErr);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }

      if (existing) {
        // 已經註冊過了，直接返回成功
        console.log('[註冊] 用戶已存在，直接登入');
        const displayName = existing.display_name || existing.姓名 || resolvedDisplayName;
        const token = createSessionToken(userId, { displayName });
        return res.status(200).json({
          status: "ok",
          displayName: displayName,
          sessionToken: token,
          message: "用戶已存在，登入成功"
        });
      }

      // 創建新用戶 - 使用您的完整資料表欄位
      console.log('[註冊] 創建新用戶');
      
      const insertPayload = {
        user_id: userId,
        姓名: name || resolvedDisplayName,
        display_name: resolvedDisplayName,
        電子信箱: email || null,
        電話: phone || null,
        職稱: job || null,
        單位: unit || null,
        管理員: "一般用戶", 
        申請備註: script || null,
        創建時間: new Date().toISOString()
      };

      console.log('[註冊] 準備插入資料:', insertPayload);

      const { data: inserted, error: insErr } = await supabase
        .from("users")
        .insert(insertPayload)
        .select()
        .single();

      if (insErr) {
        console.error("[註冊] Supabase 插入錯誤", insErr);
        return res.status(500).json({ 
          status: "error", 
          message: "Failed to create user", 
          error: insErr.message || insErr.code || String(insErr),
          details: insErr.details || null,
          hint: insErr.hint || null
        });
      }

      console.log('[註冊] 用戶創建成功:', inserted);

      // 註冊成功，建立 sessionToken
      const finalDisplayName = inserted.display_name || inserted.姓名 || resolvedDisplayName;
      const newToken = createSessionToken(userId, { displayName: finalDisplayName });
      return res.status(200).json({
        status: "ok",
        displayName: finalDisplayName,
        sessionToken: newToken,
        message: "註冊成功"
      });
    }

    // ---------- 情況3：一般驗證流程（檢查登入狀態） ----------
    if (!idToken) {
      return res.status(400).json({ status: "error", message: "缺少 idToken" });
    }

    console.log('[驗證] 開始一般驗證流程');

    // 驗證 idToken
    const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
    const userId = profile.sub;
    const displayName = profile.name || "用戶";

    console.log('[驗證] LINE 用戶資訊:', { userId, displayName });

    // 檢查用戶是否存在
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[驗證] Supabase 查詢錯誤", error);
      return res.status(500).json({ status: "error", message: "Database query error" });
    }

    // 用戶不存在 → 需要註冊
    if (!userData) {
      console.log('[驗證] 用戶不存在，需要註冊');
      // 建立一個臨時的 sessionToken（包含 LINE 資訊，供註冊使用）
      const tempSessionToken = createSessionToken(userId, { 
        displayName, 
        temporary: true 
      });
      
      return res.status(200).json({
        status: "needsignup",
        displayName: displayName,
        sessionToken: tempSessionToken
      });
    }

    // 用戶存在 → 直接登入成功
    console.log('[驗證] 用戶存在，登入成功');
    const finalDisplayName = userData.display_name || userData.姓名 || displayName;
    const sessionTokenForLogin = createSessionToken(userId, { 
      displayName: finalDisplayName
    });
    
    return res.status(200).json({
      status: "ok",
      displayName: finalDisplayName,
      sessionToken: sessionTokenForLogin
    });

  } catch (err) {
    console.error("[handler] 錯誤:", err);
    res.status(500).json({ 
      status: "error", 
      message: err.message || "Internal server error",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
