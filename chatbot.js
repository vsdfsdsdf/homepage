(function () {
  const ACCENT = '#1A6BFF';
  const FONT = "'Pretendard','Pretendard Variable',-apple-system,BlinkMacSystemFont,sans-serif";
  const HISTORY_LIMIT = 10;

  const history = [];
  let sessionId = null;

  /* ── DOM 생성 ── */
  const style = document.createElement('style');
  style.textContent = `
    #cyy-chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: ${ACCENT}; border: none; cursor: pointer;
      box-shadow: 0 8px 24px rgba(26,107,255,.38);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    #cyy-chat-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(26,107,255,.45); }
    #cyy-chat-btn svg { pointer-events: none; }

    #cyy-chat-win {
      position: fixed; bottom: 100px; right: 28px; z-index: 9998;
      width: 370px; max-width: calc(100vw - 40px);
      height: 540px; max-height: calc(100vh - 140px);
      background: #fff; border-radius: 20px;
      box-shadow: 0 20px 60px rgba(20,20,43,.18);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: ${FONT};
      transform: translateY(20px) scale(.96); opacity: 0;
      pointer-events: none;
      transition: transform .25s ease, opacity .25s ease;
    }
    #cyy-chat-win.open {
      transform: translateY(0) scale(1); opacity: 1; pointer-events: all;
    }

    #cyy-chat-header {
      background: ${ACCENT}; color: #fff;
      padding: 16px 18px; display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    #cyy-chat-header .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.22);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    #cyy-chat-header .info { flex: 1; }
    #cyy-chat-header .name { font-weight: 700; font-size: 15px; }
    #cyy-chat-header .status { font-size: 12px; opacity: .8; margin-top: 1px; }
    #cyy-chat-close {
      background: none; border: none; cursor: pointer;
      color: #fff; opacity: .75; padding: 4px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .2s;
    }
    #cyy-chat-close:hover { opacity: 1; }

    #cyy-chat-messages {
      flex: 1; overflow-y: auto; padding: 18px 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #cyy-chat-messages::-webkit-scrollbar { width: 4px; }
    #cyy-chat-messages::-webkit-scrollbar-thumb { background: #dde; border-radius: 4px; }

    .cyy-msg { display: flex; gap: 8px; align-items: flex-end; }
    .cyy-msg.user { flex-direction: row-reverse; }
    .cyy-msg .bubble {
      max-width: 78%; padding: 11px 14px;
      border-radius: 16px; font-size: 14px; line-height: 1.6;
      word-break: break-word;
    }
    .cyy-msg.bot .bubble {
      background: #F1F3F9; color: #14142B;
      border-bottom-left-radius: 4px;
    }
    .cyy-msg.user .bubble {
      background: ${ACCENT}; color: #fff;
      border-bottom-right-radius: 4px;
    }
    .cyy-msg .bot-icon {
      width: 28px; height: 28px; border-radius: 50%;
      background: ${ACCENT}; color: #fff; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .cyy-typing { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
    .cyy-typing span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #aab; animation: cyyDot 1.2s infinite ease-in-out;
    }
    .cyy-typing span:nth-child(2) { animation-delay: .2s; }
    .cyy-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes cyyDot {
      0%, 80%, 100% { transform: scale(.7); opacity: .4; }
      40% { transform: scale(1); opacity: 1; }
    }

    #cyy-chat-footer {
      padding: 12px 14px; border-top: 1px solid #ECEEF4;
      display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
      background: #fff;
    }
    #cyy-chat-input {
      flex: 1; resize: none; border: 1.5px solid #E2E5EE;
      border-radius: 12px; padding: 10px 13px;
      font-family: ${FONT}; font-size: 14px; color: #14142B;
      outline: none; max-height: 100px; min-height: 40px;
      line-height: 1.5; transition: border-color .2s;
    }
    #cyy-chat-input:focus { border-color: ${ACCENT}; }
    #cyy-chat-send {
      width: 40px; height: 40px; border-radius: 11px;
      background: ${ACCENT}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity .2s, transform .2s;
    }
    #cyy-chat-send:hover { opacity: .88; transform: scale(.97); }
    #cyy-chat-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }

    .cyy-error { color: #e05; font-size: 13px; text-align: center; }

    @media (max-width: 480px) {
      #cyy-chat-win { right: 20px; bottom: 90px; }
      #cyy-chat-btn { bottom: 20px; right: 20px; }
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'cyy-chat-btn';
  btn.setAttribute('aria-label', '채팅 상담');
  btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  const win = document.createElement('div');
  win.id = 'cyy-chat-win';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'CYY마케팅 채팅 상담');
  win.innerHTML = `
    <div id="cyy-chat-header">
      <div class="avatar">💬</div>
      <div class="info">
        <div class="name">CYY마케팅 AI 상담사</div>
        <div class="status">● 온라인 · 빠른 답변</div>
      </div>
      <button id="cyy-chat-close" aria-label="닫기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div id="cyy-chat-messages"></div>
    <div id="cyy-chat-footer">
      <textarea id="cyy-chat-input" placeholder="궁금한 점을 입력하세요…" rows="1"></textarea>
      <button id="cyy-chat-send" aria-label="전송">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  /* ── 요소 참조 ── */
  const messages = win.querySelector('#cyy-chat-messages');
  const input = win.querySelector('#cyy-chat-input');
  const sendBtn = win.querySelector('#cyy-chat-send');
  const closeBtn = win.querySelector('#cyy-chat-close');

  /* ── 열기/닫기 ── */
  let isOpen = false;
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
    input.focus();
  }
  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  }
  btn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  /* ── 메시지 렌더 ── */
  function appendMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `cyy-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    if (role === 'bot') {
      const icon = document.createElement('div');
      icon.className = 'bot-icon';
      icon.textContent = 'C';
      wrap.appendChild(icon);
    }
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  function appendTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'cyy-msg bot';
    const icon = document.createElement('div');
    icon.className = 'bot-icon';
    icon.textContent = 'C';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `<div class="cyy-typing"><span></span><span></span><span></span></div>`;
    wrap.appendChild(icon);
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  /* ── API 호출 ── */
  async function sendMessage(text) {
    if (!text.trim()) return;

    history.push({ role: 'user', content: text });
    if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);

    appendMessage('user', text);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    const typingEl = appendTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, session_id: sessionId })
      });

      typingEl.remove();

      if (!res.ok) throw new Error('서버 오류');

      const data = await res.json();
      const reply = data.reply || '답변을 가져오지 못했습니다.';
      if (data.session_id) sessionId = data.session_id;

      history.push({ role: 'assistant', content: reply });
      if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);

      appendMessage('bot', reply);
    } catch (e) {
      typingEl.remove();
      const errWrap = document.createElement('div');
      errWrap.className = 'cyy-error';
      errWrap.textContent = '⚠ 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      messages.appendChild(errWrap);
      messages.scrollTop = messages.scrollHeight;
      history.pop();
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  /* ── 입력 이벤트 ── */
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });
  sendBtn.addEventListener('click', () => sendMessage(input.value));

  /* ── 환영 메시지 ── */
  setTimeout(() => {
    appendMessage('bot', '안녕하세요! 👋 CYY마케팅 AI 상담사입니다.\n서비스, 패키지, 가격 등 궁금한 점을 편하게 물어보세요!');
    if (!isOpen) openChat();
  }, 1000);
})();
