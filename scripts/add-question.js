/**
 * Script to add a question to a company in data.js
 *
 * Usage:
 *   node scripts/add-question.js <company> <title> <difficulty> <url> [src]
 *
 * Arguments:
 *   company    - Company name exactly as in data.js (e.g. "Google", "Random")
 *   title      - Problem title (e.g. "Two Sum")
 *   difficulty - Easy | Medium | Hard
 *   url        - Full LeetCode URL (e.g. https://leetcode.com/problems/two-sum)
 *   src        - Optional source tag (default: "L+S")
 *
 * Examples:
 *   node scripts/add-question.js Google "Two Sum" Easy https://leetcode.com/problems/two-sum
 *   node scripts/add-question.js Random "My Problem" Medium https://leetcode.com/problems/my-problem L+S
 */

const fs = require('fs');
const path = require('path');

// ── Parse CLI arguments ──────────────────────────────────────────────────────
const [, , company, title, difficulty, url, src = 'L+S'] = process.argv;

if (!company || !title || !difficulty || !url) {
  console.error('❌ Missing arguments.\n');
  console.error('Usage: node scripts/add-question.js <company> <title> <difficulty> <url> [src]');
  console.error('Example: node scripts/add-question.js Google "Two Sum" Easy https://leetcode.com/problems/two-sum');
  process.exit(1);
}

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
if (!VALID_DIFFICULTIES.includes(difficulty)) {
  console.error(`❌ Invalid difficulty "${difficulty}". Must be one of: Easy, Medium, Hard`);
  process.exit(1);
}

// ── Load data.js ─────────────────────────────────────────────────────────────
const dataPath = path.join(__dirname, '..', 'data.js');
const content = fs.readFileSync(dataPath, 'utf8');
const lines = content.split('\n');
const line1 = lines[0];

// Line 1 structure: const RAW_DATA = {...}, LEETCODE_DATA = {}; ...
const prefix = 'const RAW_DATA = ';
const markerIdx = line1.indexOf(', LEETCODE_DATA');
const jsonStr = line1.slice(prefix.length, markerIdx);
const suffix = line1.slice(markerIdx);

const data = JSON.parse(jsonStr);

// ── Validate company ─────────────────────────────────────────────────────────
if (!data[company]) {
  console.error(`❌ Company "${company}" not found in data.js.`);
  console.error('\nAvailable companies (sample):', Object.keys(data).slice(0, 10).join(', '), '...');
  process.exit(1);
}

// ── Add question ─────────────────────────────────────────────────────────────
const newQuestion = [title, difficulty, url, src];

const alreadyExists = data[company].some(q => q[2] === url);
if (alreadyExists) {
  console.log(`⚠️  Already exists in "${company}": ${title}`);
  process.exit(0);
}

data[company].push(newQuestion);

// Sort: Easy -> Medium -> Hard, then alphabetically within difficulty
const diffOrder = { Easy: 0, Medium: 1, Hard: 2 };
data[company].sort((a, b) => {
  const d = (diffOrder[a[1]] ?? 3) - (diffOrder[b[1]] ?? 3);
  return d !== 0 ? d : a[0].localeCompare(b[0]);
});

// ── Write back ────────────────────────────────────────────────────────────────
const updatedLine1 = prefix + JSON.stringify(data) + suffix;
lines[0] = updatedLine1;
fs.writeFileSync(dataPath, lines.join('\n'), 'utf8');

console.log(`✅ Added "${title}" (${difficulty}) to "${company}"`);
