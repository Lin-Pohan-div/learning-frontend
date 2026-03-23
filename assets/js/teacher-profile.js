const API_BASE_URL = 'http://localhost:8080/api';

// 從網址列取得參數
const urlParams = new URLSearchParams(window.location.search);
const tutorId = urlParams.get('tutorId');
let selectedCourseId = urlParams.get('courseId');

let allCourses = [];

window.addEventListener('DOMContentLoaded', async () => {
    if (!tutorId) {
        alert('找不到老師資訊！');
        return;
    }
    await Promise.all([fetchTutorProfile(), fetchTutorCourses()]);
});

function convertGoogleDriveUrl(url) {
    if (!url) return 'https://via.placeholder.com/120';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// 🔗 API 1：取得老師個人資料
async function fetchTutorProfile() {
    try {
        const res = await axios.get(`${API_BASE_URL}/tutor/${tutorId}?courseId=${selectedCourseId || ''}`);
        const data = res.data;

        document.getElementById('tutor-avatar').src = convertGoogleDriveUrl(data.avatar);
        document.getElementById('tutor-name').textContent = data.name || '老師姓名';
        document.getElementById('tutor-headline').textContent = data.headline || '';
        document.getElementById('tutor-intro').textContent = data.intro || '';
        document.getElementById('tutor-rating').textContent = `⭐ ${data.averageRating}`;

        renderVideos(data.videoUrl1, data.videoUrl2);
        renderReviews(data.reviews);
        renderSchedule(data.schedules);
        renderCertificates(data.certificate1, data.certificateName1, data.certificate2, data.certificateName2);

    } catch (err) {
        console.error('取得老師資料失敗：', err);
    }
}

// 🔗 API 2：取得這位老師的所有課程
async function fetchTutorCourses() {
    try {
        const res = await axios.get(`${API_BASE_URL}/view/courses`);
        const allData = res.data.content;

        allCourses = allData.filter(c => String(c.tutorId) === String(tutorId));

        if (!selectedCourseId && allCourses.length > 0) {
            selectedCourseId = allCourses[0].id;
        }

        renderCourseButtons();
        renderSelectedCourse();
        renderPricePanel();

    } catch (err) {
        console.error('取得課程資料失敗：', err);
    }
}

// 渲染課程選擇按鈕
function renderCourseButtons() {
    const container = document.getElementById('course-buttons');
    container.innerHTML = '';

    allCourses.forEach(course => {
        const btn = document.createElement('button');
        const isSelected = String(course.id) === String(selectedCourseId);
        btn.className = isSelected ? 'active' : '';
        btn.textContent = course.courseName;
        btn.onclick = () => selectCourse(course.id);
        container.appendChild(btn);
    });
}

// 切換課程
function selectCourse(courseId) {
    selectedCourseId = courseId;
    renderCourseButtons();
    renderSelectedCourse();
    renderPricePanel();
    fetchTutorProfile();
}

// 渲染目前選取課程的描述
function renderSelectedCourse() {
    const course = allCourses.find(c => String(c.id) === String(selectedCourseId));
    if (!course) return;

    document.getElementById('course-name').textContent = course.courseName;
    document.getElementById('course-desc').textContent = course.description;
}

// 渲染右側價格欄
function renderPricePanel() {
    const course = allCourses.find(c => String(c.id) === String(selectedCourseId));
    if (!course) return;

    const price = course.price;
    document.getElementById('price-single').textContent = `NT$ ${price}`;
    document.getElementById('price-5').textContent = `NT$ ${Math.floor(price * 5 * 0.95).toLocaleString()}`;
    document.getElementById('price-10').textContent = `NT$ ${Math.floor(price * 10 * 0.90).toLocaleString()}`;

    document.getElementById('btn-booking').onclick = () => {
        const tutorName = encodeURIComponent(document.getElementById('tutor-name').textContent);
        const courseName = encodeURIComponent(course.courseName);
        window.location.href = `booking.html?tutorId=${tutorId}&courseId=${selectedCourseId}&price=${price}&tutorName=${tutorName}&courseName=${courseName}`;
    };
}

// 渲染評價
function renderReviews(reviews) {
    const container = document.getElementById('reviews-container');
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p style="color:#999;">目前還沒有評價</p>';
        return;
    }
    container.innerHTML = reviews.map(r => `
        <div style="border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between;">
                <strong>${r.studentName}</strong>
                <span>${'⭐'.repeat(r.rating)} (${r.updatedAt?.split('T')[0] || ''})</span>
            </div>
            <p style="margin: 5px 0 0 0;">${r.comment}</p>
        </div>
    `).join('');
}

// 渲染影片
function renderVideos(url1, url2) {
    const container = document.getElementById('videos-container');
    const videos = [url1, url2].filter(Boolean);

    if (videos.length === 0) {
        container.innerHTML = '<p style="color:#999;">目前沒有影片</p>';
        return;
    }

    container.innerHTML = videos.map(url => {
        // 把分享連結轉成嵌入連結
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const embedUrl = match
            ? `https://drive.google.com/file/d/${match[1]}/preview`
            : url;

        return `
            <div style="flex: 1 1 240px; border: 1px dashed #999; height: 200px; background: #eee; overflow: hidden;">
                <iframe 
                    src="${embedUrl}" 
                    width="100%" 
                    height="200" 
                    frameborder="0" 
                    allowfullscreen
                    allow="autoplay">
                </iframe>
            </div>
        `;
    }).join('');
}

// 渲染課表
function renderSchedule(schedules) {
    const container = document.getElementById('schedule-container');
    if (!schedules || schedules.length === 0) {
        container.innerHTML = '<p style="color:#999;">目前沒有開放時段</p>';
        return;
    }
    const dayMap = { 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六', 7: '週日' };
    container.innerHTML = schedules.slice(0, 5).map(s => `
    <span class="schedule-tag">
        🕒 ${dayMap[s.weekday] || s.weekday} ${String(s.hour).padStart(2, '0')}:00
    </span>
`).join('');
}

// 渲染證照
function renderCertificates(cert1, name1, cert2, name2) {
    const container = document.getElementById('certificates-container');
    container.innerHTML = '';
    
    const items = [[cert1, name1], [cert2, name2]].filter(([c]) => c);
    if (items.length === 0) {
        container.innerHTML = '<li style="list-style:none; color:#999;">目前沒有證照資料</li>';
        return;
    }

    items.forEach(([url, name]) => {
        const li = document.createElement('li');
        li.style.marginBottom = '10px';

        const label = document.createElement('strong');
        label.textContent = '專業認證：';

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.textContent = name || '查看證照';

        li.appendChild(label);
        li.appendChild(link);
        container.appendChild(li);
    });
}