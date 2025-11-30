/**
 * auth-utils.js
 * 統一的驗證、初始化和用戶管理邏輯
 * 適用於所有子頁面
 */

// ============ 配置常數 ============
const AUTH_CONFIG = {
    API_BASE: "https://hnfa-rescue.vercel.app/api/verify",
    SUPABASE_URL: 'https://gltzwtqcrdpdumzitbib.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdHp3dHFjcmRwZHVteml0YmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzQyODcsImV4cCI6MjA3Mjk1MDI4N30.6svHYwJUM8aZF71pY0N3Wx4KiaSMN-GiibyLGZDsygE'
};

// ============ 全域變數 ============
let currentUser = null;
let supabaseClient = null;
let presenceChannel = null;
let onlineUsers = new Map();

// ============ 主初始化函數 ============
/**
 * 初始化應用 - 驗證用戶並設置基本環境
 * @param {Object} options - 配置選項
 * @param {Function} options.onUserVerified - 用戶驗證成功後的回調
 * @param {Function} options.onInitComplete - 初始化完成後的回調
 * @param {boolean} options.needsPresence - 是否需要線上狀態追蹤
 * @param {boolean} options.needsRealtime - 是否需要 Realtime 訂閱
 * @returns {Promise<void>}
 */
async function initializeApp(options = {}) {
    const {
        onUserVerified = null,
        onInitComplete = null,
        needsPresence = true,
        needsRealtime = false
    } = options;

    try {
        // 1. 檢查 Session Token
        const sessionToken = getSessionToken();
        if (!sessionToken) {
            redirectToLogin();
            return;
        }

        // 2. 驗證用戶身份
        await verifyUserSession(sessionToken);
        console.log('✅ 用戶驗證成功:', currentUser.displayName);

        // 3. 執行用戶驗證回調
        if (onUserVerified) {
            await onUserVerified(currentUser);
        }

        // 4. 初始化 Supabase 客戶端
        if (needsPresence || needsRealtime) {
            await initializeSupabaseClient();
        }

        // 5. 設置線上狀態追蹤
        if (needsPresence) {
            await setupPresenceTracking();
            console.log('✅ 線上狀態追蹤已啟動');
        }

        // 6. 執行初始化完成回調
        if (onInitComplete) {
            await onInitComplete(currentUser);
        }

        console.log('✅ 應用初始化完成');

    } catch (error) {
        console.error('❌ 初始化失敗:', error);
        showAuthError('初始化失敗，請重新登入', error);
        redirectToLogin(2000);
    }
}

// ============ Session 管理 ============
/**
 * 獲取 Session Token
 * @returns {string|null}
 */
function getSessionToken() {
    return sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
}

/**
 * 保存 Session Token
 * @param {string} token - Token 字串
 * @param {boolean} persistent - 是否持久化到 localStorage
 */
function saveSessionToken(token, persistent = false) {
    sessionStorage.setItem('sessionToken', token);
    if (persistent) {
        localStorage.setItem('sessionToken', token);
    }
}

/**
 * 清除 Session Token
 */
function clearSessionToken() {
    sessionStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionToken');
}

// ============ 用戶驗證 ============
/**
 * 驗證用戶會話
 * @param {string} sessionToken - Session Token
 * @returns {Promise<Object>} 用戶資訊
 */
