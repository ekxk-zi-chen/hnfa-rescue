// api/verify.js
export default async function handler(req, res) {
  // 決定 reply origin（如果你有環境變數 CORS_ORIGIN 可用）
  const CORS_ORIGIN = process.env.CORS_ORIGIN || null;
  const reqOrigin = req.headers.origin || null;
  const replyOrigin = CORS_ORIGIN || reqOrigin || "*";

  // ALWAYS set CORS headers early so even errors return them
  res.setHeader("Access-Control-Allow-Origin", replyOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  // 以下把所有可能拋錯的初始化、import、邏輯包在 try/catch
  try {
    // 檢查必要 env
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;
    const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;

    if (!JWT_SECRET || !LIFF_CLIENT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      // 回傳較清楚的錯誤方便本機 curl 調試（不要在公開環境回傳敏感內容）
      console.error("Missing env:", {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY,
        JWT_SECRET: !!JWT_SECRET,
        LIFF_CLIENT_ID: !!LIFF_CLIENT_ID,
      });
      return res.status(500).json({ status: "error", message: "Server misconfiguration: missing env vars" });
    }

    // 動態 import，避免在 OPTIONS 階段或模組 top-level 初始化出錯
    let jwt, createClient, verifyIdToken, createSessionToken;
    try {
      jwt = (await import("jsonwebtoken")).default;
      const supabaseMod = await import("@supabase/supabase-js");
      createClient = supabaseMod.createClient;
      const lineMod = await import("./utils/line");
      verifyIdToken = lineMod.verifyIdToken;
      const jwtUtil = await import("./utils/jwt");
      createSessionToken = jwtUtil.createSessionToken;
    } catch (impErr) {
      console.error("Dynamic import/init failed:", impErr);
      return res.status(500).json({ status: "error", message: "Server import/init failed" });
    }

    // init supabase client (lazy)
    let supabase;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    } catch (e) {
      console.error("Supabase client init failed:", e);
      return res.status(500).json({ status: "error", message: "Supabase init failed" });
    }

    // parse body safely
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error("Invalid JSON body:", parseError);
      return res.status(400).json({ status: "error", message: "Invalid JSON" });
    }

    const { idToken, sessionToken } = body || {};

    // sessionToken short-circuit
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
        // continue to idToken flow
      }
    }

    if (!idToken) {
      return res.status(400).json({ status: "error", message: "缺少 idToken" });
    }

    // verify idToken via your util
    let profile;
    try {
      profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
    } catch (err) {
      console.error("verifyIdToken error:", err);
      return res.status(401).json({ status: "error", message: "idToken 驗證失敗" });
    }

    if (!profile || !profile.sub) {
      return res.status(401).json({ status: "error", message: "idToken 驗證失敗" });
    }

    const userId = profile.sub;

    // query supabase
    let userData;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // PostgREST returns different codes; handle not found
        console.error("Supabase error object:", error);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }
      userData = data;
    } catch (err) {
      console.error("Supabase query failed:", err);
      return res.status(500).json({ status: "error", message: "Database query failed" });
    }

    // create session token
    let newSessionToken;
    try {
      newSessionToken = createSessionToken(userId, { role: userData.role });
    } catch (err) {
      console.error("createSessionToken failed:", err);
      return res.status(500).json({ status: "error", message: "Create session failed" });
    }

    // success
    return res.status(200).json({
      status: "ok",
      userId,
      displayName: userData.display_name,
      permissions: { role: userData.role },
      sessionToken: newSessionToken,
    });

  } catch (err) {
    console.error("Unhandled server error:", err);
    return res.status(500).json({ status: "error", message: "Server internal error" });
  }
}
