// api/verify.js
export default async function handler(req, res) {
  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('收到前端 payload:', body);

    // 暫時先回傳測試訊息
    res.status(200).json({ status: 'ok', message: 'Vercel API 運作正常！' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
