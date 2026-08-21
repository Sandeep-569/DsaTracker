// /api/sync/leetcode.js
// Vercel Serverless Function — runs server-side, so no CORS restrictions apply.
//
// Strategy:
//   1. GET https://leetcode.com/api/problems/all/ — public, no auth, returns
//      every problem with the current user's "status" field IF a session cookie
//      is present. Without a cookie, status is null for all — so we can't use
//      this to find what the user solved.
//   2. GET https://leetcode-stats-api.herokuapp.com/<username> — free public
//      third-party stats mirror that reads from LeetCode's public profile page
//      (not from the GraphQL private endpoint). Returns solvedCount reliably.
//   3. GET https://alfa-leetcode-api.onrender.com/<username>/acSubmissions — 
//      another public mirror that reliably returns recent accepted submissions
//      without needing cookies, because it scrapes the public profile page.
//
// If mirror (3) is unavailable, we fall back to LeetCode GraphQL with extra
// browser-like headers. Either way, the cron script is tolerant of an empty
// solved[] — it just won't add anything that run.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const username = (req.query.username || '').trim();
  if (!username) {
    return res.status(400).json({ error: 'Missing username query param' });
  }

  // ── 1. Get total solved count (multiple fallbacks) ───────────────────────
  let totalSolved = null;
  try {
    const statsRes = await fetch(`https://leetcode-stats-api.herokuapp.com/${username}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (statsRes.ok) {
      const sd = await statsRes.json();
      if (sd?.status === 'success') totalSolved = sd.totalSolved ?? null;
    }
  } catch (_) {}

  // Fallback: LeetCode GraphQL stats (works from server, no submissions needed)
  if (totalSolved === null) {
    try {
      const gRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        },
        body: JSON.stringify({
          query: `query($u:String!){matchedUser(username:$u){submitStats{acSubmissionNum{difficulty count}}}}`,
          variables: { u: username }
        })
      });
      if (gRes.ok) {
        const gd = await gRes.json();
        const arr = gd?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
        const all = arr.find(s => s.difficulty === 'All');
        totalSolved = all ? all.count : null;
      }
    } catch (_) {}
  }

  // ── 2. Get recent accepted submissions ───────────────────────────────────
  let solved = [];

  // Primary: alfa-leetcode-api (scrapes public profile, no auth needed)
  try {
    const acRes = await fetch(
      `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/acSubmissions?limit=20`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (acRes.ok) {
      const acData = await acRes.json();
      const list = acData?.submission || acData?.acSubmissionList || [];
      if (Array.isArray(list) && list.length > 0) {
        solved = list.map(s => ({
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp ? Number(s.timestamp) : null
        }));
      }
    }
  } catch (_) {}

  // Fallback: LeetCode GraphQL submissions (often blocked from server, but worth trying)
  if (solved.length === 0) {
    try {
      const lcRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': `https://leetcode.com/${username}/`,
          'Origin': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        },
        body: JSON.stringify({
          query: `query($u:String!,$l:Int!){recentAcSubmissionList(username:$u,limit:$l){title titleSlug timestamp}}`,
          variables: { u: username, l: 20 }
        })
      });
      if (lcRes.ok) {
        const lcData = await lcRes.json();
        const list = lcData?.data?.recentAcSubmissionList || [];
        solved = list.map(s => ({
          title: s.title,
          titleSlug: s.titleSlug,
          timestamp: s.timestamp ? Number(s.timestamp) : null
        }));
      }
    } catch (_) {}
  }

  return res.status(200).json({
    platform: 'LeetCode',
    username,
    solvedCount: totalSolved,
    solved
  });
}
