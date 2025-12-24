// api/test-supabase.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    console.log('環境變數檢查:');
    console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ 存在' : '❌ 不存在');
    console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✅ 存在' : '❌ 不存在');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({
        error: '環境變數未設定',
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_SERVICE_KEY
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 測試查詢
    const { data, error } = await supabase
      .from('line_group_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase 查詢錯誤:', error);
      return res.status(500).json({
        error: 'Supabase 查詢失敗',
        details: error
      });
    }

    res.status(200).json({
      message: '✅ Supabase 連線成功！',
      url: SUPABASE_URL,
      dataCount: data?.length || 0
    });

  } catch (error: any) {
    console.error('測試失敗:', error);
    res.status(500).json({
      error: '測試失敗',
      message: error.message
    });
  }
}
/*/*

推送後訪問：
```
https://your-project.vercel.app/api/test-supabase
*/
