# EnKash Product Engineering Pipeline Dashboard

Live cross-board tracker linking the **Cards & Expense** product discovery board (CAR) to the **Enkash Expense** engineering board (EM).

---

## Deploy to Vercel (recommended — 5 minutes)

### Step 1 — Push to GitHub
Create a new private GitHub repo and push this folder:
```bash
git init
git add .
git commit -m "enkash pipeline dashboard"
git remote add origin https://github.com/your-org/enkash-pipeline.git
git push -u origin main
```

### Step 2 — Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Click **Deploy** (no build settings needed — it's a static project)

### Step 3 — Add environment variables
In Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `JIRA_URL` | `https://enkash.atlassian.net` |
| `JIRA_EMAIL` | your Jira login email |
| `JIRA_TOKEN` | your Jira API token (see below) |
| `CAR_PROJECT` | `CAR` |
| `EM_PROJECT` | `EM` |

**Getting a Jira API token:**
1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token** → give it a name → copy the token

### Step 4 — Redeploy
After adding env vars: Vercel dashboard → **Deployments → Redeploy**

Your dashboard is now live at `https://your-project.vercel.app` 🎉

### Step 5 — Share with the team
Send the Vercel URL to your team. No login required. The dashboard auto-refreshes every 5 minutes.

---

## Embed in Google Sites

Google Sites doesn't host custom HTML directly, but you can embed the Vercel URL:

1. Open your Google Site
2. Insert → **Embed** → enter your Vercel URL
3. Resize the embed to fill the page

Or add it as a full-page iframe in any internal portal.

---

## Custom domain (optional)

In Vercel → **Settings → Domains** → add `pipeline.enkash.com` (or similar).
Then add a CNAME record in your DNS pointing to `cname.vercel-dns.com`.

---

## File structure

```
enkash-pipeline/
├── index.html          ← dashboard (served to browser, no credentials)
├── api/
│   └── board.js        ← serverless function (calls Jira, credentials server-side)
├── vercel.json         ← routing config
└── README.md           ← this file
```

---

## How the Roadmap & Product fields work

Because the CAR board uses **Jira Product Discovery (JPD)**, its custom fields (Roadmap, Product) aren't exposed through the standard REST API.

The dashboard uses two fallback strategies:
1. **Inference from title** — keywords like "RIL" → Customer: RIL, "OCR" → Product: Expense, etc.
2. **Inline editing** — every row has editable Roadmap, Product, and Customer dropdowns. Changes save to your browser's localStorage and persist across sessions.

Once your JPD admin adds the standard Jira custom field IDs for Roadmap and Product, update the `api/board.js` FIELDS constant and the frontend will read them automatically.

---

## Cross-board matching

EM stories are matched to CAR ideas by:
1. **Label match** (exact) — if an EM story has label `CAR-XXX`, it links directly
2. **Title similarity** — Jaccard token overlap > 38% is treated as a probable match (shown as "~ title")

To enable exact matching: when creating an EM story from a CAR idea, add the label `CAR-XXX` (e.g. `CAR-909`) to the EM story.
