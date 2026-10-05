const PAGE_SIZE = 8;
const ICONS = {
    Burgers: '🍔',
    Pizza: '🍕',
    Sushi: '🍣',
    Curry: '🍛',
    Healthy: '🥗',
    Desserts: '🍰',
    Drinks: '🥤',
    Chicken: '🍗',
};

const state = { q: '', category: '', sort: 'popularity', page: 1 };
let controller = null;
let debounceTimer = null;
let typeaheadController = null;
let selectedIndex = -1;

// DOM Elements
const grid = document.getElementById('item-grid');
const pager = document.getElementById('pager');
const loading = document.getElementById('loading');
const resultCount = document.getElementById('result-count');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');
const typeaheadResults = document.getElementById('typeahead-results');

const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[c]));

async function loadItems() {
    if (controller) controller.abort();
    controller = new AbortController();

    const params = new URLSearchParams({
        sort: state.sort,
        page: state.page,
        pageSize: PAGE_SIZE,
    });
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);

    loading.classList.remove('d-none');
    grid.innerHTML = '';
    pager.innerHTML = '';
    resultCount.textContent = '';

    try {
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data = await res.json();
        renderItems(data.items);
        renderPager(data.page, data.totalPages);
        resultCount.textContent = `${data.total} result${data.total === 1 ? '' : 's'}`;
    } catch (err) {
        if (err.name === 'AbortError') return;
        renderError(err.message);
    } finally {
        if (!controller.signal.aborted) loading.classList.add('d-none');
    }
}

function renderItems(items) {
    if (items.length === 0) {
        grid.innerHTML = `
      <div class="col-12 col-md-8 col-lg-6 text-center my-4">
        <div class="empty-state-card">
          <div class="display-4 mb-3">🔍</div>
          <h4 class="fw-bold text-dark mb-2">No results found</h4>
          <p class="text-muted mb-0">We couldn't find any items matching your search criteria. Try tweaking your query or filters.</p>
        </div>
      </div>`;
        return;
    }

    grid.innerHTML = items
        .map(
            (item) => `
    <div class="col">
      <div class="item-card h-100 d-flex flex-column">
        <div class="item-icon">${ICONS[item.category] || '🍽️'}</div>
        <div class="p-3 d-flex flex-column flex-grow-1">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h5 class="fw-bold mb-0 text-truncate me-2" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h5>
            <span class="badge bg-secondary">${escapeHtml(item.category)}</span>
          </div>
          <small class="text-info mb-2">${escapeHtml(item.restaurant)}</small>
          <p class="desc-text mb-3">${escapeHtml(item.description)}</p>
          <div class="mt-auto">${renderLiveInfo(item)}</div>
        </div>
      </div>
    </div>`
        )
        .join('');
}

function renderLiveInfo(item) {
    if (!item.upstream) {
        return `
      <div class="d-flex justify-content-between align-items-center">
        <span class="fw-semibold">R${item.basePrice}</span>
        <span class="badge text-bg-warning" title="${escapeHtml(item.upstreamError || '')}">Live info unavailable</span>
      </div>`;
    }

    const { price, available, deliveryEstimateMins } = item.upstream;
    return `
    <div class="d-flex justify-content-between align-items-center mb-1">
      <span class="fw-bold fs-5">R${price}</span>
      <span class="badge ${available ? 'text-bg-success' : 'text-bg-danger'}">${available ? 'Available' : 'Sold out'}</span>
    </div>
    <small class="text-secondary">🛵 ~${deliveryEstimateMins} min</small>`;
}

function renderError(message) {
    grid.innerHTML = `
    <div class="col-12 text-center text-danger my-4">
      <p class="fs-5">Something went wrong: ${escapeHtml(message)}</p>
      <button id="retry-btn" class="btn btn-outline-info btn-sm">Try again</button>
    </div>`;
    document.getElementById('retry-btn').addEventListener('click', loadItems);
}

