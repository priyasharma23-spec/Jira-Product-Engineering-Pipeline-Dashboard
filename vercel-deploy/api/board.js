const https = require('https');

function get(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          if (res.statusCode >= 400) reject(new Error(`Jira ${res.statusCode}: ${data.message || raw.slice(0, 100)}`));
          else resolve(data);
        } catch (e) { reject(new Error('Invalid JSON from Jira')); }
      });
    }).on('error', reject);
  });
}

async function fetchAll(baseUrl, auth, jql) {
  const fields = 'summary,status,labels,updated';
  const all = []; let start = 0, total = 1;
  while (start < total && start < 500) {
    const qs = new URLSearchParams({ jql, maxResults: 100, startAt: start, fields }).toString();
    const data = await get(`${baseUrl}/rest/api/3/search?${qs}`, {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    });
    total = data.total || 0;
    const batch = data.issues || [];
    all.push(...batch);
    start += batch.length;
    if (batch.length < 100) break;
  }
  return all;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=120');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const {
    JIRA_URL    = 'https://enkash.atlassian.net',
    JIRA_EMAIL  = '',
    JIRA_TOKEN  = '',
    CAR_PROJECT = 'CAR',
    EM_PROJECT  = 'EM',
  } = process.env;

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return res.status(200).json({ demo: true, car: [], em: [] });
  }

  try {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    const [carRaw, emRaw] = await Promise.all([
      fetchAll(JIRA_URL, auth, `project = "${CAR_PROJECT}" AND status != "Parking lot" ORDER BY updated DESC`),
      fetchAll(JIRA_URL, auth, `project = "${EM_PROJECT}" ORDER BY updated DESC`),
    ]);

    const slim = list => list.map(i => ({
      key:     i.key,
      summary: i.fields.summary,
      status:  i.fields.status?.name,
      labels:  i.fields.labels || [],
    }));

    res.status(200).json({
      demo: false,
      car: slim(carRaw),
      em:  slim(emRaw),
      fetched: new Date().toISOString(),
    });
  } catch (e) {
    res.status(200).json({ demo: true, car: [], em: [], error: e.message });
  }
};
