const FIELDS = 'summary,status,priority,assignee,labels,created,updated,issuetype';

async function jiraPage(baseUrl, auth, jql, start) {
  const params = new URLSearchParams({ jql, maxResults: 100, startAt: start || 0, fields: FIELDS });
  const res = await fetch(`${baseUrl}/rest/api/3/search?${params}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`Jira API error ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchAll(baseUrl, auth, jql) {
  const all = [];
  let start = 0, total = 1;
  while (start < total && start < 500) {
    const data = await jiraPage(baseUrl, auth, jql, start);
    total = data.total || 0;
    const batch = data.issues || [];
    all.push(...batch);
    start += batch.length;
    if (batch.length < 100) break;
  }
  return all;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const {
    JIRA_URL    = 'https://enkash.atlassian.net',
    JIRA_EMAIL  = '',
    JIRA_TOKEN  = '',
    CAR_PROJECT = 'CAR',
    EM_PROJECT  = 'EM',
  } = process.env;

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    return res.status(500).json({
      error: 'Environment variables not set. Add JIRA_EMAIL and JIRA_TOKEN in Vercel → Project Settings → Environment Variables.'
    });
  }

  try {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    const [carIssues, emIssues] = await Promise.all([
      fetchAll(JIRA_URL, auth, `project = "${CAR_PROJECT}" AND status != "Parking lot" ORDER BY updated DESC`),
      fetchAll(JIRA_URL, auth, `project = "${EM_PROJECT}" ORDER BY updated DESC`)
    ]);

    const slim = issues => issues.map(i => ({
      key:       i.key,
      summary:   i.fields.summary,
      status:    i.fields.status?.name,
      priority:  i.fields.priority?.name,
      assignee:  i.fields.assignee?.displayName || null,
      labels:    i.fields.labels || [],
      issueType: i.fields.issuetype?.name,
      created:   i.fields.created,
      updated:   i.fields.updated,
    }));

    res.status(200).json({
      fetched: new Date().toISOString(),
      car:  slim(carIssues),
      em:   slim(emIssues),
      meta: { carProject: CAR_PROJECT, emProject: EM_PROJECT }
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
