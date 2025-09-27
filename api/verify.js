// api/verify.js
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch"; // node 需要 fetch

// ------------------- 驗證 LINE idToken -------------------
async function verifyIdToken(idToken, clientId) {
  console.log("[verifyIdToken] 開始驗證 idToken", { idToken: idToken?.substring(0, 20) + '...', clientId });
  
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `id_token=${encodeURIComponent(idToken)}&client_id=${clientId}`
  });
  
  console.log("[verifyIdToken] LINE verify 回應狀態", res.status);
  if (!res.ok) {
    const errorText = await res.text();
    console.log("[verifyIdToken] LINE verify 錯誤", errorText);
    throw new Error("idToken 驗證失敗");
  }
  const data = await res.json();
  console.log("[verifyIdToken] LINE verify 回傳內容", data);
  if (!data.sub) throw new Error("idToken 驗證失敗");
  return { sub: data.sub, name: data.name || null };
}

// ------------------- 建立自己的 sessionToken（JWT） -------------------
function createSessionToken(userId, payload) {
  const secret = process.env.JWT_SECRET;
  console.log("[createSessionToken] 使用 JWT_SECRET 長度:", secret?.length);
  return jwt.sign({ userId, ...payload }, secret, { expiresIn: "1h" }); // 1 小時
}

// ------------------- 主 handler -------------------
export default async function handler(req, res) {
  console.log("[handler] 請求方法", req.method);
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ status: "error", message: "Method not allowed" });

  try {
    const USE_LOCAL_TEST = process.env.USE_LOCAL_TEST === "true";

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;
    const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;

    console.log("[handler] 環境變數檢查", { USE_LOCAL_TEST, SUPABASE_URL, LIFF_CLIENT_ID });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !LIFF_CLIENT_ID) {
      console.error("[handler] 環境變數缺失");
      return res.status(500).json({ status: "error", message: "Server misconfiguration" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { idToken, sessionToken } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("[handler] 收到的 token", { idToken: idToken?.substring(0, 20) + '...', sessionToken: sessionToken?.substring(0, 20) + '...' });

    let userId, displayName, role;

    // 1️⃣ sessionToken 驗證優先
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        console.log("[handler] sessionToken 驗證成功", decoded);
        return res.status(200).json({
          status: "ok",
          userId: decoded.userId,
          displayName: decoded.displayName || null,
          permissions: { role: decoded.role },
          sessionToken,
          testMode: USE_LOCAL_TEST,
        });
      } catch (err) {
        console.warn("[handler] sessionToken 無效或過期", err.message);
        // 無效或過期 → 用 idToken 流程
      }
    }

    // 2️⃣ 本地測試模式
    if (USE_LOCAL_TEST) {
      console.log("[handler] 本地測試模式啟用");
      userId = "local-test-user";
      displayName = "本地測試用";
      role = "tester";
    } else {
      // 3️⃣ idToken 驗證 LINE
      if (!idToken) {
        console.error("[handler] 缺少 idToken");
        return res.status(400).json({ status: "error", message: "缺少 idToken" });
      }

      let profile;
      try {
        profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
        if (!profile?.sub) return res.status(401).json({ status: "error", message: "idToken 驗證失敗: profile.sub 不存在" });
        console.log("[handler] idToken 驗證成功", profile);
      } catch (err) {
        console.error("[handler] verifyIdToken 錯誤:", err);
        return res.status(401).json({ status: "error", message: "idToken 驗證失敗: " + err.message });
      }

      userId = profile.sub;

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("[handler] Supabase 查詢錯誤", error.message);
        return res.status(500).json({ status: "error", message: "Database query error", error: error.message });
      }

      displayName = userData.display_name;
      role = userData.role;
      console.log("[handler] 從 Supabase 取得使用者資料", { displayName, role });
    }

    // 4️⃣ 建立新的 sessionToken
    const newSessionToken = createSessionToken(userId, { role, displayName });
    console.log("[handler] 新 sessionToken 建立成功");

    // 5️⃣ 回傳結果
    res.status(200).json({
      status: "ok",
      userId,
      displayName,
      permissions: { role },
      sessionToken: newSessionToken,
      testMode: USE_LOCAL_TEST,
    });

  } catch (err) {
    console.error("[handler] 伺服器內部錯誤", err);
    res.status(500).json({ status: "error", message: "Server internal error", error: err.message });
  }
}
