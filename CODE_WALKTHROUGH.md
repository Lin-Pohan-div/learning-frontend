# Code Walkthrough — Learning Platform

> **後端位址**：`src/main/java/com/learning/api`
> **前端位址**：`D:/learning-frontend01/learning-frontend/assets/js`

---

## 目錄

1. [專案總覽](#1-專案總覽)
2. [認證模組（Auth）](#2-認證模組auth)
3. [使用者模組（User/Profile）](#3-使用者模組userprofile)
4. [老師申請與審核模組（Tutor Application）](#4-老師申請與審核模組tutor-application)
5. [課程模組（Course）](#5-課程模組course)
6. [排程模組（Schedule）](#6-排程模組schedule)
7. [訂課與付款模組（Booking & Checkout）](#7-訂課與付款模組booking--checkout)
8. [學生課程管理模組（Student Course）](#8-學生課程管理模組student-course)
9. [評價與回饋模組（Review & Feedback）](#9-評價與回饋模組review--feedback)
10. [訊息模組（Chat）](#10-訊息模組chat)
11. [視訊模組（Video Room / WebRTC）](#11-視訊模組video-room--webrtc)
12. [管理後台模組（Admin）](#12-管理後台模組admin)
13. [老師個人檔案模組（Tutor Profile）](#13-老師個人檔案模組tutor-profile)
14. [Email 通知模組](#14-email-通知模組)

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
│  後端 (Spring Boot 3, Java)                          │
│  SecurityConfig + JwtFilter (認證層)                 │
│  Controllers → Services → Repositories               │
│  WebSocket：VideoRoomController / ChatMessageCtrl    │
│  排程：ScheduledTaskService（每小時自動執行）          │
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
| 後端框架 | Spring Boot 3, Spring Security, Spring Data JPA |
| 認證 | JWT（Bearer Token） |
| 即時通訊 | Spring WebSocket + STOMP |
| 排程任務 | Spring `@Scheduled` |
| 付款 | ECPay（台灣金流） |
| Email | JavaMailSender |
| 前端 | Vanilla JS, Axios, Bootstrap 5, Chart.js, Matter.js |
| 即時視訊 | WebRTC（STUN/TURN + STOMP 信令） |

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

## 2. 認證模組（Auth）

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

## 3. 使用者模組（User/Profile）

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

- 涵蓋使用者資料更新 + 老師個人檔案編輯（頭像、自我介紹、學歷、經歷、影片、時間表）
- 亦呼叫 `TutorProfileController` 和 `TutorUploadController` 的端點（詳見模組 13）

---

## 4. 老師申請與審核模組（Tutor Application）

### 模組說明

處理使用者申請成為老師的流程，以及後台管理員審核老師資格的作業。

---

### 後端

#### Controller — `controller/TutorApplicationController.java`（路由：`/api/tutor`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/tutor/become` | 提交老師申請 |
| GET | `/api/tutor/application/status` | 查詢申請審核狀態 |

#### Controller — `controller/AdminTutorController.java`（路由：`/api/admin/tutors`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/admin/tutors` | 取得所有老師及審核資訊 |
| GET | `/api/admin/tutors/pending` | 待審核（status=1） |
| GET | `/api/admin/tutors/qualified` | 已通過（status=2） |
| GET | `/api/admin/tutors/suspended` | 已停權（status=3） |
| GET | `/api/admin/tutors/{tutorId}` | 取得單一老師詳情 |
| PATCH | `/api/admin/tutors/{tutorId}/status` | 更新審核狀態 |
| GET | `/api/admin/tutors/counts` | 各狀態老師數量 |

#### Services

- **`TutorApplicationService`**
  - `void becomeTutor(Long userId, BecomeTutorReq req)` — 建立 Tutor 資料（status=1，待審核）
  - `Integer getApplicationStatus(Long userId)` — 回傳審核狀態碼
- **`AdminTutorService`**
  - `List<AdminTutorReviewDTO> getPendingTutors()` — 取得待審核清單
  - `Map<String, Object> updateStatus(Long tutorId, Integer status)` — 更新狀態

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
- `TutorReviewCountDTO countTutorStatus()` — 自訂查詢，取各狀態數量

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/auth/BecomeTutorReq` | 老師申請表單 |
| `dto/Admin/AdminTutorReviewDTO` | 管理員審核用老師資訊 |
| `dto/Admin/AdminTutorReviewReq` | 狀態更新請求 |
| `dto/Admin/TutorReviewCountDTO` | 各狀態數量統計 |

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

## 5. 課程模組（Course）

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

## 6. 排程模組（Schedule）

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

## 7. 訂課與付款模組（Booking & Checkout）

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

#### ScheduledTaskService（`service/ScheduledTaskService.java`）

> **核心商業邏輯**：每 3600 秒（1 小時）自動執行

```
1. 找出所有時間已過且 status=1 的 Booking
2. 對每筆 Booking 計算老師收入：
   - 體驗課（isExperienced=true）→ 老師拿 unitPrice 全額
   - 正式課（isExperienced=false）→ 老師拿 unitPrice × 80%
3. 新增 WalletLog（transactionType=3 授課收入）
4. 防重複撥款：檢查 merchantTradeNo="TUTOR_EARN_{bookingId}" 是否存在
5. 批次將 Booking status 改為 2（已完成）
```

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
| transactionType | Integer | 1=儲值 2=購課 3=授課收入 4=退款 |
| amount | Long | 金額（點數） |
| merchantTradeNo | String(100) | 唯一交易序號（防重複） |

#### Repositories

- **`BookingRepo`** — `findByTutorIdAndDateAndHourAndSlotLockedTrue(...)` 防重複預約查詢；`findExpiredBookings()` / `updateExpiredBookings()` 排程用
- **`OrderRepository`** — `findByUserId(Long)` / `findByTutorId(Long)`（native query）
- **`WalletLogRepo` / `WalletLogsRepo`** — 兩個 repo（存在 legacy 版本，主要用 `WalletLogsRepo`）

---

### 前端

#### `booking.js`（預約頁）

```
URL params: tutorId, courseId
GET /api/view/courses → 課程價格
GET /api/view/teacher_schedule/{tutorId} → 可用時段
→ 4 週日期選擇 + 時段格 → 勾選後計算 lessonCount × price
→ 送出 → 跳至購買流程（結帳頁）
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
    ↓
每小時 ScheduledTaskService
    → Booking 時間過 → status 1→2
    → 依體驗課/正式課算老師收入 → 寫入 WalletLog（transactionType=3）
```

---

## 8. 學生課程管理模組（Student Course）

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

#### `student-dashboard.js`（儀表板首頁）

```
GET /api/users/me → 顯示點數餘額
GET /api/today/me → 今日課堂數
GET /api/future/me → 即將到來的 5 堂課（倒數顯示）
→ setGreeting()：依時段顯示早安/午安/晚安
```

#### `student-courses.js`（我的課程）

```
GET /api/courses/me?userId={userId}
→ filterCourses()：全部 / 進行中 / 已完成 / 未開始
→ getProgress()：lessonUsed / lessonCount → 進度條
→ 每張卡片：聊天按鈕 → StudentChat.html
             視訊按鈕 → Student-VideoRoom.html?orderId={id}
```

---

## 9. 評價與回饋模組（Review & Feedback）

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

#### `student-reviews.js`（學生端）

```
Tab 1 - 我的評論：
GET /api/reviews/course/{courseId} → 顯示評論列表
GET /api/reviews/course/{courseId}/average-rating → 顯示平均分

Tab 2 - 課後回饋：
GET /api/feedbacks/lesson/{bookingId} → 查看老師給的回饋
→ 顯示 focusScore / comprehensionScore / confidenceScore
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

## 10. 訊息模組（Chat）

### 模組說明

學生與老師之間的訊息往來，支援文字、圖片、影片、音訊、貼圖、檔案。以 HTTP REST 為主，老師端另有 WebSocket 即時推播。

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
  - `String store(MultipartFile file)` — 儲存至 `uploads/` 目錄，回傳儲存檔名
  - `Resource load(String filename)` — 載入檔案供下載
  - `Integer detectMessageType(String contentType)` — 根據 MIME type 判斷訊息類型

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

| 代碼 | 說明 |
|------|------|
| 1 | 文字 TEXT |
| 2 | 貼圖 STICKER |
| 3 | 語音 VOICE |
| 4 | 圖片 IMAGE |
| 5 | 影片 VIDEO |
| 6 | 檔案 FILE |

#### 靜態檔案

**`config/WebMvcConfig.java`** — 將 `/uploads/**` 對應至伺服器上的實體目錄，供前端直接存取上傳的媒體檔。

---

### 前端

#### `StudentChat.js`（學生訊息中心）

```
GET /api/chatMessage/conversations → 左側對話列表（按老師分組）
→ selectConversation() → GET /api/chatMessage/booking/{bookingId}
→ buildMsgHtml()：依 messageType 渲染不同 UI（圖片 / 影片 / 音訊 / 檔案預覽）

發送文字：POST /api/chatMessage
上傳媒體：POST /api/chatMessage/upload（FormData）
下載檔案：GET /api/chatMessage/download/{storedName}
```

#### `TeacherChat.js`（老師訊息中心）

```
GET /api/chatMessage/conversations/tutor/{tutorId} → 左側學生對話列表
→ 與 StudentChat.js 邏輯相似
→ 額外支援 WebSocket STOMP：stompClient.subscribe('/topic/chat/{bookingId}')
   即時接收學生訊息（不需重整頁面）
```

---

## 11. 視訊模組（Video Room / WebRTC）

### 模組說明

學生與老師在預約時段內進行一對一 WebRTC 視訊課，透過 STOMP WebSocket 交換信令（offer/answer/ICE candidate）。

---

### 後端

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

### 前端 — `video-room.js`（最複雜的檔案，54KB）

```
URL params: bookingId, token（JWT）

初始化流程：
1. isTokenExpired() → 驗證 JWT 有效性與角色
2. 建立 STOMP WebSocket 連線（/ws）
3. getUserMedia() → 取得本地鏡頭/麥克風串流
4. 建立 RTCPeerConnection（ICE server 設定）

信令流程：
老師端（Offerer）：
→ createOffer() → setLocalDescription()
→ STOMP publish /app/signal/{bookingId} { type: "offer", sdp }
→ 等待 answer → setRemoteDescription()

學生端（Answerer）：
→ 收到 offer → setRemoteDescription()
→ createAnswer() → setLocalDescription()
→ STOMP publish /app/signal/{bookingId} { type: "answer", sdp }

雙方：
→ onicecandidate → publish { type: "candidate", candidate }
→ 對方 addIceCandidate()

ICE Servers：
- Google STUN：stun:stun.l.google.com:19302
- OpenRelay TURN：turn:openrelay.metered.ca:80
```

---

## 12. 管理後台模組（Admin）

### 模組說明

管理員查看平台統計數據，並審核老師申請。

---

### 後端

#### Controller — `controller/AdminPanelController.java`（路由：`/api/admin/dashboard`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/admin/dashboard` | 取得平台統計（使用者數、老師數、課程數、訂單數等） |

#### Services

- **`AdminPanelService`**
  - `DashboardDTO getDashboard()` — 聚合平台數據
- **`AdminTutorService`**（見模組 4）

#### Repository — `repo/DashboardRepo.java`

- 自訂原生 SQL 查詢：本月新增學生數、本月新增老師數、當日/本月收入、熱門課程列表

#### DTO — `dto/DashboardDTO.java`

包含：總使用者數、總老師數、總課程數、總預約數、本月新增、今日收入、本月收入、熱門課程

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

## 13. 老師個人檔案模組（Tutor Profile）

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

## 14. Email 通知模組

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

#### Controller — `controller/TestEmailController.java`（路由：`/test-email`）

僅供開發測試：

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/test-email/send` | 發送測試簡單 Email |
| POST | `/test-email/send-booking` | 發送測試預約 Email |
| POST | `/test-email/send-feedback` | 發送測試回饋 Email |

#### DTOs

| 類別 | 說明 |
|------|------|
| `dto/EmailBookingDTO` | 預約通知（收件人、老師名、課程名、時段列表） |
| `dto/EmailBookingTimeDTO` | 單筆時段（date, hour） |
| `dto/FeedbackEmailDTO` | 回饋通知（學生名、課程名、分數） |

---

*文件由 Claude Code 自動產生，基於實際原始碼分析。*
