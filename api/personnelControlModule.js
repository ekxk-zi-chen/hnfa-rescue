// personnelControlModule.js
import { createClient } from "@supabase/supabase-js";

// 獲取台灣時間（格式化為 MM/DD HH:mm）
function getTaiwanTime() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

// 獲取台灣時間的 ISO 字串（UTC+8）
function getTaiwanISOTime() {
  const now = new Date();
  // 台灣時間是 UTC+8，所以要加 8 小時
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return taiwanTime.toISOString();
}

// 將 UTC 時間轉換為台灣時間 ISO 字串
function convertUTCtoTaiwanISO(utcString) {
  if (!utcString) return getTaiwanISOTime();
  const date = new Date(utcString);
  // 轉換為台灣時間 (UTC+8)
  const taiwanTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  return taiwanTime.toISOString();
}

// 將 ISO 時間轉換為台灣時間顯示格式
function formatISOToTaiwanDisplay(isoString) {
  if (!isoString) return getTaiwanTime();
  const date = new Date(isoString);
  // 如果已經是台灣時間（資料庫中存的是台灣時間），不需要再加8小時
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

// 解析歷史紀錄中的原因
function parseReasonFromHistory(historyText) {
  if (!historyText) return '';
  const lines = historyText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '';
  
  const lastLine = lines[0];
  const match = lastLine.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

// 處理人員管制的所有action
export async function handlePersonnelControl(action, body, supabase, userData, res) {
  const userRole = userData.管理員 || "一般用戶";
  const isAdmin = userRole === '管理';
  
  console.log(`[人員管制] action: ${action}, 用戶角色: ${userRole}`);

  try {
    // ====== 獲取當前任務人員 ======
    if (action === 'getMissionPersonnel') {
      const { data, error } = await supabase
        .from('personnel_control')
        .select('*')
        .eq('is_active', true)
        .order('group_name', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const personnelWithTaiwanTime = (data || []).map(person => ({
        ...person,
        created_at: formatISOToTaiwanDisplay(person.created_at),
        updated_at: formatISOToTaiwanDisplay(person.updated_at)
      }));

      return res.status(200).json({
        status: "ok",
        personnel: personnelWithTaiwanTime
      });
    }

    // ====== 獲取當前任務器材 ======
    if (action === 'getMissionEquipment') {
      const { data, error } = await supabase
        .from('equipment_control')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const equipmentWithTaiwanTime = (data || []).map(equipment => ({
        ...equipment,
        created_at: formatISOToTaiwanDisplay(equipment.created_at),
        updated_at: formatISOToTaiwanDisplay(equipment.updated_at)
      }));

      return res.status(200).json({
        status: "ok",
        equipment: equipmentWithTaiwanTime
      });
    }

    // ====== 獲取總人員資料庫 ======
    if (action === 'getMasterPersonnel') {
      const { data, error } = await supabase
        .from('personnel_control')
        .select('*')
        .eq('is_master', true)
        .order('group_name', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const masterPersonnelWithTaiwanTime = (data || []).map(person => ({
        ...person,
        created_at: formatISOToTaiwanDisplay(person.created_at),
        updated_at: formatISOToTaiwanDisplay(person.updated_at)
      }));

      return res.status(200).json({
        status: "ok",
        masterPersonnel: masterPersonnelWithTaiwanTime
      });
    }

    // ====== 獲取總器材資料庫 ======
    if (action === 'getMasterEquipment') {
      const { data, error } = await supabase
        .from('equipment_control')
        .select('*')
        .eq('is_master', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const masterEquipmentWithTaiwanTime = (data || []).map(equipment => ({
        ...equipment,
        created_at: formatISOToTaiwanDisplay(equipment.created_at),
        updated_at: formatISOToTaiwanDisplay(equipment.updated_at)
      }));

      return res.status(200).json({
        status: "ok",
        masterEquipment: masterEquipmentWithTaiwanTime
      });
    }

    // ====== 更新人員狀態 ======
    if (action === 'updatePersonnelStatus') {
      // 檢查權限
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以更新狀態" 
        });
      }

      const { id, status, reason } = body;
      const currentTime = getTaiwanTime();
      const currentISOTime = getTaiwanISOTime();

      // 先獲取舊資料
      const { data: oldData, error: fetchError } = await supabase
        .from('personnel_control')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 更新歷史紀錄
      const historyText = oldData.time_history || '';
      const historyLines = historyText.split('\n').filter(line => line.trim());
      
      let historyEntry = status;
      if (reason && status === '外出') {
        historyEntry += ` (${reason})`;
      }
      historyEntry += ' ' + currentTime;
      
      historyLines.unshift(historyEntry);
      
      // 只保留最近20筆
      if (historyLines.length > 20) {
        historyLines.length = 20;
      }
      
      const newHistory = historyLines.join('\n');

      // 更新資料庫（使用台灣時間）
      const { data, error } = await supabase
        .from('personnel_control')
        .update({
          status: status,
          time_status: currentTime,
          time_history: newHistory,
          reason: reason || null,
          updated_at: currentISOTime  // 使用台灣時間
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const updatedPersonnel = {
        ...data,
        created_at: formatISOToTaiwanDisplay(data.created_at),
        updated_at: formatISOToTaiwanDisplay(data.updated_at)
      };

      return res.status(200).json({
        status: "ok",
        message: "狀態更新成功",
        personnel: updatedPersonnel
      });
    }

    // ====== 更新器材狀態 ======
    if (action === 'updateEquipmentStatus') {
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以更新狀態" 
        });
      }

      const { id, status, reason } = body;
      const currentTime = getTaiwanTime();
      const currentISOTime = getTaiwanISOTime();

      const { data: oldData, error: fetchError } = await supabase
        .from('equipment_control')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const historyText = oldData.time_history || '';
      const historyLines = historyText.split('\n').filter(line => line.trim());
      
      let historyEntry = status;
      if (reason && status === '應勤') {
        historyEntry += ` (${reason})`;
      }
      historyEntry += ' ' + currentTime;
      
      historyLines.unshift(historyEntry);
      
      if (historyLines.length > 20) {
        historyLines.length = 20;
      }
      
      const newHistory = historyLines.join('\n');

      const { data, error } = await supabase
        .from('equipment_control')
        .update({
          status: status,
          time_status: currentTime,
          time_history: newHistory,
          reason: reason || null,
          updated_at: currentISOTime  // 使用台灣時間
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const updatedEquipment = {
        ...data,
        created_at: formatISOToTaiwanDisplay(data.created_at),
        updated_at: formatISOToTaiwanDisplay(data.updated_at)
      };

      return res.status(200).json({
        status: "ok",
        message: "狀態更新成功",
        equipment: updatedEquipment
      });
    }

    // ====== 批次更新群組狀態 ======
    if (action === 'batchUpdateGroupStatus') {
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以批次更新" 
        });
      }

      const { groupName, status, reason, viewType } = body;
      const currentTime = getTaiwanTime();
      const currentISOTime = getTaiwanISOTime();

      let tableName, statusField, groupField;
      if (viewType === 'personnel') {
        tableName = 'personnel_control';
        statusField = 'status';
        groupField = 'group_name';
      } else {
        tableName = 'equipment_control';
        statusField = 'status';
        groupField = 'category';
      }

      // 找出該群組的所有項目
      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq(groupField, groupName)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      if (!items || items.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "找不到該群組的項目"
        });
      }

      // 逐一更新
      const updatePromises = items.map(item => {
        const historyText = item.time_history || '';
        const historyLines = historyText.split('\n').filter(line => line.trim());
        
        let historyEntry = status;
        if (reason && (status === '外出' || status === '應勤')) {
          historyEntry += ` (${reason})`;
        }
        historyEntry += ' ' + currentTime;
        
        historyLines.unshift(historyEntry);
        
        if (historyLines.length > 20) {
          historyLines.length = 20;
        }
        
        const newHistory = historyLines.join('\n');

        return supabase
          .from(tableName)
          .update({
            [statusField]: status,
            time_status: currentTime,
            time_history: newHistory,
            reason: reason || null,
            updated_at: currentISOTime  // 使用台灣時間
          })
          .eq('id', item.id);
      });

      const results = await Promise.all(updatePromises);
      const hasError = results.some(result => result.error);

      if (hasError) {
        return res.status(500).json({
          status: "error",
          message: "部分項目更新失敗"
        });
      }

      return res.status(200).json({
        status: "ok",
        message: `已更新 ${items.length} 個項目`
      });
    }

    // ====== 管理任務人員（勾選加入/移除） ======
    if (action === 'manageMissionPersonnel') {
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以管理任務人員" 
        });
      }

      const { personnelIds, actionType } = body; // actionType: 'add' 或 'remove'
      const currentTime = getTaiwanTime();
      const currentISOTime = getTaiwanISOTime();

      if (!personnelIds || !Array.isArray(personnelIds)) {
        return res.status(400).json({
          status: "error",
          message: "請選擇人員"
        });
      }

      if (actionType === 'add') {
        // 將人員加入當前任務
        const { error } = await supabase
          .from('personnel_control')
          .update({ 
            is_active: true,
            status: 'BoO',
            time_status: currentTime,
            time_history: `BoO ${currentTime}`,
            updated_at: currentISOTime  // 使用台灣時間
          })
          .in('id', personnelIds);

        if (error) throw error;

        return res.status(200).json({
          status: "ok",
          message: `已將 ${personnelIds.length} 位人員加入任務`
        });
      } else if (actionType === 'remove') {
        // 將人員從當前任務移除
        const { error } = await supabase
          .from('personnel_control')
          .update({ 
            is_active: false,
            updated_at: currentISOTime  // 使用台灣時間
          })
          .in('id', personnelIds);

        if (error) throw error;

        return res.status(200).json({
          status: "ok",
          message: `已將 ${personnelIds.length} 位人員從任務移除`
        });
      }
    }

    // ====== 管理任務器材 ======
    if (action === 'manageMissionEquipment') {
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以管理任務器材" 
        });
      }

      const { equipmentIds, actionType } = body;
      const currentTime = getTaiwanTime();
      const currentISOTime = getTaiwanISOTime();

      if (!equipmentIds || !Array.isArray(equipmentIds)) {
        return res.status(400).json({
          status: "error",
          message: "請選擇器材"
        });
      }

      if (actionType === 'add') {
        const { error } = await supabase
          .from('equipment_control')
          .update({ 
            is_active: true,
            status: '在隊',
            time_status: currentTime,
            time_history: `在隊 ${currentTime}`,
            updated_at: currentISOTime  // 使用台灣時間
          })
          .in('id', equipmentIds);

        if (error) throw error;

        return res.status(200).json({
          status: "ok",
          message: `已將 ${equipmentIds.length} 項器材加入任務`
        });
      } else if (actionType === 'remove') {
        const { error } = await supabase
          .from('equipment_control')
          .update({ 
            is_active: false,
            updated_at: currentISOTime  // 使用台灣時間
          })
          .in('id', equipmentIds);

        if (error) throw error;

        return res.status(200).json({
          status: "ok",
          message: `已將 ${equipmentIds.length} 項器材從任務移除`
        });
      }
    }

    // ====== 新增人員到總資料庫 ======
    if (action === 'addToMasterPersonnel') {
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以新增人員" 
        });
      }

      const { personnelData } = body;
      const currentISOTime = getTaiwanISOTime();

      if (!personnelData || !personnelData.name) {
        return res.status(400).json({
          status: "error",
          message: "請提供人員資料"
        });
      }

      const dataToInsert = {
        ...personnelData,
        is_master: true,
        is_active: false, // 預設不在當前任務中
        created_at: currentISOTime,  // 使用台灣時間
        updated_at: currentISOTime   // 使用台灣時間
      };

      const { data, error } = await supabase
        .from('personnel_control')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const newPersonnel = {
        ...data,
        created_at: formatISOToTaiwanDisplay(data.created_at),
        updated_at: formatISOToTaiwanDisplay(data.updated_at)
      };

      return res.status(200).json({
        status: "ok",
        message: "人員已新增到總資料庫",
        personnel: newPersonnel
      });
    }

    // ====== 新增器材到總資料庫 ======
    if (action === 'addToMasterEquipment') {
      if (!isAdmin) {
        return res.status(403).json({ 
          status: "error", 
          message: "只有管理員可以新增器材" 
        });
      }

      const { equipmentData } = body;
      const currentISOTime = getTaiwanISOTime();

      if (!equipmentData || !equipmentData.name) {
        return res.status(400).json({
          status: "error",
          message: "請提供器材資料"
        });
      }

      const dataToInsert = {
        ...equipmentData,
        is_master: true,
        is_active: false,
        created_at: currentISOTime,  // 使用台灣時間
        updated_at: currentISOTime   // 使用台灣時間
      };

      const { data, error } = await supabase
        .from('equipment_control')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      // 轉換時間為台灣時間顯示格式
      const newEquipment = {
        ...data,
        created_at: formatISOToTaiwanDisplay(data.created_at),
        updated_at: formatISOToTaiwanDisplay(data.updated_at)
      };

      return res.status(200).json({
        status: "ok",
        message: "器材已新增到總資料庫",
        equipment: newEquipment
      });
    }

    // ====== 刷新資料（重新載入） ======
    if (action === 'refreshData') {
      // 這個action不需要權限檢查，任何人都可以刷新
      const viewType = body.viewType || 'personnel';
      
      let data;
      if (viewType === 'personnel') {
        const { data: personnel, error } = await supabase
          .from('personnel_control')
          .select('*')
          .eq('is_active', true)
          .order('group_name', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        
        // 轉換時間為台灣時間顯示格式
        data = (personnel || []).map(person => ({
          ...person,
          created_at: formatISOToTaiwanDisplay(person.created_at),
          updated_at: formatISOToTaiwanDisplay(person.updated_at)
        }));
      } else {
        const { data: equipment, error } = await supabase
          .from('equipment_control')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        
        // 轉換時間為台灣時間顯示格式
        data = (equipment || []).map(equipment => ({
          ...equipment,
          created_at: formatISOToTaiwanDisplay(equipment.created_at),
          updated_at: formatISOToTaiwanDisplay(equipment.updated_at)
        }));
      }

      return res.status(200).json({
        status: "ok",
        message: "資料刷新成功",
        data: data || []
      });
    }

    // ====== 未知的action ======
    return res.status(400).json({
      status: "error",
      message: `未知的action: ${action}`
    });

  } catch (error) {
    console.error(`[人員管制錯誤] ${action}:`, error);
    return res.status(500).json({
      status: "error",
      message: error.message || "伺服器錯誤"
    });
  }
}