function renderPager(page, totalPages) {
    if (totalPages <= 1) return;

    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
        else if (pages[pages.length - 1] !== '…') pages.push('…');
    }

    const pageItem = (label, target, { active = false, disabled = false } = {}) => `
    <li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
      <button class="page-link" ${disabled || active || target === null ? 'disabled' : ''} data-page="${target ?? ''}">${label}</button>
    </li>`;

    pager.innerHTML =
        pageItem('Prev', page - 1, { disabled: page === 1 }) +
        pages.map((p) => (p === '…' ? pageItem('…', null, { disabled: true }) : pageItem(p, p, { active: p === page }))).join('') +
        pageItem('Next', page + 1, { disabled: page === totalPages });
}

pager.addEventListener('click', (e) => {
    const target = Number(e.target.dataset.page);
    if (!target) return;
    state.page = target;
    loadItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function fetchTypeaheadSuggestions(query) {
    if (typeaheadController) typeaheadController.abort();
    typeaheadController = new AbortController();

    try {
        const params = new URLSearchParams({ q: query, pageSize: 6 });
        if (state.category) params.set('category', state.category);

        const res = await fetch(`/api/search?${params}`, { signal: typeaheadController.signal });
        if (!res.ok) return hideTypeahead();

        const data = await res.json();
        renderTypeahead(data.items);
    } catch (err) {
        if (err.name !== 'AbortError') hideTypeahead();
    }
}

function renderTypeahead(items) {
    if (!items || items.length === 0) {
        hideTypeahead();
        return;
    }

    selectedIndex = -1;
    typeaheadResults.innerHTML = items
        .map(
            (item, idx) => `
    <div class="typeahead-item" data-index="${idx}" data-name="${escapeHtml(item.name)}">
      <div>
        <span class="fw-semibold">${escapeHtml(item.name)}</span>
        <small class="text-muted-custom ms-2">• ${escapeHtml(item.restaurant)}</small>
      </div>
      <small class="badge bg-secondary opacity-75">${escapeHtml(item.category)}</small>
    </div>`
        )
        .join('');

    typeaheadResults.classList.remove('d-none');
}

function hideTypeahead() {
    typeaheadResults.classList.add('d-none');
    typeaheadResults.innerHTML = '';
    selectedIndex = -1;
}

function selectSuggestion(name) {
    searchInput.value = name;
    hideTypeahead();
    search();
}

typeaheadResults.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.typeahead-item');
    if (itemEl && itemEl.dataset.name) {
        selectSuggestion(itemEl.dataset.name);
    }
});

function search() {
    hideTypeahead();
    state.q = searchInput.value.trim();
    state.page = 1;
    loadItems();
}

searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();

    if (query.length === 0) {
        hideTypeahead();
        search();
        return;
    }

    debounceTimer = setTimeout(() => {
        fetchTypeaheadSuggestions(query);
        search();
    }, 300);
});

searchInput.addEventListener('keydown', (e) => {
    const items = typeaheadResults.querySelectorAll('.typeahead-item');

    if (e.key === 'ArrowDown') {
        if (items.length === 0) return;
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
        if (items.length === 0) return;
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(debounceTimer);
        if (selectedIndex >= 0 && items[selectedIndex]) {
            selectSuggestion(items[selectedIndex].dataset.name);
        } else {
            search();
        }
    } else if (e.key === 'Escape') {
        hideTypeahead();
    }
});

function updateActiveSuggestion(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !typeaheadResults.contains(e.target)) {
        hideTypeahead();
    }
});

categorySelect.addEventListener('change', () => {
    state.category = categorySelect.value;
    state.page = 1;
    loadItems();
});

sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    state.page = 1;
    loadItems();
});

async function loadCategories() {
    try {
        const res = await fetch('/api/search/categories');
        const { categories } = await res.json();
        categorySelect.insertAdjacentHTML(
            'beforeend',
            categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')
        );
    } catch {
        // Keep default "All categories" option if network fails
    }
}

loadCategories();
loadItems();