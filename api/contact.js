module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, phone, industry, message } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

  try {
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ name, phone, industry, message }),
    });

    if (!sbRes.ok) throw new Error(`Supabase error: ${await sbRes.text()}`);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[contact error]', e.message);
    return res.status(500).json({ error: 'internal server error' });
  }
};
