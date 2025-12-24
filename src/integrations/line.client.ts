// src/integrations/line.client.ts

import crypto from 'crypto';
import {
  LineEvent,
  ReplyMessagePayload,
  TextLineMessage,
  QuickReply,
  QuickReplyItem,
  PostbackAction
} from '../types/line-event.js';
/**
 * QuickReply 使用範例：
 * {
 *   items: [
 *     { action: { type: 'postback', label: '借出', data: 'action=borrow' } }
 *   ]
 * }
 */

// ==================== LINE API Client ====================

/**
 * LINE Messaging API 客戶端
 * 負責：
 * - 驗證 Webhook 簽名
 * - 發送回覆訊息
 * - 建立 Quick Reply 按鈕
 */
export class LineClient {
  private channelAccessToken: string;
  private channelSecret: string;

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    this.channelSecret = process.env.LINE_CHANNEL_SECRET || '';

    if (!this.channelAccessToken || !this.channelSecret) {
      throw new Error('❌ LINE_CHANNEL_ACCESS_TOKEN 或 LINE_CHANNEL_SECRET 未設定');
    }
  }

  // ==================== 驗證 Webhook 簽名 ====================

  /**
   * 驗證 LINE Webhook 簽名
   * @param body - 請求 body（字串）
   * @param signature - X-Line-Signature header
   * @returns 驗證結果
   * ⚠️ 注意：必須使用「未經 JSON.parse 的 raw body」
   * 否則 HMAC 計算結果會錯誤
   */
  verifySignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(body)
      .digest('base64');

    return hash === signature;
  }

  // ==================== 回覆訊息 ====================

  /**
   * 回覆訊息（使用 replyToken）
   * 注意：replyToken 只能用一次，且 30 秒內有效
   * 
   * @param replyToken - 回覆 token
   * @param messages - 訊息陣列（最多 5 則）
   */
  async reply(replyToken: string, messages: TextLineMessage[]): Promise<void> {
    const payload: ReplyMessagePayload = {
      replyToken,
      messages,
      notificationDisabled: false // 群組訊息建議設為 true 減少打擾
    };

    try {
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ LINE reply 失敗:', response.status, errorText);
        throw new Error(`LINE API 錯誤: ${response.status}`);
      }

      console.log('✅ LINE reply 成功');
    } catch (error) {
      console.error('❌ LINE reply 發生錯誤:', error);
      throw error;
    }
  }

  /**
   * 回覆純文字訊息（簡化版）
   */
  async replyText(replyToken: string, text: string): Promise<void> {
    await this.reply(replyToken, [{
      type: 'text',
      text
    }]);
  }

  /**
   * 回覆帶 Quick Reply 的訊息
   * 
   * @param replyToken - 回覆 token
   * @param text - 訊息文字
   * @param quickReply - Quick Reply 按鈕
   */
  async replyWithQuickReply(
    replyToken: string, 
    text: string, 
    quickReply: QuickReply
  ): Promise<void> {
    await this.reply(replyToken, [{
      type: 'text',
      text,
      quickReply
    }]);
  }

  // ==================== 建立 Quick Reply 工具函數 ====================

  /**
   * 建立 Quick Reply 按鈕組
   * 
   * @param items - 按鈕陣列
   * @returns QuickReply 物件
   * 
   * @example
   * const quickReply = lineClient.createQuickReply([
   *   { label: '任務 A', data: 'action=select&mission_id=xxx' },
   *   { label: '任務 B', data: 'action=select&mission_id=yyy' }
   * ]);
   */
  createQuickReply(items: Array<{ label: string; data: string }>): QuickReply {
    return {
      items: items.map(item => ({
        type: 'action',
        action: {
          type: 'postback',
          label: item.label,
          data: item.data,
          displayText: item.label // 按下後顯示的文字
        }
      }))
    };
  }

  /**
   * 建立任務選擇的 Quick Reply
   * 
   * @param missions - 任務列表
   * @returns QuickReply 物件
   */
  createMissionQuickReply(missions: Array<{
    mission_id: string;
    mission_title: string;
    assignment_number: number;
  }>): QuickReply {
    return this.createQuickReply(
      missions.map(m => ({
        label: `第${m.assignment_number}次 - ${m.mission_title.substring(0, 15)}`, // 限制長度
        data: `action=select_mission&mission_id=${m.mission_id}&assignment=${m.assignment_number}`
      }))
    );
  }

  // ==================== Push 訊息（主動推送）====================

  /**
   * 主動推送訊息（不需要 replyToken）
   * 注意：需要在 LINE Developers 開啟 Push API 權限
   * 
   * @param to - 目標 ID（userId / groupId / roomId）
   * @param messages - 訊息陣列
   */
  async push(to: string, messages: TextLineMessage[]): Promise<void> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify({
          to,
          messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ LINE push 失敗:', response.status, errorText);
        throw new Error(`LINE API 錯誤: ${response.status}`);
      }

      console.log('✅ LINE push 成功');
    } catch (error) {
      console.error('❌ LINE push 發生錯誤:', error);
      throw error;
    }
  }

  /**
   * 推送純文字訊息（簡化版）
   */
  async pushText(to: string, text: string): Promise<void> {
    await this.push(to, [{
      type: 'text',
      text
    }]);
  }

  // ==================== 工具函數 ====================

  /**
   * 從事件中取得 userId
   */
  getUserId(event: LineEvent): string | null {
    if (event.source.type === 'user') {
      return event.source.userId;
    }
    if (event.source.type === 'group' || event.source.type === 'room') {
      return event.source.userId || null;
    }
    return null;
  }

  /**
   * 從事件中取得 groupId
   */
  getGroupId(event: LineEvent): string | null {
    if (event.source.type === 'group') {
      return event.source.groupId;
    }
    return null;
  }

  /**
   * 判斷是否為群組訊息
   */
  isGroupMessage(event: LineEvent): boolean {
    return event.source.type === 'group';
  }

  /**
   * 取得使用者資料（需要 userId）
   * 注意：需要使用者加過 Bot 為好友
   */
  async getProfile(userId: string): Promise<{
    displayName: string;
    userId: string;
    pictureUrl?: string;
    statusMessage?: string;
  } | null> {
    try {
      const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.channelAccessToken}`
        }
      });

      if (!response.ok) {
        console.error('❌ 取得使用者資料失敗:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ 取得使用者資料發生錯誤:', error);
      return null;
    }
  }

  /**
   * 取得群組成員資料（需要在群組中）
   */
  async getGroupMemberProfile(groupId: string, userId: string): Promise<{
    displayName: string;
    userId: string;
    pictureUrl?: string;
  } | null> {
    try {
      const response = await fetch(
        `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`, 
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('❌ 取得群組成員資料失敗:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ 取得群組成員資料發生錯誤:', error);
      return null;
    }
  }
}

// ==================== 匯出單例 ====================

export const lineClient = new LineClient();
