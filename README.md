# 🌸 Essence Collection - Premium Perfume Catalog

A state-of-the-art, highly visual, and fully responsive luxury perfume catalog. Built with native web technologies using high-end UI/UX standards, a beautiful color system, and complete multi-language localization (English and Arabic).

---

## 🎨 Design & Aesthetic Highlights

* **Premium Color System:** A sophisticated **Royal Emerald & Champagne Gold** botanical luxury theme.
  * **Light Mode:** Sage Milk background (`#F4F6F4`), Forest Obsidian typography, and deep Imperial Emerald accents.
  * **Dark Mode:** Deep Abyssal Pine obsidian green (`#09100C`), deep Moss Green card containers, and glowing Champagne Gold elements.
* **Modern Glassmorphism Layering:** High-end glassmorphism borders and rich `backdrop-filter: blur(12px)` overlays for the sticky navigation header, drawer settings, search box, and detailed lightbox modals.
* **Highly Responsive Layout System:**
  * **Desktop / Tablets:** Grid-card layout with smooth transitions, border glows, and staggered `fadeInUp` keyframe list entry animations.
  * **Mobile Phones (`max-width: 500px`):** Automatically adapts to a **premium horizontal card layout** with smooth ellipsis text truncation, ensuring a highly readable, balanced, and elegant app-like experience.
* **Full RTL / LTR Mirroring:** Fully compatible with RTL text directions. When toggled to Arabic, the layout naturally mirrors the side-by-side cards, alignments, icons, and typography.

---

## ✨ Features

1. **Multi-language Localization (EN / AR):** Dynamic toggle that switches layout headers, buttons, labels, and local database entries instantly.
2. **Double-Click Theme Switch:** Standard light and dark modes toggle seamlessly and persist choices in `localStorage`.
3. **Instant Search Querying:** Fuzzy search matching title, type, product code, or categories instantly.
4. **Dynamic JSON Database Aggregation:** Asynchronously loads, standardizes, and parses catalog files (`data/arabic.json`, `data/men.json`, etc.) dynamically into categories, prioritizing **Men** and **Women** first.
5. **Detail Lightbox Modal:** Clicking any perfume card triggers a smooth scaling detailed summary modal displaying specific gender, oil type, product code, and collection.

---

## 📁 Repository Structure

```
Perfume catalogue/
├── data/                    # JSON category database
│   ├── arabic.json
│   ├── europe.json
│   ├── fragrant.json
│   ├── men.json
│   ├── niche.json
│   ├── swiss.json
│   └── women.json
├── static/
│   ├── css/
│   │   └── styles.css       # Premium responsive design system
│   ├── js/
│   │   ├── i18n.js          # Multi-language localization assets
│   │   └── app.js           # Decoupled core application engine
│   └── images/              # Logo and category image folders
├── index.html               # Main entry point (GitHub Pages default)
├── perfume_catalog.html     # Backup legacy entry point
└── README.md                # Documentation guide
```

---

## 🚀 Local Launch & Hosting

### 1. Host on GitHub Pages
This project is fully ready for **GitHub Pages** hosting!
1. Commit and push all files to your GitHub repository.
2. Go to **Settings** → **Pages** inside your repository.
3. Under **Build and deployment**, set the branch to `main` (or `master`) and folder to `/ (root)`.
4. Click **Save**. Your premium perfume catalog will be live at `https://<your-username>.github.io/<your-repository-name>/`!

### 2. Run Locally
Because the catalog dynamically fetches database files using browser `fetch()` APIs, modern browsers block file reads (`file://` protocol) due to security policies. You should spin up a quick local web server:

* **Method 1: VS Code (Extension)**
  Install **Live Server**, right-click `index.html` and select **Open with Live Server**.
* **Method 2: Node.js (Terminal)**
  Run `npx serve .` inside the repository folder, and open `http://localhost:3000`.
* **Method 3: Python (Terminal)**
  Run `python -m http.server 8000` inside the repository folder, and open `http://localhost:8000`.
