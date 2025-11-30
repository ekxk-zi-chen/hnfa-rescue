function showCalculationForm() {
  const container = document.getElementById("main-content");
  container.innerHTML = `
        <h2>支撐計算</h2>
        <label>選擇計算類型：
          <select id="calcType" onchange="renderCalcForm()">
            <option value="">👉👉點我選擇支撐類型💡💡</option>
            <option value="box">📦📦箱型支撐📦📦</option>
            <option value="wall">🧱🧱牆面支撐🧱🧱</option>
            <option value="floor">📐📐斜樓板支撐📐📐</option>
          </select>
        </label>
        <div id="dynamicForm"></div>
        <div id="dynamicResult"></div>
      `;

  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

function renderCalcForm() {
  const type = document.getElementById("calcType").value;
  const form = document.getElementById("dynamicForm");
  const result = document.getElementById("dynamicResult");
  result.innerHTML = "";

  if (type === "box") {
    form.innerHTML = `
          <div class="form-group">
            <label for="length">測量長度 (cm)：</label>
            <input type="number" id="length" />
          </div>
          <button onclick="calculateBox()">🧠計算箱型支撐📐</button>
          <div class="form-group">
            <label for="top">頂板厚度 (cm)：</label>
            <input type="number" id="top" value="10" />
          </div>
          <div class="form-group">
            <label for="bottom">底板厚度 (cm)：</label>
            <input type="number" id="bottom" value="10" />
          </div>
          <div class="form-group">
            <label for="wedge">楔型木厚度 (cm)：</label>
            <input type="number" id="wedge" value="5" />
          </div>
          <div class="form-group">
            <label for="spacing">支撐柱間距 (cm)：</label>
            <input type="number" id="spacing" value="120" />
          </div>
          <div class="form-group">
            <label for="connector">連接柱寬度 (cm)：</label>
            <input type="number" id="connector" value="10" />
          </div>
        `;
  } else if (type === "wall") {
    form.innerHTML = `
          <div class="form-group">
            <label for="length">測量長度 (cm)：</label>
            <input type="number" id="length" />
          </div>
          <button onclick="calculateWall()">🧠計算牆面支撐📐</button>
          <div class="form-group">
            <label for="top">頂板厚度 (cm)：</label>
            <input type="number" id="top" value="10" />
          </div>
          <div class="form-group">
            <label for="bottom">底板厚度 (cm)：</label>
            <input type="number" id="bottom" value="10" />
          </div>
          <div class="form-group">
            <label for="wedge">楔型木厚度 (cm)：</label>
            <input type="number" id="wedge" value="10" />
          </div>
          <div class="form-group">
            <label for="spacing">支撐柱間距 (cm)：</label>
            <input type="number" id="spacing" value="120" />
          </div>
          <div class="form-group">
            <label for="connector">連接柱寬度 (cm)：</label>
            <input type="number" id="connector" value="15" />
          </div>
          <div class="form-group">
            <label for="stopper">止檔寬度 (cm)：</label>
            <input type="number" id="stopper" value="5" />
          </div>
          <div class="form-group">
            <label for="angle">角度 (這裡只計算45度)：</label>
            <input type="number" id="angle" value="45" readonly />
          </div>
        `;
  } else if (type === "floor") {
    form.innerHTML = `
          <div class="form-group">
            <label for="length">測量長度 (cm)：</label>
            <input type="number" id="length" />
          </div>
          <button onclick="calculateFloor()">🧠計算樓板支撐📐</button>
          <div class="form-group">
            <label for="top">頂板厚度 (cm)：</label>
            <input type="number" id="top" value="10" />
          </div>
          <div class="form-group">
            <label for="bottom">底板厚度 (cm)：</label>
            <input type="number" id="bottom" value="10" />
          </div>
          <div class="form-group">
            <label for="spacing">支撐柱間距 (cm)：</label>
            <input type="number" id="spacing" value="120" />
          </div>
          <div class="form-group">
            <label for="connector">連接柱寬度 (cm)：</label>
            <input type="number" id="connector" value="15" />
          </div>
          <div class="form-group">
            <label for="stopper">止檔寬度 (cm)：</label>
            <input type="number" id="stopper" value="5" />
          </div>
          <div class="form-group">
            <label for="angle">角度 (最多45度)：</label>
            <input type="number" id="angle" value="45" max="45"/>
          </div>
        `;


  } else {
    form.innerHTML = "";
  }
}


function calculateBox() {
  const parsedData = {
    "測量長度": parseFloat(document.getElementById("length").value),
    "頂板厚度": parseFloat(document.getElementById("top").value),
    "底板厚度": parseFloat(document.getElementById("bottom").value),
    "楔型木厚度": parseFloat(document.getElementById("wedge").value),
    "支撐柱間距": parseFloat(document.getElementById("spacing").value),
    "連接柱寬度": parseFloat(document.getElementById("connector").value),
  };
  currentCalculationData = parsedData;
  currentCalculationType = "box";
  let formattedMessage = "填寫的資料為 箱型支撐\n";
  for (let key in parsedData) {
    formattedMessage += `${key}: ${parsedData[key]}, `;
  }
  formattedMessage = formattedMessage.slice(0, -2); // 去掉尾巴

  const result = document.getElementById("dynamicResult");

  if (Object.values(parsedData).every(val => !isNaN(val))) {
    const shorelenth = parsedData["測量長度"] - parsedData["頂板厚度"] - parsedData["底板厚度"] - parsedData["楔型木厚度"] * 1.1;
    const idealShorelenth = parsedData["測量長度"] - parsedData["頂板厚度"] - parsedData["底板厚度"] - parsedData["楔型木厚度"];

    const frontAngle = Math.sqrt(
      Math.pow(parsedData["測量長度"] * 0.5 - parsedData["連接柱寬度"], 2) +
      Math.pow(parsedData["支撐柱間距"] + 20, 2)
    ).toFixed(1);

    const sideAngle = Math.sqrt(
      Math.pow(((shorelenth - 10) * 0.5) - (parsedData["連接柱寬度"] * 2), 2) +
      Math.pow(parsedData["支撐柱間距"], 2)
    ).toFixed(1);

    const resultHTML = `
          <div class="result">
            <div class="result-section">
              <h3>臨時支撐</h3>
              <div class="result-row"><div class="result-label">頂底板</div><div class="result-value">90 * 4</div></div>
              <div class="result-row"><div class="result-label">支撐柱</div><div class="result-value">${shorelenth.toFixed(1)} * 4</div></div>
              <div class="result-row"><div class="result-label">兩倍夾板</div><div class="result-value">3個</div></div>
              <div class="result-row"><div class="result-label">半夾板</div><div class="result-value">4片</div></div>
              <div class="result-row"><div class="result-label">楔形木</div><div class="result-value">4組</div></div>
            </div>

            <div class="result-section">
              <h3>完整支撐</h3>
              <div class="result-row"><div class="result-label">頂板</div><div class="result-value">180 * 2</div></div>
              <div class="result-row"><div class="result-label">底板</div><div class="result-value">180 * 2</div></div>
              <div class="result-row"><div class="result-label">支撐柱</div><div class="result-value">${shorelenth.toFixed(1)} * 4</div></div>
              <div class="result-row"><div class="result-label">水平連接</div><div class="result-value">${parsedData["支撐柱間距"]} * 8</div></div>
              <div class="result-row"><div class="result-label">正面斜角</div><div class="result-value">${frontAngle} * 4</div></div>
              <div class="result-row"><div class="result-label">側面斜角</div><div class="result-value">${sideAngle} * 4</div></div>
              <div class="result-row"><div class="result-label">半夾板</div><div class="result-value">12片</div></div>
              <div class="result-row"><div class="result-label">楔形木</div><div class="result-value">4組</div></div>
            </div>
          </div>
          <!-- ...existing code... -->
          <div id="threejs-box-viewer" style="width:100%;height:350px;"></div>
          <!-- ...existing code... -->
        `;


    result.innerHTML = resultHTML;


    // 清除舊的 3D 畫布
    const oldCanvas = document.getElementById("threejs-canvas");
    if (oldCanvas) oldCanvas.remove();

    // 建立 Three.js 場景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 400 / 350, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 350);
    renderer.domElement.id = "threejs-canvas";
    document.getElementById("threejs-box-viewer").appendChild(renderer.domElement);

    // 加入光源
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 2, 3);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // 頂板長度固定 180cm

    const topThickness = parsedData["頂板厚度"] / 100; // m
    const spacing = parsedData["支撐柱間距"] / 100; // m
    const thickness = 10 / 100; // 預設固定10Cm
    const height = Math.max(0.1, Math.min(idealShorelenth / 100, 10));
    const cantilever = 0.3; // 懸樑 30cm
    const defaultTopLength = 180 / 100; // 原本固定長度
    const topLength = spacing * 1.5;

    // 柱子 geometry
    const pillarGeometry = new THREE.BoxGeometry(thickness, height, thickness);
    const pillarMaterial = new THREE.MeshPhongMaterial({
      color: 0x1abc9c,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    // 頂板 geometry
    const topGeometry = new THREE.BoxGeometry(topLength, topThickness, thickness);
    const topMaterial = new THREE.MeshPhongMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    // 柱子中心到頂板邊緣距離
    const offsetX = (topLength / 2) - cantilever * (spacing / 1.2) - (thickness / 2);

    // 柱子Z軸分布
    const offsetZ = spacing / 2 - (thickness / 2);
    // 柱子座標（四角）
    const pillarPositions = [
      [-offsetX, height / 2, -offsetZ],
      [offsetX, height / 2, -offsetZ],
      [-offsetX, height / 2, offsetZ],
      [offsetX, height / 2, offsetZ]
    ];

    // 建立四根柱子
    pillarPositions.forEach(pos => {
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
      pillar.position.set(...pos);
      scene.add(pillar);
    });

    // 頂板座標（兩塊，橫跨X方向，Z分別在±offsetZ）
    const topPositions = [
      [0, height + topThickness / 2, -offsetZ],
      [0, height + topThickness / 2, offsetZ]
    ];

    topPositions.forEach(pos => {
      const topBoard = new THREE.Mesh(topGeometry, topMaterial.clone());
      topBoard.position.set(...pos);
      scene.add(topBoard);
    });



    // 楔型木尺寸
    const wedgeLength = 0.3; // 固定30cm
    const wedgeHeight = parsedData["楔型木厚度"] / 100; // 變數，單位m
    const wedgeThickness = thickness / 2; // 跟柱子一樣

    // 楔型木 geometry（長方體，代表兩個半三角形合成）
    const wedgeGeometry = new THREE.BoxGeometry(wedgeLength, wedgeHeight, wedgeThickness);
    const wedgeMaterial = new THREE.MeshPhongMaterial({
      color: 0xe67e22,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    pillarPositions.forEach(pos => {
      // 柱子底部 Y 座標
      const pillarBottomY = pos[1] - height / 2;//這是歸零
      // 楔型木中心 Y 座標
      const wedgeY = pillarBottomY - wedgeHeight / 2;

      // 楔型木位置：X/Z 跟柱子一樣，Y在柱子底下
      const wedge = new THREE.Mesh(wedgeGeometry, wedgeMaterial.clone());
      wedge.position.set(pos[0], wedgeY, pos[2]);
      scene.add(wedge);

      // 加一條斜線（對角線）
      const points = [
        new THREE.Vector3(-wedgeLength / 2, wedgeHeight / 2, -wedgeThickness / 2),
        new THREE.Vector3(wedgeLength / 2, -wedgeHeight / 2, wedgeThickness / 2)
      ];
      const wedgeLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const wedgeLineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
      const wedgeLine = new THREE.Line(wedgeLineGeometry, wedgeLineMaterial);
      wedgeLine.position.copy(wedge.position);
      scene.add(wedgeLine);
    });

    // 底板 geometry
    const bottomThickness = parsedData["底板厚度"] / 100; // m
    const bottomGeometry = new THREE.BoxGeometry(topLength, bottomThickness, thickness);
    const bottomMaterial = new THREE.MeshPhongMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    // 計算底板Y座標（在所有wedge底下）

    const bottomY = (pillarPositions[0][1] - height / 2) - wedgeHeight - bottomThickness / 2;

    // 底板座標（兩塊，橫跨X方向，Z分別在±offsetZ）
    const bottomPositions = [
      [0, bottomY, -offsetZ],
      [0, bottomY, offsetZ]
    ];

    bottomPositions.forEach(pos => {
      const bottomBoard = new THREE.Mesh(bottomGeometry, bottomMaterial.clone());
      bottomBoard.position.set(...pos);
      scene.add(bottomBoard);
    });

    // 中間連接柱尺寸
    const connectorLength = spacing;      // 沿 X 軸方向（支撐柱間距）
    const connectorThickness = parsedData["連接柱寬度"] / 100; // 所有連接柱都用這個
    const connectorWidth = 0.05;       // 沿 Z 軸，寬度（固定 10cm）

    // 建立 geometry
    const connectorGeometry = new THREE.BoxGeometry(connectorLength, connectorThickness, connectorWidth);
    const connectorMaterial = new THREE.MeshPhongMaterial({
      color: 0x8e44ad, // 紫色
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    // 位置設定
    const connectorX = 0;  // X 軸居中（橫向跨兩柱）
    const idealtotalY = parsedData["測量長度"] / 100;  // 總測量長度的一半
    const connectorZ = offsetZ + thickness / 2 + connectorWidth / 2;  // 放在其中一側柱子外側（可以調整為 +0.12 或其他）                      // 居中


    //定位實際y值，中心座標Y
    const connectorPositionY = (topThickness + height - bottomThickness - wedgeHeight) / 2


    // 定義兩根的 Z 位置
    const connectorPositions = [
      [connectorX, connectorPositionY, connectorZ],  // 右側
      [connectorX, connectorPositionY, -connectorZ],  // 左側（對稱）
    ];

    // 建立兩根中間連接柱
    connectorPositions.forEach(pos => {
      const connector = new THREE.Mesh(connectorGeometry, connectorMaterial.clone());
      connector.position.set(...pos);
      scene.add(connector);
    });

    // --- 側邊連接柱尺寸 ---
    const connectorLength2 = 0.05; // 沿 X 軸（厚度）
    const connectorWidth2 = spacing; // 沿 Z 軸方向（連接兩柱）

    // --- 側邊連接柱位置 ---
    const connectorX_2 = offsetX + thickness / 2 + connectorLength2 / 2; // X 軸在柱子外側
    const connectorZ_2 = 0; // Z 軸居中
    const connectorYup = idealtotalY / 2 - topThickness - connectorThickness / 2; // 側邊板上理想值
    const connectorYdown = idealtotalY / 2 - bottomThickness - wedgeHeight - connectorThickness / 2; // 側邊板下理想值

    // --- 位置矩陣（對稱左右）---
    const connectorPositions_2 = [
      [connectorX_2, connectorPositionY, connectorZ_2],  // 前
      [-connectorX_2, connectorPositionY, connectorZ_2],  // 後
      [connectorX_2, connectorPositionY + connectorYup - 0.01, connectorZ_2],  // 右側上不貼合多這1cm
      [-connectorX_2, connectorPositionY + connectorYup - 0.01, connectorZ_2],   // 左側上
      [connectorX_2, connectorPositionY - connectorYdown + 0.01, connectorZ_2],  // 右側下不貼合多這1cm
      [-connectorX_2, connectorPositionY - connectorYdown + 0.01, connectorZ_2]  // 左側下
    ];

    // --- Geometry & Material（你也可以共用原本 material）---
    const connectorGeometry2 = new THREE.BoxGeometry(connectorLength2, connectorThickness, connectorWidth2);
    const connectorMaterial2 = new THREE.MeshPhongMaterial({
      color: 0x8e44ad,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    // --- 建立側邊連接柱 ---
    connectorPositions_2.forEach(pos => {
      const connector = new THREE.Mesh(connectorGeometry2, connectorMaterial2.clone());
      connector.position.set(...pos);
      scene.add(connector);
    });
    /////////////

    // === 斜向連接柱尺寸 ===
    const slopeWidth = parsedData["連接柱寬度"] / 100; // 柱子的厚度（沿 Y 軸）
    const slopeHeight = (topThickness + height + bottomThickness + wedgeHeight) / 2 - connectorThickness * 2;
    const slopeLength = Math.sqrt(Math.pow(spacing + cantilever * (spacing / 1.2) / 2, 2) + Math.pow(slopeHeight, 2));
    const slopeDepth = 0.05; // Z 軸深度

    // 幾何：長度為 X 軸方向，因為預設 BoxGeometry 是沿 X 軸
    const slopeGeometry = new THREE.BoxGeometry(slopeLength, slopeWidth, slopeDepth);
    const slopeMaterial = new THREE.MeshPhongMaterial({
      color: 0xe67e22,
      transparent: true,
      opacity: 0.9
    });

    // 右側的 Z 座標
    const slopez = offsetZ + thickness / 2 + connectorWidth / 2;

    // Y 高低端點(這裡要調整邏輯)
    const yHigh = connectorPositionY + slopeWidth / 2 + (slopeWidth / 2) * Math.sqrt(2);
    const yLow = connectorPositionY + (topThickness + height + bottomThickness + wedgeHeight) / 2 - (slopeWidth / 2) * Math.sqrt(2);
    const yHigh_2 = connectorPositionY - slopeWidth / 2 - (slopeWidth / 2) * Math.sqrt(2);
    const yLow_2 = connectorPositionY - (topThickness + height + bottomThickness + wedgeHeight) / 2 + (slopeWidth / 2) * Math.sqrt(2);
    // 起點與終點(邏輯不變改呼叫變數就好)
    const slopestart = new THREE.Vector3(-offsetX, yHigh, slopez);
    const slopeend = new THREE.Vector3(offsetX + cantilever * (spacing / 1.2) / 3 + connectorThickness / 2, yLow, slopez); // 必須壓過支撐柱又再往懸樑靠近所以這樣寫是對的
    const slopestart_2 = new THREE.Vector3(-offsetX, yHigh_2, slopez);
    const slopeend_2 = new THREE.Vector3(offsetX + cantilever * (spacing / 1.2) / 3 + connectorThickness / 2, yLow_2, slopez);

    // 中點與旋轉
    const mid = new THREE.Vector3().addVectors(slopestart, slopeend).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(slopeend, slopestart).normalize();
    const xAxis = new THREE.Vector3(1, 0, 0); // 預設 X 軸
    const quaternion = new THREE.Quaternion().setFromUnitVectors(xAxis, direction);
    const mid_2 = new THREE.Vector3().addVectors(slopestart_2, slopeend_2).multiplyScalar(0.5);
    const direction_2 = new THREE.Vector3().subVectors(slopeend_2, slopestart_2).normalize();
    const quaternion_2 = new THREE.Quaternion().setFromUnitVectors(xAxis, direction_2);

    // mesh 建立
    const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
    // 設定斜向連接柱的旋轉與位置 
    slope.setRotationFromQuaternion(quaternion);
    slope.position.copy(mid);
    scene.add(slope);
    // 同面第二條斜向連接柱下

    const slope_2 = new THREE.Mesh(slopeGeometry, slopeMaterial);
    slope_2.setRotationFromQuaternion(quaternion_2);
    slope_2.position.copy(mid_2);
    scene.add(slope_2);

    //----方便分隔線---//////////////

    // 左側的 Z 座標 
    const slopez2 = -offsetZ - thickness / 2 - connectorWidth / 2;

    const slopestart2 = new THREE.Vector3(offsetX, yHigh, slopez2);
    const slopeend2 = new THREE.Vector3(-offsetX - cantilever * (spacing / 1.2) / 3 - connectorThickness / 2, yLow, slopez2);
    const slopestart2_2 = new THREE.Vector3(offsetX, yHigh_2, slopez2);
    const slopeend2_2 = new THREE.Vector3(-offsetX - cantilever * (spacing / 1.2) / 3 - connectorThickness / 2, yLow_2, slopez2);

    // 中點與旋轉（第二條）
    const mid2 = new THREE.Vector3().addVectors(slopestart2, slopeend2).multiplyScalar(0.5);
    const direction2 = new THREE.Vector3().subVectors(slopeend2, slopestart2).normalize();
    const quaternion2 = new THREE.Quaternion().setFromUnitVectors(xAxis, direction2);
    const mid2_2 = new THREE.Vector3().addVectors(slopestart2_2, slopeend2_2).multiplyScalar(0.5);
    const direction2_2 = new THREE.Vector3().subVectors(slopeend2_2, slopestart2_2).normalize();
    const quaternion2_2 = new THREE.Quaternion().setFromUnitVectors(xAxis, direction2_2);
    // 第二條斜向連接柱
    const slope2 = new THREE.Mesh(slopeGeometry, slopeMaterial.clone());
    slope2.setRotationFromQuaternion(quaternion2);
    slope2.position.copy(mid2);
    scene.add(slope2);
    // 同面第二條斜向連接柱下
    const slope2_2 = new THREE.Mesh(slopeGeometry, slopeMaterial.clone());
    slope2_2.setRotationFromQuaternion(quaternion2_2);
    slope2_2.position.copy(mid2_2);
    scene.add(slope2_2);

    // 中間的斜向連接柱
    // 寬度沿用變數slopeWidth
    // 深度沿用變數slopeDepth
    const slopeHeight2 = height / 2 - slopeWidth * 1.5 - slopeWidth * Math.sqrt(2) / 2; // 高度調整為柱子高度的一半減去3/2變數長，扣掉上板的0.01
    const slopeLength2 = Math.sqrt(Math.pow(spacing - connectorThickness, 2) + Math.pow(slopeHeight2, 2));
    const slopeGeometry2 = new THREE.BoxGeometry(slopeDepth, slopeWidth, slopeLength2);
    const slopeMaterial2 = new THREE.MeshPhongMaterial({
      color: 0xe67e22,
      transparent: true,
      opacity: 0.9
    });
    const slopeX3 = offsetX + thickness / 2 + connectorWidth / 2; // x當突出的定位點，是正確的
    // Y 高低端點(不同邏輯)
    const yHigh2 = connectorPositionY + idealtotalY / 2 - topThickness - slopeWidth - (slopeWidth / 2) * Math.sqrt(2) - 0.02;
    const yLow2 = connectorPositionY + slopeWidth / 2 + (slopeWidth / 2) * Math.sqrt(2) + 0.02;
    const yHigh2_2 = connectorPositionY - idealtotalY / 2 + bottomThickness + wedgeHeight + slopeWidth + (slopeWidth / 2) * Math.sqrt(2) + 0.02;
    const yLow2_2 = connectorPositionY - slopeWidth / 2 - (slopeWidth / 2) * Math.sqrt(2) - 0.02;
    // 起點與終點(這裡改用3往後用4方便分辨象限)
    const slopestart3 = new THREE.Vector3(slopeX3, yLow2, offsetZ);
    const slopeend3 = new THREE.Vector3(slopeX3, yHigh2, -offsetZ);
    const slopestart3_2 = new THREE.Vector3(slopeX3, yLow2_2, offsetZ);
    const slopeend3_2 = new THREE.Vector3(slopeX3, yHigh2_2, -offsetZ);
    // 中點與旋轉
    const mid3 = new THREE.Vector3().addVectors(slopestart3, slopeend3).multiplyScalar(0.5);
    const direction3 = new THREE.Vector3().subVectors(slopeend3, slopestart3).normalize();
    const zAxis = new THREE.Vector3(0, 0, 1); // 換成 Z 軸為主
    const quaternion3 = new THREE.Quaternion().setFromUnitVectors(zAxis, direction3);
    const mid3_2 = new THREE.Vector3().addVectors(slopestart3_2, slopeend3_2).multiplyScalar(0.5);
    const direction3_2 = new THREE.Vector3().subVectors(slopeend3_2, slopestart3_2).normalize();
    const quaternion3_2 = new THREE.Quaternion().setFromUnitVectors(zAxis, direction3_2);
    // mesh 建立
    const slope3 = new THREE.Mesh(slopeGeometry2, slopeMaterial2);
    // 設定中間斜向連接柱的旋轉與位置
    slope3.setRotationFromQuaternion(quaternion3);
    slope3.position.copy(mid3);
    scene.add(slope3);
    // 同面第二條中間斜向連接柱下
    const slope3_2 = new THREE.Mesh(slopeGeometry2, slopeMaterial2.clone());
    slope3_2.setRotationFromQuaternion(quaternion3_2);
    slope3_2.position.copy(mid3_2);
    scene.add(slope3_2);

    // -----方便分隔線----- //
    const slopeX4 = -offsetX - thickness / 2 - connectorWidth / 2; // 中間的 x 軸位置為 0
    const slopestart4 = new THREE.Vector3(slopeX4, yLow2, -offsetZ);
    const slopeend4 = new THREE.Vector3(slopeX4, yHigh2, offsetZ);
    const slopestart4_2 = new THREE.Vector3(slopeX4, yLow2_2, -offsetZ);
    const slopeend4_2 = new THREE.Vector3(slopeX4, yHigh2_2, offsetZ);
    // 中點與旋轉（第二條）
    const mid4 = new THREE.Vector3().addVectors(slopestart4, slopeend4).multiplyScalar(0.5);
    const direction4 = new THREE.Vector3().subVectors(slopeend4, slopestart4).normalize();
    const quaternion4 = new THREE.Quaternion().setFromUnitVectors(zAxis, direction4);
    const mid4_2 = new THREE.Vector3().addVectors(slopestart4_2, slopeend4_2).multiplyScalar(0.5);
    const direction4_2 = new THREE.Vector3().subVectors(slopeend4_2, slopestart4_2).normalize();
    const quaternion4_2 = new THREE.Quaternion().setFromUnitVectors(zAxis, direction4_2);
    // 第二條斜向連接柱
    const slope4 = new THREE.Mesh(slopeGeometry2, slopeMaterial2.clone());
    slope4.setRotationFromQuaternion(quaternion4);
    slope4.position.copy(mid4);
    scene.add(slope4);
    // 同面第二條斜向連接柱下
    const slope4_2 = new THREE.Mesh(slopeGeometry2, slopeMaterial2.clone());
    slope4_2.setRotationFromQuaternion(quaternion4_2);
    slope4_2.position.copy(mid4_2);
    scene.add(slope4_2);

    // 夾板沿用變數height、沿用
    const boardHeight = 0.3; // 夾板高度
    const boardWidth = 0.02; // 夾板厚度0.02
    const boardLength = 0.15; // 夾板長度
    const boardGeometry = new THREE.BoxGeometry(boardLength, boardHeight, boardWidth);
    const boardMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513, // 要跟前面顏色有對比的顏色
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    // 夾板位置計算
    const boardOffsetY_up = connectorPositionY + idealtotalY / 2 - connectorThickness / 2 - topThickness - 0.01; // 上方夾板位置
    const boardOffsetY_down = connectorPositionY - idealtotalY / 2 + bottomThickness + connectorThickness / 2 + 0.01; // 下方夾板位置
    const boardOffsetX = (boardLength - thickness) / 2; // X 軸偏移量
    const boardPositions = [
      [-offsetX + boardOffsetX + 0.01, boardOffsetY_up, offsetZ + thickness / 2], // 上方左側
      [-offsetX + boardOffsetX + 0.01, boardOffsetY_down, offsetZ + thickness / 2], // 下方左側
      [-offsetX + boardOffsetX + 0.01, boardOffsetY_up, offsetZ - thickness / 2], // 上方左側背面
      [-offsetX + boardOffsetX + 0.01, boardOffsetY_down, offsetZ - thickness / 2], // 下方左側背面
      [offsetX - boardOffsetX - 0.01, boardOffsetY_up, offsetZ - thickness / 2], // 上方右側背面
      [offsetX - boardOffsetX - 0.01, boardOffsetY_down, offsetZ - thickness / 2], // 下方右側背面
      [offsetX - boardOffsetX - 0.01, boardOffsetY_up, -offsetZ - thickness / 2], // 上方右側
      [offsetX - boardOffsetX - 0.01, boardOffsetY_down, -offsetZ - thickness / 2],  // 下方右側
      [offsetX - boardOffsetX - 0.01, boardOffsetY_up, -offsetZ + thickness / 2], // 上方右側背面
      [offsetX - boardOffsetX - 0.01, boardOffsetY_down, -offsetZ + thickness / 2],  // 下方右側背面
      [-offsetX + boardOffsetX + 0.01, boardOffsetY_up, -offsetZ + thickness / 2], // 上方右側背面
      [-offsetX + boardOffsetX + 0.01, boardOffsetY_down, -offsetZ + thickness / 2],  // 下方右側背面
    ];

    // 建立夾板 Mesh
    boardPositions.forEach(pos => {
      const board = new THREE.Mesh(boardGeometry, boardMaterial);
      board.position.set(...pos);
      scene.add(board);
    });

    /*
    //之後可以刪除
    // 建立 XYZ 軸向輔助線（長度單位 = 公尺，可調整）
    //x,y,z:紅,綠,藍
    const axesHelper = new THREE.AxesHelper(1);  // 長度 1 公尺
    scene.add(axesHelper);
    */

    // 相機位置
    const maxSize = Math.max(spacing, height, thickness);
    camera.position.set(maxSize * 2, maxSize * 2, maxSize * 2);
    camera.lookAt(0, 0, 0);

    // 控制器
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // 渲染
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();



  } else {
    result.innerHTML = `<div class="result">缺少必要資料，無法計算！</div>`;
  }
}
