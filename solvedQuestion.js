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

/* Returns start-of-day (UTC midnight) for N days ago — matches formatSolvedDate() UTC convention */
function daysAgoMidnight(n) {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - n);
  return utcMidnight;
}

function formatSolvedDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    // Use UTC so that IST dates before 5:30 AM (= previous UTC day) show correctly
    const day = d.getUTCDate();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '—';
  }
}

/* Open an inline date-picker to change the solved date for a problem */
function changeSolvedDate(title) {
  const existing = (typeof solvedDates !== 'undefined') ? solvedDates.get(title) : null;

  // Build a yyyy-MM-dd string (UTC) for the input default value
  const toInputVal = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch { return ''; }
  };

  // Remove any existing picker overlay
  document.getElementById('__date-picker-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = '__date-picker-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
  `;

  overlay.innerHTML = `
    <div style="
      background: var(--card-bg, #1e1e2e);
      border: 1px solid var(--border, #333);
      border-radius: 14px;
      padding: 28px 32px;
      min-width: 300px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      display: flex; flex-direction: column; gap: 16px;
    ">
      <div style="font-size: 15px; font-weight: 600; color: var(--text-primary, #fff);">
        📅 Edit Solved Date
      </div>
      <div style="font-size: 12px; color: var(--text-secondary, #aaa); word-break: break-word;">
        ${escapeHtml(title)}
      </div>
      <input
        id="__date-picker-input"
        type="date"
        value="${toInputVal(existing)}"
        max="${toInputVal(new Date().toISOString())}"
        style="
          padding: 8px 12px; border-radius: 8px;
          border: 1px solid var(--border, #444);
          background: var(--input-bg, #2a2a3e);
          color: var(--text-primary, #fff);
          font-size: 14px; width: 100%; box-sizing: border-box;
        "
      />
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="__date-picker-cancel" style="
          padding: 7px 18px; border-radius: 8px; border: 1px solid var(--border,#444);
          background: transparent; color: var(--text-secondary,#aaa);
          font-size: 13px; cursor: pointer;
        ">Cancel</button>
        <button id="__date-picker-save" style="
          padding: 7px 18px; border-radius: 8px; border: none;
          background: var(--accent, #7c6ef7); color: #fff;
          font-size: 13px; cursor: pointer; font-weight: 600;
        ">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('__date-picker-cancel').addEventListener('click', close);

  document.getElementById('__date-picker-save').addEventListener('click', () => {
    const val = document.getElementById('__date-picker-input').value; // yyyy-MM-dd
    if (!val) { close(); return; }

    // Convert picked date → UTC midnight ISO string (avoids IST offset shifting day back by 1)
    const [y, m, d] = val.split('-').map(Number);
    const newDate = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(newDate.getTime())) { close(); return; }

    // Update the map
    if (typeof solvedDates !== 'undefined') {
      solvedDates.set(title, newDate.toISOString());
    }

    // Persist to localStorage
    try {
      const datesObj = {};
      if (typeof solvedDates !== 'undefined') {
        solvedDates.forEach((date, t) => { datesObj[t] = date; });
      }
      localStorage.setItem('leetcode_solved_dates_v1', JSON.stringify(datesObj));
    } catch (e) {
      console.error('Error saving date to localStorage:', e);
    }

    // Write to Firestore immediately with a captured snapshot to avoid the
    // 400ms debounce race: if cloud-data-received fires before the debounce
    // timer expires it would overwrite the local change back to the old date.
    if (window.FirebaseService && window.FirebaseService.getCurrentUser()) {
      const datesObj = {};
      if (typeof solvedDates !== 'undefined') {
        solvedDates.forEach((date, t) => { datesObj[t] = date; });
      }
      window.FirebaseService.saveProgressToCloud(
        typeof solvedProblems !== 'undefined' ? Array.from(solvedProblems) : [],
        typeof starredProblems !== 'undefined' ? Array.from(starredProblems) : [],
        datesObj
      );
    }

    // Update heatmap to reflect the new date
    if (typeof window.renderSolvedHeatmap === 'function') window.renderSolvedHeatmap();

    close();
    renderSolvedView();
  });

  // Focus the input
  setTimeout(() => document.getElementById('__date-picker-input')?.focus(), 50);
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

  // Apply Search Query Filter (title, topic tags, company names, or LC number)
  if (query) {
    const svLcNum = (typeof parseLeetCodeNumberQuery === 'function') ? parseLeetCodeNumberQuery(query) : null;
    pool = pool.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
      (p.companies && p.companies.some(c => c.toLowerCase().includes(query))) ||
      (svLcNum !== null && p.lcNum === svLcNum)
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

  if (query && typeof sortSearchResults === 'function') {
    const svLcNum = (typeof parseLeetCodeNumberQuery === 'function') ? parseLeetCodeNumberQuery(query) : null;
    pool = sortSearchResults(pool, query, svLcNum);
  } else {
    // Sort by date solved — most recent first; no-date entries go to bottom
    pool.sort((a, b) => {
      const da = (typeof solvedDates !== 'undefined') ? solvedDates.get(a.title) : null;
      const db = (typeof solvedDates !== 'undefined') ? solvedDates.get(b.title) : null;
      if (da && db) return new Date(db) - new Date(da); // newest first
      if (da) return -1; // a has date, b doesn't → a goes first
      if (db) return 1;  // b has date, a doesn't → b goes first
      return a.title.localeCompare(b.title); // both no date → alphabetical
    });
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
          <a href="${p.url}" target="_blank" class="${isSolved ? 'completed' : ''}">${(typeof getProblemNumberBadgeHtml === 'function' ? getProblemNumberBadgeHtml(p) : (p.lcNum ? '<span class="lc-num">#' + p.lcNum + '</span> ' : ''))}${escapeHtml(p.title)}</a>
          ${tagsHTML}
        </div>
      </td>
      <td>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 2px;">
          ${companyBadgeHTML}
        </div>
      </td>
      <td style="text-align:right;"><span class="tag ${p.diff}">${p.diff}</span></td>
      <td style="text-align:right;">
        <span class="srctag ${p.isCustom ? 'custom-tag clickable' : ''}" ${p.isCustom ? `onclick="event.stopPropagation(); if (typeof openEditQuestionModal === 'function') openEditQuestionModal('${escapeHtml(p.url)}', '${escapeHtml((p.companies && p.companies[0]) || 'Random')}')" title="Click to edit difficulty, tags, or question number"` : ''}>${p.src || 'L+S'}${p.isCustom ? ' ✏️' : ''}</span>
      </td>
      <td style="text-align:right; white-space:nowrap;">
        <span
          class="solved-date-badge"
          title="Click to change date"
          style="cursor:pointer; user-select:none;"
          data-title="${escapeHtml(p.title)}"
        >${dateDisplay} ✏️</span>
      </td>
    `;

    const cb = tr.querySelector('.status-cb');
    cb.addEventListener('click', (e) => toggleSolved(p.title, e));

    const starBtn = tr.querySelector('.star-btn');
    starBtn.addEventListener('click', (e) => toggleStar(p.title, e));

    const dateBadge = tr.querySelector('.solved-date-badge');
    if (dateBadge) {
      dateBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        changeSolvedDate(p.title);
      });
    }

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}
