// src/types/line-event.ts

// ==================== LINE Webhook 事件類型 ====================

export interface LineWebhookBody {
  destination: string; // Bot 的 User ID
  events: LineEvent[]; // 事件陣列（一次可能有多個事件）
}

export type LineEvent = 
  | MessageEvent 
  | PostbackEvent 
  | JoinEvent 
  | LeaveEvent;

/**
 * LINE Webhook 所有事件的共同欄位
 * 注意：replyToken 只在部分事件存在（message / postback）
 */
export interface BaseEvent {
  type: string; // 事件種類，用於 switch(event.type)
  timestamp: number; // LINE 事件發生時間（毫秒）
  source: EventSource; // 來源（user / group / room）
  replyToken: string; // 回覆用 token（非所有事件都有）
  mode: string; // 'active' | 'standby'
}

export interface MessageEvent extends BaseEvent {
  type: 'message';
  message:
    | TextMessage
    | ImageMessage
    | VideoMessage
    | AudioMessage
    | FileMessage
    | LocationMessage
    | StickerMessage;
}

export interface PostbackEvent extends BaseEvent {
  type: 'postback';
  postback: {
    /**
     * postback.data 建議格式範例：
     * - action=select_mission&mission_id=xxx&assignment=3
     * - action=confirm_report&mission_id=xxx
     * 
     * 📌 重要：嚴禁直接塞自然語言或複雜 JSON
     * 📌 使用 key=value&key=value 格式，方便解析
     */
    data: string;
    params?: Record<string, any>; // datetime picker 等特殊參數
  };
}

export interface JoinEvent extends BaseEvent {
  type: 'join'; // Bot 被加入群組或聊天室
}

export interface LeaveEvent extends BaseEvent {
  type: 'leave'; // Bot 被踢出群組或聊天室
}

/**
 * 事件來源類型
 * - user: 1對1 私訊
 * - group: 群組訊息（可以有多個成員）
 * - room: 聊天室（類似群組，但無法取得成員列表）
 */
export type EventSource = 
  | UserSource 
  | GroupSource 
  | RoomSource;

export interface UserSource {
  type: 'user';
  userId: string; // 使用者的 LINE ID
}

export interface GroupSource {
  type: 'group';
  groupId: string; // 群組 ID（C 開頭）
  userId?: string; // 發送訊息的使用者 ID（一定存在，但型別標示為可選）
}

export interface RoomSource {
  type: 'room';
  roomId: string; // 聊天室 ID（R 開頭）
  userId?: string; // 發送訊息的使用者 ID
}

// ==================== 訊息類型 ====================

export type Message = 
  | TextMessage 
  | ImageMessage 
  | VideoMessage 
  | AudioMessage 
  | FileMessage 
  | LocationMessage 
  | StickerMessage;

export interface TextMessage {
  type: 'text';
  id: string; // 訊息 ID
  text: string; // 訊息內容
  emojis?: any[]; // LINE 表情符號
  mention?: any; // @mention 資訊
}

export interface ImageMessage {
  type: 'image';
  id: string;
  contentProvider: {
    type: string; // 'line' | 'external'
  };
}

export interface VideoMessage {
  type: 'video';
  id: string;
  duration: number; // 影片長度（毫秒）
  contentProvider: {
    type: string;
  };
}

export interface AudioMessage {
  type: 'audio';
  id: string;
  duration: number; // 音訊長度（毫秒）
  contentProvider: {
    type: string;
  };
}

export interface FileMessage {
  type: 'file';
  id: string;
  fileName: string; // 檔案名稱
  fileSize: number; // 檔案大小（bytes）
}

export interface LocationMessage {
  type: 'location';
  id: string;
  title: string; // 地點名稱
  address: string; // 地址
  latitude: number; // 緯度
  longitude: number; // 經度
}

export interface StickerMessage {
  type: 'sticker';
  id: string;
  packageId: string; // 貼圖包 ID
  stickerId: string; // 貼圖 ID
  stickerResourceType: string; // 'STATIC' | 'ANIMATION' | 'SOUND'
}

// ==================== LINE Reply Message 回應訊息類型 ====================

export interface ReplyMessagePayload {
  replyToken: string; // 回覆用 token（30 秒內有效，只能用一次）
  messages: LineMessage[]; // 要回覆的訊息（最多 5 則）
  notificationDisabled?: boolean; // 是否關閉推播通知（預設 false）
}

export type LineMessage = 
  | TextLineMessage 
  | StickerLineMessage 
  | ImageLineMessage
  | FlexLineMessage;

