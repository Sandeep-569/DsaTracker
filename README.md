# 🚀 DSA Tracker — Company-Tagged DSA & Spaced Repetition Platform

A modern, high-performance web platform designed to streamline Data Structures & Algorithms interview preparation. Features thousands of curated company-tagged LeetCode problems, a spaced repetition review engine for long-term retention, an interactive 53-week submission heatmap, Google Cloud Firestore real-time sync, and automated LeetCode submission syncing via GitHub Actions and serverless endpoints.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=flat-square&logo=vercel)](https://dsa-tracker-kappa-five.vercel.app)
[![Firebase](https://img.shields.io/badge/Backend-Firebase_Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/Language-Vanilla_JavaScript_ES6+-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## 📸 Key Features & Capabilities

### 1. 🏢 Curated Company & Pattern Question Bank
- **Company-Wise Frequency**: Questions tagged by top tech companies (Google, Meta, Amazon, Microsoft, Apple, Uber, Netflix, Bloomberg, Adobe, etc.) with frequency and difficulty weighting.
- **Pattern & Topic Categorization**: Categorized across fundamental DSA patterns:
  - Arrays & Hashing, Two Pointers, Sliding Window, Stack & Monotonic Stack
  - Binary Search, Linked Lists, Trees & BSTs, Tries, Heaps & Priority Queues
  - Backtracking, Graphs & Topo Sort, Dynamic Programming (1D/2D), Greedy, Bit Manipulation
- **Instant Multi-Modal Search**: Lightning-fast search supporting:
  - Problem titles (e.g. `Trapping Rain Water`)
  - Company names (e.g. `Google`, `Amazon`)
  - LeetCode question numbers (e.g. `1`, `42`, `#206`)

---

### 2. 🧠 Spaced Repetition Review Engine (Cold Retries)
Never forget core algorithm patterns or tricky edge cases.
- **Optimal Review Intervals**: Questions follow progressive spaced review stages:
  $$\text{Day 3} \longrightarrow \text{Day 7} \longrightarrow \text{Day 14} \longrightarrow \text{Day 30} \longrightarrow \text{Day 60 (Mastered)}$$
- **Quick Single-Input Question Add**: Simply type the LeetCode question number (e.g. `42` or `206`). The app automatically resolves the title, URL, pattern, and difficulty level with live autocomplete.
- **Cold Retry Validation**:
  - **✓ Solved Cold**: Advances problem to the next interval stage and logs attempt history.
  - **✗ Failed Cold**: Resets the problem back to Stage 1 (3-day retry) to reinforce weak spots.
  - **🗑️ Delete**: Removes questions from active review schedule.
- **Due Today vs. Upcoming Queues**: Real-time queues highlighting urgent reviews with orange glowing badges and overdue day counters.

---

### 3. 📊 Activity Heatmap & Productivity Analytics
- **53-Week Interactive Heatmap**: LeetCode/GitHub-style green contribution grid with 4 intensity levels based on daily solved volume.
- **Streak & Consistency Metrics**:
  - **Total Active Days**: Total unique calendar days with at least one problem solved.
  - **Max Streak & Current Streak**: Longest consecutive daily solving streak.
  - **Rolling 7-Day Solved**: Problems completed in the past 7 days.
  - **Current Month Solved**: Problems completed in the current calendar month.
- **Interactive Solved Date Logger**: Edit or backdate solved dates directly with a calendar picker, recalculating streaks and heatmaps on the fly.

---

### 4. ☁️ Real-Time Cloud Sync & Security Gate
- **Google Firebase Authentication**: Multi-device login with authorized whitelist protection preventing unauthorized external access.
- **Cloud Firestore Real-Time DB**: Instant two-way synchronization (`onSnapshot`) across all desktop and mobile devices.
- **Optimistic Local Caching**: Instant rendering on startup from `localStorage` (`leetcode_solved_v1`, `leetcode_starred_v1`, `leetcode_review_problems_v1`) before network resolution.
- **JSON Data Backup & Restore**: Full data ownership with single-click JSON export and import.

---

### 5. 🤖 Automated LeetCode Profile Auto-Sync
- **GitHub Actions Cron Workflow (`.github/workflows/leetcode-autosync.yml`)**: Periodic scheduled runner queries the LeetCode GraphQL API for recent submissions.
- **Serverless API Endpoint (`/api/sync/leetcode`)**: Secure webhook endpoint to trigger sync on demand.
- **Intelligent Title Mapping**: Matches incoming LeetCode submissions against the question database and automatically marks them solved in Firestore with UTC timestamps.

---

### 6. 🎨 Premium Dark-Mode Glassmorphism Design
- Custom Vanilla CSS architecture with custom CSS custom properties (tokens).
- Typography powered by Google Fonts (**Inter** + **JetBrains Mono**).
- Zero heavy frontend dependencies for ultra-fast First Contentful Paint (<100ms).
- Fully responsive layout adapting across Desktop monitors, Tablets, and Smartphones.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend UI** | HTML5, Vanilla JavaScript (ES6+), Modern CSS3 | Ultra-fast client-side SPA with zero bundle build overhead |
| **Styling** | Vanilla CSS (CSS Variables, Flexbox, CSS Grid) | Dark-mode glassmorphism, responsive split rows, animations |
| **Authentication** | Firebase Auth (Google Sign-In) | Secure OAuth sign-in with email allowlist gate |
| **Database** | Cloud Firestore | Real-time synchronized JSON document stores |
| **Automations** | GitHub Actions & Vercel Serverless | Scheduled GraphQL scrapers & cron sync |
| **Hosting** | Vercel & Firebase Hosting | High-speed global edge CDN deployment |

---

## 📂 Project Structure

```text
DsaTracker/
├── .github/
│   └── workflows/
│       ├── leetcode-autosync.yml          # GitHub Actions cron for LeetCode profile sync
│       ├── firebase-hosting-merge.yml     # Firebase Hosting CI/CD on main branch merge
│       └── firebase-hosting-pull-request.yml
├── api/
│   └── sync/
│       └── leetcode.js                   # Vercel serverless function for LeetCode sync
├── scripts/
│   └── sync-leetcode-cron.js             # Node.js script querying LeetCode GraphQL & Firestore
├── app.js                                # Core application controller, state, & review engine
├── data.js                               # Offline LeetCode dataset with company frequency tags
├── firebase-service.js                   # Firebase SDK initialization, Auth, & Firestore listeners
├── index.html                            # Semantic single-page application structure
├── leetcode-numbers.js                   # Slug-to-number dictionary mapping
├── solvedQuestion.js                     # Solved questions modal, date picker & filters
├── styles.css                            # Complete CSS design system, themes, and animations
├── firestore.rules                       # Firestore security rules
├── firebase.json                         # Firebase hosting & headers configuration
├── vercel.json                           # Vercel routing & headers configuration
└── package.json                          # Node scripts & dependencies
```

---

## 🚀 Getting Started (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/Sandeep-569/DsaTracker.git
cd DsaTracker
```

### 2. Run a Local Development Server
Because the application uses native ES6 JavaScript modules and service workers, serve the project with any local HTTP server:

Using Python:
```bash
# Python 3
python -m http.server 3000
```

Using Node (`npx serve`):
```bash
npx serve .
```

Using VS Code Live Server:
- Right click `index.html` and select **"Open with Live Server"**.

Open your browser at `http://localhost:3000`.

---

## ⚙️ Configuration & Environment Variables

### Firebase Setup
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Google Provider).
3. Enable **Cloud Firestore Database**.
4. Update the Firebase credentials in `firebase-service.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### LeetCode Autosync Secrets (GitHub Actions)
To enable automated submission syncing, configure the following secrets in **GitHub Repository → Settings → Secrets and variables → Actions**:
- `LEETCODE_USERNAME`: Your LeetCode profile handle.
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Service account private key JSON from Firebase Console.

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)
```bash
npx vercel --prod
```

### Deploy to Firebase Hosting
```bash
npx firebase deploy --only hosting
```

---

## 👤 Author & Links

- **Author**: Sandeep
- **GitHub**: [@Sandeep-569](https://github.com/Sandeep-569)
- **LeetCode**: [codedbysandeep](https://leetcode.com/u/codedbysandeep/)
- **LinkedIn**: [Sandeep](https://www.linkedin.com/)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute for personal DSA preparation!
