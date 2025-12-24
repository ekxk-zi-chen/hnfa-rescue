// src/commands/group.command.ts

import { MessageEvent, TextMessage } from '../types/line-event.js';
import { lineClient } from '../integrations/line.client.js';
import { groupService } from '../services/group.service.js';
import { handleMissionReport } from './report.command.js';

// ==================== 群組訊息處理 ====================

/**
 * 處理群組訊息
 * 
 * 流程：
 * 1. 檢查群組是否啟用
 * 2. 驗證使用者權限（白名單/黑名單）
 * 3. 判斷是否為指令
 * 4. 轉交給對應的指令處理器
 */
export async function handleGroupMessage(event: MessageEvent): Promise<void> {
  try {
    // 1. 只處理文字訊息
    if (event.message.type !== 'text') {
      return;
    }

    const textMessage = event.message as TextMessage;
    const text = textMessage.text;

    // 2. 取得群組 ID 和使用者 ID
    const groupId = lineClient.getGroupId(event);
    const userId = lineClient.getUserId(event);

    if (!groupId || !userId) {
      console.log('⚠️ 無法取得 groupId 或 userId');
      return;
    }

    // 3. 檢查群組設定
    const groupSettings = await groupService.getGroupSettings(groupId);

    if (!groupSettings) {
      console.log(`ℹ️ 群組 ${groupId} 未啟用或不存在設定`);
      return; // 靜默處理，不回應
    }

    // 4. 驗證使用者權限
    if (!groupService.isUserAllowed(userId, groupSettings)) {
      await lineClient.replyText(
        event.replyToken,
        '❌ 您沒有權限使用此功能'
      );
      return;
    }

    // 5. 檢查是否為指令
    if (!groupService.isCommand(text, groupSettings.command_prefix)) {
      return; // 不是指令，忽略
    }

    // 6. 移除指令前綴，取得內容
    const content = groupService.extractContent(text, groupSettings.command_prefix);

    // 7. 根據指令前綴決定處理方式
    if (groupSettings.command_prefix === '#任務回報') {
      await handleMissionReport(event, userId, groupId, content);
    } else {
      // 未來可擴充其他指令
      console.log(`⚠️ 未知指令: ${groupSettings.command_prefix}`);
    }

  } catch (error) {
    console.error('❌ 處理群組訊息失敗:', error);
    
    // 發生錯誤時回覆使用者
    try {
      await lineClient.replyText(
        event.replyToken,
        '❌ 系統錯誤，請稍後再試'
      );
    } catch (replyError) {
      console.error('❌ 回覆錯誤訊息失敗:', replyError);
    }
  }
}
