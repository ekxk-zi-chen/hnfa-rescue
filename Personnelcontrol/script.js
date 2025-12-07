
console.log('=== 路徑偵測開始 ===');
console.log('當前 URL:', window.location.href);
console.log('當前路徑:', window.location.pathname);
// 全域變數
let currentData = {
    employees: [],
    equipment: []
};
let currentView = 'personnel';
let selectedItem = null;
// 全局圖片映射
let driveImages = {
    equipment: {},
    personnel: {},
    vehicles: {}
};


// 原因變數
let currentReasons = []; // 存儲常用原因
let lastSelectedReason = ''; // 最後選擇的原因


// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM 已載入，開始初始化...');

    // 初始化常用原因
    initReasons();

    initializeApp();
    setupEventListeners();


});



// 初始化應用
async function initializeApp() {
    try {
        console.log('開始載入 JSON 資料...');
        await loadData();

        // **非同步啟動圖片載入（不等待）**
        initDriveImagesAsync();

        // 初始化畫面
        updateStats();
        renderGroupControls();
        renderCards();

        console.log('應用初始化完成');

        const totalItems = currentData.employees.length + currentData.equipment.length;
        showNotification(`系統已載入 ${totalItems} 筆資料`);

    } catch (error) {
        console.error('初始化失敗：', error);
        showNotification(`初始化失敗：${error.message}`);
        createTestData();
    }
}

// 返回導航頁面
function goBack() {
    window.location.href = 'navigation.html';
}

// 載入 JSON 資料 - 簡化版本
async function loadData() {
    try {
        console.log('開始載入 JSON 資料...');

        // 顯示當前網頁路徑
        console.log('當前網頁路徑:', window.location.pathname);
        console.log('當前網頁URL:', window.location.href);

        // 測試檔案路徑
        const personnelPath = 'Personnelcontrol/data/personnel.json';
        const equipmentPath = 'Personnelcontrol/data/equipment.json';

        console.log('嘗試載入路徑:');
        console.log('- 人員資料:', personnelPath);
        console.log('- 器材資料:', equipmentPath);

        // 建立完整的 URL（處理相對路徑）
        const personnelUrl = new URL(personnelPath, window.location.href).href;
        const equipmentUrl = new URL(equipmentPath, window.location.href).href;

        console.log('完整URL:');
        console.log('- 人員資料:', personnelUrl);
        console.log('- 器材資料:', equipmentUrl);

        // 先測試檔案是否存在
        console.log('測試檔案存取...');

        try {
            const test1 = await fetch(personnelPath);
            console.log('人員檔案狀態:', test1.status, test1.statusText);
        } catch (e) {
            console.error('人員檔案測試失敗:', e.message);
        }

        try {
            const test2 = await fetch(equipmentPath);
            console.log('器材檔案狀態:', test2.status, test2.statusText);
        } catch (e) {
            console.error('器材檔案測試失敗:', e.message);
        }

        // 同時載入兩個 JSON 檔案
        const [personnelResponse, equipmentResponse] = await Promise.all([
            fetch(personnelPath),
            fetch(equipmentPath)
        ]);

        if (!personnelResponse.ok) {
            throw new Error(`無法載入 personnel.json: ${personnelResponse.status} ${personnelResponse.statusText}`);
        }

        if (!equipmentResponse.ok) {
            throw new Error(`無法載入 equipment.json: ${equipmentResponse.status} ${equipmentResponse.statusText}`);
        }

        // 解析 JSON
        const personnelData = await personnelResponse.json();
        const equipmentData = await equipmentResponse.json();

        console.log('JSON 解析成功：');
        console.log('人員資料類型：', Array.isArray(personnelData) ? '陣列' : typeof personnelData);
        console.log('人員資料第一筆：', personnelData[0]);
        console.log('器材資料類型：', Array.isArray(equipmentData) ? '陣列' : typeof equipmentData);
        console.log('器材資料第一筆：', equipmentData[0]);

        // 使用處理函數處理資料
        currentData.employees = processPersonnelData(personnelData);
        currentData.equipment = processEquipmentData(equipmentData);

        console.log('資料處理完成：');
        console.log(`- 人員：${currentData.employees.length} 筆`);
        console.log(`- 器材：${currentData.equipment.length} 筆`);

    } catch (error) {
        console.error('載入 JSON 資料失敗：', error);
        console.error('錯誤堆疊：', error.stack);

        // 顯示詳細錯誤訊息
        showNotification(`載入失敗：${error.message}`);

        // 建立偵錯資訊
        createDebugInfo();

        // 如果載入失敗，使用備用資料
        console.log('使用備用資料...');
        currentData = getBackupData();
    }
}

// 建立偵錯資訊
function createDebugInfo() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-info';
    debugDiv.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 9999;
        max-width: 80%;
        max-height: 80vh;
        overflow: auto;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
    `;

    debugDiv.innerHTML = `
        <h3 style="margin-top: 0;">⚠️ 資料載入錯誤</h3>
        <p><strong>可能原因：</strong></p>
        <ol>
            <li>JSON 檔案路徑錯誤</li>
            <li>JSON 檔案格式錯誤</li>
            <li>伺服器不允許讀取本地檔案</li>
            <li>檔案不存在</li>
        </ol>
        <p><strong>解決方案：</strong></p>
        <ol>
            <li>確認 data/personnel.json 和 data/equipment.json 存在</li>
            <li>使用 HTTP 伺服器（不能直接開啟 HTML 檔案）</li>
            <li>檢查瀏覽器主控台的 Network 標籤頁</li>
            <li>檢查 JSON 檔案是否有語法錯誤</li>
        </ol>
        <p><strong>快速測試：</strong></p>
        <button onclick="testFilePaths()" style="padding: 10px; margin: 5px;">測試檔案路徑</button>
        <button onclick="loadSampleData()" style="padding: 10px; margin: 5px;">載入範例資料</button>
        <button onclick="this.parentNode.parentNode.style.display='none'" style="padding: 10px; margin: 5px;">關閉</button>
    `;

    document.body.appendChild(debugDiv);
}

// 測試檔案路徑
async function testFilePaths() {
    console.log('=== 檔案路徑測試 ===');

    const paths = [
        'data/personnel.json',
        'data/equipment.json',
        './data/personnel.json',
        './data/equipment.json',
        '/data/personnel.json',
        '/data/equipment.json',
        'personnel.json',
        'equipment.json'
    ];

    for (const path of paths) {
        try {
            const response = await fetch(path);
            console.log(`${path}: ${response.status} ${response.statusText}`);
            if (response.ok) {
                const text = await response.text();
                console.log(`  內容長度: ${text.length} 字元`);
                console.log(`  前100字元: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.log(`${path}: 錯誤 - ${error.message}`);
        }
    }
}

// 載入範例資料
function loadSampleData() {
    console.log('載入範例資料...');

    // 直接使用您提供的範例資料
    currentData.employees = [
        {
            "id": 2,
            "name": "陳力平",
            "photo": "陳力平.jpg",
            "status": "外出",
            "group": "管理組",
            "time_status": "12/06 08:45",
            "time_history": "BoO 05/26 07:48\n外出 05/26 07:49\n外出 05/26 08:34\nBoO 05/26 08:34\n外出 05/26 08:51\n外出 05/26 08:51\nBoO 05/26 08:51\n外出 05/26 08:52\nBoO 05/26 08:52\n外出 05/26 18:26\n外出 06/26 09:15\n外出 07/01 09:53\nBoO 07/01 09:53\n外出 07/01 09:53\nBoO 07/01 12:06\n外出 12/06 08:45"
        }
    ];

    currentData.equipment = [
        {
            "id": 1,
            "name": "影音",
            "photo": "影音.jpg",
            "category": "科技類",
            "status": "應勤",
            "time_status": "07/01 09:54",
            "time_history": "應勤 05/25 21:36\n應勤 05/25 21:36\n應勤 05/25 21:36\n應勤 05/25 21:37\n在隊 05/25 22:18\n應勤 05/25 22:19\n應勤 05/25 22:26\n在隊 05/25 22:30\n應勤 05/25 22:30\n在隊 05/26 08:53\n應勤 06/26 09:15\n應勤 06/26 09:15\n在隊 07/01 09:53\n應勤 07/01 09:54",
            "detail_name": "影音聲納生命探測器"
        },
        {
            "id": 2,
            "name": "聲納",
            "photo": "聲納.jpg",
            "category": "科技類",
            "status": "應勤",
            "time_status": "07/01 09:54",
            "time_history": "應勤 05/25 21:36\n應勤 05/25 21:37\n在隊 05/25 22:18\n應勤 05/25 22:19\n應勤 05/25 22:26\n在隊 05/25 22:30\n應勤 05/25 22:30\n應勤 05/25 22:30\n在隊 05/26 08:53\n在隊 05/26 08:53\n應勤 06/26 09:15\n在隊 07/01 09:53\n應勤 07/01 09:54",
            "detail_name": "聲納生命探測器"
        }
    ];

    // 更新畫面
    renderView();
    showNotification('已載入範例資料');

    // 移除錯誤訊息
    const debugDiv = document.getElementById('debug-info');
    if (debugDiv) {
        debugDiv.style.display = 'none';
    }
}

// 檢查缺失照片的人員
function checkMissingPhotos() {
    const missingPhotos = [];
    const availablePhotos = [];

    currentData.employees.forEach(emp => {
        const photoName = emp.rawData.photo || emp.rawData.照片 || emp.photo;

        // 檢查 JSON 中是否有照片欄位
        if (!photoName ||
            photoName === '無' ||
            photoName === '無照片' ||
            photoName === 'default.jpg') {
            missingPhotos.push(emp.name);
        } else {
            availablePhotos.push(`${emp.name}: ${photoName}`);
        }
    });

    console.log('=== 照片檢查結果 ===');
    console.log('缺失照片的人員:', missingPhotos);
    console.log('有照片的人員:', availablePhotos);
    console.log('總人數:', currentData.employees.length);
    console.log('缺失照片人數:', missingPhotos.length);

    return missingPhotos;
}

