// src/services/group.service.ts

import { supabase } from '../integrations/supabase.client';
import { GroupSettings, UserState } from '../types/line-event';

// ==================== 群組設定服務 ====================

/**
 * 群組設定服務
 * 負責：
 * - 查詢群組設定
 * - 驗證白名單/黑名單
 * - 管理使用者狀態（用於多步驟互動）
 */
export class GroupService {
  
  // ==================== 群組設定 ====================

  /**
   * 取得群組設定
   * @param groupId - LINE 群組 ID
   * @returns 群組設定（如果不存在或未啟用則回傳 null）
   */
  async getGroupSettings(groupId: string): Promise<GroupSettings | null> {
    try {
      const { data, error } = await supabase
        .from('line_group_settings')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 找不到資料
          console.log(`ℹ️ 群組 ${groupId} 未設定或未啟用`);
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ 取得群組設定失敗:', error);
      return null;
    }
  }

  /**
   * 檢查使用者是否有權限使用 Bot
   * @param userId - LINE user_id
   * @param groupSettings - 群組設定
   * @returns 是否有權限
   */
  isUserAllowed(userId: string, groupSettings: GroupSettings): boolean {
    // 如果有黑名單，且使用者在黑名單中 → 拒絕
    if (groupSettings.blacklist && groupSettings.blacklist.includes(userId)) {
      console.log(`⛔ 使用者 ${userId} 在黑名單中`);
      return false;
    }

    // 如果有白名單，且使用者不在白名單中 → 拒絕
    if (groupSettings.whitelist && groupSettings.whitelist.length > 0) {
      if (!groupSettings.whitelist.includes(userId)) {
        console.log(`⛔ 使用者 ${userId} 不在白名單中`);
        return false;
      }
    }

    // 通過檢查
    return true;
  }

  /**
   * 檢查訊息是否為指令
   * @param text - 訊息文字
   * @param commandPrefix - 指令前綴（例如：#任務回報）
   * @returns 是否為指令
   */
  isCommand(text: string, commandPrefix: string): boolean {
    return text.trim().startsWith(commandPrefix);
  }

  /**
   * 移除指令前綴，取得純內容
   * @param text - 訊息文字
   * @param commandPrefix - 指令前綴
   * @returns 移除前綴後的內容
   * 
   * @example
   * extractContent('#任務回報\n到現場了', '#任務回報')
   * // => '到現場了'
   */
  extractContent(text: string, commandPrefix: string): string {
    return text
      .trim()
      .replace(commandPrefix, '')
      .trim();
  }

  // ==================== 使用者狀態管理 ====================

  /**
   * 設定使用者狀態（用於多步驟互動）
   * @param userId - LINE user_id
   * @param stateType - 狀態類型
   * @param stateData - 狀態資料（例如：選擇的任務 ID）
   * @param groupId - 群組 ID（選填）
   */
  async setUserState(
    userId: string,
    stateType: 'waiting_report_content' | 'idle',
    stateData: any,
    groupId?: string
  ): Promise<void> {
    try {
      // 設定 15 分鐘後過期
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { error } = await supabase
        .from('line_user_states')
        .upsert({
          user_id: userId,
          state_type: stateType,
          state_data: stateData,
          group_id: groupId || null,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log(`✅ 設定使用者狀態: ${userId} → ${stateType}`);
    } catch (error) {
      console.error('❌ 設定使用者狀態失敗:', error);
      throw error;
    }
  }

  /**
   * 取得使用者當前狀態
   * @param userId - LINE user_id
   * @returns 使用者狀態（如果不存在或已過期則回傳 null）
   */
  async getUserState(userId: string): Promise<UserState | null> {
    try {
      const { data, error } = await supabase
        .from('line_user_states')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString()) // 尚未過期
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 找不到資料
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ 取得使用者狀態失敗:', error);
      return null;
    }
  }

  /**
   * 清除使用者狀態
   * @param userId - LINE user_id
   */
  async clearUserState(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('line_user_states')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      console.log(`✅ 清除使用者狀態: ${userId}`);
    } catch (error) {
      console.error('❌ 清除使用者狀態失敗:', error);
      // 不拋出錯誤，避免影響主流程
    }
  }

  /**
   * 清理過期狀態（可定期執行）
   */
  async cleanupExpiredStates(): Promise<void> {
    try {
      const { error } = await supabase
        .from('line_user_states')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      console.log('✅ 清理過期狀態完成');
    } catch (error) {
      console.error('❌ 清理過期狀態失敗:', error);
    }
  }
}

// ==================== 匯出單例 ====================

export const groupService = new GroupService();