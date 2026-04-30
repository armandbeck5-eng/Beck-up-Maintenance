# Beck-Up Maintenance

Property maintenance request app for Beck Estates.
Black & gold theme · Formspree emails · Supabase backend · Netlify/Vercel deploy.

---

## Quick Start

```bash
npm install
npm run dev
```

---

## Setup (3 steps before going live)

### 1 · Formspree — email notifications to admin@beckestates.co.za

Free. 50 submissions/month. Zero account required for basic use.

1. Go to https://formspree.io/f/new
2. Enter `admin@beckestates.co.za` as the destination
3. Submit — copy the **Form ID** (e.g. `xpznkgvb`)
4. Open `src/App.jsx` and replace:
   ```js
   const FORMSPREE_ID = "YOUR_FORMSPREE_ID";
   ```
   with your actual ID, e.g.:
   ```js
   const FORMSPREE_ID = "xpznkgvb";
   ```

Every form submission will now email admin@beckestates.co.za with all the request details.

---

### 2 · Supabase — persistent backend for the admin dashboard

Free tier: 500 MB database, unlimited API calls.

1. Go to https://supabase.com → New project
2. SQL Editor → New Query → paste the contents of `supabase-schema.sql` → Run
3. Settings → API → copy **Project URL** and **anon/public key**
4. In `src/App.jsx` replace:
   ```js
   const SUPABASE_URL  = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY";
   ```

Without Supabase configured the app falls back to localStorage (data only persists in the same browser — fine for testing).

---

### 3 · Logo

Place `logo.png` in the `/public` folder. It will appear in the nav and on the report page.

---

## Deploy to Netlify (free)

**Option A — Drag & drop (instant):**
```bash
npm run build
```
Then drag the `dist/` folder to https://app.netlify.com/drop

**Option B — Git auto-deploy:**
1. Push this folder to a GitHub repo
2. Go to https://netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy — Netlify gives you a free `*.netlify.app` URL

---

## File Structure

```
beck-up/
├── public/
│   └── logo.png          ← place your logo here
├── src/
│   ├── App.jsx           ← entire app (UI + logic)
│   └── main.jsx          ← React entry point
├── supabase-schema.sql   ← run once in Supabase SQL editor
├── index.html
├── package.json
└── vite.config.js
```
