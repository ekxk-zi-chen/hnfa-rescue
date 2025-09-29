import { WebSocketServer } from 'ws';
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

// 儲存連接的客戶端
const clients = new Map();

// WebSocket 伺服器
let wss;

// 初始化 WebSocket 伺服器
export default function WebSocketHandler(req, res) {
    if (!wss) {
        wss = new WebSocketServer({ noServer: true });
        
        wss.on('connection', function connection(ws, request) {
            console.log('新的 WebSocket 連接建立');
            
            let clientId = null;
            
            ws.on('message', async function message(data) {
                try {
                    const message = JSON.parse(data);
                    await handleWebSocketMessage(ws, message);
                } catch (error) {
                    console.error('處理 WebSocket 訊息錯誤:', error);
                    sendToClient(ws, {
                        type: 'error',
                        message: '無效的訊息格式'
                    });
                }
            });
            
            ws.on('close', function close() {
                console.log('WebSocket 連接關閉:', clientId);
                if (clientId) {
                    clients.delete(clientId);
                }
            });
            
            ws.on('error', function error(err) {
                console.error('WebSocket 錯誤:', err);
            });
        });
    }
    
    // 處理 HTTP 升級請求
    if (req.method === 'GET') {
        if (!req.socket.server.wsHandlerAttached) {
            req.socket.server.on('upgrade', function upgrade(request, socket, head) {
                wss.handleUpgrade(request, socket, head, function done(ws) {
                    wss.emit('connection', ws, request);
                });
            });
            req.socket.server.wsHandlerAttached = true;
        }
        res.end();
    } else {
        res.status(405).end();
    }
}

// 處理 WebSocket 訊息
async function handleWebSocketMessage(ws, message) {
    const { type, sessionToken } = message;
    
    switch (type) {
        case 'auth':
            await handleAuth(ws, sessionToken);
            break;
        default:
            sendToClient(ws, {
                type: 'error',
                message: '未知的訊息類型'
            });
    }
}

// 處理認證
async function handleAuth(ws, sessionToken) {
    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error('伺服器配置錯誤');
        }
        
        // 驗證 sessionToken
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        if (!decoded || !decoded.userId) {
            throw new Error('無效的 sessionToken');
        }
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        // 檢查用戶是否存在
        const { data: userData, error } = await supabase
            .from("users")
            .select("*")
            .eq("user_id", decoded.userId)
            .single();
            
        if (error || !userData) {
            throw new Error('用戶不存在');
        }
        
        // 認證成功，儲存客戶端資訊
        clients.set(decoded.userId, ws);
        console.log('用戶認證成功:', decoded.userId);
        
        sendToClient(ws, {
            type: 'auth_success',
            message: '認證成功'
        });
        
    } catch (error) {
        console.error('WebSocket 認證失敗:', error);
        sendToClient(ws, {
            type: 'auth_failed',
            message: error.message
        });
        ws.close();
    }
}

// 發送訊息給特定客戶端
function sendToClient(ws, data) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// 廣播訊息給所有客戶端
export function broadcastToAllClients(data) {
    clients.forEach((ws, clientId) => {
        sendToClient(ws, data);
    });
}

// 發送訊息給特定用戶
export function sendToUser(userId, data) {
    const ws = clients.get(userId);
    if (ws) {
        sendToClient(ws, data);
    }
}

// 裝備相關的廣播函數
export function broadcastEquipmentCreated(equipment) {
    broadcastToAllClients({
        type: 'equipment_created',
        equipment: equipment
    });
}

export function broadcastEquipmentUpdated(equipment) {
    broadcastToAllClients({
        type: 'equipment_updated',
        equipment: equipment
    });
}

export function broadcastEquipmentDeleted(equipmentId) {
    broadcastToAllClients({
        type: 'equipment_deleted',
        equipmentId: equipmentId
    });
}

export function broadcastEquipmentReordered() {
    broadcastToAllClients({
        type: 'equipment_reordered'
    });
}
