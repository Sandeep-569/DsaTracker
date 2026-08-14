// Solved Questions View & Manager Module
var currentSolvedFilter = typeof currentSolvedFilter !== 'undefined' ? currentSolvedFilter : 'All';
var currentSolvedDateFilter = typeof currentSolvedDateFilter !== 'undefined' ? currentSolvedDateFilter : 'All Time';

function openSolvedView() {
  document.getElementById('home-view')?.classList.add('hidden');
  document.getElementById('company-topics-view')?.classList.remove('active');
  document.getElementById('topic-problems-view')?.classList.remove('active');
  document.getElementById('bookmarks-view')?.classList.remove('active');
  document.getElementById('solved-view')?.classList.add('active');

  const searchEl = document.getElementById('solved-search');
  if (searchEl) searchEl.value = '';

  setSolvedFilter('All');
  setSolvedDateFilter('All Time');
  window.scrollTo(0, 0);
}

function setSolvedFilter(diff) {
  currentSolvedFilter = diff;
  document.querySelectorAll('#solved-filters-container .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });
  renderSolvedView();
}

function setSolvedDateFilter(range) {
  currentSolvedDateFilter = range;
  document.querySelectorAll('#solved-date-filters .date-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === range);
  });
  renderSolvedView();
}

/* Returns start-of-day (midnight local) for N days ago */
function daysAgoMidnight(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function formatSolvedDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return '—';
  }
}

function renderSolvedView() {
  const query = (document.getElementById('solved-search')?.value || '').trim().toLowerCase();

  // Compute date threshold for the active date filter
  let dateThreshold = null;
  if (currentSolvedDateFilter === 'Today') {
    dateThreshold = daysAgoMidnight(0);
  } else if (currentSolvedDateFilter === 'This Week') {
    dateThreshold = daysAgoMidnight(7);
  } else if (currentSolvedDateFilter === 'This Month') {
    dateThreshold = daysAgoMidnight(30);
  }

  // Deduplicate and aggregate solved problems across all companies
  const probMap = new Map();
  if (typeof companyList !== 'undefined' && companyList.length > 0) {
    companyList.forEach(c => {
      c.problems.forEach(p => {
        if (!solvedProblems.has(p.title)) return;

        const normTitle = p.title.trim();
        if (!probMap.has(normTitle)) {
          probMap.set(normTitle, {
            ...p,
            title: normTitle,
            companies: [c.name]
          });
        } else {
          const existing = probMap.get(normTitle);
          if (!existing.companies.includes(c.name)) {
            existing.companies.push(c.name);
          }
        }
      });
    });
  }

  let pool = Array.from(probMap.values());

  // Apply Date Filter
  if (dateThreshold !== null) {
    pool = pool.filter(p => {
      const dateStr = (typeof solvedDates !== 'undefined') ? solvedDates.get(p.title) : null;
      if (!dateStr) return false; // no date recorded → exclude when filtering by date
      try {
        return new Date(dateStr) >= dateThreshold;
      } catch {
        return false;
      }
    });
  }

  // Apply Difficulty Filter
  if (currentSolvedFilter === 'Easy' || currentSolvedFilter === 'Medium' || currentSolvedFilter === 'Hard') {
    pool = pool.filter(p => p.diff === currentSolvedFilter);
  }

  // Apply Search Query Filter (title, topic tags, or company names)
  if (query) {
    pool = pool.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
      (p.companies && p.companies.some(c => c.toLowerCase().includes(query)))
    );
  }

  const emptyState = document.getElementById('solved-empty-state');
  if (pool.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    document.getElementById('sv-section-easy').style.display = 'none';
    document.getElementById('sv-section-medium').style.display = 'none';
    document.getElementById('sv-section-hard').style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Sort problems topic-wise then alphabetically
  if (typeof sortProblemsByTopic === 'function') {
    pool = sortProblemsByTopic(pool);
  }

  const easyProblems = pool.filter(p => p.diff === 'Easy');
  const medProblems  = pool.filter(p => p.diff === 'Medium');
  const hardProblems = pool.filter(p => p.diff === 'Hard');

  document.getElementById('sv-count-easy').textContent   = `${easyProblems.length} Problems`;
  document.getElementById('sv-count-medium').textContent = `${medProblems.length} Problems`;
  document.getElementById('sv-count-hard').textContent   = `${hardProblems.length} Problems`;

  renderSolvedTableSection('sv-tbody-easy',   'sv-section-easy',   easyProblems);
  renderSolvedTableSection('sv-tbody-medium', 'sv-section-medium', medProblems);
  renderSolvedTableSection('sv-tbody-hard',   'sv-section-hard',   hardProblems);
}

