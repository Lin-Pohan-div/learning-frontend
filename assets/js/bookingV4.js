// =====================================================
// booking.js — 預約頁面（週課表格 Grid 版）
// =====================================================

const _bookingToken = localStorage.getItem("jwt_token");
if (_bookingToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${_bookingToken}`;
}

// ─── DOM ───
const tutorNameEl    = document.getElementById("tutorName");
const courseNameEl   = document.getElementById("courseName");
const coursePriceEl  = document.getElementById("coursePrice");
const canSelectEl    = document.getElementById("canSelect");
const selectedListEl = document.getElementById("selectedList");
const totalMinutesEl = document.getElementById("totalMinutes");
const totalLessonsEl = document.getElementById("totalLessons");
const totalPointsEl  = document.getElementById("totalPoints");
const bookingBtnEl   = document.getElementById("bookingBtn");
const prevWeekBtnEl  = document.getElementById("prevWeekBtn");
const nextWeekBtnEl  = document.getElementById("nextWeekBtn");
const weekBarEl      = document.getElementById("weekBar");

// ─── 狀態 ───
let unitPrice     = 0;
let selectedSlots = [];   // [{ date, hour }]
let weekIndex     = 0;    // 0~3
let walletBalance = 0;

// 老師可用時段 Map：weekday(1~7) -> Set<hour>
let tutorAvailableMap = {};
// 已被他人鎖定："YYYY-MM-DD_HH" Set
let lockedByOthers = new Set();
// 學生自己已約："YYYY-MM-DD_HH" Set
let lockedByMe = new Set();

// 這週的 7 個日期物件
let weekDates = [];

const HOURS = [9,10,11,12,13,14,15,16,17,18,19,20,21];
const DAY_LABEL = { 1:"一", 2:"二", 3:"三", 4:"四", 5:"五", 6:"六", 7:"日" };

function padTwo(n) { return String(n).padStart(2, "0"); }
function slotKey(date, hour) { return `${date}_${padTwo(hour)}`; }
function formatDate(d) {
  return `${d.getFullYear()}-${padTwo(d.getMonth()+1)}-${padTwo(d.getDate())}`;
}
function discountedUnitPrice(base, count) {
  if (count >= 10) return Math.floor(base * 0.9);
  if (count >= 5)  return Math.floor(base * 0.95);
  return base;
}

// ─── 主函式 ───
async function booking() {
  const params   = new URLSearchParams(window.location.search);
  const tutorId  = params.get("tutorId");
  const courseId = params.get("courseId");

  if (!tutorId || !courseId) {
    showError("缺少 tutorId 或 courseId 參數，請從課程頁面進入。");
    return;
  }

  if (bookingBtnEl) bookingBtnEl.disabled = true;

  try {
    const [coursesResp, scheduleResp, tutorBkResp, meBkResp, walletResp] =
      await Promise.allSettled([
        axios.get(`/api/view/courses`),
        axios.get(`/api/tutor/schedules/${tutorId}`),
        axios.get(`/api/shop/course/${courseId}/futurebookings`),
        axios.get(`/api/shop/me/futurebookings`),
        axios.get(`/api/users/me`),
      ]);

    // 課程資訊
    if (coursesResp.status === "fulfilled") {
      const course = (coursesResp.value.data.content || []).find(c => c.id === Number(courseId));
      if (course) {
        unitPrice = course.price || 0;
        if (coursePriceEl) coursePriceEl.innerText = unitPrice;
        if (courseNameEl)  courseNameEl.innerText  = course.courseName || "";
        if (tutorNameEl)   tutorNameEl.innerText   = course.teacherName || "";
      }
    }

    // 老師週期時段
    if (scheduleResp.status === "fulfilled") {
      tutorAvailableMap = {};
      (scheduleResp.value.data || []).forEach(s => {
        if (s.isAvailable) {
          if (!tutorAvailableMap[s.weekday]) tutorAvailableMap[s.weekday] = new Set();
          tutorAvailableMap[s.weekday].add(s.hour);
        }
      });
    }

    // 他人已約
    if (tutorBkResp.status === "fulfilled") {
      (tutorBkResp.value.data || []).forEach(s => lockedByOthers.add(slotKey(s.date, s.hour)));
    }

    // 自己已約
    if (meBkResp.status === "fulfilled") {
      (meBkResp.value.data || []).forEach(s => lockedByMe.add(slotKey(s.date, s.hour)));
    }

    // 錢包
    if (walletResp.status === "fulfilled") {
      walletBalance = walletResp.value.data?.wallet ?? 0;
    }

    injectGridStyles();
    injectDiscountBanner();
    injectWalletRow();
    renderWeekBar();
    renderGrid();

    if (prevWeekBtnEl) prevWeekBtnEl.onclick = () => {
      if (weekIndex > 0) { weekIndex--; renderWeekBar(); renderGrid(); }
    };
    if (nextWeekBtnEl) nextWeekBtnEl.onclick = () => {
      if (weekIndex < 3) { weekIndex++; renderWeekBar(); renderGrid(); }
    };

  } catch (err) {
    console.error("booking init error:", err);
    showError("頁面初始化失敗，請重新整理後再試。");
  }
}

// ─── 計算該週 7 天 ───
function buildWeekDates(weekOffset) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const todayWd = now.getDay() === 0 ? 7 : now.getDay();
  const monday  = new Date(now);
  monday.setDate(now.getDate() - (todayWd - 1) + weekOffset * 7);

  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const wd = d.getDay() === 0 ? 7 : d.getDay();
    result.push({
      fullDate: formatDate(d),
      month:    d.getMonth() + 1,
      day:      d.getDate(),
      weekday:  wd,
    });
  }
  return result;
}

// ─── 週切換：只更新日期資料與按鈕狀態，不渲染 weekBar 內容 ───
function renderWeekBar() {
  weekDates = buildWeekDates(weekIndex);
  if (prevWeekBtnEl) prevWeekBtnEl.disabled = weekIndex === 0;
  if (nextWeekBtnEl) nextWeekBtnEl.disabled = weekIndex === 3;
}

// ─── Grid CSS ───
function injectGridStyles() {
  if (document.getElementById("bookingGridStyle")) return;
  const style = document.createElement("style");
  style.id = "bookingGridStyle";
  style.textContent = `
    #scheduleGrid {
      display: grid;
      grid-template-columns: 50px repeat(7, 1fr);
      gap: 3px;
      width: 100%;
    }
    .g-corner { /* top-left empty */ }
    .g-day-hdr {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 0 10px;
      border-bottom: 2px solid #dee2e6;
      line-height: 1.4;
    }
    .g-hour-lbl {
      font-size: 11px;
      color: #868e96;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 6px;
      height: 42px;
      white-space: nowrap;
    }
    .g-cell {
      height: 42px;
      border-radius: 5px;
      border: 1.5px solid #e9ecef;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      transition: all 0.12s;
      cursor: default;
      user-select: none;
    }
    .g-cell.c-open {
      cursor: pointer;
      border-color: #adb5bd;
      background: #f8f9fa;
      color: #495057;
    }
    .g-cell.c-open:hover {
      background: #e2e6ea;
      border-color: #6c757d;
    }
    .g-cell.c-selected {
      cursor: pointer;
      background: #212529;
      border-color: #212529;
      color: #fff;
      font-weight: 700;
    }
    .g-cell.c-selected:hover {
      background: #343a40;
    }
    .g-cell.c-other {
      background: #f1f3f5;
      border-color: #e9ecef;
      color: #adb5bd;
    }
    .g-cell.c-mine {
      background: #fff9db;
      border-color: #ffe066;
      color: #e67700;
      font-size: 10px;
    }
    .g-cell.c-toosoon {
      background: #f8f9fa;
      border-color: #e9ecef;
      color: #ced4da;
      font-size: 10px;
    }
    .g-cell.c-empty {
      background: transparent;
      border-color: transparent;
    }
    .g-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 12px;
      font-size: 11px;
      color: #495057;
    }
    .g-legend span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .g-legend i {
      width: 14px; height: 14px;
      border-radius: 3px;
      border: 1.5px solid transparent;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

// ─── 渲染週課表 Grid ───
function renderGrid() {
  if (!canSelectEl) return;
  canSelectEl.innerHTML = "";

  const now    = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const grid = document.createElement("div");
  grid.id = "scheduleGrid";

  // ── 標頭列：空角 + 7天 ──
  grid.appendChild(Object.assign(document.createElement("div"), { className: "g-corner" }));

  weekDates.forEach(item => {
    const hdr = document.createElement("div");
    hdr.className = "g-day-hdr";
    hdr.innerHTML = `${item.month}/${item.day}<br><span style="font-weight:400;color:#868e96">週${DAY_LABEL[item.weekday]}</span>`;
    grid.appendChild(hdr);
  });

  // ── 每小時一列 ──
  HOURS.forEach(hour => {
    // 時間標籤
    const lbl = document.createElement("div");
    lbl.className = "g-hour-lbl";
    lbl.textContent = `${padTwo(hour)}`;
    grid.appendChild(lbl);

    // 7 格
    weekDates.forEach(dateObj => {
      const key       = slotKey(dateObj.fullDate, hour);
      const slotDT    = new Date(`${dateObj.fullDate}T${padTwo(hour)}:00:00`);
      const tutorOpen = tutorAvailableMap[dateObj.weekday]?.has(hour);
      const isPast    = slotDT < todayStart;   // 已過去的日期整天不可選
      const isTooSoon = slotDT > todayStart && slotDT <= cutoff; // 今天起算24h內
      const isOther   = lockedByOthers.has(key);
      const isMine    = lockedByMe.has(key);
      const isSelected= selectedSlots.some(s => s.date === dateObj.fullDate && s.hour === hour);

      const cell = document.createElement("div");
      cell.className = "g-cell";

      if (!tutorOpen || isPast) {
        cell.classList.add("c-empty");
      } else if (isSelected) {
        cell.classList.add("c-selected");
        cell.textContent = "✓";
        cell.onclick = () => toggleSlot(dateObj.fullDate, hour, cell);
      } else if (isMine) {
        cell.classList.add("c-mine");
        cell.textContent = "有課";
        cell.title = "你在此時段已有其他課程";
      } else if (isOther) {
        cell.classList.add("c-other");
        cell.textContent = "已約";
        cell.title = "此時段已被他人預約";
      } else if (isTooSoon) {
        cell.classList.add("c-toosoon");
        cell.textContent = "24h↓";
        cell.title = "需提前24小時以上預約";
      } else {
        cell.classList.add("c-open");
        cell.onclick = () => toggleSlot(dateObj.fullDate, hour, cell);
      }

      grid.appendChild(cell);
    });
  });

  canSelectEl.appendChild(grid);

  // 圖例
  const legend = document.createElement("div");
  legend.className = "g-legend";
  legend.innerHTML = `
    <span><i style="background:#212529;border-color:#212529"></i>已選</span>
    <span><i style="background:#f8f9fa;border-color:#adb5bd"></i>可預約</span>
    <span><i style="background:#fff9db;border-color:#ffe066"></i>我有課</span>
    <span><i style="background:#f1f3f5;border-color:#e9ecef"></i>已被預約</span>
    <span><i style="background:#f8f9fa;border-color:#e9ecef"></i>未滿24h</span>
  `;
  canSelectEl.appendChild(legend);
}

// ─── 切換時段選取 ───
function toggleSlot(date, hour, cell) {
  const idx = selectedSlots.findIndex(s => s.date === date && s.hour === hour);

  if (idx !== -1) {
    selectedSlots.splice(idx, 1);
    cell.className = "g-cell c-open";
    cell.textContent = "";
    cell.onclick = () => toggleSlot(date, hour, cell);
  } else {
    selectedSlots.push({ date, hour });
    cell.className = "g-cell c-selected";
    cell.textContent = "✓";
    cell.onclick = () => toggleSlot(date, hour, cell);
  }

  updateSummary();
}

// ─── 折扣提示橫幅 ───
function injectDiscountBanner() {
  const anchor = selectedListEl?.closest(".pb-4");
  if (!anchor || document.getElementById("discountBanner")) return;

  const banner = document.createElement("div");
  banner.id = "discountBanner";
  banner.className = "border-top pt-4 mb-4";
  banner.innerHTML = `
    <p class="ms-1 mb-3">✦ 多堂優惠</p>
    <div class="d-flex gap-3 ms-2 flex-wrap">
      <div class="border rounded-3 px-4 py-3 text-center" style="min-width:120px">
        <div class="sansTeg fs-3 text-primary fw-bold">95折</div>
        <div class="fw-bold mt-1">5 堂以上</div>
        <small class="text-muted d-block">單堂 ${Math.floor(unitPrice * 0.95)} 點</small>
      </div>
      <div class="border rounded-3 px-4 py-3 text-center bg-dark text-white" style="min-width:120px">
        <div class="sansTeg fs-3 fw-bold" style="color:#7dd3fc">9折</div>
        <div class="fw-bold mt-1">10 堂以上</div>
        <small class="d-block" style="color:#cbd5e1">單堂 ${Math.floor(unitPrice * 0.9)} 點</small>
      </div>
    </div>
  `;

  anchor.insertAdjacentElement("beforebegin", banner);
}

// ─── 注入錢包餘額列到右側欄（格式同「課程總時長」、「預約總堂數」） ───
function injectWalletRow() {
  if (document.getElementById("walletRow")) return;

  // 找「預約總堂數」那列的父容器，插在它下方
  const lessonsRow = totalLessonsEl?.closest(".d-flex.justify-content-between.border-bottom");
  if (!lessonsRow) return;

  const row = document.createElement("div");
  row.id = "walletRow";
  row.className = "d-flex justify-content-between border-bottom py-3";
  row.innerHTML = `
    <div class="pt-3">
      <p class="border d-inline-block px-3 bg-light py-1 rounded-pill">錢包餘額</p>
    </div>
    <div class="pt-3">
      <p id="walletBalanceEl" class="sansTeg d-inline-block fs-4">${walletBalance}</p>
      <span class="fw-light"> / 點</span>
    </div>
  `;

  lessonsRow.insertAdjacentElement("afterend", row);
}

// ─── 右側摘要更新 ───
function updateSummary() {
  const count  = selectedSlots.length;
  const uPrice = discountedUnitPrice(unitPrice, count);
  const total  = uPrice * count;

  if (totalLessonsEl) totalLessonsEl.innerText = count;
  if (totalMinutesEl) totalMinutesEl.innerText = count * 60;
  if (totalPointsEl)  totalPointsEl.innerText  = total;
  if (coursePriceEl)  coursePriceEl.innerText  = uPrice;

  const walletEl = document.getElementById("walletBalanceEl");
  if (walletEl) walletEl.innerText = walletBalance;

  if (selectedListEl) {
    selectedListEl.innerHTML = "";
    if (count === 0) {
      selectedListEl.innerHTML = `<p class="text-muted small">尚未選擇任何時段</p>`;
    } else {
      selectedSlots.forEach(s => {
        const tag = document.createElement("div");
        tag.className = "col-auto";
        tag.innerHTML = `<span class="badge bg-dark fs-6 px-3 py-2">${s.date} ${padTwo(s.hour)}:00</span>`;
        selectedListEl.appendChild(tag);
      });
    }
  }

  if (!bookingBtnEl) return;

  const isInsufficient = walletBalance > 0 && total > walletBalance;

  if (isInsufficient) {
    bookingBtnEl.disabled = false;
    bookingBtnEl.className = "btn btn-warning border border-1 p-3 w-100";
    bookingBtnEl.innerHTML = `<p class="mb-0 px-5 nunito">餘額不足，請儲值</p>`;
    bookingBtnEl.onclick = () => { window.location.href = "wallet.html"; };
  } else if (count === 0) {
    bookingBtnEl.disabled = true;
    bookingBtnEl.className = "btn btn-success border border-1 p-3 w-100";
    bookingBtnEl.innerHTML = `<p class="mb-0 px-5 nunito">確定預約</p>`;
    bookingBtnEl.onclick = null;
  } else {
    bookingBtnEl.disabled = false;
    bookingBtnEl.className = "btn btn-success border border-1 p-3 w-100";
    bookingBtnEl.innerHTML = `<p class="mb-0 px-5 nunito">確定預約 ${count} 堂</p>`;
    bookingBtnEl.onclick = handlePurchase;
  }
}

// ─── 送出預約 ───
async function handlePurchase() {
  const courseId = new URLSearchParams(window.location.search).get("courseId");
  const count    = selectedSlots.length;

  if (count === 0) {
    alert("請至少選擇一個時段");
    return;
  }

  bookingBtnEl.disabled = true;
  bookingBtnEl.innerHTML = `<p class="mb-0 px-5 nunito">預約中…</p>`;

  try {
    const resp = await axios.post("/api/shop/purchase", {
      courseId:      Number(courseId),
      lessonCount:   count,
      selectedSlots: selectedSlots.map(s => ({ date: s.date, hour: s.hour })),
    });
    alert("🎉 " + (resp.data.msg || "購買並預約成功！"));
    window.location.href = "my-bookings.html";
  } catch (err) {
    const msg    = err.response?.data?.msg || "預約失敗，請稍後再試。";
    const action = err.response?.data?.action;
    if (action === "recharge") {
      if (confirm("餘額不足，是否前往儲值？")) window.location.href = "wallet.html";
    } else {
      alert("❌ " + msg);
    }
    bookingBtnEl.disabled = false;
    updateSummary();
  }
}

function showError(msg) {
  if (canSelectEl) canSelectEl.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}

booking();