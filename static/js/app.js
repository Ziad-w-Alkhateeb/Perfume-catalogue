// ==========================================================================
// ESSENCE COLLECTION - CORE APPLICATION LOGIC
// ==========================================================================

// ==========================================================================
// CONFIGURATION
// ==========================================================================
const JSON_FILES = [
    'data/arabic.json',
    'data/europe.json',
    'data/fragrant.json',
    'data/men.json',
    'data/niche.json',
    'data/swiss.json',
    'data/women.json',
];

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let allPerfumes = [];
let filteredPerfumes = [];
let currentFilter = 'all';
let currentSort = 'name';
let searchQuery = '';
let currentLang = localStorage.getItem('perfumeLang') || 'en';
let isDark = localStorage.getItem('perfumeTheme') === 'dark';
let loadErrors = [];
let categoryNames = [];
let isInitialized = false;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function init() {
    if (isInitialized) return;
    isInitialized = true;

    // 1. Initialize Visual Theme
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        const themeSwitch = document.getElementById('themeSwitch');
        if (themeSwitch) themeSwitch.classList.add('active');
    }
    
    // 2. Initialize Text Direction & Layout Language
    if (currentLang === 'ar') {
        document.body.setAttribute('dir', 'rtl');
        const langSwitch = document.getElementById('langSwitch');
        if (langSwitch) langSwitch.classList.add('active');
    }
    
    // 3. Apply Multi-language Localizations
    applyTranslations();
    
    // 4. Run Async Catalog Fetching
    loadData();
    
    // 5. Setup Action Click and Keyboard Hooks
    setupEventListeners();
}

// ==========================================================================
// LOCALIZATION MANAGER
// ==========================================================================
function applyTranslations() {
    const t = i18n[currentLang];
    if (!t) return;
    
    // Translate plain nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    // Translate search/input placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
    
    // Translate sorting drop-down values
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.querySelectorAll('option').forEach(opt => {
            const key = opt.getAttribute('data-i18n');
            if (t[key]) opt.textContent = t[key];
        });
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('perfumeLang', currentLang);
    
    if (currentLang === 'ar') {
        document.body.setAttribute('dir', 'rtl');
    } else {
        document.body.removeAttribute('dir');
    }
    
    applyTranslations();
    buildCategoryFilters(); // Re-render filter chips to reflect new language translations
    applyFilters();
}

function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('perfumeTheme', isDark ? 'dark' : 'light');
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// ==========================================================================
// CATEGORY FILTERS CONTROLLER
// ==========================================================================
function buildCategoryFilters() {
    const filtersBar = document.getElementById('filtersBar');
    if (!filtersBar) return;
    
    const t = i18n[currentLang];

    // Extract unique collection names from catalog database
    const collections = [...new Set(allPerfumes.map(p => p.collection))];
    
    // Sort collections so that "Men" and "Women" are placed at the beginning
    const order = ["Men", "Women"];
    collections.sort((a, b) => {
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });
    
    categoryNames = collections;

    // Build modern chips with active state classes
    let html = `<button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" data-i18n="filterAll">${t.filterAll}</button>`;

    collections.forEach(cat => {
        const translatedCat = t[cat] || cat;
        html += `<button class="filter-chip ${currentFilter === cat ? 'active' : ''}" data-filter="${cat}">${translatedCat}</button>`;
    });

    filtersBar.innerHTML = html;

    // Attach Event Listeners to New Chips
    filtersBar.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            filtersBar.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFilters();
        });
    });
}

// ==========================================================================
// ASYNC DATA FETCH LOADER
// ==========================================================================
async function loadData() {
    loadErrors = [];
    const t = i18n[currentLang];

    try {
        const loadPromises = JSON_FILES.map(async (file) => {
            try {
                const response = await fetch(file);
                if (!response.ok) {
                    throw new Error('HTTP status ' + response.status + ' for ' + file);
                }
                const data = await response.json();

                // Standardize collection name from filepath (e.g. "data/arabic.json" -> "Arabic")
                const collectionName = file
                    .replace(/^.*[\\/]/, '')
                    .replace('.json', '')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());

                return data.map(item => ({
                    ...item,
                    collection: collectionName,
                    image: item.image.replace(/^app\//, '') // strip optional development paths
                }));
            } catch (e) {
                loadErrors.push({ file: file, error: e.message });
                console.warn('Could not load ' + file + ':', e);
                return [];
            }
        });

        const results = await Promise.all(loadPromises);
        allPerfumes = results.flat();

        const isFileProtocol = window.location.protocol === 'file:';
        const hasErrors = loadErrors.length > 0;
        const allFailed = allPerfumes.length === 0 && hasErrors;

        // Display troubleshooting layout if running off file:// protocol without a dev server
        if (allFailed && isFileProtocol) {
            showServerRequired();
            return;
        }

        if (allPerfumes.length === 0) {
            showEmptyState('noDataTitle', 'noDataDesc');
            return;
        }

        // Initialize category structures
        buildCategoryFilters();

        filteredPerfumes = [...allPerfumes];
        applyFilters();
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorState(error);
    }
}

