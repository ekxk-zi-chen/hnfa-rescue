// src/services/group.service.ts

import { supabase } from '../integrations/supabase.client.js';
import { GroupSettings, UserState } from '../types/line-event.js';

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
            console.log(`🔎 [GroupSettings] 正在查詢群組: ${groupId}`);

            // --- 🧪 暴力測試：如果連線失敗，直接回傳預設設定 ---
            const { data, error } = await supabase
                .from('line_group_settings')
                .select('*')
                .eq('group_id', groupId)
                .maybeSingle();

            if (error || !data) {
                console.log('⚠️ [GroupSettings] 資料庫查詢失敗或沒資料，使用本地預設值進行測試');
                return {
                    group_id: groupId,
                    command_prefix: '#', // 這裡設成跟你輸入的一樣
                    is_active: true,
                    whitelist: [],
                    blacklist: []
                } as any;
            }

            return data;
        } catch (e) {
            console.error('🔥 [GroupSettings] 嚴重崩潰:', e);
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
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            // 💡 關鍵：手動轉為 YYYY-MM-DD HH:mm:ss 格式
            const formattedExpiresAt = expiresAt.toLocaleString('sv-SE').replace('T', ' ');
            const formattedUpdatedAt = new Date().toLocaleString('sv-SE').replace('T', ' ');

            const { error } = await supabase
                .from('line_user_states')
                .upsert({
                    user_id: userId,
                    state_type: stateType,
                    state_data: stateData,
                    group_id: groupId || null,
                    expires_at: formattedExpiresAt,
                    updated_at: formattedUpdatedAt
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
        console.log('🧪 [Inside Service] 啟動 getUserState (防禦模式)');

        try {
            // 🚀 關鍵改動：給它一個 Promise.race，如果 Supabase 3秒內沒回話，直接當作沒這回事
            // 這樣可以防止 Vercel 因為 fetch 卡住而直接殺掉 Process
            const result = await Promise.race([
                supabase.from('line_user_states').select('*').eq('user_id', userId).maybeSingle(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), 3000))
            ]) as any;

            const { data, error } = result;

            if (error) {
                console.log('⚠️ [Inside Service] 查詢有錯但沒崩潰:', error.message);
                return null;
            }

            console.log('🧪 [Inside Service] 查詢成功結束');
            return data;
        } catch (err: any) {
            // 這裡會抓到 fetch failed 或 timeout
            console.log('🛡️ [Inside Service] 攔截到連線抖動，跳過狀態檢查繼續執行 Step 7');
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