// 處理人員資料格式
function processPersonnelData(data) {
    if (!Array.isArray(data)) {
        console.warn('personnel.json 不是陣列格式，嘗試轉換...');
        data = Object.values(data);
    }

    return data.map((emp, index) => {
        // 找出姓名欄位
        const name = emp.name || emp.姓名 || emp.Name || `人員${index + 1}`;

        // 找出群組欄位
        const group = emp.group || emp.組別 || emp.分組 || emp.Group || '未分組';

        // **重要：處理照片欄位**
        let photo = emp.photo || emp.照片 || emp.大頭貼 || emp.Photo || '';

        // 檢查是否為特定沒有照片的人員
        const missingPhotoNames = ['吳弘翊', '張智凱', '周書煜', '裘子鋐', '范皓翔', '葉光庭', '歐泰林'];

        // 如果姓名在缺失照片名單中，強制使用 default.jpg
        if (missingPhotoNames.includes(name)) {
            console.log(`注意：${name} 沒有照片，使用預設圖片`);
            photo = 'default.jpg';
        }

        // 如果照片欄位為空或無效，使用 default.jpg
        if (!photo ||
            photo.trim() === '' ||
            photo === 'null' ||
            photo === 'undefined' ||
            photo === '無' ||
            photo === '無照片' ||
            photo === '無圖片') {
            photo = 'default.jpg';
        }

        // 找出狀態欄位
        let status = emp.status || emp.狀態 || emp.Status || 'BoO';
        if (!['BoO', '外出', '在隊', '應勤'].includes(status)) {
            status = 'BoO';
        }

        // 找出時間狀態
        const time_status = emp.time_status || emp.時間狀態 || emp.last_update || emp.最後更新 || '';

        // 找出歷史紀錄
        const time_history = emp.time_history || emp.history || emp.歷史紀錄 || emp.時序 || '';
        let lastReason = '';
        if (time_history) {
            const historyLines = time_history.split('\n').filter(line => line.trim());
            const lastEntry = historyLines[0] || '';
            const reasonMatch = lastEntry.match(/\((.*?)\)/);
            if (reasonMatch) {
                lastReason = reasonMatch[1];
            }
        }
        return {
            id: emp.id || index + 1,
            name: name,
            group: group,
            photo: photo,  // 這裡已經確保了空值使用 default.jpg
            status: status,
            time_status: time_status,
            time_history: time_history,
            lastReason: lastReason,  // 新增
            rawData: emp
        };
    });
}

// 處理器材資料格式
function processEquipmentData(data) {
    if (!Array.isArray(data)) {
        console.warn('equipment.json 不是陣列格式，嘗試轉換...');
        data = Object.values(data);
    }

    return data.map((eq, index) => {
        const name = eq.name || eq.名稱 || eq.Name || `器材${index + 1}`;
        const detail_name = eq.detail_name || eq.detailName || eq.詳細名稱 || eq.全名 || name;
        const category = eq.category || eq.類別 || eq.分類 || eq.Category || '未分類';

        // **照片處理 - 完全照抄人員的邏輯**
        let photo = eq.photo || eq.照片 || eq.圖片 || eq.Photo || '';

        // 如果照片欄位為空或無效，使用 default.jpg
        if (!photo ||
            photo.trim() === '' ||
            photo === 'null' ||
            photo === 'undefined' ||
            photo === '無' ||
            photo === '無照片' ||
            photo === '無圖片') {
            photo = 'default.jpg';
        }

        let status = eq.status || eq.狀態 || eq.Status || '在隊';
        if (!['在隊', '應勤', 'BoO', '外出'].includes(status)) {
            status = '在隊';
        }

        const time_status = eq.time_status || eq.時間狀態 || eq.last_update || eq.最後更新 || '';
        const time_history = eq.time_history || eq.history || eq.歷史紀錄 || eq.時序 || '';
        let lastReason = '';
        if (time_history) {
            const historyLines = time_history.split('\n').filter(line => line.trim());
            const lastEntry = historyLines[0] || '';
            const reasonMatch = lastEntry.match(/\((.*?)\)/);
            if (reasonMatch) {
                lastReason = reasonMatch[1];
            }
        }
        return {
            id: eq.id || index + 101,
            name: name,
            detail_name: detail_name,
            category: category,
            photo: photo,
            status: status,
            time_status: time_status,
            time_history: time_history,
            lastReason: lastReason,  // 新增
            rawData: eq
        };
    });
}

// 備用資料（當 JSON 檔案無法載入時使用）
function getBackupData() {
    console.log('使用備用資料');

    return {
        employees: [
            {
                id: 1,
                name: "張三",
                group: "A組",
                photo: "default.jpg",
                status: "BoO",
                time_status: getCurrentTime(),
                time_history: "BoO " + getCurrentTime()
            },
            {
                id: 2,
                name: "李四",
                group: "A組",
                photo: "default.jpg",
                status: "外出",
                time_status: getCurrentTime(),
                time_history: "外出 " + getCurrentTime()
            }
        ],
        equipment: [
            {
                id: 101,
                name: "範例器材",
                category: "測試類別",
                photo: "default.jpg",
                status: "在隊",
                time_status: getCurrentTime(),
                time_history: "在隊 " + getCurrentTime()
            }
        ]
    };
}

// 設定事件監聽器
function setupEventListeners() {
    // 檢視切換按鈕
    document.querySelectorAll('.view-btn').forEach(item => {
        item.addEventListener('click', function () {
            switchView(this.dataset.view);
        });
    });

    // 關閉彈窗按鈕
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // 點擊彈窗外關閉
    window.addEventListener('click', function (event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // 點擊可折疊面板外關閉
    window.addEventListener('click', function (event) {
        const infoPanel = document.getElementById('info-panel');
        const historyPanel = document.getElementById('history-panel');

        if (infoPanel.classList.contains('show') && !event.target.closest('.info-panel') &&
            !event.target.closest('[onclick*="toggleInfoPanel"]')) {
            infoPanel.classList.remove('show');
        }

        if (historyPanel.classList.contains('show') && !event.target.closest('.history-panel') &&
            !event.target.closest('[onclick*="toggleHistoryPanel"]')) {
            historyPanel.classList.remove('show');
        }
    });
}

// 切換視圖
function switchView(view) {
    currentView = view;

    // 更新選單狀態
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    // 顯示對應的卡片區域
    document.getElementById('personnel-cards').classList.toggle('hidden', view !== 'personnel');
    document.getElementById('equipment-cards').classList.toggle('hidden', view !== 'equipment');

    // 更新標題
    updateViewTitle();

    // 更新畫面
    renderView();
}

// 更新視圖標題
function updateViewTitle() {
    const titleElement = document.querySelector('.logo');
    if (titleElement) {
        titleElement.textContent = currentView === 'personnel'
            ? '人員與器材管制系統 - 人員模式'
            : '人員與器材管制系統 - 器材模式';
    }
}

// 渲染完整視圖
function renderView() {
    updateStats();
    renderGroupControls();
    renderCards();

}

// 更新統計數字
function updateStats() {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;

    let booCount, outCount;

    if (currentView === 'personnel') {
        booCount = data.filter(item => item.status === 'BoO').length;
        outCount = data.filter(item => item.status === '外出').length;
    } else {
        booCount = data.filter(item => item.status === '在隊').length;
        outCount = data.filter(item => item.status === '應勤').length;
    }

    document.getElementById('boo-count').textContent = booCount;
    document.getElementById('out-count').textContent = outCount;

    // 更新統計標籤
    const labels = document.querySelectorAll('.stat-label');
    if (currentView === 'personnel') {
        labels[0].textContent = '基地人數';
        labels[1].textContent = '外出人數';
    } else {
        labels[0].textContent = '在隊';
        labels[1].textContent = '應勤';
    }
}

// 渲染群組控制按鈕
function renderGroupControls() {
    const container = document.getElementById('group-controls');
    container.innerHTML = '';

    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;

    const groups = {};
    data.forEach(item => {
        const groupKey = currentView === 'personnel' ? item.group : item.category;
        if (groupKey && !groups[groupKey]) {
            groups[groupKey] = [];
        }
        if (groupKey) {
            groups[groupKey].push(item);
        }
    });

    Object.keys(groups).forEach(groupName => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-control-item';

        // 群組標題區
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-control-header';
        groupHeader.innerHTML = `
            <h4>${groupName} (${groups[groupName].length}人)</h4>
            <button class="expand-btn" onclick="toggleGroupMembers('${groupName}')">
                <i class="fas fa-chevron-down"></i>
            </button>
        `;

        // 群組按鈕
        const groupButtons = document.createElement('div');
        groupButtons.className = 'group-buttons';
        groupButtons.innerHTML = `
            <button class="boo-btn" onclick="batchUpdateGroupStatus('${groupName}', '${currentView === 'personnel' ? 'BoO' : '在隊'}')">
                全部${currentView === 'personnel' ? '歸隊' : '在隊'}
            </button>
            <button class="out-btn" onclick="batchUpdateGroupStatus('${groupName}', '${currentView === 'personnel' ? '外出' : '應勤'}')">
                全部${currentView === 'personnel' ? '外出' : '應勤'}
            </button>
        `;

        // 成員列表（預設隱藏）
        const membersList = document.createElement('div');
        membersList.className = 'group-members-list';
        membersList.id = `members-${groupName}`;
        membersList.style.display = 'none';

        groups[groupName].forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            const displayName = member.detail_name || member.name;
            const statusClass = getStatusClass(member.status);
            const statusText = getStatusDisplayText(member.status);

            // 檢查是否有最後原因或從歷史解析
            let currentReason = '';
            if (member.lastReason) {
                currentReason = member.lastReason;
            } else if (member.status === '外出' || member.status === '應勤') {
                // 從歷史解析最後一次的原因
                const historyLines = (member.time_history || '').split('\n').filter(line => line.trim());
                const lastEntry = historyLines[0] || '';
                const reasonMatch = lastEntry.match(/\((.*?)\)/);
                if (reasonMatch) {
                    currentReason = reasonMatch[1];
                }
            }

            memberItem.innerHTML = `
                <div class="member-info">
                    <span class="member-name">${displayName}</span>
                    <span class="member-status ${statusClass}">${statusText}</span>
                </div>
                <div class="member-buttons">
                    <button class="mini-btn boo ${member.status === 'BoO' || member.status === '在隊' ? 'active' : ''}"
                            onclick="updateStatus(${member.id}, '${currentView === 'personnel' ? 'BoO' : '在隊'}')">
                        ${currentView === 'personnel' ? 'BoO' : '在隊'}
                    </button>
                    <button class="mini-btn out ${member.status === '外出' || member.status === '應勤' ? 'active' : ''}"
                            onclick="updateStatus(${member.id}, '${currentView === 'personnel' ? '外出' : '應勤'}')">
                        ${currentView === 'personnel' ? '外出' : '應勤'}
                    </button>
                </div>
            `;

            // 如果有原因，顯示原因
            if (currentReason && (member.status === '外出' || member.status === '應勤')) {
                const reasonDiv = document.createElement('div');
                reasonDiv.className = 'member-reason';
                reasonDiv.textContent = `原因: ${currentReason}`;
                reasonDiv.style.cssText = `
                    width: 100%;
                    text-align: left;
                    font-size: 10px;
                    color: #888;
                    margin-top: 5px;
                    padding-top: 5px;
                    border-top: 1px dashed #eee;
                `;
                memberItem.appendChild(reasonDiv);
            }

            membersList.appendChild(memberItem);
        });

        groupDiv.appendChild(groupHeader);
        groupDiv.appendChild(groupButtons);
        groupDiv.appendChild(membersList);
        container.appendChild(groupDiv);
    });
}


