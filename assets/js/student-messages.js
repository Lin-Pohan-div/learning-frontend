// ==========================================
// 學生訊息中心邏輯 (student-messages.js)
// 串接後端 REST API + WebSocket (STOMP)
// ==========================================

const BASE_URL = 'http://localhost:8080';

let conversations = [];      // { bookingId, tutorId, tutorName, subject, avatar, lastMessage, time, unread }
let currentBookingId = null;
let stompClient = null;
let stompSubscription = null;

// ── Helpers ──────────────────────────────

function getJwt() {
    return localStorage.getItem('jwt');
}

function authHeaders() {
    return {
        'Authorization': 'Bearer ' + getJwt(),
        'Content-Type': 'application/json'
    };
}

function formatTime(createdAt) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) {
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][d.getDay()];
    } else {
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }
}

// ── 載入對話列表 ──────────────────────────

async function loadConversations() {
    try {
        const res = await axios.get(`${BASE_URL}/api/student/bookings`, {
            headers: authHeaders()
        });
        const bookings = res.data;

        // 只顯示 status=1（已排課）的預約，並行取老師資訊
        const active = bookings.filter(b => b.status === 1);
        const tutorCache = {};

        const convList = await Promise.all(active.map(async b => {
            if (!tutorCache[b.tutorId]) {
                try {
                    const tr = await axios.get(`${BASE_URL}/api/tutor/${b.tutorId}`, {
                        headers: authHeaders()
                    });
                    tutorCache[b.tutorId] = tr.data;
                } catch {
                    tutorCache[b.tutorId] = { name: '老師', avatar: '' };
                }
            }
            const tutor = tutorCache[b.tutorId];
            return {
                bookingId: b.id,
                tutorId: b.tutorId,
                tutorName: tutor.name || '老師',
                subject: b.courseName || '',
                avatar: tutor.avatar || 'https://i.pravatar.cc/48?img=1',
                lastMessage: '',
                time: b.date || '',
                unread: 0
            };
        }));

        conversations = convList;
        renderContactList();

        // 若 URL 帶有 bookingId 參數，自動選取
        const params = new URLSearchParams(window.location.search);
        const bid = parseInt(params.get('bookingId'));
        if (bid && conversations.find(c => c.bookingId === bid)) {
            selectConversation(bid);
        } else if (conversations.length > 0) {
            selectConversation(conversations[0].bookingId);
        }
    } catch (err) {
        console.error('載入對話列表失敗', err);
    }
}

// ── 渲染聯絡人列表 ────────────────────────

function renderContactList(filter = '') {
    const list = document.getElementById('contact-list');
    const filtered = conversations.filter(c =>
        c.tutorName.toLowerCase().includes(filter.toLowerCase()) ||
        c.subject.includes(filter)
    );

    list.innerHTML = filtered.map(c => `
        <div class="contact-item ${c.bookingId === currentBookingId ? 'active' : ''}" data-id="${c.bookingId}" onclick="selectConversation(${c.bookingId})">
            <div class="contact-avatar-wrap">
                <img src="${c.avatar}" alt="${c.tutorName}" class="contact-avatar">
                <span class="contact-status-dot"></span>
            </div>
            <div class="contact-info">
                <div class="contact-top">
                    <span class="contact-name">${c.tutorName}</span>
                    <span class="contact-time">${c.time}</span>
                </div>
                <div class="contact-bottom">
                    <span class="contact-last">${c.lastMessage}</span>
                    ${c.unread > 0 ? `<span class="contact-badge">${c.unread}</span>` : ''}
                </div>
                <div class="contact-subject">${c.subject}</div>
            </div>
        </div>
    `).join('');
}

// ── 渲染聊天視窗 ──────────────────────────

function renderChatWindow(conv, messages) {
    document.getElementById('chat-teacher-avatar').src = conv.avatar;
    document.getElementById('chat-teacher-name').textContent = conv.tutorName;
    document.getElementById('chat-subject-tag').textContent = conv.subject;

    const msgArea = document.getElementById('chat-messages');
    msgArea.innerHTML = messages.map(m => buildMsgHtml(m, conv)).join('');
    msgArea.scrollTop = msgArea.scrollHeight;

    conv.unread = 0;
    renderContactList(document.getElementById('search-input').value);
}

