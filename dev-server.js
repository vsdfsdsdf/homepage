require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

/* ── 지식 베이스: uploads/*.md 전체 읽기 ── */
function loadKnowledgeBase() {
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = fs.readFileSync(path.join(uploadsDir, f), 'utf8');
    return `=== ${f} ===\n${content}`;
  }).join('\n\n');
}

const KNOWLEDGE = loadKnowledgeBase();

const SYSTEM_PROMPT = `당신은 CYY마케팅의 AI 상담사입니다. 이름은 "CYY 상담사"입니다.
아래 문서에 기반해서만 답변하세요.

[답변 규칙]
- 자기소개·대화형 질문("이름이 뭐야", "뭐 할 수 있어" 등): 챗봇 이름과 역할을 자연스럽게 안내
- 서비스·정책 관련 질문: 아래 문서 내용만 사용, 없으면 "정확한 안내를 위해 무료 상담을 신청해 주세요." 안내
- 서비스와 무관한 질문(날씨, 정치, 타사 등): "죄송합니다. 저는 CYY마케팅 서비스 관련 질문만 답변드릴 수 있어요." 안내
- 문서에 없는 정보는 절대 창작하거나 추측하지 말 것
- 답변은 친근하고 간결하게, 필요 시 줄바꿈으로 가독성 확보
- 무료 상담 연결이 필요한 경우 hello@cyymarketing.co.kr 또는 상담 신청 버튼을 안내

[지식 베이스]
${KNOWLEDGE}`;

/* ── MIME 타입 ── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

/* ── /api/chat 핸들러 ── */
async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', async () => {
    try {
      const { messages } = JSON.parse(body);
      if (!Array.isArray(messages)) throw new Error('invalid messages');

      const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          max_completion_tokens: 600,
          temperature: 0.4,
        }),
      });

      if (!apiRes.ok) {
        const err = await apiRes.text();
        throw new Error(`OpenAI error: ${err}`);
      }

      const data = await apiRes.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || '답변을 생성하지 못했습니다.';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      console.error('[chat error]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal server error' }));
    }
  });
}

/* ── 정적 파일 서버 ── */
function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // 경로 순회 방지
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end(); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ── HTTP 서버 ── */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/api/chat' && req.method === 'POST') {
    handleChat(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`CYY마케팅 서버 실행 중 → http://localhost:${PORT}`);
});
