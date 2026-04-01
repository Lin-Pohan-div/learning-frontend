// 自動帶入 JWT Token
const _bookingToken = localStorage.getItem("jwt_token");
if (_bookingToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${_bookingToken}`;
}

let tutorName = document.getElementById("tutorName");
let courseName = document.getElementById("courseName");
let coursePrice = document.getElementById("coursePrice");
let canSelect = document.getElementById("canSelect");

let selectedList = document.getElementById("selectedList");
let totalMinutes = document.getElementById("totalMinutes");
let totalLessons = document.getElementById("totalLessons");
let totalPoints = document.getElementById("totalPoints");
let bookingBtn = document.getElementById("bookingBtn");
let prevWeekBtn = document.getElementById("prevWeekBtn");
let nextWeekBtn = document.getElementById("nextWeekBtn");
let currentWeekIndex = 0;
bookingBtn.disabled = true;

let weekBar = document.getElementById("weekBar");

let selectedTime = [];
let currentScheduleData = {};
let bookedSlots = [];
let allDates = [];
let activeDate = null;
let selectedPackage = 0; // 目前選擇的方案（1 / 5 / 10）
let isTrial = false; // 是否為體驗課方案

// ─── 折扣率 ───
function getDiscountRate(count) {
  if (count === 10) return 0.9;
  if (count === 5) return 0.95;
  return 1.0;
}

function getDiscountedUnitPrice(unitPrice, count) {
  return Math.floor(unitPrice * getDiscountRate(count));
}

// ─── 更新右側統計欄 ───
function updateTotals() {
  let lessonCount = selectedTime.length;
  totalLessons.innerText = lessonCount;
  totalMinutes.innerText = lessonCount * 60;

  let unitPrice = Number(coursePrice.innerText);
  let total;
  if (isTrial) {
    total = 200; // 體驗課固定 200 點
  } else {
    let discountedUnit = getDiscountedUnitPrice(unitPrice, selectedPackage);
    total = discountedUnit * lessonCount;
  }
  totalPoints.innerText = total;

  // 折扣標示
  let discountLabel = document.getElementById("discountLabel");
  let originalPointsEl = document.getElementById("originalPoints");

  if (isTrial && lessonCount > 0) {
    discountLabel.innerText = "✦ 體驗課優惠";
    originalPointsEl.innerText = unitPrice + " 點";
    originalPointsEl.classList.remove("d-none");
  } else if (!isTrial && selectedPackage > 1 && lessonCount > 0) {
    let originalTotal = unitPrice * lessonCount;
    discountLabel.innerText =
      selectedPackage === 10 ? "✦ 9折優惠" : "✦ 95折優惠";
    originalPointsEl.innerText = originalTotal + " 點";
    originalPointsEl.classList.remove("d-none");
  } else {
    discountLabel.innerText = "";
    originalPointsEl.classList.add("d-none");
  }

  // 已選清單改為 badge pills（含右上角 X 刪除鈕）
  if (lessonCount === 0) {
    selectedList.innerHTML = "";
  } else {
    selectedList.innerHTML = selectedTime
      .map(function (t) {
        return `
        <div class="col-auto">
          <span class="badge bg-dark text-white px-3 py-2 rounded-3 position-relative" style="padding-right:1.6rem !important;">
            ${t}
            <button
              type="button"
              data-time="${t}"
              class="btn-remove-time position-absolute rounded-circle border-0 d-flex align-items-center justify-content-center"
              style="width:16px;height:16px;background:#dc3545;cursor:pointer;padding:0;line-height:1;top:-6px;right:-6px;"
              title="移除">
              <span style="font-size:10px;color:#fff;line-height:1;">&times;</span>
            </button>
          </span>
        </div>`;
      })
      .join("");

    // 綁定刪除事件
    selectedList.querySelectorAll(".btn-remove-time").forEach(function (btn) {
      btn.onclick = function () {
        let timeToRemove = btn.dataset.time;
        let idx = selectedTime.indexOf(timeToRemove);
        if (idx !== -1) selectedTime.splice(idx, 1);

        // 同步取消格子上的 selected 樣式
        canSelect
          .querySelectorAll(".card-content.selected")
          .forEach(function (card) {
            let parts = timeToRemove.split(" ");
            let h = parseInt(parts[1]);
            let dateText = parts[0];
            let cardTime = card.closest("[data-time]");
            // 比對格子的顯示時間文字
            let hourEl = card.querySelector("p.display-5");
            if (
              hourEl &&
              hourEl.textContent.trim() ===
                String(h).padStart(2, "0") + ":00" &&
              card.closest(".col-md-4") &&
              activeDate === dateText
            ) {
              card.classList.remove("selected", "btn-dark", "text-dark");
            }
          });

        updateTotals();
      };
    });
  }

  // 確定預約按鈕：要選滿方案堂數才能啟用
  bookingBtn.disabled = !(
    selectedPackage > 0 && lessonCount === selectedPackage
  );
}

// ─── 套餐按鈕初始化 ───
function setupPackageButtons(unitPrice) {
  let price1 = unitPrice;
  let price5 = getDiscountedUnitPrice(unitPrice, 5);
  let price10 = getDiscountedUnitPrice(unitPrice, 10);

  document.getElementById("price1").innerText = price1;
  document.getElementById("price5").innerText = price5;
  document.getElementById("price10").innerText = price10;

  function selectPackage(btn, count, trial) {
    // 取消所有按鈕的選中狀態
    document.querySelectorAll(".package-btn, #trialBtn").forEach(function (b) {
      b.classList.remove("btn-dark", "btn-primary", "text-white");
      if (b.id === "trialBtn") {
        b.classList.add("btn-outline-primary");
      } else {
        b.classList.add("btn-outline-dark");
      }
    });

    // 選中目前按鈕
    if (trial) {
      btn.classList.remove("btn-outline-primary");
      btn.classList.add("btn-primary", "text-white");
    } else {
      btn.classList.remove("btn-outline-dark");
      btn.classList.add("btn-dark", "text-white");
    }

    isTrial = !!trial;
    selectedPackage = count;
    document.getElementById("packageTarget").innerText = " / " + count + " 堂";

    if (selectedTime.length > count) {
      selectedTime.splice(count);
    }

    updateTotals();

    if (activeDate) {
      let activeBtn = weekBar.querySelector(
        `button[data-date="${activeDate}"]`,
      );
      if (activeBtn) {
        renderDaySlots(activeDate, Number(activeBtn.dataset.weekday));
      }
    }
  }

  // 體驗課按鈕
  let trialBtn = document.getElementById("trialBtn");
  if (trialBtn) {
    trialBtn.onclick = function () {
      selectPackage(trialBtn, 1, true);
    };
  }

  // 正式課程按鈕
  document.querySelectorAll(".package-btn").forEach(function (btn) {
    btn.onclick = function () {
      selectPackage(btn, Number(btn.dataset.count), false);
    };
  });
}

// ─── 選取 / 取消時段 ───
function orderTime(fullDate, h, isSelected) {
  let takeTime = `${fullDate} ${String(h).padStart(2, "0")}:00`;
  if (isSelected) {
    selectedTime.push(takeTime);
  } else {
    let idx = selectedTime.indexOf(takeTime);
    if (idx !== -1) selectedTime.splice(idx, 1);
  }
  updateTotals();
}

function buildFourWeeksDates() {
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
  let monday = new Date(today);
  monday.setDate(today.getDate() - (todayWeekday - 1));

  let list = [];
  for (let i = 0; i < 28; i++) {
    let d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    let wd = d.getDay() === 0 ? 7 : d.getDay();
    list.push({
      fullDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      month: d.getMonth() + 1,
      day: d.getDate(),
      weekdayNumber: wd,
      isToday: d.getTime() === today.getTime(),
      isPast: d.getTime() < today.getTime(),
    });
  }
  return list;
}

function renderWeekBar(wb) {
  wb.innerHTML = "";
  let dayMap = {
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
    7: "日",
  };
  let start = currentWeekIndex * 7;
  let currentWeekDates = allDates.slice(start, start + 7);

  currentWeekDates.forEach(function (item) {
    let box = document.createElement("div");
    box.className = "flex-shrink-0";
    let isDisabled = item.isPast || item.isToday;
    box.innerHTML = `
      <button
        type="button"
        class="btn rounded-3 border py-2 ${isDisabled ? "btn-outline-secondary" : "btn-outline-dark"}"
        style="width: 110px;"
        data-date="${item.fullDate}"
        data-weekday="${item.weekdayNumber}"
        ${isDisabled ? "disabled" : ""}
      >
        <p class="mb-1 fw-bold">${item.month}/${item.day}</p>
        <small>週${dayMap[item.weekdayNumber]}</small>
      </button>
    `;

    let btn = box.querySelector("button");
    btn.onclick = function () {
      if (btn.disabled) return;
      wb.querySelectorAll("button").forEach(function (b) {
        b.classList.remove("btn-dark", "text-white");
        b.classList.add("btn-outline-dark");
      });
      btn.classList.remove("btn-outline-dark");
      btn.classList.add("btn-dark", "text-white");

      activeDate = btn.dataset.date;
      renderDaySlots(activeDate, Number(btn.dataset.weekday));
    };

    wb.appendChild(box);
  });

  prevWeekBtn.disabled = currentWeekIndex === 0;
  nextWeekBtn.disabled = currentWeekIndex === 3;
}

function renderDaySlots(fullDate, weekdayNumber) {
  canSelect.innerHTML = "";
  let dayMap = {
    1: "週一",
    2: "週二",
    3: "週三",
    4: "週四",
    5: "週五",
    6: "週六",
    7: "週日",
  };
  let hours = currentScheduleData[weekdayNumber];

  if (!hours || hours.length === 0) {
    canSelect.innerHTML = `<p class="text-muted ms-2">此日期老師沒有開放時段</p>`;
    return;
  }

  let day = dayMap[weekdayNumber];

  hours.forEach(function (h) {
    let timeBox = document.createElement("div");
    timeBox.className = "col-md-4 mb-2";

    let timeKey = `${fullDate} ${String(h).padStart(2, "0")}:00`;
    let isAlreadySelected = selectedTime.indexOf(timeKey) !== -1;
    let isBooked = bookedSlots.some((s) => s.date === fullDate && s.hour === h);

    timeBox.innerHTML = `
      <div type="btn" class="btn rounded-0 card-content border p-0 w-100
        ${isBooked ? "border-gary" : ""}
        ${isAlreadySelected && !isBooked ? "btn-dark text-dark selected" : ""}"
        style="${isBooked ? "background-color:#f0f0f0; opacity:0.2; cursor:not-allowed; border-color:$gray;" : ""}">
        <div class="border-bottom px-3 d-flex align-items-center"
          style="${isBooked ? "border-color:$gray;" : ""}">
          <p class="mb-0 ps-2 py-2 sansTeg d-inline-block ${isBooked ? "text-gray;" : ""}">${fullDate} ${day}</p>
        </div>
        <div class="d-flex align-items-center">
          <div>
            <p class="display-5 sansTeg ps-3 pt-3 mb-0 pb-3 border-end pe-4 ${isBooked ? "text-gary" : ""}"
              style="${isBooked ? "border-color:$gray;" : ""}">
              ${String(h).padStart(2, "0")}:00
            </p>
          </div>
          <div class="mx-auto">
            <small class="border px-3 rounded-3 text-center ${isBooked ? "text-gary border-gary" : ""}">
              ${isBooked ? "已預約" : "60mins"}
            </small>
          </div>
        </div>
      </div>
    `;

    if (!isBooked) {
      timeBox.onclick = function () {
        if (selectedPackage === 0) {
          showToast("請先選擇購買方案", "warning");
          return;
        }

        let card = this.querySelector(".card-content");
        if (!card) return;

        let isCurrentlySelected = card.classList.contains("selected");

        if (!isCurrentlySelected && selectedTime.length >= selectedPackage) {
          showToast(
            `已達 ${selectedPackage} 堂上限，請先取消其他時段`,
            "warning",
          );
          return;
        }

        card.classList.toggle("selected");
        let isSelected = card.classList.contains("selected");
        if (isSelected) {
          card.classList.add("btn-dark", "text-dark");
        } else {
          card.classList.remove("btn-dark", "text-dark");
        }

        orderTime(fullDate, h, isSelected);
      };
    }

    canSelect.appendChild(timeBox);
  });
}

async function booking() {
  let url = new URLSearchParams(window.location.search);
  let tutorId = url.get("tutorId");
  let courseId = url.get("courseId");

  if (!tutorId || !courseId) return;

  try {
    // 課程資訊
    let coursesResp = await axios.get(`/api/view/courses`);
    let courseList = coursesResp.data.content;

    for (let i = 0; i < courseList.length; i++) {
      if (courseList[i].id === Number(courseId)) {
        coursePrice.innerText = courseList[i].price;
        courseName.innerText = courseList[i].courseName;
        tutorName.innerText = courseList[i].teacherName;
        setupPackageButtons(courseList[i].price);
        break;
      }
    }

    // 體驗課資格檢查（需登入才有效，未登入則略過）
    try {
      let trialResp = await axios.get("/api/shop/trial/eligible");
      if (trialResp.data.eligible) {
        document.getElementById("trialBtn").classList.remove("d-none");
      }
    } catch (_) {}

    // 老師可預約時段
    let scheduleResp = await axios.get(`/api/view/teacher_schedule/${tutorId}`);
    currentScheduleData = scheduleResp.data;

    // 已被預約的時段
    let bookedResp = await axios.get(
      `/api/shop/course/${courseId}/futurebookings`,
    );
    bookedSlots = bookedResp.data;

    canSelect.innerHTML = "";
    weekBar.innerHTML = "";
    allDates = buildFourWeeksDates();
    renderWeekBar(weekBar);

    prevWeekBtn.onclick = function () {
      if (currentWeekIndex > 0) {
        currentWeekIndex--;
        renderWeekBar(weekBar);
      }
    };
    nextWeekBtn.onclick = function () {
      if (currentWeekIndex < 3) {
        currentWeekIndex++;
        renderWeekBar(weekBar);
      }
    };

    canSelect.innerHTML = `<p class="text-muted ms-2">請先從上方選擇日期</p>`;

    // ─── 確定預約 → 顯示確認 Modal ───
    bookingBtn.onclick = async function () {
      let needed = Number(totalPoints.innerText);
      if (needed === 0 || selectedPackage === 0) return;

      try {
        let meResp = await axios.get("/api/users/me");
        let me = meResp.data;
        let wallet = me.wallet;

        // 餘額不足
        if (wallet < needed) {
          document.getElementById("modalWallet").innerText = wallet;
          document.getElementById("modalNeeded").innerText = needed;
          document.getElementById("modalShortfall").innerText = needed - wallet;
          new bootstrap.Modal(
            document.getElementById("insufficientModal"),
          ).show();
          return;
        }

        // 填入確認 Modal
        let unitPrice = Number(coursePrice.innerText);
        let discountRate = getDiscountRate(selectedPackage);
        let discountText =
          selectedPackage === 10
            ? "9折優惠"
            : selectedPackage === 5
              ? "95折優惠"
              : "無折扣（原價）";

        document.getElementById("confirmCourseName").innerText =
          courseName.innerText;
        document.getElementById("confirmLessons").innerText =
          selectedPackage + " 堂";
        document.getElementById("confirmDiscount").innerText = discountText;
        document.getElementById("confirmTotal").innerText = needed + " 點";
        document.getElementById("confirmWallet").innerText = wallet + " 點";
        document.getElementById("confirmRemaining").innerText =
          wallet - needed + " 點";

        let confirmModal = new bootstrap.Modal(
          document.getElementById("confirmModal"),
        );
        confirmModal.show();

        // 替換確認按鈕的事件（避免重複綁定）
        let confirmBtn = document.getElementById("confirmBookingBtn");
        let newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.onclick = async function () {
          newBtn.disabled = true;

          let slots = selectedTime.map(function (t) {
            let parts = t.split(" ");
            return { date: parts[0], hour: parseInt(parts[1]) };
          });

          try {
            confirmModal.hide();

            await axios.post("/api/shop/purchase", {
              studentId: me.id,
              courseId: Number(courseId),
              lessonCount: selectedPackage,
              selectedSlots: slots,
              isExperienced: isTrial,
            });

            // 確認聊天室通道
            let chatCreated = false;
            try {
              let convsResp = await axios.get("/api/chatMessage/conversations");
              chatCreated = convsResp.data.some(
                (c) => String(c.participantId) === String(tutorId),
              );
            } catch (_) {}

            document.getElementById("modalSuccessLessons").innerText =
              selectedPackage;
            document.getElementById("modalSuccessPoints").innerText = needed;
            document.getElementById("modalChatStatus").innerText = chatCreated
              ? "聊天室通道已建立，可立即與老師聯繫。"
              : "聊天室通道建立中，稍後可在聊天室與老師聯繫。";
            new bootstrap.Modal(document.getElementById("successModal")).show();
          } catch (err) {
            console.error("購買失敗:", err);
            let msg =
              err.response?.data?.message ||
              err.response?.data ||
              "購買失敗，請稍後再試";
            showToast(
              typeof msg === "string" ? msg : "購買失敗，請稍後再試",
              "error",
            );
            newBtn.disabled = false;
          }
        };
      } catch (err) {
        console.error("取得用戶資料失敗:", err);
        showToast("無法取得用戶資料，請稍後再試", "error");
      }
    };
  } catch (err) {
    console.log("booking render error:", err);
  }
}

booking();
