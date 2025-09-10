export default async function handler(req, res) {
  // 一律先設定 CORS header
  setCorsHeaders(res, CORS_ORIGIN);

  // preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    // 🟢 手動 parse JSON
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      console.error("JSON parse error:", err);
      return res.status(400).json({ status: 'error', message: 'Invalid JSON' });
    }

    const { idToken, sessionToken } = body || {};

    // env check
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET || !LIFF_CLIENT_ID) {
      console.error('Missing env vars');
      return res.status(500).json({ status: 'error', message: 'Server env not configured' });
    }

    // sessionToken 驗證
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        return res.status(200).json({ status: 'ok', userId: decoded.userId, permissions: decoded.permissions, sessionToken });
      } catch (e) {
        // 無效 -> fallback to idToken
      }
    }

    if (!idToken) {
      return res.status(400).json({ status: 'error', message: '缺少 idToken 或 sessionToken' });
    }

    const profile = await verifyIdToken(idToken);
    if (!profile || !profile.sub) {
      return res.status(401).json({ status: 'error', message: 'idToken 驗證失敗' });
    }
    const userId = profile.sub;

    const { data, error } = await supabase.from('users').select('*').eq('user_id', userId).single();
    if (error) {
      console.error('Supabase query error', error);
      return res.status(500).json({ status: 'error', message: 'Supabase 查詢錯誤' });
    }
    if (!data) {
      return res.status(200).json({ status: 'needsignup', userId });
    }

    const permissions = { role: data.role };
    const newSessionToken = createSessionToken(userId, permissions);

    return res.status(200).json({
      status: 'ok',
      userId,
      displayName: data.display_name,
      permissions,
      sessionToken: newSessionToken
    });

  } catch (err) {
    console.error('verify handler error', err);
    return res.status(500).json({ status: 'error', message: '伺服器錯誤', detail: String(err) });
  }
}
