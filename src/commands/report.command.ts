// src/commands/report.command.ts

import { MessageEvent, PostbackEvent } from '../types/line-event';
import { lineClient } from '../integrations/line.client';
import { groupService } from '../services/group.service';
import { missionService } from '../services/mission.service';
import { parsePostback } from '../utils/parsePostback';

// ==================== 任務回報處理 ====================

/**
 * 處理任務回報指令
 * 
 * 流程：
 * 1. 查詢使用者進行中的任務
 * 2. 如果只有一個任務 → 直接進入輸入模式
 * 3. 如果有多個任務 → 顯示 Quick Reply 選單
 * 4. 如果沒有任務 → 提示使用者
 */
export async function handleMissionReport(
  event: MessageEvent,
  userId: string,
  groupId: string,
  content: string
): Promise<void> {
  try {
    // 1. 查詢使用者進行中的任務
    const activeMissions = await missionService.getActiveMissions(userId);

    // 2. 沒有任務
    if (activeMissions.length === 0) {
      await lineClient.replyText(
        event.replyToken,
        '❌ 您目前沒有進行中的任務'
      );
      return;
    }

    // 3. 只有一個任務 → 直接進入輸入模式
    if (activeMissions.length === 1) {
      const mission = activeMissions[0];

      // 如果使用者已經輸入內容，直接提交
      if (content.trim()) {
        await submitReport(
          event.replyToken,
          userId,
          mission.mission_id,
          mission.assignment_number,
          mission.mission_title,
          content,
          event.message.id
        );
        return;
      }

      // 否則，設定狀態並等待使用者輸入
      await groupService.setUserState(
        userId,
        'waiting_report_content',
        {
          mission_id: mission.mission_id,
          assignment_number: mission.assignment_number,
          mission_title: mission.mission_title
        },
        groupId
      );

      await lineClient.replyText(
        event.replyToken,
        `📝 請輸入回報內容\n\n任務：${mission.mission_title}\n第 ${mission.assignment_number} 次派遣`
      );
      return;
    }

    // 4. 多個任務 → 顯示 Quick Reply 選單
    const quickReply = lineClient.createMissionQuickReply(activeMissions);

    await lineClient.replyWithQuickReply(
      event.replyToken,
      '📋 請選擇要回報的任務：',
      quickReply
    );

  } catch (error) {
    console.error('❌ 處理任務回報失敗:', error);
    await lineClient.replyText(
      event.replyToken,
      '❌ 系統錯誤，請稍後再試'
    );
  }
}

/**
 * 處理任務選擇（Postback）
 * 
 * 流程：
 * 1. 解析 postback.data
 * 2. 設定使用者狀態
 * 3. 提示使用者輸入內容
 */
export async function handleMissionSelection(event: PostbackEvent): Promise<void> {
  try {
    const userId = lineClient.getUserId(event);
    const groupId = lineClient.getGroupId(event);

    if (!userId) {
      console.log('⚠️ 無法取得 userId');
      return;
    }

    // 解析 postback.data
    const params = parsePostback(event.postback.data);

    if (params.action !== 'select_mission') {
      return;
    }

    const missionId = params.mission_id;
    const assignmentNumber = parseInt(params.assignment);

    if (!missionId || isNaN(assignmentNumber)) {
      await lineClient.replyText(
        event.replyToken,
        '❌ 資料錯誤，請重新操作'
      );
      return;
    }

    // 驗證權限
    const canReport = await missionService.canUserReport(userId, missionId, assignmentNumber);

    if (!canReport) {
      await lineClient.replyText(
        event.replyToken,
        '❌ 您沒有權限回報此任務或任務已完成'
      );
      return;
    }

    // 取得任務資訊
    const activeMissions = await missionService.getActiveMissions(userId);
    const mission = activeMissions.find(
      m => m.mission_id === missionId && m.assignment_number === assignmentNumber
    );

    if (!mission) {
      await lineClient.replyText(
        event.replyToken,
        '❌ 找不到該任務'
      );
      return;
    }

    // 設定使用者狀態
    await groupService.setUserState(
      userId,
      'waiting_report_content',
      {
        mission_id: missionId,
        assignment_number: assignmentNumber,
        mission_title: mission.mission_title
      },
      groupId || undefined
    );

    // 提示使用者輸入
    await lineClient.replyText(
      event.replyToken,
      `📝 請輸入回報內容\n\n任務：${mission.mission_title}\n第 ${assignmentNumber} 次派遣`
    );

  } catch (error) {
    console.error('❌ 處理任務選擇失敗:', error);
    await lineClient.replyText(
      event.replyToken,
      '❌ 系統錯誤，請稍後再試'
    );
  }
}

/**
 * 處理回報內容輸入
 * 
 * 當使用者處於 waiting_report_content 狀態時，
 * 接收到的訊息會被視為回報內容
 */
export async function handleReportContent(
  event: MessageEvent,
  userId: string,
  content: string
): Promise<void> {
  try {
    // 取得使用者狀態
    const userState = await groupService.getUserState(userId);

    if (!userState || userState.state_type !== 'waiting_report_content') {
      return; // 不是在等待輸入狀態，忽略
    }

    const { mission_id, assignment_number, mission_title } = userState.state_data;

    // 提交回報
    await submitReport(
      event.replyToken,
      userId,
      mission_id,
      assignment_number,
      mission_title,
      content,
      event.message.id
    );

    // 清除狀態
    await groupService.clearUserState(userId);

  } catch (error) {
    console.error('❌ 處理回報內容失敗:', error);
    await lineClient.replyText(
      event.replyToken,
      '❌ 系統錯誤，請稍後再試'
    );
  }
}

/**
 * 提交回報（核心函數）
 */
async function submitReport(
  replyToken: string,
  userId: string,
  missionId: string,
  assignmentNumber: number,
  missionTitle: string,
  content: string,
  messageId: string
): Promise<void> {
  try {
    // 提交進度
    const result = await missionService.submitProgress({
      missionId,
      assignmentNumber,
      userId,
      status: '進行中', // 預設狀態
      note: content,
      source: 'line_group',
      lineMessageId: messageId
    });

    if (result.success) {
      // 成功 → 簡潔回覆（群組訊息）
      await lineClient.replyText(
        replyToken,
        `✅ 已記錄\n📋 ${missionTitle}\n🔢 第 ${assignmentNumber} 次派遣`
      );
    } else {
      // 失敗
      await lineClient.replyText(
        replyToken,
        result.message
      );
    }

  } catch (error) {
    console.error('❌ 提交回報失敗:', error);
    await lineClient.replyText(
      replyToken,
      '❌ 系統錯誤，請稍後再試'
    );
  }
}