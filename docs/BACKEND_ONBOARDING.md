# Backend Onboarding Guide — Learning Platform

> 給剛加入後端開發的工程師。本文件涵蓋 Spring Boot 環境設置、專案結構、模組說明、開發慣例與常見踩坑，讀完可獨立開始貢獻。
>
> **後端位址**：`src/main/java/com/learning/api`
> **前端說明**：請見 [ONBOARDING.md](./ONBOARDING.md)
> **模組深度文件**：請見 [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md)

---

## 目錄

1. [專案簡介](#1-專案簡介)
2. [環境需求與安裝](#2-環境需求與安裝)
3. [啟動與設定](#3-啟動與設定)
4. [後端目錄結構](#4-後端目錄結構)
5. [安全層（Security）](#5-安全層security)
6. [模組總覽與 API 速查](#6-模組總覽與-api-速查)
7. [資料庫 Entity 速查](#7-資料庫-entity-速查)
8. [WebSocket 架構](#8-websocket-架構)
9. [ECPay 金流整合](#9-ecpay-金流整合)
10. [Email 通知](#10-email-通知)
11. [檔案上傳與靜態資源](#11-檔案上傳與靜態資源)
12. [例外處理](#12-例外處理)
13. [常見開發情境](#13-常見開發情境)
14. [已知問題與 TODO](#14-已知問題與-todo)
15. [延伸閱讀](#15-延伸閱讀)

---

## 1. 專案簡介

線上家教媒合平台後端服務，以 Spring Boot 4 + Java 21 建構。對應前端為 Vite + Vanilla JS。

### 角色體系

| 代碼 | 角色 | 取得方式 | 主要能力 |
|------|------|----------|----------|
| STUDENT | 學生 | 預設（註冊即得） | 購課、預約、聊天、視訊 |
| TUTOR | 老師 | STUDENT 提交申請 → ADMIN 審核通過 | 開課、排程、收款、聊天、視訊 |
| ADMIN | 管理員 | 系統直接設定 | 審核老師、查看平台統計 |

### 技術棧

| 層級 | 技術 |
|------|------|
| 後端框架 | Spring Boot 4.0.2 (Java 21) |
| 安全層 | Spring Security + JWT (Bearer Token) |
| 資料庫 | Spring Data JPA / Hibernate |
| 即時通訊 | Spring WebSocket + STOMP (SockJS) |
| 付款 | ECPay（台灣金流） |
| Email | JavaMailSender |
| 動態查詢 | JPA Specification |

---

## 2. 環境需求與安裝

### 必要條件

| 工具 | 版本 | 確認指令 |
|------|------|----------|
| Java | **21** | `java -version` |
| Maven / Gradle | 視 Build 工具 | `mvn -v` / `gradle -v` |
| MySQL / PostgreSQL | 執行中 | DB 連線設定見 `application.properties` |

### 初次設定

```bash
# 1. 克隆後端儲存庫（或於後端 IDE 開啟）
git clone <backend-repo-url>
cd <backend-project>

# 2. 複製環境設定範本
cp src/main/resources/application.properties.example \
   src/main/resources/application.properties

# 3. 編輯 application.properties（填入 DB 帳密、JWT secret、ECPay 金鑰、SMTP 帳密）

# 4. 建置並啟動
./mvnw spring-boot:run
# 預設在 :8080 啟動
```

### application.properties 重點設定

```properties
# 資料庫
spring.datasource.url=jdbc:mysql://localhost:3306/learning
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
spring.jpa.hibernate.ddl-auto=update

# JWT
jwt.secret=YOUR_JWT_SECRET_KEY_AT_LEAST_32_CHARS

# ECPay
ecpay.merchant-id=YOUR_MERCHANT_ID
ecpay.hash-key=YOUR_HASH_KEY
ecpay.hash-iv=YOUR_HASH_IV
ecpay.return-url=http://YOUR_DOMAIN/api/ecpay/return

# SMTP（選填，無設定則 Email 功能靜默失效）
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_EMAIL
spring.mail.password=YOUR_APP_PASSWORD
```

> ⚠️ **`application.properties` 不可提交到 Git**，請確認已加入 `.gitignore`。

---

## 3. 啟動與設定

```bash
./mvnw spring-boot:run          # 開發啟動（熱重載）
./mvnw clean package            # 產出 JAR（佈署用）
java -jar target/api-*.jar      # 執行 JAR

./mvnw test                     # 執行所有測試
./mvnw test -Dtest=ClassName    # 執行單一測試類
```

### 跨域（CORS）

`SecurityConfig` 目前設定為 **CORS 全開**（允許所有來源），開發環境前端 Vite proxy 已處理；**生產環境部署前務必限縮 allowedOrigins**。

### 後端預設端口

| 服務 | 端口 |
|------|------|
| Spring Boot HTTP | `8080` |
| WebSocket (SockJS) | 同 `8080`，路徑 `/ws` |
| 靜態資源 (uploads) | 同 `8080`，路徑 `/uploads/**` |

---

## 4. 後端目錄結構

```
src/main/java/com/learning/api/
│
├── ApiApplication.java                 # ★ Spring Boot 主類，啟動入口
│
├── config/
│   ├── SecurityConfig.java             # ★ 路由權限、BCrypt、CORS、CSRF
│   ├── WebSocketConfig.java            # STOMP endpoint 設定、攔截器注入
│   ├── WebSocketAuthInterceptor.java   # STOMP CONNECT 時驗證 JWT
│   ├── MailConfig.java                 # JavaMailSender SMTP 設定
│   └── WebMvcConfig.java               # /uploads/** 靜態資源映射
│
├── security/
│   ├── JwtService.java                 # ★ JWT 生成 / 解析
│   ├── JwtFilter.java                  # ★ 每個請求驗證 Bearer Token
│   ├── CustomUserDetailsService.java   # UserDetailsService 實作（by email）
│   └── SecurityUser.java               # UserDetails 包裝類
│
├── controller/
│   ├── AuthController.java             # /api/auth — 登入、註冊
│   ├── MeController.java               # /api/users — 個人資料、密碼、錢包記錄
│   ├── AdminController.java            # /api/admin — 管理員操作
│   ├── CourseController.java           # /api/tutor/me/courses — 老師課程管理
│   ├── CourseViewController.java       # /api/view — 公開課程搜尋
│   ├── TutorController.java            # /api/tutor — 老師相關
│   ├── TutorProfileController.java     # /api/tutor/me/profile — 老師個人資料
│   ├── TutorUploadController.java      # /api/tutor/me/upload — 老師檔案上傳
│   ├── TutorScheduleController.java    # /api/tutor/schedules — 排程管理
│   ├── CheckoutController.java         # /api/shop — 購課流程
│   ├── BookingController.java          # /api/bookings — 預約管理
│   ├── OrderController.java            # /api/orders — 訂單管理
│   ├── StudentCourseController.java    # /api/student-packages, /api/courses/me 等
│   ├── StudentController.java          # /api/student — 學生相關
│   ├── WalletController.java           # /api/wallet — 儲值、提領
│   ├── EcpayController.java            # /api/ecpay — 金流 callback
│   ├── ReviewController.java           # /api/reviews — 課程評論
│   ├── FeedbackController.java         # /api/feedbacks — 課後回饋
│   └── ChatAndVideoController/
│       ├── ChatMessageController.java  # /api/chatMessage — 訊息 CRUD
│       ├── LinkPreviewController.java  # /api/linkPreview — 連結預覽
│       ├── VideoRoomController.java    # ★ STOMP 信令（完整版）
│       └── RoomRestController.java     # /api/room — 房間參與者 REST
│
├── service/
│   ├── AuthService.java                # 登入驗證
│   ├── MemberService.java              # 使用者 CRUD
│   ├── CourseService.java              # 課程 CRUD
│   ├── TutorService.java               # 老師資料 CRUD
│   ├── TutorScheduleService.java       # 排程 toggle、批次設定
│   ├── CheckoutService.java            # ★ 購課核心（扣款、建單、建預約）
│   ├── BookingService.java             # 預約 CRUD
│   ├── OrderService.java               # 訂單 CRUD
│   ├── StudentCourseService.java       # 學生課程查詢、取消、退款
│   ├── WalletService.java              # 錢包 credit / debit
│   ├── WalletLogsService.java          # ECPay callback 入帳
│   ├── ReviewService.java              # 評論 CRUD
│   ├── FeedbackService.java            # 課後回饋 CRUD
│   ├── ChatMessageService.java         # 訊息 CRUD、對話分組
│   ├── FileStorageService.java         # 檔案儲存 / 下載
│   ├── EmailService.java               # Email 發送
│   └── RoomService.java                # 視訊房間 in-memory 狀態
│
├── entity/
│   ├── User.java                       # 使用者（含 wallet 欄位）
│   ├── Tutor.java                      # 老師（status：1=待審 / 2=通過 / 3=停權）
│   ├── Course.java                     # 課程
│   ├── TutorSchedule.java              # 老師週排程（weekday + hour）
│   ├── Order.java                      # 訂單（購課套餐）
│   ├── Booking.java                    # 單堂預約（含 slotLocked）
│   ├── WalletLog.java                  # 錢包交易記錄
│   ├── Review.java                     # 學生評論
│   ├── Feedback.java                   # 課後回饋
│   └── ChatMessage.java                # 聊天訊息
│
├── repo/
│   ├── UserRepo.java
│   ├── TutorRepo.java / TutorRepository.java   # 兩個 repo 並存（legacy）
│   ├── CourseRepo.java                 # 繼承 JpaSpecificationExecutor
│   ├── TutorScheduleRepo.java
│   ├── BookingRepo.java
│   ├── OrderRepository.java
│   ├── WalletLogRepo.java / WalletLogsRepo.java # 兩個 repo（主用 WalletLogsRepo）
│   ├── ReviewRepository.java
│   ├── FeedbackRepository.java
│   └── ChatMessageRepository.java
│
├── dto/
│   ├── auth/                           # LoginReq, LoginResp, RegisterReq, UserResp
│   ├── ScheduleDTO.java                # BatchToggleReq, ToggleReq, Res
│   ├── TutorProfileDTO.java            # 公開個人頁資訊
│   ├── TutorUpdateDTO.java             # 編輯用老師資料
│   ├── OrderDto.java                   # 訂單相關 DTOs
│   ├── PackageResponseDTO.java         # 學生套餐
│   ├── BookingResponseDTO.java         # 預約詳情
│   ├── TodayCourseDto.java             # 今日/未來課程
│   ├── CancelResponseDTO.java          # 取消結果
│   ├── EmailBookingDTO.java            # 預約確認 Email
│   ├── FeedbackEmailDTO.java           # 回饋通知 Email
│   ├── EcpayReturnDto.java             # ECPay Callback
│   ├── CheckoutReq.java                # 購課請求
│   └── videoroom/                      # RoomParticipant, RoomStatus, RoomError
│
├── Spec/
│   └── CourseSpec.java                 # ★ JPA Specification 動態課程查詢
│
├── enums/
│   ├── UserRole.java                   # STUDENT / TUTOR / ADMIN
│   └── MessageType.java                # 1=文字 2=貼圖 3=語音 4=圖片 5=影片 6=檔案
│
├── util/
│   └── EcpayUtil.java                  # ECPay CheckMacValue 計算（SHA256）
│
├── exception/
│   └── GlobalExceptionHandler.java     # ★ @ControllerAdvice 統一例外回應
│
└── VideoRoomController.java            # ⚠️ 根層級簡化版（僅做信令轉發，非主要版本）
```

---

## 5. 安全層（Security）

### 路由權限（SecurityConfig）

新增 API 端點時，**必須**在 `SecurityConfig.java` 設定正確的存取規則，否則預設會返回 403。

```
公開（無需登入）：
  /api/auth/**           ← 登入、註冊
  /api/view/**           ← 課程瀏覽（公開搜尋）
  /ws/**                 ← WebSocket 連線
  /uploads/**            ← 靜態媒體資源

需要登入（任何角色）：
  /api/users/me/**       ← 個人資料
  /api/orders/**
  /api/bookings/**
  /api/ecpay/**
  /api/chatMessage/**
  /api/room/**

STUDENT 角色：
  /api/student/**
  /api/shop/**           ← 購課

TUTOR 角色：
  /api/tutor/**
  /api/teacher/**

ADMIN 角色：
  /api/admin/**
```

### JWT 流程

```
登入時：
  POST /api/auth/login
  → AuthService.loginReq()
  → BCrypt 驗證密碼
  → JwtService.generateToken(user) → 回傳 token

後續每個請求：
  Header: Authorization: Bearer <token>
  → JwtFilter.doFilterInternal()
  → JwtService.email(token) 解析 email
  → CustomUserDetailsService 查 DB 取 User
  → SecurityContextHolder 設定 Authentication
  → 進入 Controller
```

### JWT Payload 結構

JWT payload 包含 `userId`、`name`、`role`（前端 localStorage 解析用）。**修改 payload 結構會影響所有前端頁面**。

### BCrypt 密碼

- 註冊：`MemberService` 以 BCrypt 加密後存入 DB
- 登入：BCrypt 比對，**禁止存明文密碼**
- 密碼修改：需提供舊密碼驗證（`PUT /api/users/me/password`）

---

## 6. 模組總覽與 API 速查

### 認證模組（`/api/auth`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/auth/register` | 註冊（預設 STUDENT） | 公開 |
| POST | `/api/auth/registerV2` | 註冊（可選角色） | 公開 |
| POST | `/api/auth/login` | 登入，回傳 JWT | 公開 |

### 使用者模組（`/api/users`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/users/me` | 取得當前使用者資訊 | 登入 |
| PUT | `/api/users/me` | 更新姓名、生日 | 登入 |
| PUT | `/api/users/me/password` | 修改密碼（需提供舊密碼） | 登入 |
| GET | `/api/users/wallet-logs` | 取得錢包交易記錄 | 登入 |

### 老師申請與審核（`/api/tutor`、`/api/admin`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/tutor/become` | 申請成為老師 | STUDENT ⚠️ 尚未實作 |
| GET | `/api/tutor/application/status` | 查詢審核狀態 | 登入 ⚠️ 尚未實作 |
| GET | `/api/admin/users` | 查詢所有用戶 | ADMIN |
| GET | `/api/admin/tutors/pending` | 待審核老師列表 | ADMIN |
| PATCH | `/api/admin/tutors/{id}/approve` | 核准老師（status→2） | ADMIN |
| PATCH | `/api/admin/tutors/{id}/suspend` | 停權老師（status→3） | ADMIN |

### 課程模組（`/api/tutor/me/courses`、`/api/view`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/tutor/me/courses` | 老師課程列表 | TUTOR |
| POST | `/api/tutor/me/courses` | 建立課程 | TUTOR |
| PUT | `/api/tutor/me/courses/{id}` | 更新課程 | TUTOR |
| DELETE | `/api/tutor/me/courses/{id}` | 刪除課程 | TUTOR |
| GET | `/api/view/courses` | 多條件搜尋課程（含分頁）| 公開 |
| GET | `/api/view/teacher_schedule/{id}` | 老師週排程 | 公開 |

### 排程模組（`/api/tutor/schedules`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/tutor/schedules/me/batch-toggle` | 批次切換時段 | TUTOR |
| POST | `/api/tutor/schedules/toggle` | 切換單一時段 | TUTOR |
| GET | `/api/tutor/schedules/{tutorId}` | 取得老師週排程 | 公開 |
| GET | `/api/tutor/schedules/me` | 取得登入老師排程 | TUTOR |

### 訂課與付款模組

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/shop/course/{id}/futurebookings` | 老師未來可預約時段 | 登入 |
| GET | `/api/shop/me/futurebookings` | 學生已選未來時段 | 登入 |
| POST | `/api/shop/purchase` | 購買課程 | STUDENT |
| GET | `/api/bookings/tutor/{id}` | 老師所有預約 | TUTOR |
| PATCH | `/api/bookings/{id}/status` | 更新預約狀態 | 登入 |
| POST | `/api/ecpay/pay` | 初始化 ECPay 付款 | 登入 |
| POST | `/api/ecpay/return` | ECPay 付款 callback | 公開 |
| POST | `/api/wallet/topup` | 儲值 | 登入 |
| POST | `/api/wallet/withdraw` | 提領（教師） | TUTOR |
| GET | `/api/wallet/logs/{userId}` | 交易記錄 | 登入 |

### 訂單模組（`/api/orders`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/orders` | 建立訂單 | 登入 |
| GET | `/api/orders/{id}` | 查詢單一訂單 | 登入 |
| GET | `/api/orders/user/{userId}` | 查詢使用者訂單 | 登入 |
| PUT | `/api/orders/{id}` | 更新訂單堂數 | 登入 |
| PATCH | `/api/orders/{id}/status` | 更新訂單狀態 | 登入 |
| DELETE | `/api/orders/{id}` | 取消訂單（pending 才可） | 登入 |

### 學生課程管理（`/api/student-packages`、`/api/courses/me` 等）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/student-packages/me` | 學生所有購買套餐 | STUDENT |
| GET | `/api/student-packages/{id}` | 單一套餐詳情 | STUDENT |
| GET | `/api/courses/me` | 學生所有課程預約 | STUDENT |
| GET | `/api/bookings/me` | 依訂單 ID 取得預約 | STUDENT |
| GET | `/api/today/me` | 今日課程 | STUDENT |
| GET | `/api/future/me` | 未來課程 | STUDENT |
| POST | `/api/bookings/cancel` | 取消單一預約 | STUDENT |
| POST | `/api/orders/refund` | 退款整筆訂單 | STUDENT |

### 評價與回饋模組

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/reviews/course/{id}` | 課程評論列表 | 公開 |
| GET | `/api/reviews/course/{id}/average-rating` | 課程平均星等 | 公開 |
| POST | `/api/reviews` | 新增評論 | STUDENT |
| PUT | `/api/reviews/{id}` | 更新評論 | STUDENT |
| GET | `/api/feedbacks/lesson/{bookingId}` | 取得課堂回饋 | 登入 |
| POST | `/api/feedbacks` | 新增課堂回饋 | TUTOR |
| PUT | `/api/feedbacks/{id}` | 更新課堂回饋 | TUTOR |

### 訊息模組（`/api/chatMessage`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/chatMessage/booking/{bookingId}` | 取得預約訊息 | 登入 |
| GET | `/api/chatMessage/orders?ids=` | 批次取得多訂單訊息 | 登入 |
| GET | `/api/chatMessage/conversations` | 學生對話列表 | STUDENT |
| GET | `/api/chatMessage/conversations/tutor/{id}` | 老師對話列表 | TUTOR |
| POST | `/api/chatMessage` | 傳送文字訊息 | 登入 |
| POST | `/api/chatMessage/upload` | 上傳檔案（含訊息） | 登入 |
| GET | `/api/chatMessage/download/{filename}` | 下載檔案 | 登入 |
| PUT | `/api/chatMessage/{id}` | 修改訊息 | 登入 |
| DELETE | `/api/chatMessage/{id}` | 刪除訊息 | 登入 |

### 老師個人檔案（`/api/tutor`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/tutor/{id}` | 老師公開個人頁 | 公開 |
| GET | `/api/tutor/{id}/stats` | 老師統計數據 | 公開 |
| GET | `/api/tutor/me/profile` | 取得老師資料（編輯用） | TUTOR |
| PUT | `/api/tutor/me/profile` | 更新老師個人資料 | TUTOR |
| POST | `/api/tutor/me/upload/avatar` | 上傳大頭照 | TUTOR |
| POST | `/api/tutor/me/upload/certificate1` | 上傳證書 1 | TUTOR |
| POST | `/api/tutor/me/upload/certificate2` | 上傳證書 2 | TUTOR |
| POST | `/api/tutor/me/upload/video1` | 上傳介紹影片 1 | TUTOR |
| POST | `/api/tutor/me/upload/video2` | 上傳介紹影片 2 | TUTOR |

### 視訊房間（`/api/room`）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/room/{bookingId}/participants` | 取得房間目前參與者 | 登入 |

---

## 7. 資料庫 Entity 速查

### User（使用者）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| name | String(100) | 姓名 |
| email | String(255) | 唯一，登入帳號 |
| password | String(255) | BCrypt 加密，**禁止存明文** |
| birthday | LocalDate | 生日（選填） |
| role | UserRole | STUDENT / TUTOR / ADMIN |
| wallet | Integer | 目前點數餘額 |
| createdAt / updatedAt | Instant | 自動產生 |

### Tutor（老師）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | FK → User.id（一對一） |
| applyDate | LocalDate | 申請日期 |
| status | Integer | **1=待審 2=通過 3=停權** |
| title | String(50) | 老師頭銜 |
| intro | String(1000) | 自我介紹 |
| education | String(100) | 學歷 |
| experience1/2 | String(200) | 工作經歷 |
| certificate1/2 | String(500) | 證書檔案路徑 |
| certificateName1/2 | String | 證書名稱 |
| videoUrl1/2 | String(500) | 介紹影片 URL |
| bankCode / bankAccount | String | 銀行帳戶（撥款用） |
| avatar | String(500) | 頭像路徑 |

### Course（課程）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| tutor | ManyToOne → Tutor | 授課老師 |
| name | String(200) | 課程名稱 |
| subject | Integer | 科目代碼（見下方對照表） |
| description | String(1000) | 課程描述 |
| price | Integer | 每堂價格（點數） |
| isActive | Boolean | 是否上架（預設 true） |

**科目代碼對照**

| 代碼 | 說明 | 大類（subjectCategory） |
|------|------|------------------------|
| 11 | 低年級（1-2 年級） | 10 |
| 12 | 中年級（3-4 年級） | 10 |
| 13 | 高年級（5-6 年級） | 10 |
| 21 | GEPT 全民英檢 | 20 |
| 22 | YLE 劍橋兒童英檢 | 20 |
| 23 | 先修課程 | 20 |
| 31 | 其他 | 30 |

> ⚠️ CourseSpec 大類篩選語義：`subjectCategory` 參數會篩選 `subject` 在 `[subjectCategory, subjectCategory+9]` 範圍內的課程。

### TutorSchedule（老師排程）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| tutor | ManyToOne → Tutor | FK |
| weekday | Integer | 1（週一）～ 7（週日） |
| hour | Integer | 9 ～ 21 |
| isAvailable | Boolean | 是否可預約（預設 true） |

**唯一約束**：`(tutor_id, weekday, hour)` — 每個時段只能有一筆記錄。

### Order（訂單）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| userId | Long | 學生 FK |
| courseId | Long | 課程 FK |
| unitPrice | Integer | 購買時的每堂價格（快照） |
| discountPrice | Integer | 折扣後單價 |
| lessonCount | Integer | 購買堂數 |
| lessonUsed | Integer | 已上堂數 |
| isExperienced | Boolean | 是否為體驗課（lessonCount=1 時） |
| status | Integer | 1=處理中 2=進行中 3=完成 |

### Booking（單堂預約）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| orderId | Long | FK → Order |
| tutorId | Long | 老師 FK |
| studentId | Long | 學生 FK |
| date | LocalDate | 上課日期 |
| hour | Integer | 上課時段（9-21） |
| status | Integer | **1=預約 2=完成 3=取消** |
| slotLocked | Boolean | **鎖定時段，防止同一老師同一時段重複預約** |

### WalletLog（錢包交易記錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | Long | 主鍵 |
| userId | Long | 使用者 FK |
| transactionType | Integer | **1=儲值 2=購課 3=授課收入 4=退款 5=提現** |
| amount | Long | 金額（正=收入，負=支出） |
| relatedType | Integer | 關聯類型（3=Bank 等） |
| relatedId | Long | 關聯 ID（orderId / bookingId） |
| merchantTradeNo | String(100) | **唯一索引，防止 ECPay callback 重複入帳** |
| dType | Integer | 付款方式類型 |
| paymentAmount | Integer | 實際付款金額 |
| createdAt | Instant | 自動產生 |

### ChatMessage（聊天訊息）

| 欄位 | 型別 | 說明 |
|------|------|------|
| orderId | Long | 訂單 FK |
| role | Integer | 1=學生 2=老師 |
| messageType | Integer | 1=文字 2=貼圖 3=語音 4=圖片 5=影片 6=檔案 |
| message | String(1000) | 文字內容（或 type=6 時的原始檔名） |
| mediaUrl | String(500) | 媒體檔案相對路徑（`uploads/` 目錄） |
| createdAt | Instant | 自動產生 |

### Review（學生評論）

| 欄位 | 型別 | 說明 |
|------|------|------|
| student | ManyToOne → User | FK |
| courseId | Long | 課程 FK |
| rating | Integer | 1-5 星 |
| comment | String(1000) | 評論內容 |
| updatedAt | Instant | 自動產生 |

### Feedback（課後回饋）

| 欄位 | 型別 | 說明 |
|------|------|------|
| bookingId | Long | 課堂 FK |
| focusScore | Integer | 專注度 1-5 |
| comprehensionScore | Integer | 理解度 1-5 |
| confidenceScore | Integer | 自信度 1-5 |
| comment | String(1000) | 文字回饋 |

---

## 8. WebSocket 架構

### 端點設定（WebSocketConfig）

| 類型 | 路徑 | 說明 |
|------|------|------|
| STOMP endpoint | `/ws` | SockJS fallback，前端連線入口 |
| Message broker | `/topic` | broadcast 訂閱前綴 |
| Application prefix | `/app` | 客戶端發送訊息前綴 |

### STOMP 訊息流（VideoRoomController）

| 客戶端發送（`/app`） | 廣播到（`/topic`） | 說明 |
|---------------------|-------------------|------|
| `/app/signal/{bookingId}` | `/topic/room/{bookingId}/signal` | WebRTC 信令（offer/answer/ICE） |
| `/app/chat/{bookingId}` | `/topic/room/{bookingId}/chat` | 課中聊天（持久化 + broadcast） |
| `/app/event/{bookingId}` | `/topic/room/{bookingId}/events` | 進出房間事件（joined/left） |

TeacherChat 另訂閱 `/topic/room/{bookingId}/chat`（TeacherChat.js 即時收訊）。

### WebSocket 身份驗證（WebSocketAuthInterceptor）

STOMP `CONNECT` 訊息進來時：
1. 從 header 取出 `Authorization: Bearer <token>`
2. 呼叫 `JwtService` 驗證
3. 設定 `Principal`

> ⚠️ 若 WebSocket 連線失敗多為 JWT 過期或格式錯誤，先確認 token 有效性。

---

## 9. ECPay 金流整合

### 流程

```
① 前端 POST /api/ecpay/pay { amount, itemName, ... }
        ↓
② EcpayController 呼叫 EcpayUtil 組成 ECPay 參數
   → 計算 CheckMacValue（SHA256 加上 HashKey/IV）
   → 回傳 HTML form（含隱藏欄位 + autosubmit）
        ↓
③ 前端注入 HTML → 自動 submit → 跳轉 ECPay 結帳頁
        ↓
④ 使用者在 ECPay 完成付款
        ↓
⑤ ECPay server POST /api/ecpay/return（callback）
   → WalletLogsService.processWalletDeposit()
   → 驗證 CheckMacValue 防偽造
   → merchantTradeNo 唯一鍵防重複入帳
   → 更新 user.wallet（+amount）
   → 新增 WalletLog（transactionType=1）
```

### 重要安全注意事項

- **CheckMacValue 驗證**：callback 進來時必須重新計算並比對，防止偽造請求
- **merchantTradeNo 唯一**：DB 層唯一約束，防止 ECPay 重試或排程重跑造成重複入帳
- **回傳 `1|OK`**：callback 處理成功後需回傳此字串，否則 ECPay 會持續重試

---

## 10. Email 通知

### EmailService 主要方法

| 方法 | 觸發時機 | 說明 |
|------|----------|------|
| `sendBookingEmail(dto)` | `CheckoutService.processPurchase()` 成功後 | 發送學生預約確認 Email |
| `sendFeedbackEmail(dto)` | FeedbackService 新增回饋後 | 發送老師課後回饋通知 |
| `sendSimpleEmail(to, subject, text)` | 通用 | 純文字 Email |

### 注意事項

- Email 由**服務層**觸發，Controller 不直接呼叫
- 本機開發若無正確 SMTP 設定，`JavaMailSender` bean 會自動注入失敗或靜默失效；需在 `application.properties` 設定或以 mock bean 替代
- Gmail 需使用 App Password（非帳號原始密碼）

---

## 11. 檔案上傳與靜態資源

### 儲存路徑

- 檔案儲存至後端執行目錄下的 `uploads/` 資料夾
- `WebMvcConfig` 將 `/uploads/**` 路由映射為靜態資源（StudentChat / TeacherChat 直接 HTTP 存取）
- 前端 Vite proxy 將 `/uploads/**` 代理到 `http://localhost:8080`，開發環境無需特別設定

### FileStorageService

- `store(MultipartFile)` → 儲存檔案，回傳相對路徑（格式：`uploads/<uuid>.<ext>`）
- `load(filename)` → 載入 `Resource` 供下載 API 回傳
- `detectMessageType(mimeType)` → `image/* → 4 / audio/* → 3 / video/* → 5 / 其他 → 6`

### 視訊教室的媒體存取

視訊教室（`video-room.js`）透過 Axios + Authorization header 存取媒體，需走 `/api/chatMessage/download/{filename}` 端點（帶 JWT）而非直接讀靜態資源。確保該端點有正確的安全設定。

---

## 12. 例外處理

`exception/GlobalExceptionHandler.java` 以 `@ControllerAdvice` 統一攔截並回傳一致的 JSON 格式：

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "描述性錯誤訊息"
}
```

### 常見 HTTP 狀態碼規範

| 狀態碼 | 使用時機 |
|--------|----------|
| 200 | 成功 |
| 201 | 建立成功（POST） |
| 400 | 請求參數錯誤 |
| 401 | 未登入（JWT 無效 / 過期） |
| 403 | 已登入但無權限 |
| 404 | 資源不存在 |
| 409 | 衝突（如時段重複、merchantTradeNo 重複） |

> 前端 layout.js 的 Axios 攔截器會捕捉 401，自動清除 localStorage 並跳轉登入頁。

---

## 13. 常見開發情境

### 情境 A：新增一個需要登入的 API

1. 在對應的 Controller 新增端點（`@GetMapping`、`@PostMapping` 等）
2. 在 `SecurityConfig.requestMatchers()` 設定路由規則（哪個角色可存取）
3. 若需要取得當前登入使用者，在 Controller 方法注入 `@AuthenticationPrincipal SecurityUser me`
4. 在 Service 層寫業務邏輯，Repository 層操作 DB

```java
@GetMapping("/me/something")
public ResponseEntity<?> getSomething(
        @AuthenticationPrincipal SecurityUser me) {
    Long userId = me.getUser().getId();
    // ...
}
```

---

### 情境 B：操作錢包（WalletService）

```java
// 增加點數（例：退款）
walletService.credit(userId, amount, 4, relatedType, relatedId);

// 扣除點數（例：購課）
walletService.debit(userId, amount, 2, relatedType, relatedId);
```

transactionType 對照：1=儲值 2=購課 3=授課收入 4=退款 5=提現

---

### 情境 C：使用 CourseSpec 動態查詢

`Spec/CourseSpec.java` 使用 JPA Specification 動態組合 WHERE 條件，主要供 `CourseViewController` 的 `GET /api/view/courses` 使用。

```java
Specification<Course> spec = CourseSpec.build(teacherName, subjectCategory,
                                               priceRange, weekday, timeSlot);
Page<Course> courses = courseRepo.findAll(spec, pageRequest);
```

> ⚠️ `query.distinct(true)` 不可移除，否則 JOIN tutor_schedules 會造成課程記錄重複展開。

---

### 情境 D：新增 WebSocket 訊息類型

1. 在 `enums/MessageType.java` 新增代碼
2. 在 `VideoRoomController` 的對應 `@MessageMapping` 方法處理
3. 前端 `video-room.js` 的 `appendMessage()` 新增對應渲染邏輯

---

### 情境 E：排程相關（TutorScheduleService）

```java
// 批次切換老師時段
String result = tutorScheduleService.batchToggle(batchToggleReq, securityUser);
// 邏輯：slot 已存在 → 切換 isAvailable；不存在 → 新增

// 取得老師週排程（7×13 可用矩陣）
List<ScheduleDTO.Res> schedule = tutorScheduleService.getWeeklySchedule(tutorId);
```

---

### 情境 F：將檔案上傳位置從本地改為雲端儲存（以 AWS S3 / Azure Blob 為例）

目前 `FileStorageService` 將檔案儲存在後端執行目錄下的 `uploads/` 資料夾（本地磁碟）。若要改用雲端物件儲存，依下列步驟調整：

#### 1. 新增雲端 SDK 相依

**AWS S3（Maven）**
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.25.x</version>
</dependency>
```

**Azure Blob Storage（Maven）**
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-storage-blob</artifactId>
    <version>12.x.x</version>
</dependency>
```

#### 2. 在 `application.properties` 新增雲端憑證設定

```properties
# AWS S3
cloud.aws.region=ap-northeast-1
cloud.aws.s3.bucket=your-bucket-name
cloud.aws.credentials.access-key=YOUR_ACCESS_KEY
cloud.aws.credentials.secret-key=YOUR_SECRET_KEY

# 或 Azure Blob
azure.storage.connection-string=DefaultEndpointsProtocol=https;AccountName=...
azure.storage.container-name=uploads
```

> ⚠️ 這些金鑰**不可提交到 Git**，請確認已加入 `.gitignore`。

#### 3. 改寫 `FileStorageService`

將 `store()` 方法由寫入本地磁碟改為上傳至雲端，並回傳雲端公開 URL 或物件鍵值。

```java
// AWS S3 範例
@Service
public class FileStorageService {

    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    public String store(MultipartFile file) throws IOException {
        String key = "uploads/" + UUID.randomUUID() + getExtension(file);
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .build(),
            RequestBody.fromBytes(file.getBytes())
        );
        // 回傳公開 URL（需搭配 Bucket Policy 設為公開，或改用 presigned URL）
        return "https://" + bucket + ".s3.amazonaws.com/" + key;
    }

    public Resource load(String filename) {
        // 產生有效期限的 presigned URL 供前端下載
        GetObjectPresignRequest req = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(15))
            .getObjectRequest(r -> r.bucket(bucket).key(filename))
            .build();
        return new UrlResource(s3Presigner.presignGetObject(req).url());
    }
}
```

#### 4. 調整靜態資源映射

改用雲端後，`WebMvcConfig` 的 `/uploads/**` 本地映射可移除（前端直接存取雲端 URL）；但 `/api/chatMessage/download/{filename}` 端點若改為回傳 presigned URL 需同步修改前端取用邏輯。

#### 5. 前端注意事項

- `mediaUrl` 欄位原本儲存相對路徑（`uploads/<uuid>.<ext>`），改雲端後需儲存完整 URL 或物件鍵值，**需評估資料遷移計畫**。
- Vite proxy 的 `/uploads/**` 代理規則可移除。
- `StudentChat.js` / `TeacherChat.js` 中直接拼接 `/uploads/...` 的地方須改為使用 `mediaUrl` 回傳的完整 URL。

#### 雲端方案比較

| 方案 | 優點 | 注意事項 |
|------|------|----------|
| AWS S3 | 成熟、SDK 完整 | 需 IAM 權限設定；台灣延遲較高可選 ap-northeast-1（東京） |
| Azure Blob | 與 Azure AD 整合方便 | 連線字串需妥善保管 |
| GCP Cloud Storage | 與 GKE 整合佳 | 需啟用 Service Account |
| Cloudflare R2 | S3 相容、無出流量費 | 台灣使用者友善 |

---

## 14. 已知問題與 TODO

> 以下為目前已知的前後端對齊缺口，接手開發時請特別注意：

| 項目 | 狀態 | 說明 |
|------|------|------|
| `POST /api/tutor/become` | ⚠️ **後端未實作** | 前端 `become-tutor.js` 已呼叫，後端 Controller 尚無對應端點 |
| `GET /api/tutor/application/status` | ⚠️ **後端未實作** | `navbar.js` 每次載入時呼叫，後端尚未實作 |
| `GET /api/admin/dashboard` | ⚠️ **後端未實作** | `admin-dashboard.js` 已呼叫 |
| `GET /api/admin/tutors` | ⚠️ **後端未實作** | 全老師列表（非 `/pending`） |
| `GET /api/admin/tutors/counts` | ⚠️ **後端未實作** | 各狀態數字統計 |
| `GET /api/admin/tutors/qualified` | ⚠️ **後端未實作** | 已通過老師列表 |
| `GET /api/admin/tutors/suspended` | ⚠️ **後端未實作** | 已停權老師列表 |
| `TutorRepo` / `TutorRepository` 並存 | 🔄 Legacy | 兩個 repo 功能重疊，應統一 |
| `WalletLogRepo` / `WalletLogsRepo` 並存 | 🔄 Legacy | 主要使用 `WalletLogsRepo`，舊版保留 |
| `VideoRoomController`（根層級）| 🔄 Legacy | 簡化版，主要版本在 `ChatAndVideoController/` |
| SecurityConfig CORS 全開 | ⚠️ **生產前必須修改** | allowedOrigins 需限縮至正式域名 |

---

## 15. 延伸閱讀

| 文件 | 說明 |
|------|------|
| [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md) | 完整的前後端模組說明、所有 API 路徑、Entity 欄位、業務邏輯流程（含資料流圖） |
| [ONBOARDING.md](./ONBOARDING.md) | 前端開發入門（Vite、SCSS、Axios 規範） |
| [PRODUCT_FEATURES.md](./PRODUCT_FEATURES.md) | 產品功能概述（理解使用者情境） |

---

*最後更新：2026-04-07*