async function verifyUserSession(sessionToken) {
    try {
        const response = await fetch(AUTH_CONFIG.API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 驗證失敗`);
        }

        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error(data.message || '用戶驗證失敗');
        }

        currentUser = {
            userId: data.userId,
            displayName: data.displayName,
            role: data.role || '一般用戶'
        };

        // 規範化 token 存儲
        sessionStorage.setItem('sessionToken', sessionToken);
        if (localStorage.getItem('sessionToken')) {
            localStorage.removeItem('sessionToken');
        }

        return currentUser;

    } catch (error) {
        console.error('用戶驗證錯誤:', error);
        throw error;
    }
}

/**
 * 登出用戶
 */
function logoutUser() {
    // 清理線上狀態
    if (presenceChannel) {
        presenceChannel.untrack().catch(err => console.warn('取消追蹤失敗:', err));
        presenceChannel.unsubscribe().catch(err => console.warn('取消訂閱失敗:', err));
    }

    // 清除 token
    clearSessionToken();

    // 清除用戶資訊
    currentUser = null;

    // 重定向到登入
    redirectToLogin();
}

// ============ Supabase 客戶端 ============
/**
 * 初始化共享的 Supabase 客戶端
 * @returns {Promise<Object>} Supabase 客戶端
 */
async function initializeSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    try {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
        supabaseClient = createClient(
            AUTH_CONFIG.SUPABASE_URL,
            AUTH_CONFIG.SUPABASE_ANON_KEY,
            {
                realtime: {
                    params: { eventsPerSecond: 5 }
                }
            }
        );

        console.log('✅ Supabase 客戶端已初始化');
        return supabaseClient;

    } catch (error) {
        console.error('❌ Supabase 客戶端初始化失敗:', error);
        throw error;
    }
}

/**
 * 取得 Supabase 客戶端
 * @returns {Object} Supabase 客戶端
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase 客戶端尚未初始化，請先調用 initializeSupabaseClient()');
    }
    return supabaseClient;
}

// ============ 線上狀態追蹤 ============
/**
 * 設置線上狀態追蹤
 * @returns {Promise<void>}
 */
async function setupPresenceTracking() {
    if (!supabaseClient) {
        console.warn('⚠️ 未初始化 Supabase 客戶端，跳過線上狀態追蹤');
        return;
    }

    try {
        const userKey = `${currentUser.displayName}-${Date.now()}`;

        presenceChannel = supabaseClient.channel('online-users', {
            config: {
                presence: { key: userKey }
            }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, updateOnlineUsersList)
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('[Presence] 用戶加入:', newPresences.map(p => p.display_name).filter(Boolean));
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('[Presence] 用戶離開:', leftPresences.map(p => p.display_name).filter(Boolean));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        display_name: currentUser.displayName,
                        role: currentUser.role,
                        online_at: new Date().toISOString()
                    });
                    console.log('[Presence] 已追蹤用戶:', currentUser.displayName);
                    updateOnlineUsersList();
                }
            });

    } catch (error) {
        console.error('❌ 線上狀態追蹤失敗:', error);
    }
}

/**
 * 更新線上用戶列表
 */
function updateOnlineUsersList() {
    if (!presenceChannel) return;

    const state = presenceChannel.presenceState();
    onlineUsers.clear();

    Object.values(state).forEach(presences => {
        presences.forEach(presence => {
            // 排除自己
            if (presence.display_name && presence.display_name !== currentUser.displayName) {
                onlineUsers.set(presence.display_name, {
                    display_name: presence.display_name,
                    role: presence.role,
                    joinTime: new Date(presence.online_at || Date.now())
                });
            }
        });
    });

    dispatchOnlineUsersChanged();
}

/**
 * 取得線上用戶總數（包含自己）
 * @returns {number}
 */
function getOnlineUserCount() {
    return onlineUsers.size + 1;
}

/**
 * 取得線上用戶詳細資訊
 * @returns {Object}
 */
function getOnlineUsersInfo() {
    const totalUsers = getOnlineUserCount();
    const adminCount = Array.from(onlineUsers.values()).filter(u => u.role === '管理').length;
    const totalAdmins = adminCount + (currentUser.role === '管理' ? 1 : 0);
    const normalUsers = totalUsers - totalAdmins;

    return {
        totalUsers,
        adminCount: totalAdmins,
        normalUsers,
        otherUsers: onlineUsers
    };
}

/**
 * 訂閱線上用戶變更事件
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消訂閱函數
 */
function subscribeOnlineUsersChanged(callback) {
    if (!window.__onlineUsersCallbacks) {
        window.__onlineUsersCallbacks = new Set();
    }
    window.__onlineUsersCallbacks.add(callback);

    // 返回取消訂閱函數
    return () => {
        window.__onlineUsersCallbacks.delete(callback);
    };
}

/**
 * 分派線上用戶變更事件
 */
function dispatchOnlineUsersChanged() {
    if (window.__onlineUsersCallbacks) {
        const info = getOnlineUsersInfo();
        window.__onlineUsersCallbacks.forEach(callback => {
            try {
                callback(info);
            } catch (error) {
                console.error('線上用戶回調執行出錯:', error);
            }
        });
    }
}

// ============ Realtime 訂閱 ============
/**
 * 訂閱表格變更
 * @param {string} tableName - 表名
 * @param {Function} onChangeCallback - 變更回調
 * @returns {Promise<Object>} 頻道物件
 */
async function subscribeToTableChanges(tableName, onChangeCallback) {
    if (!supabaseClient) {
        throw new Error('Supabase 客戶端未初始化');
    }

    try {
        const channel = supabaseClient.channel(`${tableName}-updates`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: tableName
            }, payload => onChangeCallback(payload))
            .subscribe(status => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ 已訂閱 ${tableName} 變更`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`❌ ${tableName} 頻道錯誤`);
                } else if (status === 'TIMED_OUT') {
                    console.error(`❌ ${tableName} 連線超時`);
                }
            });

        return channel;

    } catch (error) {
        console.error(`❌ 訂閱 ${tableName} 失敗:`, error);
        throw error;
    }
}

