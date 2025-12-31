// api/webhook.js

export const config = {
  runtime: 'edge', // 🔥 關鍵：使用 Edge Runtime 才能做到真正的射後不理
};

export default async function handler(req) {
  // 1. 只接受 POST 請求
  if (req.method === 'GET') {
    return new Response('Vercel 無情轉發機器運行中！請使用 POST 測試。', { status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 2. 拿到 LINE 的原始資料
    const payload = await req.json();

    // 3. 你的 GAS 部署網址 (記得換成你最新的那個)
    // 注意：網址結尾通常是 /exec
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwPPgRYU_hsKv1rb9H1Rqo49sMh4P4UjY5559lGUEzhwpM_eIroz_W9xBYuvfCU87b-/exec";

    // 4. 🔥 無情轉發核心：waitUntil
    // 這行意思是：「Vercel 你聽著，雖然我馬上要回傳 Response 了，
    // 但你必須等到這個 fetch 完成後才能關閉執行緒！」
    req.waitUntil(
      fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 有些時候 GAS 需要 User-Agent 才能正常收
          'User-Agent': 'Vercel-Edge-Bot' 
        },
        body: JSON.stringify(payload),
      }).catch(err => console.error("轉發 GAS 失敗:", err))
    );

    // 5. 秒回 LINE 200 OK
    // 這時候 GAS 可能還沒收到，但 LINE 已經收到 OK 了，爽！
    return new Response('OK', { status: 200 });

  } catch (e) {
    console.error(e);
    return new Response('Error', { status: 500 });
  }
}
