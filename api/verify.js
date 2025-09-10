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

export default async function handler(req, res) {
  // 只在 OPTIONS 请求时设置 CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    // 更健壮的请求体解析
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid JSON format" 
      });
    }

    const { idToken, sessionToken } = body || {};

    // 环境变量检查（改为警告而不是直接返回错误）
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn("Supabase env vars not configured");
    }
    if (!JWT_SECRET) {
      console.warn("JWT_SECRET not configured");
    }

    // sessionToken 验证
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
        return res.status(200).json({
          status: "ok",
          userId: decoded.userId,
          permissions: decoded.permissions,
          sessionToken,
        });
      } catch (e) {
        console.warn("sessionToken invalid:", e.message);
        // 继续处理 idToken
      }
    }

    // idToken 必须存在
    if (!idToken) {
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      return res.status(400).json({ 
        status: "error", 
        message: "缺少 idToken" 
      });
    }

    // 验证 LINE idToken
    let profile;
    try {
      profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
    } catch (err) {
      console.error("verifyIdToken error:", err);
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      return res.status(401).json({ 
        status: "error", 
        message: "idToken 驗證失敗" 
      });
    }

    if (!profile || !profile.sub) {
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      return res.status(401).json({ 
        status: "error", 
        message: "idToken 驗證失敗" 
      });
    }

    const userId = profile.sub;

    // 查询 Supabase
    let userData;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // 没有找到记录
          res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
          return res.status(200).json({ 
            status: "needsignup", 
            userId 
          });
        }
        throw error;
      }
      userData = data;
    } catch (err) {
      console.error("Supabase query failed:", err);
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      return res.status(500).json({ 
        status: "error", 
        message: "数据库查询失败" 
      });
    }

    // 创建 sessionToken
    let newSessionToken;
    try {
      newSessionToken = createSessionToken(userId, { 
        role: userData.role 
      });
    } catch (err) {
      console.error("createSessionToken failed:", err);
      res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
      return res.status(500).json({ 
        status: "error", 
        message: "无法建立 sessionToken" 
      });
    }

    // 成功响应
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    return res.status(200).json({
      status: "ok",
      userId,
      displayName: userData.display_name,
      permissions: { role: userData.role },
      sessionToken: newSessionToken,
    });

  } catch (err) {
    console.error("Unhandled error:", err);
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    return res.status(500).json({ 
      status: "error", 
      message: "服务器内部错误" 
    });
  }
}
