document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("jwt_token");
  const authNavItem = document.getElementById("auth-nav-item");

  if (token) {
    try {
      // 破解 JWT！(JWT 的第二段是 Payload，用 Base64 編碼)
      const payloadBase64 = token.split(".")[1];
      // 將 Base64 解碼成 JSON 字串再轉成物件
      const payload = JSON.parse(atob(payloadBase64));

      // 直接讀取我們剛剛塞進去 token 的 name 欄位，如果沒有就預設顯示 "會員"
      const realName = payload.name || "會員";

      // 動態替換畫面
      authNavItem.innerHTML = `
    <span class="text-primary fw-bold px-3">👋 ${realName}</span>
    <a href="#" onclick="logout()" class="text-decoration-none px-2 text-danger fw-bold border-start border-2 border-danger ms-1 pl-2">登出</a>
`;
    } catch (e) {
      console.error("Token 解析失敗", e);
    }
  }
});

// 登出功能
function logout() {
  if (confirm("確定要登出嗎？")) {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("userId");
    alert("已成功登出！");
    window.location.reload(); // 重整畫面，導覽列會變回 LOGIN
  }
}

<div
  id="dev-debug-panel"
  style="position: fixed; bottom: 20px; right: 20px; width: 320px; background: rgba(20, 20, 20, 0.95); border: 2px solid #00ff00; border-radius: 10px; padding: 15px; color: #00ff00; font-family: monospace; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(5px);"
>
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #00ff00; padding-bottom: 8px; margin-bottom: 12px;">
    <strong style="font-size: 1.1em;">🛠️ Token 觀測站</strong>
    <button
      onclick="document.getElementById('dev-debug-panel').style.display='none'"
      style="background: transparent; color: #ff4444; border: 1px solid #ff4444; border-radius: 4px; cursor: pointer; padding: 2px 8px; font-weight: bold;"
    >
      隱藏
    </button>
  </div>

  <div style="font-size: 13px; margin-bottom: 10px;">
    <div style="margin-bottom: 5px; color: #fff;">
      📍 <b>目前儲存的 JWT：</b>
    </div>
    <div
      id="dev-token-display"
      style="background: #000; color: #aaa; padding: 8px; border-radius: 6px; font-size: 11px; word-break: break-all; max-height: 80px; overflow-y: auto; border: 1px solid #333;"
    >
      讀取中...
    </div>
  </div>

  <div style="display: flex; gap: 10px; margin-top: 15px;">
    <button
      onclick="refreshDevToken()"
      style="flex: 1; background: #00ff00; color: #000; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s;"
    >
      重新讀取
    </button>
    <button
      onclick="clearDevToken()"
      style="flex: 1; background: #ffaa00; color: #000; border: none; padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s;"
    >
      清除 (模擬登出)
    </button>
  </div>
</div>;

// -----------------------------------------
// 1. 處理右上角導覽列：破解 JWT 顯示姓名
// -----------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("jwt_token");
  const authNavItem = document.getElementById("auth-nav-item");

  if (token && authNavItem) {
    try {
      // 抓取 JWT 的第二段 Payload
      let base64Url = token.split(".")[1];
      let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

      // 🚨 終極防呆：幫龜毛的 atob 補齊缺少的 '='，避免 InvalidCharacterError
      while (base64.length % 4) {
        base64 += "=";
      }

      // 完美支援中文解碼
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );

      const payload = JSON.parse(jsonPayload);
      const realName = payload.name || "會員";

      // 動態替換畫面
      authNavItem.innerHTML = `
            <span class="text-primary fw-bold px-3">👋 ${realName}</span>
            <a href="#" onclick="logout()" class="text-decoration-none px-2 text-danger fw-bold border-start border-2 border-danger ms-1 pl-2">登出</a>
          `;
    } catch (e) {
      console.error("Token 解析失敗 (導覽列):", e);
    }
  }
});

// -----------------------------------------
// 2. 登出功能
// -----------------------------------------
function logout() {
  if (confirm("確定要登出嗎？")) {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("userId");
    alert("已成功登出！");
    window.location.reload();
  }
}

// -----------------------------------------
// 3. 右下角 Token 觀測站專用功能
// -----------------------------------------
function refreshDevToken() {
  try {
    const token = localStorage.getItem("jwt_token");
    const display = document.getElementById("dev-token-display");

    if (!display) return; // 如果這頁沒有放觀測站 HTML 就略過

    if (token) {
      display.innerText = token;
      display.style.color = "#00ff00";
    } else {
      display.innerText = "❌ 尚未登入，找不到 Token";
      display.style.color = "#ff4444";
    }
  } catch (error) {
    console.error("觀測站讀取失敗：", error);
    document.getElementById("dev-token-display").innerText =
      "讀取錯誤，請看 Console";
  }
}

function clearDevToken() {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("userId");
  refreshDevToken();
  window.location.reload(); // 清除後重新整理畫面
}

// 確保網頁載入後，觀測站立刻去抓取 Token
setTimeout(refreshDevToken, 300);
