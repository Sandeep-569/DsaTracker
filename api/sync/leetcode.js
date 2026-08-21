// /api/sync/leetcode.js
// Vercel Serverless Function — runs server-side, so no CORS restrictions apply.
// Uses LeetCode's own public GraphQL endpoint (the same one leetcode.com's
// website uses internally). Only reads PUBLIC data (recent accepted
// submissions + total solved count) — no login or private cookie required.
//
// NOTE: LeetCode caps recentAcSubmissionList at roughly the last ~20 accepted
// submissions server-side, regardless of the "limit" value requested. This
// is a LeetCode-side limitation, not something this proxy can bypass.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const username = (req.query.username || '').trim();
  if (!username) {
    return res.status(400).json({ error: 'Missing username query param' });
  }

  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': `https://leetcode.com/${username}/`,
        'User-Agent': 'Mozilla/5.0 (compatible; DsaTrackerSyncBot/1.0)'
      },
      body: JSON.stringify({
        query,
        variables: { username, limit: 20 }
      })
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'LeetCode API request failed', status: response.status });
    }

    const data = await response.json();
    const submissions = data?.data?.recentAcSubmissionList || [];

    let totalSolved = null;
    try {
      const statsRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStats { acSubmissionNum { difficulty count } }
            }
          }`,
          variables: { username }
        })
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const stats = statsData?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
        const all = stats.find(s => s.difficulty === 'All');
        totalSolved = all ? all.count : null;
      }
    } catch (e) {
      // non-fatal, totalSolved stays null
    }

    const solved = submissions.map(s => ({
      title: s.title,
      titleSlug: s.titleSlug,
      timestamp: s.timestamp
    }));

    return res.status(200).json({
      platform: 'LeetCode',
      username,
      solvedCount: totalSolved,
      solved
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal sync error', message: err.message });
  }
}