// 展開/收起群組成員
// 展開/收起群組成員 - 修正版
function toggleGroupMembers(groupName) {
    const membersList = document.getElementById(`members-${groupName}`);
    if (!membersList) {
        console.error(`找不到成員列表: members-${groupName}`);
        return;
    }

    const btn = event.target.closest('.expand-btn');
    if (!btn) {
        console.error('找不到展開按鈕');
        return;
    }

    const icon = btn.querySelector('i');
    if (!icon) {
        console.error('找不到圖標元素');
        return;
    }

    // 檢查目前是否展開
    const isExpanded = membersList.classList.contains('expanded');

    console.log(`切換群組 ${groupName}: 目前狀態 = ${isExpanded ? '展開' : '收起'}`);

    if (isExpanded) {
        // 收起
        membersList.classList.remove('expanded');
        btn.classList.remove('expanded');
        icon.className = 'fas fa-chevron-down';

        // 移除 inline style
        membersList.style.display = 'none';
    } else {
        // 展開
        membersList.classList.add('expanded');
        btn.classList.add('expanded');
        icon.className = 'fas fa-chevron-up';

        // 設置 inline style 為 block
        membersList.style.display = 'block';

        // 滾動到該群組區域（可選）
        setTimeout(() => {
            try {
                membersList.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            } catch (e) {
                console.log('滾動失敗:', e);
            }
        }, 100);
    }
}

// 批次更新群組狀態
function batchUpdateGroupStatus(groupName, newStatus) {
    // 如果是要設定為外出或應勤，先詢問原因
    if (newStatus === '外出' || newStatus === '應勤') {
        showGroupReasonModal(groupName, newStatus);
    } else {
        // 如果是歸隊/在隊，不需要原因，直接更新
        const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;
        let updatedCount = 0;

        data.forEach(item => {
            const groupKey = currentView === 'personnel' ? item.group : item.category;
            if (groupKey === groupName) {
                const oldStatus = item.status;
                item.status = newStatus;
                const currentTime = getCurrentTime();
                item.time_status = currentTime;

                // 更新歷史紀錄（不包含原因）
                const historyText = item.time_history || '';
                const historyLines = historyText.split('\n').filter(line => line.trim());
                const historyEntry = `${newStatus} ${currentTime}`;
                historyLines.unshift(historyEntry);

                if (historyLines.length > 10) {
                    historyLines.length = 10;
                }

                item.time_history = historyLines.join('\n');
                updatedCount++;

                // 更新單一卡片
                updateSingleCard(item);
            }
        });

        // 顯示通知
        showNotification(`${groupName} 已更新 ${updatedCount} 筆資料為 ${getStatusDisplayText(newStatus)}`);
        saveData();
    }
}

// 顯示群組原因選擇彈窗
function showGroupReasonModal(groupName, newStatus) {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;
    const groupItems = data.filter(item => {
        const groupKey = currentView === 'personnel' ? item.group : item.category;
        return groupKey === groupName;
    });

    if (groupItems.length === 0) return;

    // 完全移除現有的彈窗
    const existingModal = document.getElementById('group-reason-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const title = `${groupName} - 請選擇${currentView === 'personnel' ? '外出' : '應勤'}原因`;

    // 創建全新的彈窗
    const reasonModal = document.createElement('div');
    reasonModal.id = 'group-reason-modal';
    reasonModal.className = 'modal';

    reasonModal.innerHTML = `
        <div class="modal-content reason-modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>${title}</h3>
            <div class="modal-body">
                <p>將為 ${groupItems.length} 個項目設定相同原因：</p>
                <div class="reason-options" id="group-reason-options">
                    ${currentReasons.map(reason =>
        `<div class="reason-option" onclick="handleGroupReasonOptionClick(this, '${groupName}', '${newStatus}')">${reason}</div>`
    ).join('')}
                </div>
                <div class="custom-reason-input" id="group-custom-reason-input" style="display: none;">
                    <input type="text" placeholder="請輸入自訂原因..." maxlength="50">
                </div>
                <div class="reason-actions">
                    <button onclick="handleConfirmGroupReason('${groupName}', '${newStatus}')">確認</button>
                    <button onclick="this.closest('.modal').remove()">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(reasonModal);
    reasonModal.style.display = 'block';
    reasonModal.dataset.groupName = groupName;
    reasonModal.dataset.newStatus = newStatus;
}

// 處理群組原因選項點擊
window.handleGroupReasonOptionClick = function (element, groupName, newStatus) {
    const reasonModal = document.getElementById('group-reason-modal');
    if (!reasonModal) return;

    reasonModal.querySelectorAll('.reason-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    element.classList.add('selected');

    if (element.textContent === '其他') {
        const customInput = reasonModal.querySelector('#group-custom-reason-input');
        if (customInput) {
            customInput.style.display = 'block';
            customInput.querySelector('input')?.focus();
        }
    } else {
        const customInput = reasonModal.querySelector('#group-custom-reason-input');
        if (customInput) {
            customInput.style.display = 'none';
        }
    }
};

// 處理確認群組原因
window.handleConfirmGroupReason = function (groupName, newStatus) {
    const reasonModal = document.getElementById('group-reason-modal');
    if (!reasonModal) return;

    let selectedReason = '';
    const selectedOption = reasonModal.querySelector('.reason-option.selected');

    if (selectedOption) {
        selectedReason = selectedOption.textContent;

        if (selectedReason === '其他') {
            const customInput = reasonModal.querySelector('#group-custom-reason-input input');
            selectedReason = customInput?.value.trim() || '';
        }
    }

    if (!selectedReason && (newStatus === '外出' || newStatus === '應勤')) {
        showNotification('請選擇或輸入原因');
        return;
    }

    // 移除彈窗
    reasonModal.remove();

    // 執行群組批次更新
    performBatchGroupUpdate(groupName, newStatus, selectedReason);
};

// 確認群組原因
function confirmGroupReason(groupName, newStatus) {
    const reasonModal = document.getElementById('group-reason-modal');
    if (!reasonModal) return;

    let selectedReason = '';
    const selectedOption = reasonModal.querySelector('.reason-option.selected');

    if (selectedOption) {
        selectedReason = selectedOption.textContent;
        if (selectedReason === '其他') {
            const customInput = reasonModal.querySelector('#group-custom-reason-input input');
            selectedReason = customInput.value.trim();
        }
    }

    if (!selectedReason && (newStatus === '外出' || newStatus === '應勤')) {
        showNotification('請選擇或輸入原因');
        return;
    }

    // 執行批次更新
    performBatchGroupUpdate(groupName, newStatus, selectedReason);
    closeGroupReasonModal();
}

// 關閉群組原因彈窗
function closeGroupReasonModal() {
    const reasonModal = document.getElementById('group-reason-modal');
    if (reasonModal) {
        reasonModal.style.display = 'none';
    }
}

// 實際執行群組批次更新的函數
function performBatchGroupUpdate(groupName, newStatus, reason) {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;
    let updatedCount = 0;

    data.forEach(item => {
        const groupKey = currentView === 'personnel' ? item.group : item.category;
        if (groupKey === groupName) {
            const oldStatus = item.status;
            item.status = newStatus;
            const currentTime = getCurrentTime();
            item.time_status = currentTime;

            // 更新歷史紀錄
            const historyText = item.time_history || '';
            const historyLines = historyText.split('\n').filter(line => line.trim());

            let historyEntry = newStatus;
            if (reason && (newStatus === '外出' || newStatus === '應勤')) {
                historyEntry += ` (${reason})`;
            }
            historyEntry += ' ' + currentTime;

            historyLines.unshift(historyEntry);

            if (historyLines.length > 10) {
                historyLines.length = 10;
            }

            item.time_history = historyLines.join('\n');
            updatedCount++;

            // 立即更新該項目卡片
            updateSingleCard(item);
        }
    });

    // 顯示通知
    let notificationMsg = `${groupName} 已更新 ${updatedCount} 筆資料為 ${getStatusDisplayText(newStatus)}`;
    if (reason) {
        notificationMsg += `，原因：${reason}`;
    }
    showNotification(notificationMsg);

    updateStats();  // 更新統計數字

    saveData();
}

// 渲染卡片
async function renderCards() {
    const containerId = currentView === 'personnel' ? 'personnel-cards' : 'equipment-cards';
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`找不到容器: ${containerId}`);
        return;
    }

    container.innerHTML = '';

    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;

    if (data.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>暫無資料</p>
            <p>資料來源：data/${currentView === 'personnel' ? 'personnel' : 'equipment'}.json</p>
            <p>資料筆數：0</p>
            <button onclick="refreshData()" style="margin-top: 10px;">重新載入</button>
        `;
        emptyMessage.style.cssText = `
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 16px;
        `;
        container.appendChild(emptyMessage);
        return;
    }

    // 顯示資料統計
    const statsDiv = document.createElement('div');
    statsDiv.className = 'data-stats';
    statsDiv.innerHTML = `<p>共 ${data.length} 筆資料</p>`;
    statsDiv.style.cssText = `
        grid-column: 1 / -1;
        background-color: #f0f0f0;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 10px;
        text-align: center;
    `;
    container.appendChild(statsDiv);

    // 先按群組排序
    const groupedData = {};
    data.forEach(item => {
        const groupKey = currentView === 'personnel' ? item.group : item.category;
        if (!groupedData[groupKey]) {
            groupedData[groupKey] = [];
        }
        groupedData[groupKey].push(item);
    });

    // 渲染每個群組
    Object.keys(groupedData).sort().forEach(groupName => {
        // 群組標題
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.innerHTML = `<h3>${groupName} (${groupedData[groupName].length}人)</h3>`;
        groupHeader.style.cssText = `
        grid-column: 1 / -1;
        margin: 20px 0 10px 0;
        padding-bottom: 5px;
        border-bottom: 2px solid #ccc;
        color: #333;
    `;
        container.appendChild(groupHeader);

        // 立即同步渲染該群組的所有卡片
        groupedData[groupName].forEach(item => {
            const card = createCardSync(item);  // 使用同步版本
            container.appendChild(card);
        });
    });
}

