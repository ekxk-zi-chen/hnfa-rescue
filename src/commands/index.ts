// src/commands/index.ts

import { LineEvent, MessageEvent, PostbackEvent, TextMessage } from '../types/line-event';
import { lineClient } from '../integrations/line.client';
import { groupService } from '../services/group.service';
import { handleGroupMessage } from './group.command';
import { handleMissionSelection, handleReportContent } from './report.command';

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
    console.log(`📨 收到事件: ${event.type}, 來源: ${event.source.type}`);

    // ==================== Message Event ====================
    if (event.type === 'message') {
      await handleMessageEvent(event as MessageEvent);
      return;
    }

    // ==================== Postback Event ====================
    if (event.type === 'postback') {
      await handlePostbackEvent(event as PostbackEvent);
      return;
    }

    // ==================== Join Event ====================
    if (event.type === 'join') {
      await handleJoinEvent(event);
      return;
    }

    // ==================== Leave Event ====================
    if (event.type === 'leave') {
      await handleLeaveEvent(event);
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

    if (!userId) {
      console.log('⚠️ 無法取得 userId');
      return;
    }

    // 檢查使用者是否處於「等待輸入」狀態
    const userState = await groupService.getUserState(userId);

    if (userState && userState.state_type === 'waiting_report_content') {
      // 使用者正在輸入回報內容
      if (event.message.type === 'text') {
        const textMessage = event.message as TextMessage;
        await handleReportContent(event, userId, textMessage.text);
        return;
      }
    }

    // 否則，當作一般群組訊息處理
    await handleGroupMessage(event);

  } catch (error) {
    console.error('❌ 處理群組訊息事件失敗:', error);
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