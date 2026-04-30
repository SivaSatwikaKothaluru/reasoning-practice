# Reasoning Practice — AI Aptitude Prep

AI-powered verbal and analytical reasoning practice for placement exams.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + React
- **Backend**: Next.js API Route (`/api/generate`) — proxies Anthropic securely
- **AI**: Claude Sonnet via Anthropic API

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
```bash
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to GitHub + Vercel

### Step 1 — Push to GitHub
```bash
# In this project folder:
git init
git add .
git commit -m "Initial commit"

# Create a new repo at https://github.com/new  (name it: reasoning-practice)
# Then run the two commands GitHub shows you, e.g.:
git remote add origin https://github.com/YOUR_USERNAME/reasoning-practice.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `reasoning-practice` GitHub repo
3. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-xxxxxxx` (your actual key)
4. Click **Deploy** — done! 🎉

Your live URL will be something like `https://reasoning-practice.vercel.app`

---

## Project Structure
```
reasoning-practice/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate/
│   │   │       └── route.js      ← Backend: proxies Anthropic API
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   └── components/
│       └── ReasoningPractice.js  ← Main app component
├── .env.example
├── .gitignore
├── next.config.js
└── package.json
```

## Security Note
The API key is stored as a Vercel environment variable and only used server-side in `/api/generate`. It is never exposed to the browser.