// 建立卡片元素
async function createCard(item) {
    const card = document.createElement('div');
    card.className = `card ${getStatusClass(item.status)}`;
    card.dataset.id = item.id;

    const statusText = getStatusDisplayText(item.status);
    const displayName = item.detail_name || item.name;

    // 檢查照片是否有效（避免特殊字元問題）
    const imgPath = getPhotoPath(item.photo);
    const folder = currentView === 'personnel' ? 'people' : 'equipment';

    const imgElement = document.createElement('img');
    imgElement.src = `assets/${folder}/default.jpg`;  // 先設預設圖
    imgElement.alt = displayName;
    imgElement.className = 'card-image';

    // 嘗試載入實際圖片
    const realImg = new Image();
    realImg.onload = function () {
        imgElement.src = imgPath;  // 成功才換
    };
    realImg.src = imgPath;  // 靜默測試

    // 點擊事件
    imgElement.onclick = function () {
        showImageModal(displayName, statusText, item.time_status);
    };

    // 創建卡片內容
    const cardContent = document.createElement('div');
    cardContent.innerHTML = `
    ${currentView === 'equipment' && item.category ?
            `<div class="card-category">${item.category}</div>` : ''}
    
    <div class="card-name ${item.detail_name ? 'fullname' : 'shortname'}" 
         data-name="${item.name}"
         title="${item.detail_name ? item.name : ''}">
        ${displayName}
    </div>
    
    ${item.detail_name && item.detail_name !== item.name ?
            `<div class="card-shortname">簡稱：${item.name}</div>` : ''}
    
    <div class="card-status">${item.time_status} ${statusText}</div>
    
    ${lastReason && (item.status === '外出' || item.status === '應勤') ?
            `<div class="card-reason" title="原因：${lastReason}">${lastReason}</div>` : ''}
    
    <div class="card-buttons">
        <button class="status-btn boo ${item.status === 'BoO' || item.status === '在隊' ? 'active' : ''}"
                onclick="updateStatus(${item.id}, '${currentView === 'personnel' ? 'BoO' : '在隊'}')">
            ${currentView === 'personnel' ? 'BoO' : '在隊'}
        </button>
        <button class="status-btn out ${item.status === '外出' || item.status === '應勤' ? 'active' : ''}"
                onclick="updateStatus(${item.id}, '${currentView === 'personnel' ? '外出' : '應勤'}')">
            ${currentView === 'personnel' ? '外出' : '應勤'}
        </button>
    </div>
`;

    // 將圖片和內容添加到卡片
    card.appendChild(imgElement);
    card.appendChild(cardContent);

    return card;
}

// 修改 createCardSync 函數，在卡片上顯示原因

function createCardSync(item) {
    const card = document.createElement('div');
    card.className = `card ${getStatusClass(item.status)}`;
    card.dataset.id = item.id;

    const statusText = getStatusDisplayText(item.status);
    const displayName = item.detail_name || item.name;

    // === 修正：直接從項目歷史解析原因 ===
    let currentReason = '';
    if ((item.status === '外出' || item.status === '應勤') && item.time_history) {
        const historyLines = item.time_history.split('\n').filter(line => line.trim());
        const lastEntry = historyLines[0] || '';
        const reasonMatch = lastEntry.match(/\((.*?)\)/);
        if (reasonMatch) {
            currentReason = reasonMatch[1];
        }
    }

    const imgPath = getPhotoPath(item.photo);
    const imgElement = document.createElement('img');
    imgElement.src = imgPath;
    imgElement.alt = displayName;
    imgElement.className = 'card-image';

    imgElement.dataset.filename = item.photo;
    imgElement.dataset.category = currentView === 'personnel' ? 'personnel' : 'equipment';

    imgElement.onerror = function () {
        console.warn('圖片載入失敗:', displayName, '路徑:', this.src);
        if (this.src.includes('drive.google.com')) {
            const fileName = this.dataset.filename;
            const category = this.dataset.category;
            const localPath = getLocalPhotoPath(fileName, category);

            console.log('嘗試本地圖片:', localPath);
            this.src = localPath;

            this.onerror = function () {
                console.log('本地圖片也失敗，使用預設');
                this.src = getDefaultPhotoPath();
                this.onerror = null;
            };
        } else {
            this.src = getDefaultPhotoPath();
            this.onerror = null;
        }
    };

    imgElement.onclick = function () {
        showImageModal(displayName, statusText, item.time_status);
    };

    const cardContent = document.createElement('div');
    cardContent.innerHTML = `
        ${currentView === 'equipment' && item.category ?
            `<div class="card-category">${item.category}</div>` : ''}
        
        <div class="card-name ${item.detail_name ? 'fullname' : 'shortname'}" 
             data-name="${item.name}"
             title="${item.detail_name ? item.name : ''}">
            ${displayName}
        </div>
        
        ${item.detail_name && item.detail_name !== item.name ?
            `<div class="card-shortname">簡稱：${item.name}</div>` : ''}
        
        <div class="card-status">${item.time_status} ${statusText}</div>
        
        ${currentReason && (item.status === '外出' || item.status === '應勤') ?
            `<div class="card-reason" title="原因：${currentReason}">${currentReason}</div>` : ''}
        
        <div class="card-buttons">
            <button class="status-btn boo ${item.status === 'BoO' || item.status === '在隊' ? 'active' : ''}"
                    onclick="updateStatus(${item.id}, '${currentView === 'personnel' ? 'BoO' : '在隊'}')">
                ${currentView === 'personnel' ? 'BoO' : '在隊'}
            </button>
            <button class="status-btn out ${item.status === '外出' || item.status === '應勤' ? 'active' : ''}"
                    onclick="updateStatus(${item.id}, '${currentView === 'personnel' ? '外出' : '應勤'}')">
                ${currentView === 'personnel' ? '外出' : '應勤'}
            </button>
        </div>
    `;

    card.appendChild(imgElement);
    card.appendChild(cardContent);

    // 添加名字點擊事件 - 修正 null 錯誤
    const nameElement = card.querySelector('.card-name');
    if (nameElement) {
        try {
            nameElement.style.cursor = 'pointer';
            nameElement.addEventListener('click', function () {
                showHistory(item.name);
            });
        } catch (error) {
            console.error('設置名字點擊事件時出錯:', error);
        }
    }

    return card;
}


// 手動刷新圖片
function refreshDriveImages() {
    console.log('手動刷新 Google Drive 圖片...');

    // 顯示載入中訊息
    showNotification('正在重新載入圖片...');

    // 清空現有映射
    driveImages = {
        equipment: {},
        personnel: {},
        vehicles: {}
    };

    // 重新載入
    initDriveImagesAsync();

    // 5秒後嘗試更新圖片
    setTimeout(() => {
        updateImagesForCurrentView();
        showNotification('圖片更新完成');
    }, 5000);
}

// 檢查圖片載入狀態
function checkImageStatus() {
    console.log('=== 圖片載入狀態 ===');
    console.log('器材圖片:', Object.keys(driveImages.equipment).length, '張');
    console.log('人員圖片:', Object.keys(driveImages.personnel).length, '張');
    console.log('車輛圖片:', Object.keys(driveImages.vehicles).length, '張');

    // 顯示在通知中
    const equipmentCount = Object.keys(driveImages.equipment).length;
    const personnelCount = Object.keys(driveImages.personnel).length;
    showNotification(`圖片載入: 器材${equipmentCount}張, 人員${personnelCount}張`);
}

// 全局圖片錯誤處理
let imageErrorCache = {}; // 快取已處理的錯誤圖片

// 全局圖片錯誤處理
function handleCardImageError(imgElement, displayName) {
    console.warn('圖片載入失敗，使用預設圖片:', displayName);

    // 直接使用默認圖片
    const folder = currentView === 'personnel' ? 'people' : 'equipment';
    const defaultSrc = encodeURI(`assets/${folder}/default.jpg`);

    imgElement.src = defaultSrc;
    imgElement.onerror = null; // 移除錯誤監聽，避免循環

    // 在控制台記錄哪些人缺少照片
    console.warn(`⚠️ ${displayName} 缺少照片，已使用預設圖片`);
}

// 取得狀態對應的 CSS class
function getStatusClass(status) {
    if (currentView === 'personnel') {
        return status === 'BoO' ? 'boo' : 'out';
    } else {
        return status === '在隊' ? 'boo' : 'out';
    }
}

// 取得狀態顯示文字
function getStatusDisplayText(status) {
    if (currentView === 'personnel') {
        return status === 'BoO' ? '基地' : '外出';
    } else {
        return status === '在隊' ? '在隊' : '應勤';
    }
}

// 添加图片加载状态跟踪
const imageLoadStatus = {};

