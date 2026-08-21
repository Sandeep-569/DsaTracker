// scripts/sync-leetcode-cron.js
// Runs in GitHub Actions on a schedule. Fetches recent LeetCode solves via the
// existing Vercel proxy, matches them against this app's question bank
// (data.js), and writes any newly solved problems directly to Firestore using
// the Firebase Admin SDK. This does NOT touch starredProblems or any other
// field — it only ever adds to solvedProblems / solvedDates, merging with
// whatever is already there, never overwriting unrelated data.
//
// data.js format note:
//   RAW_DATA  = { [company]: [[title, difficulty, url, source], ...], ... }
//   LEETCODE_DATA is also defined in data.js (same shape, different grouping).
// Both are set on globalThis by data.js lines 2-3, so the vm sandbox picks
// them up automatically. We read LEETCODE_DATA if present, else fall back to
// RAW_DATA — each problem entry is a plain array where index 0 is the title.

const admin = require('firebase-admin');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

// ---- Config from environment (set as GitHub Actions secrets) ----
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME;
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!LEETCODE_USERNAME || !OWNER_EMAIL || !SERVICE_ACCOUNT_JSON) {
  console.error('Missing required environment variables. Check GitHub Actions secrets.');
  console.error('Required: LEETCODE_USERNAME, OWNER_EMAIL, FIREBASE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

// Helper: fetch with an explicit timeout (ms)
async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ---- Init Firebase Admin ----
const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const auth = admin.auth();

// ---- Load the question bank (data.js) into this Node script ----
// data.js is written for the browser (plain <script> tag, sets globals on
// globalThis). In a vm sandbox, globalThis IS the sandbox object, so
// globalThis.LEETCODE_DATA and globalThis.RAW_DATA both land in `sandbox`.
// Each problem entry is an array: [title, difficulty, url, source]
// where index 0 is the problem title string.
function loadQuestionBank() {
  const dataJsPath = path.join(__dirname, '..', 'data.js');
  const code = fs.readFileSync(dataJsPath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  // Prefer LEETCODE_DATA if data.js defines it; fall back to RAW_DATA
  return sandbox.LEETCODE_DATA || sandbox.RAW_DATA || {};
}

// Build a flat, normalized lookup: lowercased-trimmed title -> exact canonical
// title string (must match exactly what the frontend uses as the solvedProblems
// Set key). Each entry in the question bank is [title, difficulty, url, source].
function buildTitleLookup(questionBank) {
  const lookup = new Map();
  Object.values(questionBank).forEach((problems) => {
    if (!Array.isArray(problems)) return;
    problems.forEach((p) => {
      // p is either an array [title, ...] or an object {title, ...}
      const rawTitle = Array.isArray(p) ? p[0] : p.title;
      if (!rawTitle || typeof rawTitle !== 'string') return;
      const canonical = rawTitle.trim();
      const key = canonical.toLowerCase();
      if (!lookup.has(key)) lookup.set(key, canonical);
    });
  });
  return lookup;
}

async function main() {
  console.log(`Starting LeetCode sync for ${LEETCODE_USERNAME}...`);

  // ── 1. Fetch recent accepted submissions directly (no proxy, no timeout risk)
  // Primary: alfa-leetcode-api (Render free tier — allow up to 60s for cold start)
  let solvedList = [];
  let totalSolved = null;

  console.log('Calling alfa-leetcode-api (may take up to 60s on cold start)...');
  try {
    const acRes = await fetchWithTimeout(
      `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(LEETCODE_USERNAME)}/acSubmissions?limit=20`,
      { headers: { 'Accept': 'application/json' } },
      60000
    );
    if (acRes.ok) {
      const acData = await acRes.json();
      const list = acData?.submission || acData?.acSubmissionList || [];
      if (Array.isArray(list) && list.length > 0) {
        solvedList = list.map(s => ({
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp ? Number(s.timestamp) : null
        }));
        console.log(`alfa-leetcode-api returned ${solvedList.length} submission(s).`);
      } else {
        console.log('alfa-leetcode-api returned empty list.');
      }
    } else {
      console.log(`alfa-leetcode-api HTTP ${acRes.status}.`);
    }
  } catch (e) {
    console.log(`alfa-leetcode-api failed: ${e.message}`);
  }

  // Fallback: LeetCode GraphQL (often blocked from datacenters, but worth trying)
  if (solvedList.length === 0) {
    console.log('Trying LeetCode GraphQL fallback...');
    try {
      const lcRes = await fetchWithTimeout('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': `https://leetcode.com/${LEETCODE_USERNAME}/`,
          'Origin': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        },
        body: JSON.stringify({
          query: `query($u:String!,$l:Int!){recentAcSubmissionList(username:$u,limit:$l){title titleSlug timestamp}}`,
          variables: { u: LEETCODE_USERNAME, l: 20 }
        })
      }, 20000);
      if (lcRes.ok) {
        const lcData = await lcRes.json();
        const list = lcData?.data?.recentAcSubmissionList || [];
        solvedList = list.map(s => ({
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp ? Number(s.timestamp) : null
        }));
        console.log(`LeetCode GraphQL returned ${solvedList.length} submission(s).`);
      }
    } catch (e) {
      console.log(`LeetCode GraphQL failed: ${e.message}`);
    }
  }

  // Get total solved count for logging
  try {
    const statsRes = await fetchWithTimeout(`https://leetcode-stats-api.herokuapp.com/${LEETCODE_USERNAME}`,
      { headers: { 'Accept': 'application/json' } }, 15000);
    if (statsRes.ok) {
      const sd = await statsRes.json();
      if (sd?.status === 'success') totalSolved = sd.totalSolved ?? null;
    }
  } catch (_) {}

  console.log(`Fetched ${solvedList.length} recent accepted submission(s) from LeetCode.`);
  if (totalSolved !== null) console.log(`LeetCode reports total solved: ${totalSolved}`);

  if (solvedList.length === 0) {
    console.log('Nothing to sync. Exiting.');
    return;
  }

  // 2. Load question bank and build lookup
  const questionBank = loadQuestionBank();
  const titleLookup = buildTitleLookup(questionBank);
  console.log(`Question bank loaded. ${titleLookup.size} unique problem titles indexed.`);

  // 3. Resolve the owner's Firestore doc (by uid, looked up from email)
  const userRecord = await auth.getUserByEmail(OWNER_EMAIL);
  const uid = userRecord.uid;
  console.log(`Resolved user uid: ${uid}`);
  const docRef = db.collection('users').doc(uid);
  const docSnap = await docRef.get();
  const existing = docSnap.exists ? docSnap.data() : {};

  const existingSolved = new Set(existing.solvedProblems || []);
  const existingDates = existing.solvedDates || {};
  console.log(`Current solved count in Firestore: ${existingSolved.size}`);

  // 4. Match and merge — only ADD new items, never remove/overwrite existing ones
  let newlyAdded = 0;
  let skippedNotInBank = 0;
  let skippedAlreadySolved = 0;

  solvedList.forEach((item) => {
    const key = (item.title || '').trim().toLowerCase();
    if (!key) return;
    const matchedTitle = titleLookup.get(key);
    if (!matchedTitle) {
      skippedNotInBank++;
      return; // not in this tracker's question bank, skip
    }

    if (existingSolved.has(matchedTitle)) {
      skippedAlreadySolved++;
      return;
    }

    existingSolved.add(matchedTitle);
    existingDates[matchedTitle] = item.timestamp
      ? new Date(item.timestamp * 1000).toISOString()
      : new Date().toISOString();
    newlyAdded++;
    console.log(`  + Adding: "${matchedTitle}"`);
  });

  console.log(`Sync summary: ${newlyAdded} new, ${skippedAlreadySolved} already tracked, ${skippedNotInBank} not in question bank.`);

  if (newlyAdded === 0) {
    console.log('No new solves to add. Firestore already up to date.');
    return;
  }

  // 5. Write back — merge:true so starredProblems and any other fields are untouched
  await docRef.set({
    solvedProblems: Array.from(existingSolved),
    solvedDates: existingDates,
    updatedAt: new Date().toISOString(),
    lastAutoSyncAt: new Date().toISOString()
  }, { merge: true });

  console.log(`Successfully added ${newlyAdded} newly solved problem(s) to Firestore.`);
}

main().catch((err) => {
  console.error('Sync script failed:', err);
  process.exit(1);
});
