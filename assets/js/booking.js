// const { default: axios } = require("axios");

// 自動帶入 JWT Token
const _bookingToken = localStorage.getItem("jwt_token");
if (_bookingToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${_bookingToken}`;
}

// /api/tutor/${tutorId} id="tutorName"
// /api/view/courses id="coursePrice" id="courseName"
// href = `booking.html?tutorId=${tutorId}&courseId=${selectedCourseId}`
// /api/view/teacher_schedule/{teacherId}

// id="totalMins" id="totalLessons" id="totalPoints" id="bookingBtn"
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

async function booking() {
  let url = new URLSearchParams(window.location.search);

  let tutorId = url.get("tutorId");
  let courseId = url.get("courseId");

  if (
    !tutorId ||
    !courseId ||
    !tutorName ||
    !courseName ||
    !coursePrice ||
    !canSelect ||
    !selectedList ||
    !totalMinutes ||
    !totalLessons ||
    !totalPoints ||
    !bookingBtn ||
    !weekBar ||
    !prevWeekBtn ||
    !nextWeekBtn
  ) {
    return;
  }

  try {
    // courseinfo
    let coursesResp = await axios.get(`/api/view/courses`);
    console.log(coursesResp);

    let courseList = coursesResp.data.content;
    console.log(courseList);

    for (let i = 0; i < courseList.length; i++) {
      if (courseList[i].id === Number(courseId)) {
        console.log(courseList[i].id);
        coursePrice.innerText = courseList[i].price;
        courseName.innerText = courseList[i].courseName;
        tutorName.innerText = courseList[i].teacherName;

        break;
      }
    }

    // tutor can booking time
    let scheduleResp = await axios.get(`/api/view/teacher_schedule/${tutorId}`);
    console.log(scheduleResp);

    let scheduleData = scheduleResp.data;
    console.log(scheduleData);

    canSelect.innerHTML = "";
    weekBar.innerHTML = "";

    let dayMap = {
      1: "週一",
      2: "週二",
      3: "週三",
      4: "週四",
      5: "週五",
      6: "週六",
      7: "週日",
    };

    // 取得已被預約的時段
    let bookedResp = await axios.get(`/api/shop/course/${courseId}/futurebookings`);
    bookedSlots = bookedResp.data;

    currentScheduleData = scheduleData;
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

    bookingBtn.onclick = async function () {
      let needed = Number(totalPoints.innerText);
      if (needed === 0) return;

      try {
        // 取得使用者錢包餘額
        let meResp = await axios.get("/api/users/me");
        let me = meResp.data;
        let wallet = me.wallet;
        let studentId = me.id;

        // 餘額不足 → 顯示提示 Modal
        if (wallet < needed) {
          document.getElementById("modalWallet").innerText = wallet;
          document.getElementById("modalNeeded").innerText = needed;
          document.getElementById("modalShortfall").innerText = needed - wallet;
          new bootstrap.Modal(document.getElementById("insufficientModal")).show();
          return;
        }

        // 組裝 selectedSlots：["2026-04-07 09:00"] → { date, hour }
        let slots = selectedTime.map(function (t) {
          let parts = t.split(" ");
          return { date: parts[0], hour: parseInt(parts[1]) };
        });

        // 呼叫購買 API
        bookingBtn.disabled = true;
        await axios.post("/api/shop/purchase", {
          studentId: studentId,
          courseId: Number(courseId),
          lessonCount: selectedTime.length,
          selectedSlots: slots,
        });

        // 確認聊天室通道是否已建立
        let chatCreated = false;
        try {
          let convsResp = await axios.get("/api/chatMessage/conversations");
          chatCreated = convsResp.data.some(
            (c) => String(c.participantId) === String(tutorId)
          );
        } catch (_) {}

        // 顯示成功 Modal
        document.getElementById("modalSuccessLessons").innerText = selectedTime.length;
        document.getElementById("modalSuccessPoints").innerText = needed;
        document.getElementById("modalChatStatus").innerText = chatCreated
          ? "聊天室通道已建立，可立即與老師聯繫。"
          : "聊天室通道建立中，稍後可在聊天室與老師聯繫。";
        new bootstrap.Modal(document.getElementById("successModal")).show();

      } catch (err) {
        console.error("購買失敗:", err);
        let msg = err.response?.data?.message || err.response?.data || "購買失敗，請稍後再試";
        showToast(typeof msg === "string" ? msg : "購買失敗，請稍後再試", "error");
        bookingBtn.disabled = false;
      }
    };

  } catch (err) {
    console.log("booking render error:", err);
  }

  function orderTime(fullDate, h, isSelected) {
    let takeTime = `${fullDate} ${String(h).padStart(2, "0")}:00`;
    if (isSelected) {
      selectedTime.push(takeTime);
    } else {
      let cancel = selectedTime.indexOf(takeTime);
      if (cancel != -1) {
        selectedTime.splice(cancel, 1);
      }
    }

    selectedList.innerText = selectedTime.join(" 、 ");

    let lessonCount = selectedTime.length;
    totalLessons.innerText = lessonCount;

    totalMinutes.innerText = lessonCount * 60;

    let price = Number(coursePrice.innerText);
    totalPoints.innerText = lessonCount * price;

    if (lessonCount === 0) {
      bookingBtn.disabled = true;
    } else {
      bookingBtn.disabled = false;
    }
  }

  function buildFourWeeksDates() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayWeekday = today.getDay() === 0 ? 7 : today.getDay();

    // 找到本週週一
    let monday = new Date(today);
    monday.setDate(today.getDate() - (todayWeekday - 1));

    let list = [];

    for (let i = 0; i < 28; i++) {
      let currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      let weekdayNumber = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

      list.push({
        fullDate: `${currentDate.getFullYear()}-${String(
          currentDate.getMonth() + 1,
        ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`,
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate(),
        weekdayNumber: weekdayNumber,
        isToday: currentDate.getTime() === today.getTime(),
      });
    }

    return list;
  }

  function renderWeekBar(weekBar) {
    weekBar.innerHTML = "";

    let dayMap = {
      1: "一",
      2: "二",
      3: "三",
      4: "四",
      5: "五",
      6: "六",
      7: "日",
    };

    // 例如第 0 週 -> 0~6
    // 第 1 週 -> 7~13
    let start = currentWeekIndex * 7;
    let end = start + 7;

    let currentWeekDates = allDates.slice(start, end);

    currentWeekDates.forEach(function (item) {
      let box = document.createElement("div");
      box.className = "flex-shrink-0";

      box.innerHTML = `
      <button
        type="button"
        class="btn rounded-3 border py-2 ${
          item.isToday ? "btn-outline-secondary" : "btn-outline-dark"
        }"
        style="width: 110px;"
        data-date="${item.fullDate}"
        data-weekday="${item.weekdayNumber}"
        ${item.isToday ? "disabled" : "enabled"}
      >
        <p class="mb-1 fw-bold">${item.month}/${item.day}</p>
        <small>週${dayMap[item.weekdayNumber]}</small>
      </button>
    `;

      let btn = box.querySelector("button");
      btn.onclick = function () {
        if (btn.disabled) return;

        // 高亮選中日期
        weekBar.querySelectorAll("button").forEach(function (b) {
          b.classList.remove("btn-dark", "text-white");
          b.classList.add("btn-outline-dark");
        });
        btn.classList.remove("btn-outline-dark");
        btn.classList.add("btn-dark", "text-white");

        activeDate = btn.dataset.date;
        let weekdayNumber = Number(btn.dataset.weekday);
        renderDaySlots(activeDate, weekdayNumber);
      };

      weekBar.appendChild(box);
    });

    // 第一週就不能再往左
    prevWeekBtn.disabled = currentWeekIndex === 0;

    // 第四週就不能再往右
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
      let isBooked = bookedSlots.some(
        (s) => s.date === fullDate && s.hour === h
      );

      timeBox.innerHTML = `
        <div type="btn" class="btn rounded-0 card-content border p-0 w-100
          ${isBooked ? "border-primary" : ""}
          ${isAlreadySelected && !isBooked ? "btn-dark text-dark selected" : ""}"
          style="${isBooked ? "background-color:#f0f0f0; opacity:0.6; cursor:not-allowed; border-color:var(--bs-primary) !important;" : ""}">
          <div class="border-bottom px-3 d-flex align-items-center"
            style="${isBooked ? "border-color:var(--bs-primary) !important;" : ""}">
            <p class="mb-0 ps-2 py-2 sansTeg d-inline-block ${isBooked ? "text-primary" : ""}">${fullDate} ${day}</p>
          </div>
          <div class="d-flex align-items-center">
            <div>
              <p class="display-5 sansTeg ps-3 pt-3 mb-0 pb-3 border-end pe-4 ${isBooked ? "text-primary" : ""}"
                style="${isBooked ? "border-color:var(--bs-primary) !important;" : ""}">
                ${String(h).padStart(2, "0")}:00
              </p>
            </div>
            <div class="mx-auto">
              <small class="border px-3 rounded-3 text-center ${isBooked ? "text-primary border-primary" : ""}">
                ${isBooked ? "已預約" : "60mins"}
              </small>
            </div>
          </div>
        </div>
      `;

      if (!isBooked) {
        timeBox.onclick = function () {
          let card = this.querySelector(".card-content");
          if (!card) return;

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
}

booking();
