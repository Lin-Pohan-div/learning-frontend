# Onboarding Guide — Learning Platform

> 給剛加入專案的開發者。本文件涵蓋環境設置、專案結構、開發慣例與常見情境，讀完可獨立開始貢獻。

---

## 目錄

1. [專案簡介](#1-專案簡介)
2. [環境需求與安裝](#2-環境需求與安裝)
3. [啟動與建置指令](#3-啟動與建置指令)
4. [專案目錄結構](#4-專案目錄結構)
5. [Vite 代理設定](#5-vite-代理設定)
6. [認證機制與 localStorage](#6-認證機制與-localstorage)
7. [Axios 使用規範](#7-axios-使用規範)
8. [頁面與 JS 對照表](#8-頁面與-js-對照表)
9. [SCSS 樣式規範](#9-scss-樣式規範)
10. [Git 開發流程](#10-git-開發流程)
11. [Commit Message 規範](#11-commit-message-規範)
12. [不該推送的檔案](#12-不該推送的檔案)
13. [常見開發情境](#13-常見開發情境)
14. [已知命名陷阱](#14-已知命名陷阱)
15. [延伸閱讀](#15-延伸閱讀)

> 📌 **後端開發人員**：請直接閱讀 [BACKEND_ONBOARDING.md](./BACKEND_ONBOARDING.md)，涵蓋 Spring Boot 環境設置、目錄結構、API 速查、Entity 欄位、安全層說明。

---

## 1. 專案簡介

線上家教媒合平台，支援學生預約課程、即時視訊上課、點數付款。

| 角色 | 說明 |
|------|------|
| **STUDENT** | 預設角色，可瀏覽課程、預約時段、聊天、視訊 |
| **TUTOR** | 由 STUDENT 申請，ADMIN 審核後啟用，可開課、設排程、領收入 |
| **ADMIN** | 系統直接設定，負責老師審核與平台統計 |

**技術棧一覽**

| 層 | 技術 |
|----|------|
| 前端框架 | Vanilla JS + Bootstrap 5 + Chart.js + Matter.js |
| 前端建置 | **Vite 7** |
| 前端樣式 | **SCSS（Sass 1.98）** |
| HTTP 客戶端 | **Axios 1.14** |
| 後端 | Spring Boot 4.0.2 / Java 21 |
| 認證 | JWT（Bearer Token） |
| 即時通訊 | Spring WebSocket + STOMP（SockJS） |
| 即時視訊 | WebRTC（STUN/TURN） |
| 付款 | ECPay（台灣金流） |

---

## 2. 環境需求與安裝

### 必要條件

| 工具 | 最低版本 | 確認指令 |
|------|----------|----------|
| Node.js | **18+** | `node -v` |
| npm | 隨 Node 附帶 | `npm -v` |
| 後端服務 | Spring Boot 執行中 | 預設 `:8080` |

### 初次安裝

```bash
# 1. 克隆前端儲存庫
git clone https://github.com/lianne928/learning-frontend.git
cd learning-frontend

# 2. 安裝所有依賴（含 Vite、Sass、Axios、Bootstrap）
npm install
```

> `package.json` 已宣告所有依賴，一次 `npm install` 即可搞定，無須個別安裝。

### 手動補裝（若 npm install 後仍缺少）

```bash
npm install -D sass     # SCSS 編譯器（devDependency）
npm install axios       # HTTP 客戶端
```

---

## 3. 啟動與建置指令

```bash
npm run dev      # 啟動開發伺服器（含 HMR + SCSS 即時編譯）
npm run build    # 打包輸出至 dist/（每次 push 前執行）
npm run preview  # 預覽 build 結果（類似 staging 環境）
```

> ⚠️ **重要**：每次 push 或重啟專案後，請先執行 `npm run build`，否則 SCSS 變更不會轉譯到 `dist/`。

---

## 4. 專案目錄結構

```
learning-frontend/
├── index.html                  # 首頁
├── login.html                  # 登入頁
├── register.html               # 註冊頁
├── explore.html                # 瀏覽課程
├── booking.html                # 預約時段
├── student-*.html              # 學生後台頁面
├── teacher-*.html              # 老師後台頁面
├── admin-dashboard.html        # 管理後台
├── Student-VideoRoom.html      # 學生視訊教室
├── teacher-VideoRoom.html      # 老師視訊教室
├── StudentChat.html            # 學生訊息中心
├── teacher-messages.html       # 老師訊息中心
│
├── assets/
│   ├── js/                     # 所有 JavaScript 檔案
│   │   ├── navbar.js           # ★ 全站共用（API_BASE_URL、JWT、Toast）
│   │   ├── student-layout.js   # 學生後台共用（axios header 自動注入）
│   │   ├── teacher-layout.js   # 老師後台共用
│   │   ├── video-room.js       # 視訊教室（WebRTC + STOMP）
│   │   ├── StudentChat.js      # 學生訊息（純 HTTP REST）
│   │   ├── TeacherChat.js      # 老師訊息（REST + WebSocket）
│   │   └── ...                 # 各頁面對應 JS
│   │
│   ├── scss/
│   │   ├── all.scss            # 總入口（@forward 各模組）
│   │   ├── components/         # 元件樣式（_booking.scss 等）
│   │   ├── configuration/      # 變數、mixin
│   │   └── page/               # 頁面樣式
│   │
│   ├── css/
│   │   └── all.css             # Sass 編譯輸出（勿手動修改）
│   └── img/                    # 靜態圖片
│
├── vite.config.js              # Vite 設定（proxy、SCSS 選項）
├── package.json                # 依賴與 scripts
├── README                      # 舊版開發說明（含 axios 範例）
├── CODE_WALKTHROUGH.md         # 完整模組說明（前後端 API 對照）
└── ONBOARDING.md               # ← 本文件
```

---

## 5. Vite 代理設定

`vite.config.js` 將三類路徑代理至後端 `localhost:8080`：

```js
proxy: {
  '^/(api|uploads)': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/ws': {
    target: 'http://localhost:8080',
    ws: true,      // WebSocket 代理
    changeOrigin: true,
  },
}
```

| 路徑前綴 | 代理目標 | 說明 |
|----------|----------|------|
| `/api/...` | `http://localhost:8080/api/...` | REST API |
| `/uploads/...` | `http://localhost:8080/uploads/...` | 後端靜態檔（聊天媒體） |
| `/ws` | `ws://localhost:8080/ws` | WebSocket（STOMP） |

> **開發時**後端需在 `:8080` 執行，前端 `npm run dev` 即可透過代理存取，無需理會 CORS。

---

## 6. 認證機制與 localStorage

登入成功後，前端將以下資訊存入 `localStorage`：

| 鍵 | 說明 | 範例值 |
|----|------|--------|
| `jwt_token` | JWT Bearer Token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `userId` | 登入者的 User ID（字串） | `"42"` |
| `userRole` | 角色（源自 JWT payload） | `"STUDENT"` \| `"TUTOR"` \| `"ADMIN"` |
| `userName` | 顯示名稱 | `"王小明"` |

### 自動注入 Header

`student-layout.js` / `teacher-layout.js` 在頁面載入時設定 Axios 全域攔截器：

```js
axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('jwt_token')}`;
```

後台頁面只要引入對應 layout JS，所有 Axios 請求就會自動帶上 JWT，**不需要每次手動加 header**。

例外：`student-credits.js`、`student-courses.js` 的特定函式需明確帶 header，已在程式碼中個別處理。

### 401 / 403 自動登出

layout JS 的 Axios 回應攔截器會捕捉 401，自動清除 localStorage 並跳轉 `login.html`。

---

## 7. Axios 使用規範

### API 路徑

**永遠使用相對路徑**，禁止寫死 `http://localhost:8080`：

```js
// ✅ 正確
axios.get('/api/courses/me')

// ❌ 錯誤（legacy 範例，禁止）
axios.get('http://localhost:8080/api/courses/me')
```

全域 `API_BASE_URL` 定義在 `navbar.js`：

```js
const API_BASE_URL = '/api';   // ← 這就是標準用法
```

### GET 範例

```js
axios.get(`${API_BASE_URL}/users/me`)
  .then(resp => {
    console.log('使用者資訊：', resp.data);
  })
  .catch(err => {
    console.error('請求失敗：', err);
  });
```

### POST 範例

```js
const payload = { courseId: 10, lessonCount: 5, slots: [...] };

axios.post(`${API_BASE_URL}/shop/purchase`, payload)
  .then(resp => {
    showToast('購買成功！', 'success');
  })
  .catch(err => {
    console.error('購買失敗：', err);
  });
```

### 資料清理

送出請求前，移除使用者輸入的前後空白：

```js
const name = document.getElementById('name').value.trim();
```

---

## 8. 頁面與 JS 對照表

### 公開頁面

| HTML | JS | 說明 |
|------|----|------|
| `index.html` | `index.js` + `matter.js` | 首頁（老師輪播 + 物理動畫） |
| `login.html` | `login.js` | 登入 |
| `register.html` | `register.js` | 一般註冊 |
| `registerV2.html` | `registerV2.js` | 含角色選擇的註冊 |
| `explore.html` | `explore.js` | 瀏覽課程（前端分頁，每頁 8 筆） |
| `booking.html` | `booking.js` | 預約時段（4 週日期 + 方案折扣） |
| `become-tutor.html` | `become-tutor.js` | 申請成為老師 |
| `credits-success.html` | — | ECPay 付款成功（靜態頁，無 JS） |

### 學生後台

| HTML | JS | 說明 |
|------|----|------|
| `student-dashboard.html` | `student-layout.js` + `student-dashboard.js` | 儀表板 |
| `student-courses.html` | `student-layout.js` + `student-courses.js` | 我的課程（含「進入視訊教室」按鈕） |
| `student-my-courses.html` | `student-layout.js` + `student-courses.js` | 我的課程（另一入口，共用同一 JS） |
| `student-learning-records.html` | `student-layout.js` + `lstudent-courses.js` | 學習記錄（legacy JS） |
| `student-credits.html` | `student-layout.js` + `student-credits.js` | 點數與儲值（ECPay） |
| `student-settings.html` | `student-layout.js` + `student-settings.js` | 帳號設定 |
| `StudentChat.html` | `StudentChat.js` | 訊息中心（純 HTTP REST） |
| `Student-VideoRoom.html` | `video-room.js` | 視訊教室（WebRTC） |

### 老師後台

| HTML | JS | 說明 |
|------|----|------|
| `teacher-dashboard.html` | `teacher-layout.js` + `teacher-dashboard.js` | 儀表板 |
| `teacher-courses.html` | `teacher-layout.js` + `teacher-courses.js` | 課程管理 |
| `teacher-schedule.html` | `teacher-layout.js` + `teacher-schedule.js` | 排程管理 |
| `teacher-income.html` | `teacher-layout.js` + `teacher-income.js` | 收入分析（Chart.js） |
| `teacher-reviews.html` | `teacher-layout.js` + `teacher-reviews.js` | 評價管理 |
| `teacher-settings.html` | `teacher-layout.js` + `teacher-settings.js` | 帳號與個人檔案設定 |
| `teacher-profile.html` | `teacher-profile.js` | 老師公開個人頁 |
| `teacher-messages.html` | `TeacherChat.js` | 訊息中心（REST + WebSocket） |
| `teacher-VideoRoom.html` | `video-room.js` | 視訊教室（WebRTC，老師為 Answerer） |

### 管理後台 & 共用

| HTML / 檔案 | 說明 |
|-------------|------|
| `admin-dashboard.html` + `admin-dashboard.js` | 管理員：統計 + 老師審核 |
| `navbar.js` | 全站共用：`API_BASE_URL`、JWT 解析、角色導航、`showToast()`、`convertGoogleDriveUrl()` |
| `main.js` | Vite 入口（SCSS 掛載） |

---

## 9. SCSS 樣式規範

- 入口檔：`assets/scss/all.scss`（以 `@forward` 匯入各模組）
- 元件樣式寫在 `assets/scss/components/_<功能>.scss`
- 頁面樣式寫在 `assets/scss/page/_<頁面>.scss`
- 全域變數（顏色、字體、間距）放在 `assets/scss/configuration/`
- 編譯輸出：`assets/css/all.css`（Vite 自動生成，**勿手動修改**）

> Vite 設定已壓制 Sass 的 `color-functions`、`import`、`global-builtin`、`if-function` deprecation 警告，升級 Sass 時請定期確認是否需要更新。

---

## 10. Git 開發流程

**切記：永遠在自己的 feature branch 上工作，禁止直接 push 到 `main`。**

### 初始設置（首次加入）

```bash
git checkout main
git pull origin main
git checkout -b feature/你的分支名稱    # 例如：feature/auth、feature/booking-ui
```

### 日常開發流程

```bash
# 1. 確認目前在自己的分支
git branch      # 若顯示 * main → 立刻切換

# 2. 開發異動後提交
git status
git add .
git status      # 再確認一次，確保準備提交的檔案正確

# 3. 萬一不小心 add 了不該推的檔案
git restore --staged <不想推的檔案路徑>

# 4. 提交並推送
git commit -m "feat: 新增課程預約流程 UI"
git push origin feature/你的分支名稱
```

---

## 11. Commit Message 規範

格式：`<Type>: <Description>`

| Type | 使用情境 |
|------|----------|
| `feat` | 新增功能 |
| `fix` | 修復 Bug |
| `docs` | 文件更動（如修改 README、ONBOARDING） |
| `refactor` | 重構程式碼（不影響功能的優化） |
| `chore` | 雜項、套件或環境設定（如修改 `vite.config.js`、`package.json`） |
| `revert` | 回滾 commit |

**原子化提交原則**：同一個 commit 只做一件事。若同時修了 Bug 又新增功能，請分兩次提交。

```bash
# 好的範例
git commit -m "feat: 老師後台新增收入圓餅圖"
git commit -m "fix: 修正 booking.js 體驗課折扣計算錯誤"

# 禁止的範例
git commit -m "改了很多東西"
```

---

## 12. 不該推送的檔案

請確認以下項目已寫入 `.gitignore`：

| 類別 | 路徑 / 檔名 | 原因 |
|------|------------|------|
| 環境變數 | `.env`、`.env.local` | 含 API 金鑰或後端網址 |
| 套件快取 | `node_modules/` | 體積龐大，讓各自 `npm install` |
| 打包輸出 | `dist/` | 屬 build artifact |
| IDE 設定 | `.vscode/`、`.idea/` | 個人開發偏好，非程式碼 |
| 系統檔 | `.DS_Store`、`Thumbs.db` | 作業系統自動生成的垃圾檔 |

---

## 13. 常見開發情境

### 情境 A：新增一個學生後台頁面

1. 建立 `student-xxxx.html`，在 `<head>` 引入：
   ```html
   <script src="./assets/js/navbar.js"></script>
   <script src="./assets/js/student-layout.js"></script>
   ```
2. 建立對應的 `assets/js/student-xxxx.js`
3. 在 HTML 底部引入：`<script src="./assets/js/student-xxxx.js"></script>`
4. 在 `assets/scss/components/` 新增 `_student-xxxx.scss` 並在 `all.scss` 中 `@forward`

> `student-layout.js` 已自動設定 Axios JWT header 並處理 401 登出，新頁面直接繼承。

---

### 情境 B：串接新的後端 API

```js
// 在對應的 JS 檔案中，直接使用 API_BASE_URL（由 navbar.js 全域定義）
async function loadData() {
  try {
    const res = await axios.get(`${API_BASE_URL}/your/endpoint`);
    // res.data 即為後端回傳的 JSON
    renderSomething(res.data);
  } catch (err) {
    if (err.response?.status === 401) {
      // layout.js 應已自動處理，這裡看情況額外提示
    }
    console.error('載入失敗：', err);
  }
}
```

---

### 情境 C：使用 showToast 通知使用者

```js
// 由 navbar.js 定義，全站可用，無需 import
showToast('操作成功！', 'success');   // 綠色
showToast('發生錯誤，請稍後再試', 'danger');  // 紅色
showToast('請先登入', 'warning');    // 黃色
```

---

### 情境 D：圖片來自 Google Drive

老師頭像等資源可能儲存在 Google Drive，使用 `convertGoogleDriveUrl()` 轉換：

```js
// 由 navbar.js 定義
const thumbnailUrl = convertGoogleDriveUrl(teacher.avatar);
imgEl.src = thumbnailUrl;
```

---

### 情境 E：WebSocket / 即時視訊

- 詳見 `CODE_WALKTHROUGH.md` Section 11（Chat）與 Section 12（Video Room）
- WebSocket endpoint：`/ws`（經 Vite proxy 轉至後端）
- STOMP 連線需帶 `Authorization: Bearer <token>` header（`WebSocketAuthInterceptor` 驗證）

---

## 14. 已知命名陷阱

> 以下檔案的**名稱**與**實際用途**不一致，開發時需特別注意：

| 檔案 | 名稱暗示 | 實際用途 |
|------|----------|----------|
| `student-reviews.js` | 學生端評價 | **老師端**評價管理頁（使用 `tutorId`） |
| `student-wallet.js` | 學生錢包 | **老師端**收入分析頁（顯示授課收入圖表） |
| `student-message.js` | 學生訊息 | **Tailwind CSS 設計配色物件**，非頁面邏輯 |
| `lstudent-courses.js` | 學生課程 | Legacy 版本，含 hardcoded `localhost:8080`，僅供 `student-learning-records.html` 使用 |
| `bookingV2.js / V3 / V4` | 預約頁 V2+ | 實驗性版本，目前主線使用 `booking.js` |
| `tokenTest.js` | - | 開發用 JWT 除錯面板，**不含業務邏輯** |

---

## 15. 延伸閱讀

| 文件 | 說明 |
|------|------|
| [BACKEND_ONBOARDING.md](./BACKEND_ONBOARDING.md) | **後端入門指南**（Spring Boot 環境、目錄結構、API 速查、Entity、安全層、已知 TODO） |
| [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md) | 完整的前後端模組說明、所有 API 路徑、Entity 欄位、業務邏輯流程 |
| [README](./README) | 舊版說明（含 Axios GET/POST 程式碼範例） |
| [PRODUCT_FEATURES.md](./PRODUCT_FEATURES.md) | 產品功能概述（適合理解使用者情境） |
| [PRESENTATION_OUTLINE.md](./PRESENTATION_OUTLINE.md) | 簡報大綱（了解專案定位） |

---

*最後更新：2026-04-07*
