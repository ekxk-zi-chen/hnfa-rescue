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

    const { idToken, signup } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    let userId = null;
    let displayName = null;
    let userData = null;

    if (!signup) {
      // 非註冊模式 → 必須有 idToken
      if (!idToken) return res.status(400).json({ status: "error", message: "缺少 idToken" });

      // 驗證 LINE idToken
      const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
      userId = profile.sub;
      displayName = profile.name || "用戶";

      // 查詢 Supabase
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[handler] Supabase 查詢錯誤", error.message);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }

      userData = data;
    }

    // 判斷是否需要註冊
    const needsSignup = signup || !userData;

    // 生成 sessionToken（如果 userId 可用）
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
