// api/events.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // 設置 SSE 頭
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'none');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  console.log('SSE 連接已建立');

  // 發送初始消息
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE 連接已建立' })}\n\n`);

  // 初始化 Supabase 客戶端
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 訂閱 Supabase Realtime
  const subscription = supabase
    .channel('equipment-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'equipment'
      },
      (payload) => {
        console.log('收到 Supabase 更新，轉發給客戶端:', payload);
        res.write(`data: ${JSON.stringify({
          type: 'equipment_update',
          payload: payload
        })}\n\n`);
      }
    )
    .subscribe((status) => {
      console.log('Supabase 訂閱狀態:', status);
    });

  // 保持連接的 ping
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // 清理函數
  req.on('close', () => {
    console.log('SSE 連接已關閉');
    clearInterval(keepAlive);
    supabase.removeChannel(subscription);
    res.end();
  });
}
