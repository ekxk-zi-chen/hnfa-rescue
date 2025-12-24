// api/line/webhook.ts

import { LineWebhookBody } from '../../src/types/line-event.js';
import { lineClient } from '../../src/integrations/line.client.js';
import { handleEvent } from '../../src/commands/index.js';

// ==================== LINE Webhook 唯一入口 ====================

export default async function handler(req: any, res: any): Promise<void> {
  
  // ==================== CORS 處理 ====================
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Signature');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ==================== 只接受 POST ====================
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // ==================== 1. 驗證簽名 ====================
    
    const signature = req.headers['x-line-signature'] as string;
    
    if (!signature) {
      console.error('❌ 缺少 X-Line-Signature header');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    // 取得原始 body（字串）
    const body = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);

    // 驗證簽名
    const isValid = lineClient.verifySignature(body, signature);

    if (!isValid) {
      console.error('❌ 簽名驗證失敗');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    console.log('✅ 簽名驗證通過');

    // ==================== 2. 解析事件 ====================

    const webhookBody: LineWebhookBody = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

    const events = webhookBody.events || [];

    if (events.length === 0) {
      console.log('ℹ️ 沒有事件需要處理');
      res.status(200).json({ message: 'No events' });
      return;
    }

    console.log(`📨 收到 ${events.length} 個事件`);

    // ==================== 3. 轉交處理 ====================

    // 逐一處理事件（不等待完成，避免超時）
    for (const event of events) {
      handleEvent(event).catch(error => {
        console.error('❌ 處理事件失敗:', error);
      });
    }

    // 立即回應 200（LINE 要求 3 秒內回應）
    res.status(200).json({ message: 'OK' });

  } catch (error) {
    console.error('❌ Webhook 處理失敗:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
/*
```

---

## 完成！🎉

現在整個架構已經完成了！讓我整理一下檔案結構：
```
project-root/
│
├── api/
│   └── line/
│       └── webhook.ts          ✅ LINE Webhook 入口
│
├── src/
│   ├── types/
│   │   └── line-event.ts       ✅ 型別定義
│   │
│   ├── integrations/
│   │   ├── line.client.ts      ✅ LINE API 客戶端
│   │   └── supabase.client.ts  ✅ Supabase 客戶端
│   │
│   ├── services/
│   │   ├── group.service.ts    ✅ 群組設定服務
│   │   └── mission.service.ts  ✅ 任務服務
│   │
│   ├── commands/
│   │   ├── index.ts            ✅ 事件路由器（總機）
│   │   ├── group.command.ts    ✅ 群組訊息處理
│   │   └── report.command.ts   ✅ 任務回報處理
│   │
│   └── utils/
│       └── parsePostback.ts    ✅ Postback 解析工具
│
└── .env
    LINE_CHANNEL_ACCESS_TOKEN=xxx
    LINE_CHANNEL_SECRET=xxx
    SUPABASE_URL=xxx
    SUPABASE_SERVICE_KEY=xxx
*/