// 非同步初始化所有圖片（不阻擋主流程）
function initDriveImagesAsync() {
    console.log('開始非同步載入 Google Drive 圖片...');

    // 你的 Apps Script 部署 URL
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzE1HXXDPS4Wl-DCIrptSe41qu9eHKTNfe3uDFzhx3yrQeWlFIxkZJubsjj-SV3n2rmHQ/exec';

    // 載入三種分類的圖片（不等待）
    const categories = ['equipment', 'personnel', 'vehicles'];

    categories.forEach((category, index) => {
        // 稍微錯開請求時間，避免同時太多請求
        setTimeout(() => {
            fetch(`${SCRIPT_URL}?category=${category}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.images) {
                        driveImages[category] = data.images;
                        console.log(`✅ ${category} 圖片載入完成:`, Object.keys(data.images).length, '張');

                        // 如果當前視圖是這個分類，自動更新圖片
                        if (currentView === 'equipment' && category === 'equipment') {
                            updateImagesForCurrentView();
                        } else if (currentView === 'personnel' && category === 'personnel') {
                            updateImagesForCurrentView();
                        }
                    } else {
                        console.warn(`⚠️ ${category} 圖片載入失敗:`, data.error);
                    }
                })
                .catch(error => {
                    console.error(`❌ ${category} 圖片請求失敗:`, error);
                });
        }, index * 500); // 每個請求間隔 500ms
    });
}
// 取得圖片路徑
function getPhotoPath(photoName) {
    // 如果照片名稱為空、無效或明顯是預設值
    if (!photoName ||
        photoName.trim() === '' ||
        photoName === '無' ||
        photoName === '無照片') {

        // **這裡很重要：直接回傳 default.jpg 的 Drive 路徑**
        return getDefaultDrivePhoto();
    }

    // 清理檔案名稱
    let cleanName = photoName.trim();

    // 確保有副檔名
    if (!cleanName.includes('.')) {
        cleanName = cleanName + '.jpg';
    }

    // 根據當前視圖決定分類
    let category;
    if (currentView === 'personnel') {
        category = 'personnel';
    } else {
        category = 'equipment'; // 器材或車輛
    }

    // **優先：Google Drive 網路圖片**
    if (driveImages[category] && driveImages[category][cleanName]) {
        const fileId = driveImages[category][cleanName];
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    }

    // **如果找不到對應的圖片，檢查 default.jpg 是否在 Drive 中**
    if (driveImages[category] && driveImages[category]['default.jpg']) {
        const defaultFileId = driveImages[category]['default.jpg'];
        console.log('使用 Drive 的 default.jpg');
        return `https://drive.google.com/thumbnail?id=${defaultFileId}&sz=w400`;
    }

    // **最後：本地 default.jpg（降級方案）**
    const folder = category === 'personnel' ? 'people' : 'equipment';
    console.warn('找不到圖片，使用本地 default.jpg');
    return `assets/${folder}/default.jpg`;
}

// 取得 Drive 的 default.jpg
function getDefaultDrivePhoto() {
    const category = currentView === 'personnel' ? 'personnel' : 'equipment';

    // 先檢查 Drive 有沒有 default.jpg
    if (driveImages[category] && driveImages[category]['default.jpg']) {
        const fileId = driveImages[category]['default.jpg'];
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    }

    // 如果沒有，用本地
    const folder = category === 'personnel' ? 'people' : 'equipment';
    return `assets/${folder}/default.jpg`;
}

// 新增：取得本地圖片路徑函數
function getLocalPhotoPath(fileName, category) {
    const folderMap = {
        'equipment': 'equipment',
        'personnel': 'people',
        'vehicles': 'vehicles'
    };

    const folder = folderMap[category] || 'equipment';
    return `assets/${folder}/${fileName}`;
}

// 取得預設圖片路徑
function getDefaultPhotoPath() {
    const folderMap = {
        'personnel': 'people',
        'equipment': 'equipment',
        'vehicles': 'vehicles'
    };

    const category = currentView === 'personnel' ? 'personnel' : 'equipment';
    const folder = folderMap[category] || 'equipment';
    return `assets/${folder}/default.jpg`;
}

// 更新單一項目狀態
function updateStatus(id, newStatus) {
    // 如果是要設定為外出或應勤，先詢問原因
    if (newStatus === '外出' || newStatus === '應勤') {
        showReasonModal(id, newStatus);
    } else {
        // 歸隊或在隊，直接更新
        performStatusUpdate(id, newStatus, '');
    }
}

// 顯示原因選擇彈窗
function showReasonModal(itemId, newStatus) {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;
    const item = data.find(item => item.id === itemId);

    if (!item) {
        console.error(`找不到項目 ID: ${itemId}`);
        return;
    }

    // 完全移除現有的原因彈窗（避免重複）
    const existingModal = document.getElementById('reason-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const existingGroupModal = document.getElementById('group-reason-modal');
    if (existingGroupModal) {
        existingGroupModal.remove();
    }

    // 設置彈窗標題
    const itemName = item.detail_name || item.name;
    const title = `${itemName} - 請選擇${currentView === 'personnel' ? '外出' : '應勤'}原因`;

    // 創建全新的彈窗
    const reasonModal = document.createElement('div');
    reasonModal.id = 'reason-modal';
    reasonModal.className = 'modal';

    // 使用內聯事件處理器避免閉包問題
    reasonModal.innerHTML = `
        <div class="modal-content reason-modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>${title}</h3>
            <div class="modal-body">
                <div class="reason-options" id="reason-options">
                    ${currentReasons.map(reason =>
        `<div class="reason-option" onclick="handleReasonOptionClick(this, ${itemId}, '${newStatus}')">${reason}</div>`
    ).join('')}
                </div>
                <div class="custom-reason-input" id="custom-reason-input" style="display: none;">
                    <input type="text" placeholder="請輸入自訂原因..." maxlength="50">
                </div>
                <div class="reason-actions">
                    <button onclick="handleConfirmReason(${itemId}, '${newStatus}')">確認</button>
                    <button onclick="this.closest('.modal').remove()">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(reasonModal);
    reasonModal.style.display = 'block';

    // 儲存當前項目和狀態到彈窗
    reasonModal.dataset.itemId = itemId;
    reasonModal.dataset.newStatus = newStatus;
}

// 處理原因選項點擊 - 全局函數
window.handleReasonOptionClick = function (element, itemId, newStatus) {
    // 清除所有選項的選中狀態
    const reasonModal = document.getElementById('reason-modal');
    if (!reasonModal) return;

    reasonModal.querySelectorAll('.reason-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // 選中當前點擊的選項
    element.classList.add('selected');

    // 如果是「其他」，顯示自訂輸入框
    if (element.textContent === '其他') {
        const customInput = reasonModal.querySelector('#custom-reason-input');
        if (customInput) {
            customInput.style.display = 'block';
            customInput.querySelector('input')?.focus();
        }
    } else {
        const customInput = reasonModal.querySelector('#custom-reason-input');
        if (customInput) {
            customInput.style.display = 'none';
        }
    }
};

// 處理確認原因 - 全局函數
window.handleConfirmReason = function (itemId, newStatus) {
    const reasonModal = document.getElementById('reason-modal');
    if (!reasonModal) return;

    let selectedReason = '';
    const selectedOption = reasonModal.querySelector('.reason-option.selected');

    if (selectedOption) {
        selectedReason = selectedOption.textContent;

        // 如果是「其他」，讀取自訂輸入
        if (selectedReason === '其他') {
            const customInput = reasonModal.querySelector('#custom-reason-input input');
            selectedReason = customInput?.value.trim() || '';
        }
    }

    if (!selectedReason && (newStatus === '外出' || newStatus === '應勤')) {
        showNotification('請選擇或輸入原因');
        return;
    }

    // 移除彈窗
    reasonModal.remove();

    // 執行狀態更新
    performStatusUpdate(itemId, newStatus, selectedReason);
};

// 確認原因並更新狀態
function confirmReason(itemId, newStatus) {
    const reasonModal = document.getElementById('reason-modal');
    if (!reasonModal) return;

    let selectedReason = '';
    const selectedOption = reasonModal.querySelector('.reason-option.selected');

    if (selectedOption) {
        selectedReason = selectedOption.textContent;
        if (selectedReason === '其他') {
            const customInput = reasonModal.querySelector('#custom-reason-input input');
            selectedReason = customInput.value.trim();
        }
    }

    if (!selectedReason && (newStatus === '外出' || newStatus === '應勤')) {
        showNotification('請選擇或輸入原因');
        return;
    }

    // 如果自訂原因不在列表中，添加到常用原因
    if (selectedReason &&
        !currentReasons.includes(selectedReason) &&
        selectedReason !== '其他' &&
        selectedReason.length > 0) {

        // 添加到「其他」之前
        const otherIndex = currentReasons.indexOf('其他');
        if (otherIndex > -1) {
            currentReasons.splice(otherIndex, 0, selectedReason);
        } else {
            currentReasons.push(selectedReason);
        }

        // 保存到本地存儲
        saveCustomReasons();
    }

    // 執行狀態更新
    performStatusUpdate(itemId, newStatus, selectedReason);
    closeReasonModal();
}

// 關閉原因彈窗
function closeReasonModal() {
    const reasonModal = document.getElementById('reason-modal');
    if (reasonModal) {
        reasonModal.style.display = 'none';
    }
}

// 實際執行狀態更新的函數
function performStatusUpdate(id, newStatus, reason) {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;
    const item = data.find(item => item.id === id);

    if (!item) {
        console.error(`找不到項目 ID: ${id}`);
        return;
    }

    const oldStatus = item.status;
    item.status = newStatus;
    const currentTime = getCurrentTime();
    item.time_status = currentTime;

    // 更新歷史紀錄
    const historyText = item.time_history || '';
    const historyLines = historyText.split('\n').filter(line => line.trim());

    // 如果有原因，添加到歷史記錄中
    let historyEntry = newStatus;
    if (reason && (newStatus === '外出' || newStatus === '應勤')) {
        historyEntry += ` (${reason})`;
    }
    historyEntry += ' ' + currentTime;

    historyLines.unshift(historyEntry);

    if (historyLines.length > 20) {
        historyLines.length = 20;
    }

    item.time_history = historyLines.join('\n');

    // 立即更新單一卡片
    updateSingleCard(item);

    // 顯示通知
    let notificationMsg = `${item.detail_name || item.name} 狀態已從 ${getStatusDisplayText(oldStatus)} 變更為 ${getStatusDisplayText(newStatus)}`;
    if (reason && (newStatus === '外出' || newStatus === '應勤')) {
        notificationMsg += `，原因：${reason}`;
    }
    showNotification(notificationMsg);

    updateStats();  // 更新統計數字

    saveData();
}

// === 新增：只更新單一卡片的函數 ===
function updateSingleCard(updatedItem) {
    // 找到對應的卡片容器
    const containerId = currentView === 'personnel' ? 'personnel-cards' : 'equipment-cards';
    const container = document.getElementById(containerId);

    if (!container) return;

    // 找到對應的卡片
    const cardSelector = `.card[data-id="${updatedItem.id}"]`;
    const cardElement = container.querySelector(cardSelector);

    if (cardElement) {
        // 創建新的卡片並替換
        const newCard = createCardSync(updatedItem);
        cardElement.replaceWith(newCard);
    } else {
        // 如果找不到卡片，重新渲染整個視圖
        renderView();
    }
}

// 標記圖片需要更新（當 Drive 圖片載入後）
function markImageForUpdate(fileName, category) {
    // 建立一個待更新列表
    if (!window.imagesToUpdate) {
        window.imagesToUpdate = {};
    }

    if (!window.imagesToUpdate[category]) {
        window.imagesToUpdate[category] = new Set();
    }

    window.imagesToUpdate[category].add(fileName);

    // 定期檢查是否可以更新
    setTimeout(() => {
        tryUpdateMarkedImages(category);
    }, 2000); // 2秒後檢查
}

// 嘗試更新已標記的圖片
function tryUpdateMarkedImages(category) {
    if (!window.imagesToUpdate || !window.imagesToUpdate[category]) return;

    const imagesToUpdate = window.imagesToUpdate[category];
    const updated = [];

    imagesToUpdate.forEach(fileName => {
        if (driveImages[category] && driveImages[category][fileName]) {
            updateImageSource(fileName, category);
            updated.push(fileName);
        }
    });

    // 移除已更新的
    updated.forEach(fileName => {
        imagesToUpdate.delete(fileName);
    });

    if (updated.length > 0) {
        console.log(`已更新 ${updated.length} 張 ${category} 圖片到 Google Drive`);
    }
}

// 更新圖片來源
function updateImageSource(fileName, category) {
    const fileId = driveImages[category][fileName];
    if (!fileId) return;

    const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    const localPath = getLocalPhotoPath(fileName, category);

    // 更新所有對應的圖片元素
    document.querySelectorAll(`img[src="${localPath}"]`).forEach(img => {
        if (img.src !== driveUrl) {
            console.log(`更新圖片: ${fileName} → Google Drive`);
            img.src = driveUrl;

            // 添加錯誤處理
            img.onerror = function () {
                console.warn(`Drive 圖片載入失敗: ${fileName}`);
                this.src = getDefaultPhotoPath();
            };
        }
    });
}

// 更新當前視圖的圖片
function updateImagesForCurrentView() {
    const category = currentView === 'personnel' ? 'personnel' : 'equipment';

    // 更新所有卡片圖片 - 添加安全檢查
    const cardImages = document.querySelectorAll('.card-image');
    if (!cardImages.length) return;

    cardImages.forEach(img => {
        if (!img || !img.src) return;  // 添加 null 檢查

        const src = img.src;
        const fileName = src.split('/').pop();

        // 如果目前是本地圖片，檢查是否有 Drive 版本
        if (src.includes('assets/') && driveImages[category] && driveImages[category][fileName]) {
            updateImageSource(fileName, category);
        }
    });
}

// 檢查圖片是否存在（可選）
async function checkImageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}




// 顯示圖片彈窗
function showImageModal(name, status, time) {
    console.log('showImageModal 被呼叫:', name, status, time);

    let item = null;
    if (currentView === 'personnel') {
        item = currentData.employees.find(emp =>
            (emp.detail_name === name || emp.name === name)
        );
    } else {
        item = currentData.equipment.find(eq =>
            (eq.detail_name === name || eq.name === name)
        );
    }

    if (!item) {
        console.error('找不到項目:', name);
        return;
    }

    console.log('找到項目:', item);

    // 獲取最後一次外出的原因
    let lastReason = '';
    if (item.time_history) {
        const historyLines = item.time_history.split('\n').filter(line => line.trim());
        const lastEntry = historyLines[0] || '';
        const reasonMatch = lastEntry.match(/\((.*?)\)/);
        if (reasonMatch) {
            lastReason = reasonMatch[1];
        }
    }

    // 設置放大的圖片
    const imgPath = getPhotoPath(item.photo);
    const modalImg = document.getElementById('modal-image');
    modalImg.src = imgPath;
    modalImg.alt = name;

    // 錯誤處理
    modalImg.onerror = function () {
        const folder = currentView === 'personnel' ? 'people' : 'equipment';
        this.src = `assets/${folder}/default.jpg`;
        this.onerror = null;
    };

    // 設置資訊
    const displayName = item.detail_name || item.name;
    const groupInfo = currentView === 'personnel' ? item.group : item.category;

    const infoDiv = document.getElementById('image-info');
    infoDiv.innerHTML = `
        <h3>${displayName}</h3>
        ${item.detail_name && item.detail_name !== item.name ?
            `<p class="short-name">簡稱：${item.name}</p>` : ''}
        <p><strong>${currentView === 'personnel' ? '組別' : '類別'}：</strong>${groupInfo}</p>
        <p><strong>狀態：</strong><span class="status-badge ${getStatusClass(item.status)}">${status}</span></p>
        <p><strong>最後更新：</strong>${time}</p>
        
        ${lastReason && (item.status === '外出' || item.status === '應勤') ?
            `<div class="image-reason">
                <strong>${currentView === 'personnel' ? '外出' : '應勤'}原因：</strong>
                <span>${lastReason}</span>
            </div>` : ''}
        
        <button class="view-history-btn" id="view-history-btn-modal">
            <i class="fas fa-history"></i> 查看歷史紀錄
        </button>
    `;

    // 顯示彈窗
    document.getElementById('image-modal').style.display = 'block';

    // 添加按鈕事件
    setTimeout(() => {
        const historyBtn = document.getElementById('view-history-btn-modal');
        if (historyBtn) {
            historyBtn.onclick = function () {
                console.log('歷史按鈕被點擊');
                closeModal('image-modal');
                setTimeout(() => {
                    showHistory(item.name);
                }, 300);
            };
        }
    }, 100);
}


// 顯示歷史紀錄
function showHistory(name) {
    console.log('showHistory 被呼叫:', name);

    selectedItem = name;

    let item = null;
    if (currentView === 'personnel') {
        item = currentData.employees.find(emp => emp.name === name);
    } else {
        item = currentData.equipment.find(eq => eq.name === name || eq.detail_name === name);
    }

    console.log('找到的 item:', item);

    const historyContainer = document.getElementById('history-content');
    historyContainer.innerHTML = '';

    if (!item) {
        const notFound = document.createElement('div');
        notFound.innerHTML = `
            <h4>${name}</h4>
            <p>找不到相關資料</p>
        `;
        notFound.style.color = '#666';
        notFound.style.textAlign = 'center';
        notFound.style.padding = '20px';
        historyContainer.appendChild(notFound);
    } else {
        const displayName = item.detail_name || item.name;
        const title = document.createElement('h4');
        title.textContent = `${displayName}的歷史紀錄`;
        historyContainer.appendChild(title);

        const historyLines = (item.time_history || '').split('\n').filter(line => line.trim());

        if (historyLines.length === 0) {
            const noHistory = document.createElement('p');
            noHistory.textContent = '暫無歷史紀錄';
            noHistory.style.color = '#666';
            noHistory.style.fontStyle = 'italic';
            historyContainer.appendChild(noHistory);
        } else {
            historyLines.forEach(record => {
                const recordDiv = document.createElement('div');

                // 檢查是否有原因
                const hasReason = record.includes('(') && record.includes(')');
                if (hasReason) {
                    recordDiv.className = 'history-item with-reason';
                    // 提取原因
                    const reasonMatch = record.match(/\((.*?)\)/);
                    const reason = reasonMatch ? reasonMatch[1] : '';
                    const recordWithoutReason = record.replace(/\s*\(.*?\)/, '');

                    recordDiv.innerHTML = `
                        <div>${recordWithoutReason}</div>
                        ${reason ? `<span class="reason-badge">${reason}</span>` : ''}
                    `;
                } else {
                    recordDiv.className = `history-item ${record.includes('應勤') || record.includes('外出') ? 'warning' : ''}`;
                    recordDiv.textContent = record;
                }

                recordDiv.onclick = () => showHistoryDetail(displayName);
                historyContainer.appendChild(recordDiv);
            });
        }

        updateDetailInfo(item);
    }

    // 自動打開歷史面板
    console.log('準備打開歷史面板');
    const historyPanel = document.getElementById('history-panel');
    if (historyPanel) {
        historyPanel.classList.remove('show');
        void historyPanel.offsetHeight;
        setTimeout(() => {
            historyPanel.classList.add('show');
            console.log('歷史面板已打開');
        }, 10);
    } else {
        console.error('找不到歷史面板元素');
    }
}

// 顯示歷史紀錄詳情
function showHistoryDetail(name) {
    let item = null;
    if (currentView === 'personnel') {
        item = currentData.employees.find(emp => emp.name === name);
    } else {
        item = currentData.equipment.find(eq => eq.name === name);
    }

    if (!item) return;

    document.getElementById('history-title').textContent = `${name}的詳細時序`;
    const detailContainer = document.getElementById('history-detail');

    const historyLines = (item.time_history || '').split('\n').filter(line => line.trim());

    detailContainer.innerHTML = `
        <h4>${name} (${getStatusDisplayText(item.status)})</h4>
        <div class="history-timeline">
            ${historyLines.map(record => {
        const isWarning = record.includes('外出') || record.includes('應勤');
        return `<div class="timeline-item ${isWarning ? 'warning' : ''}">${record}</div>`;
    }).join('')}
        </div>
    `;

    document.getElementById('history-modal').style.display = 'block';
}

// 更新詳細資訊區
function updateDetailInfo(item) {
    const container = document.getElementById('detail-content');

    if (!item) {
        container.innerHTML = '<p>請選擇項目查看詳細資訊</p>';
        return;
    }

    const statusText = getStatusDisplayText(item.status);

    container.innerHTML = `
        <h4>${item.name}</h4>
        <p><strong>狀態：</strong> <span class="${getStatusClass(item.status)}">${statusText}</span></p>
        <p><strong>最後更新：</strong> ${item.time_status}</p>
        <p><strong>${currentView === 'personnel' ? '分組' : '類別'}：</strong> ${currentView === 'personnel' ? item.group : item.category}</p>
        <p><strong>歷史紀錄筆數：</strong> ${(item.time_history || '').split('\n').filter(line => line.trim()).length}</p>
        <button class="detail-btn" onclick="showHistoryDetail('${item.name}')">查看詳細時序</button>
    `;
}

// 工具函數
function getCurrentTime() {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}

function showNotification(message) {
    // 建立通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // 3秒後移除通知
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 儲存資料（可選功能）
function saveData() {
    // 注意：瀏覽器無法直接寫入檔案，這裡只是示範
    // 實際應用中需要透過後端API或讓使用者下載

    console.log('資料已變更，建議實作儲存功能');

    // 範例：建立下載連結
    const personnelJson = JSON.stringify(currentData.employees, null, 2);
    const equipmentJson = JSON.stringify(currentData.equipment, null, 2);

    // 建立儲存按鈕（僅供測試）
    if (!document.getElementById('save-btn')) {
        const saveBtn = document.createElement('button');
        saveBtn.id = 'save-btn';
        saveBtn.innerHTML = '<i class="fas fa-download"></i> 下載資料';
        saveBtn.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 20px;
            padding: 10px 15px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        `;
        saveBtn.addEventListener('click', () => {
            downloadJSON(personnelJson, 'personnel_updated.json');
            downloadJSON(equipmentJson, 'equipment_updated.json');
            showNotification('資料已準備下載');
        });
        document.body.appendChild(saveBtn);
    }
}

// 下載 JSON 檔案
function downloadJSON(jsonData, filename) {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 建立測試資料
function createTestData() {
    console.log('建立測試資料...');

    currentData.employees = [
        {
            id: 1,
            name: "測試人員1",
            group: "測試組",
            photo: "default.jpg",
            status: "BoO",
            time_status: getCurrentTime(),
            time_history: "BoO " + getCurrentTime()
        }
    ];

    currentData.equipment = [
        {
            id: 101,
            name: "影音",
            detail_name: "影音聲納生命探測器",
            category: "科技類",
            photo: "default.jpg",
            status: "應勤",
            time_status: getCurrentTime(),
            time_history: "應勤 " + getCurrentTime()
        }
    ];

    // 更新畫面
    updateStats();
    renderGroupControls();
    renderCards();


    showNotification('已載入測試資料，請檢查 JSON 檔案路徑');
}


// 切換檢視模式
function switchView(view) {
    currentView = view;

    // 更新檢視按鈕
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // 顯示對應的卡片區域
    document.querySelectorAll('.cards-container').forEach(container => {
        container.classList.toggle('active', container.id === `${view}-cards`);
    });

    // 更新畫面
    renderView();
}

// 顯示群組控制彈窗
function showGroupControl() {
    // 更新群組控制按鈕
    renderGroupControls();
    document.getElementById('group-modal').style.display = 'block';
}

// 顯示快速控制彈窗
function showQuickControl() {
    console.log('打開快速控制，當前視圖:', currentView);

    // 更新標題
    const modalTitle = document.querySelector('#quick-modal h3');
    if (modalTitle) {
        const viewText = currentView === 'personnel' ? '人員模式' : '器材模式';
        modalTitle.innerHTML = `<i class="fas fa-bolt"></i> 快速控制 <span style="font-size: 14px; color: #666; margin-left: 10px;">${viewText}</span>`;
    }

    // 更新搜尋框 placeholder
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.placeholder = currentView === 'personnel' ?
            '搜尋人員姓名或群組...' :
            '搜尋器材名稱或類別...';
    }

    renderQuickControlList();
    document.getElementById('quick-modal').style.display = 'block';

    // 添加搜尋功能
    setupQuickControlSearch();

    // 添加 ESC 鍵關閉功能
    document.addEventListener('keydown', handleQuickModalKeydown);
}

// 處理快速控制彈窗的鍵盤事件
function handleQuickModalKeydown(event) {
    if (event.key === 'Escape' && document.getElementById('quick-modal').style.display === 'block') {
        closeModal('quick-modal');
    }
}



// 設置快速控制搜尋功能
function setupQuickControlSearch() {
    // 修改這一行，將 'quick-search-input' 改為 'search-input'
    const searchInput = document.getElementById('search-input');

    if (!searchInput) {
        console.error('找不到搜尋輸入框');
        // 調試：列出所有輸入框
        const allInputs = document.querySelectorAll('input');
        console.log('所有輸入框:', allInputs);
        return;
    }

    console.log('找到搜尋輸入框:', searchInput);

    // 清除之前的監聽器
    searchInput.oninput = null;

    // 添加新的搜尋監聽器
    searchInput.oninput = function () {
        const searchTerm = this.value.trim().toLowerCase();
        console.log('搜尋詞:', searchTerm);
        filterQuickControlList(searchTerm);
    };

    // 初始清空搜尋框並聚焦
    searchInput.value = '';
    searchInput.focus();
}

// 過濾快速控制清單
function filterQuickControlList(searchTerm) {
    const container = document.getElementById('quick-control-list');
    if (!container) return;

    const allItems = container.querySelectorAll('.quick-item');
    const allGroupHeaders = container.querySelectorAll('.quick-group-header');
    const allGroupContainers = container.querySelectorAll('.quick-group-container');

    let hasVisibleItems = false;
    let groupsToExpand = new Set();

    // 先隱藏所有項目和群組
    allItems.forEach(item => {
        item.style.display = 'none';
    });

    allGroupContainers.forEach(container => {
        container.style.display = 'none';
    });

    // 如果有搜尋詞，進行過濾
    if (searchTerm) {
        allItems.forEach(item => {
            const nameElement = item.querySelector('.quick-item-name');
            const groupElement = item.querySelector('.quick-item-group');

            const name = nameElement?.textContent?.toLowerCase() || '';
            const group = groupElement?.textContent?.toLowerCase() || '';
            const originalName = nameElement?.dataset.originalName?.toLowerCase() || '';

            // 檢查是否匹配搜尋詞（搜尋名稱、詳細名稱、群組）
            const matchesSearch = name.includes(searchTerm) ||
                group.includes(searchTerm) ||
                originalName.includes(searchTerm);

            if (matchesSearch) {
                item.style.display = 'flex';
                hasVisibleItems = true;

                // 找到對應的群組
                const groupName = item.dataset.group;
                if (groupName) {
                    groupsToExpand.add(groupName);
                }
            }
        });
    } else {
        // 沒有搜尋詞時，只顯示群組標題
        hasVisibleItems = true;
    }

    // 處理群組標題
    allGroupHeaders.forEach(header => {
        const groupName = header.dataset.group;
        const icon = header.querySelector('i.fa-chevron-right');
        const countSpan = header.querySelector('.group-count');

        if (searchTerm) {
            // 有搜尋詞時：顯示匹配的群組
            if (groupsToExpand.has(groupName)) {
                header.style.display = 'block';
                header.dataset.expanded = 'true';
                if (icon) icon.style.transform = 'rotate(90deg)';

                // 顯示該群組的容器
                const groupContainer = document.getElementById(`quick-group-${groupName.replace(/\s+/g, '-')}`);
                if (groupContainer) {
                    groupContainer.style.display = 'block';

                    // 更新群組計數（只顯示可見項目）
                    const visibleItems = groupContainer.querySelectorAll('.quick-item[style*="display: flex"]').length;
                    if (countSpan) countSpan.textContent = `(${visibleItems})`;
                }
            } else {
                header.style.display = 'none';
            }
        } else {
            // 沒有搜尋詞時：顯示所有群組標題（預設收合）
            header.style.display = 'block';
            header.dataset.expanded = 'false';
            if (icon) icon.style.transform = 'rotate(0deg)';

            // 更新原始計數
            const groupContainer = document.getElementById(`quick-group-${groupName.replace(/\s+/g, '-')}`);
            if (groupContainer && countSpan) {
                const totalItems = groupContainer.querySelectorAll('.quick-item').length;
                countSpan.textContent = `(${totalItems})`;
            }
        }
    });

    // 顯示無結果訊息
    let noResultsMsg = container.querySelector('.no-results-message');
    if (!hasVisibleItems) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.innerHTML = `
                <i class="fas fa-search" style="font-size: 24px; color: #999; margin-bottom: 10px;"></i>
                <p style="margin: 5px 0;">找不到符合 "${searchTerm}" 的結果</p>
                <p style="font-size: 12px; color: #888;">試試其他關鍵字或查看群組列表</p>
            `;
            noResultsMsg.style.cssText = `
                text-align: center;
                padding: 40px 20px;
                color: #666;
                grid-column: 1 / -1;
                background-color: #f9f9f9;
                border-radius: 8px;
                margin-top: 20px;
            `;
            container.appendChild(noResultsMsg);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}
// 切換資訊面板
function toggleInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel.classList.toggle('show');
}

// 切換歷史面板
function toggleHistoryPanel() {
    const panel = document.getElementById('history-panel');
    panel.classList.toggle('show');
}

// 關閉快速控制彈窗時移除事件監聽器
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';

        // 如果是快速控制彈窗，移除鍵盤事件
        if (modalId === 'quick-modal') {
            document.removeEventListener('keydown', handleQuickModalKeydown);
        }
    }
}

// 切換標籤頁
function switchTab(tabName) {
    // 更新標籤按鈕
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(tabName === 'info' ? '系統說明' : '詳細資料'));
    });

    // 更新標籤內容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-content`);
    });
}

