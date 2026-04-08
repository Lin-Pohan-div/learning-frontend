# Code Walkthrough — Learning Platform

> **後端位址**：`src/main/java/com/learning/api`（獨立 repo）
> **前端位址**：`assets/js`（本 repo）
>
> 剛加入專案的開發者請先閱讀 [ONBOARDING.md](./ONBOARDING.md)，本文件為深度模組參考。

---

## 目錄

1. [專案總覽](#1-專案總覽)
2. [核心功能說明](#2-核心功能說明)
3. [認證模組（Auth）](#3-認證模組auth)
4. [使用者模組（User/Profile）](#4-使用者模組userprofile)
5. [老師申請與審核模組（Tutor Application）](#5-老師申請與審核模組tutor-application)
6. [課程模組（Course）](#6-課程模組course)
7. [排程模組（Schedule）](#7-排程模組schedule)
8. [訂課與付款模組（Booking & Checkout）](#8-訂課與付款模組booking--checkout)
9. [學生課程管理模組（Student Course）](#9-學生課程管理模組student-course)
10. [評價與回饋模組（Review & Feedback）](#10-評價與回饋模組review--feedback)
11. [訊息模組（Chat）](#11-訊息模組chat)
12. [視訊模組（Video Room / WebRTC）](#12-視訊模組video-room--webrtc)
13. [管理後台模組（Admin）](#13-管理後台模組admin)
14. [老師個人檔案模組（Tutor Profile）](#14-老師個人檔案模組tutor-profile)
15. [Email 通知模組](#15-email-通知模組)

---

## 1. 專案總覽

### 系統架構

```
┌──────────────────────────────────────────────────────┐
│  前端 (Vanilla JS + Axios + Bootstrap + Chart.js)    │
│  公開頁面          學生後台          老師後台          │
│  index / explore   student-*       teacher-*         │
│  login / register  StudentChat.js  TeacherChat.js    │
│  booking           student-credits video-room.js     │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP / WebSocket (STOMP)
                     ▼
┌──────────────────────────────────────────────────────┐
│  後端 (Spring Boot 4.0.2, Java 21)                    │
│  SecurityConfig + JwtFilter (認證層)                 │
│  Controllers → Services → Repositories               │
│  WebSocket：VideoRoomController / ChatMessageCtrl    │
└────────────────────┬─────────────────────────────────┘
                     │ JPA / Hibernate
                     ▼
┌──────────────────────────────────────────────────────┐
│  資料庫（MySQL / PostgreSQL）                         │
│  users / tutors / courses / bookings / orders        │
│  tutor_schedules / reviews / feedbacks               │
│  wallet_logs / chat_messages                         │
└──────────────────────────────────────────────────────┘
```

### 技術棧

| 層級 | 技術 |
|------|------|
| 後端框架 | Spring Boot 4.0.2 (Java 21), Spring Security, Spring Data JPA |
| 認證 | JWT（Bearer Token） |
| 即時通訊 | Spring WebSocket + STOMP |
| 付款 | ECPay（台灣金流） |
| Email | JavaMailSender |
| 前端 | Vanilla JS, Axios, Bootstrap 5, Chart.js, Matter.js |
| 建置工具 | Vite |
| 樣式 | SCSS（Sass） |
| 即時視訊 | WebRTC（STUN/TURN + STOMP 信令） |

### 頁面與 JS 對照表

| HTML 頁面 | 對應 JS | 說明 |
|-----------|---------|------|
| `index.html` | `index.js` + `matter.js` | 首頁（老師輪播 + 物理動畫） |
| `login.html` | `login.js` | 登入頁 |
| `register.html` | `register.js` | 註冊頁 |
| `registerV2.html` | `registerV2.js` | 註冊頁（含角色選擇） |
| `explore.html` | `explore.js` | 瀏覽課程 |
| `booking.html` | `booking.js` | 預約時段 |
| `become-tutor.html` | `become-tutor.js` | 申請成為老師 |
| `credits-success.html` | — | ECPay 付款成功頁（靜態） |
| **學生後台** | | |
| `student-dashboard.html` | `student-layout.js` + `student-dashboard.js` | 學生儀表板 |
| `student-courses.html` | `student-layout.js` + `student-courses.js` | 我的課程（含進入視訊教室） |
| `student-my-courses.html` | `student-layout.js` + `student-courses.js` | 我的課程（另一入口） |
| `student-learning-records.html` | `student-layout.js` + `lstudent-courses.js` | 學習記錄 |
| `student-credits.html` | `student-layout.js` + `student-credits.js` | 點數/儲值 |
| `student-settings.html` | `student-layout.js` + `student-settings.js` | 帳號設定 |
| `StudentChat.html` | `StudentChat.js` | 學生訊息中心 |
| `Student-VideoRoom.html` | `video-room.js` | 學生視訊教室 |
| **老師後台** | | |
| `teacher-dashboard.html` | `teacher-layout.js` + `teacher-dashboard.js` | 老師儀表板 |
| `teacher-courses.html` | `teacher-layout.js` + `teacher-courses.js` | 課程管理 |
| `teacher-schedule.html` | `teacher-layout.js` + `teacher-schedule.js` | 排程管理 |
| `teacher-income.html` | `teacher-layout.js` + `teacher-income.js` | 收入分析 |
| `teacher-reviews.html` | `teacher-layout.js` + `teacher-reviews.js` | 評價管理 |
| `teacher-settings.html` | `teacher-layout.js` + `teacher-settings.js` | 帳號設定 |
| `teacher-profile.html` | `teacher-profile.js` | 老師個人頁 |
| `teacher-messages.html` | `TeacherChat.js` | 老師訊息中心 |
| `teacher-VideoRoom.html` | `video-room.js` | 老師視訊教室 |
| **管理後台** | | |
| `admin-dashboard.html` | `admin-dashboard.js` | 管理員後台 |

### 共用基礎設施 JS

| 檔案 | 說明 |
|------|------|
| `navbar.js` | 全站共用：`API_BASE_URL`、JWT 解析、角色導航、`showToast()`、`convertGoogleDriveUrl()` |
| `student-layout.js` | 學生後台共用：JWT 自動注入 axios header、401/403 攔截自動登出、sidebar toggle |
| `teacher-layout.js` | 老師後台共用：同上，角色為 TUTOR |
| `matter.js` | 首頁 hero 區域 Matter.js 物理動畫（互動式圖形） |
| `tokenTest.js` | 開發用 JWT 除錯面板（注入固定位置面板顯示 token） |
| `student-message.js` | Tailwind CSS 設計配色物件，非頁面邏輯 |

### 進入點

**`ApiApplication.java`** — Spring Boot 主類，啟動整個後端服務。

### 全域例外處理

**`exception/GlobalExceptionHandler.java`** — 以 `@ControllerAdvice` 統一攔截所有 Controller 拋出的例外，回傳一致的 JSON 錯誤格式。

### 角色體系

| 代碼 | 角色 | 說明 |
|------|------|------|
| 1 | STUDENT | 學生，可購買課程、預約時段 |
| 2 | TUTOR | 老師，可開課、管理排程 |
| 3 | ADMIN | 管理員，負責老師審核與平台管理 |

---

## 2. 核心功能說明

本節整合各模組，說明平台最重要的業務流程與設計重點，方便快速掌握系統全貌。

---

### 2.1 使用者角色與身份升級

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-1-user-role-upgrade.mmd)

平台以 **三角色** 設計：

| 角色 | 取得方式 | 主要能力 |
|------|----------|----------|
| STUDENT | 預設（註冊即得） | 購課、預約、聊天、視訊 |
| TUTOR | STUDENT 提交申請 → ADMIN 審核通過 | 開課、排程、收款、聊天、視訊 |
| ADMIN | 系統直接設定 | 審核老師、查看平台統計 |

> 角色升級流程：`POST /api/tutor/become` → status=1（待審）→ ADMIN PATCH status=2（通過）→ JWT 內角色不變，仍須透過 `tutor.status` 判斷老師資格。

---

### 2.2 課程預約完整流程

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-2-booking-flow.mmd)

```
① 學生在 explore.js 瀏覽課程
      GET /api/view/courses（含篩選：科目 / 週幾 / 時段 / 價格）

② 進入 booking.js 選取時段
      GET /api/view/teacher_schedule/{tutorId} → 取得老師 7×13 可用矩陣
      → buildFourWeeksDates()：產生 4 週日期
      → 學生勾選 → lessonCount × unitPrice = 總金額

③ 確認點數充足
      GET /api/users/me → wallet ≥ 總金額
      若不足 → 跳至 student-credits.js 儲值（ECPay）

④ 送出購買
      POST /api/shop/purchase { courseId, lessonCount, slots:[{date,hour},...] }
      後端 CheckoutService：
        1. 扣除學生 wallet
        2. 建立 Order（isExperienced = lessonCount=1）
        3. 逐筆建立 Booking（slotLocked=true 防重複）
        4. 寫入 WalletLog（transactionType=2 購課）
        5. 觸發 EmailService 寄送預約確認信

```

---

### 2.3 點數（Wallet）體系

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-3-wallet-flow.mmd)

平台以「點數」取代直接金流，所有交易都記錄於 `WalletLog`：

| transactionType | 說明 | 發生時機 |
|-----------------|------|----------|
| 1 | 儲值 | ECPay 付款成功 callback |
| 2 | 購課扣款 | `POST /api/shop/purchase` |
| 3 | 授課收入 | 老師完成課堂後的收入 |
| 4 | 退款 | 學生取消預約 / 整筆退款 |
| 5 | 提現 | 老師提領至銀行帳戶 `POST /api/wallet/withdraw` |

> `merchantTradeNo` 欄位設計為唯一鍵，防止網路重試或排程重跑造成重複入帳。

---

### 2.4 即時通訊架構

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-4-chat-architecture.mmd)

平台同時支援 **HTTP REST**（持久化訊息）與 **WebSocket STOMP**（即時推播）：

```
REST API（ChatMessageController）
  → 傳送文字、上傳媒體、查詢歷史記錄
  → 支援 6 種 messageType（文字/貼圖/語音/圖片/影片/檔案）

WebSocket STOMP
  傳送（client → server，由 broker prefix /app 路由到 Controller）
    → /app/signal/{bookingId}  ← WebRTC 信令（offer/answer/ICE candidate）
    → /app/chat/{bookingId}    ← 訊息中心 / 課中聊天共用入口（持久化 + broadcast）
    → /app/event/{bookingId}   ← 進出房間事件
  訂閱（server → client，broker 廣播）
    → /topic/room/{orderId}/chat    ← StudentChat.js / TeacherChat.js / video-room.js 共同訂閱
    → /topic/room/{orderId}/signal  ← video-room.js 訂閱（WebRTC 信令）
    → /topic/room/{orderId}/events  ← video-room.js 訂閱（房間 joined/left）
    → /topic/room/{orderId}/errors  ← 統一錯誤通道
```

> StudentChat.js 與 TeacherChat.js 都會建立 STOMP 連線並訂閱 `/topic/room/{orderId}/chat`，
> 因此學生送出訊息後老師端立即收到，反之亦然。兩者都保留 REST `POST /api/chatMessage` 作為 fallback。

> **WebSocketAuthInterceptor**：STOMP CONNECT 時從 header 取出 JWT 驗證，確保 WebSocket 連線身份安全。

---

### 2.5 視訊課（WebRTC）信令流程

[Mermaid 原始檔：時序圖](./docs/mermaid/code-walkthrough/2-5-webrtc-signaling-sequence.mmd)

[Mermaid 原始檔：流程圖](./docs/mermaid/code-walkthrough/2-5-webrtc-signaling-flow.mmd)

```
老師進入房間（Offerer）            學生進入房間（Answerer）
       ↓                                    ↓
  getUserMedia()                      getUserMedia()
  createOffer()                              ↓
  setLocalDescription()     ←── STOMP signal(offer) ───→
       ↓                          setRemoteDescription()
  setRemoteDescription()    ←── STOMP signal(answer) ───
  （連線建立）                       createAnswer()
       ↓                          setLocalDescription()
  雙方 onicecandidate → STOMP signal(candidate) → addIceCandidate()
  → P2P 媒體串流建立（STUN/TURN 協助穿透 NAT）
```

ICE Server：Google STUN + OpenRelay TURN（確保不同網路環境下均可連線）

---

### 2.6 動態課程搜尋（CourseSpec）

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-6-course-spec-flow.mmd)

`CourseSpec.java` 使用 **JPA Specification** 動態組合 WHERE 條件，支援：

- 老師姓名模糊搜尋（跨 join：course → tutor → user → name LIKE）
- 科目大類篩選（`subjectCategory` 代碼 + 9 範圍）
- 價格區間（`"min-max"` 字串解析）
- 週幾 + 時段（JOIN tutor_schedules；早上 9-12 / 下午 13-16 / 晚上 17-20）
- `query.distinct(true)` — 防止時段 JOIN 造成課程記錄重複展開

---

### 2.7 老師審核狀態機

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-7-tutor-review-state.mmd)

```
申請（status=1）
   → ADMIN 通過 → status=2（正式老師，可開課、排程、收款）
   → ADMIN 拒絕 → status=3（停權，前端 navbar 顯示「已停權」）
```

> navbar.js 每次載入時呼叫 `GET /api/tutor/application/status`，依狀態動態切換顯示「審核中 / 老師後台 / 已停權」。

---

### 2.8 安全性設計重點

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/2-8-security-flow.mmd)

| 機制 | 實作位置 | 說明 |
|------|----------|------|
| JWT 認證 | `JwtFilter` + `JwtService` | 每個請求驗證 Bearer Token |
| 路由角色保護 | `SecurityConfig` | 依角色限制 `/api/student/**`、`/api/tutor/**`、`/api/admin/**` |
| BCrypt 密碼加密 | `MemberService` | 註冊時加密，登入時驗證 |
| 時段防重複鎖 | `Booking.slotLocked` | 同一老師同一時段只能有一筆有效預約 |
| 撥款防重複 | `WalletLog.merchantTradeNo` 唯一鍵 | 排程重跑時不會重複入帳 |
| WebSocket 身份驗證 | `WebSocketAuthInterceptor` | STOMP 連線時驗證 JWT |

---

## 3. 認證模組（Auth）

### 模組說明

負責使用者的註冊、登入、JWT 發放與驗證，以及所有請求的身份鑑別。

---

### 後端

#### Controller — `controller/AuthController.java`（路由：`/api/auth`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 註冊（預設 STUDENT 角色） |
| POST | `/api/auth/registerV2` | 註冊（可選擇 STUDENT / TUTOR 角色） |
| POST | `/api/auth/login` | 登入，回傳 JWT token |

#### Services

- **`AuthService`**
  - `LoginResp loginReq(LoginReq)` — 驗證帳密（BCrypt），成功後呼叫 JwtService 產生 token
- **`MemberService`**
  - `void register(RegisterReq)` — 建立 STUDENT 使用者
  - `void register(RegisterReqV2)` — 建立使用者（含角色選擇）

#### Security 層

- **`JwtService`** — `generateToken(User)` 產生 JWT；`email(String token)` 解析 email
- **`JwtFilter`** — 每個請求進來先讀 `Authorization: Bearer <token>` 標頭，驗證後設定 `SecurityContextHolder`
- **`SecurityConfig`** — 定義哪些端點需要哪種角色，設定 BCrypt 密碼加密器，CORS 全開
- **`CustomUserDetailsService`** — 實作 Spring Security `UserDetailsService`，以 email 從 DB 查詢使用者
- **`SecurityUser`** — 包裝 `User` 的 `UserDetails` 實作

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/auth/LoginReq` | email, password |
| `dto/auth/LoginResp` | JWT token 字串 |
| `dto/auth/RegisterReq` | name, email, password, birthday |
| `dto/auth/RegisterReq.RegisterReqV2` | 繼承 RegisterReq，加 role 欄位 |
| `dto/auth/UserResp` | 完整使用者資訊回應 |

#### 路由權限（SecurityConfig）

```
公開  ：/api/auth/**, /api/view/**, /ws/**
STUDENT：/api/student/**, /api/shop/**, /api/ecpay/**
TUTOR ：/api/tutor/** (需 Auth), /api/teacher/**
ADMIN ：/api/admin/**
```

---

### 前端

#### `login.js`

```
表單提交 → POST /api/auth/login
→ 解析 JWT payload（base64 decode）
→ localStorage.setItem('jwt_token', 'userId', 'userRole', 'userName')
→ ADMIN → admin-dashboard.html | 其他 → index.html
```

- 支援 `redirect_after_login` 參數，登入後跳回原來頁面

#### `register.js`

```
表單提交 → POST /api/auth/register
→ 即時驗證：密碼長度 ≥ 8、密碼確認相符、email 格式
```

#### `registerV2.js`

```
POST /api/auth/registerV2（含角色 radio 選擇）
```

#### `navbar.js`（全站共用）

- 定義全域 `API_BASE_URL = "/api"`
- JWT 解析：決定 navbar 顯示登入/登出/角色入口
- `navLogout()` — 清除 localStorage，跳回首頁
- `showToast(msg, type)` — 全站 Toast 通知函數
- `convertGoogleDriveUrl(url)` — 將 Google Drive 分享連結轉換為可直接嵌入的縮圖 URL（`/uc?export=view&id=` 格式）

---

### 資料流

```
[前端 login.js]
使用者輸入帳密 → POST /api/auth/login
    ↓
[AuthController] → AuthService.loginReq()
    ↓
CustomUserDetailsService 查 DB → BCrypt 驗證
    ↓
JwtService.generateToken(user) → 回傳 { token: "eyJ..." }
    ↓
[前端] 解析 JWT payload → 存入 localStorage → 跳轉頁面

後續每個 API 請求：
axios header: Authorization: Bearer <token>
    ↓
JwtFilter → JwtService.email(token) → 查 DB 取 User → 設定 SecurityContextHolder
    ↓
Controller 方法執行
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `security/SecurityConfig.java` — 路由權限規則，新增 API 時必須在此放行
2. `security/JwtFilter.java` + `JwtService.java` — JWT 驗證流程
3. `assets/js/login.js` — 前端登入流程與 localStorage 儲存

**常見踩坑點**
- ⚠️ SecurityConfig 的路由匹配順序很重要，新端點若忘記加入 `permitAll()` 會收到 403
- ⚠️ JWT payload 結構（userId, name, role）影響所有前端頁面的 localStorage 解析
- ⚠️ `navbar.js` 的 `convertGoogleDriveUrl()` 全站共用，修改會影響所有頁面頭像顯示

---

## 4. 使用者模組（User/Profile）

### 模組說明

管理已登入使用者的個人資料查詢與更新、密碼修改，以及錢包記錄查詢。

---

### 後端

#### Controller — `controller/MeController.java`（路由：`/api/users`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/users/me` | 取得當前使用者資訊 |
| PUT | `/api/users/me` | 更新姓名、生日 |
| PUT | `/api/users/me/password` | 修改密碼（需提供舊密碼） |
| GET | `/api/users/wallet-logs` | 取得錢包交易記錄 |

#### Entity — `entity/User.java`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| name | String(100) | 姓名 |
| email | String(255) | 唯一，登入帳號 |
| password | String(255) | BCrypt 加密 |
| birthday | LocalDate | 生日（選填） |
| role | UserRole | STUDENT / TUTOR / ADMIN |
| wallet | Integer | 目前餘額（點數） |
| createdAt / updatedAt | Instant | 自動產生 |

#### Repository — `repo/UserRepo.java`

- `Optional<User> findByEmail(String email)`
- `boolean existsByEmail(String email)`

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/auth/UserResp` | 使用者完整資訊回應 |
| `dto/UserUpdateDTO` | 更新姓名、生日 |

---

### 前端

#### `student-settings.js`

- `loadUserProfile()` → `GET /api/users/me` — 填入表單
- 送出個人資料表單 → `PUT /api/users/me`
- 送出密碼表單 → `PUT /api/users/me/password`

#### `teacher-settings.js`

- 涵蓋使用者基本資料 + 老師個人檔案 + 密碼修改 + 檔案上傳
- `GET /api/users/me` → 填入姓名、Email 等基本資料
- `PUT /api/users/me` → 更新姓名
- `PUT /api/users/me/password` → 修改密碼（需提供舊密碼）
- `GET /api/tutor/me/profile` → 填入老師資料（頭銜、自我介紹、學歷、經歷）
- `PUT /api/tutor/me/profile` → 更新老師個人資料
- 檔案上傳：`POST /api/tutor/me/upload/avatar`（大頭照）、`/certificate1`（證書 1）、`/video1`（影片 1）等

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/MeController.java` — 使用者資料 CRUD 端點
2. `assets/js/student-settings.js` — 學生端設定邏輯
3. `assets/js/teacher-settings.js` — 老師端設定（混合 user + tutor 邏輯）

**常見踩坑點**
- ⚠️ `teacher-settings.js` 同時處理使用者基本資料、老師個人檔案、密碼修改和檔案上傳，修改時注意區分 API 端點
- ⚠️ 密碼修改需提供舊密碼驗證

---

## 5. 老師申請與審核模組（Tutor Application）

### 模組說明

處理使用者申請成為老師的流程，以及後台管理員審核老師資格的作業。

---

### 後端

> ⚠️ **注意**：前端 `become-tutor.js` 呼叫 `POST /api/tutor/become`，`navbar.js` 呼叫 `GET /api/tutor/application/status`，但後端目前**尚無對應 Controller 實作**。老師審核功能由 `AdminController.java` 提供部分端點。

#### Controller — `controller/AdminController.java`（路由：`/api/admin`，需 ADMIN 角色）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/admin/users` | 查詢所有用戶 |
| GET | `/api/admin/tutors/pending` | 查詢待審核教師（status=1） |
| PATCH | `/api/admin/tutors/{id}/approve` | 核准教師（status→2） |
| PATCH | `/api/admin/tutors/{id}/suspend` | 停權教師（status→3） |

#### Entity — `entity/Tutor.java`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | FK → User.id（一對一） |
| applyDate | LocalDate | 申請日期 |
| status | Integer | 1=待審 2=通過 3=停權 |
| title | String(50) | 老師頭銜 |
| intro | String(1000) | 自我介紹 |
| education | String(100) | 學歷 |
| experience1/2 | String(200) | 工作經歷 |
| certificate1/2 | String(500) | 證書檔案路徑 |
| certificateName1/2 | String | 證書名稱 |
| videoUrl1/2 | String(500) | 介紹影片 URL |
| bankCode / bankAccount | String | 銀行帳戶（撥款用） |
| avatar | String(500) | 頭像路徑 |

#### Repository — `repo/TutorRepo.java`

- `List<Tutor> findByStatusOrderByApplyDateAsc(Integer status)`

#### Repository — `repo/TutorRepository.java`

- `findAll()` — 供 AdminController 篩選使用

---

### 前端

#### `become-tutor.js`

```
身份確認（STUDENT 才能申請）
→ 填寫申請表（title, intro, education, experience1/2, certificateName1/2）
→ POST /api/tutor/become（含 Authorization header）
→ 成功後跳回首頁，navbar 顯示「審核中」badge
```

#### `navbar.js`

```
GET /api/tutor/application/status
→ status=1 → 顯示「審核中」
→ status=2 → 顯示老師後台入口
→ status=3 → 顯示「已停權」
```

#### `admin-dashboard.js`（老師審核 tab）

```
GET /api/admin/tutors/pending → 渲染待審清單
點擊老師 → GET /api/admin/tutors/{id} → 顯示詳情 Modal
管理員核准/拒絕 → PATCH /api/admin/tutors/{id}/status
```

---

### 老師狀態流程

```
使用者（STUDENT）
    → POST /api/tutor/become
    → 建立 Tutor（status=1，待審核）

管理員後台
    → 查看待審清單 → 審核資料（學歷、證書）
    → PATCH status=2（通過）/ status=3（停權）

navbar 定期或登入時
    → GET /api/tutor/application/status
    → 動態切換顯示
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/AdminController.java` — 目前唯一的後端審核端點
2. `assets/js/become-tutor.js` — 前端申請流程
3. `assets/js/admin-dashboard.js` — 管理員審核 UI

**常見踩坑點**
- ⚠️ **重要**：前端 `become-tutor.js` 呼叫的 `POST /api/tutor/become` 和 `navbar.js` 呼叫的 `GET /api/tutor/application/status` 在後端尚無實作
- ⚠️ `admin-dashboard.js` 呼叫了多個不存在的後端 API（`/api/admin/dashboard`、`/api/admin/tutors/counts`），這些是前端已做但後端未跟上的部分

---

## 6. 課程模組（Course）

### 模組說明

老師建立與管理課程，學生瀏覽課程（含篩選、分頁、評分）。

---

### 後端

#### Controller — `controller/CourseController.java`（路由：`/api/tutor/me/courses`，需 TUTOR 身份）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/tutor/me/courses` | 取得當前老師的所有課程 |
| GET | `/api/tutor/me/courses/{courseId}` | 取得單筆課程 |
| POST | `/api/tutor/me/courses` | 建立課程 |
| PUT | `/api/tutor/me/courses/{courseId}` | 更新課程 |
| DELETE | `/api/tutor/me/courses/{courseId}` | 刪除課程 |

#### Controller — `controller/CourseViewController.java`（公開）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/view/courses` | 多條件搜尋課程（含分頁、評分） |
| GET | `/api/view/teacher_schedule/{teacherId}` | 取得老師週排程（weekday → hours 對應表） |

**搜尋參數**：`teacherName`, `courseName`, `subjectCategory`, `subject`, `priceRange`, `weekday`, `timeSlot`, `page`, `size`

#### CourseSpec — `Spec/CourseSpec.java`（JPA Specification）

動態組合 WHERE 條件，支援：
- `isActive = true`（只顯示上架課程）
- 老師姓名模糊搜尋（JOIN tutor → user → name LIKE）
- 課程名稱模糊搜尋
- 科目代碼精確或大類別範圍（`subjectCategory` + 9）
- 價格區間（`"min-max"` 字串格式）
- 週幾 + 時段（早上 9-12 / 下午 13-16 / 晚上 17-20），JOIN tutor_schedules
- `query.distinct(true)` 避免時段重複展開

#### Services

- **`CourseService`**
  - `List<CourseDto> getCoursesByTutorId(Long tutorId)`
  - `CourseDto createCourse(Long tutorId, CourseReq dto)`
  - `CourseDto updateCourse(Long tutorId, Long courseId, CourseReq dto)`
  - `void deleteCourse(Long tutorId, Long courseId)`

#### Entity — `entity/Course.java`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| tutor | ManyToOne → Tutor | 授課老師 |
| name | String(200) | 課程名稱 |
| subject | Integer | 科目代碼（見下表） |
| description | String(1000) | 課程描述 |
| price | Integer | 每堂價格（點數） |
| isActive | Boolean | 是否上架（預設 true） |

**科目代碼對照**

| 代碼 | 說明 |
|------|------|
| 11 | 低年級（1-2 年級） |
| 12 | 中年級（3-4 年級） |
| 13 | 高年級（5-6 年級） |
| 21 | GEPT 全民英檢 |
| 22 | YLE 劍橋兒童英檢 |
| 23 | 先修課程 |
| 31 | 其他 |

#### Repository — `repo/CourseRepo.java`

- `List<Course> findByTutorId(Long tutorId)`
- `List<Course> findByTutorIdOrderByPriceAsc(Long tutorId)`
- 繼承 `JpaSpecificationExecutor<Course>`（供 CourseSpec 使用）

---

### 前端

#### `index.js`（首頁輪播）

```
GET /api/view/courses?size=50
→ 每位老師最多取 1 筆課程，最多顯示 8 位老師
→ renderTeacherCard()：顯示老師名、平均評分、科目 tag
→ enableDragScroll()：滑鼠拖曳輪播
→ convertGoogleDriveUrl()：Google Drive 分享連結 → 縮圖 URL
```

#### `explore.js`（瀏覽課程）

```
GET /api/view/courses?page=0&size=1000（一次全部載入）
→ 過濾掉 courseName.startsWith("體驗課") 的課程（體驗課已整合至預約流程，不在探索頁獨立顯示）
→ handleSearch()：套用篩選（關鍵字 / 科目 / 週幾 / 時段）
→ displayPage(page)：前端分頁（每頁 8 筆）
→ renderCards()：卡片翻面動畫（正面：課程資訊；背面：時間格）
```

#### `teacher-courses.js`（老師課程管理）

```
GET /api/tutor/me/courses → 顯示老師自己的課程清單
→ 依 (courseName + studentId) 分組顯示學生修課卡片
→ 顯示：total / done / leave / remaining 課堂數
```

#### `booking.js`（預約時段選擇）

```
GET /api/view/courses → 課程名稱、價格
GET /api/view/teacher_schedule/{tutorId} → 可用時段
→ buildFourWeeksDates()：產生 4 週日期陣列
→ renderWeekBar()：週切換按鈕
→ 點選時段 → 加入選擇清單 → 計算總金額
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `Spec/CourseSpec.java` — JPA Specification 動態查詢，理解篩選邏輯
2. `controller/CourseViewController.java` — 公開的課程搜尋 API
3. `assets/js/explore.js` — 前端課程瀏覽與篩選

**常見踩坑點**
- ⚠️ `CourseSpec` 中 `query.distinct(true)` 不可移除，否則 JOIN tutor_schedules 會造成課程記錄重複
- ⚠️ 科目代碼使用 `subjectCategory` + 9 的範圍慣例（如 11-19 都屬於同一大類）
- ⚠️ `explore.js` 前端會過濾掉 `courseName.startsWith("體驗課")` 的課程

---

## 7. 排程模組（Schedule）

### 模組說明

老師設定每週可授課的時間格（weekday + hour），學生預約時以此為依據顯示可選時段。

---

### 後端

#### Controller — `controller/TutorScheduleController.java`（路由：`/api/tutor/schedules`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/tutor/schedules/me/batch-toggle` | 批次切換多個時段（老師設定用） |
| POST | `/api/tutor/schedules/toggle` | 切換單一時段 |
| GET | `/api/tutor/schedules/{tutorId}` | 取得老師週排程（公開） |
| GET | `/api/tutor/schedules/me` | 取得當前登入老師的排程 |

#### Services

- **`TutorScheduleService`**
  - `String batchToggle(ScheduleDTO.BatchToggleReq req, SecurityUser me)` — 批次更新，若 slot 已存在則切換 isAvailable，不存在則新增
  - `String toggleSchedule(ScheduleDTO.ToggleReq req)` — 單一切換
  - `List<ScheduleDTO.Res> getWeeklySchedule(Long tutorId)` — 回傳 7×13 格的可用矩陣

#### Entity — `entity/TutorSchedule.java`

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| tutor | ManyToOne → Tutor | FK |
| weekday | Integer | 1（週一）～ 7（週日） |
| hour | Integer | 9 ～ 21 |
| isAvailable | Boolean | 是否可預約（預設 true） |

> **唯一約束**：`(tutor_id, weekday, hour)` 每個時段只能有一筆記錄

#### Repository — `repo/TutorScheduleRepo.java`

- `List<TutorSchedule> findByTutorId(Long tutorId)`
- `List<TutorSchedule> findByTutorIdOrderByWeekdayAscHourAsc(Long tutorId)`

#### DTO — `dto/ScheduleDTO.java`

- `BatchToggleReq`：`List<Slot>` slots（含 weekday, hour）
- `ToggleReq`：單一 weekday, hour
- `Res`：weekday, hour, isAvailable

---

### 前端

#### `teacher-schedule.js`（老師設定排程）

```
GET /api/tutor/schedules/me → 載入現有時段
→ 渲染 7×13 的週曆格
→ 點擊格子 → POST /api/tutor/schedules/me/batch-toggle
→ 即時更新 isAvailable 狀態
```

#### `student-schedule.js`（學生查看課表）

```
GET /api/bookings/tutor/{tutorId} → 已預約時段（排除）
GET /api/view/teacher_schedule/{tutorId} → 老師可用時段
→ 渲染週曆，顯示已預約 / 可選 / 不可用
→ 分頁顯示即將到來的課堂列表（10 筆/頁）
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `entity/TutorSchedule.java` — 理解時段資料結構
2. `controller/TutorScheduleController.java` — 排程 API
3. `assets/js/teacher-schedule.js` — 老師設定排程 UI

**常見踩坑點**
- ⚠️ `(tutor_id, weekday, hour)` 有唯一約束，重複插入會報錯
- ⚠️ 時段範圍為 weekday 1-7（週一到週日）、hour 9-21

---

## 8. 訂課與付款模組（Booking & Checkout）

### 模組說明

學生以點數購買課程並選擇時段，點數不足時透過 ECPay 儲值。課程完成後系統自動撥款給老師。

---

### 後端

#### Controller — `controller/CheckoutController.java`（路由：`/api/shop`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/shop/course/{courseId}/futurebookings` | 老師未來可預約時段 |
| GET | `/api/shop/me/futurebookings` | 學生已選的未來時段 |
| POST | `/api/shop/purchase` | 購買課程並建立訂單+預約 |

#### Controller — `controller/BookingController.java`（路由：`/api/bookings`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/bookings/tutor/{tutorId}` | 取得老師所有預約 |
| PATCH | `/api/bookings/{id}/status` | 更新預約狀態 |

#### Controller — `controller/EcpayController.java`（路由：`/api/ecpay`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/ecpay/pay` | 初始化 ECPay 付款（回傳 HTML form） |
| POST | `/api/ecpay/return` | ECPay 付款完成 callback（更新錢包） |

#### Services

- **`CheckoutService`**
  - `List<Slot> getTutorFutureBookings(Long courseId)` — 篩選老師排程中未被預約的未來時段
  - `String processPurchase(CheckoutReq req, Long studentId, UserRole role)` — 扣除學生點數、建立 Order + Booking 記錄
- **`BookingService`**
  - `Booking createBooking(...)` — 新增預約（slotLocked=true 防止重複預約）
  - `boolean updateStatus(Long id, Integer status)`
- **`WalletLogsService`**
  - `void processWalletDeposit(EcpayReturnDto dto)` — ECPay callback 後增加使用者點數，並記錄交易

#### Controller — `controller/OrderController.java`（路由：`/api/orders`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/orders` | 新增訂單 |
| PUT | `/api/orders/{id}` | 修改訂單（lessonCount / lessonUsed） |
| GET | `/api/orders/{id}` | 查詢單一訂單 |
| GET | `/api/orders/user/{userId}` | 查詢使用者所有訂單 |
| PATCH | `/api/orders/{id}/status` | 更新訂單狀態（pending→deal→complete） |
| DELETE | `/api/orders/{id}` | 取消訂單（僅限 pending 狀態） |

#### Controller — `controller/WalletController.java`（路由：`/api/wallet`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/wallet/topup` | 儲值（body: `{userId, amount}`） |
| POST | `/api/wallet/withdraw` | 提領至銀行帳戶（教師專用，body: `{tutorId, amount}`） |
| GET | `/api/wallet/logs/{userId}` | 查詢交易紀錄 |

#### Services

- **`OrderService`**
  - `boolean createOrder(OrderDto.Req)` — 新增訂單
  - `boolean updateOrder(Long id, OrderDto.UpdateReq)` — 更新堂數
  - `OrderDto.Resp getOrderById(Long)` — 查詢訂單
  - `List<OrderDto.Resp> getOrdersByUserId(Long)` — 查詢使用者訂單
  - `boolean updateStatus(Long id, OrderDto.StatusReq)` — 狀態遞進（不可回退）
  - `boolean cancelOrder(Long id)` — 取消 pending 訂單
- **`WalletService`**
  - `String topUp(Long userId, long amount)` — 儲值（type=1）
  - `String withdraw(Long tutorId, long amount)` — 提領（type=5，需有銀行帳戶）
  - `void credit(Long userId, long amount, int txType, int relatedType, Long relatedId)` — 增加餘額
  - `void debit(Long userId, long amount, int txType, int relatedType, Long relatedId)` — 扣除餘額
  - `List<WalletLog> getLogs(Long userId)` — 查詢交易記錄

#### EcpayUtil — `util/EcpayUtil.java`

- 產生 ECPay 所需的 CheckMacValue（SHA256 Hash）
- 建立 ECPay 傳入參數

#### Entities

**`entity/Order.java`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| userId | Long | 學生 FK |
| courseId | Long | 課程 FK |
| unitPrice | Integer | 購買時的每堂價格（快照） |
| discountPrice | Integer | 折扣後價格 |
| lessonCount | Integer | 購買堂數 |
| lessonUsed | Integer | 已上堂數 |
| isExperienced | Boolean | 是否為體驗課 |
| status | Integer | 1=處理中 2=進行中 3=完成 |

**`entity/Booking.java`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| orderId | Long | FK → Order |
| tutorId | Long | 老師 FK |
| studentId | Long | 學生 FK |
| date | LocalDate | 上課日期 |
| hour | Integer | 上課時段（9-21） |
| status | Integer | 1=預約 2=完成 3=取消 |
| slotLocked | Boolean | 鎖定時段，防止重複預約 |

**`entity/WalletLog.java`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| userId | Long | 使用者 FK |
| transactionType | Integer | 1=儲值 2=購課 3=授課收入 4=退款 5=提現 |
| amount | Long | 金額（正=收入，負=支出） |
| relatedType | Integer | 關聯類型（3=Bank 等） |
| relatedId | Long | 關聯 ID（orderId / bookingId） |
| merchantTradeNo | String(100) | 唯一交易序號（防重複） |
| dType | Integer | 付款方式類型 |
| paymentAmount | Integer | 實際付款金額 |
| createdAt | Instant | 自動產生 |

#### Repositories

- **`BookingRepo`** — `findByTutorIdAndDateAndHourAndSlotLockedTrue(...)` 防重複預約查詢；`findExpiredBookings()` / `updateExpiredBookings()` 排程用
- **`OrderRepository`** — `findByUserId(Long)` / `findByTutorId(Long)`（native query）
- **`WalletLogRepo` / `WalletLogsRepo`** — 兩個 repo（存在 legacy 版本，主要用 `WalletLogsRepo`）

---

### 前端

#### `booking.js`（預約頁）

> ℹ️ 另有 `bookingV2.js`、`bookingV3.js`、`bookingV4.js` 為預約流程的迭代/備選版本，結構類似但 UI 不同（V3/V4 為 Grid 版本）。主要使用 `booking.js`。

```
URL params: tutorId, courseId
GET /api/view/courses → 課程名稱、價格
GET /api/view/teacher_schedule/{tutorId} → 可用時段
→ buildFourWeeksDates()：產生 4 週日期陣列
→ renderWeekBar()：週切換按鈕
→ 點選時段 → 加入選擇清單 → 計算總金額

方案與折扣邏輯（getDiscountRate）：
  - 體驗課（1 堂，isTrial=true）：固定 200 點（不依原價計算）
  - 1 堂：原價 × 1.00（無折扣）
  - 5 堂：原價 × 0.95（95折）→ 顯示「✦ 95折優惠」
  - 10 堂：原價 × 0.90（9折）→ 顯示「✦ 9折優惠」
折扣後單價 = Math.floor(unitPrice × discountRate)

送出 → 跳至購買流程（結帳頁）
```

#### `student-credits.js`（點數/儲值）

```
GET /api/users/me → 顯示餘額
GET /api/users/wallet-logs → 交易明細
→ 交易類型：1=儲值 2=購課 3=授課收入 4=退款

儲值流程：
POST /api/ecpay/pay → 回傳 ECPay HTML form
→ 注入 DOM → 自動 submit → 跳轉 ECPay 結帳頁
→ 付款後 ECPay 回呼 POST /api/ecpay/return
→ 後端更新 wallet + 新增 WalletLog
```

#### `teacher-income.js`（老師收入）

```
GET /api/tutor/{tutorId}/stats → monthIncome, weekCount, avgRating
GET /api/users/wallet-logs → 詳細交易記錄（篩選 transactionType=3）
→ Chart.js 繪製 6 個月收入長條圖 + 課程圓餅圖
```

#### `student-wallet.js`（老師收入分析，命名易混淆）

> ⚠️ 檔案名雖為 student-wallet，但實際上是**老師端**收入分析頁，使用 `tutorId = localStorage.getItem('userId')`。

```
Promise.all([
  GET /api/users/me → 目前餘額
  GET /api/tutor/{tutorId}/stats → monthIncome（本月收入）
  GET /api/users/wallet-logs → 交易記錄
  GET /api/bookings/tutor/{tutorId} → 預約記錄（用於映射 bookingId → courseName）
])

統計卡片：目前餘額 / 本月收入 / 累計總收入（wallet-logs type=3 加總）

圖表（Chart.js）：
  - renderBarChart()：近 6 個月授課收入長條圖（依月份加總 transactionType=3）
  - renderPieChart()：收入課程佔比甜甜圈圖（依 courseName 分組）

明細列表（renderwalletList()）：授課收入明細（含課程名稱、學生名稱、日期）
```

---

### 資料流：購買課程

```
[student-credits 確認餘額] ─── 點數足夠 ───→
[booking.js 選時段] → POST /api/shop/purchase {
    courseId, lessonCount, slots: [{date, hour}, ...]
}
    ↓
[CheckoutService.processPurchase()]
    1. 驗證學生點數 ≥ 總金額
    2. 扣除 user.wallet
    3. 建立 Order（isExperienced 判斷：lessonCount=1）
    4. 逐筆建立 Booking（slotLocked=true）
    5. 寫入 WalletLog（transactionType=2）
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/CheckoutController.java` + `service/CheckoutService.java` — 購課核心流程
2. `assets/js/booking.js` — 前端預約選時段邏輯
3. `controller/WalletController.java` + `service/WalletService.java` — 錢包操作

**常見踩坑點**
- ⚠️ `Booking.slotLocked=true` 是防止同一老師同一時段被重複預約的關鍵機制
- ⚠️ ECPay callback URL 寫在 `EcpayController.java`，切換環境時需注意
- ⚠️ `WalletLogRepo` 和 `WalletLogsRepo` 並存（legacy），主要使用 `WalletLogsRepo`

---

## 9. 學生課程管理模組（Student Course）

### 模組說明

學生查看自己購買的所有課程套餐、各堂預約狀態，以及取消、退款功能。

---

### 後端

#### Controller — `controller/StudentCourseController.java`（路由：`/api`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/student-packages/me` | 取得學生所有購買套餐（訂單） |
| GET | `/api/student-packages/{packageId}` | 取得單一套餐詳情 |
| GET | `/api/courses/me` | 取得學生所有課程預約 |
| GET | `/api/bookings/me` | 依訂單 ID 取得預約列表 |
| GET | `/api/today/me` | 今日課程 |
| GET | `/api/daily/me` | 指定日期課程 |
| GET | `/api/future/me` | 未來課程 |
| POST | `/api/bookings/cancel` | 取消單一預約 |
| POST | `/api/orders/refund` | 退款整筆訂單 |

#### Controller — `controller/StudentController.java`（路由：`/api/student`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/student/profile` | 取得學生個人資料 |
| GET | `/api/student/bookings` | 取得學生預約記錄 |

#### Services

- **`StudentCourseService`**
  - `List<PackageResponseDTO> getMyPackages(Long userId)` — 取得訂單列表
  - `List<TodayCourseDto> getTodayCourses(Long userId)` — 今日課程
  - `List<TodayCourseDto> getFutureCourses(Long userId)` — 未來課程
  - `CancelResponseDTO cancelBooking(Long bookingId, Long userId)` — 取消預約，退回點數
  - `String refundEntireOrder(Long orderId, Long userId)` — 退款整筆訂單，退回剩餘點數

#### DTOs

| 類別 | 說明 |
|------|------|
| `PackageResponseDTO` | 訂單套餐（包含 lessonCount/lessonUsed/status） |
| `BookingResponseDTO` | 預約詳情（含課程名稱、老師名稱） |
| `TodayCourseDto` | 今日/未來課程摘要 |
| `CancelResponseDTO` | 取消結果（含退款金額） |

---

### 前端

#### `student-dashboard.js`（學生儀表板首頁）

```
Promise.allSettled([...]) 並行載入：
GET /api/users/me → 顯示點數餘額
GET /api/today/me?userId={userId} → 今日課堂數
GET /api/future/me?userId={userId} → 即將到來的 5 堂課（倒數顯示）
GET /api/courses/me → 課程資料
→ setGreeting()：依時段顯示早安/午安/晚安
```

#### `teacher-dashboard.js`（老師儀表板首頁）

```
loadStats()：
GET /api/tutor/{tutorId}/stats
→ monthIncome（本月收入）、weekCount（本週課堂）、avgRating（平均評分）、todayCount（今日課堂）

loadUpcomingBookings()：
Promise.all([
  GET /api/bookings/tutor/{tutorId},
  GET /api/view/courses
])
→ 建立 courseId → courseName Map
→ 顯示即將開始的課程卡片（依日期升序，含「⚡ 即將開始」時間標記）
→ setGreeting()：依時段顯示早安/午安/晚安
```

#### `lstudent-courses.js`（學習記錄）

```
對應頁面：student-learning-records.html
GET /api/courses/me → 取得學生所有預約
GET /api/reviews/user/{userId} → 取得學生所有評論（建立 reviewMap）
→ Tab 切換：upcoming / completed / cancelled
→ 邏輯與 student-courses.js 幾乎相同，為學習記錄頁的獨立版本
```

#### `student-courses.js`（我的課程）

```
GET /api/courses/me  → 取得學生所有預約（bookings）
GET /api/reviews/user/{userId} → 取得學生所有評論（建立 reviewMap）

Tab 切換：
→ upcoming  (status=1)：即將開始 → 依日期升序排列
→ completed (status=2)：已完成   → 依日期降序排列 + loadFeedback()
→ cancelled (status=3)：已取消   → 依日期降序排列

即將開始課程卡片（renderUpcomingCard）：
→ 顯示日期徽章、課程名稱、老師名稱
→「進入視訊教室」按鈕 → enterVideoRoom(bookingId, btn)

enterVideoRoom(bookingId, btn)：
1. 確認 jwt_token 存在，否則導向 login.html
2. 按鈕切換為「驗證中...」
3. GET /api/student/bookings（Authorization: Bearer token）
   → 比對 bookingId 確認預約存在
   → 找不到 → 提示錯誤，恢復按鈕
   → 401 → 清除 localStorage，導向 login.html
   → API 錯誤（非 401）→ 仍允許進入（由 video-room.js 二次驗證）
4. 驗證通過 → window.location.href = Student-VideoRoom.html?bookingId={id}

已完成卡片（renderCompletedCard）：
→ 學生評價（submitReview() → POST /api/reviews）
→ 老師課後回饋（loadFeedback() → GET /api/feedbacks/lesson/{bookingId}）
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/StudentCourseController.java` — 學生課程/預約/取消/退款 API
2. `assets/js/student-courses.js` — 我的課程頁面邏輯（含進入視訊教室）

**常見踩坑點**
- ⚠️ `lstudent-courses.js` 與 `student-courses.js` 邏輯幾乎相同但為獨立檔案，修改時需同步
- ⚠️ `enterVideoRoom()` 會先驗證 booking 歸屬再導向視訊頁面，API 錯誤時仍允許進入（由 video-room.js 二次驗證）

---

## 10. 評價與回饋模組（Review & Feedback）

### 模組說明

學生對課程留下星等評論（Review），老師對每堂課的學生表現留下回饋（Feedback）。

---

### 後端

#### Controller — `controller/ReviewController.java`（路由：`/api/reviews`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/reviews` | 所有評論 |
| GET | `/api/reviews/course/{courseId}` | 課程評論列表 |
| GET | `/api/reviews/course/{courseId}/average-rating` | 課程平均星等 |
| POST | `/api/reviews` | 新增評論 |
| PUT | `/api/reviews/{id}` | 更新評論 |
| DELETE | `/api/reviews/{id}` | 刪除評論 |

#### Controller — `controller/FeedbackController.java`（路由：`/api/feedbacks`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/feedbacks/lesson/{bookingId}` | 取得某堂課的回饋 |
| POST | `/api/feedbacks` | 新增課堂回饋 |
| PUT | `/api/feedbacks/{id}` | 更新回饋 |
| DELETE | `/api/feedbacks/{id}` | 刪除回饋 |

#### Services

- **`ReviewService`**
  - `Double getAverageRating(Long courseId)` — 計算平均星等
  - CRUD 操作
- **`FeedbackService`**
  - `List<Feedback> findByBookingId(Long bookingId)`
  - CRUD 操作

#### Entities

**`entity/Review.java`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| student | ManyToOne → User | FK |
| courseId | Long | 課程 FK |
| rating | Integer | 1-5 星 |
| comment | String(1000) | 評論內容 |
| updatedAt | Instant | 自動產生 |

**`entity/Feedback.java`**

| 欄位 | 型別 | 說明 |
|------|------|------|
| bookingId | Long | 課堂 FK |
| focusScore | Integer | 專注度 1-5 |
| comprehensionScore | Integer | 理解度 1-5 |
| confidenceScore | Integer | 自信度 1-5 |
| comment | String(1000) | 文字回饋 |

#### Repositories

- **`ReviewRepository`** — `findByCourseIdOrderByUpdatedAtDesc()` / `findAverageRatingByCourseId()`（自訂查詢）
- **`FeedbackRepository`** — `findByBookingId()`

---

### 前端

#### `student-reviews.js`（老師端，命名易混淆）

> ⚠️ 檔案名雖為 student-reviews，但實際上是**老師端**頁面，使用 `tutorId = localStorage.getItem("userId")`。

```
初始化：
GET /api/bookings/tutor/{tutorId} → 取得老師所有預約
GET /api/view/courses → 過濾屬於此老師的課程清單

Tab 1 - 學生評價：
GET /api/reviews/course/{courseId} → 依課程顯示學生評論
→ updateOverallStats()：計算平均分、評論數、好評率

Tab 2 - 課後回饋：
GET /api/feedbacks/lesson/{bookingId} → 查看/編輯已撰寫的回饋
→ openFeedbackModal() → 設定 focusScore / comprehensionScore / confidenceScore
→ POST /api/feedbacks（新增）或 PUT /api/feedbacks/{id}（更新）
```

#### `teacher-reviews.js`（老師端）

```
Tab 1 - 學生評論：
GET /api/reviews/course/{courseId} → 查看學生給的評論

Tab 2 - 課後回饋：
GET /api/feedbacks/lesson/{bookingId} → 查看/編輯課堂回饋
→ openFeedbackModal() → 設定 focusScore / comprehensionScore / confidenceScore
→ POST /api/feedbacks（新增）或 PUT /api/feedbacks/{id}（更新）
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/ReviewController.java` — 評價 CRUD
2. `controller/FeedbackController.java` — 課後回饋 CRUD
3. `assets/js/student-reviews.js` — 老師端評價/回饋頁面

**常見踩坑點**
- ⚠️ **命名混淆**：`student-reviews.js` 實際上是**老師端**頁面，使用 `tutorId = localStorage.getItem("userId")`
- ⚠️ **命名混淆**：`student-wallet.js` 也是**老師端**收入分析頁面

---

## 11. 訊息模組（Chat）

### 模組說明

學生與老師之間的訊息往來，支援文字、圖片、影片、音訊、貼圖、檔案。學生端與老師端皆透過 STOMP over WebSocket 即時雙向推播，並以 HTTP REST 作為歷史紀錄查詢、檔案上傳/下載與斷線時的 fallback 通道。

---

### 後端

#### Controller — `controller/ChatAndVideoController/ChatMessageController.java`（路由：`/api/chatMessage`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/chatMessage/booking/{bookingId}` | 取得某預約的訊息 |
| GET | `/api/chatMessage/orders?ids={id1,id2}` | 批次取得多訂單訊息 |
| GET | `/api/chatMessage/conversations` | 學生的對話列表（按老師分組） |
| GET | `/api/chatMessage/conversations/tutor/{tutorId}` | 老師的對話列表（按學生分組） |
| POST | `/api/chatMessage` | 傳送文字訊息 |
| POST | `/api/chatMessage/upload` | 上傳檔案（含訊息） |
| GET | `/api/chatMessage/download/{filename}` | 下載檔案 |
| PUT | `/api/chatMessage/{id}` | 修改訊息 |
| DELETE | `/api/chatMessage/{id}` | 刪除訊息 |

#### Controller — `controller/ChatAndVideoController/LinkPreviewController.java`（路由：`/api/linkPreview`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/linkPreview` | 解析連結預覽（title, description, image） |

#### Services

- **`ChatMessageService`** — CRUD、按 bookingId/orderId 查詢、對話分組
- **`FileStorageService`**
  - `String store(MultipartFile file)` — 以 UUID 重新命名後寫入 `uploads/` 目錄，回傳相對路徑（格式：`uploads/<uuid>.<ext>`）
  - `Resource load(String filename)` — 以 `UrlResource` 載入 `uploads/` 目錄下的檔案，供下載 API 回傳
  - `Integer detectMessageType(String contentType)` — 依 MIME type 對應 messageType 代碼（`image/* → 4`、`audio/* → 3`、`video/* → 5`、其他 → `6`）

#### Entity — `entity/ChatMessage.java`（推測）

| 欄位 | 型別 | 說明 |
|------|------|------|
| orderId | Long | 訂單 FK |
| role | Integer | 1=學生 2=老師 |
| messageType | Integer | 見下表 |
| message | String(1000) | 文字內容 |
| mediaUrl | String(500) | 媒體檔案路徑 |
| createdAt | Instant | 自動產生 |

**messageType（enums/MessageType.java）**

| 代碼 | 說明 | `message` 欄位 | `mediaUrl` 欄位 |
|------|------|--------------|----------------|
| 1 | 文字 TEXT | 訊息內容 | `null` |
| 2 | 貼圖 STICKER | emoji / 貼圖字元 | `null` |
| 3 | 語音 VOICE | `null` | 後端 `uploads/` 相對路徑 |
| 4 | 圖片 IMAGE | `null` | 後端 `uploads/` 相對路徑 |
| 5 | 影片 VIDEO | `null` | 後端 `uploads/` 相對路徑 |
| 6 | 檔案 FILE | 原始檔名（顯示用） | 後端 `uploads/` 相對路徑 |

**mediaUrl 存取方式（三個前端的差異）**

| 前端 | 存取方式 | 原因 |
|------|---------|------|
| `StudentChat.js` | `resolveMediaUrl()`：`http`/`blob:` 直接使用；否則補前綴 `/` | 純 HTTP，無額外授權 |
| `TeacherChat.js` | 同上 `resolveMediaUrl()`，直接放入 `<img src>` / `<audio src>` / `<video src>` | 純 HTTP，依賴 WebMvcConfig 靜態路徑 |
| `video-room.js` | `loadMediaWithAuth()`：透過 Axios 帶 `Authorization: Bearer` header 取得 blob，再 `URL.createObjectURL()` 設為 src | 視訊教室需 JWT 鑑權 |

**各 messageType 前端渲染邏輯**

| 代碼 | StudentChat.js / TeacherChat.js | video-room.js |
|------|---------------------------------|---------------|
| 1 TEXT | `escapeHtml(m.message)` | `bubble.textContent` + `fetchAndAppendLinkPreview()`（自動解析 URL 卡片） |
| 2 STICKER | 走 else 分支：`escapeHtml(m.message)`（顯示 emoji 字元） | `bubble.textContent`，樣式：`font-size:2.5rem; background:transparent` |
| 3 VOICE | `<audio src="${resolveMediaUrl(m.mediaUrl)}" controls>` | `loadMediaWithAuth(audio, msg.mediaUrl)` → blob URL |
| 4 IMAGE | `<img src="${resolveMediaUrl(m.mediaUrl)}">` 最大寬 200px | `loadMediaWithAuth(img, msg.mediaUrl)` → blob URL，點擊開新分頁 |
| 5 VIDEO | `<video src="${resolveMediaUrl(m.mediaUrl)}" controls>` 最大寬 240px | `loadMediaWithAuth(video, msg.mediaUrl)` → blob URL |
| 6 FILE | 取 `m.mediaUrl.split('/').pop()` 為 storedName；非 blob 時呼叫 `downloadFile(storedName, originalName)` → `GET /api/chatMessage/download/{storedName}` | `downloadWithAuth(msg.mediaUrl, msg.message)`：Axios blob + `<a download>` 觸發下載 |

---

### 檔案上傳、儲存與讀取

#### 後端上傳流程（`POST /api/chatMessage/upload`）

```
FormData 欄位：
  file      : Blob
  bookingId : number（最新的 orderId）
  role      : 1（學生）| 'tutor'（老師）| number（視訊室）
  message   : ''（後端從 MIME type 自動判斷 messageType 並存入 mediaUrl）

ChatMessageController.uploadFile()：
  1. FileStorageService.detectMessageType(file.contentType) → messageType
  2. FileStorageService.store(file)
       → 取 originalFilename 副檔名
       → UUID.randomUUID() + 副檔名 → 儲存檔名（防路徑衝突）
       → Files.copy(inputStream, uploads/<uuid>.<ext>)
       → 回傳 "uploads/<uuid>.<ext>"（相對路徑）
  3. 建立 ChatMessage：
       orderId     = bookingId 參數
       role        = 請求中的 role 欄位
       messageType = detectMessageType 結果
       message     = 原始檔名（僅 type=6；其他類型為空）
       mediaUrl    = "uploads/<uuid>.<ext>"
  4. 存入 DB → 回傳完整 ChatMessage JSON
```

#### 後端下載端點（`GET /api/chatMessage/download/{filename}`）

```
ChatMessageController.downloadFile(filename)：
  → FileStorageService.load(filename)
       → Path: uploads/ + filename（僅使用檔名，不允許路徑穿越）
       → new UrlResource(path.toUri())
       → 若檔案不存在 → 404
  → ResponseEntity<Resource>
       Content-Disposition: attachment; filename="<filename>"
       Content-Type: application/octet-stream
```

#### 靜態資源映射（`config/WebMvcConfig.java`）

```
addResourceHandlers：
  /uploads/**  →  file:uploads/
```

| 存取路徑 | 說明 | 需要 JWT |
|----------|------|----------|
| `GET /uploads/<uuid>.<ext>` | WebMvcConfig 靜態資源直接存取 | ❌ 公開 |
| `GET /api/chatMessage/download/{filename}` | Controller 端點，可加入鑑權邏輯 | ✅（依 SecurityConfig） |

> ⚠️ 目前 `/uploads/**` 在 `SecurityConfig` 中為 `permitAll()`，知道 UUID 檔名即可匿名存取。視訊教室改走下載 API 並帶 JWT，是更安全的做法。

#### 完整資料流（上傳 → 儲存 → 讀取）

```
【上傳】

前端選取檔案（<input type="file"> / 錄音 Blob）
  ↓
detectLocalType(file.type)                 ← 前端先判斷 messageType（預覽用）
  ↓
URL.createObjectURL(file)                  ← blob URL 暫時顯示預覽
  ↓
POST /api/chatMessage/upload
  FormData: { file, bookingId, role, message:'' }
  ↓
後端 detectMessageType(contentType)        ← 伺服器最終判斷（以後端為準）
FileStorageService.store()                 ← UUID 命名，寫入 uploads/
  ↓
回傳 ChatMessage { messageType, mediaUrl:"uploads/<uuid>.<ext>", message:原始檔名 }
  ↓
前端移除 blob 預覽，改用後端 mediaUrl 重新渲染

【DB 儲存狀態】

ChatMessage.mediaUrl = "uploads/<uuid>.<ext>"   ← 相對路徑，無 host
ChatMessage.message  = 原始檔名（僅 type=6 有值，供下載時顯示用）

【讀取 — 三條路徑】

路徑 A：StudentChat.js / TeacherChat.js（靜態資源，無需 JWT）
  resolveMediaUrl(mediaUrl)：
    if mediaUrl.startsWith('http') || mediaUrl.startsWith('blob:')
      → 直接使用
    else
      → 補前綴 "/" → "/uploads/<uuid>.<ext>"
  → WebMvcConfig 靜態資源直接提供
  → <img src> / <audio src> / <video src> 直接掛載

路徑 B：video-room.js（媒體預覽，帶 JWT）
  toProxyPath(fullUrl)：
    → 若 mediaUrl 含完整 host → 擷取 /uploads/... 部分
    → 否則保持 /uploads/<uuid>.<ext> 不變
  loadMediaWithAuth(element, mediaUrl)：
    → axios.get(mediaUrl, { responseType:'arraybuffer',
                             headers:{ Authorization: 'Bearer '+token } })
    → new Blob([data]) → URL.createObjectURL(blob)
    → element.src = blobUrl

路徑 C：下載檔案（messageType=6，帶 JWT）
  StudentChat.js / TeacherChat.js：
    downloadFile(storedName, originalName)：
      → GET /api/chatMessage/download/{storedName}（帶 Authorization header）
      → responseType:'blob' → Blob → URL.createObjectURL
      → <a href=blobUrl download="originalName">.click()
  video-room.js：
    downloadWithAuth(mediaUrl, originalName)：
      → axios.get(mediaUrl, responseType:'blob', Authorization header)
      → 同上觸發 <a download>
```

---

### 前端

#### `StudentChat.js`（學生訊息中心）— REST + WebSocket

```
初始化：GET /api/chatMessage/conversations
→ 後端回傳含 orderId / bookingIds[] / participantName / avatar / subject
→ 對話以 bookingId (=orderId) 為 key 管理，支援 URL ?bookingId= 直接開啟

選取對話（selectConversation）：
→ 若 conv.bookingIds.length > 0：
     GET /api/chatMessage/orders?ids={id1,id2,...}（批次取得多訂單訊息）
→ 否則：
     GET /api/chatMessage/booking/{bookingId}
→ renderMessages() 渲染訊息列表
→ connectWebSocket(orderIds) 建立 STOMP 連線並訂閱該對話所有 orderId

buildMsgHtml(m, conv)：
→ role=1 或 'student'（自己）→ 右側氣泡；其他 → 左側氣泡含頭像
→ messageType 4：<img>  5：<video>  3：<audio>
→ messageType 6（檔案）：
     - 非 blob → downloadFile()：GET /api/chatMessage/download/{storedName}
     - blob → <a download>

WebSocket 連線（connectWebSocket / subscribeOrders）：
→ 切換對話前先 unsubscribe 所有舊訂閱
→ 優先使用 StompJs.Client，降級使用 Stomp.over(SockJS)
→ 連線位址：{WS_BASE_URL}/ws，{WS_BASE_URL} 來自 window.location
→ connectHeaders：Authorization: Bearer {jwt}
→ reconnectDelay: 5000ms
→ 對每個 orderId 訂閱：
     /topic/room/{orderId}/chat    → 收到訊息若 role !== 1 才呼 appendMessage（避免自己訊息回音）
     /topic/room/{orderId}/errors  → console.error 記錄

發送文字（sendMessage）：
→ 樂觀更新：先呼 appendMessage 再送出
→ STOMP 已連線 → stompClient.publish /app/chat/{actualBookingId}
                  （actualBookingId 取 conv.bookingIds 最後一筆 = 最新訂單）
→ STOMP 未連線 → fallback POST /api/chatMessage
→ 失敗時還原 input.value

上傳檔案（uploadFile）：
→ detectLocalType(file.type)：
     image/*  → 4（IMAGE）
     audio/*  → 3（AUDIO）
     video/*  → 5（VIDEO）
     其他     → 6（FILE）
→ URL.createObjectURL(file) → blob URL → 先呼 appendMessage 顯示暫時預覽
→ POST /api/chatMessage/upload（FormData: { file, bookingId, role:1, message:'' }）
→ 成功：移除 blob 預覽節點，用後端回傳的 ChatMessage 重新 appendMessage
→ 失敗：移除 blob 預覽節點並顯示錯誤提示

下載檔案（downloadFile，messageType=6）：
→ GET /api/chatMessage/download/{storedName}（帶 Authorization: Bearer {jwt}）
→ responseType:'blob' → new Blob → URL.createObjectURL
→ 動態建立 <a href=blobUrl download="originalName"> 並觸發 .click()
→ 下載完成後 revokeObjectURL 釋放記憶體
```

#### `TeacherChat.js`（老師訊息中心）— REST + WebSocket

```
初始化：GET /api/chatMessage/conversations/tutor/{tutorId}
→ 後端回傳 flat List<ConversationDTO>
→ 依 studentId 分組：同一學生多筆訂單合併為一個對話
→ 對話物件：{ studentId, studentName, orderIds[], courses[], lastMessage, lastMessageTime }
→ 依 lastMessageTime 降序排列

選取對話（selectConversation）：
→ GET /api/chatMessage/orders?ids={orderIds.join(',')}（批次取全部訊息）
→ connectWebSocket(conv.orderIds) 建立 STOMP 連線並訂閱該學生底下所有 orderId

buildMsgHtml(m, conv)：
→ role=2 或 'tutor'（自己）→ 右側；其他 → 左側含頭像
→ messageType 渲染邏輯同 StudentChat.js

WebSocket 連線（connectWebSocket / subscribeBooking）：
→ 切換對話前先 unsubscribe 所有舊訂閱
→ 優先使用 StompJs.Client，降級使用 Stomp.over(SockJS)
→ 連線位址：{WS_BASE_URL}/ws（從 API_BASE_URL 自動推導）
→ connectHeaders：Authorization: Bearer {jwt}
→ reconnectDelay: 5000ms
→ 對每個 orderId 訂閱：
     /topic/room/{orderId}/chat    → 收到訊息若 role !== 2 才呼 appendMessage（避免自己訊息回音）
     /topic/room/{orderId}/errors  → console.error 記錄

發送訊息（sendMessage）：
→ targetOrderId = conv.orderIds[0]（取第一筆，與 StudentChat 取最後一筆方向相反）
→ STOMP 已連線 → stompClient.publish /app/chat/{targetOrderId}
→ STOMP 未連線 → fallback POST /api/chatMessage
→ 樂觀更新：先 appendMessage，送出失敗時還原 input

上傳檔案（uploadFile）：
→ detectLocalType(file.type)：同 StudentChat.js（4/3/5/6）
→ URL.createObjectURL(file) → blob URL → 先顯示暫時預覽
→ POST /api/chatMessage/upload（FormData: { file, bookingId:targetOrderId, role:'tutor', message:'' }）
→ 成功：移除 blob 預覽，用後端回傳的 ChatMessage 呼 appendMessage
→ 媒體 URL 透過 resolveMediaUrl() 補 "/" 前綴後掛載靜態資源
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/ChatAndVideoController/ChatMessageController.java` — 訊息 API 全覽
2. `assets/js/StudentChat.js` — 學生端（純 HTTP）
3. `assets/js/TeacherChat.js` — 老師端（REST + WebSocket）

**常見踩坑點**
- ⚠️ StudentChat.js 與 TeacherChat.js **皆**透過 STOMP over WebSocket 即時推播，並都保留 REST 為 fallback；不要誤以為學生端只用 HTTP
- ⚠️ 兩端對話分組維度不同：StudentChat 以 `bookingId`（訂單）為主，TeacherChat 以 `studentId`（學生）為主、底下聚合多個 `orderIds[]`
- ⚠️ 送出訊息選用的 `orderId` 方向**不對稱**：StudentChat 取 `bookingIds` 陣列**最後一筆**，TeacherChat 取 `orderIds` 陣列**第一筆**；雙方都會訂閱完整 orderId 清單以保證收得到，但若改動分組或新增訂單時須同步檢查
- ⚠️ 過濾自己訊息回音的 role 編號不同：學生用 `msg.role !== 1`、老師用 `msg.role !== 2`
- ⚠️ `resolveMediaUrl()`（StudentChat/TeacherChat）和 `loadMediaWithAuth()`（video-room.js）存取 mediaUrl 的方式不同
- ⚠️ `mediaUrl` 在 DB 中儲存為相對路徑（`uploads/<uuid>.<ext>`），不含 host；前端補 `/` 前綴即可對應靜態資源
- ⚠️ `message` 欄位在 type=6（FILE）時存的是**原始檔名**，下載時須以此作為 `<a download>` 的顯示名稱
- ⚠️ `/uploads/**` 目前公開存取（無需 JWT）；若需限制，應改走 `GET /api/chatMessage/download/{filename}` 並移除 SecurityConfig 中的 `permitAll()`
- ⚠️ 後端 `store()` 以 UUID 命名防衝突；前端 `detectLocalType()` 與後端 `detectMessageType()` 判斷邏輯一致，但各自獨立維護，修改時須同步

---

### 訊息模組架構圖

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/11-chat-architecture.mmd)

---

### 訊息模組流程圖

[Mermaid 原始檔](./docs/mermaid/code-walkthrough/11-chat-flow.mmd)

---

## 12. 視訊模組（Video Room / WebRTC）

### 模組說明

學生與老師在預約時段內進行一對一 WebRTC 視訊課，透過 STOMP WebSocket 交換信令（offer/answer/ICE candidate）。

---

### 後端

> ℹ️ **兩個 VideoRoomController**：後端存在兩個同名檔案。`controller/VideoRoomController.java`（根層級）為簡化版，僅做信令轉發；`controller/ChatAndVideoController/VideoRoomController.java`（子目錄）為完整版，包含預約驗證、角色檢查和 RoomService 整合。以下記錄的是**完整版**。

#### WebSocket Controller — `controller/ChatAndVideoController/VideoRoomController.java`

STOMP 訊息端點（前綴 `/app`，後端呼叫）：

| 路徑 | 說明 |
|------|------|
| `/app/signal/{bookingId}` | WebRTC 信令（offer / answer / candidate） |
| `/app/chat/{bookingId}` | 課中聊天（持久化 + broadcast 到 `/topic/chat/{bookingId}`） |
| `/app/event/{bookingId}` | 進出房間事件（joined / left） |

#### REST Controller — `controller/ChatAndVideoController/RoomRestController.java`（路由：`/api/room`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/room/{bookingId}/participants` | 取得房間目前參與者與狀態 |

#### Services

- **`RoomService`** — 維護房間參與者清單（in-memory Map）
  - `addParticipant(bookingId, userId, role)` — 加入房間
  - `removeParticipant(bookingId, userId)` — 離開房間
  - `getRoomStatus(bookingId)` — 取得目前人數和狀態

#### Config

**`config/WebSocketConfig.java`**
- STOMP endpoint：`/ws`（SockJS fallback）
- Message broker prefix：`/topic`
- Application destination prefix：`/app`
- 允許所有來源
- 注入 `WebSocketAuthInterceptor`

**`config/WebSocketAuthInterceptor.java`**
- 攔截 STOMP CONNECT 訊息
- 從 header 取出 JWT，驗證後設定 Principal

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/videoroom/RoomParticipant` | 參與者資訊（userId, role） |
| `dto/videoroom/RoomStatus` | 房間狀態（參與者清單） |
| `dto/videoroom/RoomError` | 錯誤訊息 |

---

### 前端 — `video-room.js`（最複雜的檔案）

#### 全域常數與身份

```
API_BASE_URL = '/api'
WS_URL       = window.location.origin + '/ws'
bookingId    ← URL ?bookingId=
token        ← localStorage.jwt_token
userId       ← localStorage.userId
userRole     ← normalizeRole(localStorage.userRole)  → 'student' | 'tutor'
```

#### 初始化流程（DOMContentLoaded）

```
1. Guard：無 bookingId → alert + 導向 student-courses.html
2. Guard：無 token → 存 redirect_after_login → 導向 login.html
3. isTokenExpired(jwt)：
   - base64 decode JWT payload 驗證 exp 欄位
   - 比對 payload.role / authorities 與 userRole 是否一致
   → 失效 → 導向 login.html
4. 頁面角色驗證：
   - teacher-VideoRoom.html + userRole=student → 強制導向 Student-VideoRoom.html
   - Student-VideoRoom.html  + userRole=tutor  → 強制導向 teacher-VideoRoom.html
5. 偵測非安全上下文（HTTP 非 localhost）→ console.warn
6. 有 #prejoin-overlay → initPreJoin()；否則直接 enterRoom()
```

#### Pre-join 前置畫面（initPreJoin）

```
GET /api/${userRole === 'tutor' ? 'tutor' : 'student'}/bookings
→ 比對 bookingId，取得課程名稱顯示於 #prejoin-course-name

getUserMediaSafe()：
→ 依序嘗試多種 constraints（含 facingMode:'user'）
→ 失敗若 NotFoundError → 顯示「未偵測到裝置」提示
→ 其他失敗 → 顯示「點擊以開啟預覽」retry 按鈕

iOS 相容：設定 video.playsinline + muted + autoplay

點擊「進入教室」→ enterRoom(previewStream)
```

#### 進入教室（enterRoom）

```
1. startLocalMedia(existingStream)：將本地串流掛載至 #local-video
2. connectStomp()：建立 STOMP over SockJS 連線
   - URL 帶 ?token= 供 Spring HandshakeInterceptor 讀取
   - connectHeaders 帶 Authorization: Bearer {token}
   - reconnectDelay: 5000ms
3. loadChatHistory()：GET /api/chatMessage/booking/{bookingId}
4. bindControls() + bindChat()：綁定 UI 事件
5. fetchRoomStatus()：GET /api/room/{bookingId}/participants
```

#### STOMP 訂閱（onStompConnected）

```
訂閱 /topic/room/{bookingId}/signal  → onSignalMessage（WebRTC 信令）
訂閱 /topic/room/{bookingId}/chat    → onChatMessage（課中聊天）
訂閱 /topic/room/{bookingId}/events  → onRoomEvent（進出房間）
訂閱 /topic/room/{bookingId}/errors  → onRoomError

publishEvent('joined')
延遲 2 秒 → checkPeerViaRest()（備援：REST 確認對方是否已在房間）
```

#### WebRTC 信令流程

```
角色分工：
→ 學生（Answerer）接收到 peer joined 事件後呼叫 initiateCallIfCaller()
→ 老師（Offerer 角色在此實作中由學生發起 offer，老師回 answer）
   → 實際上：學生 = Offerer，老師 = Answerer（ICE candidates）

onRoomEvent('joined')：
→ peerReady = true
→ initiateCallIfCaller()：
   - userRole === 'student' 才執行
   - 防重複：peerConnection 已在 new/connecting/connected 則跳過
   - createPeerConnection() → sendOffer()

createPeerConnection()：
→ 有本地媒體 → addTrack；無 → 加入 recvonly transceiver
→ ontrack：掛載遠端串流至 #remote-video，呼叫 .play()
→ onicecandidate → STOMP publish /app/signal/{bookingId} {type:'candidate'}
→ onconnectionstatechange：connected → 更新狀態徽章 ACTIVE
→ oniceconnectionstatechange：failed + role=student → ICE restart

sendOffer()：
→ createOffer() → setLocalDescription()
→ STOMP publish { type:'offer', senderRole, senderId, sdp }
→ 失敗自動重試（MAX_OFFER_RETRIES=3，scheduleOfferRetry()）

onSignalMessage(frame)：
→ type='offer'  → setRemoteDescription + createAnswer + publish answer
→ type='answer' → setRemoteDescription
→ type='candidate' → 若 remoteDescription 已設 → addIceCandidate
                      否則 → 加入 iceCandidateQueue
→ flushIceCandidates()：排空佇列中待加入的 ICE candidates
```

#### ICE Servers

```
- Google STUN： stun:stun.l.google.com:19302
                stun:stun1.l.google.com:19302
- OpenRelay TURN（NAT 穿透備援）：
    turn:openrelay.metered.ca:80
    turn:openrelay.metered.ca:443
    turn:openrelay.metered.ca:443?transport=tcp
iceCandidatePoolSize: 2
```

#### 課中聊天（Chat Panel）

```
loadChatHistory()：
→ GET /api/chatMessage/booking/{bookingId}
→ 逐筆呼 appendMessage(msg, normalizeRole(msg.role) === userRole)

onChatMessage(frame)：STOMP 即時接收 → appendMessage

sendTextMessage()：
→ STOMP publish /app/chat/{bookingId} { role:userRole, messageType:1, message }

handleFileUpload()：
→ POST /api/chatMessage/upload（FormData: file, bookingId, role）
→ 上傳成功後再透過 STOMP publish 廣播給雙方

appendMessage(msg, isMine)：
→ 依 messageType 渲染（文字/貼圖/語音/圖片/影片/檔案）
→ isMine=true → .mine 氣泡（右）；false → .theirs（左）
```

#### 控制列

```
toggleMic()   → localStream audioTracks.enabled 切換
toggleCam()   → localStream videoTracks.enabled 切換
toggleScreen()→ getDisplayMedia() 取得螢幕串流 → replaceTrack
stopScreenShare() → 恢復原鏡頭 track
hangUp()      → confirm → publishEvent('left') → cleanup() → index.html
cleanup()     → 清除 offerRetryTimer / localStream / screenStream / peerConnection / stompClient
```

#### 畫中畫（PiP）調整大小

```
initPipResize()：本地視訊視窗右下角 resize handle
→ mousedown/touchstart → 拖曳計算新寬度（MIN_W=90 / MAX_W=320）
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `assets/js/video-room.js` — 最複雜的前端檔案，WebRTC + STOMP + 聊天一體
2. `controller/ChatAndVideoController/VideoRoomController.java` — 完整版 STOMP 信令

**常見踩坑點**
- ⚠️ 學生是 Offerer（發起方），老師是 Answerer（回應方）——與直覺相反
- ⚠️ 後端存在兩個 `VideoRoomController`（根層級簡化版 vs ChatAndVideoController 完整版），注意區分
- ⚠️ iOS 裝置需要 `video.playsinline + muted + autoplay` 否則無法播放

---

## 13. 管理後台模組（Admin）

### 模組說明

管理員審核老師申請與管理平台使用者。

---

### 後端

#### Controller — `controller/AdminController.java`（路由：`/api/admin`，需 ADMIN 角色）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/admin/users` | 查詢所有用戶 |
| GET | `/api/admin/tutors/pending` | 查詢待審核教師（status=1） |
| PATCH | `/api/admin/tutors/{id}/approve` | 核准教師（status→2） |
| PATCH | `/api/admin/tutors/{id}/suspend` | 停權教師（status→3） |

> ⚠️ **注意**：前端 `admin-dashboard.js` 呼叫了 `GET /api/admin/dashboard`、`GET /api/admin/tutors`、`GET /api/admin/tutors/counts` 等端點，但後端目前尚無這些 API 的實作。

---

### 前端 — `admin-dashboard.js`

```
Tab 1 - 平台數據：
GET /api/admin/dashboard → 渲染統計卡片
→ updateTime()：右上角即時時鐘

Tab 2 - 老師審核：
GET /api/admin/tutors/pending → 待審清單
GET /api/admin/tutors/qualified → 已通過清單
GET /api/admin/tutors/suspended → 已停權清單
GET /api/admin/tutors/counts → 各狀態數字
→ 點擊老師 → Modal 顯示詳細資訊（學歷、證書連結、影片）
→ 核准 / 拒絕 → PATCH /api/admin/tutors/{id}/status
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/AdminController.java` — 後端僅有的 4 個管理端點
2. `assets/js/admin-dashboard.js` — 前端管理 UI

**常見踩坑點**
- ⚠️ 前端呼叫了多個後端尚未實作的 API（`/api/admin/dashboard`、`/api/admin/tutors`、`/api/admin/tutors/counts`、`/api/admin/tutors/qualified`、`/api/admin/tutors/suspended`）
- ⚠️ 後端目前只有 `pending` 篩選和 `approve`/`suspend` 操作

---

## 14. 老師個人檔案模組（Tutor Profile）

### 模組說明

老師個人頁面的查看（學生端）與編輯（老師後台），以及大頭照、證書、影片等檔案上傳。

---

### 後端

#### Controller — `controller/TutorController.java`（路由：`/api/tutor`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/tutor/bookings` | 老師自己的預約列表（需驗證） |
| GET | `/api/tutor/{id}` | 公開：取得老師完整個人頁（含特定課程評論） |
| GET | `/api/tutor/{id}/stats` | 老師統計：本週課堂數、本月收入、平均評分、今日課堂數 |

#### Controller — `controller/TutorProfileController.java`（路由：`/api/tutor/me/profile`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/tutor/me/profile` | 取得當前老師的個人資料（編輯用） |
| PUT | `/api/tutor/me/profile` | 更新老師個人資料 |

#### Controller — `controller/TutorUploadController.java`（路由：`/api/tutor/me/upload`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/tutor/me/upload/avatar` | 上傳大頭照 |
| POST | `/api/tutor/me/upload/certificate1` | 上傳證書 1 |
| POST | `/api/tutor/me/upload/certificate2` | 上傳證書 2 |
| POST | `/api/tutor/me/upload/video1` | 上傳介紹影片 1 |
| POST | `/api/tutor/me/upload/video2` | 上傳介紹影片 2 |

#### Services

- **`TutorService`**
  - `TutorUpdateDTO getProfileDTO(Long tutorId)` — 取得編輯用 DTO
  - `void updateProfile(Long tutorId, TutorUpdateDTO dto)` — 更新老師資料
  - `List<Review> findReviewsByCourseId(Long courseId)` — 取得課程評論（供個人頁使用）

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/TutorProfileDTO` | 公開個人頁資訊（含評論、課程、排程） |
| `dto/TutorUpdateDTO` | 編輯用老師資料 |
| `dto/TutorScheduleDTO` | 排程時段（weekday, hour） |

---

### 前端

#### `teacher-profile.js`（老師本人查看）

```
GET /api/tutor/{tutorId}?courseId={courseId}
→ 顯示個人頁：頭銜、介紹、學歷、經歷、課程按鈕、評論、影片、排程

GET /api/view/courses → 取得老師所有課程
GET /api/bookings/tutor/{tutorId} → 已預約時段（排除已滿）

renderSchedule()：
→ 過濾 24 小時內的時段（不可選）
→ 過濾已被 slotLocked 的時段
```

#### `student-profile.js`（學生查看老師個人頁）

邏輯與 `teacher-profile.js` 幾乎相同，是供學生瀏覽使用的版本。

#### `teacher-settings.js`（老師後台設定）

```
GET /api/tutor/me/profile → 填入現有資料

提交更新 → PUT /api/tutor/me/profile

檔案上傳：
→ POST /api/tutor/me/upload/avatar（FormData）
→ POST /api/tutor/me/upload/certificate1
→ POST /api/tutor/me/upload/video1
```

---

### 🚀 新人上手指南

**優先閱讀**
1. `controller/TutorProfileController.java` — 老師資料 GET/PUT
2. `controller/TutorUploadController.java` — 檔案上傳端點
3. `assets/js/teacher-settings.js` — 前端設定與上傳邏輯

**常見踩坑點**
- ⚠️ 上傳新大頭照/證書時，舊檔會被自動刪除（FileStorageService 會覆蓋）
- ⚠️ `student-profile.js` 和 `teacher-profile.js` 邏輯幾乎相同，是不同角色看同一老師頁面

---

## 15. Email 通知模組

### 模組說明

系統在預約建立、課後回饋等時機，發送 Email 通知給相關人員。

---

### 後端

#### `service/EmailService.java`

- `void sendSimpleEmail(String to, String subject, String text)` — 純文字 Email
- `void sendBookingEmail(EmailBookingDTO dto)` — 預約確認 Email（含時段明細）
- `void sendFeedbackEmail(FeedbackEmailDTO dto)` — 課後回饋通知 Email

#### `config/MailConfig.java`

- 設定 `JavaMailSender`（SMTP 帳號、密碼、主機）
- 透過 Spring Boot Mail 自動組態覆蓋或自訂

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/EmailBookingDTO` | 預約通知（收件人、老師名、課程名、時段列表） |
| `dto/EmailBookingTimeDTO` | 單筆時段（date, hour） |
| `dto/FeedbackEmailDTO` | 回饋通知（學生名、課程名、分數） |

---

### 🚀 新人上手指南

**優先閱讀**
1. `service/EmailService.java` — Email 發送方法
2. `config/MailConfig.java` — SMTP 設定

**常見踩坑點**
- ⚠️ `JavaMailSender` 需要正確的 SMTP 設定才會啟動，本機開發若無 SMTP 設定會導致 Email 功能靜默失效
- ⚠️ Email 是由 `CheckoutService` 等服務層觸發，不是由 Controller 直接呼叫

---

*文件由 Claude Code 自動產生，基於實際原始碼分析。最後更新：2026-04-08。*
