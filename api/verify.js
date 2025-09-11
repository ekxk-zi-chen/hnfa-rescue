import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { verifyIdToken } from "./utils/line";
import { createSessionToken } from "./utils/jwt";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;
const CORS_ORIGIN = process.env.CORS_ORIGIN || null; // 若想強制固定 origin，可在 env 設定

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// === CORS helper ===
function setCorsHeaders(res, origin) {
  // origin: 字串 (例如 "https://ekxk-zi-chen.github.io") 或 "*" 
  res.setHeader("Access-Control-Allow-Origin", origin);
  // 告訴快取／代理回應會依 Origin 變化
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // 注意：此版本不設 Access-Control-Allow-Credentials
}

export default async function handler(req, res) {
  // 決定要回的 origin：若有 env 指定，就用 env（強制）；否則使用 request origin；再沒有則用 '*'
  const reqOrigin = req.headers.origin || null;
  const replyOrigin = CORS_ORIGIN || reqOrigin || "*";

  // 預檢請求（OPTIONS）
  if (req.method === "OPTIONS") {
    setCorsHeaders(res, replyOrigin);
    // 204 No Content 比 200 更常用於預檢
    return res.status(204).end();
  }

  // 其他情況一律帶上 CORS header（避免主請求漏掉）
  setCorsHeaders(res, replyOrigin);

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    // 更健壮的请求体解析
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({
        status: "error",
        message: "Invalid JSON format",
      });
    }

    const { idToken, sessionToken } = body || {};

    // 環境變數檢查（警告而不是直接報錯）
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn("Supabase env vars not configured");
    }
    if (!JWT_SECRET) {
      console.warn("JWT_SECRET not configured");
    }

    // sessionToken 驗證
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
        console.warn("sessionToken invalid:", e.message);
        // 繼續處理 idToken
      }
    }

    // idToken 必須存在
    if (!idToken) {
      return res.status(400).json({
        status: "error",
        message: "缺少 idToken",
      });
    }

    // 驗證 LINE idToken
    let profile;
    try {
      profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
    } catch (err) {
      console.error("verifyIdToken error:", err);
      return res.status(401).json({
        status: "error",
        message: "idToken 驗證失敗",
      });
    }

    if (!profile || !profile.sub) {
      return res.status(401).json({
        status: "error",
        message: "idToken 驗證失敗",
      });
    }

    const userId = profile.sub;

    // 查詢 Supabase
    let userData;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // 沒找到記錄 → 需要註冊
          return res.status(200).json({
            status: "needsignup",
            userId,
          });
        }
        throw error;
      }
      userData = data;
    } catch (err) {
      console.error("Supabase query failed:", err);
      return res.status(500).json({
        status: "error",
        message: "数据库查询失败",
      });
    }

    // 建立 sessionToken
    let newSessionToken;
    try {
      newSessionToken = createSessionToken(userId, {
        role: userData.role,
      });
    } catch (err) {
      console.error("createSessionToken failed:", err);
      return res.status(500).json({
        status: "error",
        message: "无法建立 sessionToken",
      });
    }

    // 成功回應
    return res.status(200).json({
      status: "ok",
      userId,
      displayName: userData.display_name,
      permissions: { role: userData.role },
      sessionToken: newSessionToken,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return res.status(500).json({
      status: "error",
      message: "服务器内部错误",
    });
  }
}
