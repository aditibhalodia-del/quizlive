# QuizLive · IMS Gujarat

Real-time MCQ quiz for CAT batches. Students answer from their phones,
answers stream live into Google Sheets, time-based scoring.

---

## Setup (one-time, ~15 minutes)

### Step 1 — Firebase Realtime Database (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Create project** → give it a name (e.g. `quizlive-ims`) → Continue
3. Left sidebar → **Build → Realtime Database → Create database**
4. Choose region → Start in **test mode** → Enable
5. Left sidebar → **Project Settings** (gear icon) → **Your apps** → click `</>` (Web)
6. Register app (any nickname) → copy the `firebaseConfig` object
7. Open `src/firebase.js` and paste your values in place of the placeholders

**Database rules** (for internal use, this is fine):
- In Realtime Database → Rules tab, set:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
Then click **Publish**.

---

### Step 2 — Run locally to test

```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

---

### Step 3 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial QuizLive setup"
```
Create a new repo on [github.com](https://github.com) → then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/quizlive.git
git branch -M main
git push -u origin main
```

---

### Step 4 — Deploy to Vercel (free, one click)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. **New Project** → Import your `quizlive` repo
3. Framework preset: **Vite** (auto-detected)
4. Click **Deploy**

Your live URL will be something like `https://quizlive-ims.vercel.app`

Share that URL with students. Done ✅

---

## How it works

| Who | Does what |
|---|---|
| **Presenter** | Logs in with password → creates quiz → gets a session code + QR |
| **Students** | Open the URL → scan QR (code pre-filled!) or type code → answer questions |
| **Google Sheets** | Each answer posted automatically when presenter reveals |
| **Firebase** | Syncs quiz state in real time across all devices |

## Changing the presenter password

Open `src/App.jsx` → line 10:
```js
const PRESENTER_PASS = "IMS@2026";
```
Change to whatever you like, commit, and Vercel auto-redeploys.

## Scoring

- Correct answer = **500–1000 pts** depending on speed
- Wrong answer = **0 pts**
- Formula: `500 + 500 × (1 − time_taken / time_limit)`

## Google Sheets columns

Each row = one student's answer to one question:

`Name | Centre | Batch | Session Code | Question No | Answer Given | Correct | Points`