function buildMsgHtml(m, conv) {
    const isMe = m.role === 'student';
    const timeStr = formatTime(m.createdAt);
    let content = '';

    if (m.messageType === 4 || m.messageType === 3 || m.messageType === 5 || m.messageType === 6) {
        // 媒體訊息
        if (m.messageType === 4) {
            content = `<img src="${m.mediaUrl}" style="max-width:200px;border-radius:8px;" alt="圖片">`;
        } else if (m.messageType === 5) {
            content = `<video src="${m.mediaUrl}" controls style="max-width:240px;border-radius:8px;"></video>`;
        } else if (m.messageType === 3) {
            content = `<audio src="${m.mediaUrl}" controls></audio>`;
        } else {
            content = `<a href="${m.mediaUrl}" target="_blank" class="msg-file-link">📎 ${m.mediaUrl.split('/').pop()}</a>`;
        }
    } else {
        content = escapeHtml(m.message || '');
    }

    return `
        <div class="msg-row ${isMe ? 'msg-row--me' : 'msg-row--teacher'}">
            ${!isMe ? `<img src="${conv.avatar}" class="msg-avatar" alt="">` : ''}
            <div class="msg-bubble ${isMe ? 'msg-bubble--me' : 'msg-bubble--teacher'}">
                ${content}
                <div class="msg-time">${timeStr}</div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function appendMessage(m) {
    const conv = conversations.find(c => c.bookingId === currentBookingId);
    if (!conv) return;
    const msgArea = document.getElementById('chat-messages');
    msgArea.insertAdjacentHTML('beforeend', buildMsgHtml(m, conv));
    msgArea.scrollTop = msgArea.scrollHeight;

    // 更新聯絡人最後一則
    conv.lastMessage = m.message || '';
    conv.time = formatTime(m.createdAt);
    renderContactList(document.getElementById('search-input').value);
}

// ── 選取對話 ──────────────────────────────

async function selectConversation(bookingId) {
    currentBookingId = bookingId;
    const conv = conversations.find(c => c.bookingId === bookingId);
    if (!conv) return;

    // 手機版切換
    document.getElementById('chat-panel').classList.add('chat-panel--visible');
    document.getElementById('contacts-panel').classList.add('contacts-panel--hidden');

    try {
        const res = await axios.get(`${BASE_URL}/api/chatMessage/booking/${bookingId}`, {
            headers: authHeaders()
        });
        const messages = res.data;
        renderChatWindow(conv, messages);

        // 更新聯絡人最後一則
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            conv.lastMessage = last.message || '';
            conv.time = formatTime(last.createdAt);
        }
    } catch (err) {
        console.error('載入訊息失敗', err);
    }

    connectWebSocket(bookingId);
}

// ── WebSocket / STOMP ─────────────────────

function connectWebSocket(bookingId) {
    // 斷開舊的訂閱
    if (stompSubscription) {
        stompSubscription.unsubscribe();
        stompSubscription = null;
    }

    if (stompClient && stompClient.connected) {
        subscribeBooking(bookingId);
        return;
    }

    // 建立新連線
    if (stompClient) {
        try { stompClient.disconnect(); } catch {}
    }

    const socket = new SockJS(`${BASE_URL}/ws`);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // 關閉 debug log

    const jwt = getJwt();
    stompClient.connect(
        { Authorization: 'Bearer ' + jwt },
        () => subscribeBooking(bookingId),
        err => console.error('WebSocket 連線失敗', err)
    );
}

function subscribeBooking(bookingId) {
    stompSubscription = stompClient.subscribe(
        `/topic/room/${bookingId}/chat`,
        frame => {
            const msg = JSON.parse(frame.body);
            // 避免重複顯示自己送出的訊息（透過 STOMP 送的）
            if (msg.role !== 'student') {
                appendMessage(msg);
            }
        }
    );
}

// ── 傳送訊息 ──────────────────────────────

async function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text || !currentBookingId) return;

    const payload = {
        bookingId: currentBookingId,
        role: 'student',
        messageType: 1,
        message: text,
        mediaUrl: null
    };

    // 立即在 UI 顯示
    const now = new Date().toISOString();
    appendMessage({ ...payload, createdAt: now });
    input.value = '';

    if (stompClient && stompClient.connected) {
        stompClient.send(`/app/chat/${currentBookingId}`, {}, JSON.stringify(payload));
    } else {
        // fallback REST
        try {
            await axios.post(`${BASE_URL}/api/chatMessage`, payload, { headers: authHeaders() });
        } catch (err) {
            console.error('傳送訊息失敗', err);
        }
    }
}

// ── 上傳檔案 ──────────────────────────────

async function uploadFile(file) {
    if (!file || !currentBookingId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bookingId', currentBookingId);
    formData.append('role', 'student');
    formData.append('message', '');

    try {
        const res = await axios.post(`${BASE_URL}/api/chatMessage/upload`, formData, {
            headers: { 'Authorization': 'Bearer ' + getJwt() }
        });
        appendMessage(res.data);
    } catch (err) {
        console.error('上傳失敗', err);
        alert('檔案上傳失敗，請重試。');
    }
}

// ── 初始化 ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadConversations();

    // 搜尋
    document.getElementById('search-input').addEventListener('input', e => {
        renderContactList(e.target.value);
    });

    // Enter 送出（Shift+Enter 換行）
    document.getElementById('msg-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 附件上傳
    document.getElementById('file-input').addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
            e.target.value = '';
        }
    });

    // 手機版返回
    const backBtn = document.getElementById('chat-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('chat-panel').classList.remove('chat-panel--visible');
            document.getElementById('contacts-panel').classList.remove('contacts-panel--hidden');
        });
    }
});
