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

    // ---------- 如果是註冊提交 (signup === true) ----------
    if (signup) {
      // 前端應該送來表單欄位 (name,email,phone,displayName, etc.)
      const { name, email, phone, displayName, lineUserId, message } = body;

      // 取得 userId（優先用 idToken，若沒有嘗試用 sessionToken）
      let userId = null;
      let resolvedDisplayName = displayName || name || null;

      if (idToken) {
        const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
        userId = profile.sub;
        resolvedDisplayName = resolvedDisplayName || profile.name || null;
      } else if (sessionToken) {
        try {
          const decoded = jwt.verify(sessionToken, JWT_SECRET);
          userId = decoded.userId;
          resolvedDisplayName = resolvedDisplayName || decoded.displayName || null;
        } catch (e) {
          // 無效 sessionToken
          return res.status(401).json({ status: "error", message: "Invalid sessionToken" });
        }
      } else {
        // 若沒有任何 token，拒絕（你也可以改成允許匿名註冊）
        return res.status(400).json({ status: "error", message: "缺少 idToken 或 sessionToken（signup）" });
      }

      // 檢查是否已存在 (避免重複建立)
      const { data: existing, error: selErr } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (selErr && selErr.code !== "PGRST116") {
        console.error("[handler] Supabase 查詢錯誤", selErr.message);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }

      if (existing) {
        // 已存在 → 直接回傳 ok 並產生 sessionToken
        const token = createSessionToken(userId, { displayName: existing.display_name || resolvedDisplayName });
        return res.status(200).json({
          status: "ok",
          displayName: existing.display_name || resolvedDisplayName,
          sessionToken: token
        });
      }

      // 插入新使用者（依照你的 users 欄位調整）
      const insertPayload = {
        user_id: userId,
        display_name: resolvedDisplayName || null,
        name: name || null,
        email: email || null,
        phone: phone || null,
        role: "user", // 預設角色，必要時調整
        created_at: new Date().toISOString()
      };

      const { data: inserted, error: insErr } = await supabase
        .from("users")
        .insert(insertPayload)
        .select()
        .single();

      if (insErr) {
        console.error("[handler] Supabase 插入錯誤", insErr.message);
        return res.status(500).json({ status: "error", message: "Failed to create user", error: insErr.message });
      }

      // 建立 sessionToken 並回傳
      const newToken = createSessionToken(userId, { displayName: inserted.display_name || resolvedDisplayName });
      return res.status(200).json({
        status: "ok",
        displayName: inserted.display_name || resolvedDisplayName,
        sessionToken: newToken
      });
    }

    // ---------- 非註冊流程：驗證 idToken 並檢查使用者是否存在 ----------
    // 非 signup 時，必須傳 idToken（或你可以擴充同時支援 sessionToken）
    if (!idToken) return res.status(400).json({ status: "error", message: "缺少 idToken" });

    const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
    const userId = profile.sub;
    const displayName = profile.name || "用戶";

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[handler] Supabase 查詢錯誤", error.message);
      return res.status(500).json({ status: "error", message: "Database query error" });
    }

    const needsSignup = !userData;
    const newSessionToken = userId ? createSessionToken(userId, { displayName }) : null;

    res.status(200).json({
      status: needsSignup ? "needsignup" : "ok",
      displayName: userData?.display_name || displayName,
      sessionToken: newSessionToken
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
