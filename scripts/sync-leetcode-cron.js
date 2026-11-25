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

// Build flat, normalized lookups:
// 1. titleLookup: lowercased-trimmed title -> exact canonical title string
// 2. slugLookup: lowercased URL slug -> exact canonical title string
function buildLookups(questionBank) {
  const titleLookup = new Map();
  const slugLookup = new Map();
  Object.values(questionBank).forEach((problems) => {
    if (!Array.isArray(problems)) return;
    problems.forEach((p) => {
      const rawTitle = Array.isArray(p) ? p[0] : p.title;
      const url = Array.isArray(p) ? p[2] : p.url;
      if (!rawTitle || typeof rawTitle !== 'string') return;
      const canonical = rawTitle.trim();
      const key = canonical.toLowerCase();
      if (!titleLookup.has(key)) titleLookup.set(key, canonical);

      if (url) {
        const match = url.match(/leetcode\.com\/problems\/([^\/\?#]+)/);
        if (match) {
          const slug = match[1].toLowerCase();
          if (!slugLookup.has(slug)) slugLookup.set(slug, canonical);
        }
      }
    });
  });
  return { titleLookup, slugLookup };
}

async function fetchUserSolvedList(username, sessionToken = '') {
  let solvedList = [];
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Referer': `https://leetcode.com/u/${username}/`,
      'Origin': 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    };
    if (sessionToken) {
      headers['Cookie'] = `LEETCODE_SESSION=${sessionToken};`;
    }

    const lcRes = await fetchWithTimeout('https://leetcode.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
          }
        }`,
        variables: { username, limit: 20 }
      })
    }, 20000);

    if (lcRes.ok) {
      const lcData = await lcRes.json();
      const list = lcData?.data?.recentAcSubmissionList || [];
      if (list.length > 0) {
        solvedList = list.map(s => ({
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp ? Number(s.timestamp) : null
        }));
      }
    }
  } catch (e) {
    console.log(`LeetCode GraphQL request encountered an issue for "${username}": ${e.message}`);
  }

  // Fallback to alfa-leetcode-api if direct GraphQL returned nothing
  if (solvedList.length === 0) {
    try {
      const acRes = await fetchWithTimeout(
        `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/acSubmissions?limit=20`,
        { headers: { 'Accept': 'application/json' } },
        30000
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
        }
      }
    } catch (_) {}
  }
  return solvedList;
}

async function syncUserRecord(uid, leetcodeUsername, email, titleLookup, slugLookup, sessionToken = '') {
  console.log(`\n--- Syncing user: ${email || uid} (LeetCode: ${leetcodeUsername}) ---`);
  const solvedList = await fetchUserSolvedList(leetcodeUsername, sessionToken);
  console.log(`Fetched ${solvedList.length} recent accepted submission(s) for "${leetcodeUsername}".`);

  if (solvedList.length === 0) {
    console.log(`No submissions found or profile private for ${leetcodeUsername}.`);
    return 0;
  }

  const docRef = db.collection('users').doc(uid);
  const docSnap = await docRef.get();
  const existing = docSnap.exists ? docSnap.data() : {};

  const existingSolved = new Set(existing.solvedProblems || []);
  const existingDates = existing.solvedDates || {};
  let newlyAdded = 0;
  let skippedNotInBank = 0;
  let skippedAlreadySolved = 0;

  solvedList.forEach((item) => {
    const key = (item.title || '').trim().toLowerCase();
    const slugKey = (item.titleSlug || '').trim().toLowerCase();
    if (!key && !slugKey) return;
    const matchedTitle = (key && titleLookup.get(key)) || (slugKey && slugLookup.get(slugKey));
    if (!matchedTitle) {
      skippedNotInBank++;
      return;
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
    console.log(`  + [${leetcodeUsername}] Adding: "${matchedTitle}"`);
  });

  console.log(`Sync summary for ${leetcodeUsername}: ${newlyAdded} new, ${skippedAlreadySolved} already tracked, ${skippedNotInBank} not in question bank.`);

  if (newlyAdded > 0) {
    await docRef.set({
      solvedProblems: Array.from(existingSolved),
      solvedDates: existingDates,
      updatedAt: new Date().toISOString(),
      lastAutoSyncAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Successfully added ${newlyAdded} newly solved problem(s) to Firestore for ${leetcodeUsername}.`);
  } else {
    console.log(`Firestore already up to date for ${leetcodeUsername}.`);
  }
  return newlyAdded;
}

async function main() {
  console.log(`Starting multi-user LeetCode Auto-Sync Pipeline...`);

  // 1. Load question bank and build lookups once
  const questionBank = loadQuestionBank();
  const { titleLookup, slugLookup } = buildLookups(questionBank);
  console.log(`Question bank loaded. ${titleLookup.size} titles and ${slugLookup.size} slugs indexed.`);

  let ownerUid = null;
  const ownerSessionToken = (process.env.LEETCODE_SESSION || '').trim();

  // 2. Primary: Always sync repository OWNER first
  try {
    const userRecord = await auth.getUserByEmail(OWNER_EMAIL);
    ownerUid = userRecord.uid;
    console.log(`Resolved owner UID: ${ownerUid} (${OWNER_EMAIL})`);
    await syncUserRecord(ownerUid, LEETCODE_USERNAME, OWNER_EMAIL, titleLookup, slugLookup, ownerSessionToken);
  } catch (err) {
    console.error(`Error resolving owner by email (${OWNER_EMAIL}):`, err.message);
  }

  // 3. Multi-User: Query Firestore for other registered users who saved a leetcodeUsername
  try {
    console.log('\nChecking for other registered users with LeetCode usernames...');
    const snapshot = await db.collection('users').get();
    let otherUsersCount = 0;

    for (const doc of snapshot.docs) {
      if (doc.id === ownerUid) continue; // Already processed
      const data = doc.data();
      const userHandle = (data.leetcodeUsername || '').trim();
      if (userHandle) {
        otherUsersCount++;
        await syncUserRecord(doc.id, userHandle, data.email, titleLookup, slugLookup);
      }
    }
    console.log(`\nCompleted auto-sync for ${otherUsersCount} registered visitor(s) + 1 owner.`);
  } catch (err) {
    console.warn('Could not query other users (proceeding):', err.message);
  }
}

main().catch((err) => {
  console.error('Sync script failed:', err);
  process.exit(1);
});
