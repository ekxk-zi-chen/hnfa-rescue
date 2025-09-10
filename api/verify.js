// verify.js
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { verifyIdToken } from "./utils/line";
import { createSessionToken } from "./utils/jwt";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://ekxk-zi-chen.github.io";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---- CORS ----
function setCorsHeaders(res, origin = "*") {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  // 1️⃣ 最前面就處理 OPTIONS
  setCorsHeaders(res, CORS_ORIGIN);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    // 2️⃣ 安全解析 body
    let body = {};
    if (req.body) {
      if (typeof req.body === "string") {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }
    }

    const { idToken, sessionToken } = body || {};

    // 3️⃣ 確認環境變數
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !LIFF_CLIENT_ID) {
      console.error("Missing env vars");
      return res.status(500).json({ status: "error", message: "Server env not configured" });
    }

    // 4️⃣ sessionToken 驗證
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        return res.status(200).json({
          status: "ok",
          userId: decoded.userId,
          permissions: decoded.permissions,
          sessionToken,
        });
      } catch (e) {
        console.error("sessionToken invalid:", e);
      }
    }

    // 5️⃣ idToken 必須存在
    if (!idToken) {
      return res.status(400).json({ status: "error", message: "缺少 idToken 或 sessionToken" });
    }

    // 6️⃣ 驗證 LINE idToken
    let profile;
    try {
      profile = await verifyIdToken(idToken);
    } catch (err) {
      console.error("verifyIdToken error:", err);
      return res.status(401).json({ status: "error", message: "idToken 驗證失敗" });
    }

    if (!profile || !profile.sub) {
      return res.status(401).json({ status: "error", message: "idToken 驗證失敗" });
    }

    const userId = profile.sub;

    // 7️⃣ 查 Supabase users
    let userData;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      userData = data;
    } catch (err) {
      console.error("Supabase query failed:", err);
      return res.status(500).json({ status: "error", message: "Supabase 查詢失敗" });
    }

    if (!userData) {
      return res.status(200).json({ status: "needsignup", userId });
    }

    // 8️⃣ 建立新的 sessionToken
    let newSessionToken;
    try {
      newSessionToken = createSessionToken(userId, { role: userData.role });
    } catch (err) {
      console.error("createSessionToken failed:", err);
      return res.status(500).json({ status: "error", message: "無法建立 sessionToken" });
    }

    // 9️⃣ 回傳成功
    return res.status(200).json({
      status: "ok",
      userId,
      displayName: userData.display_name,
      permissions: { role: userData.role },
      sessionToken: newSessionToken,
    });

  } catch (err) {
    console.error("Unhandled verify handler error:", err);
    setCorsHeaders(res, CORS_ORIGIN);
    return res.status(500).json({ status: "error", message: "伺服器錯誤", detail: String(err) });
  }
}