// ============ UI 更新 ============
/**
 * 更新用戶界面信息
 * @param {Object} options - 配置選項
 */
function updateUserInterface(options = {}) {
    const {
        userNameSelector = '#userName',
        userRoleSelector = '#userRole',
        adminActionsSelector = '#adminActions',
        userManagementSelector = '#userManagementSection'
    } = options;

    // 更新用戶名
    const userNameEl = document.querySelector(userNameSelector);
    if (userNameEl) {
        userNameEl.textContent = currentUser.displayName;
    }

    // 更新用戶角色
    const userRoleEl = document.querySelector(userRoleSelector);
    if (userRoleEl) {
        userRoleEl.textContent = currentUser.role;
    }

    // 顯示管理員操作
    if (currentUser.role !== '一般用戶') {
        const adminActionsEl = document.querySelector(adminActionsSelector);
        if (adminActionsEl) {
            adminActionsEl.style.display = 'block';
        }
    }

    // 顯示用戶管理
    if (currentUser.role === '管理') {
        const userMgmtEl = document.querySelector(userManagementSelector);
        if (userMgmtEl) {
            userMgmtEl.style.display = 'block';
        }
    }
}

/**
 * 更新線上用戶顯示
 * @param {Object} options - 配置選項
 */
function updateOnlineUsersDisplay(options = {}) {
    const {
        onlineCountSelector = '#onlineCount',
        onlineInfoSelector = '#adminOnlineInfo'
    } = options;

    const count = getOnlineUserCount();
    const onlineCountEl = document.querySelector(onlineCountSelector);
    if (onlineCountEl) {
        onlineCountEl.textContent = count;
    }

    // 管理員顯示詳細信息
    if (currentUser.role === '管理') {
        const infoEl = document.querySelector(onlineInfoSelector);
        if (infoEl) {
            const info = getOnlineUsersInfo();
            infoEl.innerHTML = `
                <div style="font-size: 0.75rem; line-height: 1.4;">
                    <div>👥 總人數: ${info.totalUsers}</div>
                    <div>👨‍💼 管理員: ${info.adminCount}</div>
                    <div>👤 一般用戶: ${info.normalUsers}</div>
                </div>
            `;
        }
    }
}

// ============ API 調用 ============
/**
 * 通用 API 調用方法
 * @param {string} action - 操作名稱
 * @param {Object} data - 資料
 * @returns {Promise<Object>}
 */
async function callAPI(action, data = {}) {
    try {
        const sessionToken = getSessionToken();

        const response = await fetch(AUTH_CONFIG.API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                sessionToken,
                ...data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.status !== 'ok') {
            throw new Error(result.message || `${action} 失敗`);
        }

        return result;

    } catch (error) {
        console.error(`API 調用失敗 (${action}):`, error);
        throw error;
    }
}

// ============ 輔助函數 ============
/**
 * 重定向到登入頁面
 * @param {number} delay - 延遲毫秒數
 */
function redirectToLogin(delay = 0) {
    setTimeout(() => {
        window.location.href = 'index.html';
    }, delay);
}

/**
 * 顯示認證錯誤
 * @param {string} message - 錯誤訊息
 * @param {Error} error - 錯誤物件
 */
function showAuthError(message, error = null) {
    console.error(`🔐 認證錯誤: ${message}`, error);

    // 如果有 showToast 函數，使用它
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    } else {
        alert(message);
    }
}

/**
 * 取得當前用戶
 * @returns {Object|null}
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * 檢查用戶是否有特定角色
 * @param {string} role - 角色名稱
 * @returns {boolean}
 */
function hasRole(role) {
    return currentUser && currentUser.role === role;
}

/**
 * 檢查用戶是否為管理員
 * @returns {boolean}
 */
function isAdmin() {
    return hasRole('管理');
}

// ============ 導出全域物件 ============
// 使用者可以通過 window.AuthUtils 訪問所有函數
window.AuthUtils = {
    // 初始化
    initializeApp,
    
    // Session 管理
    getSessionToken,
    saveSessionToken,
    clearSessionToken,
    
    // 用戶驗證
    verifyUserSession,
    logoutUser,
    getCurrentUser,
    
    // Supabase
    initializeSupabaseClient,
    getSupabaseClient,
    
    // 線上狀態
    setupPresenceTracking,
    getOnlineUserCount,
    getOnlineUsersInfo,
    subscribeOnlineUsersChanged,
    
    // Realtime
    subscribeToTableChanges,
    
    // UI 更新
    updateUserInterface,
    updateOnlineUsersDisplay,
    
    // API
    callAPI,
    
    // 輔助
    hasRole,
    isAdmin,
    redirectToLogin,
    showAuthError
};
