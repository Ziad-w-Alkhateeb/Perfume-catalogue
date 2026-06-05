// ==========================================================================
// ESSENCE COLLECTION - CORE APPLICATION LOGIC
// ==========================================================================

// ==========================================================================
// CONFIGURATION
// ==========================================================================
const JSON_FILES = [
    'data/arabic.json',
    'data/Europe.json',
    'data/Fragrant.json',
    'data/men.json',
    'data/niche.json',
    'data/swiss.json',
    'data/women.json',
    'data/synthetic.json',
];

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let allPerfumes = [];
let filteredPerfumes = [];
let currentFilter = 'all';
let currentGender = 'all';
let currentSort = 'name';
let searchQuery = '';
let currentLang = localStorage.getItem('perfumeLang') || 'ar';
let isDark = localStorage.getItem('perfumeTheme') === 'dark';
let loadErrors = [];
let categoryNames = [];
let isInitialized = false;
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function init() {
    if (isInitialized) return;
    if (typeof i18n === 'undefined') return;
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
    
    // Translate element title tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (t[key]) el.setAttribute('title', t[key]);
    });
    
    // Translate sorting drop-down values
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.querySelectorAll('option').forEach(opt => {
            const key = opt.getAttribute('data-i18n');
            if (t[key]) opt.textContent = t[key];
        });
    }

    // Translate gender filter drop-down values
    const genderFilter = document.getElementById('genderFilter');
    if (genderFilter) {
        genderFilter.querySelectorAll('option').forEach(opt => {
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
    const categoryChips = document.getElementById('categoryChips');
    if (!categoryChips) return;
    
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

    categoryChips.innerHTML = html;

    // Attach Event Listeners to New Chips
    categoryChips.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            categoryChips.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
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
        allPerfumes = shuffleArray(results.flat());

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
    const paginationContainer = document.getElementById('paginationContainer');
    if (!grid) return;

    if (perfumes.length === 0) {
        showEmptyState('noResultsTitle', 'noResultsDesc');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    // 1. Calculate pagination values
    const totalItems = perfumes.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // Safety check on currentPage bounds
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const paginatedItems = perfumes.slice(startIndex, endIndex);

    const t = i18n[currentLang];

    // 2. Render cards for paginated items
    grid.innerHTML = paginatedItems.map((perfume, index) => {
        // Store the absolute index in filteredPerfumes as a data attribute
        const absoluteIndex = startIndex + index;
        const isArabic = currentLang === 'ar';
        const primaryName = isArabic ? perfume.name_ar : perfume.name_en;
        const secondaryName = isArabic ? perfume.name_en : perfume.name_ar;
        const delay = Math.min(index * 0.04, 0.4);

        const isFragrant = perfume.collection === 'Fragrant';
        const cardClass = isFragrant ? 'perfume-card no-details' : 'perfume-card';

        return `
        <div class="${cardClass}" data-index="${absoluteIndex}" style="animation-delay: ${delay}s">
            <div class="card-image-wrapper">
                 <img class="card-image"
                      src="${perfume.image}"
                      alt="${escapeHtml(perfume.name_en)}"
                      loading="lazy"
                      onerror="this.onerror=null; this.src='static/images/logo.webp';">
            </div>
            <div class="card-body">
                <div class="card-header">
                    <div class="card-title-container">
                        <div class="card-title-primary">${escapeHtml(primaryName)}</div>
                        <div class="card-title-secondary">${escapeHtml(secondaryName)}</div>
                    </div>
                    <div class="card-code">${perfume.num}</div>
                </div>
                <div class="card-meta">
                    <span class="badge badge-gender-${perfume.gender.toLowerCase()}">${translateGender(perfume.gender)}</span>
                    <span class="badge badge-type badge-type-${perfume.collection.toLowerCase()}">${perfume.oil_type}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // 3. Render pagination controls
    if (paginationContainer) {
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
        } else {
            paginationContainer.innerHTML = buildPaginationHTML(currentPage, totalPages);
        }
    }

    updateStats();
}

function buildPaginationHTML(current, total) {
    let html = '';

    // First and Prev buttons
    const prevDisabled = current === 1 ? 'disabled' : '';
    html += `<button class="page-btn ${prevDisabled}" onclick="changePage(1)" title="First Page">«</button>`;
    html += `<button class="page-btn ${prevDisabled}" onclick="changePage(${current - 1})" title="Previous Page">‹</button>`;

    // Determine range of page buttons to show (e.g. up to 5 buttons)
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, startPage + 4);
    
    // Adjust start page if we are near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === current ? 'active' : '';
        html += `<button class="page-btn ${activeClass}" onclick="changePage(${i})">${i}</button>`;
    }

    // Next and Last buttons
    const nextDisabled = current === total ? 'disabled' : '';
    html += `<button class="page-btn ${nextDisabled}" onclick="changePage(${current + 1})" title="Next Page">›</button>`;
    html += `<button class="page-btn ${nextDisabled}" onclick="changePage(${total})" title="Last Page">»</button>`;

    return html;
}

function changePage(page) {
    currentPage = page;
    renderPerfumes(filteredPerfumes);

    // Smooth scroll to top of grid
    const filtersBar = document.getElementById('filtersBar');
    if (filtersBar) {
        filtersBar.scrollIntoView({ behavior: 'smooth' });
    }
}

function translateGender(gender) {
    const t = i18n[currentLang];
    return t[gender] || gender;
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
function applyFilters(resetPage = true) {
    if (resetPage) {
        currentPage = 1;
    }
    let result = [...allPerfumes];

    // 1. Filter by designated categories (JSON source aggregation)
    if (currentFilter !== 'all') {
        result = result.filter(p => p.collection === currentFilter);
    }

    // 1.5. Filter by gender
    if (currentGender !== 'all') {
        result = result.filter(p => p.gender.toLowerCase() === currentGender.toLowerCase());
    }

    // 2. Filter by search input match
    if (searchQuery) {
        result = result.filter(p => matchesFuzzy(searchQuery, p));
    }

    // 3. Sort dynamic results array
    const isArabic = currentLang === 'ar';
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
        case 'name':
        default:
            result.sort((a, b) => {
                const nameA = isArabic ? a.name_ar : a.name_en;
                const nameB = isArabic ? b.name_ar : b.name_en;
                return nameA.localeCompare(nameB, currentLang);
            });
            break;
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
function openModal(indexOrPerfume) {
    // Accept either a perfume object directly or a numeric index into filteredPerfumes
    const perfume = (typeof indexOrPerfume === 'object' && indexOrPerfume !== null)
        ? indexOrPerfume
        : filteredPerfumes[indexOrPerfume];
    if (!perfume) return;

    const t = i18n[currentLang];
    const isArabic = currentLang === 'ar';

    // 1. Load data properties into template fields
    document.getElementById('modalImage').src = perfume.image;
    document.getElementById('modalTitleEn').textContent = perfume.name_en;
    document.getElementById('modalTitleAr').textContent = perfume.name_ar;
    document.getElementById('modalGender').textContent = translateGender(perfume.gender);
    document.getElementById('modalType').textContent = perfume.oil_type;
    document.getElementById('modalNum').textContent = perfume.num;
    document.getElementById('modalCollection').textContent = t[perfume.collection] || perfume.collection;

    // 2. Resolve Description
    let desc = isArabic ? perfume.description_ar : perfume.description_en;
    if (!desc) {
        if (isArabic) {
            desc = `عطر فاخر ومميز يجسد التراث الأصيل لـ ${perfume.oil_type}. تم تصميمه بعناية فائقة ليلائم الذوق الرفيع للـ ${translateGender(perfume.gender)}، مع تباينات رائعة تدوم طويلاً وتمنحك حضوراً ساحراً.`;
        } else {
            desc = `A luxury fragrance that perfectly embodies the rich heritage of ${perfume.oil_type} scents. Meticulously crafted for ${perfume.gender.toLowerCase()}, it opens with vibrant notes leading into a warm, lingering and sophisticated trail.`;
        }
    }
    document.getElementById('modalDesc').textContent = desc;

    // 3. Resolve Scent Character
    let char = isArabic ? perfume.character_ar : perfume.character_en;
    if (!char) {
        if (perfume.oil_type === 'عربي') {
            char = isArabic ? 'خشبي، شرقي ودافئ' : 'Woody, Oriental & Warm';
        } else if (perfume.gender === 'Women') {
            char = isArabic ? 'زهري، حلو وناعم' : 'Floral, Sweet & Soft';
        } else {
            char = isArabic ? 'منعش، حمضيات وأخشاب' : 'Fresh, Citrus & Woods';
        }
    }
    document.getElementById('modalCharacter').textContent = char;

    // 4. Resolve Olfactory Pyramid Notes (Top, Heart, Base)
    let notesTop = isArabic ? perfume.notes_top_ar : perfume.notes_top_en;
    if (!notesTop) {
        if (perfume.oil_type === 'عربي') {
            notesTop = isArabic ? 'البرغموت، الزعفران، الهيل' : 'Bergamot, Saffron, Cardamom';
        } else if (perfume.gender === 'Women') {
            notesTop = isArabic ? 'الفراولة، الياسمين، الحمضيات' : 'Strawberry, Jasmine, Citrus';
        } else {
            notesTop = isArabic ? 'الليمون، النعناع، الجريب فروت' : 'Lemon, Mint, Grapefruit';
        }
    }
    document.getElementById('modalNotesTop').textContent = notesTop;

    let notesHeart = isArabic ? perfume.notes_heart_ar : perfume.notes_heart_en;
    if (!notesHeart) {
        if (perfume.oil_type === 'عربي') {
            notesHeart = isArabic ? 'الورد التركي، الياسمين، العود الخفيف' : 'Turkish Rose, Jasmine, Soft Oud';
        } else if (perfume.gender === 'Women') {
            notesHeart = isArabic ? 'الفانيليا، الغاردينيا، أزهار البرتقال' : 'Vanilla, Gardenia, Orange Blossom';
        } else {
            notesHeart = isArabic ? 'الزنجبيل، اللافندر، المريمية' : 'Ginger, Lavender, Sage';
        }
    }
    document.getElementById('modalNotesHeart').textContent = notesHeart;

    let notesBase = isArabic ? perfume.notes_base_ar : perfume.notes_base_en;
    if (!notesBase) {
        if (perfume.oil_type === 'عربي') {
            notesBase = isArabic ? 'خشب الصندل، العنبر، المسك، العود الفاخر' : 'Sandalwood, Amber, Musk, Premium Oud';
        } else if (perfume.gender === 'Women') {
            notesBase = isArabic ? 'المسك الأبيض، حبوب التونكا، خشب الأرز' : 'White Musk, Tonka Bean, Cedarwood';
        } else {
            notesBase = isArabic ? 'خشب الصندل، الباتشولي، المسك، نجيل الهند' : 'Sandalwood, Patchouli, Musk, Vetiver';
        }
    }
    document.getElementById('modalNotesBase').textContent = notesBase;

    // 5. Resolve Manufacturer/Brand
    let brand = isArabic ? perfume.manufacturer_ar : perfume.manufacturer_en;
    if (!brand) {
        brand = t.fallbackBrand;
    }
    document.getElementById('modalBrand').textContent = brand;

    // 5.5 Set dynamic WhatsApp Inquiry Link
    const waName = isArabic ? perfume.name_ar : perfume.name_en;
    const waCode = perfume.num;
    const waMessage = isArabic
        ? `مرحباً نضالكو، أود الاستفسار عن عطر: ${waName} (رمز المنتج: ${waCode})`
        : `Hello Nidalco, I would like to inquire about: ${waName} (Product Code: ${waCode})`;
    
    // Choose between Ahmed (962797574022) and Saif (962790494976) randomly to balance load
    const waPhones = ['962797574022', '962790494976'];
    const selectedPhone = waPhones[Math.floor(Math.random() * waPhones.length)];
    const waUrl = `https://wa.me/${selectedPhone}?text=${encodeURIComponent(waMessage)}`;
    const waBtn = document.getElementById('modalWhatsAppBtn');
    if (waBtn) {
        waBtn.href = waUrl;
    }

    // 6. Reset Interactive Tabs to default Overview panel
    const tabs = document.querySelectorAll('.modal-tab-btn');
    const panels = document.querySelectorAll('.modal-tab-panel');
    tabs.forEach(tBtn => tBtn.classList.remove('active'));
    panels.forEach(pnl => pnl.classList.remove('active'));
    
    const defaultTab = document.querySelector('.modal-tab-btn[data-tab="overview"]');
    const defaultPanel = document.getElementById('panelOverview');
    if (defaultTab) defaultTab.classList.add('active');
    if (defaultPanel) defaultPanel.classList.add('active');

    // 7. Animate overlays and body scroll into display
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
    const searchBtn = document.getElementById('searchBtn');
    
    if (overlay) overlay.classList.add('active');
    if (searchBtn) searchBtn.classList.add('active');
    if (input) {
        input.focus();
        input.value = searchQuery; // Preserve query string
    }
}

function closeSearch() {
    const overlay = document.getElementById('searchOverlay');
    const searchBtn = document.getElementById('searchBtn');
    
    if (overlay) overlay.classList.remove('active');
    if (searchBtn) searchBtn.classList.remove('active');
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
// FUZZY SEARCH UTILITIES
// ==========================================================================
function getLevenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,       // deletion
                matrix[i][j - 1] + 1,       // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
}

function matchesFuzzy(query, perfume) {
    if (!query) return true;
    
    // Split the query into separate search terms
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (queryTokens.length === 0) return true;
    
    // Build a target searchable text list from perfume fields
    const targetText = [
        perfume.name_en,
        perfume.name_ar,
        perfume.oil_type,
        perfume.num
    ].join(' ').toLowerCase();
    
    // Split target text into words for fine-grained spell checking
    const targetWords = targetText.split(/\s+/).filter(w => w.length > 0);

    // Verify that EVERY token in the search query matches at least one word/value in the target
    return queryTokens.every(qToken => {
        // 1. Check exact partial match (substring, e.g. "ess" in "essence")
        if (targetText.includes(qToken)) return true;
        
        // 2. Check approximate spelling matches for each target word
        return targetWords.some(tWord => {
            // Only spelling match if token is at least 3 characters to avoid noisy 1-letter typo matches
            if (qToken.length < 3) return false;
            
            const maxDistance = qToken.length <= 4 ? 1 : (qToken.length <= 7 ? 2 : 3);
            return getLevenshteinDistance(qToken, tWord) <= maxDistance;
        });
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    // 0. Perfume Grid: event delegation for card clicks (uses data-index read at click time)
    const perfumeGrid = document.getElementById('perfumeGrid');
    if (perfumeGrid) {
        perfumeGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.perfume-card:not(.no-details)');
            if (!card) return;
            const index = parseInt(card.dataset.index, 10);
            if (!isNaN(index)) openModal(index);
        });
    }

    // 1. Search Actions
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchClearBtn = document.getElementById('searchClearBtn');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (searchOverlay && searchOverlay.classList.contains('active')) {
                closeSearch();
            } else {
                openSearch();
            }
        });
    }

    if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', closeSearch);
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchQuery = '';
                searchClearBtn.classList.remove('visible');
                searchInput.focus();
                applyFilters();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (searchClearBtn) {
                if (searchQuery.trim().length > 0) {
                    searchClearBtn.classList.add('visible');
                } else {
                    searchClearBtn.classList.remove('visible');
                }
            }
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

    // 2.5 Filters and Sort controls
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFilters();
        });
    }

    const genderFilter = document.getElementById('genderFilter');
    if (genderFilter) {
        genderFilter.addEventListener('change', (e) => {
            currentGender = e.target.value;
            applyFilters();
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

    // 3.5 Interactive Modal Tab Switching
    const tabs = document.querySelectorAll('.modal-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(tBtn => tBtn.classList.remove('active'));
            tab.classList.add('active');
            
            const target = tab.dataset.tab;
            const panels = document.querySelectorAll('.modal-tab-panel');
            panels.forEach(pnl => pnl.classList.remove('active'));
            
            const activePanel = document.getElementById('panel' + target.charAt(0).toUpperCase() + target.slice(1));
            if (activePanel) activePanel.classList.add('active');

            // Reset scroll positions so the tab content starts at the top
            const modalContentPanel = document.querySelector('.modal-content-panel');
            if (modalContentPanel) modalContentPanel.scrollTop = 0;
            const modalContainer = document.querySelector('.modal-container');
            if (modalContainer) modalContainer.scrollTop = 0;
        });
    });



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
window.addEventListener('load', init);
// Fallback if script loads late or defer acts immediately
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
}
