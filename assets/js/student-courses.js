// ==========================================
// 學習與課程 - 資料載入與渲染
// ==========================================

let bookings = [];
let reviewMap = {}; // courseId → review

// ══════════════════════════════════════════
// 頁面載入
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => renderTab(btn.dataset.tab));
    });
    await loadData();
});

async function loadData() {
    const userId = localStorage.getItem('userId');
    if (!userId) { window.location.href = 'login.html'; return; }

    try {
        const [bookingsRes, reviewsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/courses/me`),
            axios.get(`${API_BASE_URL}/reviews/user/${userId}`)
        ]);

        bookings = bookingsRes.data || [];
        reviewMap = {};
        (reviewsRes.data || []).forEach(r => { reviewMap[r.courseId] = r; });

        renderTab('upcoming');
    } catch (e) {
        console.error('載入課程失敗:', e);
        document.getElementById('tab-upcoming').innerHTML =
            '<div class="empty-state"><span class="material-symbols-outlined">error</span><p>載入失敗，請重新整理</p></div>';
        if (e.response?.status === 401) { localStorage.clear(); window.location.href = 'login.html'; }
    }
}

// ══════════════════════════════════════════
// Tab 切換
// ══════════════════════════════════════════
function renderTab(tab) {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    ['upcoming','completed','cancelled'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle('d-none', t !== tab);
    });

    const filtered = bookings.filter(b => {
        if (tab === 'upcoming')  return b.status === 1;
        if (tab === 'completed') return b.status === 2;
        if (tab === 'cancelled') return b.status === 3;
    });

    const container = document.getElementById(`tab-${tab}`);
    const labels = { upcoming: '即將開始', completed: '已完成', cancelled: '已取消' };

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>目前沒有${labels[tab]}的課程</p></div>`;
        return;
    }

    if (tab === 'upcoming') {
        container.innerHTML = filtered
            .sort((a, b) => new Date(a.date) - new Date(b.date) || a.hour - b.hour)
            .map(renderUpcomingCard).join('');
    } else if (tab === 'completed') {
        container.innerHTML = filtered
            .sort((a, b) => new Date(b.date) - new Date(a.date) || b.hour - a.hour)
            .map(renderCompletedCard).join('');
        filtered.forEach(b => loadFeedback(b.bookingId));
    } else {
        container.innerHTML = filtered
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(renderCancelledCard).join('');
    }
}

// ══════════════════════════════════════════
// 日期工具
// ══════════════════════════════════════════
function parseBadge(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return { month: months[d.getMonth()], day: d.getDate() };
}

// ══════════════════════════════════════════
// 卡片渲染
// ══════════════════════════════════════════
function renderUpcomingCard(b) {
    const { month, day } = parseBadge(b.date);
    return `
    <div class="booking-card">
        <div class="date-badge">
            <span class="bmonth">${month}</span>
            <span class="bday">${day}</span>
        </div>
        <div class="booking-info">
            <div class="booking-meta">
                <span class="status-pill">即將開始</span>
                <div class="time-tag">
                    <span class="material-symbols-outlined">schedule</span>
                    ${String(b.hour).padStart(2,'0')}:00
                </div>
            </div>
            <h3 class="booking-title">${b.courseName || '課程'}</h3>
            <div class="booking-teacher">
                <span class="material-symbols-outlined">person</span> ${b.tutorName}
            </div>
        </div>
    </div>`;
}

function renderCompletedCard(b) {
    const { month, day } = parseBadge(b.date);
    const review = reviewMap[b.courseId];

    const reviewSection = review
        ? `<div>
               <div class="mb-1" style="font-size:20px;letter-spacing:2px">${renderStars(review.rating)}</div>
               <p class="text-muted small mb-0">${review.comment || '（未留下評語）'}</p>
           </div>`
        : `<form onsubmit="submitReview(event, ${b.courseId})">
               <input type="hidden" name="rating" id="rating-${b.courseId}" value="0">
               <div class="mb-2" id="stars-${b.courseId}">
                   ${[1,2,3,4,5].map(i =>
                       `<span class="star-btn" onclick="selectStar(${b.courseId},${i})">☆</span>`
                   ).join('')}
               </div>
               <textarea class="form-control form-control-sm mb-2" name="comment"
                   placeholder="留下你的評語...（選填）" rows="2"></textarea>
               <button type="submit" class="btn btn-sm btn-primary px-3">送出評價</button>
           </form>`;

    return `
    <div class="booking-card">
        <div class="date-badge completed">
            <span class="bmonth">${month}</span>
            <span class="bday">${day}</span>
        </div>
        <div class="booking-info">
            <div class="booking-meta">
                <span class="status-pill completed">已完成</span>
                <div class="time-tag">
                    <span class="material-symbols-outlined">schedule</span>
                    ${String(b.hour).padStart(2,'0')}:00
                </div>
            </div>
            <div class="d-flex align-items-baseline gap-2 mb-3">
                <h3 class="booking-title mb-0">${b.courseName || '課程'}</h3>
                <span class="text-muted small">${b.tutorName}</span>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="feedback-box">
                        <div class="feedback-box-title">
                            <span class="material-symbols-outlined">rate_review</span> 我的評價
                        </div>
                        ${reviewSection}
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="feedback-box" id="feedback-${b.bookingId}">
                        <div class="feedback-box-title">
                            <span class="material-symbols-outlined">psychology</span> 老師課後回饋
                        </div>
                        <p class="text-muted small mb-0">載入中...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function renderCancelledCard(b) {
    const { month, day } = parseBadge(b.date);
    return `
    <div class="booking-card">
        <div class="date-badge cancelled">
            <span class="bmonth">${month}</span>
            <span class="bday">${day}</span>
        </div>
        <div class="booking-info">
            <div class="booking-meta">
                <span class="status-pill cancelled">已取消</span>
                <div class="time-tag">
                    <span class="material-symbols-outlined">schedule</span>
                    ${String(b.hour).padStart(2,'0')}:00
                </div>
            </div>
            <h3 class="booking-title">${b.courseName || '課程'}</h3>
            <div class="booking-teacher">
                <span class="material-symbols-outlined">person</span> ${b.tutorName}
            </div>
        </div>
    </div>`;
}

// ══════════════════════════════════════════
// 老師回饋（非同步逐筆載入）
// ══════════════════════════════════════════
async function loadFeedback(bookingId) {
    const el = document.getElementById(`feedback-${bookingId}`);
    if (!el) return;
    try {
        const res = await axios.get(`${API_BASE_URL}/feedbacks/lesson/${bookingId}`);
        const feedbacks = res.data;
        if (!feedbacks || feedbacks.length === 0) {
            el.querySelector('.text-muted').textContent = '老師尚未填寫回饋';
            return;
        }
        const fb = feedbacks[0];
        el.innerHTML = `
            <div class="feedback-box-title">
                <span class="material-symbols-outlined">psychology</span> 老師課後回饋
            </div>
            <div class="mb-1">
                <div class="score-row">
                    <span>專注力</span>
                    <div class="score-bar"><div style="width:${fb.focusScore*20}%"></div></div>
                    <span>${fb.focusScore}/5</span>
                </div>
                <div class="score-row">
                    <span>理解力</span>
                    <div class="score-bar"><div style="width:${fb.comprehensionScore*20}%"></div></div>
                    <span>${fb.comprehensionScore}/5</span>
                </div>
                <div class="score-row">
                    <span>自信心</span>
                    <div class="score-bar"><div style="width:${fb.confidenceScore*20}%"></div></div>
                    <span>${fb.confidenceScore}/5</span>
                </div>
            </div>
            ${fb.comment ? `<p class="text-muted small mb-0 fst-italic">"${fb.comment}"</p>` : ''}`;
    } catch (e) {
        const p = el.querySelector('.text-muted');
        if (p) p.textContent = '無法載入回饋';
    }
}

// ══════════════════════════════════════════
// 星星互動
// ══════════════════════════════════════════
function selectStar(courseId, val) {
    document.getElementById(`rating-${courseId}`).value = val;
    document.querySelectorAll(`#stars-${courseId} .star-btn`).forEach((s, i) => {
        s.textContent = i < val ? '★' : '☆';
        s.classList.toggle('active', i < val);
    });
}

function renderStars(rating) {
    return [1,2,3,4,5].map(i =>
        `<span style="color:${i <= rating ? '#f59e0b' : '#d1d5db'}">${i <= rating ? '★' : '☆'}</span>`
    ).join('');
}

// ══════════════════════════════════════════
// 送出評價
// ══════════════════════════════════════════
async function submitReview(event, courseId) {
    event.preventDefault();
    const userId = parseInt(localStorage.getItem('userId'));
    const form = event.target;
    const rating = parseInt(form.querySelector('[name="rating"]').value);
    const comment = form.querySelector('[name="comment"]').value.trim();

    if (!rating || rating < 1) { alert('請先選擇星星評分！'); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '送出中...';

    try {
        const res = await axios.post(`${API_BASE_URL}/reviews`, { userId, courseId, rating, comment });
        reviewMap[courseId] = res.data;
        renderTab('completed');
    } catch (e) {
        alert('送出失敗，請稍後再試');
        btn.disabled = false;
        btn.textContent = '送出評價';
    }
}
