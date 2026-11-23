# 🚀 DSA Tracker — Company-Tagged DSA Platform

> 🌐 **Live Website**: [**https://dsatracker-6e8d0.web.app**](https://dsatracker-6e8d0.web.app)

A modern, high-performance web platform designed to streamline Data Structures & Algorithms interview preparation. Features thousands of curated company-tagged LeetCode problems, an interactive 53-week submission heatmap, Google Cloud Firestore real-time sync, and automated LeetCode submission syncing via GitHub Actions.

[![Live App](https://img.shields.io/badge/Live_App-Firebase_Hosting-orange?style=flat-square&logo=firebase)](https://dsatracker-6e8d0.web.app)
[![Database](https://img.shields.io/badge/Database-Cloud_Firestore-blue?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Auto Sync](https://img.shields.io/badge/Auto_Sync-GitHub_Actions-2088FF?style=flat-square&logo=githubactions)](https://github.com/Sandeep-569/DsaTracker)
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

### 2. 📊 Activity Heatmap & Productivity Analytics
- **53-Week Interactive Heatmap**: LeetCode/GitHub-style green contribution grid with 4 intensity levels based on daily solved volume.
- **Streak & Consistency Metrics**:
  - **Total Active Days**: Total unique calendar days with at least one problem solved.
  - **Max Streak & Current Streak**: Longest consecutive daily solving streak.
  - **Rolling 7-Day Solved**: Problems completed in the past 7 days.
  - **Current Month Solved**: Problems completed in the current calendar month.
- **Interactive Solved Date Logger**: Edit or backdate solved dates directly with a calendar picker, recalculating streaks and heatmaps on the fly.

---

### 3. ☁️ Real-Time Cloud Sync & Security Gate
- **Google Firebase Authentication**: Multi-device login with authorized whitelist protection preventing unauthorized external access.
- **Cloud Firestore Real-Time DB**: Instant two-way synchronization (`onSnapshot`) across all desktop and mobile devices.
- **Optimistic Local Caching**: Instant rendering on startup from `localStorage` (`leetcode_solved_v1`, `leetcode_starred_v1`) before network resolution.
- **JSON Data Backup & Restore**: Full data ownership with single-click JSON export and import.

---

### 4. 🤖 Automated LeetCode Profile Auto-Sync
- **GitHub Actions Cron Workflow (`.github/workflows/leetcode-autosync.yml`)**: Periodic scheduled runner queries the LeetCode GraphQL API for recent submissions.
- **Direct Firestore Sync**: Matches incoming LeetCode submissions against the question database and automatically marks them solved in Firestore with UTC timestamps.

---

### 5. ➕ In-App Custom & Contest Question Manager
- **Modern Glassmorphic Modal UI**: Premium dark glass modal with dedicated icon fields, live status banners, and smooth animations.
- **Interactive Difficulty Pills**: Color-coded segmented buttons (`🟢 Easy`, `🟡 Medium`, `🔴 Hard`) with active glow states instead of standard dropdowns.
- **Real-Time Live Preview Card**: Dynamically previews how your problem will render in tables (LeetCode badge, title, topic tags, and company badge).
- **One-Click Paste Button**: Inline `📋 Paste` action automatically reads clipboard links and triggers instant auto-detection.
- **Automatic LeetCode Metadata Auto-Detection**: Pasting any LeetCode problem URL queries official LeetCode problem details:
  - **LeetCode Problem Number** (e.g. `#4120`, `#4097`)
  - **Difficulty** (`Easy`, `Medium`, `Hard`)
  - **Official Title** (e.g. `Count Dominant Elements`)
  - **Pattern / Topic Tags** automatically mapped to DSA topics
- **Live Edit & Delete (`Custom ✏️`)**: Click the `Custom ✏️` badge in any table (Company problems, Bookmarks, Solved history) to edit tags, difficulty, question number, target company, or delete the problem.
- **Full Number Search & Badge Integration**: Custom questions display official `<span class="lc-num">#XXXX</span>` badges and are instantly searchable by problem number (e.g. `4120`, `#4097`).
- **Background Auto-Enrichment**: Automatically analyzes existing custom questions in the background to fetch missing LeetCode numbers and difficulties without requiring manual re-entry.
- **Target Company Flexibility**: Defaults to **"Random"** for recent contest questions, or allows filing under any company in the database.
- **Dual Persistence & Firestore Cloud Sync**: Synchronized instantly to Cloud Firestore (`users/{uid}.customQuestions`) across devices with offline `localStorage` fallback.
- **Integrated Backup & Restore**: Full JSON backup & restore (v1.4) compatibility to export custom questions alongside solved and starred records.

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
| **Automations** | GitHub Actions | Scheduled GraphQL scrapers & cron sync |
| **Hosting** | Firebase Hosting | High-speed global edge CDN deployment |

---

## 📂 Project Structure

```text
DsaTracker/
├── .github/
│   └── workflows/
│       ├── leetcode-autosync.yml          # GitHub Actions cron for LeetCode profile sync
│       ├── firebase-hosting-merge.yml     # Firebase Hosting CI/CD on main branch merge
│       └── firebase-hosting-pull-request.yml
├── scripts/
│   ├── sync-leetcode-cron.js             # Node.js script querying LeetCode GraphQL & Firestore
│   ├── local-server.js                   # Local development server
│   └── process_full_dataset.js           # Dataset processor
├── app.js                                # Core application controller & state
├── data.js                               # Offline LeetCode dataset with company frequency tags
├── firebase-service.js                   # Firebase SDK initialization, Auth, & Firestore listeners
├── index.html                            # Semantic single-page application structure
├── leetcode-numbers.js                   # Slug-to-number dictionary mapping
├── solvedQuestion.js                     # Solved questions modal, date picker & filters
├── styles.css                            # Complete CSS design system, themes, and animations
├── firestore.rules                       # Firestore security rules
├── firebase.json                         # Firebase hosting & headers configuration
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

Using Node:
```bash
node scripts/local-server.js
```

Using Python:
```bash
python -m http.server 8080
```

Open your browser at `http://localhost:8080`.

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
- `OWNER_EMAIL`: Your authorized Firebase login email.
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Service account private key JSON from Firebase Console.

---

## 🚢 Deployment

### Deploy to Firebase Hosting
```bash
npx firebase deploy --only hosting
```

---

## 👤 Author & Links

- **Author**: Sandeep Saha
- **GitHub**: [@Sandeep-569](https://github.com/Sandeep-569)
- **LeetCode**: [codedbysandeep](https://leetcode.com/u/codedbysandeep/)
- **LinkedIn**: [Sandeep  Saha](https://www.linkedin.com/in/codedbysandeep)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute for personal DSA preparation!
