import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";


// ------------------- 驗證 LINE idToken -------------------
async function verifyIdToken(idToken, clientId) {
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `id_token=${encodeURIComponent(idToken)}&client_id=${clientId}`,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error("idToken 驗證失敗: " + errorText);
  }

  const data = await res.json();
  if (!data.sub) throw new Error("idToken 驗證失敗: sub 不存在");
  return { sub: data.sub, name: data.name || null };
}

// ------------------- 建立 sessionToken（JWT） -------------------
function createSessionToken(userId, payload = {}) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign({ userId, ...payload }, secret, { expiresIn: "12h" });
}

// ------------------- 驗證 sessionToken -------------------
function verifySessionToken(sessionToken, secret) {
  try {
    return jwt.verify(sessionToken, secret);
  } catch (e) {
    return null;
  }
}

// ------------------- 處理 action -------------------
async function handleAction(action, body, supabase, JWT_SECRET, res) {
  const { sessionToken } = body;

  // 驗證 sessionToken
  const decoded = verifySessionToken(sessionToken, JWT_SECRET);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ status: "error", message: "Invalid session" });
  }

  // 獲取用戶資訊
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", decoded.userId)
    .single();

  if (userError || !userData) {
    return res.status(404).json({ status: "error", message: "User not found" });
  }

  const userRole = userData.管理員 || "一般用戶";

  // ====== 讀取裝備 ======
  if (action === "getEquipment") {
    const { data: equipment, error } = await supabase
      .from("equipment")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("獲取裝備資料錯誤:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch equipment" });
    }

    return res.status(200).json({
      status: "ok",
      equipment: equipment || [],
    });
  }

  // ====== 新增裝備 ======
  if (action === "createEquipment") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限編輯裝備" });
    }

    const { equipmentData } = body;

    // 先獲取該群組的裝備來計算新編號
    const { data: groupEquipments, error: groupError } = await supabase
      .from("equipment")
      .select("裝備編號")
      .eq("分群組", equipmentData.分群組)
      .order("裝備編號", { ascending: true });

    if (groupError) {
      console.error("獲取群組裝備錯誤:", groupError);
      return res.status(500).json({ status: "error", message: "Failed to get group equipment" });
    }

    // 計算新編號
    let newNumber = 1;
    if (groupEquipments && groupEquipments.length > 0) {
      // 取得最後一個編號的數字部分
      const lastNumber = groupEquipments[groupEquipments.length - 1].裝備編號;
      const match = lastNumber.match(/\d+/);
      if (match) {
        newNumber = parseInt(match[0]) + 1;
      }
    }

    // 生成新編號（保持原有格式，如 MED-001）
    const prefix = equipmentData.分群組.substring(0, 3).toUpperCase() || "EQP";
    equipmentData.裝備編號 = `${prefix}-${newNumber.toString().padStart(3, '0')}`;

    equipmentData.填表人 = userData.display_name || userData.姓名;
    // 新增初始歷史紀錄 - 使用台灣時間
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const timestamp = taiwanTime.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    equipmentData.歷史更新紀錄 = `[${timestamp}] ${userData.display_name} 創建了裝備`;
    equipmentData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("equipment").insert(equipmentData).select().single();

    if (error) {
      console.error("創建裝備錯誤:", error);
      return res.status(500).json({ status: "error", message: "Failed to create equipment" });
    }

    return res.status(200).json({
      status: "ok",
      equipmentId: data.id,
      message: "裝備創建成功 (Realtime 已同步)",
    });
  }

  // ====== 更新裝備 ======
  if (action === "updateEquipment") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限編輯裝備" });
    }

    const { equipmentData } = body;

    // 獲取舊資料來比對變化
    const { data: oldData } = await supabase
      .from("equipment")
      .select("*")
      .eq("id", equipmentData.id)
      .single();

    // 生成台灣時間 - 修正：不要手動加8小時
    const now = new Date();
    const timestamp = now.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // 只記錄狀態變更
    let historyEntry = '';
    if (oldData.目前狀態 !== equipmentData.目前狀態) {
      historyEntry = `[${timestamp}] ${userData.display_name} 將狀態改為 ${equipmentData.目前狀態}`;
    }

    // 更新歷史紀錄（保留最新30筆）
    if (historyEntry) {
      const currentHistory = oldData.歷史更新紀錄 || '';
      const newHistory = currentHistory
        ? `${historyEntry}\n${currentHistory}`
        : historyEntry;

      // 只保留最新30筆
      const historyLines = newHistory.split('\n').slice(0, 30);
      equipmentData.歷史更新紀錄 = historyLines.join('\n');
    } else {
      equipmentData.歷史更新紀錄 = oldData.歷史更新紀錄;
    }

    equipmentData.填表人 = userData.display_name || userData.姓名;
    equipmentData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("equipment")
      .update(equipmentData)
      .eq("id", equipmentData.id)
      .select()
      .single();

    if (error) {
      console.error("更新裝備錯誤:", error);
      return res.status(500).json({ status: "error", message: "Failed to update equipment" });
    }

    return res.status(200).json({
      status: "ok",
      message: "裝備更新成功 (Realtime 已同步)",
    });
  }

  // ====== 刪除裝備 ======
  if (action === "deleteEquipment") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限刪除裝備" });
    }

    const { equipmentId } = body;

    // 先獲取要刪除的裝備資訊
    const { data: deletedEquipment, error: getError } = await supabase
      .from("equipment")
      .select("分群組, 裝備編號")
      .eq("id", equipmentId)
      .single();

    if (getError) {
      console.error("獲取裝備資訊錯誤:", getError);
      return res.status(500).json({ status: "error", message: "Failed to get equipment info" });
    }

    // 刪除裝備
    const { error } = await supabase.from("equipment").delete().eq("id", equipmentId);

    if (error) {
      console.error("刪除裝備錯誤:", error);
      return res.status(500).json({ status: "error", message: "Failed to delete equipment" });
    }

    return res.status(200).json({
      status: "ok",
      message: "裝備刪除成功 (Realtime 已同步)",
    });
  }


  if (action === 'getUsers') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限查看用戶列表" });
    }

    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id, 姓名, display_name, 管理員, 創建時間')
        .order('創建時間', { ascending: false });

      if (error) {
        console.error('獲取用戶列表錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to fetch users" });
      }

      return res.status(200).json({
        status: "ok",
        users: users || []
      });
    } catch (error) {
      console.error('getUsers 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  if (action === 'updateUserPermission') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限更新用戶權限" });
    }

    try {
      const { userId, permission } = body;
      const { error } = await supabase
        .from('users')
        .update({ 管理員: permission })
        .eq('user_id', userId);

      if (error) {
        console.error('更新用戶權限錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to update user permission" });
      }

      return res.status(200).json({
        status: "ok",
        message: "權限更新成功"
      });
    } catch (error) {
      console.error('updateUserPermission 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  if (action === 'deleteUser') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限刪除用戶" });
    }

    try {
      const { userId } = body;
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('刪除用戶錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to delete user" });
      }

      return res.status(200).json({
        status: "ok",
        message: "用戶刪除成功"
      });
    } catch (error) {
      console.error('deleteUser 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
  // ====== 獲取裝備歷史紀錄 ======
  if (action === "getEquipmentHistory") {
    const { equipmentId } = body;

    // 先獲取裝備的歷史紀錄
    const { data: equipment, error } = await supabase
      .from("equipment")
      .select("歷史更新紀錄")
      .eq("id", equipmentId)
      .single();

    if (error) {
      console.error("獲取裝備歷史紀錄錯誤:", error);
      return res.status(500).json({ status: "error", message: "Failed to fetch equipment history" });
    }

    // 解析歷史紀錄文字為結構化資料
    const historyList = parseHistoryText(equipment.歷史更新紀錄 || '');

    return res.status(200).json({
      status: "ok",
      history: historyList,
    });
  }

  // ====== 新增裝備歷史紀錄 ======
  if (action === "addEquipmentHistory") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限編輯歷史紀錄" });
    }

    const { equipmentId, historyContent } = body;

    // 獲取現有歷史紀錄
    const { data: oldData } = await supabase
      .from("equipment")
      .select("歷史更新紀錄")
      .eq("id", equipmentId)
      .single();

    // 新增歷史紀錄項目
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const timestamp = taiwanTime.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const newEntry = `[${timestamp}] ${userData.display_name} ${historyContent}`;

    const currentHistory = oldData.歷史更新紀錄 || '';
    const newHistory = currentHistory ? `${newEntry}\n${currentHistory}` : newEntry;

    // 只保留最新50筆紀錄
    const historyLines = newHistory.split('\n').slice(0, 50);
    const trimmedHistory = historyLines.join('\n');

    // 更新到資料庫
    const { error } = await supabase
      .from("equipment")
      .update({
        歷史更新紀錄: trimmedHistory,
        updated_at: new Date().toISOString()
      })
      .eq("id", equipmentId);

    if (error) {
      console.error("更新歷史紀錄錯誤:", error);
      return res.status(500).json({ status: "error", message: "Failed to update history" });
    }

    return res.status(200).json({
      status: "ok",
      message: "歷史紀錄新增成功",
    });
  }
  // 如果沒有匹配的 action
  return res.status(400).json({ status: "error", message: "Unknown action" });
}

// 解析歷史紀錄文字為結構化資料
function parseHistoryText(historyText) {
  if (!historyText) return [];

  return historyText.split('\n')
    .filter(line => line.trim() && line !== 'null')
    .map(line => {
      // 解析格式: [時間] 人員 操作內容
      const match = line.match(/\[([^\]]+)\]\s+([^\s]+)\s+(.+)/);
      if (match) {
        return {
          timestamp: match[1],
          操作人員: match[2],
          操作內容: match[3],
          原始內容: line
        };
      }
      // 如果格式不符合，返回基本資訊
      return {
        timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
        操作人員: '系統',
        操作內容: line,
        原始內容: line
      };
    });
}

// ------------------- 主 handler -------------------
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ status: "error", message: "Method not allowed" });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;
    const LIFF_CLIENT_ID = process.env.LIFF_CLIENT_ID;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { idToken, sessionToken, signup, action } = body;

    console.log(`[${new Date().toISOString()}] 收到請求:`, {
      hasIdToken: !!idToken,
      hasSessionToken: !!sessionToken,
      isSignup: signup,
      action: action,
      bodyKeys: Object.keys(body)
    });

    // ========== 處理 action 操作 ==========
    if (action) {
      return await handleAction(action, body, supabase, JWT_SECRET, res);
    }

    // ========== 原有的驗證邏輯 ==========

    // ---------- 情況1：純 sessionToken 驗證（快速登入檢查） ----------
    if (!idToken && sessionToken && !signup) {
      console.log('[sessionToken驗證] 開始驗證純 sessionToken');
      const decoded = verifySessionToken(sessionToken, JWT_SECRET);
      if (!decoded || !decoded.userId) {
        console.log('[sessionToken驗證] sessionToken 無效');
        return res.status(401).json({ status: "error", message: "Invalid sessionToken" });
      }

      // 檢查用戶是否還存在
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", decoded.userId)
        .single();

      console.log('[sessionToken驗證] 資料庫查詢結果:', { userData, error });

      if (error && error.code !== "PGRST116") {
        console.error("[sessionToken驗證] Supabase 查詢錯誤", error);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }

      if (!userData) {
        console.log('[sessionToken驗證] 用戶不存在');
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      // 使用您的資料表欄位
      const displayName = userData.display_name || userData.姓名 || decoded.displayName || "用戶";

      return res.status(200).json({
        status: "ok",
        displayName: displayName,
        userId: decoded.userId,
        role: userData.管理員 || "一般用戶"
      });
    }

    // ---------- 情況2：註冊流程 (signup === true) ----------
    if (signup === true) {
      console.log('[註冊] 開始處理註冊流程');
      const { name, email, phone, job, unit, script, displayName } = body;

      if (!idToken) {
        return res.status(400).json({
          status: "error",
          message: "註冊需要 idToken"
        });
      }

      const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
      const userId = profile.sub;
      const resolvedDisplayName = displayName || name || profile.name || "用戶";

      console.log('[註冊] LINE 用戶資訊:', { userId, resolvedDisplayName });

      const { data: existing, error: selErr } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (selErr && selErr.code !== "PGRST116") {
        console.error("[註冊] Supabase 查詢錯誤", selErr);
        return res.status(500).json({ status: "error", message: "Database query error" });
      }

      if (existing) {
        console.log('[註冊] 用戶已存在，直接登入');
        const displayName = existing.display_name || existing.姓名 || resolvedDisplayName;
        const token = createSessionToken(userId, { displayName, role: existing.管理員 });
        return res.status(200).json({
          status: "ok",
          displayName: displayName,
          sessionToken: token,
          role: existing.管理員 || "一般用戶",
          message: "用戶已存在，登入成功"
        });
      }

      console.log('[註冊] 創建新用戶');

      const insertPayload = {
        user_id: userId,
        姓名: name || resolvedDisplayName,
        display_name: resolvedDisplayName,
        電子信箱: email || null,
        電話: phone || null,
        職稱: job || null,
        單位: unit || null,
        管理員: "一般用戶",
        申請備註: script || null,
        創建時間: new Date().toISOString()
      };

      console.log('[註冊] 準備插入資料:', insertPayload);

      const { data: inserted, error: insErr } = await supabase
        .from("users")
        .insert(insertPayload)
        .select()
        .single();

      if (insErr) {
        console.error("[註冊] Supabase 插入錯誤", insErr);
        return res.status(500).json({
          status: "error",
          message: "Failed to create user",
          error: insErr.message || insErr.code || String(insErr)
        });
      }

      console.log('[註冊] 用戶創建成功:', inserted);

      const finalDisplayName = inserted.display_name || inserted.姓名 || resolvedDisplayName;
      const newToken = createSessionToken(userId, { displayName: finalDisplayName, role: inserted.管理員 });
      return res.status(200).json({
        status: "ok",
        displayName: finalDisplayName,
        sessionToken: newToken,
        role: inserted.管理員 || "一般用戶",
        message: "註冊成功"
      });
    }

    // ---------- 情況3：一般驗證流程（檢查登入狀態） ----------
    if (!idToken) {
      return res.status(400).json({ status: "error", message: "缺少 idToken" });
    }

    console.log('[驗證] 開始一般驗證流程');

    const profile = await verifyIdToken(idToken, LIFF_CLIENT_ID);
    const userId = profile.sub;
    const displayName = profile.name || "用戶";

    console.log('[驗證] LINE 用戶資訊:', { userId, displayName });

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[驗證] Supabase 查詢錯誤", error);
      return res.status(500).json({ status: "error", message: "Database query error" });
    }

    if (!userData) {
      console.log('[驗證] 用戶不存在，需要註冊');
      const tempSessionToken = createSessionToken(userId, {
        displayName,
        temporary: true
      });

      return res.status(200).json({
        status: "needsignup",
        displayName: displayName,
        sessionToken: tempSessionToken
      });
    }

    console.log('[驗證] 用戶存在，登入成功');
    const finalDisplayName = userData.display_name || userData.姓名 || displayName;
    const sessionTokenForLogin = createSessionToken(userId, {
      displayName: finalDisplayName,
      role: userData.管理員
    });

    return res.status(200).json({
      status: "ok",
      displayName: finalDisplayName,
      sessionToken: sessionTokenForLogin,
      role: userData.管理員 || "一般用戶"
    });

  } catch (err) {
    console.error("[handler] 錯誤:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Internal server error"
    });
  }
}
