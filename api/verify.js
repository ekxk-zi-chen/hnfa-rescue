// api/verify.js
export default async function handler(req, res) {
  const reqOrigin = req.headers.origin || null;
  const CORS_ORIGIN = process.env.CORS_ORIGIN || null;
  const replyOrigin = CORS_ORIGIN || reqOrigin || "*";

  // OPTIONS 預檢：**不進行其他模組初始化**
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", replyOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }

  // 其他回應也帶上 CORS header（避免漏掉）
  res.setHeader("Access-Control-Allow-Origin", replyOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  // 現在才動態載入需要的模組（避免在 OPTIONS 時出錯）
  let jwt, createClient, verifyIdToken, createSessionToken;
  try {
    jwt = (await import("jsonwebtoken")).default;
    const supabaseMod = await import("@supabase/supabase-js");
    createClient = supabaseMod.createClient;
    const lineMod = await import("./utils/line");
    verifyIdToken = lineMod.verifyIdToken;
    const jwtUtil = await import("./utils/jwt");
    createSessionToken = jwtUtil.createSessionToken;
  } catch (e) {
    console.error("Dynamic import failed:", e);
    return res.status(500).json({ status: "error", message: "Server import error" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const JWT_SECRET = process.env.JWT_SECRET;
  const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;

  // Lazy init supabase client
  let supabase;
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  } catch (e) {
    console.error("Supabase client init failed:", e);
    return res.status(500).json({ status: "error", message: "Supabase init failed" });
  }

  try {
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ status: "error", message: "Invalid JSON format" });
    }

    const { idToken, sessionToken } = body || {};

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
      }
    }

    if (!idToken) {
      return res.status(400).json({ status: "error", message: "缺少 idToken" });
    }

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

    let userData;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(200).json({ status: "needsignup", userId });
        }
        throw error;
      }
      userData = data;
    } catch (err) {
      console.error("Supabase query failed:", err);
      return res.status(500).json({ status: "error", message: "数据库查询失败" });
    }

    let newSessionToken;
    try {
      newSessionToken = createSessionToken(userId, { role: userData.role });
    } catch (err) {
      console.error("createSessionToken failed:", err);
      return res.status(500).json({ status: "error", message: "无法建立 sessionToken" });
    }

    return res.status(200).json({
      status: "ok",
      userId,
      displayName: userData.display_name,
      permissions: { role: userData.role },
      sessionToken: newSessionToken,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return res.status(500).json({ status: "error", message: "服务器内部错误" });
  }
}
