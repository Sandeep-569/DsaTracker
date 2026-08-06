// App State & Local Storage Management
let companyList = [];
let maxTotal = 1;
let currentCompanyObj = null;
let currentFilter = 'All';
let solvedProblems = new Set(JSON.parse(localStorage.getItem('leetcode_solved_v1') || '[]'));

// Initialize Data from LEETCODE_DATA
function initData() {
  companyList = [];
  let totalPairsCount = 0;
  const uniqueProbs = new Set();

  for (const [name, problems] of Object.entries(LEETCODE_DATA)) {
    let e = 0, m = 0, h = 0;
    problems.forEach(p => {
      uniqueProbs.add(p.title);
      if (p.diff === 'Easy') e++;
      else if (p.diff === 'Medium') m++;
      else if (p.diff === 'Hard') h++;
    });

    companyList.push({
      name,
      total: problems.length,
      e, m, h,
      problems
    });

    totalPairsCount += problems.length;
  }

  // Sort companies descending by total problem count
  companyList.sort((a, b) => b.total - a.total);
  if (companyList.length > 0) {
    maxTotal = companyList[0].total;
  }

  // Update Header Stats Widgets
  document.getElementById('stat-companies').textContent = companyList.length.toLocaleString();
  document.getElementById('stat-unique').textContent = uniqueProbs.size.toLocaleString();
  updateSolvedStats();
}

function updateSolvedStats() {
  document.getElementById('stat-solved').textContent = solvedProblems.size.toLocaleString();
  localStorage.setItem('leetcode_solved_v1', JSON.stringify(Array.from(solvedProblems)));
}

// Render Home Screen (Companies List with Chunked Streaming for performance)
let currentRenderToken = 0;

