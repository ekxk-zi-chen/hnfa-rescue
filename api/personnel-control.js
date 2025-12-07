import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

// ------------------- 驗證 sessionToken -------------------
function verifySessionToken(sessionToken, secret) {
  try {
    return jwt.verify(sessionToken, secret);
  } catch (e) {
    return null;
  }
}

// ------------------- 處理 Personnel Control 專用 action -------------------
async function handlePersonnelAction(action, body, supabase, JWT_SECRET, userData, res) {
  const userRole = userData.管理員 || "一般用戶";

  // ====== 檢查管理權限 ======
  if (userRole !== "管理") {
    return res.status(403).json({ 
      status: "error", 
      message: "僅限管理員使用人員管制系統" 
    });
  }

  // ====== 取得所有人員資料（包含狀態） ======
  if (action === "getPersonnelData") {
    try {
      // 先取得所有用戶（作為人員基礎資料）
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, 姓名, display_name, 單位, 管理員')
        .order('display_name');

      if (usersError) {
        console.error('獲取用戶資料錯誤:', usersError);
        return res.status(500).json({ status: "error", message: "Failed to fetch users" });
      }

      // 取得人員狀態（從新的 personnel_access 表）
      const { data: accessData, error: accessError } = await supabase
        .from('personnel_access')
        .select('*')
        .order('created_at', { ascending: false });

      if (accessError && accessError.code !== 'PGRST116') {
        console.error('獲取人員狀態錯誤:', accessError);
        // 如果表不存在，先建立
      }

      // 合併資料：將用戶資料轉換為原系統格式
      const personnelData = users.map(user => {
        // 查找該用戶的狀態資料
        const userAccess = accessData?.find(access => access.user_id === user.user_id);
        
        return {
          id: user.user_id,
          name: user.姓名 || user.display_name,
          group: user.單位 || '未分組',
          photo: 'default.jpg', // 預設圖片
          status: userAccess?.status || 'BoO',
          time_status: userAccess?.last_updated || new Date().toLocaleString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          time_history: userAccess?.history || '',
          lastReason: userAccess?.last_reason || ''
        };
      });

      return res.status(200).json({
        status: "ok",
        personnel: personnelData,
        count: personnelData.length
      });

    } catch (error) {
      console.error('getPersonnelData 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 取得所有器材資料 ======
  if (action === "getEquipmentData") {
    try {
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select('*')
        .order('裝備編號', { ascending: true });

      if (error) {
        console.error('獲取器材資料錯誤:', error);
        return res.status(500).json({ status: "error", message: "Failed to fetch equipment" });
      }

      // 轉換為原系統格式
      const equipmentData = equipment.map(item => ({
        id: item.id,
        name: item.器材名稱 || `器材${item.裝備編號}`,
        detail_name: item.器材名稱,
        category: item.分群組 || '未分類',
        photo: item.圖片檔案位置 || 'default.jpg',
        status: item.目前狀態 || '在隊',
        time_status: item.updated_at 
          ? new Date(item.updated_at).toLocaleString('zh-TW', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '',
        time_history: item.歷史更新紀錄 || '',
        lastReason: item.狀態 || ''
      }));

      return res.status(200).json({
        status: "ok",
        equipment: equipmentData,
        count: equipmentData.length
      });

    } catch (error) {
      console.error('getEquipmentData 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 更新人員狀態 ======
  if (action === "updatePersonnelStatus") {
    try {
      const { itemId, newStatus, reason } = body;
      
      const currentTime = new Date().toISOString();
      const formattedTime = new Date().toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 先查找現有記錄
      const { data: existingRecord, error: findError } = await supabase
        .from('personnel_access')
        .select('*')
        .eq('user_id', itemId)
        .single();

      let history = '';
      if (existingRecord && existingRecord.history) {
        const oldHistory = existingRecord.history;
        let historyEntry = newStatus;
        if (reason && (newStatus === '外出' || newStatus === '應勤')) {
          historyEntry += ` (${reason})`;
        }
        historyEntry += ' ' + formattedTime;
        history = historyEntry + '\n' + oldHistory;
        
        // 只保留最近20筆
        const historyLines = history.split('\n').slice(0, 20);
        history = historyLines.join('\n');
      } else {
        let historyEntry = newStatus;
        if (reason && (newStatus === '外出' || newStatus === '應勤')) {
          historyEntry += ` (${reason})`;
        }
        history = historyEntry + ' ' + formattedTime;
      }

      const recordData = {
        user_id: itemId,
        status: newStatus,
        last_reason: reason || null,
        last_updated: formattedTime,
        history: history,
        updated_by: userData.user_id,
        updated_at: currentTime
      };

      let result;
      if (existingRecord) {
        // 更新現有記錄
        result = await supabase
          .from('personnel_access')
          .update(recordData)
          .eq('user_id', itemId);
      } else {
        // 新增記錄
        recordData.created_at = currentTime;
        result = await supabase
          .from('personnel_access')
          .insert(recordData);
      }

      if (result.error) {
        console.error('更新人員狀態錯誤:', result.error);
        return res.status(500).json({ status: "error", message: "Failed to update personnel status" });
      }

      return res.status(200).json({
        status: "ok",
        message: "人員狀態已更新"
      });

    } catch (error) {
      console.error('updatePersonnelStatus 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 更新器材狀態 ======
  if (action === "updateEquipmentStatus") {
    try {
      const { itemId, newStatus, reason } = body;

      // 獲取現有裝備資料
      const { data: equipment, error: fetchError } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError) {
        console.error('獲取裝備資料錯誤:', fetchError);
        return res.status(500).json({ status: "error", message: "裝備不存在" });
      }

      const currentTime = new Date();
      const taiwanTime = new Date(currentTime.getTime() + (8 * 60 * 60 * 1000));
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

      // 更新歷史紀錄
      let historyEntry = `[${timestamp}] ${userData.display_name} 將狀態改為 ${newStatus}`;
      if (reason) {
        historyEntry += ` (${reason})`;
      }

      const currentHistory = equipment.歷史更新紀錄 || '';
      const newHistory = currentHistory 
        ? `${historyEntry}\n${currentHistory}`
        : historyEntry;

      // 只保留最新30筆
      const historyLines = newHistory.split('\n').slice(0, 30);
      const trimmedHistory = historyLines.join('\n');

      // 更新裝備資料
      const { error: updateError } = await supabase
        .from('equipment')
        .update({
          目前狀態: newStatus,
          狀態: reason || '',
          歷史更新紀錄: trimmedHistory,
          填表人: userData.display_name || userData.姓名,
          updated_at: currentTime.toISOString()
        })
        .eq('id', itemId);

      if (updateError) {
        console.error('更新裝備狀態錯誤:', updateError);
        return res.status(500).json({ status: "error", message: "Failed to update equipment" });
      }

      return res.status(200).json({
        status: "ok",
        message: "器材狀態已更新"
      });

    } catch (error) {
      console.error('updateEquipmentStatus 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 批次更新群組狀態 ======
  if (action === "batchUpdateGroupStatus") {
    try {
      const { groupName, newStatus, reason, itemType } = body; // itemType: 'personnel' 或 'equipment'
      
      if (itemType === 'personnel') {
        // 批次更新人員群組
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('user_id')
          .eq('單位', groupName);

        if (usersError) {
          console.error('獲取群組人員錯誤:', usersError);
          return res.status(500).json({ status: "error", message: "Failed to fetch group members" });
        }

        const userIds = users.map(user => user.user_id);
        const currentTime = new Date().toISOString();
        const formattedTime = new Date().toLocaleString('zh-TW', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        // 批次更新所有人員狀態
        for (const userId of userIds) {
          const { data: existingRecord } = await supabase
            .from('personnel_access')
            .select('*')
            .eq('user_id', userId)
            .single();

          let history = '';
          if (existingRecord && existingRecord.history) {
            const oldHistory = existingRecord.history;
            let historyEntry = newStatus;
            if (reason && (newStatus === '外出' || newStatus === '應勤')) {
              historyEntry += ` (${reason})`;
            }
            historyEntry += ' ' + formattedTime;
            history = historyEntry + '\n' + oldHistory;
            
            const historyLines = history.split('\n').slice(0, 20);
            history = historyLines.join('\n');
          } else {
            let historyEntry = newStatus;
            if (reason && (newStatus === '外出' || newStatus === '應勤')) {
              historyEntry += ` (${reason})`;
            }
            history = historyEntry + ' ' + formattedTime;
          }

          const recordData = {
            user_id: userId,
            status: newStatus,
            last_reason: reason || null,
            last_updated: formattedTime,
            history: history,
            updated_by: userData.user_id,
            updated_at: currentTime
          };

          if (existingRecord) {
            await supabase
              .from('personnel_access')
              .update(recordData)
              .eq('user_id', userId);
          } else {
            recordData.created_at = currentTime;
            await supabase
              .from('personnel_access')
              .insert(recordData);
          }
        }

        return res.status(200).json({
          status: "ok",
          message: `已更新 ${userIds.length} 位人員狀態`,
          updatedCount: userIds.length
        });

      } else {
        // 批次更新器材類別
        const { data: equipmentList, error: eqError } = await supabase
          .from('equipment')
          .select('*')
          .eq('分群組', groupName);

        if (eqError) {
          console.error('獲取群組器材錯誤:', eqError);
          return res.status(500).json({ status: "error", message: "Failed to fetch group equipment" });
        }

        const currentTime = new Date();
        const taiwanTime = new Date(currentTime.getTime() + (8 * 60 * 60 * 1000));
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

        // 批次更新所有器材
        for (const equipment of equipmentList) {
          let historyEntry = `[${timestamp}] ${userData.display_name} 將狀態改為 ${newStatus}`;
          if (reason) {
            historyEntry += ` (${reason})`;
          }

          const currentHistory = equipment.歷史更新紀錄 || '';
          const newHistory = currentHistory 
            ? `${historyEntry}\n${currentHistory}`
            : historyEntry;

          const historyLines = newHistory.split('\n').slice(0, 30);
          const trimmedHistory = historyLines.join('\n');

          await supabase
            .from('equipment')
            .update({
              目前狀態: newStatus,
              狀態: reason || '',
              歷史更新紀錄: trimmedHistory,
              填表人: userData.display_name || userData.姓名,
              updated_at: currentTime.toISOString()
            })
            .eq('id', equipment.id);
        }

        return res.status(200).json({
          status: "ok",
          message: `已更新 ${equipmentList.length} 項器材狀態`,
          updatedCount: equipmentList.length
        });
      }

    } catch (error) {
      console.error('batchUpdateGroupStatus 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 保存自訂原因 ======
  if (action === "saveCustomReasons") {
    try {
      const { reasons } = body;
      
      // 這裡可以將原因保存到資料庫，或使用 localStorage（前端處理）
      // 因為原因通常由前端管理，我們可以返回成功
      
      return res.status(200).json({
        status: "ok",
        message: "原因已保存"
      });

    } catch (error) {
      console.error('saveCustomReasons 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 取得任務相關人員（可勾選） ======
  if (action === "getMissionPersonnel") {
    try {
      const { missionId } = body;

      // 取得所有用戶
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('user_id, 姓名, display_name, 單位, 管理員')
        .order('display_name');

      if (usersError) {
        console.error('獲取用戶資料錯誤:', usersError);
        return res.status(500).json({ status: "error", message: "Failed to fetch users" });
      }

      // 如果有 missionId，取得已加入該任務的人員
      let missionParticipants = [];
      if (missionId) {
        const { data: participants } = await supabase
          .from('mission_participants')
          .select('user_id')
          .eq('mission_id', missionId);

        missionParticipants = participants || [];
      }

      // 為每個用戶添加是否已加入任務的標記
      const personnelWithSelection = allUsers.map(user => ({
        ...user,
        selected: missionParticipants.some(p => p.user_id === user.user_id),
        display_name: user.姓名 || user.display_name
      }));

      // 按單位分組
      const groupedByUnit = {};
      personnelWithSelection.forEach(user => {
        const unit = user.單位 || '未分組';
        if (!groupedByUnit[unit]) {
          groupedByUnit[unit] = [];
        }
        groupedByUnit[unit].push(user);
      });

      return res.status(200).json({
        status: "ok",
        personnel: personnelWithSelection,
        groupedByUnit: groupedByUnit,
        count: allUsers.length
      });

    } catch (error) {
      console.error('getMissionPersonnel 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // ====== 更新任務參與人員 ======
  if (action === "updateMissionPersonnel") {
    try {
      const { missionId, selectedUserIds } = body;

      if (!missionId) {
        return res.status(400).json({ status: "error", message: "需要 missionId" });
      }

      // 先刪除現有的參與者
      const { error: deleteError } = await supabase
        .from('mission_participants')
        .delete()
        .eq('mission_id', missionId);

      if (deleteError) {
        console.error('刪除現有參與者錯誤:', deleteError);
        return res.status(500).json({ status: "error", message: "Failed to clear existing participants" });
      }

      // 如果有選中的人員，批量插入
      if (selectedUserIds && selectedUserIds.length > 0) {
        // 獲取用戶的顯示名稱
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('user_id, display_name, 姓名')
          .in('user_id', selectedUserIds);

        if (usersError) {
          console.error('獲取用戶名稱錯誤:', usersError);
          return res.status(500).json({ status: "error", message: "Failed to fetch user names" });
        }

        const participants = users.map(user => ({
          mission_id: missionId,
          user_id: user.user_id,
          display_name: user.姓名 || user.display_name,
          is_assigned: false,
          joined_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('mission_participants')
          .insert(participants);

        if (insertError) {
          console.error('插入參與者錯誤:', insertError);
          return res.status(500).json({ status: "error", message: "Failed to add participants" });
        }
      }

      return res.status(200).json({
        status: "ok",
        message: `已更新任務參與人員 (${selectedUserIds?.length || 0}人)`
      });

    } catch (error) {
      console.error('updateMissionPersonnel 錯誤:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }

  // 如果沒有匹配的 action
  return res.status(400).json({ status: "error", message: "Unknown action" });
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
      return res.status(500).json({ status: "error", message: "Server configuration error" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { sessionToken, action } = body;

    if (!sessionToken) {
      return res.status(401).json({ status: "error", message: "需要登入" });
    }

    // 驗證 sessionToken
    const decoded = verifySessionToken(sessionToken, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ status: "error", message: "無效的 session" });
    }

    // 獲取用戶資訊
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", decoded.userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ status: "error", message: "用戶不存在" });
    }

    // 處理 Personnel Control 相關的 action
    return await handlePersonnelAction(action, body, supabase, JWT_SECRET, userData, res);

  } catch (err) {
    console.error("[personnel-control] 錯誤:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Internal server error"
    });
  }
}