function renderSolvedTableSection(tbodyId, sectionId, problemsList) {
  const tbody   = document.getElementById(tbodyId);
  const section = document.getElementById(sectionId);
  if (!tbody || !section) return;

  tbody.innerHTML = '';

  if (problemsList.length === 0) {
    if (currentSolvedFilter !== 'All' || currentSolvedDateFilter !== 'All Time') {
      section.style.display = 'none';
    } else {
      section.style.display = 'block';
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding: 24px 16px;">No questions in this section.</td></tr>`;
    }
    return;
  }

  section.style.display = 'block';
  const frag = document.createDocumentFragment();

  problemsList.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'row';

    const isSolved  = solvedProblems.has(p.title);
    const isStarred = starredProblems.has(p.title);

    const tagsHTML = p.tags && p.tags.length > 0
      ? `<div class="tags-row">${p.tags.map(t => `<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    let companyBadgeHTML = '';
    if (p.companies && p.companies.length > 0) {
      const maxShown  = 2;
      const shown     = p.companies.slice(0, maxShown);
      const remaining = p.companies.length - maxShown;

      companyBadgeHTML = shown.map(comp =>
        `<button class="back-btn" data-comp="${escapeHtml(comp)}" style="padding: 2px 7px; font-size: 11px; margin-right: 4px; margin-bottom: 2px;" onclick="event.stopPropagation(); openCompanyByName(this.dataset.comp)">🏢 ${escapeHtml(comp)}</button>`
      ).join('');

      if (remaining > 0) {
        companyBadgeHTML += `<span style="font-size: 11px; color: var(--text-secondary); font-family: var(--mono);" title="${escapeHtml(p.companies.join(', '))}">+${remaining} more</span>`;
      }
    }

    // Solved date
    const dateStr = (typeof solvedDates !== 'undefined') ? solvedDates.get(p.title) : null;
    const dateDisplay = formatSolvedDate(dateStr);
    const dateTitleAttr = dateStr ? new Date(dateStr).toLocaleString() : 'Date not recorded';

    tr.innerHTML = `
      <td class="cb-cell">
        <input type="checkbox" class="status-cb" ${isSolved ? 'checked' : ''}>
      </td>
      <td style="text-align:center;">
        <button class="star-btn ${isStarred ? 'starred' : ''}" title="${isStarred ? 'Unstar' : 'Bookmark for revision'}">
          ★
        </button>
      </td>
      <td>
        <div class="prob-title">
          <a href="${p.url}" target="_blank" class="${isSolved ? 'completed' : ''}">${escapeHtml(p.title)}</a>
          ${tagsHTML}
        </div>
      </td>
      <td>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 2px;">
          ${companyBadgeHTML}
        </div>
      </td>
      <td style="text-align:right;"><span class="tag ${p.diff}">${p.diff}</span></td>
      <td style="text-align:right;"><span class="srctag">${p.src || 'L+S'}</span></td>
      <td style="text-align:right; white-space:nowrap;" title="${dateTitleAttr}">
        <span class="solved-date-badge">${dateDisplay}</span>
      </td>
    `;

    const cb = tr.querySelector('.status-cb');
    cb.addEventListener('click', (e) => toggleSolved(p.title, e));

    const starBtn = tr.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => toggleStar(p.title, e));

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}
