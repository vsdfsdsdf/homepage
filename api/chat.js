const fs = require('fs');
const path = require('path');

function loadKnowledgeBase() {
  const candidates = [
    path.join(__dirname, '..', 'uploads'),
    path.join(process.cwd(), 'uploads'),
  ];
  for (const uploadsDir of candidates) {
    try {
      const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.md'));
      if (files.length === 0) continue;
      return files.map(f => {
        const content = fs.readFileSync(path.join(uploadsDir, f), 'utf8');
        return `=== ${f} ===\n${content}`;
      }).join('\n\n');
    } catch (_) { continue; }
  }
  return '';
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { return res.status(204).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

  const { messages, session_id } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
  };

  async function sbInsert(table, data) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`Supabase ${table} error: ${await r.text()}`);
    const rows = await r.json();
    return rows[0];
  }

  try {
    // 세션 확보
    let sid = session_id;
    if (!sid) {
      const session = await sbInsert('chat_sessions', {});
      sid = session.id;
    }

    // 유저 마지막 메시지 저장
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) await sbInsert('chat_messages', { session_id: sid, role: 'user', content: lastUser.content });

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

    // 어시스턴트 응답 저장
    await sbInsert('chat_messages', { session_id: sid, role: 'assistant', content: reply });

    return res.status(200).json({ reply, session_id: sid });
  } catch (e) {
    console.error('[chat error]', e.message);
    return res.status(500).json({ error: 'internal server error' });
  }
};