// 批次全部操作
function batchAll(action) {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;
    const newStatus = action === 'BoO' ?
        (currentView === 'personnel' ? 'BoO' : '在隊') :
        (currentView === 'personnel' ? '外出' : '應勤');

    let updatedCount = 0;

    data.forEach(item => {
        item.status = newStatus;
        item.time_status = getCurrentTime();

        // 更新歷史紀錄
        const historyText = item.time_history || '';
        const historyLines = historyText.split('\n').filter(line => line.trim());
        historyLines.unshift(`${newStatus} ${item.time_status}`);

        if (historyLines.length > 10) {
            historyLines.length = 10;
        }

        item.time_history = historyLines.join('\n');
        updatedCount++;
    });

    // 更新畫面
    renderView();
    showNotification(`已更新 ${updatedCount} 筆資料為 ${newStatus}`);
    closeModal('group-modal');
}

// 渲染快速控制清單
function renderQuickControlList() {
    const container = document.getElementById('quick-control-list');
    if (!container) {
        console.error('找不到 quick-control-list 容器');
        return;
    }

    container.innerHTML = '';

    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;

    if (data.length === 0) {
        container.innerHTML = '<div class="empty-message" style="text-align: center; padding: 40px; color: #666;">暫無資料</div>';
        return;
    }

    // 按群組/類別分組
    const groups = {};
    data.forEach(item => {
        const groupKey = currentView === 'personnel' ? item.group : item.category;
        if (!groupKey) {
            // 如果沒有分組，放在「未分組」
            const ungroupedKey = '未分組';
            if (!groups[ungroupedKey]) {
                groups[ungroupedKey] = [];
            }
            groups[ungroupedKey].push(item);
        } else {
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        }
    });

    // 渲染每個群組（預設收合）
    Object.keys(groups).sort().forEach((groupName, groupIndex) => {
        // 群組標題（可點擊展開）
        const groupHeader = document.createElement('div');
        groupHeader.className = 'quick-group-header';
        groupHeader.dataset.group = groupName;
        groupHeader.dataset.expanded = 'false';

        const itemCount = groups[groupName].length;
        groupHeader.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chevron-right" style="font-size: 12px; transition: transform 0.3s;"></i>
                    <span style="font-weight: bold; color: #333;">${groupName}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="group-count">(${itemCount})</span>
                    <button class="quick-group-action-btn" onclick="event.stopPropagation(); batchUpdateGroupStatus('${groupName}', '${currentView === 'personnel' ? 'BoO' : '在隊'}')" style="background: none; border: none; cursor: pointer;" title="全部歸隊">
                        <i class="fas fa-home" style="color: #4CAF50; font-size: 14px;"></i>
                    </button>
                </div>
            </div>
        `;

        // 點擊群組標題展開/收合
        groupHeader.addEventListener('click', function (e) {
            if (!e.target.closest('.quick-group-action-btn')) {
                toggleQuickGroup(this);
            }
        });

        container.appendChild(groupHeader);

        // 群組成員容器（預設隱藏）
        const groupContainer = document.createElement('div');
        groupContainer.className = 'quick-group-container';
        groupContainer.id = `quick-group-${groupName.replace(/\s+/g, '-')}`;
        groupContainer.dataset.group = groupName;
        groupContainer.style.display = 'none';

        // 添加群組成員
        groups[groupName].forEach(item => {
            const quickItem = createQuickItem(item, groupName);
            groupContainer.appendChild(quickItem);
        });

        container.appendChild(groupContainer);
    });
}
// 切換快速控制群組展開/收合
function toggleQuickGroup(groupHeader) {
    const groupName = groupHeader.dataset.group;
    const isExpanded = groupHeader.dataset.expanded === 'true';
    const groupContainer = document.getElementById(`quick-group-${groupName.replace(/\s+/g, '-')}`);
    const icon = groupHeader.querySelector('i.fa-chevron-right');

    if (!groupContainer) return;

    if (isExpanded) {
        // 收合
        groupContainer.style.display = 'none';
        groupHeader.dataset.expanded = 'false';
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        // 展開
        groupContainer.style.display = 'block';
        groupHeader.dataset.expanded = 'true';
        if (icon) icon.style.transform = 'rotate(90deg)';
    }
}

// 展開所有群組
function expandAllQuickGroups() {
    const groupHeaders = document.querySelectorAll('.quick-group-header');
    groupHeaders.forEach(header => {
        if (header.dataset.expanded === 'false') {
            toggleQuickGroup(header);
        }
    });
}

// 收合所有群組
function collapseAllQuickGroups() {
    const groupHeaders = document.querySelectorAll('.quick-group-header');
    groupHeaders.forEach(header => {
        if (header.dataset.expanded === 'true') {
            toggleQuickGroup(header);
        }
    });
}

// 建立快速控制項目
function createQuickItem(item, groupName) {
    const quickItem = document.createElement('div');
    quickItem.className = 'quick-item';
    quickItem.dataset.group = groupName;

    const displayName = item.detail_name || item.name;
    const statusClass = getStatusClass(item.status);
    const statusText = getStatusDisplayText(item.status);

    // 獲取最後一次外出的原因
    let lastReason = '';
    if (item.time_history) {
        const historyLines = item.time_history.split('\n').filter(line => line.trim());
        const lastEntry = historyLines[0] || '';
        const reasonMatch = lastEntry.match(/\((.*?)\)/);
        if (reasonMatch) {
            lastReason = reasonMatch[1];
        }
    }

    quickItem.innerHTML = `
        <div class="quick-item-info">
            <div class="quick-item-name" data-name="${displayName}" data-original-name="${item.name}">${displayName}</div>
            <div class="quick-item-group">${groupName}</div>
            ${lastReason && (item.status === '外出' || item.status === '應勤') ?
            `<div class="quick-item-reason">原因：${lastReason}</div>` : ''}
        </div>
        <div class="quick-item-status ${statusClass}">${statusText}</div>
        <div class="quick-item-buttons">
            <button class="status-btn mini boo ${item.status === 'BoO' || item.status === '在隊' ? 'active' : ''}"
                    onclick="event.stopPropagation(); quickUpdateStatus(${item.id}, '${currentView === 'personnel' ? 'BoO' : '在隊'}')">
                ${currentView === 'personnel' ? '歸隊' : '在隊'}
            </button>
            <button class="status-btn mini out ${item.status === '外出' || item.status === '應勤' ? 'active' : ''}"
                    onclick="event.stopPropagation(); quickUpdateStatus(${item.id}, '${currentView === 'personnel' ? '外出' : '應勤'}')">
                ${currentView === 'personnel' ? '外出' : '應勤'}
            </button>
        </div>
    `;

    quickItem.addEventListener('click', function (e) {
        if (!e.target.closest('.status-btn')) {
            showHistory(item.name);
            closeModal('quick-modal');
        }
    });

    return quickItem;
}

// 快速更新狀態
function quickUpdateStatus(id, newStatus) {
    // 如果是要設定為外出或應勤，先詢問原因
    if (newStatus === '外出' || newStatus === '應勤') {
        showReasonModal(id, newStatus);
    } else {
        performStatusUpdate(id, newStatus, '');
    }
}


// 顯示狀態詳情（基地/外出人員名單）
function showStatusDetail(type) {
    const data = currentView === 'personnel' ? currentData.employees : currentData.equipment;

    let filteredData;
    let title;

    if (type === 'boo') {
        if (currentView === 'personnel') {
            filteredData = data.filter(item => item.status === 'BoO');
            title = `基地人員 (${filteredData.length}人)`;
        } else {
            filteredData = data.filter(item => item.status === '在隊');
            title = `在隊裝備 (${filteredData.length}項)`;
        }
    } else {
        if (currentView === 'personnel') {
            filteredData = data.filter(item => item.status === '外出');
            title = `外出人員 (${filteredData.length}人)`;
        } else {
            filteredData = data.filter(item => item.status === '應勤');
            title = `應勤裝備 (${filteredData.length}項)`;
        }
    }

    // 按群組分類
    const groups = {};
    filteredData.forEach(item => {
        const groupKey = currentView === 'personnel' ? item.group : item.category;
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
    });

    // 渲染內容
    const container = document.getElementById('status-detail-container');
    container.innerHTML = '';

    if (filteredData.length === 0) {
        container.innerHTML = '<p class="empty-message">目前無人員</p>';
    } else {
        Object.keys(groups).sort().forEach(groupName => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'status-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'status-group-title';
            groupTitle.textContent = `${groupName} (${groups[groupName].length})`;

            const namesList = document.createElement('div');
            namesList.className = 'status-names-grid';

            groups[groupName].forEach(item => {
                const nameBtn = document.createElement('button');
                nameBtn.className = 'status-name-btn';
                nameBtn.textContent = item.detail_name || item.name;
                nameBtn.onclick = () => {
                    closeModal('status-detail-modal');
                    setTimeout(() => {
                        showHistory(item.name);
                        toggleHistoryPanel();
                    }, 300);
                };
                namesList.appendChild(nameBtn);
            });

            groupDiv.appendChild(groupTitle);
            groupDiv.appendChild(namesList);
            container.appendChild(groupDiv);
        });
    }

    document.getElementById('status-detail-title').textContent = title;
    document.getElementById('status-detail-modal').style.display = 'block';
}

// 新增：預檢器材照片
async function preCheckEquipmentPhotos() {
    const checkPromises = currentData.equipment.map(async (item) => {
        if (item.photo === 'default.jpg') return;

        const imgPath = `assets/equipment/${item.photo}`;
        const exists = await checkImageExists(imgPath);

        if (!exists) {
            console.log(`器材 ${item.name} 的照片不存在，改用預設圖`);
            item.photo = 'default.jpg';
        }
    });

    await Promise.all(checkPromises);
}

////////////// 原因部分 //////////////
// 初始化常用原因
function initReasons() {
    // 預設常用原因列表
    currentReasons = [
        "任務場地",
        "購物",
        "開會",
        "訓練",
        "裝備保養",
        "行政事務",
        "醫療就診",
        "裝備測試",
        "支援其他單位",
        "裝備領用",
        "裝備歸還",
        "其他"
    ];

    // 嘗試從本地存儲載入自訂原因
    loadCustomReasons();
}

// 從本地存儲載入自訂原因
function loadCustomReasons() {
    try {
        const savedReasons = localStorage.getItem('customReasons');
        if (savedReasons) {
            const customReasons = JSON.parse(savedReasons);
            currentReasons = [...currentReasons.filter(r => r !== "其他"), ...customReasons, "其他"];
        }
    } catch (e) {
        console.log('載入自訂原因失敗:', e);
    }
}

// 保存自訂原因到本地存儲
function saveCustomReasons() {
    try {
        const customReasons = currentReasons.filter(r =>
            !["任務場地", "購物", "開會", "訓練", "裝備保養", "行政事務",
                "醫療就診", "裝備測試", "支援其他單位", "裝備領用", "裝備歸還", "其他"].includes(r)
        );
        localStorage.setItem('customReasons', JSON.stringify(customReasons));
    } catch (e) {
        console.log('保存自訂原因失敗:', e);
    }
}

// 設置原因相關事件監聽器
function setupReasonEventListeners() {
    // 原因選項點擊事件
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('reason-option')) {
            const reasonOptions = document.querySelectorAll('.reason-option');
            reasonOptions.forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');

            // 如果是「其他」，顯示自訂輸入框
            if (e.target.textContent === '其他') {
                document.getElementById('custom-reason-input').style.display = 'block';
                document.getElementById('custom-reason-input').focus();
            } else {
                document.getElementById('custom-reason-input').style.display = 'none';
                lastSelectedReason = e.target.textContent;
            }
        }
    });

    // 自訂原因輸入框事件
    const customInput = document.getElementById('custom-reason-input');
    if (customInput) {
        customInput.addEventListener('input', function () {
            lastSelectedReason = this.value.trim();
        });
    }
}

// 原因管理功能
function manageReasons() {
    renderReasonManagementList();
    document.getElementById('reason-management-modal').style.display = 'block';
}

// 渲染原因管理列表
function renderReasonManagementList() {
    const container = document.getElementById('current-reasons-list');
    if (!container) return;

    // 排除預設的「其他」
    const reasonsToShow = currentReasons.filter(r => r !== '其他');

    container.innerHTML = '';

    if (reasonsToShow.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">暫無自訂原因</p>';
        return;
    }

    reasonsToShow.forEach((reason, index) => {
        // 檢查是否是預設原因
        const isDefault = [
            "任務場地", "購物", "開會", "訓練", "裝備保養", "行政事務",
            "醫療就診", "裝備測試", "支援其他單位", "裝備領用", "裝備歸還"
        ].includes(reason);

        const reasonItem = document.createElement('div');
        reasonItem.className = 'reason-management-item';
        reasonItem.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin-bottom: 5px;
            background-color: ${isDefault ? '#f9f9f9' : '#fff'};
            border: 1px solid #eee;
            border-radius: 5px;
        `;

        reasonItem.innerHTML = `
            <span>${reason}</span>
            ${!isDefault ? `
                <button onclick="removeReason(${index})" style="background: none; border: none; color: #f44336; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            ` : '<span style="color: #999; font-size: 12px;">預設</span>'}
        `;

        container.appendChild(reasonItem);
    });
}

// 新增自訂原因
function addCustomReason() {
    const input = document.getElementById('new-reason-input');
    const newReason = input.value.trim();

    if (!newReason) {
        showNotification('請輸入原因');
        return;
    }

    if (currentReasons.includes(newReason)) {
        showNotification('該原因已存在');
        return;
    }

    // 添加到「其他」之前
    const otherIndex = currentReasons.indexOf('其他');
    if (otherIndex > -1) {
        currentReasons.splice(otherIndex, 0, newReason);
    } else {
        currentReasons.push(newReason);
    }

    // 保存到本地存儲
    saveCustomReasons();

    // 更新列表
    renderReasonManagementList();

    // 清空輸入框
    input.value = '';
    input.focus();

    showNotification(`已新增原因: ${newReason}`);
}

// 移除原因
function removeReason(index) {
    const reasonToRemove = currentReasons[index];

    if (confirm(`確定要移除原因「${reasonToRemove}」嗎？`)) {
        currentReasons.splice(index, 1);
        saveCustomReasons();
        renderReasonManagementList();
        showNotification(`已移除原因: ${reasonToRemove}`);
    }
}
/////////////////////////////////////////////////////
// 新增 CSS 動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .summary-name {
        cursor: pointer;
        display: inline-block;
        margin: 2px 5px;
        padding: 2px 5px;
        border-radius: 3px;
    }
    
    .summary-name:hover {
        background-color: #f0f0f0;
        text-decoration: underline;
    }
    
    .summary-name.warning {
        color: #FF0000;
    }
    
    .summary-name.warning:hover {
        background-color: #fff0f0;
    }
    
    .summary-group {
        margin-bottom: 15px;
    }
    
    .group-title {
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .group-title.warning {
        color: #FF0000;
    }
    
    .history-timeline {
        margin-top: 20px;
    }
    
    .timeline-item {
        padding: 10px;
        border-left: 3px solid #4CAF50;
        margin-bottom: 10px;
        background-color: #f9f9f9;
    }
    
    .timeline-item.warning {
        border-left-color: #FF0000;
        background-color: #fff5f5;
    }
    
    .detail-btn {
        padding: 8px 15px;
        background-color: #0066cc;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 10px;
    }
    
    .detail-btn:hover {
        background-color: #0052a3;
    }
    
    .group-btn {
        padding: 8px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s;
        min-width: 120px;
    }
    
    .group-btn.boo {
        background-color: #90EE90;
        color: #000;
    }
    
    .group-btn.out {
        background-color: #FF6347;
        color: #fff;
    }
    
    .group-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .group-control-item {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
        padding: 10px;
        background-color: #f8f8f8;
        border-radius: 5px;
    }
`;
document.head.appendChild(style);

console.log('系統初始化完成，等待使用者操作...');