export interface TextLineMessage {
  type: 'text';
  text: string; // 訊息內容（最多 5000 字）
  emojis?: any[]; // LINE 表情符號
  quickReply?: QuickReply; // 快速回覆按鈕
}

export interface StickerLineMessage {
  type: 'sticker';
  packageId: string; // 貼圖包 ID
  stickerId: string; // 貼圖 ID
}

export interface ImageLineMessage {
  type: 'image';
  originalContentUrl: string; // 原始圖片 URL（HTTPS）
  previewImageUrl: string; // 預覽圖片 URL（HTTPS）
}

export interface FlexLineMessage {
  type: 'flex';
  altText: string; // 替代文字（通知中顯示）
  contents: any; // Flex Message JSON
}

// ==================== Quick Reply 快速回覆 ====================

export interface QuickReply {
  items: QuickReplyItem[]; // 快速回覆按鈕（最多 13 個）
}

export interface QuickReplyItem {
  type: 'action';
  action: QuickReplyAction; // 按鈕動作
}

export type QuickReplyAction = 
  | PostbackAction 
  | MessageAction 
  | URIAction;

/**
 * Postback Action - 按下後觸發 postback event
 * 適用於：選擇任務、確認操作等需要資料傳遞的情況
 */
export interface PostbackAction {
  type: 'postback';
  label: string; // 按鈕文字（最多 20 字）
  data: string; // postback data（最多 300 字）
  displayText?: string; // 按下後顯示的文字（選填）
}

/**
 * Message Action - 按下後自動發送文字訊息
 * 適用於：快速回覆固定文字
 */
export interface MessageAction {
  type: 'message';
  label: string; // 按鈕文字（最多 20 字）
  text: string; // 要發送的訊息內容（最多 300 字）
}

/**
 * URI Action - 按下後開啟網址
 * 適用於：導向外部網頁
 */
export interface URIAction {
  type: 'uri';
  label: string; // 按鈕文字（最多 20 字）
  uri: string; // 網址（HTTPS 或 LINE 內部連結）
}

// ==================== Domain Types 業務領域類型 ====================

/**
 * LINE 群組設定
 * 對應資料表：line_group_settings
 */
export interface GroupSettings {
  id: string; // UUID
  group_id: string; // LINE 群組 ID（C 開頭）
  group_name: string | null; // 群組名稱（選填）
  is_active: boolean; // 是否啟用此群組的 Bot 功能
  command_prefix: string; // 指令前綴（例如：#任務回報）
  whitelist: string[] | null; // 白名單（LINE user_id 陣列）
  blacklist: string[] | null; // 黑名單（LINE user_id 陣列）
  created_at: string; // 建立時間
  updated_at: string; // 更新時間
}

/**
 * 使用者狀態（用於多步驟互動）
 * 對應資料表：line_user_states
 */
export interface UserState {
  user_id: string; // LINE user_id
  state_type: 'waiting_report_content' | 'idle'; // 當前狀態
  state_data: any; // 狀態資料（JSON，例如：選擇的任務 ID）
  group_id: string | null; // 所屬群組（如果是群組互動）
  expires_at: string | null; // 過期時間（避免狀態永久殘留）
  created_at: string; // 建立時間
  updated_at: string; // 更新時間
}

/**
 * 進行中的任務（使用者被指派且尚未完成）
 */
export interface ActiveMission {
  mission_id: string; // 任務 ID（UUID）
  mission_title: string; // 任務名稱
  mission_type: string; // 任務類型（救援、訓練、勤務等）
  assignment_number: number; // 派遣編號（第幾次派遣）
  assignment_id: string; // 派遣 ID（UUID）
  role: 'leader' | 'member'; // 角色（隊長或隊員）
  completed_at: string | null; // 完成時間（null 表示進行中）
  assigned_at: string; // 指派時間
}

// ==================== Command Handler Types 指令處理器類型 ====================

/**
 * 指令處理的上下文資訊
 */
export interface CommandContext {
  event: LineEvent; // 原始事件
  groupSettings?: GroupSettings; // 群組設定（如果是群組訊息）
  userId: string; // 發送者的 LINE user_id
  groupId?: string; // 群組 ID（如果是群組訊息）
}

/**
 * 任務回報提交資料
 */
export interface ReportSubmission {
  missionId: string; // 任務 ID
  assignmentNumber: number; // 派遣編號
  userId: string; // 回報者的 LINE user_id
  status: string; // 狀態（進行中、已完成等）
  note: string; // 回報內容
  source: 'line_group' | 'line_personal'; // 回報來源
  lineMessageId: string; // LINE 訊息 ID（用於追蹤）
}