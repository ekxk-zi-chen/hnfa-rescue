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

    function calculateWall() {
      const parsedData = {
        "測量長度": parseFloat(document.getElementById("length").value),
        "頂板厚度": parseFloat(document.getElementById("top").value),
        "底板厚度": parseFloat(document.getElementById("bottom").value),
        "楔型木厚度": parseFloat(document.getElementById("wedge").value),
        "支撐柱間距": parseFloat(document.getElementById("spacing").value),
        "連接柱寬度": parseFloat(document.getElementById("connector").value),
        "止檔寬度": parseFloat(document.getElementById("stopper").value),
        "角度": parseFloat(document.getElementById("angle").value),
      };
      // 保存數據和類型
      currentCalculationData = parsedData;
      currentCalculationType = "wall";
      const result = document.getElementById("dynamicResult");

      if (Object.values(parsedData).every(val => !isNaN(val))) {
        const rad = parsedData["角度"] * Math.PI / 180;
        const rad90 = (90 - parsedData["角度"]) * Math.PI / 180;
        const shorelength = ((parsedData["測量長度"] * 2 / 3 - parsedData["頂板厚度"]) * Math.cos(rad) + parsedData["楔型木厚度"] * Math.tan(rad) * Math.sin(rad) + parsedData["楔型木厚度"] / Math.tan(rad) * Math.cos(rad)).toFixed(1);
        const headerlength = (parsedData["測量長度"] * 2 / 3 + 60 + 15).toFixed(1);
        const bottomlength = ((parsedData["測量長度"] * 2 / 3 - parsedData["頂板厚度"]) + parsedData["楔型木厚度"] + 60 + 15).toFixed(1);
        const temporaryShore = ((parsedData["測量長度"] - 75) * Math.SQRT2 - 5).toFixed(1);
        const toplength = parsedData["測量長度"] < 180 ? parsedData["測量長度"] - 10 : 180;
        let warningMessage = "";
        if (parsedData["測量長度"] < headerlength) {
          warningMessage = `<div class="warning" style="color:red; font-weight:bold; padding: 10px 0;">
            ⚠️⚠️⚠️ 計算的頂板值 > 實際測量高度 ⚠️⚠️⚠️
          </div>`;
        }

        result.innerHTML = `
          <div class="result">
            ${warningMessage}
            <div class="result-section">

              <h3>臨時支撐</h3>
              <div class="result-row"><div class="result-label">頂板</div><div class="result-value">${toplength} * 2</div></div>
              <div class="result-row"><div class="result-label">支撐柱</div><div class="result-value">${temporaryShore} * 2</div></div>
              <div class="result-row"><div class="result-label">槽式基座</div><div class="result-value">2個</div></div>
              <div class="result-row"><div class="result-label">連接柱</div><div class="result-value">120 * 4</div></div>
              <div class="result-row"><div class="result-label">止檔</div><div class="result-value">60 * 2</div></div>
              <div class="result-row"><div class="result-label">全夾板</div><div class="result-value">4片</div></div>
              <div class="result-row"><div class="result-label">大楔形木</div><div class="result-value">2組</div></div>
              <div class="result-row"><div class="result-label">鋼筋</div><div class="result-value">約10根</div></div>
              <div class="result-row"><div class="result-label">基座防滑木</div><div class="result-value">2個約30~45公分</div></div>
            </div>
            <div class="result-section">
              <h3>完整支撐</h3>
              <div class="result-row"><div class="result-label">頂板</div><div class="result-value">${headerlength} * 2</div></div>
              <div class="result-row"><div class="result-label">底板</div><div class="result-value">${bottomlength} * 2</div></div>
              <div class="result-row"><div class="result-label">支撐柱</div><div class="result-value">${shorelength} * 2</div></div>
              <div class="result-row"><div class="result-label">中點連接</div><div class="result-value">約 ${(shorelength / 2).toFixed(1)} * 4</div></div>
              <div class="result-row"><div class="result-label">止檔</div><div class="result-value">60 * 4</div></div>
              <div class="result-row"><div class="result-label">全夾板</div><div class="result-value">12片</div></div>
              <div class="result-row"><div class="result-label">大楔形木</div><div class="result-value">4組</div></div>
              <div class="result-row"><div class="result-label">鋼筋</div><div class="result-value">8~12根</div></div>
              <div class="result-row"><div class="result-label">長枕木</div><div class="result-value">1支</div></div>
            </div>
          </div>
        <!-- ...existing code... -->
        <div id="threejs-box-viewer" style="width:100%;height:350px;"></div>
        <!-- ...existing code... -->
        `;
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
        // 以上為環境設置
        const angle = parsedData["角度"] * Math.PI / 180;
        const height = parsedData["測量長度"] / 100 / 2; // m
        const spacing = parsedData["支撐柱間距"] / 100; // m
        const connectorThickness = parsedData["連接柱寬度"] / 100; // 連接柱寬度，單位 m
        const wedgeThickness = parsedData["楔型木厚度"] / 100; // 楔型木厚度，單位 m
        const thickness = 0.1; // 預設固定10Cm
        const idealLength = parsedData["測量長度"] * 2 / 3 / 100; // 2/3h，單位 m
        const stopperWidth = parsedData["止檔寬度"] / 100; // 止檔寬度，單位 m
        const topLength = parsedData["測量長度"] * 2 / 3 / 100 + 0.6 + 0.15; // 頂板長度，單位 m
        const topThickness = parsedData["頂板厚度"] / 100; // 頂板厚度，單位 m
        const bottomThickness = parsedData["底板厚度"] / 100; // 底板厚度，單位 m
        const bottomLength = parsedData["測量長度"] * 2 / 3 / 100 - topThickness + parsedData["楔型木厚度"] / 100 + 0.6 + 0.15; // 底板長度，單位 m
        const shoreLength = Math.sqrt(Math.pow(idealLength - bottomThickness + stopperWidth * Math.tan(angle), 2) + Math.pow(idealLength - topThickness + stopperWidth / Math.tan(angle), 2)); // 支撐柱長度，單位 m

        // 先建立底板
        const bottomGeometry = new THREE.BoxGeometry(bottomLength, bottomThickness, thickness);
        const bottomMaterial = new THREE.MeshPhongMaterial({
          color: 0xf1c40f, // 黃色
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide
        });

        // 原點
        const offsetX = bottomLength / 2; // 放在x0
        const offsetY = parsedData["測量長度"] / 100 * 2 / 3;
        const offsetZ = spacing / 2 - (thickness / 2); // Z軸偏移
        const bottomPositions = [
          [offsetX + topThickness, bottomThickness / 2, offsetZ], // 底板位置
          [offsetX + topThickness, bottomThickness / 2, -offsetZ], // 底板位置
        ];

        // 建立底板
        bottomPositions.forEach(pos => {
          const bottomBoard = new THREE.Mesh(bottomGeometry, bottomMaterial.clone());
          bottomBoard.position.set(...pos);
          scene.add(bottomBoard);
        });

        // 建立支撐柱 geometry
        const pillarGeometry = new THREE.BoxGeometry(topThickness, topLength, thickness);
        const pillarMaterial = new THREE.MeshPhongMaterial({
          color: 0x1abc9c, // 綠色
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide
        });
        const bottomX = thickness / 2;
        const bottomY = topLength / 2 + bottomThickness; // 底部Y軸位置
        // 柱子座標（二根）
        const pillarPositions = [
          [bottomX, bottomY - bottomThickness, offsetZ], // 第一根柱子
          [bottomX, bottomY - bottomThickness, -offsetZ] // 第二根柱子
        ];
        // 建立兩根支撐柱
        pillarPositions.forEach(pos => {
          const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
          pillar.position.set(...pos);
          scene.add(pillar);
        });
        // 建立支撐柱
        const shoreGeometry = new THREE.BoxGeometry(thickness, shoreLength, thickness - 0.0001);
        const shoreMaterial = new THREE.MeshPhongMaterial({
          color: 0x3498db, // 藍色
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        // 計算偏轉角度
        const shoreStart = new THREE.Vector3(bottomThickness, idealLength + stopperWidth * Math.tan(angle), offsetZ);
        const shoreEnd = new THREE.Vector3(idealLength + stopperWidth / Math.tan(angle), bottomThickness, offsetZ);
        const shoreDirection = new THREE.Vector3().subVectors(shoreStart, shoreEnd).normalize();
        const shoremid = new THREE.Vector3().addVectors(shoreStart, shoreEnd).multiplyScalar(0.5);
        const shoreAxis = new THREE.Vector3(0, 1, 0); // Z軸方向
        const shoreQuaternion = new THREE.Quaternion().setFromUnitVectors(shoreAxis, shoreDirection);
        // 支撐柱位置
        const shorePositionsX = (bottomThickness + idealLength + stopperWidth / Math.tan(angle)) / 2; // X軸位置
        const shorePositionsY = (bottomThickness + idealLength + stopperWidth * Math.tan(angle)) / 2; // Y軸位置
        const shorePositions = [
          [shorePositionsX - thickness / 2 * Math.sin(angle), shorePositionsY - thickness / 2 * Math.cos(angle), offsetZ], // 第一根支撐柱
          [shorePositionsX - thickness / 2 * Math.sin(angle), shorePositionsY - thickness / 2 * Math.cos(angle), -offsetZ] // 第二根支撐柱
        ];

        // 建立支撐柱
        shorePositions.forEach(pos => {
          const shore = new THREE.Mesh(shoreGeometry, shoreMaterial.clone());
          shore.position.set(...pos);
          shore.quaternion.copy(shoreQuaternion); // 設置旋轉
          scene.add(shore);
        });

        // 建立止黨
        const stopperGeometry = new THREE.BoxGeometry(0.6, stopperWidth, thickness);
        const stopperMaterial = new THREE.MeshPhongMaterial({
          color: 0xe67e22, // 橙色
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide
        });
        // 止黨位置
        const stopperX = shoreEnd.x + stopperGeometry.parameters.width / 2 - stopperWidth / Math.tan(angle) + wedgeThickness; // 止黨X軸位置
        const stopperY = bottomThickness + stopperGeometry.parameters.height / 2; // 止黨Y軸位置
        const stopperPositions = [
          [stopperX, stopperY, offsetZ], // 正面下方
          [stopperX, stopperY, -offsetZ], // 背面下方
        ];
        // 建立止黨
        stopperPositions.forEach(pos => {
          const stopper = new THREE.Mesh(stopperGeometry, stopperMaterial.clone());
          stopper.position.set(...pos);
          scene.add(stopper);
        });

        const stopperGeometry_2 = new THREE.BoxGeometry(stopperWidth, 0.6, thickness);
        const stopperMaterial_2 = new THREE.MeshPhongMaterial({
          color: 0xe67e22, // 橙色
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide
        });
        // 止黨位置
        const stopperX_2 = shoreStart.x + stopperGeometry_2.parameters.width / 2; // 止黨X軸位置
        const stopperY_2 = shoreStart.y + stopperGeometry_2.parameters.height / 2 - stopperWidth * Math.tan(angle); // 止黨Y軸位置
        const stopperPositions_2 = [
          [stopperX_2, stopperY_2, offsetZ], // 正面下方
          [stopperX_2, stopperY_2, -offsetZ], // 背面下方
        ];
        // 建立止黨
        stopperPositions_2.forEach(pos => {
          const stopper = new THREE.Mesh(stopperGeometry_2, stopperMaterial_2.clone());
          stopper.position.set(...pos);
          scene.add(stopper);
        });

        // 建立wedge
        const wedgeGeometry = new THREE.BoxGeometry(wedgeThickness, thickness, 0.45);
        const wedgeMaterial = new THREE.MeshPhongMaterial({
          color: 0x9b59b6, // 紫色
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide
        });
        // 楔型木位置
        const wedgeX = stopperX - wedgeThickness / 2 - stopperGeometry.parameters.width / 2; // 楔型木X軸位置
        const wedgeY = bottomThickness + wedgeThickness / 2; // 楔型木Y軸位置
        const wedgePositions = [
          [wedgeX, wedgeY, offsetZ], // 正面下方
          [wedgeX, wedgeY, -offsetZ], // 背面下方
        ];
        // 建立楔型木
        wedgePositions.forEach(pos => {
          const wedge = new THREE.Mesh(wedgeGeometry, wedgeMaterial.clone());
          wedge.position.set(...pos);
          scene.add(wedge);

          const halfHeight = wedgeGeometry.parameters.height / 2;
          const halfDepth = wedgeGeometry.parameters.depth / 2;
          const fixedX = wedgeGeometry.parameters.width / 2 + 0.001;

          const sideLines = [
            // 第一條：右側 (+X) 對角線
            [
              new THREE.Vector3(fixedX, -halfHeight, -halfDepth),
              new THREE.Vector3(fixedX, halfHeight, halfDepth),
            ],
            // 第二條：左側 (-X) 對角線
            [
              new THREE.Vector3(-fixedX, -halfHeight, -halfDepth),
              new THREE.Vector3(-fixedX, halfHeight, halfDepth),
            ],

          ];

          sideLines.forEach(points => {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4b0082 }); //紅色
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.position.set(...pos); // 對齊 wedge
            scene.add(line);
          });


        });

        // 全夾板
        const fullBoardGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.02);
        const fullBoardMaterial = new THREE.MeshPhongMaterial({
          color: 0xcccccc, // 淺灰色
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        const fullboardX = fullBoardGeometry.parameters.width / 2; // 全夾板X軸位置
        const fullboardY = fullBoardGeometry.parameters.height / 2; // 全夾
        const fullboardZ = spacing / 2 + fullBoardGeometry.parameters.depth / 2; // 全夾板Z軸位置
        // 全夾板位置
        const fullBoardPositions = [
          [fullboardX + 0.01, fullboardY + 0.01, fullboardZ], // 第一片
          [fullboardX + 0.01, idealLength - fullBoardGeometry.parameters.height / 6, fullboardZ], // 第二片
          [wedgeX - wedgeThickness / 2 - 0.01 - fullboardX, fullboardY + 0.01, fullboardZ], // 第三片
          [fullboardX + 0.01, fullboardY + 0.01, fullboardZ - thickness - fullBoardGeometry.parameters.depth], // 裡面第一片
          [fullboardX + 0.01, idealLength - fullBoardGeometry.parameters.height / 6, fullboardZ - thickness - fullBoardGeometry.parameters.depth], // 裡面第二片
          [wedgeX - wedgeThickness / 2 - 0.01 - fullboardX, fullboardY + 0.01, fullboardZ - thickness - fullBoardGeometry.parameters.depth], // 裡面第三片
          [fullboardX + 0.01, fullboardY + 0.01, -fullboardZ], // 背面第一片
          [fullboardX + 0.01, idealLength - fullBoardGeometry.parameters.height / 6, -fullboardZ], // 背面第二片
          [wedgeX - wedgeThickness / 2 - 0.01 - fullboardX, fullboardY + 0.01, -fullboardZ + thickness + fullBoardGeometry.parameters.depth], // 背面第三片
          [fullboardX + 0.01, fullboardY + 0.01, -fullboardZ + thickness + fullBoardGeometry.parameters.depth], // 背面裡面第一片
          [fullboardX + 0.01, idealLength - fullBoardGeometry.parameters.height / 6, -fullboardZ + thickness + fullBoardGeometry.parameters.depth], // 背面裡面第二片
          [wedgeX - wedgeThickness / 2 - 0.01 - fullboardX, fullboardY + 0.01, -fullboardZ], // 背面裡面第三片
        ];
        // 建立全夾板
        fullBoardPositions.forEach(pos => {
          const fullBoard = new THREE.Mesh(fullBoardGeometry, fullBoardMaterial.clone());
          fullBoard.position.set(...pos);
          scene.add(fullBoard);
        });

        // 建立中點連接柱
        const connectorAngle = 45 * Math.PI / 180; // 45度角
        const connectorGeometry = new THREE.BoxGeometry(shoreLength / 2 + thickness / 6 * Math.SQRT2, connectorThickness, thickness / 2);
        const connectorMaterial = new THREE.MeshPhongMaterial({
          color: 0x8e44ad, // 紫色
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });

        // 中點連接柱位置
        const connectorPositionZ = spacing / 2 + thickness / 2 / 2 + 0.02; // Z軸位置
        const connectorStart = new THREE.Vector3(connectorThickness / 2 * Math.cos(connectorAngle), connectorThickness * Math.sin(connectorAngle) / 2, connectorPositionZ);
        const connectorEnd = new THREE.Vector3(connectorThickness / 2 * Math.cos(connectorAngle) + (shoreLength / 2 + thickness) * Math.sin(connectorAngle), connectorThickness / 2 * Math.sin(connectorAngle) + (shoreLength / 2 + thickness) * Math.cos(connectorAngle), connectorPositionZ);
        const connectorDirection = new THREE.Vector3().subVectors(connectorEnd, connectorStart).normalize();
        const connectorAxis = new THREE.Vector3(1, 0, 0);
        const connectorQuaternion = new THREE.Quaternion().setFromUnitVectors(connectorAxis, connectorDirection);
        // 中點連接柱位置
        const connectorMidX = (connectorStart.x + connectorEnd.x) / 2; // X軸位置
        const connectorMidY = (connectorStart.y + connectorEnd.y) / 2; // Y軸位置
        const connectorPositions = [
          [connectorMidX, connectorMidY, connectorPositionZ], // 第一根中點連接柱
          [connectorMidX, connectorMidY, -connectorPositionZ],// 第二根中點連接柱
          [connectorMidX, connectorMidY, connectorPositionZ - thickness - 0.02 * 2 - thickness / 2], // 第三根中點連接柱
          [connectorMidX, connectorMidY, -connectorPositionZ + thickness + 0.02 * 2 + thickness / 2] // 第四根中點連接柱, 
        ];
        // 建立中點連接柱
        connectorPositions.forEach(pos => {
          const connector = new THREE.Mesh(connectorGeometry, connectorMaterial.clone());
          connector.position.set(...pos);
          connector.quaternion.copy(connectorQuaternion); // 設置旋轉
          scene.add(connector);
        });


        // 建立 中間的連結柱    
        const connectorGeometryMid = new THREE.BoxGeometry(thickness / 2, connectorThickness, spacing);
        const connectorMaterialMid = new THREE.MeshPhongMaterial({
          color: 0xff9999, // 淺紅色
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        // 中間連結柱位置
        const connectorPosition = [
          [bottomThickness + 0.3 + thickness / 2 / 2 * Math.cos(angle), idealLength + stopperWidth * Math.tan(angle) - 0.3 + thickness / 2 / 2 * Math.cos(angle), 0], // 第一根中間連結柱
          [idealLength + stopperWidth / Math.tan(angle) - 0.3 + thickness / 2 * Math.cos(angle), bottomThickness + 0.3, 0] // 第二根中間連結柱
        ];
        const connectorMidAxis = new THREE.Vector3(0, 0, 1); // Y軸方向
        const connectorMidQuaternion = new THREE.Quaternion().setFromAxisAngle(connectorMidAxis, angle); // 設置旋轉
        // 建立中間連結柱
        connectorPosition.forEach(pos => {
          const connectorMid = new THREE.Mesh(connectorGeometryMid, connectorMaterialMid.clone());
          connectorMid.position.set(...pos);
          connectorMid.quaternion.copy(connectorMidQuaternion); // 設置旋轉
          scene.add(connectorMid);
        });



        // 建立中間傾斜的連接柱
        const connecotrMidslopeX1 = bottomThickness + 0.3 + thickness / 2 / 2 * Math.cos(angle) + thickness * 3 / 2 * Math.cos(angle);
        const connecotrMidslopeX2 = idealLength + stopperWidth * Math.tan(angle) - 0.3 + thickness / 2 / 2 * Math.cos(angle) - thickness * 3 / 2 * Math.cos(angle);
        const connecotrMidslopeY1 = idealLength + stopperWidth * Math.tan(angle) - 0.3 + thickness / 2 / 2 * Math.sin(angle) - thickness * 3 / 2 * Math.sin(angle);
        const connecotrMidslopeY2 = bottomThickness + 0.3 + thickness / 2 / 2 * Math.sin(angle) + thickness * 3 / 2 * Math.sin(angle);
        const connecotrMidslopeLength = Math.sqrt(Math.pow(connecotrMidslopeX2 - connecotrMidslopeX1, 2) + Math.pow(connecotrMidslopeY2 - connecotrMidslopeY1, 2) + Math.pow(spacing, 2));
        // 建立中間傾斜連接柱
        const connectorTiltedGeometry = new THREE.BoxGeometry(thickness / 2, connectorThickness, connecotrMidslopeLength);
        const connectorTiltedMaterial = new THREE.MeshPhongMaterial({
          color: 0xff0000, // 紅色
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });

        // 中間傾斜連接柱位置
        const connectorTiltedStart = new THREE.Vector3(connecotrMidslopeX1, connecotrMidslopeY1, spacing / 2);
        const connectorTiltedEnd = new THREE.Vector3(connecotrMidslopeX2, connecotrMidslopeY2, -spacing / 2);
        const connectorTiltedAxis = new THREE.Vector3(0, 0, 1);
        const connectorTiltedQuaternion = new THREE.Quaternion().setFromAxisAngle(connectorTiltedAxis, angle);
        const connectorTiltedDirection = new THREE.Vector3().subVectors(connectorTiltedStart, connectorTiltedEnd).normalize();
        const connectorTiltedRotation = new THREE.Quaternion().setFromUnitVectors(connectorTiltedAxis, connectorTiltedDirection);
        const finalQuaternion = connectorTiltedRotation.multiply(connectorTiltedQuaternion);
        // 中間傾斜連接柱位置

        const connectorTiltedMidX = (connectorTiltedStart.x + connectorTiltedEnd.x) / 2; // X軸位置
        const connectorTiltedMidY = (connectorTiltedStart.y + connectorTiltedEnd.y) / 2; // Y軸位置
        const connectorTiltedPositions = [
          [connectorTiltedMidX, connectorTiltedMidY, 0], // 第一根中間傾斜連接柱
        ];
        // 建立中間傾斜連接柱
        connectorTiltedPositions.forEach(pos => {
          const connectorTilted = new THREE.Mesh(connectorTiltedGeometry, connectorTiltedMaterial.clone());
          connectorTilted.position.set(...pos);
          connectorTilted.quaternion.copy(finalQuaternion); // 設置旋轉
          scene.add(connectorTilted);
        });

        // 建立中間傾斜的連接柱
        const connecotrMidslopeX1_2 = bottomThickness + 0.3 + thickness / 2 / 2 * Math.cos(angle) + thickness / 2 * Math.cos(angle);
        const connecotrMidslopeX2_2 = idealLength + stopperWidth * Math.tan(angle) - 0.3 + thickness / 2 / 2 * Math.cos(angle) + thickness / 2 * Math.cos(angle);
        const connecotrMidslopeY1_2 = idealLength + stopperWidth * Math.tan(angle) - 0.3 + thickness / 2 / 2 * Math.sin(angle) + thickness / 2 * Math.cos(angle);
        const connecotrMidslopeY2_2 = bottomThickness + 0.3 + thickness / 2 / 2 * Math.cos(angle) + thickness / 2 * Math.cos(angle);
        const connecotrMidslopeLength_2 = Math.sqrt(Math.pow(connecotrMidslopeX2_2 - connecotrMidslopeX1_2, 2) + Math.pow(connecotrMidslopeY2_2 - connecotrMidslopeY1_2, 2) + Math.pow(spacing, 2));
        const connectorTiltedGeometry_2 = new THREE.BoxGeometry(thickness / 2, connectorThickness, connecotrMidslopeLength_2);
        const connectorTiltedMaterial_2 = new THREE.MeshPhongMaterial({
          color: 0xff0000, // 紅色
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });

        const connectorTiltedStart_2 = new THREE.Vector3(connecotrMidslopeX2_2, connecotrMidslopeY2_2, spacing / 2 - thickness);
        const connectorTiltedEnd_2 = new THREE.Vector3(connecotrMidslopeX1_2, connecotrMidslopeY1_2, -spacing / 2 + thickness);
        const connectorTiltedAxis_2 = new THREE.Vector3(0, 0, 1);
        const connectorTiltedQuaternion_2 = new THREE.Quaternion().setFromAxisAngle(connectorTiltedAxis_2, angle);
        const connectorTiltedDirection_2 = new THREE.Vector3().subVectors(connectorTiltedStart_2, connectorTiltedEnd_2).normalize();
        const connectorTiltedRotation_2 = new THREE.Quaternion().setFromUnitVectors(connectorTiltedAxis_2, connectorTiltedDirection_2);
        const finalQuaternion_2 = connectorTiltedRotation_2.multiply(connectorTiltedQuaternion_2);
        // 中間傾斜連接柱位置

        const connectorTiltedMidX_2 = (connectorTiltedStart_2.x + connectorTiltedEnd_2.x) / 2; // X軸位置
        const connectorTiltedMidY_2 = (connectorTiltedStart_2.y + connectorTiltedEnd_2.y) / 2; // Y軸位置
        const connectorTiltedPositions_2 = [
          [connectorTiltedMidX_2, connectorTiltedMidY_2, 0], // 第一根中間傾斜連接柱
        ];
        // 建立中間傾斜連接柱
        connectorTiltedPositions_2.forEach(pos => {
          const connectorTilted = new THREE.Mesh(connectorTiltedGeometry_2, connectorTiltedMaterial_2.clone());
          connectorTilted.position.set(...pos);
          connectorTilted.quaternion.copy(finalQuaternion_2); // 設置旋轉
          scene.add(connectorTilted);
        });



        //之後可以刪除
        // 建立 XYZ 軸向輔助線（長度單位 = 公尺，可調整）
        //x,y,z:紅,綠,藍
        /*
        const axesHelper = new THREE.AxesHelper(1);  // 長度 1 公尺
        scene.add(axesHelper);
        */
        // 以下為環境設置
        // 相機位置
        const maxSize = Math.max(offsetX, height, spacing);
        camera.position.set(maxSize * 2, maxSize * 2, maxSize * 2);
        camera.lookAt(offsetX * 2, height, spacing);

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


    function calculateFloor() {
      const parsedData = {
        "測量長度": parseFloat(document.getElementById("length").value),
        "頂板厚度": parseFloat(document.getElementById("top").value),
        "底板厚度": parseFloat(document.getElementById("bottom").value),
        "支撐柱間距": parseFloat(document.getElementById("spacing").value),
        "連接柱寬度": parseFloat(document.getElementById("connector").value),
        "止檔寬度": parseFloat(document.getElementById("stopper").value),
        "角度": parseFloat(document.getElementById("angle").value),
      };

      currentCalculationData = parsedData;
      currentCalculationType = "floor";
      const result = document.getElementById("dynamicResult");

      // 檢查輸入資料是否完整
      if (Object.values(parsedData).every(val => !isNaN(val))) {
        const rad = parsedData["角度"] * Math.PI / 180;

        const temporaryshorelenth = (parsedData["測量長度"] + 5 - parsedData["頂板厚度"] - (parsedData["底板厚度"] / Math.cos(rad)) - 1).toFixed(1);
        const shorelenth = (parsedData["測量長度"] - parsedData["頂板厚度"] - (parsedData["底板厚度"] / Math.cos(rad)) + 1).toFixed(1);
        const shortshorelenth = (parsedData["測量長度"] - parsedData["頂板厚度"] - (parsedData["底板厚度"] / Math.cos(rad)) - ((parsedData["支撐柱間距"] - 10) * Math.tan(rad)) + 1).toFixed(1);
        const bottomlenth = (parsedData["支撐柱間距"] / Math.cos(rad) + 30 + 30 + 45).toFixed(1);

        result.innerHTML = `
          <div class="result">
            <div class="result-section">
              <h3>臨時支撐</h3>
              <div class="result-row"><div class="result-label">頂板</div><div class="result-value">90 * 2</div></div>
              <div class="result-row"><div class="result-label">支撐柱</div><div class="result-value">${temporaryshorelenth} * 2</div></div>
              <div class="result-row"><div class="result-label">槽式基座</div><div class="result-value">2個</div></div>
              <div class="result-row"><div class="result-label">全夾板</div><div class="result-value">2片</div></div>
              <div class="result-row"><div class="result-label">鋼筋</div><div class="result-value">4根</div></div>
            </div>

            <div class="result-section">
              <h3>完整支撐</h3>
              <div class="result-row"><div class="result-label">頂板</div><div class="result-value">180 * 2</div></div>
              <div class="result-row"><div class="result-label">底板</div><div class="result-value">${bottomlenth} * 2</div></div>
              <div class="result-row"><div class="result-label">長支撐柱</div><div class="result-value">${shorelenth} * 2</div></div>
              <div class="result-row"><div class="result-label">短支撐柱</div><div class="result-value">${shortshorelenth} * 2</div></div>
              <div class="result-row"><div class="result-label">水平連接</div><div class="result-value">${parsedData["支撐柱間距"]} * 4</div></div>
              <div class="result-row"><div class="result-label">止檔</div><div class="result-value">4個</div></div>
              <div class="result-row"><div class="result-label">半夾板</div><div class="result-value">8片</div></div>
              <div class="result-row"><div class="result-label">鋼筋</div><div class="result-value">4根</div></div>
              <div class="result-row"><div class="result-label">對角連接柱</div><div class="result-value">現場量測 * 4</div></div>
              <div class="result-row"><div class="result-label">側邊連接柱</div><div class="result-value">現場量測 * 4</div></div>
            </div>
          </div>
          <!-- ...existing code... -->
          <div id="threejs-box-viewer" style="width:100%;height:350px;"></div>
          <!-- ...existing code... -->
        `;



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
        // 以上為環境設置
        // 宣告設定變數
        const spacing = parsedData["支撐柱間距"] / 100; // m
        const totalLength = parsedData["測量長度"] / 100; // m
        const shoreLength = totalLength - parsedData["頂板厚度"] / 100 - (parsedData["底板厚度"] / Math.cos(rad)) / 100; // m
        const shortshoreLength = (shoreLength / Math.tan(rad) - (spacing - 0.1)) * Math.tan(rad);// m
        const bottomLength = (parsedData["支撐柱間距"] / Math.cos(rad) + 30 + 30 + 45) / 100; // m
        const topLength = 1.8 * spacing / 1.2; // 頂板長度，假設 1.8 m
        const thickness = 0.1; // 10公分
        const cantilever = 0.3 * spacing / 1.2; // 30公分懸樑
        const topThickness = parsedData["頂板厚度"] / 100; // m
        const bottomThickness = parsedData["底板厚度"] / 100; // m
        const stopperWidth = parsedData["止檔寬度"] / 100; // m
        const angle = parsedData["角度"] * Math.PI / 180; // 轉換為弧度

        const height = totalLength / 2; // 支撐柱高度，假設
        // 設定柱子間距
        const offsetX = bottomLength / 2;

        // 柱子Z軸間距
        const offsetZ = spacing / 2 - (thickness / 2);

        // 歸零Y軸
        const offsetY = bottomThickness / 2;


        //底板
        const bottomWidth = 0.1; // 固定厚度 10cm
        const bottomGeometry = new THREE.BoxGeometry(bottomLength, bottomThickness, bottomWidth);

        const bottomMaterial = new THREE.MeshPhongMaterial({
          color: 0xf1c40f, // 黃色
          transparent: false, //不透明
          opacity: 1,
          side: THREE.DoubleSide,

        });
        // 底板位置
        const bottomPositions = [
          [0, offsetY, offsetZ], // 前
          [0, offsetY, -offsetZ] // 後
        ];


        bottomPositions.forEach(position => {
          const bottomMesh = new THREE.Mesh(bottomGeometry, bottomMaterial);
          bottomMesh.position.set(...position);
          scene.add(bottomMesh);
        });

        //支撐柱short 
        const shortpillarGeometry = new THREE.BoxGeometry(thickness, shortshoreLength, thickness - 0.0001); //  // 減少厚度以避免深度衝突
        const shortpillarMaterial = new THREE.MeshPhongMaterial({
          color: 0x3498db, // 藍色
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,

        });
        // 支撐柱
        const pillarGeometry = new THREE.BoxGeometry(thickness, shoreLength, thickness - 0.0001); // 減少厚度以避免深度衝突
        const pillarMaterial = new THREE.MeshPhongMaterial({
          color: 0x2ecc71, // 綠色
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,

        });
        // 計算支撐柱位置
        const shortPillarX = -offsetX + cantilever + thickness * (1 / Math.cos(angle) - Math.cos(angle) / 2); // 短X軸底板位置
        const shortPillarX_2 = shortPillarX - shortshoreLength * Math.sin(angle); // 短x軸頂板位置
        const shortPillarY = offsetY + bottomThickness / 2 - thickness / 2 * Math.sin(angle); // 短y軸位置
        const shortPillarY_2 = shortPillarY + shortshoreLength * Math.cos(angle); // 短y軸頂板位置
        const shortPillarstart = new THREE.Vector3(shortPillarX, shortPillarY, offsetZ);
        const shortPillarend = new THREE.Vector3(shortPillarX_2, shortPillarY_2, offsetZ);
        const shortPillarXmid = (shortPillarX + shortPillarX_2) / 2; // 短支撐柱中點X
        const shortPillarYmid = (shortPillarY + shortPillarY_2) / 2; // 短支撐柱中點Y
        // 計算短支撐柱的中點和旋轉
        const shortPillarmid = new THREE.Vector3(shortPillarXmid, shortPillarYmid, offsetZ);
        const shortPillarxAxis = new THREE.Vector3(0, 0, 1); // 預設 z 軸
        const shortPillarquaternion = new THREE.Quaternion().setFromAxisAngle(shortPillarxAxis, angle);

        const shortPillarPositions = [
          [shortPillarXmid, shortPillarYmid, offsetZ], // 前右
          [shortPillarXmid, shortPillarYmid, -offsetZ] // 後右
        ];
        // 建立短支撐柱 Mesh
        shortPillarPositions.forEach(pos => {
          const shortPillar = new THREE.Mesh(shortpillarGeometry, shortpillarMaterial.clone());
          shortPillar.position.set(...pos);
          shortPillar.setRotationFromQuaternion(shortPillarquaternion);
          scene.add(shortPillar);
        });


        // 長軸
        const PillarX = shortPillarX + (spacing - 0.1) / Math.cos(angle); // 長底板x軸位置
        const PillarX_2 = PillarX - shoreLength * Math.sin(angle); // 長頂板x軸位置
        const PillarY = offsetY + bottomThickness / 2 - thickness / 2 * Math.sin(angle); // 長y軸位置
        const PillarY_2 = PillarY + shoreLength * Math.cos(angle); // 長y軸頂板位置
        const Pillarstart = new THREE.Vector3(PillarX, PillarY, offsetZ);
        const Pillarend = new THREE.Vector3(PillarX_2, PillarY_2, offsetZ);
        const PillarXmid = (PillarX + PillarX_2) / 2; // 長支撐柱中點X
        const PillarYmid = (PillarY + PillarY_2) / 2; // 長支撐柱中點Y
        // 計算長支撐柱的中點和旋轉
        const Pillarmid = new THREE.Vector3(PillarXmid, PillarYmid, offsetZ);
        const PillarxAxis = new THREE.Vector3(0, 0, 1); // 預設 z 軸
        const Pillarquaternion = new THREE.Quaternion().setFromAxisAngle(PillarxAxis, angle);
        // 計算支撐柱位置
        const pillarPositions = [
          [PillarXmid, PillarYmid, offsetZ], // 前右
          [PillarXmid, PillarYmid, -offsetZ] // 後右
        ];
        // 建立支撐柱 Mesh
        pillarPositions.forEach(pos => {
          const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
          pillar.position.set(...pos);
          pillar.setRotationFromQuaternion(Pillarquaternion);
          scene.add(pillar);
        });


        // --- 頂板 geometry ---
        const topGeometry = new THREE.BoxGeometry(topLength, topThickness, thickness);
        const topMaterial = new THREE.MeshPhongMaterial({
          color: 0xe74c3c, // 紅色
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        // 頂板位置計算
        const topX = (shortPillarX_2 + PillarX_2) / 2 - topThickness / 2 * Math.sin(angle); // 頂板X軸位置
        const topY = (shortPillarY_2 + PillarY_2) / 2 + topThickness / 2 * Math.cos(angle);  // 頂板Y軸位置

        const topPositions = [
          [topX, topY, offsetZ], // 前右
          [topX, topY, -offsetZ] // 後右
        ];
        // 建立頂板 Mesh
        topPositions.forEach(pos => {
          const topMesh = new THREE.Mesh(topGeometry, topMaterial.clone());
          topMesh.position.set(...pos);
          topMesh.setRotationFromQuaternion(Pillarquaternion);
          scene.add(topMesh);
        });

        // 建立側邊連接柱
        const connectorWidth = parsedData["連接柱寬度"] / 100; // m
        const connectorThickness = 0.05; // 假設連接柱厚度 
        const connectorLength = Math.sqrt(Math.pow((PillarX - shortPillarX_2), 2) + Math.pow((shortPillarY_2), 2)) + thickness * Math.sqrt(2);
        const connectorGeometry = new THREE.BoxGeometry(connectorLength, connectorWidth, connectorThickness);
        const connectorMaterial = new THREE.MeshPhongMaterial({
          color: 0x8e44ad, // 紫色
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        // 計算連接柱位置

        const connectorPositionY = (PillarY + shortPillarY_2) / 2; // 連接柱Y軸位置
        const connectorPositionX = (PillarX + shortPillarX_2) / 2; // 連接柱X軸位置
        const connectorPositionZ = offsetZ + thickness / 2 + connectorThickness / 2;

        // 連接柱數值
        const connectorStart = new THREE.Vector3(shortPillarX_2 - thickness - 0.01, shortPillarY_2, connectorPositionZ);
        const connectorEnd = new THREE.Vector3(PillarX + thickness, PillarY + 0.01, connectorPositionZ);
        const connectorMid = new THREE.Vector3().addVectors(connectorStart, connectorEnd).multiplyScalar(0.5);
        const connectorDirection = new THREE.Vector3().subVectors(connectorStart, connectorEnd).normalize();
        const connectorAxis = new THREE.Vector3(1, 0, 0); // 預設 z 軸
        const connectorquaternion = new THREE.Quaternion().setFromUnitVectors(connectorAxis, connectorDirection);
        /*
        //轉換角度範例
        const connectorangle = connectorAxis.angleTo(connectorDirection) * (180 / Math.PI); // 回傳值為弧度
        console.log(connectorangle)
        */
        const connectorPositions = [
          [connectorPositionX, connectorPositionY, connectorPositionZ], // 前右
          [connectorPositionX, connectorPositionY, -connectorPositionZ] // 後右
        ];
        // 建立連接柱 Mesh
        connectorPositions.forEach(pos => {
          const connector = new THREE.Mesh(connectorGeometry, connectorMaterial.clone());
          connector.position.set(...pos);
          connector.setRotationFromQuaternion(connectorquaternion);
          scene.add(connector);
        });

        //另一方向側邊連接柱
        const connectorPositionY_bk = (PillarY_2 + shortPillarY) / 2; // 連接柱Y軸位置
        const connectorPositionX_bk = (PillarX_2 + shortPillarX) / 2; // 連接柱X軸位置
        const connectorPositionZ_bk = offsetZ - thickness / 2 - connectorThickness / 2;
        const connectorLength_bk = Math.sqrt(Math.pow((PillarX_2 - shortPillarX), 2) + Math.pow((PillarY_2), 2)) + (connectorWidth - thickness) / 2 * Math.sqrt(2);
        const connectorGeometry_bk = new THREE.BoxGeometry(connectorLength_bk, connectorWidth, connectorThickness);
        const connectorMaterial_bk = new THREE.MeshPhongMaterial({
          color: 0x8e44ad, // 紫色
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        // 後面連接柱數值
        const connectorStart_bk = new THREE.Vector3(PillarX_2 + 0.01, PillarY_2, connectorPositionZ_bk);
        const connectorEnd_bk = new THREE.Vector3(shortPillarX, shortPillarY + 0.01, connectorPositionZ_bk);
        const connectorMid_bk = new THREE.Vector3().addVectors(connectorStart_bk, connectorEnd_bk).multiplyScalar(0.5);
        const connectorDirection_bk = new THREE.Vector3().subVectors(connectorStart_bk, connectorEnd_bk).normalize();
        const connectorAxis_bk = new THREE.Vector3(1, 0, 0); // 預設 z 軸
        const connectorquaternion_bk = new THREE.Quaternion().setFromUnitVectors(connectorAxis_bk, connectorDirection_bk);

        const connectorPositions_bk = [
          [connectorPositionX_bk, connectorPositionY_bk, connectorPositionZ_bk], // 前右
          [connectorPositionX_bk, connectorPositionY_bk, -connectorPositionZ_bk] // 後右
        ];

        // 建立後面連接柱 Mesh
        connectorPositions_bk.forEach(pos => {
          const connector = new THREE.Mesh(connectorGeometry_bk, connectorMaterial_bk.clone());
          connector.position.set(...pos);
          connector.setRotationFromQuaternion(connectorquaternion_bk);
          scene.add(connector);
        });




        // 建立止檔
        const stopperGeometry = new THREE.BoxGeometry(0.45, stopperWidth, thickness);
        const stopperMaterial = new THREE.MeshPhongMaterial({
          color: 0x95a5a6, // 灰色
          transparent: false,
          opacity: 1,
          side: THREE.DoubleSide
        });
        // 止檔位置計算
        const stopperY = offsetY + bottomThickness / 2 + stopperWidth / 2;
        const stopperX = -offsetX + cantilever + thickness / Math.cos(angle) + 0.45 / 2 - stopperWidth * Math.tan(angle); // 止檔X軸位置
        const stopperX_2 = stopperX + (spacing - 0.1) / Math.cos(angle);
        const stopperPositions = [
          [stopperX, stopperY, offsetZ], // 前左
          [stopperX, stopperY, -offsetZ],// 前右
          [stopperX_2, stopperY, offsetZ], // 後左
          [stopperX_2, stopperY, -offsetZ] // 後右
        ];
        // 建立止檔 Mesh
        stopperPositions.forEach(pos => {
          const stopperMesh = new THREE.Mesh(stopperGeometry, stopperMaterial.clone());
          stopperMesh.position.set(...pos);
          scene.add(stopperMesh);
        });

        // 建立中間的水平連接柱
        const connectorMidGeometry = new THREE.BoxGeometry(connectorThickness, connectorWidth, spacing);
        const connectorMidMaterial = new THREE.MeshPhongMaterial({
          color: 0xe67e22, // 橙色
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        // 中間連接柱位置計算
        const connectormidY = PillarY + thickness / 2 * Math.sin(angle) + connectorThickness / 2 * Math.sin(angle) + (stopperWidth / Math.cos(angle) + 0.01) * Math.cos(angle); // 中間連接柱Y軸位置
        const connectormidY_2 = connectormidY + connectorWidth * Math.cos(angle); // 中間連接柱Y軸頂板位置
        const connectormidX = PillarX + thickness / 2 * Math.cos(angle) + connectorThickness / 2 * Math.cos(angle) - (stopperWidth / Math.cos(angle) + 0.01) * Math.sin(angle); // 連接柱X軸位置
        const connectormidX_2 = connectormidX - connectorWidth * Math.sin(angle); // 連接柱X軸頂板位置
        //PillarX + thickness/2 * Math.cos(angle) + connectorThickness/2 * Math.cos(angle) - (stopperWidth / Math.cos(angle)) 此為中間夾板與底板交界點
        //(stopperWidth / Math.cos(angle))單位為長度
        const connectmidXmid = (connectormidX + connectormidX_2) / 2; // 中間連接柱中點X軸位置
        const connectormidYmid = (connectormidY + connectormidY_2) / 2; // 中間連接柱中點Y軸位置
        //上面的中間連接柱位置
        const connectormidY2 = PillarY + thickness / 2 * Math.sin(angle) + connectorThickness / 2 * Math.sin(angle) + (shoreLength - connectorWidth - 0.01) * Math.cos(angle); // 中間連接柱Z軸位置
        const connectormidY2_2 = connectormidY2 + connectorWidth * Math.cos(angle); // 中間連接柱Z軸頂板位置
        const connectormidX2 = PillarX + thickness / 2 * Math.cos(angle) + connectorThickness / 2 * Math.cos(angle) - (shoreLength - connectorWidth - 0.01) * Math.sin(angle); // 連接柱Z軸位置
        const connectormidX2_2 = connectormidX2 - connectorWidth * Math.sin(angle); // 連接柱Z軸頂板位置
        const connectmidXmid_2 = (connectormidX2 + connectormidX2_2) / 2; // 中間連接柱中點Z軸位置
        const connectormidYmid_2 = (connectormidY2 + connectormidY2_2) / 2; // 中間連接柱中點Z軸位置
        // 反面中間連接柱位置計算
        const connectormidY_bk = shortPillarY + thickness / 2 * Math.sin(angle) + connectorThickness / 2 * Math.sin(angle) + (stopperWidth / Math.cos(angle) + 0.01) * Math.cos(angle); // 中間連接柱Y軸位置
        const connectormidY_bk_2 = connectormidY_bk + connectorWidth * Math.cos(angle); // 中間連接柱Y軸頂板位置
        const connectormidX_bk = connectormidX - spacing / Math.cos(angle) - connectorThickness / Math.cos(angle); // 連接柱X軸位置
        const connectormidX_bk_2 = connectormidX_bk - connectorWidth * Math.sin(angle); // 連接柱X軸頂板位置
        const connectmidXmid_bk = (connectormidX_bk + connectormidX_bk_2) / 2; // 中間連接柱中點X軸位置
        const connectormidYmid_bk = (connectormidY_bk + connectormidY_bk_2) / 2; // 中間連接柱中點Y軸位置
        // 反面上面中間連接柱位置計算
        const connectormidY_bk2 = shortPillarY + thickness / 2 * Math.sin(angle) + connectorThickness / 2 * Math.sin(angle) + (shortshoreLength - connectorWidth - 0.01) * Math.cos(angle) - (thickness + connectorThickness) * Math.sin(angle); // 中間連接柱Z軸位置
        const connectormidY_bk2_2 = connectormidY_bk2 + connectorWidth * Math.cos(angle); // 中間連接柱Z軸頂板位置
        const connectormidX_bk2 = shortPillarX + thickness / 2 * Math.cos(angle) + connectorThickness / 2 * Math.cos(angle) - (shortshoreLength - connectorWidth - 0.01) * Math.sin(angle) - (thickness + connectorThickness) * Math.cos(angle); // 連接柱Z軸位置
        const connectormidX_bk2_2 = connectormidX_bk2 - connectorWidth * Math.sin(angle); // 連接柱Z軸頂板位置
        const connectmidXmid_bk_2 = (connectormidX_bk2 + connectormidX_bk2_2) / 2; // 中間連接柱中點Z軸位置
        const connectormidYmid_bk_2 = (connectormidY_bk2 + connectormidY_bk2_2) / 2; // 中間連接柱中點Z軸位置

        const connectorMidPositions = [
          [connectmidXmid, connectormidYmid, 0],
          [connectmidXmid_2, connectormidYmid_2, 0],
          [connectmidXmid_bk, connectormidYmid_bk, 0],
          [connectmidXmid_bk_2, connectormidYmid_bk_2, 0],

        ];
        const connectorMidAxis = new THREE.Vector3(0, 0, 1); // 預設 z 軸
        const connectorMidQuaternion = new THREE.Quaternion().setFromAxisAngle(connectorMidAxis, angle);
        // 建立中間橋梁連接柱 Mesh
        connectorMidPositions.forEach(pos => {
          const connectorMid = new THREE.Mesh(connectorMidGeometry, connectorMidMaterial.clone());
          connectorMid.position.set(...pos);
          connectorMid.setRotationFromQuaternion(connectorMidQuaternion);
          scene.add(connectorMid);
        });



        // 建立中間的對角連接柱
        const connecotrMidslopeStart = new THREE.Vector3(connectormidX2_2 + connectorWidth * Math.sin(angle) * (1 + 0.75), connectormidY2_2 - connectorWidth * Math.cos(angle) * (1 + 0.75), offsetZ);
        const connecotrMidslopeEnd = new THREE.Vector3(connectormidX - connectorWidth * Math.sin(angle) * (1 + 0.75), connectormidY + connectorWidth * Math.cos(angle) * (1 + 0.75), -offsetZ);
        const connecotrMidslopeLength = Math.sqrt(Math.pow((spacing - 0.1), 2) + Math.pow((connecotrMidslopeStart.x - connecotrMidslopeEnd.x), 2) + Math.pow((connecotrMidslopeStart.y - connecotrMidslopeEnd.y), 2)); // 計算對角連接柱的長度
        // 計算對角連接柱旋轉
        const connecotrMidslopeAxis = new THREE.Vector3(0, 0, 1);
        const connecotrMidslopeQuaternion = new THREE.Quaternion().setFromAxisAngle(connecotrMidslopeAxis, angle);
        // 計算對角連接柱的方向
        const connecotrMidslopeDirection = new THREE.Vector3().subVectors(connecotrMidslopeStart, connecotrMidslopeEnd).normalize();
        const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), connecotrMidslopeDirection);
        // 將對角連接柱的旋轉與方向對齊
        // 先方向再選轉
        const finalQuaternion = alignQuaternion.multiply(connecotrMidslopeQuaternion); // 將對角連接柱的旋轉與方向對齊

        const connectorMidslopeGeometry = new THREE.BoxGeometry(connectorThickness, connectorWidth, connecotrMidslopeLength);
        const connectorMidslopeMaterial = new THREE.MeshPhongMaterial({
          color: 0xff0000, // 紅色
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        const connecotrMidslopeMid = new THREE.Vector3().addVectors(connecotrMidslopeStart, connecotrMidslopeEnd).multiplyScalar(0.5);
        const connector = new THREE.Mesh(connectorMidslopeGeometry, connectorMidslopeMaterial);
        connector.position.copy(connecotrMidslopeMid);
        connector.setRotationFromQuaternion(finalQuaternion);
        scene.add(connector);



        // 建立背面中間的對角連接柱
        const connecotrMidslopeStart_bk = new THREE.Vector3(connectormidX_bk2_2 + connectorWidth * Math.sin(angle) * (1 + 0.75), connectormidY_bk2_2 - connectorWidth * Math.cos(angle) * (1 + 0.75), offsetZ);
        const connecotrMidslopeEnd_bk = new THREE.Vector3(connectormidX_bk - connectorWidth * Math.sin(angle) * (1 + 0.75), connectormidY_bk + connectorWidth * Math.cos(angle) * (1 + 0.75), -offsetZ);
        const connecotrMidslopeLength_bk = Math.sqrt(Math.pow((spacing - 0.1), 2) + Math.pow((connecotrMidslopeStart_bk.x - connecotrMidslopeEnd_bk.x), 2) + Math.pow((connecotrMidslopeStart_bk.y - connecotrMidslopeEnd_bk.y), 2)); // 計算對角連接柱的長度
        // 計算對角連接柱旋轉
        const connecotrMidslopeAxis_bk = new THREE.Vector3(0, 0, 1);
        const connecotrMidslopeQuaternion_bk = new THREE.Quaternion().setFromAxisAngle(connecotrMidslopeAxis_bk, angle);
        // 計算對角連接柱的方向
        const connecotrMidslopeDirection_bk = new THREE.Vector3().subVectors(connecotrMidslopeStart_bk, connecotrMidslopeEnd_bk).normalize();
        const alignQuaternion_bk = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), connecotrMidslopeDirection_bk);
        // 將對角連接柱的旋轉與方向對齊
        // 先方向再選轉
        const finalQuaternion_bk = alignQuaternion_bk.multiply(connecotrMidslopeQuaternion_bk);
        // 將對角連接柱的旋轉與方向對齊

        const connectorMidslopeGeometry_bk = new THREE.BoxGeometry(connectorThickness, connectorWidth, connecotrMidslopeLength_bk);
        const connectorMidslopeMaterial_bk = new THREE.MeshPhongMaterial({
          color: 0xff0000, // 紅色
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        const connecotrMidslopeMid_bk = new THREE.Vector3().addVectors(connecotrMidslopeStart_bk, connecotrMidslopeEnd_bk).multiplyScalar(0.5);
        const connector_bk = new THREE.Mesh(connectorMidslopeGeometry_bk, connectorMidslopeMaterial_bk);
        connector_bk.position.copy(connecotrMidslopeMid_bk);
        connector_bk.setRotationFromQuaternion(finalQuaternion_bk);
        scene.add(connector_bk);


        // 建立夾板
        const plywoodGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.02);
        const plywoodMaterial = new THREE.MeshPhongMaterial({
          color: 0xaaaaaa, // 淺灰
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        // Geometry x y z 對應 寬、高、深
        // 調用的用法Geometry.parameters.width 、.height 、 .depth
        // 夾板位置計算
        const plywoodXfront = shortPillarX - plywoodGeometry.parameters.width / 2; // 前夾板X軸位置
        const plywoodYfront = offsetY + bottomWidth + 0.01; // 前夾板Y軸位置
        const plywoodXback = connectormidX_2 - connectorWidth / 2 * Math.sin(angle) - plywoodGeometry.parameters.width / 2 - 0.01; // 後夾板X軸位置
        const plywoodYback = offsetY + bottomWidth + 0.01; // 後夾板Y軸位置
        const plywoodXfront_2 = shortPillarX_2 + (0.3 - topThickness * 2) / 2 * Math.sin(angle) + (0.15 - thickness + 0.03) / 2 * Math.cos(angle); // 前夾板X軸頂板位置 
        const plywoodYfront_2 = shortPillarY_2 - (0.3 - topThickness * 2) / 2 * Math.cos(angle) + (0.15 - thickness - 0.01) / 2 * Math.sin(angle); // 前夾板Y軸頂板位置
        const plywoodXback_2 = PillarX_2 + (0.3 - topThickness * 2) / 2 * Math.sin(angle) - (0.15 - thickness + 0.01) / 2 * Math.cos(angle); // 後夾板X軸頂板位置
        const plywoodYback_2 = PillarY_2 - (0.3 - topThickness * 2) / 2 * Math.cos(angle) - (0.15 - thickness + 0.03) / 2 * Math.sin(angle); // 後夾板Y軸頂板位置
        const plywoodPositionsUp = [
          [plywoodXfront_2, plywoodYfront_2, + offsetZ - thickness / 2 - 0.02 / 2], // 前左上
          [plywoodXfront_2, plywoodYfront_2, -offsetZ + thickness / 2 + 0.02 / 2], // 後左上
          [plywoodXback_2, plywoodYback_2, + offsetZ + thickness / 2 + 0.02 / 2], // 前右上
          [plywoodXback_2, plywoodYback_2, -offsetZ - thickness / 2 - 0.02 / 2] // 後右上

        ];
        const plywoodAxis = new THREE.Vector3(0, 0, 1);
        const plywoodQuaternion = new THREE.Quaternion().setFromAxisAngle(plywoodAxis, angle);
        // 建立中間橋梁連接柱 Mesh
        plywoodPositionsUp.forEach(pos => {
          const plywood = new THREE.Mesh(plywoodGeometry, plywoodMaterial.clone());
          plywood.position.set(...pos);
          plywood.setRotationFromQuaternion(plywoodQuaternion);
          scene.add(plywood);
        });

        const plywoodPositionsDown = [
          [plywoodXfront, plywoodYfront, offsetZ + thickness / 2 + 0.02 / 2], // 前左下
          [plywoodXfront, plywoodYfront, -offsetZ - thickness / 2 - 0.02 / 2], // 後左下
          [plywoodXback, plywoodYback, offsetZ - thickness / 2 - 0.02 / 2], // 前右下
          [plywoodXback, plywoodYback, -offsetZ + thickness / 2 + 0.02 / 2], // 後右下
        ];
        plywoodPositionsDown.forEach(pos => {
          const plywood = new THREE.Mesh(plywoodGeometry, plywoodMaterial.clone());
          plywood.position.set(...pos);
          scene.add(plywood);
        });



        //之後可以刪除
        // 建立 XYZ 軸向輔助線（長度單位 = 公尺，可調整）
        //x,y,z:紅,綠,藍
        /*
        const axesHelper = new THREE.AxesHelper(1);  // 長度 1 公尺
        scene.add(axesHelper);
        */
        // 以下為環境設置
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