// ==========================================================================
// CARDS RENDER CONTROLLER
// ==========================================================================
function renderPerfumes(perfumes) {
    const grid = document.getElementById('perfumeGrid');
    if (!grid) return;

    if (perfumes.length === 0) {
        showEmptyState('noResultsTitle', 'noResultsDesc');
        return;
    }

    grid.innerHTML = perfumes.map((perfume, index) => {
        // Switch layout names based on application language state
        const isArabic = currentLang === 'ar';
        const primaryName = isArabic ? perfume.name_ar : perfume.name_en;
        const secondaryName = isArabic ? perfume.name_en : perfume.name_ar;

        // Custom micro-animation delay list slide-in behavior
        const delay = Math.min(index * 0.04, 0.4);

        return `
        <div class="perfume-card" onclick="openModal(${index})" style="animation-delay: ${delay}s">
            <div class="card-image-wrapper">
                <img class="card-image"
                     src="${perfume.image}"
                     alt="${escapeHtml(perfume.name_en)}"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml,&lt;svg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'320\'&gt;&lt;rect fill=\'%23f0f0f0\' width=\'400\' height=\'320\'/&gt;&lt;text fill=\'%23999\' font-family=\'sans-serif\' font-size=\'16\' x=\'50%\' y=\'50%\' text-anchor=\'middle\'&gt;No Image&lt;/text&gt;&lt;/svg&gt;'">
            </div>
            <div class="card-body">
                <div class="card-header">
                    <div>
                        <div class="card-title-primary">${escapeHtml(primaryName)}</div>
                        <div class="card-title-secondary">${escapeHtml(secondaryName)}</div>
                    </div>
                    <div class="card-price">$${perfume.price}</div>
                </div>
                <div class="card-meta">
                    <span class="badge badge-gender-${perfume.gender.toLowerCase()}">${translateGender(perfume.gender)}</span>
                    <span class="badge badge-type">${perfume.oil_type}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');

    updateStats();
}

function translateGender(gender) {
    const t = i18n[currentLang];
    if (gender === 'Women') return t.filterWomen || 'Women';
    if (gender === 'Men') return t.filterMen || 'Men';
    return gender;
}

// ==========================================================================
// SYSTEM STATEMENTS LAYOUTS (LOADING / EMPTY / ERRORS)
// ==========================================================================
function showEmptyState(titleKey, descKey) {
    const grid = document.getElementById('perfumeGrid');
    if (!grid) return;
    
    const t = i18n[currentLang];
    grid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🌸</div>
            <h3>${t[titleKey]}</h3>
            <p>${t[descKey]}</p>
        </div>
    `;
    updateStats();
}

function showErrorState(error) {
    const grid = document.getElementById('perfumeGrid');
    if (!grid) return;
    
    const t = i18n[currentLang];
    grid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">🚨</div>
            <h3>${t.errorTitle}</h3>
            <p>${t.errorDesc}</p>
            <div class="error-details">
                <strong>Error:</strong> ${escapeHtml(error.message)}<br><br>
                <strong>Protocol:</strong> ${window.location.protocol}<br>
                <strong>Path:</strong> ${window.location.pathname}<br><br>
                <em>Tip: If using file:// protocol, you need a local server.</em>
            </div>
        </div>
    `;
    updateStats();
}

function showServerRequired() {
    const grid = document.getElementById('perfumeGrid');
    if (!grid) return;
    
    const t = i18n[currentLang];
    grid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">🔌</div>
            <h3>${t.serverRequired}</h3>
            <p>${t.serverDesc}</p>
            <div class="error-details">
                <strong>${t.method1}</strong><br>
                <code>${t.cmdPython}</code><br><br>
                <strong>${t.method2}</strong><br>
                <code>${t.cmdNode}</code><br><br>
                <strong>${t.method3}</strong><br>
                ${t.cmdVscode}<br><br>
                <strong style="color: var(--gold);">${t.thenOpen}</strong>
            </div>
        </div>
    `;
    updateStats();
}

// ==========================================================================
// SEARCH, FILTER & SORT SYSTEM
// ==========================================================================
function applyFilters() {
    let result = [...allPerfumes];

    // 1. Filter by designated categories (JSON source aggregation)
    if (currentFilter !== 'all') {
        result = result.filter(p => p.collection === currentFilter);
    }

    // 2. Filter by search input match
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(p =>
            p.name_en.toLowerCase().includes(q) ||
            p.name_ar.includes(q) ||
            p.oil_type.toLowerCase().includes(q) ||
            p.num.includes(q)
        );
    }

    // 3. Sort dynamic results array
    switch (currentSort) {
        case 'price-asc':
            result.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            result.sort((a, b) => b.price - a.price);
            break;
        case 'type':
            result.sort((a, b) => a.oil_type.localeCompare(b.oil_type) || a.name_en.localeCompare(b.name_en));
            break;
        default:
            result.sort((a, b) => a.name_en.localeCompare(b.name_en));
    }

    filteredPerfumes = result;
    renderPerfumes(result);
}

function updateStats() {
    const showingCount = document.getElementById('showingCount');
    const totalCount = document.getElementById('totalCount');
    
    if (showingCount) showingCount.textContent = filteredPerfumes.length;
    if (totalCount) totalCount.textContent = allPerfumes.length;
}

// ==========================================================================
// LIGHTBOX DETAIL MODAL
// ==========================================================================
function openModal(index) {
    const perfume = filteredPerfumes[index];
    if (!perfume) return;

    const t = i18n[currentLang];

    // Load data properties into template fields
    document.getElementById('modalImage').src = perfume.image;
    document.getElementById('modalTitleEn').textContent = perfume.name_en;
    document.getElementById('modalTitleAr').textContent = perfume.name_ar;
    document.getElementById('modalPrice').textContent = '$' + perfume.price;
    document.getElementById('modalGender').textContent = translateGender(perfume.gender);
    document.getElementById('modalType').textContent = perfume.oil_type;
    document.getElementById('modalNum').textContent = perfume.num;
    document.getElementById('modalCollection').textContent = t[perfume.collection] || perfume.collection;

    // Animate layouts into display
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ==========================================================================
// EXPANDED SEARCH OVERLAY
// ==========================================================================
function openSearch() {
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchInput');
    
    if (overlay) overlay.classList.add('active');
    if (input) {
        input.focus();
        input.value = searchQuery; // Preserve query string
    }
    document.body.style.overflow = 'hidden';
}

function closeSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ==========================================================================
// DRAWER SETTINGS PANEL
// ==========================================================================
function openSettings() {
    const wrapper = document.getElementById('settingsWrapper');
    if (wrapper) wrapper.classList.add('active');
}

function closeSettings() {
    const wrapper = document.getElementById('settingsWrapper');
    if (wrapper) wrapper.classList.remove('active');
}

// ==========================================================================
// SECURITY UTILITIES
// ==========================================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================================================
// ACTION LISTENERS MATRIX
// ==========================================================================
function setupEventListeners() {
    // 1. Search Actions
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    
    const searchOverlay = document.getElementById('searchOverlay');
    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeSearch();
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applyFilters();
        });
    }

    // 2. Settings Panel Drawer Actions
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    
    const settingsClose = document.getElementById('settingsClose');
    if (settingsClose) settingsClose.addEventListener('click', closeSettings);
    
    const settingsWrapper = document.getElementById('settingsWrapper');
    if (settingsWrapper) {
        settingsWrapper.addEventListener('click', (e) => {
            if (e.target.id === 'settingsBackdrop') closeSettings();
        });
    }

    // Theme Switch Slider
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const themeSwitch = document.getElementById('themeSwitch');
            if (themeSwitch) themeSwitch.classList.toggle('active');
            toggleTheme();
        });
    }

    // Language Toggle Switch Slider
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const langSwitch = document.getElementById('langSwitch');
            if (langSwitch) langSwitch.classList.toggle('active');
            toggleLanguage();
        });
    }

    // 3. Lightbox Detail Modal Actions
    const modalClose = document.getElementById('modalClose');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    // 4. Keyboard Shortcuts Hook
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSearch();
            closeSettings();
            closeModal();
        }
    });
}

// ==========================================================================
// STARTUP ENGINE
// ==========================================================================
document.addEventListener('DOMContentLoaded', init);
// Fallback if script loads late or defer acts immediately
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
}