function renderCompanies(dataToRender = companyList) {
  const compTbody = document.getElementById('companies-tbody');
  compTbody.innerHTML = '';

  const renderToken = ++currentRenderToken;
  const CHUNK_SIZE = 50;
  let idx = 0;

  function renderChunk() {
    if (renderToken !== currentRenderToken) return;

    const frag = document.createDocumentFragment();
    const end = Math.min(idx + CHUNK_SIZE, dataToRender.length);

    for (; idx < end; idx++) {
      const c = dataToRender[idx];
      const tr = document.createElement('tr');
      tr.className = 'row';
      tr.onclick = () => openCompany(c);

      let companySolved = 0;
      c.problems.forEach(p => {
        if (solvedProblems.has(p.title)) companySolved++;
      });

      const relPct = Math.max(((c.total / maxTotal) * 100).toFixed(1), 1.5);
      const solvedPct = c.total > 0 ? Math.round((companySolved / c.total) * 100) : 0;

      tr.innerHTML = `
        <td class="rank">#${idx + 1}</td>
        <td class="company-name">
          ${c.name}
          <div style="font-size:11px; color:var(--text-secondary); font-weight:normal; margin-top:2px;">
            ${companySolved}/${c.total} solved (${solvedPct}%)
          </div>
        </td>
        <td class="bar">
          <div class="bar-bg"><div class="barfill" style="width:${relPct}%"></div></div>
        </td>
        <td class="count c-total">${c.total}</td>
        <td class="count c-easy">${c.e}</td>
        <td class="count c-med">${c.m}</td>
        <td class="count c-hard">${c.h}</td>
      `;
      frag.appendChild(tr);
    }

    compTbody.appendChild(frag);

    if (idx < dataToRender.length) {
      requestAnimationFrame(renderChunk);
    }
  }

  if (dataToRender.length === 0) {
    compTbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching companies found.</td></tr>`;
  } else {
    renderChunk();
  }
}

// Global Search Filter for Home Screen
function filterCompanies() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  if (!q) {
    renderCompanies(companyList);
    return;
  }
  const filtered = companyList.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.problems.some(p => p.title.toLowerCase().includes(q))
  );
  renderCompanies(filtered);
}

// Navigation between views
function openCompany(companyObj) {
  currentCompanyObj = companyObj;
  document.getElementById('company-title').textContent = `${companyObj.name} (${companyObj.total} Problems)`;
  
  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('company-view').classList.add('active');
  document.getElementById('company-prob-search').value = '';
  window.scrollTo(0, 0);

  setFilter('All');
}

function goHome() {
  document.getElementById('company-view').classList.remove('active');
  document.getElementById('home-view').classList.remove('hidden');
  currentCompanyObj = null;
  renderCompanies(); // Refresh company list progress badges
}

// Difficulty & Status Filter
function setFilter(diff) {
  currentFilter = diff;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });

  renderProblems();
}

// Render Company View Problems
function renderProblems() {
  const probTbody = document.getElementById('problems-tbody');
  probTbody.innerHTML = '';

  if (!currentCompanyObj) return;

  let problemsToDisplay = currentCompanyObj.problems;

  // Apply Difficulty & Solved Filters
  if (currentFilter === 'Easy' || currentFilter === 'Medium' || currentFilter === 'Hard') {
    problemsToDisplay = problemsToDisplay.filter(p => p.diff === currentFilter);
  } else if (currentFilter === 'Solved') {
    problemsToDisplay = problemsToDisplay.filter(p => solvedProblems.has(p.title));
  }

  // Apply Problem Search Filter
  const searchVal = document.getElementById('company-prob-search').value.trim().toLowerCase();
  if (searchVal) {
    problemsToDisplay = problemsToDisplay.filter(p => 
      p.title.toLowerCase().includes(searchVal)
    );
  }

  const frag = document.createDocumentFragment();

  problemsToDisplay.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'row';

    const isSolved = solvedProblems.has(p.title);
    const tagsHTML = p.tags && p.tags.length > 0 ? `<div class="tags-row">${p.tags.map(t => `<span class="topic-tag">${t}</span>`).join('')}</div>` : '';

    const safeTitle = p.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    tr.innerHTML = `
      <td class="cb-cell">
        <input type="checkbox" class="status-cb" ${isSolved ? 'checked' : ''} onclick="toggleSolved('${safeTitle}', event)">
      </td>
      <td>
        <div class="prob-title">
          <a href="${p.url}" target="_blank" class="${isSolved ? 'completed' : ''}">${p.title}</a>
          ${tagsHTML}
        </div>
      </td>
      <td style="text-align:right;"><span class="tag ${p.diff}">${p.diff}</span></td>
      <td style="text-align:right;"><span class="srctag">${p.src || 'L+S'}</span></td>
    `;

    // Row click opens LeetCode link
    tr.onclick = (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
        window.open(p.url, '_blank');
      }
    };

    frag.appendChild(tr);
  });

  if (problemsToDisplay.length === 0) {
    probTbody.innerHTML = `<tr><td colspan="4" class="empty-state">No ${currentFilter} problems match your criteria.</td></tr>`;
  } else {
    probTbody.appendChild(frag);
  }
}

// Toggle Solved Status
function toggleSolved(title, event) {
  event.stopPropagation();
  if (solvedProblems.has(title)) {
    solvedProblems.delete(title);
  } else {
    solvedProblems.add(title);
  }
  updateSolvedStats();
  renderProblems();
}

// Random Problem Picker
function pickRandomProblem() {
  const pool = currentCompanyObj ? currentCompanyObj.problems : Object.values(LEETCODE_DATA).flat();
  if (!pool || pool.length === 0) return;
  
  const randomProblem = pool[Math.floor(Math.random() * pool.length)];
  
  document.getElementById('modal-title').textContent = randomProblem.title;
  document.getElementById('modal-desc').textContent = `Company: ${currentCompanyObj ? currentCompanyObj.name : 'Random Selection'} | Difficulty: ${randomProblem.diff}`;
  document.getElementById('modal-link').href = randomProblem.url;
  
  document.getElementById('random-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('random-modal').classList.remove('active');
}

// Reset Progress
function resetProgress() {
  if (confirm("Are you sure you want to reset all your solved problem progress?")) {
    solvedProblems.clear();
    updateSolvedStats();
    if (currentCompanyObj) renderProblems();
    else renderCompanies();
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initData();
  renderCompanies();
});
