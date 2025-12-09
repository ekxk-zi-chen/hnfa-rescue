// personnelControlModule.js
import { createClient } from "@supabase/supabase-js";

// 獲取台灣時間
function getTaiwanTime() {
  // 建立 UTC+8 的台灣時間
  const now = new Date();
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

  const month = (taiwanTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = taiwanTime.getUTCDate().toString().padStart(2, '0');
  const hours = taiwanTime.getUTCHours().toString().padStart(2, '0');
  const minutes = taiwanTime.getUTCMinutes().toString().padStart(2, '0');

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

      return res.status(200).json({
        status: "ok",
        personnel: data || []
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

      return res.status(200).json({
        status: "ok",
        equipment: data || []
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

      return res.status(200).json({
        status: "ok",
        masterPersonnel: data || []
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

      return res.status(200).json({
        status: "ok",
        masterEquipment: data || []
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

      // 更新資料庫
      const { data, error } = await supabase
        .from('personnel_control')
        .update({
          status: status,
          time_status: currentTime,
          time_history: newHistory,
          reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        status: "ok",
        message: "狀態更新成功",
        personnel: data
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
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        status: "ok",
        message: "狀態更新成功",
        equipment: data
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
            updated_at: new Date().toISOString()
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
            time_status: getTaiwanTime(),
            time_history: `BoO ${getTaiwanTime()}`,
            updated_at: new Date().toISOString()
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
            updated_at: new Date().toISOString()
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
            time_status: getTaiwanTime(),
            time_history: `在隊 ${getTaiwanTime()}`,
            updated_at: new Date().toISOString()
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
            updated_at: new Date().toISOString()
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('personnel_control')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        status: "ok",
        message: "人員已新增到總資料庫",
        personnel: data
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('equipment_control')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        status: "ok",
        message: "器材已新增到總資料庫",
        equipment: data
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
        data = personnel;
      } else {
        const { data: equipment, error } = await supabase
          .from('equipment_control')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        data = equipment;
      }

      return res.status(200).json({
        status: "ok",
        message: "資料刷新成功",
        data: data || []
      });
    }

    // ====== 批次更新所有項目 ======
    if (action === 'batchUpdateAll') {
      if (!isAdmin) {
        return res.status(403).json({
          status: "error",
          message: "只有管理員可以批次更新"
        });
      }

      const { ids, status, reason, viewType } = body;
      const currentTime = getTaiwanTime();

      let tableName;
      if (viewType === 'personnel') {
        tableName = 'personnel_control';
      } else {
        tableName = 'equipment_control';
      }

      // 找出所有項目
      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .in('id', ids);

      if (fetchError) throw fetchError;

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
            status: status,
            time_status: currentTime,
            time_history: newHistory,
            reason: reason || null,
            updated_at: new Date().toISOString()
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
