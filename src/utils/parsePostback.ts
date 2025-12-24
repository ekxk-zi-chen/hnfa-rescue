// src/utils/parsePostback.ts

/**
 * 解析 Postback Data
 * 格式：action=select_mission&mission_id=xxx&assignment=3
 * 
 * @param data - postback.data 字串
 * @returns 解析後的物件
 * 
 * @example
 * parsePostback('action=select_mission&mission_id=abc123&assignment=3')
 * // => { action: 'select_mission', mission_id: 'abc123', assignment: '3' }
 */
export function parsePostback(data: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!data) return params;

  // 用 & 分割參數
  const pairs = data.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  }

  return params;
}

/**
 * 建立 Postback Data
 * 
 * @param params - 參數物件
 * @returns postback.data 字串
 * 
 * @example
 * buildPostback({ action: 'select_mission', mission_id: 'abc123', assignment: 3 })
 * // => 'action=select_mission&mission_id=abc123&assignment=3'
 */
export function buildPostback(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}