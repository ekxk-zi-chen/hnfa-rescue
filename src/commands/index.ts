// src/commands/index.ts

import { JoinEvent, LeaveEvent, LineEvent, MessageEvent, PostbackEvent, TextMessage } from '../types/line-event.js';
import { lineClient } from '../integrations/line.client.js';
import { groupService } from '../services/group.service.js';
import { handleGroupMessage } from './group.command.js';
import { handleMissionSelection, handleReportContent } from './report.command.js';

// ==================== 事件路由器（總機）====================

/**
 * 事件處理入口
 * 
 * 這是所有 LINE 事件的「總機」
 * 負責：
 * 1. 判斷事件類型（message / postback / join / leave）
 * 2. 判斷來源（user / group / room）
 * 3. 路由到對應的 handler
 */
export async function handleEvent(event: LineEvent): Promise<void> {
  try {
    // ✅ 新增：詳細的 debug 資訊
    console.log('========== 事件詳細資訊 ==========');
    console.log(`事件類型: ${event.type}`);
    console.log(`來源類型: ${event.source.type}`);
    
    if (event.source.type === 'group') {
      console.log(`群組 ID: ${event.source.groupId}`);
      console.log(`使用者 ID: ${event.source.userId}`);
    } else if (event.source.type === 'user') {
      console.log(`使用者 ID: ${event.source.userId}`);
    }
    
    if (event.type === 'message' && 'message' in event) {
      const msgEvent = event as MessageEvent;
      if (msgEvent.message.type === 'text') {
        console.log(`訊息內容: ${(msgEvent.message as TextMessage).text}`);
      }
    }
    console.log('=====================================');

    console.log(`📨 收到事件: ${event.type}, 來源: ${event.source.type}`);
    // ==================== Message Event ====================
    if (event.type === 'message') {
      await handleMessageEvent(event as MessageEvent).catch(err => console.error('❌ 訊息處理崩潰:', err));
      return;
    }

    // ==================== Postback Event ====================
    if (event.type === 'postback') {
      await handlePostbackEvent(event as PostbackEvent).catch(err => console.error('❌ 按鈕處理崩潰:', err));
      return;
    }

    // ==================== Join Event ====================
    if (event.type === 'join') {
      await handleJoinEvent(event as JoinEvent).catch(err => console.error('❌ 加入事件處理崩潰:', err));
      return;
    }

    // ==================== Leave Event ====================
    if (event.type === 'leave') {
      await handleLeaveEvent(event as LeaveEvent).catch(err => console.error('❌ 離開事件處理崩潰:', err));
      return;
    }

    // ✅ 修正：未知事件類型（加上型別斷言）
    console.log(`⚠️ 未處理的事件類型: ${(event as any).type || 'unknown'}`);

  } catch (error) {
    console.error('❌ 處理事件失敗:', error);
  }
}

// ==================== Message Event Handler ====================

/**
 * 處理訊息事件
 */
async function handleMessageEvent(event: MessageEvent): Promise<void> {
  const sourceType = event.source.type;

  // 1. 群組訊息
  if (sourceType === 'group') {
    await handleGroupMessageEvent(event);
    return;
  }

  // 2. 個人訊息
  if (sourceType === 'user') {
    await handleUserMessageEvent(event);
    return;
  }

  // 3. 聊天室訊息（目前不處理）
  if (sourceType === 'room') {
    console.log('ℹ️ 收到聊天室訊息，目前不處理');
    return;
  }
}

/**
 * 處理群組訊息事件
 */
async function handleGroupMessageEvent(event: MessageEvent): Promise<void> {
  try {
    const userId = lineClient.getUserId(event);
    if (!userId) return;

    // 💡 關鍵改動：這裡最容易因為網路抖動報錯
    let userState = null;
    try {
      userState = await groupService.getUserState(userId);
    } catch (dbError) {
      // 如果資料庫掛了，我們記錄一下，但讓 userState 保持 null，程式繼續往下跑
      console.error('⚠️ 無法取得使用者狀態(可能資料庫斷線)，跳過狀態檢查:', dbError);
    }

    if (userState && userState.state_type === 'waiting_report_content') {
      if (event.message.type === 'text') {
        const textMessage = event.message as TextMessage;
        await handleReportContent(event, userId, textMessage.text);
        return;
      }
    }

    // 💡 即使上面 getUserState 失敗了，我們依然嘗試執行一般群組指令處理
    await handleGroupMessage(event);

  } catch (error) {
    console.error('❌ 處理群組訊息事件完全失敗:', error);
  }
}

/**
 * 處理個人訊息事件
 * 
 * 📌 目前暫不處理個人訊息
 * 未來可擴充：
 * - 個人任務查詢
 * - 個人設定
 * - 幫助訊息
 */
async function handleUserMessageEvent(event: MessageEvent): Promise<void> {
  try {
    console.log('ℹ️ 收到個人訊息，目前不處理');
    
    // 可選：回覆提示訊息
    // await lineClient.replyText(
    //   event.replyToken,
    //   '請在群組中使用 #任務回報 指令進行回報'
    // );

  } catch (error) {
    console.error('❌ 處理個人訊息事件失敗:', error);
  }
}

// ==================== Postback Event Handler ====================

/**
 * 處理 Postback 事件（Quick Reply 按鈕點擊）
 */
async function handlePostbackEvent(event: PostbackEvent): Promise<void> {
  try {
    console.log(`📲 收到 Postback: ${event.postback.data}`);

    // 目前只處理任務選擇
    // 未來可擴充其他 postback action
    await handleMissionSelection(event);

  } catch (error) {
    console.error('❌ 處理 Postback 事件失敗:', error);
  }
}

// ==================== Join Event Handler ====================

/**
 * 處理加入事件（Bot 被加入群組）
 */
async function handleJoinEvent(event: LineEvent): Promise<void> {
  try {
    const groupId = lineClient.getGroupId(event);

    if (!groupId) {
      console.log('⚠️ 無法取得 groupId');
      return;
    }

    console.log(`✅ Bot 被加入群組: ${groupId}`);

    // 可選：發送歡迎訊息
    // await lineClient.replyText(
    //   event.replyToken,
    //   '👋 感謝邀請！\n使用 #任務回報 指令來回報任務進度'
    // );

  } catch (error) {
    console.error('❌ 處理加入事件失敗:', error);
  }
}

// ==================== Leave Event Handler ====================

/**
 * 處理離開事件（Bot 被踢出群組）
 */
async function handleLeaveEvent(event: LineEvent): Promise<void> {
  try {
    const groupId = lineClient.getGroupId(event);

    if (!groupId) {
      console.log('⚠️ 無法取得 groupId');
      return;
    }

    console.log(`👋 Bot 被移出群組: ${groupId}`);

    // 可選：清理相關資料或記錄
    // await groupService.disableGroup(groupId);

  } catch (error) {
    console.error('❌ 處理離開事件失敗:', error);
  }
}
