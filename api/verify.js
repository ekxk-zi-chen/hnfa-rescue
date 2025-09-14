import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // 處理 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .limit(1);

    if (error) throw error;

    res.status(200).json({
      message: "成功連到 Supabase 🚀",
      sample: data,
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      message: "Supabase 連線錯誤",
      error: err.message,
    });
  }
}
