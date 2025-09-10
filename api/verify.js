// handler.js

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

function setCorsHeaders(res, origin = "*") {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  setCorsHeaders(res, CORS_ORIGIN);

  // Preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res, CORS_ORIGIN);
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    setCorsHeaders(res, CORS_ORIGIN);
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      console.error("JSON parse error:", err);
      setCorsHeaders(res, CORS_ORIGIN);
      return res.status(400).json({ status: "error", message: "Invalid JSON" });
    }

    const { idToken, sessionToken } = body || {};

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !LIFF_CLIENT_ID) {
      console.error("Missing env vars");
      setCorsHeaders(res, CORS_ORIGIN);
      return res.status(500).json({ status: "error", message: "Server env not configured" });
    }

    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        setCorsHeaders(res, CORS_ORIGIN);
        return res.status(200).json({
          status: "ok",
          userId: decoded.userId,
          permissions: decoded.permissions,
          sessionToken,
        });
      } catch (e) {}
    }

    if (!idToken) {
      setCorsHeaders(res, CORS_ORIGIN);
      return res.status(400).json({ status: "error", message: "缺少 idToken 或 sessionToken" });
    }

    const profile = await verifyIdToken(idToken);
    if (!profile || !profile.sub) {
      setCorsHeaders(res, CORS_ORIGIN);
      return res.status(401).json({ status: "error", message: "idToken 驗證失敗" });
    }

    const userId = profile.sub;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Supabase query error", error);
      setCorsHeaders(res, CORS_ORIGIN);
      return res.status(500).json({ status: "error", message: "Supabase 查詢錯誤" });
    }

    if (!data) {
      setCorsHeaders(res, CORS_ORIGIN);
      return res.status(200).json({ status: "needsignup", userId });
    }

    const permissions = { role: data.role };
    const newSessionToken = createSessionToken(userId, permissions);

    setCorsHeaders(res, CORS_ORIGIN);
    return res.status(200).json({
      status: "ok",
      userId,
      displayName: data.display_name,
      permissions,
      sessionToken: newSessionToken,
    });
  } catch (err) {
    console.error("verify handler error", err);
    setCorsHeaders(res, CORS_ORIGIN);
    return res.status(500).json({
      status: "error",
      message: "伺服器錯誤",
      detail: String(err),
    });
  }
}
