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

    // 獲取該群組的所有裝備，找出最大編號
    const { data: groupEquipments, error: groupError } = await supabase
      .from("equipment")
      .select("裝備編號")
      .eq("分群組", equipmentData.分群組)
      .order("裝備編號", { ascending: false })
      .limit(1);

    if (groupError) {
      console.error("獲取群組裝備錯誤:", groupError);
      return res.status(500).json({ status: "error", message: "Failed to get group equipment" });
    }

    let newNumber;

    if (groupEquipments && groupEquipments.length > 0) {
      // 該群組已有裝備，取最大編號+1
      newNumber = parseInt(groupEquipments[0].裝備編號) + 1;
    } else {
      // 新群組，從全部裝備找最大編號+1
      const { data: allEquipments } = await supabase
        .from("equipment")
        .select("裝備編號")
        .order("裝備編號", { ascending: false })
        .limit(1);

      if (allEquipments && allEquipments.length > 0) {
        newNumber = parseInt(allEquipments[0].裝備編號) + 1;
      } else {
        newNumber = 1;
      }
    }

    equipmentData.裝備編號 = newNumber; // ✅ 直接用數字
    equipmentData.填表人 = userData.display_name || userData.姓名;
    
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
      equipmentNumber: newNumber,
      message: "裝備創建成功",
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

    // 生成台灣時間
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

      // ✅ 如果是返隊操作，清理批次記錄
      if (equipmentData.目前狀態 === '在隊' && oldData.目前狀態 !== '在隊') {
        equipmentData.batch_date = null;
        equipmentData.batch_identifier = null;
      }
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

  // ====== 獲取用戶列表 ======
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
  // ====== 更新用戶權限 ======
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
  // ====== 刪除用戶 ======
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

  // ====== 批量更新裝備狀態 ======
  if (action === "batchUpdateEquipment") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限批量操作裝備" });
    }

    const { equipmentIds, operationType, note, operator } = body;

    if (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return res.status(400).json({ status: "error", message: "請選擇要操作的裝備" });
    }

    // ✅ 修正：使用台湾时间格式
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const batchDate = new Date().toISOString(); // 存储标准 ISO 时间
    
    const batchIdentifier = `batch_${Date.now()}`;

    try {
      // ✅ 先查询所有要更新的装备
      const { data: oldEquipmentList, error: fetchError } = await supabase
        .from("equipment")
        .select("*")
        .in("id", equipmentIds);

      if (fetchError) {
        console.error("批量查询装备失败:", fetchError);
        return res.status(500).json({ status: "error", message: "批量查询装备失败" });
      }

      // ✅ 准备更新资料
      const updatePromises = oldEquipmentList.map((oldData) => {
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

        const historyEntry = `[${timestamp}] ${operator} 批量${operationType}${note ? ` - ${note}` : ''}`;
        const currentHistory = oldData.歷史更新紀錄 || '';
        const newHistory = currentHistory
          ? `${historyEntry}\n${currentHistory}`
          : historyEntry;

        const historyLines = newHistory.split('\n').slice(0, 30);
        const trimmedHistory = historyLines.join('\n');

        return supabase
          .from("equipment")
          .update({
            目前狀態: operationType,
            狀態: note || '',
            歷史更新紀錄: trimmedHistory,
            填表人: operator,
            updated_at: new Date().toISOString(),
            batch_date: batchDate, // ✅ 使用格式化的台湾时间
            batch_identifier: batchIdentifier
          })
          .eq("id", oldData.id);
      });

      // ✅ 执行所有更新操作
      const updateResults = await Promise.all(updatePromises);

      const hasError = updateResults.some(result => result.error);
      if (hasError) {
        console.error("部分装备更新失败");
        return res.status(500).json({ status: "error", message: "部分装备更新失败" });
      }

      console.log(`✅ 成功批量更新 ${updateResults.length} 个装备`);

      return res.status(200).json({
        status: "ok",
        message: `批量${operationType}操作完成 (更新了 ${updateResults.length} 个装备)`
      });

    } catch (error) {
      console.error("批量操作错误:", error);
      return res.status(500).json({ status: "error", message: "批量操作失败" });
    }
  }

  // ====== 批量返隊裝備 ======
  if (action === "batchReturnEquipment") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限批量操作裝備" });
    }

    const { equipmentIds, operator, batchId } = body; // 這裡的 batchId 就是 batch_identifier

    if (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return res.status(400).json({ status: "error", message: "請選擇要返隊的裝備" });
    }

    try {
      // 先查詢所有要更新的裝備
      const { data: oldEquipmentList, error: fetchError } = await supabase
        .from("equipment")
        .select("*")
        .in("id", equipmentIds);

      if (fetchError) {
        console.error("批量查詢裝備失敗:", fetchError);
        return res.status(500).json({ status: "error", message: "批量查詢裝備失敗" });
      }

      // 準備更新資料
      const updatePromises = oldEquipmentList.map((oldData) => {
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

        // ✅ 修正：使用正確的批次資訊
        const batchIdentifier = batchId || oldData.batch_identifier;
        const batchDate = oldData.batch_date || '未知日期'; // ✅ 直接使用存储的日期字符串

        const historyEntry = `[${timestamp}] ${operator} 批量返隊 (原操作: ${batchDate})`;
        const currentHistory = oldData.歷史更新紀錄 || '';
        const newHistory = currentHistory
          ? `${historyEntry}\n${currentHistory}`
          : historyEntry;

        const historyLines = newHistory.split('\n').slice(0, 30);
        const trimmedHistory = historyLines.join('\n');

        return supabase
          .from("equipment")
          .update({
            目前狀態: '在隊',
            狀態: '已返隊',
            歷史更新紀錄: trimmedHistory,
            填表人: operator,
            updated_at: new Date().toISOString(),
            // 清理批次記錄
            batch_date: null,
            batch_identifier: null
          })
          .eq("id", oldData.id);
      });

      // 執行所有更新操作
      const updateResults = await Promise.all(updatePromises);

      const hasError = updateResults.some(result => result.error);
      if (hasError) {
        console.error("部分裝備更新失敗");
        return res.status(500).json({ status: "error", message: "部分裝備更新失敗" });
      }

      console.log(`✅ 成功批量返隊 ${updateResults.length} 個裝備`);

      return res.status(200).json({
        status: "ok",
        message: `批量返隊操作完成 (返隊了 ${updateResults.length} 個裝備)`
      });

    } catch (error) {
      console.error("批量返隊錯誤:", error);
      return res.status(500).json({ status: "error", message: "批量返隊失敗" });
    }
  }

  // ====== 批量轉借裝備 ======
  if (action === "batchTransferEquipment") {
    if (userRole === "一般用戶") {
      return res.status(403).json({ status: "error", message: "沒有權限批量操作裝備" });
    }

    const { equipmentIds, transferTo, note, operator, sourceBatchId } = body;

    if (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
      return res.status(400).json({ status: "error", message: "請選擇要轉借的裝備" });
    }

    if (!transferTo) {
      return res.status(400).json({ status: "error", message: "請選擇轉借對象" });
    }

    try {
      // ✅ 使用台湾时间格式
      const now = new Date();
      const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const batchDate = new Date().toISOString();
      
      // ✅ 生成新的批次標識符
      const newBatchIdentifier = `batch_${Date.now()}_transfer`;

      // ✅ 先查询所有要轉借的装备
      const { data: oldEquipmentList, error: fetchError } = await supabase
        .from("equipment")
        .select("*")
        .in("id", equipmentIds);

      if (fetchError) {
        console.error("批量查询装备失败:", fetchError);
        return res.status(500).json({ status: "error", message: "批量查询装备失败" });
      }

      // ✅ 准备更新资料
      const updatePromises = oldEquipmentList.map((oldData) => {
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

        const historyEntry = `[${timestamp}] ${operator} 轉借給 ${transferTo}${note ? ` - ${note}` : ''} (原批次: ${sourceBatchId})`;
        const currentHistory = oldData.歷史更新紀錄 || '';
        const newHistory = currentHistory
          ? `${historyEntry}\n${currentHistory}`
          : historyEntry;

        const historyLines = newHistory.split('\n').slice(0, 30);
        const trimmedHistory = historyLines.join('\n');

        return supabase
          .from("equipment")
          .update({
            狀態: `轉借給 ${transferTo}${note ? ` - ${note}` : ''}`,
            歷史更新紀錄: trimmedHistory,
            填表人: operator,
            updated_at: new Date().toISOString(),
            batch_date: batchDate,
            batch_identifier: newBatchIdentifier  // ✅ 更新為新的批次標識符
          })
          .eq("id", oldData.id);
      });

      // ✅ 执行所有更新操作
      const updateResults = await Promise.all(updatePromises);

      const hasError = updateResults.some(result => result.error);
      if (hasError) {
        console.error("部分装备轉借失败");
        return res.status(500).json({ status: "error", message: "部分装备轉借失败" });
      }

      console.log(`✅ 成功批量轉借 ${updateResults.length} 个装备到新批次: ${newBatchIdentifier}`);

      return res.status(200).json({
        status: "ok",
        message: `批量轉借操作完成 (轉借了 ${updateResults.length} 个装备給 ${transferTo})`,
        newBatchId: newBatchIdentifier
      });

    } catch (error) {
      console.error("批量轉借错误:", error);
      return res.status(500).json({ status: "error", message: "批量轉借失败" });
    }
  }

  // ====== 獲取批量記錄 ======
  if (action === "getBatchRecords") {
    // 獲取有批次日期的裝備記錄，按批次分組
    const { data: records, error } = await supabase
      .from("equipment")
      .select("id, 器材名稱, 裝備編號, 分群組, 目前狀態, 狀態, 填表人, batch_date, batch_identifier, updated_at")
      .not("batch_date", "is", null)
      .not("batch_identifier", "is", null)
      .order("裝備編號", { ascending: true }) // ✅ 按裝備編號排序
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("獲取批量記錄錯誤:", error);
      return res.status(500).json({ status: "error", message: "獲取記錄失敗" });
    }

    // 按批次標識符分組，並過濾掉已完全返隊的批次
    const batchGroups = {};
    records.forEach(record => {
      const batchId = record.batch_identifier;
      if (!batchGroups[batchId]) {
        batchGroups[batchId] = {
          batch_date: record.batch_date,
          batch_operator: record.填表人,
          batch_note: record.狀態,
          equipment: []
        };
      }
      batchGroups[batchId].equipment.push(record);
    });

    // ✅ 過濾：只保留還有未返隊裝備的批次，並確保每個批次內的裝備都排序
    const activeBatches = {};
    Object.keys(batchGroups).forEach(batchId => {
      const batch = batchGroups[batchId];
      const hasUnreturnedEquipment = batch.equipment.some(equipment =>
        equipment.目前狀態 !== '在隊'
      );

      if (hasUnreturnedEquipment) {
        // ✅ 批次內的裝備也按裝備編號排序
        batch.equipment.sort((a, b) =>
          String(a.裝備編號).localeCompare(String(b.裝備編號), 'zh-Hant', { numeric: true })
        );
        activeBatches[batchId] = batch;
      }
    });

    return res.status(200).json({
      status: "ok",
      batches: activeBatches
    });
  }
  // ====== 在 handleAction 函數中新增以下 actions ======

  // ====== 取得所有任務 ======
  if (action === 'getMissions') {
    try {
      console.log('[getMissions] 開始查詢任務...');

      const { data: missions, error } = await supabase
        .from('missions')
        .select(`
                  *,
                  assignments:mission_assignments(
                      id,
                      assignment_number,
                      assigned_by,
                      assigned_at,
                      assignment_note,
                      members:assignment_members(
                          id,
                          user_id,
                          display_name,
                          completed_at,
                          role,
                          leader_id
                      )
                  ),
                  participants:mission_participants(
                      id,
                      user_id,
                      display_name,
                      is_assigned,
                      joined_at
                  )
              `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ 取得任務錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to fetch missions" });
      }

      // ✅ 只保留隊長的記錄，並附加小隊成員
      if (missions && missions.length > 0) {
        for (const mission of missions) {
          if (mission.assignments && mission.assignments.length > 0) {
            for (const assignment of mission.assignments) {
              if (assignment.members && assignment.members.length > 0) {
                const { data: allProgress } = await supabase
                  .from('mission_progress')
                  .select('*')
                  .eq('assignment_id', assignment.id)
                  .order('timestamp', { ascending: false });

                const allMembers = assignment.members;
                assignment.members = allMembers
                  .filter(m => m.role === 'leader')
                  .map(leader => ({
                    ...leader,
                    progress_history: allProgress
                      ? allProgress.filter(p => {
                        if (p.user_id === leader.user_id) return true;
                        const teamMember = allMembers.find(m =>
                          m.user_id === p.user_id && m.leader_id === leader.id
                        );
                        return !!teamMember;
                      })
                      : [],
                    team_members: allMembers.filter(m => m.leader_id === leader.id)
                  }));
              }
            }
          }
        }
      }

      return res.status(200).json({
        status: "ok",
        missions: missions || []
      });
    } catch (error) {
      console.error('❌ [getMissions] 異常錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 取得進行中任務數量 ======
  if (action === 'getActiveMissions') {
    try {
      const { data: missions, error } = await supabase
        .from('missions')
        .select('id')
        .eq('status', 'active');

      if (error) {
        console.error('取得任務數量錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to fetch active missions" });
      }

      return res.status(200).json({
        status: "ok",
        count: missions?.length || 0
      });
    } catch (error) {
      console.error('getActiveMissions 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 建立新任務 ======
  if (action === 'createMission') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限建立任務" });
    }

    try {
      const { missionData } = body;

      const insertData = {
        ...missionData,
        created_at: getTaipeiISOString(),
        updated_at: getTaipeiISOString()
      };

      const { data, error } = await supabase
        .from('missions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('建立任務錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to create mission" });
      }

      return res.status(200).json({
        status: "ok",
        missionId: data.id,
        message: "任務建立成功"
      });
    } catch (error) {
      console.error('createMission 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 報名任務（修正版）======
  if (action === 'joinMission') {
    try {
      const { missionId, userId, displayName } = body;

      console.log('[報名任務] 開始:', { missionId, userId, displayName });

      // ✅ 檢查是否已經報名
      const { data: existing, error: checkError } = await supabase
        .from('mission_participants')
        .select('id')
        .eq('mission_id', missionId)
        .eq('user_id', userId)
        .maybeSingle();  // ✅ 修正：使用 maybeSingle 避免沒資料時報錯

      if (checkError) {
        console.error('[報名任務] 檢查失敗:', checkError);
        throw checkError;
      }

      if (existing) {
        return res.status(400).json({
          status: "error",
          message: "已經報名過此任務"
        });
      }

      // ✅ 新增報名記錄
      const { error } = await supabase
        .from('mission_participants')
        .insert({
          mission_id: missionId,
          user_id: userId,
          display_name: displayName,
          is_assigned: false,
          joined_at: getTaipeiISOString(),
        });

      if (error) {
        console.error('[報名任務] 新增失敗:', error);
        throw error;
      }

      console.log('[報名任務] 成功');

      return res.status(200).json({
        status: "ok",
        message: "報名成功"
      });
    } catch (error) {
      console.error('joinMission 錯誤:', error);
      return res.status(500).json({
        status: "error",
        message: error.message
      });
    }
  }

  // ====== 取消報名 ======
  if (action === 'cancelJoin') {
    try {
      const { missionId, userId } = body;

      // 檢查是否為指派狀態
      const { data: participant } = await supabase
        .from('mission_participants')
        .select('is_assigned')
        .eq('mission_id', missionId)
        .eq('user_id', userId)
        .single();

      if (participant?.is_assigned) {
        return res.status(403).json({ status: "error", message: "已被指派，無法取消報名" });
      }

      // 刪除參與記錄
      const { error } = await supabase
        .from('mission_participants')
        .delete()
        .eq('mission_id', missionId)
        .eq('user_id', userId);

      if (error) {
        console.error('取消報名錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to cancel join" });
      }

      return res.status(200).json({
        status: "ok",
        message: "已取消報名"
      });
    } catch (error) {
      console.error('cancelJoin 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 指派成員 ======
  if (action === 'assignMembers') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限指派成員" });
    }

    try {
      const { missionId, leaders, note, assignedBy, sendEmailTo } = body;

      // 取得任務資料
      const { data: mission } = await supabase
        .from('missions')
        .select('mission_title, mission_date')
        .eq('id', missionId)
        .single();

      // 計算派遣編號
      const { data: lastAssignment } = await supabase
        .from('mission_assignments')
        .select('assignment_number')
        .eq('mission_id', missionId)
        .order('assignment_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (lastAssignment?.assignment_number || 0) + 1;

      // 建立派遣階段
      const { data: assignment, error: assignError } = await supabase
        .from('mission_assignments')
        .insert({
          mission_id: missionId,
          assignment_number: nextNumber,
          assigned_by: assignedBy,
          assigned_at: getTaipeiISOString(),
          assignment_note: note || null
        })
        .select()
        .single();

      if (assignError) throw assignError;

      const emailResults = [];

      // 處理每個隊長
      for (const leader of leaders) {
        // 插入隊長
        const { data: leaderRecord, error: leaderError } = await supabase
          .from('assignment_members')
          .insert({
            assignment_id: assignment.id,
            user_id: leader.user_id,
            display_name: leader.display_name,
            role: 'leader',
            completed_at: null,
            leader_id: null
          })
          .select()
          .single();

        if (leaderError) throw leaderError;

        // 標記為已指派
        await supabase
          .from('mission_participants')
          .update({ is_assigned: true })
          .eq('mission_id', missionId)
          .eq('user_id', leader.user_id);

        // 插入小隊成員
        if (leader.members && leader.members.length > 0) {
          const memberInserts = leader.members.map(m => ({
            assignment_id: assignment.id,
            user_id: m.user_id,
            display_name: m.display_name,
            role: 'member',
            completed_at: null,
            leader_id: leaderRecord.id
          }));

          await supabase.from('assignment_members').insert(memberInserts);

          for (const m of leader.members) {
            await supabase
              .from('mission_participants')
              .update({ is_assigned: true })
              .eq('mission_id', missionId)
              .eq('user_id', m.user_id);
          }
        }

      }

      let message = `第 ${nextNumber} 次派遣完成`;


      return res.status(200).json({
        status: "ok",
        message: message,
        assignmentNumber: nextNumber,
      });

    } catch (error) {
      console.error('assignMembers 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 提交任務進度 ======
  if (action === 'submitProgress') {
    try {
      const { missionId, userId, status, note, timestamp, assignmentNumber } = body;

      console.log('[提交進度] 開始:', {
        missionId, userId, status, assignmentNumber
      });

      // ✅ 關鍵修正：根據階段編號找到對應的派遣
      let targetAssignmentId = null;

      if (assignmentNumber) {
        // 如果有指定階段編號，找到對應的派遣
        const { data: assignment } = await supabase
          .from('mission_assignments')
          .select('id')
          .eq('mission_id', missionId)
          .eq('assignment_number', assignmentNumber)
          .single();

        if (assignment) {
          targetAssignmentId = assignment.id;
        }
      } else {
        // 如果沒有指定階段編號，找最新未完成的
        const { data: memberRecords } = await supabase
          .from('assignment_members')
          .select('assignment_id, completed_at, role, id')
          .eq('user_id', userId)
          .is('completed_at', null)
          .order('assignment_id', { ascending: false });

        if (!memberRecords || memberRecords.length === 0) {
          return res.status(404).json({
            status: "error",
            message: "找不到未完成的派遣階段"
          });
        }

        // 找屬於當前任務的派遣
        for (const member of memberRecords) {
          const { data: assignment } = await supabase
            .from('mission_assignments')
            .select('mission_id')
            .eq('id', member.assignment_id)
            .eq('mission_id', missionId)
            .single();

          if (assignment) {
            targetAssignmentId = member.assignment_id;
            break;
          }
        }
      }

      if (!targetAssignmentId) {
        return res.status(404).json({
          status: "error",
          message: "找不到對應的派遣階段"
        });
      }

      // ✅ 關鍵修正：檢查用戶在當前階段的角色
      const { data: memberInfo } = await supabase
        .from('assignment_members')
        .select('id, role, completed_at, leader_id')
        .eq('assignment_id', targetAssignmentId)
        .eq('user_id', userId)
        .single();

      if (!memberInfo) {
        return res.status(404).json({
          status: "error",
          message: "您不在該派遣階段中"
        });
      }

      // 檢查是否已完成
      if (memberInfo.completed_at) {
        return res.status(403).json({
          status: "error",
          message: "此派遣階段已完成，無法再回報"
        });
      }

      // ✅ 關鍵修正：隊員不能回報「已完成」
      if (memberInfo.role === 'member' && status === '已完成') {
        return res.status(403).json({
          status: "error",
          message: "小隊成員無法回報任務完成，請聯絡隊長"
        });
      }

      // 記錄進度
      const { error: progressError } = await supabase
        .from('mission_progress')
        .insert({
          mission_id: missionId,
          user_id: userId,
          assignment_id: targetAssignmentId,
          status,
          note,
          timestamp: timestamp || getTaipeiISOString(),
          reporter_name: userData.display_name || userData.姓名
        });

      if (progressError) throw progressError;

      // ✅ 關鍵修正：只有隊長可以完成任務，且完成整個小隊
      if (memberInfo.role === 'leader' && status === '已完成') {
        const completionTime = new Date().toISOString();

        // 更新隊長自己的完成時間
        await supabase
          .from('assignment_members')
          .update({ completed_at: completionTime })
          .eq('assignment_id', targetAssignmentId)
          .eq('user_id', userId);

        // 更新該隊長所有小隊成員的完成時間
        await supabase
          .from('assignment_members')
          .update({ completed_at: completionTime })
          .eq('assignment_id', targetAssignmentId)
          .eq('leader_id', memberInfo.id);

        console.log(`✅ 隊長 ${userId} 完成任務，小隊成員同步完成`);
      }

      return res.status(200).json({
        status: "ok",
        message: "進度已提交"
      });

    } catch (error) {
      console.error('submitProgress 錯誤:', error);
      return res.status(500).json({
        status: "error",
        message: error.message
      });
    }
  }

  // ====== 關閉報名 ======
  if (action === 'closeRecruitment') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限關閉報名" });
    }

    try {
      const { missionId } = body;

      const { error } = await supabase
        .from('missions')
        .update({
          recruitment_closed: true,
          updated_at: getTaipeiISOString(),
        })
        .eq('id', missionId);

      if (error) {
        console.error('關閉報名錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to close recruitment" });
      }

      return res.status(200).json({
        status: "ok",
        message: "報名已關閉"
      });
    } catch (error) {
      console.error('closeRecruitment 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 結案 ======
  if (action === 'completeMission') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限結案" });
    }

    try {
      const { missionId } = body;

      const { error } = await supabase
        .from('missions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: getTaipeiISOString(),
        })
        .eq('id', missionId);

      if (error) {
        console.error('結案錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to complete mission" });
      }

      return res.status(200).json({
        status: "ok",
        message: "任務已結案"
      });
    } catch (error) {
      console.error('completeMission 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 刪除任務 ======
  if (action === 'deleteMission') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限刪除任務" });
    }

    try {
      const { missionId } = body;

      // 因為有 CASCADE，刪除 mission 會自動刪除相關的 participants 和 progress
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) {
        console.error('刪除任務錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to delete mission" });
      }

      return res.status(200).json({
        status: "ok",
        message: "任務已刪除"
      });
    } catch (error) {
      console.error('deleteMission 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 取得成員列表（按單位分組）======
  if (action === 'getMembers') {
    try {
      const { data: members, error } = await supabase
        .from('users')
        .select('user_id, display_name, 姓名, 管理員, 單位, 電子信箱')
        .order('單位', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) {
        console.error('取得成員錯誤:', error);
        return res.status(500).json({
          status: "error",
          message: "Failed to fetch members"
        });
      }

      // 按單位分組
      const groupedByUnit = {};
      members.forEach(m => {
        const unit = m.單位 || '未分組';
        if (!groupedByUnit[unit]) {
          groupedByUnit[unit] = [];
        }
        groupedByUnit[unit].push({
          user_id: m.user_id,
          display_name: m.display_name || m.姓名,
          role: m.管理員 || '一般用戶',
          unit: m.單位,
          email: m.電子信箱
        });
      });

      return res.status(200).json({
        status: "ok",
        members: members.map(m => ({
          user_id: m.user_id,
          display_name: m.display_name || m.姓名,
          role: m.管理員 || '一般用戶',
          unit: m.單位,
          email: m.電子信箱
        })),
        groupedByUnit  // ✅ 新增：按單位分組的資料
      });
    } catch (error) {
      console.error('getMembers 錯誤:', error);
      return res.status(500).json({
        status: "error",
        message: error.message
      });
    }
  }

  // ====== 編輯任務 ======
  if (action === 'editMission') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限編輯任務" });
    }

    try {
      const { missionId, missionData } = body;

      const { error } = await supabase
        .from('missions')
        .update({
          ...missionData,
          updated_at: getTaipeiISOString(),
        })
        .eq('id', missionId);

      if (error) {
        console.error('編輯任務錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to edit mission" });
      }

      return res.status(200).json({
        status: "ok",
        message: "任務更新成功"
      });
    } catch (error) {
      console.error('editMission 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 取得成員任務統計 ======
  if (action === 'getMemberStats') {
    if (userRole !== '管理') {
      return res.status(403).json({ status: "error", message: "沒有權限查看統計" });
    }

    try {
      const { data: stats, error } = await supabase
        .from('mission_participants')
        .select(`
          user_id,
          display_name,
          mission_id,
          is_assigned,
          missions!inner(mission_type, status, mission_date)
        `);

      if (error) {
        console.error('取得統計錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to fetch stats" });
      }

      // 整理統計資料
      const memberStats = {};
      stats.forEach(record => {
        if (!memberStats[record.user_id]) {
          memberStats[record.user_id] = {
            user_id: record.user_id,
            display_name: record.display_name,
            total_missions: 0,
            assigned_missions: 0,
            completed_missions: 0,
            mission_types: {}
          };
        }

        memberStats[record.user_id].total_missions++;
        if (record.is_assigned) memberStats[record.user_id].assigned_missions++;
        if (record.missions.status === 'completed') memberStats[record.user_id].completed_missions++;

        const type = record.missions.mission_type;
        memberStats[record.user_id].mission_types[type] =
          (memberStats[record.user_id].mission_types[type] || 0) + 1;
      });

      return res.status(200).json({
        status: "ok",
        stats: Object.values(memberStats)
      });
    } catch (error) {
      console.error('getMemberStats 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
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

// 在文件開頭添加
function getTaipeiTime() {
    const now = new Date();
    return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

function getTaipeiISOString() {
    return getTaipeiTime().toISOString();
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
