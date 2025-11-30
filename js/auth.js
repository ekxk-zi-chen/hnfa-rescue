// auth.js - 統一認證模塊
const CONFIG = {
    API_BASE: "https://hnfa-rescue.vercel.app/api/verify",
    SUPABASE_URL: 'https://gltzwtqcrdpdumzitbib.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdHp3dHFjcmRwZHVteml0YmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzQyODcsImV4cCI6MjA3Mjk1MDI4N30.6svHYwJUM8aZF71pY0N3Wx4KiaSMN-GiibyLGZDsygE'
};

// 全局變量
let currentUser = null;

// 驗證用戶身份
async function verifyUser(sessionToken) {
    try {
        const response = await fetch(CONFIG.API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        });

        if (!response.ok) {
            throw new Error('驗證失敗');
        }

        const data = await response.json();
        if (data.status !== 'ok') {
            throw new Error('用戶驗證失敗');
        }

        currentUser = {
            userId: data.userId,
            displayName: data.displayName,
            role: data.role || '一般用戶'
        };

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

// 檢查會話並重定向
function checkSessionAndRedirect() {
    const sessionToken = sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
    if (!sessionToken) {
        window.location.href = 'index.html';
        return null;
    }
    return sessionToken;
}

// 初始化用戶認證
async function initializeAuth() {
    const sessionToken = checkSessionAndRedirect();
    if (!sessionToken) return null;

    try {
        const user = await verifyUser(sessionToken);
        return user;
    } catch (error) {
        console.error('認證失敗:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// 更新用戶界面顯示
function updateUserInterface() {
    if (currentUser) {
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');
        
        if (userNameElement) userNameElement.textContent = currentUser.displayName;
        if (userRoleElement) userRoleElement.textContent = currentUser.role;

        // 根據權限顯示/隱藏管理功能
        if (currentUser.role !== '一般用戶') {
            const adminActions = document.getElementById('adminActions');
            if (adminActions) adminActions.style.display = 'block';
        }

        if (currentUser.role === '管理') {
            const userManagementSection = document.getElementById('userManagementSection');
            if (userManagementSection) userManagementSection.style.display = 'block';
        }
    }
}

// 登出功能
function logout() {
    // 清理在線狀態（如果存在）
    if (window.presenceChannel) {
        window.presenceChannel.untrack();
        window.presenceChannel.unsubscribe();
    }

    sessionStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionToken');
    window.location.href = 'index.html';
}

// 返回導航頁面
function goBack() {
    window.location.href = 'navigation.html';
}

// 顯示 Toast 通知
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) {
        console.log(`${type}: ${message}`);
        return;
    }

    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 獲取當前用戶信息
function getCurrentUser() {
    return currentUser;
}

// 導出到全局作用域
window.CONFIG = CONFIG;
window.currentUser = currentUser;
window.verifyUser = verifyUser;
window.checkSessionAndRedirect = checkSessionAndRedirect;
window.initializeAuth = initializeAuth;
window.updateUserInterface = updateUserInterface;
window.logout = logout;
window.goBack = goBack;
window.showToast = showToast;
window.getCurrentUser = getCurrentUser;
